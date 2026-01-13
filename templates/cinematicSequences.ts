
export interface ShotTemplate {
    action: string;
    camera: string;
    focusChar: 1 | 2 | 'both' | 'none'; // Which character ID to assign to the shot
}

export interface SequenceTemplate {
    id: string;
    label: string;
    description: string;
    requiredCharacters: 1 | 2;
    shots: ShotTemplate[];
}

export const CINEMATIC_SEQUENCES: SequenceTemplate[] = [
    {
        id: 'dialogue_basic',
        label: 'Basic Dialogue (Shot-Reverse-Shot)',
        description: 'Standard 4-shot conversation setup. Wide master, two OTS shots, and a reaction.',
        requiredCharacters: 2,
        shots: [
            {
                action: "{char1} and {char2} are having a conversation about {context}. They are standing facing each other.",
                camera: "Wide Master Shot, Two-Shot, eye level",
                focusChar: 'both'
            },
            {
                action: "{char1} is speaking earnestly, gesturing with their hands.",
                camera: "Over-the-shoulder of {char2}, Medium Close-up on {char1}, shallow depth of field",
                focusChar: 1
            },
            {
                action: "{char2} is listening intently, then responds with a smile.",
                camera: "Over-the-shoulder of {char1}, Medium Close-up on {char2}, shallow depth of field",
                focusChar: 2
            },
            {
                action: "{char1} reacts to the response, looking thoughtful.",
                camera: "Close-up on {char1}, loose framing",
                focusChar: 1
            }
        ]
    },
    {
        id: 'dialogue_intense',
        label: 'Intense Confrontation',
        description: 'High tension, tighter angles, dutch tilts.',
        requiredCharacters: 2,
        shots: [
            {
                action: "{char1} steps aggressively towards {char2} regarding {context}.",
                camera: "Low angle, tracking forward",
                focusChar: 1
            },
            {
                action: "{char2} holds their ground, looking defiant.",
                camera: "High angle looking down, slight Dutch Angle",
                focusChar: 2
            },
            {
                action: "{char1} is shouting, veins visible.",
                camera: "Extreme Close-up on eyes/mouth",
                focusChar: 1
            },
            {
                action: "The tension breaks as {char2} turns away.",
                camera: "Handheld, shaky cam, medium shot",
                focusChar: 2
            }
        ]
    },
    {
        id: 'hero_reveal',
        label: 'Hero Reveal',
        description: 'Builds anticipation before revealing the character fully.',
        requiredCharacters: 1,
        shots: [
            {
                action: "A silhouette stands in the darkness/distance involved in {context}.",
                camera: "Long shot, back-lit, atmospheric",
                focusChar: 1
            },
            {
                action: "Close up details of {char1}'s clothing or gear.",
                camera: "Macro tracking shot, slow motion",
                focusChar: 1
            },
            {
                action: "{char1} steps into the light, revealing their face.",
                camera: "Slow push-in (Dolly Zoom), dramatic lighting",
                focusChar: 1
            }
        ]
    },
    {
        id: 'action_chase',
        label: 'Chase Sequence',
        description: 'Fast paced movement involving two characters.',
        requiredCharacters: 2,
        shots: [
            {
                action: "{char1} is sprinting away in panic.",
                camera: "Tracking shot from behind, low to ground",
                focusChar: 1
            },
            {
                action: "{char2} is pursuing closely, focused on the target.",
                camera: "Steadycam front-facing, maintaining pace",
                focusChar: 2
            },
            {
                action: "{char1} vaults over an obstacle while {context}.",
                camera: "Side profile, panning rapidly",
                focusChar: 1
            },
            {
                action: "The distance between {char1} and {char2} closes.",
                camera: "Wide drone shot looking down",
                focusChar: 'both'
            }
        ]
    }
];
