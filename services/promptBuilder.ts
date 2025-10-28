import { PromptGenerationParams } from '../types';
// FIX: Corrected imports from translations.ts
import { promptTemplates, appUIStrings, parameterValues, seriesInstructions, soraPromptTemplate } from '../translations';

/**
 * Resolves placeholders like {{key}} in a string with corresponding values from the state.
 * @param text The string containing placeholders.
 * @param state The current prompt state to source values from.
 * @returns The string with placeholders replaced.
 */
function resolvePlaceholders(text: string, state: PromptGenerationParams): string {
    if (!text || typeof text !== 'string') {
        return text;
    }
  
    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const trimmedKey = key.trim() as keyof PromptGenerationParams;
        if (Object.prototype.hasOwnProperty.call(state, trimmedKey)) {
            const value = state[trimmedKey];
            if (value !== null && value !== undefined && String(value).trim() !== '') {
                return String(value);
            }
        }
        // Return original placeholder if key not found or value is empty
        return match;
    });
}


export function buildGeminiPrompt(params: PromptGenerationParams): string {
    const resolvedParams: PromptGenerationParams = {
        ...params,
        idea: resolvePlaceholders(params.idea, params),
        environment: resolvePlaceholders(params.environment, params),
    };

    const { language, generateAsSeries } = resolvedParams;
    
    const isSoraMode = resolvedParams.targetModel === 'sora';

    let template = isSoraMode 
        ? soraPromptTemplate[language] 
        : promptTemplates[language];

    if (generateAsSeries) {
        const seriesInstruction = seriesInstructions[language];
        
        const insertionPoints: { [lang in 'en' | 'sv' | 'es' | 'fr' | 'de']: string } = {
            en: 'Think like a director.',
            sv: 'Tänk som en regissör.',
            es: 'Piensa como un director.',
            fr: 'Pensez comme un réalisateur.',
            de: 'Denken Sie wie ein Regisseur.',
        };
        const insertionPoint = insertionPoints[language];
        
        // For Sora template, add series instructions to the main body. For others, add to the header.
        if (isSoraMode) {
            template = `${template}\n\n${seriesInstruction}`;
        } else {
            template = template.replace(insertionPoint, `${insertionPoint}\n\n${seriesInstruction}`);
        }
    }

    const labels = appUIStrings[language].fieldLabels;
    const langValues = parameterValues[language];

    const parameterList = (Object.keys(labels) as Array<keyof typeof labels>)
        .map(key => {
            const value = resolvedParams[key as keyof PromptGenerationParams];
            let stringValue = '';
            let soraEnhancement = ''; // Variable for Sora-specific instructions

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
                    stringValue = resolvedParams.customArtStyle?.trim() || '';
                } else if (key === 'voiceOver' && resolvedParams.voiceStyle === 'None') {
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
                // Add Sora-specific enhancements to guide the model
                if (isSoraMode) {
                    switch (key) {
                        case 'environment':
                            soraEnhancement = ' (Emphasize rich sensory details: sights, sounds, textures, and smells that contribute to the world\'s realism)';
                            break;
                        case 'characterActions':
                            soraEnhancement = ' (Describe the physical interaction with objects and the subtle emotional nuance of the action as a continuous sequence)';
                            break;
                        case 'artStyle':
                            if (stringValue.toLowerCase().includes('photorealistic')) {
                                soraEnhancement = ' (Strive for extreme photorealism, paying close attention to complex lighting, reflections, shadows, and material textures)';
                            }
                            break;
                        case 'cameraMovement':
                             if (!['Static shot', 'Any', 'None'].includes(stringValue)) {
                                soraEnhancement = ' (Detail the camera\'s path with cinematic precision, as if giving instructions to a professional camera operator for a long take)';
                            }
                            break;
                        case 'weather':
                            soraEnhancement = ' (Describe the physical effect of this weather on the environment and characters, e.g., hair matted by rain, dust kicked up by wind)';
                            break;
                        case 'characterClothing':
                            soraEnhancement = ' (Describe the texture and physics of the clothing, how it moves, and how it interacts with the environment and character\'s motion)';
                            break;
                        case 'colorPalette':
                            soraEnhancement = ' (Describe how these colors are affected by light sources, reflections, and atmospheric conditions to create a photorealistic scene)';
                            break;
                        case 'visualEffect':
                            if (stringValue !== 'None') {
                                soraEnhancement = ' (Describe this effect with a physical basis, e.g., how lens flare is caused by a bright light source just out of frame, or how film grain appears on high-ISO footage)';
                            }
                            break;
                        case 'lensType':
                             soraEnhancement = ' (Describe the specific optical properties, like the subtle barrel distortion of a wide-angle lens or the background compression of a telephoto lens)';
                            break;
                        case 'lightingStyle':
                            soraEnhancement = ' (Describe the physical properties of this light: its color temperature, hardness/softness, and how it casts shadows and creates highlights on different materials)';
                            break;
                        case 'environmentDynamicEvents':
                            soraEnhancement = ' (Describe the physics of these events: how wind affects individual objects, the rate at which steam dissipates, etc.)';
                            break;
                        case 'characterObjectInteraction':
                            soraEnhancement = ' (Detail the precise physical contact, pressure, and resulting subtle movements of the object and the character\'s hand/fingers)';
                            break;
                        case 'compositionalGuide':
                            soraEnhancement = ' (Describe how elements in the scene naturally create this composition, e.g., how a road creates a leading line)';
                            break;
                    }
                }
                return `- ${labels[key]}: "${stringValue}"${soraEnhancement}`;
            }
            return null;
        })
        .filter(Boolean)
        .join('\n');

    let finalTemplate = template.replace('"{idea}"', `"${resolvedParams.idea}"`);
    finalTemplate = finalTemplate.replace('{parameterList}', parameterList);

    return finalTemplate;
}