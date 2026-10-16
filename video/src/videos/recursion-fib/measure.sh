#!/bin/sh
# Builds fib.cpp with g++ -O2 -Wall and writes its output to measurements.json,
# which data.ts imports. Takes about five minutes: naive fib(50) runs for the
# better part of a minute each time it is counted or timed.
#
#   sh src/videos/recursion-fib/measure.sh [build-dir]
set -eu
here=$(cd "$(dirname "$0")" && pwd)
build=${1:-$(mktemp -d)}
mkdir -p "$build"
g++ -std=c++17 -O2 -Wall -o "$build/fib" "$here/fib.cpp"
"$build/fib" > "$build/measurements.json"
mv "$build/measurements.json" "$here/measurements.json"
