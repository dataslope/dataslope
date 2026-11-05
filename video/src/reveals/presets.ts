import type { LogoRevealProps } from "./LogoReveal";

/**
 * The logo reveals in the Studio's Logo-Reveals folder. Every one is the same
 * component with different props, so any mark motion, text motion, layout and
 * theme can be combined in the Studio's props panel, and an opener names any
 * course by editing `course`, `unit` and `title`.
 *
 * Stings are the mark and wordmark alone. Openers add a course and unit; four
 * of them set every line at one size, "Dataslope" included, and the fifth
 * (`headline`) keeps a hierarchy for comparison. Inter is the face, and the
 * one to prefer; the last three repeat an Inter opener with only the face
 * changed, to compare against it.
 */
const INTER: { id: string; props: LogoRevealProps }[] = [
  sting("Sting-1-Assemble", { motion: "assemble", text: "ink" }),
  sting("Sting-2-Plot", { motion: "plot", text: "letters" }),
  sting("Sting-3-Histogram", { motion: "histogram", text: "slide" }),
  sting("Sting-4-Scatter", { motion: "scatter", text: "blur" }),
  sting("Sting-5-UnfoldDark", { motion: "unfold", text: "type", theme: "dark" }),
  opener("Opener-1-Stack", {
    layout: "stack",
    motion: "rise",
    text: "slide",
    course: "Statistics for Data Science with Python",
    unit: "Unit 2",
    title: "Describing data",
  }),
  opener("Opener-2-Block", {
    layout: "block",
    motion: "plot",
    text: "ink",
    course: "Database Design with PostgreSQL",
    unit: "Unit 3",
    title: "Relationships",
  }),
  opener("Opener-3-Centered", {
    layout: "centered",
    motion: "unfold",
    text: "letters",
    course: "How Large Language Models Work",
    unit: "Unit 3",
    title: "Choosing the next token",
  }),
  opener("Opener-4-Columns", {
    layout: "columns",
    motion: "assemble",
    text: "blur",
    course: "Natural Language Processing with Python",
    unit: "Unit 2",
    title: "Cleaning text",
  }),
  opener("Opener-5-Headline", {
    layout: "headline",
    motion: "histogram",
    text: "ink",
    course: "Statistics for Data Science with Python",
    unit: "Unit 7",
    title: "Testing hypotheses",
  }),
];

/** An Inter opener's props, by id. */
function find(id: string): LogoRevealProps {
  const found = INTER.find((r) => r.id === id);
  if (!found) throw new Error(`no reveal ${id}`);
  return found.props;
}

export const REVEALS: { id: string; props: LogoRevealProps }[] = [
  ...INTER,
  // The same openers in other faces, to compare against Inter: each is an
  // Inter opener above with only `face` changed.
  { id: "Opener-6-Stack-SourceSerif", props: { ...find("Opener-1-Stack"), face: "source-serif" } },
  { id: "Opener-7-Centered-Fraunces", props: { ...find("Opener-3-Centered"), face: "fraunces" } },
  { id: "Opener-8-Columns-Mono", props: { ...find("Opener-4-Columns"), face: "jetbrains-mono" } },
];

function sting(id: string, p: Pick<LogoRevealProps, "motion" | "text"> & Partial<LogoRevealProps>) {
  return {
    id,
    props: { layout: "sting", theme: "light", face: "inter", course: "", unit: "", title: "", sfx: true, ...p } satisfies LogoRevealProps,
  };
}

function opener(id: string, p: Pick<LogoRevealProps, "layout" | "motion" | "text" | "course" | "unit" | "title"> & Partial<LogoRevealProps>) {
  return { id, props: { theme: "light", face: "inter", sfx: true, ...p } satisfies LogoRevealProps };
}
