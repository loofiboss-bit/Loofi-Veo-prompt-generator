/**
 * Preset Manager Service
 * Handles management of reusable preset configurations
 */

import { get, set, del } from 'idb-keyval';
import { logger } from './loggerService';

const PRESET_PREFIX = 'preset-';
const PRESET_LIST_KEY = 'presets-list';
const FAVORITES_KEY = 'preset-favorites';
const RECENT_KEY = 'preset-recent';

export type PresetCategory =
  | 'camera'
  | 'lighting'
  | 'style'
  | 'character'
  | 'environment'
  | 'audio'
  | 'effects'
  | 'workflow';

export interface Preset {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  icon?: string;
  params: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  isBuiltIn?: boolean;
  tags?: string[];
  author?: string;
}

/**
 * Built-in presets
 */
const BUILT_IN_PRESETS: Preset[] = [
  // Camera Presets
  {
    id: 'camera-cinematic',
    name: 'Cinematic Camera',
    description: 'Professional cinematic camera movement and framing',
    category: 'camera',
    icon: 'video',
    params: {
      cameraMovement: 'Slow dolly forward',
      cameraDistance: 'Medium shot',
      lensType: 'Anamorphic lens',
      compositionalGuide: 'Rule of thirds',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
  },
  {
    id: 'camera-action',
    name: 'Action Camera',
    description: 'Dynamic, fast-paced camera work for action scenes',
    category: 'camera',
    icon: 'video',
    params: {
      cameraMovement: 'Handheld, shaky',
      cameraDistance: 'Close-up',
      lensType: 'Wide-angle lens',
      motionIntensity: 'High',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
  },
  {
    id: 'camera-drone',
    name: 'Aerial Drone',
    description: 'Sweeping aerial shots from above',
    category: 'camera',
    icon: 'video',
    params: {
      cameraMovement: 'Drone shot, flying over',
      cameraDistance: 'Extreme wide shot',
      lensType: 'Wide-angle lens',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
  },

  // Lighting Presets
  {
    id: 'lighting-golden-hour',
    name: 'Golden Hour',
    description: 'Warm, soft lighting during golden hour',
    category: 'lighting',
    icon: 'sun',
    params: {
      lightingStyle: 'Golden hour',
      timeOfDay: 'Sunset',
      colorPalette: 'Warm, golden tones',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
  },
  {
    id: 'lighting-noir',
    name: 'Film Noir',
    description: 'High contrast, dramatic shadows',
    category: 'lighting',
    icon: 'moon',
    params: {
      lightingStyle: 'High contrast',
      timeOfDay: 'Night',
      colorPalette: 'Black and white',
      visualEffect: 'Film grain',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
  },
  {
    id: 'lighting-neon',
    name: 'Neon Cyberpunk',
    description: 'Vibrant neon lighting for cyberpunk scenes',
    category: 'lighting',
    icon: 'zap',
    params: {
      lightingStyle: 'Neon lighting',
      timeOfDay: 'Night',
      colorPalette: 'Neon colors (pink, blue, purple)',
      visualEffect: 'Bloom',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
  },

  // Style Presets
  {
    id: 'style-photorealistic',
    name: 'Photorealistic',
    description: 'Ultra-realistic, lifelike rendering',
    category: 'style',
    icon: 'palette',
    params: {
      artStyle: 'Photorealistic',
      creativityLevel: 'Balanced',
      resolution: '1080p',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
  },
  {
    id: 'style-anime',
    name: 'Anime Style',
    description: 'Japanese animation aesthetic',
    category: 'style',
    icon: 'palette',
    params: {
      artStyle: 'Anime',
      colorPalette: 'Vibrant and saturated',
      creativityLevel: 'Imaginative',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
  },
  {
    id: 'style-vintage',
    name: 'Vintage Film',
    description: '1950s-70s film aesthetic',
    category: 'style',
    icon: 'history',
    params: {
      artStyle: 'Vintage 1950s film',
      colorPalette: 'Sepia tone',
      visualEffect: 'Film grain',
      aspectRatio: '4:3',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
  },

  // Audio Presets
  {
    id: 'audio-cinematic',
    name: 'Cinematic Audio',
    description: 'Epic orchestral soundtrack with ambient sounds',
    category: 'audio',
    icon: 'audio',
    params: {
      voiceStyle: 'Standard Narrator',
      ambientSound: 'Orchestral music',
      soundEffectsIntensity: 'Medium',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
  },
  {
    id: 'audio-documentary',
    name: 'Documentary Audio',
    description: 'Clear narration with subtle ambient sounds',
    category: 'audio',
    icon: 'mic',
    params: {
      voiceStyle: 'Documentary Narrator',
      ambientSound: 'Subtle background music',
      soundEffectsIntensity: 'Low',
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isBuiltIn: true,
  },
];

/**
 * Get all presets (built-in + user-created)
 */
export async function getAllPresets(): Promise<Preset[]> {
  try {
    const userPresetIds = (await get<string[]>(PRESET_LIST_KEY)) || [];
    const userPresets: Preset[] = [];

    for (const id of userPresetIds) {
      const preset = await get<Preset>(`${PRESET_PREFIX}${id}`);
      if (preset) {
        userPresets.push(preset);
      }
    }

    const allPresets = [...BUILT_IN_PRESETS, ...userPresets];
    logger.debug(
      `Loaded ${allPresets.length} presets (${BUILT_IN_PRESETS.length} built-in, ${userPresets.length} user)`,
    );

    return allPresets.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    logger.error('Failed to load presets', error);
    return BUILT_IN_PRESETS;
  }
}

/**
 * Get presets by category
 */
export async function getPresetsByCategory(category: PresetCategory): Promise<Preset[]> {
  try {
    const allPresets = await getAllPresets();
    return allPresets.filter((preset) => preset.category === category);
  } catch (error) {
    logger.error(`Failed to get presets for category ${category}`, error);
    return [];
  }
}

/**
 * Get a specific preset by ID
 */
export async function getPreset(id: string): Promise<Preset | null> {
  try {
    // Check built-in presets first
    const builtIn = BUILT_IN_PRESETS.find((p) => p.id === id);
    if (builtIn) return builtIn;

    // Check user presets
    const preset = await get<Preset>(`${PRESET_PREFIX}${id}`);
    return preset || null;
  } catch (error) {
    logger.error(`Failed to load preset ${id}`, error);
    return null;
  }
}

/**
 * Save a preset
 */
export async function savePreset(preset: Omit<Preset, 'createdAt' | 'updatedAt'>): Promise<Preset> {
  try {
    const existingPreset = await getPreset(preset.id);
    const now = Date.now();

    const fullPreset: Preset = {
      ...preset,
      createdAt: existingPreset?.createdAt || now,
      updatedAt: now,
    };

    await set(`${PRESET_PREFIX}${preset.id}`, fullPreset);

    // Update preset list
    const presetIds = (await get<string[]>(PRESET_LIST_KEY)) || [];
    if (!presetIds.includes(preset.id)) {
      presetIds.push(preset.id);
      await set(PRESET_LIST_KEY, presetIds);
    }

    logger.info(`Preset saved: ${preset.name}`);
    return fullPreset;
  } catch (error) {
    logger.error('Failed to save preset', error);
    throw error;
  }
}

/**
 * Delete a preset
 */
export async function deletePreset(id: string): Promise<void> {
  try {
    // Cannot delete built-in presets
    if (BUILT_IN_PRESETS.some((p) => p.id === id)) {
      throw new Error('Cannot delete built-in preset');
    }

    await del(`${PRESET_PREFIX}${id}`);

    // Update preset list
    const presetIds = (await get<string[]>(PRESET_LIST_KEY)) || [];
    const updatedIds = presetIds.filter((pid) => pid !== id);
    await set(PRESET_LIST_KEY, updatedIds);

    // Remove from favorites if present
    await removeFromFavorites(id);

    logger.info(`Preset deleted: ${id}`);
  } catch (error) {
    logger.error(`Failed to delete preset ${id}`, error);
    throw error;
  }
}

/**
 * Add preset to favorites
 */
export async function addToFavorites(presetId: string): Promise<void> {
  try {
    const favorites = (await get<string[]>(FAVORITES_KEY)) || [];
    if (!favorites.includes(presetId)) {
      favorites.push(presetId);
      await set(FAVORITES_KEY, favorites);
      logger.debug(`Added preset ${presetId} to favorites`);
    }
  } catch (error) {
    logger.error('Failed to add to favorites', error);
    throw error;
  }
}

/**
 * Remove preset from favorites
 */
export async function removeFromFavorites(presetId: string): Promise<void> {
  try {
    const favorites = (await get<string[]>(FAVORITES_KEY)) || [];
    const updated = favorites.filter((id) => id !== presetId);
    await set(FAVORITES_KEY, updated);
    logger.debug(`Removed preset ${presetId} from favorites`);
  } catch (error) {
    logger.error('Failed to remove from favorites', error);
    throw error;
  }
}

/**
 * Get favorite presets
 */
export async function getFavoritePresets(): Promise<Preset[]> {
  try {
    const favorites = (await get<string[]>(FAVORITES_KEY)) || [];
    const presets: Preset[] = [];

    for (const id of favorites) {
      const preset = await getPreset(id);
      if (preset) {
        presets.push(preset);
      }
    }

    return presets;
  } catch (error) {
    logger.error('Failed to get favorite presets', error);
    return [];
  }
}

/**
 * Track recently used preset
 */
export async function trackRecentPreset(presetId: string): Promise<void> {
  try {
    const recent = (await get<string[]>(RECENT_KEY)) || [];

    // Remove if already exists
    const filtered = recent.filter((id) => id !== presetId);

    // Add to front
    filtered.unshift(presetId);

    // Keep only last 10
    const updated = filtered.slice(0, 10);

    await set(RECENT_KEY, updated);
  } catch (error) {
    logger.error('Failed to track recent preset', error);
  }
}

/**
 * Get recently used presets
 */
export async function getRecentPresets(): Promise<Preset[]> {
  try {
    const recent = (await get<string[]>(RECENT_KEY)) || [];
    const presets: Preset[] = [];

    for (const id of recent) {
      const preset = await getPreset(id);
      if (preset) {
        presets.push(preset);
      }
    }

    return presets;
  } catch (error) {
    logger.error('Failed to get recent presets', error);
    return [];
  }
}

/**
 * Export presets to JSON
 */
export async function exportPresets(presetIds?: string[]): Promise<string> {
  try {
    let presets: Preset[];

    if (presetIds && presetIds.length > 0) {
      presets = [];
      for (const id of presetIds) {
        const preset = await getPreset(id);
        if (preset && !preset.isBuiltIn) {
          presets.push(preset);
        }
      }
    } else {
      const allPresets = await getAllPresets();
      presets = allPresets.filter((p) => !p.isBuiltIn);
    }

    const exportData = {
      version: '1.2.0',
      exportDate: new Date().toISOString(),
      presets,
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    logger.error('Failed to export presets', error);
    throw error;
  }
}

/**
 * Import presets from JSON
 */
export async function importPresets(jsonData: string): Promise<number> {
  try {
    const data = JSON.parse(jsonData);

    if (!data.presets || !Array.isArray(data.presets)) {
      throw new Error('Invalid preset data format');
    }

    let importedCount = 0;

    for (const preset of data.presets) {
      const newPreset = {
        ...preset,
        id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        isBuiltIn: false,
      };

      await savePreset(newPreset);
      importedCount++;
    }

    logger.info(`Imported ${importedCount} presets`);
    return importedCount;
  } catch (error) {
    logger.error('Failed to import presets', error);
    throw error;
  }
}

/**
 * Create preset from params
 */
export function createPreset(
  name: string,
  description: string,
  category: PresetCategory,
  params: Record<string, any>,
  options: {
    icon?: string;
    tags?: string[];
  } = {},
): Omit<Preset, 'createdAt' | 'updatedAt'> {
  const id = `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    name,
    description,
    category,
    icon: options.icon,
    tags: options.tags,
    params,
  };
}
