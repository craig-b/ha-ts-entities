# ha-ts-entities

## Documentation

Relevant HA reference docs are available locally under docs/:

- docs/dev/          — HA developer guides. Start here for integration patterns.
- docs/integrations/ — Reference implementations for 1400+ official integrations.
- docs/user-docs/    — User-facing HA documentation.
- docs/hacs/         — HACS publishing requirements and validation.

Before implementing any HA pattern, check docs/dev/ first.
For examples of how existing integrations handle something, grep docs/integrations/.

### Key paths

- docs/dev/config_entries_config_flow_handler.md — config flow implementation
- docs/dev/core/entity/                          — entity platform base classes
- docs/hacs/publish/                             — HACS submission requirements

### Submodule commands

Clone with submodules:
```
git clone --recurse-submodules --shallow-submodules <repo>
```

Update to latest docs:
```
git submodule update --remote --depth 1
```
