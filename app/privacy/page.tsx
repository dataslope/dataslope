import "@/app/magicui.css";
import { LegalShell } from "../_components/legal/LegalShell";

export const metadata = {
  title: "Privacy Policy — Dataslope",
  description:
    "How Dataslope handles your data: no accounts, no tracking, and code that runs entirely in your browser.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="June 19, 2026">
      <p>
        Dataslope is a free, browser-based platform for learning programming and
        data skills. We built it to need as little of your data as possible. In
        short: there are no accounts, we don&apos;t track you, and the code you
        write runs entirely on your own device.
      </p>

      <h2>Information we collect</h2>
      <p>
        We do <strong>not</strong> require you to create an account, and we do
        not ask for or collect personal information such as your name, email
        address, or password. We have no user database.
      </p>

      <h2>Data stored on your device</h2>
      <p>
        To make the product usable, your browser&apos;s <strong>local
        storage</strong> keeps things like your theme preference and the code,
        queries, and progress in your playgrounds and lessons. This stays on
        your device and in your browser — it is not transmitted to or stored on
        our servers, and clearing your browser&apos;s site data removes it.
      </p>

      <h2>Code execution</h2>
      <p>
        Every language and database runs locally in your browser through
        WebAssembly. The code you write, the queries you run, and any files you
        load are processed on your machine and are never uploaded to us.
      </p>

      <h2>Third-party services</h2>
      <p>
        Language runtimes and sample datasets are downloaded on demand from
        third-party content delivery networks (for example jsDelivr, unpkg, and
        GitHub). When your browser requests those files, the provider may
        receive standard request information such as your IP address, subject to
        that provider&apos;s own privacy policy. Our hosting provider may also
        keep standard server logs (for example request times and IP addresses)
        for security and reliability.
      </p>

      <h2>Cookies and tracking</h2>
      <p>
        We do not use advertising or cross-site tracking cookies, and we do not
        sell or share personal data — we don&apos;t have any to sell.
      </p>

      <h2>Children&apos;s privacy</h2>
      <p>
        Dataslope is suitable for general audiences and does not knowingly
        collect personal information from anyone, including children.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. When we do, we&apos;ll
        revise the &ldquo;Last updated&rdquo; date above. Continued use of the
        site after a change means you accept the updated policy.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Reach out via our{" "}
        <a
          href="https://github.com/dataslope/dataslope/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub repository
        </a>
        .
      </p>
    </LegalShell>
  );
}
