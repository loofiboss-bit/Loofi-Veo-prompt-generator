import { expect, test, type Page } from '@playwright/test';
import { blockExternalRequests, dismissModals } from './helpers';

interface MockStudioProviderState {
  keyAvailable: boolean;
  deferred: boolean;
  approvals: number;
  requests: string[];
  cancellations: number;
  clipboard: string;
  complete?: () => void;
}
type MockStudioWindow = Window & { __studioAiMock: MockStudioProviderState };

/** Exercise the real renderer/provider adapter, with no key, IPC or network provider access. */
async function installMockProvider(
  page: Page,
  options: { keyAvailable?: boolean; deferred?: boolean } = {},
) {
  await page.addInitScript((configuration) => {
    localStorage.setItem('hasSeenWelcome', 'true');
    localStorage.setItem('veo-studio-language', 'en');
    const state: MockStudioProviderState = {
      keyAvailable: configuration.keyAvailable ?? true,
      deferred: configuration.deferred ?? false,
      approvals: 0,
      requests: [],
      cancellations: 0,
      clipboard: '',
    };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          state.clipboard = text;
        },
      },
    });
    Object.assign(window, {
      __studioAiMock: state,
      electron: {
        hasSecureItem: async () => state.keyAvailable,
        approveProviderCost: async () => {
          state.approvals += 1;
          return 'test-only-cost-approval';
        },
        testProviderConnection: async () => ({
          ok: true,
          provider: 'gemini-api',
          message: 'Mock connection',
          hints: [],
        }),
        cancelProviderRequest: async () => {
          state.cancellations += 1;
          return true;
        },
        executeProvider: async (request: { prompt: string; providerModelId: string }) => {
          state.requests.push(request.prompt);
          const match = /^Input JSON: (.+)$/m.exec(request.prompt);
          if (!match) throw new Error('Missing scene context in mock request');
          const input = JSON.parse(match[1]) as Record<string, unknown>;
          const defaults = {
            subject: 'A small fox with a canvas bag',
            action: 'Waits beneath a railway shelter as a train approaches',
            environment: 'A quiet rural platform in gentle rain',
            camera: 'A steady medium shot at fox eye level',
            lighting: 'Warm shelter light against cool dusk',
            style: 'Soft hand-drawn animation',
            audio: 'Rain patter and a distant train',
            dialogue: '',
            negativePrompt: '',
          };
          const details = Object.fromEntries(
            Object.entries(defaults).map(([key, fallback]) => [
              key,
              typeof input[key] === 'string' && input[key].trim() ? input[key] : fallback,
            ]),
          ) as typeof defaults;
          const primary = `${input.idea}. ${details.action}. ${details.camera}.`;
          const body = {
            details,
            creativeDetails: input.creativeDetails ?? { lensType: '50mm' },
            primary,
            cinematic: `${primary} Warm shelter light frames the subject against cool rainy dusk.`,
            controlFocused: `${primary} Keep the subject position and camera movement consistent.`,
            negativePrompt: '',
            recommendations: ['Keep the action in one continuous shot.'],
          };
          const response = { text: JSON.stringify(body), rawModelId: request.providerModelId };
          if (!state.deferred) return response;
          return new Promise<typeof response>((resolve) => {
            state.complete = () => resolve(response);
          });
        },
      },
    });
  }, options);
}

async function openStudio(page: Page) {
  await page.goto('/');
  await dismissModals(page);
  await expect(page.getByLabel(/^Core idea/)).toBeVisible();
}

async function stateSnapshot(page: Page) {
  return page.evaluate(() => {
    const state = (window as MockStudioWindow).__studioAiMock;
    return {
      approvals: state.approvals,
      requests: state.requests.length,
      cancellations: state.cancellations,
      clipboard: state.clipboard,
    };
  });
}

test('one mock Gemini request creates editable details and three prompts, preserves manual camera and supports copying/persistence', async ({
  page,
}) => {
  await blockExternalRequests(page);
  await installMockProvider(page);
  await openStudio(page);
  const idea = 'A fox waits for the last train';
  const manualCamera = '  Locked wide shot; no camera movement.  ';
  await page.getByLabel(/^Core idea/).fill(idea);
  await page.getByText('Scene details', { exact: true }).click();
  await page.getByLabel('Camera', { exact: true }).fill(manualCamera);
  await expect(
    page.getByRole('checkbox', { name: 'Protect Camera from AI', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Create with Gemini', exact: true }).click();
  await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(new RegExp(idea));
  await expect(page.getByLabel('Camera', { exact: true })).toHaveValue(manualCamera);
  await expect(page.getByLabel('Subject', { exact: true })).toHaveValue(
    'A small fox with a canvas bag',
  );
  await expect(page.getByRole('button', { name: 'Undo AI creation', exact: true })).toBeVisible();
  const primary = await page.getByLabel('Primary prompt', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Copy prompt', exact: true }).click();
  expect(await stateSnapshot(page)).toEqual({
    approvals: 1,
    requests: 1,
    cancellations: 0,
    clipboard: primary,
  });
  await page.getByRole('button', { name: 'Cinematic', exact: true }).click();
  await expect(page.getByLabel('Cinematic prompt', { exact: true })).toHaveValue(
    /Warm shelter light/,
  );
  await page.getByRole('button', { name: 'Control-focused', exact: true }).click();
  await expect(page.getByLabel('Control-focused prompt', { exact: true })).toHaveValue(
    /subject position/,
  );
  await page.getByRole('button', { name: 'Primary', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Camera', { exact: true })).toHaveValue(manualCamera);
  await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(primary);
});

test('AI creation can be undone as one change without losing the original brief or manual values', async ({
  page,
}) => {
  await blockExternalRequests(page);
  await installMockProvider(page);
  await openStudio(page);
  await page.getByLabel(/^Core idea/).fill('A fox at a railway shelter');
  await page.getByText('Scene details', { exact: true }).click();
  await page.getByLabel('Camera', { exact: true }).fill('Static composition');
  await page.getByRole('button', { name: 'Create with Gemini', exact: true }).click();
  await expect(page.getByLabel('Primary prompt', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Undo AI creation', exact: true }).click();
  await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel(/^Core idea/)).toHaveValue('A fox at a railway shelter');
  await expect(page.getByLabel('Camera', { exact: true })).toHaveValue('Static composition');
  await expect(page.getByLabel('Subject', { exact: true })).toHaveValue('');
});

test('a cancelled late response cannot replace a newer brief and local compilation remains available', async ({
  page,
}) => {
  await blockExternalRequests(page);
  await installMockProvider(page, { deferred: true });
  await openStudio(page);
  await page.getByLabel(/^Core idea/).fill('The original rainy platform');
  await page.getByRole('button', { name: 'Create with Gemini', exact: true }).click();
  await expect.poll(async () => (await stateSnapshot(page)).requests).toBe(1);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByLabel(/^Core idea/).fill('The revised sunny platform');
  await page.evaluate(() => (window as MockStudioWindow).__studioAiMock.complete?.());
  await expect(page.getByRole('button', { name: 'Create with Gemini', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
  await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(
    /revised sunny platform/,
  );
  await expect(page.getByLabel('Primary prompt', { exact: true })).not.toHaveValue(
    /original rainy platform/,
  );
  expect((await stateSnapshot(page)).requests).toBe(1);
  expect((await stateSnapshot(page)).cancellations).toBeGreaterThan(0);
});

test('a missing key explains the problem and permits a local pack without cost approval or provider execution', async ({
  page,
}) => {
  await blockExternalRequests(page);
  await installMockProvider(page, { keyAvailable: false });
  await openStudio(page);
  await page.getByLabel(/^Core idea/).fill('A lighthouse in rain');
  await page.getByRole('button', { name: 'Create with Gemini', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Configure an AI provider in Settings first');
  await page.getByRole('button', { name: 'Build copy-ready pack', exact: true }).click();
  await expect(page.getByLabel('Primary prompt', { exact: true })).toHaveValue(
    /lighthouse in rain/,
  );
  expect(await stateSnapshot(page)).toEqual({
    approvals: 0,
    requests: 0,
    cancellations: 0,
    clipboard: '',
  });
});
