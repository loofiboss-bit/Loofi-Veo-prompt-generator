export interface HelpTopic {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
}

export const helpCategories = [
  'Getting Started',
  'Projects',
  'Prompts',
  'Templates',
  'Export & Share',
  'Workflows',
  'Settings',
  'Troubleshooting',
] as const;

export const helpTopics: HelpTopic[] = [
  // Getting Started
  {
    id: 'what-is-loofi-veo',
    category: 'Getting Started',
    title: 'What is Loofi Flow/Veo Studio?',
    content: `Loofi Flow/Veo Studio is a local-first studio for Flow/Veo video prompts and Suno music prompts. It helps you organize, manage, and export scene packs, shot cards, lyrics, and production briefs.

Key features include:
- Project-based organization
- Template library
- Version control
- Export in multiple formats
- Workflow automation`,
    keywords: ['intro', 'overview', 'what is', 'about'],
  },
  {
    id: 'first-steps',
    category: 'Getting Started',
    title: 'Getting Started Guide',
    content: `Follow these steps to get started:

1. Create a new project
2. Add your first prompt
3. Use templates or create from scratch
4. Export or save your work

You can also take the interactive tutorial from the Help menu.`,
    keywords: ['start', 'begin', 'tutorial', 'guide', 'first'],
  },

  // Projects
  {
    id: 'create-project',
    category: 'Projects',
    title: 'Creating a Project',
    content: `To create a new project:

1. Click the "New Project" button in the sidebar
2. Enter a project name and description
3. Choose optional settings (tags, color)
4. Click "Create"

Projects help you organize related prompts together.`,
    keywords: ['create', 'new', 'project', 'organize'],
  },
  {
    id: 'manage-projects',
    category: 'Projects',
    title: 'Managing Projects',
    content: `You can manage your projects by:

- Renaming: Click the project name to edit
- Deleting: Right-click and select "Delete"
- Archiving: Move inactive projects to archive
- Searching: Use the search bar to find projects
- Filtering: Filter by tags or date`,
    keywords: ['manage', 'edit', 'delete', 'archive', 'project'],
  },

  // Prompts
  {
    id: 'create-prompt',
    category: 'Prompts',
    title: 'Creating a Prompt',
    content: `To create a new prompt:

1. Select a project or create a new one
2. Click "New Prompt"
3. Enter your prompt text
4. Add metadata (title, tags, parameters)
5. Save or export

You can also use templates for faster creation.`,
    keywords: ['create', 'new', 'prompt', 'write'],
  },
  {
    id: 'edit-prompt',
    category: 'Prompts',
    title: 'Editing Prompts',
    content: `Edit your prompts by:

- Clicking on the prompt to open the editor
- Making changes to text or metadata
- Saving changes (auto-saved)
- Viewing version history
- Reverting to previous versions`,
    keywords: ['edit', 'modify', 'change', 'update', 'prompt'],
  },

  // Templates
  {
    id: 'use-templates',
    category: 'Templates',
    title: 'Using Templates',
    content: `Templates help you create prompts faster:

1. Click "Templates" in the sidebar
2. Browse available templates
3. Click a template to preview
4. Click "Use Template" to create a prompt
5. Customize the prompt as needed

Templates include pre-filled text and parameters.`,
    keywords: ['template', 'preset', 'use', 'apply'],
  },
  {
    id: 'create-template',
    category: 'Templates',
    title: 'Creating Custom Templates',
    content: `Create your own templates:

1. Create a prompt you want to reuse
2. Click "Save as Template"
3. Enter template name and description
4. Choose visibility (private or shared)
5. Save

Your templates appear in the Templates section.`,
    keywords: ['create', 'custom', 'template', 'save'],
  },

  // Export & Share
  {
    id: 'export-prompts',
    category: 'Export & Share',
    title: 'Exporting Prompts',
    content: `Export your prompts in multiple formats:

- **Text**: Plain text file (.txt)
- **JSON**: Structured data (.json)
- **CSV**: Spreadsheet format (.csv)
- **Markdown**: Formatted text (.md)

Select prompts and click "Export" to choose format.`,
    keywords: ['export', 'download', 'save', 'format'],
  },
  {
    id: 'share-prompts',
    category: 'Export & Share',
    title: 'Sharing Prompts',
    content: `Share your prompts with others:

- Copy to clipboard
- Generate shareable link
- Export and send file
- Share template to community

Use the Share button in the prompt menu.`,
    keywords: ['share', 'send', 'collaborate', 'link'],
  },

  // Workflows
  {
    id: 'workflow-automation',
    category: 'Workflows',
    title: 'Workflow Automation',
    content: `Automate repetitive tasks:

- Create workflow templates
- Set up triggers and actions
- Schedule automated exports
- Batch process prompts
- Integrate with external tools

Access workflows from the Workflows tab.`,
    keywords: ['workflow', 'automation', 'automate', 'batch'],
  },

  // Settings
  {
    id: 'app-settings',
    category: 'Settings',
    title: 'Application Settings',
    content: `Customize your experience:

- **Theme**: Light, dark, or auto
- **API Key**: Configure Google Gemini API
- **Export**: Default export format
- **Shortcuts**: Customize keyboard shortcuts
- **Privacy**: Data storage preferences

Access settings from the gear icon.`,
    keywords: ['settings', 'preferences', 'configure', 'customize'],
  },

  // Troubleshooting
  {
    id: 'common-issues',
    category: 'Troubleshooting',
    title: 'Common Issues',
    content: `Solutions to common problems:

**App won't start**
- Check if API key is configured
- Clear browser cache
- Update to latest version

**Prompts not saving**
- Check internet connection
- Verify storage permissions
- Try exporting as backup

**Export not working**
- Check file permissions
- Try different format
- Restart application`,
    keywords: ['troubleshoot', 'problem', 'issue', 'error', 'fix'],
  },
  {
    id: 'keyboard-shortcuts',
    category: 'Troubleshooting',
    title: 'Keyboard Shortcuts',
    content: `Useful keyboard shortcuts:

- **Ctrl/Cmd + N**: New project
- **Ctrl/Cmd + S**: Save prompt
- **Ctrl/Cmd + E**: Export
- **Ctrl/Cmd + K**: Search
- **Ctrl/Cmd + /**: Toggle help
- **?**: Show all shortcuts

Press ? to see the full list anytime.`,
    keywords: ['keyboard', 'shortcuts', 'hotkeys', 'keys'],
  },
];

export const searchHelp = (query: string): HelpTopic[] => {
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) return helpTopics;

  return helpTopics.filter((topic) => {
    const titleMatch = topic.title.toLowerCase().includes(lowerQuery);
    const contentMatch = topic.content.toLowerCase().includes(lowerQuery);
    const keywordMatch = topic.keywords.some((keyword) =>
      keyword.toLowerCase().includes(lowerQuery),
    );

    return titleMatch || contentMatch || keywordMatch;
  });
};

export const getTopicsByCategory = (category: string): HelpTopic[] => {
  return helpTopics.filter((topic) => topic.category === category);
};

export const getTopicById = (id: string): HelpTopic | undefined => {
  return helpTopics.find((topic) => topic.id === id);
};
