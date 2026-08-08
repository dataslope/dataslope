# Can the Java playground move past Java 8?

Short answer: not yet, and the blocker is upstream. This is the evidence,
written down so the next person does not have to re-derive it, and so the
issue below can be filed against CheerpJ when someone has an account there.

Measured against `cheerpjInit` 4.3, the version `runtime/cheerpj.ts` pins.

---

## Draft issue: Java 11/17 runtimes ship no in-image compiler, and no `release` / `lib/jrt-fs.jar` for an external one

**CheerpJ version:** 4.3 (`https://cjrtnc.leaningtech.com/4.3/loader.js`)

## What we're doing

We run an in-browser Java playground: user source is compiled and run entirely
client-side. On `cheerpjInit({ version: 8 })` this works, because we can supply
OpenJDK 8's `tools.jar` and drive `com.sun.tools.javac.Main` through
`cheerpjRunMain`.

We'd like to move to `version: 17` so lessons can use records, `List.of`,
pattern-matching `instanceof`, and so on. `cheerpjInit({ version: 11 })` and
`{ version: 17 }` both initialise fine and report `11.0.31-internal` /
`17.0.19-internal`, so the runtimes themselves work well.

## The problem

There is no way we can find to compile Java 11/17 source inside CheerpJ.

**1. The 11 and 17 images contain no compiler.** Probed from inside the JVM:

```
java.version = 17.0.19-internal
boot modules (42): java.base, java.compiler, java.datatransfer, java.desktop,
  java.instrument, java.logging, java.management, java.management.rmi,
  java.naming, java.net.http, java.prefs, java.rmi, java.scripting,
  java.security.jgss, java.security.sasl, java.smartcardio, java.sql,
  java.sql.rowset, java.transaction.xa, java.xml, java.xml.crypto,
  jdk.accessibility, jdk.charsets, jdk.crypto.cryptoki, jdk.crypto.ec,
  jdk.dynalink, jdk.httpserver, jdk.jfr, jdk.jsobject, jdk.localedata,
  jdk.management, jdk.management.jfr, jdk.naming.dns, jdk.naming.rmi, jdk.net,
  jdk.nio.mapmode, jdk.sctp, jdk.security.auth, jdk.security.jgss,
  jdk.unsupported, jdk.xml.dom, jdk.zipfs

ModuleLayer.boot().findModule("jdk.compiler")  -> Optional.empty
javax.tools.ToolProvider.getSystemJavaCompiler() -> null
Class.forName("com.sun.tools.javac.Main")      -> ClassNotFoundException
```

`/lt/17/bin/javac` exists but is **0 bytes** (same on `/lt/8` and `/lt/11`).

**2. An external compiler cannot find the platform classes.** We tried ecj (the
Eclipse batch compiler), which loads and runs happily under CheerpJ 11 and 17.
It fails when it opens a jrt filesystem for the running `java.home`:

| ecj | error |
| --- | --- |
| 3.32+ | `FileNotFoundException: /lt/17/release` |
| 3.28  | `IOException: /lt/17/lib/jrt-fs.jar not exist` |

`/lt/17/lib` contains only `modules` (38 MB), `security/` and `tzdb.dat`. The
platform classes are all there in `lib/modules`; what's missing is the metadata
a compiler needs to open them.

Everything we tried to work around it:

- `cheerpjAddStringFile("/lt/17/release", …)` returns without error but the
  file never appears (`/lt` is read-only).
- Staging a JDK image under `/str/` fails with
  `CheerpOS: Directories are not supported` (`/str` is flat).
- Serving a `jlink`-produced JDK 17 image over `/app` **does** work as a
  directory tree, and ecj accepts it via `--system` — but ecj still probes the
  running `java.home` first and dies there.
- `cheerpjInit({ javaProperties: ["java.home=/app/…"] })` does not change
  `java.home`.
- `-bootclasspath` is rejected by ecj at compliance level 9 and above.

## What would fix it

Either would be enough for us:

1. Ship `jdk.compiler` in the 11 / 17 images, so
   `ToolProvider.getSystemJavaCompiler()` works; or
2. Add `release` and `lib/jrt-fs.jar` to those images, so an external compiler
   (ecj, ~3.2 MB) can read the platform classes that are already there.

(2) looks like the cheaper change: `release` is a couple of hundred bytes and
`jrt-fs.jar` is ~110 KB.

## Reproducing

```js
await cheerpjInit({ version: 17, status: "none" });
cheerpjAddStringFile("/str/ecj.jar", ecjBytes);      // org.eclipse.jdt:ecj:3.28.0
cheerpjAddStringFile("/str/Main.java", sourceBytes);
await cheerpjRunMain(
  "org.eclipse.jdt.internal.compiler.batch.Main",
  "/str/ecj.jar:/files/",
  "/str/Main.java", "-d", "/files/", "-source", "17", "-target", "17",
);
// -> java.io.IOException: /lt/17/lib/jrt-fs.jar not exist
```
