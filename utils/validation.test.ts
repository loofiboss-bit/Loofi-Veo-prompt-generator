
import { describe, it, expect } from 'vitest';
import { validateField } from './validation';
import { PromptState } from '../types';
import { CHARACTER_LIMITS } from '../constants';

// Mock translation object
const mockT = {
  errorFieldTooLong: '{field} is too long.',
  errorRestrictedKeywordInField: 'Restricted word in {field}.',
  errorCustomStyleRequired: 'Custom style required.',
  errorCustomStyleTooShort: 'Custom style too short.',
  errorClothingDetailsRequired: 'Clothing details required.',
  errorClothingDetailsTooShort: 'Clothing details too short.',
  errorVoiceOverRequired: 'Voice over required.',
  errorInvalidUrl: 'Invalid URL.',
  fieldLabels: {
    idea: 'Idea',
    customArtStyle: 'Custom Style'
  }
};

// Partial mock state for testing
const mockState = {
  artStyle: 'Cinematic',
  characterClothing: 'Any',
  voiceStyle: 'None',
} as PromptState;

describe('validateField', () => {
  it('should return undefined for valid inputs', () => {
    const result = validateField('idea', 'A valid idea', mockState, mockT);
    expect(result).toBeUndefined();
  });

  it('should detect character limit violations', () => {
    const longText = 'a'.repeat(CHARACTER_LIMITS.idea + 1);
    const result = validateField('idea', longText, mockState, mockT);
    expect(result).toContain('is too long');
  });

  it('should validate Custom Art Style requirements', () => {
    const stateWithCustom = { ...mockState, artStyle: 'Custom' };
    
    // Empty
    expect(validateField('customArtStyle', '', stateWithCustom, mockT)).toBe(mockT.errorCustomStyleRequired);
    
    // Too short
    expect(validateField('customArtStyle', 'ab', stateWithCustom, mockT)).toBe(mockT.errorCustomStyleTooShort);
    
    // Valid
    expect(validateField('customArtStyle', 'Valid Style', stateWithCustom, mockT)).toBeUndefined();
  });

  it('should validate Voice Over requirements', () => {
    const stateWithVoice = { ...mockState, voiceStyle: 'Narrator' };
    
    expect(validateField('voiceOver', '', stateWithVoice, mockT)).toBe(mockT.errorVoiceOverRequired);
    expect(validateField('voiceOver', 'Script...', stateWithVoice, mockT)).toBeUndefined();
  });

  it('should validate Character Clothing details', () => {
    const stateWithClothing = { ...mockState, characterClothing: 'Uniform' };
    
    expect(validateField('characterSpecificClothing', '', stateWithClothing, mockT)).toBe(mockT.errorClothingDetailsRequired);
    expect(validateField('characterSpecificClothing', 'abc', stateWithClothing, mockT)).toBe(mockT.errorClothingDetailsTooShort);
    expect(validateField('characterSpecificClothing', 'Police Uniform', stateWithClothing, mockT)).toBeUndefined();
  });
});
