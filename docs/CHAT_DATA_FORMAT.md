# Chat Activity Data Format

This document describes the data format for chat activity records uploaded by the VSCode Coding Tracker extension to the server. These records are used to track time spent in AI chat sessions (e.g., Copilot Chat, AIChat, CLINE, or any provider using the VS Code Chat API).

## Data Fields

The following fields are included in each chat activity data upload:

* **`version`** (string): The version of the data format. Currently `4.0`.
  * Example: `"4.0"`

* **`token`** (string): The upload token configured in the VSCode extension settings.
  * Example: `"55988b492c4cd09d82bd27a4aed36d05"`

* **`type`** (string): The type of activity. For chat records, this is always `chat`.
  * Example: `"chat"`

* **`time`** (number): The Unix timestamp (in milliseconds) when the chat session started.
  * Example: `1752163454641`

* **`long`** (number): The duration of the chat session in milliseconds.
  * Example: `59407`

* **`lang`** (string): The language or type of the activity. For chat records, this is always `chat`.
  * Example: `"chat"`

* **`file`** (string): The provider name of the chat session (e.g., `"github.copilot-chat"`, `"ms-vscode.azureai-chat"`).
  * Example: `"github.copilot-chat"`

* **`proj`** (string): The absolute path to the root of the VSCode workspace/project where the chat activity occurred. If no workspace is open, this will be `unknown`.
  * Example: `"C:/github/vscode-coding-tracker"`, `"unknown"`

* **`pcid`** (string): A unique identifier for the computer where the activity took place.
  * Example: `"unknown-win32"`

* **`vcs_type`** (string): The type of Version Control System detected for the project. If no VCS is detected, this will be `none`.
  * Example: `"git"`, `"none"`

* **`vcs_repo`** (string): The URL of the VCS repository. If no VCS is detected, this will be `none`.
  * Example: `"https://github.com/hangxingliu/vscode-coding-tracker"`, `"none"`

* **`vcs_branch`** (string): The active branch of the VCS repository. If no VCS is detected, this will be `none`.
  * Example: `"main"`, `"none"`

* **`line`** (number): Not applicable for chat activity. Always `0`.
  * Example: `0`

* **`char`** (number): Not applicable for chat activity. Always `0`.
  * Example: `0`

* **`r1`** (string): The session ID of the chat session.
  * Example: `"123456"`

* **`r2`** (string): Comma-separated total character counts for prompts and responses: `"promptChars,responseChars"`.
  * Example: `"120,350"`
