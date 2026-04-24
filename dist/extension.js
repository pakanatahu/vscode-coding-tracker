"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

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
    function getWhichProjectDocumentBelongsTo(document2, defaultProjectPath) {
      if (!vscode.workspace.getWorkspaceFolder)
        return defaultProjectPath;
      if (!document2 || !document2.uri)
        return defaultProjectPath;
      const { uri } = document2;
      if (uri.scheme != "file")
        return defaultProjectPath;
      const folder = vscode.workspace.getWorkspaceFolder(uri);
      if (!folder)
        return defaultProjectPath;
      return folder.uri.fsPath;
    }
  }
});

// node_modules/delayed-stream/lib/delayed_stream.js
var require_delayed_stream = __commonJS({
  "node_modules/delayed-stream/lib/delayed_stream.js"(exports2, module2) {
    var Stream = require("stream").Stream;
    var util = require("util");
    module2.exports = DelayedStream;
    function DelayedStream() {
      this.source = null;
      this.dataSize = 0;
      this.maxDataSize = 1024 * 1024;
      this.pauseStream = true;
      this._maxDataSizeExceeded = false;
      this._released = false;
      this._bufferedEvents = [];
    }
    util.inherits(DelayedStream, Stream);
    DelayedStream.create = function(source, options) {
      var delayedStream = new this();
      options = options || {};
      for (var option in options) {
        delayedStream[option] = options[option];
      }
      delayedStream.source = source;
      var realEmit = source.emit;
      source.emit = function() {
        delayedStream._handleEmit(arguments);
        return realEmit.apply(source, arguments);
      };
      source.on("error", function() {
      });
      if (delayedStream.pauseStream) {
        source.pause();
      }
      return delayedStream;
    };
    Object.defineProperty(DelayedStream.prototype, "readable", {
      configurable: true,
      enumerable: true,
      get: function() {
        return this.source.readable;
      }
    });
    DelayedStream.prototype.setEncoding = function() {
      return this.source.setEncoding.apply(this.source, arguments);
    };
    DelayedStream.prototype.resume = function() {
      if (!this._released) {
        this.release();
      }
      this.source.resume();
    };
    DelayedStream.prototype.pause = function() {
      this.source.pause();
    };
    DelayedStream.prototype.release = function() {
      this._released = true;
      this._bufferedEvents.forEach(function(args) {
        this.emit.apply(this, args);
      }.bind(this));
      this._bufferedEvents = [];
    };
    DelayedStream.prototype.pipe = function() {
      var r = Stream.prototype.pipe.apply(this, arguments);
      this.resume();
      return r;
    };
    DelayedStream.prototype._handleEmit = function(args) {
      if (this._released) {
        this.emit.apply(this, args);
        return;
      }
      if (args[0] === "data") {
        this.dataSize += args[1].length;
        this._checkIfMaxDataSizeExceeded();
      }
      this._bufferedEvents.push(args);
    };
    DelayedStream.prototype._checkIfMaxDataSizeExceeded = function() {
      if (this._maxDataSizeExceeded) {
        return;
      }
      if (this.dataSize <= this.maxDataSize) {
        return;
      }
      this._maxDataSizeExceeded = true;
      var message = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
      this.emit("error", new Error(message));
    };
  }
});

// node_modules/combined-stream/lib/combined_stream.js
var require_combined_stream = __commonJS({
  "node_modules/combined-stream/lib/combined_stream.js"(exports2, module2) {
    var util = require("util");
    var Stream = require("stream").Stream;
    var DelayedStream = require_delayed_stream();
    module2.exports = CombinedStream;
    function CombinedStream() {
      this.writable = false;
      this.readable = true;
      this.dataSize = 0;
      this.maxDataSize = 2 * 1024 * 1024;
      this.pauseStreams = true;
      this._released = false;
      this._streams = [];
      this._currentStream = null;
      this._insideLoop = false;
      this._pendingNext = false;
    }
    util.inherits(CombinedStream, Stream);
    CombinedStream.create = function(options) {
      var combinedStream = new this();
      options = options || {};
      for (var option in options) {
        combinedStream[option] = options[option];
      }
      return combinedStream;
    };
    CombinedStream.isStreamLike = function(stream) {
      return typeof stream !== "function" && typeof stream !== "string" && typeof stream !== "boolean" && typeof stream !== "number" && !Buffer.isBuffer(stream);
    };
    CombinedStream.prototype.append = function(stream) {
      var isStreamLike = CombinedStream.isStreamLike(stream);
      if (isStreamLike) {
        if (!(stream instanceof DelayedStream)) {
          var newStream = DelayedStream.create(stream, {
            maxDataSize: Infinity,
            pauseStream: this.pauseStreams
          });
          stream.on("data", this._checkDataSize.bind(this));
          stream = newStream;
        }
        this._handleErrors(stream);
        if (this.pauseStreams) {
          stream.pause();
        }
      }
      this._streams.push(stream);
      return this;
    };
    CombinedStream.prototype.pipe = function(dest, options) {
      Stream.prototype.pipe.call(this, dest, options);
      this.resume();
      return dest;
    };
    CombinedStream.prototype._getNext = function() {
      this._currentStream = null;
      if (this._insideLoop) {
        this._pendingNext = true;
        return;
      }
      this._insideLoop = true;
      try {
        do {
          this._pendingNext = false;
          this._realGetNext();
        } while (this._pendingNext);
      } finally {
        this._insideLoop = false;
      }
    };
    CombinedStream.prototype._realGetNext = function() {
      var stream = this._streams.shift();
      if (typeof stream == "undefined") {
        this.end();
        return;
      }
      if (typeof stream !== "function") {
        this._pipeNext(stream);
        return;
      }
      var getStream = stream;
      getStream(function(stream2) {
        var isStreamLike = CombinedStream.isStreamLike(stream2);
        if (isStreamLike) {
          stream2.on("data", this._checkDataSize.bind(this));
          this._handleErrors(stream2);
        }
        this._pipeNext(stream2);
      }.bind(this));
    };
    CombinedStream.prototype._pipeNext = function(stream) {
      this._currentStream = stream;
      var isStreamLike = CombinedStream.isStreamLike(stream);
      if (isStreamLike) {
        stream.on("end", this._getNext.bind(this));
        stream.pipe(this, { end: false });
        return;
      }
      var value = stream;
      this.write(value);
      this._getNext();
    };
    CombinedStream.prototype._handleErrors = function(stream) {
      var self2 = this;
      stream.on("error", function(err) {
        self2._emitError(err);
      });
    };
    CombinedStream.prototype.write = function(data) {
      this.emit("data", data);
    };
    CombinedStream.prototype.pause = function() {
      if (!this.pauseStreams) {
        return;
      }
      if (this.pauseStreams && this._currentStream && typeof this._currentStream.pause == "function") this._currentStream.pause();
      this.emit("pause");
    };
    CombinedStream.prototype.resume = function() {
      if (!this._released) {
        this._released = true;
        this.writable = true;
        this._getNext();
      }
      if (this.pauseStreams && this._currentStream && typeof this._currentStream.resume == "function") this._currentStream.resume();
      this.emit("resume");
    };
    CombinedStream.prototype.end = function() {
      this._reset();
      this.emit("end");
    };
    CombinedStream.prototype.destroy = function() {
      this._reset();
      this.emit("close");
    };
    CombinedStream.prototype._reset = function() {
      this.writable = false;
      this._streams = [];
      this._currentStream = null;
    };
    CombinedStream.prototype._checkDataSize = function() {
      this._updateDataSize();
      if (this.dataSize <= this.maxDataSize) {
        return;
      }
      var message = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
      this._emitError(new Error(message));
    };
    CombinedStream.prototype._updateDataSize = function() {
      this.dataSize = 0;
      var self2 = this;
      this._streams.forEach(function(stream) {
        if (!stream.dataSize) {
          return;
        }
        self2.dataSize += stream.dataSize;
      });
      if (this._currentStream && this._currentStream.dataSize) {
        this.dataSize += this._currentStream.dataSize;
      }
    };
    CombinedStream.prototype._emitError = function(err) {
      this._reset();
      this.emit("error", err);
    };
  }
});

// node_modules/mime-db/db.json
var require_db = __commonJS({
  "node_modules/mime-db/db.json"(exports2, module2) {
    module2.exports = {
      "application/1d-interleaved-parityfec": {
        source: "iana"
      },
      "application/3gpdash-qoe-report+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/3gpp-ims+xml": {
        source: "iana",
        compressible: true
      },
      "application/3gpphal+json": {
        source: "iana",
        compressible: true
      },
      "application/3gpphalforms+json": {
        source: "iana",
        compressible: true
      },
      "application/a2l": {
        source: "iana"
      },
      "application/ace+cbor": {
        source: "iana"
      },
      "application/activemessage": {
        source: "iana"
      },
      "application/activity+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-costmap+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-costmapfilter+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-directory+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointcost+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointcostparams+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointprop+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-endpointpropparams+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-error+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-networkmap+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-networkmapfilter+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-updatestreamcontrol+json": {
        source: "iana",
        compressible: true
      },
      "application/alto-updatestreamparams+json": {
        source: "iana",
        compressible: true
      },
      "application/aml": {
        source: "iana"
      },
      "application/andrew-inset": {
        source: "iana",
        extensions: ["ez"]
      },
      "application/applefile": {
        source: "iana"
      },
      "application/applixware": {
        source: "apache",
        extensions: ["aw"]
      },
      "application/at+jwt": {
        source: "iana"
      },
      "application/atf": {
        source: "iana"
      },
      "application/atfx": {
        source: "iana"
      },
      "application/atom+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atom"]
      },
      "application/atomcat+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atomcat"]
      },
      "application/atomdeleted+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atomdeleted"]
      },
      "application/atomicmail": {
        source: "iana"
      },
      "application/atomsvc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["atomsvc"]
      },
      "application/atsc-dwd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dwd"]
      },
      "application/atsc-dynamic-event-message": {
        source: "iana"
      },
      "application/atsc-held+xml": {
        source: "iana",
        compressible: true,
        extensions: ["held"]
      },
      "application/atsc-rdt+json": {
        source: "iana",
        compressible: true
      },
      "application/atsc-rsat+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rsat"]
      },
      "application/atxml": {
        source: "iana"
      },
      "application/auth-policy+xml": {
        source: "iana",
        compressible: true
      },
      "application/bacnet-xdd+zip": {
        source: "iana",
        compressible: false
      },
      "application/batch-smtp": {
        source: "iana"
      },
      "application/bdoc": {
        compressible: false,
        extensions: ["bdoc"]
      },
      "application/beep+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/calendar+json": {
        source: "iana",
        compressible: true
      },
      "application/calendar+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xcs"]
      },
      "application/call-completion": {
        source: "iana"
      },
      "application/cals-1840": {
        source: "iana"
      },
      "application/captive+json": {
        source: "iana",
        compressible: true
      },
      "application/cbor": {
        source: "iana"
      },
      "application/cbor-seq": {
        source: "iana"
      },
      "application/cccex": {
        source: "iana"
      },
      "application/ccmp+xml": {
        source: "iana",
        compressible: true
      },
      "application/ccxml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ccxml"]
      },
      "application/cdfx+xml": {
        source: "iana",
        compressible: true,
        extensions: ["cdfx"]
      },
      "application/cdmi-capability": {
        source: "iana",
        extensions: ["cdmia"]
      },
      "application/cdmi-container": {
        source: "iana",
        extensions: ["cdmic"]
      },
      "application/cdmi-domain": {
        source: "iana",
        extensions: ["cdmid"]
      },
      "application/cdmi-object": {
        source: "iana",
        extensions: ["cdmio"]
      },
      "application/cdmi-queue": {
        source: "iana",
        extensions: ["cdmiq"]
      },
      "application/cdni": {
        source: "iana"
      },
      "application/cea": {
        source: "iana"
      },
      "application/cea-2018+xml": {
        source: "iana",
        compressible: true
      },
      "application/cellml+xml": {
        source: "iana",
        compressible: true
      },
      "application/cfw": {
        source: "iana"
      },
      "application/clr": {
        source: "iana"
      },
      "application/clue+xml": {
        source: "iana",
        compressible: true
      },
      "application/clue_info+xml": {
        source: "iana",
        compressible: true
      },
      "application/cms": {
        source: "iana"
      },
      "application/cnrp+xml": {
        source: "iana",
        compressible: true
      },
      "application/coap-group+json": {
        source: "iana",
        compressible: true
      },
      "application/coap-payload": {
        source: "iana"
      },
      "application/commonground": {
        source: "iana"
      },
      "application/conference-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/cose": {
        source: "iana"
      },
      "application/cose-key": {
        source: "iana"
      },
      "application/cose-key-set": {
        source: "iana"
      },
      "application/cpl+xml": {
        source: "iana",
        compressible: true
      },
      "application/csrattrs": {
        source: "iana"
      },
      "application/csta+xml": {
        source: "iana",
        compressible: true
      },
      "application/cstadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/csvm+json": {
        source: "iana",
        compressible: true
      },
      "application/cu-seeme": {
        source: "apache",
        extensions: ["cu"]
      },
      "application/cwt": {
        source: "iana"
      },
      "application/cybercash": {
        source: "iana"
      },
      "application/dart": {
        compressible: true
      },
      "application/dash+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpd"]
      },
      "application/dashdelta": {
        source: "iana"
      },
      "application/davmount+xml": {
        source: "iana",
        compressible: true,
        extensions: ["davmount"]
      },
      "application/dca-rft": {
        source: "iana"
      },
      "application/dcd": {
        source: "iana"
      },
      "application/dec-dx": {
        source: "iana"
      },
      "application/dialog-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/dicom": {
        source: "iana"
      },
      "application/dicom+json": {
        source: "iana",
        compressible: true
      },
      "application/dicom+xml": {
        source: "iana",
        compressible: true
      },
      "application/dii": {
        source: "iana"
      },
      "application/dit": {
        source: "iana"
      },
      "application/dns": {
        source: "iana"
      },
      "application/dns+json": {
        source: "iana",
        compressible: true
      },
      "application/dns-message": {
        source: "iana"
      },
      "application/docbook+xml": {
        source: "apache",
        compressible: true,
        extensions: ["dbk"]
      },
      "application/dots+cbor": {
        source: "iana"
      },
      "application/dskpp+xml": {
        source: "iana",
        compressible: true
      },
      "application/dssc+der": {
        source: "iana",
        extensions: ["dssc"]
      },
      "application/dssc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdssc"]
      },
      "application/dvcs": {
        source: "iana"
      },
      "application/ecmascript": {
        source: "iana",
        compressible: true,
        extensions: ["es", "ecma"]
      },
      "application/edi-consent": {
        source: "iana"
      },
      "application/edi-x12": {
        source: "iana",
        compressible: false
      },
      "application/edifact": {
        source: "iana",
        compressible: false
      },
      "application/efi": {
        source: "iana"
      },
      "application/elm+json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/elm+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.cap+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/emergencycalldata.comment+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.control+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.deviceinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.ecall.msd": {
        source: "iana"
      },
      "application/emergencycalldata.providerinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.serviceinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.subscriberinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/emergencycalldata.veds+xml": {
        source: "iana",
        compressible: true
      },
      "application/emma+xml": {
        source: "iana",
        compressible: true,
        extensions: ["emma"]
      },
      "application/emotionml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["emotionml"]
      },
      "application/encaprtp": {
        source: "iana"
      },
      "application/epp+xml": {
        source: "iana",
        compressible: true
      },
      "application/epub+zip": {
        source: "iana",
        compressible: false,
        extensions: ["epub"]
      },
      "application/eshop": {
        source: "iana"
      },
      "application/exi": {
        source: "iana",
        extensions: ["exi"]
      },
      "application/expect-ct-report+json": {
        source: "iana",
        compressible: true
      },
      "application/express": {
        source: "iana",
        extensions: ["exp"]
      },
      "application/fastinfoset": {
        source: "iana"
      },
      "application/fastsoap": {
        source: "iana"
      },
      "application/fdt+xml": {
        source: "iana",
        compressible: true,
        extensions: ["fdt"]
      },
      "application/fhir+json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/fhir+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/fido.trusted-apps+json": {
        compressible: true
      },
      "application/fits": {
        source: "iana"
      },
      "application/flexfec": {
        source: "iana"
      },
      "application/font-sfnt": {
        source: "iana"
      },
      "application/font-tdpfr": {
        source: "iana",
        extensions: ["pfr"]
      },
      "application/font-woff": {
        source: "iana",
        compressible: false
      },
      "application/framework-attributes+xml": {
        source: "iana",
        compressible: true
      },
      "application/geo+json": {
        source: "iana",
        compressible: true,
        extensions: ["geojson"]
      },
      "application/geo+json-seq": {
        source: "iana"
      },
      "application/geopackage+sqlite3": {
        source: "iana"
      },
      "application/geoxacml+xml": {
        source: "iana",
        compressible: true
      },
      "application/gltf-buffer": {
        source: "iana"
      },
      "application/gml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["gml"]
      },
      "application/gpx+xml": {
        source: "apache",
        compressible: true,
        extensions: ["gpx"]
      },
      "application/gxf": {
        source: "apache",
        extensions: ["gxf"]
      },
      "application/gzip": {
        source: "iana",
        compressible: false,
        extensions: ["gz"]
      },
      "application/h224": {
        source: "iana"
      },
      "application/held+xml": {
        source: "iana",
        compressible: true
      },
      "application/hjson": {
        extensions: ["hjson"]
      },
      "application/http": {
        source: "iana"
      },
      "application/hyperstudio": {
        source: "iana",
        extensions: ["stk"]
      },
      "application/ibe-key-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/ibe-pkg-reply+xml": {
        source: "iana",
        compressible: true
      },
      "application/ibe-pp-data": {
        source: "iana"
      },
      "application/iges": {
        source: "iana"
      },
      "application/im-iscomposing+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/index": {
        source: "iana"
      },
      "application/index.cmd": {
        source: "iana"
      },
      "application/index.obj": {
        source: "iana"
      },
      "application/index.response": {
        source: "iana"
      },
      "application/index.vnd": {
        source: "iana"
      },
      "application/inkml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ink", "inkml"]
      },
      "application/iotp": {
        source: "iana"
      },
      "application/ipfix": {
        source: "iana",
        extensions: ["ipfix"]
      },
      "application/ipp": {
        source: "iana"
      },
      "application/isup": {
        source: "iana"
      },
      "application/its+xml": {
        source: "iana",
        compressible: true,
        extensions: ["its"]
      },
      "application/java-archive": {
        source: "apache",
        compressible: false,
        extensions: ["jar", "war", "ear"]
      },
      "application/java-serialized-object": {
        source: "apache",
        compressible: false,
        extensions: ["ser"]
      },
      "application/java-vm": {
        source: "apache",
        compressible: false,
        extensions: ["class"]
      },
      "application/javascript": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["js", "mjs"]
      },
      "application/jf2feed+json": {
        source: "iana",
        compressible: true
      },
      "application/jose": {
        source: "iana"
      },
      "application/jose+json": {
        source: "iana",
        compressible: true
      },
      "application/jrd+json": {
        source: "iana",
        compressible: true
      },
      "application/jscalendar+json": {
        source: "iana",
        compressible: true
      },
      "application/json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["json", "map"]
      },
      "application/json-patch+json": {
        source: "iana",
        compressible: true
      },
      "application/json-seq": {
        source: "iana"
      },
      "application/json5": {
        extensions: ["json5"]
      },
      "application/jsonml+json": {
        source: "apache",
        compressible: true,
        extensions: ["jsonml"]
      },
      "application/jwk+json": {
        source: "iana",
        compressible: true
      },
      "application/jwk-set+json": {
        source: "iana",
        compressible: true
      },
      "application/jwt": {
        source: "iana"
      },
      "application/kpml-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/kpml-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/ld+json": {
        source: "iana",
        compressible: true,
        extensions: ["jsonld"]
      },
      "application/lgr+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lgr"]
      },
      "application/link-format": {
        source: "iana"
      },
      "application/load-control+xml": {
        source: "iana",
        compressible: true
      },
      "application/lost+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lostxml"]
      },
      "application/lostsync+xml": {
        source: "iana",
        compressible: true
      },
      "application/lpf+zip": {
        source: "iana",
        compressible: false
      },
      "application/lxf": {
        source: "iana"
      },
      "application/mac-binhex40": {
        source: "iana",
        extensions: ["hqx"]
      },
      "application/mac-compactpro": {
        source: "apache",
        extensions: ["cpt"]
      },
      "application/macwriteii": {
        source: "iana"
      },
      "application/mads+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mads"]
      },
      "application/manifest+json": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["webmanifest"]
      },
      "application/marc": {
        source: "iana",
        extensions: ["mrc"]
      },
      "application/marcxml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mrcx"]
      },
      "application/mathematica": {
        source: "iana",
        extensions: ["ma", "nb", "mb"]
      },
      "application/mathml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mathml"]
      },
      "application/mathml-content+xml": {
        source: "iana",
        compressible: true
      },
      "application/mathml-presentation+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-associated-procedure-description+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-deregister+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-envelope+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-msk+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-msk-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-protection-description+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-reception-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-register+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-register-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-schedule+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbms-user-service-description+xml": {
        source: "iana",
        compressible: true
      },
      "application/mbox": {
        source: "iana",
        extensions: ["mbox"]
      },
      "application/media-policy-dataset+xml": {
        source: "iana",
        compressible: true
      },
      "application/media_control+xml": {
        source: "iana",
        compressible: true
      },
      "application/mediaservercontrol+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mscml"]
      },
      "application/merge-patch+json": {
        source: "iana",
        compressible: true
      },
      "application/metalink+xml": {
        source: "apache",
        compressible: true,
        extensions: ["metalink"]
      },
      "application/metalink4+xml": {
        source: "iana",
        compressible: true,
        extensions: ["meta4"]
      },
      "application/mets+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mets"]
      },
      "application/mf4": {
        source: "iana"
      },
      "application/mikey": {
        source: "iana"
      },
      "application/mipc": {
        source: "iana"
      },
      "application/missing-blocks+cbor-seq": {
        source: "iana"
      },
      "application/mmt-aei+xml": {
        source: "iana",
        compressible: true,
        extensions: ["maei"]
      },
      "application/mmt-usd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["musd"]
      },
      "application/mods+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mods"]
      },
      "application/moss-keys": {
        source: "iana"
      },
      "application/moss-signature": {
        source: "iana"
      },
      "application/mosskey-data": {
        source: "iana"
      },
      "application/mosskey-request": {
        source: "iana"
      },
      "application/mp21": {
        source: "iana",
        extensions: ["m21", "mp21"]
      },
      "application/mp4": {
        source: "iana",
        extensions: ["mp4s", "m4p"]
      },
      "application/mpeg4-generic": {
        source: "iana"
      },
      "application/mpeg4-iod": {
        source: "iana"
      },
      "application/mpeg4-iod-xmt": {
        source: "iana"
      },
      "application/mrb-consumer+xml": {
        source: "iana",
        compressible: true
      },
      "application/mrb-publish+xml": {
        source: "iana",
        compressible: true
      },
      "application/msc-ivr+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/msc-mixer+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/msword": {
        source: "iana",
        compressible: false,
        extensions: ["doc", "dot"]
      },
      "application/mud+json": {
        source: "iana",
        compressible: true
      },
      "application/multipart-core": {
        source: "iana"
      },
      "application/mxf": {
        source: "iana",
        extensions: ["mxf"]
      },
      "application/n-quads": {
        source: "iana",
        extensions: ["nq"]
      },
      "application/n-triples": {
        source: "iana",
        extensions: ["nt"]
      },
      "application/nasdata": {
        source: "iana"
      },
      "application/news-checkgroups": {
        source: "iana",
        charset: "US-ASCII"
      },
      "application/news-groupinfo": {
        source: "iana",
        charset: "US-ASCII"
      },
      "application/news-transmission": {
        source: "iana"
      },
      "application/nlsml+xml": {
        source: "iana",
        compressible: true
      },
      "application/node": {
        source: "iana",
        extensions: ["cjs"]
      },
      "application/nss": {
        source: "iana"
      },
      "application/oauth-authz-req+jwt": {
        source: "iana"
      },
      "application/ocsp-request": {
        source: "iana"
      },
      "application/ocsp-response": {
        source: "iana"
      },
      "application/octet-stream": {
        source: "iana",
        compressible: false,
        extensions: ["bin", "dms", "lrf", "mar", "so", "dist", "distz", "pkg", "bpk", "dump", "elc", "deploy", "exe", "dll", "deb", "dmg", "iso", "img", "msi", "msp", "msm", "buffer"]
      },
      "application/oda": {
        source: "iana",
        extensions: ["oda"]
      },
      "application/odm+xml": {
        source: "iana",
        compressible: true
      },
      "application/odx": {
        source: "iana"
      },
      "application/oebps-package+xml": {
        source: "iana",
        compressible: true,
        extensions: ["opf"]
      },
      "application/ogg": {
        source: "iana",
        compressible: false,
        extensions: ["ogx"]
      },
      "application/omdoc+xml": {
        source: "apache",
        compressible: true,
        extensions: ["omdoc"]
      },
      "application/onenote": {
        source: "apache",
        extensions: ["onetoc", "onetoc2", "onetmp", "onepkg"]
      },
      "application/opc-nodeset+xml": {
        source: "iana",
        compressible: true
      },
      "application/oscore": {
        source: "iana"
      },
      "application/oxps": {
        source: "iana",
        extensions: ["oxps"]
      },
      "application/p21": {
        source: "iana"
      },
      "application/p21+zip": {
        source: "iana",
        compressible: false
      },
      "application/p2p-overlay+xml": {
        source: "iana",
        compressible: true,
        extensions: ["relo"]
      },
      "application/parityfec": {
        source: "iana"
      },
      "application/passport": {
        source: "iana"
      },
      "application/patch-ops-error+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xer"]
      },
      "application/pdf": {
        source: "iana",
        compressible: false,
        extensions: ["pdf"]
      },
      "application/pdx": {
        source: "iana"
      },
      "application/pem-certificate-chain": {
        source: "iana"
      },
      "application/pgp-encrypted": {
        source: "iana",
        compressible: false,
        extensions: ["pgp"]
      },
      "application/pgp-keys": {
        source: "iana"
      },
      "application/pgp-signature": {
        source: "iana",
        extensions: ["asc", "sig"]
      },
      "application/pics-rules": {
        source: "apache",
        extensions: ["prf"]
      },
      "application/pidf+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/pidf-diff+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/pkcs10": {
        source: "iana",
        extensions: ["p10"]
      },
      "application/pkcs12": {
        source: "iana"
      },
      "application/pkcs7-mime": {
        source: "iana",
        extensions: ["p7m", "p7c"]
      },
      "application/pkcs7-signature": {
        source: "iana",
        extensions: ["p7s"]
      },
      "application/pkcs8": {
        source: "iana",
        extensions: ["p8"]
      },
      "application/pkcs8-encrypted": {
        source: "iana"
      },
      "application/pkix-attr-cert": {
        source: "iana",
        extensions: ["ac"]
      },
      "application/pkix-cert": {
        source: "iana",
        extensions: ["cer"]
      },
      "application/pkix-crl": {
        source: "iana",
        extensions: ["crl"]
      },
      "application/pkix-pkipath": {
        source: "iana",
        extensions: ["pkipath"]
      },
      "application/pkixcmp": {
        source: "iana",
        extensions: ["pki"]
      },
      "application/pls+xml": {
        source: "iana",
        compressible: true,
        extensions: ["pls"]
      },
      "application/poc-settings+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/postscript": {
        source: "iana",
        compressible: true,
        extensions: ["ai", "eps", "ps"]
      },
      "application/ppsp-tracker+json": {
        source: "iana",
        compressible: true
      },
      "application/problem+json": {
        source: "iana",
        compressible: true
      },
      "application/problem+xml": {
        source: "iana",
        compressible: true
      },
      "application/provenance+xml": {
        source: "iana",
        compressible: true,
        extensions: ["provx"]
      },
      "application/prs.alvestrand.titrax-sheet": {
        source: "iana"
      },
      "application/prs.cww": {
        source: "iana",
        extensions: ["cww"]
      },
      "application/prs.cyn": {
        source: "iana",
        charset: "7-BIT"
      },
      "application/prs.hpub+zip": {
        source: "iana",
        compressible: false
      },
      "application/prs.nprend": {
        source: "iana"
      },
      "application/prs.plucker": {
        source: "iana"
      },
      "application/prs.rdf-xml-crypt": {
        source: "iana"
      },
      "application/prs.xsf+xml": {
        source: "iana",
        compressible: true
      },
      "application/pskc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["pskcxml"]
      },
      "application/pvd+json": {
        source: "iana",
        compressible: true
      },
      "application/qsig": {
        source: "iana"
      },
      "application/raml+yaml": {
        compressible: true,
        extensions: ["raml"]
      },
      "application/raptorfec": {
        source: "iana"
      },
      "application/rdap+json": {
        source: "iana",
        compressible: true
      },
      "application/rdf+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rdf", "owl"]
      },
      "application/reginfo+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rif"]
      },
      "application/relax-ng-compact-syntax": {
        source: "iana",
        extensions: ["rnc"]
      },
      "application/remote-printing": {
        source: "iana"
      },
      "application/reputon+json": {
        source: "iana",
        compressible: true
      },
      "application/resource-lists+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rl"]
      },
      "application/resource-lists-diff+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rld"]
      },
      "application/rfc+xml": {
        source: "iana",
        compressible: true
      },
      "application/riscos": {
        source: "iana"
      },
      "application/rlmi+xml": {
        source: "iana",
        compressible: true
      },
      "application/rls-services+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rs"]
      },
      "application/route-apd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rapd"]
      },
      "application/route-s-tsid+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sls"]
      },
      "application/route-usd+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rusd"]
      },
      "application/rpki-ghostbusters": {
        source: "iana",
        extensions: ["gbr"]
      },
      "application/rpki-manifest": {
        source: "iana",
        extensions: ["mft"]
      },
      "application/rpki-publication": {
        source: "iana"
      },
      "application/rpki-roa": {
        source: "iana",
        extensions: ["roa"]
      },
      "application/rpki-updown": {
        source: "iana"
      },
      "application/rsd+xml": {
        source: "apache",
        compressible: true,
        extensions: ["rsd"]
      },
      "application/rss+xml": {
        source: "apache",
        compressible: true,
        extensions: ["rss"]
      },
      "application/rtf": {
        source: "iana",
        compressible: true,
        extensions: ["rtf"]
      },
      "application/rtploopback": {
        source: "iana"
      },
      "application/rtx": {
        source: "iana"
      },
      "application/samlassertion+xml": {
        source: "iana",
        compressible: true
      },
      "application/samlmetadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/sarif+json": {
        source: "iana",
        compressible: true
      },
      "application/sarif-external-properties+json": {
        source: "iana",
        compressible: true
      },
      "application/sbe": {
        source: "iana"
      },
      "application/sbml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sbml"]
      },
      "application/scaip+xml": {
        source: "iana",
        compressible: true
      },
      "application/scim+json": {
        source: "iana",
        compressible: true
      },
      "application/scvp-cv-request": {
        source: "iana",
        extensions: ["scq"]
      },
      "application/scvp-cv-response": {
        source: "iana",
        extensions: ["scs"]
      },
      "application/scvp-vp-request": {
        source: "iana",
        extensions: ["spq"]
      },
      "application/scvp-vp-response": {
        source: "iana",
        extensions: ["spp"]
      },
      "application/sdp": {
        source: "iana",
        extensions: ["sdp"]
      },
      "application/secevent+jwt": {
        source: "iana"
      },
      "application/senml+cbor": {
        source: "iana"
      },
      "application/senml+json": {
        source: "iana",
        compressible: true
      },
      "application/senml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["senmlx"]
      },
      "application/senml-etch+cbor": {
        source: "iana"
      },
      "application/senml-etch+json": {
        source: "iana",
        compressible: true
      },
      "application/senml-exi": {
        source: "iana"
      },
      "application/sensml+cbor": {
        source: "iana"
      },
      "application/sensml+json": {
        source: "iana",
        compressible: true
      },
      "application/sensml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sensmlx"]
      },
      "application/sensml-exi": {
        source: "iana"
      },
      "application/sep+xml": {
        source: "iana",
        compressible: true
      },
      "application/sep-exi": {
        source: "iana"
      },
      "application/session-info": {
        source: "iana"
      },
      "application/set-payment": {
        source: "iana"
      },
      "application/set-payment-initiation": {
        source: "iana",
        extensions: ["setpay"]
      },
      "application/set-registration": {
        source: "iana"
      },
      "application/set-registration-initiation": {
        source: "iana",
        extensions: ["setreg"]
      },
      "application/sgml": {
        source: "iana"
      },
      "application/sgml-open-catalog": {
        source: "iana"
      },
      "application/shf+xml": {
        source: "iana",
        compressible: true,
        extensions: ["shf"]
      },
      "application/sieve": {
        source: "iana",
        extensions: ["siv", "sieve"]
      },
      "application/simple-filter+xml": {
        source: "iana",
        compressible: true
      },
      "application/simple-message-summary": {
        source: "iana"
      },
      "application/simplesymbolcontainer": {
        source: "iana"
      },
      "application/sipc": {
        source: "iana"
      },
      "application/slate": {
        source: "iana"
      },
      "application/smil": {
        source: "iana"
      },
      "application/smil+xml": {
        source: "iana",
        compressible: true,
        extensions: ["smi", "smil"]
      },
      "application/smpte336m": {
        source: "iana"
      },
      "application/soap+fastinfoset": {
        source: "iana"
      },
      "application/soap+xml": {
        source: "iana",
        compressible: true
      },
      "application/sparql-query": {
        source: "iana",
        extensions: ["rq"]
      },
      "application/sparql-results+xml": {
        source: "iana",
        compressible: true,
        extensions: ["srx"]
      },
      "application/spdx+json": {
        source: "iana",
        compressible: true
      },
      "application/spirits-event+xml": {
        source: "iana",
        compressible: true
      },
      "application/sql": {
        source: "iana"
      },
      "application/srgs": {
        source: "iana",
        extensions: ["gram"]
      },
      "application/srgs+xml": {
        source: "iana",
        compressible: true,
        extensions: ["grxml"]
      },
      "application/sru+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sru"]
      },
      "application/ssdl+xml": {
        source: "apache",
        compressible: true,
        extensions: ["ssdl"]
      },
      "application/ssml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ssml"]
      },
      "application/stix+json": {
        source: "iana",
        compressible: true
      },
      "application/swid+xml": {
        source: "iana",
        compressible: true,
        extensions: ["swidtag"]
      },
      "application/tamp-apex-update": {
        source: "iana"
      },
      "application/tamp-apex-update-confirm": {
        source: "iana"
      },
      "application/tamp-community-update": {
        source: "iana"
      },
      "application/tamp-community-update-confirm": {
        source: "iana"
      },
      "application/tamp-error": {
        source: "iana"
      },
      "application/tamp-sequence-adjust": {
        source: "iana"
      },
      "application/tamp-sequence-adjust-confirm": {
        source: "iana"
      },
      "application/tamp-status-query": {
        source: "iana"
      },
      "application/tamp-status-response": {
        source: "iana"
      },
      "application/tamp-update": {
        source: "iana"
      },
      "application/tamp-update-confirm": {
        source: "iana"
      },
      "application/tar": {
        compressible: true
      },
      "application/taxii+json": {
        source: "iana",
        compressible: true
      },
      "application/td+json": {
        source: "iana",
        compressible: true
      },
      "application/tei+xml": {
        source: "iana",
        compressible: true,
        extensions: ["tei", "teicorpus"]
      },
      "application/tetra_isi": {
        source: "iana"
      },
      "application/thraud+xml": {
        source: "iana",
        compressible: true,
        extensions: ["tfi"]
      },
      "application/timestamp-query": {
        source: "iana"
      },
      "application/timestamp-reply": {
        source: "iana"
      },
      "application/timestamped-data": {
        source: "iana",
        extensions: ["tsd"]
      },
      "application/tlsrpt+gzip": {
        source: "iana"
      },
      "application/tlsrpt+json": {
        source: "iana",
        compressible: true
      },
      "application/tnauthlist": {
        source: "iana"
      },
      "application/token-introspection+jwt": {
        source: "iana"
      },
      "application/toml": {
        compressible: true,
        extensions: ["toml"]
      },
      "application/trickle-ice-sdpfrag": {
        source: "iana"
      },
      "application/trig": {
        source: "iana",
        extensions: ["trig"]
      },
      "application/ttml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ttml"]
      },
      "application/tve-trigger": {
        source: "iana"
      },
      "application/tzif": {
        source: "iana"
      },
      "application/tzif-leap": {
        source: "iana"
      },
      "application/ubjson": {
        compressible: false,
        extensions: ["ubj"]
      },
      "application/ulpfec": {
        source: "iana"
      },
      "application/urc-grpsheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/urc-ressheet+xml": {
        source: "iana",
        compressible: true,
        extensions: ["rsheet"]
      },
      "application/urc-targetdesc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["td"]
      },
      "application/urc-uisocketdesc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vcard+json": {
        source: "iana",
        compressible: true
      },
      "application/vcard+xml": {
        source: "iana",
        compressible: true
      },
      "application/vemmi": {
        source: "iana"
      },
      "application/vividence.scriptfile": {
        source: "apache"
      },
      "application/vnd.1000minds.decision-model+xml": {
        source: "iana",
        compressible: true,
        extensions: ["1km"]
      },
      "application/vnd.3gpp-prose+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp-prose-pc3ch+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp-v2x-local-service-information": {
        source: "iana"
      },
      "application/vnd.3gpp.5gnas": {
        source: "iana"
      },
      "application/vnd.3gpp.access-transfer-events+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.bsf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.gmop+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.gtpc": {
        source: "iana"
      },
      "application/vnd.3gpp.interworking-data": {
        source: "iana"
      },
      "application/vnd.3gpp.lpp": {
        source: "iana"
      },
      "application/vnd.3gpp.mc-signalling-ear": {
        source: "iana"
      },
      "application/vnd.3gpp.mcdata-affiliation-command+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-payload": {
        source: "iana"
      },
      "application/vnd.3gpp.mcdata-service-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-signalling": {
        source: "iana"
      },
      "application/vnd.3gpp.mcdata-ue-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcdata-user-profile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-affiliation-command+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-floor-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-location-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-mbms-usage-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-service-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-signed+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-ue-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-ue-init-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcptt-user-profile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-affiliation-command+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-affiliation-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-location-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-mbms-usage-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-service-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-transmission-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-ue-config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mcvideo-user-profile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.mid-call+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.ngap": {
        source: "iana"
      },
      "application/vnd.3gpp.pfcp": {
        source: "iana"
      },
      "application/vnd.3gpp.pic-bw-large": {
        source: "iana",
        extensions: ["plb"]
      },
      "application/vnd.3gpp.pic-bw-small": {
        source: "iana",
        extensions: ["psb"]
      },
      "application/vnd.3gpp.pic-bw-var": {
        source: "iana",
        extensions: ["pvb"]
      },
      "application/vnd.3gpp.s1ap": {
        source: "iana"
      },
      "application/vnd.3gpp.sms": {
        source: "iana"
      },
      "application/vnd.3gpp.sms+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.srvcc-ext+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.srvcc-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.state-and-event-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp.ussd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp2.bcmcsinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.3gpp2.sms": {
        source: "iana"
      },
      "application/vnd.3gpp2.tcap": {
        source: "iana",
        extensions: ["tcap"]
      },
      "application/vnd.3lightssoftware.imagescal": {
        source: "iana"
      },
      "application/vnd.3m.post-it-notes": {
        source: "iana",
        extensions: ["pwn"]
      },
      "application/vnd.accpac.simply.aso": {
        source: "iana",
        extensions: ["aso"]
      },
      "application/vnd.accpac.simply.imp": {
        source: "iana",
        extensions: ["imp"]
      },
      "application/vnd.acucobol": {
        source: "iana",
        extensions: ["acu"]
      },
      "application/vnd.acucorp": {
        source: "iana",
        extensions: ["atc", "acutc"]
      },
      "application/vnd.adobe.air-application-installer-package+zip": {
        source: "apache",
        compressible: false,
        extensions: ["air"]
      },
      "application/vnd.adobe.flash.movie": {
        source: "iana"
      },
      "application/vnd.adobe.formscentral.fcdt": {
        source: "iana",
        extensions: ["fcdt"]
      },
      "application/vnd.adobe.fxp": {
        source: "iana",
        extensions: ["fxp", "fxpl"]
      },
      "application/vnd.adobe.partial-upload": {
        source: "iana"
      },
      "application/vnd.adobe.xdp+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdp"]
      },
      "application/vnd.adobe.xfdf": {
        source: "iana",
        extensions: ["xfdf"]
      },
      "application/vnd.aether.imp": {
        source: "iana"
      },
      "application/vnd.afpc.afplinedata": {
        source: "iana"
      },
      "application/vnd.afpc.afplinedata-pagedef": {
        source: "iana"
      },
      "application/vnd.afpc.cmoca-cmresource": {
        source: "iana"
      },
      "application/vnd.afpc.foca-charset": {
        source: "iana"
      },
      "application/vnd.afpc.foca-codedfont": {
        source: "iana"
      },
      "application/vnd.afpc.foca-codepage": {
        source: "iana"
      },
      "application/vnd.afpc.modca": {
        source: "iana"
      },
      "application/vnd.afpc.modca-cmtable": {
        source: "iana"
      },
      "application/vnd.afpc.modca-formdef": {
        source: "iana"
      },
      "application/vnd.afpc.modca-mediummap": {
        source: "iana"
      },
      "application/vnd.afpc.modca-objectcontainer": {
        source: "iana"
      },
      "application/vnd.afpc.modca-overlay": {
        source: "iana"
      },
      "application/vnd.afpc.modca-pagesegment": {
        source: "iana"
      },
      "application/vnd.age": {
        source: "iana",
        extensions: ["age"]
      },
      "application/vnd.ah-barcode": {
        source: "iana"
      },
      "application/vnd.ahead.space": {
        source: "iana",
        extensions: ["ahead"]
      },
      "application/vnd.airzip.filesecure.azf": {
        source: "iana",
        extensions: ["azf"]
      },
      "application/vnd.airzip.filesecure.azs": {
        source: "iana",
        extensions: ["azs"]
      },
      "application/vnd.amadeus+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.amazon.ebook": {
        source: "apache",
        extensions: ["azw"]
      },
      "application/vnd.amazon.mobi8-ebook": {
        source: "iana"
      },
      "application/vnd.americandynamics.acc": {
        source: "iana",
        extensions: ["acc"]
      },
      "application/vnd.amiga.ami": {
        source: "iana",
        extensions: ["ami"]
      },
      "application/vnd.amundsen.maze+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.android.ota": {
        source: "iana"
      },
      "application/vnd.android.package-archive": {
        source: "apache",
        compressible: false,
        extensions: ["apk"]
      },
      "application/vnd.anki": {
        source: "iana"
      },
      "application/vnd.anser-web-certificate-issue-initiation": {
        source: "iana",
        extensions: ["cii"]
      },
      "application/vnd.anser-web-funds-transfer-initiation": {
        source: "apache",
        extensions: ["fti"]
      },
      "application/vnd.antix.game-component": {
        source: "iana",
        extensions: ["atx"]
      },
      "application/vnd.apache.arrow.file": {
        source: "iana"
      },
      "application/vnd.apache.arrow.stream": {
        source: "iana"
      },
      "application/vnd.apache.thrift.binary": {
        source: "iana"
      },
      "application/vnd.apache.thrift.compact": {
        source: "iana"
      },
      "application/vnd.apache.thrift.json": {
        source: "iana"
      },
      "application/vnd.api+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.aplextor.warrp+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.apothekende.reservation+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.apple.installer+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mpkg"]
      },
      "application/vnd.apple.keynote": {
        source: "iana",
        extensions: ["key"]
      },
      "application/vnd.apple.mpegurl": {
        source: "iana",
        extensions: ["m3u8"]
      },
      "application/vnd.apple.numbers": {
        source: "iana",
        extensions: ["numbers"]
      },
      "application/vnd.apple.pages": {
        source: "iana",
        extensions: ["pages"]
      },
      "application/vnd.apple.pkpass": {
        compressible: false,
        extensions: ["pkpass"]
      },
      "application/vnd.arastra.swi": {
        source: "iana"
      },
      "application/vnd.aristanetworks.swi": {
        source: "iana",
        extensions: ["swi"]
      },
      "application/vnd.artisan+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.artsquare": {
        source: "iana"
      },
      "application/vnd.astraea-software.iota": {
        source: "iana",
        extensions: ["iota"]
      },
      "application/vnd.audiograph": {
        source: "iana",
        extensions: ["aep"]
      },
      "application/vnd.autopackage": {
        source: "iana"
      },
      "application/vnd.avalon+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.avistar+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.balsamiq.bmml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["bmml"]
      },
      "application/vnd.balsamiq.bmpr": {
        source: "iana"
      },
      "application/vnd.banana-accounting": {
        source: "iana"
      },
      "application/vnd.bbf.usp.error": {
        source: "iana"
      },
      "application/vnd.bbf.usp.msg": {
        source: "iana"
      },
      "application/vnd.bbf.usp.msg+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.bekitzur-stech+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.bint.med-content": {
        source: "iana"
      },
      "application/vnd.biopax.rdf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.blink-idb-value-wrapper": {
        source: "iana"
      },
      "application/vnd.blueice.multipass": {
        source: "iana",
        extensions: ["mpm"]
      },
      "application/vnd.bluetooth.ep.oob": {
        source: "iana"
      },
      "application/vnd.bluetooth.le.oob": {
        source: "iana"
      },
      "application/vnd.bmi": {
        source: "iana",
        extensions: ["bmi"]
      },
      "application/vnd.bpf": {
        source: "iana"
      },
      "application/vnd.bpf3": {
        source: "iana"
      },
      "application/vnd.businessobjects": {
        source: "iana",
        extensions: ["rep"]
      },
      "application/vnd.byu.uapi+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cab-jscript": {
        source: "iana"
      },
      "application/vnd.canon-cpdl": {
        source: "iana"
      },
      "application/vnd.canon-lips": {
        source: "iana"
      },
      "application/vnd.capasystems-pg+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cendio.thinlinc.clientconf": {
        source: "iana"
      },
      "application/vnd.century-systems.tcp_stream": {
        source: "iana"
      },
      "application/vnd.chemdraw+xml": {
        source: "iana",
        compressible: true,
        extensions: ["cdxml"]
      },
      "application/vnd.chess-pgn": {
        source: "iana"
      },
      "application/vnd.chipnuts.karaoke-mmd": {
        source: "iana",
        extensions: ["mmd"]
      },
      "application/vnd.ciedi": {
        source: "iana"
      },
      "application/vnd.cinderella": {
        source: "iana",
        extensions: ["cdy"]
      },
      "application/vnd.cirpack.isdn-ext": {
        source: "iana"
      },
      "application/vnd.citationstyles.style+xml": {
        source: "iana",
        compressible: true,
        extensions: ["csl"]
      },
      "application/vnd.claymore": {
        source: "iana",
        extensions: ["cla"]
      },
      "application/vnd.cloanto.rp9": {
        source: "iana",
        extensions: ["rp9"]
      },
      "application/vnd.clonk.c4group": {
        source: "iana",
        extensions: ["c4g", "c4d", "c4f", "c4p", "c4u"]
      },
      "application/vnd.cluetrust.cartomobile-config": {
        source: "iana",
        extensions: ["c11amc"]
      },
      "application/vnd.cluetrust.cartomobile-config-pkg": {
        source: "iana",
        extensions: ["c11amz"]
      },
      "application/vnd.coffeescript": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.document": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.document-template": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.presentation": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.presentation-template": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.spreadsheet": {
        source: "iana"
      },
      "application/vnd.collabio.xodocuments.spreadsheet-template": {
        source: "iana"
      },
      "application/vnd.collection+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.collection.doc+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.collection.next+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.comicbook+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.comicbook-rar": {
        source: "iana"
      },
      "application/vnd.commerce-battelle": {
        source: "iana"
      },
      "application/vnd.commonspace": {
        source: "iana",
        extensions: ["csp"]
      },
      "application/vnd.contact.cmsg": {
        source: "iana",
        extensions: ["cdbcmsg"]
      },
      "application/vnd.coreos.ignition+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cosmocaller": {
        source: "iana",
        extensions: ["cmc"]
      },
      "application/vnd.crick.clicker": {
        source: "iana",
        extensions: ["clkx"]
      },
      "application/vnd.crick.clicker.keyboard": {
        source: "iana",
        extensions: ["clkk"]
      },
      "application/vnd.crick.clicker.palette": {
        source: "iana",
        extensions: ["clkp"]
      },
      "application/vnd.crick.clicker.template": {
        source: "iana",
        extensions: ["clkt"]
      },
      "application/vnd.crick.clicker.wordbank": {
        source: "iana",
        extensions: ["clkw"]
      },
      "application/vnd.criticaltools.wbs+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wbs"]
      },
      "application/vnd.cryptii.pipe+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.crypto-shade-file": {
        source: "iana"
      },
      "application/vnd.cryptomator.encrypted": {
        source: "iana"
      },
      "application/vnd.cryptomator.vault": {
        source: "iana"
      },
      "application/vnd.ctc-posml": {
        source: "iana",
        extensions: ["pml"]
      },
      "application/vnd.ctct.ws+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cups-pdf": {
        source: "iana"
      },
      "application/vnd.cups-postscript": {
        source: "iana"
      },
      "application/vnd.cups-ppd": {
        source: "iana",
        extensions: ["ppd"]
      },
      "application/vnd.cups-raster": {
        source: "iana"
      },
      "application/vnd.cups-raw": {
        source: "iana"
      },
      "application/vnd.curl": {
        source: "iana"
      },
      "application/vnd.curl.car": {
        source: "apache",
        extensions: ["car"]
      },
      "application/vnd.curl.pcurl": {
        source: "apache",
        extensions: ["pcurl"]
      },
      "application/vnd.cyan.dean.root+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cybank": {
        source: "iana"
      },
      "application/vnd.cyclonedx+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.cyclonedx+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.d2l.coursepackage1p0+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.d3m-dataset": {
        source: "iana"
      },
      "application/vnd.d3m-problem": {
        source: "iana"
      },
      "application/vnd.dart": {
        source: "iana",
        compressible: true,
        extensions: ["dart"]
      },
      "application/vnd.data-vision.rdz": {
        source: "iana",
        extensions: ["rdz"]
      },
      "application/vnd.datapackage+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dataresource+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dbf": {
        source: "iana",
        extensions: ["dbf"]
      },
      "application/vnd.debian.binary-package": {
        source: "iana"
      },
      "application/vnd.dece.data": {
        source: "iana",
        extensions: ["uvf", "uvvf", "uvd", "uvvd"]
      },
      "application/vnd.dece.ttml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["uvt", "uvvt"]
      },
      "application/vnd.dece.unspecified": {
        source: "iana",
        extensions: ["uvx", "uvvx"]
      },
      "application/vnd.dece.zip": {
        source: "iana",
        extensions: ["uvz", "uvvz"]
      },
      "application/vnd.denovo.fcselayout-link": {
        source: "iana",
        extensions: ["fe_launch"]
      },
      "application/vnd.desmume.movie": {
        source: "iana"
      },
      "application/vnd.dir-bi.plate-dl-nosuffix": {
        source: "iana"
      },
      "application/vnd.dm.delegation+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dna": {
        source: "iana",
        extensions: ["dna"]
      },
      "application/vnd.document+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dolby.mlp": {
        source: "apache",
        extensions: ["mlp"]
      },
      "application/vnd.dolby.mobile.1": {
        source: "iana"
      },
      "application/vnd.dolby.mobile.2": {
        source: "iana"
      },
      "application/vnd.doremir.scorecloud-binary-document": {
        source: "iana"
      },
      "application/vnd.dpgraph": {
        source: "iana",
        extensions: ["dpg"]
      },
      "application/vnd.dreamfactory": {
        source: "iana",
        extensions: ["dfac"]
      },
      "application/vnd.drive+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ds-keypoint": {
        source: "apache",
        extensions: ["kpxx"]
      },
      "application/vnd.dtg.local": {
        source: "iana"
      },
      "application/vnd.dtg.local.flash": {
        source: "iana"
      },
      "application/vnd.dtg.local.html": {
        source: "iana"
      },
      "application/vnd.dvb.ait": {
        source: "iana",
        extensions: ["ait"]
      },
      "application/vnd.dvb.dvbisl+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.dvbj": {
        source: "iana"
      },
      "application/vnd.dvb.esgcontainer": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcdftnotifaccess": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcesgaccess": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcesgaccess2": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcesgpdd": {
        source: "iana"
      },
      "application/vnd.dvb.ipdcroaming": {
        source: "iana"
      },
      "application/vnd.dvb.iptv.alfec-base": {
        source: "iana"
      },
      "application/vnd.dvb.iptv.alfec-enhancement": {
        source: "iana"
      },
      "application/vnd.dvb.notif-aggregate-root+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-container+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-generic+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-ia-msglist+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-ia-registration-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-ia-registration-response+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.notif-init+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.dvb.pfr": {
        source: "iana"
      },
      "application/vnd.dvb.service": {
        source: "iana",
        extensions: ["svc"]
      },
      "application/vnd.dxr": {
        source: "iana"
      },
      "application/vnd.dynageo": {
        source: "iana",
        extensions: ["geo"]
      },
      "application/vnd.dzr": {
        source: "iana"
      },
      "application/vnd.easykaraoke.cdgdownload": {
        source: "iana"
      },
      "application/vnd.ecdis-update": {
        source: "iana"
      },
      "application/vnd.ecip.rlp": {
        source: "iana"
      },
      "application/vnd.ecowin.chart": {
        source: "iana",
        extensions: ["mag"]
      },
      "application/vnd.ecowin.filerequest": {
        source: "iana"
      },
      "application/vnd.ecowin.fileupdate": {
        source: "iana"
      },
      "application/vnd.ecowin.series": {
        source: "iana"
      },
      "application/vnd.ecowin.seriesrequest": {
        source: "iana"
      },
      "application/vnd.ecowin.seriesupdate": {
        source: "iana"
      },
      "application/vnd.efi.img": {
        source: "iana"
      },
      "application/vnd.efi.iso": {
        source: "iana"
      },
      "application/vnd.emclient.accessrequest+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.enliven": {
        source: "iana",
        extensions: ["nml"]
      },
      "application/vnd.enphase.envoy": {
        source: "iana"
      },
      "application/vnd.eprints.data+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.epson.esf": {
        source: "iana",
        extensions: ["esf"]
      },
      "application/vnd.epson.msf": {
        source: "iana",
        extensions: ["msf"]
      },
      "application/vnd.epson.quickanime": {
        source: "iana",
        extensions: ["qam"]
      },
      "application/vnd.epson.salt": {
        source: "iana",
        extensions: ["slt"]
      },
      "application/vnd.epson.ssf": {
        source: "iana",
        extensions: ["ssf"]
      },
      "application/vnd.ericsson.quickcall": {
        source: "iana"
      },
      "application/vnd.espass-espass+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.eszigno3+xml": {
        source: "iana",
        compressible: true,
        extensions: ["es3", "et3"]
      },
      "application/vnd.etsi.aoc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.asic-e+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.etsi.asic-s+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.etsi.cug+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvcommand+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvdiscovery+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsad-bc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsad-cod+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsad-npvr+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvservice+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvsync+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.iptvueprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.mcid+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.mheg5": {
        source: "iana"
      },
      "application/vnd.etsi.overload-control-policy-dataset+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.pstn+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.sci+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.simservs+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.timestamp-token": {
        source: "iana"
      },
      "application/vnd.etsi.tsl+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.etsi.tsl.der": {
        source: "iana"
      },
      "application/vnd.eudora.data": {
        source: "iana"
      },
      "application/vnd.evolv.ecig.profile": {
        source: "iana"
      },
      "application/vnd.evolv.ecig.settings": {
        source: "iana"
      },
      "application/vnd.evolv.ecig.theme": {
        source: "iana"
      },
      "application/vnd.exstream-empower+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.exstream-package": {
        source: "iana"
      },
      "application/vnd.ezpix-album": {
        source: "iana",
        extensions: ["ez2"]
      },
      "application/vnd.ezpix-package": {
        source: "iana",
        extensions: ["ez3"]
      },
      "application/vnd.f-secure.mobile": {
        source: "iana"
      },
      "application/vnd.fastcopy-disk-image": {
        source: "iana"
      },
      "application/vnd.fdf": {
        source: "iana",
        extensions: ["fdf"]
      },
      "application/vnd.fdsn.mseed": {
        source: "iana",
        extensions: ["mseed"]
      },
      "application/vnd.fdsn.seed": {
        source: "iana",
        extensions: ["seed", "dataless"]
      },
      "application/vnd.ffsns": {
        source: "iana"
      },
      "application/vnd.ficlab.flb+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.filmit.zfc": {
        source: "iana"
      },
      "application/vnd.fints": {
        source: "iana"
      },
      "application/vnd.firemonkeys.cloudcell": {
        source: "iana"
      },
      "application/vnd.flographit": {
        source: "iana",
        extensions: ["gph"]
      },
      "application/vnd.fluxtime.clip": {
        source: "iana",
        extensions: ["ftc"]
      },
      "application/vnd.font-fontforge-sfd": {
        source: "iana"
      },
      "application/vnd.framemaker": {
        source: "iana",
        extensions: ["fm", "frame", "maker", "book"]
      },
      "application/vnd.frogans.fnc": {
        source: "iana",
        extensions: ["fnc"]
      },
      "application/vnd.frogans.ltf": {
        source: "iana",
        extensions: ["ltf"]
      },
      "application/vnd.fsc.weblaunch": {
        source: "iana",
        extensions: ["fsc"]
      },
      "application/vnd.fujifilm.fb.docuworks": {
        source: "iana"
      },
      "application/vnd.fujifilm.fb.docuworks.binder": {
        source: "iana"
      },
      "application/vnd.fujifilm.fb.docuworks.container": {
        source: "iana"
      },
      "application/vnd.fujifilm.fb.jfi+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.fujitsu.oasys": {
        source: "iana",
        extensions: ["oas"]
      },
      "application/vnd.fujitsu.oasys2": {
        source: "iana",
        extensions: ["oa2"]
      },
      "application/vnd.fujitsu.oasys3": {
        source: "iana",
        extensions: ["oa3"]
      },
      "application/vnd.fujitsu.oasysgp": {
        source: "iana",
        extensions: ["fg5"]
      },
      "application/vnd.fujitsu.oasysprs": {
        source: "iana",
        extensions: ["bh2"]
      },
      "application/vnd.fujixerox.art-ex": {
        source: "iana"
      },
      "application/vnd.fujixerox.art4": {
        source: "iana"
      },
      "application/vnd.fujixerox.ddd": {
        source: "iana",
        extensions: ["ddd"]
      },
      "application/vnd.fujixerox.docuworks": {
        source: "iana",
        extensions: ["xdw"]
      },
      "application/vnd.fujixerox.docuworks.binder": {
        source: "iana",
        extensions: ["xbd"]
      },
      "application/vnd.fujixerox.docuworks.container": {
        source: "iana"
      },
      "application/vnd.fujixerox.hbpl": {
        source: "iana"
      },
      "application/vnd.fut-misnet": {
        source: "iana"
      },
      "application/vnd.futoin+cbor": {
        source: "iana"
      },
      "application/vnd.futoin+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.fuzzysheet": {
        source: "iana",
        extensions: ["fzs"]
      },
      "application/vnd.genomatix.tuxedo": {
        source: "iana",
        extensions: ["txd"]
      },
      "application/vnd.gentics.grd+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.geo+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.geocube+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.geogebra.file": {
        source: "iana",
        extensions: ["ggb"]
      },
      "application/vnd.geogebra.slides": {
        source: "iana"
      },
      "application/vnd.geogebra.tool": {
        source: "iana",
        extensions: ["ggt"]
      },
      "application/vnd.geometry-explorer": {
        source: "iana",
        extensions: ["gex", "gre"]
      },
      "application/vnd.geonext": {
        source: "iana",
        extensions: ["gxt"]
      },
      "application/vnd.geoplan": {
        source: "iana",
        extensions: ["g2w"]
      },
      "application/vnd.geospace": {
        source: "iana",
        extensions: ["g3w"]
      },
      "application/vnd.gerber": {
        source: "iana"
      },
      "application/vnd.globalplatform.card-content-mgt": {
        source: "iana"
      },
      "application/vnd.globalplatform.card-content-mgt-response": {
        source: "iana"
      },
      "application/vnd.gmx": {
        source: "iana",
        extensions: ["gmx"]
      },
      "application/vnd.google-apps.document": {
        compressible: false,
        extensions: ["gdoc"]
      },
      "application/vnd.google-apps.presentation": {
        compressible: false,
        extensions: ["gslides"]
      },
      "application/vnd.google-apps.spreadsheet": {
        compressible: false,
        extensions: ["gsheet"]
      },
      "application/vnd.google-earth.kml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["kml"]
      },
      "application/vnd.google-earth.kmz": {
        source: "iana",
        compressible: false,
        extensions: ["kmz"]
      },
      "application/vnd.gov.sk.e-form+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.gov.sk.e-form+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.gov.sk.xmldatacontainer+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.grafeq": {
        source: "iana",
        extensions: ["gqf", "gqs"]
      },
      "application/vnd.gridmp": {
        source: "iana"
      },
      "application/vnd.groove-account": {
        source: "iana",
        extensions: ["gac"]
      },
      "application/vnd.groove-help": {
        source: "iana",
        extensions: ["ghf"]
      },
      "application/vnd.groove-identity-message": {
        source: "iana",
        extensions: ["gim"]
      },
      "application/vnd.groove-injector": {
        source: "iana",
        extensions: ["grv"]
      },
      "application/vnd.groove-tool-message": {
        source: "iana",
        extensions: ["gtm"]
      },
      "application/vnd.groove-tool-template": {
        source: "iana",
        extensions: ["tpl"]
      },
      "application/vnd.groove-vcard": {
        source: "iana",
        extensions: ["vcg"]
      },
      "application/vnd.hal+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hal+xml": {
        source: "iana",
        compressible: true,
        extensions: ["hal"]
      },
      "application/vnd.handheld-entertainment+xml": {
        source: "iana",
        compressible: true,
        extensions: ["zmm"]
      },
      "application/vnd.hbci": {
        source: "iana",
        extensions: ["hbci"]
      },
      "application/vnd.hc+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hcl-bireports": {
        source: "iana"
      },
      "application/vnd.hdt": {
        source: "iana"
      },
      "application/vnd.heroku+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hhe.lesson-player": {
        source: "iana",
        extensions: ["les"]
      },
      "application/vnd.hp-hpgl": {
        source: "iana",
        extensions: ["hpgl"]
      },
      "application/vnd.hp-hpid": {
        source: "iana",
        extensions: ["hpid"]
      },
      "application/vnd.hp-hps": {
        source: "iana",
        extensions: ["hps"]
      },
      "application/vnd.hp-jlyt": {
        source: "iana",
        extensions: ["jlt"]
      },
      "application/vnd.hp-pcl": {
        source: "iana",
        extensions: ["pcl"]
      },
      "application/vnd.hp-pclxl": {
        source: "iana",
        extensions: ["pclxl"]
      },
      "application/vnd.httphone": {
        source: "iana"
      },
      "application/vnd.hydrostatix.sof-data": {
        source: "iana",
        extensions: ["sfd-hdstx"]
      },
      "application/vnd.hyper+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hyper-item+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hyperdrive+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.hzn-3d-crossword": {
        source: "iana"
      },
      "application/vnd.ibm.afplinedata": {
        source: "iana"
      },
      "application/vnd.ibm.electronic-media": {
        source: "iana"
      },
      "application/vnd.ibm.minipay": {
        source: "iana",
        extensions: ["mpy"]
      },
      "application/vnd.ibm.modcap": {
        source: "iana",
        extensions: ["afp", "listafp", "list3820"]
      },
      "application/vnd.ibm.rights-management": {
        source: "iana",
        extensions: ["irm"]
      },
      "application/vnd.ibm.secure-container": {
        source: "iana",
        extensions: ["sc"]
      },
      "application/vnd.iccprofile": {
        source: "iana",
        extensions: ["icc", "icm"]
      },
      "application/vnd.ieee.1905": {
        source: "iana"
      },
      "application/vnd.igloader": {
        source: "iana",
        extensions: ["igl"]
      },
      "application/vnd.imagemeter.folder+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.imagemeter.image+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.immervision-ivp": {
        source: "iana",
        extensions: ["ivp"]
      },
      "application/vnd.immervision-ivu": {
        source: "iana",
        extensions: ["ivu"]
      },
      "application/vnd.ims.imsccv1p1": {
        source: "iana"
      },
      "application/vnd.ims.imsccv1p2": {
        source: "iana"
      },
      "application/vnd.ims.imsccv1p3": {
        source: "iana"
      },
      "application/vnd.ims.lis.v2.result+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolconsumerprofile+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolproxy+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolproxy.id+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolsettings+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ims.lti.v2.toolsettings.simple+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.informedcontrol.rms+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.informix-visionary": {
        source: "iana"
      },
      "application/vnd.infotech.project": {
        source: "iana"
      },
      "application/vnd.infotech.project+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.innopath.wamp.notification": {
        source: "iana"
      },
      "application/vnd.insors.igm": {
        source: "iana",
        extensions: ["igm"]
      },
      "application/vnd.intercon.formnet": {
        source: "iana",
        extensions: ["xpw", "xpx"]
      },
      "application/vnd.intergeo": {
        source: "iana",
        extensions: ["i2g"]
      },
      "application/vnd.intertrust.digibox": {
        source: "iana"
      },
      "application/vnd.intertrust.nncp": {
        source: "iana"
      },
      "application/vnd.intu.qbo": {
        source: "iana",
        extensions: ["qbo"]
      },
      "application/vnd.intu.qfx": {
        source: "iana",
        extensions: ["qfx"]
      },
      "application/vnd.iptc.g2.catalogitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.conceptitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.knowledgeitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.newsitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.newsmessage+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.packageitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.iptc.g2.planningitem+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ipunplugged.rcprofile": {
        source: "iana",
        extensions: ["rcprofile"]
      },
      "application/vnd.irepository.package+xml": {
        source: "iana",
        compressible: true,
        extensions: ["irp"]
      },
      "application/vnd.is-xpr": {
        source: "iana",
        extensions: ["xpr"]
      },
      "application/vnd.isac.fcs": {
        source: "iana",
        extensions: ["fcs"]
      },
      "application/vnd.iso11783-10+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.jam": {
        source: "iana",
        extensions: ["jam"]
      },
      "application/vnd.japannet-directory-service": {
        source: "iana"
      },
      "application/vnd.japannet-jpnstore-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-payment-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-registration": {
        source: "iana"
      },
      "application/vnd.japannet-registration-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-setstore-wakeup": {
        source: "iana"
      },
      "application/vnd.japannet-verification": {
        source: "iana"
      },
      "application/vnd.japannet-verification-wakeup": {
        source: "iana"
      },
      "application/vnd.jcp.javame.midlet-rms": {
        source: "iana",
        extensions: ["rms"]
      },
      "application/vnd.jisp": {
        source: "iana",
        extensions: ["jisp"]
      },
      "application/vnd.joost.joda-archive": {
        source: "iana",
        extensions: ["joda"]
      },
      "application/vnd.jsk.isdn-ngn": {
        source: "iana"
      },
      "application/vnd.kahootz": {
        source: "iana",
        extensions: ["ktz", "ktr"]
      },
      "application/vnd.kde.karbon": {
        source: "iana",
        extensions: ["karbon"]
      },
      "application/vnd.kde.kchart": {
        source: "iana",
        extensions: ["chrt"]
      },
      "application/vnd.kde.kformula": {
        source: "iana",
        extensions: ["kfo"]
      },
      "application/vnd.kde.kivio": {
        source: "iana",
        extensions: ["flw"]
      },
      "application/vnd.kde.kontour": {
        source: "iana",
        extensions: ["kon"]
      },
      "application/vnd.kde.kpresenter": {
        source: "iana",
        extensions: ["kpr", "kpt"]
      },
      "application/vnd.kde.kspread": {
        source: "iana",
        extensions: ["ksp"]
      },
      "application/vnd.kde.kword": {
        source: "iana",
        extensions: ["kwd", "kwt"]
      },
      "application/vnd.kenameaapp": {
        source: "iana",
        extensions: ["htke"]
      },
      "application/vnd.kidspiration": {
        source: "iana",
        extensions: ["kia"]
      },
      "application/vnd.kinar": {
        source: "iana",
        extensions: ["kne", "knp"]
      },
      "application/vnd.koan": {
        source: "iana",
        extensions: ["skp", "skd", "skt", "skm"]
      },
      "application/vnd.kodak-descriptor": {
        source: "iana",
        extensions: ["sse"]
      },
      "application/vnd.las": {
        source: "iana"
      },
      "application/vnd.las.las+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.las.las+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lasxml"]
      },
      "application/vnd.laszip": {
        source: "iana"
      },
      "application/vnd.leap+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.liberty-request+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.llamagraphics.life-balance.desktop": {
        source: "iana",
        extensions: ["lbd"]
      },
      "application/vnd.llamagraphics.life-balance.exchange+xml": {
        source: "iana",
        compressible: true,
        extensions: ["lbe"]
      },
      "application/vnd.logipipe.circuit+zip": {
        source: "iana",
        compressible: false
      },
      "application/vnd.loom": {
        source: "iana"
      },
      "application/vnd.lotus-1-2-3": {
        source: "iana",
        extensions: ["123"]
      },
      "application/vnd.lotus-approach": {
        source: "iana",
        extensions: ["apr"]
      },
      "application/vnd.lotus-freelance": {
        source: "iana",
        extensions: ["pre"]
      },
      "application/vnd.lotus-notes": {
        source: "iana",
        extensions: ["nsf"]
      },
      "application/vnd.lotus-organizer": {
        source: "iana",
        extensions: ["org"]
      },
      "application/vnd.lotus-screencam": {
        source: "iana",
        extensions: ["scm"]
      },
      "application/vnd.lotus-wordpro": {
        source: "iana",
        extensions: ["lwp"]
      },
      "application/vnd.macports.portpkg": {
        source: "iana",
        extensions: ["portpkg"]
      },
      "application/vnd.mapbox-vector-tile": {
        source: "iana",
        extensions: ["mvt"]
      },
      "application/vnd.marlin.drm.actiontoken+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.marlin.drm.conftoken+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.marlin.drm.license+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.marlin.drm.mdcf": {
        source: "iana"
      },
      "application/vnd.mason+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.maxmind.maxmind-db": {
        source: "iana"
      },
      "application/vnd.mcd": {
        source: "iana",
        extensions: ["mcd"]
      },
      "application/vnd.medcalcdata": {
        source: "iana",
        extensions: ["mc1"]
      },
      "application/vnd.mediastation.cdkey": {
        source: "iana",
        extensions: ["cdkey"]
      },
      "application/vnd.meridian-slingshot": {
        source: "iana"
      },
      "application/vnd.mfer": {
        source: "iana",
        extensions: ["mwf"]
      },
      "application/vnd.mfmp": {
        source: "iana",
        extensions: ["mfm"]
      },
      "application/vnd.micro+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.micrografx.flo": {
        source: "iana",
        extensions: ["flo"]
      },
      "application/vnd.micrografx.igx": {
        source: "iana",
        extensions: ["igx"]
      },
      "application/vnd.microsoft.portable-executable": {
        source: "iana"
      },
      "application/vnd.microsoft.windows.thumbnail-cache": {
        source: "iana"
      },
      "application/vnd.miele+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.mif": {
        source: "iana",
        extensions: ["mif"]
      },
      "application/vnd.minisoft-hp3000-save": {
        source: "iana"
      },
      "application/vnd.mitsubishi.misty-guard.trustweb": {
        source: "iana"
      },
      "application/vnd.mobius.daf": {
        source: "iana",
        extensions: ["daf"]
      },
      "application/vnd.mobius.dis": {
        source: "iana",
        extensions: ["dis"]
      },
      "application/vnd.mobius.mbk": {
        source: "iana",
        extensions: ["mbk"]
      },
      "application/vnd.mobius.mqy": {
        source: "iana",
        extensions: ["mqy"]
      },
      "application/vnd.mobius.msl": {
        source: "iana",
        extensions: ["msl"]
      },
      "application/vnd.mobius.plc": {
        source: "iana",
        extensions: ["plc"]
      },
      "application/vnd.mobius.txf": {
        source: "iana",
        extensions: ["txf"]
      },
      "application/vnd.mophun.application": {
        source: "iana",
        extensions: ["mpn"]
      },
      "application/vnd.mophun.certificate": {
        source: "iana",
        extensions: ["mpc"]
      },
      "application/vnd.motorola.flexsuite": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.adsi": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.fis": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.gotap": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.kmr": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.ttc": {
        source: "iana"
      },
      "application/vnd.motorola.flexsuite.wem": {
        source: "iana"
      },
      "application/vnd.motorola.iprm": {
        source: "iana"
      },
      "application/vnd.mozilla.xul+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xul"]
      },
      "application/vnd.ms-3mfdocument": {
        source: "iana"
      },
      "application/vnd.ms-artgalry": {
        source: "iana",
        extensions: ["cil"]
      },
      "application/vnd.ms-asf": {
        source: "iana"
      },
      "application/vnd.ms-cab-compressed": {
        source: "iana",
        extensions: ["cab"]
      },
      "application/vnd.ms-color.iccprofile": {
        source: "apache"
      },
      "application/vnd.ms-excel": {
        source: "iana",
        compressible: false,
        extensions: ["xls", "xlm", "xla", "xlc", "xlt", "xlw"]
      },
      "application/vnd.ms-excel.addin.macroenabled.12": {
        source: "iana",
        extensions: ["xlam"]
      },
      "application/vnd.ms-excel.sheet.binary.macroenabled.12": {
        source: "iana",
        extensions: ["xlsb"]
      },
      "application/vnd.ms-excel.sheet.macroenabled.12": {
        source: "iana",
        extensions: ["xlsm"]
      },
      "application/vnd.ms-excel.template.macroenabled.12": {
        source: "iana",
        extensions: ["xltm"]
      },
      "application/vnd.ms-fontobject": {
        source: "iana",
        compressible: true,
        extensions: ["eot"]
      },
      "application/vnd.ms-htmlhelp": {
        source: "iana",
        extensions: ["chm"]
      },
      "application/vnd.ms-ims": {
        source: "iana",
        extensions: ["ims"]
      },
      "application/vnd.ms-lrm": {
        source: "iana",
        extensions: ["lrm"]
      },
      "application/vnd.ms-office.activex+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-officetheme": {
        source: "iana",
        extensions: ["thmx"]
      },
      "application/vnd.ms-opentype": {
        source: "apache",
        compressible: true
      },
      "application/vnd.ms-outlook": {
        compressible: false,
        extensions: ["msg"]
      },
      "application/vnd.ms-package.obfuscated-opentype": {
        source: "apache"
      },
      "application/vnd.ms-pki.seccat": {
        source: "apache",
        extensions: ["cat"]
      },
      "application/vnd.ms-pki.stl": {
        source: "apache",
        extensions: ["stl"]
      },
      "application/vnd.ms-playready.initiator+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-powerpoint": {
        source: "iana",
        compressible: false,
        extensions: ["ppt", "pps", "pot"]
      },
      "application/vnd.ms-powerpoint.addin.macroenabled.12": {
        source: "iana",
        extensions: ["ppam"]
      },
      "application/vnd.ms-powerpoint.presentation.macroenabled.12": {
        source: "iana",
        extensions: ["pptm"]
      },
      "application/vnd.ms-powerpoint.slide.macroenabled.12": {
        source: "iana",
        extensions: ["sldm"]
      },
      "application/vnd.ms-powerpoint.slideshow.macroenabled.12": {
        source: "iana",
        extensions: ["ppsm"]
      },
      "application/vnd.ms-powerpoint.template.macroenabled.12": {
        source: "iana",
        extensions: ["potm"]
      },
      "application/vnd.ms-printdevicecapabilities+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-printing.printticket+xml": {
        source: "apache",
        compressible: true
      },
      "application/vnd.ms-printschematicket+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ms-project": {
        source: "iana",
        extensions: ["mpp", "mpt"]
      },
      "application/vnd.ms-tnef": {
        source: "iana"
      },
      "application/vnd.ms-windows.devicepairing": {
        source: "iana"
      },
      "application/vnd.ms-windows.nwprinting.oob": {
        source: "iana"
      },
      "application/vnd.ms-windows.printerpairing": {
        source: "iana"
      },
      "application/vnd.ms-windows.wsd.oob": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.lic-chlg-req": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.lic-resp": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.meter-chlg-req": {
        source: "iana"
      },
      "application/vnd.ms-wmdrm.meter-resp": {
        source: "iana"
      },
      "application/vnd.ms-word.document.macroenabled.12": {
        source: "iana",
        extensions: ["docm"]
      },
      "application/vnd.ms-word.template.macroenabled.12": {
        source: "iana",
        extensions: ["dotm"]
      },
      "application/vnd.ms-works": {
        source: "iana",
        extensions: ["wps", "wks", "wcm", "wdb"]
      },
      "application/vnd.ms-wpl": {
        source: "iana",
        extensions: ["wpl"]
      },
      "application/vnd.ms-xpsdocument": {
        source: "iana",
        compressible: false,
        extensions: ["xps"]
      },
      "application/vnd.msa-disk-image": {
        source: "iana"
      },
      "application/vnd.mseq": {
        source: "iana",
        extensions: ["mseq"]
      },
      "application/vnd.msign": {
        source: "iana"
      },
      "application/vnd.multiad.creator": {
        source: "iana"
      },
      "application/vnd.multiad.creator.cif": {
        source: "iana"
      },
      "application/vnd.music-niff": {
        source: "iana"
      },
      "application/vnd.musician": {
        source: "iana",
        extensions: ["mus"]
      },
      "application/vnd.muvee.style": {
        source: "iana",
        extensions: ["msty"]
      },
      "application/vnd.mynfc": {
        source: "iana",
        extensions: ["taglet"]
      },
      "application/vnd.nacamar.ybrid+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.ncd.control": {
        source: "iana"
      },
      "application/vnd.ncd.reference": {
        source: "iana"
      },
      "application/vnd.nearst.inv+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nebumind.line": {
        source: "iana"
      },
      "application/vnd.nervana": {
        source: "iana"
      },
      "application/vnd.netfpx": {
        source: "iana"
      },
      "application/vnd.neurolanguage.nlu": {
        source: "iana",
        extensions: ["nlu"]
      },
      "application/vnd.nimn": {
        source: "iana"
      },
      "application/vnd.nintendo.nitro.rom": {
        source: "iana"
      },
      "application/vnd.nintendo.snes.rom": {
        source: "iana"
      },
      "application/vnd.nitf": {
        source: "iana",
        extensions: ["ntf", "nitf"]
      },
      "application/vnd.noblenet-directory": {
        source: "iana",
        extensions: ["nnd"]
      },
      "application/vnd.noblenet-sealer": {
        source: "iana",
        extensions: ["nns"]
      },
      "application/vnd.noblenet-web": {
        source: "iana",
        extensions: ["nnw"]
      },
      "application/vnd.nokia.catalogs": {
        source: "iana"
      },
      "application/vnd.nokia.conml+wbxml": {
        source: "iana"
      },
      "application/vnd.nokia.conml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.iptv.config+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.isds-radio-presets": {
        source: "iana"
      },
      "application/vnd.nokia.landmark+wbxml": {
        source: "iana"
      },
      "application/vnd.nokia.landmark+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.landmarkcollection+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.n-gage.ac+xml": {
        source: "iana",
        compressible: true,
        extensions: ["ac"]
      },
      "application/vnd.nokia.n-gage.data": {
        source: "iana",
        extensions: ["ngdat"]
      },
      "application/vnd.nokia.n-gage.symbian.install": {
        source: "iana",
        extensions: ["n-gage"]
      },
      "application/vnd.nokia.ncd": {
        source: "iana"
      },
      "application/vnd.nokia.pcd+wbxml": {
        source: "iana"
      },
      "application/vnd.nokia.pcd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.nokia.radio-preset": {
        source: "iana",
        extensions: ["rpst"]
      },
      "application/vnd.nokia.radio-presets": {
        source: "iana",
        extensions: ["rpss"]
      },
      "application/vnd.novadigm.edm": {
        source: "iana",
        extensions: ["edm"]
      },
      "application/vnd.novadigm.edx": {
        source: "iana",
        extensions: ["edx"]
      },
      "application/vnd.novadigm.ext": {
        source: "iana",
        extensions: ["ext"]
      },
      "application/vnd.ntt-local.content-share": {
        source: "iana"
      },
      "application/vnd.ntt-local.file-transfer": {
        source: "iana"
      },
      "application/vnd.ntt-local.ogw_remote-access": {
        source: "iana"
      },
      "application/vnd.ntt-local.sip-ta_remote": {
        source: "iana"
      },
      "application/vnd.ntt-local.sip-ta_tcp_stream": {
        source: "iana"
      },
      "application/vnd.oasis.opendocument.chart": {
        source: "iana",
        extensions: ["odc"]
      },
      "application/vnd.oasis.opendocument.chart-template": {
        source: "iana",
        extensions: ["otc"]
      },
      "application/vnd.oasis.opendocument.database": {
        source: "iana",
        extensions: ["odb"]
      },
      "application/vnd.oasis.opendocument.formula": {
        source: "iana",
        extensions: ["odf"]
      },
      "application/vnd.oasis.opendocument.formula-template": {
        source: "iana",
        extensions: ["odft"]
      },
      "application/vnd.oasis.opendocument.graphics": {
        source: "iana",
        compressible: false,
        extensions: ["odg"]
      },
      "application/vnd.oasis.opendocument.graphics-template": {
        source: "iana",
        extensions: ["otg"]
      },
      "application/vnd.oasis.opendocument.image": {
        source: "iana",
        extensions: ["odi"]
      },
      "application/vnd.oasis.opendocument.image-template": {
        source: "iana",
        extensions: ["oti"]
      },
      "application/vnd.oasis.opendocument.presentation": {
        source: "iana",
        compressible: false,
        extensions: ["odp"]
      },
      "application/vnd.oasis.opendocument.presentation-template": {
        source: "iana",
        extensions: ["otp"]
      },
      "application/vnd.oasis.opendocument.spreadsheet": {
        source: "iana",
        compressible: false,
        extensions: ["ods"]
      },
      "application/vnd.oasis.opendocument.spreadsheet-template": {
        source: "iana",
        extensions: ["ots"]
      },
      "application/vnd.oasis.opendocument.text": {
        source: "iana",
        compressible: false,
        extensions: ["odt"]
      },
      "application/vnd.oasis.opendocument.text-master": {
        source: "iana",
        extensions: ["odm"]
      },
      "application/vnd.oasis.opendocument.text-template": {
        source: "iana",
        extensions: ["ott"]
      },
      "application/vnd.oasis.opendocument.text-web": {
        source: "iana",
        extensions: ["oth"]
      },
      "application/vnd.obn": {
        source: "iana"
      },
      "application/vnd.ocf+cbor": {
        source: "iana"
      },
      "application/vnd.oci.image.manifest.v1+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oftn.l10n+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.contentaccessdownload+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.contentaccessstreaming+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.cspg-hexbinary": {
        source: "iana"
      },
      "application/vnd.oipf.dae.svg+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.dae.xhtml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.mippvcontrolmessage+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.pae.gem": {
        source: "iana"
      },
      "application/vnd.oipf.spdiscovery+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.spdlist+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.ueprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oipf.userprofile+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.olpc-sugar": {
        source: "iana",
        extensions: ["xo"]
      },
      "application/vnd.oma-scws-config": {
        source: "iana"
      },
      "application/vnd.oma-scws-http-request": {
        source: "iana"
      },
      "application/vnd.oma-scws-http-response": {
        source: "iana"
      },
      "application/vnd.oma.bcast.associated-procedure-parameter+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.drm-trigger+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.imd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.ltkm": {
        source: "iana"
      },
      "application/vnd.oma.bcast.notification+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.provisioningtrigger": {
        source: "iana"
      },
      "application/vnd.oma.bcast.sgboot": {
        source: "iana"
      },
      "application/vnd.oma.bcast.sgdd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.sgdu": {
        source: "iana"
      },
      "application/vnd.oma.bcast.simple-symbol-container": {
        source: "iana"
      },
      "application/vnd.oma.bcast.smartcard-trigger+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.sprov+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.bcast.stkm": {
        source: "iana"
      },
      "application/vnd.oma.cab-address-book+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-feature-handler+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-pcc+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-subs-invite+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.cab-user-prefs+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.dcd": {
        source: "iana"
      },
      "application/vnd.oma.dcdc": {
        source: "iana"
      },
      "application/vnd.oma.dd2+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dd2"]
      },
      "application/vnd.oma.drm.risd+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.group-usage-list+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.lwm2m+cbor": {
        source: "iana"
      },
      "application/vnd.oma.lwm2m+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.lwm2m+tlv": {
        source: "iana"
      },
      "application/vnd.oma.pal+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.detailed-progress-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.final-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.groups+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.invocation-descriptor+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.poc.optimized-progress-report+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.push": {
        source: "iana"
      },
      "application/vnd.oma.scidm.messages+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oma.xcap-directory+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.omads-email+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.omads-file+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.omads-folder+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.omaloc-supl-init": {
        source: "iana"
      },
      "application/vnd.onepager": {
        source: "iana"
      },
      "application/vnd.onepagertamp": {
        source: "iana"
      },
      "application/vnd.onepagertamx": {
        source: "iana"
      },
      "application/vnd.onepagertat": {
        source: "iana"
      },
      "application/vnd.onepagertatp": {
        source: "iana"
      },
      "application/vnd.onepagertatx": {
        source: "iana"
      },
      "application/vnd.openblox.game+xml": {
        source: "iana",
        compressible: true,
        extensions: ["obgx"]
      },
      "application/vnd.openblox.game-binary": {
        source: "iana"
      },
      "application/vnd.openeye.oeb": {
        source: "iana"
      },
      "application/vnd.openofficeorg.extension": {
        source: "apache",
        extensions: ["oxt"]
      },
      "application/vnd.openstreetmap.data+xml": {
        source: "iana",
        compressible: true,
        extensions: ["osm"]
      },
      "application/vnd.opentimestamps.ots": {
        source: "iana"
      },
      "application/vnd.openxmlformats-officedocument.custom-properties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.customxmlproperties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawing+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.chart+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.chartshapes+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramcolors+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramdata+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramlayout+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.drawingml.diagramstyle+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.extended-properties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.commentauthors+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.comments+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.handoutmaster+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.notesmaster+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.notesslide+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
        source: "iana",
        compressible: false,
        extensions: ["pptx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.presprops+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slide": {
        source: "iana",
        extensions: ["sldx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slide+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slidelayout+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slidemaster+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slideshow": {
        source: "iana",
        extensions: ["ppsx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.slideupdateinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.tablestyles+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.tags+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.template": {
        source: "iana",
        extensions: ["potx"]
      },
      "application/vnd.openxmlformats-officedocument.presentationml.template.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.presentationml.viewprops+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.calcchain+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.chartsheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.connections+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.dialogsheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.externallink+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcachedefinition+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.pivotcacherecords+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.pivottable+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.querytable+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionheaders+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.revisionlog+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sharedstrings+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
        source: "iana",
        compressible: false,
        extensions: ["xlsx"]
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheetmetadata+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.tablesinglecells+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.template": {
        source: "iana",
        extensions: ["xltx"]
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.template.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.usernames+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.volatiledependencies+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.theme+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.themeoverride+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.vmldrawing": {
        source: "iana"
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        source: "iana",
        compressible: false,
        extensions: ["docx"]
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document.glossary+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.fonttable+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.template": {
        source: "iana",
        extensions: ["dotx"]
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.template.main+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.websettings+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-package.core-properties+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-package.digital-signature-xmlsignature+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.openxmlformats-package.relationships+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oracle.resource+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.orange.indata": {
        source: "iana"
      },
      "application/vnd.osa.netdeploy": {
        source: "iana"
      },
      "application/vnd.osgeo.mapguide.package": {
        source: "iana",
        extensions: ["mgp"]
      },
      "application/vnd.osgi.bundle": {
        source: "iana"
      },
      "application/vnd.osgi.dp": {
        source: "iana",
        extensions: ["dp"]
      },
      "application/vnd.osgi.subsystem": {
        source: "iana",
        extensions: ["esa"]
      },
      "application/vnd.otps.ct-kip+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.oxli.countgraph": {
        source: "iana"
      },
      "application/vnd.pagerduty+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.palm": {
        source: "iana",
        extensions: ["pdb", "pqa", "oprc"]
      },
      "application/vnd.panoply": {
        source: "iana"
      },
      "application/vnd.paos.xml": {
        source: "iana"
      },
      "application/vnd.patentdive": {
        source: "iana"
      },
      "application/vnd.patientecommsdoc": {
        source: "iana"
      },
      "application/vnd.pawaafile": {
        source: "iana",
        extensions: ["paw"]
      },
      "application/vnd.pcos": {
        source: "iana"
      },
      "application/vnd.pg.format": {
        source: "iana",
        extensions: ["str"]
      },
      "application/vnd.pg.osasli": {
        source: "iana",
        extensions: ["ei6"]
      },
      "application/vnd.piaccess.application-licence": {
        source: "iana"
      },
      "application/vnd.picsel": {
        source: "iana",
        extensions: ["efif"]
      },
      "application/vnd.pmi.widget": {
        source: "iana",
        extensions: ["wg"]
      },
      "application/vnd.poc.group-advertisement+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.pocketlearn": {
        source: "iana",
        extensions: ["plf"]
      },
      "application/vnd.powerbuilder6": {
        source: "iana",
        extensions: ["pbd"]
      },
      "application/vnd.powerbuilder6-s": {
        source: "iana"
      },
      "application/vnd.powerbuilder7": {
        source: "iana"
      },
      "application/vnd.powerbuilder7-s": {
        source: "iana"
      },
      "application/vnd.powerbuilder75": {
        source: "iana"
      },
      "application/vnd.powerbuilder75-s": {
        source: "iana"
      },
      "application/vnd.preminet": {
        source: "iana"
      },
      "application/vnd.previewsystems.box": {
        source: "iana",
        extensions: ["box"]
      },
      "application/vnd.proteus.magazine": {
        source: "iana",
        extensions: ["mgz"]
      },
      "application/vnd.psfs": {
        source: "iana"
      },
      "application/vnd.publishare-delta-tree": {
        source: "iana",
        extensions: ["qps"]
      },
      "application/vnd.pvi.ptid1": {
        source: "iana",
        extensions: ["ptid"]
      },
      "application/vnd.pwg-multiplexed": {
        source: "iana"
      },
      "application/vnd.pwg-xhtml-print+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.qualcomm.brew-app-res": {
        source: "iana"
      },
      "application/vnd.quarantainenet": {
        source: "iana"
      },
      "application/vnd.quark.quarkxpress": {
        source: "iana",
        extensions: ["qxd", "qxt", "qwd", "qwt", "qxl", "qxb"]
      },
      "application/vnd.quobject-quoxdocument": {
        source: "iana"
      },
      "application/vnd.radisys.moml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-conf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-conn+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-dialog+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-audit-stream+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-conf+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-base+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-fax-detect+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-fax-sendrecv+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-group+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-speech+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.radisys.msml-dialog-transform+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.rainstor.data": {
        source: "iana"
      },
      "application/vnd.rapid": {
        source: "iana"
      },
      "application/vnd.rar": {
        source: "iana",
        extensions: ["rar"]
      },
      "application/vnd.realvnc.bed": {
        source: "iana",
        extensions: ["bed"]
      },
      "application/vnd.recordare.musicxml": {
        source: "iana",
        extensions: ["mxl"]
      },
      "application/vnd.recordare.musicxml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["musicxml"]
      },
      "application/vnd.renlearn.rlprint": {
        source: "iana"
      },
      "application/vnd.resilient.logic": {
        source: "iana"
      },
      "application/vnd.restful+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.rig.cryptonote": {
        source: "iana",
        extensions: ["cryptonote"]
      },
      "application/vnd.rim.cod": {
        source: "apache",
        extensions: ["cod"]
      },
      "application/vnd.rn-realmedia": {
        source: "apache",
        extensions: ["rm"]
      },
      "application/vnd.rn-realmedia-vbr": {
        source: "apache",
        extensions: ["rmvb"]
      },
      "application/vnd.route66.link66+xml": {
        source: "iana",
        compressible: true,
        extensions: ["link66"]
      },
      "application/vnd.rs-274x": {
        source: "iana"
      },
      "application/vnd.ruckus.download": {
        source: "iana"
      },
      "application/vnd.s3sms": {
        source: "iana"
      },
      "application/vnd.sailingtracker.track": {
        source: "iana",
        extensions: ["st"]
      },
      "application/vnd.sar": {
        source: "iana"
      },
      "application/vnd.sbm.cid": {
        source: "iana"
      },
      "application/vnd.sbm.mid2": {
        source: "iana"
      },
      "application/vnd.scribus": {
        source: "iana"
      },
      "application/vnd.sealed.3df": {
        source: "iana"
      },
      "application/vnd.sealed.csf": {
        source: "iana"
      },
      "application/vnd.sealed.doc": {
        source: "iana"
      },
      "application/vnd.sealed.eml": {
        source: "iana"
      },
      "application/vnd.sealed.mht": {
        source: "iana"
      },
      "application/vnd.sealed.net": {
        source: "iana"
      },
      "application/vnd.sealed.ppt": {
        source: "iana"
      },
      "application/vnd.sealed.tiff": {
        source: "iana"
      },
      "application/vnd.sealed.xls": {
        source: "iana"
      },
      "application/vnd.sealedmedia.softseal.html": {
        source: "iana"
      },
      "application/vnd.sealedmedia.softseal.pdf": {
        source: "iana"
      },
      "application/vnd.seemail": {
        source: "iana",
        extensions: ["see"]
      },
      "application/vnd.seis+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.sema": {
        source: "iana",
        extensions: ["sema"]
      },
      "application/vnd.semd": {
        source: "iana",
        extensions: ["semd"]
      },
      "application/vnd.semf": {
        source: "iana",
        extensions: ["semf"]
      },
      "application/vnd.shade-save-file": {
        source: "iana"
      },
      "application/vnd.shana.informed.formdata": {
        source: "iana",
        extensions: ["ifm"]
      },
      "application/vnd.shana.informed.formtemplate": {
        source: "iana",
        extensions: ["itp"]
      },
      "application/vnd.shana.informed.interchange": {
        source: "iana",
        extensions: ["iif"]
      },
      "application/vnd.shana.informed.package": {
        source: "iana",
        extensions: ["ipk"]
      },
      "application/vnd.shootproof+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.shopkick+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.shp": {
        source: "iana"
      },
      "application/vnd.shx": {
        source: "iana"
      },
      "application/vnd.sigrok.session": {
        source: "iana"
      },
      "application/vnd.simtech-mindmapper": {
        source: "iana",
        extensions: ["twd", "twds"]
      },
      "application/vnd.siren+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.smaf": {
        source: "iana",
        extensions: ["mmf"]
      },
      "application/vnd.smart.notebook": {
        source: "iana"
      },
      "application/vnd.smart.teacher": {
        source: "iana",
        extensions: ["teacher"]
      },
      "application/vnd.snesdev-page-table": {
        source: "iana"
      },
      "application/vnd.software602.filler.form+xml": {
        source: "iana",
        compressible: true,
        extensions: ["fo"]
      },
      "application/vnd.software602.filler.form-xml-zip": {
        source: "iana"
      },
      "application/vnd.solent.sdkm+xml": {
        source: "iana",
        compressible: true,
        extensions: ["sdkm", "sdkd"]
      },
      "application/vnd.spotfire.dxp": {
        source: "iana",
        extensions: ["dxp"]
      },
      "application/vnd.spotfire.sfs": {
        source: "iana",
        extensions: ["sfs"]
      },
      "application/vnd.sqlite3": {
        source: "iana"
      },
      "application/vnd.sss-cod": {
        source: "iana"
      },
      "application/vnd.sss-dtf": {
        source: "iana"
      },
      "application/vnd.sss-ntf": {
        source: "iana"
      },
      "application/vnd.stardivision.calc": {
        source: "apache",
        extensions: ["sdc"]
      },
      "application/vnd.stardivision.draw": {
        source: "apache",
        extensions: ["sda"]
      },
      "application/vnd.stardivision.impress": {
        source: "apache",
        extensions: ["sdd"]
      },
      "application/vnd.stardivision.math": {
        source: "apache",
        extensions: ["smf"]
      },
      "application/vnd.stardivision.writer": {
        source: "apache",
        extensions: ["sdw", "vor"]
      },
      "application/vnd.stardivision.writer-global": {
        source: "apache",
        extensions: ["sgl"]
      },
      "application/vnd.stepmania.package": {
        source: "iana",
        extensions: ["smzip"]
      },
      "application/vnd.stepmania.stepchart": {
        source: "iana",
        extensions: ["sm"]
      },
      "application/vnd.street-stream": {
        source: "iana"
      },
      "application/vnd.sun.wadl+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wadl"]
      },
      "application/vnd.sun.xml.calc": {
        source: "apache",
        extensions: ["sxc"]
      },
      "application/vnd.sun.xml.calc.template": {
        source: "apache",
        extensions: ["stc"]
      },
      "application/vnd.sun.xml.draw": {
        source: "apache",
        extensions: ["sxd"]
      },
      "application/vnd.sun.xml.draw.template": {
        source: "apache",
        extensions: ["std"]
      },
      "application/vnd.sun.xml.impress": {
        source: "apache",
        extensions: ["sxi"]
      },
      "application/vnd.sun.xml.impress.template": {
        source: "apache",
        extensions: ["sti"]
      },
      "application/vnd.sun.xml.math": {
        source: "apache",
        extensions: ["sxm"]
      },
      "application/vnd.sun.xml.writer": {
        source: "apache",
        extensions: ["sxw"]
      },
      "application/vnd.sun.xml.writer.global": {
        source: "apache",
        extensions: ["sxg"]
      },
      "application/vnd.sun.xml.writer.template": {
        source: "apache",
        extensions: ["stw"]
      },
      "application/vnd.sus-calendar": {
        source: "iana",
        extensions: ["sus", "susp"]
      },
      "application/vnd.svd": {
        source: "iana",
        extensions: ["svd"]
      },
      "application/vnd.swiftview-ics": {
        source: "iana"
      },
      "application/vnd.sycle+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.symbian.install": {
        source: "apache",
        extensions: ["sis", "sisx"]
      },
      "application/vnd.syncml+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["xsm"]
      },
      "application/vnd.syncml.dm+wbxml": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["bdm"]
      },
      "application/vnd.syncml.dm+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["xdm"]
      },
      "application/vnd.syncml.dm.notification": {
        source: "iana"
      },
      "application/vnd.syncml.dmddf+wbxml": {
        source: "iana"
      },
      "application/vnd.syncml.dmddf+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["ddf"]
      },
      "application/vnd.syncml.dmtnds+wbxml": {
        source: "iana"
      },
      "application/vnd.syncml.dmtnds+xml": {
        source: "iana",
        charset: "UTF-8",
        compressible: true
      },
      "application/vnd.syncml.ds.notification": {
        source: "iana"
      },
      "application/vnd.tableschema+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.tao.intent-module-archive": {
        source: "iana",
        extensions: ["tao"]
      },
      "application/vnd.tcpdump.pcap": {
        source: "iana",
        extensions: ["pcap", "cap", "dmp"]
      },
      "application/vnd.think-cell.ppttc+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.tmd.mediaflex.api+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.tml": {
        source: "iana"
      },
      "application/vnd.tmobile-livetv": {
        source: "iana",
        extensions: ["tmo"]
      },
      "application/vnd.tri.onesource": {
        source: "iana"
      },
      "application/vnd.trid.tpt": {
        source: "iana",
        extensions: ["tpt"]
      },
      "application/vnd.triscape.mxs": {
        source: "iana",
        extensions: ["mxs"]
      },
      "application/vnd.trueapp": {
        source: "iana",
        extensions: ["tra"]
      },
      "application/vnd.truedoc": {
        source: "iana"
      },
      "application/vnd.ubisoft.webplayer": {
        source: "iana"
      },
      "application/vnd.ufdl": {
        source: "iana",
        extensions: ["ufd", "ufdl"]
      },
      "application/vnd.uiq.theme": {
        source: "iana",
        extensions: ["utz"]
      },
      "application/vnd.umajin": {
        source: "iana",
        extensions: ["umj"]
      },
      "application/vnd.unity": {
        source: "iana",
        extensions: ["unityweb"]
      },
      "application/vnd.uoml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["uoml"]
      },
      "application/vnd.uplanet.alert": {
        source: "iana"
      },
      "application/vnd.uplanet.alert-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.bearer-choice": {
        source: "iana"
      },
      "application/vnd.uplanet.bearer-choice-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.cacheop": {
        source: "iana"
      },
      "application/vnd.uplanet.cacheop-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.channel": {
        source: "iana"
      },
      "application/vnd.uplanet.channel-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.list": {
        source: "iana"
      },
      "application/vnd.uplanet.list-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.listcmd": {
        source: "iana"
      },
      "application/vnd.uplanet.listcmd-wbxml": {
        source: "iana"
      },
      "application/vnd.uplanet.signal": {
        source: "iana"
      },
      "application/vnd.uri-map": {
        source: "iana"
      },
      "application/vnd.valve.source.material": {
        source: "iana"
      },
      "application/vnd.vcx": {
        source: "iana",
        extensions: ["vcx"]
      },
      "application/vnd.vd-study": {
        source: "iana"
      },
      "application/vnd.vectorworks": {
        source: "iana"
      },
      "application/vnd.vel+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.verimatrix.vcas": {
        source: "iana"
      },
      "application/vnd.veritone.aion+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.veryant.thin": {
        source: "iana"
      },
      "application/vnd.ves.encrypted": {
        source: "iana"
      },
      "application/vnd.vidsoft.vidconference": {
        source: "iana"
      },
      "application/vnd.visio": {
        source: "iana",
        extensions: ["vsd", "vst", "vss", "vsw"]
      },
      "application/vnd.visionary": {
        source: "iana",
        extensions: ["vis"]
      },
      "application/vnd.vividence.scriptfile": {
        source: "iana"
      },
      "application/vnd.vsf": {
        source: "iana",
        extensions: ["vsf"]
      },
      "application/vnd.wap.sic": {
        source: "iana"
      },
      "application/vnd.wap.slc": {
        source: "iana"
      },
      "application/vnd.wap.wbxml": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["wbxml"]
      },
      "application/vnd.wap.wmlc": {
        source: "iana",
        extensions: ["wmlc"]
      },
      "application/vnd.wap.wmlscriptc": {
        source: "iana",
        extensions: ["wmlsc"]
      },
      "application/vnd.webturbo": {
        source: "iana",
        extensions: ["wtb"]
      },
      "application/vnd.wfa.dpp": {
        source: "iana"
      },
      "application/vnd.wfa.p2p": {
        source: "iana"
      },
      "application/vnd.wfa.wsc": {
        source: "iana"
      },
      "application/vnd.windows.devicepairing": {
        source: "iana"
      },
      "application/vnd.wmc": {
        source: "iana"
      },
      "application/vnd.wmf.bootstrap": {
        source: "iana"
      },
      "application/vnd.wolfram.mathematica": {
        source: "iana"
      },
      "application/vnd.wolfram.mathematica.package": {
        source: "iana"
      },
      "application/vnd.wolfram.player": {
        source: "iana",
        extensions: ["nbp"]
      },
      "application/vnd.wordperfect": {
        source: "iana",
        extensions: ["wpd"]
      },
      "application/vnd.wqd": {
        source: "iana",
        extensions: ["wqd"]
      },
      "application/vnd.wrq-hp3000-labelled": {
        source: "iana"
      },
      "application/vnd.wt.stf": {
        source: "iana",
        extensions: ["stf"]
      },
      "application/vnd.wv.csp+wbxml": {
        source: "iana"
      },
      "application/vnd.wv.csp+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.wv.ssp+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.xacml+json": {
        source: "iana",
        compressible: true
      },
      "application/vnd.xara": {
        source: "iana",
        extensions: ["xar"]
      },
      "application/vnd.xfdl": {
        source: "iana",
        extensions: ["xfdl"]
      },
      "application/vnd.xfdl.webform": {
        source: "iana"
      },
      "application/vnd.xmi+xml": {
        source: "iana",
        compressible: true
      },
      "application/vnd.xmpie.cpkg": {
        source: "iana"
      },
      "application/vnd.xmpie.dpkg": {
        source: "iana"
      },
      "application/vnd.xmpie.plan": {
        source: "iana"
      },
      "application/vnd.xmpie.ppkg": {
        source: "iana"
      },
      "application/vnd.xmpie.xlim": {
        source: "iana"
      },
      "application/vnd.yamaha.hv-dic": {
        source: "iana",
        extensions: ["hvd"]
      },
      "application/vnd.yamaha.hv-script": {
        source: "iana",
        extensions: ["hvs"]
      },
      "application/vnd.yamaha.hv-voice": {
        source: "iana",
        extensions: ["hvp"]
      },
      "application/vnd.yamaha.openscoreformat": {
        source: "iana",
        extensions: ["osf"]
      },
      "application/vnd.yamaha.openscoreformat.osfpvg+xml": {
        source: "iana",
        compressible: true,
        extensions: ["osfpvg"]
      },
      "application/vnd.yamaha.remote-setup": {
        source: "iana"
      },
      "application/vnd.yamaha.smaf-audio": {
        source: "iana",
        extensions: ["saf"]
      },
      "application/vnd.yamaha.smaf-phrase": {
        source: "iana",
        extensions: ["spf"]
      },
      "application/vnd.yamaha.through-ngn": {
        source: "iana"
      },
      "application/vnd.yamaha.tunnel-udpencap": {
        source: "iana"
      },
      "application/vnd.yaoweme": {
        source: "iana"
      },
      "application/vnd.yellowriver-custom-menu": {
        source: "iana",
        extensions: ["cmp"]
      },
      "application/vnd.youtube.yt": {
        source: "iana"
      },
      "application/vnd.zul": {
        source: "iana",
        extensions: ["zir", "zirz"]
      },
      "application/vnd.zzazz.deck+xml": {
        source: "iana",
        compressible: true,
        extensions: ["zaz"]
      },
      "application/voicexml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["vxml"]
      },
      "application/voucher-cms+json": {
        source: "iana",
        compressible: true
      },
      "application/vq-rtcpxr": {
        source: "iana"
      },
      "application/wasm": {
        source: "iana",
        compressible: true,
        extensions: ["wasm"]
      },
      "application/watcherinfo+xml": {
        source: "iana",
        compressible: true
      },
      "application/webpush-options+json": {
        source: "iana",
        compressible: true
      },
      "application/whoispp-query": {
        source: "iana"
      },
      "application/whoispp-response": {
        source: "iana"
      },
      "application/widget": {
        source: "iana",
        extensions: ["wgt"]
      },
      "application/winhlp": {
        source: "apache",
        extensions: ["hlp"]
      },
      "application/wita": {
        source: "iana"
      },
      "application/wordperfect5.1": {
        source: "iana"
      },
      "application/wsdl+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wsdl"]
      },
      "application/wspolicy+xml": {
        source: "iana",
        compressible: true,
        extensions: ["wspolicy"]
      },
      "application/x-7z-compressed": {
        source: "apache",
        compressible: false,
        extensions: ["7z"]
      },
      "application/x-abiword": {
        source: "apache",
        extensions: ["abw"]
      },
      "application/x-ace-compressed": {
        source: "apache",
        extensions: ["ace"]
      },
      "application/x-amf": {
        source: "apache"
      },
      "application/x-apple-diskimage": {
        source: "apache",
        extensions: ["dmg"]
      },
      "application/x-arj": {
        compressible: false,
        extensions: ["arj"]
      },
      "application/x-authorware-bin": {
        source: "apache",
        extensions: ["aab", "x32", "u32", "vox"]
      },
      "application/x-authorware-map": {
        source: "apache",
        extensions: ["aam"]
      },
      "application/x-authorware-seg": {
        source: "apache",
        extensions: ["aas"]
      },
      "application/x-bcpio": {
        source: "apache",
        extensions: ["bcpio"]
      },
      "application/x-bdoc": {
        compressible: false,
        extensions: ["bdoc"]
      },
      "application/x-bittorrent": {
        source: "apache",
        extensions: ["torrent"]
      },
      "application/x-blorb": {
        source: "apache",
        extensions: ["blb", "blorb"]
      },
      "application/x-bzip": {
        source: "apache",
        compressible: false,
        extensions: ["bz"]
      },
      "application/x-bzip2": {
        source: "apache",
        compressible: false,
        extensions: ["bz2", "boz"]
      },
      "application/x-cbr": {
        source: "apache",
        extensions: ["cbr", "cba", "cbt", "cbz", "cb7"]
      },
      "application/x-cdlink": {
        source: "apache",
        extensions: ["vcd"]
      },
      "application/x-cfs-compressed": {
        source: "apache",
        extensions: ["cfs"]
      },
      "application/x-chat": {
        source: "apache",
        extensions: ["chat"]
      },
      "application/x-chess-pgn": {
        source: "apache",
        extensions: ["pgn"]
      },
      "application/x-chrome-extension": {
        extensions: ["crx"]
      },
      "application/x-cocoa": {
        source: "nginx",
        extensions: ["cco"]
      },
      "application/x-compress": {
        source: "apache"
      },
      "application/x-conference": {
        source: "apache",
        extensions: ["nsc"]
      },
      "application/x-cpio": {
        source: "apache",
        extensions: ["cpio"]
      },
      "application/x-csh": {
        source: "apache",
        extensions: ["csh"]
      },
      "application/x-deb": {
        compressible: false
      },
      "application/x-debian-package": {
        source: "apache",
        extensions: ["deb", "udeb"]
      },
      "application/x-dgc-compressed": {
        source: "apache",
        extensions: ["dgc"]
      },
      "application/x-director": {
        source: "apache",
        extensions: ["dir", "dcr", "dxr", "cst", "cct", "cxt", "w3d", "fgd", "swa"]
      },
      "application/x-doom": {
        source: "apache",
        extensions: ["wad"]
      },
      "application/x-dtbncx+xml": {
        source: "apache",
        compressible: true,
        extensions: ["ncx"]
      },
      "application/x-dtbook+xml": {
        source: "apache",
        compressible: true,
        extensions: ["dtb"]
      },
      "application/x-dtbresource+xml": {
        source: "apache",
        compressible: true,
        extensions: ["res"]
      },
      "application/x-dvi": {
        source: "apache",
        compressible: false,
        extensions: ["dvi"]
      },
      "application/x-envoy": {
        source: "apache",
        extensions: ["evy"]
      },
      "application/x-eva": {
        source: "apache",
        extensions: ["eva"]
      },
      "application/x-font-bdf": {
        source: "apache",
        extensions: ["bdf"]
      },
      "application/x-font-dos": {
        source: "apache"
      },
      "application/x-font-framemaker": {
        source: "apache"
      },
      "application/x-font-ghostscript": {
        source: "apache",
        extensions: ["gsf"]
      },
      "application/x-font-libgrx": {
        source: "apache"
      },
      "application/x-font-linux-psf": {
        source: "apache",
        extensions: ["psf"]
      },
      "application/x-font-pcf": {
        source: "apache",
        extensions: ["pcf"]
      },
      "application/x-font-snf": {
        source: "apache",
        extensions: ["snf"]
      },
      "application/x-font-speedo": {
        source: "apache"
      },
      "application/x-font-sunos-news": {
        source: "apache"
      },
      "application/x-font-type1": {
        source: "apache",
        extensions: ["pfa", "pfb", "pfm", "afm"]
      },
      "application/x-font-vfont": {
        source: "apache"
      },
      "application/x-freearc": {
        source: "apache",
        extensions: ["arc"]
      },
      "application/x-futuresplash": {
        source: "apache",
        extensions: ["spl"]
      },
      "application/x-gca-compressed": {
        source: "apache",
        extensions: ["gca"]
      },
      "application/x-glulx": {
        source: "apache",
        extensions: ["ulx"]
      },
      "application/x-gnumeric": {
        source: "apache",
        extensions: ["gnumeric"]
      },
      "application/x-gramps-xml": {
        source: "apache",
        extensions: ["gramps"]
      },
      "application/x-gtar": {
        source: "apache",
        extensions: ["gtar"]
      },
      "application/x-gzip": {
        source: "apache"
      },
      "application/x-hdf": {
        source: "apache",
        extensions: ["hdf"]
      },
      "application/x-httpd-php": {
        compressible: true,
        extensions: ["php"]
      },
      "application/x-install-instructions": {
        source: "apache",
        extensions: ["install"]
      },
      "application/x-iso9660-image": {
        source: "apache",
        extensions: ["iso"]
      },
      "application/x-iwork-keynote-sffkey": {
        extensions: ["key"]
      },
      "application/x-iwork-numbers-sffnumbers": {
        extensions: ["numbers"]
      },
      "application/x-iwork-pages-sffpages": {
        extensions: ["pages"]
      },
      "application/x-java-archive-diff": {
        source: "nginx",
        extensions: ["jardiff"]
      },
      "application/x-java-jnlp-file": {
        source: "apache",
        compressible: false,
        extensions: ["jnlp"]
      },
      "application/x-javascript": {
        compressible: true
      },
      "application/x-keepass2": {
        extensions: ["kdbx"]
      },
      "application/x-latex": {
        source: "apache",
        compressible: false,
        extensions: ["latex"]
      },
      "application/x-lua-bytecode": {
        extensions: ["luac"]
      },
      "application/x-lzh-compressed": {
        source: "apache",
        extensions: ["lzh", "lha"]
      },
      "application/x-makeself": {
        source: "nginx",
        extensions: ["run"]
      },
      "application/x-mie": {
        source: "apache",
        extensions: ["mie"]
      },
      "application/x-mobipocket-ebook": {
        source: "apache",
        extensions: ["prc", "mobi"]
      },
      "application/x-mpegurl": {
        compressible: false
      },
      "application/x-ms-application": {
        source: "apache",
        extensions: ["application"]
      },
      "application/x-ms-shortcut": {
        source: "apache",
        extensions: ["lnk"]
      },
      "application/x-ms-wmd": {
        source: "apache",
        extensions: ["wmd"]
      },
      "application/x-ms-wmz": {
        source: "apache",
        extensions: ["wmz"]
      },
      "application/x-ms-xbap": {
        source: "apache",
        extensions: ["xbap"]
      },
      "application/x-msaccess": {
        source: "apache",
        extensions: ["mdb"]
      },
      "application/x-msbinder": {
        source: "apache",
        extensions: ["obd"]
      },
      "application/x-mscardfile": {
        source: "apache",
        extensions: ["crd"]
      },
      "application/x-msclip": {
        source: "apache",
        extensions: ["clp"]
      },
      "application/x-msdos-program": {
        extensions: ["exe"]
      },
      "application/x-msdownload": {
        source: "apache",
        extensions: ["exe", "dll", "com", "bat", "msi"]
      },
      "application/x-msmediaview": {
        source: "apache",
        extensions: ["mvb", "m13", "m14"]
      },
      "application/x-msmetafile": {
        source: "apache",
        extensions: ["wmf", "wmz", "emf", "emz"]
      },
      "application/x-msmoney": {
        source: "apache",
        extensions: ["mny"]
      },
      "application/x-mspublisher": {
        source: "apache",
        extensions: ["pub"]
      },
      "application/x-msschedule": {
        source: "apache",
        extensions: ["scd"]
      },
      "application/x-msterminal": {
        source: "apache",
        extensions: ["trm"]
      },
      "application/x-mswrite": {
        source: "apache",
        extensions: ["wri"]
      },
      "application/x-netcdf": {
        source: "apache",
        extensions: ["nc", "cdf"]
      },
      "application/x-ns-proxy-autoconfig": {
        compressible: true,
        extensions: ["pac"]
      },
      "application/x-nzb": {
        source: "apache",
        extensions: ["nzb"]
      },
      "application/x-perl": {
        source: "nginx",
        extensions: ["pl", "pm"]
      },
      "application/x-pilot": {
        source: "nginx",
        extensions: ["prc", "pdb"]
      },
      "application/x-pkcs12": {
        source: "apache",
        compressible: false,
        extensions: ["p12", "pfx"]
      },
      "application/x-pkcs7-certificates": {
        source: "apache",
        extensions: ["p7b", "spc"]
      },
      "application/x-pkcs7-certreqresp": {
        source: "apache",
        extensions: ["p7r"]
      },
      "application/x-pki-message": {
        source: "iana"
      },
      "application/x-rar-compressed": {
        source: "apache",
        compressible: false,
        extensions: ["rar"]
      },
      "application/x-redhat-package-manager": {
        source: "nginx",
        extensions: ["rpm"]
      },
      "application/x-research-info-systems": {
        source: "apache",
        extensions: ["ris"]
      },
      "application/x-sea": {
        source: "nginx",
        extensions: ["sea"]
      },
      "application/x-sh": {
        source: "apache",
        compressible: true,
        extensions: ["sh"]
      },
      "application/x-shar": {
        source: "apache",
        extensions: ["shar"]
      },
      "application/x-shockwave-flash": {
        source: "apache",
        compressible: false,
        extensions: ["swf"]
      },
      "application/x-silverlight-app": {
        source: "apache",
        extensions: ["xap"]
      },
      "application/x-sql": {
        source: "apache",
        extensions: ["sql"]
      },
      "application/x-stuffit": {
        source: "apache",
        compressible: false,
        extensions: ["sit"]
      },
      "application/x-stuffitx": {
        source: "apache",
        extensions: ["sitx"]
      },
      "application/x-subrip": {
        source: "apache",
        extensions: ["srt"]
      },
      "application/x-sv4cpio": {
        source: "apache",
        extensions: ["sv4cpio"]
      },
      "application/x-sv4crc": {
        source: "apache",
        extensions: ["sv4crc"]
      },
      "application/x-t3vm-image": {
        source: "apache",
        extensions: ["t3"]
      },
      "application/x-tads": {
        source: "apache",
        extensions: ["gam"]
      },
      "application/x-tar": {
        source: "apache",
        compressible: true,
        extensions: ["tar"]
      },
      "application/x-tcl": {
        source: "apache",
        extensions: ["tcl", "tk"]
      },
      "application/x-tex": {
        source: "apache",
        extensions: ["tex"]
      },
      "application/x-tex-tfm": {
        source: "apache",
        extensions: ["tfm"]
      },
      "application/x-texinfo": {
        source: "apache",
        extensions: ["texinfo", "texi"]
      },
      "application/x-tgif": {
        source: "apache",
        extensions: ["obj"]
      },
      "application/x-ustar": {
        source: "apache",
        extensions: ["ustar"]
      },
      "application/x-virtualbox-hdd": {
        compressible: true,
        extensions: ["hdd"]
      },
      "application/x-virtualbox-ova": {
        compressible: true,
        extensions: ["ova"]
      },
      "application/x-virtualbox-ovf": {
        compressible: true,
        extensions: ["ovf"]
      },
      "application/x-virtualbox-vbox": {
        compressible: true,
        extensions: ["vbox"]
      },
      "application/x-virtualbox-vbox-extpack": {
        compressible: false,
        extensions: ["vbox-extpack"]
      },
      "application/x-virtualbox-vdi": {
        compressible: true,
        extensions: ["vdi"]
      },
      "application/x-virtualbox-vhd": {
        compressible: true,
        extensions: ["vhd"]
      },
      "application/x-virtualbox-vmdk": {
        compressible: true,
        extensions: ["vmdk"]
      },
      "application/x-wais-source": {
        source: "apache",
        extensions: ["src"]
      },
      "application/x-web-app-manifest+json": {
        compressible: true,
        extensions: ["webapp"]
      },
      "application/x-www-form-urlencoded": {
        source: "iana",
        compressible: true
      },
      "application/x-x509-ca-cert": {
        source: "iana",
        extensions: ["der", "crt", "pem"]
      },
      "application/x-x509-ca-ra-cert": {
        source: "iana"
      },
      "application/x-x509-next-ca-cert": {
        source: "iana"
      },
      "application/x-xfig": {
        source: "apache",
        extensions: ["fig"]
      },
      "application/x-xliff+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xlf"]
      },
      "application/x-xpinstall": {
        source: "apache",
        compressible: false,
        extensions: ["xpi"]
      },
      "application/x-xz": {
        source: "apache",
        extensions: ["xz"]
      },
      "application/x-zmachine": {
        source: "apache",
        extensions: ["z1", "z2", "z3", "z4", "z5", "z6", "z7", "z8"]
      },
      "application/x400-bp": {
        source: "iana"
      },
      "application/xacml+xml": {
        source: "iana",
        compressible: true
      },
      "application/xaml+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xaml"]
      },
      "application/xcap-att+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xav"]
      },
      "application/xcap-caps+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xca"]
      },
      "application/xcap-diff+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xdf"]
      },
      "application/xcap-el+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xel"]
      },
      "application/xcap-error+xml": {
        source: "iana",
        compressible: true
      },
      "application/xcap-ns+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xns"]
      },
      "application/xcon-conference-info+xml": {
        source: "iana",
        compressible: true
      },
      "application/xcon-conference-info-diff+xml": {
        source: "iana",
        compressible: true
      },
      "application/xenc+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xenc"]
      },
      "application/xhtml+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xhtml", "xht"]
      },
      "application/xhtml-voice+xml": {
        source: "apache",
        compressible: true
      },
      "application/xliff+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xlf"]
      },
      "application/xml": {
        source: "iana",
        compressible: true,
        extensions: ["xml", "xsl", "xsd", "rng"]
      },
      "application/xml-dtd": {
        source: "iana",
        compressible: true,
        extensions: ["dtd"]
      },
      "application/xml-external-parsed-entity": {
        source: "iana"
      },
      "application/xml-patch+xml": {
        source: "iana",
        compressible: true
      },
      "application/xmpp+xml": {
        source: "iana",
        compressible: true
      },
      "application/xop+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xop"]
      },
      "application/xproc+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xpl"]
      },
      "application/xslt+xml": {
        source: "iana",
        compressible: true,
        extensions: ["xsl", "xslt"]
      },
      "application/xspf+xml": {
        source: "apache",
        compressible: true,
        extensions: ["xspf"]
      },
      "application/xv+xml": {
        source: "iana",
        compressible: true,
        extensions: ["mxml", "xhvml", "xvml", "xvm"]
      },
      "application/yang": {
        source: "iana",
        extensions: ["yang"]
      },
      "application/yang-data+json": {
        source: "iana",
        compressible: true
      },
      "application/yang-data+xml": {
        source: "iana",
        compressible: true
      },
      "application/yang-patch+json": {
        source: "iana",
        compressible: true
      },
      "application/yang-patch+xml": {
        source: "iana",
        compressible: true
      },
      "application/yin+xml": {
        source: "iana",
        compressible: true,
        extensions: ["yin"]
      },
      "application/zip": {
        source: "iana",
        compressible: false,
        extensions: ["zip"]
      },
      "application/zlib": {
        source: "iana"
      },
      "application/zstd": {
        source: "iana"
      },
      "audio/1d-interleaved-parityfec": {
        source: "iana"
      },
      "audio/32kadpcm": {
        source: "iana"
      },
      "audio/3gpp": {
        source: "iana",
        compressible: false,
        extensions: ["3gpp"]
      },
      "audio/3gpp2": {
        source: "iana"
      },
      "audio/aac": {
        source: "iana"
      },
      "audio/ac3": {
        source: "iana"
      },
      "audio/adpcm": {
        source: "apache",
        extensions: ["adp"]
      },
      "audio/amr": {
        source: "iana",
        extensions: ["amr"]
      },
      "audio/amr-wb": {
        source: "iana"
      },
      "audio/amr-wb+": {
        source: "iana"
      },
      "audio/aptx": {
        source: "iana"
      },
      "audio/asc": {
        source: "iana"
      },
      "audio/atrac-advanced-lossless": {
        source: "iana"
      },
      "audio/atrac-x": {
        source: "iana"
      },
      "audio/atrac3": {
        source: "iana"
      },
      "audio/basic": {
        source: "iana",
        compressible: false,
        extensions: ["au", "snd"]
      },
      "audio/bv16": {
        source: "iana"
      },
      "audio/bv32": {
        source: "iana"
      },
      "audio/clearmode": {
        source: "iana"
      },
      "audio/cn": {
        source: "iana"
      },
      "audio/dat12": {
        source: "iana"
      },
      "audio/dls": {
        source: "iana"
      },
      "audio/dsr-es201108": {
        source: "iana"
      },
      "audio/dsr-es202050": {
        source: "iana"
      },
      "audio/dsr-es202211": {
        source: "iana"
      },
      "audio/dsr-es202212": {
        source: "iana"
      },
      "audio/dv": {
        source: "iana"
      },
      "audio/dvi4": {
        source: "iana"
      },
      "audio/eac3": {
        source: "iana"
      },
      "audio/encaprtp": {
        source: "iana"
      },
      "audio/evrc": {
        source: "iana"
      },
      "audio/evrc-qcp": {
        source: "iana"
      },
      "audio/evrc0": {
        source: "iana"
      },
      "audio/evrc1": {
        source: "iana"
      },
      "audio/evrcb": {
        source: "iana"
      },
      "audio/evrcb0": {
        source: "iana"
      },
      "audio/evrcb1": {
        source: "iana"
      },
      "audio/evrcnw": {
        source: "iana"
      },
      "audio/evrcnw0": {
        source: "iana"
      },
      "audio/evrcnw1": {
        source: "iana"
      },
      "audio/evrcwb": {
        source: "iana"
      },
      "audio/evrcwb0": {
        source: "iana"
      },
      "audio/evrcwb1": {
        source: "iana"
      },
      "audio/evs": {
        source: "iana"
      },
      "audio/flexfec": {
        source: "iana"
      },
      "audio/fwdred": {
        source: "iana"
      },
      "audio/g711-0": {
        source: "iana"
      },
      "audio/g719": {
        source: "iana"
      },
      "audio/g722": {
        source: "iana"
      },
      "audio/g7221": {
        source: "iana"
      },
      "audio/g723": {
        source: "iana"
      },
      "audio/g726-16": {
        source: "iana"
      },
      "audio/g726-24": {
        source: "iana"
      },
      "audio/g726-32": {
        source: "iana"
      },
      "audio/g726-40": {
        source: "iana"
      },
      "audio/g728": {
        source: "iana"
      },
      "audio/g729": {
        source: "iana"
      },
      "audio/g7291": {
        source: "iana"
      },
      "audio/g729d": {
        source: "iana"
      },
      "audio/g729e": {
        source: "iana"
      },
      "audio/gsm": {
        source: "iana"
      },
      "audio/gsm-efr": {
        source: "iana"
      },
      "audio/gsm-hr-08": {
        source: "iana"
      },
      "audio/ilbc": {
        source: "iana"
      },
      "audio/ip-mr_v2.5": {
        source: "iana"
      },
      "audio/isac": {
        source: "apache"
      },
      "audio/l16": {
        source: "iana"
      },
      "audio/l20": {
        source: "iana"
      },
      "audio/l24": {
        source: "iana",
        compressible: false
      },
      "audio/l8": {
        source: "iana"
      },
      "audio/lpc": {
        source: "iana"
      },
      "audio/melp": {
        source: "iana"
      },
      "audio/melp1200": {
        source: "iana"
      },
      "audio/melp2400": {
        source: "iana"
      },
      "audio/melp600": {
        source: "iana"
      },
      "audio/mhas": {
        source: "iana"
      },
      "audio/midi": {
        source: "apache",
        extensions: ["mid", "midi", "kar", "rmi"]
      },
      "audio/mobile-xmf": {
        source: "iana",
        extensions: ["mxmf"]
      },
      "audio/mp3": {
        compressible: false,
        extensions: ["mp3"]
      },
      "audio/mp4": {
        source: "iana",
        compressible: false,
        extensions: ["m4a", "mp4a"]
      },
      "audio/mp4a-latm": {
        source: "iana"
      },
      "audio/mpa": {
        source: "iana"
      },
      "audio/mpa-robust": {
        source: "iana"
      },
      "audio/mpeg": {
        source: "iana",
        compressible: false,
        extensions: ["mpga", "mp2", "mp2a", "mp3", "m2a", "m3a"]
      },
      "audio/mpeg4-generic": {
        source: "iana"
      },
      "audio/musepack": {
        source: "apache"
      },
      "audio/ogg": {
        source: "iana",
        compressible: false,
        extensions: ["oga", "ogg", "spx", "opus"]
      },
      "audio/opus": {
        source: "iana"
      },
      "audio/parityfec": {
        source: "iana"
      },
      "audio/pcma": {
        source: "iana"
      },
      "audio/pcma-wb": {
        source: "iana"
      },
      "audio/pcmu": {
        source: "iana"
      },
      "audio/pcmu-wb": {
        source: "iana"
      },
      "audio/prs.sid": {
        source: "iana"
      },
      "audio/qcelp": {
        source: "iana"
      },
      "audio/raptorfec": {
        source: "iana"
      },
      "audio/red": {
        source: "iana"
      },
      "audio/rtp-enc-aescm128": {
        source: "iana"
      },
      "audio/rtp-midi": {
        source: "iana"
      },
      "audio/rtploopback": {
        source: "iana"
      },
      "audio/rtx": {
        source: "iana"
      },
      "audio/s3m": {
        source: "apache",
        extensions: ["s3m"]
      },
      "audio/scip": {
        source: "iana"
      },
      "audio/silk": {
        source: "apache",
        extensions: ["sil"]
      },
      "audio/smv": {
        source: "iana"
      },
      "audio/smv-qcp": {
        source: "iana"
      },
      "audio/smv0": {
        source: "iana"
      },
      "audio/sofa": {
        source: "iana"
      },
      "audio/sp-midi": {
        source: "iana"
      },
      "audio/speex": {
        source: "iana"
      },
      "audio/t140c": {
        source: "iana"
      },
      "audio/t38": {
        source: "iana"
      },
      "audio/telephone-event": {
        source: "iana"
      },
      "audio/tetra_acelp": {
        source: "iana"
      },
      "audio/tetra_acelp_bb": {
        source: "iana"
      },
      "audio/tone": {
        source: "iana"
      },
      "audio/tsvcis": {
        source: "iana"
      },
      "audio/uemclip": {
        source: "iana"
      },
      "audio/ulpfec": {
        source: "iana"
      },
      "audio/usac": {
        source: "iana"
      },
      "audio/vdvi": {
        source: "iana"
      },
      "audio/vmr-wb": {
        source: "iana"
      },
      "audio/vnd.3gpp.iufp": {
        source: "iana"
      },
      "audio/vnd.4sb": {
        source: "iana"
      },
      "audio/vnd.audiokoz": {
        source: "iana"
      },
      "audio/vnd.celp": {
        source: "iana"
      },
      "audio/vnd.cisco.nse": {
        source: "iana"
      },
      "audio/vnd.cmles.radio-events": {
        source: "iana"
      },
      "audio/vnd.cns.anp1": {
        source: "iana"
      },
      "audio/vnd.cns.inf1": {
        source: "iana"
      },
      "audio/vnd.dece.audio": {
        source: "iana",
        extensions: ["uva", "uvva"]
      },
      "audio/vnd.digital-winds": {
        source: "iana",
        extensions: ["eol"]
      },
      "audio/vnd.dlna.adts": {
        source: "iana"
      },
      "audio/vnd.dolby.heaac.1": {
        source: "iana"
      },
      "audio/vnd.dolby.heaac.2": {
        source: "iana"
      },
      "audio/vnd.dolby.mlp": {
        source: "iana"
      },
      "audio/vnd.dolby.mps": {
        source: "iana"
      },
      "audio/vnd.dolby.pl2": {
        source: "iana"
      },
      "audio/vnd.dolby.pl2x": {
        source: "iana"
      },
      "audio/vnd.dolby.pl2z": {
        source: "iana"
      },
      "audio/vnd.dolby.pulse.1": {
        source: "iana"
      },
      "audio/vnd.dra": {
        source: "iana",
        extensions: ["dra"]
      },
      "audio/vnd.dts": {
        source: "iana",
        extensions: ["dts"]
      },
      "audio/vnd.dts.hd": {
        source: "iana",
        extensions: ["dtshd"]
      },
      "audio/vnd.dts.uhd": {
        source: "iana"
      },
      "audio/vnd.dvb.file": {
        source: "iana"
      },
      "audio/vnd.everad.plj": {
        source: "iana"
      },
      "audio/vnd.hns.audio": {
        source: "iana"
      },
      "audio/vnd.lucent.voice": {
        source: "iana",
        extensions: ["lvp"]
      },
      "audio/vnd.ms-playready.media.pya": {
        source: "iana",
        extensions: ["pya"]
      },
      "audio/vnd.nokia.mobile-xmf": {
        source: "iana"
      },
      "audio/vnd.nortel.vbk": {
        source: "iana"
      },
      "audio/vnd.nuera.ecelp4800": {
        source: "iana",
        extensions: ["ecelp4800"]
      },
      "audio/vnd.nuera.ecelp7470": {
        source: "iana",
        extensions: ["ecelp7470"]
      },
      "audio/vnd.nuera.ecelp9600": {
        source: "iana",
        extensions: ["ecelp9600"]
      },
      "audio/vnd.octel.sbc": {
        source: "iana"
      },
      "audio/vnd.presonus.multitrack": {
        source: "iana"
      },
      "audio/vnd.qcelp": {
        source: "iana"
      },
      "audio/vnd.rhetorex.32kadpcm": {
        source: "iana"
      },
      "audio/vnd.rip": {
        source: "iana",
        extensions: ["rip"]
      },
      "audio/vnd.rn-realaudio": {
        compressible: false
      },
      "audio/vnd.sealedmedia.softseal.mpeg": {
        source: "iana"
      },
      "audio/vnd.vmx.cvsd": {
        source: "iana"
      },
      "audio/vnd.wave": {
        compressible: false
      },
      "audio/vorbis": {
        source: "iana",
        compressible: false
      },
      "audio/vorbis-config": {
        source: "iana"
      },
      "audio/wav": {
        compressible: false,
        extensions: ["wav"]
      },
      "audio/wave": {
        compressible: false,
        extensions: ["wav"]
      },
      "audio/webm": {
        source: "apache",
        compressible: false,
        extensions: ["weba"]
      },
      "audio/x-aac": {
        source: "apache",
        compressible: false,
        extensions: ["aac"]
      },
      "audio/x-aiff": {
        source: "apache",
        extensions: ["aif", "aiff", "aifc"]
      },
      "audio/x-caf": {
        source: "apache",
        compressible: false,
        extensions: ["caf"]
      },
      "audio/x-flac": {
        source: "apache",
        extensions: ["flac"]
      },
      "audio/x-m4a": {
        source: "nginx",
        extensions: ["m4a"]
      },
      "audio/x-matroska": {
        source: "apache",
        extensions: ["mka"]
      },
      "audio/x-mpegurl": {
        source: "apache",
        extensions: ["m3u"]
      },
      "audio/x-ms-wax": {
        source: "apache",
        extensions: ["wax"]
      },
      "audio/x-ms-wma": {
        source: "apache",
        extensions: ["wma"]
      },
      "audio/x-pn-realaudio": {
        source: "apache",
        extensions: ["ram", "ra"]
      },
      "audio/x-pn-realaudio-plugin": {
        source: "apache",
        extensions: ["rmp"]
      },
      "audio/x-realaudio": {
        source: "nginx",
        extensions: ["ra"]
      },
      "audio/x-tta": {
        source: "apache"
      },
      "audio/x-wav": {
        source: "apache",
        extensions: ["wav"]
      },
      "audio/xm": {
        source: "apache",
        extensions: ["xm"]
      },
      "chemical/x-cdx": {
        source: "apache",
        extensions: ["cdx"]
      },
      "chemical/x-cif": {
        source: "apache",
        extensions: ["cif"]
      },
      "chemical/x-cmdf": {
        source: "apache",
        extensions: ["cmdf"]
      },
      "chemical/x-cml": {
        source: "apache",
        extensions: ["cml"]
      },
      "chemical/x-csml": {
        source: "apache",
        extensions: ["csml"]
      },
      "chemical/x-pdb": {
        source: "apache"
      },
      "chemical/x-xyz": {
        source: "apache",
        extensions: ["xyz"]
      },
      "font/collection": {
        source: "iana",
        extensions: ["ttc"]
      },
      "font/otf": {
        source: "iana",
        compressible: true,
        extensions: ["otf"]
      },
      "font/sfnt": {
        source: "iana"
      },
      "font/ttf": {
        source: "iana",
        compressible: true,
        extensions: ["ttf"]
      },
      "font/woff": {
        source: "iana",
        extensions: ["woff"]
      },
      "font/woff2": {
        source: "iana",
        extensions: ["woff2"]
      },
      "image/aces": {
        source: "iana",
        extensions: ["exr"]
      },
      "image/apng": {
        compressible: false,
        extensions: ["apng"]
      },
      "image/avci": {
        source: "iana"
      },
      "image/avcs": {
        source: "iana"
      },
      "image/avif": {
        source: "iana",
        compressible: false,
        extensions: ["avif"]
      },
      "image/bmp": {
        source: "iana",
        compressible: true,
        extensions: ["bmp"]
      },
      "image/cgm": {
        source: "iana",
        extensions: ["cgm"]
      },
      "image/dicom-rle": {
        source: "iana",
        extensions: ["drle"]
      },
      "image/emf": {
        source: "iana",
        extensions: ["emf"]
      },
      "image/fits": {
        source: "iana",
        extensions: ["fits"]
      },
      "image/g3fax": {
        source: "iana",
        extensions: ["g3"]
      },
      "image/gif": {
        source: "iana",
        compressible: false,
        extensions: ["gif"]
      },
      "image/heic": {
        source: "iana",
        extensions: ["heic"]
      },
      "image/heic-sequence": {
        source: "iana",
        extensions: ["heics"]
      },
      "image/heif": {
        source: "iana",
        extensions: ["heif"]
      },
      "image/heif-sequence": {
        source: "iana",
        extensions: ["heifs"]
      },
      "image/hej2k": {
        source: "iana",
        extensions: ["hej2"]
      },
      "image/hsj2": {
        source: "iana",
        extensions: ["hsj2"]
      },
      "image/ief": {
        source: "iana",
        extensions: ["ief"]
      },
      "image/jls": {
        source: "iana",
        extensions: ["jls"]
      },
      "image/jp2": {
        source: "iana",
        compressible: false,
        extensions: ["jp2", "jpg2"]
      },
      "image/jpeg": {
        source: "iana",
        compressible: false,
        extensions: ["jpeg", "jpg", "jpe"]
      },
      "image/jph": {
        source: "iana",
        extensions: ["jph"]
      },
      "image/jphc": {
        source: "iana",
        extensions: ["jhc"]
      },
      "image/jpm": {
        source: "iana",
        compressible: false,
        extensions: ["jpm"]
      },
      "image/jpx": {
        source: "iana",
        compressible: false,
        extensions: ["jpx", "jpf"]
      },
      "image/jxr": {
        source: "iana",
        extensions: ["jxr"]
      },
      "image/jxra": {
        source: "iana",
        extensions: ["jxra"]
      },
      "image/jxrs": {
        source: "iana",
        extensions: ["jxrs"]
      },
      "image/jxs": {
        source: "iana",
        extensions: ["jxs"]
      },
      "image/jxsc": {
        source: "iana",
        extensions: ["jxsc"]
      },
      "image/jxsi": {
        source: "iana",
        extensions: ["jxsi"]
      },
      "image/jxss": {
        source: "iana",
        extensions: ["jxss"]
      },
      "image/ktx": {
        source: "iana",
        extensions: ["ktx"]
      },
      "image/ktx2": {
        source: "iana",
        extensions: ["ktx2"]
      },
      "image/naplps": {
        source: "iana"
      },
      "image/pjpeg": {
        compressible: false
      },
      "image/png": {
        source: "iana",
        compressible: false,
        extensions: ["png"]
      },
      "image/prs.btif": {
        source: "iana",
        extensions: ["btif"]
      },
      "image/prs.pti": {
        source: "iana",
        extensions: ["pti"]
      },
      "image/pwg-raster": {
        source: "iana"
      },
      "image/sgi": {
        source: "apache",
        extensions: ["sgi"]
      },
      "image/svg+xml": {
        source: "iana",
        compressible: true,
        extensions: ["svg", "svgz"]
      },
      "image/t38": {
        source: "iana",
        extensions: ["t38"]
      },
      "image/tiff": {
        source: "iana",
        compressible: false,
        extensions: ["tif", "tiff"]
      },
      "image/tiff-fx": {
        source: "iana",
        extensions: ["tfx"]
      },
      "image/vnd.adobe.photoshop": {
        source: "iana",
        compressible: true,
        extensions: ["psd"]
      },
      "image/vnd.airzip.accelerator.azv": {
        source: "iana",
        extensions: ["azv"]
      },
      "image/vnd.cns.inf2": {
        source: "iana"
      },
      "image/vnd.dece.graphic": {
        source: "iana",
        extensions: ["uvi", "uvvi", "uvg", "uvvg"]
      },
      "image/vnd.djvu": {
        source: "iana",
        extensions: ["djvu", "djv"]
      },
      "image/vnd.dvb.subtitle": {
        source: "iana",
        extensions: ["sub"]
      },
      "image/vnd.dwg": {
        source: "iana",
        extensions: ["dwg"]
      },
      "image/vnd.dxf": {
        source: "iana",
        extensions: ["dxf"]
      },
      "image/vnd.fastbidsheet": {
        source: "iana",
        extensions: ["fbs"]
      },
      "image/vnd.fpx": {
        source: "iana",
        extensions: ["fpx"]
      },
      "image/vnd.fst": {
        source: "iana",
        extensions: ["fst"]
      },
      "image/vnd.fujixerox.edmics-mmr": {
        source: "iana",
        extensions: ["mmr"]
      },
      "image/vnd.fujixerox.edmics-rlc": {
        source: "iana",
        extensions: ["rlc"]
      },
      "image/vnd.globalgraphics.pgb": {
        source: "iana"
      },
      "image/vnd.microsoft.icon": {
        source: "iana",
        compressible: true,
        extensions: ["ico"]
      },
      "image/vnd.mix": {
        source: "iana"
      },
      "image/vnd.mozilla.apng": {
        source: "iana"
      },
      "image/vnd.ms-dds": {
        compressible: true,
        extensions: ["dds"]
      },
      "image/vnd.ms-modi": {
        source: "iana",
        extensions: ["mdi"]
      },
      "image/vnd.ms-photo": {
        source: "apache",
        extensions: ["wdp"]
      },
      "image/vnd.net-fpx": {
        source: "iana",
        extensions: ["npx"]
      },
      "image/vnd.pco.b16": {
        source: "iana",
        extensions: ["b16"]
      },
      "image/vnd.radiance": {
        source: "iana"
      },
      "image/vnd.sealed.png": {
        source: "iana"
      },
      "image/vnd.sealedmedia.softseal.gif": {
        source: "iana"
      },
      "image/vnd.sealedmedia.softseal.jpg": {
        source: "iana"
      },
      "image/vnd.svf": {
        source: "iana"
      },
      "image/vnd.tencent.tap": {
        source: "iana",
        extensions: ["tap"]
      },
      "image/vnd.valve.source.texture": {
        source: "iana",
        extensions: ["vtf"]
      },
      "image/vnd.wap.wbmp": {
        source: "iana",
        extensions: ["wbmp"]
      },
      "image/vnd.xiff": {
        source: "iana",
        extensions: ["xif"]
      },
      "image/vnd.zbrush.pcx": {
        source: "iana",
        extensions: ["pcx"]
      },
      "image/webp": {
        source: "apache",
        extensions: ["webp"]
      },
      "image/wmf": {
        source: "iana",
        extensions: ["wmf"]
      },
      "image/x-3ds": {
        source: "apache",
        extensions: ["3ds"]
      },
      "image/x-cmu-raster": {
        source: "apache",
        extensions: ["ras"]
      },
      "image/x-cmx": {
        source: "apache",
        extensions: ["cmx"]
      },
      "image/x-freehand": {
        source: "apache",
        extensions: ["fh", "fhc", "fh4", "fh5", "fh7"]
      },
      "image/x-icon": {
        source: "apache",
        compressible: true,
        extensions: ["ico"]
      },
      "image/x-jng": {
        source: "nginx",
        extensions: ["jng"]
      },
      "image/x-mrsid-image": {
        source: "apache",
        extensions: ["sid"]
      },
      "image/x-ms-bmp": {
        source: "nginx",
        compressible: true,
        extensions: ["bmp"]
      },
      "image/x-pcx": {
        source: "apache",
        extensions: ["pcx"]
      },
      "image/x-pict": {
        source: "apache",
        extensions: ["pic", "pct"]
      },
      "image/x-portable-anymap": {
        source: "apache",
        extensions: ["pnm"]
      },
      "image/x-portable-bitmap": {
        source: "apache",
        extensions: ["pbm"]
      },
      "image/x-portable-graymap": {
        source: "apache",
        extensions: ["pgm"]
      },
      "image/x-portable-pixmap": {
        source: "apache",
        extensions: ["ppm"]
      },
      "image/x-rgb": {
        source: "apache",
        extensions: ["rgb"]
      },
      "image/x-tga": {
        source: "apache",
        extensions: ["tga"]
      },
      "image/x-xbitmap": {
        source: "apache",
        extensions: ["xbm"]
      },
      "image/x-xcf": {
        compressible: false
      },
      "image/x-xpixmap": {
        source: "apache",
        extensions: ["xpm"]
      },
      "image/x-xwindowdump": {
        source: "apache",
        extensions: ["xwd"]
      },
      "message/cpim": {
        source: "iana"
      },
      "message/delivery-status": {
        source: "iana"
      },
      "message/disposition-notification": {
        source: "iana",
        extensions: [
          "disposition-notification"
        ]
      },
      "message/external-body": {
        source: "iana"
      },
      "message/feedback-report": {
        source: "iana"
      },
      "message/global": {
        source: "iana",
        extensions: ["u8msg"]
      },
      "message/global-delivery-status": {
        source: "iana",
        extensions: ["u8dsn"]
      },
      "message/global-disposition-notification": {
        source: "iana",
        extensions: ["u8mdn"]
      },
      "message/global-headers": {
        source: "iana",
        extensions: ["u8hdr"]
      },
      "message/http": {
        source: "iana",
        compressible: false
      },
      "message/imdn+xml": {
        source: "iana",
        compressible: true
      },
      "message/news": {
        source: "iana"
      },
      "message/partial": {
        source: "iana",
        compressible: false
      },
      "message/rfc822": {
        source: "iana",
        compressible: true,
        extensions: ["eml", "mime"]
      },
      "message/s-http": {
        source: "iana"
      },
      "message/sip": {
        source: "iana"
      },
      "message/sipfrag": {
        source: "iana"
      },
      "message/tracking-status": {
        source: "iana"
      },
      "message/vnd.si.simp": {
        source: "iana"
      },
      "message/vnd.wfa.wsc": {
        source: "iana",
        extensions: ["wsc"]
      },
      "model/3mf": {
        source: "iana",
        extensions: ["3mf"]
      },
      "model/e57": {
        source: "iana"
      },
      "model/gltf+json": {
        source: "iana",
        compressible: true,
        extensions: ["gltf"]
      },
      "model/gltf-binary": {
        source: "iana",
        compressible: true,
        extensions: ["glb"]
      },
      "model/iges": {
        source: "iana",
        compressible: false,
        extensions: ["igs", "iges"]
      },
      "model/mesh": {
        source: "iana",
        compressible: false,
        extensions: ["msh", "mesh", "silo"]
      },
      "model/mtl": {
        source: "iana",
        extensions: ["mtl"]
      },
      "model/obj": {
        source: "iana",
        extensions: ["obj"]
      },
      "model/step": {
        source: "iana"
      },
      "model/step+xml": {
        source: "iana",
        compressible: true,
        extensions: ["stpx"]
      },
      "model/step+zip": {
        source: "iana",
        compressible: false,
        extensions: ["stpz"]
      },
      "model/step-xml+zip": {
        source: "iana",
        compressible: false,
        extensions: ["stpxz"]
      },
      "model/stl": {
        source: "iana",
        extensions: ["stl"]
      },
      "model/vnd.collada+xml": {
        source: "iana",
        compressible: true,
        extensions: ["dae"]
      },
      "model/vnd.dwf": {
        source: "iana",
        extensions: ["dwf"]
      },
      "model/vnd.flatland.3dml": {
        source: "iana"
      },
      "model/vnd.gdl": {
        source: "iana",
        extensions: ["gdl"]
      },
      "model/vnd.gs-gdl": {
        source: "apache"
      },
      "model/vnd.gs.gdl": {
        source: "iana"
      },
      "model/vnd.gtw": {
        source: "iana",
        extensions: ["gtw"]
      },
      "model/vnd.moml+xml": {
        source: "iana",
        compressible: true
      },
      "model/vnd.mts": {
        source: "iana",
        extensions: ["mts"]
      },
      "model/vnd.opengex": {
        source: "iana",
        extensions: ["ogex"]
      },
      "model/vnd.parasolid.transmit.binary": {
        source: "iana",
        extensions: ["x_b"]
      },
      "model/vnd.parasolid.transmit.text": {
        source: "iana",
        extensions: ["x_t"]
      },
      "model/vnd.pytha.pyox": {
        source: "iana"
      },
      "model/vnd.rosette.annotated-data-model": {
        source: "iana"
      },
      "model/vnd.sap.vds": {
        source: "iana",
        extensions: ["vds"]
      },
      "model/vnd.usdz+zip": {
        source: "iana",
        compressible: false,
        extensions: ["usdz"]
      },
      "model/vnd.valve.source.compiled-map": {
        source: "iana",
        extensions: ["bsp"]
      },
      "model/vnd.vtu": {
        source: "iana",
        extensions: ["vtu"]
      },
      "model/vrml": {
        source: "iana",
        compressible: false,
        extensions: ["wrl", "vrml"]
      },
      "model/x3d+binary": {
        source: "apache",
        compressible: false,
        extensions: ["x3db", "x3dbz"]
      },
      "model/x3d+fastinfoset": {
        source: "iana",
        extensions: ["x3db"]
      },
      "model/x3d+vrml": {
        source: "apache",
        compressible: false,
        extensions: ["x3dv", "x3dvz"]
      },
      "model/x3d+xml": {
        source: "iana",
        compressible: true,
        extensions: ["x3d", "x3dz"]
      },
      "model/x3d-vrml": {
        source: "iana",
        extensions: ["x3dv"]
      },
      "multipart/alternative": {
        source: "iana",
        compressible: false
      },
      "multipart/appledouble": {
        source: "iana"
      },
      "multipart/byteranges": {
        source: "iana"
      },
      "multipart/digest": {
        source: "iana"
      },
      "multipart/encrypted": {
        source: "iana",
        compressible: false
      },
      "multipart/form-data": {
        source: "iana",
        compressible: false
      },
      "multipart/header-set": {
        source: "iana"
      },
      "multipart/mixed": {
        source: "iana"
      },
      "multipart/multilingual": {
        source: "iana"
      },
      "multipart/parallel": {
        source: "iana"
      },
      "multipart/related": {
        source: "iana",
        compressible: false
      },
      "multipart/report": {
        source: "iana"
      },
      "multipart/signed": {
        source: "iana",
        compressible: false
      },
      "multipart/vnd.bint.med-plus": {
        source: "iana"
      },
      "multipart/voice-message": {
        source: "iana"
      },
      "multipart/x-mixed-replace": {
        source: "iana"
      },
      "text/1d-interleaved-parityfec": {
        source: "iana"
      },
      "text/cache-manifest": {
        source: "iana",
        compressible: true,
        extensions: ["appcache", "manifest"]
      },
      "text/calendar": {
        source: "iana",
        extensions: ["ics", "ifb"]
      },
      "text/calender": {
        compressible: true
      },
      "text/cmd": {
        compressible: true
      },
      "text/coffeescript": {
        extensions: ["coffee", "litcoffee"]
      },
      "text/cql": {
        source: "iana"
      },
      "text/cql-expression": {
        source: "iana"
      },
      "text/cql-identifier": {
        source: "iana"
      },
      "text/css": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["css"]
      },
      "text/csv": {
        source: "iana",
        compressible: true,
        extensions: ["csv"]
      },
      "text/csv-schema": {
        source: "iana"
      },
      "text/directory": {
        source: "iana"
      },
      "text/dns": {
        source: "iana"
      },
      "text/ecmascript": {
        source: "iana"
      },
      "text/encaprtp": {
        source: "iana"
      },
      "text/enriched": {
        source: "iana"
      },
      "text/fhirpath": {
        source: "iana"
      },
      "text/flexfec": {
        source: "iana"
      },
      "text/fwdred": {
        source: "iana"
      },
      "text/gff3": {
        source: "iana"
      },
      "text/grammar-ref-list": {
        source: "iana"
      },
      "text/html": {
        source: "iana",
        compressible: true,
        extensions: ["html", "htm", "shtml"]
      },
      "text/jade": {
        extensions: ["jade"]
      },
      "text/javascript": {
        source: "iana",
        compressible: true
      },
      "text/jcr-cnd": {
        source: "iana"
      },
      "text/jsx": {
        compressible: true,
        extensions: ["jsx"]
      },
      "text/less": {
        compressible: true,
        extensions: ["less"]
      },
      "text/markdown": {
        source: "iana",
        compressible: true,
        extensions: ["markdown", "md"]
      },
      "text/mathml": {
        source: "nginx",
        extensions: ["mml"]
      },
      "text/mdx": {
        compressible: true,
        extensions: ["mdx"]
      },
      "text/mizar": {
        source: "iana"
      },
      "text/n3": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["n3"]
      },
      "text/parameters": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/parityfec": {
        source: "iana"
      },
      "text/plain": {
        source: "iana",
        compressible: true,
        extensions: ["txt", "text", "conf", "def", "list", "log", "in", "ini"]
      },
      "text/provenance-notation": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/prs.fallenstein.rst": {
        source: "iana"
      },
      "text/prs.lines.tag": {
        source: "iana",
        extensions: ["dsc"]
      },
      "text/prs.prop.logic": {
        source: "iana"
      },
      "text/raptorfec": {
        source: "iana"
      },
      "text/red": {
        source: "iana"
      },
      "text/rfc822-headers": {
        source: "iana"
      },
      "text/richtext": {
        source: "iana",
        compressible: true,
        extensions: ["rtx"]
      },
      "text/rtf": {
        source: "iana",
        compressible: true,
        extensions: ["rtf"]
      },
      "text/rtp-enc-aescm128": {
        source: "iana"
      },
      "text/rtploopback": {
        source: "iana"
      },
      "text/rtx": {
        source: "iana"
      },
      "text/sgml": {
        source: "iana",
        extensions: ["sgml", "sgm"]
      },
      "text/shaclc": {
        source: "iana"
      },
      "text/shex": {
        source: "iana",
        extensions: ["shex"]
      },
      "text/slim": {
        extensions: ["slim", "slm"]
      },
      "text/spdx": {
        source: "iana",
        extensions: ["spdx"]
      },
      "text/strings": {
        source: "iana"
      },
      "text/stylus": {
        extensions: ["stylus", "styl"]
      },
      "text/t140": {
        source: "iana"
      },
      "text/tab-separated-values": {
        source: "iana",
        compressible: true,
        extensions: ["tsv"]
      },
      "text/troff": {
        source: "iana",
        extensions: ["t", "tr", "roff", "man", "me", "ms"]
      },
      "text/turtle": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["ttl"]
      },
      "text/ulpfec": {
        source: "iana"
      },
      "text/uri-list": {
        source: "iana",
        compressible: true,
        extensions: ["uri", "uris", "urls"]
      },
      "text/vcard": {
        source: "iana",
        compressible: true,
        extensions: ["vcard"]
      },
      "text/vnd.a": {
        source: "iana"
      },
      "text/vnd.abc": {
        source: "iana"
      },
      "text/vnd.ascii-art": {
        source: "iana"
      },
      "text/vnd.curl": {
        source: "iana",
        extensions: ["curl"]
      },
      "text/vnd.curl.dcurl": {
        source: "apache",
        extensions: ["dcurl"]
      },
      "text/vnd.curl.mcurl": {
        source: "apache",
        extensions: ["mcurl"]
      },
      "text/vnd.curl.scurl": {
        source: "apache",
        extensions: ["scurl"]
      },
      "text/vnd.debian.copyright": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/vnd.dmclientscript": {
        source: "iana"
      },
      "text/vnd.dvb.subtitle": {
        source: "iana",
        extensions: ["sub"]
      },
      "text/vnd.esmertec.theme-descriptor": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/vnd.familysearch.gedcom": {
        source: "iana",
        extensions: ["ged"]
      },
      "text/vnd.ficlab.flt": {
        source: "iana"
      },
      "text/vnd.fly": {
        source: "iana",
        extensions: ["fly"]
      },
      "text/vnd.fmi.flexstor": {
        source: "iana",
        extensions: ["flx"]
      },
      "text/vnd.gml": {
        source: "iana"
      },
      "text/vnd.graphviz": {
        source: "iana",
        extensions: ["gv"]
      },
      "text/vnd.hans": {
        source: "iana"
      },
      "text/vnd.hgl": {
        source: "iana"
      },
      "text/vnd.in3d.3dml": {
        source: "iana",
        extensions: ["3dml"]
      },
      "text/vnd.in3d.spot": {
        source: "iana",
        extensions: ["spot"]
      },
      "text/vnd.iptc.newsml": {
        source: "iana"
      },
      "text/vnd.iptc.nitf": {
        source: "iana"
      },
      "text/vnd.latex-z": {
        source: "iana"
      },
      "text/vnd.motorola.reflex": {
        source: "iana"
      },
      "text/vnd.ms-mediapackage": {
        source: "iana"
      },
      "text/vnd.net2phone.commcenter.command": {
        source: "iana"
      },
      "text/vnd.radisys.msml-basic-layout": {
        source: "iana"
      },
      "text/vnd.senx.warpscript": {
        source: "iana"
      },
      "text/vnd.si.uricatalogue": {
        source: "iana"
      },
      "text/vnd.sosi": {
        source: "iana"
      },
      "text/vnd.sun.j2me.app-descriptor": {
        source: "iana",
        charset: "UTF-8",
        extensions: ["jad"]
      },
      "text/vnd.trolltech.linguist": {
        source: "iana",
        charset: "UTF-8"
      },
      "text/vnd.wap.si": {
        source: "iana"
      },
      "text/vnd.wap.sl": {
        source: "iana"
      },
      "text/vnd.wap.wml": {
        source: "iana",
        extensions: ["wml"]
      },
      "text/vnd.wap.wmlscript": {
        source: "iana",
        extensions: ["wmls"]
      },
      "text/vtt": {
        source: "iana",
        charset: "UTF-8",
        compressible: true,
        extensions: ["vtt"]
      },
      "text/x-asm": {
        source: "apache",
        extensions: ["s", "asm"]
      },
      "text/x-c": {
        source: "apache",
        extensions: ["c", "cc", "cxx", "cpp", "h", "hh", "dic"]
      },
      "text/x-component": {
        source: "nginx",
        extensions: ["htc"]
      },
      "text/x-fortran": {
        source: "apache",
        extensions: ["f", "for", "f77", "f90"]
      },
      "text/x-gwt-rpc": {
        compressible: true
      },
      "text/x-handlebars-template": {
        extensions: ["hbs"]
      },
      "text/x-java-source": {
        source: "apache",
        extensions: ["java"]
      },
      "text/x-jquery-tmpl": {
        compressible: true
      },
      "text/x-lua": {
        extensions: ["lua"]
      },
      "text/x-markdown": {
        compressible: true,
        extensions: ["mkd"]
      },
      "text/x-nfo": {
        source: "apache",
        extensions: ["nfo"]
      },
      "text/x-opml": {
        source: "apache",
        extensions: ["opml"]
      },
      "text/x-org": {
        compressible: true,
        extensions: ["org"]
      },
      "text/x-pascal": {
        source: "apache",
        extensions: ["p", "pas"]
      },
      "text/x-processing": {
        compressible: true,
        extensions: ["pde"]
      },
      "text/x-sass": {
        extensions: ["sass"]
      },
      "text/x-scss": {
        extensions: ["scss"]
      },
      "text/x-setext": {
        source: "apache",
        extensions: ["etx"]
      },
      "text/x-sfv": {
        source: "apache",
        extensions: ["sfv"]
      },
      "text/x-suse-ymp": {
        compressible: true,
        extensions: ["ymp"]
      },
      "text/x-uuencode": {
        source: "apache",
        extensions: ["uu"]
      },
      "text/x-vcalendar": {
        source: "apache",
        extensions: ["vcs"]
      },
      "text/x-vcard": {
        source: "apache",
        extensions: ["vcf"]
      },
      "text/xml": {
        source: "iana",
        compressible: true,
        extensions: ["xml"]
      },
      "text/xml-external-parsed-entity": {
        source: "iana"
      },
      "text/yaml": {
        compressible: true,
        extensions: ["yaml", "yml"]
      },
      "video/1d-interleaved-parityfec": {
        source: "iana"
      },
      "video/3gpp": {
        source: "iana",
        extensions: ["3gp", "3gpp"]
      },
      "video/3gpp-tt": {
        source: "iana"
      },
      "video/3gpp2": {
        source: "iana",
        extensions: ["3g2"]
      },
      "video/av1": {
        source: "iana"
      },
      "video/bmpeg": {
        source: "iana"
      },
      "video/bt656": {
        source: "iana"
      },
      "video/celb": {
        source: "iana"
      },
      "video/dv": {
        source: "iana"
      },
      "video/encaprtp": {
        source: "iana"
      },
      "video/ffv1": {
        source: "iana"
      },
      "video/flexfec": {
        source: "iana"
      },
      "video/h261": {
        source: "iana",
        extensions: ["h261"]
      },
      "video/h263": {
        source: "iana",
        extensions: ["h263"]
      },
      "video/h263-1998": {
        source: "iana"
      },
      "video/h263-2000": {
        source: "iana"
      },
      "video/h264": {
        source: "iana",
        extensions: ["h264"]
      },
      "video/h264-rcdo": {
        source: "iana"
      },
      "video/h264-svc": {
        source: "iana"
      },
      "video/h265": {
        source: "iana"
      },
      "video/iso.segment": {
        source: "iana",
        extensions: ["m4s"]
      },
      "video/jpeg": {
        source: "iana",
        extensions: ["jpgv"]
      },
      "video/jpeg2000": {
        source: "iana"
      },
      "video/jpm": {
        source: "apache",
        extensions: ["jpm", "jpgm"]
      },
      "video/jxsv": {
        source: "iana"
      },
      "video/mj2": {
        source: "iana",
        extensions: ["mj2", "mjp2"]
      },
      "video/mp1s": {
        source: "iana"
      },
      "video/mp2p": {
        source: "iana"
      },
      "video/mp2t": {
        source: "iana",
        extensions: ["ts"]
      },
      "video/mp4": {
        source: "iana",
        compressible: false,
        extensions: ["mp4", "mp4v", "mpg4"]
      },
      "video/mp4v-es": {
        source: "iana"
      },
      "video/mpeg": {
        source: "iana",
        compressible: false,
        extensions: ["mpeg", "mpg", "mpe", "m1v", "m2v"]
      },
      "video/mpeg4-generic": {
        source: "iana"
      },
      "video/mpv": {
        source: "iana"
      },
      "video/nv": {
        source: "iana"
      },
      "video/ogg": {
        source: "iana",
        compressible: false,
        extensions: ["ogv"]
      },
      "video/parityfec": {
        source: "iana"
      },
      "video/pointer": {
        source: "iana"
      },
      "video/quicktime": {
        source: "iana",
        compressible: false,
        extensions: ["qt", "mov"]
      },
      "video/raptorfec": {
        source: "iana"
      },
      "video/raw": {
        source: "iana"
      },
      "video/rtp-enc-aescm128": {
        source: "iana"
      },
      "video/rtploopback": {
        source: "iana"
      },
      "video/rtx": {
        source: "iana"
      },
      "video/scip": {
        source: "iana"
      },
      "video/smpte291": {
        source: "iana"
      },
      "video/smpte292m": {
        source: "iana"
      },
      "video/ulpfec": {
        source: "iana"
      },
      "video/vc1": {
        source: "iana"
      },
      "video/vc2": {
        source: "iana"
      },
      "video/vnd.cctv": {
        source: "iana"
      },
      "video/vnd.dece.hd": {
        source: "iana",
        extensions: ["uvh", "uvvh"]
      },
      "video/vnd.dece.mobile": {
        source: "iana",
        extensions: ["uvm", "uvvm"]
      },
      "video/vnd.dece.mp4": {
        source: "iana"
      },
      "video/vnd.dece.pd": {
        source: "iana",
        extensions: ["uvp", "uvvp"]
      },
      "video/vnd.dece.sd": {
        source: "iana",
        extensions: ["uvs", "uvvs"]
      },
      "video/vnd.dece.video": {
        source: "iana",
        extensions: ["uvv", "uvvv"]
      },
      "video/vnd.directv.mpeg": {
        source: "iana"
      },
      "video/vnd.directv.mpeg-tts": {
        source: "iana"
      },
      "video/vnd.dlna.mpeg-tts": {
        source: "iana"
      },
      "video/vnd.dvb.file": {
        source: "iana",
        extensions: ["dvb"]
      },
      "video/vnd.fvt": {
        source: "iana",
        extensions: ["fvt"]
      },
      "video/vnd.hns.video": {
        source: "iana"
      },
      "video/vnd.iptvforum.1dparityfec-1010": {
        source: "iana"
      },
      "video/vnd.iptvforum.1dparityfec-2005": {
        source: "iana"
      },
      "video/vnd.iptvforum.2dparityfec-1010": {
        source: "iana"
      },
      "video/vnd.iptvforum.2dparityfec-2005": {
        source: "iana"
      },
      "video/vnd.iptvforum.ttsavc": {
        source: "iana"
      },
      "video/vnd.iptvforum.ttsmpeg2": {
        source: "iana"
      },
      "video/vnd.motorola.video": {
        source: "iana"
      },
      "video/vnd.motorola.videop": {
        source: "iana"
      },
      "video/vnd.mpegurl": {
        source: "iana",
        extensions: ["mxu", "m4u"]
      },
      "video/vnd.ms-playready.media.pyv": {
        source: "iana",
        extensions: ["pyv"]
      },
      "video/vnd.nokia.interleaved-multimedia": {
        source: "iana"
      },
      "video/vnd.nokia.mp4vr": {
        source: "iana"
      },
      "video/vnd.nokia.videovoip": {
        source: "iana"
      },
      "video/vnd.objectvideo": {
        source: "iana"
      },
      "video/vnd.radgamettools.bink": {
        source: "iana"
      },
      "video/vnd.radgamettools.smacker": {
        source: "iana"
      },
      "video/vnd.sealed.mpeg1": {
        source: "iana"
      },
      "video/vnd.sealed.mpeg4": {
        source: "iana"
      },
      "video/vnd.sealed.swf": {
        source: "iana"
      },
      "video/vnd.sealedmedia.softseal.mov": {
        source: "iana"
      },
      "video/vnd.uvvu.mp4": {
        source: "iana",
        extensions: ["uvu", "uvvu"]
      },
      "video/vnd.vivo": {
        source: "iana",
        extensions: ["viv"]
      },
      "video/vnd.youtube.yt": {
        source: "iana"
      },
      "video/vp8": {
        source: "iana"
      },
      "video/vp9": {
        source: "iana"
      },
      "video/webm": {
        source: "apache",
        compressible: false,
        extensions: ["webm"]
      },
      "video/x-f4v": {
        source: "apache",
        extensions: ["f4v"]
      },
      "video/x-fli": {
        source: "apache",
        extensions: ["fli"]
      },
      "video/x-flv": {
        source: "apache",
        compressible: false,
        extensions: ["flv"]
      },
      "video/x-m4v": {
        source: "apache",
        extensions: ["m4v"]
      },
      "video/x-matroska": {
        source: "apache",
        compressible: false,
        extensions: ["mkv", "mk3d", "mks"]
      },
      "video/x-mng": {
        source: "apache",
        extensions: ["mng"]
      },
      "video/x-ms-asf": {
        source: "apache",
        extensions: ["asf", "asx"]
      },
      "video/x-ms-vob": {
        source: "apache",
        extensions: ["vob"]
      },
      "video/x-ms-wm": {
        source: "apache",
        extensions: ["wm"]
      },
      "video/x-ms-wmv": {
        source: "apache",
        compressible: false,
        extensions: ["wmv"]
      },
      "video/x-ms-wmx": {
        source: "apache",
        extensions: ["wmx"]
      },
      "video/x-ms-wvx": {
        source: "apache",
        extensions: ["wvx"]
      },
      "video/x-msvideo": {
        source: "apache",
        extensions: ["avi"]
      },
      "video/x-sgi-movie": {
        source: "apache",
        extensions: ["movie"]
      },
      "video/x-smv": {
        source: "apache",
        extensions: ["smv"]
      },
      "x-conference/x-cooltalk": {
        source: "apache",
        extensions: ["ice"]
      },
      "x-shader/x-fragment": {
        compressible: true
      },
      "x-shader/x-vertex": {
        compressible: true
      }
    };
  }
});

// node_modules/mime-db/index.js
var require_mime_db = __commonJS({
  "node_modules/mime-db/index.js"(exports2, module2) {
    module2.exports = require_db();
  }
});

// node_modules/mime-types/index.js
var require_mime_types = __commonJS({
  "node_modules/mime-types/index.js"(exports2) {
    "use strict";
    var db = require_mime_db();
    var extname = require("path").extname;
    var EXTRACT_TYPE_REGEXP = /^\s*([^;\s]*)(?:;|\s|$)/;
    var TEXT_TYPE_REGEXP = /^text\//i;
    exports2.charset = charset;
    exports2.charsets = { lookup: charset };
    exports2.contentType = contentType;
    exports2.extension = extension;
    exports2.extensions = /* @__PURE__ */ Object.create(null);
    exports2.lookup = lookup;
    exports2.types = /* @__PURE__ */ Object.create(null);
    populateMaps(exports2.extensions, exports2.types);
    function charset(type) {
      if (!type || typeof type !== "string") {
        return false;
      }
      var match = EXTRACT_TYPE_REGEXP.exec(type);
      var mime = match && db[match[1].toLowerCase()];
      if (mime && mime.charset) {
        return mime.charset;
      }
      if (match && TEXT_TYPE_REGEXP.test(match[1])) {
        return "UTF-8";
      }
      return false;
    }
    function contentType(str) {
      if (!str || typeof str !== "string") {
        return false;
      }
      var mime = str.indexOf("/") === -1 ? exports2.lookup(str) : str;
      if (!mime) {
        return false;
      }
      if (mime.indexOf("charset") === -1) {
        var charset2 = exports2.charset(mime);
        if (charset2) mime += "; charset=" + charset2.toLowerCase();
      }
      return mime;
    }
    function extension(type) {
      if (!type || typeof type !== "string") {
        return false;
      }
      var match = EXTRACT_TYPE_REGEXP.exec(type);
      var exts = match && exports2.extensions[match[1].toLowerCase()];
      if (!exts || !exts.length) {
        return false;
      }
      return exts[0];
    }
    function lookup(path) {
      if (!path || typeof path !== "string") {
        return false;
      }
      var extension2 = extname("x." + path).toLowerCase().substr(1);
      if (!extension2) {
        return false;
      }
      return exports2.types[extension2] || false;
    }
    function populateMaps(extensions, types) {
      var preference = ["nginx", "apache", void 0, "iana"];
      Object.keys(db).forEach(function forEachMimeType(type) {
        var mime = db[type];
        var exts = mime.extensions;
        if (!exts || !exts.length) {
          return;
        }
        extensions[type] = exts;
        for (var i = 0; i < exts.length; i++) {
          var extension2 = exts[i];
          if (types[extension2]) {
            var from = preference.indexOf(db[types[extension2]].source);
            var to = preference.indexOf(mime.source);
            if (types[extension2] !== "application/octet-stream" && (from > to || from === to && types[extension2].substr(0, 12) === "application/")) {
              continue;
            }
          }
          types[extension2] = type;
        }
      });
    }
  }
});

// node_modules/asynckit/lib/defer.js
var require_defer = __commonJS({
  "node_modules/asynckit/lib/defer.js"(exports2, module2) {
    module2.exports = defer;
    function defer(fn) {
      var nextTick = typeof setImmediate == "function" ? setImmediate : typeof process == "object" && typeof process.nextTick == "function" ? process.nextTick : null;
      if (nextTick) {
        nextTick(fn);
      } else {
        setTimeout(fn, 0);
      }
    }
  }
});

// node_modules/asynckit/lib/async.js
var require_async = __commonJS({
  "node_modules/asynckit/lib/async.js"(exports2, module2) {
    var defer = require_defer();
    module2.exports = async;
    function async(callback) {
      var isAsync = false;
      defer(function() {
        isAsync = true;
      });
      return function async_callback(err, result) {
        if (isAsync) {
          callback(err, result);
        } else {
          defer(function nextTick_callback() {
            callback(err, result);
          });
        }
      };
    }
  }
});

// node_modules/asynckit/lib/abort.js
var require_abort = __commonJS({
  "node_modules/asynckit/lib/abort.js"(exports2, module2) {
    module2.exports = abort;
    function abort(state) {
      Object.keys(state.jobs).forEach(clean.bind(state));
      state.jobs = {};
    }
    function clean(key) {
      if (typeof this.jobs[key] == "function") {
        this.jobs[key]();
      }
    }
  }
});

// node_modules/asynckit/lib/iterate.js
var require_iterate = __commonJS({
  "node_modules/asynckit/lib/iterate.js"(exports2, module2) {
    var async = require_async();
    var abort = require_abort();
    module2.exports = iterate;
    function iterate(list, iterator, state, callback) {
      var key = state["keyedList"] ? state["keyedList"][state.index] : state.index;
      state.jobs[key] = runJob(iterator, key, list[key], function(error, output) {
        if (!(key in state.jobs)) {
          return;
        }
        delete state.jobs[key];
        if (error) {
          abort(state);
        } else {
          state.results[key] = output;
        }
        callback(error, state.results);
      });
    }
    function runJob(iterator, key, item, callback) {
      var aborter;
      if (iterator.length == 2) {
        aborter = iterator(item, async(callback));
      } else {
        aborter = iterator(item, key, async(callback));
      }
      return aborter;
    }
  }
});

// node_modules/asynckit/lib/state.js
var require_state = __commonJS({
  "node_modules/asynckit/lib/state.js"(exports2, module2) {
    module2.exports = state;
    function state(list, sortMethod) {
      var isNamedList = !Array.isArray(list), initState = {
        index: 0,
        keyedList: isNamedList || sortMethod ? Object.keys(list) : null,
        jobs: {},
        results: isNamedList ? {} : [],
        size: isNamedList ? Object.keys(list).length : list.length
      };
      if (sortMethod) {
        initState.keyedList.sort(isNamedList ? sortMethod : function(a, b) {
          return sortMethod(list[a], list[b]);
        });
      }
      return initState;
    }
  }
});

// node_modules/asynckit/lib/terminator.js
var require_terminator = __commonJS({
  "node_modules/asynckit/lib/terminator.js"(exports2, module2) {
    var abort = require_abort();
    var async = require_async();
    module2.exports = terminator;
    function terminator(callback) {
      if (!Object.keys(this.jobs).length) {
        return;
      }
      this.index = this.size;
      abort(this);
      async(callback)(null, this.results);
    }
  }
});

// node_modules/asynckit/parallel.js
var require_parallel = __commonJS({
  "node_modules/asynckit/parallel.js"(exports2, module2) {
    var iterate = require_iterate();
    var initState = require_state();
    var terminator = require_terminator();
    module2.exports = parallel;
    function parallel(list, iterator, callback) {
      var state = initState(list);
      while (state.index < (state["keyedList"] || list).length) {
        iterate(list, iterator, state, function(error, result) {
          if (error) {
            callback(error, result);
            return;
          }
          if (Object.keys(state.jobs).length === 0) {
            callback(null, state.results);
            return;
          }
        });
        state.index++;
      }
      return terminator.bind(state, callback);
    }
  }
});

// node_modules/asynckit/serialOrdered.js
var require_serialOrdered = __commonJS({
  "node_modules/asynckit/serialOrdered.js"(exports2, module2) {
    var iterate = require_iterate();
    var initState = require_state();
    var terminator = require_terminator();
    module2.exports = serialOrdered;
    module2.exports.ascending = ascending;
    module2.exports.descending = descending;
    function serialOrdered(list, iterator, sortMethod, callback) {
      var state = initState(list, sortMethod);
      iterate(list, iterator, state, function iteratorHandler(error, result) {
        if (error) {
          callback(error, result);
          return;
        }
        state.index++;
        if (state.index < (state["keyedList"] || list).length) {
          iterate(list, iterator, state, iteratorHandler);
          return;
        }
        callback(null, state.results);
      });
      return terminator.bind(state, callback);
    }
    function ascending(a, b) {
      return a < b ? -1 : a > b ? 1 : 0;
    }
    function descending(a, b) {
      return -1 * ascending(a, b);
    }
  }
});

// node_modules/asynckit/serial.js
var require_serial = __commonJS({
  "node_modules/asynckit/serial.js"(exports2, module2) {
    var serialOrdered = require_serialOrdered();
    module2.exports = serial;
    function serial(list, iterator, callback) {
      return serialOrdered(list, iterator, null, callback);
    }
  }
});

// node_modules/asynckit/index.js
var require_asynckit = __commonJS({
  "node_modules/asynckit/index.js"(exports2, module2) {
    module2.exports = {
      parallel: require_parallel(),
      serial: require_serial(),
      serialOrdered: require_serialOrdered()
    };
  }
});

// node_modules/es-object-atoms/index.js
var require_es_object_atoms = __commonJS({
  "node_modules/es-object-atoms/index.js"(exports2, module2) {
    "use strict";
    module2.exports = Object;
  }
});

// node_modules/es-errors/index.js
var require_es_errors = __commonJS({
  "node_modules/es-errors/index.js"(exports2, module2) {
    "use strict";
    module2.exports = Error;
  }
});

// node_modules/es-errors/eval.js
var require_eval = __commonJS({
  "node_modules/es-errors/eval.js"(exports2, module2) {
    "use strict";
    module2.exports = EvalError;
  }
});

// node_modules/es-errors/range.js
var require_range = __commonJS({
  "node_modules/es-errors/range.js"(exports2, module2) {
    "use strict";
    module2.exports = RangeError;
  }
});

// node_modules/es-errors/ref.js
var require_ref = __commonJS({
  "node_modules/es-errors/ref.js"(exports2, module2) {
    "use strict";
    module2.exports = ReferenceError;
  }
});

// node_modules/es-errors/syntax.js
var require_syntax = __commonJS({
  "node_modules/es-errors/syntax.js"(exports2, module2) {
    "use strict";
    module2.exports = SyntaxError;
  }
});

// node_modules/es-errors/type.js
var require_type = __commonJS({
  "node_modules/es-errors/type.js"(exports2, module2) {
    "use strict";
    module2.exports = TypeError;
  }
});

// node_modules/es-errors/uri.js
var require_uri = __commonJS({
  "node_modules/es-errors/uri.js"(exports2, module2) {
    "use strict";
    module2.exports = URIError;
  }
});

// node_modules/math-intrinsics/abs.js
var require_abs = __commonJS({
  "node_modules/math-intrinsics/abs.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.abs;
  }
});

// node_modules/math-intrinsics/floor.js
var require_floor = __commonJS({
  "node_modules/math-intrinsics/floor.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.floor;
  }
});

// node_modules/math-intrinsics/max.js
var require_max = __commonJS({
  "node_modules/math-intrinsics/max.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.max;
  }
});

// node_modules/math-intrinsics/min.js
var require_min = __commonJS({
  "node_modules/math-intrinsics/min.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.min;
  }
});

// node_modules/math-intrinsics/pow.js
var require_pow = __commonJS({
  "node_modules/math-intrinsics/pow.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.pow;
  }
});

// node_modules/math-intrinsics/round.js
var require_round = __commonJS({
  "node_modules/math-intrinsics/round.js"(exports2, module2) {
    "use strict";
    module2.exports = Math.round;
  }
});

// node_modules/math-intrinsics/isNaN.js
var require_isNaN = __commonJS({
  "node_modules/math-intrinsics/isNaN.js"(exports2, module2) {
    "use strict";
    module2.exports = Number.isNaN || function isNaN2(a) {
      return a !== a;
    };
  }
});

// node_modules/math-intrinsics/sign.js
var require_sign = __commonJS({
  "node_modules/math-intrinsics/sign.js"(exports2, module2) {
    "use strict";
    var $isNaN = require_isNaN();
    module2.exports = function sign(number) {
      if ($isNaN(number) || number === 0) {
        return number;
      }
      return number < 0 ? -1 : 1;
    };
  }
});

// node_modules/gopd/gOPD.js
var require_gOPD = __commonJS({
  "node_modules/gopd/gOPD.js"(exports2, module2) {
    "use strict";
    module2.exports = Object.getOwnPropertyDescriptor;
  }
});

// node_modules/gopd/index.js
var require_gopd = __commonJS({
  "node_modules/gopd/index.js"(exports2, module2) {
    "use strict";
    var $gOPD = require_gOPD();
    if ($gOPD) {
      try {
        $gOPD([], "length");
      } catch (e) {
        $gOPD = null;
      }
    }
    module2.exports = $gOPD;
  }
});

// node_modules/es-define-property/index.js
var require_es_define_property = __commonJS({
  "node_modules/es-define-property/index.js"(exports2, module2) {
    "use strict";
    var $defineProperty = Object.defineProperty || false;
    if ($defineProperty) {
      try {
        $defineProperty({}, "a", { value: 1 });
      } catch (e) {
        $defineProperty = false;
      }
    }
    module2.exports = $defineProperty;
  }
});

// node_modules/has-symbols/shams.js
var require_shams = __commonJS({
  "node_modules/has-symbols/shams.js"(exports2, module2) {
    "use strict";
    module2.exports = function hasSymbols() {
      if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") {
        return false;
      }
      if (typeof Symbol.iterator === "symbol") {
        return true;
      }
      var obj = {};
      var sym = Symbol("test");
      var symObj = Object(sym);
      if (typeof sym === "string") {
        return false;
      }
      if (Object.prototype.toString.call(sym) !== "[object Symbol]") {
        return false;
      }
      if (Object.prototype.toString.call(symObj) !== "[object Symbol]") {
        return false;
      }
      var symVal = 42;
      obj[sym] = symVal;
      for (var _ in obj) {
        return false;
      }
      if (typeof Object.keys === "function" && Object.keys(obj).length !== 0) {
        return false;
      }
      if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(obj).length !== 0) {
        return false;
      }
      var syms = Object.getOwnPropertySymbols(obj);
      if (syms.length !== 1 || syms[0] !== sym) {
        return false;
      }
      if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
        return false;
      }
      if (typeof Object.getOwnPropertyDescriptor === "function") {
        var descriptor = (
          /** @type {PropertyDescriptor} */
          Object.getOwnPropertyDescriptor(obj, sym)
        );
        if (descriptor.value !== symVal || descriptor.enumerable !== true) {
          return false;
        }
      }
      return true;
    };
  }
});

// node_modules/has-symbols/index.js
var require_has_symbols = __commonJS({
  "node_modules/has-symbols/index.js"(exports2, module2) {
    "use strict";
    var origSymbol = typeof Symbol !== "undefined" && Symbol;
    var hasSymbolSham = require_shams();
    module2.exports = function hasNativeSymbols() {
      if (typeof origSymbol !== "function") {
        return false;
      }
      if (typeof Symbol !== "function") {
        return false;
      }
      if (typeof origSymbol("foo") !== "symbol") {
        return false;
      }
      if (typeof Symbol("bar") !== "symbol") {
        return false;
      }
      return hasSymbolSham();
    };
  }
});

// node_modules/get-proto/Reflect.getPrototypeOf.js
var require_Reflect_getPrototypeOf = __commonJS({
  "node_modules/get-proto/Reflect.getPrototypeOf.js"(exports2, module2) {
    "use strict";
    module2.exports = typeof Reflect !== "undefined" && Reflect.getPrototypeOf || null;
  }
});

// node_modules/get-proto/Object.getPrototypeOf.js
var require_Object_getPrototypeOf = __commonJS({
  "node_modules/get-proto/Object.getPrototypeOf.js"(exports2, module2) {
    "use strict";
    var $Object = require_es_object_atoms();
    module2.exports = $Object.getPrototypeOf || null;
  }
});

// node_modules/function-bind/implementation.js
var require_implementation = __commonJS({
  "node_modules/function-bind/implementation.js"(exports2, module2) {
    "use strict";
    var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
    var toStr = Object.prototype.toString;
    var max = Math.max;
    var funcType = "[object Function]";
    var concatty = function concatty2(a, b) {
      var arr = [];
      for (var i = 0; i < a.length; i += 1) {
        arr[i] = a[i];
      }
      for (var j = 0; j < b.length; j += 1) {
        arr[j + a.length] = b[j];
      }
      return arr;
    };
    var slicy = function slicy2(arrLike, offset) {
      var arr = [];
      for (var i = offset || 0, j = 0; i < arrLike.length; i += 1, j += 1) {
        arr[j] = arrLike[i];
      }
      return arr;
    };
    var joiny = function(arr, joiner) {
      var str = "";
      for (var i = 0; i < arr.length; i += 1) {
        str += arr[i];
        if (i + 1 < arr.length) {
          str += joiner;
        }
      }
      return str;
    };
    module2.exports = function bind(that) {
      var target = this;
      if (typeof target !== "function" || toStr.apply(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
      }
      var args = slicy(arguments, 1);
      var bound;
      var binder = function() {
        if (this instanceof bound) {
          var result = target.apply(
            this,
            concatty(args, arguments)
          );
          if (Object(result) === result) {
            return result;
          }
          return this;
        }
        return target.apply(
          that,
          concatty(args, arguments)
        );
      };
      var boundLength = max(0, target.length - args.length);
      var boundArgs = [];
      for (var i = 0; i < boundLength; i++) {
        boundArgs[i] = "$" + i;
      }
      bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder);
      if (target.prototype) {
        var Empty = function Empty2() {
        };
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
      }
      return bound;
    };
  }
});

// node_modules/function-bind/index.js
var require_function_bind = __commonJS({
  "node_modules/function-bind/index.js"(exports2, module2) {
    "use strict";
    var implementation = require_implementation();
    module2.exports = Function.prototype.bind || implementation;
  }
});

// node_modules/call-bind-apply-helpers/functionCall.js
var require_functionCall = __commonJS({
  "node_modules/call-bind-apply-helpers/functionCall.js"(exports2, module2) {
    "use strict";
    module2.exports = Function.prototype.call;
  }
});

// node_modules/call-bind-apply-helpers/functionApply.js
var require_functionApply = __commonJS({
  "node_modules/call-bind-apply-helpers/functionApply.js"(exports2, module2) {
    "use strict";
    module2.exports = Function.prototype.apply;
  }
});

// node_modules/call-bind-apply-helpers/reflectApply.js
var require_reflectApply = __commonJS({
  "node_modules/call-bind-apply-helpers/reflectApply.js"(exports2, module2) {
    "use strict";
    module2.exports = typeof Reflect !== "undefined" && Reflect && Reflect.apply;
  }
});

// node_modules/call-bind-apply-helpers/actualApply.js
var require_actualApply = __commonJS({
  "node_modules/call-bind-apply-helpers/actualApply.js"(exports2, module2) {
    "use strict";
    var bind = require_function_bind();
    var $apply = require_functionApply();
    var $call = require_functionCall();
    var $reflectApply = require_reflectApply();
    module2.exports = $reflectApply || bind.call($call, $apply);
  }
});

// node_modules/call-bind-apply-helpers/index.js
var require_call_bind_apply_helpers = __commonJS({
  "node_modules/call-bind-apply-helpers/index.js"(exports2, module2) {
    "use strict";
    var bind = require_function_bind();
    var $TypeError = require_type();
    var $call = require_functionCall();
    var $actualApply = require_actualApply();
    module2.exports = function callBindBasic(args) {
      if (args.length < 1 || typeof args[0] !== "function") {
        throw new $TypeError("a function is required");
      }
      return $actualApply(bind, $call, args);
    };
  }
});

// node_modules/dunder-proto/get.js
var require_get = __commonJS({
  "node_modules/dunder-proto/get.js"(exports2, module2) {
    "use strict";
    var callBind = require_call_bind_apply_helpers();
    var gOPD = require_gopd();
    var hasProtoAccessor;
    try {
      hasProtoAccessor = /** @type {{ __proto__?: typeof Array.prototype }} */
      [].__proto__ === Array.prototype;
    } catch (e) {
      if (!e || typeof e !== "object" || !("code" in e) || e.code !== "ERR_PROTO_ACCESS") {
        throw e;
      }
    }
    var desc = !!hasProtoAccessor && gOPD && gOPD(
      Object.prototype,
      /** @type {keyof typeof Object.prototype} */
      "__proto__"
    );
    var $Object = Object;
    var $getPrototypeOf = $Object.getPrototypeOf;
    module2.exports = desc && typeof desc.get === "function" ? callBind([desc.get]) : typeof $getPrototypeOf === "function" ? (
      /** @type {import('./get')} */
      function getDunder(value) {
        return $getPrototypeOf(value == null ? value : $Object(value));
      }
    ) : false;
  }
});

// node_modules/get-proto/index.js
var require_get_proto = __commonJS({
  "node_modules/get-proto/index.js"(exports2, module2) {
    "use strict";
    var reflectGetProto = require_Reflect_getPrototypeOf();
    var originalGetProto = require_Object_getPrototypeOf();
    var getDunderProto = require_get();
    module2.exports = reflectGetProto ? function getProto(O) {
      return reflectGetProto(O);
    } : originalGetProto ? function getProto(O) {
      if (!O || typeof O !== "object" && typeof O !== "function") {
        throw new TypeError("getProto: not an object");
      }
      return originalGetProto(O);
    } : getDunderProto ? function getProto(O) {
      return getDunderProto(O);
    } : null;
  }
});

// node_modules/hasown/index.js
var require_hasown = __commonJS({
  "node_modules/hasown/index.js"(exports2, module2) {
    "use strict";
    var call = Function.prototype.call;
    var $hasOwn = Object.prototype.hasOwnProperty;
    var bind = require_function_bind();
    module2.exports = bind.call(call, $hasOwn);
  }
});

// node_modules/get-intrinsic/index.js
var require_get_intrinsic = __commonJS({
  "node_modules/get-intrinsic/index.js"(exports2, module2) {
    "use strict";
    var undefined2;
    var $Object = require_es_object_atoms();
    var $Error = require_es_errors();
    var $EvalError = require_eval();
    var $RangeError = require_range();
    var $ReferenceError = require_ref();
    var $SyntaxError = require_syntax();
    var $TypeError = require_type();
    var $URIError = require_uri();
    var abs = require_abs();
    var floor = require_floor();
    var max = require_max();
    var min = require_min();
    var pow = require_pow();
    var round = require_round();
    var sign = require_sign();
    var $Function = Function;
    var getEvalledConstructor = function(expressionSyntax) {
      try {
        return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
      } catch (e) {
      }
    };
    var $gOPD = require_gopd();
    var $defineProperty = require_es_define_property();
    var throwTypeError = function() {
      throw new $TypeError();
    };
    var ThrowTypeError = $gOPD ? (function() {
      try {
        arguments.callee;
        return throwTypeError;
      } catch (calleeThrows) {
        try {
          return $gOPD(arguments, "callee").get;
        } catch (gOPDthrows) {
          return throwTypeError;
        }
      }
    })() : throwTypeError;
    var hasSymbols = require_has_symbols()();
    var getProto = require_get_proto();
    var $ObjectGPO = require_Object_getPrototypeOf();
    var $ReflectGPO = require_Reflect_getPrototypeOf();
    var $apply = require_functionApply();
    var $call = require_functionCall();
    var needsEval = {};
    var TypedArray = typeof Uint8Array === "undefined" || !getProto ? undefined2 : getProto(Uint8Array);
    var INTRINSICS = {
      __proto__: null,
      "%AggregateError%": typeof AggregateError === "undefined" ? undefined2 : AggregateError,
      "%Array%": Array,
      "%ArrayBuffer%": typeof ArrayBuffer === "undefined" ? undefined2 : ArrayBuffer,
      "%ArrayIteratorPrototype%": hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined2,
      "%AsyncFromSyncIteratorPrototype%": undefined2,
      "%AsyncFunction%": needsEval,
      "%AsyncGenerator%": needsEval,
      "%AsyncGeneratorFunction%": needsEval,
      "%AsyncIteratorPrototype%": needsEval,
      "%Atomics%": typeof Atomics === "undefined" ? undefined2 : Atomics,
      "%BigInt%": typeof BigInt === "undefined" ? undefined2 : BigInt,
      "%BigInt64Array%": typeof BigInt64Array === "undefined" ? undefined2 : BigInt64Array,
      "%BigUint64Array%": typeof BigUint64Array === "undefined" ? undefined2 : BigUint64Array,
      "%Boolean%": Boolean,
      "%DataView%": typeof DataView === "undefined" ? undefined2 : DataView,
      "%Date%": Date,
      "%decodeURI%": decodeURI,
      "%decodeURIComponent%": decodeURIComponent,
      "%encodeURI%": encodeURI,
      "%encodeURIComponent%": encodeURIComponent,
      "%Error%": $Error,
      "%eval%": eval,
      // eslint-disable-line no-eval
      "%EvalError%": $EvalError,
      "%Float16Array%": typeof Float16Array === "undefined" ? undefined2 : Float16Array,
      "%Float32Array%": typeof Float32Array === "undefined" ? undefined2 : Float32Array,
      "%Float64Array%": typeof Float64Array === "undefined" ? undefined2 : Float64Array,
      "%FinalizationRegistry%": typeof FinalizationRegistry === "undefined" ? undefined2 : FinalizationRegistry,
      "%Function%": $Function,
      "%GeneratorFunction%": needsEval,
      "%Int8Array%": typeof Int8Array === "undefined" ? undefined2 : Int8Array,
      "%Int16Array%": typeof Int16Array === "undefined" ? undefined2 : Int16Array,
      "%Int32Array%": typeof Int32Array === "undefined" ? undefined2 : Int32Array,
      "%isFinite%": isFinite,
      "%isNaN%": isNaN,
      "%IteratorPrototype%": hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined2,
      "%JSON%": typeof JSON === "object" ? JSON : undefined2,
      "%Map%": typeof Map === "undefined" ? undefined2 : Map,
      "%MapIteratorPrototype%": typeof Map === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Map())[Symbol.iterator]()),
      "%Math%": Math,
      "%Number%": Number,
      "%Object%": $Object,
      "%Object.getOwnPropertyDescriptor%": $gOPD,
      "%parseFloat%": parseFloat,
      "%parseInt%": parseInt,
      "%Promise%": typeof Promise === "undefined" ? undefined2 : Promise,
      "%Proxy%": typeof Proxy === "undefined" ? undefined2 : Proxy,
      "%RangeError%": $RangeError,
      "%ReferenceError%": $ReferenceError,
      "%Reflect%": typeof Reflect === "undefined" ? undefined2 : Reflect,
      "%RegExp%": RegExp,
      "%Set%": typeof Set === "undefined" ? undefined2 : Set,
      "%SetIteratorPrototype%": typeof Set === "undefined" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Set())[Symbol.iterator]()),
      "%SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? undefined2 : SharedArrayBuffer,
      "%String%": String,
      "%StringIteratorPrototype%": hasSymbols && getProto ? getProto(""[Symbol.iterator]()) : undefined2,
      "%Symbol%": hasSymbols ? Symbol : undefined2,
      "%SyntaxError%": $SyntaxError,
      "%ThrowTypeError%": ThrowTypeError,
      "%TypedArray%": TypedArray,
      "%TypeError%": $TypeError,
      "%Uint8Array%": typeof Uint8Array === "undefined" ? undefined2 : Uint8Array,
      "%Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? undefined2 : Uint8ClampedArray,
      "%Uint16Array%": typeof Uint16Array === "undefined" ? undefined2 : Uint16Array,
      "%Uint32Array%": typeof Uint32Array === "undefined" ? undefined2 : Uint32Array,
      "%URIError%": $URIError,
      "%WeakMap%": typeof WeakMap === "undefined" ? undefined2 : WeakMap,
      "%WeakRef%": typeof WeakRef === "undefined" ? undefined2 : WeakRef,
      "%WeakSet%": typeof WeakSet === "undefined" ? undefined2 : WeakSet,
      "%Function.prototype.call%": $call,
      "%Function.prototype.apply%": $apply,
      "%Object.defineProperty%": $defineProperty,
      "%Object.getPrototypeOf%": $ObjectGPO,
      "%Math.abs%": abs,
      "%Math.floor%": floor,
      "%Math.max%": max,
      "%Math.min%": min,
      "%Math.pow%": pow,
      "%Math.round%": round,
      "%Math.sign%": sign,
      "%Reflect.getPrototypeOf%": $ReflectGPO
    };
    if (getProto) {
      try {
        null.error;
      } catch (e) {
        errorProto = getProto(getProto(e));
        INTRINSICS["%Error.prototype%"] = errorProto;
      }
    }
    var errorProto;
    var doEval = function doEval2(name) {
      var value;
      if (name === "%AsyncFunction%") {
        value = getEvalledConstructor("async function () {}");
      } else if (name === "%GeneratorFunction%") {
        value = getEvalledConstructor("function* () {}");
      } else if (name === "%AsyncGeneratorFunction%") {
        value = getEvalledConstructor("async function* () {}");
      } else if (name === "%AsyncGenerator%") {
        var fn = doEval2("%AsyncGeneratorFunction%");
        if (fn) {
          value = fn.prototype;
        }
      } else if (name === "%AsyncIteratorPrototype%") {
        var gen = doEval2("%AsyncGenerator%");
        if (gen && getProto) {
          value = getProto(gen.prototype);
        }
      }
      INTRINSICS[name] = value;
      return value;
    };
    var LEGACY_ALIASES = {
      __proto__: null,
      "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
      "%ArrayPrototype%": ["Array", "prototype"],
      "%ArrayProto_entries%": ["Array", "prototype", "entries"],
      "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
      "%ArrayProto_keys%": ["Array", "prototype", "keys"],
      "%ArrayProto_values%": ["Array", "prototype", "values"],
      "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
      "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
      "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
      "%BooleanPrototype%": ["Boolean", "prototype"],
      "%DataViewPrototype%": ["DataView", "prototype"],
      "%DatePrototype%": ["Date", "prototype"],
      "%ErrorPrototype%": ["Error", "prototype"],
      "%EvalErrorPrototype%": ["EvalError", "prototype"],
      "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
      "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
      "%FunctionPrototype%": ["Function", "prototype"],
      "%Generator%": ["GeneratorFunction", "prototype"],
      "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
      "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
      "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
      "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
      "%JSONParse%": ["JSON", "parse"],
      "%JSONStringify%": ["JSON", "stringify"],
      "%MapPrototype%": ["Map", "prototype"],
      "%NumberPrototype%": ["Number", "prototype"],
      "%ObjectPrototype%": ["Object", "prototype"],
      "%ObjProto_toString%": ["Object", "prototype", "toString"],
      "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
      "%PromisePrototype%": ["Promise", "prototype"],
      "%PromiseProto_then%": ["Promise", "prototype", "then"],
      "%Promise_all%": ["Promise", "all"],
      "%Promise_reject%": ["Promise", "reject"],
      "%Promise_resolve%": ["Promise", "resolve"],
      "%RangeErrorPrototype%": ["RangeError", "prototype"],
      "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
      "%RegExpPrototype%": ["RegExp", "prototype"],
      "%SetPrototype%": ["Set", "prototype"],
      "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
      "%StringPrototype%": ["String", "prototype"],
      "%SymbolPrototype%": ["Symbol", "prototype"],
      "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
      "%TypedArrayPrototype%": ["TypedArray", "prototype"],
      "%TypeErrorPrototype%": ["TypeError", "prototype"],
      "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
      "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
      "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
      "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
      "%URIErrorPrototype%": ["URIError", "prototype"],
      "%WeakMapPrototype%": ["WeakMap", "prototype"],
      "%WeakSetPrototype%": ["WeakSet", "prototype"]
    };
    var bind = require_function_bind();
    var hasOwn = require_hasown();
    var $concat = bind.call($call, Array.prototype.concat);
    var $spliceApply = bind.call($apply, Array.prototype.splice);
    var $replace = bind.call($call, String.prototype.replace);
    var $strSlice = bind.call($call, String.prototype.slice);
    var $exec = bind.call($call, RegExp.prototype.exec);
    var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
    var reEscapeChar = /\\(\\)?/g;
    var stringToPath = function stringToPath2(string) {
      var first = $strSlice(string, 0, 1);
      var last = $strSlice(string, -1);
      if (first === "%" && last !== "%") {
        throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
      } else if (last === "%" && first !== "%") {
        throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
      }
      var result = [];
      $replace(string, rePropName, function(match, number, quote, subString) {
        result[result.length] = quote ? $replace(subString, reEscapeChar, "$1") : number || match;
      });
      return result;
    };
    var getBaseIntrinsic = function getBaseIntrinsic2(name, allowMissing) {
      var intrinsicName = name;
      var alias;
      if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
        alias = LEGACY_ALIASES[intrinsicName];
        intrinsicName = "%" + alias[0] + "%";
      }
      if (hasOwn(INTRINSICS, intrinsicName)) {
        var value = INTRINSICS[intrinsicName];
        if (value === needsEval) {
          value = doEval(intrinsicName);
        }
        if (typeof value === "undefined" && !allowMissing) {
          throw new $TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
        }
        return {
          alias,
          name: intrinsicName,
          value
        };
      }
      throw new $SyntaxError("intrinsic " + name + " does not exist!");
    };
    module2.exports = function GetIntrinsic(name, allowMissing) {
      if (typeof name !== "string" || name.length === 0) {
        throw new $TypeError("intrinsic name must be a non-empty string");
      }
      if (arguments.length > 1 && typeof allowMissing !== "boolean") {
        throw new $TypeError('"allowMissing" argument must be a boolean');
      }
      if ($exec(/^%?[^%]*%?$/, name) === null) {
        throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
      }
      var parts = stringToPath(name);
      var intrinsicBaseName = parts.length > 0 ? parts[0] : "";
      var intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing);
      var intrinsicRealName = intrinsic.name;
      var value = intrinsic.value;
      var skipFurtherCaching = false;
      var alias = intrinsic.alias;
      if (alias) {
        intrinsicBaseName = alias[0];
        $spliceApply(parts, $concat([0, 1], alias));
      }
      for (var i = 1, isOwn = true; i < parts.length; i += 1) {
        var part = parts[i];
        var first = $strSlice(part, 0, 1);
        var last = $strSlice(part, -1);
        if ((first === '"' || first === "'" || first === "`" || (last === '"' || last === "'" || last === "`")) && first !== last) {
          throw new $SyntaxError("property names with quotes must have matching quotes");
        }
        if (part === "constructor" || !isOwn) {
          skipFurtherCaching = true;
        }
        intrinsicBaseName += "." + part;
        intrinsicRealName = "%" + intrinsicBaseName + "%";
        if (hasOwn(INTRINSICS, intrinsicRealName)) {
          value = INTRINSICS[intrinsicRealName];
        } else if (value != null) {
          if (!(part in value)) {
            if (!allowMissing) {
              throw new $TypeError("base intrinsic for " + name + " exists, but the property is not available.");
            }
            return void undefined2;
          }
          if ($gOPD && i + 1 >= parts.length) {
            var desc = $gOPD(value, part);
            isOwn = !!desc;
            if (isOwn && "get" in desc && !("originalValue" in desc.get)) {
              value = desc.get;
            } else {
              value = value[part];
            }
          } else {
            isOwn = hasOwn(value, part);
            value = value[part];
          }
          if (isOwn && !skipFurtherCaching) {
            INTRINSICS[intrinsicRealName] = value;
          }
        }
      }
      return value;
    };
  }
});

// node_modules/has-tostringtag/shams.js
var require_shams2 = __commonJS({
  "node_modules/has-tostringtag/shams.js"(exports2, module2) {
    "use strict";
    var hasSymbols = require_shams();
    module2.exports = function hasToStringTagShams() {
      return hasSymbols() && !!Symbol.toStringTag;
    };
  }
});

// node_modules/es-set-tostringtag/index.js
var require_es_set_tostringtag = __commonJS({
  "node_modules/es-set-tostringtag/index.js"(exports2, module2) {
    "use strict";
    var GetIntrinsic = require_get_intrinsic();
    var $defineProperty = GetIntrinsic("%Object.defineProperty%", true);
    var hasToStringTag = require_shams2()();
    var hasOwn = require_hasown();
    var $TypeError = require_type();
    var toStringTag = hasToStringTag ? Symbol.toStringTag : null;
    module2.exports = function setToStringTag(object, value) {
      var overrideIfSet = arguments.length > 2 && !!arguments[2] && arguments[2].force;
      var nonConfigurable = arguments.length > 2 && !!arguments[2] && arguments[2].nonConfigurable;
      if (typeof overrideIfSet !== "undefined" && typeof overrideIfSet !== "boolean" || typeof nonConfigurable !== "undefined" && typeof nonConfigurable !== "boolean") {
        throw new $TypeError("if provided, the `overrideIfSet` and `nonConfigurable` options must be booleans");
      }
      if (toStringTag && (overrideIfSet || !hasOwn(object, toStringTag))) {
        if ($defineProperty) {
          $defineProperty(object, toStringTag, {
            configurable: !nonConfigurable,
            enumerable: false,
            value,
            writable: false
          });
        } else {
          object[toStringTag] = value;
        }
      }
    };
  }
});

// node_modules/axios/node_modules/form-data/lib/populate.js
var require_populate = __commonJS({
  "node_modules/axios/node_modules/form-data/lib/populate.js"(exports2, module2) {
    "use strict";
    module2.exports = function(dst, src) {
      Object.keys(src).forEach(function(prop) {
        dst[prop] = dst[prop] || src[prop];
      });
      return dst;
    };
  }
});

// node_modules/axios/node_modules/form-data/lib/form_data.js
var require_form_data = __commonJS({
  "node_modules/axios/node_modules/form-data/lib/form_data.js"(exports2, module2) {
    "use strict";
    var CombinedStream = require_combined_stream();
    var util = require("util");
    var path = require("path");
    var http = require("http");
    var https = require("https");
    var parseUrl = require("url").parse;
    var fs = require("fs");
    var Stream = require("stream").Stream;
    var crypto4 = require("crypto");
    var mime = require_mime_types();
    var asynckit = require_asynckit();
    var setToStringTag = require_es_set_tostringtag();
    var hasOwn = require_hasown();
    var populate = require_populate();
    function FormData2(options) {
      if (!(this instanceof FormData2)) {
        return new FormData2(options);
      }
      this._overheadLength = 0;
      this._valueLength = 0;
      this._valuesToMeasure = [];
      CombinedStream.call(this);
      options = options || {};
      for (var option in options) {
        this[option] = options[option];
      }
    }
    util.inherits(FormData2, CombinedStream);
    FormData2.LINE_BREAK = "\r\n";
    FormData2.DEFAULT_CONTENT_TYPE = "application/octet-stream";
    FormData2.prototype.append = function(field, value, options) {
      options = options || {};
      if (typeof options === "string") {
        options = { filename: options };
      }
      var append = CombinedStream.prototype.append.bind(this);
      if (typeof value === "number" || value == null) {
        value = String(value);
      }
      if (Array.isArray(value)) {
        this._error(new Error("Arrays are not supported."));
        return;
      }
      var header = this._multiPartHeader(field, value, options);
      var footer = this._multiPartFooter();
      append(header);
      append(value);
      append(footer);
      this._trackLength(header, value, options);
    };
    FormData2.prototype._trackLength = function(header, value, options) {
      var valueLength = 0;
      if (options.knownLength != null) {
        valueLength += Number(options.knownLength);
      } else if (Buffer.isBuffer(value)) {
        valueLength = value.length;
      } else if (typeof value === "string") {
        valueLength = Buffer.byteLength(value);
      }
      this._valueLength += valueLength;
      this._overheadLength += Buffer.byteLength(header) + FormData2.LINE_BREAK.length;
      if (!value || !value.path && !(value.readable && hasOwn(value, "httpVersion")) && !(value instanceof Stream)) {
        return;
      }
      if (!options.knownLength) {
        this._valuesToMeasure.push(value);
      }
    };
    FormData2.prototype._lengthRetriever = function(value, callback) {
      if (hasOwn(value, "fd")) {
        if (value.end != void 0 && value.end != Infinity && value.start != void 0) {
          callback(null, value.end + 1 - (value.start ? value.start : 0));
        } else {
          fs.stat(value.path, function(err, stat) {
            if (err) {
              callback(err);
              return;
            }
            var fileSize = stat.size - (value.start ? value.start : 0);
            callback(null, fileSize);
          });
        }
      } else if (hasOwn(value, "httpVersion")) {
        callback(null, Number(value.headers["content-length"]));
      } else if (hasOwn(value, "httpModule")) {
        value.on("response", function(response) {
          value.pause();
          callback(null, Number(response.headers["content-length"]));
        });
        value.resume();
      } else {
        callback("Unknown stream");
      }
    };
    FormData2.prototype._multiPartHeader = function(field, value, options) {
      if (typeof options.header === "string") {
        return options.header;
      }
      var contentDisposition = this._getContentDisposition(value, options);
      var contentType = this._getContentType(value, options);
      var contents = "";
      var headers = {
        // add custom disposition as third element or keep it two elements if not
        "Content-Disposition": ["form-data", 'name="' + field + '"'].concat(contentDisposition || []),
        // if no content type. allow it to be empty array
        "Content-Type": [].concat(contentType || [])
      };
      if (typeof options.header === "object") {
        populate(headers, options.header);
      }
      var header;
      for (var prop in headers) {
        if (hasOwn(headers, prop)) {
          header = headers[prop];
          if (header == null) {
            continue;
          }
          if (!Array.isArray(header)) {
            header = [header];
          }
          if (header.length) {
            contents += prop + ": " + header.join("; ") + FormData2.LINE_BREAK;
          }
        }
      }
      return "--" + this.getBoundary() + FormData2.LINE_BREAK + contents + FormData2.LINE_BREAK;
    };
    FormData2.prototype._getContentDisposition = function(value, options) {
      var filename;
      if (typeof options.filepath === "string") {
        filename = path.normalize(options.filepath).replace(/\\/g, "/");
      } else if (options.filename || value && (value.name || value.path)) {
        filename = path.basename(options.filename || value && (value.name || value.path));
      } else if (value && value.readable && hasOwn(value, "httpVersion")) {
        filename = path.basename(value.client._httpMessage.path || "");
      }
      if (filename) {
        return 'filename="' + filename + '"';
      }
    };
    FormData2.prototype._getContentType = function(value, options) {
      var contentType = options.contentType;
      if (!contentType && value && value.name) {
        contentType = mime.lookup(value.name);
      }
      if (!contentType && value && value.path) {
        contentType = mime.lookup(value.path);
      }
      if (!contentType && value && value.readable && hasOwn(value, "httpVersion")) {
        contentType = value.headers["content-type"];
      }
      if (!contentType && (options.filepath || options.filename)) {
        contentType = mime.lookup(options.filepath || options.filename);
      }
      if (!contentType && value && typeof value === "object") {
        contentType = FormData2.DEFAULT_CONTENT_TYPE;
      }
      return contentType;
    };
    FormData2.prototype._multiPartFooter = function() {
      return function(next) {
        var footer = FormData2.LINE_BREAK;
        var lastPart = this._streams.length === 0;
        if (lastPart) {
          footer += this._lastBoundary();
        }
        next(footer);
      }.bind(this);
    };
    FormData2.prototype._lastBoundary = function() {
      return "--" + this.getBoundary() + "--" + FormData2.LINE_BREAK;
    };
    FormData2.prototype.getHeaders = function(userHeaders) {
      var header;
      var formHeaders = {
        "content-type": "multipart/form-data; boundary=" + this.getBoundary()
      };
      for (header in userHeaders) {
        if (hasOwn(userHeaders, header)) {
          formHeaders[header.toLowerCase()] = userHeaders[header];
        }
      }
      return formHeaders;
    };
    FormData2.prototype.setBoundary = function(boundary) {
      if (typeof boundary !== "string") {
        throw new TypeError("FormData boundary must be a string");
      }
      this._boundary = boundary;
    };
    FormData2.prototype.getBoundary = function() {
      if (!this._boundary) {
        this._generateBoundary();
      }
      return this._boundary;
    };
    FormData2.prototype.getBuffer = function() {
      var dataBuffer = new Buffer.alloc(0);
      var boundary = this.getBoundary();
      for (var i = 0, len = this._streams.length; i < len; i++) {
        if (typeof this._streams[i] !== "function") {
          if (Buffer.isBuffer(this._streams[i])) {
            dataBuffer = Buffer.concat([dataBuffer, this._streams[i]]);
          } else {
            dataBuffer = Buffer.concat([dataBuffer, Buffer.from(this._streams[i])]);
          }
          if (typeof this._streams[i] !== "string" || this._streams[i].substring(2, boundary.length + 2) !== boundary) {
            dataBuffer = Buffer.concat([dataBuffer, Buffer.from(FormData2.LINE_BREAK)]);
          }
        }
      }
      return Buffer.concat([dataBuffer, Buffer.from(this._lastBoundary())]);
    };
    FormData2.prototype._generateBoundary = function() {
      this._boundary = "--------------------------" + crypto4.randomBytes(12).toString("hex");
    };
    FormData2.prototype.getLengthSync = function() {
      var knownLength = this._overheadLength + this._valueLength;
      if (this._streams.length) {
        knownLength += this._lastBoundary().length;
      }
      if (!this.hasKnownLength()) {
        this._error(new Error("Cannot calculate proper length in synchronous way."));
      }
      return knownLength;
    };
    FormData2.prototype.hasKnownLength = function() {
      var hasKnownLength = true;
      if (this._valuesToMeasure.length) {
        hasKnownLength = false;
      }
      return hasKnownLength;
    };
    FormData2.prototype.getLength = function(cb) {
      var knownLength = this._overheadLength + this._valueLength;
      if (this._streams.length) {
        knownLength += this._lastBoundary().length;
      }
      if (!this._valuesToMeasure.length) {
        process.nextTick(cb.bind(this, null, knownLength));
        return;
      }
      asynckit.parallel(this._valuesToMeasure, this._lengthRetriever, function(err, values) {
        if (err) {
          cb(err);
          return;
        }
        values.forEach(function(length) {
          knownLength += length;
        });
        cb(null, knownLength);
      });
    };
    FormData2.prototype.submit = function(params, cb) {
      var request;
      var options;
      var defaults = { method: "post" };
      if (typeof params === "string") {
        params = parseUrl(params);
        options = populate({
          port: params.port,
          path: params.pathname,
          host: params.hostname,
          protocol: params.protocol
        }, defaults);
      } else {
        options = populate(params, defaults);
        if (!options.port) {
          options.port = options.protocol === "https:" ? 443 : 80;
        }
      }
      options.headers = this.getHeaders(params.headers);
      if (options.protocol === "https:") {
        request = https.request(options);
      } else {
        request = http.request(options);
      }
      this.getLength(function(err, length) {
        if (err && err !== "Unknown stream") {
          this._error(err);
          return;
        }
        if (length) {
          request.setHeader("Content-Length", length);
        }
        this.pipe(request);
        if (cb) {
          var onResponse;
          var callback = function(error, responce) {
            request.removeListener("error", callback);
            request.removeListener("response", onResponse);
            return cb.call(this, error, responce);
          };
          onResponse = callback.bind(this, null);
          request.on("error", callback);
          request.on("response", onResponse);
        }
      }.bind(this));
      return request;
    };
    FormData2.prototype._error = function(err) {
      if (!this.error) {
        this.error = err;
        this.pause();
        this.emit("error", err);
      }
    };
    FormData2.prototype.toString = function() {
      return "[object FormData]";
    };
    setToStringTag(FormData2, "FormData");
    module2.exports = FormData2;
  }
});

// node_modules/proxy-from-env/index.js
var require_proxy_from_env = __commonJS({
  "node_modules/proxy-from-env/index.js"(exports2) {
    "use strict";
    var parseUrl = require("url").parse;
    var DEFAULT_PORTS = {
      ftp: 21,
      gopher: 70,
      http: 80,
      https: 443,
      ws: 80,
      wss: 443
    };
    var stringEndsWith = String.prototype.endsWith || function(s) {
      return s.length <= this.length && this.indexOf(s, this.length - s.length) !== -1;
    };
    function getProxyForUrl(url) {
      var parsedUrl = typeof url === "string" ? parseUrl(url) : url || {};
      var proto = parsedUrl.protocol;
      var hostname = parsedUrl.host;
      var port = parsedUrl.port;
      if (typeof hostname !== "string" || !hostname || typeof proto !== "string") {
        return "";
      }
      proto = proto.split(":", 1)[0];
      hostname = hostname.replace(/:\d*$/, "");
      port = parseInt(port) || DEFAULT_PORTS[proto] || 0;
      if (!shouldProxy(hostname, port)) {
        return "";
      }
      var proxy = getEnv("npm_config_" + proto + "_proxy") || getEnv(proto + "_proxy") || getEnv("npm_config_proxy") || getEnv("all_proxy");
      if (proxy && proxy.indexOf("://") === -1) {
        proxy = proto + "://" + proxy;
      }
      return proxy;
    }
    function shouldProxy(hostname, port) {
      var NO_PROXY = (getEnv("npm_config_no_proxy") || getEnv("no_proxy")).toLowerCase();
      if (!NO_PROXY) {
        return true;
      }
      if (NO_PROXY === "*") {
        return false;
      }
      return NO_PROXY.split(/[,\s]/).every(function(proxy) {
        if (!proxy) {
          return true;
        }
        var parsedProxy = proxy.match(/^(.+):(\d+)$/);
        var parsedProxyHostname = parsedProxy ? parsedProxy[1] : proxy;
        var parsedProxyPort = parsedProxy ? parseInt(parsedProxy[2]) : 0;
        if (parsedProxyPort && parsedProxyPort !== port) {
          return true;
        }
        if (!/^[.*]/.test(parsedProxyHostname)) {
          return hostname !== parsedProxyHostname;
        }
        if (parsedProxyHostname.charAt(0) === "*") {
          parsedProxyHostname = parsedProxyHostname.slice(1);
        }
        return !stringEndsWith.call(hostname, parsedProxyHostname);
      });
    }
    function getEnv(key) {
      return process.env[key.toLowerCase()] || process.env[key.toUpperCase()] || "";
    }
    exports2.getProxyForUrl = getProxyForUrl;
  }
});

// node_modules/ms/index.js
var require_ms = __commonJS({
  "node_modules/ms/index.js"(exports2, module2) {
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module2.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse2(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse2(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// node_modules/debug/src/common.js
var require_common = __commonJS({
  "node_modules/debug/src/common.js"(exports2, module2) {
    function setup(env) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env).forEach((key) => {
        createDebug[key] = env[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash = 0;
        for (let i = 0; i < namespace.length; i++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i);
          hash |= 0;
        }
        return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug(...args) {
          if (!debug.enabled) {
            return;
          }
          const self2 = debug;
          const curr = Number(/* @__PURE__ */ new Date());
          const ms = curr - (prevTime || curr);
          self2.diff = ms;
          self2.prev = prevTime;
          self2.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === "%%") {
              return "%";
            }
            index++;
            const formatter = createDebug.formatters[format];
            if (typeof formatter === "function") {
              const val = args[index];
              match = formatter.call(self2, val);
              args.splice(index, 1);
              index--;
            }
            return match;
          });
          createDebug.formatArgs.call(self2, args);
          const logFn = self2.log || createDebug.log;
          logFn.apply(self2, args);
        }
        debug.namespace = namespace;
        debug.useColors = createDebug.useColors();
        debug.color = createDebug.selectColor(namespace);
        debug.extend = extend;
        debug.destroy = createDebug.destroy;
        Object.defineProperty(debug, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v) => {
            enableOverride = v;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug);
        }
        return debug;
      }
      function extend(namespace, delimiter) {
        const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
        for (const ns of split) {
          if (ns[0] === "-") {
            createDebug.skips.push(ns.slice(1));
          } else {
            createDebug.names.push(ns);
          }
        }
      }
      function matchesTemplate(search, template) {
        let searchIndex = 0;
        let templateIndex = 0;
        let starIndex = -1;
        let matchIndex = 0;
        while (searchIndex < search.length) {
          if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
            if (template[templateIndex] === "*") {
              starIndex = templateIndex;
              matchIndex = searchIndex;
              templateIndex++;
            } else {
              searchIndex++;
              templateIndex++;
            }
          } else if (starIndex !== -1) {
            templateIndex = starIndex + 1;
            matchIndex++;
            searchIndex = matchIndex;
          } else {
            return false;
          }
        }
        while (templateIndex < template.length && template[templateIndex] === "*") {
          templateIndex++;
        }
        return templateIndex === template.length;
      }
      function disable() {
        const namespaces = [
          ...createDebug.names,
          ...createDebug.skips.map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        for (const skip of createDebug.skips) {
          if (matchesTemplate(name, skip)) {
            return false;
          }
        }
        for (const ns of createDebug.names) {
          if (matchesTemplate(name, ns)) {
            return true;
          }
        }
        return false;
      }
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module2.exports = setup;
  }
});

// node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "node_modules/debug/src/browser.js"(exports2, module2) {
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.storage = localstorage();
    exports2.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports2.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports2.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports2.storage.setItem("debug", namespaces);
        } else {
          exports2.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports2.storage.getItem("debug") || exports2.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  }
});

// node_modules/has-flag/index.js
var require_has_flag = __commonJS({
  "node_modules/has-flag/index.js"(exports2, module2) {
    "use strict";
    module2.exports = (flag, argv = process.argv) => {
      const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
      const position = argv.indexOf(prefix + flag);
      const terminatorPosition = argv.indexOf("--");
      return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
    };
  }
});

// node_modules/supports-color/index.js
var require_supports_color = __commonJS({
  "node_modules/supports-color/index.js"(exports2, module2) {
    "use strict";
    var os = require("os");
    var tty = require("tty");
    var hasFlag = require_has_flag();
    var { env } = process;
    var forceColor;
    if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
      forceColor = 0;
    } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
      forceColor = 1;
    }
    if ("FORCE_COLOR" in env) {
      if (env.FORCE_COLOR === "true") {
        forceColor = 1;
      } else if (env.FORCE_COLOR === "false") {
        forceColor = 0;
      } else {
        forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
      }
    }
    function translateLevel(level) {
      if (level === 0) {
        return false;
      }
      return {
        level,
        hasBasic: true,
        has256: level >= 2,
        has16m: level >= 3
      };
    }
    function supportsColor(haveStream, streamIsTTY) {
      if (forceColor === 0) {
        return 0;
      }
      if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
        return 3;
      }
      if (hasFlag("color=256")) {
        return 2;
      }
      if (haveStream && !streamIsTTY && forceColor === void 0) {
        return 0;
      }
      const min = forceColor || 0;
      if (env.TERM === "dumb") {
        return min;
      }
      if (process.platform === "win32") {
        const osRelease = os.release().split(".");
        if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
          return Number(osRelease[2]) >= 14931 ? 3 : 2;
        }
        return 1;
      }
      if ("CI" in env) {
        if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
          return 1;
        }
        return min;
      }
      if ("TEAMCITY_VERSION" in env) {
        return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
      }
      if (env.COLORTERM === "truecolor") {
        return 3;
      }
      if ("TERM_PROGRAM" in env) {
        const version2 = parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
        switch (env.TERM_PROGRAM) {
          case "iTerm.app":
            return version2 >= 3 ? 3 : 2;
          case "Apple_Terminal":
            return 2;
        }
      }
      if (/-256(color)?$/i.test(env.TERM)) {
        return 2;
      }
      if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
        return 1;
      }
      if ("COLORTERM" in env) {
        return 1;
      }
      return min;
    }
    function getSupportLevel(stream) {
      const level = supportsColor(stream, stream && stream.isTTY);
      return translateLevel(level);
    }
    module2.exports = {
      supportsColor: getSupportLevel,
      stdout: translateLevel(supportsColor(true, tty.isatty(1))),
      stderr: translateLevel(supportsColor(true, tty.isatty(2)))
    };
  }
});

// node_modules/debug/src/node.js
var require_node = __commonJS({
  "node_modules/debug/src/node.js"(exports2, module2) {
    var tty = require("tty");
    var util = require("util");
    exports2.init = init;
    exports2.log = log;
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports2.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = require_supports_color();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports2.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports2.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports2.inspectOpts ? Boolean(exports2.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports2.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.formatWithOptions(exports2.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug) {
      debug.inspectOpts = {};
      const keys = Object.keys(exports2.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug.inspectOpts[keys[i]] = exports2.inspectOpts[keys[i]];
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  }
});

// node_modules/debug/src/index.js
var require_src = __commonJS({
  "node_modules/debug/src/index.js"(exports2, module2) {
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module2.exports = require_browser();
    } else {
      module2.exports = require_node();
    }
  }
});

// node_modules/follow-redirects/debug.js
var require_debug = __commonJS({
  "node_modules/follow-redirects/debug.js"(exports2, module2) {
    var debug;
    module2.exports = function() {
      if (!debug) {
        try {
          debug = require_src()("follow-redirects");
        } catch (error) {
        }
        if (typeof debug !== "function") {
          debug = function() {
          };
        }
      }
      debug.apply(null, arguments);
    };
  }
});

// node_modules/follow-redirects/index.js
var require_follow_redirects = __commonJS({
  "node_modules/follow-redirects/index.js"(exports2, module2) {
    var url = require("url");
    var URL3 = url.URL;
    var http = require("http");
    var https = require("https");
    var Writable = require("stream").Writable;
    var assert = require("assert");
    var debug = require_debug();
    (function detectUnsupportedEnvironment() {
      var looksLikeNode = typeof process !== "undefined";
      var looksLikeBrowser = typeof window !== "undefined" && typeof document !== "undefined";
      var looksLikeV8 = isFunction(Error.captureStackTrace);
      if (!looksLikeNode && (looksLikeBrowser || !looksLikeV8)) {
        console.warn("The follow-redirects package should be excluded from browser builds.");
      }
    })();
    var useNativeURL = false;
    try {
      assert(new URL3(""));
    } catch (error) {
      useNativeURL = error.code === "ERR_INVALID_URL";
    }
    var preservedUrlFields = [
      "auth",
      "host",
      "hostname",
      "href",
      "path",
      "pathname",
      "port",
      "protocol",
      "query",
      "search",
      "hash"
    ];
    var events = ["abort", "aborted", "connect", "error", "socket", "timeout"];
    var eventHandlers = /* @__PURE__ */ Object.create(null);
    events.forEach(function(event) {
      eventHandlers[event] = function(arg1, arg2, arg3) {
        this._redirectable.emit(event, arg1, arg2, arg3);
      };
    });
    var InvalidUrlError = createErrorType(
      "ERR_INVALID_URL",
      "Invalid URL",
      TypeError
    );
    var RedirectionError = createErrorType(
      "ERR_FR_REDIRECTION_FAILURE",
      "Redirected request failed"
    );
    var TooManyRedirectsError = createErrorType(
      "ERR_FR_TOO_MANY_REDIRECTS",
      "Maximum number of redirects exceeded",
      RedirectionError
    );
    var MaxBodyLengthExceededError = createErrorType(
      "ERR_FR_MAX_BODY_LENGTH_EXCEEDED",
      "Request body larger than maxBodyLength limit"
    );
    var WriteAfterEndError = createErrorType(
      "ERR_STREAM_WRITE_AFTER_END",
      "write after end"
    );
    var destroy = Writable.prototype.destroy || noop;
    function RedirectableRequest(options, responseCallback) {
      Writable.call(this);
      this._sanitizeOptions(options);
      this._options = options;
      this._ended = false;
      this._ending = false;
      this._redirectCount = 0;
      this._redirects = [];
      this._requestBodyLength = 0;
      this._requestBodyBuffers = [];
      if (responseCallback) {
        this.on("response", responseCallback);
      }
      var self2 = this;
      this._onNativeResponse = function(response) {
        try {
          self2._processResponse(response);
        } catch (cause) {
          self2.emit("error", cause instanceof RedirectionError ? cause : new RedirectionError({ cause }));
        }
      };
      this._performRequest();
    }
    RedirectableRequest.prototype = Object.create(Writable.prototype);
    RedirectableRequest.prototype.abort = function() {
      destroyRequest(this._currentRequest);
      this._currentRequest.abort();
      this.emit("abort");
    };
    RedirectableRequest.prototype.destroy = function(error) {
      destroyRequest(this._currentRequest, error);
      destroy.call(this, error);
      return this;
    };
    RedirectableRequest.prototype.write = function(data, encoding, callback) {
      if (this._ending) {
        throw new WriteAfterEndError();
      }
      if (!isString(data) && !isBuffer(data)) {
        throw new TypeError("data should be a string, Buffer or Uint8Array");
      }
      if (isFunction(encoding)) {
        callback = encoding;
        encoding = null;
      }
      if (data.length === 0) {
        if (callback) {
          callback();
        }
        return;
      }
      if (this._requestBodyLength + data.length <= this._options.maxBodyLength) {
        this._requestBodyLength += data.length;
        this._requestBodyBuffers.push({ data, encoding });
        this._currentRequest.write(data, encoding, callback);
      } else {
        this.emit("error", new MaxBodyLengthExceededError());
        this.abort();
      }
    };
    RedirectableRequest.prototype.end = function(data, encoding, callback) {
      if (isFunction(data)) {
        callback = data;
        data = encoding = null;
      } else if (isFunction(encoding)) {
        callback = encoding;
        encoding = null;
      }
      if (!data) {
        this._ended = this._ending = true;
        this._currentRequest.end(null, null, callback);
      } else {
        var self2 = this;
        var currentRequest = this._currentRequest;
        this.write(data, encoding, function() {
          self2._ended = true;
          currentRequest.end(null, null, callback);
        });
        this._ending = true;
      }
    };
    RedirectableRequest.prototype.setHeader = function(name, value) {
      this._options.headers[name] = value;
      this._currentRequest.setHeader(name, value);
    };
    RedirectableRequest.prototype.removeHeader = function(name) {
      delete this._options.headers[name];
      this._currentRequest.removeHeader(name);
    };
    RedirectableRequest.prototype.setTimeout = function(msecs, callback) {
      var self2 = this;
      function destroyOnTimeout(socket) {
        socket.setTimeout(msecs);
        socket.removeListener("timeout", socket.destroy);
        socket.addListener("timeout", socket.destroy);
      }
      function startTimer(socket) {
        if (self2._timeout) {
          clearTimeout(self2._timeout);
        }
        self2._timeout = setTimeout(function() {
          self2.emit("timeout");
          clearTimer();
        }, msecs);
        destroyOnTimeout(socket);
      }
      function clearTimer() {
        if (self2._timeout) {
          clearTimeout(self2._timeout);
          self2._timeout = null;
        }
        self2.removeListener("abort", clearTimer);
        self2.removeListener("error", clearTimer);
        self2.removeListener("response", clearTimer);
        self2.removeListener("close", clearTimer);
        if (callback) {
          self2.removeListener("timeout", callback);
        }
        if (!self2.socket) {
          self2._currentRequest.removeListener("socket", startTimer);
        }
      }
      if (callback) {
        this.on("timeout", callback);
      }
      if (this.socket) {
        startTimer(this.socket);
      } else {
        this._currentRequest.once("socket", startTimer);
      }
      this.on("socket", destroyOnTimeout);
      this.on("abort", clearTimer);
      this.on("error", clearTimer);
      this.on("response", clearTimer);
      this.on("close", clearTimer);
      return this;
    };
    [
      "flushHeaders",
      "getHeader",
      "setNoDelay",
      "setSocketKeepAlive"
    ].forEach(function(method) {
      RedirectableRequest.prototype[method] = function(a, b) {
        return this._currentRequest[method](a, b);
      };
    });
    ["aborted", "connection", "socket"].forEach(function(property) {
      Object.defineProperty(RedirectableRequest.prototype, property, {
        get: function() {
          return this._currentRequest[property];
        }
      });
    });
    RedirectableRequest.prototype._sanitizeOptions = function(options) {
      if (!options.headers) {
        options.headers = {};
      }
      if (options.host) {
        if (!options.hostname) {
          options.hostname = options.host;
        }
        delete options.host;
      }
      if (!options.pathname && options.path) {
        var searchPos = options.path.indexOf("?");
        if (searchPos < 0) {
          options.pathname = options.path;
        } else {
          options.pathname = options.path.substring(0, searchPos);
          options.search = options.path.substring(searchPos);
        }
      }
    };
    RedirectableRequest.prototype._performRequest = function() {
      var protocol = this._options.protocol;
      var nativeProtocol = this._options.nativeProtocols[protocol];
      if (!nativeProtocol) {
        throw new TypeError("Unsupported protocol " + protocol);
      }
      if (this._options.agents) {
        var scheme = protocol.slice(0, -1);
        this._options.agent = this._options.agents[scheme];
      }
      var request = this._currentRequest = nativeProtocol.request(this._options, this._onNativeResponse);
      request._redirectable = this;
      for (var event of events) {
        request.on(event, eventHandlers[event]);
      }
      this._currentUrl = /^\//.test(this._options.path) ? url.format(this._options) : (
        // When making a request to a proxy, […]
        // a client MUST send the target URI in absolute-form […].
        this._options.path
      );
      if (this._isRedirect) {
        var i = 0;
        var self2 = this;
        var buffers = this._requestBodyBuffers;
        (function writeNext(error) {
          if (request === self2._currentRequest) {
            if (error) {
              self2.emit("error", error);
            } else if (i < buffers.length) {
              var buffer = buffers[i++];
              if (!request.finished) {
                request.write(buffer.data, buffer.encoding, writeNext);
              }
            } else if (self2._ended) {
              request.end();
            }
          }
        })();
      }
    };
    RedirectableRequest.prototype._processResponse = function(response) {
      var statusCode = response.statusCode;
      if (this._options.trackRedirects) {
        this._redirects.push({
          url: this._currentUrl,
          headers: response.headers,
          statusCode
        });
      }
      var location = response.headers.location;
      if (!location || this._options.followRedirects === false || statusCode < 300 || statusCode >= 400) {
        response.responseUrl = this._currentUrl;
        response.redirects = this._redirects;
        this.emit("response", response);
        this._requestBodyBuffers = [];
        return;
      }
      destroyRequest(this._currentRequest);
      response.destroy();
      if (++this._redirectCount > this._options.maxRedirects) {
        throw new TooManyRedirectsError();
      }
      var requestHeaders;
      var beforeRedirect = this._options.beforeRedirect;
      if (beforeRedirect) {
        requestHeaders = Object.assign({
          // The Host header was set by nativeProtocol.request
          Host: response.req.getHeader("host")
        }, this._options.headers);
      }
      var method = this._options.method;
      if ((statusCode === 301 || statusCode === 302) && this._options.method === "POST" || // RFC7231§6.4.4: The 303 (See Other) status code indicates that
      // the server is redirecting the user agent to a different resource […]
      // A user agent can perform a retrieval request targeting that URI
      // (a GET or HEAD request if using HTTP) […]
      statusCode === 303 && !/^(?:GET|HEAD)$/.test(this._options.method)) {
        this._options.method = "GET";
        this._requestBodyBuffers = [];
        removeMatchingHeaders(/^content-/i, this._options.headers);
      }
      var currentHostHeader = removeMatchingHeaders(/^host$/i, this._options.headers);
      var currentUrlParts = parseUrl(this._currentUrl);
      var currentHost = currentHostHeader || currentUrlParts.host;
      var currentUrl = /^\w+:/.test(location) ? this._currentUrl : url.format(Object.assign(currentUrlParts, { host: currentHost }));
      var redirectUrl = resolveUrl(location, currentUrl);
      debug("redirecting to", redirectUrl.href);
      this._isRedirect = true;
      spreadUrlObject(redirectUrl, this._options);
      if (redirectUrl.protocol !== currentUrlParts.protocol && redirectUrl.protocol !== "https:" || redirectUrl.host !== currentHost && !isSubdomain(redirectUrl.host, currentHost)) {
        removeMatchingHeaders(/^(?:(?:proxy-)?authorization|cookie)$/i, this._options.headers);
      }
      if (isFunction(beforeRedirect)) {
        var responseDetails = {
          headers: response.headers,
          statusCode
        };
        var requestDetails = {
          url: currentUrl,
          method,
          headers: requestHeaders
        };
        beforeRedirect(this._options, responseDetails, requestDetails);
        this._sanitizeOptions(this._options);
      }
      this._performRequest();
    };
    function wrap(protocols) {
      var exports3 = {
        maxRedirects: 21,
        maxBodyLength: 10 * 1024 * 1024
      };
      var nativeProtocols = {};
      Object.keys(protocols).forEach(function(scheme) {
        var protocol = scheme + ":";
        var nativeProtocol = nativeProtocols[protocol] = protocols[scheme];
        var wrappedProtocol = exports3[scheme] = Object.create(nativeProtocol);
        function request(input, options, callback) {
          if (isURL(input)) {
            input = spreadUrlObject(input);
          } else if (isString(input)) {
            input = spreadUrlObject(parseUrl(input));
          } else {
            callback = options;
            options = validateUrl(input);
            input = { protocol };
          }
          if (isFunction(options)) {
            callback = options;
            options = null;
          }
          options = Object.assign({
            maxRedirects: exports3.maxRedirects,
            maxBodyLength: exports3.maxBodyLength
          }, input, options);
          options.nativeProtocols = nativeProtocols;
          if (!isString(options.host) && !isString(options.hostname)) {
            options.hostname = "::1";
          }
          assert.equal(options.protocol, protocol, "protocol mismatch");
          debug("options", options);
          return new RedirectableRequest(options, callback);
        }
        function get(input, options, callback) {
          var wrappedRequest = wrappedProtocol.request(input, options, callback);
          wrappedRequest.end();
          return wrappedRequest;
        }
        Object.defineProperties(wrappedProtocol, {
          request: { value: request, configurable: true, enumerable: true, writable: true },
          get: { value: get, configurable: true, enumerable: true, writable: true }
        });
      });
      return exports3;
    }
    function noop() {
    }
    function parseUrl(input) {
      var parsed;
      if (useNativeURL) {
        parsed = new URL3(input);
      } else {
        parsed = validateUrl(url.parse(input));
        if (!isString(parsed.protocol)) {
          throw new InvalidUrlError({ input });
        }
      }
      return parsed;
    }
    function resolveUrl(relative, base) {
      return useNativeURL ? new URL3(relative, base) : parseUrl(url.resolve(base, relative));
    }
    function validateUrl(input) {
      if (/^\[/.test(input.hostname) && !/^\[[:0-9a-f]+\]$/i.test(input.hostname)) {
        throw new InvalidUrlError({ input: input.href || input });
      }
      if (/^\[/.test(input.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(input.host)) {
        throw new InvalidUrlError({ input: input.href || input });
      }
      return input;
    }
    function spreadUrlObject(urlObject, target) {
      var spread = target || {};
      for (var key of preservedUrlFields) {
        spread[key] = urlObject[key];
      }
      if (spread.hostname.startsWith("[")) {
        spread.hostname = spread.hostname.slice(1, -1);
      }
      if (spread.port !== "") {
        spread.port = Number(spread.port);
      }
      spread.path = spread.search ? spread.pathname + spread.search : spread.pathname;
      return spread;
    }
    function removeMatchingHeaders(regex, headers) {
      var lastValue;
      for (var header in headers) {
        if (regex.test(header)) {
          lastValue = headers[header];
          delete headers[header];
        }
      }
      return lastValue === null || typeof lastValue === "undefined" ? void 0 : String(lastValue).trim();
    }
    function createErrorType(code, message, baseClass) {
      function CustomError(properties) {
        if (isFunction(Error.captureStackTrace)) {
          Error.captureStackTrace(this, this.constructor);
        }
        Object.assign(this, properties || {});
        this.code = code;
        this.message = this.cause ? message + ": " + this.cause.message : message;
      }
      CustomError.prototype = new (baseClass || Error)();
      Object.defineProperties(CustomError.prototype, {
        constructor: {
          value: CustomError,
          enumerable: false
        },
        name: {
          value: "Error [" + code + "]",
          enumerable: false
        }
      });
      return CustomError;
    }
    function destroyRequest(request, error) {
      for (var event of events) {
        request.removeListener(event, eventHandlers[event]);
      }
      request.on("error", noop);
      request.destroy(error);
    }
    function isSubdomain(subdomain, domain) {
      assert(isString(subdomain) && isString(domain));
      var dot = subdomain.length - domain.length - 1;
      return dot > 0 && subdomain[dot] === "." && subdomain.endsWith(domain);
    }
    function isString(value) {
      return typeof value === "string" || value instanceof String;
    }
    function isFunction(value) {
      return typeof value === "function";
    }
    function isBuffer(value) {
      return typeof value === "object" && "length" in value;
    }
    function isURL(value) {
      return URL3 && value instanceof URL3;
    }
    module2.exports = wrap({ http, https });
    module2.exports.wrap = wrap;
  }
});

// node_modules/axios/dist/node/axios.cjs
var require_axios = __commonJS({
  "node_modules/axios/dist/node/axios.cjs"(exports2, module2) {
    "use strict";
    var FormData$1 = require_form_data();
    var crypto4 = require("crypto");
    var url = require("url");
    var proxyFromEnv = require_proxy_from_env();
    var http = require("http");
    var https = require("https");
    var util = require("util");
    var followRedirects = require_follow_redirects();
    var zlib = require("zlib");
    var stream = require("stream");
    var events = require("events");
    function _interopDefaultLegacy(e) {
      return e && typeof e === "object" && "default" in e ? e : { "default": e };
    }
    var FormData__default = /* @__PURE__ */ _interopDefaultLegacy(FormData$1);
    var crypto__default = /* @__PURE__ */ _interopDefaultLegacy(crypto4);
    var url__default = /* @__PURE__ */ _interopDefaultLegacy(url);
    var proxyFromEnv__default = /* @__PURE__ */ _interopDefaultLegacy(proxyFromEnv);
    var http__default = /* @__PURE__ */ _interopDefaultLegacy(http);
    var https__default = /* @__PURE__ */ _interopDefaultLegacy(https);
    var util__default = /* @__PURE__ */ _interopDefaultLegacy(util);
    var followRedirects__default = /* @__PURE__ */ _interopDefaultLegacy(followRedirects);
    var zlib__default = /* @__PURE__ */ _interopDefaultLegacy(zlib);
    var stream__default = /* @__PURE__ */ _interopDefaultLegacy(stream);
    function bind(fn, thisArg) {
      return function wrap() {
        return fn.apply(thisArg, arguments);
      };
    }
    var { toString } = Object.prototype;
    var { getPrototypeOf } = Object;
    var { iterator, toStringTag } = Symbol;
    var kindOf = /* @__PURE__ */ ((cache) => (thing) => {
      const str = toString.call(thing);
      return cache[str] || (cache[str] = str.slice(8, -1).toLowerCase());
    })(/* @__PURE__ */ Object.create(null));
    var kindOfTest = (type) => {
      type = type.toLowerCase();
      return (thing) => kindOf(thing) === type;
    };
    var typeOfTest = (type) => (thing) => typeof thing === type;
    var { isArray } = Array;
    var isUndefined = typeOfTest("undefined");
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor) && isFunction$1(val.constructor.isBuffer) && val.constructor.isBuffer(val);
    }
    var isArrayBuffer = kindOfTest("ArrayBuffer");
    function isArrayBufferView(val) {
      let result;
      if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) {
        result = ArrayBuffer.isView(val);
      } else {
        result = val && val.buffer && isArrayBuffer(val.buffer);
      }
      return result;
    }
    var isString = typeOfTest("string");
    var isFunction$1 = typeOfTest("function");
    var isNumber = typeOfTest("number");
    var isObject = (thing) => thing !== null && typeof thing === "object";
    var isBoolean = (thing) => thing === true || thing === false;
    var isPlainObject = (val) => {
      if (kindOf(val) !== "object") {
        return false;
      }
      const prototype2 = getPrototypeOf(val);
      return (prototype2 === null || prototype2 === Object.prototype || Object.getPrototypeOf(prototype2) === null) && !(toStringTag in val) && !(iterator in val);
    };
    var isEmptyObject = (val) => {
      if (!isObject(val) || isBuffer(val)) {
        return false;
      }
      try {
        return Object.keys(val).length === 0 && Object.getPrototypeOf(val) === Object.prototype;
      } catch (e) {
        return false;
      }
    };
    var isDate = kindOfTest("Date");
    var isFile = kindOfTest("File");
    var isBlob = kindOfTest("Blob");
    var isFileList = kindOfTest("FileList");
    var isStream = (val) => isObject(val) && isFunction$1(val.pipe);
    var isFormData = (thing) => {
      let kind;
      return thing && (typeof FormData === "function" && thing instanceof FormData || isFunction$1(thing.append) && ((kind = kindOf(thing)) === "formdata" || // detect form-data instance
      kind === "object" && isFunction$1(thing.toString) && thing.toString() === "[object FormData]"));
    };
    var isURLSearchParams = kindOfTest("URLSearchParams");
    var [isReadableStream, isRequest, isResponse, isHeaders] = ["ReadableStream", "Request", "Response", "Headers"].map(kindOfTest);
    var trim = (str) => str.trim ? str.trim() : str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
    function forEach(obj, fn, { allOwnKeys = false } = {}) {
      if (obj === null || typeof obj === "undefined") {
        return;
      }
      let i;
      let l;
      if (typeof obj !== "object") {
        obj = [obj];
      }
      if (isArray(obj)) {
        for (i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        if (isBuffer(obj)) {
          return;
        }
        const keys = allOwnKeys ? Object.getOwnPropertyNames(obj) : Object.keys(obj);
        const len = keys.length;
        let key;
        for (i = 0; i < len; i++) {
          key = keys[i];
          fn.call(null, obj[key], key, obj);
        }
      }
    }
    function findKey(obj, key) {
      if (isBuffer(obj)) {
        return null;
      }
      key = key.toLowerCase();
      const keys = Object.keys(obj);
      let i = keys.length;
      let _key;
      while (i-- > 0) {
        _key = keys[i];
        if (key === _key.toLowerCase()) {
          return _key;
        }
      }
      return null;
    }
    var _global = (() => {
      if (typeof globalThis !== "undefined") return globalThis;
      return typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : global;
    })();
    var isContextDefined = (context) => !isUndefined(context) && context !== _global;
    function merge() {
      const { caseless, skipUndefined } = isContextDefined(this) && this || {};
      const result = {};
      const assignValue = (val, key) => {
        const targetKey = caseless && findKey(result, key) || key;
        if (isPlainObject(result[targetKey]) && isPlainObject(val)) {
          result[targetKey] = merge(result[targetKey], val);
        } else if (isPlainObject(val)) {
          result[targetKey] = merge({}, val);
        } else if (isArray(val)) {
          result[targetKey] = val.slice();
        } else if (!skipUndefined || !isUndefined(val)) {
          result[targetKey] = val;
        }
      };
      for (let i = 0, l = arguments.length; i < l; i++) {
        arguments[i] && forEach(arguments[i], assignValue);
      }
      return result;
    }
    var extend = (a, b, thisArg, { allOwnKeys } = {}) => {
      forEach(b, (val, key) => {
        if (thisArg && isFunction$1(val)) {
          a[key] = bind(val, thisArg);
        } else {
          a[key] = val;
        }
      }, { allOwnKeys });
      return a;
    };
    var stripBOM = (content) => {
      if (content.charCodeAt(0) === 65279) {
        content = content.slice(1);
      }
      return content;
    };
    var inherits = (constructor, superConstructor, props, descriptors2) => {
      constructor.prototype = Object.create(superConstructor.prototype, descriptors2);
      constructor.prototype.constructor = constructor;
      Object.defineProperty(constructor, "super", {
        value: superConstructor.prototype
      });
      props && Object.assign(constructor.prototype, props);
    };
    var toFlatObject = (sourceObj, destObj, filter, propFilter) => {
      let props;
      let i;
      let prop;
      const merged = {};
      destObj = destObj || {};
      if (sourceObj == null) return destObj;
      do {
        props = Object.getOwnPropertyNames(sourceObj);
        i = props.length;
        while (i-- > 0) {
          prop = props[i];
          if ((!propFilter || propFilter(prop, sourceObj, destObj)) && !merged[prop]) {
            destObj[prop] = sourceObj[prop];
            merged[prop] = true;
          }
        }
        sourceObj = filter !== false && getPrototypeOf(sourceObj);
      } while (sourceObj && (!filter || filter(sourceObj, destObj)) && sourceObj !== Object.prototype);
      return destObj;
    };
    var endsWith = (str, searchString, position) => {
      str = String(str);
      if (position === void 0 || position > str.length) {
        position = str.length;
      }
      position -= searchString.length;
      const lastIndex = str.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
    };
    var toArray = (thing) => {
      if (!thing) return null;
      if (isArray(thing)) return thing;
      let i = thing.length;
      if (!isNumber(i)) return null;
      const arr = new Array(i);
      while (i-- > 0) {
        arr[i] = thing[i];
      }
      return arr;
    };
    var isTypedArray = /* @__PURE__ */ ((TypedArray) => {
      return (thing) => {
        return TypedArray && thing instanceof TypedArray;
      };
    })(typeof Uint8Array !== "undefined" && getPrototypeOf(Uint8Array));
    var forEachEntry = (obj, fn) => {
      const generator = obj && obj[iterator];
      const _iterator = generator.call(obj);
      let result;
      while ((result = _iterator.next()) && !result.done) {
        const pair = result.value;
        fn.call(obj, pair[0], pair[1]);
      }
    };
    var matchAll = (regExp, str) => {
      let matches;
      const arr = [];
      while ((matches = regExp.exec(str)) !== null) {
        arr.push(matches);
      }
      return arr;
    };
    var isHTMLForm = kindOfTest("HTMLFormElement");
    var toCamelCase = (str) => {
      return str.toLowerCase().replace(
        /[-_\s]([a-z\d])(\w*)/g,
        function replacer(m, p1, p2) {
          return p1.toUpperCase() + p2;
        }
      );
    };
    var hasOwnProperty = (({ hasOwnProperty: hasOwnProperty2 }) => (obj, prop) => hasOwnProperty2.call(obj, prop))(Object.prototype);
    var isRegExp = kindOfTest("RegExp");
    var reduceDescriptors = (obj, reducer) => {
      const descriptors2 = Object.getOwnPropertyDescriptors(obj);
      const reducedDescriptors = {};
      forEach(descriptors2, (descriptor, name) => {
        let ret;
        if ((ret = reducer(descriptor, name, obj)) !== false) {
          reducedDescriptors[name] = ret || descriptor;
        }
      });
      Object.defineProperties(obj, reducedDescriptors);
    };
    var freezeMethods = (obj) => {
      reduceDescriptors(obj, (descriptor, name) => {
        if (isFunction$1(obj) && ["arguments", "caller", "callee"].indexOf(name) !== -1) {
          return false;
        }
        const value = obj[name];
        if (!isFunction$1(value)) return;
        descriptor.enumerable = false;
        if ("writable" in descriptor) {
          descriptor.writable = false;
          return;
        }
        if (!descriptor.set) {
          descriptor.set = () => {
            throw Error("Can not rewrite read-only method '" + name + "'");
          };
        }
      });
    };
    var toObjectSet = (arrayOrString, delimiter) => {
      const obj = {};
      const define = (arr) => {
        arr.forEach((value) => {
          obj[value] = true;
        });
      };
      isArray(arrayOrString) ? define(arrayOrString) : define(String(arrayOrString).split(delimiter));
      return obj;
    };
    var noop = () => {
    };
    var toFiniteNumber = (value, defaultValue) => {
      return value != null && Number.isFinite(value = +value) ? value : defaultValue;
    };
    function isSpecCompliantForm(thing) {
      return !!(thing && isFunction$1(thing.append) && thing[toStringTag] === "FormData" && thing[iterator]);
    }
    var toJSONObject = (obj) => {
      const stack = new Array(10);
      const visit = (source, i) => {
        if (isObject(source)) {
          if (stack.indexOf(source) >= 0) {
            return;
          }
          if (isBuffer(source)) {
            return source;
          }
          if (!("toJSON" in source)) {
            stack[i] = source;
            const target = isArray(source) ? [] : {};
            forEach(source, (value, key) => {
              const reducedValue = visit(value, i + 1);
              !isUndefined(reducedValue) && (target[key] = reducedValue);
            });
            stack[i] = void 0;
            return target;
          }
        }
        return source;
      };
      return visit(obj, 0);
    };
    var isAsyncFn = kindOfTest("AsyncFunction");
    var isThenable = (thing) => thing && (isObject(thing) || isFunction$1(thing)) && isFunction$1(thing.then) && isFunction$1(thing.catch);
    var _setImmediate = ((setImmediateSupported, postMessageSupported) => {
      if (setImmediateSupported) {
        return setImmediate;
      }
      return postMessageSupported ? ((token, callbacks) => {
        _global.addEventListener("message", ({ source, data }) => {
          if (source === _global && data === token) {
            callbacks.length && callbacks.shift()();
          }
        }, false);
        return (cb) => {
          callbacks.push(cb);
          _global.postMessage(token, "*");
        };
      })(`axios@${Math.random()}`, []) : (cb) => setTimeout(cb);
    })(
      typeof setImmediate === "function",
      isFunction$1(_global.postMessage)
    );
    var asap = typeof queueMicrotask !== "undefined" ? queueMicrotask.bind(_global) : typeof process !== "undefined" && process.nextTick || _setImmediate;
    var isIterable = (thing) => thing != null && isFunction$1(thing[iterator]);
    var utils$1 = {
      isArray,
      isArrayBuffer,
      isBuffer,
      isFormData,
      isArrayBufferView,
      isString,
      isNumber,
      isBoolean,
      isObject,
      isPlainObject,
      isEmptyObject,
      isReadableStream,
      isRequest,
      isResponse,
      isHeaders,
      isUndefined,
      isDate,
      isFile,
      isBlob,
      isRegExp,
      isFunction: isFunction$1,
      isStream,
      isURLSearchParams,
      isTypedArray,
      isFileList,
      forEach,
      merge,
      extend,
      trim,
      stripBOM,
      inherits,
      toFlatObject,
      kindOf,
      kindOfTest,
      endsWith,
      toArray,
      forEachEntry,
      matchAll,
      isHTMLForm,
      hasOwnProperty,
      hasOwnProp: hasOwnProperty,
      // an alias to avoid ESLint no-prototype-builtins detection
      reduceDescriptors,
      freezeMethods,
      toObjectSet,
      toCamelCase,
      noop,
      toFiniteNumber,
      findKey,
      global: _global,
      isContextDefined,
      isSpecCompliantForm,
      toJSONObject,
      isAsyncFn,
      isThenable,
      setImmediate: _setImmediate,
      asap,
      isIterable
    };
    function AxiosError(message, code, config, request, response) {
      Error.call(this);
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      } else {
        this.stack = new Error().stack;
      }
      this.message = message;
      this.name = "AxiosError";
      code && (this.code = code);
      config && (this.config = config);
      request && (this.request = request);
      if (response) {
        this.response = response;
        this.status = response.status ? response.status : null;
      }
    }
    utils$1.inherits(AxiosError, Error, {
      toJSON: function toJSON() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: utils$1.toJSONObject(this.config),
          code: this.code,
          status: this.status
        };
      }
    });
    var prototype$1 = AxiosError.prototype;
    var descriptors = {};
    [
      "ERR_BAD_OPTION_VALUE",
      "ERR_BAD_OPTION",
      "ECONNABORTED",
      "ETIMEDOUT",
      "ERR_NETWORK",
      "ERR_FR_TOO_MANY_REDIRECTS",
      "ERR_DEPRECATED",
      "ERR_BAD_RESPONSE",
      "ERR_BAD_REQUEST",
      "ERR_CANCELED",
      "ERR_NOT_SUPPORT",
      "ERR_INVALID_URL"
      // eslint-disable-next-line func-names
    ].forEach((code) => {
      descriptors[code] = { value: code };
    });
    Object.defineProperties(AxiosError, descriptors);
    Object.defineProperty(prototype$1, "isAxiosError", { value: true });
    AxiosError.from = (error, code, config, request, response, customProps) => {
      const axiosError = Object.create(prototype$1);
      utils$1.toFlatObject(error, axiosError, function filter(obj) {
        return obj !== Error.prototype;
      }, (prop) => {
        return prop !== "isAxiosError";
      });
      const msg = error && error.message ? error.message : "Error";
      const errCode = code == null && error ? error.code : code;
      AxiosError.call(axiosError, msg, errCode, config, request, response);
      if (error && axiosError.cause == null) {
        Object.defineProperty(axiosError, "cause", { value: error, configurable: true });
      }
      axiosError.name = error && error.name || "Error";
      customProps && Object.assign(axiosError, customProps);
      return axiosError;
    };
    function isVisitable(thing) {
      return utils$1.isPlainObject(thing) || utils$1.isArray(thing);
    }
    function removeBrackets(key) {
      return utils$1.endsWith(key, "[]") ? key.slice(0, -2) : key;
    }
    function renderKey(path, key, dots) {
      if (!path) return key;
      return path.concat(key).map(function each(token, i) {
        token = removeBrackets(token);
        return !dots && i ? "[" + token + "]" : token;
      }).join(dots ? "." : "");
    }
    function isFlatArray(arr) {
      return utils$1.isArray(arr) && !arr.some(isVisitable);
    }
    var predicates = utils$1.toFlatObject(utils$1, {}, null, function filter(prop) {
      return /^is[A-Z]/.test(prop);
    });
    function toFormData(obj, formData, options) {
      if (!utils$1.isObject(obj)) {
        throw new TypeError("target must be an object");
      }
      formData = formData || new (FormData__default["default"] || FormData)();
      options = utils$1.toFlatObject(options, {
        metaTokens: true,
        dots: false,
        indexes: false
      }, false, function defined(option, source) {
        return !utils$1.isUndefined(source[option]);
      });
      const metaTokens = options.metaTokens;
      const visitor = options.visitor || defaultVisitor;
      const dots = options.dots;
      const indexes = options.indexes;
      const _Blob = options.Blob || typeof Blob !== "undefined" && Blob;
      const useBlob = _Blob && utils$1.isSpecCompliantForm(formData);
      if (!utils$1.isFunction(visitor)) {
        throw new TypeError("visitor must be a function");
      }
      function convertValue(value) {
        if (value === null) return "";
        if (utils$1.isDate(value)) {
          return value.toISOString();
        }
        if (utils$1.isBoolean(value)) {
          return value.toString();
        }
        if (!useBlob && utils$1.isBlob(value)) {
          throw new AxiosError("Blob is not supported. Use a Buffer instead.");
        }
        if (utils$1.isArrayBuffer(value) || utils$1.isTypedArray(value)) {
          return useBlob && typeof Blob === "function" ? new Blob([value]) : Buffer.from(value);
        }
        return value;
      }
      function defaultVisitor(value, key, path) {
        let arr = value;
        if (value && !path && typeof value === "object") {
          if (utils$1.endsWith(key, "{}")) {
            key = metaTokens ? key : key.slice(0, -2);
            value = JSON.stringify(value);
          } else if (utils$1.isArray(value) && isFlatArray(value) || (utils$1.isFileList(value) || utils$1.endsWith(key, "[]")) && (arr = utils$1.toArray(value))) {
            key = removeBrackets(key);
            arr.forEach(function each(el, index) {
              !(utils$1.isUndefined(el) || el === null) && formData.append(
                // eslint-disable-next-line no-nested-ternary
                indexes === true ? renderKey([key], index, dots) : indexes === null ? key : key + "[]",
                convertValue(el)
              );
            });
            return false;
          }
        }
        if (isVisitable(value)) {
          return true;
        }
        formData.append(renderKey(path, key, dots), convertValue(value));
        return false;
      }
      const stack = [];
      const exposedHelpers = Object.assign(predicates, {
        defaultVisitor,
        convertValue,
        isVisitable
      });
      function build(value, path) {
        if (utils$1.isUndefined(value)) return;
        if (stack.indexOf(value) !== -1) {
          throw Error("Circular reference detected in " + path.join("."));
        }
        stack.push(value);
        utils$1.forEach(value, function each(el, key) {
          const result = !(utils$1.isUndefined(el) || el === null) && visitor.call(
            formData,
            el,
            utils$1.isString(key) ? key.trim() : key,
            path,
            exposedHelpers
          );
          if (result === true) {
            build(el, path ? path.concat(key) : [key]);
          }
        });
        stack.pop();
      }
      if (!utils$1.isObject(obj)) {
        throw new TypeError("data must be an object");
      }
      build(obj);
      return formData;
    }
    function encode$1(str) {
      const charMap = {
        "!": "%21",
        "'": "%27",
        "(": "%28",
        ")": "%29",
        "~": "%7E",
        "%20": "+",
        "%00": "\0"
      };
      return encodeURIComponent(str).replace(/[!'()~]|%20|%00/g, function replacer(match) {
        return charMap[match];
      });
    }
    function AxiosURLSearchParams(params, options) {
      this._pairs = [];
      params && toFormData(params, this, options);
    }
    var prototype = AxiosURLSearchParams.prototype;
    prototype.append = function append(name, value) {
      this._pairs.push([name, value]);
    };
    prototype.toString = function toString2(encoder) {
      const _encode = encoder ? function(value) {
        return encoder.call(this, value, encode$1);
      } : encode$1;
      return this._pairs.map(function each(pair) {
        return _encode(pair[0]) + "=" + _encode(pair[1]);
      }, "").join("&");
    };
    function encode(val) {
      return encodeURIComponent(val).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+");
    }
    function buildURL(url2, params, options) {
      if (!params) {
        return url2;
      }
      const _encode = options && options.encode || encode;
      if (utils$1.isFunction(options)) {
        options = {
          serialize: options
        };
      }
      const serializeFn = options && options.serialize;
      let serializedParams;
      if (serializeFn) {
        serializedParams = serializeFn(params, options);
      } else {
        serializedParams = utils$1.isURLSearchParams(params) ? params.toString() : new AxiosURLSearchParams(params, options).toString(_encode);
      }
      if (serializedParams) {
        const hashmarkIndex = url2.indexOf("#");
        if (hashmarkIndex !== -1) {
          url2 = url2.slice(0, hashmarkIndex);
        }
        url2 += (url2.indexOf("?") === -1 ? "?" : "&") + serializedParams;
      }
      return url2;
    }
    var InterceptorManager = class {
      constructor() {
        this.handlers = [];
      }
      /**
       * Add a new interceptor to the stack
       *
       * @param {Function} fulfilled The function to handle `then` for a `Promise`
       * @param {Function} rejected The function to handle `reject` for a `Promise`
       *
       * @return {Number} An ID used to remove interceptor later
       */
      use(fulfilled, rejected, options) {
        this.handlers.push({
          fulfilled,
          rejected,
          synchronous: options ? options.synchronous : false,
          runWhen: options ? options.runWhen : null
        });
        return this.handlers.length - 1;
      }
      /**
       * Remove an interceptor from the stack
       *
       * @param {Number} id The ID that was returned by `use`
       *
       * @returns {Boolean} `true` if the interceptor was removed, `false` otherwise
       */
      eject(id) {
        if (this.handlers[id]) {
          this.handlers[id] = null;
        }
      }
      /**
       * Clear all interceptors from the stack
       *
       * @returns {void}
       */
      clear() {
        if (this.handlers) {
          this.handlers = [];
        }
      }
      /**
       * Iterate over all the registered interceptors
       *
       * This method is particularly useful for skipping over any
       * interceptors that may have become `null` calling `eject`.
       *
       * @param {Function} fn The function to call for each interceptor
       *
       * @returns {void}
       */
      forEach(fn) {
        utils$1.forEach(this.handlers, function forEachHandler(h) {
          if (h !== null) {
            fn(h);
          }
        });
      }
    };
    var InterceptorManager$1 = InterceptorManager;
    var transitionalDefaults = {
      silentJSONParsing: true,
      forcedJSONParsing: true,
      clarifyTimeoutError: false
    };
    var URLSearchParams2 = url__default["default"].URLSearchParams;
    var ALPHA = "abcdefghijklmnopqrstuvwxyz";
    var DIGIT = "0123456789";
    var ALPHABET = {
      DIGIT,
      ALPHA,
      ALPHA_DIGIT: ALPHA + ALPHA.toUpperCase() + DIGIT
    };
    var generateString = (size = 16, alphabet = ALPHABET.ALPHA_DIGIT) => {
      let str = "";
      const { length } = alphabet;
      const randomValues = new Uint32Array(size);
      crypto__default["default"].randomFillSync(randomValues);
      for (let i = 0; i < size; i++) {
        str += alphabet[randomValues[i] % length];
      }
      return str;
    };
    var platform$1 = {
      isNode: true,
      classes: {
        URLSearchParams: URLSearchParams2,
        FormData: FormData__default["default"],
        Blob: typeof Blob !== "undefined" && Blob || null
      },
      ALPHABET,
      generateString,
      protocols: ["http", "https", "file", "data"]
    };
    var hasBrowserEnv = typeof window !== "undefined" && typeof document !== "undefined";
    var _navigator = typeof navigator === "object" && navigator || void 0;
    var hasStandardBrowserEnv = hasBrowserEnv && (!_navigator || ["ReactNative", "NativeScript", "NS"].indexOf(_navigator.product) < 0);
    var hasStandardBrowserWebWorkerEnv = (() => {
      return typeof WorkerGlobalScope !== "undefined" && // eslint-disable-next-line no-undef
      self instanceof WorkerGlobalScope && typeof self.importScripts === "function";
    })();
    var origin = hasBrowserEnv && window.location.href || "http://localhost";
    var utils = /* @__PURE__ */ Object.freeze({
      __proto__: null,
      hasBrowserEnv,
      hasStandardBrowserWebWorkerEnv,
      hasStandardBrowserEnv,
      navigator: _navigator,
      origin
    });
    var platform = {
      ...utils,
      ...platform$1
    };
    function toURLEncodedForm(data, options) {
      return toFormData(data, new platform.classes.URLSearchParams(), {
        visitor: function(value, key, path, helpers) {
          if (platform.isNode && utils$1.isBuffer(value)) {
            this.append(key, value.toString("base64"));
            return false;
          }
          return helpers.defaultVisitor.apply(this, arguments);
        },
        ...options
      });
    }
    function parsePropPath(name) {
      return utils$1.matchAll(/\w+|\[(\w*)]/g, name).map((match) => {
        return match[0] === "[]" ? "" : match[1] || match[0];
      });
    }
    function arrayToObject(arr) {
      const obj = {};
      const keys = Object.keys(arr);
      let i;
      const len = keys.length;
      let key;
      for (i = 0; i < len; i++) {
        key = keys[i];
        obj[key] = arr[key];
      }
      return obj;
    }
    function formDataToJSON(formData) {
      function buildPath(path, value, target, index) {
        let name = path[index++];
        if (name === "__proto__") return true;
        const isNumericKey = Number.isFinite(+name);
        const isLast = index >= path.length;
        name = !name && utils$1.isArray(target) ? target.length : name;
        if (isLast) {
          if (utils$1.hasOwnProp(target, name)) {
            target[name] = [target[name], value];
          } else {
            target[name] = value;
          }
          return !isNumericKey;
        }
        if (!target[name] || !utils$1.isObject(target[name])) {
          target[name] = [];
        }
        const result = buildPath(path, value, target[name], index);
        if (result && utils$1.isArray(target[name])) {
          target[name] = arrayToObject(target[name]);
        }
        return !isNumericKey;
      }
      if (utils$1.isFormData(formData) && utils$1.isFunction(formData.entries)) {
        const obj = {};
        utils$1.forEachEntry(formData, (name, value) => {
          buildPath(parsePropPath(name), value, obj, 0);
        });
        return obj;
      }
      return null;
    }
    function stringifySafely(rawValue, parser, encoder) {
      if (utils$1.isString(rawValue)) {
        try {
          (parser || JSON.parse)(rawValue);
          return utils$1.trim(rawValue);
        } catch (e) {
          if (e.name !== "SyntaxError") {
            throw e;
          }
        }
      }
      return (encoder || JSON.stringify)(rawValue);
    }
    var defaults = {
      transitional: transitionalDefaults,
      adapter: ["xhr", "http", "fetch"],
      transformRequest: [function transformRequest(data, headers) {
        const contentType = headers.getContentType() || "";
        const hasJSONContentType = contentType.indexOf("application/json") > -1;
        const isObjectPayload = utils$1.isObject(data);
        if (isObjectPayload && utils$1.isHTMLForm(data)) {
          data = new FormData(data);
        }
        const isFormData2 = utils$1.isFormData(data);
        if (isFormData2) {
          return hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data;
        }
        if (utils$1.isArrayBuffer(data) || utils$1.isBuffer(data) || utils$1.isStream(data) || utils$1.isFile(data) || utils$1.isBlob(data) || utils$1.isReadableStream(data)) {
          return data;
        }
        if (utils$1.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils$1.isURLSearchParams(data)) {
          headers.setContentType("application/x-www-form-urlencoded;charset=utf-8", false);
          return data.toString();
        }
        let isFileList2;
        if (isObjectPayload) {
          if (contentType.indexOf("application/x-www-form-urlencoded") > -1) {
            return toURLEncodedForm(data, this.formSerializer).toString();
          }
          if ((isFileList2 = utils$1.isFileList(data)) || contentType.indexOf("multipart/form-data") > -1) {
            const _FormData = this.env && this.env.FormData;
            return toFormData(
              isFileList2 ? { "files[]": data } : data,
              _FormData && new _FormData(),
              this.formSerializer
            );
          }
        }
        if (isObjectPayload || hasJSONContentType) {
          headers.setContentType("application/json", false);
          return stringifySafely(data);
        }
        return data;
      }],
      transformResponse: [function transformResponse(data) {
        const transitional = this.transitional || defaults.transitional;
        const forcedJSONParsing = transitional && transitional.forcedJSONParsing;
        const JSONRequested = this.responseType === "json";
        if (utils$1.isResponse(data) || utils$1.isReadableStream(data)) {
          return data;
        }
        if (data && utils$1.isString(data) && (forcedJSONParsing && !this.responseType || JSONRequested)) {
          const silentJSONParsing = transitional && transitional.silentJSONParsing;
          const strictJSONParsing = !silentJSONParsing && JSONRequested;
          try {
            return JSON.parse(data, this.parseReviver);
          } catch (e) {
            if (strictJSONParsing) {
              if (e.name === "SyntaxError") {
                throw AxiosError.from(e, AxiosError.ERR_BAD_RESPONSE, this, null, this.response);
              }
              throw e;
            }
          }
        }
        return data;
      }],
      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,
      xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN",
      maxContentLength: -1,
      maxBodyLength: -1,
      env: {
        FormData: platform.classes.FormData,
        Blob: platform.classes.Blob
      },
      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      },
      headers: {
        common: {
          "Accept": "application/json, text/plain, */*",
          "Content-Type": void 0
        }
      }
    };
    utils$1.forEach(["delete", "get", "head", "post", "put", "patch"], (method) => {
      defaults.headers[method] = {};
    });
    var defaults$1 = defaults;
    var ignoreDuplicateOf = utils$1.toObjectSet([
      "age",
      "authorization",
      "content-length",
      "content-type",
      "etag",
      "expires",
      "from",
      "host",
      "if-modified-since",
      "if-unmodified-since",
      "last-modified",
      "location",
      "max-forwards",
      "proxy-authorization",
      "referer",
      "retry-after",
      "user-agent"
    ]);
    var parseHeaders = (rawHeaders) => {
      const parsed = {};
      let key;
      let val;
      let i;
      rawHeaders && rawHeaders.split("\n").forEach(function parser(line) {
        i = line.indexOf(":");
        key = line.substring(0, i).trim().toLowerCase();
        val = line.substring(i + 1).trim();
        if (!key || parsed[key] && ignoreDuplicateOf[key]) {
          return;
        }
        if (key === "set-cookie") {
          if (parsed[key]) {
            parsed[key].push(val);
          } else {
            parsed[key] = [val];
          }
        } else {
          parsed[key] = parsed[key] ? parsed[key] + ", " + val : val;
        }
      });
      return parsed;
    };
    var $internals = Symbol("internals");
    function normalizeHeader(header) {
      return header && String(header).trim().toLowerCase();
    }
    function normalizeValue(value) {
      if (value === false || value == null) {
        return value;
      }
      return utils$1.isArray(value) ? value.map(normalizeValue) : String(value);
    }
    function parseTokens(str) {
      const tokens = /* @__PURE__ */ Object.create(null);
      const tokensRE = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g;
      let match;
      while (match = tokensRE.exec(str)) {
        tokens[match[1]] = match[2];
      }
      return tokens;
    }
    var isValidHeaderName = (str) => /^[-_a-zA-Z0-9^`|~,!#$%&'*+.]+$/.test(str.trim());
    function matchHeaderValue(context, value, header, filter, isHeaderNameFilter) {
      if (utils$1.isFunction(filter)) {
        return filter.call(this, value, header);
      }
      if (isHeaderNameFilter) {
        value = header;
      }
      if (!utils$1.isString(value)) return;
      if (utils$1.isString(filter)) {
        return value.indexOf(filter) !== -1;
      }
      if (utils$1.isRegExp(filter)) {
        return filter.test(value);
      }
    }
    function formatHeader(header) {
      return header.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (w, char, str) => {
        return char.toUpperCase() + str;
      });
    }
    function buildAccessors(obj, header) {
      const accessorName = utils$1.toCamelCase(" " + header);
      ["get", "set", "has"].forEach((methodName) => {
        Object.defineProperty(obj, methodName + accessorName, {
          value: function(arg1, arg2, arg3) {
            return this[methodName].call(this, header, arg1, arg2, arg3);
          },
          configurable: true
        });
      });
    }
    var AxiosHeaders = class {
      constructor(headers) {
        headers && this.set(headers);
      }
      set(header, valueOrRewrite, rewrite) {
        const self2 = this;
        function setHeader(_value, _header, _rewrite) {
          const lHeader = normalizeHeader(_header);
          if (!lHeader) {
            throw new Error("header name must be a non-empty string");
          }
          const key = utils$1.findKey(self2, lHeader);
          if (!key || self2[key] === void 0 || _rewrite === true || _rewrite === void 0 && self2[key] !== false) {
            self2[key || _header] = normalizeValue(_value);
          }
        }
        const setHeaders = (headers, _rewrite) => utils$1.forEach(headers, (_value, _header) => setHeader(_value, _header, _rewrite));
        if (utils$1.isPlainObject(header) || header instanceof this.constructor) {
          setHeaders(header, valueOrRewrite);
        } else if (utils$1.isString(header) && (header = header.trim()) && !isValidHeaderName(header)) {
          setHeaders(parseHeaders(header), valueOrRewrite);
        } else if (utils$1.isObject(header) && utils$1.isIterable(header)) {
          let obj = {}, dest, key;
          for (const entry of header) {
            if (!utils$1.isArray(entry)) {
              throw TypeError("Object iterator must return a key-value pair");
            }
            obj[key = entry[0]] = (dest = obj[key]) ? utils$1.isArray(dest) ? [...dest, entry[1]] : [dest, entry[1]] : entry[1];
          }
          setHeaders(obj, valueOrRewrite);
        } else {
          header != null && setHeader(valueOrRewrite, header, rewrite);
        }
        return this;
      }
      get(header, parser) {
        header = normalizeHeader(header);
        if (header) {
          const key = utils$1.findKey(this, header);
          if (key) {
            const value = this[key];
            if (!parser) {
              return value;
            }
            if (parser === true) {
              return parseTokens(value);
            }
            if (utils$1.isFunction(parser)) {
              return parser.call(this, value, key);
            }
            if (utils$1.isRegExp(parser)) {
              return parser.exec(value);
            }
            throw new TypeError("parser must be boolean|regexp|function");
          }
        }
      }
      has(header, matcher) {
        header = normalizeHeader(header);
        if (header) {
          const key = utils$1.findKey(this, header);
          return !!(key && this[key] !== void 0 && (!matcher || matchHeaderValue(this, this[key], key, matcher)));
        }
        return false;
      }
      delete(header, matcher) {
        const self2 = this;
        let deleted = false;
        function deleteHeader(_header) {
          _header = normalizeHeader(_header);
          if (_header) {
            const key = utils$1.findKey(self2, _header);
            if (key && (!matcher || matchHeaderValue(self2, self2[key], key, matcher))) {
              delete self2[key];
              deleted = true;
            }
          }
        }
        if (utils$1.isArray(header)) {
          header.forEach(deleteHeader);
        } else {
          deleteHeader(header);
        }
        return deleted;
      }
      clear(matcher) {
        const keys = Object.keys(this);
        let i = keys.length;
        let deleted = false;
        while (i--) {
          const key = keys[i];
          if (!matcher || matchHeaderValue(this, this[key], key, matcher, true)) {
            delete this[key];
            deleted = true;
          }
        }
        return deleted;
      }
      normalize(format) {
        const self2 = this;
        const headers = {};
        utils$1.forEach(this, (value, header) => {
          const key = utils$1.findKey(headers, header);
          if (key) {
            self2[key] = normalizeValue(value);
            delete self2[header];
            return;
          }
          const normalized = format ? formatHeader(header) : String(header).trim();
          if (normalized !== header) {
            delete self2[header];
          }
          self2[normalized] = normalizeValue(value);
          headers[normalized] = true;
        });
        return this;
      }
      concat(...targets) {
        return this.constructor.concat(this, ...targets);
      }
      toJSON(asStrings) {
        const obj = /* @__PURE__ */ Object.create(null);
        utils$1.forEach(this, (value, header) => {
          value != null && value !== false && (obj[header] = asStrings && utils$1.isArray(value) ? value.join(", ") : value);
        });
        return obj;
      }
      [Symbol.iterator]() {
        return Object.entries(this.toJSON())[Symbol.iterator]();
      }
      toString() {
        return Object.entries(this.toJSON()).map(([header, value]) => header + ": " + value).join("\n");
      }
      getSetCookie() {
        return this.get("set-cookie") || [];
      }
      get [Symbol.toStringTag]() {
        return "AxiosHeaders";
      }
      static from(thing) {
        return thing instanceof this ? thing : new this(thing);
      }
      static concat(first, ...targets) {
        const computed = new this(first);
        targets.forEach((target) => computed.set(target));
        return computed;
      }
      static accessor(header) {
        const internals = this[$internals] = this[$internals] = {
          accessors: {}
        };
        const accessors = internals.accessors;
        const prototype2 = this.prototype;
        function defineAccessor(_header) {
          const lHeader = normalizeHeader(_header);
          if (!accessors[lHeader]) {
            buildAccessors(prototype2, _header);
            accessors[lHeader] = true;
          }
        }
        utils$1.isArray(header) ? header.forEach(defineAccessor) : defineAccessor(header);
        return this;
      }
    };
    AxiosHeaders.accessor(["Content-Type", "Content-Length", "Accept", "Accept-Encoding", "User-Agent", "Authorization"]);
    utils$1.reduceDescriptors(AxiosHeaders.prototype, ({ value }, key) => {
      let mapped = key[0].toUpperCase() + key.slice(1);
      return {
        get: () => value,
        set(headerValue) {
          this[mapped] = headerValue;
        }
      };
    });
    utils$1.freezeMethods(AxiosHeaders);
    var AxiosHeaders$1 = AxiosHeaders;
    function transformData(fns, response) {
      const config = this || defaults$1;
      const context = response || config;
      const headers = AxiosHeaders$1.from(context.headers);
      let data = context.data;
      utils$1.forEach(fns, function transform(fn) {
        data = fn.call(config, data, headers.normalize(), response ? response.status : void 0);
      });
      headers.normalize();
      return data;
    }
    function isCancel(value) {
      return !!(value && value.__CANCEL__);
    }
    function CanceledError(message, config, request) {
      AxiosError.call(this, message == null ? "canceled" : message, AxiosError.ERR_CANCELED, config, request);
      this.name = "CanceledError";
    }
    utils$1.inherits(CanceledError, AxiosError, {
      __CANCEL__: true
    });
    function settle(resolve, reject, response) {
      const validateStatus = response.config.validateStatus;
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(new AxiosError(
          "Request failed with status code " + response.status,
          [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
          response.config,
          response.request,
          response
        ));
      }
    }
    function isAbsoluteURL(url2) {
      return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url2);
    }
    function combineURLs(baseURL, relativeURL) {
      return relativeURL ? baseURL.replace(/\/?\/$/, "") + "/" + relativeURL.replace(/^\/+/, "") : baseURL;
    }
    function buildFullPath(baseURL, requestedURL, allowAbsoluteUrls) {
      let isRelativeUrl = !isAbsoluteURL(requestedURL);
      if (baseURL && (isRelativeUrl || allowAbsoluteUrls == false)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    }
    var VERSION = "1.12.2";
    function parseProtocol(url2) {
      const match = /^([-+\w]{1,25})(:?\/\/|:)/.exec(url2);
      return match && match[1] || "";
    }
    var DATA_URL_PATTERN = /^(?:([^;]+);)?(?:[^;]+;)?(base64|),([\s\S]*)$/;
    function fromDataURI(uri, asBlob, options) {
      const _Blob = options && options.Blob || platform.classes.Blob;
      const protocol = parseProtocol(uri);
      if (asBlob === void 0 && _Blob) {
        asBlob = true;
      }
      if (protocol === "data") {
        uri = protocol.length ? uri.slice(protocol.length + 1) : uri;
        const match = DATA_URL_PATTERN.exec(uri);
        if (!match) {
          throw new AxiosError("Invalid URL", AxiosError.ERR_INVALID_URL);
        }
        const mime = match[1];
        const isBase64 = match[2];
        const body = match[3];
        const buffer = Buffer.from(decodeURIComponent(body), isBase64 ? "base64" : "utf8");
        if (asBlob) {
          if (!_Blob) {
            throw new AxiosError("Blob is not supported", AxiosError.ERR_NOT_SUPPORT);
          }
          return new _Blob([buffer], { type: mime });
        }
        return buffer;
      }
      throw new AxiosError("Unsupported protocol " + protocol, AxiosError.ERR_NOT_SUPPORT);
    }
    var kInternals = Symbol("internals");
    var AxiosTransformStream = class extends stream__default["default"].Transform {
      constructor(options) {
        options = utils$1.toFlatObject(options, {
          maxRate: 0,
          chunkSize: 64 * 1024,
          minChunkSize: 100,
          timeWindow: 500,
          ticksRate: 2,
          samplesCount: 15
        }, null, (prop, source) => {
          return !utils$1.isUndefined(source[prop]);
        });
        super({
          readableHighWaterMark: options.chunkSize
        });
        const internals = this[kInternals] = {
          timeWindow: options.timeWindow,
          chunkSize: options.chunkSize,
          maxRate: options.maxRate,
          minChunkSize: options.minChunkSize,
          bytesSeen: 0,
          isCaptured: false,
          notifiedBytesLoaded: 0,
          ts: Date.now(),
          bytes: 0,
          onReadCallback: null
        };
        this.on("newListener", (event) => {
          if (event === "progress") {
            if (!internals.isCaptured) {
              internals.isCaptured = true;
            }
          }
        });
      }
      _read(size) {
        const internals = this[kInternals];
        if (internals.onReadCallback) {
          internals.onReadCallback();
        }
        return super._read(size);
      }
      _transform(chunk, encoding, callback) {
        const internals = this[kInternals];
        const maxRate = internals.maxRate;
        const readableHighWaterMark = this.readableHighWaterMark;
        const timeWindow = internals.timeWindow;
        const divider = 1e3 / timeWindow;
        const bytesThreshold = maxRate / divider;
        const minChunkSize = internals.minChunkSize !== false ? Math.max(internals.minChunkSize, bytesThreshold * 0.01) : 0;
        const pushChunk = (_chunk, _callback) => {
          const bytes = Buffer.byteLength(_chunk);
          internals.bytesSeen += bytes;
          internals.bytes += bytes;
          internals.isCaptured && this.emit("progress", internals.bytesSeen);
          if (this.push(_chunk)) {
            process.nextTick(_callback);
          } else {
            internals.onReadCallback = () => {
              internals.onReadCallback = null;
              process.nextTick(_callback);
            };
          }
        };
        const transformChunk = (_chunk, _callback) => {
          const chunkSize = Buffer.byteLength(_chunk);
          let chunkRemainder = null;
          let maxChunkSize = readableHighWaterMark;
          let bytesLeft;
          let passed = 0;
          if (maxRate) {
            const now = Date.now();
            if (!internals.ts || (passed = now - internals.ts) >= timeWindow) {
              internals.ts = now;
              bytesLeft = bytesThreshold - internals.bytes;
              internals.bytes = bytesLeft < 0 ? -bytesLeft : 0;
              passed = 0;
            }
            bytesLeft = bytesThreshold - internals.bytes;
          }
          if (maxRate) {
            if (bytesLeft <= 0) {
              return setTimeout(() => {
                _callback(null, _chunk);
              }, timeWindow - passed);
            }
            if (bytesLeft < maxChunkSize) {
              maxChunkSize = bytesLeft;
            }
          }
          if (maxChunkSize && chunkSize > maxChunkSize && chunkSize - maxChunkSize > minChunkSize) {
            chunkRemainder = _chunk.subarray(maxChunkSize);
            _chunk = _chunk.subarray(0, maxChunkSize);
          }
          pushChunk(_chunk, chunkRemainder ? () => {
            process.nextTick(_callback, null, chunkRemainder);
          } : _callback);
        };
        transformChunk(chunk, function transformNextChunk(err, _chunk) {
          if (err) {
            return callback(err);
          }
          if (_chunk) {
            transformChunk(_chunk, transformNextChunk);
          } else {
            callback(null);
          }
        });
      }
    };
    var AxiosTransformStream$1 = AxiosTransformStream;
    var { asyncIterator } = Symbol;
    var readBlob = async function* (blob) {
      if (blob.stream) {
        yield* blob.stream();
      } else if (blob.arrayBuffer) {
        yield await blob.arrayBuffer();
      } else if (blob[asyncIterator]) {
        yield* blob[asyncIterator]();
      } else {
        yield blob;
      }
    };
    var readBlob$1 = readBlob;
    var BOUNDARY_ALPHABET = platform.ALPHABET.ALPHA_DIGIT + "-_";
    var textEncoder = typeof TextEncoder === "function" ? new TextEncoder() : new util__default["default"].TextEncoder();
    var CRLF = "\r\n";
    var CRLF_BYTES = textEncoder.encode(CRLF);
    var CRLF_BYTES_COUNT = 2;
    var FormDataPart = class {
      constructor(name, value) {
        const { escapeName } = this.constructor;
        const isStringValue = utils$1.isString(value);
        let headers = `Content-Disposition: form-data; name="${escapeName(name)}"${!isStringValue && value.name ? `; filename="${escapeName(value.name)}"` : ""}${CRLF}`;
        if (isStringValue) {
          value = textEncoder.encode(String(value).replace(/\r?\n|\r\n?/g, CRLF));
        } else {
          headers += `Content-Type: ${value.type || "application/octet-stream"}${CRLF}`;
        }
        this.headers = textEncoder.encode(headers + CRLF);
        this.contentLength = isStringValue ? value.byteLength : value.size;
        this.size = this.headers.byteLength + this.contentLength + CRLF_BYTES_COUNT;
        this.name = name;
        this.value = value;
      }
      async *encode() {
        yield this.headers;
        const { value } = this;
        if (utils$1.isTypedArray(value)) {
          yield value;
        } else {
          yield* readBlob$1(value);
        }
        yield CRLF_BYTES;
      }
      static escapeName(name) {
        return String(name).replace(/[\r\n"]/g, (match) => ({
          "\r": "%0D",
          "\n": "%0A",
          '"': "%22"
        })[match]);
      }
    };
    var formDataToStream = (form, headersHandler, options) => {
      const {
        tag = "form-data-boundary",
        size = 25,
        boundary = tag + "-" + platform.generateString(size, BOUNDARY_ALPHABET)
      } = options || {};
      if (!utils$1.isFormData(form)) {
        throw TypeError("FormData instance required");
      }
      if (boundary.length < 1 || boundary.length > 70) {
        throw Error("boundary must be 10-70 characters long");
      }
      const boundaryBytes = textEncoder.encode("--" + boundary + CRLF);
      const footerBytes = textEncoder.encode("--" + boundary + "--" + CRLF);
      let contentLength = footerBytes.byteLength;
      const parts = Array.from(form.entries()).map(([name, value]) => {
        const part = new FormDataPart(name, value);
        contentLength += part.size;
        return part;
      });
      contentLength += boundaryBytes.byteLength * parts.length;
      contentLength = utils$1.toFiniteNumber(contentLength);
      const computedHeaders = {
        "Content-Type": `multipart/form-data; boundary=${boundary}`
      };
      if (Number.isFinite(contentLength)) {
        computedHeaders["Content-Length"] = contentLength;
      }
      headersHandler && headersHandler(computedHeaders);
      return stream.Readable.from((async function* () {
        for (const part of parts) {
          yield boundaryBytes;
          yield* part.encode();
        }
        yield footerBytes;
      })());
    };
    var formDataToStream$1 = formDataToStream;
    var ZlibHeaderTransformStream = class extends stream__default["default"].Transform {
      __transform(chunk, encoding, callback) {
        this.push(chunk);
        callback();
      }
      _transform(chunk, encoding, callback) {
        if (chunk.length !== 0) {
          this._transform = this.__transform;
          if (chunk[0] !== 120) {
            const header = Buffer.alloc(2);
            header[0] = 120;
            header[1] = 156;
            this.push(header, encoding);
          }
        }
        this.__transform(chunk, encoding, callback);
      }
    };
    var ZlibHeaderTransformStream$1 = ZlibHeaderTransformStream;
    var callbackify = (fn, reducer) => {
      return utils$1.isAsyncFn(fn) ? function(...args) {
        const cb = args.pop();
        fn.apply(this, args).then((value) => {
          try {
            reducer ? cb(null, ...reducer(value)) : cb(null, value);
          } catch (err) {
            cb(err);
          }
        }, cb);
      } : fn;
    };
    var callbackify$1 = callbackify;
    function speedometer(samplesCount, min) {
      samplesCount = samplesCount || 10;
      const bytes = new Array(samplesCount);
      const timestamps = new Array(samplesCount);
      let head = 0;
      let tail = 0;
      let firstSampleTS;
      min = min !== void 0 ? min : 1e3;
      return function push(chunkLength) {
        const now = Date.now();
        const startedAt = timestamps[tail];
        if (!firstSampleTS) {
          firstSampleTS = now;
        }
        bytes[head] = chunkLength;
        timestamps[head] = now;
        let i = tail;
        let bytesCount = 0;
        while (i !== head) {
          bytesCount += bytes[i++];
          i = i % samplesCount;
        }
        head = (head + 1) % samplesCount;
        if (head === tail) {
          tail = (tail + 1) % samplesCount;
        }
        if (now - firstSampleTS < min) {
          return;
        }
        const passed = startedAt && now - startedAt;
        return passed ? Math.round(bytesCount * 1e3 / passed) : void 0;
      };
    }
    function throttle(fn, freq) {
      let timestamp = 0;
      let threshold = 1e3 / freq;
      let lastArgs;
      let timer;
      const invoke = (args, now = Date.now()) => {
        timestamp = now;
        lastArgs = null;
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        fn(...args);
      };
      const throttled = (...args) => {
        const now = Date.now();
        const passed = now - timestamp;
        if (passed >= threshold) {
          invoke(args, now);
        } else {
          lastArgs = args;
          if (!timer) {
            timer = setTimeout(() => {
              timer = null;
              invoke(lastArgs);
            }, threshold - passed);
          }
        }
      };
      const flush = () => lastArgs && invoke(lastArgs);
      return [throttled, flush];
    }
    var progressEventReducer = (listener, isDownloadStream, freq = 3) => {
      let bytesNotified = 0;
      const _speedometer = speedometer(50, 250);
      return throttle((e) => {
        const loaded = e.loaded;
        const total = e.lengthComputable ? e.total : void 0;
        const progressBytes = loaded - bytesNotified;
        const rate = _speedometer(progressBytes);
        const inRange = loaded <= total;
        bytesNotified = loaded;
        const data = {
          loaded,
          total,
          progress: total ? loaded / total : void 0,
          bytes: progressBytes,
          rate: rate ? rate : void 0,
          estimated: rate && total && inRange ? (total - loaded) / rate : void 0,
          event: e,
          lengthComputable: total != null,
          [isDownloadStream ? "download" : "upload"]: true
        };
        listener(data);
      }, freq);
    };
    var progressEventDecorator = (total, throttled) => {
      const lengthComputable = total != null;
      return [(loaded) => throttled[0]({
        lengthComputable,
        total,
        loaded
      }), throttled[1]];
    };
    var asyncDecorator = (fn) => (...args) => utils$1.asap(() => fn(...args));
    function estimateDataURLDecodedBytes(url2) {
      if (!url2 || typeof url2 !== "string") return 0;
      if (!url2.startsWith("data:")) return 0;
      const comma = url2.indexOf(",");
      if (comma < 0) return 0;
      const meta = url2.slice(5, comma);
      const body = url2.slice(comma + 1);
      const isBase64 = /;base64/i.test(meta);
      if (isBase64) {
        let effectiveLen = body.length;
        const len = body.length;
        for (let i = 0; i < len; i++) {
          if (body.charCodeAt(i) === 37 && i + 2 < len) {
            const a = body.charCodeAt(i + 1);
            const b = body.charCodeAt(i + 2);
            const isHex = (a >= 48 && a <= 57 || a >= 65 && a <= 70 || a >= 97 && a <= 102) && (b >= 48 && b <= 57 || b >= 65 && b <= 70 || b >= 97 && b <= 102);
            if (isHex) {
              effectiveLen -= 2;
              i += 2;
            }
          }
        }
        let pad = 0;
        let idx = len - 1;
        const tailIsPct3D = (j) => j >= 2 && body.charCodeAt(j - 2) === 37 && // '%'
        body.charCodeAt(j - 1) === 51 && // '3'
        (body.charCodeAt(j) === 68 || body.charCodeAt(j) === 100);
        if (idx >= 0) {
          if (body.charCodeAt(idx) === 61) {
            pad++;
            idx--;
          } else if (tailIsPct3D(idx)) {
            pad++;
            idx -= 3;
          }
        }
        if (pad === 1 && idx >= 0) {
          if (body.charCodeAt(idx) === 61) {
            pad++;
          } else if (tailIsPct3D(idx)) {
            pad++;
          }
        }
        const groups = Math.floor(effectiveLen / 4);
        const bytes = groups * 3 - (pad || 0);
        return bytes > 0 ? bytes : 0;
      }
      return Buffer.byteLength(body, "utf8");
    }
    var zlibOptions = {
      flush: zlib__default["default"].constants.Z_SYNC_FLUSH,
      finishFlush: zlib__default["default"].constants.Z_SYNC_FLUSH
    };
    var brotliOptions = {
      flush: zlib__default["default"].constants.BROTLI_OPERATION_FLUSH,
      finishFlush: zlib__default["default"].constants.BROTLI_OPERATION_FLUSH
    };
    var isBrotliSupported = utils$1.isFunction(zlib__default["default"].createBrotliDecompress);
    var { http: httpFollow, https: httpsFollow } = followRedirects__default["default"];
    var isHttps = /https:?/;
    var supportedProtocols = platform.protocols.map((protocol) => {
      return protocol + ":";
    });
    var flushOnFinish = (stream2, [throttled, flush]) => {
      stream2.on("end", flush).on("error", flush);
      return throttled;
    };
    function dispatchBeforeRedirect(options, responseDetails) {
      if (options.beforeRedirects.proxy) {
        options.beforeRedirects.proxy(options);
      }
      if (options.beforeRedirects.config) {
        options.beforeRedirects.config(options, responseDetails);
      }
    }
    function setProxy(options, configProxy, location) {
      let proxy = configProxy;
      if (!proxy && proxy !== false) {
        const proxyUrl = proxyFromEnv__default["default"].getProxyForUrl(location);
        if (proxyUrl) {
          proxy = new URL(proxyUrl);
        }
      }
      if (proxy) {
        if (proxy.username) {
          proxy.auth = (proxy.username || "") + ":" + (proxy.password || "");
        }
        if (proxy.auth) {
          if (proxy.auth.username || proxy.auth.password) {
            proxy.auth = (proxy.auth.username || "") + ":" + (proxy.auth.password || "");
          }
          const base64 = Buffer.from(proxy.auth, "utf8").toString("base64");
          options.headers["Proxy-Authorization"] = "Basic " + base64;
        }
        options.headers.host = options.hostname + (options.port ? ":" + options.port : "");
        const proxyHost = proxy.hostname || proxy.host;
        options.hostname = proxyHost;
        options.host = proxyHost;
        options.port = proxy.port;
        options.path = location;
        if (proxy.protocol) {
          options.protocol = proxy.protocol.includes(":") ? proxy.protocol : `${proxy.protocol}:`;
        }
      }
      options.beforeRedirects.proxy = function beforeRedirect(redirectOptions) {
        setProxy(redirectOptions, configProxy, redirectOptions.href);
      };
    }
    var isHttpAdapterSupported = typeof process !== "undefined" && utils$1.kindOf(process) === "process";
    var wrapAsync = (asyncExecutor) => {
      return new Promise((resolve, reject) => {
        let onDone;
        let isDone;
        const done = (value, isRejected) => {
          if (isDone) return;
          isDone = true;
          onDone && onDone(value, isRejected);
        };
        const _resolve = (value) => {
          done(value);
          resolve(value);
        };
        const _reject = (reason) => {
          done(reason, true);
          reject(reason);
        };
        asyncExecutor(_resolve, _reject, (onDoneHandler) => onDone = onDoneHandler).catch(_reject);
      });
    };
    var resolveFamily = ({ address, family }) => {
      if (!utils$1.isString(address)) {
        throw TypeError("address must be a string");
      }
      return {
        address,
        family: family || (address.indexOf(".") < 0 ? 6 : 4)
      };
    };
    var buildAddressEntry = (address, family) => resolveFamily(utils$1.isObject(address) ? address : { address, family });
    var httpAdapter = isHttpAdapterSupported && function httpAdapter2(config) {
      return wrapAsync(async function dispatchHttpRequest(resolve, reject, onDone) {
        let { data, lookup, family } = config;
        const { responseType, responseEncoding } = config;
        const method = config.method.toUpperCase();
        let isDone;
        let rejected = false;
        let req;
        if (lookup) {
          const _lookup = callbackify$1(lookup, (value) => utils$1.isArray(value) ? value : [value]);
          lookup = (hostname, opt, cb) => {
            _lookup(hostname, opt, (err, arg0, arg1) => {
              if (err) {
                return cb(err);
              }
              const addresses = utils$1.isArray(arg0) ? arg0.map((addr) => buildAddressEntry(addr)) : [buildAddressEntry(arg0, arg1)];
              opt.all ? cb(err, addresses) : cb(err, addresses[0].address, addresses[0].family);
            });
          };
        }
        const emitter = new events.EventEmitter();
        const onFinished = () => {
          if (config.cancelToken) {
            config.cancelToken.unsubscribe(abort);
          }
          if (config.signal) {
            config.signal.removeEventListener("abort", abort);
          }
          emitter.removeAllListeners();
        };
        onDone((value, isRejected) => {
          isDone = true;
          if (isRejected) {
            rejected = true;
            onFinished();
          }
        });
        function abort(reason) {
          emitter.emit("abort", !reason || reason.type ? new CanceledError(null, config, req) : reason);
        }
        emitter.once("abort", reject);
        if (config.cancelToken || config.signal) {
          config.cancelToken && config.cancelToken.subscribe(abort);
          if (config.signal) {
            config.signal.aborted ? abort() : config.signal.addEventListener("abort", abort);
          }
        }
        const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
        const parsed = new URL(fullPath, platform.hasBrowserEnv ? platform.origin : void 0);
        const protocol = parsed.protocol || supportedProtocols[0];
        if (protocol === "data:") {
          if (config.maxContentLength > -1) {
            const dataUrl = String(config.url || fullPath || "");
            const estimated = estimateDataURLDecodedBytes(dataUrl);
            if (estimated > config.maxContentLength) {
              return reject(new AxiosError(
                "maxContentLength size of " + config.maxContentLength + " exceeded",
                AxiosError.ERR_BAD_RESPONSE,
                config
              ));
            }
          }
          let convertedData;
          if (method !== "GET") {
            return settle(resolve, reject, {
              status: 405,
              statusText: "method not allowed",
              headers: {},
              config
            });
          }
          try {
            convertedData = fromDataURI(config.url, responseType === "blob", {
              Blob: config.env && config.env.Blob
            });
          } catch (err) {
            throw AxiosError.from(err, AxiosError.ERR_BAD_REQUEST, config);
          }
          if (responseType === "text") {
            convertedData = convertedData.toString(responseEncoding);
            if (!responseEncoding || responseEncoding === "utf8") {
              convertedData = utils$1.stripBOM(convertedData);
            }
          } else if (responseType === "stream") {
            convertedData = stream__default["default"].Readable.from(convertedData);
          }
          return settle(resolve, reject, {
            data: convertedData,
            status: 200,
            statusText: "OK",
            headers: new AxiosHeaders$1(),
            config
          });
        }
        if (supportedProtocols.indexOf(protocol) === -1) {
          return reject(new AxiosError(
            "Unsupported protocol " + protocol,
            AxiosError.ERR_BAD_REQUEST,
            config
          ));
        }
        const headers = AxiosHeaders$1.from(config.headers).normalize();
        headers.set("User-Agent", "axios/" + VERSION, false);
        const { onUploadProgress, onDownloadProgress } = config;
        const maxRate = config.maxRate;
        let maxUploadRate = void 0;
        let maxDownloadRate = void 0;
        if (utils$1.isSpecCompliantForm(data)) {
          const userBoundary = headers.getContentType(/boundary=([-_\w\d]{10,70})/i);
          data = formDataToStream$1(data, (formHeaders) => {
            headers.set(formHeaders);
          }, {
            tag: `axios-${VERSION}-boundary`,
            boundary: userBoundary && userBoundary[1] || void 0
          });
        } else if (utils$1.isFormData(data) && utils$1.isFunction(data.getHeaders)) {
          headers.set(data.getHeaders());
          if (!headers.hasContentLength()) {
            try {
              const knownLength = await util__default["default"].promisify(data.getLength).call(data);
              Number.isFinite(knownLength) && knownLength >= 0 && headers.setContentLength(knownLength);
            } catch (e) {
            }
          }
        } else if (utils$1.isBlob(data) || utils$1.isFile(data)) {
          data.size && headers.setContentType(data.type || "application/octet-stream");
          headers.setContentLength(data.size || 0);
          data = stream__default["default"].Readable.from(readBlob$1(data));
        } else if (data && !utils$1.isStream(data)) {
          if (Buffer.isBuffer(data)) ;
          else if (utils$1.isArrayBuffer(data)) {
            data = Buffer.from(new Uint8Array(data));
          } else if (utils$1.isString(data)) {
            data = Buffer.from(data, "utf-8");
          } else {
            return reject(new AxiosError(
              "Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream",
              AxiosError.ERR_BAD_REQUEST,
              config
            ));
          }
          headers.setContentLength(data.length, false);
          if (config.maxBodyLength > -1 && data.length > config.maxBodyLength) {
            return reject(new AxiosError(
              "Request body larger than maxBodyLength limit",
              AxiosError.ERR_BAD_REQUEST,
              config
            ));
          }
        }
        const contentLength = utils$1.toFiniteNumber(headers.getContentLength());
        if (utils$1.isArray(maxRate)) {
          maxUploadRate = maxRate[0];
          maxDownloadRate = maxRate[1];
        } else {
          maxUploadRate = maxDownloadRate = maxRate;
        }
        if (data && (onUploadProgress || maxUploadRate)) {
          if (!utils$1.isStream(data)) {
            data = stream__default["default"].Readable.from(data, { objectMode: false });
          }
          data = stream__default["default"].pipeline([data, new AxiosTransformStream$1({
            maxRate: utils$1.toFiniteNumber(maxUploadRate)
          })], utils$1.noop);
          onUploadProgress && data.on("progress", flushOnFinish(
            data,
            progressEventDecorator(
              contentLength,
              progressEventReducer(asyncDecorator(onUploadProgress), false, 3)
            )
          ));
        }
        let auth = void 0;
        if (config.auth) {
          const username = config.auth.username || "";
          const password = config.auth.password || "";
          auth = username + ":" + password;
        }
        if (!auth && parsed.username) {
          const urlUsername = parsed.username;
          const urlPassword = parsed.password;
          auth = urlUsername + ":" + urlPassword;
        }
        auth && headers.delete("authorization");
        let path;
        try {
          path = buildURL(
            parsed.pathname + parsed.search,
            config.params,
            config.paramsSerializer
          ).replace(/^\?/, "");
        } catch (err) {
          const customErr = new Error(err.message);
          customErr.config = config;
          customErr.url = config.url;
          customErr.exists = true;
          return reject(customErr);
        }
        headers.set(
          "Accept-Encoding",
          "gzip, compress, deflate" + (isBrotliSupported ? ", br" : ""),
          false
        );
        const options = {
          path,
          method,
          headers: headers.toJSON(),
          agents: { http: config.httpAgent, https: config.httpsAgent },
          auth,
          protocol,
          family,
          beforeRedirect: dispatchBeforeRedirect,
          beforeRedirects: {}
        };
        !utils$1.isUndefined(lookup) && (options.lookup = lookup);
        if (config.socketPath) {
          options.socketPath = config.socketPath;
        } else {
          options.hostname = parsed.hostname.startsWith("[") ? parsed.hostname.slice(1, -1) : parsed.hostname;
          options.port = parsed.port;
          setProxy(options, config.proxy, protocol + "//" + parsed.hostname + (parsed.port ? ":" + parsed.port : "") + options.path);
        }
        let transport;
        const isHttpsRequest = isHttps.test(options.protocol);
        options.agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;
        if (config.transport) {
          transport = config.transport;
        } else if (config.maxRedirects === 0) {
          transport = isHttpsRequest ? https__default["default"] : http__default["default"];
        } else {
          if (config.maxRedirects) {
            options.maxRedirects = config.maxRedirects;
          }
          if (config.beforeRedirect) {
            options.beforeRedirects.config = config.beforeRedirect;
          }
          transport = isHttpsRequest ? httpsFollow : httpFollow;
        }
        if (config.maxBodyLength > -1) {
          options.maxBodyLength = config.maxBodyLength;
        } else {
          options.maxBodyLength = Infinity;
        }
        if (config.insecureHTTPParser) {
          options.insecureHTTPParser = config.insecureHTTPParser;
        }
        req = transport.request(options, function handleResponse(res) {
          if (req.destroyed) return;
          const streams = [res];
          const responseLength = +res.headers["content-length"];
          if (onDownloadProgress || maxDownloadRate) {
            const transformStream = new AxiosTransformStream$1({
              maxRate: utils$1.toFiniteNumber(maxDownloadRate)
            });
            onDownloadProgress && transformStream.on("progress", flushOnFinish(
              transformStream,
              progressEventDecorator(
                responseLength,
                progressEventReducer(asyncDecorator(onDownloadProgress), true, 3)
              )
            ));
            streams.push(transformStream);
          }
          let responseStream = res;
          const lastRequest = res.req || req;
          if (config.decompress !== false && res.headers["content-encoding"]) {
            if (method === "HEAD" || res.statusCode === 204) {
              delete res.headers["content-encoding"];
            }
            switch ((res.headers["content-encoding"] || "").toLowerCase()) {
              /*eslint default-case:0*/
              case "gzip":
              case "x-gzip":
              case "compress":
              case "x-compress":
                streams.push(zlib__default["default"].createUnzip(zlibOptions));
                delete res.headers["content-encoding"];
                break;
              case "deflate":
                streams.push(new ZlibHeaderTransformStream$1());
                streams.push(zlib__default["default"].createUnzip(zlibOptions));
                delete res.headers["content-encoding"];
                break;
              case "br":
                if (isBrotliSupported) {
                  streams.push(zlib__default["default"].createBrotliDecompress(brotliOptions));
                  delete res.headers["content-encoding"];
                }
            }
          }
          responseStream = streams.length > 1 ? stream__default["default"].pipeline(streams, utils$1.noop) : streams[0];
          const offListeners = stream__default["default"].finished(responseStream, () => {
            offListeners();
            onFinished();
          });
          const response = {
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: new AxiosHeaders$1(res.headers),
            config,
            request: lastRequest
          };
          if (responseType === "stream") {
            response.data = responseStream;
            settle(resolve, reject, response);
          } else {
            const responseBuffer = [];
            let totalResponseBytes = 0;
            responseStream.on("data", function handleStreamData(chunk) {
              responseBuffer.push(chunk);
              totalResponseBytes += chunk.length;
              if (config.maxContentLength > -1 && totalResponseBytes > config.maxContentLength) {
                rejected = true;
                responseStream.destroy();
                reject(new AxiosError(
                  "maxContentLength size of " + config.maxContentLength + " exceeded",
                  AxiosError.ERR_BAD_RESPONSE,
                  config,
                  lastRequest
                ));
              }
            });
            responseStream.on("aborted", function handlerStreamAborted() {
              if (rejected) {
                return;
              }
              const err = new AxiosError(
                "stream has been aborted",
                AxiosError.ERR_BAD_RESPONSE,
                config,
                lastRequest
              );
              responseStream.destroy(err);
              reject(err);
            });
            responseStream.on("error", function handleStreamError(err) {
              if (req.destroyed) return;
              reject(AxiosError.from(err, null, config, lastRequest));
            });
            responseStream.on("end", function handleStreamEnd() {
              try {
                let responseData = responseBuffer.length === 1 ? responseBuffer[0] : Buffer.concat(responseBuffer);
                if (responseType !== "arraybuffer") {
                  responseData = responseData.toString(responseEncoding);
                  if (!responseEncoding || responseEncoding === "utf8") {
                    responseData = utils$1.stripBOM(responseData);
                  }
                }
                response.data = responseData;
              } catch (err) {
                return reject(AxiosError.from(err, null, config, response.request, response));
              }
              settle(resolve, reject, response);
            });
          }
          emitter.once("abort", (err) => {
            if (!responseStream.destroyed) {
              responseStream.emit("error", err);
              responseStream.destroy();
            }
          });
        });
        emitter.once("abort", (err) => {
          reject(err);
          req.destroy(err);
        });
        req.on("error", function handleRequestError(err) {
          reject(AxiosError.from(err, null, config, req));
        });
        req.on("socket", function handleRequestSocket(socket) {
          socket.setKeepAlive(true, 1e3 * 60);
        });
        if (config.timeout) {
          const timeout = parseInt(config.timeout, 10);
          if (Number.isNaN(timeout)) {
            reject(new AxiosError(
              "error trying to parse `config.timeout` to int",
              AxiosError.ERR_BAD_OPTION_VALUE,
              config,
              req
            ));
            return;
          }
          req.setTimeout(timeout, function handleRequestTimeout() {
            if (isDone) return;
            let timeoutErrorMessage = config.timeout ? "timeout of " + config.timeout + "ms exceeded" : "timeout exceeded";
            const transitional = config.transitional || transitionalDefaults;
            if (config.timeoutErrorMessage) {
              timeoutErrorMessage = config.timeoutErrorMessage;
            }
            reject(new AxiosError(
              timeoutErrorMessage,
              transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
              config,
              req
            ));
            abort();
          });
        }
        if (utils$1.isStream(data)) {
          let ended = false;
          let errored = false;
          data.on("end", () => {
            ended = true;
          });
          data.once("error", (err) => {
            errored = true;
            req.destroy(err);
          });
          data.on("close", () => {
            if (!ended && !errored) {
              abort(new CanceledError("Request stream has been aborted", config, req));
            }
          });
          data.pipe(req);
        } else {
          req.end(data);
        }
      });
    };
    var isURLSameOrigin = platform.hasStandardBrowserEnv ? /* @__PURE__ */ ((origin2, isMSIE) => (url2) => {
      url2 = new URL(url2, platform.origin);
      return origin2.protocol === url2.protocol && origin2.host === url2.host && (isMSIE || origin2.port === url2.port);
    })(
      new URL(platform.origin),
      platform.navigator && /(msie|trident)/i.test(platform.navigator.userAgent)
    ) : () => true;
    var cookies = platform.hasStandardBrowserEnv ? (
      // Standard browser envs support document.cookie
      {
        write(name, value, expires, path, domain, secure) {
          const cookie = [name + "=" + encodeURIComponent(value)];
          utils$1.isNumber(expires) && cookie.push("expires=" + new Date(expires).toGMTString());
          utils$1.isString(path) && cookie.push("path=" + path);
          utils$1.isString(domain) && cookie.push("domain=" + domain);
          secure === true && cookie.push("secure");
          document.cookie = cookie.join("; ");
        },
        read(name) {
          const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
          return match ? decodeURIComponent(match[3]) : null;
        },
        remove(name) {
          this.write(name, "", Date.now() - 864e5);
        }
      }
    ) : (
      // Non-standard browser env (web workers, react-native) lack needed support.
      {
        write() {
        },
        read() {
          return null;
        },
        remove() {
        }
      }
    );
    var headersToObject = (thing) => thing instanceof AxiosHeaders$1 ? { ...thing } : thing;
    function mergeConfig(config1, config2) {
      config2 = config2 || {};
      const config = {};
      function getMergedValue(target, source, prop, caseless) {
        if (utils$1.isPlainObject(target) && utils$1.isPlainObject(source)) {
          return utils$1.merge.call({ caseless }, target, source);
        } else if (utils$1.isPlainObject(source)) {
          return utils$1.merge({}, source);
        } else if (utils$1.isArray(source)) {
          return source.slice();
        }
        return source;
      }
      function mergeDeepProperties(a, b, prop, caseless) {
        if (!utils$1.isUndefined(b)) {
          return getMergedValue(a, b, prop, caseless);
        } else if (!utils$1.isUndefined(a)) {
          return getMergedValue(void 0, a, prop, caseless);
        }
      }
      function valueFromConfig2(a, b) {
        if (!utils$1.isUndefined(b)) {
          return getMergedValue(void 0, b);
        }
      }
      function defaultToConfig2(a, b) {
        if (!utils$1.isUndefined(b)) {
          return getMergedValue(void 0, b);
        } else if (!utils$1.isUndefined(a)) {
          return getMergedValue(void 0, a);
        }
      }
      function mergeDirectKeys(a, b, prop) {
        if (prop in config2) {
          return getMergedValue(a, b);
        } else if (prop in config1) {
          return getMergedValue(void 0, a);
        }
      }
      const mergeMap = {
        url: valueFromConfig2,
        method: valueFromConfig2,
        data: valueFromConfig2,
        baseURL: defaultToConfig2,
        transformRequest: defaultToConfig2,
        transformResponse: defaultToConfig2,
        paramsSerializer: defaultToConfig2,
        timeout: defaultToConfig2,
        timeoutMessage: defaultToConfig2,
        withCredentials: defaultToConfig2,
        withXSRFToken: defaultToConfig2,
        adapter: defaultToConfig2,
        responseType: defaultToConfig2,
        xsrfCookieName: defaultToConfig2,
        xsrfHeaderName: defaultToConfig2,
        onUploadProgress: defaultToConfig2,
        onDownloadProgress: defaultToConfig2,
        decompress: defaultToConfig2,
        maxContentLength: defaultToConfig2,
        maxBodyLength: defaultToConfig2,
        beforeRedirect: defaultToConfig2,
        transport: defaultToConfig2,
        httpAgent: defaultToConfig2,
        httpsAgent: defaultToConfig2,
        cancelToken: defaultToConfig2,
        socketPath: defaultToConfig2,
        responseEncoding: defaultToConfig2,
        validateStatus: mergeDirectKeys,
        headers: (a, b, prop) => mergeDeepProperties(headersToObject(a), headersToObject(b), prop, true)
      };
      utils$1.forEach(Object.keys({ ...config1, ...config2 }), function computeConfigValue(prop) {
        const merge2 = mergeMap[prop] || mergeDeepProperties;
        const configValue = merge2(config1[prop], config2[prop], prop);
        utils$1.isUndefined(configValue) && merge2 !== mergeDirectKeys || (config[prop] = configValue);
      });
      return config;
    }
    var resolveConfig = (config) => {
      const newConfig = mergeConfig({}, config);
      let { data, withXSRFToken, xsrfHeaderName, xsrfCookieName, headers, auth } = newConfig;
      newConfig.headers = headers = AxiosHeaders$1.from(headers);
      newConfig.url = buildURL(buildFullPath(newConfig.baseURL, newConfig.url, newConfig.allowAbsoluteUrls), config.params, config.paramsSerializer);
      if (auth) {
        headers.set(
          "Authorization",
          "Basic " + btoa((auth.username || "") + ":" + (auth.password ? unescape(encodeURIComponent(auth.password)) : ""))
        );
      }
      if (utils$1.isFormData(data)) {
        if (platform.hasStandardBrowserEnv || platform.hasStandardBrowserWebWorkerEnv) {
          headers.setContentType(void 0);
        } else if (utils$1.isFunction(data.getHeaders)) {
          const formHeaders = data.getHeaders();
          const allowedHeaders = ["content-type", "content-length"];
          Object.entries(formHeaders).forEach(([key, val]) => {
            if (allowedHeaders.includes(key.toLowerCase())) {
              headers.set(key, val);
            }
          });
        }
      }
      if (platform.hasStandardBrowserEnv) {
        withXSRFToken && utils$1.isFunction(withXSRFToken) && (withXSRFToken = withXSRFToken(newConfig));
        if (withXSRFToken || withXSRFToken !== false && isURLSameOrigin(newConfig.url)) {
          const xsrfValue = xsrfHeaderName && xsrfCookieName && cookies.read(xsrfCookieName);
          if (xsrfValue) {
            headers.set(xsrfHeaderName, xsrfValue);
          }
        }
      }
      return newConfig;
    };
    var isXHRAdapterSupported = typeof XMLHttpRequest !== "undefined";
    var xhrAdapter = isXHRAdapterSupported && function(config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        const _config = resolveConfig(config);
        let requestData = _config.data;
        const requestHeaders = AxiosHeaders$1.from(_config.headers).normalize();
        let { responseType, onUploadProgress, onDownloadProgress } = _config;
        let onCanceled;
        let uploadThrottled, downloadThrottled;
        let flushUpload, flushDownload;
        function done() {
          flushUpload && flushUpload();
          flushDownload && flushDownload();
          _config.cancelToken && _config.cancelToken.unsubscribe(onCanceled);
          _config.signal && _config.signal.removeEventListener("abort", onCanceled);
        }
        let request = new XMLHttpRequest();
        request.open(_config.method.toUpperCase(), _config.url, true);
        request.timeout = _config.timeout;
        function onloadend() {
          if (!request) {
            return;
          }
          const responseHeaders = AxiosHeaders$1.from(
            "getAllResponseHeaders" in request && request.getAllResponseHeaders()
          );
          const responseData = !responseType || responseType === "text" || responseType === "json" ? request.responseText : request.response;
          const response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config,
            request
          };
          settle(function _resolve(value) {
            resolve(value);
            done();
          }, function _reject(err) {
            reject(err);
            done();
          }, response);
          request = null;
        }
        if ("onloadend" in request) {
          request.onloadend = onloadend;
        } else {
          request.onreadystatechange = function handleLoad() {
            if (!request || request.readyState !== 4) {
              return;
            }
            if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf("file:") === 0)) {
              return;
            }
            setTimeout(onloadend);
          };
        }
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }
          reject(new AxiosError("Request aborted", AxiosError.ECONNABORTED, config, request));
          request = null;
        };
        request.onerror = function handleError(event) {
          const msg = event && event.message ? event.message : "Network Error";
          const err = new AxiosError(msg, AxiosError.ERR_NETWORK, config, request);
          err.event = event || null;
          reject(err);
          request = null;
        };
        request.ontimeout = function handleTimeout() {
          let timeoutErrorMessage = _config.timeout ? "timeout of " + _config.timeout + "ms exceeded" : "timeout exceeded";
          const transitional = _config.transitional || transitionalDefaults;
          if (_config.timeoutErrorMessage) {
            timeoutErrorMessage = _config.timeoutErrorMessage;
          }
          reject(new AxiosError(
            timeoutErrorMessage,
            transitional.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED,
            config,
            request
          ));
          request = null;
        };
        requestData === void 0 && requestHeaders.setContentType(null);
        if ("setRequestHeader" in request) {
          utils$1.forEach(requestHeaders.toJSON(), function setRequestHeader(val, key) {
            request.setRequestHeader(key, val);
          });
        }
        if (!utils$1.isUndefined(_config.withCredentials)) {
          request.withCredentials = !!_config.withCredentials;
        }
        if (responseType && responseType !== "json") {
          request.responseType = _config.responseType;
        }
        if (onDownloadProgress) {
          [downloadThrottled, flushDownload] = progressEventReducer(onDownloadProgress, true);
          request.addEventListener("progress", downloadThrottled);
        }
        if (onUploadProgress && request.upload) {
          [uploadThrottled, flushUpload] = progressEventReducer(onUploadProgress);
          request.upload.addEventListener("progress", uploadThrottled);
          request.upload.addEventListener("loadend", flushUpload);
        }
        if (_config.cancelToken || _config.signal) {
          onCanceled = (cancel) => {
            if (!request) {
              return;
            }
            reject(!cancel || cancel.type ? new CanceledError(null, config, request) : cancel);
            request.abort();
            request = null;
          };
          _config.cancelToken && _config.cancelToken.subscribe(onCanceled);
          if (_config.signal) {
            _config.signal.aborted ? onCanceled() : _config.signal.addEventListener("abort", onCanceled);
          }
        }
        const protocol = parseProtocol(_config.url);
        if (protocol && platform.protocols.indexOf(protocol) === -1) {
          reject(new AxiosError("Unsupported protocol " + protocol + ":", AxiosError.ERR_BAD_REQUEST, config));
          return;
        }
        request.send(requestData || null);
      });
    };
    var composeSignals = (signals, timeout) => {
      const { length } = signals = signals ? signals.filter(Boolean) : [];
      if (timeout || length) {
        let controller = new AbortController();
        let aborted;
        const onabort = function(reason) {
          if (!aborted) {
            aborted = true;
            unsubscribe();
            const err = reason instanceof Error ? reason : this.reason;
            controller.abort(err instanceof AxiosError ? err : new CanceledError(err instanceof Error ? err.message : err));
          }
        };
        let timer = timeout && setTimeout(() => {
          timer = null;
          onabort(new AxiosError(`timeout ${timeout} of ms exceeded`, AxiosError.ETIMEDOUT));
        }, timeout);
        const unsubscribe = () => {
          if (signals) {
            timer && clearTimeout(timer);
            timer = null;
            signals.forEach((signal2) => {
              signal2.unsubscribe ? signal2.unsubscribe(onabort) : signal2.removeEventListener("abort", onabort);
            });
            signals = null;
          }
        };
        signals.forEach((signal2) => signal2.addEventListener("abort", onabort));
        const { signal } = controller;
        signal.unsubscribe = () => utils$1.asap(unsubscribe);
        return signal;
      }
    };
    var composeSignals$1 = composeSignals;
    var streamChunk = function* (chunk, chunkSize) {
      let len = chunk.byteLength;
      if (!chunkSize || len < chunkSize) {
        yield chunk;
        return;
      }
      let pos = 0;
      let end;
      while (pos < len) {
        end = pos + chunkSize;
        yield chunk.slice(pos, end);
        pos = end;
      }
    };
    var readBytes = async function* (iterable, chunkSize) {
      for await (const chunk of readStream(iterable)) {
        yield* streamChunk(chunk, chunkSize);
      }
    };
    var readStream = async function* (stream2) {
      if (stream2[Symbol.asyncIterator]) {
        yield* stream2;
        return;
      }
      const reader = stream2.getReader();
      try {
        for (; ; ) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          yield value;
        }
      } finally {
        await reader.cancel();
      }
    };
    var trackStream = (stream2, chunkSize, onProgress, onFinish) => {
      const iterator2 = readBytes(stream2, chunkSize);
      let bytes = 0;
      let done;
      let _onFinish = (e) => {
        if (!done) {
          done = true;
          onFinish && onFinish(e);
        }
      };
      return new ReadableStream({
        async pull(controller) {
          try {
            const { done: done2, value } = await iterator2.next();
            if (done2) {
              _onFinish();
              controller.close();
              return;
            }
            let len = value.byteLength;
            if (onProgress) {
              let loadedBytes = bytes += len;
              onProgress(loadedBytes);
            }
            controller.enqueue(new Uint8Array(value));
          } catch (err) {
            _onFinish(err);
            throw err;
          }
        },
        cancel(reason) {
          _onFinish(reason);
          return iterator2.return();
        }
      }, {
        highWaterMark: 2
      });
    };
    var DEFAULT_CHUNK_SIZE = 64 * 1024;
    var { isFunction } = utils$1;
    var globalFetchAPI = (({ Request, Response }) => ({
      Request,
      Response
    }))(utils$1.global);
    var {
      ReadableStream: ReadableStream$1,
      TextEncoder: TextEncoder$1
    } = utils$1.global;
    var test = (fn, ...args) => {
      try {
        return !!fn(...args);
      } catch (e) {
        return false;
      }
    };
    var factory = (env) => {
      env = utils$1.merge.call({
        skipUndefined: true
      }, globalFetchAPI, env);
      const { fetch: envFetch, Request, Response } = env;
      const isFetchSupported = envFetch ? isFunction(envFetch) : typeof fetch === "function";
      const isRequestSupported = isFunction(Request);
      const isResponseSupported = isFunction(Response);
      if (!isFetchSupported) {
        return false;
      }
      const isReadableStreamSupported = isFetchSupported && isFunction(ReadableStream$1);
      const encodeText = isFetchSupported && (typeof TextEncoder$1 === "function" ? /* @__PURE__ */ ((encoder) => (str) => encoder.encode(str))(new TextEncoder$1()) : async (str) => new Uint8Array(await new Request(str).arrayBuffer()));
      const supportsRequestStream = isRequestSupported && isReadableStreamSupported && test(() => {
        let duplexAccessed = false;
        const hasContentType = new Request(platform.origin, {
          body: new ReadableStream$1(),
          method: "POST",
          get duplex() {
            duplexAccessed = true;
            return "half";
          }
        }).headers.has("Content-Type");
        return duplexAccessed && !hasContentType;
      });
      const supportsResponseStream = isResponseSupported && isReadableStreamSupported && test(() => utils$1.isReadableStream(new Response("").body));
      const resolvers = {
        stream: supportsResponseStream && ((res) => res.body)
      };
      isFetchSupported && (() => {
        ["text", "arrayBuffer", "blob", "formData", "stream"].forEach((type) => {
          !resolvers[type] && (resolvers[type] = (res, config) => {
            let method = res && res[type];
            if (method) {
              return method.call(res);
            }
            throw new AxiosError(`Response type '${type}' is not supported`, AxiosError.ERR_NOT_SUPPORT, config);
          });
        });
      })();
      const getBodyLength = async (body) => {
        if (body == null) {
          return 0;
        }
        if (utils$1.isBlob(body)) {
          return body.size;
        }
        if (utils$1.isSpecCompliantForm(body)) {
          const _request = new Request(platform.origin, {
            method: "POST",
            body
          });
          return (await _request.arrayBuffer()).byteLength;
        }
        if (utils$1.isArrayBufferView(body) || utils$1.isArrayBuffer(body)) {
          return body.byteLength;
        }
        if (utils$1.isURLSearchParams(body)) {
          body = body + "";
        }
        if (utils$1.isString(body)) {
          return (await encodeText(body)).byteLength;
        }
      };
      const resolveBodyLength = async (headers, body) => {
        const length = utils$1.toFiniteNumber(headers.getContentLength());
        return length == null ? getBodyLength(body) : length;
      };
      return async (config) => {
        let {
          url: url2,
          method,
          data,
          signal,
          cancelToken,
          timeout,
          onDownloadProgress,
          onUploadProgress,
          responseType,
          headers,
          withCredentials = "same-origin",
          fetchOptions
        } = resolveConfig(config);
        let _fetch = envFetch || fetch;
        responseType = responseType ? (responseType + "").toLowerCase() : "text";
        let composedSignal = composeSignals$1([signal, cancelToken && cancelToken.toAbortSignal()], timeout);
        let request = null;
        const unsubscribe = composedSignal && composedSignal.unsubscribe && (() => {
          composedSignal.unsubscribe();
        });
        let requestContentLength;
        try {
          if (onUploadProgress && supportsRequestStream && method !== "get" && method !== "head" && (requestContentLength = await resolveBodyLength(headers, data)) !== 0) {
            let _request = new Request(url2, {
              method: "POST",
              body: data,
              duplex: "half"
            });
            let contentTypeHeader;
            if (utils$1.isFormData(data) && (contentTypeHeader = _request.headers.get("content-type"))) {
              headers.setContentType(contentTypeHeader);
            }
            if (_request.body) {
              const [onProgress, flush] = progressEventDecorator(
                requestContentLength,
                progressEventReducer(asyncDecorator(onUploadProgress))
              );
              data = trackStream(_request.body, DEFAULT_CHUNK_SIZE, onProgress, flush);
            }
          }
          if (!utils$1.isString(withCredentials)) {
            withCredentials = withCredentials ? "include" : "omit";
          }
          const isCredentialsSupported = isRequestSupported && "credentials" in Request.prototype;
          const resolvedOptions = {
            ...fetchOptions,
            signal: composedSignal,
            method: method.toUpperCase(),
            headers: headers.normalize().toJSON(),
            body: data,
            duplex: "half",
            credentials: isCredentialsSupported ? withCredentials : void 0
          };
          request = isRequestSupported && new Request(url2, resolvedOptions);
          let response = await (isRequestSupported ? _fetch(request, fetchOptions) : _fetch(url2, resolvedOptions));
          const isStreamResponse = supportsResponseStream && (responseType === "stream" || responseType === "response");
          if (supportsResponseStream && (onDownloadProgress || isStreamResponse && unsubscribe)) {
            const options = {};
            ["status", "statusText", "headers"].forEach((prop) => {
              options[prop] = response[prop];
            });
            const responseContentLength = utils$1.toFiniteNumber(response.headers.get("content-length"));
            const [onProgress, flush] = onDownloadProgress && progressEventDecorator(
              responseContentLength,
              progressEventReducer(asyncDecorator(onDownloadProgress), true)
            ) || [];
            response = new Response(
              trackStream(response.body, DEFAULT_CHUNK_SIZE, onProgress, () => {
                flush && flush();
                unsubscribe && unsubscribe();
              }),
              options
            );
          }
          responseType = responseType || "text";
          let responseData = await resolvers[utils$1.findKey(resolvers, responseType) || "text"](response, config);
          !isStreamResponse && unsubscribe && unsubscribe();
          return await new Promise((resolve, reject) => {
            settle(resolve, reject, {
              data: responseData,
              headers: AxiosHeaders$1.from(response.headers),
              status: response.status,
              statusText: response.statusText,
              config,
              request
            });
          });
        } catch (err) {
          unsubscribe && unsubscribe();
          if (err && err.name === "TypeError" && /Load failed|fetch/i.test(err.message)) {
            throw Object.assign(
              new AxiosError("Network Error", AxiosError.ERR_NETWORK, config, request),
              {
                cause: err.cause || err
              }
            );
          }
          throw AxiosError.from(err, err && err.code, config, request);
        }
      };
    };
    var seedCache = /* @__PURE__ */ new Map();
    var getFetch = (config) => {
      let env = config ? config.env : {};
      const { fetch: fetch2, Request, Response } = env;
      const seeds = [
        Request,
        Response,
        fetch2
      ];
      let len = seeds.length, i = len, seed, target, map = seedCache;
      while (i--) {
        seed = seeds[i];
        target = map.get(seed);
        target === void 0 && map.set(seed, target = i ? /* @__PURE__ */ new Map() : factory(env));
        map = target;
      }
      return target;
    };
    getFetch();
    var knownAdapters = {
      http: httpAdapter,
      xhr: xhrAdapter,
      fetch: {
        get: getFetch
      }
    };
    utils$1.forEach(knownAdapters, (fn, value) => {
      if (fn) {
        try {
          Object.defineProperty(fn, "name", { value });
        } catch (e) {
        }
        Object.defineProperty(fn, "adapterName", { value });
      }
    });
    var renderReason = (reason) => `- ${reason}`;
    var isResolvedHandle = (adapter) => utils$1.isFunction(adapter) || adapter === null || adapter === false;
    var adapters = {
      getAdapter: (adapters2, config) => {
        adapters2 = utils$1.isArray(adapters2) ? adapters2 : [adapters2];
        const { length } = adapters2;
        let nameOrAdapter;
        let adapter;
        const rejectedReasons = {};
        for (let i = 0; i < length; i++) {
          nameOrAdapter = adapters2[i];
          let id;
          adapter = nameOrAdapter;
          if (!isResolvedHandle(nameOrAdapter)) {
            adapter = knownAdapters[(id = String(nameOrAdapter)).toLowerCase()];
            if (adapter === void 0) {
              throw new AxiosError(`Unknown adapter '${id}'`);
            }
          }
          if (adapter && (utils$1.isFunction(adapter) || (adapter = adapter.get(config)))) {
            break;
          }
          rejectedReasons[id || "#" + i] = adapter;
        }
        if (!adapter) {
          const reasons = Object.entries(rejectedReasons).map(
            ([id, state]) => `adapter ${id} ` + (state === false ? "is not supported by the environment" : "is not available in the build")
          );
          let s = length ? reasons.length > 1 ? "since :\n" + reasons.map(renderReason).join("\n") : " " + renderReason(reasons[0]) : "as no adapter specified";
          throw new AxiosError(
            `There is no suitable adapter to dispatch the request ` + s,
            "ERR_NOT_SUPPORT"
          );
        }
        return adapter;
      },
      adapters: knownAdapters
    };
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }
      if (config.signal && config.signal.aborted) {
        throw new CanceledError(null, config);
      }
    }
    function dispatchRequest(config) {
      throwIfCancellationRequested(config);
      config.headers = AxiosHeaders$1.from(config.headers);
      config.data = transformData.call(
        config,
        config.transformRequest
      );
      if (["post", "put", "patch"].indexOf(config.method) !== -1) {
        config.headers.setContentType("application/x-www-form-urlencoded", false);
      }
      const adapter = adapters.getAdapter(config.adapter || defaults$1.adapter, config);
      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);
        response.data = transformData.call(
          config,
          config.transformResponse,
          response
        );
        response.headers = AxiosHeaders$1.from(response.headers);
        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);
          if (reason && reason.response) {
            reason.response.data = transformData.call(
              config,
              config.transformResponse,
              reason.response
            );
            reason.response.headers = AxiosHeaders$1.from(reason.response.headers);
          }
        }
        return Promise.reject(reason);
      });
    }
    var validators$1 = {};
    ["object", "boolean", "number", "function", "string", "symbol"].forEach((type, i) => {
      validators$1[type] = function validator2(thing) {
        return typeof thing === type || "a" + (i < 1 ? "n " : " ") + type;
      };
    });
    var deprecatedWarnings = {};
    validators$1.transitional = function transitional(validator2, version2, message) {
      function formatMessage(opt, desc) {
        return "[Axios v" + VERSION + "] Transitional option '" + opt + "'" + desc + (message ? ". " + message : "");
      }
      return (value, opt, opts) => {
        if (validator2 === false) {
          throw new AxiosError(
            formatMessage(opt, " has been removed" + (version2 ? " in " + version2 : "")),
            AxiosError.ERR_DEPRECATED
          );
        }
        if (version2 && !deprecatedWarnings[opt]) {
          deprecatedWarnings[opt] = true;
          console.warn(
            formatMessage(
              opt,
              " has been deprecated since v" + version2 + " and will be removed in the near future"
            )
          );
        }
        return validator2 ? validator2(value, opt, opts) : true;
      };
    };
    validators$1.spelling = function spelling(correctSpelling) {
      return (value, opt) => {
        console.warn(`${opt} is likely a misspelling of ${correctSpelling}`);
        return true;
      };
    };
    function assertOptions(options, schema, allowUnknown) {
      if (typeof options !== "object") {
        throw new AxiosError("options must be an object", AxiosError.ERR_BAD_OPTION_VALUE);
      }
      const keys = Object.keys(options);
      let i = keys.length;
      while (i-- > 0) {
        const opt = keys[i];
        const validator2 = schema[opt];
        if (validator2) {
          const value = options[opt];
          const result = value === void 0 || validator2(value, opt, options);
          if (result !== true) {
            throw new AxiosError("option " + opt + " must be " + result, AxiosError.ERR_BAD_OPTION_VALUE);
          }
          continue;
        }
        if (allowUnknown !== true) {
          throw new AxiosError("Unknown option " + opt, AxiosError.ERR_BAD_OPTION);
        }
      }
    }
    var validator = {
      assertOptions,
      validators: validators$1
    };
    var validators = validator.validators;
    var Axios = class {
      constructor(instanceConfig) {
        this.defaults = instanceConfig || {};
        this.interceptors = {
          request: new InterceptorManager$1(),
          response: new InterceptorManager$1()
        };
      }
      /**
       * Dispatch a request
       *
       * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
       * @param {?Object} config
       *
       * @returns {Promise} The Promise to be fulfilled
       */
      async request(configOrUrl, config) {
        try {
          return await this._request(configOrUrl, config);
        } catch (err) {
          if (err instanceof Error) {
            let dummy = {};
            Error.captureStackTrace ? Error.captureStackTrace(dummy) : dummy = new Error();
            const stack = dummy.stack ? dummy.stack.replace(/^.+\n/, "") : "";
            try {
              if (!err.stack) {
                err.stack = stack;
              } else if (stack && !String(err.stack).endsWith(stack.replace(/^.+\n.+\n/, ""))) {
                err.stack += "\n" + stack;
              }
            } catch (e) {
            }
          }
          throw err;
        }
      }
      _request(configOrUrl, config) {
        if (typeof configOrUrl === "string") {
          config = config || {};
          config.url = configOrUrl;
        } else {
          config = configOrUrl || {};
        }
        config = mergeConfig(this.defaults, config);
        const { transitional, paramsSerializer, headers } = config;
        if (transitional !== void 0) {
          validator.assertOptions(transitional, {
            silentJSONParsing: validators.transitional(validators.boolean),
            forcedJSONParsing: validators.transitional(validators.boolean),
            clarifyTimeoutError: validators.transitional(validators.boolean)
          }, false);
        }
        if (paramsSerializer != null) {
          if (utils$1.isFunction(paramsSerializer)) {
            config.paramsSerializer = {
              serialize: paramsSerializer
            };
          } else {
            validator.assertOptions(paramsSerializer, {
              encode: validators.function,
              serialize: validators.function
            }, true);
          }
        }
        if (config.allowAbsoluteUrls !== void 0) ;
        else if (this.defaults.allowAbsoluteUrls !== void 0) {
          config.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
        } else {
          config.allowAbsoluteUrls = true;
        }
        validator.assertOptions(config, {
          baseUrl: validators.spelling("baseURL"),
          withXsrfToken: validators.spelling("withXSRFToken")
        }, true);
        config.method = (config.method || this.defaults.method || "get").toLowerCase();
        let contextHeaders = headers && utils$1.merge(
          headers.common,
          headers[config.method]
        );
        headers && utils$1.forEach(
          ["delete", "get", "head", "post", "put", "patch", "common"],
          (method) => {
            delete headers[method];
          }
        );
        config.headers = AxiosHeaders$1.concat(contextHeaders, headers);
        const requestInterceptorChain = [];
        let synchronousRequestInterceptors = true;
        this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
          if (typeof interceptor.runWhen === "function" && interceptor.runWhen(config) === false) {
            return;
          }
          synchronousRequestInterceptors = synchronousRequestInterceptors && interceptor.synchronous;
          requestInterceptorChain.unshift(interceptor.fulfilled, interceptor.rejected);
        });
        const responseInterceptorChain = [];
        this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
          responseInterceptorChain.push(interceptor.fulfilled, interceptor.rejected);
        });
        let promise;
        let i = 0;
        let len;
        if (!synchronousRequestInterceptors) {
          const chain = [dispatchRequest.bind(this), void 0];
          chain.unshift(...requestInterceptorChain);
          chain.push(...responseInterceptorChain);
          len = chain.length;
          promise = Promise.resolve(config);
          while (i < len) {
            promise = promise.then(chain[i++], chain[i++]);
          }
          return promise;
        }
        len = requestInterceptorChain.length;
        let newConfig = config;
        while (i < len) {
          const onFulfilled = requestInterceptorChain[i++];
          const onRejected = requestInterceptorChain[i++];
          try {
            newConfig = onFulfilled(newConfig);
          } catch (error) {
            onRejected.call(this, error);
            break;
          }
        }
        try {
          promise = dispatchRequest.call(this, newConfig);
        } catch (error) {
          return Promise.reject(error);
        }
        i = 0;
        len = responseInterceptorChain.length;
        while (i < len) {
          promise = promise.then(responseInterceptorChain[i++], responseInterceptorChain[i++]);
        }
        return promise;
      }
      getUri(config) {
        config = mergeConfig(this.defaults, config);
        const fullPath = buildFullPath(config.baseURL, config.url, config.allowAbsoluteUrls);
        return buildURL(fullPath, config.params, config.paramsSerializer);
      }
    };
    utils$1.forEach(["delete", "get", "head", "options"], function forEachMethodNoData(method) {
      Axios.prototype[method] = function(url2, config) {
        return this.request(mergeConfig(config || {}, {
          method,
          url: url2,
          data: (config || {}).data
        }));
      };
    });
    utils$1.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
      function generateHTTPMethod(isForm) {
        return function httpMethod(url2, data, config) {
          return this.request(mergeConfig(config || {}, {
            method,
            headers: isForm ? {
              "Content-Type": "multipart/form-data"
            } : {},
            url: url2,
            data
          }));
        };
      }
      Axios.prototype[method] = generateHTTPMethod();
      Axios.prototype[method + "Form"] = generateHTTPMethod(true);
    });
    var Axios$1 = Axios;
    var CancelToken = class _CancelToken {
      constructor(executor) {
        if (typeof executor !== "function") {
          throw new TypeError("executor must be a function.");
        }
        let resolvePromise;
        this.promise = new Promise(function promiseExecutor(resolve) {
          resolvePromise = resolve;
        });
        const token = this;
        this.promise.then((cancel) => {
          if (!token._listeners) return;
          let i = token._listeners.length;
          while (i-- > 0) {
            token._listeners[i](cancel);
          }
          token._listeners = null;
        });
        this.promise.then = (onfulfilled) => {
          let _resolve;
          const promise = new Promise((resolve) => {
            token.subscribe(resolve);
            _resolve = resolve;
          }).then(onfulfilled);
          promise.cancel = function reject() {
            token.unsubscribe(_resolve);
          };
          return promise;
        };
        executor(function cancel(message, config, request) {
          if (token.reason) {
            return;
          }
          token.reason = new CanceledError(message, config, request);
          resolvePromise(token.reason);
        });
      }
      /**
       * Throws a `CanceledError` if cancellation has been requested.
       */
      throwIfRequested() {
        if (this.reason) {
          throw this.reason;
        }
      }
      /**
       * Subscribe to the cancel signal
       */
      subscribe(listener) {
        if (this.reason) {
          listener(this.reason);
          return;
        }
        if (this._listeners) {
          this._listeners.push(listener);
        } else {
          this._listeners = [listener];
        }
      }
      /**
       * Unsubscribe from the cancel signal
       */
      unsubscribe(listener) {
        if (!this._listeners) {
          return;
        }
        const index = this._listeners.indexOf(listener);
        if (index !== -1) {
          this._listeners.splice(index, 1);
        }
      }
      toAbortSignal() {
        const controller = new AbortController();
        const abort = (err) => {
          controller.abort(err);
        };
        this.subscribe(abort);
        controller.signal.unsubscribe = () => this.unsubscribe(abort);
        return controller.signal;
      }
      /**
       * Returns an object that contains a new `CancelToken` and a function that, when called,
       * cancels the `CancelToken`.
       */
      static source() {
        let cancel;
        const token = new _CancelToken(function executor(c) {
          cancel = c;
        });
        return {
          token,
          cancel
        };
      }
    };
    var CancelToken$1 = CancelToken;
    function spread(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    }
    function isAxiosError(payload) {
      return utils$1.isObject(payload) && payload.isAxiosError === true;
    }
    var HttpStatusCode = {
      Continue: 100,
      SwitchingProtocols: 101,
      Processing: 102,
      EarlyHints: 103,
      Ok: 200,
      Created: 201,
      Accepted: 202,
      NonAuthoritativeInformation: 203,
      NoContent: 204,
      ResetContent: 205,
      PartialContent: 206,
      MultiStatus: 207,
      AlreadyReported: 208,
      ImUsed: 226,
      MultipleChoices: 300,
      MovedPermanently: 301,
      Found: 302,
      SeeOther: 303,
      NotModified: 304,
      UseProxy: 305,
      Unused: 306,
      TemporaryRedirect: 307,
      PermanentRedirect: 308,
      BadRequest: 400,
      Unauthorized: 401,
      PaymentRequired: 402,
      Forbidden: 403,
      NotFound: 404,
      MethodNotAllowed: 405,
      NotAcceptable: 406,
      ProxyAuthenticationRequired: 407,
      RequestTimeout: 408,
      Conflict: 409,
      Gone: 410,
      LengthRequired: 411,
      PreconditionFailed: 412,
      PayloadTooLarge: 413,
      UriTooLong: 414,
      UnsupportedMediaType: 415,
      RangeNotSatisfiable: 416,
      ExpectationFailed: 417,
      ImATeapot: 418,
      MisdirectedRequest: 421,
      UnprocessableEntity: 422,
      Locked: 423,
      FailedDependency: 424,
      TooEarly: 425,
      UpgradeRequired: 426,
      PreconditionRequired: 428,
      TooManyRequests: 429,
      RequestHeaderFieldsTooLarge: 431,
      UnavailableForLegalReasons: 451,
      InternalServerError: 500,
      NotImplemented: 501,
      BadGateway: 502,
      ServiceUnavailable: 503,
      GatewayTimeout: 504,
      HttpVersionNotSupported: 505,
      VariantAlsoNegotiates: 506,
      InsufficientStorage: 507,
      LoopDetected: 508,
      NotExtended: 510,
      NetworkAuthenticationRequired: 511
    };
    Object.entries(HttpStatusCode).forEach(([key, value]) => {
      HttpStatusCode[value] = key;
    });
    var HttpStatusCode$1 = HttpStatusCode;
    function createInstance(defaultConfig) {
      const context = new Axios$1(defaultConfig);
      const instance = bind(Axios$1.prototype.request, context);
      utils$1.extend(instance, Axios$1.prototype, context, { allOwnKeys: true });
      utils$1.extend(instance, context, null, { allOwnKeys: true });
      instance.create = function create(instanceConfig) {
        return createInstance(mergeConfig(defaultConfig, instanceConfig));
      };
      return instance;
    }
    var axios = createInstance(defaults$1);
    axios.Axios = Axios$1;
    axios.CanceledError = CanceledError;
    axios.CancelToken = CancelToken$1;
    axios.isCancel = isCancel;
    axios.VERSION = VERSION;
    axios.toFormData = toFormData;
    axios.AxiosError = AxiosError;
    axios.Cancel = axios.CanceledError;
    axios.all = function all(promises) {
      return Promise.all(promises);
    };
    axios.spread = spread;
    axios.isAxiosError = isAxiosError;
    axios.mergeConfig = mergeConfig;
    axios.AxiosHeaders = AxiosHeaders$1;
    axios.formToJSON = (thing) => formDataToJSON(utils$1.isHTMLForm(thing) ? new FormData(thing) : thing);
    axios.getAdapter = adapters.getAdapter;
    axios.HttpStatusCode = HttpStatusCode$1;
    axios.default = axios;
    module2.exports = axios;
  }
});

// lib/Constants.js
var require_Constants = __commonJS({
  "lib/Constants.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
    var isDebugMode = isAnyFileExisted(
      path.resolve(__dirname, "..", "DEBUG_SIGN_FILE"),
      path.resolve(__dirname, "DEBUG_SIGN_FILE")
    );
    module2.exports = {
      isDebugMode,
      prefix: "coding-tracker",
      outputChannelName: "Coding Tracker"
    };
    function isAnyFileExisted(...files) {
      for (const file of files) {
        try {
          if (fs.existsSync(file))
            return true;
        } catch (error) {
          continue;
        }
      }
      return false;
    }
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
          statusBarItem.command = "codingTracker.flushUploads";
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

// lib/localReport/reportAggregator.js
var require_reportAggregator = __commonJS({
  "lib/localReport/reportAggregator.js"(exports2, module2) {
    var path = require("path");
    function buildReportSummary(events) {
      const safeEvents = Array.isArray(events) ? events.filter(Boolean) : [];
      const filteredEvents = safeEvents.filter((event) => Number(event.long) > 0);
      const datedEvents = filteredEvents.filter((event) => Number(event.time) > 0);
      const times = datedEvents.map((event) => Number(event.time));
      const chart24h = build24HourChart(filteredEvents);
      return {
        totals: {
          totalMs: sum(filteredEvents, (event) => Number(event.long) || 0),
          eventCount: filteredEvents.length,
          rangeStart: times.length ? Math.min(...times) : null,
          rangeEnd: times.length ? Math.max(...times.map((time, index) => time + (Number(datedEvents[index].long) || 0))) : null
        },
        chart24h,
        byActivity: toGroups(filteredEvents, (event) => normalizeActivity(event.type)),
        byRepo: toGroups(filteredEvents, (event) => normalizeRepo(event.vcs_repo)),
        byBranch: toGroups(filteredEvents, (event) => normalizeBranch(event.vcs_branch)),
        byExtension: toGroups(
          filteredEvents.filter((event) => shouldIncludeExtension(event.file)),
          (event) => extractExtension(event.file)
        )
      };
    }
    function build24HourChart(events) {
      const now = /* @__PURE__ */ new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1e3;
      const hourMs = 60 * 60 * 1e3;
      const labels = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);
      const reading = new Array(24).fill(0);
      const writing = new Array(24).fill(0);
      const terminal = new Array(24).fill(0);
      for (const event of events) {
        const bucket = toChartBucket(event.type);
        if (!bucket) continue;
        const eventStart = Number(event.time) || 0;
        const duration = Number(event.long) || 0;
        if (eventStart <= 0 || duration <= 0) continue;
        const eventEnd = eventStart + duration;
        const overlapStart = Math.max(eventStart, startOfDay);
        const overlapEnd = Math.min(eventEnd, endOfDay);
        if (overlapEnd <= overlapStart) continue;
        for (let hour = 0; hour < 24; hour += 1) {
          const slotStart = startOfDay + hour * hourMs;
          const slotEnd = slotStart + hourMs;
          const coveredMs = Math.max(0, Math.min(overlapEnd, slotEnd) - Math.max(overlapStart, slotStart));
          if (!coveredMs) continue;
          if (bucket === "reading") reading[hour] += coveredMs;
          if (bucket === "writing") writing[hour] += coveredMs;
          if (bucket === "terminal") terminal[hour] += coveredMs;
        }
      }
      const peakHours = Math.max(
        ...reading.map((_, index) => (reading[index] + writing[index] + terminal[index]) / hourMs),
        0
      );
      const maxHours = peakHours > 0 ? Math.max(0.25, Math.ceil(peakHours * 4) / 4) : 1;
      return {
        title: "Last 24 hours",
        breakdownLabel: "Break down by",
        breakdownOptions: ["Activities"],
        activeBreakdown: "Activities",
        axisUnit: "Minutes",
        labels,
        currentTimeLabel: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
        maxHours,
        series: [
          { key: "reading", label: "Reading", totalMs: sum(reading, (value) => value), values: reading, color: "#50c2ff" },
          { key: "writing", label: "Writing", totalMs: sum(writing, (value) => value), values: writing, color: "#7a5cff" },
          { key: "terminal", label: "Terminal", totalMs: sum(terminal, (value) => value), values: terminal, color: "#c46cff" }
        ]
      };
    }
    function toChartBucket(type) {
      if (type === "open") return "reading";
      if (type === "code") return "writing";
      if (type === "terminal") return "terminal";
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
      return normalizeLabel(value, "unknown");
    }
    function normalizeRepo(value) {
      return normalizeLabel(value, "No repository");
    }
    function normalizeBranch(value) {
      return normalizeLabel(value, "No branch");
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
    module2.exports = {
      buildReportSummary
    };
  }
});

// node_modules/uuid/dist/esm-node/rng.js
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    import_crypto.default.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}
var import_crypto, rnds8Pool, poolPtr;
var init_rng = __esm({
  "node_modules/uuid/dist/esm-node/rng.js"() {
    import_crypto = __toESM(require("crypto"));
    rnds8Pool = new Uint8Array(256);
    poolPtr = rnds8Pool.length;
  }
});

// node_modules/uuid/dist/esm-node/regex.js
var regex_default;
var init_regex = __esm({
  "node_modules/uuid/dist/esm-node/regex.js"() {
    regex_default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
  }
});

// node_modules/uuid/dist/esm-node/validate.js
function validate(uuid) {
  return typeof uuid === "string" && regex_default.test(uuid);
}
var validate_default;
var init_validate = __esm({
  "node_modules/uuid/dist/esm-node/validate.js"() {
    init_regex();
    validate_default = validate;
  }
});

// node_modules/uuid/dist/esm-node/stringify.js
function stringify(arr, offset = 0) {
  const uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
  if (!validate_default(uuid)) {
    throw TypeError("Stringified UUID is invalid");
  }
  return uuid;
}
var byteToHex, stringify_default;
var init_stringify = __esm({
  "node_modules/uuid/dist/esm-node/stringify.js"() {
    init_validate();
    byteToHex = [];
    for (let i = 0; i < 256; ++i) {
      byteToHex.push((i + 256).toString(16).substr(1));
    }
    stringify_default = stringify;
  }
});

// node_modules/uuid/dist/esm-node/v1.js
function v1(options, buf, offset) {
  let i = buf && offset || 0;
  const b = buf || new Array(16);
  options = options || {};
  let node = options.node || _nodeId;
  let clockseq = options.clockseq !== void 0 ? options.clockseq : _clockseq;
  if (node == null || clockseq == null) {
    const seedBytes = options.random || (options.rng || rng)();
    if (node == null) {
      node = _nodeId = [seedBytes[0] | 1, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
    }
    if (clockseq == null) {
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 16383;
    }
  }
  let msecs = options.msecs !== void 0 ? options.msecs : Date.now();
  let nsecs = options.nsecs !== void 0 ? options.nsecs : _lastNSecs + 1;
  const dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 1e4;
  if (dt < 0 && options.clockseq === void 0) {
    clockseq = clockseq + 1 & 16383;
  }
  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === void 0) {
    nsecs = 0;
  }
  if (nsecs >= 1e4) {
    throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
  }
  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq;
  msecs += 122192928e5;
  const tl = ((msecs & 268435455) * 1e4 + nsecs) % 4294967296;
  b[i++] = tl >>> 24 & 255;
  b[i++] = tl >>> 16 & 255;
  b[i++] = tl >>> 8 & 255;
  b[i++] = tl & 255;
  const tmh = msecs / 4294967296 * 1e4 & 268435455;
  b[i++] = tmh >>> 8 & 255;
  b[i++] = tmh & 255;
  b[i++] = tmh >>> 24 & 15 | 16;
  b[i++] = tmh >>> 16 & 255;
  b[i++] = clockseq >>> 8 | 128;
  b[i++] = clockseq & 255;
  for (let n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }
  return buf || stringify_default(b);
}
var _nodeId, _clockseq, _lastMSecs, _lastNSecs, v1_default;
var init_v1 = __esm({
  "node_modules/uuid/dist/esm-node/v1.js"() {
    init_rng();
    init_stringify();
    _lastMSecs = 0;
    _lastNSecs = 0;
    v1_default = v1;
  }
});

// node_modules/uuid/dist/esm-node/parse.js
function parse(uuid) {
  if (!validate_default(uuid)) {
    throw TypeError("Invalid UUID");
  }
  let v;
  const arr = new Uint8Array(16);
  arr[0] = (v = parseInt(uuid.slice(0, 8), 16)) >>> 24;
  arr[1] = v >>> 16 & 255;
  arr[2] = v >>> 8 & 255;
  arr[3] = v & 255;
  arr[4] = (v = parseInt(uuid.slice(9, 13), 16)) >>> 8;
  arr[5] = v & 255;
  arr[6] = (v = parseInt(uuid.slice(14, 18), 16)) >>> 8;
  arr[7] = v & 255;
  arr[8] = (v = parseInt(uuid.slice(19, 23), 16)) >>> 8;
  arr[9] = v & 255;
  arr[10] = (v = parseInt(uuid.slice(24, 36), 16)) / 1099511627776 & 255;
  arr[11] = v / 4294967296 & 255;
  arr[12] = v >>> 24 & 255;
  arr[13] = v >>> 16 & 255;
  arr[14] = v >>> 8 & 255;
  arr[15] = v & 255;
  return arr;
}
var parse_default;
var init_parse = __esm({
  "node_modules/uuid/dist/esm-node/parse.js"() {
    init_validate();
    parse_default = parse;
  }
});

// node_modules/uuid/dist/esm-node/v35.js
function stringToBytes(str) {
  str = unescape(encodeURIComponent(str));
  const bytes = [];
  for (let i = 0; i < str.length; ++i) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
}
function v35_default(name, version2, hashfunc) {
  function generateUUID(value, namespace, buf, offset) {
    if (typeof value === "string") {
      value = stringToBytes(value);
    }
    if (typeof namespace === "string") {
      namespace = parse_default(namespace);
    }
    if (namespace.length !== 16) {
      throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
    }
    let bytes = new Uint8Array(16 + value.length);
    bytes.set(namespace);
    bytes.set(value, namespace.length);
    bytes = hashfunc(bytes);
    bytes[6] = bytes[6] & 15 | version2;
    bytes[8] = bytes[8] & 63 | 128;
    if (buf) {
      offset = offset || 0;
      for (let i = 0; i < 16; ++i) {
        buf[offset + i] = bytes[i];
      }
      return buf;
    }
    return stringify_default(bytes);
  }
  try {
    generateUUID.name = name;
  } catch (err) {
  }
  generateUUID.DNS = DNS;
  generateUUID.URL = URL2;
  return generateUUID;
}
var DNS, URL2;
var init_v35 = __esm({
  "node_modules/uuid/dist/esm-node/v35.js"() {
    init_stringify();
    init_parse();
    DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    URL2 = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
  }
});

// node_modules/uuid/dist/esm-node/md5.js
function md5(bytes) {
  if (Array.isArray(bytes)) {
    bytes = Buffer.from(bytes);
  } else if (typeof bytes === "string") {
    bytes = Buffer.from(bytes, "utf8");
  }
  return import_crypto2.default.createHash("md5").update(bytes).digest();
}
var import_crypto2, md5_default;
var init_md5 = __esm({
  "node_modules/uuid/dist/esm-node/md5.js"() {
    import_crypto2 = __toESM(require("crypto"));
    md5_default = md5;
  }
});

// node_modules/uuid/dist/esm-node/v3.js
var v3, v3_default;
var init_v3 = __esm({
  "node_modules/uuid/dist/esm-node/v3.js"() {
    init_v35();
    init_md5();
    v3 = v35_default("v3", 48, md5_default);
    v3_default = v3;
  }
});

// node_modules/uuid/dist/esm-node/v4.js
function v4(options, buf, offset) {
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return stringify_default(rnds);
}
var v4_default;
var init_v4 = __esm({
  "node_modules/uuid/dist/esm-node/v4.js"() {
    init_rng();
    init_stringify();
    v4_default = v4;
  }
});

// node_modules/uuid/dist/esm-node/sha1.js
function sha1(bytes) {
  if (Array.isArray(bytes)) {
    bytes = Buffer.from(bytes);
  } else if (typeof bytes === "string") {
    bytes = Buffer.from(bytes, "utf8");
  }
  return import_crypto3.default.createHash("sha1").update(bytes).digest();
}
var import_crypto3, sha1_default;
var init_sha1 = __esm({
  "node_modules/uuid/dist/esm-node/sha1.js"() {
    import_crypto3 = __toESM(require("crypto"));
    sha1_default = sha1;
  }
});

// node_modules/uuid/dist/esm-node/v5.js
var v5, v5_default;
var init_v5 = __esm({
  "node_modules/uuid/dist/esm-node/v5.js"() {
    init_v35();
    init_sha1();
    v5 = v35_default("v5", 80, sha1_default);
    v5_default = v5;
  }
});

// node_modules/uuid/dist/esm-node/nil.js
var nil_default;
var init_nil = __esm({
  "node_modules/uuid/dist/esm-node/nil.js"() {
    nil_default = "00000000-0000-0000-0000-000000000000";
  }
});

// node_modules/uuid/dist/esm-node/version.js
function version(uuid) {
  if (!validate_default(uuid)) {
    throw TypeError("Invalid UUID");
  }
  return parseInt(uuid.substr(14, 1), 16);
}
var version_default;
var init_version = __esm({
  "node_modules/uuid/dist/esm-node/version.js"() {
    init_validate();
    version_default = version;
  }
});

// node_modules/uuid/dist/esm-node/index.js
var esm_node_exports = {};
__export(esm_node_exports, {
  NIL: () => nil_default,
  parse: () => parse_default,
  stringify: () => stringify_default,
  v1: () => v1_default,
  v3: () => v3_default,
  v4: () => v4_default,
  v5: () => v5_default,
  validate: () => validate_default,
  version: () => version_default
});
var init_esm_node = __esm({
  "node_modules/uuid/dist/esm-node/index.js"() {
    init_v1();
    init_v3();
    init_v4();
    init_v5();
    init_nil();
    init_version();
    init_validate();
    init_stringify();
    init_parse();
  }
});

// lib/Log.js
var require_Log = __commonJS({
  "lib/Log.js"(exports2, module2) {
    var fs = require("fs");
    var path = require("path");
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
      const { v4: uuidV4 } = (init_esm_node(), __toCommonJS(esm_node_exports));
      const DEBUG_LOG_DIR = path.join(__dirname, "..", "logs");
      try {
        if (!fs.existsSync(DEBUG_LOG_DIR))
          fs.mkdirSync(DEBUG_LOG_DIR);
      } catch (error) {
        logger.error(`create debug log dir (${DEBUG_LOG_DIR}) failed!`, error);
        return;
      }
      const now = /* @__PURE__ */ new Date();
      const rand = uuidV4();
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

// node_modules/tree-kill/index.js
var require_tree_kill = __commonJS({
  "node_modules/tree-kill/index.js"(exports2, module2) {
    "use strict";
    var childProcess = require("child_process");
    var spawn = childProcess.spawn;
    var exec = childProcess.exec;
    module2.exports = function(pid, signal, callback) {
      if (typeof signal === "function" && callback === void 0) {
        callback = signal;
        signal = void 0;
      }
      pid = parseInt(pid);
      if (Number.isNaN(pid)) {
        if (callback) {
          return callback(new Error("pid must be a number"));
        } else {
          throw new Error("pid must be a number");
        }
      }
      var tree = {};
      var pidsToProcess = {};
      tree[pid] = [];
      pidsToProcess[pid] = 1;
      switch (process.platform) {
        case "win32":
          exec("taskkill /pid " + pid + " /T /F", callback);
          break;
        case "darwin":
          buildProcessTree(pid, tree, pidsToProcess, function(parentPid) {
            return spawn("pgrep", ["-P", parentPid]);
          }, function() {
            killAll(tree, signal, callback);
          });
          break;
        // case 'sunos':
        //     buildProcessTreeSunOS(pid, tree, pidsToProcess, function () {
        //         killAll(tree, signal, callback);
        //     });
        //     break;
        default:
          buildProcessTree(pid, tree, pidsToProcess, function(parentPid) {
            return spawn("ps", ["-o", "pid", "--no-headers", "--ppid", parentPid]);
          }, function() {
            killAll(tree, signal, callback);
          });
          break;
      }
    };
    function killAll(tree, signal, callback) {
      var killed = {};
      try {
        Object.keys(tree).forEach(function(pid) {
          tree[pid].forEach(function(pidpid) {
            if (!killed[pidpid]) {
              killPid(pidpid, signal);
              killed[pidpid] = 1;
            }
          });
          if (!killed[pid]) {
            killPid(pid, signal);
            killed[pid] = 1;
          }
        });
      } catch (err) {
        if (callback) {
          return callback(err);
        } else {
          throw err;
        }
      }
      if (callback) {
        return callback();
      }
    }
    function killPid(pid, signal) {
      try {
        process.kill(parseInt(pid, 10), signal);
      } catch (err) {
        if (err.code !== "ESRCH") throw err;
      }
    }
    function buildProcessTree(parentPid, tree, pidsToProcess, spawnChildProcessesList, cb) {
      var ps = spawnChildProcessesList(parentPid);
      var allData = "";
      ps.stdout.on("data", function(data) {
        var data = data.toString("ascii");
        allData += data;
      });
      var onClose = function(code) {
        delete pidsToProcess[parentPid];
        if (code != 0) {
          if (Object.keys(pidsToProcess).length == 0) {
            cb();
          }
          return;
        }
        allData.match(/\d+/g).forEach(function(pid) {
          pid = parseInt(pid, 10);
          tree[parentPid].push(pid);
          tree[pid] = [];
          pidsToProcess[pid] = 1;
          buildProcessTree(pid, tree, pidsToProcess, spawnChildProcessesList, cb);
        });
      };
      ps.on("close", onClose);
    }
  }
});

// lib/LocalServer.js
var require_LocalServer = __commonJS({
  "lib/LocalServer.js"(exports2, module2) {
    var ENABLE_PIPE_SERVER_OUTPUT = false;
    var DEFAULT_PORT = 10345;
    var SILENT_START_SERVER = true;
    var EXECUTE_CWD = `${__dirname}/../node_modules/vscode-coding-tracker-server/`;
    var EXECUTE_CWD_DEV = `${__dirname}/../../vscode-coding-tracker-server`;
    var EXECUTE_SCRIPT = "app.js";
    var EXECUTE_PARAMETERS = [
      "--local",
      "--public-report",
      `-o`,
      `${process.env.USERPROFILE || process.env.HOME}/.coding-tracker/`,
      `--port={0}`,
      `--token={1}`
    ];
    var URL3 = require("url");
    var fs = require("fs");
    var { fork, exec } = require("child_process");
    var vscode = require("vscode");
    var axiosLib = require_axios();
    var axios = axiosLib;
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
    var serverChildProcess = null;
    var isStopping = false;
    var builtinServer = null;
    var storagePath = "";
    function init(extensionContext) {
      var { subscriptions } = extensionContext;
      storagePath = extensionContext && extensionContext.globalStorageUri ? extensionContext.globalStorageUri.fsPath : "";
      subscriptions.push(vscode.commands.registerCommand("codingTracker.showLocalReport", showLocalReport));
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
        axios.get(_getKillURL(), { params: { token: userConfig.token } }).then(
          /** @param {import('axios').AxiosResponse<any>} res */
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
      if (isLocalServerRunningInThisContext) {
        var shouldToastReloadVSCode = false;
        if (userConfig.localMode) {
          if (userConfig.token != newConfig.token || userConfig.url != newConfig.url || newConfig.localMode == false)
            shouldToastReloadVSCode = true;
        } else if (newConfig.localMode == true) {
          shouldToastReloadVSCode = true;
        }
        log.debug(`[ConfigChanged]: please reload vscode to apply it.`);
        shouldToastReloadVSCode && vscode.window.showInformationMessage(
          `SlashCoded: detected your local server configurations changed. Please reload VSCode to apply.`
        );
      }
      userConfig = newConfig;
    }
    function startLocalServer(silent) {
      isStopping = false;
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
            return Object.assign(buildReportSummary(events), {
              desktop: {
                detected: false,
                downloadUrl: "https://lundholm.io/project/slashcoded"
              }
            });
          }
        });
        isLocalServerRunningInThisContext = true;
        statusBar.localServer.turnOn();
        vscode.window.showInformationMessage(`SlashCoded: built-in local server started!`);
        return;
      }
      let cwd = EXECUTE_CWD;
      if (fs.existsSync(EXECUTE_CWD_DEV))
        cwd = EXECUTE_CWD_DEV;
      const s = fork(EXECUTE_SCRIPT, _getLaunchParameters(), { cwd, silent: true, execArgv: [] });
      if (s.stdout) {
        s.stdout.setEncoding("utf8");
        s.stdout.on("data", onServerStdout);
      }
      if (s.stderr) {
        s.stderr.setEncoding("utf8");
        s.stderr.on("data", onServerStderr);
      }
      s.on("error", (err) => {
        isLocalServerRunningInThisContext = false;
        serverChildProcess = null;
        if (!isStopping) _showError(`start local server failed!`, err);
      });
      s.on("close", (code) => {
        isLocalServerRunningInThisContext = false;
        serverChildProcess = null;
        if (code && !isStopping) {
          _showError(`local server exit with code ${code}!(Have you launched another local server?)`, {
            stack: `[Exit] exit code: ${code}`
          });
        } else if (isStopping) {
          try {
            log.debug("[LocalServer] child process closed (stopping=true)");
          } catch (_) {
          }
        }
      });
      serverChildProcess = s;
      isLocalServerRunningInThisContext = true;
      log.debug(`[Launch]: Local server launching...`);
      _checkIsLocalServerStart(!!silent, 0, false);
      function onServerStdout(data) {
        const line = String(data);
        if (!ENABLE_PIPE_SERVER_OUTPUT && line.indexOf("Server started!") < 0)
          return;
        line.split("\n").forEach(
          /** @param {string} it */
          (it) => log.debug(`[LocalServer/stdout]: ${it}`)
        );
      }
      function onServerStderr(data) {
        String(data).split("\n").forEach(
          /** @param {string} it */
          (it) => log.debug(`[LocalServer/stderr]: ${it}`)
        );
      }
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
      isStopping = true;
      log.debug("[Kill]: try to kill local server by tree kill way...");
      if (builtinServer) {
        try {
          builtinServer.close();
        } catch (_) {
        }
        builtinServer = null;
      }
      if (serverChildProcess && serverChildProcess.pid)
        require_tree_kill()(serverChildProcess.pid);
      serverChildProcess = null;
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
      axios.get(_getWelcomeURL()).then(
        /** @param {import('axios').AxiosResponse<any>} res */
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
      var configurations = ext.getConfig("codingTracker"), token = String(configurations.get("uploadToken")), url = String(configurations.get("serverURL")), localMode = Boolean(configurations.get("localServerMode"));
      try {
        const { isDebugMode } = require_Constants();
        if (isDebugMode) {
          const hasUrl = !!url;
          const hasToken = !!token;
          const hasLocalMode = configurations.get("localServerMode") !== void 0;
          if (!hasLocalMode && !hasUrl && !hasToken) {
            url = `http://127.0.0.1:${DEFAULT_PORT}`;
            token = "dev";
            localMode = true;
          }
        }
      } catch (_) {
      }
      url = url.endsWith("/") ? url.slice(0, -1) : url;
      return { url, token, localMode };
    }
    function _showError(errOneLine, errObject) {
      const MENU_ITEM_TEXT = "Show details";
      log.error(`[Error]: ${errOneLine}
${errObject.stack}`);
      vscode.window.showErrorMessage(`SlashCoded: ${errOneLine}`, MENU_ITEM_TEXT).then((item) => item == MENU_ITEM_TEXT ? log.show() : 0);
    }
    function _getLaunchParameters() {
      var ps = [];
      for (let i = 0; i < EXECUTE_PARAMETERS.length; i++)
        ps.push(EXECUTE_PARAMETERS[i].replace("{0}", _getPortInfoFromURL(userConfig.url)).replace("{1}", userConfig.token));
      return ps;
    }
    function _getPortInfoFromURL(url) {
      return String(URL3.parse(url).port || DEFAULT_PORT);
    }
    function _isLocalURL(url) {
      try {
        const u = URL3.parse(url);
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
      if (input && input.forceLocalFallback) return false;
      const connectionMode = input && input.connectionMode ? input.connectionMode : "desktop";
      if (connectionMode !== "desktop") return true;
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
    var crypto4 = require("crypto");
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
      const project = src && (src.proj || src.pcid) || "vscode-local";
      const eventSeed = [
        category,
        safeStartTs,
        segmentEndTs,
        src && src.file || "",
        src && src.vcs_repo || "",
        src && src.vcs_branch || ""
      ].join("|");
      const eventId = `ide-${segmentEndTs}-${crypto4.createHash("sha1").update(eventSeed).digest("hex").slice(0, 12)}`;
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

// package.json
var require_package = __commonJS({
  "package.json"(exports2, module2) {
    module2.exports = {
      name: "vscode-coding-tracker-fork",
      displayName: "Slashcoded Coding tracker",
      description: "Integrates VS Code with the SlashCoded desktop app (lundholm.io/project/slashcoded) to track coding time, file edits, terminal sessions, AI chats, AFK, and sync status through the local report, sync status, history import, and output commands.",
      version: "0.10.4",
      type: "commonjs",
      license: "GPL-3.0",
      publisher: "lundholm",
      author: "pakanatahu",
      icon: "images/slashcoded.png",
      engines: {
        vscode: "^1.1.0",
        node: ">=22.0.0"
      },
      categories: [
        "Other"
      ],
      activationEvents: [
        "onStartupFinished"
      ],
      extensionKind: [
        "ui",
        "workspace"
      ],
      main: "./dist/extension.js",
      dependencies: {
        axios: "^1.7.7",
        "chart.js": "^4.5.1",
        "tree-kill": "^1.2.2",
        uuid: "^8.3.2",
        "vscode-coding-tracker-server": "^0.6.0"
      },
      devDependencies: {
        "@types/node": "^22",
        "@types/vscode": "*",
        "@vscode/vsce": "^2.22.0",
        esbuild: "^0.25.10",
        typescript: "^5.8.3"
      },
      optionalDependencies: {
        "@typescript-eslint/eslint-plugin": "^5.4.0",
        "@typescript-eslint/parser": "^5.4.0",
        eslint: "^8.2.0"
      },
      contributes: {
        configuration: {
          type: "object",
          title: "Coding Tracker configuration",
          properties: {
            "codingTracker.connectionMode": {
              type: "string",
              enum: [
                "desktop",
                "cloud"
              ],
              default: "desktop",
              description: "Connection mode: 'desktop' sends events to the SlashCoded desktop Local API on localhost; 'cloud' sends them to the legacy cloud ingest service."
            },
            "codingTracker.uploadToken": {
              type: "string",
              default: "",
              description: "%cfg.uploadToken%"
            },
            "codingTracker.computerId": {
              type: "string",
              default: "",
              description: "%cfg.computerId%"
            },
            "codingTracker.localServerMode": {
              type: "boolean",
              default: true,
              description: "%cfg.localServerMode%"
            },
            "codingTracker.moreThinkingTime": {
              type: "number",
              default: 0,
              description: "%cfg.moreThinkingTime%"
            },
            "codingTracker.showStatus": {
              type: "boolean",
              default: true,
              description: "%cfg.showStatus%"
            },
            "codingTracker.proxy": {
              type: [
                "string",
                "boolean"
              ],
              default: "auto",
              enum: [
                "auto",
                "no-proxy",
                false
              ],
              description: "%cfg.proxy%"
            },
            "codingTracker.shouldTrackTerminal": {
              type: "boolean",
              default: true,
              description: "Enable or disable tracking of terminal activity."
            },
            "codingTracker.shouldTrackAIChat": {
              type: "boolean",
              default: true,
              description: "Enable or disable tracking of AI chat (Copilot Chat, AIChat, etc.) activity."
            },
            "codingTracker.functionKey": {
              type: "string",
              default: "",
              description: "Azure Function key for authenticated upload endpoints (if required)."
            },
            "codingTracker.overrideOrigin": {
              type: "string",
              default: "",
              description: "Override Origin header (defaults to vscode-extension://<publisher>.<name>)."
            },
            "codingTracker.afkEnabled": {
              type: "boolean",
              default: true,
              description: "Enable AFK detection and pause/resume tracking automatically."
            },
            "codingTracker.afkTimeoutMinutes": {
              type: "number",
              default: 15,
              minimum: 1,
              maximum: 180,
              description: "Minutes of inactivity before entering AFK mode."
            },
            "codingTracker.uploadTimeoutMs": {
              type: "number",
              default: 15e3,
              description: "Timeout in milliseconds for each upload request (default 15000)."
            },
            "codingTracker.desktopDiscoveryTimeoutMs": {
              type: "number",
              default: 500,
              description: "Timeout in milliseconds for desktop app discovery handshake (default 500)."
            },
            "codingTracker.forceLocalFallback": {
              type: "boolean",
              default: false,
              description: "Force local-only fallback storage and report behavior even when Slashcoded Desktop is detected. Useful for testing the built-in local dashboard."
            }
          }
        },
        commands: [
          {
            command: "codingTracker.showLocalReport",
            title: "SlashCoded: Show Local Report",
            category: "SlashCoded"
          },
          {
            command: "codingTracker.showSyncStatus",
            title: "SlashCoded: Show Sync Status",
            category: "SlashCoded"
          },
          {
            command: "codingTracker.queueLocalHistoryForDesktop",
            title: "SlashCoded: Import Local History into Desktop",
            category: "SlashCoded"
          },
          {
            command: "codingTracker.showOutput",
            title: "SlashCoded: Show Output Channel",
            category: "SlashCoded"
          }
        ]
      },
      repository: {
        type: "git",
        url: "https://github.com/pakanatahu/vscode-coding-tracker"
      },
      bugs: {
        url: "https://github.com/pakanatahu/vscode-coding-tracker/issues"
      },
      homepage: "https://github.com/pakanatahu/vscode-coding-tracker#readme",
      scripts: {
        "install-vscode-dts": "node ./lib/vscode.d.ts/FETCH.js",
        start: "./node_modules/.bin/coding-tracker-server",
        test: "npm run setup-i18n",
        "test:node": "node --test test/*.test.js",
        "setup-i18n": "node ./utils/setup-i18n.js",
        bundle: "node ./scripts/esbuild.bundle.mjs",
        package: "node ./scripts/package-vsix.mjs"
      },
      keywords: [
        "vscode",
        "record",
        "report",
        "multi-root ready"
      ]
    };
  }
});

// lib/Uploader.js
var require_Uploader = __commonJS({
  "lib/Uploader.js"(exports2, module2) {
    var vscode = require("vscode");
    var fs = require("fs");
    var path = require("path");
    var crypto4 = require("crypto");
    var ext = require_VSCodeHelper();
    var axiosLib = require_axios();
    var axios = axiosLib;
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
    var DESKTOP_DISCOVERY_KEY = "codingTracker.desktopDiscovery";
    var DESKTOP_TOKEN_KEY = "codingTracker.desktopToken";
    var TRUSTED_SOURCE_KEY = "codingTracker.trustedSource.v1";
    var TRACKING_CONFIG_KEY = "codingTracker.trackingConfig.v1";
    var MAX_QUEUE_AGE_MS = 30 * 24 * 60 * 60 * 1e3;
    var MAX_EVENT_SIZE_BYTES = 16 * 1024;
    var MAX_DURATION_MS = 24 * 60 * 60 * 1e3;
    var MAX_TERMINAL_EVENT_MS = 60 * 60 * 1e3;
    var QUEUE_WARN_THRESHOLD = 1e3;
    var RETRY_BASE_MS = [1e3, 2e3, 5e3, 1e4, 3e4, 6e4];
    var RETRY_MAX_MS = 6e4;
    var TOKEN_REFRESH_WINDOW_MS = 24 * 60 * 60 * 1e3;
    var HANDSHAKE_MIN_INTERVAL_MS = 3e3;
    var TRUST_ENROLL_MIN_INTERVAL_MS = 60 * 1e3;
    var ENFORCEMENT_REFRESH_MS = 6e4;
    var DESKTOP_ENDPOINT_CANDIDATES = ["api/upload", "api/queue/upload"];
    var CLOUD_ENDPOINT_CANDIDATES = ["api/upload", "api/queue/upload", "ajax/upload", "upload", "api/track", "track"];
    var Q = [];
    var uploadURL = "";
    var uploadToken = "";
    var uploadHeader = { "Content-Type": "application/json; charset=utf-8" };
    var uploading = 0;
    var lastUploadStartTs = 0;
    var lastProgressTs = 0;
    var requestTimeoutMs = 15e3;
    var hadShowError = 0;
    var uploadProxy = void 0;
    var endpointCandidates = DESKTOP_ENDPOINT_CANDIDATES.slice();
    var currentEndpointIndex = 0;
    var baseServerURL = "";
    var fallbackBaseServerURL = "";
    var handshakeTimeoutMs = 500;
    var extensionContext = null;
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
    var connectionMode = "desktop";
    var forceLocalFallback = false;
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
        extensionContext = ctx || null;
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
        try {
          const parsed = new URL(url);
          const allCandidates = Array.from(new Set(DESKTOP_ENDPOINT_CANDIDATES.concat(CLOUD_ENDPOINT_CANDIDATES)));
          const clean = allCandidates.reduce((acc, c) => acc.endsWith(c) ? acc.slice(0, -c.length) : acc, parsed.toString());
          baseServerURL = clean.replace(/\/?$/, "/");
        } catch (_) {
          baseServerURL = url.endsWith("/") ? url : url + "/";
        }
        baseServerURL = normalizeApiBase(baseServerURL, connectionMode === "desktop");
        fallbackBaseServerURL = baseServerURL;
        currentEndpointIndex = 0;
        uploadURL = baseServerURL + endpointCandidates[currentEndpointIndex];
        uploadToken = token;
        uploadProxy = proxy;
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
      /** @param {'desktop'|'cloud'} mode */
      setConnectionMode: function(mode) {
        if (mode === "desktop" || mode === "cloud") {
          connectionMode = mode;
          endpointCandidates = (mode === "desktop" ? DESKTOP_ENDPOINT_CANDIDATES : CLOUD_ENDPOINT_CANDIDATES).slice();
          baseServerURL = normalizeApiBase(baseServerURL, mode === "desktop");
          fallbackBaseServerURL = normalizeApiBase(fallbackBaseServerURL, mode === "desktop");
          currentEndpointIndex = 0;
          if (baseServerURL) uploadURL = ensureTrailingSlash(baseServerURL) + endpointCandidates[currentEndpointIndex];
          try {
            log.debug(`uploader connectionMode set to ${mode}`);
          } catch (_) {
          }
        }
      },
      setForceLocalFallback: function(enabled) {
        forceLocalFallback = !!enabled;
        try {
          log.debug(`uploader forceLocalFallback set to ${forceLocalFallback}`);
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
        if (!shouldQueueLiveEvents({ connectionMode, discovery, forceLocalFallback })) {
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
        maxRedirects: 0,
        // Treat all HTTP statuses as "handled" so we can inspect
        // 4xx/5xx bodies instead of throwing.
        validateStatus: () => true
      };
      if (connectionMode === "cloud" && tokenInfo && tokenInfo.token) {
        if (!uploadOptions.headers) uploadOptions.headers = {};
        uploadOptions.headers["Authorization"] = `Bearer ${tokenInfo.token}`;
      }
      const isDesktopUploadEndpoint = connectionMode === "desktop" && /api\/(?:queue\/)?upload/.test(uploadURL);
      if (isDesktopUploadEndpoint) {
        const desktopEvent = mapToDesktopEvent(sendData, item.trackingConfig || trackingConfig);
        uploadOptions.data = JSON.stringify({ events: [desktopEvent] });
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
        if (/api\/(?:queue\/)?upload/.test(uploadURL)) uploadOptions.data = JSON.stringify({ events: [sendData] });
        else uploadOptions.data = JSON.stringify(sendData);
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
      try {
        const cfg = ext.getConfig("codingTracker");
        const functionKey = cfg.get("functionKey");
        const overrideOrigin = cfg.get("overrideOrigin");
        const pkg = require_package();
        const extensionId = `${pkg.publisher}.${pkg.name}`;
        const origin = overrideOrigin && overrideOrigin.trim() || `vscode-extension://${extensionId}`;
        if (!uploadOptions.headers) uploadOptions.headers = {};
        uploadOptions.headers["Origin"] = origin;
        if (functionKey) uploadOptions.headers["x-functions-key"] = functionKey;
      } catch (e) {
        try {
          log.debug("Header injection failed: " + JSON.stringify(e));
        } catch (inner) {
        }
      }
      if (typeof uploadProxy !== "undefined") {
        if (uploadProxy === false || uploadProxy === "no-proxy") {
          uploadOptions.proxy = false;
        } else if (typeof uploadProxy === "string" && uploadProxy.trim()) {
          try {
            const u = new URL(uploadProxy);
            uploadOptions.proxy = { host: u.hostname, port: Number(u.port || (u.protocol === "https:" ? 443 : 80)) };
          } catch (_) {
            const m = String(uploadProxy).match(/^(.+):(\d+)$/);
            if (m) uploadOptions.proxy = { host: m[1], port: Number(m[2]) };
          }
        }
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
        const res = await axios(Object.assign({ url: uploadURL }, uploadOptions));
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
          const enforceActive = enforcementMode === "enforce";
          if (status === 403 && enforceActive && trustedSigned && shouldSignTrustedUpload(uploadURL)) {
            await clearTrustedSource("trusted-rejected", true);
          }
          if (status === 403 && tokenInfo && connectionMode === "cloud") {
            await handleTokenFailure(statusText || "Forbidden");
          }
        } else if (status === 401) {
          success = false;
          if (enforcementMode === "enforce" && trustedSigned && shouldSignTrustedUpload(uploadURL)) {
            await clearTrustedSource("trusted-unauthorized", true);
          }
          if (connectionMode === "cloud") await handleTokenFailure(statusText || "Unauthorized");
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
      if (connectionMode === "cloud") {
        baseServerURL = normalizeApiBase(baseServerURL || fallbackBaseServerURL || "", false);
        if (!baseServerURL) {
          syncOnline = false;
          updateSyncState("No cloud endpoint configured");
          return false;
        }
        uploadURL = baseServerURL + endpointCandidates[currentEndpointIndex];
        return true;
      }
      if (!discovery || now - lastHandshakeAt > HANDSHAKE_MIN_INTERVAL_MS) {
        await discoverDesktop(false);
      }
      if (!discovery) {
        syncOnline = false;
        updateSyncState("Desktop app not detected");
        return false;
      }
      baseServerURL = normalizeApiBase(
        discovery.apiBaseUrl || discovery.publicBaseUrl || baseServerURL || fallbackBaseServerURL || "",
        true
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
            const res = await axios.get(candidate, { timeout: handshakeTimeoutMs });
            if (res && res.status >= 200 && res.status < 300 && res.data) {
              const body = (
                /** @type {any} */
                res.data
              );
              discovery = body;
              baseServerURL = normalizeApiBase(body.apiBaseUrl || body.publicBaseUrl || baseServerURL || fallbackBaseServerURL || "", true);
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
      if (connectionMode !== "desktop") return trackingConfig;
      const now = Date.now();
      if (!force && !shouldRefreshTrackingConfig(lastTrackingConfigFetchAt, now)) return trackingConfig;
      const base = baseServerURL || fallbackBaseServerURL;
      if (!base) return trackingConfig;
      lastTrackingConfigFetchAt = now;
      const url = ensureTrailingSlash(base) + "api/host/tracking-config";
      try {
        const res = await axios.get(url, { timeout: requestTimeoutMs });
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
    function normalizeApiBase(url, desktopMode) {
      const base = ensureTrailingSlash(url || "");
      if (!base) return "";
      if (!desktopMode) return base;
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
        const res = await axios.get(url, { params: { token }, timeout: requestTimeoutMs });
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
        const payload = { clientId: "vscode", clientType: "extension", machineId: machineId || require("os").hostname() };
        const res = await axios.post(url, payload, { timeout: requestTimeoutMs });
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
          clientId: "vscode-extension",
          clientType: "vscode",
          machineId: machineId || require("os").hostname(),
          displayName: "VS Code Extension"
        };
        const res = await axios.post(url, payload, { timeout: requestTimeoutMs, validateStatus: () => true });
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
      if (connectionMode !== "desktop") {
        enforcementMode = null;
        return null;
      }
      const now = Date.now();
      if (enforcementMode && now - lastEnforcementCheckAt < ENFORCEMENT_REFRESH_MS) return enforcementMode;
      const base = baseServerURL || fallbackBaseServerURL;
      if (!base) return null;
      const url = ensureTrailingSlash(base) + ENFORCEMENT_PATH;
      try {
        const res = await axios.get(url, { timeout: requestTimeoutMs, validateStatus: () => true });
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
      if (connectionMode !== "desktop") return false;
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
      const nonce = crypto4.randomBytes(16).toString("hex");
      let pathOnly = "/";
      try {
        pathOnly = new URL(targetUrl).pathname || "/";
      } catch (_) {
      }
      const method = (options.method || "POST").toUpperCase();
      const bodyHash = crypto4.createHash("sha256").update(body).digest("base64");
      const signatureBase = `${method}
${pathOnly}
${timestamp}
${nonce}
${bodyHash}`;
      const signature = crypto4.createHmac("sha256", trustedSource.secret).update(signatureBase).digest("base64");
      if (!options.headers) options.headers = {};
      options.headers["X-Sc-Source-Id"] = trustedSource.sourceId;
      options.headers["X-Sc-Timestamp"] = timestamp;
      options.headers["X-Sc-Nonce"] = nonce;
      options.headers["X-Sc-Signature"] = signature;
      return true;
    }
    async function handleTokenFailure(message) {
      try {
        log.debug("Auth failure, clearing token:", message);
      } catch (_) {
      }
      await clearToken("auth-failed");
      try {
        vscode.window.showWarningMessage("SlashCoded: Desktop token invalid or expired. Requesting a new one...");
      } catch (_) {
      }
      await requestNewToken();
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
      gitApiPromise = gitExtension.activate().then(() => gitExtension.exports && typeof gitExtension.exports.getAPI === "function" ? gitExtension.exports.getAPI(1) : void 0).catch((error) => {
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
      time: "",
      long: 0,
      lang: "",
      file: "",
      proj: "",
      pcid: "",
      vcs_type: "",
      vcs_repo: "",
      vcs_branch: "",
      line: 0,
      char: 0,
      r1: "1",
      r2: ""
    };
    module2.exports = { init, generateOpen, generateCode, generateTerminal, generateChat };
    function init(computerId) {
      lastActiveProject = vscode.workspace.rootPath || UNKNOWN;
      baseUploadObject.pcid = computerId;
    }
    function generateOpen(activeDocument, time, long) {
      return generate("open", activeDocument, time, long);
    }
    function generateCode(activeDocument, time, long) {
      return generate("code", activeDocument, time, long);
    }
    function generate(type, activeDocument, time, long) {
      let obj = Object.assign({}, baseUploadObject);
      let uri = activeDocument.uri;
      let fileName = activeDocument.fileName;
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

// lib/GetProxyConfiguration.js
var require_GetProxyConfiguration = __commonJS({
  "lib/GetProxyConfiguration.js"(exports2, module2) {
    module2.exports = {
      getProxyConfiguration
    };
    function isNull(obj) {
      return typeof obj === "object" && !obj;
    }
    function getProxyConfiguration(cfgHttpProxy, cfgCodingTrackerProxy) {
      if (typeof cfgCodingTrackerProxy === "string") {
        if (cfgCodingTrackerProxy === "" || cfgCodingTrackerProxy === "auto") {
          cfgCodingTrackerProxy = true;
        } else if (cfgCodingTrackerProxy === "noproxy" || cfgCodingTrackerProxy === "no-proxy" || cfgCodingTrackerProxy === "no_proxy") {
          cfgCodingTrackerProxy = false;
        }
      } else if (typeof cfgCodingTrackerProxy === "undefined" || isNull(cfgCodingTrackerProxy)) {
        cfgCodingTrackerProxy = true;
      }
      if (cfgCodingTrackerProxy === true) {
        if (typeof cfgHttpProxy === "string" && cfgHttpProxy)
          return cfgHttpProxy;
        return void 0;
      }
      if (cfgCodingTrackerProxy === false) {
        return false;
      }
      return cfgCodingTrackerProxy;
    }
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
      const i18nJson = getPackageNLSJson();
      return JSON.stringify({
        vscodeAppName: vscodeEnv.appName,
        vscodeAppRoot: vscodeEnv.appRoot,
        vscodeLanguage: vscodeEnv.language,
        packageJsonOk: !!packageJson,
        i18nJsonOk: !!i18nJson,
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
    function getPackageNLSJson() {
      try {
        return JSON.parse(fs.readFileSync(getFilePath("package.nls.json"), "utf8"));
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

// lib/extensionLegacy.js
var require_extensionLegacy = __commonJS({
  "lib/extensionLegacy.js"(exports2) {
    "use strict";
    var vscode = require("vscode");
    var ext = (
      /** @type {any} */
      require_VSCodeHelper()
    );
    var uploader = require_Uploader();
    var log = require_Log();
    var outLog = require_OutputChannelLog();
    var hookFlag = Symbol.for("codingTracker.errorHookInstalled");
    var sharedScope = (
      /** @type {GlobalWithSymbols} */
      /** @type {unknown} */
      global
    );
    if (!sharedScope[hookFlag]) {
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
    var statusBar = require_StatusBarManager();
    var localServer = require_LocalServer();
    var uploadObject = require_UploadObject();
    var { isDebugMode } = require_Constants();
    var { getProxyConfiguration } = require_GetProxyConfiguration();
    var { generateDiagnoseLogFile } = require_EnvironmentProbe();
    var SECOND = 1e3;
    var INGEST_BASE = "https://codingtracker-ingest.azurewebsites.net/";
    var CODING_SHORTEST_UNIT_MS = 5 * SECOND;
    var AT_LEAST_WATCHING_TIME = 5 * SECOND;
    var MAX_ALLOW_NOT_INTENTLY_MS = 60 * SECOND;
    var MAX_CODING_WAIT_TIME = 30 * SECOND;
    var AFK_TIMEOUT_MS = 15 * 60 * SECOND;
    var INVALID_CODING_DOCUMENT_SCHEMES = [
      //there are will be a `onDidChangeTextDocument` with document scheme `git-index`
      //be emitted when you switch document, so ignore it
      "git-index",
      //since 1.9.0 vscode changed `git-index` to `git`, OK, they are refactoring around source control
      //see more: https://code.visualstudio.com/updates/v1_9#_contributable-scm-providers
      "git",
      //when you just look up output channel content, there will be a `onDidChangeTextDocument` be emitted
      "output",
      //This is a edit event emit from you debug console input box
      "input",
      //This scheme is appeared in vscode global replace diff preview editor
      "private",
      //This scheme is used for markdown preview document
      //It will appear when you edit a markdown with aside preview
      "markdown"
    ];
    var EMPTY = { document: null, textEditor: null };
    var moreThinkingTime = 0;
    var trackTerminal = true;
    var trackAIChat = true;
    var trackAFK = true;
    var afkTimeoutMs = AFK_TIMEOUT_MS;
    var activeDocument = null;
    var exclusiveMode = null;
    var lastUserActivity = 0;
    var isAFK = false;
    var afkCheckTimer = null;
    var trackData = {
      openTime: 0,
      lastIntentlyTime: 0,
      firstCodingTime: 0,
      codingLong: 0,
      lastCodingTime: 0
    };
    var activeTerminal = null;
    var terminalOpenTime = 0;
    var terminalPollHandle = null;
    var chatPollHandle = null;
    var lastChatEnumLog = 0;
    var chatPauseHandlers = [];
    var chatResumeHandlers = [];
    var pauseAllChatSessions = (now) => {
      for (const h of chatPauseHandlers) {
        try {
          h(now);
        } catch (e) {
          void e;
        }
      }
    };
    var resumeAllChatSessions = (now) => {
      for (const h of chatResumeHandlers) {
        try {
          h(now);
        } catch (e) {
          void e;
        }
      }
    };
    var resetTrackOpenAndIntentlyTime = (now) => {
      trackData.openTime = trackData.lastIntentlyTime = now;
    };
    function normalizeStart(start, long) {
      try {
        if (typeof start === "number" && start > 0) return start;
      } catch (_) {
      }
      const fallback = Date.now() - (typeof long === "number" && long > 0 ? long : 0);
      return fallback;
    }
    var chatCommandFocusUntil = 0;
    var terminalExclusiveActive = false;
    var heuristicChatActive = false;
    var stopHeuristicChatSession = (reason, preserveExclusive) => {
      void reason;
      void preserveExclusive;
    };
    var chatTabRegex = /copilot|chatgpt|ai\s*chat|codeium.*chat|chat panel|github\.copilot\.chat|^chat$|assistant|ai assistant|codex/i;
    var chatTabSchemes = ["vscode-chat", "vscode-chat-session", "vscode-chat-editor"];
    var chatSchemeRegex = /(chat|assistant)/i;
    var isChatLikeTab = (tab) => {
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
          if (maybeUri && typeof maybeUri.scheme === "string") {
            seenSchemes.add(maybeUri.scheme.toLowerCase());
          }
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
    };
    var activationContext = null;
    function suspendOpenAndCode(now) {
      if (trackData.openTime && now && trackData.openTime < now - AT_LEAST_WATCHING_TIME) {
        uploadOpenTrackData(now);
      }
      if (trackData.codingLong) {
        uploadCodingTrackData();
      }
      trackData.openTime = 0;
      trackData.lastIntentlyTime = 0;
      trackData.firstCodingTime = 0;
      trackData.lastCodingTime = 0;
      trackData.codingLong = 0;
    }
    function resumeOpenAndCode(now) {
      if (!activeDocument) return;
      trackData.openTime = now;
      trackData.lastIntentlyTime = now;
      trackData.firstCodingTime = 0;
      trackData.codingLong = 0;
      trackData.lastCodingTime = 0;
    }
    function pauseOpenTracking(now) {
      if (trackData.openTime && activeDocument) {
        if (trackData.openTime < now - AT_LEAST_WATCHING_TIME) {
          uploadOpenTrackData(now);
        }
        trackData.openTime = 0;
        trackData.lastIntentlyTime = 0;
      }
    }
    function updateModeBasedOnState() {
      if (!statusBar || typeof statusBar.setMode !== "function") return;
      if (isAFK) {
        statusBar.setMode("afk");
        return;
      }
      if (heuristicChatActive) {
        statusBar.setMode("chat");
        return;
      }
      const now = Date.now();
      stopHeuristicChatSession("coding-activity");
      if (exclusiveMode === "chat" || chatCommandFocusUntil > now && exclusiveMode !== "terminal") {
        statusBar.setMode("chat");
        return;
      }
      if (exclusiveMode === "terminal" || terminalExclusiveActive) {
        statusBar.setMode("terminal");
        return;
      }
      if (trackData.firstCodingTime && trackData.lastCodingTime && now - trackData.lastCodingTime <= MAX_CODING_WAIT_TIME + 2e3) {
        statusBar.setMode("coding");
        return;
      }
      if (!windowFocused) {
        statusBar.setMode(null);
        return;
      }
      if (activeDocument) {
        statusBar.setMode("watching");
      } else {
        statusBar.setMode(null);
      }
    }
    function refreshStatusBarMode() {
      try {
        updateModeBasedOnState();
      } catch (_) {
      }
    }
    try {
      const REFRESH_MS = 2e3;
      setInterval(() => {
        try {
          updateModeBasedOnState();
        } catch (_) {
        }
      }, REFRESH_MS);
    } catch (_) {
    }
    function recordUserActivity() {
      const now = Date.now();
      lastUserActivity = now;
      if (isAFK) {
        isAFK = false;
        try {
          if (statusBar && typeof statusBar.setAFKOff === "function") {
            statusBar.setAFKOff();
          }
        } catch (e) {
          if (isDebugMode) log.debug("[AFK] Error updating status bar:", e);
        }
        if (isDebugMode) log.debug("[AFK] User returned from AFK");
        if (!exclusiveMode && activeDocument) {
          resumeOpenAndCode(now);
        }
        updateModeBasedOnState();
        try {
          if (windowFocused) resumeAllChatSessions(now);
        } catch (_) {
        }
      }
    }
    function checkAFKStatus() {
      try {
        if (!lastUserActivity) return;
        const now = Date.now();
        const timeSinceActivity = now - lastUserActivity;
        if (!isAFK && timeSinceActivity > afkTimeoutMs && exclusiveMode === "chat" && windowFocused) {
          lastUserActivity = now;
          return;
        }
        if (!isAFK && timeSinceActivity > afkTimeoutMs) {
          isAFK = true;
          try {
            if (statusBar && typeof statusBar.setAFKOn === "function") {
              statusBar.setAFKOn();
            }
          } catch (e) {
            if (isDebugMode) log.debug("[AFK] Error updating status bar:", e);
          }
          if (isDebugMode) log.debug("[AFK] User went AFK, finalizing active slices");
          if (trackData.openTime && trackData.openTime < now - AT_LEAST_WATCHING_TIME) {
            uploadOpenTrackData(now);
          }
          if (trackData.codingLong) {
            uploadCodingTrackData();
          }
          if (activeTerminal && terminalOpenTime) {
            const duration = now - terminalOpenTime;
            if (duration > 0) {
              uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration).then(uploader.upload);
            }
            terminalOpenTime = 0;
          }
          try {
            pauseAllChatSessions(now);
          } catch (_) {
          }
        }
      } catch (e) {
        if (isDebugMode) log.debug("[AFK] Error in checkAFKStatus:", e);
      }
    }
    function startAFKMonitoring() {
      try {
        if (!trackAFK) {
          if (isDebugMode) log.debug("[AFK] tracking disabled");
          return;
        }
        if (afkCheckTimer) return;
        lastUserActivity = Date.now();
        afkCheckTimer = setInterval(checkAFKStatus, 30 * SECOND);
        if (isDebugMode) log.debug("[AFK] Started AFK monitoring");
      } catch (e) {
        if (isDebugMode) log.debug("[AFK] Error starting AFK monitoring:", e);
      }
    }
    function stopAFKMonitoring() {
      try {
        if (afkCheckTimer) {
          clearInterval(afkCheckTimer);
          afkCheckTimer = null;
        }
        if (isDebugMode) log.debug("[AFK] Stopped AFK monitoring");
      } catch (e) {
        if (isDebugMode) log.debug("[AFK] Error stopping AFK monitoring:", e);
      }
    }
    var windowFocused = true;
    var AUTH_API_BASE = "https://codingtracker-api.azurewebsites.net";
    async function performTokenRefresh(context) {
      try {
        const secrets = context.secrets;
        const storedRefresh = await secrets.get("codingTracker.refreshToken");
        if (!storedRefresh) return false;
        const axios = (
          /** @type {any} */
          require_axios()
        );
        const resp = await axios.post(`${AUTH_API_BASE}/api/token/refresh`, { refreshToken: storedRefresh });
        const uploadToken = resp.data && (resp.data.uploadToken || resp.data.token);
        if (uploadToken) {
          await vscode.workspace.getConfiguration("codingTracker").update("uploadToken", uploadToken, vscode.ConfigurationTarget.Global);
          if (isDebugMode) log.debug("Refreshed upload token via stored refresh token.");
          return true;
        }
        log.debug("Token refresh response missing uploadToken field");
      } catch (e) {
        const err = (
          /** @type {any} */
          e
        );
        if (isDebugMode) log.debug("Token refresh failed: " + (err && err.message ? err.message : err));
      }
      return false;
    }
    async function githubAuthCommand(context) {
      const input = await vscode.window.showInputBox({
        prompt: "Paste your CodingTracker refresh token (from browser after GitHub auth)",
        ignoreFocusOut: true,
        password: true,
        placeHolder: "refresh-token"
      });
      if (!input) {
        vscode.window.showInformationMessage("GitHub auth cancelled.");
        return;
      }
      await context.secrets.store("codingTracker.refreshToken", input);
      const ok = await performTokenRefresh(context);
      if (ok) {
        vscode.window.showInformationMessage("CodingTracker upload token updated successfully.");
      } else {
        vscode.window.showErrorMessage("Failed to refresh upload token. Check the refresh token and try again.");
      }
    }
    function uploadOpenTrackData(now) {
      if (!activeDocument || isIgnoreDocument(activeDocument)) {
        resetTrackOpenAndIntentlyTime(now);
        return;
      }
      if (!trackData.openTime || trackData.openTime <= 0) {
        resetTrackOpenAndIntentlyTime(now);
        return;
      }
      const longest = trackData.lastIntentlyTime + MAX_ALLOW_NOT_INTENTLY_MS + moreThinkingTime;
      const duration = Math.min(now, longest) - trackData.openTime;
      uploadObject.generateOpen(activeDocument, trackData.openTime, duration).then(uploader.upload);
      resetTrackOpenAndIntentlyTime(now);
    }
    function uploadCodingTrackData() {
      if (activeDocument && !isIgnoreDocument(activeDocument)) {
        uploadObject.generateCode(activeDocument, trackData.firstCodingTime, trackData.codingLong).then(uploader.upload);
      }
      trackData.codingLong = trackData.lastCodingTime = trackData.firstCodingTime = 0;
    }
    function isIgnoreDocument(doc) {
      return !doc || doc.uri.scheme == "inmemory";
    }
    var EventHandler = {
      /** @param {vscode.TextEditor} textEditor */
      onIntentlyWatchingCodes: (textEditor) => {
        recordUserActivity();
        const now = Date.now();
        if (!isAFK && exclusiveMode === "terminal") {
          try {
            if (activeTerminal && terminalOpenTime) {
              const duration = now - terminalOpenTime;
              if (duration > 0) uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration).then(uploader.upload);
            }
          } catch (_) {
          }
          activeTerminal = null;
          terminalOpenTime = 0;
          exclusiveMode = null;
          terminalExclusiveActive = false;
          resumeOpenAndCode(now);
          updateModeBasedOnState();
        } else if (!isAFK && exclusiveMode === "chat") {
          try {
            pauseAllChatSessions(now);
          } catch (_) {
          }
          exclusiveMode = null;
          chatCommandFocusUntil = 0;
          resumeOpenAndCode(now);
          updateModeBasedOnState();
        }
        if (isAFK) return;
        if (!textEditor || !textEditor.document)
          return;
        if (now > trackData.lastIntentlyTime + MAX_ALLOW_NOT_INTENTLY_MS + moreThinkingTime) {
          uploadOpenTrackData(now);
        } else {
          trackData.lastIntentlyTime = now;
        }
      },
      /** @param {vscode.TextDocument|null} doc */
      onActiveFileChange: (doc) => {
        recordUserActivity();
        const now = Date.now();
        if (doc) {
          if (exclusiveMode === "terminal") {
            try {
              if (activeTerminal && terminalOpenTime) {
                const duration = now - terminalOpenTime;
                if (duration > 0) {
                  uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration).then(uploader.upload);
                }
              }
            } catch (_) {
            }
            activeTerminal = null;
            terminalOpenTime = 0;
            exclusiveMode = null;
            try {
              updateModeBasedOnState();
            } catch (_) {
            }
          } else if (exclusiveMode === "chat") {
            try {
              pauseAllChatSessions(now);
            } catch (_) {
            }
            exclusiveMode = null;
            chatCommandFocusUntil = 0;
            try {
              updateModeBasedOnState();
            } catch (_) {
            }
          }
        }
        if (isAFK) return;
        if (activeDocument) {
          if (trackData.openTime < now - AT_LEAST_WATCHING_TIME) {
            uploadOpenTrackData(now);
          }
          if (trackData.codingLong) {
            uploadCodingTrackData();
          }
        }
        activeDocument = doc ? doc : null;
        resetTrackOpenAndIntentlyTime(now);
        trackData.codingLong = trackData.lastCodingTime = trackData.firstCodingTime = 0;
      },
      /** @param {vscode.Terminal} terminal */
      onDidOpenTerminal: (terminal) => {
        recordUserActivity();
        stopHeuristicChatSession("terminal-open", true);
        if (isDebugMode) {
          log.debug(`Terminal opened: ${terminal.name}`);
        }
        if (!isAFK && windowFocused) {
          exclusiveMode = "terminal";
          terminalExclusiveActive = true;
          suspendOpenAndCode(Date.now());
          refreshStatusBarMode();
        }
        chatCommandFocusUntil = 0;
        activeTerminal = terminal;
        terminalOpenTime = Date.now();
      },
      /** @param {vscode.Terminal} terminal */
      onDidCloseTerminal: (terminal) => {
        if (isDebugMode) {
          log.debug(`Terminal closed: ${terminal.name}`);
        }
        const allTerms = vscode.window.terminals || [];
        const isSame = activeTerminal && activeTerminal === terminal;
        if (isSame || activeTerminal && !allTerms.includes(activeTerminal)) {
          const duration = Date.now() - terminalOpenTime;
          if (duration > 0) {
            uploadObject.generateTerminal(activeTerminal ? activeTerminal.name : terminal.name, terminalOpenTime, duration).then(uploader.upload);
          }
          activeTerminal = null;
          terminalOpenTime = 0;
          if (exclusiveMode === "terminal") {
            exclusiveMode = null;
            terminalExclusiveActive = false;
            resumeOpenAndCode(Date.now());
            updateModeBasedOnState();
          }
        }
      },
      /** @param {vscode.Terminal | undefined} terminal */
      onDidChangeActiveTerminal: (terminal) => {
        recordUserActivity();
        if (isDebugMode) {
          log.debug(`Active terminal changed: ${terminal ? terminal.name : "None"}`);
        }
        if (activeTerminal && activeTerminal !== (terminal || null)) {
          const duration = Date.now() - terminalOpenTime;
          if (duration > 0) {
            uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration).then(uploader.upload);
          }
        }
        if (terminal) {
          if (windowFocused && !isAFK) {
            stopHeuristicChatSession("terminal-focus", true);
            exclusiveMode = "terminal";
            terminalExclusiveActive = true;
            suspendOpenAndCode(Date.now());
            refreshStatusBarMode();
          }
          chatCommandFocusUntil = 0;
          activeTerminal = terminal;
          terminalOpenTime = Date.now();
        } else {
          activeTerminal = null;
          terminalOpenTime = 0;
          if (exclusiveMode === "terminal") {
            exclusiveMode = null;
            terminalExclusiveActive = false;
            resumeOpenAndCode(Date.now());
            updateModeBasedOnState();
          }
        }
      },
      /** handle window focus changes to prevent runaway terminal timing while unfocused */
      /** @param {vscode.WindowState} state */
      onDidChangeWindowState: (state) => {
        if (!state.focused) {
          windowFocused = false;
          try {
            pauseAllChatSessions(Date.now());
          } catch (e) {
            void e;
          }
          try {
            updateModeBasedOnState();
          } catch (_) {
          }
          if (activeTerminal && terminalOpenTime) {
            const duration = Date.now() - terminalOpenTime;
            if (duration > 0) {
              uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration).then(uploader.upload);
            }
            terminalOpenTime = 0;
          }
        } else {
          if (!windowFocused) {
            windowFocused = true;
            try {
              if (!isAFK) resumeAllChatSessions(Date.now());
            } catch (e) {
              void e;
            }
            if (activeTerminal) {
              terminalOpenTime = Date.now();
            }
          }
        }
      },
      dispose: () => {
        if (activeTerminal) {
          const duration = Date.now() - terminalOpenTime;
          if (duration > 0) {
            uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration).then(uploader.upload);
          }
          activeTerminal = null;
          terminalOpenTime = 0;
        }
      },
      /** onDidChangeTextDocument actual handler */
      /** @param {vscode.TextDocument} doc */
      onFileCoding: (doc) => {
        recordUserActivity();
        if (isAFK || exclusiveMode) return;
        if (!activeDocument)
          return;
        if (!doc || INVALID_CODING_DOCUMENT_SCHEMES.indexOf(doc.uri.scheme) >= 0)
          return;
        if (isDebugMode) {
          const { uri } = doc;
          const { scheme } = uri;
          if (scheme != "file" && scheme != "untitled" && scheme != "debug" && //scheme in vscode user settings (or quick search bar in user settings)
          scheme != "vscode" && //scheme in vscode ineractive playground
          scheme != "walkThroughSnippet") {
            log.debug(ext.dumpDocument(doc));
          }
        }
        const now = Date.now();
        if (now - CODING_SHORTEST_UNIT_MS < trackData.lastCodingTime)
          return;
        if (!trackData.firstCodingTime) {
          pauseOpenTracking(now);
          trackData.firstCodingTime = now;
        } else if (trackData.lastCodingTime < now - MAX_CODING_WAIT_TIME - moreThinkingTime) {
          uploadCodingTrackData();
          trackData.firstCodingTime = now;
        }
        trackData.codingLong += CODING_SHORTEST_UNIT_MS;
        trackData.lastCodingTime = now;
        refreshStatusBarMode();
      }
    };
    async function updateConfigurations() {
      const extensionCfg = ext.getConfig("codingTracker");
      const sanitize = (v) => v === void 0 || v === null || v === "undefined" ? "" : String(v);
      const uploadTokenRaw = extensionCfg.get("uploadToken");
      const connectionModeRaw = extensionCfg.get("connectionMode");
      const computerId = sanitize(extensionCfg.get("computerId"));
      const enableStatusBar = extensionCfg.get("showStatus");
      const mttRaw = extensionCfg.get("moreThinkingTime");
      let mtt = 0;
      if (typeof mttRaw === "number") mtt = mttRaw;
      else if (typeof mttRaw === "string") {
        const parsed = parseInt(mttRaw, 10);
        if (!isNaN(parsed)) mtt = parsed;
      }
      const uploadTokenCfg = sanitize(uploadTokenRaw);
      let uploadToken = "";
      try {
        if (activationContext && activationContext.secrets) {
          const secret = await activationContext.secrets.get("codingTracker.uploadToken");
          if (secret && secret.trim()) {
            uploadToken = secret.trim();
          } else if (uploadTokenCfg) {
            await activationContext.secrets.store("codingTracker.uploadToken", uploadTokenCfg);
            uploadToken = uploadTokenCfg;
            try {
              await vscode.workspace.getConfiguration("codingTracker").update("uploadToken", "", vscode.ConfigurationTarget.Global);
              await vscode.workspace.getConfiguration("codingTracker").update("uploadToken", "", vscode.ConfigurationTarget.Workspace);
            } catch (_) {
            }
            try {
              if (isDebugMode) log.debug("[secrets] migrated uploadToken from settings to secret storage");
            } catch (_) {
            }
            try {
              vscode.window.showInformationMessage("CodingTracker: Upload token migrated to secure storage.");
            } catch (_) {
            }
          }
        } else {
          uploadToken = uploadTokenCfg;
        }
      } catch (e) {
        uploadToken = uploadTokenCfg;
        try {
          if (isDebugMode) log.debug("[secrets] failed to read/migrate secret token", e);
        } catch (_) {
        }
      }
      let connectionMode = "desktop";
      if (typeof connectionModeRaw === "string") {
        const lower = connectionModeRaw.toLowerCase();
        if (lower === "cloud" || lower === "desktop") connectionMode = /** @type {'desktop'|'cloud'} */
        lower;
      }
      const configuredServer = connectionMode === "cloud" ? INGEST_BASE : `http://127.0.0.1:${process.env.SLASHCODED_DESKTOP_PORT || 5292}/`;
      const httpCfg = ext.getConfig("http");
      const baseHttpProxy = httpCfg ? httpCfg.get("proxy") : void 0;
      const overwriteHttpProxy = extensionCfg.get("proxy");
      const proxy = getProxyConfiguration(baseHttpProxy, overwriteHttpProxy);
      trackTerminal = extensionCfg.get("shouldTrackTerminal") !== false;
      trackAIChat = extensionCfg.get("shouldTrackAIChat") !== false;
      trackAFK = extensionCfg.get("afkEnabled") !== false;
      const afkMinRaw = extensionCfg.get("afkTimeoutMinutes");
      if (typeof afkMinRaw === "number") {
        afkTimeoutMs = Math.max(1, Math.min(180, afkMinRaw)) * 60 * SECOND;
      } else if (typeof afkMinRaw === "string") {
        const parsed = parseInt(afkMinRaw, 10);
        if (!isNaN(parsed)) afkTimeoutMs = Math.max(1, Math.min(180, parsed)) * 60 * SECOND;
      } else {
        afkTimeoutMs = AFK_TIMEOUT_MS;
      }
      if (isNaN(mtt)) mtt = 0;
      if (mtt < -15 * SECOND) mtt = -15 * SECOND;
      moreThinkingTime = mtt;
      uploader.set(configuredServer, uploadToken, proxy);
      try {
        uploader.setConnectionMode(connectionMode);
      } catch (e) {
        if (isDebugMode) log.debug("Failed to set connectionMode on uploader", e);
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
      uploadObject.init(computerId || `unknown-${require("os").platform()}`);
      localServer.updateConfig();
      statusBar.init(enableStatusBar);
      try {
        log.debug(`[init] Status bar initialized (enabled=${!!enableStatusBar})`);
      } catch (_) {
      }
      try {
        if (trackAFK) {
          stopAFKMonitoring();
          startAFKMonitoring();
        } else {
          stopAFKMonitoring();
        }
        if (isDebugMode) log.debug(`[AFK] config updated: enabled=${trackAFK}, timeoutMs=${afkTimeoutMs}`);
      } catch (e) {
        if (isDebugMode) log.debug("[AFK] monitor restart failed", e);
      }
      updateModeBasedOnState();
    }
    function activate(context) {
      activationContext = context;
      outLog.start();
      outLog.debug("CodingTracker: activating extension...");
      generateDiagnoseLogFile();
      const subscriptions = context.subscriptions;
      uploadObject.init();
      localServer.init(context);
      uploader.init(context);
      updateConfigurations();
      try {
        void uploader.rediscover();
      } catch (_) {
      }
      vscode.workspace.onDidChangeConfiguration(updateConfigurations);
      EventHandler.onActiveFileChange((vscode.window.activeTextEditor || EMPTY).document || null);
      subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) => EventHandler.onFileCoding((e || EMPTY).document)));
      subscriptions.push(vscode.window.onDidChangeActiveTextEditor((e) => EventHandler.onActiveFileChange((e || EMPTY).document || null)));
      subscriptions.push(vscode.window.onDidChangeTextEditorSelection((e) => EventHandler.onIntentlyWatchingCodes((e || EMPTY).textEditor)));
      startAFKMonitoring();
      subscriptions.push({ dispose: stopAFKMonitoring });
      try {
        const setAfkEnabled = async (enabled) => {
          await vscode.workspace.getConfiguration("codingTracker").update("afkEnabled", enabled, vscode.ConfigurationTarget.Global);
          trackAFK = !!enabled;
          stopAFKMonitoring();
          if (trackAFK) startAFKMonitoring();
          else {
            isAFK = false;
            try {
              statusBar.setAFKOff();
            } catch (_) {
            }
          }
          vscode.window.showInformationMessage(`CodingTracker: AFK ${enabled ? "enabled" : "disabled"}`);
        };
        subscriptions.push(vscode.commands.registerCommand("codingTracker.afkEnable", () => setAfkEnabled(true)));
        subscriptions.push(vscode.commands.registerCommand("codingTracker.afkDisable", () => setAfkEnabled(false)));
        subscriptions.push(vscode.commands.registerCommand("codingTracker.afkToggle", async () => {
          const cfg = vscode.workspace.getConfiguration("codingTracker");
          const cur = cfg.get("afkEnabled") !== false;
          await setAfkEnabled(!cur);
        }));
      } catch (e) {
        if (isDebugMode) log.debug("[AFK] command registration failed", e);
      }
      if (trackTerminal) {
        subscriptions.push(vscode.window.onDidOpenTerminal(EventHandler.onDidOpenTerminal));
        subscriptions.push(vscode.window.onDidCloseTerminal(EventHandler.onDidCloseTerminal));
        subscriptions.push(vscode.window.onDidChangeActiveTerminal((t) => EventHandler.onDidChangeActiveTerminal(t)));
        subscriptions.push(vscode.window.onDidChangeWindowState(EventHandler.onDidChangeWindowState));
        try {
          const t = vscode.window.activeTerminal;
          if (t) {
            EventHandler.onDidChangeActiveTerminal(t);
          }
        } catch (_) {
        }
        try {
          if (!terminalPollHandle) {
            const POLL_MS = 1500;
            if (isDebugMode) log.debug("[terminal-poll] starting poll @", POLL_MS, "ms");
            terminalPollHandle = setInterval(() => {
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
                if (chatUIFocused && activeTerminal) {
                  const duration = Date.now() - terminalOpenTime;
                  if (duration > 0) {
                    uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration).then(uploader.upload);
                    if (isDebugMode) log.debug("[terminal-poll] terminal slice ended (chat focus)");
                  }
                  activeTerminal = null;
                  terminalOpenTime = 0;
                  if (exclusiveMode === "terminal") {
                    exclusiveMode = null;
                    terminalExclusiveActive = false;
                    updateModeBasedOnState();
                  }
                } else if (!chatUIFocused) {
                  if (!current && activeTerminal) {
                    const duration = Date.now() - terminalOpenTime;
                    if (duration > 0) {
                      uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, duration).then(uploader.upload);
                      if (isDebugMode) log.debug("[terminal-poll] synthesized terminal slice (focus lost)");
                    }
                    activeTerminal = null;
                    terminalOpenTime = 0;
                    if (exclusiveMode === "terminal") {
                      exclusiveMode = null;
                      terminalExclusiveActive = false;
                      updateModeBasedOnState();
                    }
                  }
                }
              } catch (_) {
              }
            }, POLL_MS);
            subscriptions.push({ dispose: () => {
              if (terminalPollHandle) {
                clearInterval(terminalPollHandle);
                terminalPollHandle = null;
              }
            } });
          }
        } catch (e) {
          if (isDebugMode) log.debug("terminal poll init failed", e);
        }
      }
      try {
        const anyCommands = (
          /** @type {any} */
          vscode.commands
        );
        if (anyCommands && typeof anyCommands.onDidExecuteCommand === "function") {
          subscriptions.push(anyCommands.onDidExecuteCommand((e) => {
            try {
              recordUserActivity();
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
                if (!isAFK && windowFocused) {
                  stopHeuristicChatSession("terminal-command", true);
                  exclusiveMode = "terminal";
                  terminalExclusiveActive = true;
                  suspendOpenAndCode(now);
                  refreshStatusBarMode();
                  if (!activeTerminal && vscode.window.activeTerminal) {
                    activeTerminal = vscode.window.activeTerminal;
                    terminalOpenTime = now;
                  } else if (activeTerminal && !terminalOpenTime) {
                    terminalOpenTime = now;
                  }
                }
              } else if (/(copilot|chat|assistant|gpt|codeium)/i.test(id) || /workbench\..*chat/i.test(id) || /github\.copilot\./i.test(id)) {
                if (!isAFK && windowFocused) {
                  exclusiveMode = "chat";
                  suspendOpenAndCode(now);
                  refreshStatusBarMode();
                  chatCommandFocusUntil = now + 3e4;
                }
              } else if (/workbench\.action\.focus.*Editor/i.test(id)) {
                if (exclusiveMode === "terminal") {
                  if (activeTerminal && terminalOpenTime) {
                    const dur = now - terminalOpenTime;
                    if (dur > 0) uploadObject.generateTerminal(activeTerminal.name, terminalOpenTime, dur).then(uploader.upload);
                  }
                  activeTerminal = null;
                  terminalOpenTime = 0;
                  exclusiveMode = null;
                  chatCommandFocusUntil = 0;
                  resumeOpenAndCode(now);
                  updateModeBasedOnState();
                } else if (exclusiveMode === "chat") {
                  try {
                    pauseAllChatSessions(now);
                  } catch (_) {
                  }
                  exclusiveMode = null;
                  chatCommandFocusUntil = 0;
                  resumeOpenAndCode(now);
                  updateModeBasedOnState();
                }
              }
            } catch (_) {
            }
          }));
        }
      } catch (_) {
      }
      try {
        subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(() => recordUserActivity()));
      } catch (_) {
      }
      try {
        const anyWindow = (
          /** @type {any} */
          vscode.window
        );
        if (anyWindow.tabGroups && typeof anyWindow.tabGroups.onDidChangeTabs === "function") {
          subscriptions.push(anyWindow.tabGroups.onDidChangeTabs(() => recordUserActivity()));
        }
        if (typeof vscode.window.onDidChangeTerminalState === "function") {
          subscriptions.push(vscode.window.onDidChangeTerminalState((term) => {
            try {
              recordUserActivity();
              if (term === vscode.window.activeTerminal && term && term.state && term.state.isInteractedWith) {
                const now = Date.now();
                if (!isAFK && windowFocused) {
                  stopHeuristicChatSession("terminal-state", true);
                  exclusiveMode = "terminal";
                  terminalExclusiveActive = true;
                  suspendOpenAndCode(now);
                  refreshStatusBarMode();
                  if (!activeTerminal || activeTerminal.name !== term.name) {
                    activeTerminal = term;
                    terminalOpenTime = now;
                  }
                }
              }
            } catch (_) {
            }
          }));
        }
      } catch (_) {
      }
      try {
        subscriptions.push(vscode.window.onDidChangeWindowState((state) => {
          if (state.focused) recordUserActivity();
        }));
      } catch (_) {
      }
      if (trackAIChat) {
        const maybeChat = (
          /** @type {any} */
          vscode.chat
        );
        const hasNative = !!(maybeChat && typeof maybeChat.onDidOpenChatSession === "function" && typeof maybeChat.onDidDisposeChatSession === "function");
        try {
          if (isDebugMode) {
            log.debug("[chat-native] vscode.chat available =", !!maybeChat, "handlers =", hasNative ? "ok" : "missing");
          }
        } catch (_) {
        }
        let nativeChatActiveCount = 0;
        const chatSliceIntervalSec = 120;
        const enableHeuristics = true;
        const heuristicIdleMs = 6e4;
        const heuristicLossGraceMs = 4e3;
        const heuristicSchemes = ["vscode-chat", "vscode-chat-session", "vscode-chat-editor"];
        const heuristicLangs = ["copilot-chat", "chat"];
        const heuristicFilePatterns = [
          /copilot.*chat/i,
          /chatgpt/i,
          /ai[- ]?chat/i
        ];
        const emitChatSlice = (provider, sessionId, start, now, heuristic, seq, isFinal) => {
          const duration = now - start;
          uploadObject.generateChat(provider, sessionId, start, duration, 0, 0).then((obj) => {
            const markers = [];
            if (heuristic) markers.push("heuristic");
            if (typeof seq === "number") markers.push("seq=" + seq);
            if (isFinal) markers.push("final");
            const markerStr = markers.join(";");
            obj.r2 = obj.r2 ? obj.r2 + (markerStr ? ";" + markerStr : "") : markerStr;
            uploader.upload(obj);
          });
        };
        if (hasNative) {
          const chatSessions = /* @__PURE__ */ new Map();
          const onDidOpenChatSession = (session) => {
            try {
              recordUserActivity();
            } catch (_) {
            }
            const start = Date.now();
            let providerId = "unknown";
            try {
              if (session && session.provider) {
                providerId = session.provider.id || session.provider.label || "unknown";
              } else if (session && session.providerId) {
                providerId = session.providerId;
              }
            } catch (_) {
            }
            try {
              if (isDebugMode) log.debug("[chat-native] onDidOpenChatSession", "id=", session && session.id, "provider=", providerId);
            } catch (_) {
            }
            exclusiveMode = "chat";
            suspendOpenAndCode(start);
            refreshStatusBarMode();
            nativeChatActiveCount++;
            chatSessions.set(session.id, { provider: providerId, start, lastSliceTime: start, seq: 0 });
            emitChatSlice(providerId, session.id, start, start, false, 0, false);
          };
          subscriptions.push(maybeChat.onDidOpenChatSession(onDidOpenChatSession));
          if (chatSliceIntervalSec > 0) {
            const intervalHandle = setInterval(() => {
              const now = Date.now();
              for (const [id, rec] of chatSessions.entries()) {
                if (!windowFocused || isAFK || rec.paused) continue;
                if (now - rec.lastSliceTime >= chatSliceIntervalSec * 1e3) {
                  rec.seq += 1;
                  emitChatSlice(rec.provider, id, rec.start, now, false, rec.seq, false);
                  rec.lastSliceTime = now;
                }
              }
            }, Math.min(chatSliceIntervalSec * 1e3, 5 * 60 * 1e3));
            subscriptions.push({ dispose: () => clearInterval(intervalHandle) });
          }
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
                rec.seq += 1;
                emitChatSlice(rec.provider, session.id, rec.start, now, false, rec.seq, true);
                chatSessions.delete(session.id);
                nativeChatActiveCount = Math.max(0, nativeChatActiveCount - 1);
                if (chatSessions.size === 0 && exclusiveMode === "chat") {
                  exclusiveMode = null;
                  resumeOpenAndCode(now);
                  updateModeBasedOnState();
                }
              }
            })
          ));
          chatPauseHandlers.push((now) => {
            try {
              if (isDebugMode) log.debug("[chat-native] pause-all at", new Date(now).toISOString());
            } catch (_) {
            }
            for (const [id, rec] of chatSessions.entries()) {
              if (rec.paused) continue;
              rec.seq += 1;
              emitChatSlice(rec.provider, id, rec.start, now, false, rec.seq, true);
              rec.paused = true;
            }
          });
          chatResumeHandlers.push((now) => {
            try {
              if (isDebugMode) log.debug("[chat-native] resume-all at", new Date(now).toISOString());
            } catch (_) {
            }
            for (const [id, rec] of chatSessions.entries()) {
              if (!rec.paused) continue;
              rec.paused = false;
              rec.start = now;
              rec.lastSliceTime = now;
              rec.seq += 1;
              emitChatSlice(rec.provider, id, rec.start, now, false, rec.seq, false);
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
            heuristicSession.seq += 1;
            if (nativeChatActiveCount === 0) {
              emitChatSlice(providerName, heuristicSession.id, heuristicSession.start, heuristicSession.lastSeen, true, heuristicSession.seq, true);
            }
            if (isDebugMode) log.debug("[chat-heuristic] session end", heuristicSession.id, reason);
            heuristicSession = null;
            heuristicLossSince = 0;
            heuristicChatActive = false;
            refreshStatusBarMode();
            if (!preserveExclusive && exclusiveMode === "chat") {
              exclusiveMode = null;
              chatCommandFocusUntil = 0;
              resumeOpenAndCode(now);
              updateModeBasedOnState();
            }
          };
          const detectChatTabActive = () => {
            try {
              const anyWindow = (
                /** @type {any} */
                vscode.window
              );
              const groups = anyWindow.tabGroups && anyWindow.tabGroups.all ? anyWindow.tabGroups.all : [];
              const labels = [];
              for (const g of groups) {
                if (!g || !g.activeTab) continue;
                const t = g.activeTab;
                const label = t.label || "";
                const viewType = t.viewType || "";
                labels.push(label + (viewType && viewType !== label ? "<" + viewType + ">" : ""));
                if (isChatLikeTab(t)) {
                  return true;
                }
              }
              const now = Date.now();
              if (isDebugMode && now - lastChatEnumLog > 15e3) {
                lastChatEnumLog = now;
                if (labels.length) log.debug("[chat-heuristic] tab labels (no-hit):", labels.join(" | "));
              }
            } catch (_) {
            }
            return false;
          };
          const scanEditors = () => {
            if (isAFK || !windowFocused) return;
            if (exclusiveMode === "terminal") {
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
            if (chatLike || chatTabActive) {
              heuristicChatActive = true;
              heuristicLossSince = 0;
              const stickyNow = Date.now();
              chatCommandFocusUntil = Math.max(chatCommandFocusUntil, stickyNow + 1e4);
              if (exclusiveMode !== "chat") {
                exclusiveMode = "chat";
                suspendOpenAndCode(now);
                refreshStatusBarMode();
              }
              if (!heuristicSession) {
                heuristicSession = { id: genSessionId(), start: now, lastSeen: now, provider: providerName, seq: 0, nextSliceTs: now + chatSliceIntervalSec * 1e3 };
                if (nativeChatActiveCount === 0) {
                  emitChatSlice(providerName, heuristicSession.id, heuristicSession.start, heuristicSession.start, true, 0, false);
                }
                if (isDebugMode) log.debug("[chat-heuristic] session start", heuristicSession.id, chatLike ? "editor" : "tab");
                try {
                  const now2 = Date.now();
                  if (activeDocument) {
                    if (trackData.openTime && trackData.openTime < now2 - AT_LEAST_WATCHING_TIME) uploadOpenTrackData(now2);
                    if (trackData.codingLong) uploadCodingTrackData();
                  }
                } catch (_) {
                }
              } else {
                heuristicSession.lastSeen = now;
              }
            } else if (heuristicSession) {
              if (!heuristicLossSince) heuristicLossSince = now;
              if (now - heuristicLossSince > heuristicLossGraceMs) {
                stopHeuristicChatSession("focus-loss");
              }
            } else {
              heuristicChatActive = false;
              heuristicLossSince = 0;
            }
          };
          const startHeuristicLoop = () => {
            if (heuristicTimer) return;
            heuristicTimer = setInterval(() => {
              scanEditors();
              if (heuristicSession) {
                const now = Date.now();
                if (isAFK || !windowFocused) {
                  stopHeuristicChatSession("afk-unfocused");
                  return;
                }
                if (now - heuristicSession.lastSeen > heuristicIdleMs) {
                  stopHeuristicChatSession("idle-timeout");
                } else if (chatSliceIntervalSec > 0 && now >= heuristicSession.nextSliceTs) {
                  heuristicSession.seq += 1;
                  if (nativeChatActiveCount === 0) {
                    emitChatSlice(providerName, heuristicSession.id, heuristicSession.start, now, true, heuristicSession.seq, false);
                  }
                  heuristicSession.nextSliceTs = now + chatSliceIntervalSec * 1e3;
                  if (isDebugMode) log.debug("[chat-heuristic] periodic slice", heuristicSession && heuristicSession.id, "seq", heuristicSession.seq);
                }
              }
            }, Math.min(Math.max(15e3, chatSliceIntervalSec > 0 ? chatSliceIntervalSec * 1e3 : 3e4), 5 * 60 * 1e3));
          };
          scanEditors();
          startHeuristicLoop();
          subscriptions.push(vscode.window.onDidChangeVisibleTextEditors(scanEditors));
          try {
            const anyWindow = (
              /** @type {any} */
              vscode.window
            );
            if (anyWindow.tabGroups && typeof anyWindow.tabGroups.onDidChangeTabs === "function") {
              subscriptions.push(anyWindow.tabGroups.onDidChangeTabs(() => {
                try {
                  if (isDebugMode) log.debug("[chat-heuristic] tab change event");
                  scanEditors();
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
            if (!chatPollHandle) {
              const CHAT_POLL_MS = 3e3;
              if (isDebugMode) log.debug("[chat-poll] starting poll @", CHAT_POLL_MS, "ms");
              chatPollHandle = setInterval(() => {
                try {
                  if (!heuristicSession) return;
                  if (!windowFocused) return;
                  if (detectChatTabActive()) {
                    try {
                      recordUserActivity();
                    } catch (_) {
                    }
                    heuristicSession.lastSeen = Date.now();
                    if (isDebugMode) log.debug("[chat-poll] refreshed lastSeen", heuristicSession.id);
                  }
                } catch (_) {
                }
              }, CHAT_POLL_MS);
              subscriptions.push({ dispose: () => {
                if (chatPollHandle) {
                  clearInterval(chatPollHandle);
                  chatPollHandle = null;
                }
              } });
            }
          } catch (_) {
          }
          chatPauseHandlers.push((now) => {
            if (!heuristicSession) return;
            heuristicSession.seq += 1;
            if (nativeChatActiveCount === 0) {
              emitChatSlice(providerName, heuristicSession.id, heuristicSession.start, heuristicSession.lastSeen || now, true, heuristicSession.seq, true);
            }
            heuristicSession = null;
          });
        }
      }
      try {
        const originalGenerateOpen = uploadObject.generateOpen;
        uploadObject.generateOpen = function(doc, start, duration) {
          const safeStart = normalizeStart(start, duration);
          const maybe = originalGenerateOpen.call(uploadObject, doc, safeStart, duration);
          return maybe.then((obj) => {
            try {
              if (doc && doc.languageId === "plaintext" && /untitled/i.test(doc.fileName || "")) {
                const firstLine = doc.lineCount > 0 ? doc.lineAt(0).text : "";
                if (/chat|copilot/i.test(firstLine)) {
                  const safeChatStart = normalizeStart(start, duration);
                  uploadObject.generateChat("heuristic.chat.openMirror", "mirror-" + Date.now().toString(36), safeChatStart, duration, 0, 0).then((o) => {
                    o.r2 = o.r2 ? o.r2 + ";heuristic-mirror" : "heuristic-mirror";
                    uploader.upload(o);
                  });
                }
              }
            } catch (_) {
            }
            return obj;
          });
        };
      } catch (e) {
        if (isDebugMode) log.debug("Failed to install open->chat mirror safeguard", e);
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
        uploadObject.generateChat = function(provider, sessionId, start, duration, promptChars, responseChars) {
          return origGenChat.call(uploadObject, provider, sessionId, normalizeStart(start, duration), duration, promptChars, responseChars);
        };
      } catch (e) {
        if (isDebugMode) log.debug("Failed to wrap generateChat", e);
      }
      const formatTimestamp = (ts) => {
        if (!ts) return "Unknown";
        try {
          const d = new Date(ts);
          const delta = Date.now() - ts;
          const ago = delta > 0 ? `${Math.floor(delta / 1e3)}s ago` : "just now";
          return `${d.toLocaleString()} (${ago})`;
        } catch (_) {
          return "Unknown";
        }
      };
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
            {
              label: "Force upload queued events now",
              action: "flush"
            },
            {
              label: "Re-discover Desktop App",
              action: "rediscover"
            }
          ]
        );
        const pick = await vscode.window.showQuickPick(items, { placeHolder: "Slashcoded sync status" });
        if (!pick) return;
        if (pick.action === "flush") {
          try {
            uploader.forceDrain();
            vscode.window.showInformationMessage("CodingTracker: Upload queue flush requested.");
          } catch (e) {
            log.error(e);
          }
        } else if (pick.action === "rediscover") {
          try {
            await uploader.rediscover();
            vscode.window.showInformationMessage("CodingTracker: Desktop re-discovery triggered.");
          } catch (e) {
            log.error(e);
          }
        }
      };
      subscriptions.push(vscode.commands.registerCommand("codingTracker.showSyncStatus", () => showSyncStatus()));
      subscriptions.push(vscode.commands.registerCommand("codingTracker.rediscoverDesktop", async () => {
        try {
          await uploader.rediscover();
          vscode.window.showInformationMessage("CodingTracker: Desktop re-discovery triggered.");
        } catch (e) {
          log.error(e);
        }
      }));
      subscriptions.push(vscode.commands.registerCommand("codingTracker.githubAuth", () => githubAuthCommand(context)));
      subscriptions.push(vscode.commands.registerCommand("codingTracker.setUploadToken", async () => {
        try {
          const val = await vscode.window.showInputBox({ prompt: "Enter CodingTracker upload token", password: true, ignoreFocusOut: true });
          if (!val) return;
          if (activationContext && activationContext.secrets) {
            await activationContext.secrets.store("codingTracker.uploadToken", val.trim());
            await updateConfigurations();
            vscode.window.showInformationMessage("CodingTracker: Upload token saved to secure storage.");
          } else {
            await vscode.workspace.getConfiguration("codingTracker").update("uploadToken", val.trim(), vscode.ConfigurationTarget.Global);
            await updateConfigurations();
            vscode.window.showWarningMessage("CodingTracker: Secret storage unavailable. Token saved in settings instead.");
          }
        } catch (e) {
          log.error(e);
        }
      }));
      subscriptions.push(vscode.commands.registerCommand("codingTracker.flushUploads", () => {
        try {
          uploader.flush();
          vscode.window.showInformationMessage("CodingTracker: flush triggered");
        } catch (e) {
          log.error(e);
        }
      }));
      subscriptions.push(vscode.commands.registerCommand("codingTracker.dumpChatDetection", () => {
        try {
          const anyWindow = (
            /** @type {any} */
            vscode.window
          );
          const groups = anyWindow.tabGroups && anyWindow.tabGroups.all ? anyWindow.tabGroups.all : [];
          const summaries = groups.map(
            /** @param {any} g */
            (g) => {
              if (!g || !g.activeTab) return "empty-group";
              const t = g.activeTab;
              return (t.label || "<?>") + (t.viewType ? "<" + t.viewType + ">" : "");
            }
          );
          const editors = (vscode.window.visibleTextEditors || []).map((ed) => {
            try {
              return `${ed.document.uri.scheme}:${ed.document.languageId}:${ed.document.fileName.split(/[/\\]/).pop()}`;
            } catch (_) {
              return "editor-error";
            }
          });
          const logCommands = async () => {
            try {
              const cmds = await vscode.commands.getCommands(true);
              const hits = cmds.filter((id) => /(copilot|chat|assistant|gpt|codeium)/i.test(id));
              log.debug("[chat-dump] commands=", hits.join(" | "));
            } catch (e) {
              log.debug("[chat-dump] getCommands failed", e);
            }
          };
          log.debug("[chat-dump] tabGroups=", summaries.join(" || "), " editors=", editors.join(" || "));
          logCommands().finally(() => vscode.window.showInformationMessage("Chat detection snapshot logged."));
        } catch (e) {
          log.debug("[chat-dump] failed", e);
        }
      }));
      subscriptions.push(vscode.commands.registerCommand("codingTracker.probeChatContexts", async () => {
        try {
          const keys = [
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
          const hits = [];
          for (const k of keys) {
            const v = await vscode.commands.executeCommand("vscode.getContextKeyValue", k).then(Boolean, () => false);
            if (v) hits.push(k);
          }
          log.debug("[chat-ctx] probe hits =", hits.join(", ") || "<none>");
          vscode.window.showInformationMessage(`Chat context probe logged (${hits.length} hits)`);
        } catch (e) {
          log.debug("[chat-ctx] probe failed", e);
        }
      }));
      subscriptions.push(vscode.commands.registerCommand("codingTracker.showOutput", () => {
        try {
          require_OutputChannelLog().show();
        } catch (_) {
        }
      }));
      subscriptions.push(vscode.commands.registerCommand("codingTracker.chatTrackToggle", async () => {
        const now = Date.now();
        if (exclusiveMode === "chat") {
          try {
            pauseAllChatSessions(now);
          } catch (_) {
          }
          exclusiveMode = null;
          chatCommandFocusUntil = 0;
          resumeOpenAndCode(now);
          updateModeBasedOnState();
          vscode.window.showInformationMessage("CodingTracker: Chat tracking OFF");
        } else {
          exclusiveMode = "chat";
          suspendOpenAndCode(now);
          refreshStatusBarMode();
          chatCommandFocusUntil = now + 5 * 60 * 1e3;
          updateModeBasedOnState();
          vscode.window.showInformationMessage("CodingTracker: Chat tracking ON");
        }
      }));
      subscriptions.push(vscode.commands.registerCommand("codingTracker.chatFocus", async () => {
        const now = Date.now();
        try {
          const candidates = [
            "workbench.action.chat.open",
            "workbench.action.chat.focus",
            "workbench.view.chat",
            "workbench.panel.chat.view.focus",
            "github.copilot.chat.toggleChat",
            "github.copilot.chat.open",
            "github.copilot.chat.focus"
          ];
          const cmds = await vscode.commands.getCommands(true);
          const chosen = candidates.find((c) => cmds.includes(c));
          if (chosen) {
            await vscode.commands.executeCommand(chosen);
          }
        } catch (_) {
        }
        exclusiveMode = "chat";
        suspendOpenAndCode(now);
        refreshStatusBarMode();
        chatCommandFocusUntil = now + 6e4;
        updateModeBasedOnState();
      }));
    }
    function deactivate() {
      EventHandler.onActiveFileChange(null);
      EventHandler.dispose();
      localServer.dispose();
      try {
        if (terminalPollHandle) {
          clearInterval(terminalPollHandle);
          terminalPollHandle = null;
        }
      } catch (_) {
      }
      try {
        if (chatPollHandle) {
          clearInterval(chatPollHandle);
          chatPollHandle = null;
        }
      } catch (_) {
      }
      log.end();
    }
    exports2.activate = activate;
    exports2.deactivate = deactivate;
  }
});

// lib/core/runtime.js
var require_runtime = __commonJS({
  "lib/core/runtime.js"(exports2, module2) {
    "use strict";
    var { createDefaultTrackingConfig } = require_hostTiming();
    var SECOND = 1e3;
    var INGEST_BASE = "https://codingtracker-ingest.azurewebsites.net/";
    var AUTH_API_BASE = "https://codingtracker-api.azurewebsites.net";
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
            ((_) => {
            })
          ),
          resumeAll: (
            /** @type {(now:number)=>void} */
            ((_) => {
            })
          ),
          stopHeuristicSession: (
            /** @type {(reason?:string, preserveExclusive?:boolean)=>void} */
            ((_) => {
            })
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
      INGEST_BASE,
      AUTH_API_BASE,
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
      const hookFlag = Symbol.for("codingTracker.errorHookInstalled");
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
    var log = require_Log();
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
      const { vscode, ext, uploader, log, statusBar, localServer, uploadObject, state, activationContext, applyAfkConfig } = deps;
      const extensionCfg = ext.getConfig("codingTracker");
      const sanitize = (v) => v === void 0 || v === null || v === "undefined" ? "" : String(v);
      const uploadTokenRaw = extensionCfg.get("uploadToken");
      const connectionModeRaw = extensionCfg.get("connectionMode");
      const forceLocalFallback = extensionCfg.get("forceLocalFallback") === true;
      const computerId = sanitize(extensionCfg.get("computerId"));
      const enableStatusBar = extensionCfg.get("showStatus");
      const mttRaw = extensionCfg.get("moreThinkingTime");
      let mtt = 0;
      if (typeof mttRaw === "number") mtt = mttRaw;
      else if (typeof mttRaw === "string") {
        const parsed = parseInt(mttRaw, 10);
        if (!isNaN(parsed)) mtt = parsed;
      }
      const uploadTokenCfg = sanitize(uploadTokenRaw);
      let uploadToken = "";
      try {
        if (activationContext && activationContext.secrets) {
          const secret = await activationContext.secrets.get("codingTracker.uploadToken");
          if (secret && secret.trim()) {
            uploadToken = secret.trim();
          } else if (uploadTokenCfg) {
            await activationContext.secrets.store("codingTracker.uploadToken", uploadTokenCfg);
            uploadToken = uploadTokenCfg;
            try {
              await vscode.workspace.getConfiguration("codingTracker").update("uploadToken", "", vscode.ConfigurationTarget.Global);
              await vscode.workspace.getConfiguration("codingTracker").update("uploadToken", "", vscode.ConfigurationTarget.Workspace);
            } catch (_) {
            }
            try {
              vscode.window.showInformationMessage("SlashCoded: Upload token migrated to secure storage.");
            } catch (_) {
            }
          }
        } else {
          uploadToken = uploadTokenCfg;
        }
      } catch (e) {
        uploadToken = uploadTokenCfg;
        try {
          log.debug("[secrets] failed to read/migrate secret token", e);
        } catch (_) {
        }
      }
      let connectionMode = "desktop";
      if (typeof connectionModeRaw === "string") {
        const lower = connectionModeRaw.toLowerCase();
        if (lower === "cloud" || lower === "desktop") connectionMode = /** @type {'desktop'|'cloud'} */
        lower;
      }
      const configuredServer = connectionMode === "cloud" ? runtime.INGEST_BASE : `http://127.0.0.1:${process.env.SLASHCODED_DESKTOP_PORT || 5292}/`;
      const httpCfg = ext.getConfig("http");
      const baseHttpProxy = httpCfg ? httpCfg.get("proxy") : void 0;
      const overwriteHttpProxy = extensionCfg.get("proxy");
      const { getProxyConfiguration } = require_GetProxyConfiguration();
      const proxy = getProxyConfiguration(baseHttpProxy, overwriteHttpProxy);
      state.trackTerminal = extensionCfg.get("shouldTrackTerminal") !== false;
      state.trackAIChat = extensionCfg.get("shouldTrackAIChat") !== false;
      const afkEnabled = extensionCfg.get("afkEnabled") !== false;
      const idleThresholdSeconds = state.hostTrackingConfig && state.hostTrackingConfig.idleThresholdSeconds ? state.hostTrackingConfig.idleThresholdSeconds : DEFAULT_IDLE_THRESHOLD_SECONDS;
      const afkTimeoutMs = idleThresholdSeconds * runtime.SECOND;
      state.trackAFK = afkEnabled;
      state.afkTimeoutMs = afkTimeoutMs;
      if (isNaN(mtt)) mtt = 0;
      if (mtt < -15 * runtime.SECOND) mtt = -15 * runtime.SECOND;
      state.moreThinkingTimeMs = mtt;
      uploader.set(configuredServer, uploadToken, proxy);
      try {
        uploader.setConnectionMode(connectionMode);
      } catch (e) {
        log.debug("Failed to set connectionMode on uploader", e);
      }
      try {
        uploader.setForceLocalFallback(forceLocalFallback);
      } catch (e) {
        log.debug("Failed to set forceLocalFallback on uploader", e);
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
      uploadObject.init(computerId || `unknown-${require("os").platform()}`);
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
      const { vscode, ext, log, isDebugMode, state, mode } = deps;
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
      const { vscode, log, isDebugMode, statusBar, state, uploadObject, uploader, openCode, mode } = deps;
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
            for (const [id, rec] of chatSessions.entries()) {
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
    var { generateDiagnoseLogFile } = require_EnvironmentProbe();
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
      generateDiagnoseLogFile();
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
      registerUtilityCommands(context, configDeps);
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
    function registerUtilityCommands(context, configDeps) {
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
      subscriptions.push(vscode.commands.registerCommand("codingTracker.showSyncStatus", () => showSyncStatus()));
      subscriptions.push(vscode.commands.registerCommand("codingTracker.queueLocalHistoryForDesktop", async () => {
        try {
          const result = await uploader.queueLocalHistoryForDesktop();
          const importedCount = result && typeof result.importedCount === "number" ? result.importedCount : 0;
          vscode.window.showInformationMessage(importedCount > 0 ? `SlashCoded: queued ${importedCount} local event${importedCount === 1 ? "" : "s"} for Desktop ingestion.` : "SlashCoded: no local-only history found to queue.");
        } catch (e) {
          log.error(e);
        }
      }));
      subscriptions.push(vscode.commands.registerCommand("codingTracker.showOutput", () => {
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
module.exports = process.env.CODING_TRACKER_USE_LEGACY === "1" ? require_extensionLegacy() : require_extensionMain();
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
/*! Bundled license information:

mime-db/index.js:
  (*!
   * mime-db
   * Copyright(c) 2014 Jonathan Ong
   * MIT Licensed
   *)

mime-types/index.js:
  (*!
   * mime-types
   * Copyright(c) 2014 Jonathan Ong
   * Copyright(c) 2015 Douglas Christopher Wilson
   * MIT Licensed
   *)

axios/dist/node/axios.cjs:
  (*! Axios v1.12.2 Copyright (c) 2025 Matt Zabriskie and contributors *)
*/
