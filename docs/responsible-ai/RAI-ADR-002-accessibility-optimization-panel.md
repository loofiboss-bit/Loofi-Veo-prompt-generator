# RAI-ADR-002: Accessibility Requirements for Optimization Panel

## Status

Accepted

## Context

All optimization UI components must meet WCAG 2.1 AA compliance requirements to ensure equal access for all users.

## Decision

### 1. Keyboard Navigation

- All interactive elements reachable via Tab key
- Suggestion chips navigable via Arrow keys
- Enter key accepts the focused suggestion
- Delete/Backspace dismisses the focused suggestion
- Escape closes the optimization panel
- Focus trap within modal dialogs if applicable

### 2. Screen Reader Support

- `OptimizePanel`: `role="complementary"` + `aria-label="Optimization suggestions"`
- `InlineSuggestions` container: `role="status"` + `aria-live="polite"`
- Each suggestion chip: `role="listitem"` with `aria-label` describing category + suggestion text
- `QualityScoreCard` score badge: `aria-label="Quality score X out of 10"`
- Breakdown bars: `role="progressbar"` + `aria-valuenow` + `aria-valuemin="0"` + `aria-valuemax`
- `NarrativeHealthPanel`: `role="list"` with issue severity announced
- `PresetRecommendCard` confidence bar: `role="progressbar"`

### 3. Visual Accessibility

- All color-coded elements use icon + color (never color-only discrimination)
- Suggestion category colors meet 4.5:1 contrast ratio against background
- Quality score badges use icon/text + color
- Panel supports 200% zoom without layout breakage

### 4. Motion & Animation

- Chip enter/exit animations respect `prefers-reduced-motion` media query
- Maximum animation duration: 200ms
- No essential information conveyed through animation alone

### 5. Focus Management

- When a suggestion is accepted or dismissed, focus moves to the next suggestion
- If no suggestions remain, focus returns to the text area
- Panel open/close manages focus appropriately (focus to panel on open, return on close)

## Consequences

- Additional ARIA attributes on all components (minor code overhead)
- Animation system must check media query before applying transitions
- All interactive elements must have visible focus indicators
