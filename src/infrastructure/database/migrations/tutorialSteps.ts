export interface TutorialStep {
    id: string;
    title: string;
    description: string;
    targetSelector: string; // CSS selector for element to highlight
    placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
    action?: () => void; // Optional action to perform
    skipable: boolean;
}

export const tutorialSteps: TutorialStep[] = [
    {
        id: 'welcome',
        title: 'Welcome to Loofi Veo!',
        description: 'Let\'s take a quick tour of the main features. This will only take a minute.',
        targetSelector: 'body',
        placement: 'center',
        skipable: true,
    },
    {
        id: 'create-project',
        title: 'Create Your First Project',
        description: 'Projects help you organize your prompts. Click the "New Project" button to get started.',
        targetSelector: '[data-tutorial="new-project"]',
        placement: 'bottom',
        skipable: true,
    },
    {
        id: 'generate-prompt',
        title: 'Generate a Prompt',
        description: 'Use the prompt editor to create your AI video prompt. You can type freely or use our templates.',
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
        description: 'Check out the history, version control, and workflow automation features in the sidebar.',
        targetSelector: '[data-tutorial="sidebar"]',
        placement: 'right',
        skipable: true,
    },
];

export const getTutorialStep = (stepNumber: number): TutorialStep | undefined => {
    return tutorialSteps[stepNumber - 1];
};

export const getTotalSteps = (): number => {
    return tutorialSteps.length;
};
