![](images/slashcoded-dm-navlogo.png)

# Slashcoded Coding tracker

This extension links VS Code with the SlashCoded desktop app so local activity (coding, watching, terminal, chat, AFK, and file edits) plus sync health are mirrored inside SlashCoded's productivity dashboard. It only communicates with the local machine it runs on (and the desktop app when installed); no telemetry is shipped to the cloud. It works best paired with the SlashCoded desktop client (lundholm.io/project/slashcoded). Issues/PRs: https://github.com/pakanatahu/vscode-coding-tracker

Highlights:
- Tracks terminal usage, AI chat conversations (Codex, Copilot, etc.), and distinguishes reading vs writing inside VS Code
- Status bar indicators show the active exclusive mode and upload queue without double-counting
- AFK detection pauses tracking automatically and resumes when you return

Supported languages:
English

All part of this extension(included server program, documents) are open-source and hosted on Github.

> Links:  
> Original server repo (legacy): https://github.com/hangxingliu/vscode-coding-tracker-server

## Features

- Status bar with exclusive mode + upload queue insights
- Exclusive modes for coding, watching, terminal, chat, and AFK
- AFK detection with a configurable timeout and automatic pause/resume
- Terminal activity tracking (open/close/focus) plus command execution timelines
- AI Chat tracking across providers with context-key heuristics and focus-aware detection
- Records coding time, file edits, focus switches, and editor usage to differentiate reading vs writing
- Captures sync status, upload queue depth, and desktop app connectivity health for SlashCoded
- Proxy and timeout configuration for uploads

## Useful commands

- `CodingTracker: Show Report` to inspect the latest activity log
- `CodingTracker: Start Local Server` / `Stop Local Server` to control the ingest service
- `CodingTracker: Flush Upload Queue` to retry stalled uploads
- `CodingTracker: Toggle state logging` to write mode transition details to the Coding Tracker output channel
- `CodingTracker: Set Upload Token` to rotate credentials securely
- `CodingTracker: Re-discover Desktop App` and `CodingTracker: Show Sync Status` for maintaining the SlashCoded bridge

### Manually flush the upload queue

If uploads get stuck and you see a growing number next to the status bar label (for example, "SlashCoded < 39"), you can force a retry:

- Click the status bar item to flush pending uploads, or
- Run the command: "CodingTracker: Flush Upload Queue"

The flush will also recover from a stuck request if it has exceeded the timeout, by restarting the upload cycle.

## Development prerequisites

This repo targets the latest Node.js LTS for development and packaging:

- Node.js 22.x (LTS) for building and packaging the extension
- `.nvmrc` is included with `22` to help version managers pick the right version
- Note: the runtime Node for the extension is provided by VS Code’s Extension Host (Electron), not your local Node. Upgrading your local Node affects development tools only (TypeScript, vsce packaging, etc.).

Build/package locally:

1. Use Node 22 (e.g., `nvm use`)
2. Install deps: `npm install`
3. Package (bundles with esbuild): `npm run package` (produces a `.vsix` file in the repo root)

Install from VSIX:

1. In VS Code, open Extensions (Ctrl+Shift+X)
2. “…” → Install from VSIX…
3. Select the newly built VSIX file
4. Reload when prompted


## Quick start

1. Install the extension (Marketplace or VSIX)
2. Run `CodingTracker: Set Upload Token` and paste your secure token
3. Start the SlashCoded desktop app (or run `CodingTracker: Start Local Server`) so the local ingest endpoint is available
4. Use `CodingTracker: Show Sync Status` to confirm the bridge and `CodingTracker: Show Report` to open the latest log

## Configuration

Settings (Preferences → Settings → Coding Tracker):

- codingTracker.uploadToken: no longer needed in settings; set via “Set Upload Token” command (Secret Storage)
- codingTracker.computerId: optional identifier for your machine
- codingTracker.showStatus: toggle the status bar item
- codingTracker.proxy: “auto”, “no-proxy”, false, or host:port (for uploads)
- codingTracker.uploadTimeoutMs: per-request timeout
- codingTracker.afkEnabled / codingTracker.afkTimeoutMinutes: AFK detection
- codingTracker.shouldTrackTerminal / codingTracker.shouldTrackAIChat: per-feature toggles

## SlashCoded desktop app (Windows only)

1. Download the Windows installer from lundholm.io/project/slashcoded (look for the VS Code integration bundle).
2. Run the installer, sign in or create an account, and let the app install the local ingest service.
3. Start the desktop app before launching VS Code so the extension discovers it automatically.
4. Use `CodingTracker: Show Sync Status` or `CodingTracker: Re-discover Desktop App` if the desktop client launches after VS Code.

Once installed, the desktop app exposes the same local endpoint the extension uses, keeps richer history, and surfaces your stats inside SlashCoded’s dashboard.

### View your report

Run `CodingTracker: Show Report` to open the local report UI served by the desktop app or the built-in ingest helper.

## Contributing

[CONTRIBUTING.md](CONTRIBUTING.md)



## Credits

This project is a fork of the original work by  
[LiuYue (hangxingliu)](https://github.com/hangxingliu)


- Extension(excluded icon and third party codes) and server scripts are licensed under [GPL-3.0](LICENSE)
- Third party codes license information in the front of third party code files
