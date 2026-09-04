/**
 * What this shell is and is not, for the reader who wonders why `python3`
 * is missing or why `cat > file` returns at once. Shown from the Bash
 * playground's menu.
 */
export const BASH_ABOUT = {
  shell: "bash 5.1, running in your browser tab. Nothing leaves it and nothing is installed on your machine.",
  installed: [
    "ls", "cd", "pwd", "cat", "echo", "printf", "touch", "mkdir", "rm", "cp", "mv", "head", "tail", "wc",
    "grep", "sed", "awk", "sort", "uniq", "cut", "tr", "find", "xargs", "diff", "jq", "tee", "du", "seq",
    "date", "basename", "dirname", "which", "env", "test", "sleep", "time", "git",
  ],
  missing: ["python3", "node", "curl", "ssh", "uname", "yes", "vim", "less"],
  notes: [
    "There is no standard input: cat > file and read wait for nothing. Use echo, printf or a heredoc (cat > file <<'EOF' … EOF) to write.",
    "A line that is not finished (an open if, quote or pipe) gets a > prompt for the rest, as in a terminal.",
    "Functions, aliases and variables you define stay for the rest of the session in that terminal.",
    "Every terminal shares the same files; each has its own directory, variables and history.",
    "This tab remembers your session across a reload. Reset starts over with the starting files.",
  ],
};
