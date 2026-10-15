# Historical secret-scan review

Review date: 2026-10-15. Scanner: Gitleaks 8.24.3 with its default rules.
Baseline: main `fac29104eab98fd85e79a2ea9a839710cd5b66b4`.

The full reachable main history produces 20 findings with 19 unique fingerprints: one prompt-field
mapping appears twice. Source and surrounding context were inspected at each recorded commit.
The three Google-key fingerprints refer to the same historical hardcoded credential. The owner
confirmed that revocation status is unknown. On 2026-10-15 the owner authorized exact-value
history sanitization across 14 branches and 64 tags. The three credential occurrences were removed
from the rewritten history, not ignored. A subsequent authenticated administrative lookup confirmed the key is already purged:
HTTP 200 returned a parent project but no key resource name, which
[Google documents](https://docs.cloud.google.com/api-keys/docs/reference/rest/v2/keys/lookupKey)
as a purged key. See [redacted evidence](evidence/historical-key-provider-status.json).
No credential value is included in this review, the ignore file, or checked-in scan reports.

The 16 individually reviewed false-positive fingerprints below are the complete `.gitleaksignore`.
No path, rule, whole commit, or generic test-file exclusion is configured. A newly introduced
credential, including in a test file or an ignored finding's path, must still fail the check.

| Fingerprint                                                                                                                            | Classification   | Evidence / disposition                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `abe97616e6209f84dca918929547250dbc7f2a36:src/core/services/gemini/aiClient.test.ts:generic-api-key:258`                               | FALSE POSITIVE   | Mocked AI-client expectation uses an explicitly named test fixture; no provider call is made.                                          |
| `933d267d2e3f3e660cc55b6060cf1eb83708ed38:.github/instructions/code-review.instructions.md:stripe-access-token:150`                    | FALSE POSITIVE   | Security documentation demonstrates a short illustrative Stripe token in a BAD-code example; it is not a production-format credential. |
| `d153833232a8c7b156d2d77f269dcfef17c802e4:.github/instructions/code-review.instructions.md:stripe-access-token:142`                    | FALSE POSITIVE   | Security documentation demonstrates a short illustrative Stripe token in a BAD-code example; it is not a production-format credential. |
| `052169d0411064de12b2d6ae3fa02597304cef68:src/core/services/gemini/aiClient.test.ts:generic-api-key:219`                               | FALSE POSITIVE   | Mocked AI-client expectation uses an explicitly named test fixture; no provider call is made.                                          |
| `da69fbb8d20726c02c9feedcee500a8d8519b2bf:src/core/services/apiKeyService.test.ts:generic-api-key:20`                                  | FALSE POSITIVE   | The generic-key finding is the synthetic TEST_API_KEY fixture, not the separate default Google key.                                    |
| `da69fbb8d20726c02c9feedcee500a8d8519b2bf:src/core/services/apiKeyService.test.ts:gcp-api-key:21`                                      | REMOVED FROM GIT | Exact value removed by authorized rewrite; Google lookup confirms key purged.                                                          |
| `29e24312b4e83d522942a63764b1f99ce9fb770f:coverage/lcov-report/src/core/services/apiKeyService.ts.html:gcp-api-key:152`                | REMOVED FROM GIT | Exact value removed by authorized rewrite; Google lookup confirms key purged.                                                          |
| `29e24312b4e83d522942a63764b1f99ce9fb770f:coverage/lcov-report/src/core/services/apiExportService.ts.html:curl-auth-header:1596`       | FALSE POSITIVE   | Generated curl example contains a literal API-key placeholder, not a credential.                                                       |
| `29e24312b4e83d522942a63764b1f99ce9fb770f:coverage/lcov-report/src/core/services/keyboardShortcutManager.ts.html:generic-api-key:1200` | FALSE POSITIVE   | The keys property contains a keyboard shortcut chord, not an authentication key.                                                       |
| `d8a0f17f2d51dbe0754c53ad53e9e2eb233f485d:src/core/services/keyboardShortcutManager.ts:generic-api-key:151`                            | FALSE POSITIVE   | The keys property contains a keyboard shortcut chord, not an authentication key.                                                       |
| `9e1ad38c0414feb33281ce08198f6667ae1a2401:services/apiExportService.ts:curl-auth-header:369`                                           | FALSE POSITIVE   | Generated curl example contains a literal API-key placeholder, not a credential.                                                       |
| `a50523a59ae0e445125bd428039cd22198098266:services/apiKeyService.ts:gcp-api-key:7`                                                     | REMOVED FROM GIT | Exact value removed by authorized rewrite; Google lookup confirms key purged.                                                          |
| `526ddeec28d4464094e88e18453cb4278cfef629:services/keyboardShortcutManager.ts:generic-api-key:151`                                     | FALSE POSITIVE   | The keys property contains a keyboard shortcut chord, not an authentication key.                                                       |
| `5baea28777d0a41a4f3031853f90a1c7d1a4782f:services/promptBuilder.ts:generic-api-key:45`                                                | FALSE POSITIVE   | Prompt field mappings and boolean comparisons are application state/translation names, not credentials.                                |
| `b7b6ab423bf95cb09335ec512eb7db9a97667638:services/promptBuilder.ts:generic-api-key:129`                                               | FALSE POSITIVE   | Prompt field mappings and boolean comparisons are application state/translation names, not credentials.                                |
| `2bdf7c081b3b554bf7c5ac2e6275d25801a37466:services/promptBuilder.ts:generic-api-key:75`                                                | FALSE POSITIVE   | Prompt field mappings and boolean comparisons are application state/translation names, not credentials.                                |
| `d0a134ad759b75d755ec0bda27a0c296fdfbbca0:services/promptBuilder.ts:generic-api-key:75`                                                | FALSE POSITIVE   | Prompt field mappings and boolean comparisons are application state/translation names, not credentials.                                |
| `048462364a887e44772f64e0b04c1d5c6964257b:services/promptBuilder.ts:generic-api-key:129`                                               | FALSE POSITIVE   | Prompt field mappings and boolean comparisons are application state/translation names, not credentials.                                |
| `d15dda917d7a3f73fff9ed23b0dbd7d012d0b115:services/promptBuilder.ts:generic-api-key:25`                                                | FALSE POSITIVE   | Prompt field mappings and boolean comparisons are application state/translation names, not credentials.                                |

## Remaining action

The historical Google credential needs owner-side identification and revocation/rotation. It has
not been used to contact a provider to test validity. Source removal or passing incremental PR
checks does not establish revocation. The authorized rewrite removes the exact value from all
published branch/tag history while preserving other content. Full-history scanning must pass on
the sanitized history without suppressing credential findings. GitHub cached commit and PR views
may retain old objects; GitHub Support may be required to purge these references. Existing clones
and forks need separate cleanup. Previous release attestations refer to pre-rewrite commits; new
v16.0.1 artifacts will be built and attested against the new lineage.

## Reproduction

Install the checksum-verified Gitleaks 8.24.3 binary as shown in `.github/workflows/security.yml`.
Then run `npm run secrets:self-test` and `npm run secrets:check`; `GITLEAKS_BIN` may select an
absolute binary path. The self-test creates only an isolated temporary Git repository, commits a
synthetic token, removes it in a later commit, and confirms that full-history scanning still finds
it with the project's exact-fingerprint exceptions. Temporary files are removed afterwards.

The CI workflow retains full checkout history and explicitly scans HEAD's complete reachable
history on every event. Output is redacted and findings are not uploaded or posted as comments.

Reference: [Gitleaks 8.24.3 usage and fingerprint exclusions](https://github.com/gitleaks/gitleaks/blob/v8.24.3/README.md).

## Authorized sanitization evidence

The isolated sanitized mirror passed Gitleaks 8.24.3 across all refs (604 commits) with zero
findings after remapping only the 16 previously reviewed false-positive fingerprints.
The credential value and replacement instruction file are not included in repository artifacts.
New canonical main after rewrite: `b9e9374bc0d8c7f84152b4cffa4404abdf1a98a6`.
The initial fingerprint table records rewritten commit identities; current source has no key.
