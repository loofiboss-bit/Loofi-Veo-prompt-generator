export interface SequenceTemplate {
  id: string;
  label: string;
  description: string;
  requiredCharacters: number;
  shots: {
    action: string;
    camera: string;
    focusChar: 1 | 2 | 'both';
  }[];
}

export const CINEMATIC_SEQUENCES: SequenceTemplate[] = [
  {
    id: 'dialogue-basic',
    label: 'Basic Dialogue',
    description: 'Standard shot/reverse-shot conversation between two characters.',
    requiredCharacters: 2,
    shots: [
      { action: '{char1} speaks about {context}', camera: 'Medium Close-Up', focusChar: 1 },
      { action: '{char2} reacts and responds', camera: 'Medium Close-Up', focusChar: 2 },
      {
        action: '{char1} and {char2} continue the exchange',
        camera: 'Two Shot',
        focusChar: 'both',
      },
    ],
  },
  {
    id: 'chase-sequence',
    label: 'Chase Sequence',
    description: 'Dynamic pursuit between two characters through an environment.',
    requiredCharacters: 2,
    shots: [
      {
        action: '{char1} runs through the environment, looking back in fear',
        camera: 'Tracking Shot',
        focusChar: 1,
      },
      { action: '{char2} pursues with determination', camera: 'Handheld Follow', focusChar: 2 },
      {
        action: 'Wide view of both characters racing through {context}',
        camera: 'Crane Shot',
        focusChar: 'both',
      },
      { action: '{char1} ducks around a corner', camera: 'Whip Pan', focusChar: 1 },
      { action: '{char2} skids to a stop, scanning the area', camera: 'Low Angle', focusChar: 2 },
    ],
  },
  {
    id: 'reveal',
    label: 'Dramatic Reveal',
    description: 'Build tension and reveal something significant about the scene.',
    requiredCharacters: 1,
    shots: [
      {
        action: '{char1} approaches cautiously, sensing something about {context}',
        camera: 'Slow Push In',
        focusChar: 1,
      },
      {
        action: 'Close-up of {char1} face showing dawning realization',
        camera: 'Extreme Close-Up',
        focusChar: 1,
      },
      {
        action: 'The full scope of {context} is revealed',
        camera: 'Wide Reveal Shot',
        focusChar: 1,
      },
    ],
  },
  {
    id: 'confrontation',
    label: 'Confrontation',
    description: 'Tense standoff between two characters building to a climax.',
    requiredCharacters: 2,
    shots: [
      {
        action: '{char1} and {char2} face each other over {context}',
        camera: 'Wide Shot',
        focusChar: 'both',
      },
      {
        action: '{char1} makes an aggressive statement or gesture',
        camera: 'Over-the-Shoulder',
        focusChar: 1,
      },
      { action: '{char2} responds with defiance', camera: 'Over-the-Shoulder', focusChar: 2 },
      {
        action: 'Tension peaks between {char1} and {char2}',
        camera: 'Dutch Angle Close-Up',
        focusChar: 'both',
      },
    ],
  },
  {
    id: 'montage',
    label: 'Training Montage',
    description: 'Series of shots showing character progression or preparation.',
    requiredCharacters: 1,
    shots: [
      {
        action: '{char1} begins preparing for {context}',
        camera: 'Wide Establishing',
        focusChar: 1,
      },
      { action: '{char1} struggles with the early stages', camera: 'Medium Shot', focusChar: 1 },
      { action: '{char1} makes incremental progress', camera: 'Close-Up', focusChar: 1 },
      {
        action: '{char1} achieves a breakthrough moment',
        camera: 'Low Angle Hero Shot',
        focusChar: 1,
      },
      {
        action: '{char1} stands confident, transformed by {context}',
        camera: 'Silhouette Wide',
        focusChar: 1,
      },
    ],
  },
];
