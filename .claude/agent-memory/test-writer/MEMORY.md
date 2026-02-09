# Agent Memory: test-writer

## Current Testing Status

**v1.3.0**: Manual testing only
**v1.4.0**: Unit tests planned
**v2.0.0**: Full test suite (unit + integration + E2E)

## Testing Strategy (Future)

**Unit Tests** (v1.4.0):

- Service layer tests
- Utility function tests
- Custom hook tests
- Target: 80% coverage

**Integration Tests** (v1.4.0):

- Store integration tests
- Service + store interaction
- Component + service integration

**E2E Tests** (v2.0.0):

- Critical user flows
- Export functionality
- Template/preset management
- Project workflows

## Manual Testing Checklist (Current)

Before each release:

- [ ] All keyboard shortcuts work
- [ ] Dark/light theme switching
- [ ] All export formats
- [ ] Autosave and recovery
- [ ] Empty/corrupted database handling
- [ ] Error handling paths
- [ ] All modals and dialogs
- [ ] Windows + Linux builds

## Sprint 4 Testing Tasks

- Manual testing of new components
- Verify service integration
- Test error states
- Accessibility check (keyboard nav)
