/**
 * Variable Parser Utility
 * Handles variable placeholders in prompts with auto-fill
 */

import { logger } from '@core/services/loggerService';

export interface Variable {
    name: string;
    value: string;
    description?: string;
    category?: VariableCategory;
}

export type VariableCategory =
    | 'character'
    | 'location'
    | 'time'
    | 'camera'
    | 'style'
    | 'custom';

export interface VariableMatch {
    variable: string;
    start: number;
    end: number;
    fullMatch: string;
}

// Variable syntax: {{variable_name}} or {{variable_name:default_value}}
const VARIABLE_REGEX = /\{\{([a-zA-Z0-9_]+)(?::([^}]+))?\}\}/g;

/**
 * Built-in variables
 */
export const BUILT_IN_VARIABLES: Record<string, Variable> = {
    character_name: {
        name: 'character_name',
        value: '',
        description: 'Name of the main character',
        category: 'character',
    },
    character_age: {
        name: 'character_age',
        value: '',
        description: 'Age of the character',
        category: 'character',
    },
    character_gender: {
        name: 'character_gender',
        value: '',
        description: 'Gender of the character',
        category: 'character',
    },
    character_clothing: {
        name: 'character_clothing',
        value: '',
        description: 'Character clothing description',
        category: 'character',
    },
    location_name: {
        name: 'location_name',
        value: '',
        description: 'Name of the location',
        category: 'location',
    },
    location_type: {
        name: 'location_type',
        value: '',
        description: 'Type of location (indoor/outdoor)',
        category: 'location',
    },
    time_of_day: {
        name: 'time_of_day',
        value: '',
        description: 'Time of day (morning, afternoon, etc.)',
        category: 'time',
    },
    weather: {
        name: 'weather',
        value: '',
        description: 'Weather conditions',
        category: 'time',
    },
    camera_movement: {
        name: 'camera_movement',
        value: '',
        description: 'Camera movement type',
        category: 'camera',
    },
    camera_angle: {
        name: 'camera_angle',
        value: '',
        description: 'Camera angle',
        category: 'camera',
    },
    art_style: {
        name: 'art_style',
        value: '',
        description: 'Artistic style',
        category: 'style',
    },
    color_palette: {
        name: 'color_palette',
        value: '',
        description: 'Color palette description',
        category: 'style',
    },
};

/**
 * Parse text and find all variable placeholders
 */
export function findVariables(text: string): VariableMatch[] {
    const matches: VariableMatch[] = [];
    let match;

    const regex = new RegExp(VARIABLE_REGEX);

    while ((match = regex.exec(text)) !== null) {
        matches.push({
            variable: match[1],
            start: match.index,
            end: match.index + match[0].length,
            fullMatch: match[0],
        });
    }

    return matches;
}

/**
 * Replace variables in text with their values
 */
export function replaceVariables(
    text: string,
    variables: Record<string, string>,
    options: {
        useDefaults?: boolean;
        throwOnMissing?: boolean;
    } = {}
): string {
    const { useDefaults = true, throwOnMissing = false } = options;

    return text.replace(VARIABLE_REGEX, (match, varName, defaultValue) => {
        // Check if variable has a value
        if (variables[varName] !== undefined && variables[varName] !== '') {
            return variables[varName];
        }

        // Use default value if provided
        if (useDefaults && defaultValue !== undefined) {
            return defaultValue;
        }

        // Throw error if required
        if (throwOnMissing) {
            throw new Error(`Variable '${varName}' is not defined`);
        }

        // Return original placeholder
        logger.warn(`Variable '${varName}' not found, keeping placeholder`);
        return match;
    });
}

/**
 * Validate text for missing variables
 */
export function validateVariables(
    text: string,
    variables: Record<string, string>
): { isValid: boolean; missing: string[] } {
    const matches = findVariables(text);
    const missing: string[] = [];

    for (const match of matches) {
        if (!variables[match.variable] || variables[match.variable] === '') {
            missing.push(match.variable);
        }
    }

    return {
        isValid: missing.length === 0,
        missing: [...new Set(missing)], // Remove duplicates
    };
}

/**
 * Extract variable definitions from prompt state
 */
export function extractVariablesFromState(promptState: any): Record<string, string> {
    const variables: Record<string, string> = {};

    // Character variables
    if (promptState.characterGender) variables.character_gender = promptState.characterGender;
    if (promptState.characterAge) variables.character_age = promptState.characterAge;
    if (promptState.characterClothing) variables.character_clothing = promptState.characterClothing;
    if (promptState.characterEthnicity) variables.character_ethnicity = promptState.characterEthnicity;

    // Location variables
    if (promptState.environment) variables.location_name = promptState.environment;
    if (promptState.architecturalStyle) variables.location_type = promptState.architecturalStyle;

    // Time variables
    if (promptState.timeOfDay) variables.time_of_day = promptState.timeOfDay;
    if (promptState.weather) variables.weather = promptState.weather;

    // Camera variables
    if (promptState.cameraMovement) variables.camera_movement = promptState.cameraMovement;
    if (promptState.cameraDistance) variables.camera_angle = promptState.cameraDistance;

    // Style variables
    if (promptState.artStyle) variables.art_style = promptState.artStyle;
    if (promptState.colorPalette) variables.color_palette = promptState.colorPalette;

    return variables;
}

/**
 * Get autocomplete suggestions for variables
 */
export function getAutocompleteSuggestions(
    input: string,
    cursorPosition: number,
    availableVariables: Record<string, Variable>
): Variable[] {
    // Check if cursor is inside a variable placeholder
    const textBeforeCursor = input.substring(0, cursorPosition);
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
    const lastCloseBrace = textBeforeCursor.lastIndexOf('}}');

    // Not inside a variable placeholder
    if (lastOpenBrace === -1 || lastCloseBrace > lastOpenBrace) {
        return [];
    }

    // Extract partial variable name
    const partialVar = textBeforeCursor.substring(lastOpenBrace + 2);

    // Filter variables that match
    return Object.values(availableVariables).filter(v =>
        v.name.toLowerCase().startsWith(partialVar.toLowerCase())
    );
}

/**
 * Insert variable at cursor position
 */
export function insertVariable(
    text: string,
    cursorPosition: number,
    variableName: string,
    defaultValue?: string
): { newText: string; newCursorPosition: number } {
    const placeholder = defaultValue
        ? `{{${variableName}:${defaultValue}}}`
        : `{{${variableName}}}`;

    const before = text.substring(0, cursorPosition);
    const after = text.substring(cursorPosition);

    return {
        newText: before + placeholder + after,
        newCursorPosition: cursorPosition + placeholder.length,
    };
}

/**
 * Get all unique variables used in text
 */
export function getUsedVariables(text: string): string[] {
    const matches = findVariables(text);
    const uniqueVars = new Set(matches.map(m => m.variable));
    return Array.from(uniqueVars);
}

/**
 * Create custom variable
 */
export function createCustomVariable(
    name: string,
    value: string,
    description?: string
): Variable {
    // Validate variable name
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
        throw new Error('Variable name can only contain letters, numbers, and underscores');
    }

    return {
        name,
        value,
        description,
        category: 'custom',
    };
}

/**
 * Format variable for display
 */
export function formatVariableDisplay(variable: Variable): string {
    return `{{${variable.name}}}${variable.description ? ` - ${variable.description}` : ''}`;
}

/**
 * Parse variable with default value
 */
export function parseVariableWithDefault(placeholder: string): {
    name: string;
    defaultValue?: string;
} {
    const match = placeholder.match(/\{\{([a-zA-Z0-9_]+)(?::([^}]+))?\}\}/);

    if (!match) {
        throw new Error('Invalid variable placeholder');
    }

    return {
        name: match[1],
        defaultValue: match[2],
    };
}

/**
 * Get variables by category
 */
export function getVariablesByCategory(
    variables: Record<string, Variable>,
    category: VariableCategory
): Variable[] {
    return Object.values(variables).filter(v => v.category === category);
}

/**
 * Merge variable sets
 */
export function mergeVariables(
    ...variableSets: Record<string, string>[]
): Record<string, string> {
    return Object.assign({}, ...variableSets);
}

/**
 * Export variables to JSON
 */
export function exportVariables(variables: Record<string, Variable>): string {
    const exportData = {
        version: '1.2.0',
        exportDate: new Date().toISOString(),
        variables: Object.values(variables).filter(v => v.category === 'custom'),
    };

    return JSON.stringify(exportData, null, 2);
}

/**
 * Import variables from JSON
 */
export function importVariables(jsonData: string): Variable[] {
    try {
        const data = JSON.parse(jsonData);

        if (!data.variables || !Array.isArray(data.variables)) {
            throw new Error('Invalid variables data format');
        }

        return data.variables.map((v: any) => ({
            name: v.name,
            value: v.value || '',
            description: v.description,
            category: v.category || 'custom',
        }));
    } catch (error) {
        logger.error('Failed to import variables', error);
        throw error;
    }
}

/**
 * Highlight variables in text for UI display
 */
export function highlightVariables(text: string): Array<{
    type: 'text' | 'variable';
    content: string;
    variable?: string;
}> {
    const result: Array<{ type: 'text' | 'variable'; content: string; variable?: string }> = [];
    let lastIndex = 0;

    const matches = findVariables(text);

    for (const match of matches) {
        // Add text before variable
        if (match.start > lastIndex) {
            result.push({
                type: 'text',
                content: text.substring(lastIndex, match.start),
            });
        }

        // Add variable
        result.push({
            type: 'variable',
            content: match.fullMatch,
            variable: match.variable,
        });

        lastIndex = match.end;
    }

    // Add remaining text
    if (lastIndex < text.length) {
        result.push({
            type: 'text',
            content: text.substring(lastIndex),
        });
    }

    return result;
}
