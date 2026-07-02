import type { Completion } from "@codemirror/autocomplete";

// Static completion tier for the C playground surfaces. There is no
// practical in-browser C language server (clangd.wasm needs ~26 MB +
// cross-origin isolation — see the feasibility report in
// agent-outputs/), so the honest ceiling is keywords, the common libc
// surface with signatures, and document-word completion (wired in
// `languageCompletion.ts`).

const kw = (label: string): Completion => ({ label, type: "keyword" });
const ty = (label: string): Completion => ({ label, type: "type" });
const cn = (label: string, detail?: string): Completion => ({
  label,
  type: "constant",
  detail,
});
const fn = (label: string, detail: string): Completion => ({
  label,
  type: "function",
  detail,
});

export const C_KEYWORDS: readonly Completion[] = [
  ...["auto", "break", "case", "const", "continue", "default", "do", "else",
    "enum", "extern", "for", "goto", "if", "inline", "register", "restrict",
    "return", "sizeof", "static", "struct", "switch", "typedef", "union",
    "volatile", "while", "_Alignas", "_Alignof", "_Atomic", "_Generic",
    "_Noreturn", "_Static_assert", "_Thread_local"].map(kw),
  ...["char", "double", "float", "int", "long", "short", "signed", "unsigned",
    "void", "_Bool", "bool", "size_t", "ssize_t", "ptrdiff_t", "intptr_t",
    "uintptr_t", "int8_t", "int16_t", "int32_t", "int64_t", "uint8_t",
    "uint16_t", "uint32_t", "uint64_t", "FILE", "time_t", "va_list"].map(ty),
  cn("NULL"),
  cn("EOF"),
  cn("EXIT_SUCCESS"),
  cn("EXIT_FAILURE"),
  cn("INT_MAX", "<limits.h>"),
  cn("INT_MIN", "<limits.h>"),
  cn("SIZE_MAX", "<stdint.h>"),
  cn("DBL_MAX", "<float.h>"),
  cn("DBL_EPSILON", "<float.h>"),
  cn("RAND_MAX", "<stdlib.h>"),
  cn("stdin"),
  cn("stdout"),
  cn("stderr"),
  cn("true"),
  cn("false"),
];

export const C_LIBC: readonly Completion[] = [
  // <stdio.h>
  fn("printf", "(const char *fmt, ...)"),
  fn("fprintf", "(FILE *stream, const char *fmt, ...)"),
  fn("sprintf", "(char *str, const char *fmt, ...)"),
  fn("snprintf", "(char *str, size_t size, const char *fmt, ...)"),
  fn("scanf", "(const char *fmt, ...)"),
  fn("fscanf", "(FILE *stream, const char *fmt, ...)"),
  fn("sscanf", "(const char *str, const char *fmt, ...)"),
  fn("puts", "(const char *s)"),
  fn("putchar", "(int c)"),
  fn("getchar", "(void)"),
  fn("fgets", "(char *s, int size, FILE *stream)"),
  fn("fputs", "(const char *s, FILE *stream)"),
  fn("fopen", "(const char *path, const char *mode)"),
  fn("fclose", "(FILE *stream)"),
  fn("fread", "(void *ptr, size_t size, size_t n, FILE *stream)"),
  fn("fwrite", "(const void *ptr, size_t size, size_t n, FILE *stream)"),
  fn("fseek", "(FILE *stream, long offset, int whence)"),
  fn("ftell", "(FILE *stream)"),
  fn("feof", "(FILE *stream)"),
  fn("perror", "(const char *s)"),
  fn("remove", "(const char *path)"),
  fn("rename", "(const char *old, const char *new)"),

  // <stdlib.h>
  fn("malloc", "(size_t size)"),
  fn("calloc", "(size_t n, size_t size)"),
  fn("realloc", "(void *ptr, size_t size)"),
  fn("free", "(void *ptr)"),
  fn("exit", "(int status)"),
  fn("abort", "(void)"),
  fn("atoi", "(const char *s)"),
  fn("atof", "(const char *s)"),
  fn("atol", "(const char *s)"),
  fn("strtol", "(const char *s, char **end, int base)"),
  fn("strtod", "(const char *s, char **end)"),
  fn("rand", "(void)"),
  fn("srand", "(unsigned seed)"),
  fn("qsort", "(void *base, size_t n, size_t size, int (*cmp)(const void *, const void *))"),
  fn("bsearch", "(const void *key, const void *base, size_t n, size_t size, int (*cmp)(const void *, const void *))"),
  fn("abs", "(int x)"),
  fn("labs", "(long x)"),
  fn("getenv", "(const char *name)"),
  fn("system", "(const char *command)"),

  // <string.h>
  fn("strlen", "(const char *s)"),
  fn("strcpy", "(char *dst, const char *src)"),
  fn("strncpy", "(char *dst, const char *src, size_t n)"),
  fn("strcat", "(char *dst, const char *src)"),
  fn("strncat", "(char *dst, const char *src, size_t n)"),
  fn("strcmp", "(const char *a, const char *b)"),
  fn("strncmp", "(const char *a, const char *b, size_t n)"),
  fn("strchr", "(const char *s, int c)"),
  fn("strrchr", "(const char *s, int c)"),
  fn("strstr", "(const char *haystack, const char *needle)"),
  fn("strtok", "(char *s, const char *delim)"),
  fn("strdup", "(const char *s)"),
  fn("memcpy", "(void *dst, const void *src, size_t n)"),
  fn("memmove", "(void *dst, const void *src, size_t n)"),
  fn("memset", "(void *s, int c, size_t n)"),
  fn("memcmp", "(const void *a, const void *b, size_t n)"),

  // <math.h>
  fn("pow", "(double base, double exp)"),
  fn("sqrt", "(double x)"),
  fn("cbrt", "(double x)"),
  fn("fabs", "(double x)"),
  fn("floor", "(double x)"),
  fn("ceil", "(double x)"),
  fn("fmod", "(double x, double y)"),
  fn("exp", "(double x)"),
  fn("log", "(double x)"),
  fn("log2", "(double x)"),
  fn("log10", "(double x)"),
  fn("sin", "(double x)"),
  fn("cos", "(double x)"),
  fn("tan", "(double x)"),
  fn("atan2", "(double y, double x)"),
  fn("round", "(double x)"),

  // <ctype.h>
  fn("isalpha", "(int c)"),
  fn("isdigit", "(int c)"),
  fn("isalnum", "(int c)"),
  fn("isspace", "(int c)"),
  fn("isupper", "(int c)"),
  fn("islower", "(int c)"),
  fn("toupper", "(int c)"),
  fn("tolower", "(int c)"),

  // <time.h> / misc
  fn("time", "(time_t *t)"),
  fn("clock", "(void)"),
  fn("difftime", "(time_t end, time_t start)"),
  fn("assert", "(expression)"),
];

export const C_COMPLETIONS: readonly Completion[] = [
  ...C_KEYWORDS,
  ...C_LIBC,
];
