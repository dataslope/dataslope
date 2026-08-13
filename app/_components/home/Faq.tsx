"use client";

import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown } from "lucide-react";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Do I need to sign up or install anything?",
    a: "No. Everything runs in your browser, no sign-in, and nothing to install beyond the one-time language runtime that downloads automatically on your first run. Creating a free account is optional; it lets you save and share your work in the cloud across devices.",
  },
  {
    q: "Is it really free?",
    a: "Yes, all the courses, playgrounds, and quizzes are completely free and fully accessible, with no paywall on any of the content. Accounts are free too, Dataslope only offers free memberships.",
  },
  {
    q: "What does a free account add?",
    a: "No learning content is ever gated behind it, but a free account lets you save your workspaces to the cloud, pick them up on another device, and manage your share links. You can sign up with Google, GitHub, or an email address.",
  },
  {
    q: "What if I want to use more prompts?",
    a: "Ask AI has a daily allowance that refreshes on a rolling 24-hour basis, so prompts you use free up again over the following day. For now Dataslope only offers free memberships, so there's no paid upgrade for extra prompts, everyone gets the same free allowance. We may add more options in the future.",
  },
  {
    q: "Why learn the basics when AI can do the heavy lifting?",
    a: "Because someone still has to judge what comes back. AI is fastest in the hands of people who can read the code it writes, spot the wrong join or the off-by-one, and say precisely what they wanted instead, and that judgment only comes from having written enough of it yourself. The playgrounds are here so you can run things and see the result for yourself rather than take anyone's word for it.",
  },
  {
    q: "Which languages and databases are supported?",
    a: "Python, R, JavaScript, TypeScript, HTML/CSS, React, PHP, C, C++, Java, and C#, plus PostgreSQL, SQLite, and DuckDB for SQL.",
  },
  {
    q: "Is my work saved?",
    a: "Your editor contents are kept in your browser's local storage, so refreshing the page or returning later restores your progress on the same device and browser. With a free account you can also save workspaces to the cloud and open them on another device.",
  },
  {
    q: "Can I use it on mobile?",
    a: "Yes, the site and playgrounds are responsive. A larger screen is more comfortable for serious coding, but everything works on a phone.",
  },
];

export function Faq() {
  return (
    // `id` is the target of the `/#faq` deep links (the pricing page's "Browse
    // the FAQ" line, the footer). Without it the hash matched nothing and the
    // browser just left the visitor at the top of the home page.
    // `scroll-mt-20` clears the sticky header (h-14 / md:h-16) so the heading
    // isn't parked underneath it.
    <section
      id="faq"
      className="mx-auto w-full max-w-3xl scroll-mt-20 px-4 sm:px-6"
    >
      <h2 className="mb-16 block text-center text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white">
        Frequently asked questions
      </h2>
      <Accordion.Root className="border-t border-[var(--ds-gray-200)] dark:border-white/10">
        {FAQS.map((item) => (
          <Accordion.Item
            key={item.q}
            className="border-b border-[var(--ds-gray-200)] dark:border-white/10"
          >
            <Accordion.Header>
              {/* Neutral near-black rather than --ds-gray-900 (#111827, which
                  carries a blue cast), matching the page's own foreground and
                  the header lockup. `tracking-tight` tightens it past the
                  -0.011em globals.css gives all sans text. */}
              <Accordion.Trigger className="group flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left text-[17px] font-medium tracking-tight text-[#121212] outline-none dark:text-white">
                {item.q}
                <ChevronDown
                  size={18}
                  className="shrink-0 text-[var(--ds-gray-400)] transition-transform duration-200 group-data-[panel-open]:rotate-180"
                  aria-hidden="true"
                />
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel className="h-[var(--accordion-panel-height)] overflow-hidden text-[var(--ds-gray-600)] transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0 dark:text-[var(--ds-gray-300)]">
              <p className="pb-4 pr-8 leading-relaxed">{item.a}</p>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  );
}
