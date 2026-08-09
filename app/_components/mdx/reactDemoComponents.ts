/**
 * Server-safe registry of the React-course demo components.
 *
 * This module is deliberately NOT `"use client"`. The lazy demo wrappers live
 * in `lazyReactDemos.ts` (which is a client module); here we import them by
 * name and group them into a plain object that `mdx-components.tsx` spreads
 * into the MDX component map.
 *
 * Why the object cannot live in that client module: React Server Components
 * turn every export of a `"use client"` module into an opaque client
 * *reference*, so an object exported from there spreads to nothing on the
 * server. Named component references survive individual import, though, so
 * re-collecting them in this ordinary module produces a real, spreadable
 * object whose values are valid client references.
 */

import {
  GreetingDemo,
  StarRatingDemo,
  AvatarDemo,
  UserCardDemo,
  BadgeDemo,
  ListDemo,
  FilterListDemo,
  CounterDemo,
  ToggleDemo,
  ColorPickerDemo,
  LikeButtonDemo,
  KeyPressDemo,
  TextMirrorDemo,
  SignupFormDemo,
  TemperatureDemo,
  ClockDemo,
  WindowWidthDemo,
  DataFetchDemo,
  PanelDemo,
  SlotsDemo,
  TabsDemo,
  ChildrenCountDemo,
  UseToggleDemo,
  StopwatchDemo,
  UseLocalStorageDemo,
  TodoDemo,
  AuthToggleDemo,
  CartBadgeDemo,
  ImmutableListDemo,
  SettingsObjectDemo,
  FocusInputDemo,
  SilentCounterDemo,
  ThemeContextDemo,
} from "./lazyReactDemos";

export const reactDemoComponents = {
  GreetingDemo,
  StarRatingDemo,
  AvatarDemo,
  UserCardDemo,
  BadgeDemo,
  ListDemo,
  FilterListDemo,
  CounterDemo,
  ToggleDemo,
  ColorPickerDemo,
  LikeButtonDemo,
  KeyPressDemo,
  TextMirrorDemo,
  SignupFormDemo,
  TemperatureDemo,
  ClockDemo,
  WindowWidthDemo,
  DataFetchDemo,
  PanelDemo,
  SlotsDemo,
  TabsDemo,
  ChildrenCountDemo,
  UseToggleDemo,
  StopwatchDemo,
  UseLocalStorageDemo,
  TodoDemo,
  AuthToggleDemo,
  CartBadgeDemo,
  ImmutableListDemo,
  SettingsObjectDemo,
  FocusInputDemo,
  SilentCounterDemo,
  ThemeContextDemo,
};
