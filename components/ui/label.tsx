import * as React from "react";

import { cn } from "@/lib/utils";

/** shadcn's Label sans the Radix wrapper (not installed here); a plain
 *  <label> covers htmlFor-associated form labels. */
function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex select-none items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
