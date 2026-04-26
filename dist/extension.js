"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// lib/VSCodeHelper.js
var require_VSCodeHelper = __commonJS({
  "lib/VSCodeHelper.js"(exports2, module2) {
    "use strict";
    var vscode = require("vscode");
    var showingErrorMsg = 0;
    var statusBarItem = null;
    module2.exports = {
      getConfig,
      cloneTextDocument,
      cloneUri,
      dumpDocument,
      dumpEditor,
      showSingleErrorMsg,
      setStatusBar,
      getWhichProjectDocumentBelongsTo
    };
    function getConfig(name = "") {
      return vscode.workspace.getConfiguration(name);
    }
    function cloneTextDocument(doc) {
      if (!doc)
        return null;
      return Object.assign({}, doc, { uri: cloneUri(doc.uri) });
    }
    function cloneUri(uri) {
      if (!uri) return null;
      return vscode.Uri.parse(uri.toString());
    }
    function dumpDocument(doc) {
      if (!doc) return "null";
      let str = vscode.workspace.asRelativePath(doc.fileName) + ` (${doc.languageId})(ver:${doc.version})(scheme: ${doc.uri ? doc.uri.scheme : ""}): `;
      if (doc.isClosed) str += " Closed";
      if (doc.isDirty) str += " Dirty";
      if (doc.isUntitled) str += " Untitled";
      return str;
    }
    function dumpEditor(editor) {
      if (!editor) return "null";
      return `Editor: (col:${editor.viewColumn}) ${dumpDocument(editor.document)}`;
    }
    function showSingleErrorMsg(error) {
      if (!showingErrorMsg)
        vscode.window.showErrorMessage(error).then(() => process.nextTick(() => showingErrorMsg = 0));
      showingErrorMsg = 1;
    }
    function setStatusBar(text, tooltip) {
      if (!statusBarItem)
        statusBarItem = vscode.window.createStatusBarItem();
      statusBarItem.text = text || "";
      statusBarItem.tooltip = tooltip || "";
      if (text)
        return statusBarItem.show();
      statusBarItem.dispose();
      statusBarItem = null;
    }
    function getWhichProjectDocumentBelongsTo(document, defaultProjectPath) {
      if (!vscode.workspace.getWorkspaceFolder)
        return defaultProjectPath;
      if (!document || !document.uri)
        return defaultProjectPath;
      const { uri } = document;
      if (uri.scheme != "file")
        return defaultProjectPath;
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      if (!folder)
        return defaultProjectPath;
      return folder.uri.fsPath;
    }
  }
});

// lib/core/httpClient.js
var require_httpClient = __commonJS({
  "lib/core/httpClient.js"(exports2, module2) {
    "use strict";
    var http = require("http");
    var https = require("https");
    function request(options) {
      return new Promise((resolve, reject) => {
        const target = withParams(options.url, options.params);
        const url = new URL(target);
        const body = normalizeBody(options.data);
        const headers = normalizeHeaders(options.headers);
        if (body && isJsonBody(options.data) && !hasHeader(headers, "content-type")) {
          headers["Content-Type"] = "application/json; charset=utf-8";
        }
        if (body && !hasHeader(headers, "content-length")) headers["Content-Length"] = String(Buffer.byteLength(body));
        const client = url.protocol === "https:" ? https : http;
        const req = client.request(url, {
          method: options.method || (body ? "POST" : "GET"),
          headers
        }, (res) => {
          const chunks = [];
          res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          res.on("end", () => {
            const raw = Buffer.concat(chunks).toString("utf8");
            const response = {
              status: res.statusCode || 0,
              statusText: res.statusMessage || "",
              data: parseBody(raw, String(res.headers["content-type"] || "")),
              headers: res.headers
            };
            const ok = options.validateStatus ? options.validateStatus(response.status) : response.status >= 200 && response.status < 300;
            if (ok) {
              resolve(response);
              return;
            }
            const error = Object.assign(new Error(`Request failed with status ${response.status}`), { response });
            reject(error);
          });
        });
        req.on("error", reject);
        if (options.timeout && options.timeout > 0) {
          req.setTimeout(options.timeout, () => req.destroy(new Error(`Request timed out after ${options.timeout}ms`)));
        }
        if (body) req.write(body);
        req.end();
      });
    }
    function withParams(url, params) {
      if (!params) return url;
      const target = new URL(url);
      for (const [key, value] of Object.entries(params)) {
        if (typeof value !== "undefined") target.searchParams.set(key, String(value));
      }
      return target.toString();
    }
    function normalizeHeaders(headers) {
      const normalized = {};
      for (const [key, value] of Object.entries(headers || {})) normalized[key] = String(value);
      return normalized;
    }
    function hasHeader(headers, name) {
      const lower = name.toLowerCase();
      return Object.keys(headers).some((key) => key.toLowerCase() === lower);
    }
    function normalizeBody(data) {
      if (typeof data === "undefined" || data === null) return "";
      if (Buffer.isBuffer(data)) return data;
      if (typeof data === "string") return data;
      return JSON.stringify(data);
    }
    function isJsonBody(data) {
      if (typeof data === "undefined" || data === null) return false;
      if (Buffer.isBuffer(data)) return false;
      if (typeof data === "string") return false;
      return true;
    }
    function parseBody(raw, contentType) {
      if (!raw) return null;
      if (contentType.includes("application/json") || /^[\[{]/.test(raw.trim())) {
        try {
          return JSON.parse(raw);
        } catch (_) {
        }
      }
      return raw;
    }
    request.get = function get(url, options = {}) {
      return request({ ...options, url, method: "GET" });
    };
    request.post = function post(url, data, options = {}) {
      return request({ ...options, url, data, method: "POST" });
    };
    module2.exports = request;
  }
});

// lib/Constants.js
var require_Constants = __commonJS({
  "lib/Constants.js"(exports2, module2) {
    var isDebugMode = process.env.SLASHCODED_DEBUG === "1";
    module2.exports = {
      isDebugMode,
      prefix: "slashcoded",
      outputChannelName: "SlashCoded"
    };
  }
});

// lib/StatusBarManager.js
var require_StatusBarManager = __commonJS({
  "lib/StatusBarManager.js"(exports2, module2) {
    "use strict";
    var vscode = require("vscode");
    var { isDebugMode } = require_Constants();
    var MAIN_TITLE = "SlashCoded";
    var DEBUG_TITLE = "SlashCoded(Debug)";
    var statusBarItem = null;
    var uploadQueue = [];
    var isLocalServerOn = false;
    var mainStatus = "";
    var currentMode = null;
    var syncOnline = true;
    var syncLabel = null;
    function init(enable = true) {
      if (statusBarItem && !enable) {
        statusBarItem.dispose();
        statusBarItem = null;
      }
      if (!statusBarItem && enable) {
        statusBarItem = vscode.window.createStatusBarItem();
        try {
          statusBarItem.command = "slashCoded.showSyncStatus";
        } catch (_) {
        }
      }
      syncOnline = true;
      syncLabel = null;
      mainStatus = "";
      _updateText();
      _applyStyle();
      _updateTooltip();
    }
    var bindUploadQueueArray = (queue) => {
      uploadQueue = Array.isArray(queue) ? queue : [];
      _update();
    };
    var setStatus2Uploading = () => {
      mainStatus = "Uploading...";
      _update();
    };
    var setStatus2Uploaded = (desc) => {
      mainStatus = desc || "Uploaded";
      _update();
    };
    var setStatus2GotNew1 = () => {
      mainStatus = "+1";
      _update();
    };
    var setStatus2Nothing = () => {
      mainStatus = null;
      _update();
    };
    var setSyncState = (online, label) => {
      syncOnline = !!online;
      syncLabel = label || null;
      _update();
    };
    var setLocalServerOn = () => {
      isLocalServerOn = true;
      _update();
    };
    var setLocalServerOff = () => {
      isLocalServerOn = false;
      _update();
    };
    var setAFKOn = () => {
      currentMode = "afk";
      _update();
    };
    var setAFKOff = () => {
      if (currentMode === "afk") currentMode = null;
      _update();
    };
    var setMode = (mode) => {
      currentMode = mode;
      _update();
    };
    function _update() {
      if (!statusBarItem) return;
      _updateText();
      _applyStyle();
      _updateTooltip();
    }
    function _updateText() {
      if (!statusBarItem) return;
      const iconFor = () => {
        switch (currentMode) {
          case "watching":
            return "eye";
          case "coding":
            return "code";
          case "terminal":
            return "terminal";
          case "chat":
            return "comment-discussion";
          case "afk":
            return "clock";
          default:
            return isDebugMode ? "bug" : "dashboard";
        }
      };
      const ico = iconFor();
      const baseLabel = isDebugMode ? DEBUG_TITLE : MAIN_TITLE;
      let text = `$(${ico}) ${baseLabel}`;
      if (currentMode === "afk") text += " (AFK)";
      if (!syncOnline) text += " $(debug-disconnect) Offline";
      if (isLocalServerOn) text += " $(database) Local";
      text += uploadQueue.length ? "$(chevron-left) " + uploadQueue.length : "";
      statusBarItem.text = text;
      statusBarItem.show();
    }
    function _updateTooltip() {
      if (!statusBarItem) return;
      const qLen = uploadQueue.length;
      const modeLabel = (() => {
        switch (currentMode) {
          case "watching":
            return "Watching";
          case "coding":
            return "Coding";
          case "terminal":
            return "Terminal";
          case "chat":
            return "Chat";
          case "afk":
            return "AFK (paused)";
          default:
            return "Idle";
        }
      })();
      const lines = [];
      lines.push(MAIN_TITLE);
      lines.push(`Recording: ${modeLabel}`);
      if (typeof mainStatus === "string" && mainStatus) lines.push(`Status: ${mainStatus}`);
      if (syncLabel || !syncOnline) lines.push(`Sync: ${syncLabel || (syncOnline ? "Online" : "Offline")}`);
      if (isLocalServerOn) lines.push("Local server: running");
      if (qLen) lines.push(`Queue: ${qLen} pending ${qLen > 1 ? "records" : "record"}`);
      lines.push("Tip: Click to flush queue now");
      statusBarItem.tooltip = lines.join("\n");
      statusBarItem.show();
    }
    function _applyStyle() {
      if (!statusBarItem) return;
      if (currentMode === "afk") {
        statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
        statusBarItem.color = new vscode.ThemeColor("statusBarItem.warningForeground");
      } else {
        statusBarItem.backgroundColor = void 0;
        statusBarItem.color = void 0;
      }
    }
    module2.exports = {
      init,
      bindUploadQueueArray,
      setStatus2Uploading,
      setStatus2Uploaded,
      setStatus2GotNew1,
      setStatus2Nothing,
      setAFKOn,
      setAFKOff,
      setMode,
      setSyncState,
      localServer: {
        turnOn: setLocalServerOn,
        turnOff: setLocalServerOff
      }
    };
  }
});

// lib/StaticWebServer.js
var require_StaticWebServer = __commonJS({
  "lib/StaticWebServer.js"(exports2, module2) {
    var http = require("http");
    var fs = require("fs");
    var path = require("path");
    function start(options) {
      const staticDir = options.staticDir;
      const port = options.port;
      const debugLog = options.debugLog;
      const chartVendorFile = path.join(__dirname, "..", "node_modules", "chart.js", "dist", "chart.umd.js");
      const getReportSummary = typeof options.getReportSummary === "function" ? options.getReportSummary : async () => ({ totals: { totalMs: 0, eventCount: 0, rangeStart: null, rangeEnd: null }, byActivity: [], byRepo: [], byBranch: [], byExtension: [] });
      const server = http.createServer(async (req, res) => {
        try {
          const url = req.url || "/";
          if (url.startsWith("/ajax/kill")) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: true }));
            setTimeout(() => {
              try {
                server.close();
              } catch (err) {
                void err;
              }
            }, 50);
            return;
          }
          if (url === "/" || url === "/welcome" || url === "/welcome/") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ version: "builtin-static", localServerMode: true }));
            return;
          }
          const p = decodeURIComponent(url.split("?")[0]);
          if (p === "/api/report/summary") {
            const summary = await getReportSummary();
            res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
            res.end(JSON.stringify(summary));
            return;
          }
          if (p === "/vendor/chart.js/chart.umd.js") {
            return streamFile(chartVendorFile, res);
          }
          if (p === "/report" || p === "/report/") {
            const file = path.join(staticDir, "index.html");
            return streamFile(file, res);
          }
          const candidate = path.normalize(path.join(staticDir, p.replace(/^\//, "")));
          if (candidate.startsWith(path.normalize(staticDir)) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return streamFile(candidate, res);
          }
          if (p.startsWith("/report/")) {
            const file = path.join(staticDir, "index.html");
            return streamFile(file, res);
          }
          res.statusCode = 404;
          res.end("Not Found");
        } catch (e) {
          try {
            debugLog("[StaticWebServer] error: " + e);
          } catch (err) {
            void err;
          }
          res.statusCode = 500;
          res.end("Internal Server Error");
        }
      });
      server.listen(port, "127.0.0.1");
      try {
        debugLog(`[StaticWebServer] listening at http://127.0.0.1:${port}, dir=${staticDir}`);
      } catch (err) {
        void err;
      }
      return {
        get url() {
          const address = server.address();
          const boundPort = address && typeof address === "object" ? address.port : port;
          return `http://127.0.0.1:${boundPort}`;
        },
        close: () => {
          try {
            server.close();
          } catch (err) {
            void err;
          }
        }
      };
      function streamFile(file, res) {
        try {
          const ext = path.extname(file).toLowerCase();
          const type = contentType(ext);
          res.writeHead(200, { "Content-Type": type });
          const stream = fs.createReadStream(file);
          stream.on("error", () => {
            if (!res.headersSent) res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Not Found");
          });
          stream.pipe(res);
        } catch (e) {
          res.statusCode = 404;
          res.end("Not Found");
        }
      }
    }
    function contentType(ext) {
      switch (ext) {
        case ".html":
          return "text/html; charset=utf-8";
        case ".js":
          return "application/javascript; charset=utf-8";
        case ".css":
          return "text/css; charset=utf-8";
        case ".json":
          return "application/json; charset=utf-8";
        case ".svg":
          return "image/svg+xml";
        case ".png":
          return "image/png";
        case ".jpg":
        case ".jpeg":
          return "image/jpeg";
        case ".gif":
          return "image/gif";
        case ".ico":
          return "image/x-icon";
        case ".map":
          return "application/json; charset=utf-8";
        default:
          return "application/octet-stream";
      }
    }
    module2.exports = { start };
  }
});

// lib/localReport/historyStore.js
var require_historyStore = __commonJS({
  "lib/localReport/historyStore.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    function createHistoryStore(options) {
      const storagePath = options && options.storagePath ? options.storagePath : "";
      const historyDir = path.join(storagePath, "history");
      const historyFilePath = path.join(historyDir, "activity.jsonl");
      async function appendMany(events) {
        if (!Array.isArray(events) || events.length === 0) return;
        fs.mkdirSync(historyDir, { recursive: true });
        const lines = events.filter((event) => event && typeof event === "object").map((event) => JSON.stringify(event)).join("\n");
        if (!lines) return;
        await fs.promises.appendFile(historyFilePath, `${lines}
`, "utf8");
      }
      async function readAll() {
        if (!fs.existsSync(historyFilePath)) return [];
        return fs.readFileSync(historyFilePath, "utf8").split("\n").filter(Boolean).flatMap((line) => {
          try {
            return [JSON.parse(line)];
          } catch (_) {
            return [];
          }
        });
      }
      async function readReportEvents() {
        const records = await readAll();
        return records.filter((record) => Number(record.long) > 0 && Number(record.time) > 0);
      }
      async function clear() {
        if (!fs.existsSync(historyFilePath)) return;
        await fs.promises.rm(historyFilePath, { force: true });
      }
      async function takeReportEvents() {
        const records = await readReportEvents();
        await clear();
        return records;
      }
      return {
        appendMany,
        readAll,
        readReportEvents,
        clear,
        takeReportEvents,
        historyFilePath
      };
    }
    module2.exports = {
      createHistoryStore
    };
  }
});

// lib/localReport/languageExtensions.js
var require_languageExtensions = __commonJS({
  "lib/localReport/languageExtensions.js"(exports2, module2) {
    var path = require("path");
    var LANGUAGE_BY_EXTENSION = Object.freeze({
      ".astro": "Astro",
      ".bat": "Batch",
      ".blade.php": "Blade",
      ".c": "C",
      ".cc": "C++",
      ".clj": "Clojure",
      ".cljs": "ClojureScript",
      ".cmake": "CMake",
      ".coffee": "CoffeeScript",
      ".cpp": "C++",
      ".cs": "C#",
      ".cshtml": "Razor",
      ".csproj": "C# Project",
      ".css": "CSS",
      ".csv": "CSV",
      ".cxx": "C++",
      ".dart": "Dart",
      ".dockerfile": "Docker",
      ".ejs": "EJS",
      ".elm": "Elm",
      ".erl": "Erlang",
      ".ex": "Elixir",
      ".exs": "Elixir",
      ".fs": "F#",
      ".fsi": "F#",
      ".fsx": "F#",
      ".go": "Go",
      ".graphql": "GraphQL",
      ".groovy": "Groovy",
      ".h": "C/C++ Header",
      ".handlebars": "Handlebars",
      ".hbs": "Handlebars",
      ".hpp": "C++ Header",
      ".hrl": "Erlang",
      ".html": "HTML",
      ".ini": "INI",
      ".java": "Java",
      ".jl": "Julia",
      ".js": "JavaScript",
      ".json": "JSON",
      ".jsonc": "JSONC",
      ".jsx": "JavaScript React",
      ".kt": "Kotlin",
      ".kts": "Kotlin",
      ".less": "Less",
      ".lua": "Lua",
      ".m": "Objective-C",
      ".md": "Markdown",
      ".mdx": "MDX",
      ".mm": "Objective-C++",
      ".php": "PHP",
      ".pl": "Perl",
      ".prisma": "Prisma",
      ".ps1": "PowerShell",
      ".psd1": "PowerShell",
      ".psm1": "PowerShell",
      ".py": "Python",
      ".r": "R",
      ".razor": "Razor",
      ".rb": "Ruby",
      ".rs": "Rust",
      ".sass": "Sass",
      ".scala": "Scala",
      ".scss": "SCSS",
      ".sh": "Shell",
      ".sln": "Visual Studio Solution",
      ".sql": "SQL",
      ".svelte": "Svelte",
      ".swift": "Swift",
      ".tf": "Terraform",
      ".tfvars": "Terraform",
      ".toml": "TOML",
      ".ts": "TypeScript",
      ".tsx": "TypeScript React",
      ".twig": "Twig",
      ".vb": "Visual Basic",
      ".vue": "Vue",
      ".xml": "XML",
      ".yaml": "YAML",
      ".yml": "YAML",
      ".zig": "Zig"
    });
    var LANGUAGE_BY_FILENAME = Object.freeze({
      ".env": "Environment",
      "cmakelists.txt": "CMake",
      "dockerfile": "Docker",
      "jenkinsfile": "Jenkins",
      "makefile": "Makefile"
    });
    var LANGUAGE_NAME_ALIASES = Object.freeze({
      astro: "Astro",
      bat: "Batch",
      batch: "Batch",
      c: "C",
      clojure: "Clojure",
      cmake: "CMake",
      coffee: "CoffeeScript",
      coffeescript: "CoffeeScript",
      cpp: "C++",
      csharp: "C#",
      "c#": "C#",
      css: "CSS",
      csv: "CSV",
      dart: "Dart",
      docker: "Docker",
      dockerfile: "Docker",
      elixir: "Elixir",
      elm: "Elm",
      erl: "Erlang",
      erlang: "Erlang",
      fsharp: "F#",
      "f#": "F#",
      go: "Go",
      graphql: "GraphQL",
      groovy: "Groovy",
      handlebars: "Handlebars",
      html: "HTML",
      ini: "INI",
      java: "Java",
      javascript: "JavaScript",
      javascriptreact: "JavaScript React",
      js: "JavaScript",
      json: "JSON",
      jsonc: "JSONC",
      jsx: "JavaScript React",
      julia: "Julia",
      kotlin: "Kotlin",
      less: "Less",
      lua: "Lua",
      makefile: "Makefile",
      markdown: "Markdown",
      mdx: "MDX",
      objectivec: "Objective-C",
      objectivecpp: "Objective-C++",
      perl: "Perl",
      php: "PHP",
      plaintext: "",
      powershell: "PowerShell",
      prisma: "Prisma",
      python: "Python",
      r: "R",
      razor: "Razor",
      ruby: "Ruby",
      rust: "Rust",
      sass: "Sass",
      scala: "Scala",
      scss: "SCSS",
      shellscript: "Shell",
      sql: "SQL",
      svelte: "Svelte",
      swift: "Swift",
      terraform: "Terraform",
      toml: "TOML",
      ts: "TypeScript",
      tsx: "TypeScript React",
      twig: "Twig",
      typescript: "TypeScript",
      typescriptreact: "TypeScript React",
      vb: "Visual Basic",
      vue: "Vue",
      xml: "XML",
      yaml: "YAML",
      yml: "YAML",
      zig: "Zig"
    });
    var EXCLUDED_FILENAMES = /* @__PURE__ */ new Set([
      "package-lock.json",
      "npm-shrinkwrap.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "composer.lock",
      "gemfile.lock",
      "cargo.lock",
      "poetry.lock",
      "pipfile.lock"
    ]);
    var EXCLUDED_EXTENSIONS = /* @__PURE__ */ new Set([
      ".chat",
      ".lock",
      ".log",
      ".map"
    ]);
    function normalizeLanguageName(value) {
      const text = typeof value === "string" ? value.trim() : "";
      if (!text) return "";
      const normalized = text.toLowerCase().replace(/[\s_-]+/g, "");
      if (Object.prototype.hasOwnProperty.call(LANGUAGE_NAME_ALIASES, normalized)) {
        return LANGUAGE_NAME_ALIASES[normalized];
      }
      return text;
    }
    function languageFromFile(file) {
      const text = typeof file === "string" ? file.trim() : "";
      if (!text) return "";
      const basename = path.basename(text).toLowerCase();
      if (!basename || EXCLUDED_FILENAMES.has(basename)) return "";
      if (LANGUAGE_BY_FILENAME[basename]) return LANGUAGE_BY_FILENAME[basename];
      const multiPartExtension = findMultiPartExtension(basename);
      if (multiPartExtension) return LANGUAGE_BY_EXTENSION[multiPartExtension];
      const ext = path.extname(basename).toLowerCase();
      if (!ext || EXCLUDED_EXTENSIONS.has(ext)) return "";
      return LANGUAGE_BY_EXTENSION[ext] || "";
    }
    function findMultiPartExtension(basename) {
      const matches = Object.keys(LANGUAGE_BY_EXTENSION).filter((ext) => ext.includes(".", 1) && basename.endsWith(ext)).sort((left, right) => right.length - left.length);
      return matches[0] || "";
    }
    module2.exports = {
      LANGUAGE_BY_EXTENSION,
      LANGUAGE_NAME_ALIASES,
      languageFromFile,
      normalizeLanguageName
    };
  }
});

// lib/localReport/reportAggregator.js
var require_reportAggregator = __commonJS({
  "lib/localReport/reportAggregator.js"(exports2, module2) {
    var path = require("path");
    var { languageFromFile, normalizeLanguageName } = require_languageExtensions();
    var HOUR_MS = 60 * 60 * 1e3;
    var DAY_MS = 24 * HOUR_MS;
    var ACTIVITY_SERIES = [
      { key: "reading", label: "Reading", aliases: ["open"], colorVar: "--chart-2", color: "#38bdf8" },
      { key: "coding", label: "Coding", aliases: ["code"], colorVar: "--chart-1", color: "#8b5cf6" },
      { key: "aiChat", label: "AI chat", aliases: ["chat", "aiChat", "aichat"], colorVar: "--chart-3", color: "#2dd4bf" },
      { key: "terminal", label: "Terminal", aliases: ["terminal"], colorVar: "--chart-4", color: "#f59e0b" }
    ];
    function buildReportSummary(events, options) {
      const now = normalizeNow(options && options.now);
      const safeEvents = Array.isArray(events) ? events.filter(Boolean) : [];
      const filteredEvents = safeEvents.filter((event) => Number(event.long) > 0);
      const datedEvents = filteredEvents.filter((event) => Number(event.time) > 0);
      const times = datedEvents.map((event) => Number(event.time));
      const chart24h = build24HourChart(filteredEvents, now);
      const chartMonth = buildMonthChart(filteredEvents, now);
      return {
        reportDate: now.getTime(),
        reportDateLabel: formatReportDate(now),
        totals: {
          totalMs: sum(filteredEvents, (event) => Number(event.long) || 0),
          eventCount: filteredEvents.length,
          rangeStart: times.length ? Math.min(...times) : null,
          rangeEnd: times.length ? Math.max(...times.map((time, index) => time + (Number(datedEvents[index].long) || 0))) : null
        },
        chart24h,
        chartMonth,
        byActivity: toGroups(filteredEvents, (event) => normalizeActivity(event.type)),
        byRepo: toGroups(filteredEvents, (event) => normalizeRepo(event.vcs_repo)),
        byBranch: toGroups(filteredEvents, (event) => normalizeBranch(event.vcs_branch)),
        byRepoBranch: toGroups(filteredEvents, normalizeRepoBranch),
        byExtension: toGroups(
          filteredEvents.filter((event) => shouldIncludeExtension(event.file)),
          (event) => extractExtension(event.file)
        ),
        byLanguage: toGroups(
          filteredEvents.filter((event) => normalizeLanguage(event)),
          normalizeLanguage
        )
      };
    }
    function build24HourChart(events, now) {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfDay = startOfDay + DAY_MS;
      const labels = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);
      const buckets = buildActivityBuckets(events, startOfDay, 24, HOUR_MS);
      return {
        title: "Last 24 hours",
        breakdownLabel: "Break down by",
        breakdownOptions: ["Activities"],
        activeBreakdown: "Activities",
        axisUnit: "Minutes",
        labels,
        currentTimeLabel: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
        rangeStart: startOfDay,
        rangeEnd: endOfDay,
        maxHours: 1,
        series: buildChartSeries(buckets)
      };
    }
    function buildMonthChart(events, now) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const endOfMonth = startOfMonth + daysInMonth * DAY_MS;
      const labels = Array.from({ length: daysInMonth }, (_, index) => String(index + 1).padStart(2, "0"));
      const buckets = buildActivityBuckets(events, startOfMonth, daysInMonth, DAY_MS);
      const peakHours = Math.max(
        ...labels.map((_, index) => ACTIVITY_SERIES.reduce((total, activity) => total + buckets[activity.key][index], 0) / HOUR_MS),
        0
      );
      return {
        title: now.toLocaleDateString(void 0, { month: "long", year: "numeric" }),
        breakdownLabel: "Break down by",
        breakdownOptions: ["Activities"],
        activeBreakdown: "Activities",
        axisUnit: "Minutes",
        labels,
        rangeStart: startOfMonth,
        rangeEnd: endOfMonth,
        maxHours: peakHours > 0 ? Math.max(1, Math.ceil(peakHours)) : 1,
        series: buildChartSeries(buckets)
      };
    }
    function buildActivityBuckets(events, rangeStart, bucketCount, bucketMs) {
      const buckets = Object.fromEntries(ACTIVITY_SERIES.map((activity) => [activity.key, new Array(bucketCount).fill(0)]));
      const rangeEnd = rangeStart + bucketCount * bucketMs;
      for (const event of events) {
        const bucket = toChartBucket(event.type);
        if (!bucket) continue;
        const eventStart = Number(event.time) || 0;
        const duration = Number(event.long) || 0;
        if (eventStart <= 0 || duration <= 0) continue;
        const eventEnd = eventStart + duration;
        const overlapStart = Math.max(eventStart, rangeStart);
        const overlapEnd = Math.min(eventEnd, rangeEnd);
        if (overlapEnd <= overlapStart) continue;
        const firstIndex = Math.max(0, Math.floor((overlapStart - rangeStart) / bucketMs));
        const lastIndex = Math.min(bucketCount - 1, Math.floor((overlapEnd - 1 - rangeStart) / bucketMs));
        for (let index = firstIndex; index <= lastIndex; index += 1) {
          const slotStart = rangeStart + index * bucketMs;
          const slotEnd = slotStart + bucketMs;
          const coveredMs = Math.max(0, Math.min(overlapEnd, slotEnd) - Math.max(overlapStart, slotStart));
          if (coveredMs) buckets[bucket][index] += coveredMs;
        }
      }
      return buckets;
    }
    function buildChartSeries(buckets) {
      return ACTIVITY_SERIES.map((activity) => ({
        key: activity.key,
        label: activity.label,
        totalMs: sum(buckets[activity.key], (value) => value),
        values: buckets[activity.key],
        color: activity.color,
        colorVar: activity.colorVar
      }));
    }
    function toChartBucket(type) {
      const value = typeof type === "string" ? type.trim() : "";
      const lower = value.toLowerCase();
      for (const activity of ACTIVITY_SERIES) {
        if (activity.aliases.some((alias) => alias.toLowerCase() === lower)) return activity.key;
      }
      return "";
    }
    function sum(items, selector) {
      return items.reduce((total, item) => total + (Number(selector(item)) || 0), 0);
    }
    function toGroups(events, keySelector) {
      const totals = /* @__PURE__ */ new Map();
      for (const event of events) {
        const key = keySelector(event);
        const totalMs = Number(event.long) || 0;
        totals.set(key, (totals.get(key) || 0) + totalMs);
      }
      return Array.from(totals.entries()).map(([key, totalMs]) => ({ key, totalMs })).sort((left, right) => {
        if (right.totalMs !== left.totalMs) return right.totalMs - left.totalMs;
        return left.key.localeCompare(right.key);
      });
    }
    function normalizeActivity(value) {
      const bucket = toChartBucket(value);
      const activity = ACTIVITY_SERIES.find((item) => item.key === bucket);
      return activity ? activity.label : "Unknown";
    }
    function normalizeRepo(value) {
      return normalizeLabel(value, "No repository");
    }
    function normalizeBranch(value) {
      return normalizeLabel(value, "No branch");
    }
    function normalizeRepoBranch(event) {
      return `${normalizeRepo(event.vcs_repo)} / ${normalizeBranch(event.vcs_branch)}`;
    }
    function normalizeLanguage(event) {
      const lang = typeof event.lang === "string" ? event.lang.trim() : "";
      const normalizedLanguage = normalizeLanguageName(lang);
      return normalizedLanguage || languageFromFile(event.file);
    }
    function normalizeLabel(value, fallback) {
      const text = typeof value === "string" ? value.trim() : "";
      return text ? text : fallback;
    }
    function shouldIncludeExtension(file) {
      return typeof file === "string" && file.trim().length > 0;
    }
    function extractExtension(file) {
      const ext = path.extname(typeof file === "string" ? file.trim() : "");
      return ext || "No extension";
    }
    function normalizeNow(value) {
      if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
      if (typeof value === "string" || typeof value === "number") {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      return /* @__PURE__ */ new Date();
    }
    function formatReportDate(now) {
      return now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    }
    module2.exports = {
      buildReportSummary
    };
  }
});

// lib/Log.js
var require_Log = __commonJS({
  "lib/Log.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var crypto = require("crypto");
    var { isDebugMode, prefix } = require_Constants();
    var noopLog = (..._args) => {
      void _args;
      return void 0;
    };
    var noopEnd = () => void 0;
    var logger = {
      error: (
        /** @type {LogFn} */
        ((...msg) => console.error(prefix, ...msg))
      ),
      warn: (
        /** @type {LogFn} */
        ((...msg) => console.warn(prefix, ...msg))
      ),
      debug: noopLog,
      end: noopEnd
    };
    if (isDebugMode)
      setupDebugLogger();
    module2.exports = logger;
    function setupDebugLogger() {
      const vscode = require("vscode");
      const logStream = getDebugLogFileStream();
      logger.error = /** @type {LogFn} */
      ((...msg) => {
        console.error(prefix, ...msg);
        vscode.window.showErrorMessage(`${prefix}: ${msg.join(" ")}`);
        if (logStream)
          logStream.write("-ERROR", ...msg);
      });
      logger.warn = /** @type {LogFn} */
      ((...msg) => {
        console.warn(prefix, ...msg);
        vscode.window.showWarningMessage(`${prefix}: ${msg.join(" ")}`);
        if (logStream)
          logStream.write("-WARN", ...msg);
      });
      logger.debug = /** @type {LogFn} */
      ((...msg) => {
        console.log(prefix, ...msg);
        if (logStream)
          logStream.write("", ...msg);
      });
      logger.end = () => {
        if (logStream)
          logStream.end();
      };
    }
    function getDebugLogFileStream() {
      const DEBUG_LOG_DIR = path.join(__dirname, "..", "logs");
      try {
        if (!fs.existsSync(DEBUG_LOG_DIR))
          fs.mkdirSync(DEBUG_LOG_DIR);
      } catch (error) {
        logger.error(`create debug log dir (${DEBUG_LOG_DIR}) failed!`, error);
        return;
      }
      const now = /* @__PURE__ */ new Date();
      const rand = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
      const id = rand.slice(rand.length - 12);
      const file = padding(now.getFullYear()) + padding(now.getMonth() + 1) + padding(now.getDate()) + padding(now.getHours()) + ".log";
      let stream;
      let streamErrorOccurred = false;
      try {
        stream = fs.createWriteStream(path.join(DEBUG_LOG_DIR, file), { flags: "a" });
        stream.on("error", onStreamError);
      } catch (error) {
        logger.error(`create debug log file stream (${file}) failed!`, error);
        return;
      }
      logger.debug(`created debug log file stream: ${file}`);
      return {
        /**
         * @param {string} type
         * @param {...unknown} data
         */
        write: (type, ...data) => {
          if (!stream) return;
          stream.write(data.map((item) => {
            if (Buffer.isBuffer(item)) return item.toString();
            if (item instanceof Error) return String(item.stack || item.message || item);
            return String(item);
          }).join("	").split("\n").map((it) => `${id}${type}:	${it}`).join("\n") + "\n", () => void 0);
        },
        end: () => endStream()
      };
      function padding(num) {
        return 10 > num ? `0${num}` : `${num}`;
      }
      function endStream() {
        try {
          if (stream) stream.end();
        } catch (error) {
          void error;
        }
        stream = void 0;
      }
      function onStreamError(error) {
        if (streamErrorOccurred) return;
        streamErrorOccurred = true;
        logger.error("debug log file stream error:", error);
      }
    }
  }
});

// lib/OutputChannelLog.js
var require_OutputChannelLog = __commonJS({
  "lib/OutputChannelLog.js"(exports2, module2) {
    var log = require_Log();
    var vscode = require("vscode");
    var { outputChannelName } = require_Constants();
    var channel = null;
    var getChannel = () => {
      channel = channel || vscode.window.createOutputChannel(outputChannelName);
      return channel;
    };
    var stop = () => {
      if (!channel) return;
      channel.hide();
      channel.dispose();
      channel = null;
    };
    var debug = (data) => {
      log.debug(data);
      getChannel().appendLine(String(data));
    };
    var error = (err) => {
      log.error(err);
      getChannel().appendLine(String(err));
    };
    module2.exports = {
      start: getChannel,
      stop,
      debug,
      error,
      show: () => getChannel().show()
    };
  }
});

// lib/LocalServer.js
var require_LocalServer = __commonJS({
  "lib/LocalServer.js"(exports2, module2) {
    var DEFAULT_PORT = 10345;
    var SILENT_START_SERVER = true;
    var SLASHCODED_DESKTOP_DOWNLOAD_URL = "https://lundholm.io/projects/slashcoded?ref=vscodeext";
    var URL2 = require("url");
    var fs = require("fs");
    var vscode = require("vscode");
    var httpClient = require_httpClient();
    var path = require("path");
    var staticServer = require_StaticWebServer();
    var { createHistoryStore } = require_historyStore();
    var { buildReportSummary } = require_reportAggregator();
    var log = require_OutputChannelLog();
    var statusBar = require_StatusBarManager();
    var ext = (
      /** @type {any} */
      require_VSCodeHelper()
    );
    var userConfig = {
      url: "",
      token: "",
      localMode: false
    };
    var isLocalServerRunningInThisContext = false;
    var builtinServer = null;
    var storagePath = "";
    function init(extensionContext) {
      var { subscriptions } = extensionContext;
      storagePath = extensionContext && extensionContext.globalStorageUri ? extensionContext.globalStorageUri.fsPath : "";
      subscriptions.push(vscode.commands.registerCommand("slashCoded.showLocalReport", showLocalReport));
      try {
        log.debug("[LocalServer] Commands registered: showLocalReport");
      } catch (_) {
      }
      userConfig = _readUserConfig();
      if (userConfig.localMode && !_isLocalURL(userConfig.url)) {
        log.debug(`[LocalServer] localServerMode=true and serverURL is remote (${userConfig.url}). Forcing local URL http://127.0.0.1:${DEFAULT_PORT}`);
        userConfig.url = `http://127.0.0.1:${DEFAULT_PORT}`;
      }
      try {
        log.debug(`[LocalServer] init with serverURL=${userConfig.url}, localMode=${userConfig.localMode}`);
      } catch (_) {
      }
      if (userConfig.localMode) {
        log.debug(`[LocalMode]: try to kill old tracking server...`);
        httpClient.get(_getKillURL(), { params: { token: userConfig.token } }).then(
          /** @param {{data:any}} res */
          (res) => {
            var result = {};
            try {
              result = res && res.data ? res.data : {};
            } catch (e) {
              log.error("[Error]: parse JSON failed!");
            }
            if (result.success) {
              log.debug("[Killed]: killed old server! and opening a new local server...");
              return startLocalServer(true);
            } else {
              log.debug(`[Response]: ${JSON.stringify(result)}`);
              (result.error || "").indexOf("local") >= 0 ? _showError(`Starting the local mode failed!(because the existed server is not a local server)`, { stack: "Not a local server!" }) : _showError(`Starting the local mode failed!(because your token is invalid for existed server)`, { stack: "token is invalid" });
            }
          }
        ).catch(() => {
          log.debug(`[LocalMode]: there are no old tracking server, just opening a new local server...`);
          return startLocalServer(true);
        });
      }
    }
    function updateConfig() {
      var newConfig = _readUserConfig();
      userConfig = newConfig;
    }
    function startLocalServer(silent) {
      const staticDir = path.join(__dirname, "..", "server-app");
      if (fs.existsSync(staticDir) && fs.statSync(staticDir).isDirectory()) {
        if (builtinServer) {
          isLocalServerRunningInThisContext = true;
          statusBar.localServer.turnOn();
          if (!silent) vscode.window.showInformationMessage(`SlashCoded: built-in local server started!`);
          return;
        }
        const port = Number(_getPortInfoFromURL(userConfig.url));
        builtinServer = staticServer.start({
          staticDir,
          port,
          debugLog: (m) => log.debug(m),
          getReportSummary: async () => {
            const historyStore = createHistoryStore({ storagePath });
            const events = await historyStore.readReportEvents();
            return Object.assign(buildReportSummary(events, { now: process.env.SLASHCODED_LOCAL_REPORT_NOW }), {
              desktop: {
                detected: false,
                downloadUrl: SLASHCODED_DESKTOP_DOWNLOAD_URL
              }
            });
          }
        });
        isLocalServerRunningInThisContext = true;
        statusBar.localServer.turnOn();
        vscode.window.showInformationMessage(`SlashCoded: built-in local server started!`);
        return;
      }
      _showError(`built-in local dashboard assets are missing`, { stack: `Missing directory: ${staticDir}` });
    }
    function _checkIsLocalServerStart(silent, times, isActiveCheck) {
      if (times >= 10) return statusBar.localServer.turnOff();
      _checkConnection((networkErr, serverErr, result) => {
        if (result) {
          if (
            /** @type {{localServerMode?: boolean}} */
            result.localServerMode
          ) {
            silent || vscode.window.showInformationMessage(`SlashCoded: local server started!`);
            isActiveCheck ? log.debug(`[Heartbeat]: server in local!`) : log.debug(`[Launched]: Local server has launching!`);
            statusBar.localServer.turnOn();
          } else {
            statusBar.localServer.turnOff();
          }
        } else if (!networkErr) {
          return;
        } else {
          setTimeout(() => _checkIsLocalServerStart(silent, times + 1, isActiveCheck), 800);
        }
      });
    }
    function stopLocalServerSilentByTreeKill() {
      log.debug("[Kill]: try to kill local server by tree kill way...");
      if (builtinServer) {
        try {
          builtinServer.close();
        } catch (_) {
        }
        builtinServer = null;
      }
    }
    async function showLocalReport() {
      try {
        startLocalServer(true);
        const fallbackUrl = getBuiltinReportURL();
        await vscode.env.openExternal(vscode.Uri.parse(fallbackUrl));
      } catch (err) {
        _showError(
          `Execute open local report command error!`,
          /** @type {{stack?:any}} */
          err || { stack: "Unknown error" }
        );
      }
    }
    function _checkConnection(then) {
      httpClient.get(_getWelcomeURL()).then(
        /** @param {{status:number, data:any}} res */
        (res) => {
          if (!res || res.status !== 200) return then(null, `server exception!(${res ? res.status : "unknown"})`);
          try {
            var result = res.data;
          } catch (e) {
            return then(null, `server exception!(illegal welcome json)`);
          }
          return then(null, null, result);
        }
      ).catch(
        /** @param {any} err */
        (err) => then(err)
      );
    }
    function getBuiltinReportURL() {
      try {
        if (builtinServer && builtinServer.url) return `${String(builtinServer.url).replace(/\/$/, "")}/report/`;
      } catch (_) {
      }
      return `http://127.0.0.1:${DEFAULT_PORT}/report/`;
    }
    function _getWelcomeURL() {
      return `${userConfig.url}/`;
    }
    function _getKillURL() {
      return `${userConfig.url}/ajax/kill`;
    }
    function _readUserConfig() {
      ext.getConfig("slashCoded");
      return { url: `http://127.0.0.1:${DEFAULT_PORT}`, token: "", localMode: false };
    }
    function _showError(errOneLine, errObject) {
      const MENU_ITEM_TEXT = "Show details";
      log.error(`[Error]: ${errOneLine}
${errObject.stack}`);
      vscode.window.showErrorMessage(`SlashCoded: ${errOneLine}`, MENU_ITEM_TEXT).then((item) => item == MENU_ITEM_TEXT ? log.show() : 0);
    }
    function _getPortInfoFromURL(url) {
      return String(URL2.parse(url).port || DEFAULT_PORT);
    }
    function _isLocalURL(url) {
      try {
        const u = URL2.parse(url);
        const h = (u.hostname || "").toLowerCase();
        return h === "127.0.0.1" || h === "localhost";
      } catch (_) {
        return false;
      }
    }
    module2.exports = {
      init,
      updateConfig,
      activeCheckIsLocalServerStart: () => _checkIsLocalServerStart(true, 9, true),
      detectOldSever_SoStartANewIfUnderLocalMode: () => {
        if (!userConfig.localMode)
          return false;
        if (!isLocalServerRunningInThisContext) {
          log.debug("[Launch]: launching a new tracking server because detected old server exited!");
          startLocalServer(SILENT_START_SERVER);
          return true;
        }
        return false;
      },
      dispose: stopLocalServerSilentByTreeKill
    };
  }
});

// lib/localReport/storageMode.js
var require_storageMode = __commonJS({
  "lib/localReport/storageMode.js"(exports2, module2) {
    function shouldQueueLiveEvents(input) {
      const storageMode = input && input.storageMode === "standalone" ? "standalone" : "auto";
      if (storageMode === "standalone") return false;
      const discovery = input && input.discovery ? input.discovery : null;
      return !!(discovery && (discovery.apiBaseUrl || discovery.publicBaseUrl));
    }
    module2.exports = {
      shouldQueueLiveEvents
    };
  }
});

// lib/core/hostTiming.js
var require_hostTiming = __commonJS({
  "lib/core/hostTiming.js"(exports2, module2) {
    "use strict";
    var DEFAULT_SEGMENT_DURATION_SECONDS = 15;
    var DEFAULT_IDLE_THRESHOLD_SECONDS = 300;
    var TRACKING_CONFIG_REFRESH_MS = 5 * 60 * 1e3;
    function toPositiveInteger(value, fallback) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
      return Math.floor(numeric);
    }
    function createDefaultTrackingConfig() {
      return {
        segmentDurationSeconds: DEFAULT_SEGMENT_DURATION_SECONDS,
        idleThresholdSeconds: DEFAULT_IDLE_THRESHOLD_SECONDS,
        configVersion: "startup-default",
        updatedAt: null,
        source: "default"
      };
    }
    function sanitizeTrackingConfig(raw) {
      const defaults = createDefaultTrackingConfig();
      return {
        segmentDurationSeconds: toPositiveInteger(raw && raw.segmentDurationSeconds, defaults.segmentDurationSeconds),
        idleThresholdSeconds: toPositiveInteger(raw && raw.idleThresholdSeconds, defaults.idleThresholdSeconds),
        configVersion: raw && typeof raw.configVersion === "string" && raw.configVersion.trim() ? raw.configVersion.trim() : defaults.configVersion,
        updatedAt: raw && typeof raw.updatedAt === "string" && raw.updatedAt.trim() ? raw.updatedAt.trim() : null,
        source: "host"
      };
    }
    function shouldRefreshTrackingConfig(lastFetchedAt, now = Date.now()) {
      if (!lastFetchedAt) return true;
      return now - lastFetchedAt >= TRACKING_CONFIG_REFRESH_MS;
    }
    function applyTrackingConfigToState(state, trackingConfig) {
      if (!state || !trackingConfig) return;
      state.hostTrackingConfig = Object.assign({}, trackingConfig);
      state.segmentDurationMs = trackingConfig.segmentDurationSeconds * 1e3;
      state.afkTimeoutMs = trackingConfig.idleThresholdSeconds * 1e3;
    }
    module2.exports = {
      DEFAULT_SEGMENT_DURATION_SECONDS,
      DEFAULT_IDLE_THRESHOLD_SECONDS,
      TRACKING_CONFIG_REFRESH_MS,
      createDefaultTrackingConfig,
      sanitizeTrackingConfig,
      shouldRefreshTrackingConfig,
      applyTrackingConfigToState
    };
  }
});

// lib/core/desktopEventMapper.js
var require_desktopEventMapper = __commonJS({
  "lib/core/desktopEventMapper.js"(exports2, module2) {
    "use strict";
    var crypto = require("crypto");
    function clampDurationMs(value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric <= 0) return 1e3;
      return Math.max(1e3, Math.floor(numeric));
    }
    function mapToDesktopEvent(src, trackingConfig) {
      const longMs = clampDurationMs(src && src.long);
      const startTs = Number(src && src.time);
      const safeStartTs = Number.isFinite(startTs) && startTs > 0 ? startTs : Date.now() - longMs;
      const segmentEndTs = safeStartTs + longMs;
      const durationMinutes = Math.max(1, Math.round(longMs / (60 * 1e3)));
      const category = src && src.type ? src.type : "code";
      const project = src && src.proj || "vscode-local";
      const eventSeed = [
        category,
        safeStartTs,
        segmentEndTs,
        src && src.file || "",
        src && src.vcs_repo || "",
        src && src.vcs_branch || ""
      ].join("|");
      const eventId = `ide-${segmentEndTs}-${crypto.createHash("sha1").update(eventSeed).digest("hex").slice(0, 12)}`;
      return {
        token: src && src.token || void 0,
        userId: "local",
        source: "vscode",
        occurredAt: new Date(segmentEndTs).toISOString(),
        durationMinutes,
        durationMs: longMs,
        project,
        category,
        payload: {
          lang: src && src.lang || "",
          file: src && src.file || "",
          vcs_repo: src && src.vcs_repo || "",
          vcs_branch: src && src.vcs_branch || "",
          type: category,
          event_id: eventId,
          segment_start_ts: safeStartTs,
          segment_end_ts: segmentEndTs,
          trackerConfigVersion: trackingConfig.configVersion,
          segmentDurationSeconds: trackingConfig.segmentDurationSeconds,
          idleThresholdSeconds: trackingConfig.idleThresholdSeconds
        }
      };
    }
    module2.exports = {
      mapToDesktopEvent
    };
  }
});

// lib/Uploader.js
var require_Uploader = __commonJS({
  "lib/Uploader.js"(exports2, module2) {
    var vscode = require("vscode");
    var fs = require("fs");
    var path = require("path");
    var crypto = require("crypto");
    var ext = require_VSCodeHelper();
    var httpClient = require_httpClient();
    var statusBar = require_StatusBarManager();
    var localServer = require_LocalServer();
    var log = require_Log();
    var { createHistoryStore } = require_historyStore();
    var { shouldQueueLiveEvents } = require_storageMode();
    var { isDebugMode } = require_Constants();
    var {
      createDefaultTrackingConfig,
      sanitizeTrackingConfig,
      shouldRefreshTrackingConfig
    } = require_hostTiming();
    var { mapToDesktopEvent } = require_desktopEventMapper();
    var DESKTOP_DEFAULT_PORT = 5292;
    function getDesktopPort() {
      const raw = process.env.SLASHCODED_DESKTOP_PORT;
      if (!raw) return DESKTOP_DEFAULT_PORT;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : DESKTOP_DEFAULT_PORT;
    }
    function getHandshakeCandidates() {
      const port = getDesktopPort();
      const suffix = `/api/host/handshake`;
      return [
        `http://127.0.0.1:${port}${suffix}`,
        `http://localhost:${port}${suffix}`
      ];
    }
    var TOKEN_REQUEST_PATH = "api/token/request";
    var TOKEN_REFRESH_PATH = "api/token/refresh";
    var TRUST_REGISTER_PATH = "api/security/sources/register";
    var ENFORCEMENT_PATH = "api/security/enforcement";
    var DESKTOP_DISCOVERY_KEY = "slashCoded.desktopDiscovery";
    var DESKTOP_TOKEN_KEY = "slashCoded.desktopToken";
    var TRUSTED_SOURCE_KEY = "slashCoded.trustedSource.v1";
    var TRACKING_CONFIG_KEY = "slashCoded.trackingConfig.v1";
    var MAX_QUEUE_AGE_MS = 30 * 24 * 60 * 60 * 1e3;
    var MAX_EVENT_SIZE_BYTES = 16 * 1024;
    var MAX_TERMINAL_EVENT_MS = 60 * 60 * 1e3;
    var QUEUE_WARN_THRESHOLD = 1e3;
    var RETRY_BASE_MS = [1e3, 2e3, 5e3, 1e4, 3e4, 6e4];
    var RETRY_MAX_MS = 6e4;
    var TOKEN_REFRESH_WINDOW_MS = 24 * 60 * 60 * 1e3;
    var HANDSHAKE_MIN_INTERVAL_MS = 3e3;
    var TRUST_ENROLL_MIN_INTERVAL_MS = 60 * 1e3;
    var ENFORCEMENT_REFRESH_MS = 6e4;
    var DESKTOP_ENDPOINT_CANDIDATES = ["api/upload", "api/queue/upload"];
    var EXTENSION_CLIENT_ID = "lundholm.slashcoded-vscode-extension";
    var EXTENSION_DISPLAY_NAME = "SlashCoded VS Code Extension";
    var Q = [];
    var uploadURL = "";
    var uploadToken = "";
    var uploadHeader = { "Content-Type": "application/json; charset=utf-8" };
    var uploading = 0;
    var lastUploadStartTs = 0;
    var lastProgressTs = 0;
    var requestTimeoutMs = 15e3;
    var hadShowError = 0;
    var endpointCandidates = DESKTOP_ENDPOINT_CANDIDATES.slice();
    var currentEndpointIndex = 0;
    var baseServerURL = "";
    var fallbackBaseServerURL = "";
    var handshakeTimeoutMs = 500;
    var queueFilePath = "";
    var secretStorage = null;
    var globalState = null;
    var discovery = null;
    var trackingConfig = createDefaultTrackingConfig();
    var lastTrackingConfigFetchAt = 0;
    var tokenInfo = null;
    var trustedSource = null;
    var lastHandshakeAt = 0;
    var lastTrustedEnrollAt = 0;
    var syncOnline = true;
    var retryTimer = null;
    var queueWarned = false;
    var machineId = "";
    var desktopWarned = false;
    var storageMode = "auto";
    var enforcementMode = null;
    var lastEnforcementCheckAt = 0;
    var deadLetterFilePath = "";
    var historyStore = null;
    function pushQueuePayloads(queuedPayloads, trackingSnapshot) {
      for (const queuedPayload of queuedPayloads) {
        log.debug(`new upload object: ${queuedPayload.type};${queuedPayload.time};${queuedPayload.long};${queuedPayload.file}`);
        Q.push({ payload: queuedPayload, createdAt: Date.now(), retryCount: 0, trackingConfig: trackingSnapshot });
      }
      persistQueue();
      if (!queueWarned && Q.length > QUEUE_WARN_THRESHOLD) {
        queueWarned = true;
        try {
          vscode.window.showWarningMessage(`SlashCoded: Offline queue has ${Q.length} pending events. Desktop app may be offline.`);
        } catch (_) {
        }
      }
      statusBar.setStatus2GotNew1();
      updateSyncState();
      process.nextTick(_upload);
    }
    function expandPayloadsForQueue(payload, config) {
      if (!payload)
        return [payload];
      const total = Number(payload.long);
      const segmentMs = Math.max(1e3, Number(config && config.segmentDurationSeconds) * 1e3 || 15e3);
      if (!Number.isFinite(total) || total <= segmentMs)
        return [payload];
      const start = Number(payload.time);
      const safeStart = Number.isFinite(start) && start > 0 ? start : Date.now() - total;
      const chunks = [];
      let offset = 0;
      while (offset < total) {
        const chunkDuration = Math.min(segmentMs, MAX_TERMINAL_EVENT_MS, total - offset);
        chunks.push(Object.assign({}, payload, {
          time: safeStart + offset,
          long: chunkDuration
        }));
        offset += chunkDuration;
      }
      return chunks;
    }
    function updateSyncState(label) {
      try {
        statusBar.setSyncState(syncOnline, label);
      } catch (_) {
      }
    }
    function persistQueue() {
      if (!queueFilePath) return;
      try {
        fs.writeFileSync(queueFilePath, JSON.stringify(Q, null, 2), "utf8");
      } catch (e) {
        log.debug("Failed to persist queue", e);
      }
    }
    function loadQueueFromDisk() {
      if (!queueFilePath || !fs.existsSync(queueFilePath)) return;
      try {
        const parsed = JSON.parse(fs.readFileSync(queueFilePath, "utf8"));
        if (Array.isArray(parsed)) {
          const now = Date.now();
          Q.splice(0, Q.length, ...parsed.filter((it) => it && typeof it === "object").map(
            /** @returns {QueueItem} */
            (it) => ({
              payload: it.payload || it,
              createdAt: typeof it.createdAt === "number" ? it.createdAt : now,
              retryCount: typeof it.retryCount === "number" ? it.retryCount : 0,
              trackingConfig: it.trackingConfig ? sanitizeTrackingConfig(it.trackingConfig) : Object.assign({}, trackingConfig)
            })
          ).filter((it) => !it.createdAt || now - it.createdAt < MAX_QUEUE_AGE_MS));
          if (!queueWarned && Q.length > QUEUE_WARN_THRESHOLD) {
            queueWarned = true;
            try {
              vscode.window.showWarningMessage(`SlashCoded: Offline queue has ${Q.length} pending events. Desktop app may be offline.`);
            } catch (_) {
            }
          }
        }
      } catch (e) {
        log.debug("Failed to load offline queue", e);
      }
    }
    function computeRetryDelay(retryCount) {
      if (retryCount < RETRY_BASE_MS.length) return RETRY_BASE_MS[retryCount];
      return RETRY_MAX_MS;
    }
    function scheduleRetry(delayMs) {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = setTimeout(_upload, delayMs);
    }
    function purgeExpiredQueue() {
      const now = Date.now();
      const filtered = Q.filter((it) => !it.createdAt || now - it.createdAt < MAX_QUEUE_AGE_MS);
      if (filtered.length !== Q.length) {
        Q.splice(0, Q.length, ...filtered);
        persistQueue();
      }
    }
    function buildStatusSnapshot() {
      const oldest = Q.length ? Q.reduce((min, it) => Math.min(min, it.createdAt || Date.now()), Date.now()) : null;
      return {
        online: syncOnline,
        queueLength: Q.length,
        oldestQueuedAt: oldest,
        lastHandshakeAt,
        trackingConfig,
        discovery,
        enforcementMode,
        tokenExpiresAt: tokenInfo && tokenInfo.expiresAt || void 0
      };
    }
    var uploader = {
      /**
       * @param {import('vscode').ExtensionContext=} ctx
       */
      init: function(ctx) {
        statusBar.bindUploadQueueArray(Q);
        secretStorage = ctx ? ctx.secrets : null;
        globalState = ctx ? ctx.globalState : null;
        try {
          machineId = vscode.env && vscode.env.machineId || "";
        } catch (_) {
          machineId = "";
        }
        if (ctx) {
          try {
            const storagePath = ctx.globalStorageUri.fsPath;
            fs.mkdirSync(storagePath, { recursive: true });
            queueFilePath = path.join(storagePath, "queue.json");
            deadLetterFilePath = path.join(storagePath, "dead-letter.jsonl");
            historyStore = createHistoryStore({ storagePath });
            loadQueueFromDisk();
          } catch (e) {
            log.debug("Failed to prepare queue storage", e);
          }
          try {
            const stored = ctx.globalState.get(DESKTOP_DISCOVERY_KEY);
            if (stored && typeof stored === "object") discovery = /** @type {any} */
            stored;
          } catch (_) {
          }
          try {
            const storedTrackingConfig = ctx.globalState.get(TRACKING_CONFIG_KEY);
            if (storedTrackingConfig && typeof storedTrackingConfig === "object") {
              trackingConfig = sanitizeTrackingConfig(storedTrackingConfig);
            }
          } catch (_) {
          }
          try {
            void primeTokenFromSecret();
          } catch (_) {
          }
          try {
            void primeTrustedSourceFromSecret();
          } catch (_) {
          }
          try {
            statusBar.setStatus2Nothing();
          } catch (_) {
          }
        }
        updateSyncState();
      },
      /**
       * @param {string} url
       * @param {string} token
       * @param {string|boolean|undefined} proxy
       */
      set: function(url, token, proxy) {
        void proxy;
        try {
          const parsed = new URL(url);
          const clean = DESKTOP_ENDPOINT_CANDIDATES.reduce((acc, c) => acc.endsWith(c) ? acc.slice(0, -c.length) : acc, parsed.toString());
          baseServerURL = clean.replace(/\/?$/, "/");
        } catch (_) {
          baseServerURL = url.endsWith("/") ? url : url + "/";
        }
        baseServerURL = normalizeApiBase(baseServerURL);
        fallbackBaseServerURL = baseServerURL;
        currentEndpointIndex = 0;
        uploadURL = baseServerURL + endpointCandidates[currentEndpointIndex];
        uploadToken = token;
        log.debug(`uploader configurations changed. Using endpoint: ${uploadURL}`);
      },
      /** @param {number} ms */
      configureTimeout: function(ms) {
        if (typeof ms === "number" && ms > 0) {
          requestTimeoutMs = ms;
          log.debug(`uploader timeout set to ${ms}ms`);
        }
      },
      /** @param {number} ms */
      configureDiscoveryTimeout: function(ms) {
        if (typeof ms === "number" && ms > 0) {
          handshakeTimeoutMs = ms;
        }
      },
      setStorageMode: function(mode) {
        storageMode = mode === "standalone" ? "standalone" : "auto";
        try {
          log.debug(`uploader storageMode set to ${storageMode}`);
        } catch (_) {
        }
      },
      upload: function(data) {
        const payload = data;
        if (!payload)
          return log.debug(`new upload object(ignored): ${payload}`);
        try {
          if (payload.time === void 0 || payload.time === null || Number.isNaN(Number(payload.time)) || Number(payload.time) <= 0) {
            const fallback = Date.now() - (typeof payload.long === "number" && payload.long > 0 ? payload.long : 0);
            log.debug(`uploader: payload.time invalid (${payload.time}). Patching to ${fallback} derived from long=${payload.long}`);
            payload.time = fallback;
          }
        } catch (e) {
          log.debug("uploader: error normalizing payload.time", e);
        }
        const trackingSnapshot = Object.assign({}, trackingConfig);
        const queuePayloads = expandPayloadsForQueue(payload, trackingSnapshot);
        if (queuePayloads.length > 1) {
          log.debug(`uploader: split payload into ${queuePayloads.length} shared-timing chunks (${payload.long}ms total)`);
        }
        if (!shouldQueueLiveEvents({ storageMode, discovery })) {
          const persistedPayloads = queuePayloads.map((queuedPayload) => normalizePayload(queuedPayload));
          if (historyStore) {
            historyStore.appendMany(persistedPayloads).catch((error) => {
              try {
                log.debug("Failed to persist local history", error);
              } catch (_) {
              }
            });
          }
          statusBar.setStatus2Uploaded("Stored locally");
          updateSyncState("Desktop app not detected; storing locally");
          return;
        }
        pushQueuePayloads(queuePayloads, trackingSnapshot);
      },
      /**
       * Attempt to flush the queue immediately. If an upload appears stuck beyond
       * the configured timeout, this will reset the uploading flag and retry.
       */
      flush: function() {
        const now = Date.now();
        if (!uploading) {
          process.nextTick(_upload);
          return;
        }
        const threshold = Math.max(2e4, Math.floor(requestTimeoutMs * 1.5));
        const since = Math.max(lastUploadStartTs || 0, lastProgressTs || 0);
        if (since && now - since > threshold) {
          try {
            log.debug(`flush(): detected stuck upload (> ${threshold} ms). Forcing retry...`);
          } catch (_) {
          }
          uploading = 0;
          process.nextTick(_upload);
        }
      },
      /**
       * Force desktop rediscovery now.
       */
      rediscover: async () => {
        await discoverDesktop(true);
      },
      refreshTrackingConfig: async (force) => {
        return fetchTrackingConfig(!!force);
      },
      /**
       * Expose a sync snapshot for UX.
       */
      getStatusSnapshot: () => buildStatusSnapshot(),
      getTrackingConfig: () => Object.assign({}, trackingConfig),
      queueLocalHistoryForDesktop: async () => {
        if (!historyStore || !historyStore.takeReportEvents) return { importedCount: 0 };
        const events = await historyStore.takeReportEvents();
        if (!events.length) return { importedCount: 0 };
        pushQueuePayloads(events.map((event) => normalizePayload(event)), Object.assign({}, trackingConfig));
        return { importedCount: events.length };
      },
      /**
       * Drain queued events immediately (reset backoff).
       */
      forceDrain: () => {
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }
        process.nextTick(_upload);
      }
    };
    async function _upload() {
      if (uploading)
        return;
      purgeExpiredQueue();
      if (!Q[0]) {
        localServer.activeCheckIsLocalServerStart();
        statusBar.setStatus2Nothing();
        updateSyncState(syncOnline ? "Online" : "Offline");
        return;
      }
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      uploading = 1;
      lastUploadStartTs = Date.now();
      const item = Q[0];
      const data = Object.assign({}, item.payload);
      const now = Date.now();
      if (item.createdAt && now - item.createdAt > MAX_QUEUE_AGE_MS) {
        Q.shift();
        persistQueue();
        uploading = 0;
        process.nextTick(_upload);
        return;
      }
      const ready = await ensureDesktopReady();
      if (!ready) {
        uploading = 0;
        const delay = computeRetryDelay(item.retryCount);
        item.retryCount += 1;
        persistQueue();
        updateSyncState("Desktop app not detected.");
        scheduleRetry(delay);
        return;
      }
      if (!(discovery && discovery.requiresToken === false)) {
        const tokenToUse = tokenInfo && tokenInfo.token ? tokenInfo.token : uploadToken;
        if (tokenToUse) data.token = tokenToUse;
      } else {
        try {
          delete /** @type {any} */
          data.token;
        } catch (_) {
        }
      }
      const sendData = normalizePayload(data);
      statusBar.setStatus2Uploading();
      const isAPIStyle = /api\//.test(uploadURL);
      const uploadOptions = {
        method: "POST",
        timeout: requestTimeoutMs,
        headers: isAPIStyle ? { ...uploadHeader } : { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" },
        // Treat all HTTP statuses as "handled" so we can inspect
        // 4xx/5xx bodies instead of throwing.
        validateStatus: () => true
      };
      const isDesktopUploadEndpoint = /api\/(?:queue\/)?upload/.test(uploadURL);
      if (isDesktopUploadEndpoint) {
        const desktopEvent = mapToDesktopEvent(sendData, item.trackingConfig || trackingConfig);
        uploadOptions.data = JSON.stringify({ contractVersion: "v2", events: [desktopEvent] });
        uploadOptions.headers = { ...uploadOptions.headers || {}, "Content-Type": "application/json; charset=utf-8" };
        if (bodySizeBytes(uploadOptions.data) > MAX_EVENT_SIZE_BYTES) {
          appendDeadLetter(item, 400, "payload-too-large");
          Q.shift();
          persistQueue();
          uploading = 0;
          updateSyncState("Dropped invalid event (size limit)");
          process.nextTick(_upload);
          return;
        }
      } else if (isAPIStyle) {
        uploadOptions.data = JSON.stringify(sendData);
      } else {
        const params = new URLSearchParams();
        Object.entries(
          /** @type {any} */
          sendData
        ).forEach(([k, v]) => {
          if (v !== void 0) params.append(k, String(v));
        });
        uploadOptions.data = params.toString();
      }
      const trustedSigned = await attachTrustedUploadHeaders(uploadURL, uploadOptions);
      if (isDebugMode) {
        const dump = JSON.stringify(uploadOptions, null, 2).split("\n").map((it) => `  ${it}`);
        log.debug(`Upload options:
${dump}`);
      }
      let success = true;
      let shouldDropCurrentItem = false;
      let returnObject = {};
      try {
        const res = await httpClient(Object.assign({ url: uploadURL }, uploadOptions));
        const { status, statusText, data: data2 } = res;
        if (status === 200 || status === 202 || status === 204 || status === 403 || status === 400 || status === 409) {
          if (data2 && typeof data2 === "object") returnObject = /** @type {any} */
          data2;
          else returnObject = {};
          if (returnObject && returnObject.error) {
            success = false;
            showErrorMessage(3, `Upload error: ${returnObject.error}`);
          } else if (status >= 400) {
            success = false;
            showErrorMessage(3, `Upload error: Response: ${status} (${statusText || "Bad Request"})`);
          }
          if (status === 400 && !success) shouldDropCurrentItem = true;
          if (status === 403 && trustedSigned && shouldSignTrustedUpload(uploadURL)) {
            await clearTrustedSource("trusted-rejected", true);
          }
        } else if (status === 401) {
          success = false;
          if (trustedSigned && shouldSignTrustedUpload(uploadURL)) {
            await clearTrustedSource("trusted-unauthorized", true);
          }
        } else if (status === 404) {
          const prev = uploadURL;
          if (currentEndpointIndex < endpointCandidates.length - 1) {
            currentEndpointIndex++;
            uploadURL = baseServerURL + endpointCandidates[currentEndpointIndex];
            log.debug(`Endpoint 404 (${statusText}). Switching endpoint: ${prev} -> ${uploadURL}`);
            log.debug(`Retrying with encoding: ${/api\//.test(uploadURL) ? "json" : "form"}`);
            setTimeout(_upload, 10);
            return;
          } else {
            success = false;
            showErrorMessage(2, `Upload error: Response: ${status} (${statusText}) - exhausted endpoint fallbacks`);
          }
        } else {
          success = false;
          showErrorMessage(2, `Upload error: Response: ${status} (${statusText})`);
        }
      } catch (err) {
        success = false;
        const anyErr = (
          /** @type {any} */
          err
        );
        const errMsg = anyErr && anyErr.stack ? anyErr.stack : anyErr && anyErr.message ? anyErr.message : String(err);
        localServer.detectOldSever_SoStartANewIfUnderLocalMode() || showErrorMessage(1, `Could not upload coding record: ${errMsg}`);
      }
      const errorMsg = returnObject && returnObject.error ? returnObject.error : void 0;
      statusBar.setStatus2Uploaded(errorMsg);
      uploading = 0;
      lastProgressTs = Date.now();
      if (!success) {
        if (shouldDropCurrentItem) {
          appendDeadLetter(item, 400, returnObject && returnObject.error ? String(returnObject.error) : "validation-failed");
          Q.shift();
          persistQueue();
          updateSyncState("Dropped invalid event (400)");
          process.nextTick(_upload);
          return;
        }
        syncOnline = false;
        updateSyncState("Desktop offline or upload failed");
        const delay = computeRetryDelay(item.retryCount);
        item.retryCount += 1;
        persistQueue();
        if (item.retryCount === 1 && isDebugMode) log.debug("Retrying upload soon...");
        scheduleRetry(delay);
      } else {
        syncOnline = true;
        updateSyncState("Online");
        Q.shift();
        persistQueue();
        hadShowError = 0;
        process.nextTick(_upload);
        log.debug("Uploaded success!");
      }
    }
    async function ensureDesktopReady() {
      const now = Date.now();
      if (!discovery || now - lastHandshakeAt > HANDSHAKE_MIN_INTERVAL_MS) {
        await discoverDesktop(false);
      }
      if (!discovery) {
        syncOnline = false;
        updateSyncState("Desktop app not detected");
        return false;
      }
      baseServerURL = normalizeApiBase(
        discovery.apiBaseUrl || discovery.publicBaseUrl || baseServerURL || fallbackBaseServerURL || ""
      );
      uploadURL = baseServerURL + endpointCandidates[currentEndpointIndex];
      await fetchTrackingConfig(false);
      await refreshEnforcementModeIfNeeded();
      if (discovery.requiresToken === false) {
        await ensureTrustedSourceReady();
        return true;
      }
      await ensureTrustedSourceReady();
      const tokenOk = await ensureTokenFresh();
      return !!tokenOk;
    }
    async function discoverDesktop(force) {
      const now = Date.now();
      if (!force && lastHandshakeAt && now - lastHandshakeAt < HANDSHAKE_MIN_INTERVAL_MS) return discovery;
      lastHandshakeAt = now;
      try {
        for (const candidate of getHandshakeCandidates()) {
          try {
            const res = await httpClient.get(candidate, { timeout: handshakeTimeoutMs });
            if (res && res.status >= 200 && res.status < 300 && res.data) {
              const body = (
                /** @type {any} */
                res.data
              );
              discovery = body;
              baseServerURL = normalizeApiBase(body.apiBaseUrl || body.publicBaseUrl || baseServerURL || fallbackBaseServerURL || "");
              if (!baseServerURL) {
                const parsed = new URL(candidate);
                const port = parsed.port || String(getDesktopPort());
                baseServerURL = `${parsed.protocol}//${parsed.hostname}:${port}/`;
              }
              currentEndpointIndex = 0;
              uploadURL = baseServerURL + endpointCandidates[currentEndpointIndex];
              if (globalState) await globalState.update(DESKTOP_DISCOVERY_KEY, discovery);
              await fetchTrackingConfig(true);
              syncOnline = true;
              desktopWarned = false;
              updateSyncState("Desktop detected");
              return discovery;
            }
          } catch (err) {
            if (isDebugMode) {
              const e = (
                /** @type {any} */
                err
              );
              try {
                log.debug("Desktop handshake failed", e && e.message ? e.message : e, "@", candidate);
              } catch (_) {
              }
            }
          }
        }
      } catch (err) {
        if (isDebugMode) {
          const e = (
            /** @type {any} */
            err
          );
          try {
            log.debug("Desktop handshake failed", e && e.message ? e.message : e);
          } catch (_) {
          }
        }
      }
      if (!discovery) {
        syncOnline = false;
        updateSyncState("Desktop app not detected");
        if (!desktopWarned) {
          desktopWarned = true;
          try {
            vscode.window.setStatusBarMessage("Desktop app not detected.", 4e3);
          } catch (_) {
          }
        }
      }
      return null;
    }
    async function fetchTrackingConfig(force) {
      const now = Date.now();
      if (!force && !shouldRefreshTrackingConfig(lastTrackingConfigFetchAt, now)) return trackingConfig;
      const base = baseServerURL || fallbackBaseServerURL;
      if (!base) return trackingConfig;
      lastTrackingConfigFetchAt = now;
      const url = ensureTrailingSlash(base) + "api/host/tracking-config";
      try {
        const res = await httpClient.get(url, { timeout: requestTimeoutMs });
        if (res && res.status >= 200 && res.status < 300 && res.data) {
          trackingConfig = sanitizeTrackingConfig(res.data);
          if (globalState) await globalState.update(TRACKING_CONFIG_KEY, trackingConfig);
        }
      } catch (err) {
        if (isDebugMode) {
          const e = (
            /** @type {any} */
            err
          );
          try {
            log.debug("Tracking config fetch failed", e && e.message ? e.message : e);
          } catch (_) {
          }
        }
      }
      return trackingConfig;
    }
    function ensureTrailingSlash(url) {
      if (!url) return "";
      return url.endsWith("/") ? url : url + "/";
    }
    function normalizeApiBase(url) {
      const base = ensureTrailingSlash(url || "");
      if (!base) return "";
      try {
        const parsed = new URL(base);
        const normalizedPath = (parsed.pathname || "/").replace(/\/+$/, "");
        if (normalizedPath.toLowerCase() === "/api") {
          parsed.pathname = "/";
          parsed.search = "";
          parsed.hash = "";
          return ensureTrailingSlash(parsed.toString());
        }
        return base;
      } catch (_) {
        return base.replace(/\/api\/?$/i, "/");
      }
    }
    function bodySizeBytes(body) {
      return toBodyBuffer(body).length;
    }
    function appendDeadLetter(item, status, reason) {
      if (!deadLetterFilePath || !item || !item.payload) return;
      try {
        const record = {
          recordedAt: (/* @__PURE__ */ new Date()).toISOString(),
          status,
          reason,
          retryCount: item.retryCount || 0,
          createdAt: item.createdAt || Date.now(),
          payload: item.payload
        };
        fs.appendFileSync(deadLetterFilePath, JSON.stringify(record) + "\n", "utf8");
      } catch (_) {
      }
    }
    async function primeTokenFromSecret() {
      if (!secretStorage || tokenInfo && tokenInfo.token) return;
      try {
        const stored = await secretStorage.get(DESKTOP_TOKEN_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.token) {
            tokenInfo = { token: parsed.token, expiresAt: parsed.expiresAt };
          }
        }
      } catch (_) {
      }
    }
    async function primeTrustedSourceFromSecret() {
      if (!secretStorage || trustedSource && trustedSource.sourceId && trustedSource.secret) return;
      try {
        const stored = await secretStorage.get(TRUSTED_SOURCE_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.sourceId === "string" && typeof parsed.secret === "string") {
          trustedSource = {
            sourceId: parsed.sourceId,
            secret: parsed.secret,
            baseOrigin: typeof parsed.baseOrigin === "string" ? parsed.baseOrigin : void 0
          };
        }
      } catch (_) {
      }
    }
    async function persistToken() {
      if (!secretStorage || !tokenInfo || !tokenInfo.token) return;
      try {
        await secretStorage.store(DESKTOP_TOKEN_KEY, JSON.stringify(tokenInfo));
      } catch (_) {
      }
    }
    async function persistTrustedSource() {
      if (!secretStorage || !trustedSource || !trustedSource.sourceId || !trustedSource.secret) return;
      try {
        await secretStorage.store(TRUSTED_SOURCE_KEY, JSON.stringify(trustedSource));
      } catch (_) {
      }
    }
    async function clearToken(reason) {
      void reason;
      tokenInfo = null;
      if (secretStorage) {
        try {
          await secretStorage.delete(DESKTOP_TOKEN_KEY);
        } catch (_) {
        }
      }
    }
    async function clearTrustedSource(reason, purgeStored) {
      void reason;
      trustedSource = null;
      lastTrustedEnrollAt = 0;
      if (purgeStored && secretStorage) {
        try {
          await secretStorage.delete(TRUSTED_SOURCE_KEY);
        } catch (_) {
        }
      }
    }
    function parseExpires(at) {
      try {
        if (!at) return void 0;
        if (typeof at === "number") return at;
        const t = Date.parse(String(at));
        return isNaN(t) ? void 0 : t;
      } catch (_) {
        return void 0;
      }
    }
    async function ensureTokenFresh() {
      await primeTokenFromSecret();
      if (tokenInfo && tokenInfo.expiresAt) {
        const remaining = tokenInfo.expiresAt - Date.now();
        if (remaining > TOKEN_REFRESH_WINDOW_MS) return true;
      }
      if (tokenInfo && tokenInfo.token) {
        const refreshed = await refreshToken(tokenInfo.token);
        if (refreshed === "invalid") return false;
        if (refreshed) return true;
      }
      const requested = await requestNewToken();
      return requested;
    }
    async function refreshToken(token) {
      const base = baseServerURL || fallbackBaseServerURL;
      if (!base) return false;
      const url = ensureTrailingSlash(base) + TOKEN_REFRESH_PATH;
      try {
        const res = await httpClient.get(url, { params: { token }, timeout: requestTimeoutMs });
        if (res && res.status === 404) {
          await clearToken("refresh-404");
          try {
            vscode.window.showWarningMessage("SlashCoded: Desktop token expired. Requesting a new token...");
          } catch (_) {
          }
          return "invalid";
        }
        if (res && res.status >= 200 && res.status < 300 && res.data && res.data.token) {
          tokenInfo = { token: res.data.token, expiresAt: parseExpires(res.data.expiresAt) };
          await persistToken();
          return true;
        }
      } catch (err) {
        if (isDebugMode) {
          const e = (
            /** @type {any} */
            err
          );
          try {
            log.debug("Token refresh failed", e && e.message ? e.message : e);
          } catch (_) {
          }
        }
      }
      return false;
    }
    async function requestNewToken() {
      const base = baseServerURL || fallbackBaseServerURL;
      if (!base) return !!uploadToken;
      const url = ensureTrailingSlash(base) + TOKEN_REQUEST_PATH;
      try {
        const payload = { clientId: EXTENSION_CLIENT_ID, clientType: "extension", machineId: machineId || require("os").hostname() };
        const res = await httpClient.post(url, payload, { timeout: requestTimeoutMs });
        if (res && res.status >= 200 && res.status < 300 && res.data && res.data.token) {
          tokenInfo = { token: res.data.token, expiresAt: parseExpires(res.data.expiresAt) };
          await persistToken();
          return true;
        }
      } catch (err) {
        if (isDebugMode) {
          const e = (
            /** @type {any} */
            err
          );
          try {
            log.debug("Token request failed", e && e.message ? e.message : e);
          } catch (_) {
          }
        }
      }
      return !!uploadToken;
    }
    function getBaseOrigin() {
      try {
        const base = baseServerURL || fallbackBaseServerURL;
        if (!base) return "";
        return new URL(base).origin;
      } catch (_) {
        return "";
      }
    }
    async function ensureTrustedSourceReady() {
      await primeTrustedSourceFromSecret();
      const base = baseServerURL || fallbackBaseServerURL;
      if (!base) return false;
      const now = Date.now();
      const baseOrigin = getBaseOrigin();
      if (trustedSource && trustedSource.sourceId && trustedSource.secret && (!trustedSource.baseOrigin || trustedSource.baseOrigin === baseOrigin)) {
        return true;
      }
      if (now - lastTrustedEnrollAt < TRUST_ENROLL_MIN_INTERVAL_MS) return false;
      lastTrustedEnrollAt = now;
      const url = ensureTrailingSlash(base) + TRUST_REGISTER_PATH;
      try {
        const payload = {
          clientId: EXTENSION_CLIENT_ID,
          clientType: "vscode",
          machineId: machineId || require("os").hostname(),
          displayName: EXTENSION_DISPLAY_NAME
        };
        const res = await httpClient.post(url, payload, { timeout: requestTimeoutMs, validateStatus: () => true });
        if (res && res.status >= 200 && res.status < 300 && res.data && res.data.sourceId && res.data.secret) {
          trustedSource = {
            sourceId: String(res.data.sourceId),
            secret: String(res.data.secret),
            baseOrigin
          };
          await persistTrustedSource();
          return true;
        }
        if (isDebugMode) {
          try {
            log.debug(`[trusted-upload] source registration skipped: HTTP ${res ? res.status : "unknown"}`);
          } catch (_) {
          }
        }
      } catch (err) {
        if (isDebugMode) {
          const e = (
            /** @type {any} */
            err
          );
          try {
            log.debug("[trusted-upload] source registration failed", e && e.message ? e.message : e);
          } catch (_) {
          }
        }
      }
      return false;
    }
    async function refreshEnforcementModeIfNeeded() {
      const now = Date.now();
      if (enforcementMode && now - lastEnforcementCheckAt < ENFORCEMENT_REFRESH_MS) return enforcementMode;
      const base = baseServerURL || fallbackBaseServerURL;
      if (!base) return null;
      const url = ensureTrailingSlash(base) + ENFORCEMENT_PATH;
      try {
        const res = await httpClient.get(url, { timeout: requestTimeoutMs, validateStatus: () => true });
        if (res && res.status >= 200 && res.status < 300 && res.data && typeof res.data.mode === "string") {
          const mode = String(res.data.mode).toLowerCase();
          enforcementMode = mode === "enforce" ? "enforce" : "audit";
          lastEnforcementCheckAt = now;
          return enforcementMode;
        }
      } catch (_) {
      }
      lastEnforcementCheckAt = now;
      return enforcementMode;
    }
    function shouldSignTrustedUpload(targetUrl) {
      try {
        const u = new URL(targetUrl);
        return /^\/api\/(?:queue\/)?upload\/?$/i.test(u.pathname || "");
      } catch (_) {
        return false;
      }
    }
    function toBodyBuffer(body) {
      if (Buffer.isBuffer(body)) return body;
      if (typeof body === "string") return Buffer.from(body, "utf8");
      if (body instanceof URLSearchParams) return Buffer.from(body.toString(), "utf8");
      if (body === void 0 || body === null) return Buffer.from("", "utf8");
      return Buffer.from(JSON.stringify(body), "utf8");
    }
    async function attachTrustedUploadHeaders(targetUrl, options) {
      if (!shouldSignTrustedUpload(targetUrl)) return false;
      const ready = await ensureTrustedSourceReady();
      if (!ready || !trustedSource || !trustedSource.sourceId || !trustedSource.secret) {
        if (isDebugMode) {
          try {
            log.debug("[trusted-upload] signing skipped: source not enrolled");
          } catch (_) {
          }
        }
        return false;
      }
      const body = toBodyBuffer(options.data);
      const timestamp = String(Date.now());
      const nonce = crypto.randomBytes(16).toString("hex");
      let pathOnly = "/";
      try {
        pathOnly = new URL(targetUrl).pathname || "/";
      } catch (_) {
      }
      const method = (options.method || "POST").toUpperCase();
      const bodyHash = crypto.createHash("sha256").update(body).digest("base64");
      const signatureBase = `${method}
${pathOnly}
${timestamp}
${nonce}
${bodyHash}`;
      const signature = crypto.createHmac("sha256", trustedSource.secret).update(signatureBase).digest("base64");
      if (!options.headers) options.headers = {};
      options.headers["X-Sc-Source-Id"] = trustedSource.sourceId;
      options.headers["X-Sc-Timestamp"] = timestamp;
      options.headers["X-Sc-Nonce"] = nonce;
      options.headers["X-Sc-Signature"] = signature;
      return true;
    }
    function normalizePayload(data) {
      const send = Object.assign({}, data);
      if (!send.date) {
        try {
          const d = new Date(send.time);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          send.date = `${y}-${m}-${day}`;
        } catch (_) {
        }
      }
      ["proj", "r1", "r2", "command", "cwd"].forEach((k) => {
        const s = (
          /** @type {any} */
          send
        );
        if (Object.prototype.hasOwnProperty.call(s, k) && s[k] === "") s[k] = null;
      });
      return send;
    }
    function showErrorMessage(id, error) {
      const msg = typeof error === "string" ? error : error && /** @type {any} */
      error.message ? (
        /** @type {any} */
        error.message
      ) : String(error);
      log.error(msg);
      if (hadShowError == id)
        return;
      hadShowError = id;
      ext.showSingleErrorMsg(msg);
    }
    module2.exports = uploader;
  }
});

// lib/thirdPartyCodes/gitPaths.js
var require_gitPaths = __commonJS({
  "lib/thirdPartyCodes/gitPaths.js"(exports2, module2) {
    var vscode = require("vscode");
    var log = require_Log();
    var { spawn, exec } = require("child_process");
    var fs = require("fs");
    var path = require("path");
    var logger = { logInfo: log.debug, logError: log.error };
    var gitPath;
    module2.exports = {
      getGitBranch,
      getGitPath,
      getGitRepositoryPath
    };
    function getGitPath() {
      if (gitPath !== void 0) {
        return Promise.resolve(gitPath);
      }
      return new Promise((resolve) => {
        const gitPathConfig = vscode.workspace.getConfiguration("git").get("path");
        if (typeof gitPathConfig === "string" && gitPathConfig.length > 0) {
          if (fs.existsSync(gitPathConfig)) {
            logger.logInfo(`git path: ${gitPathConfig} - from vscode settings`);
            gitPath = gitPathConfig;
            resolve(gitPathConfig);
            return;
          }
          logger.logError(`git path: ${gitPathConfig} - from vscode settings in invalid`);
        }
        if (process.platform !== "win32") {
          logger.logInfo(`git path: using PATH environment variable`);
          gitPath = "git";
          resolve("git");
          return;
        }
        const regQueryInstallPath = (location) => {
          return new Promise((resolveRegistry, rejectRegistry) => {
            const handleResult = (error, stdout, stderr) => {
              if (error) {
                error.stdout = stdout;
                error.stderr = stderr;
                rejectRegistry(error);
                return;
              }
              const match = stdout.match(/InstallPath\s+REG_SZ\s+([^\r\n]+)\s*\r?\n/i);
              if (match && match[1]) {
                resolveRegistry(`${match[1]}\\bin\\git`);
                return;
              }
              rejectRegistry(new Error("git install path not found in registry output"));
            };
            let viewArg = "";
            switch (location.view) {
              case "64":
                viewArg = "/reg:64";
                break;
              case "32":
                viewArg = "/reg:32";
                break;
              default:
                break;
            }
            exec(`reg query ${location.key} ${viewArg}`.trim(), { encoding: "utf8" }, handleResult);
          });
        };
        const queryChained = (locations) => {
          return new Promise((resolveChain, rejectChain) => {
            if (locations.length === 0) {
              rejectChain(new Error("None of the known git Registry keys were found"));
              return;
            }
            const [current, ...rest] = locations;
            regQueryInstallPath(current).then(resolveChain, () => {
              queryChained(rest).then(resolveChain, rejectChain);
            });
          });
        };
        queryChained([
          { key: "HKCU\\SOFTWARE\\GitForWindows", view: null },
          // user keys have precedence over
          { key: "HKLM\\SOFTWARE\\GitForWindows", view: null },
          // machine keys
          { key: "HKCU\\SOFTWARE\\GitForWindows", view: "64" },
          // default view (null) before 64bit view
          { key: "HKLM\\SOFTWARE\\GitForWindows", view: "64" },
          { key: "HKCU\\SOFTWARE\\GitForWindows", view: "32" },
          // last is 32bit view, which will only be checked
          { key: "HKLM\\SOFTWARE\\GitForWindows", view: "32" }
        ]).then((pathFromRegistry) => {
          logger.logInfo(`git path: ${pathFromRegistry} - from registry`);
          gitPath = pathFromRegistry;
          resolve(pathFromRegistry);
        }).catch(() => {
          logger.logInfo(`git path: falling back to PATH environment variable`);
          gitPath = "git";
          resolve("git");
        });
      });
    }
    function getGitRepositoryPath(fileName = "") {
      return new Promise((resolve, reject) => {
        getGitPath().then((gitPath2) => {
          const directory = fs.existsSync(fileName) && fs.statSync(fileName).isDirectory() ? fileName : path.dirname(fileName);
          const options = { cwd: directory };
          const args = ["rev-parse", "--show-toplevel"];
          const ls = spawn(gitPath2, args, options);
          let repoPath = "";
          let error = "";
          ls.stdout.on("data", (data) => {
            repoPath += data.toString();
          });
          ls.stderr.on("data", (data) => {
            error += data.toString();
          });
          ls.on("error", function(error2) {
            logger.logError(error2);
            reject(error2);
            return;
          });
          ls.on("close", function() {
            if (error.length > 0) {
              logger.logInfo(error);
              return resolve(null);
            }
            let repositoryPath = repoPath.trim();
            if (!path.isAbsolute(repositoryPath)) {
              repositoryPath = path.join(path.dirname(fileName), repositoryPath);
            }
            logger.logInfo("git repo path: " + repositoryPath);
            resolve(repositoryPath);
          });
        }).catch(reject);
      });
    }
    function getGitBranch(repoPath = "") {
      return new Promise((resolve, reject) => {
        getGitPath().then((gitPath2) => {
          const options = { cwd: repoPath };
          const args = ["rev-parse", "--abbrev-ref", "HEAD"];
          let branch = "";
          let error = "";
          const ls = spawn(gitPath2, args, options);
          ls.stdout.on("data", function(data) {
            branch += data.toString().slice(0, -1);
          });
          ls.stderr.on("data", function(data) {
            error += data.toString();
          });
          ls.on("error", function(error2) {
            logger.logError(error2);
            reject(error2);
            return;
          });
          ls.on("close", function() {
            if (error.length > 0) {
              logger.logError(error);
            }
            resolve(branch);
          });
        }).catch(reject);
      });
    }
  }
});

// lib/vcs/Git.js
var require_Git = __commonJS({
  "lib/vcs/Git.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var vscode = require("vscode");
    var log = require_Log();
    var git = require_gitPaths();
    var CACHE_REPO = 5 * 60 * 1e3;
    var CACHE_BRANCH = 30 * 1e3;
    var cacheRepo = {};
    var cacheBranch = {};
    var gitApiPromise;
    module2.exports = { getVCSInfo };
    function queryCache(cacheMap, key) {
      if (!key || !cacheMap[key]) return void 0;
      const now = Date.now();
      const entry = cacheMap[key];
      if (entry.expiredTime < now) {
        delete cacheMap[key];
        return void 0;
      }
      return entry.cache;
    }
    function addCache(cacheMap, key, cacheValue, ttl) {
      if (!key || typeof cacheValue !== "string") return;
      cacheMap[key] = { cache: cacheValue, expiredTime: Date.now() + ttl };
    }
    function addRepoCache(fileName, repoCache) {
      addCache(cacheRepo, fileName, repoCache, CACHE_REPO);
    }
    function addBranchCache(repoPath, branchCache) {
      addCache(cacheBranch, repoPath, branchCache, CACHE_BRANCH);
    }
    function getRepoPath(documentFileName) {
      return new Promise((resolve, reject) => {
        const cached = queryCache(cacheRepo, documentFileName);
        if (cached) return resolve(cached);
        git.getGitRepositoryPath(documentFileName).then((repoPath) => {
          addRepoCache(documentFileName, repoPath);
          resolve(repoPath);
        }).catch(reject);
      });
    }
    function getBranch(repoPath) {
      return new Promise((resolve, reject) => {
        const cached = queryCache(cacheBranch, repoPath);
        if (cached) return resolve(cached);
        git.getGitBranch(repoPath).then((branch) => {
          addBranchCache(repoPath, branch);
          resolve(branch);
        }).catch(reject);
      });
    }
    function getGitExtensionAPI() {
      if (gitApiPromise !== void 0) return gitApiPromise;
      const gitExtension = vscode.extensions.getExtension("vscode.git");
      if (!gitExtension) {
        gitApiPromise = Promise.resolve(void 0);
        return gitApiPromise;
      }
      gitApiPromise = Promise.resolve(gitExtension.activate()).then(() => gitExtension.exports && typeof gitExtension.exports.getAPI === "function" ? gitExtension.exports.getAPI(1) : void 0).catch((error) => {
        log.error("failed to activate vscode.git extension", error);
        return void 0;
      });
      return gitApiPromise;
    }
    function isPathInside(parent, child) {
      if (!parent || !child) return false;
      const relative = path.relative(parent, child);
      return relative === "" || !relative.startsWith(".." + path.sep) && !relative.startsWith("..") && !path.isAbsolute(relative);
    }
    function encodeRepoFromApi(repository) {
      const head = repository.state && repository.state.HEAD;
      const branch = head && (head.name || head.commit) || "unknown";
      const upstreamRemote = head && head.upstream && head.upstream.remote;
      const remotes = repository.state && repository.state.remotes || [];
      let repoUrl;
      if (upstreamRemote) {
        const remote = remotes.find((r) => r.name === upstreamRemote);
        if (remote) repoUrl = remote.fetchUrl || remote.pushUrl;
      }
      if (!repoUrl && remotes.length) {
        const remote = remotes[0];
        repoUrl = remote.fetchUrl || remote.pushUrl;
      }
      if (!repoUrl) {
        repoUrl = repository.rootUri.fsPath;
      }
      log.debug(`got vcs info from vscode.git: git(repo: ${repoUrl})(branch: ${branch})
    document: ${repository.rootUri.fsPath}`);
      return ["git", repoUrl, branch];
    }
    function getRepoInfoFromVsCodeGit(documentFileName) {
      return getGitExtensionAPI().then((api) => {
        if (!api || !api.repositories || api.repositories.length === 0) return void 0;
        const resolvedPath = path.resolve(documentFileName);
        const repo = api.repositories.find((repository) => {
          const repoRoot = repository.rootUri.fsPath;
          return isPathInside(repoRoot, resolvedPath);
        });
        if (!repo) return void 0;
        return encodeRepoFromApi(repo);
      }).catch((error) => {
        log.error("failed to get repo info from vscode.git", error);
        return void 0;
      });
    }
    function getVCSInfo(documentFileName) {
      const NO_VCS_INFO = Promise.resolve(void 0);
      if (!documentFileName || !fs.existsSync(documentFileName))
        return NO_VCS_INFO;
      return getRepoInfoFromVsCodeGit(documentFileName).then((vcs) => {
        if (vcs) return vcs;
        return getRepoPath(documentFileName).then((repoPath) => {
          if (!repoPath) return NO_VCS_INFO;
          return getBranch(repoPath).then((branch) => encodeVCSInfo(documentFileName, repoPath, branch));
        });
      }).catch((error) => {
        log.error("get vcs info error:", documentFileName, error);
        return NO_VCS_INFO;
      });
    }
    function encodeVCSInfo(fileName, repoPath, branch) {
      if (!repoPath) {
        log.debug(`Can not find any vcs info of document: ${fileName}`);
        return null;
      }
      if (!branch) {
        log.warn(`The vcs "${repoPath}" has not branch information!`);
        return null;
      }
      log.debug(`got vcs info: git(repo: ${repoPath})(branch: ${branch})
    document: ${fileName}`);
      return ["git", repoPath, branch];
    }
  }
});

// lib/UploadObject.js
var require_UploadObject = __commonJS({
  "lib/UploadObject.js"(exports2, module2) {
    var vscode = require("vscode");
    var helper = require_VSCodeHelper();
    var vcsGit = require_Git();
    var log = require_Log();
    var { isDebugMode } = require_Constants();
    var VSCODE_SETTINGS = "vscode-settings";
    var VSCODE_INTERACTIVE_PLAYGROUND = "vscode-interactive-playground";
    var UNKNOWN = "unknown";
    var lastActiveProject = UNKNOWN;
    var baseUploadObject = {
      version: "4.0",
      token: "This value will be set up in Uploader module",
      type: "",
      time: 0,
      long: 0,
      lang: "",
      file: "",
      proj: "",
      vcs_type: "",
      vcs_repo: "",
      vcs_branch: "",
      line: 0,
      char: 0,
      r1: "1",
      r2: ""
    };
    module2.exports = { init, generateOpen, generateCode, generateTerminal, generateChat };
    function init() {
      lastActiveProject = vscode.workspace.rootPath || UNKNOWN;
      return baseUploadObject;
    }
    function generateOpen(activeDocument, time, long) {
      return generate("open", activeDocument, time, long);
    }
    function generateCode(activeDocument, time, long) {
      return generate("code", activeDocument, time, long);
    }
    function generate(type, activeDocument, time, long) {
      const obj = Object.assign({}, baseUploadObject);
      const uri = activeDocument.uri;
      const fileName = activeDocument.fileName;
      obj.type = type;
      obj.proj = helper.getWhichProjectDocumentBelongsTo(activeDocument, lastActiveProject);
      obj.file = uri.scheme;
      obj.lang = activeDocument.languageId;
      switch (uri.scheme) {
        case "file":
          obj.file = vscode.workspace.asRelativePath(uri.fsPath, false);
          obj.lang = activeDocument.languageId;
          break;
        case "vscode":
          if (uri.authority == "defaultsettings") {
            obj.file = VSCODE_SETTINGS;
            obj.lang = VSCODE_SETTINGS;
          } else if (isDebugMode) {
            vscode.window.showInformationMessage(`Unknown authority in vscode scheme: ${uri.toString()}`);
          }
          break;
        case "walkThroughSnippet":
          if (isDebugMode && !uri.path.endsWith("vs_code_editor_walkthrough.md"))
            vscode.window.showWarningMessage(`Invalid vscode interactive playground uri: ${uri.toString()}`);
          obj.file = VSCODE_INTERACTIVE_PLAYGROUND;
          obj.lang = VSCODE_INTERACTIVE_PLAYGROUND;
          break;
      }
      obj.time = time;
      obj.long = long;
      obj.line = activeDocument.lineCount;
      obj.char = 0;
      if (activeDocument.isUntitled) {
        log.debug(`generated upload object(no vcs) (${dumpUploadObject(obj)}): `);
        return Promise.resolve(obj);
      }
      return vcsGit.getVCSInfo(fileName).then((vcs) => {
        if (vcs) {
          obj.vcs_type = vcs[0];
          obj.vcs_repo = vcs[1];
          obj.vcs_branch = vcs[2];
        }
        log.debug(`generated upload object (${dumpUploadObject(obj)}): `);
        return obj;
      });
    }
    function dumpUploadObject(obj) {
      return `${obj.type} from ${obj.time} long ${obj.long}; ${obj.file}(${obj.lang}; line: ${obj.line}}); vcs: ${obj.vcs_type}:${obj.vcs_repo}:${obj.vcs_branch}`;
    }
    function generateTerminal(name, time, long) {
      const obj = createActivity("terminal", "", time, long, "");
      return resolveVcsInfo(obj, lastActiveProject);
    }
    function generateChat(provider, sessionId, time, long, promptChars, responseChars) {
      const obj = createActivity("chat", "", time, long, "");
      obj.r1 = sessionId ? String(sessionId) : "";
      obj.r2 = `${normalizeToNumber(promptChars)},${normalizeToNumber(responseChars)}`;
      return resolveVcsInfo(obj, lastActiveProject);
    }
    function createActivity(type, file, time, long, lang) {
      const obj = Object.assign({}, baseUploadObject);
      obj.type = type;
      obj.time = time;
      obj.long = long;
      obj.lang = typeof lang === "string" ? lang : "";
      obj.file = typeof file === "string" ? file : "";
      obj.proj = lastActiveProject;
      obj.line = 0;
      obj.char = 0;
      obj.r1 = type === "chat" ? "" : "1";
      obj.r2 = "";
      return obj;
    }
    function normalizeToNumber(value) {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : 0;
    }
    function resolveVcsInfo(obj, anchorPath) {
      const fallback = () => {
        obj.vcs_type = "none";
        obj.vcs_repo = "none";
        obj.vcs_branch = "none";
        return obj;
      };
      if (!anchorPath || anchorPath === UNKNOWN) return Promise.resolve(fallback());
      return vcsGit.getVCSInfo(anchorPath).then((vcs) => {
        if (Array.isArray(vcs)) {
          obj.vcs_type = vcs[0] || "none";
          obj.vcs_repo = vcs[1] || "none";
          obj.vcs_branch = vcs[2] || "none";
        } else {
          fallback();
        }
        return obj;
      }).catch(() => fallback());
    }
  }
});

// lib/core/runtime.js
var require_runtime = __commonJS({
  "lib/core/runtime.js"(exports2, module2) {
    "use strict";
    var { createDefaultTrackingConfig } = require_hostTiming();
    var SECOND = 1e3;
    var CODING_SHORTEST_UNIT_MS = 5 * SECOND;
    var AT_LEAST_WATCHING_TIME = 5 * SECOND;
    var MAX_ALLOW_NOT_INTENTLY_MS = 60 * SECOND;
    var MAX_CODING_WAIT_TIME = 30 * SECOND;
    var AFK_TIMEOUT_MS = 15 * 60 * SECOND;
    var TERMINAL_REENTRY_COOLDOWN_MS = 2e3;
    var INVALID_CODING_DOCUMENT_SCHEMES = [
      "git-index",
      "git",
      "output",
      "input",
      "private",
      "markdown"
    ];
    var EMPTY = { document: null, textEditor: null };
    function noop() {
      return void 0;
    }
    function createInitialState() {
      const initialTrackingConfig = createDefaultTrackingConfig();
      return {
        // configuration-driven flags
        moreThinkingTimeMs: 0,
        trackTerminal: true,
        trackAIChat: true,
        trackAFK: true,
        afkTimeoutMs: initialTrackingConfig.idleThresholdSeconds * SECOND,
        segmentDurationMs: initialTrackingConfig.segmentDurationSeconds * SECOND,
        hostTrackingConfig: initialTrackingConfig,
        // editor/window state
        /** @type {import('vscode').TextDocument|null} */
        activeDocument: null,
        /** @type {('chat'|'terminal'|null)} */
        exclusiveMode: null,
        windowFocused: true,
        // AFK tracking
        lastUserActivity: 0,
        isAFK: false,
        /** @type {ReturnType<typeof setInterval>|null} */
        afkCheckTimer: null,
        // open/coding tracking
        trackData: {
          openTime: 0,
          lastIntentlyTime: 0,
          firstCodingTime: 0,
          codingLong: 0,
          lastCodingTime: 0
        },
        logModeTransitions: false,
        lastReportedMode: null,
        lastReportedReason: "",
        // terminal tracking
        /** @type {import('vscode').Terminal|null} */
        activeTerminal: null,
        terminalOpenTime: 0,
        /** @type {ReturnType<typeof setInterval>|null} */
        terminalPollHandle: null,
        terminalExclusiveActive: false,
        terminalReentrySuppressedUntil: 0,
        // chat tracking
        /** @type {ReturnType<typeof setInterval>|null} */
        chatPollHandle: null,
        lastChatEnumLog: 0,
        chatCommandFocusUntil: 0,
        heuristicChatActive: false,
        // initialized by chat tracker
        chat: {
          pauseAll: (
            /** @type {(now:number)=>void} */
            noop
          ),
          resumeAll: (
            /** @type {(now:number)=>void} */
            noop
          ),
          stopHeuristicSession: (
            /** @type {(reason?:string, preserveExclusive?:boolean)=>void} */
            noop
          )
        }
      };
    }
    function normalizeStart(start, duration) {
      try {
        if (typeof start === "number" && start > 0) return start;
      } catch (_) {
      }
      return Date.now() - (typeof duration === "number" && duration > 0 ? duration : 0);
    }
    module2.exports = {
      SECOND,
      CODING_SHORTEST_UNIT_MS,
      AT_LEAST_WATCHING_TIME,
      MAX_ALLOW_NOT_INTENTLY_MS,
      MAX_CODING_WAIT_TIME,
      AFK_TIMEOUT_MS,
      TERMINAL_REENTRY_COOLDOWN_MS,
      INVALID_CODING_DOCUMENT_SCHEMES,
      EMPTY,
      createInitialState,
      normalizeStart
    };
  }
});

// lib/core/installErrorHooks.js
var require_installErrorHooks = __commonJS({
  "lib/core/installErrorHooks.js"(exports2, module2) {
    "use strict";
    function installErrorHooks(log) {
      const hookFlag = Symbol.for("slashCoded.errorHookInstalled");
      const sharedScope = (
        /** @type {{ [key: symbol]: unknown }} */
        /** @type {unknown} */
        global
      );
      if (sharedScope[hookFlag]) return;
      sharedScope[hookFlag] = true;
      const uncaughtHandler = (err) => {
        try {
          const maybeStack = (
            /** @type {{stack?: unknown}} */
            err
          );
          const stack = maybeStack && typeof maybeStack.stack === "string" ? maybeStack.stack : String(err);
          log.error(`[uncaughtException] ${stack}`);
        } catch (loggingError) {
          console.error("[uncaughtException]", err, "(logging failed:", loggingError, ")");
        }
      };
      process.on("uncaughtException", uncaughtHandler);
      const unhandledHandler = (reason, promise) => {
        void promise;
        try {
          const maybeStack = (
            /** @type {{stack?: unknown}} */
            reason
          );
          const stack = maybeStack && typeof maybeStack.stack === "string" ? maybeStack.stack : String(reason);
          log.error(`[unhandledRejection] ${stack}`);
        } catch (loggingError) {
          console.error("[unhandledRejection]", reason, "(logging failed:", loggingError, ")");
        }
      };
      process.on("unhandledRejection", unhandledHandler);
    }
    module2.exports = { installErrorHooks };
  }
});

// lib/core/modeController.js
var require_modeController = __commonJS({
  "lib/core/modeController.js"(exports2, module2) {
    "use strict";
    var runtime = require_runtime();
    var outLog = require_OutputChannelLog();
    function determineModeInfo(state, now) {
      if (state.isAFK) return { mode: "afk", reason: "isAFK" };
      if (state.heuristicChatActive) return { mode: "chat", reason: "heuristic chat active" };
      try {
        state.chat.stopHeuristicSession("coding-activity");
      } catch (_) {
      }
      if (state.exclusiveMode === "chat" || state.chatCommandFocusUntil > now && state.exclusiveMode !== "terminal") {
        return { mode: "chat", reason: "exclusive chat" };
      }
      if (state.exclusiveMode === "terminal" || state.terminalExclusiveActive) {
        return { mode: "terminal", reason: "exclusive terminal" };
      }
      if (state.trackData.firstCodingTime && state.trackData.lastCodingTime && now - state.trackData.lastCodingTime <= runtime.MAX_CODING_WAIT_TIME + 2e3) {
        return { mode: "coding", reason: "coding activity" };
      }
      if (!state.windowFocused) return { mode: null, reason: "window unfocused" };
      if (state.activeDocument) return { mode: "watching", reason: "active document" };
      return { mode: null, reason: "idle" };
    }
    function logModeTransition(state, modeInfo, now) {
      if (!state.logModeTransitions) return;
      if (state.lastReportedMode === modeInfo.mode && state.lastReportedReason === modeInfo.reason) return;
      state.lastReportedMode = modeInfo.mode;
      state.lastReportedReason = modeInfo.reason;
      const chatFocusMs = modeInfo.mode === "chat" ? Math.max(0, state.chatCommandFocusUntil - now) : 0;
      const docName = state.activeDocument ? state.activeDocument.fileName || state.activeDocument.uri && state.activeDocument.uri.path || "<doc>" : "none";
      const details = [
        `mode=${modeInfo.mode || "none"}`,
        `reason=${modeInfo.reason}`,
        `exclusive=${state.exclusiveMode || "none"}`,
        `terminalExclusive=${!!state.terminalExclusiveActive}`,
        `heuristicChat=${!!state.heuristicChatActive}`,
        `chatFocusHold=${chatFocusMs}ms`,
        `windowFocused=${!!state.windowFocused}`,
        `terminalActive=${!!state.activeTerminal}`,
        `document=${docName}`
      ].join(" ");
      outLog.debug(`[mode] ${details}`);
    }
    function updateModeBasedOnState(deps) {
      const { statusBar, state } = deps;
      if (!statusBar || typeof statusBar.setMode !== "function") return;
      const now = Date.now();
      const modeInfo = determineModeInfo(state, now);
      statusBar.setMode(modeInfo.mode);
      logModeTransition(state, modeInfo, now);
    }
    function refreshStatusBarMode(deps) {
      try {
        updateModeBasedOnState(deps);
      } catch (_) {
      }
    }
    module2.exports = {
      updateModeBasedOnState,
      refreshStatusBarMode
    };
  }
});

// lib/core/configuration.js
var require_configuration = __commonJS({
  "lib/core/configuration.js"(exports2, module2) {
    "use strict";
    var runtime = require_runtime();
    var { DEFAULT_IDLE_THRESHOLD_SECONDS } = require_hostTiming();
    async function updateConfigurations(deps) {
      const { ext, uploader, log, statusBar, localServer, uploadObject, state, applyAfkConfig } = deps;
      const extensionCfg = ext.getConfig("slashCoded");
      const storageMode = extensionCfg.get("storageMode") === "standalone" ? "standalone" : "auto";
      const enableStatusBar = extensionCfg.get("showStatus");
      const configuredServer = `http://127.0.0.1:${process.env.SLASHCODED_DESKTOP_PORT || 5292}/`;
      state.trackTerminal = extensionCfg.get("shouldTrackTerminal") !== false;
      state.trackAIChat = extensionCfg.get("shouldTrackAIChat") !== false;
      const afkEnabled = extensionCfg.get("afkEnabled") !== false;
      const idleThresholdSeconds = state.hostTrackingConfig && state.hostTrackingConfig.idleThresholdSeconds ? state.hostTrackingConfig.idleThresholdSeconds : DEFAULT_IDLE_THRESHOLD_SECONDS;
      const afkTimeoutMs = idleThresholdSeconds * runtime.SECOND;
      state.trackAFK = afkEnabled;
      state.afkTimeoutMs = afkTimeoutMs;
      state.moreThinkingTimeMs = 0;
      uploader.set(configuredServer, "", void 0);
      try {
        uploader.setStorageMode(storageMode);
      } catch (e) {
        log.debug("Failed to set storageMode on uploader", e);
      }
      const timeoutCfgRaw = extensionCfg.get("uploadTimeoutMs");
      if (typeof timeoutCfgRaw === "number") {
        if (timeoutCfgRaw > 0) {
          try {
            uploader.configureTimeout(timeoutCfgRaw);
          } catch (err) {
            log.debug("Failed to configure timeout: " + err);
          }
        }
      } else if (typeof timeoutCfgRaw === "string") {
        const timeoutCfg = parseInt(timeoutCfgRaw, 10);
        if (!isNaN(timeoutCfg) && timeoutCfg > 0) {
          try {
            uploader.configureTimeout(timeoutCfg);
          } catch (err) {
            log.debug("Failed to configure timeout: " + err);
          }
        }
      }
      const discoveryTimeoutRaw = extensionCfg.get("desktopDiscoveryTimeoutMs");
      if (typeof discoveryTimeoutRaw === "number" && discoveryTimeoutRaw > 0) {
        try {
          uploader.configureDiscoveryTimeout(discoveryTimeoutRaw);
        } catch (err) {
          log.debug("Failed to configure discovery timeout: " + err);
        }
      } else if (typeof discoveryTimeoutRaw === "string") {
        const parsed = parseInt(discoveryTimeoutRaw, 10);
        if (!isNaN(parsed) && parsed > 0) {
          try {
            uploader.configureDiscoveryTimeout(parsed);
          } catch (err) {
            log.debug("Failed to configure discovery timeout: " + err);
          }
        }
      }
      uploadObject.init();
      localServer.updateConfig();
      statusBar.init(enableStatusBar);
      try {
        log.debug(`[init] Status bar initialized (enabled=${!!enableStatusBar})`);
      } catch (_) {
      }
      try {
        applyAfkConfig(afkEnabled, afkTimeoutMs);
        log.debug(`[AFK] config updated: enabled=${afkEnabled}, timeoutMs=${afkTimeoutMs}`);
      } catch (e) {
        log.debug("[AFK] monitor restart failed", e);
      }
    }
    module2.exports = {
      updateConfigurations
    };
  }
});

// lib/core/wrapGenerators.js
var require_wrapGenerators = __commonJS({
  "lib/core/wrapGenerators.js"(exports2, module2) {
    "use strict";
    var { normalizeStart } = require_runtime();
    function wrapUploadObjectGenerators(deps) {
      const { uploadObject, uploader, log, isDebugMode } = deps;
      try {
        const originalGenerateOpen = uploadObject.generateOpen;
        uploadObject.generateOpen = function(doc, start, duration) {
          const safeStart = normalizeStart(start, duration);
          const maybe = originalGenerateOpen.call(uploadObject, doc, safeStart, duration);
          return Promise.resolve(maybe).then((obj) => {
            try {
              if (doc && doc.languageId === "plaintext" && /untitled/i.test(doc.fileName || "")) {
                const firstLine = doc.lineCount > 0 ? doc.lineAt(0).text : "";
                if (/chat|copilot/i.test(firstLine)) {
                  const safeChatStart = normalizeStart(start, duration);
                  Promise.resolve(uploadObject.generateChat("heuristic.chat.openMirror", "mirror-" + Date.now().toString(36), safeChatStart, duration, 0, 0)).then((o) => {
                    if (!o) return;
                    o.r2 = o.r2 ? o.r2 + ";heuristic-mirror" : "heuristic-mirror";
                    uploader.upload(o);
                  }).catch((err) => {
                    if (isDebugMode) log.debug("[heuristic-chat-mirror] upload failed", err);
                  });
                }
              }
            } catch (_) {
            }
            return obj;
          });
        };
      } catch (e) {
        if (isDebugMode) log.debug("Failed to wrap generateOpen", e);
      }
      try {
        const origGenCode = uploadObject.generateCode;
        uploadObject.generateCode = function(doc, start, duration) {
          return origGenCode.call(uploadObject, doc, normalizeStart(start, duration), duration);
        };
      } catch (e) {
        if (isDebugMode) log.debug("Failed to wrap generateCode", e);
      }
      try {
        const origGenTerminal = uploadObject.generateTerminal;
        uploadObject.generateTerminal = function(name, start, duration) {
          return origGenTerminal.call(uploadObject, name, normalizeStart(start, duration), duration);
        };
      } catch (e) {
        if (isDebugMode) log.debug("Failed to wrap generateTerminal", e);
      }
      try {
        const origGenChat = uploadObject.generateChat;
        if (typeof origGenChat === "function") {
          uploadObject.generateChat = function(provider, sessionId, start, duration, promptChars, responseChars) {
            return origGenChat.call(uploadObject, provider, sessionId, normalizeStart(start, duration), duration, promptChars, responseChars);
          };
        }
      } catch (e) {
        if (isDebugMode) log.debug("Failed to wrap generateChat", e);
      }
    }
    module2.exports = { wrapUploadObjectGenerators };
  }
});

// lib/tracking/OpenCodeTracker.js
var require_OpenCodeTracker = __commonJS({
  "lib/tracking/OpenCodeTracker.js"(exports2, module2) {
    "use strict";
    var runtime = require_runtime();
    function queueUploadPromise(promise, uploader, log, isDebugMode, hint) {
      Promise.resolve(promise).then((obj) => {
        if (!obj) return;
        uploader.upload(obj);
      }).catch((err) => {
        if (isDebugMode) log && log.debug && log.debug("[open-code-upload] " + (hint || "slice") + " failed", err);
      });
    }
    function isIgnoreDocument(doc) {
      return !doc || doc.uri.scheme === "inmemory";
    }
    function suppressTerminalReentry(state, now) {
      const cooldown = Math.max(0, runtime.TERMINAL_REENTRY_COOLDOWN_MS || 0);
      state.terminalReentrySuppressedUntil = now + cooldown;
    }
    function resetTrackOpenAndIntentlyTime(state, now) {
      state.trackData.openTime = now;
      state.trackData.lastIntentlyTime = now;
    }
    function uploadOpenTrackData(deps, now) {
      const { state, uploader, uploadObject, log, isDebugMode } = deps;
      const doc = state.activeDocument;
      if (!doc || isIgnoreDocument(doc)) {
        resetTrackOpenAndIntentlyTime(state, now);
        return;
      }
      if (!state.trackData.openTime || state.trackData.openTime <= 0) {
        resetTrackOpenAndIntentlyTime(state, now);
        return;
      }
      const longest = state.trackData.lastIntentlyTime + runtime.MAX_ALLOW_NOT_INTENTLY_MS + state.moreThinkingTimeMs;
      const duration = Math.min(now, longest) - state.trackData.openTime;
      queueUploadPromise(uploadObject.generateOpen(doc, state.trackData.openTime, duration), uploader, log, isDebugMode, "open");
      resetTrackOpenAndIntentlyTime(state, now);
    }
    function uploadCodingTrackData(deps) {
      const { state, uploader, uploadObject, log, isDebugMode } = deps;
      if (state.activeDocument && !isIgnoreDocument(state.activeDocument)) {
        queueUploadPromise(uploadObject.generateCode(state.activeDocument, state.trackData.firstCodingTime, state.trackData.codingLong), uploader, log, isDebugMode, "code");
      }
      state.trackData.codingLong = 0;
      state.trackData.lastCodingTime = 0;
      state.trackData.firstCodingTime = 0;
    }
    function suspendOpenAndCode(deps, now) {
      const { state } = deps;
      if (state.trackData.openTime && now && state.trackData.openTime < now - runtime.AT_LEAST_WATCHING_TIME) {
        uploadOpenTrackData(deps, now);
      }
      if (state.trackData.codingLong) {
        uploadCodingTrackData(deps);
      }
      state.trackData.openTime = 0;
      state.trackData.lastIntentlyTime = 0;
      state.trackData.firstCodingTime = 0;
      state.trackData.lastCodingTime = 0;
      state.trackData.codingLong = 0;
    }
    function resumeOpenAndCode(state, now) {
      if (!state.activeDocument) return;
      state.trackData.openTime = now;
      state.trackData.lastIntentlyTime = now;
      state.trackData.firstCodingTime = 0;
      state.trackData.codingLong = 0;
      state.trackData.lastCodingTime = 0;
    }
    function pauseOpenTracking(deps, now) {
      const { state } = deps;
      if (state.trackData.openTime && state.activeDocument) {
        if (state.trackData.openTime < now - runtime.AT_LEAST_WATCHING_TIME) {
          uploadOpenTrackData(deps, now);
        }
        state.trackData.openTime = 0;
        state.trackData.lastIntentlyTime = 0;
      }
    }
    function createOpenCodeTracker(deps) {
      const { ext, log, isDebugMode, state, mode } = deps;
      const getSegmentDurationMs = () => Math.max(1e3, state.segmentDurationMs || 15 * runtime.SECOND);
      const flushOpenSegments = (now) => {
        const doc = state.activeDocument;
        if (!doc || isIgnoreDocument(doc) || !state.trackData.openTime) return;
        const segmentDurationMs = getSegmentDurationMs();
        while (now - state.trackData.openTime >= segmentDurationMs) {
          queueUploadPromise(deps.uploadObject.generateOpen(doc, state.trackData.openTime, segmentDurationMs), deps.uploader, log, isDebugMode, "open-segment");
          state.trackData.openTime += segmentDurationMs;
          state.trackData.lastIntentlyTime = Math.max(state.trackData.lastIntentlyTime || 0, state.trackData.openTime);
        }
      };
      const flushCodingSegments = () => {
        const doc = state.activeDocument;
        if (!doc || isIgnoreDocument(doc) || !state.trackData.firstCodingTime || !state.trackData.codingLong) return;
        const segmentDurationMs = getSegmentDurationMs();
        while (state.trackData.codingLong >= segmentDurationMs) {
          queueUploadPromise(deps.uploadObject.generateCode(doc, state.trackData.firstCodingTime, segmentDurationMs), deps.uploader, log, isDebugMode, "code-segment");
          state.trackData.firstCodingTime += segmentDurationMs;
          state.trackData.codingLong -= segmentDurationMs;
        }
        if (state.trackData.codingLong === 0) {
          state.trackData.firstCodingTime = 0;
        }
      };
      const onIntentlyWatchingCodes = (textEditor) => {
        deps.recordUserActivity();
        const now = Date.now();
        if (!state.isAFK && state.exclusiveMode === "terminal") {
          try {
            if (state.activeTerminal && state.terminalOpenTime) {
              const duration = now - state.terminalOpenTime;
              if (duration > 0) queueUploadPromise(deps.uploadObject.generateTerminal(state.activeTerminal.name, state.terminalOpenTime, duration), deps.uploader, log, isDebugMode, "terminal-intent");
            }
          } catch (_) {
          }
          state.activeTerminal = null;
          state.terminalOpenTime = 0;
          state.exclusiveMode = null;
          state.terminalExclusiveActive = false;
          resumeOpenAndCode(state, now);
          mode.updateModeBasedOnState();
          suppressTerminalReentry(state, now);
        } else if (!state.isAFK && state.exclusiveMode === "chat") {
          try {
            state.chat.pauseAll(now);
          } catch (_) {
          }
          state.exclusiveMode = null;
          state.chatCommandFocusUntil = 0;
          resumeOpenAndCode(state, now);
          mode.updateModeBasedOnState();
        }
        if (state.isAFK) return;
        if (!textEditor || !textEditor.document) return;
        if (now > state.trackData.lastIntentlyTime + runtime.MAX_ALLOW_NOT_INTENTLY_MS + state.moreThinkingTimeMs) {
          uploadOpenTrackData(deps, now);
        } else {
          state.trackData.lastIntentlyTime = now;
        }
      };
      const onActiveFileChange = (doc) => {
        deps.recordUserActivity();
        const now = Date.now();
        if (doc) {
          if (state.exclusiveMode === "terminal") {
            try {
              if (state.activeTerminal && state.terminalOpenTime) {
                const duration = now - state.terminalOpenTime;
                if (duration > 0) queueUploadPromise(deps.uploadObject.generateTerminal(state.activeTerminal.name, state.terminalOpenTime, duration), deps.uploader, log, isDebugMode, "terminal-active");
              }
            } catch (_) {
            }
            state.activeTerminal = null;
            state.terminalOpenTime = 0;
            state.exclusiveMode = null;
            state.terminalExclusiveActive = false;
            mode.updateModeBasedOnState();
            suppressTerminalReentry(state, now);
          } else if (state.exclusiveMode === "chat") {
            try {
              state.chat.pauseAll(now);
            } catch (_) {
            }
            state.exclusiveMode = null;
            state.chatCommandFocusUntil = 0;
            mode.updateModeBasedOnState();
          }
        }
        if (state.isAFK) return;
        if (state.activeDocument) {
          if (state.trackData.openTime < now - runtime.AT_LEAST_WATCHING_TIME) {
            uploadOpenTrackData(deps, now);
          }
          if (state.trackData.codingLong) {
            uploadCodingTrackData(deps);
          }
        }
        state.activeDocument = doc ? doc : null;
        resetTrackOpenAndIntentlyTime(state, now);
        state.trackData.codingLong = 0;
        state.trackData.lastCodingTime = 0;
        state.trackData.firstCodingTime = 0;
      };
      const onFileCoding = (doc) => {
        deps.recordUserActivity();
        if (state.isAFK || state.exclusiveMode || !state.windowFocused) return;
        if (!doc) return;
        const scheme = doc.uri ? doc.uri.scheme : "";
        if (runtime.INVALID_CODING_DOCUMENT_SCHEMES.includes(scheme)) return;
        if (isDebugMode) {
          try {
            if (scheme !== "git" && scheme !== "git-index" && scheme !== "output" && scheme !== "input" && scheme !== "private" && scheme !== "markdown" && scheme !== "debug" && scheme !== "vscode" && scheme !== "walkThroughSnippet") {
              log.debug(ext.dumpDocument(doc));
            }
          } catch (_) {
          }
        }
        const now = Date.now();
        if (now - runtime.CODING_SHORTEST_UNIT_MS < state.trackData.lastCodingTime) return;
        if (!state.trackData.firstCodingTime) {
          pauseOpenTracking(deps, now);
          state.trackData.firstCodingTime = now;
        } else if (state.trackData.lastCodingTime < now - runtime.MAX_CODING_WAIT_TIME - state.moreThinkingTimeMs) {
          uploadCodingTrackData(deps);
          state.trackData.firstCodingTime = now;
        }
        state.trackData.codingLong += runtime.CODING_SHORTEST_UNIT_MS;
        state.trackData.lastCodingTime = now;
        mode.updateModeBasedOnState();
      };
      const onDidChangeWindowState = (winState, nowOverride) => {
        const now = typeof nowOverride === "number" ? nowOverride : Date.now();
        if (!winState || !winState.focused) {
          state.windowFocused = false;
          if (!state.exclusiveMode) {
            pauseOpenTracking(deps, now);
            if (state.trackData.codingLong) {
              uploadCodingTrackData(deps);
            }
          }
          mode.updateModeBasedOnState();
          return;
        }
        if (!state.windowFocused) {
          state.windowFocused = true;
          if (!state.isAFK && !state.exclusiveMode && state.activeDocument) {
            resumeOpenAndCode(state, now);
          }
          mode.updateModeBasedOnState();
        }
      };
      const dispose = () => {
      };
      const tick = (now) => {
        if (state.isAFK || state.exclusiveMode || !state.windowFocused) return;
        flushOpenSegments(now);
        flushCodingSegments();
      };
      return {
        uploadOpenTrackData: (now) => uploadOpenTrackData(deps, now),
        uploadCodingTrackData: () => uploadCodingTrackData(deps),
        suspendOpenAndCode: (now) => suspendOpenAndCode(deps, now),
        resumeOpenAndCode: (now) => resumeOpenAndCode(state, now),
        pauseOpenTracking: (now) => pauseOpenTracking(deps, now),
        onIntentlyWatchingCodes,
        onActiveFileChange,
        onFileCoding,
        onDidChangeWindowState,
        tick,
        dispose
      };
    }
    module2.exports = {
      createOpenCodeTracker,
      isIgnoreDocument,
      uploadOpenTrackData,
      uploadCodingTrackData,
      suspendOpenAndCode,
      resumeOpenAndCode,
      pauseOpenTracking,
      resetTrackOpenAndIntentlyTime
    };
  }
});

// lib/tracking/afkMonitor.js
var require_afkMonitor = __commonJS({
  "lib/tracking/afkMonitor.js"(exports2, module2) {
    "use strict";
    var runtime = require_runtime();
    function queueUploadPromise(promise, uploader, log, isDebugMode, hint) {
      Promise.resolve(promise).then((obj) => {
        if (!obj) return;
        uploader.upload(obj);
      }).catch((err) => {
        if (isDebugMode) log && log.debug && log.debug("[afk-upload] " + (hint || "terminal") + " failed", err);
      });
    }
    function createAfkMonitor(deps) {
      const { log, isDebugMode, statusBar, state, uploadObject, uploader, openCode, mode } = deps;
      function recordUserActivity() {
        const now = Date.now();
        state.lastUserActivity = now;
        if (state.isAFK) {
          state.isAFK = false;
          try {
            if (statusBar && typeof statusBar.setAFKOff === "function") statusBar.setAFKOff();
          } catch (e) {
            if (isDebugMode) log.debug("[AFK] Error updating status bar:", e);
          }
          if (isDebugMode) log.debug("[AFK] User returned from AFK");
          if (!state.exclusiveMode && state.activeDocument) {
            openCode.resumeOpenAndCode(now);
          }
          mode.updateModeBasedOnState();
          try {
            if (state.windowFocused) state.chat.resumeAll(now);
          } catch (_) {
          }
        }
      }
      function checkAFKStatus() {
        try {
          if (!state.lastUserActivity) return;
          const now = Date.now();
          const timeSinceActivity = now - state.lastUserActivity;
          if (!state.isAFK && timeSinceActivity > state.afkTimeoutMs && state.exclusiveMode === "chat" && state.windowFocused) {
            state.lastUserActivity = now;
            return;
          }
          if (!state.isAFK && timeSinceActivity > state.afkTimeoutMs) {
            state.isAFK = true;
            try {
              if (statusBar && typeof statusBar.setAFKOn === "function") statusBar.setAFKOn();
            } catch (e) {
              if (isDebugMode) log.debug("[AFK] Error updating status bar:", e);
            }
            if (isDebugMode) log.debug("[AFK] User went AFK, finalizing active slices");
            if (state.trackData.openTime && state.trackData.openTime < now - runtime.AT_LEAST_WATCHING_TIME) {
              openCode.uploadOpenTrackData(now);
            }
            if (state.trackData.codingLong) {
              openCode.uploadCodingTrackData();
            }
            if (state.activeTerminal && state.terminalOpenTime) {
              const duration = now - state.terminalOpenTime;
              if (duration > 0) {
                queueUploadPromise(uploadObject.generateTerminal(state.activeTerminal.name, state.terminalOpenTime, duration), uploader, log, isDebugMode, "afk");
              }
              state.terminalOpenTime = 0;
            }
            try {
              state.chat.pauseAll(now);
            } catch (_) {
            }
          }
        } catch (e) {
          if (isDebugMode) log.debug("[AFK] Error in checkAFKStatus:", e);
        }
      }
      function start() {
        try {
          if (!state.trackAFK) {
            if (isDebugMode) log.debug("[AFK] tracking disabled");
            return;
          }
          if (state.afkCheckTimer) return;
          state.lastUserActivity = Date.now();
          state.afkCheckTimer = setInterval(checkAFKStatus, 30 * runtime.SECOND);
          if (isDebugMode) log.debug("[AFK] Started AFK monitoring");
        } catch (e) {
          if (isDebugMode) log.debug("[AFK] Error starting AFK monitoring:", e);
        }
      }
      function stop() {
        try {
          if (state.afkCheckTimer) {
            clearInterval(state.afkCheckTimer);
            state.afkCheckTimer = null;
          }
          if (isDebugMode) log.debug("[AFK] Stopped AFK monitoring");
        } catch (e) {
          if (isDebugMode) log.debug("[AFK] Error stopping AFK monitoring:", e);
        }
      }
      function applyConfig(enabled, timeoutMs) {
        state.trackAFK = !!enabled;
        state.afkTimeoutMs = timeoutMs;
        stop();
        if (state.trackAFK) start();
        else {
          state.isAFK = false;
          try {
            if (statusBar && typeof statusBar.setAFKOff === "function") statusBar.setAFKOff();
          } catch (_) {
          }
        }
        mode.updateModeBasedOnState();
      }
      function registerCommands(subscriptions) {
        void subscriptions;
      }
      return {
        recordUserActivity,
        checkAFKStatus,
        start,
        stop,
        applyConfig,
        registerCommands
      };
    }
    module2.exports = { createAfkMonitor };
  }
});

// lib/tracking/terminalTracker.js
var require_terminalTracker = __commonJS({
  "lib/tracking/terminalTracker.js"(exports2, module2) {
    "use strict";
    var runtime = require_runtime();
    function createTerminalTracker(deps) {
      const { vscode, log, isDebugMode, state, uploadObject, uploader, openCode, mode, isChatLikeTab } = deps;
      const cooldownMs = Math.max(0, runtime.TERMINAL_REENTRY_COOLDOWN_MS || 0);
      const getSegmentDurationMs = () => Math.max(1e3, state.segmentDurationMs || 15 * runtime.SECOND);
      const suppressTerminalReentry = (now) => {
        state.terminalReentrySuppressedUntil = now + cooldownMs;
      };
      const resetTerminalReentrySuppression = () => {
        state.terminalReentrySuppressedUntil = 0;
      };
      const isTerminalReentrySuppressed = (now) => now < (state.terminalReentrySuppressedUntil || 0);
      const isTerminalPanelFocused = () => !!vscode.window.activeTerminal && !vscode.window.activeTextEditor;
      function finalizeActiveTerminal(now) {
        if (state.activeTerminal && state.terminalOpenTime) {
          const duration = now - state.terminalOpenTime;
          if (duration > 0) queueTerminalSlice(state.activeTerminal.name, state.terminalOpenTime, duration, "finalize");
        }
        state.activeTerminal = null;
        state.terminalOpenTime = 0;
        suppressTerminalReentry(now);
      }
      function queueTerminalUpload(promise, hint) {
        Promise.resolve(promise).then((obj) => {
          if (!obj) return;
          uploader.upload(obj);
        }).catch((err) => {
          if (isDebugMode) log.debug("[terminal-upload] failed", hint || "slice", err);
        });
      }
      function queueTerminalSlice(name, start, duration, hint) {
        if (!name || duration <= 0) return;
        queueTerminalUpload(uploadObject.generateTerminal(name, start, duration), hint);
      }
      function rollTerminalSegments(now, hint) {
        if (!state.activeTerminal || !state.terminalOpenTime) return;
        const segmentDurationMs = getSegmentDurationMs();
        while (now - state.terminalOpenTime >= segmentDurationMs) {
          queueTerminalSlice(state.activeTerminal.name, state.terminalOpenTime, segmentDurationMs, hint);
          state.terminalOpenTime += segmentDurationMs;
        }
      }
      function onDidOpenTerminal(terminal) {
        deps.recordUserActivity();
        try {
          state.chat.stopHeuristicSession("terminal-open", true);
        } catch (_) {
        }
        if (isDebugMode) log.debug(`Terminal opened: ${terminal.name}`);
        if (!state.isAFK && state.windowFocused && terminal === vscode.window.activeTerminal && isTerminalPanelFocused()) {
          state.exclusiveMode = "terminal";
          state.terminalExclusiveActive = true;
          openCode.suspendOpenAndCode(Date.now());
          mode.refreshStatusBarMode();
          state.activeTerminal = terminal;
          state.terminalOpenTime = Date.now();
          resetTerminalReentrySuppression();
        }
        state.chatCommandFocusUntil = 0;
      }
      function onDidCloseTerminal(terminal) {
        if (isDebugMode) log.debug(`Terminal closed: ${terminal.name}`);
        const allTerms = vscode.window.terminals || [];
        const isSame = state.activeTerminal && state.activeTerminal === terminal;
        if (isSame || state.activeTerminal && !allTerms.includes(state.activeTerminal)) {
          const now = Date.now();
          finalizeActiveTerminal(now);
          if (state.exclusiveMode === "terminal") {
            state.exclusiveMode = null;
            state.terminalExclusiveActive = false;
            openCode.resumeOpenAndCode(now);
            mode.updateModeBasedOnState();
          }
        }
      }
      function onDidChangeActiveTerminal(terminal) {
        deps.recordUserActivity();
        if (isDebugMode) log.debug(`Active terminal changed: ${terminal ? terminal.name : "None"}`);
        if (state.activeTerminal && state.activeTerminal !== (terminal || null)) {
          const duration = Date.now() - state.terminalOpenTime;
          if (duration > 0) queueTerminalSlice(state.activeTerminal.name, state.terminalOpenTime, duration, "active-change");
        }
        if (terminal) {
          if (state.windowFocused && !state.isAFK && isTerminalPanelFocused()) {
            try {
              state.chat.stopHeuristicSession("terminal-focus", true);
            } catch (_) {
            }
            state.exclusiveMode = "terminal";
            state.terminalExclusiveActive = true;
            openCode.suspendOpenAndCode(Date.now());
            mode.refreshStatusBarMode();
            state.chatCommandFocusUntil = 0;
            state.activeTerminal = terminal;
            state.terminalOpenTime = Date.now();
            resetTerminalReentrySuppression();
          } else if (state.activeTerminal === terminal) {
            state.terminalOpenTime = 0;
          }
        } else {
          const now = Date.now();
          state.activeTerminal = null;
          state.terminalOpenTime = 0;
          if (state.exclusiveMode === "terminal") {
            state.exclusiveMode = null;
            state.terminalExclusiveActive = false;
            openCode.resumeOpenAndCode(now);
            mode.updateModeBasedOnState();
          }
          suppressTerminalReentry(now);
        }
      }
      function onDidChangeWindowState(winState) {
        if (!winState.focused) {
          state.windowFocused = false;
          try {
            state.chat.pauseAll(Date.now());
          } catch (e) {
            void e;
          }
          try {
            mode.updateModeBasedOnState();
          } catch (_) {
          }
          if (state.activeTerminal && state.terminalOpenTime) {
            const duration = Date.now() - state.terminalOpenTime;
            if (duration > 0) queueTerminalSlice(state.activeTerminal.name, state.terminalOpenTime, duration, "window-unfocus");
            state.terminalOpenTime = 0;
          }
        } else {
          if (!state.windowFocused) {
            state.windowFocused = true;
            try {
              if (!state.isAFK) state.chat.resumeAll(Date.now());
            } catch (e) {
              void e;
            }
            if (state.activeTerminal && state.activeTerminal === vscode.window.activeTerminal && isTerminalPanelFocused()) {
              state.terminalOpenTime = Date.now();
            }
            mode.updateModeBasedOnState();
          }
        }
      }
      function register(subscriptions) {
        if (!state.trackTerminal) return;
        subscriptions.push(vscode.window.onDidOpenTerminal(onDidOpenTerminal));
        subscriptions.push(vscode.window.onDidCloseTerminal(onDidCloseTerminal));
        subscriptions.push(vscode.window.onDidChangeActiveTerminal((t) => onDidChangeActiveTerminal(t)));
        subscriptions.push(vscode.window.onDidChangeWindowState(onDidChangeWindowState));
        try {
          const t = vscode.window.activeTerminal;
          if (t) onDidChangeActiveTerminal(t);
        } catch (_) {
        }
        try {
          if (!state.terminalPollHandle) {
            const POLL_MS = 1500;
            if (isDebugMode) log.debug("[terminal-poll] starting poll @", POLL_MS, "ms");
            state.terminalPollHandle = setInterval(() => {
              try {
                const current = vscode.window.activeTerminal || null;
                let chatUIFocused = false;
                try {
                  const anyWindow = (
                    /** @type {any} */
                    vscode.window
                  );
                  const groups = anyWindow.tabGroups && anyWindow.tabGroups.all ? anyWindow.tabGroups.all : [];
                  for (const g of groups) {
                    if (!g || !g.activeTab) continue;
                    if (isChatLikeTab(g.activeTab)) {
                      chatUIFocused = true;
                      break;
                    }
                  }
                } catch (_) {
                }
                if (chatUIFocused && state.activeTerminal) {
                  const now = Date.now();
                  const duration = now - state.terminalOpenTime;
                  if (duration > 0) {
                    queueTerminalSlice(state.activeTerminal.name, state.terminalOpenTime, duration, "poll-chat-focus");
                    if (isDebugMode) log.debug("[terminal-poll] terminal slice ended (chat focus)");
                  }
                  state.activeTerminal = null;
                  state.terminalOpenTime = 0;
                  suppressTerminalReentry(now);
                  if (state.exclusiveMode === "terminal") {
                    state.exclusiveMode = null;
                    state.terminalExclusiveActive = false;
                    mode.updateModeBasedOnState();
                  }
                } else if (!chatUIFocused) {
                  if (current && state.activeTerminal && state.activeTerminal === current && state.windowFocused && !state.isAFK) {
                    rollTerminalSegments(Date.now(), "poll-segment");
                  }
                  if (!current && state.activeTerminal) {
                    const now = Date.now();
                    const duration = now - state.terminalOpenTime;
                    if (duration > 0) {
                      queueTerminalSlice(state.activeTerminal.name, state.terminalOpenTime, duration, "poll-focus-lost");
                      if (isDebugMode) log.debug("[terminal-poll] synthesized terminal slice (focus lost)");
                    }
                    state.activeTerminal = null;
                    state.terminalOpenTime = 0;
                    suppressTerminalReentry(now);
                    if (state.exclusiveMode === "terminal") {
                      state.exclusiveMode = null;
                      state.terminalExclusiveActive = false;
                      mode.updateModeBasedOnState();
                    }
                  }
                  const activeEditor = vscode.window.activeTextEditor;
                  const terminalPanelFocused = !activeEditor;
                  if (terminalPanelFocused && current && (!state.activeTerminal || state.activeTerminal.name !== current.name)) {
                    const now = Date.now();
                    if (isTerminalReentrySuppressed(now)) {
                      if (isDebugMode) log.debug("[terminal-poll] reentry delayed until", state.terminalReentrySuppressedUntil, "now", now);
                    } else if (!state.isAFK && state.windowFocused) {
                      try {
                        state.chat.stopHeuristicSession("terminal-poll", true);
                      } catch (_) {
                      }
                      state.exclusiveMode = "terminal";
                      state.terminalExclusiveActive = true;
                      openCode.suspendOpenAndCode(now);
                      mode.refreshStatusBarMode();
                      resetTerminalReentrySuppression();
                      state.chatCommandFocusUntil = 0;
                      state.activeTerminal = current;
                      state.terminalOpenTime = now;
                    }
                  }
                }
              } catch (_) {
              }
            }, POLL_MS);
            subscriptions.push({ dispose: () => {
              if (state.terminalPollHandle) {
                clearInterval(state.terminalPollHandle);
                state.terminalPollHandle = null;
              }
            } });
          }
        } catch (e) {
          if (isDebugMode) log.debug("terminal poll init failed", e);
        }
        try {
          if (typeof vscode.window.onDidChangeTerminalState === "function") {
            subscriptions.push(vscode.window.onDidChangeTerminalState((term) => {
              try {
                deps.recordUserActivity();
                if (term === vscode.window.activeTerminal && term && term.state && term.state.isInteractedWith) {
                  const now = Date.now();
                  if (!state.isAFK && state.windowFocused) {
                    try {
                      state.chat.stopHeuristicSession("terminal-state", true);
                    } catch (_) {
                    }
                    state.exclusiveMode = "terminal";
                    state.terminalExclusiveActive = true;
                    openCode.suspendOpenAndCode(now);
                    mode.refreshStatusBarMode();
                    if (!state.activeTerminal || state.activeTerminal.name !== term.name) {
                      finalizeActiveTerminal(now);
                      state.activeTerminal = term;
                      state.terminalOpenTime = now;
                    } else if (state.activeTerminal && !state.terminalOpenTime) {
                      state.terminalOpenTime = now;
                    }
                  }
                }
              } catch (_) {
              }
            }));
          }
        } catch (_) {
        }
      }
      function dispose() {
        if (state.activeTerminal) {
          const duration = Date.now() - state.terminalOpenTime;
          if (duration > 0) queueTerminalSlice(state.activeTerminal.name, state.terminalOpenTime, duration, "dispose");
          state.activeTerminal = null;
          state.terminalOpenTime = 0;
          suppressTerminalReentry(Date.now());
        }
        if (state.terminalPollHandle) {
          clearInterval(state.terminalPollHandle);
          state.terminalPollHandle = null;
        }
      }
      return {
        register,
        dispose,
        finalizeActiveTerminal
      };
    }
    module2.exports = { createTerminalTracker };
  }
});

// lib/tracking/chatTracker.js
var require_chatTracker = __commonJS({
  "lib/tracking/chatTracker.js"(exports2, module2) {
    "use strict";
    var runtime = require_runtime();
    var chatTabRegex = /copilot|chatgpt|ai\s*chat|codeium.*chat|chat panel|github\.copilot\.chat|^chat$|assistant|ai assistant|codex/i;
    var chatTabSchemes = ["vscode-chat", "vscode-chat-session", "vscode-chat-editor"];
    var chatSchemeRegex = /(chat|assistant)/i;
    function isChatLikeTab(tab) {
      if (!tab || typeof tab !== "object") return false;
      const label = typeof tab.label === "string" ? tab.label : "";
      const viewType = typeof tab.viewType === "string" ? tab.viewType : "";
      if (chatTabRegex.test(label) || chatTabRegex.test(viewType)) return true;
      const seenSchemes = /* @__PURE__ */ new Set();
      const addScheme = (uriCandidate) => {
        try {
          if (!uriCandidate) return;
          if (typeof uriCandidate === "string") {
            seenSchemes.add(uriCandidate.toLowerCase());
            return;
          }
          const maybeUri = (
            /** @type {{ scheme?: string }} */
            uriCandidate
          );
          if (maybeUri && typeof maybeUri.scheme === "string") seenSchemes.add(maybeUri.scheme.toLowerCase());
        } catch {
        }
      };
      const inspectString = (maybe) => typeof maybe === "string" && chatTabRegex.test(maybe);
      const input = (
        /** @type {any} */
        tab.input
      );
      if (input && typeof input === "object") {
        if (inspectString(input.viewType) || inspectString(input.providerId) || inspectString(input.notebookType)) return true;
        addScheme(input.uri);
        addScheme(input.resource);
        addScheme(input.webviewUri);
        addScheme(input.primaryUri);
        addScheme(input.secondaryUri);
        if (Array.isArray(input.resources)) {
          for (const res of input.resources) addScheme(res);
        }
      }
      if (Array.isArray(tab.additionalResources)) {
        for (const res of tab.additionalResources) addScheme(res);
      }
      for (const scheme of seenSchemes) {
        if (!scheme) continue;
        if (chatTabSchemes.includes(scheme) || chatSchemeRegex.test(scheme)) return true;
      }
      return false;
    }
    function createChatTracker(deps) {
      const { vscode, log, isDebugMode, state, uploadObject, uploader, openCode, mode } = deps;
      const getSegmentDurationMs = () => Math.max(1e3, state.segmentDurationMs || 15 * runtime.SECOND);
      const getIdleThresholdMs = () => Math.max(runtime.SECOND, state.afkTimeoutMs || 5 * 60 * runtime.SECOND);
      const chatContextKeys = [
        "workbench.panel.chat.active",
        "workbench.view.chat.active",
        "chatViewVisible",
        "chatViewFocus",
        "chatViewInputFocus",
        "quickChatVisible",
        "inQuickChat",
        "inChat",
        "chatActive",
        "inlineChatVisible",
        "inlineChatInputVisible",
        "interactiveSessionFocus",
        "github.copilot.chatViewVisible",
        "github.copilot.chatViewFocus"
      ];
      const CHAT_CONTEXT_CACHE_MS = 1e3;
      let lastChatContextCheck = 0;
      let lastChatContextValue = false;
      async function hasChatContextActive() {
        const now = Date.now();
        if (now - lastChatContextCheck < CHAT_CONTEXT_CACHE_MS) return lastChatContextValue;
        lastChatContextCheck = now;
        for (const key of chatContextKeys) {
          try {
            const hit = await vscode.commands.executeCommand("vscode.getContextKeyValue", key).then(Boolean, () => false);
            if (hit) {
              lastChatContextValue = true;
              return true;
            }
          } catch (_) {
          }
        }
        lastChatContextValue = false;
        return false;
      }
      const pauseHandlers = [];
      const resumeHandlers = [];
      const pauseAll = (now) => {
        for (const h of pauseHandlers) {
          try {
            h(now);
          } catch (e) {
            void e;
          }
        }
      };
      const resumeAll = (now) => {
        for (const h of resumeHandlers) {
          try {
            h(now);
          } catch (e) {
            void e;
          }
        }
      };
      state.chat.pauseAll = pauseAll;
      state.chat.resumeAll = resumeAll;
      let stopHeuristicChatSession = (reason, preserveExclusive) => {
        void reason;
        void preserveExclusive;
      };
      state.chat.stopHeuristicSession = (reason, preserveExclusive) => stopHeuristicChatSession(reason, preserveExclusive);
      function register(subscriptions) {
        if (!state.trackAIChat) return;
        const maybeChat = (
          /** @type {any} */
          vscode.chat
        );
        const hasNative = !!(maybeChat && typeof maybeChat.onDidOpenChatSession === "function" && typeof maybeChat.onDidDisposeChatSession === "function");
        try {
          if (isDebugMode) log.debug("[chat-native] vscode.chat available =", !!maybeChat, "handlers =", hasNative ? "ok" : "missing");
        } catch (_) {
        }
        let nativeChatActiveCount = 0;
        const enableHeuristics = true;
        const heuristicLossGraceMs = 4e3;
        const heuristicSchemes = ["vscode-chat", "vscode-chat-session", "vscode-chat-editor"];
        const heuristicLangs = ["copilot-chat", "chat"];
        const heuristicFilePatterns = [/copilot.*chat/i, /chatgpt/i, /ai[- ]?chat/i];
        const emitChatSlice = (provider, sessionId, start, end, heuristic, seq, isFinal) => {
          if (typeof uploadObject.generateChat !== "function") return;
          const duration = end - start;
          if (duration <= 0) return;
          const promise = uploadObject.generateChat(provider, sessionId, start, duration, 0, 0);
          Promise.resolve(promise).then((obj) => {
            if (!obj) return;
            const markers = [];
            if (heuristic) markers.push("heuristic");
            if (typeof seq === "number") markers.push("seq=" + seq);
            if (isFinal) markers.push("final");
            const markerStr = markers.join(";");
            obj.r2 = obj.r2 ? obj.r2 + (markerStr ? ";" + markerStr : "") : markerStr;
            uploader.upload(obj);
          }).catch((err) => {
            if (isDebugMode) log.debug("[chat-upload] emitChatSlice failed", err);
          });
        };
        const flushChatSegments = (rec, sessionId, now, heuristic, isFinal) => {
          const segmentDurationMs = getSegmentDurationMs();
          while (now - rec.segmentStart >= segmentDurationMs) {
            const segmentEnd = rec.segmentStart + segmentDurationMs;
            rec.seq += 1;
            emitChatSlice(rec.provider, sessionId, rec.segmentStart, segmentEnd, heuristic, rec.seq, false);
            rec.segmentStart = segmentEnd;
          }
          if (isFinal && now > rec.segmentStart) {
            rec.seq += 1;
            emitChatSlice(rec.provider, sessionId, rec.segmentStart, now, heuristic, rec.seq, true);
            rec.segmentStart = now;
          }
        };
        if (hasNative) {
          const chatSessions = /* @__PURE__ */ new Map();
          const onDidOpenChatSession = (session) => {
            try {
              deps.recordUserActivity();
            } catch (_) {
            }
            const start = Date.now();
            let providerId = "unknown";
            try {
              if (session && session.provider) providerId = session.provider.id || session.provider.label || "unknown";
              else if (session && session.providerId) providerId = session.providerId;
            } catch (_) {
            }
            try {
              if (isDebugMode) log.debug("[chat-native] onDidOpenChatSession", "id=", session && session.id, "provider=", providerId);
            } catch (_) {
            }
            state.exclusiveMode = "chat";
            openCode.suspendOpenAndCode(start);
            mode.refreshStatusBarMode();
            nativeChatActiveCount++;
            chatSessions.set(session.id, { provider: providerId, segmentStart: start, seq: 0 });
          };
          subscriptions.push(maybeChat.onDidOpenChatSession(onDidOpenChatSession));
          const intervalHandle = setInterval(() => {
            const now = Date.now();
            for (const [id, rec] of chatSessions.entries()) {
              if (!state.windowFocused || state.isAFK || rec.paused) continue;
              flushChatSegments(rec, id, now, false, false);
            }
          }, 1e3);
          subscriptions.push({ dispose: () => clearInterval(intervalHandle) });
          subscriptions.push(maybeChat.onDidDisposeChatSession(
            /** @type {(session:any)=>void} */
            ((session) => {
              try {
                if (isDebugMode) log.debug("[chat-native] onDidDisposeChatSession", "id=", session && session.id);
              } catch (_) {
              }
              const rec = chatSessions.get(session.id);
              if (rec) {
                const now = Date.now();
                flushChatSegments(rec, session.id, now, false, true);
                chatSessions.delete(session.id);
                nativeChatActiveCount = Math.max(0, nativeChatActiveCount - 1);
                if (chatSessions.size === 0 && state.exclusiveMode === "chat") {
                  state.exclusiveMode = null;
                  state.chatCommandFocusUntil = 0;
                  openCode.resumeOpenAndCode(now);
                  mode.updateModeBasedOnState();
                }
              }
            })
          ));
          pauseHandlers.push((now) => {
            for (const [id, rec] of chatSessions.entries()) {
              if (rec.paused) continue;
              rec.paused = true;
              flushChatSegments(rec, id, now, false, true);
            }
          });
          resumeHandlers.push((now) => {
            for (const rec of chatSessions.values()) {
              if (!rec.paused) continue;
              rec.paused = false;
              rec.segmentStart = now;
            }
          });
        } else {
          try {
            if (isDebugMode) log.debug("[chat-native] vscode.chat not available; relying on heuristics only");
          } catch (_) {
          }
        }
        if (enableHeuristics) {
          let heuristicSession = null;
          let heuristicTimer = null;
          const providerName = "heuristic.chat";
          const genSessionId = () => "heuristic-" + Date.now().toString(36);
          let heuristicLossSince = 0;
          stopHeuristicChatSession = (reason = "manual", preserveExclusive = false) => {
            if (!heuristicSession) return;
            const now = Date.now();
            if (nativeChatActiveCount === 0) {
              flushChatSegments(heuristicSession, heuristicSession.id, heuristicSession.lastSeen || now, true, true);
            }
            if (isDebugMode) log.debug("[chat-heuristic] session end", heuristicSession.id, reason);
            heuristicSession = null;
            heuristicLossSince = 0;
            state.heuristicChatActive = false;
            mode.refreshStatusBarMode();
            if (!preserveExclusive && state.exclusiveMode === "chat") {
              state.exclusiveMode = null;
              state.chatCommandFocusUntil = 0;
              openCode.resumeOpenAndCode(now);
              mode.updateModeBasedOnState();
            }
          };
          const detectChatTabActive = () => {
            try {
              const anyWindow = (
                /** @type {any} */
                vscode.window
              );
              const group = anyWindow.tabGroups && anyWindow.tabGroups.activeTabGroup ? anyWindow.tabGroups.activeTabGroup : null;
              if (group && group.activeTab) {
                const label = (group.activeTab.label || "<?>") + (group.activeTab.viewType ? "<" + group.activeTab.viewType + ">" : "");
                if (isDebugMode && Date.now() - state.lastChatEnumLog > 15e3) {
                  state.lastChatEnumLog = Date.now();
                  log.debug("[chat-heuristic] tab labels (active):", label);
                }
                if (isChatLikeTab(group.activeTab)) return true;
              }
            } catch (_) {
            }
            return false;
          };
          const scanEditors = async () => {
            if (state.isAFK || !state.windowFocused) return;
            if (state.exclusiveMode === "terminal") {
              stopHeuristicChatSession("terminal-exclusive", true);
              return;
            }
            const activeEditor = vscode.window.activeTextEditor || null;
            const editors = activeEditor ? [activeEditor] : [];
            const now = Date.now();
            const chatLike = editors.find((ed) => {
              try {
                const doc = ed.document;
                if (!doc) return false;
                const scheme = doc.uri.scheme;
                const lang = doc.languageId;
                const fileName = doc.fileName || "";
                if (heuristicSchemes.includes(scheme)) return true;
                if (heuristicLangs.includes(lang)) return true;
                if (lang === "plaintext" && /untitled/i.test(fileName)) {
                  const firstLine = doc.lineCount > 0 ? doc.lineAt(0).text : "";
                  if (/^#?\s*copilot/i.test(firstLine) || /chat/i.test(firstLine)) return true;
                }
                if (heuristicFilePatterns.some((r) => r.test(fileName))) return true;
              } catch (_) {
                return false;
              }
              return false;
            });
            const chatTabActive = !chatLike && detectChatTabActive();
            const chatPanelActive = await hasChatContextActive();
            if (chatLike || chatTabActive || chatPanelActive) {
              state.heuristicChatActive = true;
              heuristicLossSince = 0;
              const stickyNow = Date.now();
              state.chatCommandFocusUntil = Math.max(state.chatCommandFocusUntil, stickyNow + 1e4);
              if (state.exclusiveMode !== "chat") {
                state.exclusiveMode = "chat";
                openCode.suspendOpenAndCode(now);
                mode.refreshStatusBarMode();
              }
              if (!heuristicSession) {
                heuristicSession = { id: genSessionId(), segmentStart: now, lastSeen: now, provider: providerName, seq: 0 };
                if (isDebugMode) log.debug("[chat-heuristic] session start", heuristicSession.id, chatLike ? "editor" : "tab");
                try {
                  const now2 = Date.now();
                  if (state.activeDocument) {
                    if (state.trackData.openTime && state.trackData.openTime < now2 - runtime.AT_LEAST_WATCHING_TIME) openCode.uploadOpenTrackData(now2);
                    if (state.trackData.codingLong) openCode.uploadCodingTrackData();
                  }
                } catch (_) {
                }
              } else {
                heuristicSession.lastSeen = now;
              }
            } else if (heuristicSession) {
              if (!heuristicLossSince) heuristicLossSince = now;
              if (now - heuristicLossSince > heuristicLossGraceMs) stopHeuristicChatSession("focus-loss");
            } else {
              state.heuristicChatActive = false;
              heuristicLossSince = 0;
            }
          };
          const startHeuristicLoop = () => {
            if (heuristicTimer) return;
            heuristicTimer = setInterval(() => {
              void scanEditors();
              if (heuristicSession) {
                const now = Date.now();
                if (state.isAFK || !state.windowFocused) {
                  stopHeuristicChatSession("afk-unfocused");
                  return;
                }
                if (now - heuristicSession.lastSeen > getIdleThresholdMs()) {
                  stopHeuristicChatSession("idle-timeout");
                } else {
                  if (nativeChatActiveCount === 0) flushChatSegments(heuristicSession, heuristicSession.id, now, true, false);
                }
              }
            }, 1e3);
          };
          void scanEditors();
          startHeuristicLoop();
          subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(() => {
            void scanEditors();
          }));
          try {
            const anyWindow = (
              /** @type {any} */
              vscode.window
            );
            if (anyWindow.tabGroups && typeof anyWindow.tabGroups.onDidChangeTabs === "function") {
              subscriptions.push(anyWindow.tabGroups.onDidChangeTabs(() => {
                try {
                  if (isDebugMode) log.debug("[chat-heuristic] tab change event");
                  void scanEditors();
                } catch (_) {
                }
              }));
            }
          } catch (_) {
          }
          subscriptions.push({ dispose: () => {
            if (heuristicTimer) clearInterval(heuristicTimer);
          } });
          try {
            if (!state.chatPollHandle) {
              const CHAT_POLL_MS = 3e3;
              if (isDebugMode) log.debug("[chat-poll] starting poll @", CHAT_POLL_MS, "ms");
              state.chatPollHandle = setInterval(() => {
                try {
                  if (!heuristicSession) return;
                  if (!state.windowFocused) return;
                  if (detectChatTabActive()) {
                    try {
                      deps.recordUserActivity();
                    } catch (_) {
                    }
                    heuristicSession.lastSeen = Date.now();
                    if (isDebugMode) log.debug("[chat-poll] refreshed lastSeen", heuristicSession.id);
                  }
                } catch (_) {
                }
              }, CHAT_POLL_MS);
              subscriptions.push({ dispose: () => {
                if (state.chatPollHandle) {
                  clearInterval(state.chatPollHandle);
                  state.chatPollHandle = null;
                }
              } });
            }
          } catch (_) {
          }
          pauseHandlers.push((now) => {
            if (!heuristicSession) return;
            if (nativeChatActiveCount === 0) flushChatSegments(heuristicSession, heuristicSession.id, heuristicSession.lastSeen || now, true, true);
            heuristicSession = null;
          });
        }
      }
      function dispose() {
        if (state.chatPollHandle) {
          clearInterval(state.chatPollHandle);
          state.chatPollHandle = null;
        }
      }
      return {
        register,
        dispose,
        isChatLikeTab,
        pauseAll,
        resumeAll,
        stopHeuristicChatSession: (reason, preserveExclusive) => stopHeuristicChatSession(reason, preserveExclusive)
      };
    }
    module2.exports = {
      createChatTracker,
      isChatLikeTab
    };
  }
});

// lib/tracking/globalActivityHooks.js
var require_globalActivityHooks = __commonJS({
  "lib/tracking/globalActivityHooks.js"(exports2, module2) {
    "use strict";
    var runtime = require_runtime();
    function queueUploadPromise(promise, uploader, log, isDebugMode, hint) {
      Promise.resolve(promise).then((obj) => {
        if (!obj) return;
        uploader.upload(obj);
      }).catch((err) => {
        if (isDebugMode) log && log.debug && log.debug("[global-activity-upload] " + (hint || "slice") + " failed", err);
      });
    }
    function suppressTerminalReentry(state, now) {
      const cooldown = Math.max(0, runtime.TERMINAL_REENTRY_COOLDOWN_MS || 0);
      state.terminalReentrySuppressedUntil = now + cooldown;
    }
    function registerGlobalActivityHooks(deps) {
      const { vscode, log, isDebugMode, state, openCode, mode, uploadObject, uploader } = deps;
      const isTerminalPanelFocused = () => !!vscode.window.activeTerminal && !vscode.window.activeTextEditor;
      return function register(subscriptions) {
        try {
          const anyCommands = (
            /** @type {any} */
            vscode.commands
          );
          if (anyCommands && typeof anyCommands.onDidExecuteCommand === "function") {
            subscriptions.push(anyCommands.onDidExecuteCommand((e) => {
              try {
                deps.recordUserActivity();
              } catch (_) {
              }
              try {
                const id = e && typeof e.command === "string" ? e.command : "";
                try {
                  if (isDebugMode) log.debug("[cmd]", id);
                } catch (_) {
                }
                const now = Date.now();
                if (/terminal/i.test(id) && /(focus|toggle|new|show|open)/i.test(id)) {
                  if (!state.isAFK && state.windowFocused && isTerminalPanelFocused()) {
                    try {
                      state.chat.stopHeuristicSession("terminal-command", true);
                    } catch (_) {
                    }
                    state.exclusiveMode = "terminal";
                    state.terminalExclusiveActive = true;
                    openCode.suspendOpenAndCode(now);
                    mode.refreshStatusBarMode();
                    const currentTerminal = vscode.window.activeTerminal;
                    if (currentTerminal && (!state.activeTerminal || state.activeTerminal.name !== currentTerminal.name)) {
                      state.activeTerminal = currentTerminal;
                      state.terminalOpenTime = now;
                    } else if (state.activeTerminal && !state.terminalOpenTime) {
                      state.terminalOpenTime = now;
                    } else if (!state.activeTerminal && vscode.window.activeTerminal) {
                      state.activeTerminal = vscode.window.activeTerminal;
                      state.terminalOpenTime = now;
                    }
                    state.terminalReentrySuppressedUntil = 0;
                  }
                } else if (/(copilot|chat|assistant|gpt|codeium)/i.test(id) || /workbench\..*chat/i.test(id) || /github\.copilot\./i.test(id)) {
                  if (!state.isAFK && state.windowFocused) {
                    state.exclusiveMode = "chat";
                    openCode.suspendOpenAndCode(now);
                    mode.refreshStatusBarMode();
                    state.chatCommandFocusUntil = now + 3e4;
                  }
                } else if (/workbench\.action\.focus.*Editor/i.test(id)) {
                  if (state.exclusiveMode === "terminal") {
                    if (state.activeTerminal && state.terminalOpenTime) {
                      const dur = now - state.terminalOpenTime;
                      if (dur > 0) queueUploadPromise(uploadObject.generateTerminal(state.activeTerminal.name, state.terminalOpenTime, dur), uploader, log, isDebugMode, "global-activity-focus");
                    }
                    state.activeTerminal = null;
                    state.terminalOpenTime = 0;
                    state.exclusiveMode = null;
                    state.chatCommandFocusUntil = 0;
                    suppressTerminalReentry(state, now);
                    openCode.resumeOpenAndCode(now);
                    mode.updateModeBasedOnState();
                  } else if (state.exclusiveMode === "chat") {
                    try {
                      state.chat.pauseAll(now);
                    } catch (_) {
                    }
                    state.exclusiveMode = null;
                    state.chatCommandFocusUntil = 0;
                    openCode.resumeOpenAndCode(now);
                    mode.updateModeBasedOnState();
                  }
                }
              } catch (_) {
              }
            }));
          }
        } catch (_) {
        }
        try {
          subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(() => deps.recordUserActivity()));
        } catch (_) {
        }
        try {
          const anyWindow = (
            /** @type {any} */
            vscode.window
          );
          if (anyWindow.tabGroups && typeof anyWindow.tabGroups.onDidChangeTabs === "function") {
            subscriptions.push(anyWindow.tabGroups.onDidChangeTabs(() => deps.recordUserActivity()));
          }
        } catch (_) {
        }
        try {
          subscriptions.push(vscode.window.onDidChangeWindowState((ws) => {
            if (ws.focused) deps.recordUserActivity();
          }));
        } catch (_) {
        }
      };
    }
    module2.exports = { registerGlobalActivityHooks };
  }
});

// lib/EnvironmentProbe.js
var require_EnvironmentProbe = __commonJS({
  "lib/EnvironmentProbe.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var rootDir = path.resolve(__dirname, "..");
    var getFilePath = (filePath) => path.resolve(rootDir, filePath);
    var getModulePath = (moduleName) => path.resolve(rootDir, "node_modules", moduleName);
    module2.exports = { generateDiagnoseLogFile };
    function generateDiagnoseLogFile() {
      try {
        let dir = rootDir;
        if (!isWritable(dir)) dir = require("os").tmpdir();
        if (!isWritable(dir)) throw new Error(`${dir} is not writable`);
        const log = generateDiagnoseContent();
        fs.writeFileSync(path.resolve(dir, "diagnose.log"), log);
      } catch (error) {
        onError(error);
      }
    }
    function generateDiagnoseContent() {
      const vscode = safeRequire("vscode");
      const vscodeEnv = vscode && vscode.env || {};
      const packageJson = getPackageJson();
      return JSON.stringify({
        vscodeAppName: vscodeEnv.appName,
        vscodeAppRoot: vscodeEnv.appRoot,
        vscodeLanguage: vscodeEnv.language,
        packageJsonOk: !!packageJson,
        dependencies: getDependencies(packageJson)
      }, null, 2);
    }
    function getDependencies(packageJson) {
      if (!packageJson || typeof packageJson !== "object") {
        return [];
      }
      const { dependencies } = packageJson;
      if (!dependencies || typeof dependencies !== "object") {
        return [];
      }
      try {
        return Object.keys(dependencies).map((name) => {
          const modulePath = getModulePath(name);
          return {
            name,
            path: modulePath,
            ok: isModuleExisted(name)
          };
        });
      } catch (error) {
        onError(error);
        return [];
      }
    }
    function getPackageJson() {
      try {
        return JSON.parse(fs.readFileSync(getFilePath("package.json"), "utf8"));
      } catch (error) {
        onError(error);
        return null;
      }
    }
    function safeRequire(name) {
      try {
        return (
          /** @type {T} */
          require(name)
        );
      } catch (error) {
        onError(error);
        return void 0;
      }
    }
    function isModuleExisted(name) {
      try {
        return fs.existsSync(getModulePath(name));
      } catch (error) {
        onError(error);
        return false;
      }
    }
    function isWritable(dir) {
      try {
        fs.accessSync(dir, fs.constants.W_OK);
        return true;
      } catch (error) {
        void error;
        return false;
      }
    }
    function onError(error) {
      console.error(`EnvironmentProbe:`, error);
    }
  }
});

// lib/extensionMain.js
var require_extensionMain = __commonJS({
  "lib/extensionMain.js"(exports2, module2) {
    "use strict";
    var vscode = require("vscode");
    var ext = (
      /** @type {any} */
      require_VSCodeHelper()
    );
    var uploader = require_Uploader();
    var log = require_Log();
    var outLog = require_OutputChannelLog();
    var statusBar = require_StatusBarManager();
    var localServer = require_LocalServer();
    var uploadObject = require_UploadObject();
    var { isDebugMode } = require_Constants();
    var runtime = require_runtime();
    var { applyTrackingConfigToState } = require_hostTiming();
    var { installErrorHooks } = require_installErrorHooks();
    var modeController = require_modeController();
    var { updateConfigurations } = require_configuration();
    var { wrapUploadObjectGenerators } = require_wrapGenerators();
    var { createOpenCodeTracker } = require_OpenCodeTracker();
    var { createAfkMonitor } = require_afkMonitor();
    var { createTerminalTracker } = require_terminalTracker();
    var { createChatTracker } = require_chatTracker();
    var { registerGlobalActivityHooks } = require_globalActivityHooks();
    var runtimeSession = null;
    function buildConfigDeps(context, state, afk) {
      return {
        vscode,
        ext,
        uploader,
        log,
        outLog,
        statusBar,
        localServer,
        uploadObject,
        state,
        activationContext: context,
        applyAfkConfig: (
          /** @type {(enabled:boolean, timeoutMs:number)=>void} */
          ((enabled, timeoutMs) => afk.applyConfig(enabled, timeoutMs))
        )
      };
    }
    async function activate(context) {
      try {
        outLog.start();
      } catch (_) {
      }
      try {
        outLog.debug("SlashCoded: activating extension...");
      } catch (_) {
      }
      installErrorHooks(log);
      if (isDebugMode) {
        try {
          require_EnvironmentProbe().generateDiagnoseLogFile();
        } catch (_) {
        }
      }
      const state = runtime.createInitialState();
      const syncTrackingConfig = () => {
        try {
          const trackingConfig = uploader.getTrackingConfig ? uploader.getTrackingConfig() : state.hostTrackingConfig;
          if (trackingConfig) applyTrackingConfigToState(state, trackingConfig);
          afk.applyConfig(state.trackAFK, state.afkTimeoutMs);
        } catch (e) {
          try {
            log.debug("Failed to sync tracking config from uploader", e);
          } catch (_) {
          }
        }
      };
      uploadObject.init();
      localServer.init(context);
      uploader.init(context);
      wrapUploadObjectGenerators({ uploadObject, uploader, log, isDebugMode });
      const modeDeps = { statusBar, state };
      const mode = {
        updateModeBasedOnState: () => modeController.updateModeBasedOnState(modeDeps),
        refreshStatusBarMode: () => modeController.refreshStatusBarMode(modeDeps)
      };
      let recordUserActivity = () => {
        state.lastUserActivity = Date.now();
      };
      const openCode = createOpenCodeTracker({
        vscode,
        ext,
        log,
        isDebugMode,
        state,
        uploader,
        uploadObject,
        mode,
        recordUserActivity: () => recordUserActivity()
      });
      const afk = createAfkMonitor({
        vscode,
        log,
        isDebugMode,
        statusBar,
        state,
        uploadObject,
        uploader,
        openCode,
        mode
      });
      recordUserActivity = afk.recordUserActivity;
      const chat = createChatTracker({
        vscode,
        log,
        isDebugMode,
        state,
        uploadObject,
        uploader,
        openCode,
        mode,
        recordUserActivity: () => recordUserActivity()
      });
      const terminal = createTerminalTracker({
        vscode,
        log,
        isDebugMode,
        state,
        uploadObject,
        uploader,
        openCode,
        mode,
        recordUserActivity: () => recordUserActivity(),
        isChatLikeTab: chat.isChatLikeTab
      });
      const registerGlobalHooks = registerGlobalActivityHooks({
        vscode,
        log,
        isDebugMode,
        uploadObject,
        uploader,
        state,
        openCode,
        mode,
        recordUserActivity: () => recordUserActivity()
      });
      const configDeps = buildConfigDeps(context, state, afk);
      await updateConfigurations(configDeps);
      try {
        await uploader.rediscover();
      } catch (_) {
      }
      syncTrackingConfig();
      const configWatcher = vscode.workspace.onDidChangeConfiguration(() => {
        updateConfigurations(configDeps).catch((e) => {
          try {
            log.error(e);
          } catch (_) {
          }
        });
      });
      context.subscriptions.push(configWatcher);
      context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => openCode.onFileCoding((e || runtime.EMPTY).document)));
      context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((e) => openCode.onActiveFileChange(e && e.document ? e.document : null)));
      context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection((e) => openCode.onIntentlyWatchingCodes((e || runtime.EMPTY).textEditor)));
      context.subscriptions.push(vscode.window.onDidChangeWindowState((ws) => openCode.onDidChangeWindowState(ws)));
      afk.start();
      context.subscriptions.push({ dispose: () => afk.stop() });
      afk.registerCommands(context.subscriptions);
      terminal.register(context.subscriptions);
      chat.register(context.subscriptions);
      try {
        const initialDoc = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.document : null;
        openCode.onActiveFileChange(initialDoc);
      } catch (_) {
      }
      registerGlobalHooks(context.subscriptions);
      registerUtilityCommands(context);
      try {
        const REFRESH_MS = 2e3;
        const refreshTimer = setInterval(() => {
          try {
            openCode.tick(Date.now());
          } catch (_) {
          }
          try {
            mode.updateModeBasedOnState();
          } catch (_) {
          }
        }, REFRESH_MS);
        const trackingConfigRefreshTimer = setInterval(() => {
          uploader.refreshTrackingConfig(false).then(() => syncTrackingConfig()).catch((e) => {
            try {
              log.debug("Tracking config refresh failed", e);
            } catch (_) {
            }
          });
        }, 5 * 60 * 1e3);
        runtimeSession = { state, openCode, afk, terminal, chat, refreshTimer: { refreshTimer, trackingConfigRefreshTimer }, configWatcher };
        context.subscriptions.push({ dispose: () => {
          try {
            clearInterval(refreshTimer);
          } catch (_) {
          }
        } });
        context.subscriptions.push({ dispose: () => {
          try {
            clearInterval(trackingConfigRefreshTimer);
          } catch (_) {
          }
        } });
      } catch (_) {
        runtimeSession = { state, openCode, afk, terminal, chat, refreshTimer: null, configWatcher };
      }
      mode.updateModeBasedOnState();
    }
    function registerUtilityCommands(context) {
      const subscriptions = context.subscriptions;
      const formatTimestamp = (
        /** @type {(ts: number) => string} */
        ((ts) => {
          if (!ts) return "Unknown";
          try {
            const d = new Date(ts);
            const delta = Date.now() - ts;
            const ago = delta > 0 ? `${Math.floor(delta / 1e3)}s ago` : "just now";
            return `${d.toLocaleString()} (${ago})`;
          } catch (_) {
            return "Unknown";
          }
        })
      );
      const showSyncStatus = async () => {
        const status = uploader.getStatusSnapshot ? uploader.getStatusSnapshot() : null;
        const items = (
          /** @type {(import('vscode').QuickPickItem & {action?:string})[]} */
          [
            {
              label: status && status.online ? "$(check) Online" : "$(debug-disconnect) Offline",
              detail: status && status.discovery && status.discovery.apiBaseUrl ? `Endpoint: ${status.discovery.apiBaseUrl}` : "Desktop app not detected"
            },
            {
              label: `Queue: ${status && typeof status.queueLength === "number" ? status.queueLength : 0} pending`,
              detail: status && status.oldestQueuedAt ? `Oldest queued: ${formatTimestamp(status.oldestQueuedAt)}` : "No pending uploads"
            },
            {
              label: "Last handshake",
              detail: status ? formatTimestamp(status.lastHandshakeAt) : "Not yet"
            },
            {
              label: "Token expiry",
              detail: status && status.tokenExpiresAt ? formatTimestamp(status.tokenExpiresAt) : "Not requested"
            },
            { label: "Queue local history for Desktop ingestion", action: "queue-local-history" },
            { label: "Force upload queued events now", action: "flush" },
            { label: "Re-discover Desktop App", action: "rediscover" }
          ]
        );
        const pick = await vscode.window.showQuickPick(items, { placeHolder: "SlashCoded sync status" });
        if (!pick) return;
        if (pick.action === "queue-local-history") {
          try {
            const result = await uploader.queueLocalHistoryForDesktop();
            const importedCount = result && typeof result.importedCount === "number" ? result.importedCount : 0;
            vscode.window.showInformationMessage(importedCount > 0 ? `SlashCoded: queued ${importedCount} local event${importedCount === 1 ? "" : "s"} for Desktop ingestion.` : "SlashCoded: no local-only history found to queue.");
          } catch (e) {
            log.error(e);
          }
        } else if (pick.action === "flush") {
          try {
            uploader.forceDrain();
            vscode.window.showInformationMessage("SlashCoded: Upload queue flush requested.");
          } catch (e) {
            log.error(e);
          }
        } else if (pick.action === "rediscover") {
          try {
            await uploader.rediscover();
            vscode.window.showInformationMessage("SlashCoded: Desktop re-discovery triggered.");
          } catch (e) {
            log.error(e);
          }
        }
      };
      subscriptions.push(vscode.commands.registerCommand("slashCoded.showSyncStatus", () => showSyncStatus()));
      subscriptions.push(vscode.commands.registerCommand("slashCoded.queueLocalHistoryForDesktop", async () => {
        try {
          const result = await uploader.queueLocalHistoryForDesktop();
          const importedCount = result && typeof result.importedCount === "number" ? result.importedCount : 0;
          vscode.window.showInformationMessage(importedCount > 0 ? `SlashCoded: queued ${importedCount} local event${importedCount === 1 ? "" : "s"} for Desktop ingestion.` : "SlashCoded: no local-only history found to queue.");
        } catch (e) {
          log.error(e);
        }
      }));
      subscriptions.push(vscode.commands.registerCommand("slashCoded.showOutput", () => {
        try {
          require_OutputChannelLog().show();
        } catch (_) {
        }
      }));
    }
    function deactivate() {
      try {
        if (runtimeSession && runtimeSession.openCode) {
          runtimeSession.openCode.onActiveFileChange(null);
          runtimeSession.openCode.dispose();
        }
      } catch (_) {
      }
      try {
        if (runtimeSession && runtimeSession.terminal) runtimeSession.terminal.dispose();
      } catch (_) {
      }
      try {
        if (runtimeSession && runtimeSession.chat) runtimeSession.chat.dispose();
      } catch (_) {
      }
      try {
        if (runtimeSession && runtimeSession.afk) runtimeSession.afk.stop();
      } catch (_) {
      }
      try {
        localServer.dispose();
      } catch (_) {
      }
      try {
        if (runtimeSession && runtimeSession.refreshTimer) {
          const timerValue = runtimeSession.refreshTimer;
          if (timerValue && typeof timerValue === "object") {
            if (timerValue.refreshTimer) clearInterval(timerValue.refreshTimer);
            if (timerValue.trackingConfigRefreshTimer) clearInterval(timerValue.trackingConfigRefreshTimer);
          } else {
            clearInterval(timerValue);
          }
        }
      } catch (_) {
      }
      try {
        log.end();
      } catch (_) {
      }
    }
    module2.exports = { activate, deactivate };
  }
});

// extension.js
module.exports = require_extensionMain();
/**
 * This codes is modified from "gitPaths.ts" in repository "DonJayamanne/gitHistoryVSCode"
 *
 * TODO: Use the method likes `getExtension('vscode.git')` to re-implement this module.
 *
 * @license MIT
 * @author DonJayamanne<don.jayamanne@yahoo.com>
 * @see https://github.com/DonJayamanne/gitHistoryVSCode/blob/master/src/adapter/exec/gitCommandExec.ts
 * @see https://github.com/DonJayamanne/gitHistoryVSCode/blob/master/src/adapter/repository/git.ts
 */
