/**
 * Shared AI client factory and JSON utilities for all Gemini service modules.
 * @module core/services/gemini/aiClient
 */
import { GoogleGenAI } from '@google/genai';
import { getStoredApiKey } from '../apiKeyService';

export const getAiClient = () => {
  const apiKey = getStoredApiKey() || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('No API key configured. Please set your Gemini API key in Settings.');
  }
  return new GoogleGenAI({ apiKey });
};

/** Strip markdown fences and extract the outermost JSON object/array from LLM output. */
export const cleanJson = (text: string | undefined): string => {
  if (!text) return '';
  let clean = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
  // Try to find the start and end of the JSON object/array
  const startObj = clean.indexOf('{');
  const startArr = clean.indexOf('[');

  // Determine which comes first to decide if object or array
  let startIndex = -1;
  if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
    startIndex = startObj;
  } else {
    startIndex = startArr;
  }

  if (startIndex !== -1) {
    // Find corresponding closing brace
    const isObj = clean[startIndex] === '{';
    const endIndex = clean.lastIndexOf(isObj ? '}' : ']');
    if (endIndex !== -1) {
      clean = clean.substring(startIndex, endIndex + 1);
    }
  }

  return clean;
};
