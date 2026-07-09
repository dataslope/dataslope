import type { Completion } from "@codemirror/autocomplete";
import { C_KEYWORDS, C_LIBC } from "./c";

// Static completion tier for the C++ playground surfaces, the C list
// plus C++ keywords and the common std:: vocabulary. See c.ts for why
// this is a curated list rather than a language server.

const kw = (label: string): Completion => ({ label, type: "keyword" });
const ty = (label: string, detail?: string): Completion => ({
  label,
  type: "type",
  detail,
});
const fn = (label: string, detail: string): Completion => ({
  label,
  type: "function",
  detail,
});
const va = (label: string, detail?: string): Completion => ({
  label,
  type: "variable",
  detail,
});

const CPP_KEYWORDS: readonly Completion[] = [
  "alignas", "alignof", "and", "catch", "class", "concept", "consteval",
  "constexpr", "constinit", "const_cast", "co_await", "co_return",
  "co_yield", "decltype", "delete", "dynamic_cast", "explicit", "export",
  "final", "friend", "mutable", "namespace", "new", "noexcept", "not",
  "nullptr", "operator", "or", "override", "private", "protected", "public",
  "reinterpret_cast", "requires", "static_assert", "static_cast", "template",
  "this", "throw", "try", "typeid", "typename", "using", "virtual",
].map(kw);

const CPP_STD: readonly Completion[] = [
  va("std", "namespace"),
  // Streams
  va("std::cout", "ostream"),
  va("std::cin", "istream"),
  va("std::cerr", "ostream"),
  va("std::endl", "manipulator"),
  ty("std::ostream"),
  ty("std::istream"),
  ty("std::ostringstream", "<sstream>"),
  ty("std::istringstream", "<sstream>"),
  ty("std::stringstream", "<sstream>"),
  ty("std::ifstream", "<fstream>"),
  ty("std::ofstream", "<fstream>"),

  // Strings
  ty("std::string"),
  ty("std::string_view", "C++17"),
  fn("std::to_string", "(value)"),
  fn("std::stoi", "(const std::string&)"),
  fn("std::stod", "(const std::string&)"),
  fn("std::getline", "(istream&, string&)"),

  // Containers
  ty("std::vector", "<T>"),
  ty("std::array", "<T, N>"),
  ty("std::deque", "<T>"),
  ty("std::list", "<T>"),
  ty("std::stack", "<T>"),
  ty("std::queue", "<T>"),
  ty("std::priority_queue", "<T>"),
  ty("std::set", "<T>"),
  ty("std::multiset", "<T>"),
  ty("std::map", "<K, V>"),
  ty("std::multimap", "<K, V>"),
  ty("std::unordered_set", "<T>"),
  ty("std::unordered_map", "<K, V>"),
  ty("std::pair", "<A, B>"),
  ty("std::tuple", "<Ts...>"),
  ty("std::optional", "<T> (C++17)"),
  ty("std::variant", "<Ts...> (C++17)"),
  fn("std::make_pair", "(a, b)"),
  fn("std::make_tuple", "(...)"),
  fn("std::get", "<I>(tuple)"),

  // Memory
  ty("std::unique_ptr", "<T>"),
  ty("std::shared_ptr", "<T>"),
  ty("std::weak_ptr", "<T>"),
  fn("std::make_unique", "<T>(args...)"),
  fn("std::make_shared", "<T>(args...)"),
  fn("std::move", "(value)"),
  fn("std::forward", "<T>(value)"),
  fn("std::swap", "(a, b)"),

  // Algorithms
  fn("std::sort", "(first, last, cmp?)"),
  fn("std::stable_sort", "(first, last, cmp?)"),
  fn("std::reverse", "(first, last)"),
  fn("std::find", "(first, last, value)"),
  fn("std::find_if", "(first, last, pred)"),
  fn("std::count", "(first, last, value)"),
  fn("std::count_if", "(first, last, pred)"),
  fn("std::accumulate", "(first, last, init) <numeric>"),
  fn("std::transform", "(first, last, out, op)"),
  fn("std::for_each", "(first, last, fn)"),
  fn("std::copy", "(first, last, out)"),
  fn("std::fill", "(first, last, value)"),
  fn("std::min", "(a, b)"),
  fn("std::max", "(a, b)"),
  fn("std::min_element", "(first, last)"),
  fn("std::max_element", "(first, last)"),
  fn("std::lower_bound", "(first, last, value)"),
  fn("std::upper_bound", "(first, last, value)"),
  fn("std::binary_search", "(first, last, value)"),
  fn("std::unique", "(first, last)"),
  fn("std::distance", "(first, last)"),
  fn("std::next", "(it, n = 1)"),
  fn("std::prev", "(it, n = 1)"),

  // Utility / misc
  ty("std::size_t"),
  ty("std::int64_t"),
  fn("std::abs", "(x)"),
  fn("std::begin", "(container)"),
  fn("std::end", "(container)"),
  ty("std::function", "<Sig>"),
  ty("std::exception"),
  ty("std::runtime_error"),
  ty("std::out_of_range"),
  ty("std::invalid_argument"),
];

export const CPP_COMPLETIONS: readonly Completion[] = [
  ...C_KEYWORDS,
  ...CPP_KEYWORDS,
  ...C_LIBC,
  ...CPP_STD,
];
