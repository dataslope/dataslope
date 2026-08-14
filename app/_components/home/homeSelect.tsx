import { BorderBeam } from "@/components/ui/border-beam";

/**
 * Shared chrome for the home page's Base UI Select triggers so they read as
 * one component. Callers add their own `min-w-*` and drop a
 * <HomeSelectBeam /> inside the trigger.
 */
export const HOME_SELECT_TRIGGER =
  "relative inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--ds-gray-300)] bg-white px-3.5 py-2 text-sm font-medium text-[var(--ds-gray-800)] shadow-sm transition-colors hover:border-[var(--ds-blue-400)] focus-visible:border-[var(--ds-blue-500)] focus-visible:outline-none dark:border-white/15 dark:bg-[#121212] dark:text-[var(--ds-gray-100)] dark:hover:border-[var(--ds-blue-400)]";

/** Shared popup surface (page-body background + hairline border/shadow).
 *  Callers add their own `min-w-*`. */
export const HOME_SELECT_POPUP =
  "max-h-[60vh] overflow-y-auto rounded-xl border border-[var(--ds-gray-200)] bg-white p-1.5 shadow-xl shadow-black/5 outline-none transition-[opacity,transform] data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 dark:border-white/10 dark:bg-[#121212] dark:shadow-black/40";

/** Shared option row (Base UI Select.Item) styling. */
export const HOME_SELECT_ITEM =
  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--ds-gray-700)] outline-none transition-colors data-[highlighted]:bg-[var(--ds-gray-100)] data-[highlighted]:text-[var(--ds-gray-900)] data-[selected]:font-medium data-[selected]:text-[var(--ds-blue-700)] dark:text-[var(--ds-gray-200)] dark:data-[highlighted]:bg-white/[0.06] dark:data-[highlighted]:text-white dark:data-[selected]:text-[var(--ds-blue-400)]";

/** The travelling blue beam that rides the trigger's border. */
export function HomeSelectBeam() {
  return (
    <BorderBeam
      size={40}
      duration={6}
      colorFrom="var(--ds-blue-400)"
      colorTo="var(--ds-blue-600)"
    />
  );
}
