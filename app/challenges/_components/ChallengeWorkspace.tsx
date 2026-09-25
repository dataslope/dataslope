"use client";

/**
 * The full-page challenge workspace.
 *
 * One state object drives two layouts: the desktop three-pane split and, under
 * 768px, the same content as Problem / Code / Results tabs. Both trees are in
 * the DOM and the media query in the stylesheet decides which one paints, so a
 * phone never flashes the desktop layout while a viewport check settles.
 *
 * Everything the panes show is produced by actually running the learner's
 * code: `useChallengeRunner` boots an in-browser SQL engine or a WASM language
 * runtime, and the Output, Test cases and Submissions tabs render what came
 * back. Nothing is sent to a server.
 *
 * Step gating is derived, not authored. A step opens when the one before it
 * has passed, and "passed" comes from `lib/challenges/progress`, which lives
 * in localStorage.
 */

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Database,
  Eye,
  History,
  Loader2,
  Lock,
  Play,
  RotateCcw,
  Table2,
  Undo2,
} from "lucide-react";
// Not "@/lib/challenges": that module imports every challenge, and this is
// client code. See lib/challenges/steps.ts.
import { isMultiStep, isStepUnlocked, openStepIndex } from "@/lib/challenges/steps";
import type {
  Challenge,
  ChallengeLanguage,
  ChallengeLink,
  ChallengeStep,
  ChallengeTask,
  CodeLanguage,
  OutputPanel,
  Submission,
  TestOutcome,
} from "@/lib/challenges/types";
import {
  clearSavedCode,
  markAttempted,
  markSolved,
  markStepPassed,
  readSavedCode,
  saveCode,
  subscribeToProgress,
} from "@/lib/challenges/progress";
import { useProgress, useProgressOwner } from "./useProgress";
import {
  DifficultyMeter,
  InstructionBlocks,
  MobileSubmissions,
  OutputPanelView,
  SchemaAccordion,
  SchemaList,
  SolutionGate,
  SolutionPanelView,
  SubmissionsPanel,
  SubmitErrorPanel,
  TestsPanel,
} from "./parts";
import { ChallengeEditor } from "./ChallengeEditor";
import { MoreMenu, type MoreMenuItem } from "./MoreMenu";
import { useChallengeRunner, type RunMode } from "./useChallengeRunner";
import { registerWorkspaceForTests } from "./testRegistry";
import s from "./ChallengeWorkspace.module.css";

type ResultTab = "output" | "tests" | "solution" | "subs";
type MobileView = "problem" | "code" | "results";

const RESULT_TABS: { id: ResultTab; label: string; shortLabel?: string }[] = [
  { id: "output", label: "Output" },
  { id: "tests", label: "Test cases", shortLabel: "Tests" },
  { id: "solution", label: "Solution" },
  { id: "subs", label: "Submissions" },
];

/** Minimum instructions width, and the workspace width it must leave behind. */
const MIN_COL = 300;
const MIN_WORKSPACE = 460;
/** Minimum results height, and the editor height it must leave behind. */
const MIN_ROW = 140;
const MIN_EDITOR = 180;
/** Pixels a resizer moves per arrow-key press. */
const KEY_STEP = 24;

function timeAgoLabel(): string {
  return "just now";
}

/** Focus whichever of the two layouts' copies of an element is on screen. */
function focusVisible(...els: (HTMLElement | null)[]) {
  els.find((el) => el && el.offsetParent !== null)?.focus();
}

export function ChallengeWorkspace({
  challenge,
  prev,
  next,
}: {
  challenge: Challenge;
  /** The challenges either side of this one in catalog order. */
  prev: ChallengeLink | null;
  next: ChallengeLink | null;
}) {
  const multiStep = isMultiStep(challenge);

  // The server snapshot is blank and the stored one arrives at hydration, so
  // nothing here is copied into state or fetched in an effect.
  const progress = useProgress(challenge.slug);
  // The step the learner picked, or null to follow their progress.
  const [chosenStep, setChosenStep] = useState<number | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>("output");
  const [langId, setLangId] = useState<CodeLanguage>(
    () => challenge.languages[0]?.id ?? "sql",
  );
  const [langOpen, setLangOpen] = useState(false);
  // The phone tab the learner picked, or null for the default (see below).
  const [mobileChoice, setMobileView] = useState<MobileView | null>(null);
  const [openTable, setOpenTable] = useState<string | null>(null);
  /** Tasks whose reference solution the learner asked to see this session. */
  const [revealed, setRevealed] = useState<string[]>([]);
  const [outcome, setOutcome] = useState<{
    mode: RunMode;
    output: OutputPanel;
    tests: TestOutcome[];
    meta: string;
  } | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  /**
   * What assistive technology is told after a submission.
   *
   * The verdict renders into a panel that a screen reader is never pointed
   * at, so it is mirrored into a polite live region. Held in state rather
   * than written to the DOM directly: React owns that node.
   */
  const [announcement, setAnnouncement] = useState("");
  /** The results banner, focused after a submission so Tab continues there. */
  const bannerRef = useRef<HTMLDivElement>(null);
  const mobileBannerRef = useRef<HTMLDivElement>(null);
  /** The result panels, which take focus when the solution is revealed. */
  const panelRef = useRef<HTMLDivElement>(null);
  const mobilePanelRef = useRef<HTMLDivElement>(null);
  /** Ids for the result tabs; both layouts render a set, so each gets a prefix. */
  const tabsId = useId();

  const splitRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const langWrapRef = useRef<HTMLDivElement>(null);

  const runner = useChallengeRunner(challenge);
  const { execute, reset: resetEngine, dispose } = runner;

  const stepIndex = chosenStep ?? openStepIndex(challenge, progress.passedSteps);
  const setStepIndex = setChosenStep;

  // ─── Which task is on screen ───────────────────────────────────────

  const language: ChallengeLanguage | undefined =
    challenge.languages.find((l) => l.id === langId) ?? challenge.languages[0];
  const step: ChallengeStep | undefined = multiStep
    ? challenge.steps[stepIndex]
    : undefined;
  /** A step carries the task on a multi-step challenge; a language otherwise. */
  const task: ChallengeTask | undefined = multiStep ? step : language;
  /** Identifies the buffer: the step number, or the language id. */
  const taskKey = multiStep ? (step?.n ?? "01") : (language?.id ?? "sql");
  const editorLanguage: CodeLanguage = multiStep
    ? (challenge.languages[0]?.id ?? "sql")
    : (language?.id ?? "sql");

  const stepUnlocked = multiStep
    ? isStepUnlocked(challenge, stepIndex, progress.passedSteps)
    : true;

  // The editor buffer, re-seeded when the learner moves to another task, or
  // when the session settles on a different learner than the one this page
  // started with (a first sign-in on this browser, an expired session): saved
  // code is kept per learner, so the buffer on screen may belong to someone
  // else's copy.
  //
  // React's "adjust state when a prop changes" pattern rather than an effect:
  // the new text is ready on the same render the task changes on, so the
  // editor never shows the previous task's code for a frame. Seeding reads
  // localStorage, which differs between server and client — harmless here,
  // because `code` is never rendered: it reaches the DOM only when CodeMirror
  // mounts, in an effect.
  const codeOwner = useProgressOwner();
  const seedKey = `${codeOwner}\u0000${taskKey}`;
  const seed = (key: string) =>
    readSavedCode(challenge.slug, key) ?? task?.starterCode ?? "";
  const [code, setCodeState] = useState(() => seed(taskKey));
  /**
   * The buffer Reset threw away, kept so it can be handed back.
   *
   * Reset is destructive and sits next to Run, so it is undoable rather than
   * guarded by a dialog: a confirm prompt on a button people press often gets
   * clicked through without reading. This is held in memory only until the
   * learner moves task — long enough to notice the mistake, short enough not
   * to resurface work they meant to abandon.
   */
  const [undoableDraft, setUndoableDraft] = useState<string | null>(null);
  /**
   * Whether this buffer has been saved since it was seeded. The phone's
   * "Autosaved" label waits for it: shown on a buffer nobody has touched, it
   * claimed a save that had not happened.
   */
  const [savedHere, setSavedHere] = useState(false);
  const [seededFor, setSeededFor] = useState(seedKey);
  if (seededFor !== seedKey) {
    setSeededFor(seedKey);
    setCodeState(seed(taskKey));
    setOutcome(null);
    // A discarded draft belongs to the task it came from; offering it back on
    // a different step would paste the wrong query into the editor.
    setUndoableDraft(null);
    setSavedHere(false);
  }

  const setCode = useCallback(
    (next: string) => {
      setCodeState(next);
      saveCode(challenge.slug, taskKey, next);
      setSavedHere(true);
    },
    [challenge.slug, taskKey],
  );

  /**
   * The phone opens on the Problem tab for a challenge the learner has not
   * started, and on Code once they have (a submission, or saved code for this
   * task): a first visit wants the prompt, a return visit wants the work.
   *
   * Both halves come from browser storage, which the server cannot see, so
   * this is an external store with a server answer of "not started". The
   * prerendered page therefore opens on Problem, which is right for most
   * visits, and a returning learner is moved to Code once at hydration. The
   * choice is derived rather than copied into state, so a session that settles
   * on another learner after mount is followed too, until the learner picks a
   * tab themselves.
   */
  const hasSavedCode = useSyncExternalStore(
    subscribeToProgress,
    () => readSavedCode(challenge.slug, taskKey) !== null,
    () => false,
  );
  const started =
    progress.attempted || progress.solved || progress.passedSteps.length > 0 || hasSavedCode;
  const mobileView: MobileView = mobileChoice ?? (started ? "code" : "problem");

  // ─── Lifecycle ─────────────────────────────────────────────────────

  // The workspace owns the viewport: the panes scroll, the document does not.
  useEffect(() => {
    document.body.classList.add("challenge-active");
    return () => document.body.classList.remove("challenge-active");
  }, []);

  useEffect(() => dispose, [dispose]);

  // Dismiss the language menu on an outside click or Escape.
  useEffect(() => {
    if (!langOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!langWrapRef.current?.contains(e.target as Node)) setLangOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLangOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [langOpen]);

  // ─── Run and submit ────────────────────────────────────────────────

  const go = useCallback(
    async (mode: RunMode) => {
      if (!task || !language || !stepUnlocked) return;
      // Hold the step on screen. With nothing picked, the step follows
      // progress, so recording this pass below used to move the page to the
      // next step before the results rendered: the "Step 1 accepted" banner
      // and its Continue button were never seen. The Continue button is what
      // moves on, when the learner is ready. A fresh page load still opens on
      // the first step not yet passed.
      if (mode === "submit" && multiStep) setChosenStep(stepIndex);
      setResultTab(mode === "run" ? "output" : "tests");
      setMobileView("results");
      setLangOpen(false);

      const result = await execute(code, mode, task, language);
      setOutcome({
        mode,
        output: result.output,
        tests: result.tests,
        meta: result.meta,
      });

      if (mode !== "submit") return;

      const failed = result.output.kind === "error";
      const label = failed
        ? "Runtime error"
        : result.accepted
          ? "Accepted"
          : "Wrong answer";
      setSubmissions((prev) => [
        {
          step: multiStep ? `Step ${Number(taskKey)}` : undefined,
          result: label,
          ok: result.accepted,
          lang: language.label,
          runtime: `${Math.round(result.elapsedMs)}ms`,
          when: timeAgoLabel(),
        },
        ...prev,
      ]);

      // Progress only ever moves forward, and only on a real pass. These
      // write to the store, which re-renders the rail and the catalog.
      if (result.accepted) {
        if (multiStep) markStepPassed(challenge.slug, taskKey, challenge.steps.length);
        else markSolved(challenge.slug);
      } else {
        markAttempted(challenge.slug);
      }

      const passed = result.tests.filter((t) => t.pass).length;
      setAnnouncement(
        failed
          ? `Runtime error. ${result.output.kind === "error" ? result.output.message : ""}`.trim()
          : `${passed} of ${result.tests.length} checks passed. ${label}.`,
      );
      // The banner only exists once the results have rendered. Both layouts
      // render one, and the hidden layout's copy cannot take focus.
      requestAnimationFrame(() => {
        focusVisible(bannerRef.current, mobileBannerRef.current);
      });
    },
    [
      challenge.slug,
      challenge.steps.length,
      code,
      execute,
      language,
      multiStep,
      stepIndex,
      stepUnlocked,
      task,
      taskKey,
    ],
  );

  const run = useCallback(() => void go("run"), [go]);
  const submit = useCallback(() => void go("submit"), [go]);

  const resetCode = useCallback(() => {
    if (!task) return;
    const discarded = code;
    clearSavedCode(challenge.slug, taskKey);
    setCodeState(task.starterCode);
    setOutcome(null);
    // Nothing to offer back when the buffer was already the starter.
    setUndoableDraft(discarded.trim() === task.starterCode.trim() ? null : discarded);
    // A fresh database too, so a challenge that wrote rows starts clean.
    resetEngine();
  }, [challenge.slug, code, resetEngine, task, taskKey]);

  const undoReset = useCallback(() => {
    if (undoableDraft === null) return;
    setCode(undoableDraft);
    setUndoableDraft(null);
  }, [setCode, undoableDraft]);

  // Drive the workspace from Playwright without typing into CodeMirror.
  //
  // The handle is registered once and reads through a ref that every render
  // refreshes. Re-registering a fresh closure instead looked fine but was
  // subtly broken: a test that grabbed the handle, called submit() and then
  // read getTestResults() was reading the closure captured *before* the
  // results arrived, and always saw an empty list.
  const live = useRef({
    outcome,
    busy: runner.busy,
    task,
    go,
    setCode,
    passedSteps: progress.passedSteps,
    code,
    taskKey,
  });
  useEffect(() => {
    live.current = {
      outcome,
      busy: runner.busy,
      task,
      go,
      setCode,
      passedSteps: progress.passedSteps,
      code,
      taskKey,
    };
  });

  useEffect(
    () =>
      registerWorkspaceForTests(challenge.slug, {
        slug: challenge.slug,
        runtimeKind: challenge.runtime.kind,
        langs: challenge.catalog.langs,
        taskKeys: multiStep
          ? challenge.steps.map((st) => st.n)
          : challenge.languages.map((l) => l.id),
        isTaskUnlocked: (key) =>
          !multiStep ||
          isStepUnlocked(
            challenge,
            challenge.steps.findIndex((st) => st.n === key),
            live.current.passedSteps,
          ),
        selectTask: (key) => {
          if (multiStep) {
            const i = challenge.steps.findIndex((st) => st.n === key);
            if (i >= 0) setChosenStep(i);
          } else {
            setLangId(key as CodeLanguage);
          }
        },
        currentTaskKey: () => live.current.taskKey,
        setCode: (next) => live.current.setCode(next),
        getCode: () => live.current.code,
        loadSolution: () => {
          const current = live.current.task;
          if (!current) return "";
          live.current.setCode(current.solutionCode);
          return current.solutionCode;
        },
        submit: () => live.current.go("submit"),
        getTestResults: () => live.current.outcome?.tests ?? [],
        getOutputKind: () => live.current.outcome?.output.kind ?? null,
        getOutputError: () => {
          const out = live.current.outcome?.output;
          return out && out.kind === "error" ? out.message : null;
        },
        isBusy: () => live.current.busy !== null,
      }),
    [challenge, multiStep],
  );

  // ─── Pane resizing ─────────────────────────────────────────────────
  // The grid's inline style is mutated directly rather than held in state:
  // React never renders `gridTemplate*` on these two elements, so it has
  // nothing to clobber, and a drag doesn't re-render the whole workspace.

  const setColumns = useCallback((width: number) => {
    const el = splitRef.current;
    if (!el) return;
    const max = el.getBoundingClientRect().width - MIN_WORKSPACE;
    const clamped = Math.min(Math.max(width, MIN_COL), Math.max(MIN_COL, max));
    el.style.gridTemplateColumns = `${clamped}px 5px minmax(0, 1fr)`;
  }, []);

  const setRows = useCallback((height: number) => {
    const el = rowsRef.current;
    if (!el) return;
    const max = el.getBoundingClientRect().height - MIN_EDITOR;
    const clamped = Math.min(Math.max(height, MIN_ROW), Math.max(MIN_ROW, max));
    el.style.gridTemplateRows = `minmax(0, 1fr) 5px ${clamped}px`;
  }, []);

  const drag = useCallback(
    (
      e: React.MouseEvent,
      el: HTMLElement | null,
      apply: (rect: DOMRect, ev: MouseEvent) => void,
    ) => {
      if (!el) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const move = (ev: MouseEvent) => apply(rect, ev);
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        document.body.style.userSelect = "";
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      document.body.style.userSelect = "none";
    },
    [],
  );

  const startColDrag = useCallback(
    (e: React.MouseEvent) =>
      drag(e, splitRef.current, (rect, ev) => setColumns(ev.clientX - rect.left)),
    [drag, setColumns],
  );
  const startRowDrag = useCallback(
    (e: React.MouseEvent) =>
      drag(e, rowsRef.current, (rect, ev) => setRows(rect.bottom - ev.clientY)),
    [drag, setRows],
  );

  const onColKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const current =
        splitRef.current?.firstElementChild?.getBoundingClientRect().width ?? MIN_COL;
      setColumns(current + (e.key === "ArrowRight" ? KEY_STEP : -KEY_STEP));
    },
    [setColumns],
  );

  const onRowKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      const current =
        rowsRef.current?.lastElementChild?.getBoundingClientRect().height ?? MIN_ROW;
      setRows(current + (e.key === "ArrowUp" ? KEY_STEP : -KEY_STEP));
    },
    [setRows],
  );

  // ─── Derived view state ────────────────────────────────────────────

  const instructions = multiStep ? (step?.instructions ?? []) : challenge.instructions;
  const tests = outcome?.tests ?? [];
  const passedCount = tests.filter((t) => t.pass).length;
  const allPassed = tests.length > 0 && passedCount === tests.length;
  const testsBadge = tests.length ? `${passedCount}/${tests.length}` : null;
  const gatingStep = challenge.steps[stepIndex - 1]?.n.replace(/^0+/, "") ?? "";
  const busy = runner.busy;

  // Passing a step is the highest-momentum moment in the flow, and it used to
  // dead-end: the only way on was to spot the small numbered circle in the
  // rail. Offer the next step in the banner instead.
  const nextStepIndex = multiStep && stepIndex < challenge.steps.length - 1
    ? stepIndex + 1
    : null;
  const goToNextStep = useCallback(() => {
    if (nextStepIndex === null) return;
    setStepIndex(nextStepIndex);
    setResultTab("output");
    setMobileView("problem");
  }, [nextStepIndex, setStepIndex]);

  /** What the checks and the solution are for, in the learner's words. */
  const scope = multiStep ? "this step" : "this challenge";
  /**
   * The last task was just accepted, so the way on is the next challenge:
   * offered in the results banner, and on desktop beside Submit.
   */
  const finished =
    outcome?.mode === "submit" && allPassed && nextStepIndex === null && next !== null;
  const nextChallengeLabel = next ? `Next challenge: ${next.title}` : "";

  /**
   * A solution the learner has earned is shown straight away: the task has
   * passed, or they already asked for it this session. Otherwise the tab asks
   * first (see `SolutionGate`).
   */
  const taskPassed = multiStep
    ? step !== undefined && progress.passedSteps.includes(step.n)
    : progress.solved;
  const solutionOpen = taskPassed || revealed.includes(taskKey);
  const revealSolution = useCallback(() => {
    setRevealed((keys) => (keys.includes(taskKey) ? keys : [...keys, taskKey]));
    // The button that had focus is gone; the panel it opened takes it.
    requestAnimationFrame(() => focusVisible(panelRef.current, mobilePanelRef.current));
  }, [taskKey]);

  const resultPanel = (mobile: boolean) => {
    switch (resultTab) {
      case "output":
        return outcome ? (
          <OutputPanelView output={outcome.output} mobile={mobile} />
        ) : (
          <EmptyResults text="Run your code to see its output here." />
        );
      case "tests":
        // Code that throws before the harness runs leaves nothing to list.
        if (outcome?.mode === "submit" && outcome.output.kind === "error") {
          return (
            <SubmitErrorPanel
              message={outcome.output.message}
              scope={scope}
              mobile={mobile}
              bannerRef={mobile ? mobileBannerRef : bannerRef}
              onShowOutput={() => setResultTab("output")}
            />
          );
        }
        return tests.length ? (
          <TestsPanel
            tests={tests}
            summary={
              allPassed
                ? `All ${tests.length} checks passed`
                : `${passedCount} of ${tests.length} checks passed`
            }
            subtitle={
              allPassed
                ? multiStep
                  ? `Step ${Number(taskKey)} accepted`
                  : "Accepted"
                : multiStep
                  ? `Step ${Number(taskKey)} is not accepted yet`
                  : "Not accepted yet"
            }
            allPassed={allPassed}
            mobile={mobile}
            bannerRef={mobile ? mobileBannerRef : bannerRef}
            onContinue={nextStepIndex !== null ? goToNextStep : undefined}
            continueHref={next ? `/challenges/${next.slug}` : undefined}
            continueLabel={
              nextStepIndex !== null
                ? `Continue to step ${Number(challenge.steps[nextStepIndex].n)}`
                : next
                  ? "Next challenge"
                  : undefined
            }
            continueAriaLabel={nextStepIndex === null && next ? nextChallengeLabel : undefined}
          />
        ) : (
          <EmptyResults text={`Submit to run the checks for ${scope}.`} />
        );
      case "solution":
        // Readable on every step, including the ones still locked. The gate is
        // on the editor, not on the explanation: a learner who wants to read
        // ahead is allowed to, and someone stuck on step 1 can see where the
        // build is going before committing to it. Deliberate product choice —
        // `e2e/challenge-workspace` pins both halves of it. The one thing in
        // the way is `SolutionGate`, which asks once, so a stray click on the
        // tab does not spoil the problem.
        if (!task) return null;
        if (!solutionOpen) return <SolutionGate scope={scope} onReveal={revealSolution} />;
        return (
          <SolutionPanelView
            note={step?.solutionNote ?? challenge.solutionNote}
            source={task.solutionCode}
            language={editorLanguage}
            label={
              multiStep
                ? `Reference solution · step ${Number(taskKey)}`
                : `Reference solution · ${language?.shortLabel ?? ""}`
            }
          />
        );
      case "subs":
        return submissions.length ? (
          mobile ? (
            <MobileSubmissions
              submissions={submissions}
              languageLabel={challenge.languageLabel}
            />
          ) : (
            <SubmissionsPanel
              submissions={submissions}
              columns={challenge.submissionColumns}
            />
          )
        ) : (
          <EmptyResults text="Your submissions this session will appear here." />
        );
    }
  };

  // Both layouts render a tab set, so every id carries the layout too.
  const tabId = (mobile: boolean, id: ResultTab) => `${tabsId}${mobile ? "m" : "d"}-tab-${id}`;
  const panelId = (mobile: boolean) => `${tabsId}${mobile ? "m" : "d"}-panel`;

  /**
   * The result tabs, as an ARIA tab set: one tab stop for the strip, the
   * arrow keys (and Home and End) move between tabs, and moving selects.
   * They were plain buttons, which a screen reader announced as four
   * unrelated controls with no sense of which one was showing.
   */
  const resultTabs = (mobile: boolean) => (
    <div
      role="tablist"
      aria-label="Results"
      className={mobile ? `${s.mResultTabs} ${s.noScrollbar}` : `${s.tabStrip} ${s.noScrollbar}`}
      onKeyDown={(e) => {
        const at = RESULT_TABS.findIndex((t) => t.id === resultTab);
        const to =
          e.key === "ArrowRight"
            ? (at + 1) % RESULT_TABS.length
            : e.key === "ArrowLeft"
              ? (at - 1 + RESULT_TABS.length) % RESULT_TABS.length
              : e.key === "Home"
                ? 0
                : e.key === "End"
                  ? RESULT_TABS.length - 1
                  : null;
        if (to === null) return;
        e.preventDefault();
        const id = RESULT_TABS[to].id;
        setResultTab(id);
        document.getElementById(tabId(mobile, id))?.focus();
      }}
    >
      {RESULT_TABS.map((tab) => {
        const on = resultTab === tab.id;
        const showBadge = tab.id === "tests" && testsBadge !== null;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={tabId(mobile, tab.id)}
            aria-selected={on}
            aria-controls={panelId(mobile)}
            tabIndex={on ? 0 : -1}
            className={[s.tab, mobile ? s.mTab : "", on ? s.tabOn : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => setResultTab(tab.id)}
          >
            <span>{mobile ? (tab.shortLabel ?? tab.label) : tab.label}</span>
            {showBadge ? (
              <span
                className={[s.badge, allPassed ? s.badgePass : s.badgeFail]
                  .filter(Boolean)
                  .join(" ")}
              >
                {testsBadge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );

  /** Everything the phone header cannot fit, for the More menu. */
  const moreItems: MoreMenuItem[] = [
    ...(!multiStep && challenge.languages.length > 1
      ? [
          {
            kind: "radios" as const,
            label: "Language",
            options: challenge.languages.map((l) => ({
              id: l.id,
              label: l.label,
              checked: l.id === language?.id,
              onSelect: () => setLangId(l.id),
            })),
          },
          { kind: "separator" as const },
        ]
      : []),
    undoableDraft === null
      ? {
          kind: "action" as const,
          label: "Reset code",
          icon: <RotateCcw size={15} strokeWidth={2} aria-hidden="true" />,
          onSelect: resetCode,
        }
      : {
          kind: "action" as const,
          label: "Undo reset",
          icon: <Undo2 size={15} strokeWidth={2} aria-hidden="true" />,
          onSelect: undoReset,
        },
    {
      kind: "action",
      label: "Solution",
      icon: <Eye size={15} strokeWidth={2} aria-hidden="true" />,
      onSelect: () => {
        setResultTab("solution");
        setMobileView("results");
      },
    },
    {
      kind: "action",
      label: "Submissions",
      icon: <History size={15} strokeWidth={2} aria-hidden="true" />,
      onSelect: () => {
        setResultTab("subs");
        setMobileView("results");
      },
    },
    ...(prev || next ? [{ kind: "separator" as const }] : []),
    ...(prev
      ? [
          {
            kind: "link" as const,
            label: `Previous: ${prev.title}`,
            ariaLabel: `Previous challenge: ${prev.title}`,
            icon: <ChevronLeft size={15} strokeWidth={2} aria-hidden="true" />,
            href: `/challenges/${prev.slug}`,
          },
        ]
      : []),
    ...(next
      ? [
          {
            kind: "link" as const,
            label: `Next: ${next.title}`,
            ariaLabel: nextChallengeLabel,
            icon: <ChevronRight size={15} strokeWidth={2} aria-hidden="true" />,
            href: `/challenges/${next.slug}`,
          },
        ]
      : []),
  ];

  const editorPane = (mobile: boolean) => {
    if (multiStep && !stepUnlocked) {
      return (
        <div className={mobile ? `${s.editorEmpty} ${s.mEditorEmpty}` : s.editorEmpty}>
          <Lock size={22} strokeWidth={2} aria-hidden="true" />
          <span className={s.editorEmptyText}>
            Editor unlocks when step {gatingStep} passes
          </span>
        </div>
      );
    }
    return (
      <ChallengeEditor
        value={code}
        language={editorLanguage}
        onChange={setCode}
        taskKey={taskKey}
        label={`${multiStep ? challenge.languageLabel : (language?.shortLabel ?? "Code")} editor`}
        onSubmit={submit}
        onRun={run}
      />
    );
  };

  const bootNotice = runner.boot ? (
    <div className={s.bootNotice} role="status">
      <Loader2 size={14} className={s.spin} aria-hidden="true" />
      {runner.boot.message}
      {runner.boot.cold ? " (first run downloads the engine)" : ""}
    </div>
  ) : null;

  return (
    <div className={s.page}>
      <h1 className={s.srOnly}>{challenge.title}</h1>
      {/* The verdict renders into a panel nothing points a screen reader at,
          so it is mirrored here. Rendered always and filled after a run: a
          live region has to be in the DOM before the text arrives, or the
          announcement is missed. */}
      <div
        role="status"
        aria-live="polite"
        data-testid="challenge-announcement"
        className={s.srOnly}
      >
        {announcement}
      </div>

      {/* ─── Desktop ─────────────────────────────────────────────── */}
      <div className={s.desktopOnly}>
        <header className={s.topBar}>
          <div className={s.topBarLeft}>
            {/* Not prefetched: see the mobile back link. */}
            <Link href="/dashboard/challenges" prefetch={false} className={s.backLink}>
              <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
              Challenges
            </Link>
            <span className={s.vDivider} aria-hidden="true" />
            <span className={s.title}>{challenge.title}</span>
            <span className={s.difficulty}>
              <DifficultyMeter difficulty={challenge.difficulty} />
              <span className={s.difficultyLabel}>{challenge.difficulty}</span>
            </span>
            {progress.solved ? (
              <span className={s.solvedPill}>
                <CheckCircle2 size={13} strokeWidth={2} aria-hidden="true" />
                Solved
              </span>
            ) : null}
          </div>

          <div className={s.topBarRight}>
            {undoableDraft === null ? (
              <button type="button" className={s.ghostBtn} onClick={resetCode}>
                <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
                Reset
              </button>
            ) : (
              <button type="button" className={s.undoBtn} onClick={undoReset}>
                <Undo2 size={13} strokeWidth={2} aria-hidden="true" />
                Undo reset
              </button>
            )}
            <button
              type="button"
              className={s.secondaryBtn}
              onClick={run}
              disabled={busy !== null || !stepUnlocked}
            >
              {busy === "run" ? (
                <Loader2 size={13} className={s.spin} aria-hidden="true" />
              ) : (
                <Play size={13} strokeWidth={2} fill="currentColor" aria-hidden="true" />
              )}
              Run
            </button>
            <button
              type="button"
              // Once the last task is accepted, Submit steps back and the way
              // on takes the primary slot.
              className={finished ? s.secondaryBtn : s.primaryBtn}
              onClick={submit}
              disabled={busy !== null || !stepUnlocked}
            >
              {busy === "submit" ? (
                <Loader2 size={13} className={s.spin} aria-hidden="true" />
              ) : (
                <CheckCircle2 size={13} strokeWidth={2} aria-hidden="true" />
              )}
              {challenge.submitLabel}
            </button>
            {finished && next ? (
              <Link
                href={`/challenges/${next.slug}`}
                className={s.primaryBtn}
                aria-label={nextChallengeLabel}
              >
                Next challenge
                <ChevronRight size={13} strokeWidth={2} aria-hidden="true" />
              </Link>
            ) : null}
            <span className={s.vDivider} aria-hidden="true" />
            <nav className={s.navPair} aria-label="Other challenges">
              <NeighbourLink target={prev} direction="previous" />
              <NeighbourLink target={next} direction="next" />
            </nav>
          </div>
        </header>

        <div className={s.split} ref={splitRef}>
          <section className={s.instructionsPane}>
            {multiStep ? (
              <div className={s.stepper}>
                {challenge.steps.map((st, i) => {
                  const active = i === stepIndex;
                  const passed = progress.passedSteps.includes(st.n);
                  const locked = !isStepUnlocked(challenge, i, progress.passedSteps);
                  const tip = `Step ${st.n} · ${st.title}${
                    passed ? " · passed" : locked ? " · locked" : ""
                  }`;
                  return (
                    <div
                      key={st.n}
                      className={[s.stepItem, active ? s.stepItemActive : ""]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <button
                        type="button"
                        title={tip}
                        aria-label={tip}
                        aria-current={active ? "step" : undefined}
                        onClick={() => setStepIndex(i)}
                        className={[
                          s.stepMark,
                          passed ? s.stepMarkPassed : "",
                          locked ? s.stepMarkLocked : "",
                          active ? s.stepMarkActive : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <span
                          className={[
                            s.stepNum,
                            passed ? s.stepNumFaded : "",
                            locked ? s.stepNumLocked : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {st.n}
                        </span>
                        {passed ? (
                          <span className={s.stepGlyph}>
                            <Check size={11} strokeWidth={3.8} aria-hidden="true" />
                          </span>
                        ) : null}
                        {locked ? (
                          <span className={s.stepGlyph}>
                            <Lock
                              size={10}
                              strokeWidth={3}
                              aria-hidden="true"
                              color="var(--cw-text-muted)"
                            />
                          </span>
                        ) : null}
                      </button>
                      {active ? <span className={s.stepTitle}>{st.title}</span> : null}
                      {i < challenge.steps.length - 1 ? (
                        <span
                          aria-hidden="true"
                          className={[s.connector, passed ? s.connectorPassed : ""]
                            .filter(Boolean)
                            .join(" ")}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className={s.instructionsBody}>
              {multiStep && !stepUnlocked ? (
                <div className={s.lockedCard}>
                  <Lock
                    size={18}
                    strokeWidth={2}
                    aria-hidden="true"
                    color="var(--cw-text-faint)"
                  />
                  <h2 className={s.lockedTitle}>{step?.title}</h2>
                  <p className={s.lockedText}>
                    Opens once step {gatingStep} passes.
                  </p>
                  <button
                    type="button"
                    className={s.secondaryBtn}
                    onClick={() =>
                      setStepIndex(openStepIndex(challenge, progress.passedSteps))
                    }
                  >
                    Back to step {gatingStep}
                  </button>
                </div>
              ) : (
                <InstructionBlocks
                  blocks={instructions}
                  signature={language?.signature}
                  language={language?.id}
                />
              )}
              {challenge.schema.length > 0 ? (
                <>
                  <h3 className={`${s.blockLabel} ${s.schemaLabel}`}>Schema</h3>
                  <SchemaList tables={challenge.schema} />
                </>
              ) : null}
            </div>
          </section>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize instructions pane"
            tabIndex={0}
            className={s.colResizer}
            onMouseDown={startColDrag}
            onKeyDown={onColKey}
          />

          <section className={s.workspacePane} ref={rowsRef}>
            <div className={s.paneColumn}>
              <div
                className={
                  challenge.languages.length > 1
                    ? `${s.paneHead} ${s.paneHeadOverflow}`
                    : s.paneHead
                }
              >
                {challenge.languages.length > 1 ? (
                  <div className={s.langWrap} ref={langWrapRef}>
                    <button
                      type="button"
                      className={s.langBtn}
                      aria-haspopup="listbox"
                      aria-expanded={langOpen}
                      onClick={() => setLangOpen((v) => !v)}
                    >
                      <Code2 size={13} strokeWidth={2} aria-hidden="true" />
                      <span>{language?.label}</span>
                      <ChevronDown
                        size={12}
                        strokeWidth={2}
                        aria-hidden="true"
                        className={s.langCaret}
                      />
                    </button>
                    {langOpen ? (
                      <div className={s.langMenu} role="listbox">
                        {challenge.languages.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            role="option"
                            aria-selected={l.id === language?.id}
                            className={s.langOption}
                            onClick={() => {
                              setLangId(l.id);
                              setLangOpen(false);
                            }}
                          >
                            <span className={s.langOptionLabel}>{l.label}</span>
                            {l.id === language?.id ? (
                              <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <span className={s.editorLabel}>
                    <Database size={13} strokeWidth={2} aria-hidden="true" />
                    {language?.shortLabel}
                  </span>
                )}
                <div className={s.paneHeadRight}>
                  {/* WCAG 2.1.2 asks that the way out of a keyboard trap be
                      advertised, not just implemented. */}
                  <span className={s.editorHint}>
                    <kbd className={s.kbd}>Esc</kbd> then{" "}
                    <kbd className={s.kbd}>Tab</kbd> leaves the editor
                  </span>
                  <span className={s.runMeta}>{outcome?.meta ?? ""}</span>
                </div>
              </div>

              <div className={s.editorScroll}>{editorPane(false)}</div>
              {bootNotice}
            </div>

            <div
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize editor"
              tabIndex={0}
              className={s.rowResizer}
              onMouseDown={startRowDrag}
              onKeyDown={onRowKey}
            />

            <div className={s.paneColumn}>
              <div className={s.paneHead}>{resultTabs(false)}</div>
              <div
                ref={panelRef}
                role="tabpanel"
                id={panelId(false)}
                aria-labelledby={tabId(false, resultTab)}
                // A scrolling panel with nothing focusable in it (the Output
                // tab, often) must still be reachable to scroll by keyboard.
                tabIndex={0}
                className={s.resultBody}
              >
                {resultPanel(false)}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ─── Mobile ──────────────────────────────────────────────── */}
      <div className={s.mobileOnly}>
        <header className={s.mHeader}>
          {/* Not prefetched. The catalog carries every row of the list, the
              workspace is a page people stay on, and this link and the
              desktop one both point there: a prefetch on every visit bought
              nothing. */}
          <Link
            href="/dashboard/challenges"
            prefetch={false}
            className={`${s.mIconBtn} ${s.mIconBtnLead}`}
            aria-label="Back to challenges"
          >
            <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
          </Link>
          <div className={s.mTitleBlock}>
            <span className={s.mTitle}>{challenge.title}</span>
            <span className={s.mSubtitle}>
              <DifficultyMeter difficulty={challenge.difficulty} mobile />
              <span className={s.mSubtitleText}>
                {challenge.difficulty} · {challenge.languageLabel}
              </span>
            </span>
          </div>
          <MoreMenu items={moreItems} className={`${s.mIconBtn} ${s.mIconBtnTrail}`} />
        </header>

        {multiStep ? (
          <div className={s.mStepper}>
            {challenge.steps.map((st, i) => {
              const active = i === stepIndex;
              const passed = progress.passedSteps.includes(st.n);
              const locked = !isStepUnlocked(challenge, i, progress.passedSteps);
              return (
                <Fragment key={st.n}>
                  <button
                    type="button"
                    aria-label={`Step ${st.n} · ${st.title}`}
                    aria-current={active ? "step" : undefined}
                    onClick={() => {
                      setStepIndex(i);
                      if (locked) setMobileView("problem");
                    }}
                    className={[s.mStep, active ? s.mStepActive : ""]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span
                      className={[
                        s.mStepMark,
                        passed ? s.mStepMarkPassed : "",
                        locked ? s.mStepMarkLocked : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {passed ? (
                        <Check size={13} strokeWidth={2.5} aria-hidden="true" />
                      ) : locked ? (
                        <Lock
                          size={11}
                          strokeWidth={2}
                          aria-hidden="true"
                          color="var(--cw-text-faint)"
                        />
                      ) : (
                        <span className={s.mStepNum}>{st.n}</span>
                      )}
                    </span>
                    <span
                      className={[
                        s.mStepLabel,
                        active ? s.mStepLabelActive : "",
                        locked ? s.mStepLabelLocked : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {st.short}
                    </span>
                  </button>
                  {i < challenge.steps.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className={[s.mConnector, passed ? s.connectorPassed : ""]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </div>
        ) : null}

        <div className={`${s.mBody} ${s.noScrollbar}`}>
          {mobileView === "problem" ? (
            <div className={s.mProblem}>
              {multiStep && !stepUnlocked ? (
                <div className={s.lockedCard}>
                  <Lock
                    size={18}
                    strokeWidth={2}
                    aria-hidden="true"
                    color="var(--cw-text-faint)"
                  />
                  <h2 className={s.lockedTitle}>{step?.title}</h2>
                  <p className={s.lockedText}>Opens once step {gatingStep} passes.</p>
                </div>
              ) : (
                <InstructionBlocks
                  blocks={instructions}
                  signature={language?.signature}
                  language={language?.id}
                />
              )}
              {challenge.schema.length > 0 ? (
                <>
                  <h3 className={s.blockLabel}>Schema</h3>
                  <SchemaAccordion
                    tables={challenge.schema}
                    openTable={openTable}
                    onToggle={(name) =>
                      setOpenTable((cur) => (cur === name ? null : name))
                    }
                  />
                </>
              ) : null}
            </div>
          ) : null}

          {mobileView === "code" ? (
            <div className={s.mCodePane}>
              <div className={s.mCodeHead}>
                <span className={s.editorLabel}>
                  {challenge.languages.length > 1 ? (
                    <Code2 size={13} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <Database size={13} strokeWidth={2} aria-hidden="true" />
                  )}
                  {language?.shortLabel}
                </span>
                <span className={s.mCodeHeadRight}>
                  {savedHere ? <span className={s.mAutosaved}>Autosaved</span> : null}
                  {undoableDraft === null ? (
                    <button
                      type="button"
                      className={`${s.mIconBtn} ${s.mIconBtnTrail}`}
                      aria-label="Reset code"
                      onClick={resetCode}
                    >
                      <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`${s.mIconBtn} ${s.mIconBtnTrail} ${s.mIconBtnUndo}`}
                      aria-label="Undo reset and restore your code"
                      onClick={undoReset}
                    >
                      <Undo2 size={14} strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                </span>
              </div>
              {editorPane(true)}
              {bootNotice}
              {challenge.keyStrip.length > 0 && stepUnlocked ? (
                <div className={s.mKeyStrip}>
                  <div className={`${s.mKeyRow} ${s.noScrollbar}`}>
                    {challenge.keyStrip.map((key) => (
                      <button
                        key={key}
                        type="button"
                        className={s.mKey}
                        onClick={() => setCode(`${code}${key} `)}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                  <span aria-hidden="true" className={s.mKeyFade} />
                </div>
              ) : null}
            </div>
          ) : null}

          {mobileView === "results" ? (
            <div className={s.stack}>
              {resultTabs(true)}
              <div
                ref={mobilePanelRef}
                role="tabpanel"
                id={panelId(true)}
                aria-labelledby={tabId(true, resultTab)}
                tabIndex={0}
                className={s.mResultPanel}
              >
                {resultPanel(true)}
              </div>
            </div>
          ) : null}
        </div>

        <div className={s.mActionBar}>
          {/* Run is hidden on the Problem tab: there is no code in view to
              run from there. Flagged in the mobile design review. */}
          {mobileView !== "problem" ? (
            <button
              type="button"
              className={`${s.secondaryBtn} ${s.mActionBtn}`}
              onClick={run}
              disabled={busy !== null || !stepUnlocked}
            >
              {busy === "run" ? (
                <Loader2 size={14} className={s.spin} aria-hidden="true" />
              ) : (
                <Play size={14} strokeWidth={2} fill="currentColor" aria-hidden="true" />
              )}
              Run
            </button>
          ) : null}
          <button
            type="button"
            className={`${s.primaryBtn} ${s.mActionBtn}`}
            onClick={submit}
            disabled={busy !== null || !stepUnlocked}
          >
            {busy === "submit" ? (
              <Loader2 size={14} className={s.spin} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
            )}
            {challenge.submitLabel}
          </button>
        </div>

        <nav className={s.mNav}>
          {(
            [
              { id: "problem", label: "Problem", Icon: BookOpen },
              { id: "code", label: "Code", Icon: Code2 },
              { id: "results", label: "Results", Icon: Table2 },
            ] as const
          ).map(({ id, label, Icon }) => {
            const on = mobileView === id;
            const dot = id === "results" && tests.length > 0 && !allPassed;
            return (
              <button
                key={id}
                type="button"
                className={[s.mNavBtn, on ? s.mNavBtnOn : ""].filter(Boolean).join(" ")}
                aria-current={on ? "page" : undefined}
                onClick={() => setMobileView(id)}
              >
                <span className={s.mNavIcon}>
                  <Icon size={19} strokeWidth={2} aria-hidden="true" />
                  {dot ? <span aria-hidden="true" className={s.mNavDot} /> : null}
                </span>
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function EmptyResults({ text }: { text: string }) {
  return <p className={s.emptyResults}>{text}</p>;
}

/**
 * The top bar's previous and next chevrons: links to the neighbouring
 * challenges in catalog order, named for where they go. At either end of the
 * catalog there is nowhere to go, so the control stays in place, disabled,
 * rather than shifting its partner sideways.
 */
function NeighbourLink({
  target,
  direction,
}: {
  target: ChallengeLink | null;
  direction: "previous" | "next";
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const word = direction === "previous" ? "Previous" : "Next";
  if (!target) {
    return (
      <button type="button" className={s.iconBtn} disabled aria-label={`No ${direction} challenge`}>
        <Icon size={15} strokeWidth={2} aria-hidden="true" />
      </button>
    );
  }
  return (
    <Link
      href={`/challenges/${target.slug}`}
      // A workspace page carries its whole challenge; fetching two more on
      // every visit, for controls most visits never use, is not worth it.
      prefetch={false}
      className={s.iconBtn}
      aria-label={`${word} challenge: ${target.title}`}
      title={`${word}: ${target.title}`}
    >
      <Icon size={15} strokeWidth={2} aria-hidden="true" />
    </Link>
  );
}
