// The /create hub ("My Creations"): the signed-in member's challenges,
// questions, and quiz sets. Chrome (sidebar + top bar) comes from the /create
// layout; this page renders the hub content. Static shell + client session
// read, the app/account pattern.
import "@/app/tailwind.css";
import "@/app/home.css";
import type { Metadata } from "next";
import CreateHomeClient from "./CreateHomeClient";

export const metadata: Metadata = {
  title: "Create a challenge or quiz",
  description:
    "Build your own interactive coding challenges, SQL exercises, and multiple-choice questions, then share them with a link. Runs entirely in the browser.",
};

export default function CreatePage() {
  return <CreateHomeClient />;
}
