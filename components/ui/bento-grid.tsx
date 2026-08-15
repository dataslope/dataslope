import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { ArrowRightIcon } from "lucide-react";

import { cn } from "@/lib/utils";

// Vendored Magic UI Bento Grid (https://magicui.design/docs/components/bento-grid).
// Upstream's shadcn <Button> and @radix-ui/react-icons aren't installed here,
// so the CTA is a plain anchor with a lucide-react arrow.

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
  /** Optional always-visible CTA link; omit both `href` and `cta` for a link-less card. */
  href?: string;
  cta?: string;
  /** Overrides the icon's size/spacing classes; merged after the defaults so it wins. */
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
      {/* Page-colored scrim to soften the animated background behind the copy. */}
      <div className="pointer-events-none absolute inset-0 bg-white/60 dark:bg-[#121212]/60" />
      {/* `relative` is required: a bare `z-10` on a static element has no effect. */}
      <div className="relative z-10 p-6">
        <div className="pointer-events-none flex flex-col gap-1">
          {/* scale-75/origin-left pins the icon at one size (no hover resize). */}
          <Icon
            className={cn(
              "mb-3 h-12 w-12 origin-left scale-75 transform-gpu text-[var(--ds-gray-900)] dark:text-white",
              iconClassName,
            )}
          />
          <h3 className="text-xl font-semibold text-[var(--ds-gray-900)] dark:text-white">
            {name}
          </h3>
          <p className="max-w-lg text-[var(--ds-gray-900)] dark:text-white">
            {description}
          </p>
        </div>

        {/* CTA is always shown — no upstream hover reveal. */}
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
