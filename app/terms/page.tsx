import "@/app/tailwind.css";
import { LegalShell } from "../_components/legal/LegalShell";

export const metadata = {
  title: "Terms of Service, Dataslope",
  description: "The terms that govern your use of Dataslope.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="June 19, 2026">
      <p>
        These terms govern your use of Dataslope (the &ldquo;Service&rdquo;). By
        using the Service, you agree to them. If you don&apos;t agree, please
        don&apos;t use the Service.
      </p>

      <h2>Using the Service</h2>
      <p>
        Dataslope is provided free of charge for personal, educational, and
        non-commercial learning. You don&apos;t need an account, and you may use
        the courses, playgrounds, and quizzes as they are made available.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          use the Service for any unlawful purpose or to violate the rights of
          others;
        </li>
        <li>
          attempt to disrupt, overload, or compromise the Service, its hosting,
          or the third-party services it relies on;
        </li>
        <li>
          misrepresent the Service or remove or obscure any notices it displays.
        </li>
      </ul>

      <h2>Content and intellectual property</h2>
      <p>
        The Dataslope name, site design, and original learning content are owned
        by Dataslope and its contributors. The Service is built on open-source
        software and runtimes that remain governed by their own licenses; see
        the{" "}
        <a
          href="https://github.com/dataslope/dataslope/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
        >
          project license
        </a>{" "}
        for details. Code you write in the playgrounds is yours.
      </p>

      <h2>Third-party services</h2>
      <p>
        The Service downloads language runtimes and datasets from third-party
        providers and may link to external sites. We don&apos;t control those
        services and aren&apos;t responsible for their content or availability;
        your use of them is subject to their terms.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        The Service is provided <strong>&ldquo;as is&rdquo;</strong> and
        <strong> &ldquo;as available,&rdquo;</strong> without warranties of any
        kind. We don&apos;t guarantee that it will be uninterrupted,
        error-free, or that any code output is correct or fit for a particular
        purpose.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Dataslope and its contributors
        will not be liable for any indirect, incidental, or consequential
        damages arising from your use of the Service.
      </p>

      <h2>Availability and future changes</h2>
      <p>
        We may add, change, or remove features at any time. All learning content
        available today is completely free; we may introduce additional or
        optional paid features in the future, but doing so will not require
        payment to access the content that is currently free.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may revise these terms from time to time. When we do, we&apos;ll
        update the &ldquo;Last updated&rdquo; date above. Continued use of the
        Service after a change means you accept the revised terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Reach out via our{" "}
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
