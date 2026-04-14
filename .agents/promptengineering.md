PROMTENGINEERING
---
### 2025-09-28
The extension should never report parallel activities within the same vscode window. So only one of watching/coding/chat/terminal should be reported for a timesegment. So we need to hold a state of whats being recorded atm. And the statusbar should display it. We should have icons for each type, and also an icon for AFK


- Coding, icon should be  </>
- watching, should an eye icon
- Chat, should be 


It seems like AIChat sessions dont detect when vscode no longer the focused window, or when user is AFK. Because if I leave my computer on sleep, with vscode session open, but not focused, the extension still uploads AI Chat activity.
Also, If i leave a vscode window open that has an AI Chat session open, it will continously log ai chat activity, even when window not focused, like if iwatch youtube, inflating the numbers 


Must fix the local debug environemnt to work, not really practical to have to build package and install it everytime we try implementing a new feature.

I think the local server is out of order, we use an own seperate server nowadays, the local server. 


--- 2025-10-14 ---
- VSCode extension. We should hardcode the upload endpoint into the extension, the user should not have to provide this information since they wont know it. 
- VSCode extension should store the uploadtoken as a secret if possible, the user should not have to provide the settings.json for each new project he/she works on.


- We should update our vscode extension description to match the new version. It also have screenshots of the forked version which is outdated.
- We should include a new built in server that matches the GUI of the webapp we have displaying the user statistics. How can we include the new webapp GUI into a local version? The server/webapp is in separate github repo. And has features that should not be included in the free version.
Guide me how to update the local server when running the extension locally.

### 2025-10-31

- AFK badge is not displaying in vscode when we are in idle state. 
- When we reach timeout in vscode extension. It seems like the uplaod stop working, and we queue up a lot of events that dont get sent. Or perhaps there is some other error, because now when i open this repo todo this fix, we got the same error here, eventhough i just open vscode in this repo




### 2025-11-07

I've identified CodingEvents sent from vscode extension that has value 0 in time, meaning the time will be upserted on 19700101, below is some clues from our server repo agent


Can you audit the code paths that populate the time field in our CodingEvent uploads? We’re seeing real table rows (e.g., PartitionKey=pakanatahu|19700101, RowKey=0-0070d42c769d2271fa98, Oct 3 2025) where version=4.0, long≈60000, but time=0, which the backend now rejects. It looks like the agent is defaulting to 0 whenever startMs/startedAt is missing—possibly when the agent reconstructs sessions (plans/docs views, chat snapshots, etc.) or when the timer resumes after a restart. Could you trace the event serialization logic (especially any ?? 0 fallback) to confirm whether there’s a code path that emits a zero timestamp so we can pin down and fix the ‘time leak’ before more sessions fall into the 1970 partition

Clue

Every misplaced row has version=4.0, a valid token, and type=open/code/chat, but its time field is literally 0 while long still holds ~60 s. The ingestion service used to accept that and derived PartitionKey = {githubId}|19700101, so aggregation later reported “Aggregated … 19700101”.
Nothing in the server rewrites time; it’s taken straight from the VS Code extension’s payload (CodingEvent.Time). That means the client emitted sessions with an uninitialized or zeroed start timestamp even though duration tracking worked.
The only way we can end up with time=0 is if the extension defaulted an undefined/NaN timestamp to 0 when serializing events. Typical suspects: (1) the agent resumes cached sessions without rehydrating startTime, (2) Date.now() is never called in a fallback path (e.g., plan/notes tracker), or (3) a recent change renamed that property and the mapper now falls back to 0.


Example CodingEvents in raw format
```
PartitionKey	RowKey	Timestamp	version	token	type	time	long	lang	file	proj	pcid	line	char	r1	r2	vcs_type	vcs_repo	vcs_branch	is_heuristic	prompt_chars	response_chars	seq	is_final
pakanatahu|19700101	0-4f21697477241ab326df	2025-11-04T11:09:43.3084105Z	4.0	3CEC025235A9E2CF20D942F81B723D20E6DEA463E8766D84728BCCD2627B8001	open	0	60000	markdown	content/slashcoded-landingpage.md		Davido-Laptop	8	0	1		git	C:/github/markdown	main					
pakanatahu|19700101	0-e98e23b42fcc4fb50b99	2025-11-04T10:48:04.1630963Z	4.0	3CEC025235A9E2CF20D942F81B723D20E6DEA463E8766D84728BCCD2627B8001	open	0	60000	typescript	chat-editing-snapshot-text-model		Davido-Laptop	2061	0	1		git	C:/github/Coding-Tracker-Server	main					
pakanatahu|19700101	0-7d9f7ba955e01e6779e6	2025-11-04T10:40:41.93264Z	4.0	3CEC025235A9E2CF20D942F81B723D20E6DEA463E8766D84728BCCD2627B8001	open	0	60000	typescript	frontend/src/app/features/dashboard/month-report/month-report.component.ts		Davido-Laptop	2056	0	1		git	C:/github/Coding-Tracker-Server	main					
pakanatahu|19700101	0-3b95dd5ce2a9a5e777e6	2025-11-04T10:35:08.0353098Z	4.0	3CEC025235A9E2CF20D942F81B723D20E6DEA463E8766D84728BCCD2627B8001	open	0	60000	markdown	docs/prompt.md		Davido-Laptop	993	0	1		git	C:/github/Coding-Tracker-Server	main					
pakanatahu|19700101	0-e62e32157852428d99d7	2025-11-04T10:33:29.1043821Z	4.0	3CEC025235A9E2CF20D942F81B723D20E6DEA463E8766D84728BCCD2627B8001	open	0	60000	markdown	docs/prompt.md		Davido-Laptop	991	0	1		git	C:/github/Coding-Tracker-Server	main					
pakanatahu|19700101	0-89a9709109c03737b161	2025-11-04T10:25:59.2293067Z	4.0	3CEC025235A9E2CF20D942F81B723D20E6DEA463E8766D84728BCCD2627B8001	open	0	60000	markdown	docs/prompt.md		Davido-Laptop	989	0	1		git	C:/github/Coding-Tracker-Server	main					
```



Actually, also when i am in terminal and i see the statusbadge swap to terminal, after a few seconds the status switches back to idle.


- However, for like half a second after switching into the codex chat window, the statussymbol actually have the chat icon, but it gets replaced by the idling symbol, and it stays with this symbol, making the user not feel like its time spent in the window is being counted.


- Okay this is interesting. So we still have isusses and i will explain

It seems like the outcome on what statussymbol is being displayed is heavily influenced by what tab is selected. Even when we have terminal focused. For example, if i have this markdown file active and i switch over to the terminal, the status symbol goes from coding/looking -> terminal, and it stays on terminal badge. 

But if i have codex chat window selected, then when i have terminal focused, the statusbadge will go to idling pretty quick. Also when i open the codex chat window, the status will go chat>idling.


I think we should 

Actually I think the issue was that only running npm run bundle, didnt properly update the install extension. Because now after i uninstalled, ran npm run package, and then installed the vsix, the chat symbol is being displayed.

But now the chat state is never overwritten by other states. So when i write code in other file, the statussymbol sticks to chat, even if the chat window/tab is not in focus. 

The chat symbol and chat uploading should only happend when the ai chat window/tab is in focus, if other state like writing/reading file or terminal states occur, these should overwrite the chat state and the chat session should be


- Okay thats better, now when we have chat window focused, it stays chat status. When we swap to other file and write some code, we swap to coding etc.

BUT when the selected tab is codex chat, and we swap to terminal, the statusbadge goes from chat > terminal > idling, and it stays on idling state

BUT when the selected tab is a code file, and i open terminal, it goes like coding > terminal, and it stays terminal ( AS IT SHOULD )


Idling state should occur when vscode is not the focused window. Like i have a browser up and that app is in focus.

As long as the vscode window is focused i dont think the idling state should occur.

Instead it should be the afk state that is active if the vscode window is focused but the user is not actively doing anything, not idle state. 

- Hmm, now when the selected tab is a chat window, and i open a terminal window and focus it, the state goes: chat > terminal > looking. And then it stays at looking.

- Also we can have multiple tabbed windows active within vscode. Where if the selected tab in window 1 is chat, and selcted tab in window 2 is .js file

If window 2 is focused and im writing in the .js file, i see there is uploads going on, but the symbol will stay to aichat.  it will not realease this state even though it should, because i am active in the other tabbed window. I want the extention to be aware that there could be multiple tabbed windows active at the same time, and the extension should only record time where the user actually is.


asdasda
asdasda


Still, when a selected tab in a tabbed window in vscode has the codex chat selected, and i open the terminal, the state gets set to idle. 

But when i have other file selected in the tab, and i open the terminal, the state sets to terminal and stay in that state(correct).



And when i am writing in a codefile in window 1, and the codex chat is selected tab in window 2, we still get the status badge of the aichat, and not coding, eventhough window 1 is current active window (eventhough chat in window 2 is selected) see pic for 

Still have the same issue that the terminal state is not being displayed as active when we go to terminal window from the chat window.


We got some lint problems
[{
	"resource": "/c:/github/vscode-coding-tracker/extension.js",
	"owner": "eslint3",
	"code": {
		"value": "@typescript-eslint/no-empty-function",
		"target": {
			"$mid": 1,
			"path": "/typescript-eslint/typescript-eslint/blob/v5.4.0/packages/eslint-plugin/docs/rules/no-empty-function.md",
			"scheme": "https",
			"authority": "github.com"
		}
	},
	"severity": 8,
	"message": "Unexpected empty arrow function.",
	"source": "eslint",
	"startLineNumber": 189,
	"startColumn": 38,
	"endLineNumber": 189,
	"endColumn": 40,
	"origin": "extHost1"
},{
	"resource": "/c:/github/vscode-coding-tracker/extension.js",
	"owner": "typescript",
	"code": "2554",
	"severity": 8,
	"message": "Expected 0 arguments, but got 1.",
	"source": "ts",
	"startLineNumber": 348,
	"startColumn": 34,
	"endLineNumber": 348,
	"endColumn": 51,
	"origin": "extHost1"
},{
	"resource": "/c:/github/vscode-coding-tracker/extension.js",
	"owner": "typescript",
	"code": "2554",
	"severity": 8,
	"message": "Expected 0 arguments, but got 2.",
	"source": "ts",
	"startLineNumber": 655,
	"startColumn": 34,
	"endLineNumber": 655,
	"endColumn": 55,
	"origin": "extHost1"
},{
	"resource": "/c:/github/vscode-coding-tracker/extension.js",
	"owner": "typescript",
	"code": "2554",
	"severity": 8,
	"message": "Expected 0 arguments, but got 2.",
	"source": "ts",
	"startLineNumber": 709,
	"startColumn": 38,
	"endLineNumber": 709,
	"endColumn": 60,
	"origin": "extHost1"
},{
	"resource": "/c:/github/vscode-coding-tracker/extension.js",
	"owner": "typescript",
	"code": "2554",
	"severity": 8,
	"message": "Expected 0 arguments, but got 2.",
	"source": "ts",
	"startLineNumber": 1079,
	"startColumn": 54,
	"endLineNumber": 1079,
	"endColumn": 78,
	"origin": "extHost1"
},{
	"resource": "/c:/github/vscode-coding-tracker/extension.js",
	"owner": "typescript",
	"code": "2554",
	"severity": 8,
	"message": "Expected 0 arguments, but got 2.",
	"source": "ts",
	"startLineNumber": 1136,
	"startColumn": 54,
	"endLineNumber": 1136,
	"endColumn": 76,
	"origin": "extHost1"
},{
	"resource": "/c:/github/vscode-coding-tracker/extension.js",
	"owner": "typescript",
	"code": "2554",
	"severity": 8,
	"message": "Expected 0 arguments, but got 2.",
	"source": "ts",
	"startLineNumber": 1348,
	"startColumn": 46,
	"endLineNumber": 1348,
	"endColumn": 72,
	"origin": "extHost1"
},{
	"resource": "/c:/github/vscode-coding-tracker/extension.js",
	"owner": "typescript",
	"code": "2554",
	"severity": 8,
	"message": "Expected 0 arguments, but got 1.",
	"source": "ts",
	"startLineNumber": 1405,
	"startColumn": 50,
	"endLineNumber": 1405,
	"endColumn": 62,
	"origin": "extHost1"
},{
	"resource": "/c:/github/vscode-coding-tracker/extension.js",
	"owner": "typescript",
	"code": "2554",
	"severity": 8,
	"message": "Expected 0 arguments, but got 1.",
	"source": "ts",
	"startLineNumber": 1420,
	"startColumn": 54,
	"endLineNumber": 1420,
	"endColumn": 69,
	"origin": "extHost1"
},{
	"resource": "/c:/github/vscode-coding-tracker/extension.js",
	"owner": "typescript",
	"code": "2554",
	"severity": 8,
	"message": "Expected 0 arguments, but got 1.",
	"source": "ts",
	"startLineNumber": 1424,
	"startColumn": 54,
	"endLineNumber": 1424,
	"endColumn": 68,
	"origin": "extHost1"
}]






# 2025-11-26

- ALright, so I am working on a windows desktop version of slashcoded. And we must update this extension to be able to connect and upload to the desktop api location. Here is full plan for reworking extensions. 

- Also the secondary sidebar for me is 100% AI Chat windows, codex and vscode copilot. But acitvity within this window is not prorperly recorded by the extension atml. 

- We should be able to choose the destination of the uploaded events. Like 




# 2025-12-17

- Most of the code in this project is AI generated without a human oversight. After looking through a bit of the code at current state, I find that we have extreme amount of code in the entrypoint file "Extension.js". I want you  





Great, the terminal issue looks to be fixed now, good job.

However, there is a couple of issues for the chat state

1. Chat state is only detected if the codex/copilot chat window is in the editor (cant detect 2nd side panel chatting)
2. If we have two editor windows open, one focused window with code and in which i am writing/reading, and one window with copilot/codex, the state will remain in chat, eventhough i am writing/reading and having the other window in focus.



# 2026-02-21

byta namn repo från vscode-coding-tracker => slashcoded-vscode-tracker
byta namn repo från 