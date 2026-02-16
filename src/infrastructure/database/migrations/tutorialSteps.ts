export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string; // CSS selector for element to highlight
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void; // Optional action to perform
  skipable: boolean;
}

export type TutorialFlow = 'main' | 'composer';

export const mainTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Loofi Veo!',
    description: "Let's take a quick tour of the main features. This will only take a minute.",
    targetSelector: 'body',
    placement: 'center',
    skipable: true,
  },
  {
    id: 'create-project',
    title: 'Create Your First Project',
    description:
      'Projects help you organize your prompts. Click the "New Project" button to get started.',
    targetSelector: '[data-tutorial="new-project"]',
    placement: 'bottom',
    skipable: true,
  },
  {
    id: 'generate-prompt',
    title: 'Generate a Prompt',
    description:
      'Use the prompt editor to create your AI video prompt. You can type freely or use our templates.',
    targetSelector: '[data-tutorial="prompt-editor"]',
    placement: 'left',
    skipable: true,
  },
  {
    id: 'use-templates',
    title: 'Templates & Presets',
    description: 'Save time with pre-built templates or create your own custom presets for reuse.',
    targetSelector: '[data-tutorial="templates"]',
    placement: 'right',
    skipable: true,
  },
  {
    id: 'export-save',
    title: 'Export & Save',
    description: 'Export your prompts in multiple formats or save them to your project for later.',
    targetSelector: '[data-tutorial="export"]',
    placement: 'top',
    skipable: true,
  },
  {
    id: 'advanced-features',
    title: 'Explore Advanced Features',
    description:
      'Check out the history, version control, and workflow automation features in the sidebar.',
    targetSelector: '[data-tutorial="sidebar"]',
    placement: 'right',
    skipable: true,
  },
];

export const composerTutorialSteps: TutorialStep[] = [
  {
    id: 'composer-welcome',
    title: 'Welcome to Visual Composer',
    description:
      'Build prompts as a node graph. We will cover the key controls for creating and evaluating flows.',
    targetSelector: '[data-tutorial="composer-toolbar"]',
    placement: 'bottom',
    skipable: true,
  },
  {
    id: 'composer-palette',
    title: 'Block Palette',
    description:
      'Search and drag blocks from here onto the canvas. Blocks are grouped by category.',
    targetSelector: '[data-tutorial="composer-palette"]',
    placement: 'right',
    skipable: true,
  },
  {
    id: 'composer-canvas',
    title: 'Graph Canvas',
    description:
      'Drop blocks here, drag to move, and connect outputs to inputs to form your prompt pipeline.',
    targetSelector: '[data-tutorial="composer-canvas"]',
    placement: 'top',
    skipable: true,
  },
  {
    id: 'composer-toolbar-layout',
    title: 'Layout & Zoom',
    description: 'Use zoom controls and auto-layout tools to organize larger graphs quickly.',
    targetSelector: '[data-tutorial="composer-toolbar-layout"]',
    placement: 'bottom',
    skipable: true,
  },
  {
    id: 'composer-evaluate',
    title: 'Evaluate Graph',
    description: 'Run evaluation to validate the flow and inspect generated prompt output.',
    targetSelector: '[data-tutorial="composer-evaluate"]',
    placement: 'bottom',
    skipable: true,
  },
  {
    id: 'composer-finish',
    title: 'You are ready to compose',
    description:
      'Start with scene and character blocks, then connect camera, style, and output blocks.',
    targetSelector: '[data-tutorial="composer-canvas"]',
    placement: 'top',
    skipable: true,
  },
];

const tutorialStepsByFlow: Record<TutorialFlow, TutorialStep[]> = {
  main: mainTutorialSteps,
  composer: composerTutorialSteps,
};

export const getTutorialStep = (
  stepNumber: number,
  flow: TutorialFlow = 'main',
): TutorialStep | undefined => {
  return tutorialStepsByFlow[flow][stepNumber - 1];
};

export const getTotalSteps = (flow: TutorialFlow = 'main'): number => {
  return tutorialStepsByFlow[flow].length;
};
