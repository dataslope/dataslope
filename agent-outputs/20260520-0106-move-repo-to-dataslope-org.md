# Moving `subwaymatch/dataslope-playground` → `dataslope/dataslope`

_Research report — generated 2026-05-20_

---

## Summary

This report covers everything to consider before transferring the repository from the personal account `@subwaymatch` to the `@dataslope` GitHub organization and renaming it from `dataslope-playground` to `dataslope`.

---

## 1. C# / jsDelivr CDN dependency (breaking — must fix)

**Current state**

`app/_components/runtime/cdn.ts` hard-codes the owner and repository name in the jsDelivr URL:

```ts
export const CDN_ASSETS_TAG = "v1.0.3-cdn-assets";

export const CDN_BASE_URL =
  `https://cdn.jsdelivr.net/gh/subwaymatch/dataslope-playground@${CDN_ASSETS_TAG}/cdn-assets`;
```

**Why this breaks after a transfer**

jsDelivr resolves files by the GitHub path directly (`/gh/<owner>/<repo>@<tag>/...`). It **does not follow GitHub's repository-transfer redirects**. After the transfer, all existing `cdn.jsdelivr.net/gh/subwaymatch/dataslope-playground@...` URLs will return errors.

**What to do**

1. Update `CDN_BASE_URL` in `cdn.ts` to reflect the new owner and repository name:
   ```ts
   export const CDN_BASE_URL =
     `https://cdn.jsdelivr.net/gh/dataslope/dataslope@${CDN_ASSETS_TAG}/cdn-assets`;
   ```
2. The existing Git tags (e.g. `v1.0.3-cdn-assets`) transfer with the repository, so the tagged content is still reachable — you just need to update the owner/repo part of the URL.
3. After updating the URL, bump `CDN_ASSETS_TAG` to a new version, create and push the corresponding tag, and verify jsDelivr serves the files correctly before going live.
4. Optionally purge jsDelivr's cache for the old URL if you want to ensure no stale responses linger: https://www.jsdelivr.com/tools/purge

---

## 2. GitHub Actions / CI (low risk for public repos)

**Current workflows**

The repo has two workflow files (`.github/workflows/`): `opencode-comment.yml` and `opencode-issue-opened.yml`. Neither workflow references the repository name or owner explicitly — they use `github.repository_owner` dynamically — so the workflow logic itself does not need to change.

**Secrets**

The `OPENCODE_API_KEY` secret stored in the personal repo **does not transfer** automatically. Before or immediately after the transfer, add `OPENCODE_API_KEY` as a repository secret (or organization-level secret) in the new location.

**Free minutes / billing**

GitHub Actions minutes for public repositories are **unlimited** on all plans (Free, Team, Enterprise). Since this project is public, the transfer does not change your available minutes in any practical way.

**Organization-level Actions policy**

A new (empty) organization on the Free plan defaults to allowing all Actions. Just confirm that the organization's **Actions permissions** setting (Settings → Actions → General) does not restrict third-party Actions, since the workflows use `actions/checkout@v6` and `anomalyco/opencode/github@latest`.

**No self-hosted runners**

The project uses the hosted `ubuntu-latest` runner, so there are no self-hosted runners to migrate.

---

## 3. GitHub Copilot for agentic tasks (minimal impact)

**Personal Copilot license**

Your existing GitHub Copilot Individual or Pro license remains valid for you personally regardless of where the repository lives. You can still use Copilot code suggestions and Copilot Chat in your IDE for any repository you have access to, including one owned by an organization.

**Copilot coding agent (agentic tasks)**

GitHub's Copilot coding agent operates through GitHub Actions on your repository. As long as:
- You (as organization owner) retain access to the repository, and
- The Copilot feature is enabled at the organization level (Settings → Copilot → Policies)

…the agent will continue to work exactly as it does today. No additional Copilot Business/Enterprise seat is required for a free organization where you are the sole contributor.

**Risk**: If the `@dataslope` organization ever adds members and you later enable stricter Copilot organization policies (e.g. "Suggestions matching public code: blocked"), those policies would also apply to your own agent sessions in that repo. For now, as a solo-owned organization, this is not a concern.

---

## 4. Vercel deployment (action required)

**How Vercel connects to GitHub**

Vercel's GitHub integration is installed as a GitHub App. When a repository moves to an organization, the Vercel app's authorization scope changes: it was granted access to repositories under `@subwaymatch`, not under `@dataslope`.

**What breaks**

- Auto-deployment on push will stop working immediately after the transfer.
- Preview deployments on pull requests will stop posting status checks.

**What to do**

1. After the transfer, go to the `@dataslope` organization's GitHub settings → Installed GitHub Apps and install the **Vercel** app, granting it access to the `dataslope` repository.
2. In your Vercel dashboard, re-link the project to the new GitHub repository (`dataslope/dataslope`).
3. Re-verify any environment variables in Vercel (they stay in Vercel's database and are not lost, but double-check after re-linking).

Alternatively, if you prefer to use a Vercel deployment action in GitHub Actions (rather than the native integration), no re-linking is needed — just ensure the `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` secrets are present in the new repo.

---

## 5. GitHub repository URL redirect (informational)

After transfer, GitHub automatically creates an HTTP 301 (permanent) redirect:

```
github.com/subwaymatch/dataslope-playground → github.com/dataslope/dataslope
```

This redirect is **permanent** as long as you do not create a new repository called `dataslope-playground` under your personal account. Existing `git clone` URLs, issue links, and web links will continue to resolve correctly.

**Important**: This redirect covers `github.com` URLs only. It does **not** carry over to third-party services that resolve the GitHub path directly (jsDelivr, npm package registry, etc.) — see section 1.

---

## 6. Other common considerations

### git remote in local clones

Any local clones with `origin` pointing to `git@github.com:subwaymatch/dataslope-playground.git` will continue to work via the redirect, but it is cleaner to update the remote:

```bash
git remote set-url origin git@github.com:dataslope/dataslope.git
```

### npm / package.json

`package.json` has a `"name"` field. It is currently set to the project name used internally by npm scripts and does not affect the GitHub URL, but it is worth updating to `"dataslope"` for consistency.

### Branch protection rules

Branch protection rules (e.g. required status checks on `main`) **do transfer** with the repository. Verify them in the new location's Settings → Branches after the move.

### GitHub Pages (not currently used)

If GitHub Pages is ever enabled in the future, the URL format changes from `subwaymatch.github.io/dataslope-playground` to `dataslope.github.io/dataslope`. This is not a current concern since the site is deployed on Vercel.

### Webhooks

Any webhooks registered on the personal repository (other than built-in GitHub Apps like Vercel) **do not transfer**. Check Settings → Webhooks after the move and recreate any custom webhooks.

### Stars, forks, issues, and pull requests

All transfer with the repository. No action required.

---

## 7. Recommended migration checklist

- [ ] **Before transfer**: add `OPENCODE_API_KEY` as a secret in the destination or note it down to re-create immediately after.
- [ ] **Before transfer**: update `CDN_BASE_URL` in `cdn.ts` to `https://cdn.jsdelivr.net/gh/dataslope/dataslope@...` and push a new CDN assets tag.
- [ ] **Transfer**: go to `subwaymatch/dataslope-playground` → Settings → Transfer → enter `dataslope` as the organization. Choose "dataslope" as the new name.
- [ ] **After transfer**: re-create `OPENCODE_API_KEY` secret in the new repository or at the organization level.
- [ ] **After transfer**: install Vercel GitHub App on the `@dataslope` organization and re-link the Vercel project to `dataslope/dataslope`.
- [ ] **After transfer**: verify GitHub Actions policies in the organization allow third-party Actions.
- [ ] **After transfer**: update local `git remote` URLs in your development environment.
- [ ] **After transfer**: update `package.json` `"name"` field to `"dataslope"`.
- [ ] **Optional**: purge jsDelivr cache for the old CDN URL.
- [ ] **Optional**: verify branch protection rules transferred correctly.
