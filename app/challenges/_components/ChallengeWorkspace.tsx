"use client";

/**
 * The full-page challenge workspace.
 *
 * One state object drives two layouts: the desktop three-pane split and, under
 * 768px, the same content as Problem / Code / Results tabs. Both trees are in
 * the DOM and the media query in the stylesheet decides which one paints, so a
 * phone never flashes the desktop layout while a viewport check settles.
 *
 * Everything the panes show comes from `lib/challenges`. Run and Submit
 * select the tab whose canned result answers them; they do not execute the
 * editor's code, and the editor is a highlighted, read-only snapshot rather
 * than CodeMirror. Both are the seams to cut when this gets a real runtime.
 */

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
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
  EllipsisVertical,
  Lock,
  Play,
  RotateCcw,
  Table2,
  Wand2,
} from "lucide-react";
import {
  initialStepIndex,
  isMultiStep,
  type Challenge,
  type ChallengeStep,
} from "@/lib/challenges";
import {
  CodeView,
  DifficultyMeter,
  InstructionBlocks,
  MobileSubmissions,
  OutputPanelView,
  SchemaAccordion,
  SchemaList,
  SolutionPanelView,
  SubmissionsPanel,
  TestsPanel,
} from "./parts";
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

export function ChallengeWorkspace({ challenge }: { challenge: Challenge }) {
  const multiStep = isMultiStep(challenge);

  const [stepIndex, setStepIndex] = useState(() => initialStepIndex(challenge));
  const [resultTab, setResultTab] = useState<ResultTab>("output");
  const [langId, setLangId] = useState(challenge.languages[0]?.id);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("code");
  const [openTable, setOpenTable] = useState<string | null>(null);

  const splitRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const langWrapRef = useRef<HTMLDivElement>(null);

  // The workspace owns the viewport: the panes scroll, the document does not.
  // Same contract as the playground shells (`body.playground-active`).
  useEffect(() => {
    document.body.classList.add("challenge-active");
    return () => document.body.classList.remove("challenge-active");
  }, []);

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

  const step: ChallengeStep | undefined = multiStep
    ? challenge.steps[stepIndex]
    : undefined;
  const stepLocked = step?.state === "locked";
  // The step that has to pass before this one opens, for the locked-editor
  // copy. Trimmed of its leading zero: "step 2", not "step 02".
  const gatingStep = challenge.steps[stepIndex - 1]?.n.replace(/^0+/, "") ?? "";

  const language =
    challenge.languages.find((l) => l.id === langId) ?? challenge.languages[0];

  const instructions = multiStep ? (step?.instructions ?? []) : challenge.instructions;
  const editorSource = multiStep ? step?.source : language?.source;
  const editorLanguage = multiStep ? "sql" : (language?.id ?? "sql");

  const goToStep = useCallback((stepNumber: number) => {
    setStepIndex(stepNumber - 1);
  }, []);

  const run = useCallback(() => {
    setResultTab("output");
    setLangOpen(false);
    setMobileView("results");
  }, []);

  const submit = useCallback(() => {
    setResultTab("tests");
    setLangOpen(false);
    setMobileView("results");
  }, []);

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

  const startColDrag = useCallback(
    (e: React.MouseEvent) => {
      const el = splitRef.current;
      if (!el) return;
      e.preventDefault();
      const left = el.getBoundingClientRect().left;
      const move = (ev: MouseEvent) => setColumns(ev.clientX - left);
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        document.body.style.userSelect = "";
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      document.body.style.userSelect = "none";
    },
    [setColumns],
  );

  const startRowDrag = useCallback(
    (e: React.MouseEvent) => {
      const el = rowsRef.current;
      if (!el) return;
      e.preventDefault();
      const bottom = el.getBoundingClientRect().bottom;
      const move = (ev: MouseEvent) => setRows(bottom - ev.clientY);
      const up = () => {
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        document.body.style.userSelect = "";
      };
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
      document.body.style.userSelect = "none";
    },
    [setRows],
  );

  // Keyboard equivalents, so the split isn't mouse-only.
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

  // ─── Shared fragments ──────────────────────────────────────────────

  const resultPanel = (mobile: boolean) => {
    switch (resultTab) {
      case "output":
        return <OutputPanelView output={challenge.output} mobile={mobile} />;
      case "tests":
        return <TestsPanel challenge={challenge} mobile={mobile} />;
      case "solution":
        return <SolutionPanelView solution={challenge.solution} />;
      case "subs":
        return mobile ? (
          <MobileSubmissions challenge={challenge} />
        ) : (
          <SubmissionsPanel challenge={challenge} />
        );
    }
  };

  const tabButtons = (mobile: boolean) =>
    RESULT_TABS.map((tab) => {
      const on = resultTab === tab.id;
      const failing = tab.id === "tests" && challenge.tests.some((t) => !t.pass);
      return (
        <button
          key={tab.id}
          type="button"
          className={[s.tab, mobile ? s.mTab : "", on ? s.tabOn : ""]
            .filter(Boolean)
            .join(" ")}
          aria-current={on ? "true" : undefined}
          onClick={() => setResultTab(tab.id)}
        >
          <span>{mobile ? (tab.shortLabel ?? tab.label) : tab.label}</span>
          {tab.id === "tests" ? (
            <span className={[s.badge, failing ? s.badgeFail : ""].filter(Boolean).join(" ")}>
              {challenge.testsBadge}
            </span>
          ) : null}
        </button>
      );
    });

  return (
    <div className={s.page}>
      <h1 className={s.srOnly}>{challenge.title}</h1>

      {/* ─── Desktop ─────────────────────────────────────────────── */}
      <div className={s.desktopOnly}>
        <header className={s.topBar}>
          <div className={s.topBarLeft}>
            <Link href="/courses" className={s.backLink}>
              <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" />
              Courses
            </Link>
            <span className={s.vDivider} aria-hidden="true" />
            <span className={s.title}>{challenge.title}</span>
            <span className={s.difficulty}>
              <DifficultyMeter difficulty={challenge.difficulty} />
              <span className={s.difficultyLabel}>{challenge.difficulty}</span>
            </span>
          </div>

          <div className={s.topBarRight}>
            <button type="button" className={s.ghostBtn}>
              <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
              Reset
            </button>
            <button type="button" className={s.secondaryBtn} onClick={run}>
              <Play size={13} strokeWidth={2} fill="currentColor" aria-hidden="true" />
              Run
            </button>
            <button type="button" className={s.primaryBtn} onClick={submit}>
              <CheckCircle2 size={13} strokeWidth={2} aria-hidden="true" />
              {challenge.submitLabel}
            </button>
            <span className={s.vDivider} aria-hidden="true" />
            <span className={s.navPair}>
              <button type="button" className={s.iconBtn} aria-label="Previous problem">
                <ChevronLeft size={15} strokeWidth={2} aria-hidden="true" />
              </button>
              <button type="button" className={s.iconBtn} aria-label="Next problem">
                <ChevronRight size={15} strokeWidth={2} aria-hidden="true" />
              </button>
            </span>
          </div>
        </header>

        <div className={s.split} ref={splitRef}>
          <section className={s.instructionsPane}>
            {multiStep ? (
              <div className={s.stepper}>
                {challenge.steps.map((st, i) => {
                  const active = i === stepIndex;
                  const locked = st.state === "locked";
                  const passed = st.state === "passed";
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
              <InstructionBlocks
                blocks={instructions}
                signature={language?.signature}
                onBack={goToStep}
              />
              {challenge.schema.length > 0 ? (
                <>
                  <h3 className={`${s.blockLabel} ${s.schemaLabel}`}>
                    Schema
                  </h3>
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
                  <span className={s.runMeta}>{language?.runMeta}</span>
                  <button type="button" className={s.smallGhostBtn} aria-label="Format code">
                    <Wand2 size={13} strokeWidth={2} aria-hidden="true" />
                    Format
                  </button>
                </div>
              </div>

              <div className={s.editorScroll}>
                {stepLocked || !editorSource ? (
                  <div className={s.editorEmpty}>
                    <Lock size={22} strokeWidth={2} aria-hidden="true" />
                    <span className={s.editorEmptyText}>
                      Editor unlocks when step {gatingStep} passes
                    </span>
                  </div>
                ) : (
                  <CodeView
                    source={editorSource}
                    language={editorLanguage}
                    muted={step?.sourceMuted}
                  />
                )}
              </div>
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
              <div className={s.paneHead}>
                <div className={`${s.tabStrip} ${s.noScrollbar}`}>{tabButtons(false)}</div>
              </div>
              <div className={s.resultBody}>{resultPanel(false)}</div>
            </div>
          </section>
        </div>
      </div>

      {/* ─── Mobile ──────────────────────────────────────────────── */}
      <div className={s.mobileOnly}>
        <header className={s.mHeader}>
          <Link
            href="/courses"
            className={`${s.mIconBtn} ${s.mIconBtnLead}`}
            aria-label="Back to courses"
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
          <button
            type="button"
            className={`${s.mIconBtn} ${s.mIconBtnTrail}`}
            aria-label="More"
          >
            <EllipsisVertical size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>

        {multiStep ? (
          <div className={s.mStepper}>
            {challenge.steps.map((st, i) => {
              const active = i === stepIndex;
              const locked = st.state === "locked";
              const passed = st.state === "passed";
              return (
                <Fragment key={st.n}>
                  <button
                    type="button"
                    aria-label={`Step ${st.n} · ${st.title}`}
                    aria-current={active ? "step" : undefined}
                    onClick={() => {
                      setStepIndex(i);
                      // A locked step has no editor, so land on the brief.
                      if (st.state === "locked") setMobileView("problem");
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
              <InstructionBlocks
                blocks={instructions}
                signature={language?.signature}
                onBack={goToStep}
              />
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
                  <span className={s.mAutosaved}>Autosaved</span>
                  <button
                    type="button"
                    className={`${s.mIconBtn} ${s.mIconBtnTrail}`}
                    aria-label="Reset code"
                  >
                    <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
                  </button>
                </span>
              </div>

              {stepLocked || !editorSource ? (
                <div className={`${s.editorEmpty} ${s.mEditorEmpty}`}>
                  <Lock size={22} strokeWidth={2} aria-hidden="true" />
                  <span className={s.editorEmptyText}>
                    Editor unlocks when step {gatingStep} passes
                  </span>
                </div>
              ) : (
                <>
                  <div className={`${s.mCodeScroll} ${s.noScrollbar}`}>
                    <CodeView
                      source={editorSource}
                      language={editorLanguage}
                      muted={step?.sourceMuted}
                      mobile
                    />
                  </div>
                  {challenge.keyStrip.length > 0 ? (
                    <div className={s.mKeyStrip}>
                      <div className={`${s.mKeyRow} ${s.noScrollbar}`}>
                        {challenge.keyStrip.map((key) => (
                          <button key={key} type="button" className={s.mKey}>
                            {key}
                          </button>
                        ))}
                      </div>
                      <span aria-hidden="true" className={s.mKeyFade} />
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          {mobileView === "results" ? (
            <div className={s.stack}>
              <div className={`${s.mResultTabs} ${s.noScrollbar}`}>{tabButtons(true)}</div>
              {resultPanel(true)}
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
            >
              <Play size={14} strokeWidth={2} fill="currentColor" aria-hidden="true" />
              Run
            </button>
          ) : null}
          <button
            type="button"
            className={`${s.primaryBtn} ${s.mActionBtn}`}
            onClick={submit}
          >
            <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
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
            const dot = id === "results" && challenge.tests.some((t) => !t.pass);
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
