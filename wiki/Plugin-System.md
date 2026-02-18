# Plugin System

The plugin system enables safe extension of Veo Studio behavior through a typed and permission-gated runtime.

## 1) Plugin lifecycle

1. Manifest load and validation
2. Compatibility and trust evaluation
3. Registration in plugin registry
4. Activation (`activate(context)`)
5. Optional deactivation and disposal

## 2) Manifest requirements

Required fields:

- `id`
- `name`
- `version`
- `description`
- `author`
- `main`
- `permissions`

Recommended fields:

- `engineVersion`
- `settings`
- `extensionPoints`
- `hooks`
- `signature`

## 3) Permission model

Use least privilege. Request only what your plugin truly needs.

| Domain       | Permissions                                         |
| ------------ | --------------------------------------------------- |
| Storage      | `storage`, `storage:read`, `storage:write`          |
| Data access  | `projects:*`, `history:*`, `templates:*`            |
| UI extension | `ui:sidebar`, `ui:toolbar`, `ui:modal`, `ui:studio` |
| Events       | `events:subscribe`, `events:publish`                |
| Export       | `export`                                            |

## 4) Plugin context

On activation, plugins receive a scoped context with:

- Manifest metadata
- API subset limited by permissions
- Plugin-scoped storage
- Event bus interface
- Plugin logger

## 5) Trust and health

Runtime metadata includes trust and health states to isolate problematic plugins.

Trust levels:

- `trusted`
- `untrusted`
- `unsigned`
- `invalid`

Health statuses:

- `healthy`
- `degraded`
- `crashed`

## 6) Safe plugin development checklist

- Validate manifest schema and version ranges.
- Keep permissions minimal.
- Handle activation failures explicitly.
- Cleanup resources on `deactivate` and `dispose`.
- Test against app version upgrades.

## 7) References

- [Plugin API Reference](../docs/PLUGIN_API.md)
- [Plugin Development Guide](../docs/PLUGIN_DEVELOPMENT.md)
- [Developer Guide](./Developer-Guide.md)
