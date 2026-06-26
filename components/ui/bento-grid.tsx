import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { ArrowRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// Magic UI Bento Grid (https://magicui.design/docs/components/bento-grid).
// Vendored into components/ui like the project's other Magic UI primitives.
// The upstream component depends on a shadcn `<Button>` and
// `@radix-ui/react-icons`, neither of which this project installs, so the CTA
// is rendered as a plain anchor and the arrow comes from lucide-react (the
// icon library already used across the home page).

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ElementType;
  description: string;
  href: string;
  cta: string;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
      // light styles
      "bg-background [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
      // dark styles
      "transform-gpu dark:bg-background dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      className,
    )}
    {...props}
  >
    <div>{background}</div>
    {/* Page-coloured scrim so the animated background reads softly behind the
        card copy (white in light mode, #121212 in dark). */}
    <div className="pointer-events-none absolute inset-0 bg-white/60 dark:bg-[#121212]/60" />
    <div className="p-6">
      <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-10">
        <Icon className="mb-3 h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75 dark:text-neutral-300" />
        <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
          {name}
        </h3>
        <p className="max-w-lg text-neutral-400">{description}</p>
      </div>

      {/* Always-visible CTA on touch/small screens (no hover to reveal it). */}
      <div className="pointer-events-none mt-3 flex w-full transform-gpu flex-row items-center transition-all duration-300 lg:hidden">
        <a
          href={href}
          className="pointer-events-auto inline-flex items-center text-sm font-medium text-[var(--ds-blue-600)] dark:text-[var(--ds-blue-300)]"
        >
          {cta}
          <ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" />
        </a>
      </div>
    </div>

    {/* Hover-revealed CTA on large screens. */}
    <div
      className={cn(
        "pointer-events-none absolute bottom-0 hidden w-full translate-y-10 transform-gpu flex-row items-center p-6 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex",
      )}
    >
      <a
        href={href}
        className="pointer-events-auto inline-flex items-center text-sm font-medium text-[var(--ds-blue-600)] dark:text-[var(--ds-blue-300)]"
      >
        {cta}
        <ArrowRightIcon className="ms-2 h-4 w-4 rtl:rotate-180" />
      </a>
    </div>

    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10" />
  </div>
);

export { BentoCard, BentoGrid };
