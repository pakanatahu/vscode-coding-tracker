# Terminal Activity Data Format

This document describes the data format for terminal activity records uploaded by the VSCode Coding Tracker extension to the server. These records are used to track time spent in the integrated terminal.

## Data Fields

The following fields are included in each terminal activity data upload:

*   **`version`** (string): The version of the data format. Currently `4.0`.
    *   Example: `"4.0"`

*   **`token`** (string): The upload token configured in the VSCode extension settings.
    *   Example: `"55988b492c4cd09d82bd27a4aed36d05"`

*   **`type`** (string): The type of activity. For terminal records, this is always `terminal`.
    *   Example: `"terminal"`

*   **`time`** (number): The Unix timestamp (in milliseconds) when the terminal activity started.
    *   Example: `1752163454641`

*   **`long`** (number): The duration of the terminal activity in milliseconds.
    *   Example: `59407`

*   **`lang`** (string): The language or type of the activity. For terminal records, this is always `terminal`.
    *   Example: `"terminal"`

*   **`file`** (string): The name of the terminal.
    *   Example: `"cmd"`, `"bash"`, `"zsh"`

*   **`proj`** (string): The absolute path to the root of the VSCode workspace/project where the terminal activity occurred. If no workspace is open, this will be `unknown`.
    *   Example: `"C:/github/vscode-coding-tracker"`, `"unknown"`

*   **`pcid`** (string): A unique identifier for the computer where the activity took place.
    *   Example: `"unknown-win32"`

*   **`vcs_type`** (string): The type of Version Control System detected for the project. If no VCS is detected, this will be `none`.
    *   Example: `"git"`, `"none"`

*   **`vcs_repo`** (string): The URL of the VCS repository. If no VCS is detected, this will be `none`.
    *   Example: `"https://github.com/hangxingliu/vscode-coding-tracker"`, `"none"`

*   **`vcs_branch`** (string): The active branch of the VCS repository. If no VCS is detected, this will be `none`.
    *   Example: `"main"`, `"none"`

*   **`line`** (number): Not applicable for terminal activity. Always `0`.
    *   Example: `0`

*   **`char`** (number): Not applicable for terminal activity. Always `0`.
    *   Example: `0`

*   **`r1`** (string): Reserved field. Currently `1`.
    *   Example: `"1"`

*   **`r2`** (string): Reserved field. Currently empty.
    *   Example: `""`
