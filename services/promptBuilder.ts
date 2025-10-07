import { PromptGenerationParams } from '../types';
import { promptTemplates, parameterLabels, parameterValues, seriesInstructions } from '../translations';

const getProcessedParameterValues = (params: PromptGenerationParams) => {
    const { language, visualEffect, animationPreset, voiceOver, optimizeFor8Seconds, includeOverlayText, useGoogleSearch, voiceStyle, artStyle, customArtStyle, timeOfDay, weather, motionIntensity, creativityLevel, characterGender, characterEthnicity, characterClothing, ambientSound, soundEffectsIntensity, negativePrompt } = params;
    
    const values = parameterValues[language];
    
    let effectiveArtStyle = artStyle;
    if (artStyle === 'Custom' && customArtStyle?.trim()) {
        effectiveArtStyle = customArtStyle;
    } else if (artStyle === 'Custom') {
        effectiveArtStyle = ''; // Will be filtered out
    }
    
    return {
        ...params,
        artStyle: effectiveArtStyle,
        timeOfDay: timeOfDay === 'Any' ? '' : timeOfDay,
        weather: weather === 'Any' ? '' : weather,
        characterGender: characterGender === 'Any' ? '' : characterGender,
        characterEthnicity: characterEthnicity === 'Any' ? '' : characterEthnicity,
        characterClothing: characterClothing === 'Any' ? '' : characterClothing,
        visualEffect: visualEffect === 'None' ? values.none.visualEffect : visualEffect,
        animationPreset: animationPreset === 'None' ? values.none.animationPreset : animationPreset,
        motionIntensity: motionIntensity === 'Medium' ? '' : motionIntensity,
        creativityLevel: creativityLevel === 'Balanced' ? '' : creativityLevel,
        voiceStyle: voiceStyle === 'None' ? values.none.voiceStyle : voiceStyle,
        voiceOver: voiceStyle === 'None' ? '' : voiceOver,
        ambientSound: ambientSound === 'None' ? values.none.ambientSound : ambientSound,
        soundEffectsIntensity: soundEffectsIntensity === 'None' ? values.none.soundEffectsIntensity : soundEffectsIntensity,
        negativePrompt: negativePrompt.trim() ? negativePrompt.trim() : '',
        optimizeFor8Seconds: optimizeFor8Seconds ? values.optimization : '',
        overlayText: includeOverlayText ? values.overlay : '',
        useGoogleSearch: useGoogleSearch ? 'Yes' : ''
    };
};

export function buildGeminiPrompt(params: PromptGenerationParams): string {
    const { language, generateAsSeries } = params;
    let template = promptTemplates[language];

    if (generateAsSeries) {
        const seriesInstruction = seriesInstructions[language];
        
        const insertionPoint = language === 'sv' ? 'Tänk som en regissör.' : 'Think like a director.';
        template = template.replace(insertionPoint, `${insertionPoint}\n\n${seriesInstruction}`);
    }

    const labels = parameterLabels[language];
    const values = getProcessedParameterValues(params);

    const parameterList = (Object.keys(labels) as Array<keyof typeof labels>)
        .map(key => {
            const value = values[key as keyof typeof values];
            if (value) {
                return `- ${labels[key]}: "${value}"`;
            }
            return null;
        })
        .filter(Boolean)
        .join('\n');

    const finalTemplate = template.replace('{parameterList}', parameterList);
    return finalTemplate;
}