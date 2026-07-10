import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/** A native <select> dressed in the shadcn Input chrome. The full shadcn
 *  Select needs @radix-ui/react-select, which the repo doesn't vendor;
 *  for the simple pick-one dropdowns in the builders the platform widget
 *  is lighter and just as capable. */
function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative w-full">
      <select
        data-slot="native-select"
        className={cn(
          "border-input dark:bg-input/30 dark:*:bg-input h-9 w-full appearance-none rounded-md border bg-transparent px-3 pr-8 text-base shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2"
      />
    </div>
  );
}

export { NativeSelect };
