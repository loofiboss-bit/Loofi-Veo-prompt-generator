import { PromptGenerationParams } from '../types';
import { promptTemplates, parameterLabels, parameterValues, seriesInstructions, soraPromptTemplate } from '../translations';

export function buildGeminiPrompt(params: PromptGenerationParams): string {
    const { language, generateAsSeries } = params;
    
    const isSoraMode = params.targetModel === 'sora';

    let template = isSoraMode 
        ? soraPromptTemplate[language] 
        : promptTemplates[language];

    if (generateAsSeries) {
        const seriesInstruction = seriesInstructions[language];
        
        const insertionPoint = language === 'sv' ? 'Tänk som en regissör.' : 'Think like a director.';
        
        // For Sora template, add series instructions to the main body. For others, add to the header.
        if (isSoraMode) {
            template = `${template}\n\n${seriesInstruction}`;
        } else {
            template = template.replace(insertionPoint, `${insertionPoint}\n\n${seriesInstruction}`);
        }
    }

    const labels = parameterLabels[language];
    const langValues = parameterValues[language];

    const parameterList = (Object.keys(labels) as Array<keyof typeof labels>)
        .map(key => {
            const value = params[key as keyof PromptGenerationParams];
            let stringValue = '';

            // Handle special cases and conversions from the state
            if (typeof value === 'boolean') {
                if (key === 'optimizeFor8Seconds' && value) stringValue = langValues.optimization;
                else if (key === 'includeOverlayText' && value) stringValue = langValues.overlay;
                else if (key === 'useGoogleSearch' && value) stringValue = 'Yes';
            } else if (typeof value === 'string' && value.trim()) {
                 // Filter out default/placeholder values that shouldn't be in the prompt
                if (['Any', 'None', 'Medium', 'Balanced'].includes(value)) {
                    stringValue = '';
                } else if (key === 'artStyle' && value === 'Custom') {
                    // For custom art style, use the customArtStyle description instead.
                    stringValue = params.customArtStyle?.trim() || '';
                } else if (key === 'voiceOver' && params.voiceStyle === 'None') {
                    // Don't include voiceover script if style is None
                    stringValue = '';
                }
                else {
                    stringValue = value.trim();
                }
            }
             // Explicitly skip `customArtStyle` because it's handled via `artStyle`
            if (key === 'customArtStyle') return null;

            if (stringValue) {
                return `- ${labels[key]}: "${stringValue}"`;
            }
            return null;
        })
        .filter(Boolean)
        .join('\n');

    return template.replace('{parameterList}', parameterList);
}