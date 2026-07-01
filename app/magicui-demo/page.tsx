import { BlurFade } from "@/components/ui/blur-fade";
import { Marquee } from "@/components/ui/marquee";
import { ShimmerButton } from "@/components/ui/shimmer-button";

const runtimes = [
  "Pyodide",
  "DuckDB",
  "SQLite",
  "PGlite",
  "WebR",
  "PHP",
  "Java",
  "C++",
];

export default function MagicUIDemoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background px-6 py-24 text-foreground">
      <BlurFade delay={0.1}>
        <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl">
          Magic UI is wired up
        </h1>
      </BlurFade>

      <BlurFade delay={0.25}>
        <p className="max-w-xl text-center text-lg text-muted-foreground">
          Marquee, ShimmerButton and BlurFade rendering outside{" "}
          <code className="font-mono">/learn</code> and{" "}
          <code className="font-mono">/playground</code>, via the shared{" "}
          <code className="font-mono">app/tailwind.css</code> stylesheet.
        </p>
      </BlurFade>

      <BlurFade delay={0.4}>
        <ShimmerButton className="shadow-2xl">
          <span className="text-sm font-medium tracking-tight">
            Get started
          </span>
        </ShimmerButton>
      </BlurFade>

      <div className="relative mt-8 w-full max-w-3xl overflow-hidden">
        <Marquee pauseOnHover className="[--duration:20s]">
          {runtimes.map((name) => (
            <div
              key={name}
              className="mx-1 rounded-xl border border-border bg-card px-6 py-3 text-sm font-medium shadow-sm"
            >
              {name}
            </div>
          ))}
        </Marquee>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/6 bg-gradient-to-r from-background" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/6 bg-gradient-to-l from-background" />
      </div>
    </main>
  );
}
