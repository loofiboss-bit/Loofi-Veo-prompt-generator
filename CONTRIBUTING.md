# Contributing to Veo Studio

Thank you for your interest in contributing to Veo Studio! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## 🤝 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards other community members

## 🚀 Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- Git

### Setting Up Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/Loofi-Veo-prompt-generator.git
cd Loofi-Veo-prompt-generator

# Install dependencies
npm install

# Start development server
npm run dev

# Run with Electron (development mode)
npm run electron:dev
```

## 🔄 Development Workflow

### Branch Naming Convention

- `feature/description` - New features
- `fix/description` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates
- `test/description` - Test additions/updates

### Making Changes

1. **Create a branch** from `main`:

   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make your changes** following our coding standards

3. **Test your changes** thoroughly:

   ```bash
   npm run build
   npm run electron
   ```

4. **Commit your changes** with a descriptive message:

   ```bash
   git commit -m "feat: Add amazing feature"
   ```

5. **Push to your fork**:

   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request** using our PR template

## 📝 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types - use proper typing
- Use interfaces for object shapes
- Use enums for constants with multiple values

### React

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use proper prop typing with TypeScript

### File Organization

```
src/
├── components/       # React components
│   ├── tabs/        # Tab-specific components
│   ├── modals/      # Modal dialogs
│   └── common/      # Reusable components
├── services/        # Business logic and API calls
├── store/           # Zustand state management
├── hooks/           # Custom React hooks
├── utils/           # Utility functions
├── types.ts         # TypeScript type definitions
└── constants.ts     # Application constants
```

### Naming Conventions

- **Components**: PascalCase (e.g., `VideoTimeline.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useVideoGeneration.ts`)
- **Services**: camelCase with `Service` suffix (e.g., `geminiService.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_VIDEO_LENGTH`)
- **Types/Interfaces**: PascalCase (e.g., `PromptState`, `VideoClip`)

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add semicolons at the end of statements
- Use trailing commas in objects and arrays
- Maximum line length: 100 characters
- Add comments for complex logic

## 💬 Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions/updates
- `chore`: Build process or auxiliary tool changes
- `ci`: CI/CD changes

### Examples

```bash
feat(timeline): Add razor tool for splitting clips

Implement a razor tool that allows users to split video clips
at the playhead position on the timeline.

Closes #123
```

```bash
fix(export): Resolve FFmpeg encoding error

Fix issue where videos with certain codecs would fail to export.
Added proper codec detection and conversion.

Fixes #456
```

## 🔀 Pull Request Process

### Before Submitting

- [ ] Code follows the project's style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated (README, USER_GUIDE, etc.)
- [ ] CHANGELOG.md updated
- [ ] No new warnings or errors
- [ ] Tested on target platforms

### PR Description

Use our PR template and include:

1. **Clear description** of changes
2. **Related issue** number
3. **Type of change** (feature, fix, etc.)
4. **Testing details** and results
5. **Screenshots/videos** if UI changes
6. **Breaking changes** if any

### Review Process

1. At least one maintainer review required
2. All CI checks must pass
3. No merge conflicts
4. Documentation must be updated
5. CHANGELOG must be updated

## 🚢 Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (x.X.0): New features (backward compatible)
- **PATCH** (x.x.X): Bug fixes (backward compatible)

### Release Checklist

1. **Update version** in `package.json`
2. **Update CHANGELOG.md** with release notes
3. **Update README.md** if needed
4. **Update screenshots** if UI changed
5. **Build and test** on all platforms
6. **Create git tag**: `git tag -a v1.1.0 -m "Release v1.1.0"`
7. **Push tag**: `git push origin v1.1.0`
8. **CI creates release** automatically
9. **Verify release** artifacts on GitHub

### Release Notes Format

```markdown
## [1.1.0] - 2026-02-10

### Added
- New feature descriptions

### Changed
- Modified feature descriptions

### Fixed
- Bug fix descriptions

### Removed
- Removed feature descriptions
```

## 🐛 Reporting Bugs

Use our [bug report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, version, etc.)
- Error logs if available

## 💡 Requesting Features

Use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) and include:

- Clear description of the feature
- Problem it solves
- Proposed solution
- Use case examples
- Priority level

## 🏗️ Architecture Guidelines

### State Management

- Use **Zustand** for global state
- Keep state minimal and normalized
- Use selectors for derived state
- Implement undo/redo with **Zundo**

### Performance

- Lazy load heavy components
- Use React.memo for expensive renders
- Implement virtualization for long lists
- Use Web Workers for heavy computations
- Optimize bundle size

### Accessibility

- Use semantic HTML
- Add ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers
- Maintain color contrast ratios

### Error Handling

- Use try-catch for async operations
- Provide user-friendly error messages
- Log errors for debugging
- Implement retry mechanisms
- Show loading states

## 📚 Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Zustand Documentation](https://docs.pmnd.rs/zustand)
- [Conventional Commits](https://www.conventionalcommits.org/)

## 🙏 Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to Veo Studio! 🎬
