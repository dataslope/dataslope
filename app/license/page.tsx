import "@/app/tailwind.css";
import { LegalShell } from "../_components/legal/LegalShell";

export const metadata = {
  title: "License, Dataslope",
  description:
    "How Dataslope is licensed: MIT for the source code, CC BY-NC 4.0 for the learning content, and the third-party runtimes that keep their own terms.",
};

const REPO = "https://github.com/dataslope/dataslope";

/** Mirrors the "Language runtimes (loaded at runtime)" table in
 *  THIRD-PARTY-NOTICES.md. Keep the two in sync when a runtime is added,
 *  swapped, or upgraded. */
const RUNTIMES: { component: string; used: string; license: string }[] = [
  {
    component: "Pyodide",
    used: "Python",
    license:
      "MPL-2.0 (bundles CPython and packages under their own licenses)",
  },
  { component: "WebR", used: "R", license: "R is GPL-2.0 / GPL-3.0" },
  {
    component: "php-wasm",
    used: "PHP",
    license: "PHP License / the project's own terms",
  },
  {
    component: "browsercc (Clang/LLD + WASI)",
    used: "C, C++",
    license:
      "Clang/LLVM: Apache-2.0 with LLVM exceptions; browsercc and @bjorn3/browser_wasi_shim under their own licenses",
  },
  {
    component: "CheerpJ + OpenJDK",
    used: "Java",
    license:
      "CheerpJ: proprietary, see below; OpenJDK: GPLv2 with the Classpath Exception",
  },
  {
    component: ".NET / Mono / Roslyn",
    used: "C#",
    license: "MIT (the .NET platform)",
  },
  {
    component: "@sqlite.org/sqlite-wasm",
    used: "SQLite",
    license: "Apache-2.0 (npm package); the SQLite engine is public domain",
  },
  { component: "DuckDB-Wasm", used: "DuckDB SQL", license: "MIT" },
  {
    component: "PGlite",
    used: "PostgreSQL",
    license: "Apache-2.0 / PostgreSQL License",
  },
];

const MIT_TEXT = `MIT License

Copyright (c) 2026 Dataslope

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export default function LicensePage() {
  return (
    <LegalShell title="License" updated="August 11, 2026">
      <p>
        Dataslope is made available under more than one license, because the
        site is made of more than one kind of thing. The short version:
      </p>
      <ul>
        <li>
          <strong>Source code</strong>: MIT License. Dataslope&apos;s own code,
          and nothing else.
        </li>
        <li>
          <strong>Learning content</strong> (courses, lessons, exercises,
          quizzes, and the illustrations, figures, diagrams, and charts drawn
          for them): Creative Commons Attribution-NonCommercial 4.0
          International (CC BY-NC 4.0).
        </li>
        <li>
          <strong>Third-party software and language runtimes</strong>: not
          covered by either of the above; each keeps its own terms.
        </li>
        <li>
          <strong>The code you write in a playground</strong>: yours. It runs
          on your own device and we claim no rights to it.
        </li>
      </ul>
      <p>
        The authoritative texts live in the repository:{" "}
        <a href={`${REPO}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer">
          LICENSE
        </a>
        ,{" "}
        <a
          href={`${REPO}/blob/main/LICENSE-CONTENT`}
          target="_blank"
          rel="noopener noreferrer"
        >
          LICENSE-CONTENT
        </a>
        , and{" "}
        <a
          href={`${REPO}/blob/main/THIRD-PARTY-NOTICES.md`}
          target="_blank"
          rel="noopener noreferrer"
        >
          THIRD-PARTY-NOTICES.md
        </a>
        . Where this page and those files disagree, the files govern.
      </p>

      <h2>Source code (MIT)</h2>
      <p>
        Dataslope&apos;s own source code is open source under the MIT License:
        the application, its build and tooling scripts, and the other
        first-party code in the repository. You may use, copy, modify, merge,
        publish, distribute, sublicense, and sell copies of it, provided the
        copyright notice and permission notice below travel with it.
      </p>
      <p>
        <strong>What MIT does not cover.</strong> It is a license to the code,
        not to everything the project contains or loads. It grants you no rights
        to:
      </p>
      <ul>
        <li>
          the <strong>learning content</strong>, which is CC BY-NC 4.0 (next
          section); MIT&apos;s permission to &ldquo;sell copies&rdquo; does not
          reach it, and does not permit commercial use of it;
        </li>
        <li>
          <strong>third-party software, language runtimes, datasets, fonts, or
          bundled artwork</strong>, each of which keeps its own terms (see
          below); CheerpJ, the Java runtime, is proprietary and may require a
          paid license for some uses;
        </li>
        <li>
          the <strong>Dataslope name, logo, and brand assets</strong>: neither
          license grants trademark rights.
        </li>
      </ul>
      <pre>{MIT_TEXT}</pre>

      <h2>Learning content (CC BY-NC 4.0)</h2>
      <p>
        The courses, lessons, exercises, and quizzes are licensed under the{" "}
        <a
          href="https://creativecommons.org/licenses/by-nc/4.0/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Creative Commons Attribution-NonCommercial 4.0 International License
        </a>
        . This is separate from the MIT license on the code above.
      </p>
      <p>
        <strong>Illustrative teaching materials</strong> are covered too, and by
        that we mean the drawings that teach rather than decorate: the lesson
        and course illustrations, and the figures, diagrams, and charts that
        accompany the lessons, including the ones rendered at build time. The
        script that draws a chart is source code under MIT; the drawing it
        produces is content under this license. Brand assets and third-party
        material (datasets, fonts, the bundled emoji artwork) are excluded from
        both licenses and keep their own terms.
      </p>
      <p>You are free to:</p>
      <ul>
        <li>
          <strong>Share</strong>: copy and redistribute the content in any
          medium or format.
        </li>
        <li>
          <strong>Adapt</strong>: remix, transform, and build upon it.
        </li>
      </ul>
      <p>Under the following terms:</p>
      <ul>
        <li>
          <strong>Attribution</strong>: give appropriate credit to Dataslope
          (
          <a
            href="https://www.dataslope.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            dataslope.com
          </a>
          ), link to the license, and indicate if changes were made. You may do
          so in any reasonable manner, but not in any way that suggests
          Dataslope endorses you or your use.
        </li>
        <li>
          <strong>NonCommercial</strong>: you may not use the content for
          commercial purposes, meaning use primarily intended for or directed
          toward commercial advantage or monetary compensation. That covers
          reselling the lessons, putting them behind a paid course or
          subscription, and republishing them on an ad-supported or
          lead-generating site. Teaching from them in a classroom, study group,
          or workplace, and sharing or adapting them non-commercially, is fine.
          For commercial use,{" "}
          <a
            href={`${REPO}/discussions`}
            target="_blank"
            rel="noopener noreferrer"
          >
            ask us
          </a>
          .
        </li>
        <li>
          <strong>No additional restrictions</strong>: you may not apply legal
          terms or technological measures that legally restrict others from
          doing anything the license permits.
        </li>
      </ul>
      <p>
        The{" "}
        <a
          href="https://creativecommons.org/licenses/by-nc/4.0/legalcode"
          target="_blank"
          rel="noopener noreferrer"
        >
          full legal text of CC BY-NC 4.0
        </a>{" "}
        governs; the summary above is not a substitute for it. Unless otherwise
        stated the content is provided <strong>&ldquo;as is&rdquo;</strong> and{" "}
        <strong>&ldquo;as available,&rdquo;</strong> without warranties of any
        kind, and to the fullest extent permitted by law Dataslope and its
        contributors are not liable for any damages or losses arising from its
        use.
      </p>

      <h2>Third-party software and runtimes</h2>
      <p>
        Every playground runs a real language runtime compiled to WebAssembly.
        Most of them are downloaded from their own providers (or a CDN) in your
        browser at run time rather than redistributed by us, and none of them
        are covered by the licenses above, each retains its own terms. The list
        below is provided for convenience and may not be exhaustive or
        perfectly current; consult each project for its authoritative license.
      </p>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Component</th>
              <th>Used for</th>
              <th>License (verify with the project)</th>
            </tr>
          </thead>
          <tbody>
            {RUNTIMES.map((r) => (
              <tr key={r.component}>
                <td>{r.component}</td>
                <td>{r.used}</td>
                <td>{r.license}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>CheerpJ (the Java playground)</h3>
      <p>
        The Java playground uses{" "}
        <a href="https://cheerpj.com" target="_blank" rel="noopener noreferrer">
          CheerpJ
        </a>{" "}
        by Leaning Technologies, loaded at run time from Leaning
        Technologies&apos; CDN. CheerpJ is <strong>proprietary</strong>, not
        OSI-approved open source, and the MIT license on Dataslope&apos;s code
        grants you no rights to it. It is used here under the CheerpJ Core
        Community Edition. If you fork this project, review CheerpJ&apos;s
        current terms yourself: the Community Edition does not permit
        self-hosting or redistributing the runtime, and some uses require a paid
        license. CheerpJ executes OpenJDK, which is licensed under GPLv2 with
        the Classpath Exception.
      </p>

      <h3>Code formatters</h3>
      <p>
        The editor&apos;s &ldquo;format code&rdquo; action uses in-browser WASM
        formatters: <strong>@wasm-fmt/clang-format</strong> (C, C++, Java, C#),{" "}
        <strong>@wasm-fmt/web_fmt</strong> (JavaScript, TypeScript),{" "}
        <strong>@wasm-fmt/mago_fmt</strong> (PHP),{" "}
        <strong>@wasm-fmt/ruff_fmt</strong> (Python), and{" "}
        <strong>sql-formatter</strong> (SQL). The npm wrapper packages are
        MIT-licensed; the underlying tools keep their own upstream licenses
        (clang-format, from LLVM, is Apache-2.0 with LLVM exceptions).
      </p>

      <h3>Application libraries</h3>
      <p>
        The site is built on many open-source packages, each under its own
        license as published on npm, among them Next.js, React, Better Auth,
        fumadocs, Tailwind CSS, and the Base UI primitives (MIT), and
        lucide-react (ISC). Refer to each package&apos;s own license for the
        authoritative terms.
      </p>

      <h3>Bundled artwork</h3>
      <p>
        The emoji images on the home page are the 3D variants from{" "}
        <a
          href="https://github.com/microsoft/fluentui-emoji"
          target="_blank"
          rel="noopener noreferrer"
        >
          Microsoft Fluent Emoji
        </a>
        , redistributed under the MIT License (Copyright &copy; Microsoft
        Corporation). They are resized and re-encoded as WebP; the artwork is
        otherwise unmodified. Sample datasets and any bundled fonts remain
        subject to their own licenses.
      </p>

      <h2>Your code and your data</h2>
      <p>
        Code you write in the playgrounds is yours, and it executes entirely in
        your browser. Saving a workspace to the cloud or creating a share link
        grants us only the permission needed to store and serve it for those
        features; see the{" "}
        <a href="/terms">Terms of Service</a> and the{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>Questions</h2>
      <p>
        Licensing questions are welcome on the{" "}
        <a href={`${REPO}/discussions`} target="_blank" rel="noopener noreferrer">
          GitHub discussions
        </a>
        . Nothing on this page is legal advice, if you plan to rely on it,
        get your own review.
      </p>
    </LegalShell>
  );
}
