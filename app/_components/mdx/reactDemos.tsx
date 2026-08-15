"use client";

/**
 * Interactive demo components for the "React from the Ground Up" course,
 * rendered inline via <ReactPreview>. Inline styles only, so they read on
 * both light and dark canvases without page theme variables. Registered as a
 * group in mdx-components.tsx (via `reactDemoComponents`). Everything is
 * offline: "data fetching" demos simulate an async source with a timer.
 */

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/* ── Shared inline style kit ─────────────────────────────────────────
   A tiny design system so every demo looks like it belongs to the same
   app. Colors are chosen to sit well on both the light and dark stage. */

const ui = {
  stack: (gap = 12): CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    gap,
    alignItems: "flex-start",
  }),
  row: (gap = 10): CSSProperties => ({
    display: "flex",
    gap,
    alignItems: "center",
    flexWrap: "wrap",
  }),
  card: {
    background: "#ffffff",
    color: "#0f172a",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "18px 20px",
    boxShadow: "0 1px 2px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.06)",
    maxWidth: 420,
  } as CSSProperties,
  button: {
    background: "#4f46e5",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  } as CSSProperties,
  buttonGhost: {
    background: "#eef2ff",
    color: "#4338ca",
    border: "1px solid #c7d2fe",
    borderRadius: 8,
    padding: "9px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  } as CSSProperties,
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "8px 11px",
    fontSize: 14,
    fontFamily: "inherit",
    color: "#0f172a",
    background: "#fff",
    minWidth: 0,
  } as CSSProperties,
  pill: {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 600,
  } as CSSProperties,
};

/* Wrapper that gives every demo a consistent, theme-independent surface. */
function Demo({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, ...style }}>
      {children}
    </div>
  );
}

/* ── Components & JSX ────────────────────────────────────────────── */

export function GreetingDemo() {
  const user = "Ada";
  const hour = 9;
  return (
    <Demo>
      <div style={ui.card}>
        <h2 style={{ margin: "0 0 6px", fontSize: 20 }}>Good morning, {user}!</h2>
        <p style={{ margin: 0, color: "#475569" }}>
          It is {hour < 12 ? "before" : "after"} noon, and {2 + 2} equals four.
        </p>
      </div>
    </Demo>
  );
}

function Star() {
  return <span style={{ fontSize: 22 }}>⭐</span>;
}

export function StarRatingDemo() {
  return (
    <Demo>
      <div style={ui.card}>
        <h3 style={{ margin: "0 0 8px", fontSize: 17 }}>Trailblazer Boots</h3>
        <div>
          <Star />
          <Star />
          <Star />
        </div>
      </div>
    </Demo>
  );
}

/* ── Props ───────────────────────────────────────────────────────── */

function Avatar({ name, color }: { name: string; color: string }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: color,
        color: "#fff",
        display: "grid",
        placeItems: "center",
        fontWeight: 700,
        fontSize: 17,
      }}
    >
      {name.charAt(0)}
    </div>
  );
}

export function AvatarDemo() {
  return (
    <Demo>
      <Avatar name="Grace" color="#4f46e5" />
      <Avatar name="Linus" color="#0891b2" />
      <Avatar name="Ada" color="#db2777" />
    </Demo>
  );
}

function UserCard({
  name,
  role,
  online,
}: {
  name: string;
  role: string;
  online: boolean;
}) {
  return (
    <div style={{ ...ui.card, maxWidth: 260 }}>
      <div style={ui.row(10)}>
        <Avatar name={name} color="#4f46e5" />
        <div>
          <div style={{ fontWeight: 700 }}>{name}</div>
          <div style={{ color: "#64748b", fontSize: 13 }}>{role}</div>
        </div>
      </div>
      <span
        style={{
          ...ui.pill,
          marginTop: 12,
          background: online ? "#dcfce7" : "#f1f5f9",
          color: online ? "#166534" : "#64748b",
        }}
      >
        {online ? "● Online" : "○ Offline"}
      </span>
    </div>
  );
}

export function UserCardDemo() {
  return (
    <Demo>
      <UserCard name="Grace Hopper" role="Rear Admiral" online={true} />
      <UserCard name="Alan Turing" role="Cryptanalyst" online={false} />
    </Demo>
  );
}

function Badge({ children, tone = "indigo" }: { children: ReactNode; tone?: string }) {
  const tones: Record<string, [string, string]> = {
    indigo: ["#eef2ff", "#4338ca"],
    green: ["#dcfce7", "#166534"],
    amber: ["#fef3c7", "#92400e"],
    rose: ["#ffe4e6", "#9f1239"],
  };
  const [bg, fg] = tones[tone] ?? tones.indigo;
  return (
    <span style={{ ...ui.pill, background: bg, color: fg }}>{children}</span>
  );
}

export function BadgeDemo() {
  return (
    <Demo style={{ alignItems: "center" }}>
      <Badge>Default</Badge>
      <Badge tone="green">Shipped</Badge>
      <Badge tone="amber">Pending</Badge>
      <Badge tone="rose">Blocked</Badge>
    </Demo>
  );
}

/* ── Rendering lists ─────────────────────────────────────────────── */

export function ListDemo() {
  const languages = [
    { id: "ts", name: "TypeScript", year: 2012 },
    { id: "rs", name: "Rust", year: 2010 },
    { id: "go", name: "Go", year: 2009 },
    { id: "py", name: "Python", year: 1991 },
  ];
  return (
    <Demo>
      <ul style={{ ...ui.card, listStyle: "none", margin: 0, padding: 12, minWidth: 260 }}>
        {languages.map((lang) => (
          <li
            key={lang.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderRadius: 8,
            }}
          >
            <span style={{ fontWeight: 600 }}>{lang.name}</span>
            <span style={{ color: "#64748b" }}>{lang.year}</span>
          </li>
        ))}
      </ul>
    </Demo>
  );
}

export function FilterListDemo() {
  const [query, setQuery] = useState("");
  const fruits = ["Apricot", "Blackberry", "Blueberry", "Cherry", "Fig", "Mango"];
  const shown = fruits.filter((f) => f.toLowerCase().includes(query.toLowerCase()));
  return (
    <Demo>
      <div style={{ ...ui.card, minWidth: 260 }}>
        <input
          style={{ ...ui.input, width: "100%", marginBottom: 12 }}
          placeholder="Filter fruit…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {shown.length === 0 ? (
          <p style={{ margin: 0, color: "#94a3b8" }}>No matches.</p>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {shown.map((f) => (
              <li key={f} style={{ padding: "2px 0" }}>
                {f}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Demo>
  );
}

/* ── State with useState ─────────────────────────────────────────── */

export function CounterDemo() {
  const [count, setCount] = useState(0);
  return (
    <Demo style={{ alignItems: "center" }}>
      <button style={ui.buttonGhost} onClick={() => setCount(count - 1)}>
        −
      </button>
      <span style={{ fontSize: 28, fontWeight: 700, minWidth: 48, textAlign: "center" }}>
        {count}
      </span>
      <button style={ui.button} onClick={() => setCount(count + 1)}>
        +
      </button>
    </Demo>
  );
}

export function ToggleDemo() {
  const [on, setOn] = useState(false);
  return (
    <Demo style={{ alignItems: "center" }}>
      <button
        onClick={() => setOn(!on)}
        style={{
          width: 58,
          height: 32,
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          background: on ? "#22c55e" : "#cbd5e1",
          position: "relative",
          transition: "background 0.2s",
        }}
        aria-pressed={on}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: on ? 29 : 3,
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </button>
      <span style={{ fontWeight: 600 }}>{on ? "Notifications on" : "Notifications off"}</span>
    </Demo>
  );
}

export function ColorPickerDemo() {
  const [color, setColor] = useState("#4f46e5");
  const swatches = ["#4f46e5", "#0891b2", "#db2777", "#ea580c", "#16a34a"];
  return (
    <Demo>
      <div style={{ ...ui.card, minWidth: 240 }}>
        <div
          style={{
            height: 72,
            borderRadius: 8,
            background: color,
            marginBottom: 12,
            display: "grid",
            placeItems: "center",
            color: "#fff",
            fontWeight: 700,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {color}
        </div>
        <div style={ui.row(8)}>
          {swatches.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={c}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: c,
                cursor: "pointer",
                border: color === c ? "3px solid #0f172a" : "3px solid transparent",
              }}
            />
          ))}
        </div>
      </div>
    </Demo>
  );
}

/* ── Handling events ─────────────────────────────────────────────── */

export function LikeButtonDemo() {
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const toggle = () => {
    setLiked(!liked);
    setLikes((n) => n + (liked ? -1 : 1));
  };
  return (
    <Demo style={{ alignItems: "center" }}>
      <button
        onClick={toggle}
        style={{
          ...ui.button,
          background: liked ? "#e11d48" : "#f1f5f9",
          color: liked ? "#fff" : "#334155",
          display: "inline-flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        {liked ? "♥" : "♡"} {likes} {likes === 1 ? "like" : "likes"}
      </button>
    </Demo>
  );
}

export function KeyPressDemo() {
  const [last, setLast] = useState("none");
  const [count, setCount] = useState(0);
  return (
    <Demo>
      <div style={{ ...ui.card, minWidth: 260 }}>
        <input
          style={{ ...ui.input, width: "100%" }}
          placeholder="Type here, watch the keys…"
          onKeyDown={(e) => {
            setLast(e.key);
            setCount((n) => n + 1);
          }}
        />
        <p style={{ margin: "12px 0 0", color: "#475569" }}>
          Last key: <strong style={{ fontFamily: "ui-monospace, monospace" }}>{last}</strong> ·{" "}
          {count} keystrokes
        </p>
      </div>
    </Demo>
  );
}

/* ── Forms & controlled inputs ───────────────────────────────────── */

export function TextMirrorDemo() {
  const [text, setText] = useState("");
  return (
    <Demo>
      <div style={{ ...ui.card, minWidth: 280 }}>
        <input
          style={{ ...ui.input, width: "100%" }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          maxLength={60}
        />
        <p style={{ margin: "12px 0 0" }}>
          {text ? <>You typed: <strong>{text}</strong></> : "The input drives this text."}
        </p>
        <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: 13 }}>
          {60 - text.length} characters left
        </p>
      </div>
    </Demo>
  );
}

export function SignupFormDemo() {
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const valid = /.+@.+\..+/.test(email) && agree;
  return (
    <Demo>
      <form
        style={{ ...ui.card, minWidth: 300, ...ui.stack(12) }}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(email);
        }}
      >
        <input
          style={{ ...ui.input, width: "100%" }}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <label style={{ ...ui.row(8), fontSize: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          I agree to the terms
        </label>
        <button style={{ ...ui.button, opacity: valid ? 1 : 0.5 }} disabled={!valid}>
          Sign up
        </button>
        {submitted ? (
          <p style={{ margin: 0, color: "#166534" }}>Welcome aboard, {submitted}!</p>
        ) : null}
      </form>
    </Demo>
  );
}

export function TemperatureDemo() {
  const [celsius, setCelsius] = useState(20);
  const fahrenheit = (celsius * 9) / 5 + 32;
  return (
    <Demo>
      <div style={{ ...ui.card, minWidth: 300 }}>
        <label style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>
          {celsius}°C = {fahrenheit.toFixed(1)}°F
        </label>
        <input
          type="range"
          min={-20}
          max={40}
          value={celsius}
          onChange={(e) => setCelsius(Number(e.target.value))}
          style={{ width: "100%" }}
        />
        <div style={{ ...ui.row(8), marginTop: 10 }}>
          <span style={{ ...ui.pill, background: "#dbeafe", color: "#1e40af" }}>
            {celsius <= 0 ? "Freezing" : celsius < 15 ? "Cold" : celsius < 28 ? "Mild" : "Hot"}
          </span>
        </div>
      </div>
    </Demo>
  );
}

/* ── Effects & (simulated) data fetching ─────────────────────────── */

export function ClockDemo() {
  // Start null so the server-rendered markup and the first client render
  // match (no hydration mismatch); the effect fills in the live time.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    // Show the time immediately on mount (after hydration), then tick each
    // second. The synchronous set is intentional, not a cascading-render bug.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <Demo>
      <div
        style={{
          ...ui.card,
          fontFamily: "ui-monospace, monospace",
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: 1,
        }}
      >
        {now ? now.toLocaleTimeString() : "--:--:--"}
      </div>
    </Demo>
  );
}

export function WindowWidthDemo() {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return (
    <Demo>
      <div style={{ ...ui.card }}>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{width ?? "…"}px</div>
        <p style={{ margin: "6px 0 0", color: "#475569" }}>
          Resize the window, the effect keeps this in sync.
        </p>
      </div>
    </Demo>
  );
}

// A canned async source, so the loading→data pattern behaves the same
// everywhere without a network dependency.
const FACTS = [
  "Honey never spoils, edible after 3,000 years.",
  "Octopuses have three hearts and blue blood.",
  "A day on Venus is longer than its year.",
  "Bananas are botanically berries; strawberries are not.",
  "The Eiffel Tower grows about 15 cm taller in summer.",
];
function fetchFact(index: number): Promise<string> {
  return new Promise((resolve) => setTimeout(() => resolve(FACTS[index % FACTS.length]), 700));
}

export function DataFetchDemo() {
  const [index, setIndex] = useState(0);
  const [fact, setFact] = useState<string | null>(null);
  // fact === null means "loading": it's cleared when a new fetch starts and
  // filled when the fetch resolves, so we don't need a separate flag.
  const loading = fact === null;

  useEffect(() => {
    let active = true;
    fetchFact(index).then((f) => {
      if (active) setFact(f);
    });
    return () => {
      active = false;
    };
  }, [index]);

  const another = () => {
    setFact(null); // back to the loading state…
    setIndex((i) => i + 1); // …which triggers the effect to fetch again
  };

  return (
    <Demo>
      <div style={{ ...ui.card, minWidth: 320, minHeight: 92 }}>
        {loading ? (
          <p style={{ margin: 0, color: "#94a3b8" }}>Loading…</p>
        ) : (
          <p style={{ margin: 0 }}>💡 {fact}</p>
        )}
        <button style={{ ...ui.buttonGhost, marginTop: 14 }} onClick={another} disabled={loading}>
          Another fact
        </button>
      </div>
    </Demo>
  );
}

/* ── Composition & children ──────────────────────────────────────── */

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ ...ui.card, minWidth: 240, padding: 0, overflow: "hidden" }}>
      <div style={{ background: "#4f46e5", color: "#fff", padding: "10px 16px", fontWeight: 700 }}>
        {title}
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

export function PanelDemo() {
  return (
    <Demo>
      <Panel title="Getting started">
        <p style={{ margin: 0 }}>
          Anything you nest between the tags arrives as <code>children</code>.
        </p>
      </Panel>
      <Panel title="Pro tip">
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>Composition beats configuration.</li>
          <li>Slots keep components flexible.</li>
        </ul>
      </Panel>
    </Demo>
  );
}

function SplitLayout({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div style={{ ...ui.card, display: "flex", gap: 0, padding: 0, overflow: "hidden", minWidth: 320 }}>
      <div style={{ flex: "0 0 40%", background: "#f1f5f9", padding: 16 }}>{left}</div>
      <div style={{ flex: 1, padding: 16 }}>{right}</div>
    </div>
  );
}

export function SlotsDemo() {
  return (
    <Demo>
      <SplitLayout
        left={<strong>Sidebar</strong>}
        right={<span>Named {'"slots"'} via props let a parent decide what goes where.</span>}
      />
    </Demo>
  );
}

export function TabsDemo() {
  const tabs = ["Overview", "Pricing", "Reviews"];
  const [active, setActive] = useState(0);
  const bodies = [
    "A quick summary of the product and what it does.",
    "Simple, transparent pricing with a free tier.",
    "★★★★☆ loved by thousands of developers.",
  ];
  return (
    <Demo>
      <div style={{ ...ui.card, minWidth: 320, padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0" }}>
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setActive(i)}
              style={{
                flex: 1,
                padding: "10px 8px",
                border: "none",
                cursor: "pointer",
                background: active === i ? "#fff" : "#f8fafc",
                color: active === i ? "#4f46e5" : "#64748b",
                fontWeight: active === i ? 700 : 500,
                borderBottom: active === i ? "2px solid #4f46e5" : "2px solid transparent",
                fontFamily: "inherit",
                fontSize: 14,
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={{ padding: 18 }}>{bodies[active]}</div>
      </div>
    </Demo>
  );
}

/* Counts only the valid React elements passed as children, showing that
   `children` is inspectable data, not just an opaque blob. */
function CountingToolbar({ children }: { children: ReactNode }) {
  const count = Children.count(children);
  return (
    <div style={{ ...ui.card, minWidth: 300 }}>
      <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>
        This toolbar has {count} button{count === 1 ? "" : "s"}:
      </div>
      <div style={ui.row(8)}>
        {Children.map(children, (child) => (isValidElement(child) ? child : null))}
      </div>
    </div>
  );
}

export function ChildrenCountDemo() {
  return (
    <Demo>
      <CountingToolbar>
        <button style={ui.buttonGhost}>Cut</button>
        <button style={ui.buttonGhost}>Copy</button>
        <button style={ui.buttonGhost}>Paste</button>
      </CountingToolbar>
    </Demo>
  );
}

/* ── Custom hooks ────────────────────────────────────────────────── */

function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn((v) => !v);
  return [on, toggle] as const;
}

export function UseToggleDemo() {
  const [dark, toggleDark] = useToggle(false);
  const [bold, toggleBold] = useToggle(true);
  return (
    <Demo>
      <div
        style={{
          ...ui.card,
          minWidth: 280,
          background: dark ? "#0f172a" : "#fff",
          color: dark ? "#e2e8f0" : "#0f172a",
          transition: "background 0.2s, color 0.2s",
        }}
      >
        <p style={{ margin: "0 0 14px", fontWeight: bold ? 700 : 400 }}>
          One hook, reused twice, independent state.
        </p>
        <div style={ui.row(8)}>
          <button style={ui.buttonGhost} onClick={toggleDark}>
            {dark ? "Light" : "Dark"} mode
          </button>
          <button style={ui.buttonGhost} onClick={toggleBold}>
            {bold ? "Un-bold" : "Bold"}
          </button>
        </div>
      </div>
    </Demo>
  );
}

function useInterval(callback: () => void, delay: number | null) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => saved.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

export function StopwatchDemo() {
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);
  useInterval(() => setMs((t) => t + 100), running ? 100 : null);
  const seconds = (ms / 1000).toFixed(1);
  return (
    <Demo style={{ alignItems: "center" }}>
      <span
        style={{
          fontFamily: "ui-monospace, monospace",
          fontSize: 34,
          fontWeight: 700,
          minWidth: 90,
        }}
      >
        {seconds}s
      </span>
      <button style={ui.button} onClick={() => setRunning((r) => !r)}>
        {running ? "Pause" : "Start"}
      </button>
      <button
        style={ui.buttonGhost}
        onClick={() => {
          setRunning(false);
          setMs(0);
        }}
      >
        Reset
      </button>
    </Demo>
  );
}

function useLocalStorageState(key: string, initial: string) {
  // Start from `initial` on both server and first client render so hydration
  // matches; a mount effect reads the persisted value, and a second effect
  // writes changes back.
  const [value, setValue] = useState(initial);
  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    // Read the persisted value in once on mount, after hydration, so the
    // server and first client render both show `initial` (no mismatch).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored !== null) setValue(stored);
  }, [key]);
  useEffect(() => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage may be unavailable, ignore */
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export function UseLocalStorageDemo() {
  const [name, setName] = useLocalStorageState("react-course-demo-name", "");
  return (
    <Demo>
      <div style={{ ...ui.card, minWidth: 300 }}>
        <input
          style={{ ...ui.input, width: "100%" }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type your name…"
        />
        <p style={{ margin: "12px 0 0", color: "#475569" }}>
          {name ? <>Hi {name}! </> : null}Reload the page, this input remembers itself.
        </p>
      </div>
    </Demo>
  );
}

/* ── Project: Todo app ───────────────────────────────────────────── */

interface Todo {
  id: number;
  text: string;
  done: boolean;
}

export function TodoDemo() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: 1, text: "Learn components", done: true },
    { id: 2, text: "Master state", done: true },
    { id: 3, text: "Build a todo app", done: false },
  ]);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const nextId = useRef(4);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    setTodos((prev) => [...prev, { id: nextId.current++, text, done: false }]);
    setDraft("");
  };
  const toggle = (id: number) =>
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id: number) => setTodos((prev) => prev.filter((t) => t.id !== id));

  const visible = useMemo(
    () =>
      todos.filter((t) =>
        filter === "all" ? true : filter === "done" ? t.done : !t.done,
      ),
    [todos, filter],
  );
  const remaining = todos.filter((t) => !t.done).length;

  return (
    <Demo>
      <div style={{ ...ui.card, minWidth: 340, maxWidth: 460, width: "100%" }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 18 }}>Todos</h3>
        <div style={{ ...ui.row(8), marginBottom: 12 }}>
          <input
            style={{ ...ui.input, flex: 1 }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="What needs doing?"
          />
          <button style={ui.button} onClick={add}>
            Add
          </button>
        </div>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {visible.map((t) => (
            <li
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 4px",
                borderTop: "1px solid #f1f5f9",
              }}
            >
              <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
              <span
                style={{
                  flex: 1,
                  textDecoration: t.done ? "line-through" : "none",
                  color: t.done ? "#94a3b8" : "#0f172a",
                }}
              >
                {t.text}
              </span>
              <button
                onClick={() => remove(t.id)}
                aria-label={`Delete ${t.text}`}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "#cbd5e1",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
            paddingTop: 10,
            borderTop: "1px solid #e2e8f0",
            fontSize: 13,
            color: "#64748b",
          }}
        >
          <span>{remaining} left</span>
          <div style={ui.row(4)}>
            {(["all", "active", "done"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  border: "none",
                  background: filter === f ? "#eef2ff" : "transparent",
                  color: filter === f ? "#4338ca" : "#64748b",
                  padding: "4px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontWeight: filter === f ? 700 : 500,
                  textTransform: "capitalize",
                  fontFamily: "inherit",
                  fontSize: 13,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Demo>
  );
}

/* ── Conditional rendering ───────────────────────────────────────── */

export function AuthToggleDemo() {
  const [user, setUser] = useState<string | null>(null);
  return (
    <Demo>
      <div style={{ ...ui.card, minWidth: 280 }}>
        {user ? (
          <div style={ui.stack(10)}>
            <strong>Welcome back, {user} 👋</strong>
            <button style={ui.buttonGhost} onClick={() => setUser(null)}>
              Log out
            </button>
          </div>
        ) : (
          <div style={ui.stack(10)}>
            <span style={{ color: "#64748b" }}>You are signed out.</span>
            <button style={ui.button} onClick={() => setUser("Ada")}>
              Log in
            </button>
          </div>
        )}
      </div>
    </Demo>
  );
}

export function CartBadgeDemo() {
  const [count, setCount] = useState(0);
  return (
    <Demo style={{ alignItems: "center" }}>
      <div style={{ position: "relative", fontSize: 34, lineHeight: 1 }}>
        🛒
        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: -6,
              right: -12,
              background: "#e11d48",
              color: "#fff",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              padding: "1px 7px",
            }}
          >
            {count}
          </span>
        )}
      </div>
      <button style={ui.buttonGhost} onClick={() => setCount((c) => Math.max(0, c - 1))}>
        −
      </button>
      <button style={ui.button} onClick={() => setCount((c) => c + 1)}>
        Add to cart
      </button>
    </Demo>
  );
}

/* ── State & immutability ────────────────────────────────────────── */

export function ImmutableListDemo() {
  const [items, setItems] = useState<string[]>(["Milk", "Eggs"]);
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    setItems((prev) => [...prev, v]); // new array, never items.push()
    setDraft("");
  };
  return (
    <Demo>
      <div style={{ ...ui.card, minWidth: 280 }}>
        <div style={{ ...ui.row(8), marginBottom: 10 }}>
          <input
            style={{ ...ui.input, flex: 1 }}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Add an item…"
          />
          <button style={ui.button} onClick={add}>
            Add
          </button>
        </div>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {items.map((it, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "5px 0",
                borderTop: "1px solid #f1f5f9",
              }}
            >
              {it}
              <button
                aria-label={`Remove ${it}`}
                onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                style={{ border: "none", background: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 16 }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Demo>
  );
}

export function SettingsObjectDemo() {
  const [settings, setSettings] = useState({ wifi: true, bluetooth: false, dnd: false });
  const labels: Record<keyof typeof settings, string> = {
    wifi: "Wi-Fi",
    bluetooth: "Bluetooth",
    dnd: "Do Not Disturb",
  };
  const toggle = (key: keyof typeof settings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] })); // new object
  return (
    <Demo>
      <div style={{ ...ui.card, minWidth: 260 }}>
        {(Object.keys(settings) as (keyof typeof settings)[]).map((key) => (
          <label
            key={key}
            style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", cursor: "pointer" }}
          >
            {labels[key]}
            <input type="checkbox" checked={settings[key]} onChange={() => toggle(key)} />
          </label>
        ))}
        <pre
          style={{
            margin: "10px 0 0",
            background: "#f8fafc",
            borderRadius: 8,
            padding: "8px 10px",
            fontSize: 12,
            color: "#475569",
            overflowX: "auto",
          }}
        >
          {JSON.stringify(settings)}
        </pre>
      </div>
    </Demo>
  );
}

/* ── Refs & the DOM ──────────────────────────────────────────────── */

export function FocusInputDemo() {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <Demo style={{ alignItems: "center" }}>
      <input ref={inputRef} style={ui.input} placeholder="Click the button →" />
      <button style={ui.button} onClick={() => inputRef.current?.focus()}>
        Focus the input
      </button>
    </Demo>
  );
}

export function SilentCounterDemo() {
  // A ref is a mutable box that survives re-renders but does NOT trigger one.
  const clicksRef = useRef(0);
  const [shown, setShown] = useState<number | null>(null);
  return (
    <Demo style={{ alignItems: "center" }}>
      <button
        style={ui.buttonGhost}
        onClick={() => {
          clicksRef.current += 1; // mutating a ref causes no re-render
        }}
      >
        Click me (updates a ref silently)
      </button>
      <button style={ui.button} onClick={() => setShown(clicksRef.current)}>
        Reveal the count
      </button>
      {shown !== null && (
        <span>
          The ref counted <strong>{shown}</strong> click{shown === 1 ? "" : "s"}, with
          no re-render until now.
        </span>
      )}
    </Demo>
  );
}

/* ── Context ─────────────────────────────────────────────────────── */

interface ThemeValue {
  dark: boolean;
  toggle: () => void;
}
const ThemeContext = createContext<ThemeValue>({ dark: false, toggle: () => {} });

function ThemedButton() {
  const { dark, toggle } = useContext(ThemeContext); // reads context, no props
  return (
    <button
      onClick={toggle}
      style={{
        ...ui.button,
        background: dark ? "#facc15" : "#4f46e5",
        color: dark ? "#0f172a" : "#fff",
      }}
    >
      {dark ? "Switch to light" : "Switch to dark"}
    </button>
  );
}

function ThemedPanel() {
  const { dark } = useContext(ThemeContext);
  return (
    <div
      style={{
        ...ui.card,
        minWidth: 300,
        background: dark ? "#0f172a" : "#fff",
        color: dark ? "#e2e8f0" : "#0f172a",
        transition: "background 0.2s, color 0.2s",
      }}
    >
      <p style={{ marginTop: 0 }}>
        This panel and its nested button both read the theme from context, no
        props were threaded through.
      </p>
      <ThemedButton />
    </div>
  );
}

export function ThemeContextDemo() {
  const [dark, setDark] = useState(false);
  return (
    <Demo>
      <ThemeContext.Provider value={{ dark, toggle: () => setDark((d) => !d) }}>
        <ThemedPanel />
      </ThemeContext.Provider>
    </Demo>
  );
}

// The MDX registry object is assembled in reactDemoComponents.ts and must NOT
// live here — see that file for why.
