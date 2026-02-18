# Code Implementer Memory

## Phase 4 Services Implementation (2024-02-18)

### Cost Estimation Service
- Local quality scoring service (no Gemini API)
- Scores 6 dimensions: specificity, style, camera, lighting, length, syntax
- All weights must sum to 1.0
- Length weight ≤ 0.10 per RAI-ADR-001
- Quality score clamped to 1-10 range
- Cost estimation based on model (veo=0.05, sora=0.08 USD)

### Narrative Analysis Service
- Local narrative coherence analysis (no AI)
- Analyzes sequences of 2+ scenes
- Issue types: missing-transition, pacing, character-jump, duplicate-theme
- Severity levels: 'info' for pacing/themes, 'warning' for transitions/characters
- Uses suggestive language ("consider", not "must"/"should")
- Character detection via capitalized words (3+ chars)
- Theme detection from keyword list

### Service Export Pattern
- New services added to `src/core/services/index.ts`
- Group exports by version (v2.7.0 — AI-Driven Project Optimization)
- Named exports only (singleton instances)

### Test Standards
- Mock only external dependencies (loggerService)
- 12+ tests minimum per service
- Cover structure validation, edge cases, and business logic
- Test severity levels and suggestion language
- Verify type compliance and field requirements
