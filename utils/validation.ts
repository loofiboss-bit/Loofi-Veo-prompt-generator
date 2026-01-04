
import { PromptState } from '../types';
import { CHARACTER_LIMITS, RESTRICTED_KEYWORDS } from '../constants';

type ValidationErrors = Partial<Record<keyof PromptState, string>>;
// A generic type for the translation object
type TranslationObject = { [key: string]: any };

/**
 * Validates a single field based on the overall prompt state.
 * @param name - The key of the field to validate.
 * @param value - The value of the field to validate.
 * @param state - The full state of the prompt form.
 * @param t - The translation object for error messages.
 * @returns An error message string or undefined if valid.
 */
export const validateField = (
    name: keyof PromptState, 
    value: any, 
    state: PromptState,
    t: TranslationObject
): string | undefined => {
    // Limits
    const limit = CHARACTER_LIMITS[name as keyof typeof CHARACTER_LIMITS];
    if (limit && typeof value === 'string' && value.length > limit) {
      const fieldName = t.fieldLabels?.[name] || name;
      return t.errorFieldTooLong.replace('{field}', fieldName).replace('{limit}', limit);
    }

    // Keywords
    const fieldsToCheckKeywords: (keyof PromptState)[] = [
        'idea', 
        'environment', 
        'characterActions', 
        'voiceOver', 
        'negativePrompt', 
        'customArtStyle', 
        'characterSpecificClothing', 
        'characterAccessories',
        'youtubeUrl',
        'imageStudioPrompt'
    ];
    if (fieldsToCheckKeywords.includes(name) && typeof value === 'string' && RESTRICTED_KEYWORDS.some(k => value.toLowerCase().includes(k))) {
      const fieldName = t.fieldLabels?.[name] || name;
      return t.errorRestrictedKeywordInField.replace('{field}', fieldName);
    }

    // 1. YouTube URL Validation
    if (name === 'youtubeUrl' && value) {
        // Robust regex for YouTube
        const ytRegex = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/(watch\?v=|v\/|embed\/|shorts\/)|youtu\.be\/)[\w\-]{11}.*$/;
        if (!ytRegex.test(value)) {
             return t.errorInvalidUrl;
        }
    }

    // 2. Custom Art Style Validation
    if (name === 'customArtStyle' && state.artStyle === 'Custom') {
        if (!value || !value.trim()) {
            return t.errorCustomStyleRequired;
        }
        if (value.trim().length < 3) {
            return t.errorCustomStyleTooShort;
        }
    }

    // 3. Character Clothing Validation
    if (name === 'characterSpecificClothing') {
        const clothingStyleSelected = state.characterClothing !== 'Any';
        // If a specific clothing style is chosen, details are mandatory regardless of action
        if (clothingStyleSelected) {
             if (!value || !value.trim()) {
                 return t.errorClothingDetailsRequired;
             }
             if (value.trim().length < 5) {
                 return t.errorClothingDetailsTooShort;
             }
        }
    }

    // Voice Over
    if (name === 'voiceOver' && state.voiceStyle !== 'None') {
        if (!value || !value.trim()) {
            return t.errorVoiceOverRequired;
        }
    }

    return undefined;
};

/**
 * Validates all fields in the prompt state.
 * @param state - The full state of the prompt form.
 * @param t - The translation object for error messages.
 * @returns An object containing any validation errors.
 */
export const validateAllFields = (state: PromptState, t: TranslationObject): ValidationErrors => {
    const errors: ValidationErrors = {};
    (Object.keys(state) as Array<keyof PromptState>).forEach(key => {
        const error = validateField(key, state[key], state, t);
        if (error) {
            errors[key] = error;
        }
    });
    return errors;
};
