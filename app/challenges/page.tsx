/**
 * `/challenges` redirects to the catalog.
 *
 * Detail pages live at `/challenges/<slug>` while the index lives under the
 * studio shell at `/dashboard/challenges`, so trimming a challenge URL back to
 * its parent — which people do — used to land on the 404 page. A permanent
 * redirect costs nothing and keeps the shortest guessable URL working.
 */

import { permanentRedirect } from "next/navigation";

export default function ChallengesIndexRedirect(): never {
  permanentRedirect("/dashboard/challenges");
}
