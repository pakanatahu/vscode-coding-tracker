# IDE Extension Shared Timing Integration Spec

Status: Ready for implementation  
Date: 2026-04-14  
Audience: Agents implementing the VS Code extension repo and future IDE variants

## Purpose
Make VS Code and other IDE-family extensions use the same segment duration and idle cutoff as the Slashcoded Windows app tracker.

This is required so backend aggregation can safely prefer IDE `reading` / `writing` / `coding` / `terminal` / `ai_chat` slices over overlapping desktop `app` slices from `Code.exe`, `Cursor.exe`, and similar hosts.

This spec extends, but does not replace:
- [ide-extension-v2-integration-spec.md](/C:/github/Coding-Tracker-Server/docs/ide-extension-v2-integration-spec.md)

The Windows tracker is the host baseline and already consumes the shared Local API timing config in this repo.

## Required timing contract
The IDE extension must fetch and use:
- `GET /api/host/handshake`
- `GET /api/host/tracking-config`

Current contract shape:
```json
{
  "segmentDurationSeconds": 15,
  "idleThresholdSeconds": 300,
  "configVersion": "2026-04-14T00:00:00.0000000Z",
  "updatedAt": "2026-04-14T00:00:00.0000000Z"
}
```

Default values:
- `segmentDurationSeconds = 15`
- `idleThresholdSeconds = 300`

The extension must not continue to use independent IDE-local timing once host config is available.

## Startup and refresh flow
Required boot order:
1. Discover Local API with `GET /api/host/handshake`
2. Fetch `GET /api/host/tracking-config`
3. Cache the config in memory
4. Start editor, integrated terminal, and AI-chat timing using that config
5. Refresh config every 5 minutes

Failure policy:
- keep the last known good config if refresh fails
- only use `15s / 300s` as a startup fallback before first successful fetch

## Required IDE timing semantics
Shared rules:
- segment max length must equal `segmentDurationSeconds`
- `durationMs` must never exceed `segmentDurationSeconds * 1000`
- `segment_end_ts - segment_start_ts` must equal `durationMs`
- `occurredAt` should equal segment end time in UTC

The extension must stop or close the current segment when:
- editor/terminal focus changes to a different semantic activity kind
- the IDE window loses focus
- the user becomes idle for `idleThresholdSeconds`
- the active file/workspace/terminal context changes and the event identity would change
- shutdown or flush occurs

The extension must not emit long catch-up slices after inactivity or sleep.

## Activity-family requirements
For `reading`, `writing`, `coding`, `terminal`, and `ai_chat`:
- use the same shared segment clock
- use the same idle cutoff
- do not keep one producer family on 15 seconds and another on 60 seconds inside the same extension

For integrated terminal activity:
- terminal slices must also use the shared `segmentDurationSeconds`
- terminal idle cutoff must match the host `idleThresholdSeconds`

## Required upload metadata
Every emitted event should include:
```json
{
  "trackerConfigVersion": "2026-04-14T00:00:00.0000000Z",
  "segmentDurationSeconds": 15,
  "idleThresholdSeconds": 300
}
```

Placement:
- include these fields in `payload`

## Required event example
```json
{
  "contractVersion": "v2",
  "events": [
    {
      "source": "vscode",
      "occurredAt": "2026-04-14T09:15:30.000Z",
      "durationMs": 15000,
      "category": "coding",
      "payload": {
        "type": "coding",
        "ide": "vscode",
        "event_id": "ide-1713086130000-editor-main",
        "file": "C:\\repo\\app\\src\\worker.ts",
        "language": "typescript",
        "vcs_repo": "pakanatahu/Coding-Tracker-Server",
        "vcs_branch": "main",
        "workdir": "C:\\repo\\app",
        "segment_start_ts": 1713086115000,
        "segment_end_ts": 1713086130000,
        "trackerConfigVersion": "2026-04-14T00:00:00.0000000Z",
        "segmentDurationSeconds": 15,
        "idleThresholdSeconds": 300
      }
    }
  ]
}
```

## Implementation requirements
- Remove or refactor any hardcoded 60-second batching/segment assumptions
- Use one shared timing service inside the extension for all activity families
- Ensure retries reuse the same `event_id` for the same closed segment
- Keep semantic activity typing unchanged; only timing alignment changes here
- Preserve repo/file/workdir context exactly as before

## Acceptance criteria
- Editor, integrated terminal, and AI-chat slices all default to 15-second max segments
- IDE idle behavior defaults to 5 minutes and matches the host tracker
- Payload metadata proves which timing config the extension used
- Overlapping IDE slices line up closely with desktop `Code.exe` slices so host overlap replacement is predictable

## Explicit non-goals
- The extension should not classify productivity
- The extension should not assign projects directly
- The extension should not try to account for browser timing
