![](images\slashcoded.png)

# SlashCoded

SlashCoded tracks local VS Code activity for the SlashCoded desktop app or the built-in standalone dashboard. It records coding, watching, terminal, chat, AFK, and file-edit activity on your machine. There is no cloud upload path in this extension.

Highlights:
- Tracks terminal usage, AI chat conversations, and reading vs writing inside VS Code
- Shows the active mode and upload queue in the status bar
- Stores local activity history when SlashCoded Desktop is not installed
- Opens a built-in local dashboard for standalone use
- Uploads events to SlashCoded Desktop when its local API is discovered

## Features

- Status bar with exclusive mode and upload queue insights
- Exclusive modes for coding, watching, terminal, chat, and AFK
- AFK detection with automatic pause/resume
- Terminal activity tracking with command execution timelines
- AI chat tracking across providers with context-key heuristics and focus-aware detection
- Built-in fallback summary dashboard grouped by activity, repository, branch, and file extension
- Desktop discovery, standalone local storage, and upload timeout controls

## Useful Commands

- `SlashCoded: Show Local Report` opens the built-in local summary dashboard
- `SlashCoded: Show Sync Status` shows Desktop connectivity, queue depth, and maintenance actions
- `SlashCoded: Import Local History into Desktop` moves local-only fallback history into the upload queue
- `SlashCoded: Show Output Channel` opens the extension log/output stream

### Manually Flush The Upload Queue

If uploads get stuck and the status bar shows a growing queue count, you can force a retry:

- Click the status bar item, or
- Run `SlashCoded: Show Sync Status` and choose `Force upload queued events now`

## Quick Start

1. Install the extension from the Marketplace or a VSIX.
2. If SlashCoded Desktop is installed, start it so the extension can discover the local API.
3. If SlashCoded Desktop is not installed, use `SlashCoded: Show Local Report` for the built-in local dashboard.
4. To import standalone history into Desktop later, run `SlashCoded: Import Local History into Desktop`.
5. Use `SlashCoded: Show Sync Status` to confirm Desktop discovery.

## Configuration

Settings are under Preferences -> Settings -> SlashCoded:

- `slashCoded.storageMode`: `auto` uses SlashCoded Desktop when detected and local history otherwise; `standalone` always uses the built-in local dashboard
- `slashCoded.showStatus`: show or hide the status bar item
- `slashCoded.shouldTrackTerminal`: include terminal activity
- `slashCoded.shouldTrackAIChat`: include AI chat activity
- `slashCoded.afkEnabled`: pause or classify tracking when VS Code is idle
- `slashCoded.uploadTimeoutMs`: local Desktop API upload timeout in milliseconds
- `slashCoded.desktopDiscoveryTimeoutMs`: local Desktop discovery timeout in milliseconds

## SlashCoded Desktop

1. Download the Windows installer from https://lundholm.io/project/slashcoded.
2. Run the installer, sign in or create an account, and let the app install the local ingest service.
3. Start the desktop app before launching VS Code so the extension discovers it automatically.
4. Use `SlashCoded: Show Sync Status` if Desktop starts after VS Code.

## Development

This repo targets Node.js 22.x for building and packaging.

1. Use Node 22, for example with `nvm use`.
2. Install dependencies with `npm install`.
3. Run tests with `npm run test:node`.
4. Package with `npm run package`.

The package script creates `SlashCoded-VSCode-Extension.x.x.x.vsix` in the repo root.

## Credits

This project is a fork of the original work by [LiuYue (hangxingliu)](https://github.com/hangxingliu).

- Extension code and server scripts are licensed under [GPL-3.0](LICENSE)
- Third-party code keeps the license information in its source files
