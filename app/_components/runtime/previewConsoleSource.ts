/**
 * The `console` (and error reporting) installed inside every preview
 * iframe, as source text.
 *
 * It has to be text: the frame is an opaque-origin `srcdoc` document with
 * no module graph of its own, so everything it runs arrives inline in the
 * composed HTML. That makes it the one piece of this codebase a type
 * checker never sees, which is why `__tests__/previewConsole.test.ts`
 * evaluates this source against a fake window and asserts what it posts.
 *
 * Deliberately ES5-flavoured: it runs inside arbitrary learner documents,
 * including quirks-mode ones, before anything else on the page.
 *
 * Values are rendered here rather than in the parent because a live DOM
 * node, a function or a circular object cannot cross `postMessage` at all.
 * The rendering rules follow Node's `util.inspect` (the same ones
 * `nodeInspect.ts` implements for the almostnode playgrounds) so a reader
 * moving between playgrounds sees one console, not two.
 */

/** Longest value rendering before it is elided, per argument. */
const MAX_VALUE_CHARS = 2000;

/**
 * `console` + `window.onerror` + storage shims for a preview frame.
 *
 * `post(msg)` is supplied by the surrounding bridge, which stamps the run
 * token on each message and forwards it to the parent.
 */
export const PREVIEW_CONSOLE_SOURCE = String.raw`
var MAX_DEPTH = 4;
var MAX_ITEMS = 100;
var MAX_VALUE_CHARS = ${MAX_VALUE_CHARS};

function isIdent(k) { return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k); }

function quote(s) {
  var q = s.indexOf("'") === -1 ? "'" : (s.indexOf('"') === -1 ? '"' : "'");
  var out = "";
  for (var i = 0; i < s.length; i++) {
    var c = s.charAt(i);
    if (c === q || c === "\\") out += "\\" + c;
    else if (c === "\n") out += "\\n";
    else if (c === "\t") out += "\\t";
    else if (c === "\r") out += "\\r";
    else out += c;
  }
  return q + out + q;
}

function fnLabel(v) {
  var src = "";
  try { src = Function.prototype.toString.call(v); } catch (e) { src = ""; }
  var kind = src.indexOf("class") === 0 ? "class" : "Function";
  return v.name ? "[" + kind + ": " + v.name + "]" : "[" + kind + " (anonymous)]";
}

function ctorName(v) {
  try {
    var proto = Object.getPrototypeOf(v);
    if (proto === null) return "[Object: null prototype]";
    var n = proto.constructor && proto.constructor.name;
    return n && n !== "Object" ? n : "";
  } catch (e) { return ""; }
}

// Node's rendering, in the subset a browser page can produce.
function describe(v, depth, seen) {
  if (v === null) return "null";
  var t = typeof v;
  if (t === "undefined") return "undefined";
  if (t === "string") return depth === 0 ? v : quote(v);
  if (t === "number") return Object.is(v, -0) ? "-0" : String(v);
  if (t === "bigint") return String(v) + "n";
  if (t === "boolean") return String(v);
  if (t === "symbol") return v.toString();
  if (t === "function") return fnLabel(v);
  if (v instanceof Error) {
    var stack = "";
    try { stack = String(v.stack || ""); } catch (e) { stack = ""; }
    var head = (v.name || "Error") + (v.message ? ": " + v.message : "");
    // mapLocations comes from the bridge this source is spliced into; it
    // rewrites composed-document frames into editor files.
    var body = stack && v.message && stack.indexOf(v.message) !== -1 ? stack : head;
    return typeof mapLocations === "function" ? mapLocations(body) : body;
  }
  if (v instanceof RegExp) return String(v);
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? "Invalid Date" : v.toISOString();
  }
  if (typeof Node !== "undefined" && v instanceof Node) {
    if (v.nodeType === 1) {
      var html = v.outerHTML || ("<" + v.nodeName.toLowerCase() + ">");
      return html.length > 200 ? html.slice(0, 200) + "…" : html;
    }
    return "[" + v.nodeName + "]";
  }
  if (seen.indexOf(v) !== -1) return "[Circular *1]";
  if (typeof Promise !== "undefined" && v instanceof Promise) {
    return "Promise { <pending> }";
  }
  var i;
  if (typeof Map !== "undefined" && v instanceof Map) {
    if (depth >= MAX_DEPTH) return "[Map]";
    seen.push(v);
    var mparts = [];
    var mit = v.entries();
    var mnext = mit.next();
    while (!mnext.done && mparts.length < MAX_ITEMS) {
      mparts.push(
        describe(mnext.value[0], depth + 1, seen) + " => " +
        describe(mnext.value[1], depth + 1, seen),
      );
      mnext = mit.next();
    }
    if (v.size > mparts.length) {
      mparts.push("... " + (v.size - mparts.length) + " more item" + (v.size - mparts.length === 1 ? "" : "s"));
    }
    seen.pop();
    return "Map(" + v.size + ") " + (mparts.length ? "{ " + mparts.join(", ") + " }" : "{}");
  }
  if (typeof Set !== "undefined" && v instanceof Set) {
    if (depth >= MAX_DEPTH) return "[Set]";
    seen.push(v);
    var sparts = [];
    var sit = v.values();
    var snext = sit.next();
    while (!snext.done && sparts.length < MAX_ITEMS) {
      sparts.push(describe(snext.value, depth + 1, seen));
      snext = sit.next();
    }
    if (v.size > sparts.length) {
      sparts.push("... " + (v.size - sparts.length) + " more item" + (v.size - sparts.length === 1 ? "" : "s"));
    }
    seen.pop();
    return "Set(" + v.size + ") " + (sparts.length ? "{ " + sparts.join(", ") + " }" : "{}");
  }
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(v) && !(v instanceof DataView)) {
    var tname = ctorName(v) || "TypedArray";
    var tcells = [];
    for (i = 0; i < v.length && i < MAX_ITEMS; i++) tcells.push(String(v[i]));
    if (v.length > MAX_ITEMS) tcells.push("... " + (v.length - MAX_ITEMS) + " more items");
    return tname + "(" + v.length + ") " + (tcells.length ? "[ " + tcells.join(", ") + " ]" : "[]");
  }
  if (depth >= MAX_DEPTH) return Array.isArray(v) ? "[Array]" : "[Object]";
  seen.push(v);
  var out;
  if (Array.isArray(v)) {
    var items = [];
    for (i = 0; i < v.length && i < MAX_ITEMS; i++) {
      items.push(i in v ? describe(v[i], depth + 1, seen) : "<1 empty item>");
    }
    if (v.length > MAX_ITEMS) {
      items.push("... " + (v.length - MAX_ITEMS) + " more item" + (v.length - MAX_ITEMS === 1 ? "" : "s"));
    }
    out = items.length ? "[ " + items.join(", ") + " ]" : "[]";
  } else {
    var keys = [];
    try { keys = Object.keys(v); } catch (e) { keys = []; }
    var parts = [];
    for (var k = 0; k < keys.length && k < MAX_ITEMS; k++) {
      var key = keys[k];
      parts.push((isIdent(key) ? key : quote(key)) + ": " + describe(v[key], depth + 1, seen));
    }
    if (keys.length > MAX_ITEMS) parts.push("... " + (keys.length - MAX_ITEMS) + " more items");
    var tag = ctorName(v);
    var body = parts.length ? "{ " + parts.join(", ") + " }" : "{}";
    out = tag ? tag + " " + body : body;
  }
  seen.pop();
  return out;
}

function render(v) {
  var text;
  try { text = describe(v, 0, []); } catch (e) { text = "[unrenderable value]"; }
  return text.length > MAX_VALUE_CHARS ? text.slice(0, MAX_VALUE_CHARS) + "…" : text;
}

// util.format's specifiers, minus the ones a text pane cannot honour: %c
// takes its CSS argument and prints nothing.
var SPECIFIER = /%[sdifjoOc%]/g;

function fmt(args) {
  var parts = [];
  var first = args[0];
  var start = 0;
  if (typeof first === "string" && args.length > 1 && SPECIFIER.test(first)) {
    SPECIFIER.lastIndex = 0;
    var next = 1;
    var head = first.replace(SPECIFIER, function (spec) {
      if (spec === "%%") return "%";
      if (next >= args.length) return spec;
      var a = args[next++];
      if (spec === "%s") {
        return typeof a === "string" ? a : render(a);
      }
      if (spec === "%d" || spec === "%i") {
        if (typeof a === "bigint") return String(a) + "n";
        if (typeof a === "symbol") return "NaN";
        var n = Number(a);
        return spec === "%i" ? String(parseInt(String(n), 10)) : String(n);
      }
      if (spec === "%f") return String(parseFloat(String(a)));
      if (spec === "%j") {
        try { return JSON.stringify(a); } catch (e) { return "[Circular]"; }
      }
      if (spec === "%c") return "";
      return render(a);
    });
    parts.push(head);
    start = next;
  }
  for (var i = start; i < args.length; i++) parts.push(render(args[i]));
  return parts.join(" ");
}

// ─── console ───────────────────────────────────────────────────────────

var groupDepth = 0;
var counts = {};
var timers = {};

function indent(text) {
  if (groupDepth === 0) return text;
  var pad = new Array(groupDepth + 1).join("  ");
  return text.split("\n").map(function (line) { return pad + line; }).join("\n");
}

function emit(level, text) {
  post({ t: "console", level: level, text: indent(text) });
}

function duration(ms) {
  if (ms >= 60000) {
    var minutes = Math.floor(ms / 60000);
    var seconds = (ms % 60000) / 1000;
    var s = seconds.toFixed(3);
    while (s.length < 6) s = "0" + s;
    return minutes + ":" + s + " (m:ss.mmm)";
  }
  if (ms >= 1000) return (ms / 1000).toFixed(3) + "s";
  return ms.toFixed(3) + "ms";
}

// console.table, drawn the way Node draws it.
function tableCell(v) {
  if (v === undefined) return "";
  return typeof v === "string" ? quote(v) : render(v);
}

function isPlainRow(v) {
  return v !== null && typeof v === "object" && !(v instanceof Date) &&
    !(v instanceof RegExp) && !(v instanceof Error);
}

function formatTable(data, columns) {
  if (data === null || typeof data !== "object") return render(data);
  var entries = [];
  var i;
  if (Array.isArray(data)) {
    for (i = 0; i < data.length; i++) entries.push([String(i), data[i]]);
  } else {
    var dkeys = Object.keys(data);
    for (i = 0; i < dkeys.length; i++) entries.push([dkeys[i], data[dkeys[i]]]);
  }
  var keys = [];
  var hasValues = false;
  for (i = 0; i < entries.length; i++) {
    var row = entries[i][1];
    if (isPlainRow(row)) {
      var rk = Object.keys(row);
      for (var j = 0; j < rk.length; j++) {
        if (keys.indexOf(rk[j]) === -1) keys.push(rk[j]);
      }
    } else {
      hasValues = true;
    }
  }
  if (columns) keys = columns.slice();
  var header = ["(index)"].concat(keys);
  if (hasValues) header.push("Values");
  var rows = [header];
  for (i = 0; i < entries.length; i++) {
    var value = entries[i][1];
    var cells = [entries[i][0]];
    for (var c = 0; c < keys.length; c++) {
      cells.push(isPlainRow(value) && keys[c] in value ? tableCell(value[keys[c]]) : "");
    }
    if (hasValues) cells.push(isPlainRow(value) ? "" : tableCell(value));
    rows.push(cells);
  }
  var widths = [];
  for (c = 0; c < header.length; c++) {
    var w = 0;
    for (i = 0; i < rows.length; i++) {
      if (rows[i][c].length > w) w = rows[i][c].length;
    }
    widths.push(w);
  }
  function rule(left, mid, right) {
    var segs = [];
    for (var x = 0; x < widths.length; x++) segs.push(new Array(widths[x] + 3).join("─"));
    return left + segs.join(mid) + right;
  }
  function line(cells) {
    var segs = [];
    for (var x = 0; x < cells.length; x++) {
      var cell = cells[x];
      while (cell.length < widths[x]) cell += " ";
      segs.push(" " + cell + " ");
    }
    return "│" + segs.join("│") + "│";
  }
  var body = [rule("┌", "┬", "┐"), line(rows[0]), rule("├", "┼", "┤")];
  for (i = 1; i < rows.length; i++) body.push(line(rows[i]));
  body.push(rule("└", "┴", "┘"));
  return body.join("\n");
}

function callerStack() {
  var stack = "";
  try { stack = String(new Error().stack || ""); } catch (e) { stack = ""; }
  var lines = stack.split("\n");
  // Drop the Error line and this helper's own frame.
  return lines.slice(2).join("\n");
}

var nativeConsole = {};
var LEVELS = ["log", "info", "warn", "error", "debug"];
for (var li = 0; li < LEVELS.length; li++) {
  nativeConsole[LEVELS[li]] = console[LEVELS[li]] ? console[LEVELS[li]].bind(console) : null;
}

function wrap(level) {
  return function () {
    var args = Array.prototype.slice.call(arguments);
    var text;
    try { text = fmt(args); } catch (e) { text = "[unserializable console arguments]"; }
    emit(level, text);
    if (nativeConsole[level]) nativeConsole[level].apply(null, args);
  };
}

console.log = wrap("log");
console.info = wrap("info");
console.warn = wrap("warn");
console.error = wrap("error");
console.debug = wrap("debug");

console.group = function () {
  var args = Array.prototype.slice.call(arguments);
  if (args.length > 0) emit("log", fmt(args));
  groupDepth++;
};
console.groupCollapsed = console.group;
console.groupEnd = function () {
  if (groupDepth > 0) groupDepth--;
};

console.count = function (label) {
  var key = label === undefined ? "default" : String(label);
  counts[key] = (counts[key] || 0) + 1;
  emit("log", key + ": " + counts[key]);
};
console.countReset = function (label) {
  var key = label === undefined ? "default" : String(label);
  counts[key] = 0;
};

console.time = function (label) {
  var key = label === undefined ? "default" : String(label);
  if (Object.prototype.hasOwnProperty.call(timers, key)) {
    emit("warn", "Warning: Label '" + key + "' already exists for console.time()");
    return;
  }
  timers[key] = (typeof performance !== "undefined" && performance.now)
    ? performance.now() : Date.now();
};
function elapsed(key) {
  var now = (typeof performance !== "undefined" && performance.now)
    ? performance.now() : Date.now();
  return now - timers[key];
}
console.timeLog = function (label) {
  var key = label === undefined ? "default" : String(label);
  if (!Object.prototype.hasOwnProperty.call(timers, key)) {
    emit("warn", "Warning: No such label '" + key + "' for console.timeLog()");
    return;
  }
  var rest = Array.prototype.slice.call(arguments, 1);
  var extra = rest.length ? " " + fmt(rest) : "";
  emit("log", key + ": " + duration(elapsed(key)) + extra);
};
console.timeEnd = function (label) {
  var key = label === undefined ? "default" : String(label);
  if (!Object.prototype.hasOwnProperty.call(timers, key)) {
    emit("warn", "Warning: No such label '" + key + "' for console.timeEnd()");
    return;
  }
  var ms = elapsed(key);
  delete timers[key];
  emit("log", key + ": " + duration(ms));
};

console.assert = function (condition) {
  if (condition) return;
  var rest = Array.prototype.slice.call(arguments, 1);
  emit("error", rest.length ? "Assertion failed: " + fmt(rest) : "Assertion failed");
};

console.table = function (data, columns) {
  var text;
  try { text = formatTable(data, columns); } catch (e) { text = render(data); }
  emit("log", text);
};

console.dir = function (value) { emit("log", render(value)); };
console.dirxml = function () { console.log.apply(console, arguments); };

console.trace = function () {
  var args = Array.prototype.slice.call(arguments);
  var head = args.length ? "Trace: " + fmt(args) : "Trace";
  var stack = callerStack();
  if (stack && typeof mapLocations === "function") stack = mapLocations(stack);
  emit("error", stack ? head + "\n" + stack : head);
};

console.clear = function () { post({ t: "clear" }); };
`;

/**
 * In-memory `localStorage`/`sessionStorage`, as source text.
 *
 * The preview frame has an opaque origin (deliberately: it is what keeps a
 * shared page away from anything of the reader's), and Web Storage throws
 * `SecurityError` there. "Save the todo list to localStorage" is one of the
 * most common beginner exercises on the web, so pasted tutorial code hits
 * this constantly. These shims satisfy the API without weakening the
 * sandbox; they last as long as the frame, so a re-run starts empty.
 */
export const PREVIEW_STORAGE_SHIM_SOURCE = String.raw`
function makeStorage() {
  var data = {};
  var api = {
    getItem: function (k) {
      k = String(k);
      return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
    },
    setItem: function (k, v) { data[String(k)] = String(v); },
    removeItem: function (k) { delete data[String(k)]; },
    clear: function () { data = {}; },
    key: function (i) {
      var keys = Object.keys(data);
      return i >= 0 && i < keys.length ? keys[i] : null;
    },
  };
  Object.defineProperty(api, "length", {
    get: function () { return Object.keys(data).length; },
  });
  return api;
}

// Only shim when the real thing is unreachable: a same-origin preview (if
// one ever exists) should keep its own storage.
function installStorage(name) {
  var usable = false;
  try {
    var probe = window[name];
    if (probe) { probe.getItem("__ds__"); usable = true; }
  } catch (e) { usable = false; }
  if (usable) return;
  try {
    Object.defineProperty(window, name, {
      value: makeStorage(),
      configurable: true,
      writable: false,
    });
  } catch (e) { /* locked down; the SecurityError stands */ }
}

installStorage("localStorage");
installStorage("sessionStorage");
`;
