"use client";

/**
 * Lazily-loaded versions of the React-course demo components. `"use client"`
 * is load-bearing (see lazyWidgets.ts): an `import()` only splits inside the
 * client graph. All demos resolve to one shared async chunk that only a
 * React-course lesson fetches. reactDemoComponents.ts collects these into the
 * spreadable object the component map wants.
 */

import { lazyWidget } from "./lazyWidget";

export const GreetingDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.GreetingDemo),
);
export const StarRatingDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.StarRatingDemo),
);
export const AvatarDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.AvatarDemo),
);
export const UserCardDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.UserCardDemo),
);
export const BadgeDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.BadgeDemo),
);
export const ListDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.ListDemo),
);
export const FilterListDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.FilterListDemo),
);
export const CounterDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.CounterDemo),
);
export const ToggleDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.ToggleDemo),
);
export const ColorPickerDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.ColorPickerDemo),
);
export const LikeButtonDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.LikeButtonDemo),
);
export const KeyPressDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.KeyPressDemo),
);
export const TextMirrorDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.TextMirrorDemo),
);
export const SignupFormDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.SignupFormDemo),
);
export const TemperatureDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.TemperatureDemo),
);
export const ClockDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.ClockDemo),
);
export const WindowWidthDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.WindowWidthDemo),
);
export const DataFetchDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.DataFetchDemo),
);
export const PanelDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.PanelDemo),
);
export const SlotsDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.SlotsDemo),
);
export const TabsDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.TabsDemo),
);
export const ChildrenCountDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.ChildrenCountDemo),
);
export const UseToggleDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.UseToggleDemo),
);
export const StopwatchDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.StopwatchDemo),
);
export const UseLocalStorageDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.UseLocalStorageDemo),
);
export const TodoDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.TodoDemo),
);
export const AuthToggleDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.AuthToggleDemo),
);
export const CartBadgeDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.CartBadgeDemo),
);
export const ImmutableListDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.ImmutableListDemo),
);
export const SettingsObjectDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.SettingsObjectDemo),
);
export const FocusInputDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.FocusInputDemo),
);
export const SilentCounterDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.SilentCounterDemo),
);
export const ThemeContextDemo = lazyWidget(() =>
  import("./reactDemos").then((mod) => mod.ThemeContextDemo),
);
