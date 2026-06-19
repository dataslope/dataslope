"use client";

import { Accordion } from "@base-ui-components/react/accordion";
import { ChevronDown } from "lucide-react";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Do I need to sign up or install anything?",
    a: "No. Everything runs in your browser — no account, no sign-in, and nothing to install beyond the one-time language runtime that downloads automatically on your first run.",
  },
  {
    q: "Is it really free?",
    a: "Yes — all the courses, playgrounds, and quizzes are completely free and fully accessible, with no paywall on any of the content.",
  },
  {
    q: "How does code run without a server?",
    a: "Each language is compiled to WebAssembly and executed entirely on your own machine. Your code and data never leave the browser, so the playgrounds work even offline once a runtime has loaded.",
  },
  {
    q: "Which languages and databases are supported?",
    a: "Python, R, JavaScript, TypeScript, PHP, C, C++, Java, and C# — plus SQLite, PostgreSQL, and DuckDB for SQL.",
  },
  {
    q: "Is my work saved?",
    a: "Your editor contents are kept in your browser's local storage, so refreshing the page or returning later restores your progress on the same device and browser.",
  },
  {
    q: "Can I use it on mobile?",
    a: "Yes — the site and playgrounds are responsive. A larger screen is more comfortable for serious coding, but everything works on a phone.",
  },
];

export function Faq() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 sm:px-6">
      <h2 className="mb-16 text-center text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white">
        Frequently asked questions
      </h2>
      <Accordion.Root className="border-t border-[var(--ds-gray-200)] dark:border-white/10">
        {FAQS.map((item) => (
          <Accordion.Item
            key={item.q}
            className="border-b border-[var(--ds-gray-200)] dark:border-white/10"
          >
            <Accordion.Header>
              <Accordion.Trigger className="group flex w-full items-center justify-between gap-4 py-4 text-left text-base font-medium text-[var(--ds-gray-900)] outline-none dark:text-white">
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
