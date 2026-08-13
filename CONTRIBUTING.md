# Contributing to Loofi Creator Studio

## Development baseline

- Node.js 24 (`.nvmrc` is authoritative)
- npm and the committed `package-lock.json`
- Windows x64 or Linux; Fedora 44 is the supported Linux packaging baseline

```bash
git clone https://github.com/loofiboss-bit/Loofi-Veo-prompt-generator.git
cd Loofi-Veo-prompt-generator
nvm use
npm ci
npm run electron:dev
```

Do not use real provider credentials in tests, fixtures, screenshots, issues, or pull requests.

## Architecture rules

- Business logic belongs in singleton services under `src/core/services`.
- Components do not access IndexedDB or desktop files directly.
- Zustand stores own renderer state; durable paid jobs are owned by Electron main.
- Use the canonical model catalog for provider IDs, lifecycle, capability, and cost data.
- Unknown pricing must block paid execution. Never substitute zero or an undocumented estimate.
- Keep credentials in the OS vault and expose only narrow, validated preload methods.
- Use path aliases across module boundaries and named exports.
- Preserve `com.loofi.flowveostudio`, existing storage keys, and v5–v9 project compatibility.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Validation

Run the smallest relevant checks while developing and the full gate before proposing a change:

```bash
npm run lint:ci
npm run typecheck
npm run test
npm run test:e2e
npm run validate
```

Release or packaging changes additionally require:

```bash
npm run screenshots
npm audit --audit-level=high
npm run validate:release
```

Screenshots and automated provider tests must use deterministic fake data and make no paid calls.
Physical package tests must be reported separately from unit, offscreen, or CI evidence.

## Accessibility and localization

- All primary Create copy belongs to the `create` namespace.
- English, Spanish, French, Japanese, and Arabic keys and placeholders must stay aligned.
- Use logical CSS properties for RTL, semantic headings, visible focus, keyboard operation,
  `aria-live` for job changes, reduced motion, and sufficient contrast.
- Verify the minimum 1024×640 layout and supported scaling states.

## Commits and pull requests

Use Conventional Commits:

```text
type(scope): concise lowercase subject
```

Allowed types are `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `perf`, `revert`, and
`style`. Keep code, tests, documentation, and `CHANGELOG.md` aligned. Pull requests must describe
compatibility impact, verification performed, and any `NOT RUN` manual gates.

Do not publish, tag, sign, or alter repository visibility as part of an ordinary contribution.
