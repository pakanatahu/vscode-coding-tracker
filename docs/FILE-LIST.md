# File List

This file is a high-level inventory of the repository. It is meant to help contributors find the main source, packaging, dashboard, and test files without listing generated dependency contents.

## Extension Entry And Metadata

- `extension.js`: Thin extension entrypoint that loads the active SlashCoded runtime.
- `package.json`: VS Code extension metadata, commands, configuration, scripts, icon, and publisher information.
- `package-lock.json`: Locked npm dependency tree.
- `.vscodeignore`: VSIX packaging include/exclude rules.
- `README.md`: Marketplace README and usage documentation.
- `CHANGELOG.md`: Release notes.
- `LICENSE`: Project license.

## Runtime Source

- `lib/extensionMain.js`: Main extension activation/runtime wiring.
- `lib/Constants.js`: Shared extension constants.
- `lib/EnvironmentProbe.js`: Environment metadata collection.
- `lib/Log.js`: Log and user-message helper.
- `lib/OutputChannelLog.js`: SlashCoded output channel integration.
- `lib/StatusBarManager.js`: Status bar state and display.
- `lib/Uploader.js`: SlashCoded Desktop discovery, queue, and upload workflow.
- `lib/UploadObject.js`: VS Code activity event object construction.
- `lib/VSCodeHelper.js`: Helper wrapper around VS Code APIs.
- `lib/StaticWebServer.js`: Static server for the built-in local dashboard.
- `lib/LocalServer.js`: Built-in local dashboard server command and report route integration.
- `lib/index.d.ts`: Local type definitions used by the JavaScript codebase.

## Core Runtime Modules

- `lib/core/configuration.js`: SlashCoded setting defaults and sanitization.
- `lib/core/desktopEventMapper.js`: Conversion from extension events to Desktop ingest payloads.
- `lib/core/hostTiming.js`: Host timing metadata helpers.
- `lib/core/httpClient.js`: HTTP request helper.
- `lib/core/installErrorHooks.js`: Runtime error hook installation.
- `lib/core/modeController.js`: Exclusive activity mode coordination.
- `lib/core/runtime.js`: Shared runtime state orchestration.
- `lib/core/wrapGenerators.js`: Event wrapper generation.

## Activity Tracking

- `lib/tracking/OpenCodeTracker.js`: Reading and coding activity tracking.
- `lib/tracking/terminalTracker.js`: Integrated terminal activity tracking.
- `lib/tracking/chatTracker.js`: AI chat activity tracking.
- `lib/tracking/afkMonitor.js`: AFK and idle tracking.
- `lib/tracking/globalActivityHooks.js`: Global activity hook registration.

## Local Report And Dashboard Data

- `lib/localReport/historyStore.js`: Local fallback history JSONL storage.
- `lib/localReport/reportAggregator.js`: Dashboard summary, chart, and grouping aggregation.
- `lib/localReport/languageExtensions.js`: Static language name and file-extension mapping for dashboard language groups.
- `lib/localReport/storageMode.js`: Standalone vs Desktop-backed storage mode decisions.

## VCS And Third-Party Helpers

- `lib/vcs/Git.js`: Git repository and branch metadata lookup.
- `lib/thirdPartyCodes/gitPaths.js`: Third-party Git path helper.
- `lib/vscode.d.ts/FETCH.js`: Script for fetching VS Code API type definitions.

## Built-In Dashboard App

- `server-app/index.html`: Built-in dashboard HTML shell.
- `server-app/app.js`: Dashboard rendering, charts, theme toggle, and grouped bar summaries.
- `server-app/styles.css`: Dashboard light/dark theme and layout styles.
- `server-app/assets/slashcoded.png`: Served dashboard logo asset.

## Scripts

- `scripts/esbuild.bundle.mjs`: Bundles the extension runtime.
- `scripts/package-vsix.mjs`: Builds the VSIX and renames it to `SlashCoded-VSCode-Extension.x.x.x.vsix`.
- `scripts/vsixFilename.mjs`: VSIX filename helper.
- `scripts/import-test-local-history.mjs`: Imports Desktop export fixtures into local dashboard history for screenshots.

## Images

- `images/slashcoded.png`: Marketplace and extension icon.
- `images/built-in-dashboard-screenshot.png`: Built-in dashboard screenshot used in Marketplace README.
- `images/slashcoded-desktop-overview.png`: SlashCoded Desktop overview screenshot used in documentation.
- `images/icon_*.png`: Development-only legacy/activity icon assets excluded from VSIX packaging.

## Tests

- `test/commandSurface.test.js`: Marketplace metadata, command surface, README, and packaging surface tests.
- `test/dashboardRendering.test.mjs`: Static dashboard rendering tests.
- `test/desktopEventMapper.test.js`: Desktop payload mapper tests.
- `test/hostTiming.test.js`: Timing helper tests.
- `test/httpClient.test.js`: HTTP helper tests.
- `test/importTestLocalHistory.test.mjs`: Screenshot/local-history import tests.
- `test/languageExtensions.test.js`: Language extension and alias mapping tests.
- `test/localHistoryStore.test.js`: Local history store tests.
- `test/localReportAggregator.test.js`: Local dashboard aggregation tests.
- `test/localStorageMode.test.js`: Storage mode tests.
- `test/openCodeTracker.test.js`: Reading/coding tracker tests.
- `test/staticWebServer.test.js`: Built-in static server tests.

## Development And Generated Outputs

- `.vscode/launch.json`: Extension Development Host launch profiles.
- `dist/extension.js`: Generated bundle from `npm run bundle` / `npm run package`.
- `dist/package.contributes.json`: Generated package contribution metadata.
- `SlashCoded-VSCode-Extension.x.x.x.vsix`: Generated local VSIX package.

## Superpowers Specs And Plans

- `docs/superpowers/specs/*.md`: Design specs created during feature planning.
- `docs/superpowers/plans/*.md`: Implementation plans and execution records.
