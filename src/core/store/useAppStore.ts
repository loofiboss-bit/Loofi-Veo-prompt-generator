import { create, StoreApi, UseBoundStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { temporal, TemporalState } from 'zundo';
import { idbStorage } from '@core/utils/storage';
import { INITIAL_STATE } from '@core/constants';
import { logger } from '@core/services/loggerService';
import { continuityService } from '@core/services/continuityService';
import {
  migratePromptStateCollection,
  migratePromptStateTarget,
} from '@core/utils/videoTargetMigration';

import { storeMediator } from './mediator';

// Slices
import { UiSlice, createUiSlice } from './slices/uiSlice';
import { TimelineSlice, createTimelineSlice } from './slices/timelineSlice';
import { PromptSlice, createPromptSlice } from './slices/promptSlice';
import { AssetSlice, createAssetSlice } from './slices/assetSlice';

// Combined State Interface
export type AppState = UiSlice &
  TimelineSlice &
  PromptSlice &
  AssetSlice & {
    _hasHydrated: boolean;
    setHasHydrated: (state: boolean) => void;
    resetAll: () => void;
    setFullState: (newState: Partial<AppState>) => void;
    mutationVersion: number;
  };

const DOCUMENT_MUTATION_KEYS = [
  'promptState',
  'clips',
  'tracks',
  'sbShots',
  'assets',
  'sbGlobalContext',
  'characterBank',
  'visualDNA',
  'productionBible',
] as const;

function hasDocumentMutation(update: unknown): boolean {
  if (!update || typeof update !== 'object') return false;
  return DOCUMENT_MUTATION_KEYS.some((key) => key in (update as Record<string, unknown>));
}

const markAppStoreHydrated = (error?: unknown) => {
  if (error) {
    logger.error('App store hydration failed', error);
  }

  useAppStore.setState({ _hasHydrated: true });
};

export const useAppStore = create<AppState>()(
  temporal(
    persist(
      (set, get, api) => {
        const versionedSet: typeof set = (next, replace) => {
          (set as (...args: unknown[]) => void)((state: AppState) => {
            const patch =
              typeof next === 'function'
                ? (next as (s: AppState) => Partial<AppState>)(state)
                : next;
            if (patch && hasDocumentMutation(patch) && patch.mutationVersion === undefined) {
              return {
                ...patch,
                mutationVersion: (state.mutationVersion ?? 0) + 1,
              };
            }
            return patch;
          }, replace);
        };

        const uiSlice = createUiSlice(
          versionedSet as Parameters<typeof createUiSlice>[0],
          get as Parameters<typeof createUiSlice>[1],
          api as Parameters<typeof createUiSlice>[2],
        );

        const timelineSlice = createTimelineSlice(
          versionedSet as Parameters<typeof createTimelineSlice>[0],
          get as Parameters<typeof createTimelineSlice>[1],
          api as Parameters<typeof createTimelineSlice>[2],
        );
        const promptSlice = createPromptSlice(
          versionedSet as Parameters<typeof createPromptSlice>[0],
          get as Parameters<typeof createPromptSlice>[1],
          api as Parameters<typeof createPromptSlice>[2],
        );
        const assetSlice = createAssetSlice(
          versionedSet as Parameters<typeof createAssetSlice>[0],
          get as Parameters<typeof createAssetSlice>[1],
          api as Parameters<typeof createAssetSlice>[2],
        );

        return {
          ...uiSlice,
          ...timelineSlice,
          ...promptSlice,
          ...assetSlice,

          _hasHydrated: false,
          setHasHydrated: (state) => set({ _hasHydrated: state }),
          mutationVersion: 0,

          // Bulk Sync for Collaboration
          setFullState: (newState) =>
            versionedSet((state) => ({
              ...state,
              ...newState,
              promptState: newState.promptState
                ? migratePromptStateTarget(newState.promptState)
                : state.promptState,
              mutationVersion: (state.mutationVersion ?? 0) + 1,
            })),

          resetAll: () =>
            versionedSet({
              mutationVersion: 0,
              promptState: INITIAL_STATE,
              sbGlobalContext: { style: '', character: '', setting: '' },
              sbShots: [
                {
                  id: 1,
                  type: 'video',
                  action: '',
                  camera: '',
                  characterId: '',
                  takes: [],
                  selectedTakeIndex: 0,
                  visualLink: false,
                  duration: 5,
                  transition: { type: 'cut', duration: 0 },
                },
              ],
              tracks: [
                {
                  id: 'text_main',
                  label: 'Captions/Overlay',
                  type: 'text',
                  trackType: 'captions',
                  zIndex: 10,
                },
                {
                  id: 'video_main',
                  label: 'Video',
                  type: 'video',
                  trackType: 'dialogue',
                  zIndex: 1,
                },
                {
                  id: 'audio_dialogue',
                  label: 'Dialogue',
                  type: 'audio',
                  trackType: 'dialogue',
                  zIndex: 0,
                },
                { id: 'audio_sfx', label: 'SFX', type: 'audio', trackType: 'sfx', zIndex: 0 },
                {
                  id: 'audio_music',
                  label: 'Music',
                  type: 'audio',
                  trackType: 'music',
                  zIndex: 0,
                },
              ],
              clips: [],
              zoomLevel: 20,
              currentTime: 0,
              seriesBible: '',
              credits: 100,
              variables: {
                HERO: 'Detective John',
                THEME: 'Cyberpunk Noir',
                LOCATION: 'Neon City',
              },
            }),
        };
      },
      {
        name: 'veo-prompt-state-v6', // Keep the storage key stable across additive migrations.
        storage: createJSONStorage(() => idbStorage),
        version: 8,
        migrate: (persistedState) => {
          const state = persistedState as Partial<AppState>;
          const migratedBible = continuityService.normalizeBible({
            productionBible: state.productionBible,
            characterBank: state.characterBank,
            visualDNA: state.visualDNA,
          }).productionBible;
          return {
            ...state,
            assetCatalogRevisions: state.assetCatalogRevisions ?? {},
            assetCatalogTombstones: state.assetCatalogTombstones ?? {},
            promptState: state.promptState
              ? migratePromptStateTarget(state.promptState)
              : INITIAL_STATE,
            history: migratePromptStateCollection(state.history),
            customPresets: state.customPresets?.map((preset) => ({
              ...preset,
              params: migratePromptStateTarget(preset.params),
            })),
            productionBible: migratedBible,
          };
        },
        onRehydrateStorage: () => (_state, error) => {
          markAppStoreHydrated(error);
        },
        partialize: (state) => {
          const s = state as AppState;
          // EXCLUDED from IndexedDB persistence (UI-only / transient state):
          //   UiSlice modals:  isHistoryOpen, isTemplatesOpen, isSavePresetModalOpen,
          //                    isDNAModalOpen, isCharacterBankOpen, isLocationBankOpen,
          //                    isProjectManagerOpen, isSeriesBibleOpen, isVariablesPanelOpen,
          //                    isWizardOpen, isNewProjectWizardOpen, isSearchOpen,
          //                    isVariationsOpen, isShortcutsOpen
          //   UiSlice panels:  activeStudio
          //   TimelineSlice:   zoomLevel, currentTime
          //   Root:            _hasHydrated
          return {
            // Prompt Slice (user data)
            promptState: s.promptState,
            sbGlobalContext: s.sbGlobalContext,
            variables: s.variables,
            seriesBible: s.seriesBible,
            credits: s.credits,

            // Timeline Slice (structural data; zoomLevel + currentTime excluded)
            sbShots: s.sbShots,
            tracks: s.tracks,
            clips: s.clips,

            // Asset Slice (user data)
            assets: s.assets,
            assetCatalogRevisions: s.assetCatalogRevisions,
            assetCatalogTombstones: s.assetCatalogTombstones,
            characterBank: s.characterBank,
            history: s.history,
            customPresets: s.customPresets,
            visualDNA: s.visualDNA,
            productionBible: s.productionBible,

            // UI Slice (user preference, not transient)
            theme: s.theme,
          };
        },
      },
    ),
    {
      limit: 50,
      // Only track structural changes to the timeline and shots
      partialize: (state) => ({
        sbShots: state.sbShots,
        tracks: state.tracks,
        clips: state.clips,
        // Explicitly exclude zoomLevel and currentTime from history snapshots
      }),
      // Only add to history if these specific fields change
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    },
  ),
) as unknown as UseBoundStore<StoreApi<AppState>> & { temporal: StoreApi<TemporalState<AppState>> };

/** Explicitly persist the latest user data and wait for catalog writes to finish. */
export async function persistAppStoreNow(): Promise<void> {
  const persistApi = useAppStore as typeof useAppStore & {
    persist: {
      getOptions: () => {
        name: string;
        version?: number;
        partialize?: (state: AppState) => unknown;
      };
    };
  };
  const options = persistApi.persist.getOptions();
  const state = useAppStore.getState();
  const persistedState = options.partialize ? options.partialize(state) : state;
  await idbStorage.setItem(
    options.name,
    JSON.stringify({ state: persistedState, version: options.version }),
  );
  await idbStorage.flush(options.name);
}

const rawSetState = useAppStore.setState;
useAppStore.setState = (next, replace) => {
  const current = useAppStore.getState();
  const patch = typeof next === 'function' ? next(current) : next;
  if (patch && hasDocumentMutation(patch) && patch.mutationVersion === undefined) {
    (rawSetState as (...args: unknown[]) => void)(
      {
        ...patch,
        mutationVersion: (current.mutationVersion ?? 0) + 1,
      },
      replace,
    );
  } else {
    (rawSetState as (...args: unknown[]) => void)(next, replace);
  }
};

// ─── Store Mediator Listeners ────────────────────────────────────────────────

let appStoreMediatorUnsubs: (() => void)[] = [];

export const registerAppStoreMediator = (): (() => void) => {
  appStoreMediatorUnsubs.forEach((unsub) => unsub());
  appStoreMediatorUnsubs = [];

  const handleLocations = ({
    locations,
  }: {
    locations: import('@core/types').LocationProfile[];
  }) => {
    const appState = useAppStore.getState();
    const locationIds = new Set(locations.map((loc) => loc.id));
    const retainedProfiles = appState.productionBible.profiles.filter(
      (profile) =>
        profile.kind !== 'location' ||
        profile.provenance.source !== 'legacy-location-bank' ||
        Boolean(profile.provenance.sourceId && locationIds.has(profile.provenance.sourceId)),
    );
    const bible = locations.reduce(
      (current, loc) =>
        continuityService.upsertProfile(current, continuityService.createProfileFromLocation(loc)),
      { ...appState.productionBible, profiles: retainedProfiles },
    );
    appState.setProductionBible(bible);
  };

  const handleTimelineSync = ({
    shots,
    tracks,
    clips,
  }: {
    shots: import('@core/types').Shot[];
    tracks: import('@core/types').TimelineTrack[];
    clips: import('@core/types').TimelineClip[];
  }) => {
    useAppStore.setState({
      sbShots: shots,
      tracks,
      clips,
    });
  };

  const unsubs: (() => void)[] = [
    storeMediator.on('locations:updated', handleLocations),
    storeMediator.on('location:bankChanged', handleLocations),

    storeMediator.on('asset:upserted', ({ asset }) => {
      const app = useAppStore.getState();
      if (app.assets.some((item) => item.id === asset.id)) {
        app.updateAsset(asset.id, asset);
      } else {
        app.addAsset(asset);
      }
    }),

    storeMediator.on('studioResult:assetsSynchronized', ({ assets }) => {
      const app = useAppStore.getState();
      for (const asset of assets) {
        if (app.assets.some((item) => item.id === asset.id)) app.updateAsset(asset.id, asset);
        else app.addAsset(asset);
      }
    }),

    storeMediator.on('timeline:synced', handleTimelineSync),
    storeMediator.on('studioResult:timelineAccepted', handleTimelineSync),
  ];

  appStoreMediatorUnsubs = unsubs;
  return () => {
    unsubs.forEach((unsub) => unsub());
    appStoreMediatorUnsubs = [];
  };
};

registerAppStoreMediator();
