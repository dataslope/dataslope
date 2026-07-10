// The /create hub: pick a builder (code challenge, SQL challenge, MCQ,
// quiz set) and manage your existing creations. Static shell + client
// session read, the app/account pattern.
import "@/app/tailwind.css";
import "@/app/home.css";
import type { Metadata } from "next";
import { CreatePageShell } from "./_components/CreatePageShell";
import CreateHomeClient from "./CreateHomeClient";

export const metadata: Metadata = {
  title: "Create a challenge or quiz",
  description:
    "Build your own interactive coding challenges, SQL exercises, and multiple-choice questions, then share them with a link. Runs entirely in the browser.",
};

export default function CreatePage() {
  return (
    <CreatePageShell
      eyebrow="Create"
      title="Build your own challenges & quizzes"
      lede="Create interactive coding challenges, SQL exercises, and multiple-choice questions, share each one with a link, or bundle them into a quiz set. Everything runs in the recipient's browser."
    >
      <CreateHomeClient />
    </CreatePageShell>
  );
}
