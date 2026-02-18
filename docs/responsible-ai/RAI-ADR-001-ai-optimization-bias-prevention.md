# RAI-ADR-001: AI Optimization Bias Prevention

## Status

Accepted

## Context

The AI-Driven Project Optimization epic adds 5 Gemini-powered optimization features. Each feature carries bias risk that must be mitigated through explicit design constraints.

## Decision

### 1. Prompt Refinement

- Gemini system prompt must use neutral technical framing ("additions that increase specificity" not "corrections")
- No cultural aesthetic value judgments in suggestions
- Suggestion categories are technical-only: style, camera, lighting, specificity, syntax
- Confidence scores visible to users
- No auto-apply — all suggestions require explicit user acceptance
- Dismissal without penalty or behavior change

### 2. Asset Intelligence (Vision)

- Gemini Vision prompt must explicitly prohibit person identification by demographics
- Instruction: "Describe visual elements only, e.g. 'person in red jacket' not 'young Asian woman'"
- Use neutral vocabulary — ban racial descriptors, age-based labels, gendered role assumptions
- Confidence thresholding at 0.3 filters low-confidence biased labels
- All tags editable and removable by user
- Source labeling: "ai" vs "manual" clearly indicated

### 3. Quality Scoring

- Scoring breakdown fully transparent — every dimension and weight visible
- `optimizationRules.ts` keyword lists must include diverse cinematic traditions (anime, Bollywood, documentary, experimental — not just Hollywood)
- Prompt length is NOT a dominant scoring factor (weight ≤ 20%)
- Locale-aware fallback: structural-only analysis for non-English prompts (no keyword matching on non-English text)

### 4. Narrative Analysis

- Maximum issue severity is `warning` — never `error` (narrative structure is subjective)
- Use suggestive language: "Consider adding" not "Missing transition detected"
- No enforcement of specific story arc frameworks (three-act, hero's journey, etc.)
- Cultural narrative patterns are valid — no "standard" story structure privileged

### 5. Preset Recommendation

- Transparent reasoning strings explaining why a model/preset was recommended
- Frictionless override — users can ignore recommendations with one click
- Models framed as "optimized for [use case]" not "better than [alternative]"
- No price-based ranking that biases toward expensive models

## Review Schedule

- Pre-launch: Full prompt review for all Gemini system prompts
- 30 days post-launch: Locale disparity analysis (compare suggestion quality across locales)
- Quarterly: Keyword list expansion review (add underrepresented cinematic traditions)

## Consequences

- Slightly more verbose Gemini system prompts (adds ~200 tokens of safety instructions)
- May reduce suggestion recall for culturally-specific styles not yet in keyword lists
- Users always maintain full control over all AI-generated content
