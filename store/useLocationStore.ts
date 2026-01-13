
import { create } from 'zustand';
import { LocationProfile } from '../types';

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
        console.error("Failed to load locations", e);
        return [];
    }
};

export const useLocationStore = create<LocationStore>((set) => ({
    locations: getSavedLocations(),

    addLocation: (location) => set((state) => {
        const updated = [location, ...state.locations];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        return { locations: updated };
    }),

    updateLocation: (id, updates) => set((state) => {
        const updated = state.locations.map(loc => 
            loc.id === id ? { ...loc, ...updates } : loc
        );
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        return { locations: updated };
    }),

    deleteLocation: (id) => set((state) => {
        const updated = state.locations.filter(loc => loc.id !== id);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
        return { locations: updated };
    }),

    setLocations: (locations) => set(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(locations));
        return { locations };
    })
}));
