// Measures every count and time the RecursionFib video shows; data.ts imports
// the JSON this prints (measurements.json).
//
//   g++ -std=c++17 -O2 -Wall -o fib src/videos/recursion-fib/fib.cpp
//   ./fib > src/videos/recursion-fib/measurements.json
//
// (measure.sh does both, building into a scratch directory.)
//
// `fib` and `fibMemo` are the two functions the video prints, which are the
// lesson's own (content/courses/mastering-dsa-cpp/recursion.mdx and
// dynamic-programming.mdx) with `long long` in place of `int`, so that
// fib(50) = 12,586,269,025 fits. Those two are timed exactly as written.
//
// Counting is done by twins of the two functions that add three things at
// the top of each call: count the call, track how many calls are open at
// once (the stack depth), and log the call for the small trees. The
// recursive expression in each twin is copied from its original, so a twin
// makes exactly the calls its original makes, in the order g++ evaluates
// them.
//
// Timing: each n is timed in many rounds, the n's in a shuffled order each
// round (seeded), and the best round is kept, the way `timeit` reports. On a
// shared machine the minimum is the run the rest of the machine disturbed
// least. A round repeats a call enough times to take about 50 ms, except
// naive fib(50), which takes the better part of a minute per call and is
// timed once per round in fewer rounds. The memo time includes making the
// memo vector, since every call has to.

#include <algorithm>
#include <chrono>
#include <cstdio>
#include <fstream>
#include <random>
#include <string>
#include <vector>

long long fib(int n) {
  if (n <= 1)
    return n;
  return fib(n - 1) + fib(n - 2);
}

long long fibMemo(int n, std::vector<long long> &memo) {
  if (n <= 1)
    return n;
  if (memo[n] != -1)
    return memo[n];
  return memo[n] = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
}

// ── The counting twins ──

struct Tally {
  long long calls = 0;
  long long hits = 0;   // memo only: calls answered from the table
  long long bases = 0;  // calls answered by `n <= 1`
  int depth = 0;
  int maxDepth = 0;
  bool log = false;
  struct Call {
    int n;
    int parent;
    int depth;
    const char *kind;  // "compute", "base" or "hit"
  };
  std::vector<Call> trace;
  std::vector<int> open;  // trace index of each open call, for parents
  struct Write {
    int n;
    long long value;
  };
  std::vector<Write> writes;  // memo only: each `memo[n] = ...`, in order
};

static Tally T;

// Enter a call: count it, deepen the stack, and log it when asked.
static int enter(int n) {
  ++T.calls;
  if (++T.depth > T.maxDepth)
    T.maxDepth = T.depth;
  int id = -1;
  if (T.log) {
    id = static_cast<int>(T.trace.size());
    T.trace.push_back({n, T.open.empty() ? -1 : T.open.back(), T.depth, "compute"});
    T.open.push_back(id);
  }
  return id;
}

static void leave(int id, const char *kind) {
  --T.depth;
  if (T.log) {
    T.trace[id].kind = kind;
    T.open.pop_back();
  }
}

long long fibCounted(int n) {
  int id = enter(n);
  if (n <= 1) {
    ++T.bases;
    leave(id, "base");
    return n;
  }
  long long r = fibCounted(n - 1) + fibCounted(n - 2);
  leave(id, "compute");
  return r;
}

long long fibMemoCounted(int n, std::vector<long long> &memo) {
  int id = enter(n);
  if (n <= 1) {
    ++T.bases;
    leave(id, "base");
    return n;
  }
  if (memo[n] != -1) {
    ++T.hits;
    leave(id, "hit");
    return memo[n];
  }
  long long r = memo[n] = fibMemoCounted(n - 1, memo) + fibMemoCounted(n - 2, memo);
  if (T.log)
    T.writes.push_back({n, r});
  leave(id, "compute");
  return r;
}

// ── Timing ──

using Clock = std::chrono::steady_clock;

// What a call returns is handed to an empty asm statement, so the optimizer
// has to produce it; and n is read from a volatile each time, so no call can
// be folded or hoisted out of the loop.
static volatile int input_n;
static inline void keep(long long v) { asm volatile("" : : "r"(v) : "memory"); }

static double once(bool memo, long reps) {
  auto t0 = Clock::now();
  for (long i = 0; i < reps; i++) {
    int n = input_n;
    if (memo) {
      std::vector<long long> table(n + 1, -1);
      keep(fibMemo(n, table));
    } else {
      keep(fib(n));
    }
  }
  auto t1 = Clock::now();
  return std::chrono::duration<double>(t1 - t0).count() / reps;
}

static std::string cpuModel() {
  std::ifstream in("/proc/cpuinfo");
  std::string line;
  while (std::getline(in, line))
    if (line.rfind("model name", 0) == 0)
      return line.substr(line.find(':') + 2);
  return "unknown";
}

static void printTrace(const char *name) {
  std::printf("  \"%s\": [\n", name);
  for (size_t i = 0; i < T.trace.size(); i++) {
    const auto &c = T.trace[i];
    std::printf("    { \"n\": %d, \"parent\": %d, \"depth\": %d, \"kind\": \"%s\" }%s\n", c.n, c.parent,
                c.depth, c.kind, i + 1 < T.trace.size() ? "," : "");
  }
  std::printf("  ],\n");
}

int main() {
  const std::vector<int> NS = {10, 20, 30, 40, 50};
  const int TREE_N = 5;
  const int ROUNDS = 21;
  const int ROUNDS_SLOW = 3;  // naive fib(50)
  const double TARGET_S = 0.05;

  std::printf("{\n");
  std::printf("  \"compiler\": \"g++ %s\",\n", __VERSION__);
  std::printf("  \"flags\": \"-std=c++17 -O2 -Wall\",\n");
  std::printf("  \"cpu\": \"%s\",\n", cpuModel().c_str());

  // The two small trees, call by call.
  T = Tally{};
  T.log = true;
  long long v = fibCounted(TREE_N);
  std::printf("  \"treeN\": %d,\n  \"treeValue\": %lld,\n", TREE_N, v);
  printTrace("naiveTree");
  T = Tally{};
  T.log = true;
  {
    std::vector<long long> memo(TREE_N + 1, -1);
    fibMemoCounted(TREE_N, memo);
    printTrace("memoTree");
    std::printf("  \"memoWrites\": [");
    for (size_t i = 0; i < T.writes.size(); i++)
      std::printf("%s{ \"n\": %d, \"value\": %lld }", i ? ", " : "", T.writes[i].n, T.writes[i].value);
    std::printf("],\n  \"memoTable\": [");
    for (size_t i = 0; i < memo.size(); i++)
      std::printf("%s%lld", i ? ", " : "", memo[i]);
    std::printf("],\n");
  }

  // Counts for every n.
  std::printf("  \"counts\": [\n");
  for (size_t i = 0; i < NS.size(); i++) {
    int n = NS[i];
    T = Tally{};
    long long value = fibCounted(n);
    Tally naive = T;
    T = Tally{};
    std::vector<long long> memo(n + 1, -1);
    long long memoValue = fibMemoCounted(n, memo);
    Tally m = T;
    std::fprintf(stderr, "counted n=%d\n", n);
    std::printf(
        "    { \"n\": %d, \"value\": %lld, \"memoValue\": %lld, \"naiveCalls\": %lld, \"naiveBases\": %lld, "
        "\"naiveDepth\": %d, \"memoCalls\": %lld, \"memoHits\": %lld, \"memoBases\": %lld, \"memoDepth\": %d }%s\n",
        n, value, memoValue, naive.calls, naive.bases, naive.maxDepth, m.calls, m.hits, m.bases, m.maxDepth,
        i + 1 < NS.size() ? "," : "");
  }
  std::printf("  ],\n");

  // Times.
  std::mt19937 rng(20261015);
  std::vector<double> bestNaive(NS.size(), 1e300), bestMemo(NS.size(), 1e300);
  std::vector<long> repsNaive(NS.size()), repsMemo(NS.size());
  for (size_t i = 0; i < NS.size(); i++) {
    input_n = NS[i];
    double est = NS[i] >= 50 ? 60.0 : once(false, 1);
    repsNaive[i] = std::max(1L, static_cast<long>(TARGET_S / est));
    double estMemo = once(true, 1000);
    repsMemo[i] = std::max(1L, static_cast<long>(TARGET_S / estMemo));
  }
  std::vector<size_t> order(NS.size());
  for (size_t i = 0; i < NS.size(); i++)
    order[i] = i;
  for (int r = 0; r < ROUNDS; r++) {
    std::shuffle(order.begin(), order.end(), rng);
    for (size_t i : order) {
      input_n = NS[i];
      if (NS[i] < 50 || r < ROUNDS_SLOW)
        bestNaive[i] = std::min(bestNaive[i], once(false, repsNaive[i]));
      bestMemo[i] = std::min(bestMemo[i], once(true, repsMemo[i]));
    }
    std::fprintf(stderr, "round %d/%d\n", r + 1, ROUNDS);
  }
  std::printf("  \"rounds\": %d,\n  \"roundsSlow\": %d,\n", ROUNDS, ROUNDS_SLOW);
  std::printf("  \"times\": [\n");
  for (size_t i = 0; i < NS.size(); i++)
    std::printf("    { \"n\": %d, \"naiveSeconds\": %.6g, \"naiveReps\": %ld, \"memoSeconds\": %.6g, \"memoReps\": %ld }%s\n",
                NS[i], bestNaive[i], repsNaive[i], bestMemo[i], repsMemo[i], i + 1 < NS.size() ? "," : "");
  std::printf("  ]\n}\n");
  return 0;
}
