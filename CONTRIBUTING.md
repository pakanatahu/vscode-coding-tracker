# Contributing

Thanks for improving SlashCoded for VS Code. This guide covers the local workflow, test commands, and repository conventions contributors should know before opening a change.

## Project Map

For a high-level file inventory, start with [docs/FILE-LIST.md](docs/FILE-LIST.md).

The main areas are:

- `extension.js`: Extension entrypoint.
- `lib/`: Extension runtime, tracking, upload, local report, and VS Code integration code.
- `server-app/`: Built-in local dashboard HTML, JavaScript, CSS, and served assets.
- `scripts/`: Bundle, package, and local data import helpers.
- `test/`: Node test suite.
- `dist/`: Generated extension bundle.

## Finding Work

Start with [TODO.md](TODO.md). It tracks contributor-sized issues that are useful even before they become GitHub issues.

When picking up an item:

- Prefer small, focused changes.
- Add or update tests when behavior changes.
- Update documentation when user-facing commands, settings, screenshots, or workflows change.
- Mention the TODO item in your pull request or handoff notes.

## Development Setup

This repository targets Node.js 22.x.

1. Use Node 22, for example with `nvm use`.
2. Install dependencies with `npm install`.
3. Install VS Code API typings with `npm run install-vscode-dts` if your editor needs them.
4. Run tests with `npm run test:node`.

## Common Commands

- `npm run lint`: Run ESLint across extension, server, script, and test files.
- `npm run test:node`: Run the Node test suite.
- `npm run test`: Alias for `npm run test:node`.
- `npm run bundle`: Build `dist/extension.js`.
- `npm run package`: Bundle and create `SlashCoded-VSCode-Extension.x.x.x.vsix` in the repo root.

## Running The Extension Locally

Open the repository in VS Code and use the Extension Development Host launch profile from `.vscode/launch.json`.

Useful commands inside the development host:

- `SlashCoded: Show Local Report`
- `SlashCoded: Show Sync Status`
- `SlashCoded: Import Local History into Desktop`
- `SlashCoded: Show Output Channel`

If SlashCoded Desktop is running, the extension tries to discover its local API. If Desktop is not available, the extension stores activity locally and serves the built-in dashboard.

## Testing Changes

Run focused tests while developing, then run the full Node suite before handing off a change:

```powershell
npm run test:node
```

For packaging or command-surface changes, also run:

```powershell
npm run package
```

Check generated files deliberately. `npm run bundle` and `npm run package` update `dist/extension.js`, and packaging creates a VSIX in the repository root.

## Dashboard Work

The built-in dashboard lives in `server-app/` and receives data from the local report route in `lib/LocalServer.js`.

When changing dashboard charts, grouping, or labels:

- Update aggregation logic in `lib/localReport/` when the data contract changes.
- Update dashboard rendering in `server-app/app.js` and styles in `server-app/styles.css`.
- Add or update tests under `test/`.
- Refresh README screenshots only when the visible dashboard changes intentionally.

## Documentation

Keep contributor-facing documentation direct and current:

- Update `README.md` for user-facing behavior, commands, settings, screenshots, and Marketplace copy.
- Update this file for contributor workflow changes.
- Update `docs/FILE-LIST.md` when source files, scripts, tests, or generated outputs are added, removed, or renamed.
- Keep package metadata directly in `package.json`.
