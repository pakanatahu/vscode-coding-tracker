vibecoding — tracking AI-assisted code review activity in VS Code

vibecoding captures the time a user spends interacting with AI-generated code and suggested edits inside VS Code. A clear signal to track is the chat-editing-snapshot-text-model URI: when that URI is active the user is likely reviewing or applying AI-proposed changes.

## What vibecoding tracks

- The "review/apply edits" phase where an AI-generated diff is open.
- The user's interaction with AI suggestions (reviewing, editing, applying).

## How the chat-editing-snapshot-text-model helps

- What it is: VS Code exposes a special URI used by some AI/chat features to show an AI-proposed file version. The scheme often contains the string `chat-editing-snapshot-text-model`.
- Why it works: When the active editor has that URI, it's a strong indicator the user is focused on AI-proposed edits rather than their original file.
- How to use it: Monitor the active editor and categorize time as "reviewing AI edits" whenever the active editor's document URI uses this scheme.

## Additional signals to get a fuller picture

To track AI interactions beyond the snapshot view, combine the snapshot signal with one or more of the approaches below.

1) Track focus on the Chat view

- Use `vscode.window.onDidChangeActiveTextEditor` to detect editor changes. When the active editor is `undefined` or shows a non-file URI, the user may be interacting with a panel (chat, terminal, explorer).
- Note: VS Code currently lacks a direct `onDidChangeActiveView` for panels. As a pragmatic workaround, treat "no active editor" or a non-file active editor as a hint the user is in a panel.

2) Monitor VS Code commands

- Listen for relevant Copilot/chat commands and record events when they run. This captures explicit user actions like generating or sending messages.
- APIs: `vscode.commands.registerCommand` (for your own commands) or the command execution lifecycle if available.
- Example commands to watch (commonly reported):
	- `github.copilot.chat.generate`
	- `github.copilot.chat.generateDocs`
	- `github.copilot.chat.generateTests`
	- `github.copilot.chat.toggleChat` (open/close chat panel)

3) Use the Chat API (advanced)

- If available, the `vscode.chat` namespace and participant/message events (for example `ChatParticipant.onDidReceiveMessage`) provide direct hooks for chat interactions.
- This is more advanced, but it yields precise interaction events (messages sent/received) rather than inference from editor state.

## Recommendations

- Keep using the `chat-editing-snapshot-text-model` scheme as your primary vibecoding signal for review/apply edits.
- Combine that with command monitoring and panel-focus detection to capture active usage in the chat panel.
- If you need higher fidelity, consider integrating with the `vscode.chat` APIs where available.

This combined approach gives a simple, reliable vibecoding signal while providing options to expand coverage as VS Code APIs evolve.