/**
 * Template Manager Service
 * Handles CRUD operations for user-created prompt templates
 */

import { get, set, del, keys } from 'idb-keyval';
import { PromptTemplate, PromptState } from '@core/types';
import { logger } from './loggerService';

const TEMPLATE_PREFIX = 'user-template-';
const TEMPLATE_LIST_KEY = 'user-templates-list';

export interface UserTemplate extends PromptTemplate {
    createdAt: number;
    updatedAt: number;
    isUserCreated: boolean;
    category?: string;
    tags?: string[];
}

/**
 * Get all user-created templates
 */
export async function getUserTemplates(): Promise<UserTemplate[]> {
    try {
        const templateIds = await get<string[]>(TEMPLATE_LIST_KEY) || [];
        const templates: UserTemplate[] = [];

        for (const id of templateIds) {
            const template = await get<UserTemplate>(`${TEMPLATE_PREFIX}${id}`);
            if (template) {
                templates.push(template);
            }
        }

        logger.debug(`Loaded ${templates.length} user templates`);
        return templates.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
        logger.error('Failed to load user templates', error);
        return [];
    }
}

/**
 * Get a specific template by ID
 */
export async function getTemplate(id: string): Promise<UserTemplate | null> {
    try {
        const template = await get<UserTemplate>(`${TEMPLATE_PREFIX}${id}`);
        return template || null;
    } catch (error) {
        logger.error(`Failed to load template ${id}`, error);
        return null;
    }
}

/**
 * Save a new template or update existing one
 */
export async function saveTemplate(
    template: Omit<UserTemplate, 'createdAt' | 'updatedAt' | 'isUserCreated'>
): Promise<UserTemplate> {
    try {
        const existingTemplate = await getTemplate(template.id);
        const now = Date.now();

        const fullTemplate: UserTemplate = {
            ...template,
            createdAt: existingTemplate?.createdAt || now,
            updatedAt: now,
            isUserCreated: true,
        };

        // Save template
        await set(`${TEMPLATE_PREFIX}${template.id}`, fullTemplate);

        // Update template list
        const templateIds = await get<string[]>(TEMPLATE_LIST_KEY) || [];
        if (!templateIds.includes(template.id)) {
            templateIds.push(template.id);
            await set(TEMPLATE_LIST_KEY, templateIds);
        }

        logger.info(`Template saved: ${template.name}`);
        return fullTemplate;
    } catch (error) {
        logger.error('Failed to save template', error);
        throw error;
    }
}

/**
 * Delete a template
 */
export async function deleteTemplate(id: string): Promise<void> {
    try {
        // Remove template
        await del(`${TEMPLATE_PREFIX}${id}`);

        // Update template list
        const templateIds = await get<string[]>(TEMPLATE_LIST_KEY) || [];
        const updatedIds = templateIds.filter(tid => tid !== id);
        await set(TEMPLATE_LIST_KEY, updatedIds);

        logger.info(`Template deleted: ${id}`);
    } catch (error) {
        logger.error(`Failed to delete template ${id}`, error);
        throw error;
    }
}

/**
 * Create a template from current prompt state
 */
export function createTemplateFromState(
    name: string,
    description: string,
    promptState: PromptState,
    options: {
        icon?: UserTemplate['icon'];
        category?: string;
        tags?: string[];
    } = {}
): Omit<UserTemplate, 'createdAt' | 'updatedAt' | 'isUserCreated'> {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
        id,
        name,
        description,
        icon: options.icon || 'template',
        category: options.category,
        tags: options.tags,
        params: {
            idea: promptState.idea,
            environment: promptState.environment,
            environmentSensoryDetails: promptState.environmentSensoryDetails,
            environmentDynamicEvents: promptState.environmentDynamicEvents,
            architecturalStyle: promptState.architecturalStyle,
            characterActions: promptState.characterActions,
            characterNuances: promptState.characterNuances,
            characterObjectInteraction: promptState.characterObjectInteraction,
            characterGender: promptState.characterGender,
            characterEthnicity: promptState.characterEthnicity,
            characterClothing: promptState.characterClothing,
            characterArchetype: promptState.characterArchetype,
            characterAge: promptState.characterAge,
            characterMood: promptState.characterMood,
            characterPose: promptState.characterPose,
            characterSkinTone: promptState.characterSkinTone,
            characterSpecificClothing: promptState.characterSpecificClothing,
            characterAccessories: promptState.characterAccessories,
            timeOfDay: promptState.timeOfDay,
            weather: promptState.weather,
            voiceOver: promptState.voiceOver,
            voiceStyle: promptState.voiceStyle,
            ambientSound: promptState.ambientSound,
            soundEffectsIntensity: promptState.soundEffectsIntensity,
            artStyle: promptState.artStyle,
            customArtStyle: promptState.customArtStyle,
            lightingStyle: promptState.lightingStyle,
            cameraMovement: promptState.cameraMovement,
            cameraDistance: promptState.cameraDistance,
            lensType: promptState.lensType,
            compositionalGuide: promptState.compositionalGuide,
            visualEffect: promptState.visualEffect,
            colorPalette: promptState.colorPalette,
            aspectRatio: promptState.aspectRatio,
            resolution: promptState.resolution,
            animationPreset: promptState.animationPreset,
            motionIntensity: promptState.motionIntensity,
            creativityLevel: promptState.creativityLevel,
            includeOverlayText: promptState.includeOverlayText,
            overlayTextContent: promptState.overlayTextContent,
            targetModel: promptState.targetModel,
            veoModel: promptState.veoModel,
        },
    };
}

/**
 * Export templates to JSON
 */
export async function exportTemplates(templateIds?: string[]): Promise<string> {
    try {
        let templates: UserTemplate[];

        if (templateIds && templateIds.length > 0) {
            templates = [];
            for (const id of templateIds) {
                const template = await getTemplate(id);
                if (template) {
                    templates.push(template);
                }
            }
        } else {
            templates = await getUserTemplates();
        }

        const exportData = {
            version: '1.2.0',
            exportDate: new Date().toISOString(),
            templates,
        };

        return JSON.stringify(exportData, null, 2);
    } catch (error) {
        logger.error('Failed to export templates', error);
        throw error;
    }
}

/**
 * Import templates from JSON
 */
export async function importTemplates(jsonData: string): Promise<number> {
    try {
        const data = JSON.parse(jsonData);

        if (!data.templates || !Array.isArray(data.templates)) {
            throw new Error('Invalid template data format');
        }

        let importedCount = 0;

        for (const template of data.templates) {
            // Generate new ID to avoid conflicts
            const newTemplate = {
                ...template,
                id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            };

            await saveTemplate(newTemplate);
            importedCount++;
        }

        logger.info(`Imported ${importedCount} templates`);
        return importedCount;
    } catch (error) {
        logger.error('Failed to import templates', error);
        throw error;
    }
}

/**
 * Search templates by name, description, or tags
 */
export async function searchTemplates(query: string): Promise<UserTemplate[]> {
    try {
        const allTemplates = await getUserTemplates();
        const lowerQuery = query.toLowerCase();

        return allTemplates.filter(template => {
            const nameMatch = template.name.toLowerCase().includes(lowerQuery);
            const descMatch = template.description.toLowerCase().includes(lowerQuery);
            const tagMatch = template.tags?.some(tag => tag.toLowerCase().includes(lowerQuery));

            return nameMatch || descMatch || tagMatch;
        });
    } catch (error) {
        logger.error('Failed to search templates', error);
        return [];
    }
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(category: string): Promise<UserTemplate[]> {
    try {
        const allTemplates = await getUserTemplates();
        return allTemplates.filter(template => template.category === category);
    } catch (error) {
        logger.error(`Failed to get templates for category ${category}`, error);
        return [];
    }
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(id: string): Promise<UserTemplate | null> {
    try {
        const original = await getTemplate(id);
        if (!original) {
            throw new Error(`Template ${id} not found`);
        }

        const duplicate = {
            ...original,
            id: `copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: `${original.name} (Copy)`,
        };

        return await saveTemplate(duplicate);
    } catch (error) {
        logger.error(`Failed to duplicate template ${id}`, error);
        return null;
    }
}
