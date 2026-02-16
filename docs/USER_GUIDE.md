# Loofi Veo Prompt Generator - User Guide

**Version**: 2.2.0  
**Last Updated**: 2026-02-16

## Table of Contents

1. [Getting Started](#getting-started)
2. [Core Features](#core-features)
3. [Advanced Features](#advanced-features)
4. [Keyboard Shortcuts](#keyboard-shortcuts)
5. [Tips & Best Practices](#tips--best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Installation

**Desktop Application** (Recommended):

1. Download the latest release from [GitHub Releases](https://github.com/loofitheboss/Loofi-Veo-prompt-generator/releases)
2. Install the application for your platform (Windows/Linux/macOS)
3. Launch the application

**Web Application**:

```bash
npm install
npm run dev
```

### First Launch

1. **API Key Setup**: On first launch, you'll be prompted to enter your Google Gemini API key
   - Get your key from [Google AI Studio](https://aistudio.google.com/app/apikey)
   - The key is stored locally and never transmitted

2. **Onboarding Tutorial**: Follow the interactive tutorial to learn the basics
   - You can restart the tutorial anytime from Help → Restart Tutorial

---

## Core Features

### 1. Prompt Studio

The main workspace for creating video prompts.

**Creating a Prompt**:

1. Enter your prompt text in the main editor
2. Select camera movement from the dropdown
3. Choose aspect ratio (16:9, 9:16, 1:1)
4. Adjust duration (5s or 8s)
5. Click "Generate Prompt" to create your final prompt

**Prompt Sections**:

- **Subject**: Main focus of your video
- **Action**: What's happening in the scene
- **Setting**: Environment and location
- **Style**: Visual aesthetic and mood
- **Camera**: Movement and angles
- **Lighting**: Lighting conditions

### 2. Model Profiles

Pre-configured settings for different video generation models.

**Available Profiles**:

- **Veo 2**: Google's latest model (default)
- **Veo 1**: Previous generation
- **Runway Gen-3**: Runway ML's model
- **Luma Dream Machine**: Luma AI's model
- **Custom**: Create your own profile

**Using Profiles**:

1. Click the model selector in the top bar
2. Choose your desired profile
3. Settings automatically adjust for that model

### 3. Prompt History

Access and reuse your previous prompts.

**Features**:

- Search through your prompt history
- Filter by date, model, or tags
- One-click to reload a previous prompt
- Export history as JSON

**Accessing History**:

- Click the History icon in the sidebar
- Use `Ctrl/Cmd + H` keyboard shortcut

### 4. Batch Generation

Generate multiple prompt variations at once.

**How to Use**:

1. Click "Batch Generate" in the toolbar
2. Enter your base prompt
3. Select variation type:
   - **Camera Angles**: Generate with different camera movements
   - **Styles**: Apply different visual styles
   - **Durations**: Create 5s and 8s versions
4. Click "Generate Batch"
5. Review and export results

---

## Advanced Features

### Visual Composer (Node-Based Editor)

Create complex prompts using a visual node graph.

**Getting Started**:

1. Click "Composer" in the sidebar
2. Drag blocks from the palette onto the canvas
3. Connect blocks to build your prompt flow
4. Click "Compile" to generate the final prompt

**Block Types**:

- **Subject Block**: Define main elements
- **Action Block**: Describe movements
- **Style Block**: Apply visual styles
- **Camera Block**: Set camera parameters
- **Modifier Block**: Add effects and adjustments

**Tips**:

- Use `Shift + Drag` to pan the canvas
- `Ctrl/Cmd + Scroll` to zoom
- Right-click blocks for options
- Press `Delete` to remove selected blocks

### Workspace Management

Organize your projects into workspaces.

**Creating a Workspace**:

1. Click "Workspaces" in the sidebar
2. Click "New Workspace"
3. Name your workspace
4. Add prompts and organize them

**Features**:

- Multiple workspaces per project
- Import/export workspaces
- Share workspaces with team members
- Workspace templates

### Marketplace

Browse and install community-created templates and plugins.

**Browsing Templates**:

1. Click "Marketplace" in the sidebar
2. Browse or search for templates
3. Click "Preview" to see details
4. Click "Install" to add to your library

**Installing Plugins**:

1. Navigate to the Plugins tab
2. Search for desired plugin
3. Review permissions and requirements
4. Click "Install"
5. Restart the application if prompted

### Scene Export

Export your prompts in various formats.

**Export Formats**:

- **JSON**: Full prompt data with metadata
- **CSV**: Spreadsheet-compatible format
- **PDF**: Formatted document with previews
- **Text**: Plain text prompts

**Exporting**:

1. Select prompts to export
2. Click "Export" in the toolbar
3. Choose format
4. Select destination
5. Click "Export"

---

## Keyboard Shortcuts

### Global

| Shortcut       | Action          |
| -------------- | --------------- |
| `Ctrl/Cmd + N` | New Prompt      |
| `Ctrl/Cmd + S` | Save Prompt     |
| `Ctrl/Cmd + O` | Open Prompt     |
| `Ctrl/Cmd + H` | Show History    |
| `Ctrl/Cmd + ,` | Open Settings   |
| `Ctrl/Cmd + K` | Command Palette |
| `F1`           | Show Help       |

### Prompt Studio

| Shortcut           | Action            |
| ------------------ | ----------------- |
| `Ctrl/Cmd + Enter` | Generate Prompt   |
| `Ctrl/Cmd + D`     | Duplicate Prompt  |
| `Ctrl/Cmd + E`     | Export Prompt     |
| `Alt + Up/Down`    | Navigate Sections |
| `Tab`              | Next Field        |
| `Shift + Tab`      | Previous Field    |

### Visual Composer

| Shortcut               | Action          |
| ---------------------- | --------------- |
| `Space + Drag`         | Pan Canvas      |
| `Ctrl/Cmd + Scroll`    | Zoom            |
| `Ctrl/Cmd + 0`         | Reset Zoom      |
| `Delete`               | Delete Selected |
| `Ctrl/Cmd + C`         | Copy Block      |
| `Ctrl/Cmd + V`         | Paste Block     |
| `Ctrl/Cmd + Z`         | Undo            |
| `Ctrl/Cmd + Shift + Z` | Redo            |

---

## Tips & Best Practices

### Writing Effective Prompts

1. **Be Specific**: Use concrete details instead of vague descriptions
   - ❌ "A nice landscape"
   - ✅ "A misty mountain valley at sunrise with golden light filtering through pine trees"

2. **Use Active Language**: Describe actions and movements
   - ❌ "A person standing"
   - ✅ "A person walking confidently through a crowded marketplace"

3. **Layer Details**: Build from general to specific
   - Start with the main subject
   - Add action and movement
   - Describe the setting
   - Apply style and mood
   - Specify camera and lighting

4. **Leverage Camera Movements**: Different movements create different moods
   - **Static**: Stable, documentary feel
   - **Pan**: Reveals environment
   - **Zoom In**: Builds tension, focuses attention
   - **Orbit**: Showcases 3D space
   - **Crane**: Epic, cinematic feel

### Optimizing for Different Models

**Veo 2**:

- Excels at realistic scenes and natural movements
- Supports longer durations (up to 8s)
- Best for: Landscapes, people, realistic scenarios

**Runway Gen-3**:

- Great for stylized and artistic content
- Strong motion consistency
- Best for: Abstract visuals, artistic effects

**Luma Dream Machine**:

- Fast generation times
- Good for quick iterations
- Best for: Concept testing, rapid prototyping

### Performance Tips

1. **Use Model Profiles**: Pre-configured settings save time
2. **Batch Similar Prompts**: Generate variations together
3. **Save Templates**: Reuse successful prompt structures
4. **Organize with Workspaces**: Keep projects separate
5. **Regular Exports**: Back up your work frequently

---

## Troubleshooting

### Common Issues

**API Key Not Working**:

- Verify the key is correct (no extra spaces)
- Check your API quota at [Google AI Studio](https://aistudio.google.com/)
- Ensure your key has Gemini API access enabled
- Try regenerating the key

**Slow Performance**:

- Clear browser cache (web version)
- Reduce canvas complexity in Composer
- Close unused workspaces
- Check system resources

**Export Fails**:

- Ensure you have write permissions to the destination folder
- Check available disk space
- Try a different export format
- Verify the prompt data is valid

**Composer Blocks Not Connecting**:

- Ensure block types are compatible
- Check for circular dependencies
- Verify all required inputs are connected
- Try resetting the canvas zoom

### Desktop App Issues

**App Won't Launch**:

- Check system requirements (see README.md)
- Run as administrator (Windows)
- Check logs in `~/.loofi-veo-prompt-generator/logs/`
- Reinstall the application

**Auto-Update Fails**:

- Check internet connection
- Disable antivirus temporarily
- Download update manually from GitHub
- Check Settings → Updates → Channel

### Getting Help

1. **In-App Help**: Press `F1` or click Help → Documentation
2. **GitHub Issues**: [Report bugs or request features](https://github.com/loofitheboss/Loofi-Veo-prompt-generator/issues)
3. **Documentation**: [Full documentation](https://github.com/loofitheboss/Loofi-Veo-prompt-generator/tree/main/docs)
4. **Community**: Join discussions on GitHub

### Diagnostic Tools

**Built-in Diagnostics**:

1. Open Settings (`Ctrl/Cmd + ,`)
2. Navigate to Diagnostics tab
3. Run system check
4. Review results and follow recommendations

**Export Logs**:

1. Help → Export Diagnostic Logs
2. Attach to GitHub issue or support request

---

## Version History

### v2.2.0 - Hardening & Hygiene (2026-02-16)

**Testing Improvements**:

- Added 95 component render tests
- Total test coverage: 897 tests across 50 files
- 100% test pass rate

**Quality Improvements**:

- Enhanced test infrastructure with @testing-library/jest-dom
- Improved component accessibility testing
- Better error boundary testing

### v2.1.0 - Previous Release

See [CHANGELOG.md](../CHANGELOG.md) for full version history.

---

## Additional Resources

- **README**: [Project overview and quick start](../README.md)
- **Architecture**: [Technical architecture guide](./ARCHITECTURE.md)
- **Plugin Development**: [Create your own plugins](./PLUGIN_DEVELOPMENT.md)
- **API Documentation**: [Plugin API reference](./PLUGIN_API.md)
- **Auto-Update**: [Desktop update system](./AUTO_UPDATE.md)

---

**Need more help?** Check out our [GitHub repository](https://github.com/loofitheboss/Loofi-Veo-prompt-generator) or open an issue.
