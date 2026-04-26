# CHANGELOG

## 0.12.0 (2026/04/26)

- First public release of SlashCoded for VS Code on the Visual Studio Marketplace.
- Added Marketplace-ready README screenshots for the built-in dashboard and SlashCoded Desktop.
- Updated README image paths and logo sizing so GitHub and Marketplace previews render correctly.
- Added contributor documentation and a focused contributor issue list for localization and Secondary Side Bar AI chat tracking improvements.
- Removed the generated VSIX from Git tracking; future VSIX packages are local build artifacts and remain ignored by `.gitignore`.
- Fixed the Marketplace publisher ID to `DavidLundholm` so the extension can be published under the correct publisher account.
- Tightened Marketplace-facing metadata and README wording to describe Desktop integration without promotional download language.
- Added Marketplace search terms for "coding tracker" so SlashCoded can be discovered from VS Code extension search.

## 0.11.0

- Renamed the public settings and command IDs from `codingTracker.*` to `slashCoded.*` for the first public release.
- Removed cloud-era settings for upload tokens, server URLs, proxy overrides, Azure function keys, manual origins, computer IDs, AFK timeout minutes, and legacy thinking-time tuning.
- Added `slashCoded.storageMode` with `auto` and `standalone` modes.
- Removed legacy `pcid` from desktop event payload mapping.
- Updated Marketplace metadata to use the public SlashCoded identity and VS Code extension ID.
- Desktop token and trusted-source registration now identify as `lundholm.slashcoded-vscode-extension`, so the local Desktop allowlist can validate the renamed extension.
- Renamed the output channel to `SlashCoded`.
- Removed legacy cloud/auth/proxy/i18n runtime files and the old external tracker server fallback.
- Replaced `axios` and `uuid` runtime usage with local Node-based helpers; packaged runtime dependencies now only include Chart.js.
- Tightened VSIX packaging so development files, tests, docs, old VSIX artifacts, and source-only files are excluded.
- Added `npm run lint` and cleaned the current JavaScript and declaration-file lint/type diagnostics.
- Rebuilt `SlashCoded-VSCode-Extension.0.11.0.vsix`; the release package is now about 1.63 MB.

### 0.10.5 (2026/04/20)

1. Local fallback history
	- The extension now persists a separate local raw activity history in extension storage, even when Slashcoded Desktop is not installed or detected.
	- Local reporting no longer depends on the transport queue surviving until upload.
2. Built-in fallback report
	- `SlashCoded: Show Local Report` opens the built-in local summary dashboard generated from local event history.
	- The fallback report groups totals by activity, repository, branch, and file extension.
	- The fallback report now uses a compact desktop-style dashboard layout instead of a plain stacked summary page.
	- The `Last 24 hours` card now follows the shared Slashcoded Chart.js area-chart treatment more closely, including the footer breakdown toolbar.
3. UX
	- The built-in local summary includes a direct Slashcoded Desktop download CTA for users who want richer analytics.
4. Verification
	- Added focused `node:test` coverage for local history persistence, report aggregation, and the fallback report server/UI shell.
5. Desktop handoff behavior
	- When Slashcoded Desktop is not detected, live events are now stored locally for the fallback dashboard instead of being added to the upload queue automatically.
	- Added `SlashCoded: Import Local History into Desktop` so users can explicitly move local-only history into the queue when they want Slashcoded Desktop to import it.

### 0.10.4 (2026/04/14)

1. Shared host timing integration
	- VS Code now fetches host timing from `/api/host/handshake` and `/api/host/tracking-config` and refreshes it every 5 minutes.
	- Startup fallback uses the shared desktop defaults of 15-second segments and a 5-minute idle threshold until the first successful host fetch.
2. Segment alignment across activity families
	- Editor, integrated terminal, and AI chat tracking now use the same shared segment duration and idle cutoff.
	- Tracking closes segments on shared boundaries instead of emitting long catch-up slices after inactivity, focus loss, or sleep.
3. Upload payload metadata
	- Desktop upload payloads now include `trackerConfigVersion`, `segmentDurationSeconds`, `idleThresholdSeconds`, `segment_start_ts`, and `segment_end_ts`.
	- Closed segments reuse stable `event_id` values derived from the final segment identity so retries do not create new IDs.
4. Verification
	- Added focused `node:test` coverage for host timing config sanitization, refresh policy, and desktop event payload mapping.

### 0.9.10 (2025/11/03)

1. Manual flush for stuck queues
	- New command: `CodingTracker: Flush Upload Queue` (was debug-only) and clickable status bar to flush immediately.
	- If an in-flight upload exceeds the timeout (1.5x threshold, min 20s), manual flush will safely reset and restart the uploader cycle.
2. UX
	- Status bar tooltip now shows a tip: click to flush queue; makes recovery obvious when the queue grows (e.g., “SlashCoded < 39”).
3. Reliability
	- Uploader tracks last start/progress timestamps to detect and recover from hung requests.
4. Chat tracking
	- Detects the new VS Code 1.106 chat editor tabs (AI chat tabbed window) by inspecting tab inputs/schemes so time spent there is recorded.
	- Heuristic chat mode and terminal suppression now work when the chat session lives in an editor tab rather than the old sidebar panel.

### 0.9.7 (2025/09/26)

1. **AFK (Away From Keyboard) Detection**
	- Added 15-minute idle timeout to prevent inflated activity tracking when user is away
	- Global activity tracking across all VS Code events (typing, clicking, terminal usage, chat interaction)
	- Automatic finalization of all active tracking slices when AFK state is detected
	- Status bar indicator shows "CodingTracker(AFK)" when user is idle
	- Activity resumes normal tracking when user returns and interacts with VS Code

2. **Enhanced Exclusive Mode Integration**
	- Chat sessions (both native and heuristic) now properly enter/exit exclusive mode
	- AFK detection works across all tracking modes (open/code/terminal/chat)
	- Prevents parallel slice inflation during long idle periods with focused chat windows

3. **Improved User Experience**  
	- No more inflated time tracking from accidentally leaving VS Code open overnight
	- Clear visual indication when tracking is suspended due to inactivity
	- Automatic recovery when user returns to active coding/interaction

### 0.9.6 (2025/09/22)

1. **Chat Slice Deduplication**
	- Added sequence numbers (`seq=0`, `seq=1`, etc.) to chat event markers in r2 field
	- Added final markers (`final`) to distinguish session completion vs. ongoing updates  
	- Improved slice scheduling to prevent premature periodic emissions via `nextSliceTs`
	- Backend can now properly aggregate incremental chat duration updates

2. **Enhanced Chat Session Management**
	- Chat slices now represent progressive snapshots of session duration rather than duplicate records
	- Better handling of session boundaries and idle timeouts
	- Clearer semantics for backend processing of chat activity data

### 0.9.2 (2025/09/19)

1. Watchdog & timeout
	- Added per-request timeout (configurable via `codingTracker.uploadTimeoutMs`, default 15000ms) and a watchdog that aborts and retries stalled uploads.
2. Reliability
	- Prevents queue from staying in perpetual "Uploading..." when backend returns 202 w/ empty body or when callback never fires.
3. Header / proxy hygiene
	- Fixed conditional braces so Origin / function key headers are always injected correctly before optional proxy assignment.
4. Safer payload handling
	- Handles empty bodies for 202 / 204 gracefully; avoids assigning to read-only document properties.
5. Config additions
	- New setting: `codingTracker.uploadTimeoutMs` (number) to fine‑tune network resilience.
	- New setting: `codingTracker.chatSliceIntervalSeconds` to enable periodic in-progress chat activity slices and immediate start visibility.


### 0.9.4 (2025/09/20)

1. Simplification
	- Removed user-facing configuration for chat slice / heuristic parameters; values are now hardcoded for consistency across installs.
2. Hardcoded values
	- Chat periodic slice interval: 120s.
	- Heuristic mode: always enabled when native chat session APIs are absent.
	- Heuristic idle timeout: 60000ms.
	- Heuristic schemes: ["vscode-chat"].
	- Heuristic language IDs: ["copilot-chat", "chat", "markdown"].
3. Rationale
	- Reduces surface area & potential misconfiguration while feature stabilizes. Future releases may re‑introduce tunable advanced settings behind an expert flag.

### 0.9.5 (2025/09/20)

1. Data model parity
	- Added numeric `typeCode` field to each upload object for backend normalization resiliency (open=1, code=2, terminal=3, chat=4). Unknown/default remains 0.
2. Backward compatibility
	- Existing textual `type` field retained; servers can gradually migrate to numeric codes without breaking older analytics.
3. Generators updated
	- `generateOpen`, `generateCode`, `generateTerminal`, `generateChat` now assign both `type` and `typeCode`.
4. Future-proofing
	- Enables server to disambiguate types even if textual transformations occur (e.g., heuristic suffixes in `r2`).

### 0.9.6 (2025/09/22)

1. Heuristic chat slice sequencing
	- Added `seq=n` markers to `r2` for each chat slice (start slice `seq=0`, periodic increments `seq>0`, final slice also includes `final`).
2. Duplicate prevention
	- Introduced `nextSliceTs` scheduling to avoid early periodic slice immediately after start; periodic slices only fire when the full interval elapses.
3. Session termination markers
	- Idle timeout or explicit end now emits a final slice with both `seq` and `final` markers.
4. Backend guidance
	- Consumers can treat `(pcid, typeCode=4, r1=sessionId)` with same start `time` as a single logical session; use the highest `seq` (or `final`) for total duration.
5. Native path parity
	- Native chat session path also emits `seq` markers (start slice `seq=0`, periodic increments, final with `final`).
6. Reliability
	- Prevents multiple identical-duration records that previously occurred due to timer alignment right after session start.

### 0.9.3 (2025/09/19)

1. Chat session resilience
	- Added heuristic fallback chat tracking when native `vscode.chat` session lifecycle APIs are unavailable (older / variant VS Code builds or disabled proposed features).
	- Heuristic mode scans visible editors for chat-like URI schemes (`vscode-chat`) or language IDs (configurable) and synthesizes session start / periodic slices / finalization.
2. Configuration
	- New settings:
		- `codingTracker.enableChatHeuristics` (default true) — master switch for fallback mode.
		- `codingTracker.chatHeuristicIdleMs` (default 60000) — idle timeout to close a synthetic session after last visibility.
		- `codingTracker.chatHeuristicSchemes` — list of URI schemes considered chat.
		- `codingTracker.chatHeuristicLanguages` — list of language IDs considered chat.
3. Data flagging
	- Heuristic generated chat slices are tagged with `r2=heuristic` (appended if `r2` already exists) so the backend / analytics can distinguish them from native session events.
4. Preservation of native behavior
	- If native chat session events are present they are used exclusively; heuristics remain dormant to avoid duplicate tracking.
5. Periodic slices integration
	- Heuristic sessions respect `codingTracker.chatSliceIntervalSeconds` for interim duration updates.

### 0.9.1 (2025/09/19)

1. Uploader resiliency & compatibility improvements
	- Accept HTTP 202 (Accepted) and 204 (No Content) as successful upload outcomes.
	- Hybrid transport: JSON for `api/*` endpoints, legacy form-encoding fallback for others.
2. Dynamic endpoint probing
	- Continues to rotate through candidate paths when 404s occur; logs encoding type on each switch.
3. CORS / Auth flexibility
	- Adds automatic `Origin: vscode-extension://<publisher>.<name>` header.
	- New optional settings: `codingTracker.functionKey` (Azure Function key) and `codingTracker.overrideOrigin` (custom origin override). Safe to leave blank if not needed.
4. Diagnostics
	- Added command `CodingTracker: Flush Upload Queue (Debug)` (`codingTracker.flushUploads`) to force immediate upload of pending events.
5. Status handling
	- Normalizes empty string optional fields to `null` before send; adds `date` (YYYY-MM-DD) field.
6. Minor: improved debug logging for uploader configuration changes & endpoint fallback.

### 0.9.0 (2025/09/19)

Major feature & reliability update focused on richer context tracking and new data sources.

1. Terminal focus segmentation
	- Window blur now finalizes current terminal session to prevent runaway time accumulation.
	- Resumes a fresh timing slice when the window regains focus.
2. Improved terminal VCS resolution
	- More reliable multi-root / fallback logic for repo & branch metadata.
3. AI Chat (Copilot & other chat providers) tracking (duration only)
	- Records total time a chat session stays open; includes VCS repo/branch context.
	- Simplified metrics (prompt/response character counts removed for privacy & simplicity).
4. Server URL auto-migration
	- Legacy hosts automatically migrate to new ingest endpoint `https://codingtracker-ingest.azurewebsites.net`.
5. GitHub auth scaffolding command
	- Added `codingTracker.githubAuth` command to store a refresh token & exchange for upload token.
6. New configuration flags
	- `codingTracker.shouldTrackTerminal` & `codingTracker.shouldTrackAIChat` to toggle new tracking sources.
7. Workspace context path resolver
	- Unified logic ensures consistent `proj` and VCS metadata derivation for all record types.
8. Security & secrets handling
	- Refresh token stored securely via VS Code secrets API.
9. Internal refactors
	- Centralized upload object generation for chat & terminal with explicit placeholders for command & cwd fields.
10. Documentation & packaging
	 - Added packaging script (`npm run package`) using `vsce`.

Note: Version 0.8.3 (internal) was superseded by this consolidated 0.9.0 release; 0.8.2 remains the last publicly documented pre-0.9.x version.

### 0.8.2 (2025/08/02)

1. Fixed terminal tracking functionality
   - Resolved an issue where terminal activity tracking would fail due to missing command parameter
   - Now properly tracks terminal window focus time without requiring command information

### 0.6.0 (2018/03/24)

1. Upgrade server program (report page) to 0.6.0
	- export/download report as CSV
	- merge report from different projects
	- fix some bug on report page
	- more compatible with old browsers and mobile browsers
2. Optimize for some vscode internal documents. (*Default settings, markdown preview, interactive playground*)
3. Add Español translations into extension.

### 0.5.0

0. Support multi-root workspace.
1. Add VCS(Git) repository and branch information tracking
2. Add document line counts tracking
3. Upgrade uploading protocol version to 4.0
4. Optimize codes 

### 0.4.2

0. Add configuration `showStatus` to controlling visibility of status bar information

### 0.4.1

0. Add Russian translations. (Include report page) (Thank [Dolgishev Viktor (@vdolgishev)][vdolgishev])
1. Update server program to 0.4.1 (**Fixed fatal bug**)

### 0.4.0

0. Fixed the bug "could not upload error" caused by switching VSCode windows
1. New report page (support i18n, detailed report, share ...) (vscode-coding-tracker-server => 0.4.0)
2. Add configuration "moreThinkingTime". Adjust it to make report more accurate for your coding habits

### 0.3.2

0. more precise in VSCode 1.9.0 (I am crashing because too many things are changed since VSCode 1.9.0)

### 0.3.1

0. **fixed the local server severe bug.**
**(because vscode install extension would not resolve dependencies and I forgot a dependency)**
1. fixed the wrong coding time record because some feature since VSCode 1.9.0 
2. fixed could not upload tracking data in non-project context since VSCode 1.9.0
3. remove some redundant git merge files 

### 0.3.0

0. **Added local server mode. So you could use this extension easily.**
1. Added i18n support(supported language: en, zh-cn, zh-tw)
2. Modified status bar module to show more information(local server sign, tooltip and changed icon)
3. Added Output channel module to output local server log

### 0.2.2

0. Fixed `npm start` occurs error in Windows.

### 0.2.0

0. Be sure to upgrade again, because accuracy of tracker has be improve
1. Separated the server side codes to other repository(but add this server side module to npm package dependencies.
So you can find server side codes under node_modules)
2. Ignored tracking invalid document times
3. Added listening onDidChangeTextEditorSelection event to improve accuracy
4. Tidied extension.js codes

### 0.1.5 

0. Be sure to upgrade, reason be following 
1. Fixed two severe bugs. So you will get your right coding and watching time

### 0.1.4

0. Add computer Id to tracking data(You can specify your Id by set up vscode config
 `codingTracker.computerId` )
1. Fixed some spelling mistake in the code and change some comment from Chinese to English
2. Change tracking data time format from datetime format string to timestamp
3. Please upgrade your server program to at least 1.3.0 to support receive tracking data 
 and storage data in version 3.0  

### 0.1.3

0. Modified the log module, removed export log object to global variable "Log" (because sometimes it lead to a vscode exception)

### 0.1.2

0. Fixed a bug around node module require in Linux must care about character case.

### 0.1.1

0. Change folder and project structure to adapt npm and vscode extension

### 0.1.0

0. Add an icon to extension
1. **Fixed the severe bug** (could not to use this extension because dependencies list is incomplete)
2. Optimized tracking data upload.
3. Support upload configurations take effect after change configurations in settings.json without restart VSCode
4. Upgrade upload object structure version and storage version to 2.0,   
remove unnecessary field and change a time(date) field format to avoid time difference between server and client.
5. Optimized the server script performance and structure.
