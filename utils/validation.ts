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
    const limit = CHARACTER_LIMITS[name as keyof typeof CHARACTER_LIMITS];
    if (limit && typeof value === 'string' && value.length > limit) {
      const fieldName = t.fieldLabels?.[name] || name;
      return t.errorFieldTooLong.replace('{field}', fieldName).replace('{limit}', limit);
    }

    // Apply restricted keyword check to all relevant user-provided string fields
    const fieldsToCheckKeywords: (keyof PromptState)[] = [
        'idea', 
        'environment', 
        'characterActions', 
        'voiceOver', 
        'negativePrompt', 
        'customArtStyle', 
        'characterSpecificClothing', 
        'characterAccessories',
        'imageStudioPrompt'
    ];
    if (fieldsToCheckKeywords.includes(name) && typeof value === 'string' && RESTRICTED_KEYWORDS.some(k => value.toLowerCase().includes(k))) {
      const fieldName = t.fieldLabels?.[name] || name;
      return t.errorRestrictedKeywordInField.replace('{field}', fieldName);
    }

    // Conditional validation for character clothing details.
    const isCheckingClothingDetails = name === 'characterSpecificClothing';

    if (isCheckingClothingDetails) {
        // This validation triggers if the user has described a character's actions
        // and chosen a specific clothing style, but hasn't described the items yet.
        const characterIsActive = !!state.characterActions?.trim();
        const clothingStyleIsSpecified = state.characterClothing !== 'Any';
        const clothingDetailsAreMissing = !value || !value.trim();

        const requiresClothingDetails = characterIsActive && clothingStyleIsSpecified && clothingDetailsAreMissing;

        if (requiresClothingDetails) {
            return t.errorClothingDetailsRequired;
        }
    }

    if (name === 'youtubeUrl' && value && !/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/.test(value)) {
        return t.errorInvalidUrl;
    }
    if (name === 'customArtStyle' && state.artStyle === 'Custom' && (!value || !value.trim())) {
      return t.errorCustomStyleRequired;
    }
    if (name === 'voiceOver' && state.voiceStyle !== 'None' && (!value || !value.trim())) {
      return t.errorVoiceOverRequired;
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