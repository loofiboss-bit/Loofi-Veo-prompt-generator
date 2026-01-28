
import { VideoModelAdapter } from './VideoModelAdapter';
import { PromptState } from '../../types';
import { soraPromptTemplate } from '../../translations';
import { interpolateVariables } from '../promptBuilder';

export class SoraAdapter implements VideoModelAdapter {
    
    validateConstraints(state: PromptState): string[] {
        const warnings: string[] = [];
        if (state.creativityLevel === 'Imaginative') {
            warnings.push("Sora performs best with 'Grounded' or 'Balanced' creativity for physics simulation.");
        }
        return warnings;
    }

    getEnhancements(key: keyof PromptState, value: string): string {
        // Sora relies less on specific camera/lens keywords and more on descriptive physics
        if (key === 'environmentDynamicEvents' && value) {
            return ' (Ensure causal consistency and fluid dynamics)';
        }
        return '';
    }

    buildPrompt(state: PromptState, variables: Record<string, string>): string {
        const iState = { ...state };
        iState.idea = interpolateVariables(state.idea, variables);
        iState.environment = interpolateVariables(state.environment, variables);
        iState.characterActions = interpolateVariables(state.characterActions, variables);

        const lang = iState.language || 'en';
        // Fallback to English if translation missing or using generic structure
        const template = soraPromptTemplate[lang] || soraPromptTemplate['en'];
        
        if (!template) {
            return `Create a physics-compliant video simulation of: ${iState.idea}. Ensure photorealism and causal consistency.`;
        }

        const paramsList = [
            `Environment: ${iState.environment}`,
            iState.timeOfDay !== 'Any' ? `Time: ${iState.timeOfDay}` : '',
            iState.weather !== 'Any' ? `Weather: ${iState.weather}` : '',
            iState.artStyle ? `Visual Style: ${iState.artStyle}` : '',
            iState.cameraMovement !== 'Static shot' ? `Camera: ${iState.cameraMovement}` : '',
            iState.motionIntensity ? `Motion: ${iState.motionIntensity}` : '',
            iState.environmentDynamicEvents ? `Dynamics: ${iState.environmentDynamicEvents}` : '',
            iState.environmentSensoryDetails ? `Sensory: ${iState.environmentSensoryDetails}` : '',
            iState.spatialMotions && Object.keys(iState.spatialMotions).length > 0 
                ? `Spatial Directives: ${JSON.stringify(iState.spatialMotions)}` 
                : ''
        ].filter(Boolean).join('\n');

        return template
            .replace('{idea}', iState.idea)
            .replace('{parameterList}', paramsList);
    }
}
