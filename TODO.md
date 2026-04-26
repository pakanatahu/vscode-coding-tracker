# Contributor Issue List

This file lists work we actively want contributors to pick up. Current focus areas are localization and AI chat tracking reliability.

## Localize SlashCoded For VS Code

SlashCoded currently ships English-only user-facing text. We want contributors to add proper VS Code extension localization infrastructure and translate the extension into multiple languages.

References:

- VS Code `vscode.l10n` API: https://code.visualstudio.com/api/references/vscode-api#l10n
- VS Code display languages and locale IDs: https://code.visualstudio.com/docs/configure/locales

### Goal

Make all user-visible extension text localizable, then add high-quality translations for common VS Code locales.

Start with these locales:

- `de`: German
- `es`: Spanish
- `fr`: French
- `ja`: Japanese
- `ko`: Korean
- `pt-br`: Portuguese (Brazil)
- `zh-cn`: Chinese (Simplified)

Additional locales are welcome after the localization pipeline is in place.

### Scope

Localize text that appears in VS Code or the built-in dashboard:

- Extension display name and description where VS Code supports manifest localization.
- Command titles such as `SlashCoded: Show Local Report`.
- Configuration titles and descriptions under `slashCoded.*`.
- Information, warning, and error messages shown through VS Code APIs.
- Quick Pick labels, placeholders, and details.
- Status bar text and tooltips.
- Output-channel messages that users may read.
- Built-in dashboard labels, empty states, errors, buttons, headings, and chart labels.

Do not translate:

- Event payload field names.
- API routes.
- Configuration keys such as `slashCoded.storageMode`.
- Command IDs such as `slashCoded.showLocalReport`.
- Log-only debug messages that are meant for maintainers, unless they are also surfaced to users.
- The product name `SlashCoded`.

### Suggested Implementation

1. Add manifest localization with `package.nls.json`.
2. Replace localizable strings in `package.json` with `%key%` references.
3. Add locale files such as `package.nls.de.json`, `package.nls.es.json`, and the other target locales.
4. Remove or adjust the `package.nls*.json` exclusion in `.vscodeignore` so manifest translations ship in the VSIX.
5. Add runtime localization using `vscode.l10n.t(...)` for extension code.
6. Add a small helper module if it keeps repeated localization patterns readable.
7. Add localization bundle generation if needed for the bundled runtime in `dist/extension.js`.
8. Localize dashboard strings in `server-app/` using a simple locale dictionary loaded by the dashboard.
9. Add tests that verify key manifest strings are localized and that untranslated `%key%` placeholders do not ship.
10. Update `README.md`, `CONTRIBUTING.md`, and `docs/FILE-LIST.md` if the localization workflow adds new files or commands.

### Translation Quality

- Keep technical terms consistent with VS Code and common developer-tool wording in each language.
- Preserve placeholders and variables exactly.
- Keep status bar and command labels short.
- Prefer clear, natural UI copy over literal word-for-word translation.
- Do not machine-translate a locale unless a fluent reviewer checks it before release.

### Acceptance Criteria

A localization contribution should include:

- English source strings.
- At least one complete translated locale.
- Tests or checks for missing localization keys.
- Updated packaging rules so localization files are included in the VSIX.
- A short note in the pull request or handoff explaining which areas are localized and which are still English-only.

### Good First Localization Issues

- [ ] Inventory all user-visible English strings in `package.json`, `lib/`, and `server-app/`.
- [ ] Add `package.nls.json` and localize command titles plus setting descriptions.
- [ ] Add the first translated manifest locale, preferably `de`, `es`, or `fr`.
- [ ] Add runtime localization for messages in `lib/extensionMain.js`.
- [ ] Add runtime localization for status bar text in `lib/StatusBarManager.js`.
- [ ] Add runtime localization for local server messages in `lib/LocalServer.js`.
- [ ] Add dashboard localization support in `server-app/`.
- [ ] Add a test that fails if `package.json` contains raw English in localizable contribution fields.
- [ ] Add a test that fails if `.vscodeignore` excludes localization files needed by the VSIX.
- [ ] Document the localization workflow for future translators.

## Fix AI Chat Tracking In The Secondary Side Bar

AI chat activity is currently tracked reliably when the chat surface is opened as an editor tab. It is not tracked reliably when AI chat lives in VS Code's Secondary Side Bar. We want contributors to improve this so Secondary Side Bar chat usage is recorded as `AI chat` activity instead of being missed or misclassified as reading, coding, idle, or terminal time.

### Current Behavior

- Chat editor tabs are detected by `lib/tracking/chatTracker.js`.
- Secondary Side Bar chat views are not detected consistently.
- The dashboard may undercount AI chat time when users keep GitHub Copilot Chat, Codex, Claude, or another assistant view in the Secondary Side Bar.

### Expected Behavior

When a supported AI chat view has focus in the Primary Side Bar, Secondary Side Bar, panel, or editor area:

- The status bar should show chat mode.
- Open/code tracking should pause while chat is focused.
- Terminal tracking should stop or pause when focus moves from terminal to chat.
- A `chat` activity event should be uploaded or stored locally with the expected duration.
- Focus loss, AFK, terminal focus, and editor focus should end or pause the chat segment cleanly.

### Suggested Investigation

Start with these files:

- `lib/tracking/chatTracker.js`: chat heuristics, context-key checks, tab detection, and chat segment flushing.
- `lib/tracking/globalActivityHooks.js`: command-driven transitions into chat mode.
- `lib/tracking/terminalTracker.js`: terminal-to-chat focus handoff.
- `lib/core/modeController.js`: exclusive mode selection and status bar mode.
- `test/`: add focused tests around the new detection behavior.

Useful things to investigate:

- Which VS Code context keys change when AI chat is focused in the Secondary Side Bar.
- Whether `vscode.window.tabGroups` can see Secondary Side Bar chat views. It likely cannot, because those views are not editor tabs.
- Whether commands such as Copilot Chat, Codex, Claude, or generic `workbench.view.*chat*` commands can establish a short chat focus hold until a stronger signal is available.
- Whether `vscode.getContextKeyValue` exposes side-bar focus keys for built-in chat and common assistant extensions.
- Whether focus detection should treat visible chat views differently from focused chat inputs.

### Acceptance Criteria

A fix should include:

- A reproducible manual test plan for opening AI chat in the Secondary Side Bar and confirming tracked `AI chat` time.
- Tests for the new detection logic where it can be unit-tested without a real VS Code window.
- No regression for editor-tab chat tracking.
- No regression for terminal tracking when the integrated terminal is focused.
- Updated README or contributor notes if the tracking behavior or limitations change.

### Good First AI Chat Issues

- [ ] Inventory context keys and commands emitted when GitHub Copilot Chat is focused in the Secondary Side Bar.
- [ ] Add debug logging, behind the existing debug mode, that helps compare editor-tab chat vs Secondary Side Bar chat detection.
- [ ] Extract Secondary Side Bar chat detection into a small testable helper.
- [ ] Add tests for chat focus signals that are not editor tabs.
- [ ] Verify that terminal tracking stops when focus moves from terminal to Secondary Side Bar chat.
- [ ] Document any AI chat providers that cannot be detected with public VS Code APIs.
