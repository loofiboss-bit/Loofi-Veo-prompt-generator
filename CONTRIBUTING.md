# Contributing to Loofi Flow/Veo Studio

Thank you for your interest in contributing to Loofi Flow/Veo Studio! This document provides guidelines and instructions for contributing to the project.

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
git clone https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator.git
cd Loofi-Veo-prompt-generator

# Install dependencies (also sets up Husky git hooks via `prepare` script)
npm ci --legacy-peer-deps

# Start development server
npm run dev

# Run with Electron (development mode)
npm run electron:dev
```

### Quality Tools (auto-configured)

After `npm ci --legacy-peer-deps`, these are active automatically:

| Tool           | Trigger         | What it does                         |
| -------------- | --------------- | ------------------------------------ |
| **Prettier**   | Pre-commit hook | Auto-formats staged files            |
| **ESLint**     | Pre-commit hook | Lints staged `.ts`/`.tsx` files      |
| **commitlint** | Commit-msg hook | Enforces conventional commit format  |
| **Husky**      | Git hooks       | Runs pre-commit and commit-msg hooks |

### Key NPM Scripts

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build
npm run lint         # ESLint check
npm run typecheck    # TypeScript strict check
npm run test         # Run Vitest tests
npm run test:watch   # Tests in watch mode
npm run test:coverage # Tests with coverage report
npm run format       # Format all files with Prettier
npm run format:check # Check formatting (CI)
npm run validate     # lint + typecheck + test + format:check
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

4. **Commit your changes** using [Conventional Commits](https://www.conventionalcommits.org/) (enforced by commitlint):

   ```bash
   git commit -m "feat(timeline): add amazing feature"
   ```

   Allowed types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `perf`, `revert`, `style`

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
├── core/             # Business logic (services, store, types, constants, utils)
├── features/         # Feature modules (prompt, timeline, studios, etc.)
├── shared/           # Reusable components, hooks, contexts, styles
├── infrastructure/   # Database, workers
├── components/       # Shared UI components (accessibility, onboarding, ui)
├── hooks/            # Shared React hooks
├── utils/            # Utility functions
├── App.tsx           # Main application component
└── index.tsx         # Entry point
```

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full directory structure.

### Import Aliases (required)

```typescript
import { ... } from '@core/...';
import { ... } from '@features/...';
import { ... } from '@shared/...';
import { ... } from '@infrastructure/...';
import { ... } from '@/...';
```

**Never** use relative paths that cross module boundaries.

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

Use our [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml) and include:

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Environment details (OS, version, etc.)
- Error logs if available
- Severity level (Critical, High, Medium, Low)

## 💡 Requesting Features

Use our [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml) and include:

- Clear description of the feature
- Problem it solves
- Proposed solution
- Use case examples
- Priority level
- Feature category

## 📚 Documentation Requests

Use our [documentation request template](.github/ISSUE_TEMPLATE/documentation.yml) for:

- Missing documentation
- Unclear explanations
- Tutorial requests
- API reference improvements

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

Thank you for contributing to Loofi Flow/Veo Studio! 🎬

## 🤖 AI Agent Workflow

This project uses automated AI agents for development. If you're working with AI tools:

1. **Read** `.ai/INSTRUCTIONS.md` for canonical project rules
2. **Read** `.ai/ONBOARDING.md` for quick-start
3. **Follow** the workflow pipelines in `.ai/WORKFLOW.md`
4. **Check** `.ai/DECISIONS.md` for architectural context

Agent-specific configs: `CLAUDE.md`, `CHATGPT.md`, `CODEX.md`, `.github/copilot-instructions.md`

### MCP Servers

The project configures MCP servers in `.vscode/mcp.json` for AI tool integration (GitHub, Filesystem, Memory). These work automatically with VS Code + Copilot and Claude.
