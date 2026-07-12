#!/usr/bin/env node

import { GoogleGenAI } from '@google/genai';

const cap = Number(process.env.CANARY_SPEND_CAP_USD);
if (!Number.isFinite(cap) || cap <= 0 || cap > 0.1) {
  throw new Error('Canary spend cap must be greater than $0 and no more than $0.10.');
}
if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_CANARY_API_KEY is not configured.');

// One deliberately tiny request. No media generation is permitted in this workflow.
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const response = await client.models.generateContent({
  model: 'gemini-3.5-flash',
  contents: 'Reply with exactly: CANARY_OK',
  config: { maxOutputTokens: 8, temperature: 0 },
});
const text = response.text?.trim() ?? '';
if (text !== 'CANARY_OK') throw new Error(`Unexpected canary response: ${text.slice(0, 80)}`);
console.log(`Provider canary passed within the configured $${cap.toFixed(2)} cap.`);
