export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  tourId: string;
  fallbackSelector?: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;
  skipable: boolean;
}

export type TutorialFlow = 'main' | 'composer';

export const mainTutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Loofi Veo!',
    description: "Let's take a quick tour of the main features. This will only take a minute.",
    tourId: 'center-modal',
    placement: 'center',
    skipable: true,
  },
  {
    id: 'create-project',
    title: 'Project Context',
    description: 'Use the project chip to manage project metadata, saves, and workspace context.',
    tourId: 'project-indicator',
    fallbackSelector: '[data-tour-id="app-header"]',
    placement: 'bottom',
    skipable: true,
  },
  {
    id: 'core-concept',
    title: 'Core Concept',
    description: 'Define your central idea and target model before generating prompts.',
    tourId: 'core-concept',
    placement: 'right',
    skipable: true,
  },
  {
    id: 'templates',
    title: 'Templates & Presets',
    description: 'Open templates to bootstrap common styles and save custom presets for reuse.',
    tourId: 'templates-button',
    placement: 'bottom',
    skipable: true,
  },
  {
    id: 'generate-prompt',
    title: 'Generate Prompt',
    description: 'Generate your prompt once the core idea is ready and required fields are valid.',
    tourId: 'generate-prompt-button',
    placement: 'left',
    skipable: true,
  },
  {
    id: 'sidebar-navigation',
    title: 'Workspace Navigation',
    description:
      'Use the sidebar to move between history, projects, diagnostics, jobs, and settings.',
    tourId: 'app-sidebar-nav',
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
    tourId: 'composer-toolbar',
    placement: 'bottom',
    skipable: true,
  },
  {
    id: 'composer-palette',
    title: 'Block Palette',
    description:
      'Search and drag blocks from here onto the canvas. Blocks are grouped by category.',
    tourId: 'composer-palette',
    placement: 'right',
    skipable: true,
  },
  {
    id: 'composer-canvas',
    title: 'Graph Canvas',
    description:
      'Drop blocks here, drag to move, and connect outputs to inputs to form your prompt pipeline.',
    tourId: 'composer-canvas',
    placement: 'top',
    skipable: true,
  },
  {
    id: 'composer-toolbar-layout',
    title: 'Layout & Zoom',
    description: 'Use zoom controls and auto-layout tools to organize larger graphs quickly.',
    tourId: 'composer-toolbar-layout',
    placement: 'bottom',
    skipable: true,
  },
  {
    id: 'composer-evaluate',
    title: 'Evaluate Graph',
    description: 'Run evaluation to validate the flow and inspect generated prompt output.',
    tourId: 'composer-evaluate',
    placement: 'bottom',
    skipable: true,
  },
  {
    id: 'composer-finish',
    title: 'You are ready to compose',
    description:
      'Start with scene and character blocks, then connect camera, style, and output blocks.',
    tourId: 'composer-canvas',
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
