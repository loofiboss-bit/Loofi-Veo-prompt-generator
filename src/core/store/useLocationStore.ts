import { create } from 'zustand';
import { LocationProfile } from '@core/types';
import { logger } from '@core/services/loggerService';
import { continuityService } from '@core/services/continuityService';
import { useAppStore } from './useAppStore';

interface LocationStore {
  locations: LocationProfile[];
  addLocation: (location: LocationProfile) => void;
  updateLocation: (id: string, updates: Partial<LocationProfile>) => void;
  deleteLocation: (id: string) => void;
  setLocations: (locations: LocationProfile[]) => void;
}

const LOCAL_STORAGE_KEY = 'veo_location_bank';

const getSavedLocations = (): LocationProfile[] => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    logger.error('Failed to load locations', e);
    return [];
  }
};

const syncLocationProfiles = (locations: LocationProfile[]) => {
  const appState = useAppStore.getState();
  const locationIds = new Set(locations.map((location) => location.id));
  const retainedProfiles = appState.productionBible.profiles.filter(
    (profile) =>
      profile.kind !== 'location' ||
      profile.provenance.source !== 'legacy-location-bank' ||
      Boolean(profile.provenance.sourceId && locationIds.has(profile.provenance.sourceId)),
  );
  const bible = locations.reduce(
    (current, location) =>
      continuityService.upsertProfile(
        current,
        continuityService.createProfileFromLocation(location),
      ),
    { ...appState.productionBible, profiles: retainedProfiles },
  );
  appState.setProductionBible(bible);
};

export const useLocationStore = create<LocationStore>((set) => ({
  locations: getSavedLocations(),

  addLocation: (location) =>
    set((state) => {
      const updated = [location, ...state.locations];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      syncLocationProfiles(updated);
      return { locations: updated };
    }),

  updateLocation: (id, updates) =>
    set((state) => {
      const updated = state.locations.map((loc) => (loc.id === id ? { ...loc, ...updates } : loc));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      syncLocationProfiles(updated);
      return { locations: updated };
    }),

  deleteLocation: (id) =>
    set((state) => {
      const updated = state.locations.filter((loc) => loc.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      syncLocationProfiles(updated);
      return { locations: updated };
    }),

  setLocations: (locations) =>
    set(() => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(locations));
      syncLocationProfiles(locations);
      return { locations };
    }),
}));
