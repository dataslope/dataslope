import "@/app/tailwind.css";
import { LegalShell } from "../_components/legal/LegalShell";

export const metadata = {
  title: "Privacy Policy, Dataslope",
  description:
    "How Dataslope handles your data: optional accounts, code that runs entirely in your browser, and clear choices about your data.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="September 25, 2026">
      <p>
        Dataslope is a free, browser-based platform for learning programming and
        data skills. We built it to need as little of your data as possible. You
        can use almost everything without an account, and the code you write runs
        entirely on your own device. This policy explains what we collect, when,
        and the choices you have.
      </p>

      <h2>Using Dataslope without an account</h2>
      <p>
        You can browse the courses, run the playgrounds, and take the quizzes as
        a guest, with no sign-in. In that mode we don&apos;t ask for or collect
        personal information such as your name or email address, and there is no
        profile stored on our servers.
      </p>

      <h2>If you create an account</h2>
      <p>
        Accounts are <strong>optional</strong> and free. You can create one with
        Google or GitHub, or with an email address and password. When you do, we
        store the account information needed to provide the service in our own
        database: your name and email address, an avatar URL if your provider
        supplies one, and, for email sign-ups, a securely hashed password (we
        never store your password in plain text). We keep this on infrastructure
        we control and do not sell or rent it.
      </p>
      <p>
        If you sign up with an email address, we may send you service emails such
        as an address-verification link, a password-reset link, or an
        account-deletion confirmation. These are sent through an email provider
        on our behalf and are transactional, not marketing.
      </p>

      <h2>Cloud saves and sharing</h2>
      <p>
        Signed-in members can choose to save workspaces to the cloud and to
        create share links. When you do, the contents of those workspaces (your
        files, and for SQL playgrounds the database and queries) are stored on
        our servers so you can sync them across devices or share them. Anyone
        with a share link can open a copy of what you shared, so only share work
        you&apos;re comfortable making accessible. You can delete cloud saves and
        revoke share links from your account page.
      </p>
      <p>
        When you&apos;re signed in, your progress on the coding challenges
        (which challenges and steps you&apos;ve passed or attempted) is also
        stored with your account, so it follows you to other devices. If you
        solved challenges as a guest in the same browser before signing in,
        that progress is added to your account. The code you write for a
        challenge is not uploaded: it stays in your browser.
      </p>

      <h2>AI autocomplete</h2>
      <p>
        Where it is available on your account, AI autocomplete suggests code as
        you type in an editor. To make a suggestion, the code around your cursor
        in the file you&apos;re editing (including any read-only setup code
        shown above it), the file&apos;s name, and its language are sent through
        our servers to a third-party AI provider. Please don&apos;t put
        sensitive personal information in your code.
      </p>
      <p>
        <strong>We don&apos;t keep your code or the suggestions.</strong>{" "}
        What we do record is a daily count of how many suggestions your account
        requested and how large they were, which is how the daily limits and our
        own costs are managed; those counters hold no part of your code.
      </p>

      <h2>Data stored on your device</h2>
      <p>
        To make the product usable, your browser&apos;s <strong>local
        storage</strong>{" "}keeps things like your theme preference and the code,
        queries, and progress in your playgrounds and lessons. This stays on
        your device and in your browser, and clearing your browser&apos;s site
        data removes it. Local saves are separate from cloud saves: they are not
        transmitted to us unless you explicitly save to the cloud. The one
        exception is challenge progress while you&apos;re signed in, described
        above.
      </p>

      <h2>Code execution</h2>
      <p>
        Every language and database runs locally in your browser through
        WebAssembly. The code you write, the queries you run, and any files you
        load are processed on your machine, and are only sent to us if you save
        them to the cloud or share them. If you have AI autocomplete, the code
        around your cursor is also sent, as described above.
      </p>

      <h2>Third-party services</h2>
      <p>
        Dataslope relies on a few third-party services, each subject to its own
        privacy policy:
      </p>
      <ul>
        <li>
          <strong>Content delivery networks</strong>{" "}(for example jsDelivr,
          unpkg, and GitHub) serve language runtimes and sample datasets on
          demand; your browser&apos;s requests expose standard information such
          as your IP address to them.
        </li>
        <li>
          <strong>Sign-in providers</strong> (Google and GitHub) handle social
          login if you choose it, and share basic profile details such as your
          name, email, and avatar with us.
        </li>
        <li>
          <strong>An email provider</strong> delivers the transactional account
          emails described above.
        </li>
        <li>
          <strong>An AI provider</strong>{" "}generates AI autocomplete
          suggestions from the code described above, for accounts that have
          the feature.
        </li>
        <li>
          <strong>Our hosting provider</strong> runs the site and may keep
          standard server logs (for example request times and IP addresses) for
          security and reliability.
        </li>
        <li>
          <strong>Cloudflare Web Analytics</strong> gives us privacy-first,
          aggregate traffic statistics (such as page views, referrers, and
          countries). It is cookieless, sets no data on your device, and does
          not track you across sites or use your data to identify you.
        </li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We use essential cookies to keep you signed in and to remember a few
        preferences, such as your light or dark theme.
      </p>

      <h2>Your choices</h2>
      <p>
        You can use Dataslope as a guest without giving us any personal
        information. If you have an account, you can delete individual cloud
        saves and share links at any time, or delete your entire account from
        your account page, which removes your profile and the cloud saves,
        shares, and challenge progress associated with it.
      </p>

      <h2>Children&apos;s privacy</h2>
      <p>
        Dataslope is suitable for general audiences and is not directed at young
        children. We don&apos;t knowingly collect personal information from
        children under the age required by applicable law.
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
