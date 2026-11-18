# Authorized historical credential removal

On 2026-10-15 the owner explicitly authorized removing the exact historical Google credential by
rewriting all 14 published branches and 64 tags, followed by the v16.0.1 release. The original
checkout's local changes and the native M0 worktree were preserved. Only the credential value was
replaced; unrelated historical source was retained.

The mirror was cloned from GitHub, filtered using git-filter-repo 2.47.0 sensitive-data-removal mode,
and scanned across all refs with checksum-verified Gitleaks 8.24.3. Only 16 previously reviewed
false-positive fingerprints were remapped; none of the three credential occurrences was ignored.
The all-ref scan (604 commits) and publication-branch scan (550 commits) both reported zero findings.

The update used one atomic push with an explicit old-value lease for every changed branch/tag.
Beta and stable release workflows were temporarily disabled during the tag rewrite to prevent
unintended historical rebuilds, then restored to their original active state. Two local-only branch histories were also sanitized with their tip source trees unchanged.
No release assets
were represented as rebuilt or re-attested by this cleanup. v16.0.1 uses a fresh canonical build.

## Readback and limitations

[Ref old/new identities](evidence/history-sanitization-2026-10-15.json) allow independent verification.
The mirror contains 68 changed PR references (66 heads and two merges). GitHub owns these read-only refs; pushing branch/tag
updates cannot purge their cached objects. GitHub Support may need to remove cached commit/PR
views and run server-side garbage collection. Old forks, clones and downloaded artifacts are not
erased by rewriting this repository. An authenticated Google API Keys administrative lookup returned HTTP 200 with a parent project
and no resource name. Google documents this response as a purged key. The redacted
[provider-status evidence](evidence/historical-key-provider-status.json) records that result.
No model/API workload was invoked with the key, and no additional provider mutation was needed.

Existing release provenance identifies old commit IDs. The published tag pointers now follow the
sanitized graph, so historical assets must not be claimed to have new-lineage provenance. New
v16.0.1 assets are built and attested against their actual sanitized release commit.

## Existing clones

Use a fresh clone for new work. Preserve uncommitted work before retiring an old checkout. Do not
merge old history back into the sanitized graph; transfer only reviewed changes onto a new branch.
Local reflogs and private recovery backups may retain old objects until safely retired. Cleanup
must not destroy uncommitted work or unrelated commits.

## GitHub Support removal request data

Repository: `loofiboss-bit/Loofi-Veo-prompt-generator`.
First rewritten commit: `7c86a64ab86bfa35c75ac40ef9dadf96a59e8018`.
Affected PR head references: 66, plus two merge refs (includes historical PRs, not 66 currently open PRs).
All writable branch/tag references were cleaned and force-updated with leases on 2026-10-15.
The exact credential value is deliberately omitted. Request server-side cache/reference cleanup
for the historical Google credential without including its value in a public issue.

Reference: [GitHub sensitive-data removal guidance](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).
