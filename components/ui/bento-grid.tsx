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
  /** Optional CTA link, rendered (always visible) beneath the copy. When
   *  `href`/`cta` are omitted the card simply has no link. */
  href?: string;
  cta?: string;
  /** Override the icon's size/spacing classes (e.g. a smaller icon on
   *  link-less cards). Merged after the defaults so it wins. */
  iconClassName?: string;
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
  iconClassName,
  ...props
}: BentoCardProps) => {
  const hasCta = Boolean(href && cta);
  return (
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
      {/* `relative z-10` lifts the copy (and CTA) above the absolute scrim and
          hover-tint overlays, a bare `z-10` on a static element has no effect. */}
      <div className="relative z-10 p-6">
        <div className="pointer-events-none flex flex-col gap-1">
          {/* Icon size/position pinned to the former hover state (scale-75,
              shrinking from its left edge) so it no longer resizes on hover. */}
          <Icon
            className={cn(
              "mb-3 h-12 w-12 origin-left scale-75 transform-gpu text-[var(--ds-gray-900)] dark:text-white",
              iconClassName,
            )}
          />
          {/* Icon, heading, and paragraph all share the body font colour. */}
          <h3 className="text-xl font-semibold text-[var(--ds-gray-900)] dark:text-white">
            {name}
          </h3>
          <p className="max-w-lg text-[var(--ds-gray-900)] dark:text-white">
            {description}
          </p>
        </div>

        {/* CTA is always shown (no hover reveal), tinted brand green, and
            inherits the paragraph's font size (arrow sized to match via em). */}
        {hasCta && (
          <a
            href={href}
            className="group/cta pointer-events-auto mt-3 inline-flex items-center font-medium text-[var(--ds-green-500)] transition-colors hover:text-[var(--ds-green-600)] dark:text-[var(--ds-green-400)] dark:hover:text-[var(--ds-green-300)]"
          >
            {cta}
            <ArrowRightIcon className="ms-2 size-[1em] transition-transform group-hover/cta:translate-x-0.5 rtl:rotate-180" />
          </a>
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10" />
    </div>
  );
};

export { BentoCard, BentoGrid };
