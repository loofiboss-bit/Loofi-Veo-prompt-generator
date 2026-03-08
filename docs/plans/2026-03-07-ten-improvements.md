# Ten Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement all 10 improvements identified in the full app review: geolocation cleanup, Ollama UX, PromptLogicContext, live preview, prompt ratings, keytar API key storage, collaboration local-only badge, focus mode, theme CSS migration, and Tier 1 service tests.

**Architecture:** Each task is self-contained and can be committed independently. Tasks 1–5 are low-risk UI/UX changes. Tasks 6–8 are service/architecture changes. Tasks 9–10 are CSS + test coverage.

**Tech Stack:** React 18, TypeScript strict, Zustand, TailwindCSS, Electron 40, Vitest, idb-keyval, keytar (to install)

---

## Task 1: Remove GPS Geolocation Acquisition

**Scope:** The `useGoogleMaps` checkbox triggers a real GPS read. Remove the coordinate acquisition while keeping the checkbox (it still tells AI to use location-aware context generically).

**Files:**

- Modify: `src/App.tsx` — remove `userCoords` state and GPS acquisition
- Modify: `src/shared/hooks/usePromptLogic.ts` — remove `userCoords` param, pass `null` to service
- Modify: `src/shared/hooks/useAppHandlers.ts` — remove geolocation branch
- Modify: `src/core/services/gemini/geminiPromptService.ts` — make `userCoords` optional param with `null` default
- Modify: `src/core/services/batchPromptService.ts` — same
- Modify: `src/core/services/promptGenerationService.ts` — same
- Modify: `src/shared/hooks/usePromptLogic.test.ts` — remove `userCoords` from call sites
- Modify: `src/shared/hooks/usePromptLogic.test.tsx` — same

**Step 1: Update `geminiPromptService.ts` to make `userCoords` optional**

Find the function signatures that accept `userCoords: { latitude: number; longitude: number } | null` and change to `userCoords: { latitude: number; longitude: number } | null = null`.

**Step 2: Update `promptGenerationService.ts` and `batchPromptService.ts` similarly**

Remove `userCoords` from their public-facing parameter (or default to null).

**Step 3: Update `usePromptLogic.ts`**

Remove `userCoords` from `UsePromptLogicProps`. Change:

```ts
// Before:
userCoords: { latitude: number; longitude: number } | null;
// After: remove entire field
```

Change the `generatePromptWithCurrentProvider(promptState, userCoords)` call to `generatePromptWithCurrentProvider(promptState, null)`.

**Step 4: Update `App.tsx`**

Remove:

```ts
const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
```

Remove `userCoords` from `usePromptLogic(...)` call.
Remove `handleCheckboxChangeWithCoords` — replace with simpler `handleCheckboxChange` that just calls `setPromptState`.
In the JSX, replace `handleCheckboxChangeWithCoords` with the simpler handler.

**Step 5: Update `useAppHandlers.ts`**

Remove the geolocation branch:

```ts
// Remove this block:
if (name === 'useGoogleMaps' && checked) {
  // navigator.geolocation...
}
```

**Step 6: Update tests**

In `usePromptLogic.test.ts` and `usePromptLogic.test.tsx`, remove `userCoords: null` from all hook call sites.
In `useAppHandlers.test.tsx`, remove the `useGoogleMaps` geolocation test (or update it to not expect geolocation).

**Step 7: Run tests**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && npm test -- --reporter=verbose 2>&1 | tail -30
```

Expected: All tests pass.

**Step 8: Commit**

```bash
git add -A && git commit -m "refactor(prompt): remove GPS coordinate acquisition from useGoogleMaps"
```

---

## Task 2: Ollama Status Badge (Local LLM Onboarding)

**Scope:** When user selects "Local LLM" in TargetModelToggle, show a badge below indicating whether Ollama is reachable at `http://localhost:11434`. Shows green "Connected · modelname" or amber "Ollama not running — install at ollama.com".

**Files:**

- Create: `src/features/prompt/OllamaStatusBadge.tsx`
- Modify: `src/features/prompt/TargetModelToggle.tsx` — render badge below cards when value === 'local'
- Create: `src/features/prompt/OllamaStatusBadge.test.tsx`

**Step 1: Write failing test**

`src/features/prompt/OllamaStatusBadge.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { OllamaStatusBadge } from './OllamaStatusBadge';

describe('OllamaStatusBadge', () => {
  it('shows checking state initially', () => {
    render(<OllamaStatusBadge />);
    expect(screen.getByText(/checking/i)).toBeInTheDocument();
  });

  it('shows offline when fetch fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network'));
    render(<OllamaStatusBadge />);
    await waitFor(() => expect(screen.getByText(/not running/i)).toBeInTheDocument());
  });

  it('shows connected when fetch succeeds', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [{ name: 'llama3.2' }] }),
    });
    render(<OllamaStatusBadge />);
    await waitFor(() => expect(screen.getByText(/connected/i)).toBeInTheDocument());
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && npm test -- OllamaStatusBadge 2>&1 | tail -20
```

**Step 3: Implement `OllamaStatusBadge.tsx`**

```tsx
import React, { useEffect, useState } from 'react';

type Status = 'checking' | 'connected' | 'offline';

interface OllamaInfo {
  model?: string;
}

export function OllamaStatusBadge() {
  const [status, setStatus] = useState<Status>('checking');
  const [info, setInfo] = useState<OllamaInfo>({});

  useEffect(() => {
    let cancelled = false;
    fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })
      .then((r) => r.json())
      .then((data: { models?: Array<{ name: string }> }) => {
        if (cancelled) return;
        setStatus('connected');
        setInfo({ model: data.models?.[0]?.name });
      })
      .catch(() => {
        if (!cancelled) setStatus('offline');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === 'checking') {
    return <p className="text-xs text-slate-500 mt-2 text-center">Checking Ollama...</p>;
  }

  if (status === 'offline') {
    return (
      <div className="mt-3 rounded-lg border border-amber-800/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
        <strong>Ollama not running.</strong> Start it with{' '}
        <code className="font-mono bg-amber-950/60 px-1 rounded">ollama serve</code> or{' '}
        <a
          href="https://ollama.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-amber-200"
        >
          install Ollama
        </a>
        .
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-emerald-800/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-300 flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      <span>Connected{info.model ? ` · ${info.model}` : ''}</span>
    </div>
  );
}
```

**Step 4: Add to `TargetModelToggle.tsx`**

Below the `</div>` that closes the radiogroup, add:

```tsx
import { OllamaStatusBadge } from './OllamaStatusBadge';

// Inside TargetModelToggle, after the radiogroup div:
{
  value === 'local' && <OllamaStatusBadge />;
}
```

**Step 5: Run tests**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && npm test -- OllamaStatusBadge 2>&1 | tail -20
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat(prompt): add Ollama connection status badge for local LLM mode"
```

---

## Task 3: PromptLogicContext — Fix Prop Drilling

**Scope:** The `promptLogic` object (23 fields) is passed from App.tsx → PromptWorkspace → DetailsSection + OutputSection. Create a Context so child components subscribe directly and PromptWorkspace no longer needs to forward it.

**Files:**

- Create: `src/shared/contexts/PromptLogicContext.tsx`
- Modify: `src/App.tsx` — wrap workspace with provider
- Modify: `src/features/prompt/PromptWorkspace.tsx` — remove promptLogic prop
- Modify: `src/features/prompt/sections/DetailsSection.tsx` — consume context
- Modify: `src/features/prompt/sections/OutputSection.tsx` — consume context
- Create: `src/shared/contexts/PromptLogicContext.test.tsx`

**Step 1: Create the context**

`src/shared/contexts/PromptLogicContext.tsx`:

```tsx
import React, { createContext, useContext } from 'react';
import { VeoPromptResponse } from '@core/types';

export interface PromptLogicContextValue {
  generatedPrompt: VeoPromptResponse | null;
  setGeneratedPrompt: (p: VeoPromptResponse | null) => void;
  isLoading: boolean;
  isRefining: boolean;
  isRestructuring: boolean;
  handleGeneratePrompt: () => void;
  handleRefinePrompt: (text: string) => Promise<void>;
  handleRestructurePrompt: (prompt: string) => void;
  handleSuggestArtStyles: () => void;
  isSuggestingArtStyle: boolean;
  handleSuggestVisualEffect: () => void;
  isSuggestingEffect: boolean;
  handleSuggestCameraSetup: () => void;
  isSuggestingCamera: boolean;
  handleSuggestEnvironmentDetails: () => void;
  isSuggestingEnvironment: boolean;
  handleSuggestSensoryDetails: () => void;
  isSuggestingSensoryDetails: boolean;
  handleSuggestCharacterActions: () => void;
  isSuggestingActions: boolean;
  handleGenerateVisualDNA: () => void;
  isGeneratingVisualDNA: boolean;
  handleSuggestFullAudioDesign: () => void;
  isSuggestingFullAudio: boolean;
  handleAnalyzeAudio: () => void;
  isAnalyzingAudio: boolean;
  handleSuggestAdvancedSettings: () => void;
  isSuggestingAdvanced: boolean;
  errors: Record<string, string>;
  setErrors: (errors: Record<string, string>) => void;
}

const PromptLogicContext = createContext<PromptLogicContextValue | null>(null);

export function PromptLogicProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: PromptLogicContextValue;
}) {
  return <PromptLogicContext.Provider value={value}>{children}</PromptLogicContext.Provider>;
}

export function usePromptLogicContext(): PromptLogicContextValue {
  const ctx = useContext(PromptLogicContext);
  if (!ctx) throw new Error('usePromptLogicContext must be used inside PromptLogicProvider');
  return ctx;
}
```

**Step 2: Wrap in App.tsx**

In `src/App.tsx`, import `PromptLogicProvider` and wrap `AppScaffold`'s `promptWorkspaceProps` rendering area. Since AppScaffold renders PromptWorkspace internally, the cleanest approach is to provide the context at the App level:

```tsx
import { PromptLogicProvider } from '@shared/contexts/PromptLogicContext';

// In App return, wrap AppScaffold:
<PromptLogicProvider value={{
  ...promptLogic,
  errors: promptLogic.errors,
  setErrors: promptLogic.setErrors,
}}>
  <AppScaffold ... />
</PromptLogicProvider>
```

Remove `promptLogic` from `promptWorkspaceProps`.

**Step 3: Update `PromptWorkspace.tsx`**

Remove `promptLogic` from `PromptWorkspaceProps` interface. Remove it from the destructured props. Remove all the promptLogic pass-through props to DetailsSection and OutputSection.

**Step 4: Update `DetailsSection.tsx` and `OutputSection.tsx`**

Replace `promptLogic.xxx` prop access with `const promptLogic = usePromptLogicContext()` at the top of each component. Remove those props from their interfaces.

**Step 5: Write context test**

`src/shared/contexts/PromptLogicContext.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { PromptLogicProvider, usePromptLogicContext } from './PromptLogicContext';

const mockValue = {
  generatedPrompt: null,
  setGeneratedPrompt: vi.fn(),
  isLoading: false,
  isRefining: false,
  isRestructuring: false,
  handleGeneratePrompt: vi.fn(),
  handleRefinePrompt: vi.fn(),
  handleRestructurePrompt: vi.fn(),
  handleSuggestArtStyles: vi.fn(),
  isSuggestingArtStyle: false,
  handleSuggestVisualEffect: vi.fn(),
  isSuggestingEffect: false,
  handleSuggestCameraSetup: vi.fn(),
  isSuggestingCamera: false,
  handleSuggestEnvironmentDetails: vi.fn(),
  isSuggestingEnvironment: false,
  handleSuggestSensoryDetails: vi.fn(),
  isSuggestingSensoryDetails: false,
  handleSuggestCharacterActions: vi.fn(),
  isSuggestingActions: false,
  handleGenerateVisualDNA: vi.fn(),
  isGeneratingVisualDNA: false,
  handleSuggestFullAudioDesign: vi.fn(),
  isSuggestingFullAudio: false,
  handleAnalyzeAudio: vi.fn(),
  isAnalyzingAudio: false,
  handleSuggestAdvancedSettings: vi.fn(),
  isSuggestingAdvanced: false,
  errors: {},
  setErrors: vi.fn(),
};

function Consumer() {
  const ctx = usePromptLogicContext();
  return <div>{ctx.isLoading ? 'loading' : 'idle'}</div>;
}

it('provides context value to consumers', () => {
  render(
    <PromptLogicProvider value={mockValue}>
      <Consumer />
    </PromptLogicProvider>,
  );
  expect(screen.getByText('idle')).toBeInTheDocument();
});

it('throws when used outside provider', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => render(<Consumer />)).toThrow(
    'usePromptLogicContext must be used inside PromptLogicProvider',
  );
  spy.mockRestore();
});
```

**Step 6: Run tests**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && npm test -- PromptLogicContext 2>&1 | tail -20
```

**Step 7: Typecheck**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && npm run typecheck 2>&1 | tail -20
```

**Step 8: Commit**

```bash
git add -A && git commit -m "refactor(prompt): introduce PromptLogicContext to eliminate prop drilling"
```

---

## Task 4: Live Prompt Preview

**Scope:** A real-time text preview (no AI call) that assembles the current form values into a best-effort prompt string using template logic. Shown in the output column when no generated prompt exists yet.

**Files:**

- Create: `src/core/utils/promptAssembler.ts`
- Create: `src/core/utils/promptAssembler.test.ts`
- Create: `src/features/prompt/LivePromptPreview.tsx`
- Modify: `src/features/prompt/sections/OutputSection.tsx` — show LivePromptPreview when no generatedPrompt

**Step 1: Write failing test for assembler**

`src/core/utils/promptAssembler.test.ts`:

```ts
import { assemblePromptPreview } from './promptAssembler';
import { INITIAL_STATE } from '@core/constants';

it('returns empty string when idea is blank', () => {
  expect(assemblePromptPreview({ ...INITIAL_STATE, idea: '' })).toBe('');
});

it('includes idea in output', () => {
  const result = assemblePromptPreview({ ...INITIAL_STATE, idea: 'A sunset over mountains' });
  expect(result).toContain('A sunset over mountains');
});

it('includes style when provided', () => {
  const result = assemblePromptPreview({ ...INITIAL_STATE, idea: 'A dragon', style: 'cinematic' });
  expect(result).toContain('cinematic');
});

it('includes camera movement when provided', () => {
  const result = assemblePromptPreview({
    ...INITIAL_STATE,
    idea: 'A dragon',
    cameraMovement: 'dolly in',
  });
  expect(result).toContain('dolly in');
});
```

**Step 2: Implement `promptAssembler.ts`**

```ts
import { PromptState } from '@core/types';

/**
 * Assembles a best-effort prompt preview string from the current PromptState.
 * No AI calls — pure template logic. Returns empty string if idea is blank.
 */
export function assemblePromptPreview(state: PromptState): string {
  if (!state.idea?.trim()) return '';

  const parts: string[] = [state.idea.trim()];

  if (state.style) parts.push(`Style: ${state.style}`);
  if (state.artStyle) parts.push(`Art style: ${state.artStyle}`);
  if (state.cameraMovement) parts.push(`Camera: ${state.cameraMovement}`);
  if (state.lighting) parts.push(`Lighting: ${state.lighting}`);
  if (state.colorPalette) parts.push(`Color palette: ${state.colorPalette}`);
  if (state.mood) parts.push(`Mood: ${state.mood}`);
  if (state.setting) parts.push(`Setting: ${state.setting}`);
  if (state.timeOfDay) parts.push(`Time of day: ${state.timeOfDay}`);
  if (state.weather) parts.push(`Weather: ${state.weather}`);
  if (state.characterDescription) parts.push(`Character: ${state.characterDescription}`);
  if (state.aspectRatio) parts.push(`Aspect ratio: ${state.aspectRatio}`);

  return parts.join('. ');
}
```

**Step 3: Run assembler tests**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && npm test -- promptAssembler 2>&1 | tail -20
```

**Step 4: Create `LivePromptPreview.tsx`**

```tsx
import React, { useMemo } from 'react';
import { PromptState } from '@core/types';
import { assemblePromptPreview } from '@core/utils/promptAssembler';

interface LivePromptPreviewProps {
  promptState: PromptState;
}

export function LivePromptPreview({ promptState }: LivePromptPreviewProps) {
  const preview = useMemo(() => assemblePromptPreview(promptState), [promptState]);

  if (!preview) return null;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Live Preview
      </p>
      <p className="text-sm text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
        {preview}
      </p>
      <p className="text-xs text-slate-600 mt-2">
        This preview updates as you fill in fields. Generate to get an AI-crafted prompt.
      </p>
    </div>
  );
}
```

**Step 5: Add to OutputSection**

In `src/features/prompt/sections/OutputSection.tsx`, when `generatedPrompt` is null, render `<LivePromptPreview promptState={promptState} />` above or instead of the empty state placeholder.

Import: `import { LivePromptPreview } from '@features/prompt/LivePromptPreview';`

**Step 6: Run full tests**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && npm test 2>&1 | tail -10
```

**Step 7: Commit**

```bash
git add -A && git commit -m "feat(prompt): add live prompt preview assembled from form state"
```

---

## Task 5: Prompt Ratings in History

**Scope:** Add a 1–5 star rating field to HistoryEntry. Users can rate prompts from the HistoryPanel. Rating is persisted to IndexedDB.

**Files:**

- Modify: `src/core/services/historyService.ts` — add `rating?: number` to HistoryEntry, add `rateEntry()` method
- Modify: `src/core/store/useHistoryStore.ts` — add `rateEntry` action
- Create: `src/shared/components/ui/StarRating.tsx`
- Modify: `src/features/history/HistoryPanel.tsx` — render StarRating per entry
- Create: `src/shared/components/ui/StarRating.test.tsx`

**Step 1: Write failing test for StarRating**

`src/shared/components/ui/StarRating.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { StarRating } from './StarRating';

it('renders 5 stars', () => {
  render(<StarRating value={0} onChange={() => {}} />);
  expect(screen.getAllByRole('button')).toHaveLength(5);
});

it('calls onChange with correct rating on click', () => {
  const onChange = vi.fn();
  render(<StarRating value={0} onChange={onChange} />);
  fireEvent.click(screen.getAllByRole('button')[2]); // 3rd star = rating 3
  expect(onChange).toHaveBeenCalledWith(3);
});

it('shows filled stars up to current rating', () => {
  render(<StarRating value={3} onChange={() => {}} />);
  const buttons = screen.getAllByRole('button');
  expect(buttons[0]).toHaveAttribute('aria-pressed', 'true');
  expect(buttons[3]).toHaveAttribute('aria-pressed', 'false');
});
```

**Step 2: Implement `StarRating.tsx`**

```tsx
import React from 'react';

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  readonly?: boolean;
}

export function StarRating({ value, onChange, readonly = false }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="button"
          aria-pressed={star <= value}
          aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
          disabled={readonly}
          onClick={() => onChange(star)}
          className={`text-lg transition-colors disabled:cursor-default ${
            star <= value ? 'text-yellow-400' : 'text-slate-700 hover:text-yellow-400/60'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
```

**Step 3: Add `rating` to `HistoryEntry` in `historyService.ts`**

In the `HistoryEntry` interface, add:

```ts
rating?: number; // 1-5
```

Add method to `HistoryService` class:

```ts
async rateEntry(id: string, rating: number): Promise<HistoryEntry | null> {
  return this.updateEntry(id, { rating });
}
```

**Step 4: Add `rateEntry` to `useHistoryStore.ts`**

```ts
rateEntry: async (id: string, rating: number) => {
  const updated = await historyService.rateEntry(id, rating);
  if (updated) {
    const entries = await historyService.getEntries(get().filter);
    set({ entries });
  }
},
```

**Step 5: Add `StarRating` to `HistoryPanel.tsx`**

For each history entry card in the panel, render:

```tsx
import { StarRating } from '@shared/components/ui/StarRating';
import { useHistoryStore } from '@core/store/useHistoryStore';

const { rateEntry } = useHistoryStore();

// In entry card:
<StarRating value={entry.rating ?? 0} onChange={(rating) => rateEntry(entry.id, rating)} />;
```

**Step 6: Run tests**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && npm test -- StarRating 2>&1 | tail -20
```

**Step 7: Commit**

```bash
git add -A && git commit -m "feat(history): add 1-5 star rating to prompt history entries"
```

---

## Task 6: API Key Storage via OS Keychain (keytar)

**Scope:** In Electron, use `keytar` (OS keychain) to store the API key instead of `localStorage`. Falls back to localStorage in browser/non-Electron environments.

**Files:**

- Modify: `package.json` — add `keytar` to dependencies
- Modify: `electron/main.cjs` — add IPC handlers for keytar get/set/delete
- Modify: `electron/preload.cjs` — expose keychain IPC calls
- Modify: `src/core/services/apiKeyService.ts` — use keychain when available
- Create: `src/core/services/apiKeyService.test.ts`

**Step 1: Install keytar**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && npm install keytar
```

**Step 2: Add IPC handlers to `electron/main.cjs`**

After existing ipcMain handlers, add:

```js
const SERVICE_NAME = 'veo-prompt-generator';
const ACCOUNT_NAME = 'gemini-api-key';

// Try to load keytar — gracefully degrade if native module not available
let keytar = null;
try {
  keytar = require('keytar');
} catch (_) {
  console.warn('keytar not available, falling back to renderer storage');
}

ipcMain.handle('keychain-get', async () => {
  if (!keytar) return null;
  try {
    return await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
  } catch {
    return null;
  }
});

ipcMain.handle('keychain-set', async (_event, apiKey) => {
  if (!keytar) return false;
  try {
    await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, apiKey);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('keychain-delete', async () => {
  if (!keytar) return false;
  try {
    return await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
  } catch {
    return false;
  }
});
```

**Step 3: Expose via `preload.cjs`**

In the `contextBridge.exposeInMainWorld('electron', {...})` object, add:

```js
keychainGet: () => ipcRenderer.invoke('keychain-get'),
keychainSet: (apiKey) => ipcRenderer.invoke('keychain-set', apiKey),
keychainDelete: () => ipcRenderer.invoke('keychain-delete'),
```

**Step 4: Update `apiKeyService.ts`**

```ts
const API_KEY_STORAGE_KEY = 'veo-gemini-api-key';

function isElectron(): boolean {
  return typeof window !== 'undefined' && 'electron' in window;
}

export const getStoredApiKey = async (): Promise<string | null> => {
  if (isElectron()) {
    try {
      const key = await (window as any).electron.keychainGet();
      if (key) return key;
    } catch {
      /* fall through to localStorage */
    }
  }
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || null;
  } catch {
    return null;
  }
};

export const setStoredApiKey = async (apiKey: string): Promise<void> => {
  if (isElectron()) {
    try {
      const ok = await (window as any).electron.keychainSet(apiKey);
      if (ok) return;
    } catch {
      /* fall through */
    }
  }
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
  } catch (e) {
    logger.error('Failed to store API key:', e);
  }
};

export const clearStoredApiKey = async (): Promise<void> => {
  if (isElectron()) {
    try {
      await (window as any).electron.keychainDelete();
    } catch {
      /* continue */
    }
  }
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch (e) {
    logger.error('Failed to clear API key:', e);
  }
};

export const hasApiKey = async (): Promise<boolean> => {
  const key = await getStoredApiKey();
  return !!key && key.length > 0;
};
```

**Important:** `getStoredApiKey` and `hasApiKey` are now async. Find all call sites and update them:

- `src/App.tsx` — `setApiKeyConfigured(await hasApiKey())`
- `src/features/settings/ApiKeyModal.tsx` — await calls
- Any other consumers — grep for `hasApiKey()` and `getStoredApiKey()`

**Step 5: Write tests for apiKeyService**

`src/core/services/apiKeyService.test.ts`:

```ts
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey, hasApiKey } from './apiKeyService';

beforeEach(() => {
  localStorage.clear();
  // Ensure no electron mock
  delete (global as any).window.electron;
});

it('returns null when nothing stored', async () => {
  expect(await getStoredApiKey()).toBeNull();
});

it('stores and retrieves key via localStorage', async () => {
  await setStoredApiKey('my-key');
  expect(await getStoredApiKey()).toBe('my-key');
});

it('hasApiKey returns false when empty', async () => {
  expect(await hasApiKey()).toBe(false);
});

it('hasApiKey returns true after setting key', async () => {
  await setStoredApiKey('test-key');
  expect(await hasApiKey()).toBe(true);
});

it('clearStoredApiKey removes the key', async () => {
  await setStoredApiKey('to-delete');
  await clearStoredApiKey();
  expect(await getStoredApiKey()).toBeNull();
});
```

**Step 6: Run tests**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && npm test -- apiKeyService 2>&1 | tail -20
```

**Step 7: Commit**

```bash
git add -A && git commit -m "feat(security): store API key in OS keychain via keytar with localStorage fallback"
```

---

## Task 7: Collaboration Local-Only Badge

**Scope:** The collaboration features (ShareDialog, CommentPanel) use BroadcastChannel — same-machine only. Add a visible "Local only" badge so users understand the limitation and don't expect cross-device sync.

**Files:**

- Create: `src/features/collaboration/LocalOnlyBadge.tsx`
- Modify: `src/features/collaboration/ShareDialog.tsx` — add badge to header
- Modify: `src/features/collaboration/CommentPanel.tsx` — add badge to header
- Create: `src/features/collaboration/LocalOnlyBadge.test.tsx`

**Step 1: Create `LocalOnlyBadge.tsx`**

```tsx
import React from 'react';

export function LocalOnlyBadge() {
  return (
    <span
      title="Sync uses BroadcastChannel — works between windows on the same machine only. No cloud sync."
      className="inline-flex items-center gap-1 rounded-full border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs text-slate-400"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
      Local only
    </span>
  );
}
```

**Step 2: Write test**

`src/features/collaboration/LocalOnlyBadge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { LocalOnlyBadge } from './LocalOnlyBadge';

it('renders local only text', () => {
  render(<LocalOnlyBadge />);
  expect(screen.getByText(/local only/i)).toBeInTheDocument();
});

it('has descriptive title attribute', () => {
  render(<LocalOnlyBadge />);
  expect(screen.getByTitle(/BroadcastChannel/i)).toBeInTheDocument();
});
```

**Step 3: Add to `ShareDialog.tsx`**

In the dialog header/title area, import and render `<LocalOnlyBadge />` next to the title.

**Step 4: Add to `CommentPanel.tsx`**

Same — import and render `<LocalOnlyBadge />` in the panel header.

**Step 5: Run tests**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && npm test -- LocalOnlyBadge 2>&1 | tail -20
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat(collaboration): add local-only badge to sync-dependent panels"
```

---

## Task 8: Focus Mode (UX Hierarchy)

**Scope:** A "Focus Mode" toggle in the sidebar that hides advanced studio nav items and collaboration panels, presenting only the core prompt workflow. Persisted to IndexedDB via the settings store.

**Files:**

- Modify: `src/core/store/useSettingsStore.ts` — add `focusMode: boolean` + `toggleFocusMode`
- Modify: `src/shared/components/layout/Sidebar.tsx` — hide advanced items when focusMode true
- Create: `src/features/prompt/FocusModeBanner.tsx` — subtle banner when focus mode is active
- Modify: `src/features/prompt/PromptWorkspace.tsx` — show banner
- Create: `src/features/prompt/FocusModeBanner.test.tsx`

**Step 1: Add `focusMode` to settings store**

In `src/core/store/useSettingsStore.ts`, find the state interface and add:

```ts
focusMode: boolean;
toggleFocusMode: () => void;
```

In the `create(...)` call, add to state:

```ts
focusMode: false,
toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
```

Ensure `focusMode` is included in the persist config (it should be inside `partialize` if used).

**Step 2: Create `FocusModeBanner.tsx`**

```tsx
import React from 'react';
import { useSettingsStore } from '@core/store/useSettingsStore';

export function FocusModeBanner() {
  const { focusMode, toggleFocusMode } = useSettingsStore();
  if (!focusMode) return null;

  return (
    <div className="flex items-center justify-between rounded-lg border border-indigo-800/40 bg-indigo-950/30 px-4 py-2 text-sm text-indigo-300 mb-4">
      <span>Focus Mode is on — advanced studios are hidden.</span>
      <button onClick={toggleFocusMode} className="ml-4 text-xs underline hover:text-indigo-200">
        Exit
      </button>
    </div>
  );
}
```

**Step 3: Update Sidebar**

In the Sidebar component, consume `useSettingsStore`:

```ts
const { focusMode, toggleFocusMode } = useSettingsStore();
```

Wrap advanced nav items (studios, collaboration, diagnostics, workspace manager) with:

```tsx
{!focusMode && (
  <NavItem ... /> // studios, collaborate, comments, etc.
)}
```

Add a Focus Mode toggle nav item at the bottom:

```tsx
<NavItem
  icon="focus"
  label={focusMode ? 'Exit Focus' : 'Focus Mode'}
  onClick={toggleFocusMode}
  active={focusMode}
/>
```

**Step 4: Write test**

`src/features/prompt/FocusModeBanner.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { FocusModeBanner } from './FocusModeBanner';
import { useSettingsStore } from '@core/store/useSettingsStore';

it('renders nothing when focusMode is false', () => {
  useSettingsStore.setState({ focusMode: false });
  const { container } = render(<FocusModeBanner />);
  expect(container).toBeEmptyDOMElement();
});

it('renders banner when focusMode is true', () => {
  useSettingsStore.setState({ focusMode: true });
  render(<FocusModeBanner />);
  expect(screen.getByText(/focus mode is on/i)).toBeInTheDocument();
});
```

**Step 5: Run tests**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && npm test -- FocusModeBanner 2>&1 | tail -20
```

**Step 6: Commit**

```bash
git add -A && git commit -m "feat(ux): add Focus Mode to sidebar that hides advanced features"
```

---

## Task 9: Theme CSS Migration (.light → [data-theme='light'])

**Scope:** Migrate all `.light` CSS class selectors in `src/shared/styles/index.css` to `[data-theme='light']` in `tokens.css`. Add a CI check script that fails if any `.light` selectors are found in CSS files.

**Files:**

- Read: `src/shared/styles/index.css` (count and locate `.light` selectors)
- Modify: `src/shared/styles/index.css` — migrate selectors
- Modify: `src/shared/styles/tokens.css` — add migrated rules
- Create: `scripts/check-theme-classes.mjs`
- Modify: `package.json` — add `"theme:check"` script and include in `validate`

**Step 1: Audit `.light` selectors**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && grep -n "\.light" src/shared/styles/index.css | head -60
```

**Step 2: Create CI check script**

`scripts/check-theme-classes.mjs`:

```mjs
#!/usr/bin/env node
/**
 * Fails if any .light CSS class selectors are found in source CSS files.
 * All light-mode rules must use [data-theme='light'] in tokens.css.
 */
import { readFileSync, readdirSync } from 'fs';
import { join, extname } from 'path';

const CSS_DIRS = ['src/shared/styles', 'src'];
const PATTERN = /\.light[\s{,:>+~[]/;

let violations = 0;

function checkDir(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      checkDir(full);
      continue;
    }
    if (extname(e.name) !== '.css') continue;
    const content = readFileSync(full, 'utf-8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (PATTERN.test(line)) {
        console.error(`[theme-check] FAIL: ${full}:${i + 1}: ${line.trim()}`);
        violations++;
      }
    });
  }
}

for (const dir of CSS_DIRS) checkDir(dir);

if (violations > 0) {
  console.error(`\n${violations} .light selector(s) found. Use [data-theme='light'] instead.`);
  process.exit(1);
} else {
  console.log('[theme-check] OK — no .light selectors found');
}
```

**Step 3: Add to package.json scripts**

```json
"theme:check": "node scripts/check-theme-classes.mjs"
```

And append `&& npm run theme:check` to the `validate` script.

**Step 4: Migrate selectors in `index.css`**

For each `.light .some-class { ... }` block found in Step 1, move the rules to `tokens.css` under:

```css
[data-theme='light'] .some-class {
  /* same rules */
}
```

**Step 5: Run theme check**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && node scripts/check-theme-classes.mjs
```

Expected: `OK — no .light selectors found`

**Step 6: Run full validate**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && npm run validate 2>&1 | tail -20
```

**Step 7: Commit**

```bash
git add -A && git commit -m "refactor(theme): migrate .light CSS selectors to [data-theme='light']"
```

---

## Task 10: Tier 1 Service Tests

**Scope:** Write unit tests for the three highest-risk untested services: `presetManager.ts`, `colorGradeService.ts`, and `authService.ts` (or equivalent highest-risk services based on complexity).

**Files:**

- Create: `src/core/services/presetManager.test.ts`
- Create: `src/core/services/colorGradeService.test.ts`
- Create: `src/core/services/authService.test.ts`

**Step 1: Read each service**

Before writing tests, read:

- `src/core/services/presetManager.ts` (understand public API)
- `src/core/services/colorGradeService.ts`
- `src/core/services/authService.ts`

**Step 2: Write presetManager tests**

Focus on the public singleton methods: `getPresets()`, `savePreset()`, `deletePreset()`, `applyPreset()`.

```ts
import { presetManager } from './presetManager';

beforeEach(async () => {
  // Clear all persisted presets
  (await presetManager.clearAll?.()) ?? null;
  vi.resetAllMocks();
});

it('returns built-in presets by default', async () => {
  const presets = await presetManager.getPresets();
  expect(presets.length).toBeGreaterThan(0);
});

it('saves a custom preset and retrieves it', async () => {
  await presetManager.savePreset({ id: 'test', name: 'My Preset', promptState: {} as any });
  const presets = await presetManager.getPresets();
  expect(presets.some((p) => p.id === 'test')).toBe(true);
});

it('deletes a preset', async () => {
  await presetManager.savePreset({ id: 'del-me', name: 'Del', promptState: {} as any });
  await presetManager.deletePreset('del-me');
  const presets = await presetManager.getPresets();
  expect(presets.some((p) => p.id === 'del-me')).toBe(false);
});
```

Adapt method names to match actual `presetManager` API after reading the file.

**Step 3: Write colorGradeService tests**

Focus on color grading logic — pure functions where possible, mock IDB calls for state-dependent functions.

**Step 4: Run new tests**

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && npm test -- presetManager colorGradeService authService 2>&1 | tail -30
```

**Step 5: Commit**

```bash
git add -A && git commit -m "test(services): add Tier 1 unit tests for presetManager, colorGradeService, authService"
```

---

## Final Validation

After all 10 tasks are done:

```bash
cd "c:/Users/loofi/Documents/Dev/repos/loofi/veo-prompt-generator" && npm run validate
```

Expected: All checks green (lint, typecheck, tests, format, theme:check, mcp:check, agents:check).

---

## Execution Order

Tasks can be done in this order (low-risk first):

1. Task 1 — Geolocation removal (low risk, cleanup)
2. Task 7 — Local-only badge (trivial, additive)
3. Task 2 — Ollama status badge (additive, new component)
4. Task 4 — Live prompt preview (additive, new component)
5. Task 5 — Prompt ratings (additive, new data field)
6. Task 8 — Focus mode (additive, settings + sidebar)
7. Task 9 — Theme CSS migration (CSS refactor, validate after)
8. Task 3 — PromptLogicContext (refactor, highest impact)
9. Task 6 — keytar API key (Electron + async refactor)
10. Task 10 — Tier 1 tests (test coverage, final)
