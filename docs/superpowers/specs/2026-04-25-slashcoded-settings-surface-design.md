# SlashCoded Settings Surface Design

Date: 2026-04-25

## Context

The VS Code extension is desktop first. The first public release supports two use cases:

1. Run as a standalone extension with the built-in local dashboard.
2. Produce VS Code activity events for the SlashCoded desktop app, which receives events through its local API.

There is no cloud service for the extension to connect to. Settings and runtime behavior should stop presenting cloud-era concepts such as upload tokens, Azure function keys, manual origins, proxy overrides, server URLs, and computer identifiers.

The current extension still exposes several `codingTracker.*` settings in VS Code. Some are unused, some reflect removed cloud/server behavior, and some use the old project namespace. Because the next release is the first public release, no migration layer is required.

## Goals

- Present a small, accurate settings surface under the `slashCoded.*` namespace.
- Remove `codingTracker.*` settings from `package.json` so they do not appear in VS Code settings.
- Remove cloud-only settings and active runtime assumptions from the public extension path.
- Represent the two supported modes with one clear setting.
- Keep the implementation testable with explicit checks against stale settings.

## Non-Goals

- Do not preserve public compatibility for `codingTracker.*` settings.
- Do not support cloud uploads.
- Do not keep `computerId` as a user setting.
- Do not add migration code for pre-release builds.

## Proposed Settings

The public settings surface should be:

| Setting | Type | Default | Purpose |
| --- | --- | --- | --- |
| `slashCoded.showStatus` | boolean | `true` | Show the SlashCoded status bar item. |
| `slashCoded.shouldTrackTerminal` | boolean | `true` | Include terminal activity events. |
| `slashCoded.shouldTrackAIChat` | boolean | `true` | Include AI chat activity events. |
| `slashCoded.afkEnabled` | boolean | `true` | Pause or classify tracking when VS Code is idle. |
| `slashCoded.uploadTimeoutMs` | number | `15000` | Timeout for local API upload requests. |
| `slashCoded.desktopDiscoveryTimeoutMs` | number | `500` | Timeout for local desktop discovery handshakes. |
| `slashCoded.storageMode` | enum | `auto` | Choose automatic Desktop/local behavior or standalone local-only behavior. |

`slashCoded.storageMode` values:

- `auto`: use SlashCoded Desktop when detected; otherwise store events locally and show them in the built-in dashboard.
- `standalone`: always store events locally and use the built-in dashboard, even if Desktop is running.

## Deprecated Settings To Remove

Remove these from the contributed configuration surface:

- `codingTracker.connectionMode`
- `codingTracker.uploadToken`
- `codingTracker.computerId`
- `codingTracker.localServerMode`
- `codingTracker.moreThinkingTime`
- `codingTracker.proxy`
- `codingTracker.functionKey`
- `codingTracker.overrideOrigin`
- `codingTracker.afkTimeoutMinutes`
- `codingTracker.forceLocalFallback`

These keys should not appear in `package.json`, `package.nls*.json`, README settings documentation, or tests that define the approved public settings list.

## Runtime Design

Configuration reads should switch from `codingTracker` to `slashCoded`.

Command IDs should also switch from `codingTracker.*` to `slashCoded.*`. The first public release should not expose old command IDs or old settings IDs.

`storageMode` replaces `forceLocalFallback`:

- `auto` maps to the current default behavior: queue events to Desktop when discovery succeeds, and otherwise write local history for the built-in dashboard.
- `standalone` maps to the current local-only fallback behavior: do not queue live events for Desktop, and write local history instead.

Cloud mode should be removed from the active runtime path. The uploader should no longer need a user-selected `connectionMode`, cloud endpoint fallback list, upload token setting, function key setting, override origin setting, or user proxy override.

`computerId` should not be user-configurable. `pcid` should be removed from the desktop upload payload because the desktop reporting model no longer uses it.

`afkTimeoutMinutes` should be removed because active configuration already gets idle timing from host tracking config, with a default fallback in `hostTiming`.

`moreThinkingTime` should be removed because it exposes legacy coding-duration tuning that does not match the Desktop-first activity model.

## Documentation Design

README settings documentation should describe only the `slashCoded.*` keys and the two supported operating modes:

- Desktop-connected producer mode.
- Standalone local dashboard mode.

README should not mention cloud upload, manual upload tokens, tracker server URLs, Azure function keys, manual origins, or computer IDs.

Localization strings should be updated or removed so old settings do not leak into the packaged extension.

## Testing Strategy

Add focused tests that assert:

- All contributed configuration keys start with `slashCoded.`.
- All contributed command IDs start with `slashCoded.`.
- The contributed settings list matches the approved public list.
- Deprecated `codingTracker.*` settings are not present in `package.json`.
- Runtime configuration reads and command registrations use `slashCoded`, not `codingTracker`, in active modules.
- `storageMode: "standalone"` keeps live events local.
- `storageMode: "auto"` keeps the current Desktop-when-detected behavior.
- Desktop-mapped upload payloads omit `pcid`.

Run the existing command surface tests and local storage mode tests after the cleanup.

## Implementation Sequence

1. Add failing tests for the public settings list and namespace.
2. Update `package.json` contributed configuration to `slashCoded.*`.
3. Update contributed command IDs and active command registrations to `slashCoded.*`.
4. Update active runtime configuration reads to use `slashCoded`.
5. Replace `forceLocalFallback` with `storageMode`.
6. Remove `computerId` and `pcid` from the active desktop upload path.
7. Remove cloud-only active settings and code paths from the public runtime where the tests can cover them.
8. Update README and localization strings.
9. Bundle and package the extension, then inspect the generated VSIX settings and command surfaces.
