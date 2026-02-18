# Troubleshooting and FAQ

Common issues, diagnosis patterns, and quick resolutions.

## Quick diagnostics checklist

1. Confirm app version and runtime (web vs desktop).
2. Reproduce with minimal project context.
3. Inspect logs/console output for explicit errors.
4. Isolate whether issue is prompt logic, service layer, plugin, or runtime.

## Common issues

### Prompt generation fails

Possible causes:

- Invalid/missing API key
- Provider endpoint errors
- Request payload mismatch

Actions:

- Recheck API key settings.
- Retry with a simpler prompt payload.
- Confirm provider availability and request limits.

### Slow or unresponsive UI

Possible causes:

- Large local project state
- Heavy concurrent processing
- Browser/runtime resource constraints

Actions:

- Restart runtime and reopen project.
- Reduce active heavy modules and clear stale temporary state.
- Split large workflows into staged iterations.

### Export failures

Possible causes:

- Invalid metadata or unsupported format combination
- Corrupted intermediate project state

Actions:

- Retry with alternate format.
- Validate project/history state integrity.
- Run incremental export tests before full batch export.

### Plugin activation failure

Possible causes:

- Missing permissions
- Incompatible `engineVersion`
- Runtime error during activation

Actions:

- Revalidate manifest.
- Review plugin logs and health state.
- Disable plugin and retest baseline app behavior.

### Desktop starts in safe mode

Possible causes:

- Crash-loop detection threshold reached

Actions:

- Inspect latest logs and recent changes.
- Disable risky plugins/features.
- Re-enable normal mode after confirming stability.

## FAQ

### Where should I start as a new user?

Start with [Getting Started](./Getting-Started.md) and then [Feature Workflows](./Feature-Workflows.md).

### Where is architecture documented?

See [Architecture](./Architecture.md) and [Technical Architecture Doc](../docs/ARCHITECTURE.md).

### How do I build plugins safely?

Read [Plugin System](./Plugin-System.md) and [Plugin API](../docs/PLUGIN_API.md).

### How do I report security issues?

Use the private vulnerability reporting path described in [SECURITY.md](../SECURITY.md).
