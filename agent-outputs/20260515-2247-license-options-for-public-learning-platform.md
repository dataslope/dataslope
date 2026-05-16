# License Options for a Public Learning Platform with Future Monetization

**Date:** 2026-05-15  
**Context:** A free learning site covering programming languages, data analytics, data science, and computer science topics. The repository is public. Future monetization via subscriptions (AI chat, AI code review). Goal: protect content while keeping the repository open.

---

## Key Tensions to Resolve

Before choosing a license, understand the two separate concerns:

1. **Code license** — the application source code (Next.js app, components, runtime engines)
2. **Content license** — the learning materials (markdown files, tutorials, exercises, course data)

These can and often should use **different licenses**. A common mistake is applying one license to everything.

---

## Options for the Application Code

### 1. GNU Affero General Public License v3 (AGPL-3.0)

**What it is:** A strong copyleft open-source license. Anyone who runs a modified version of your software as a network service must release their modifications under AGPL.

**Pros:**
- Prevents competitors from quietly forking and running your service without contributing back.
- Widely understood and OSI-approved.
- Keeps the project "open source" in the traditional sense.

**Cons:**
- Does **not** stop competitors from running an unmodified version of your code as a competing service (they just can't hide modifications).
- Does not restrict commercial use outright — a competitor can run their own AGPL service.
- Requires you to dual-license if you use it in proprietary SaaS components (common workaround: keep the core AGPL, sell proprietary add-ons under a commercial license).

**Best for:** When you want genuine open-source community participation and are okay with competitors using the code, as long as improvements flow back.

---

### 2. Business Source License (BUSL / BSL 1.1)

**What it is:** Popularized by MariaDB, HashiCorp (Terraform), and others. Source is publicly visible, but production commercial use is restricted for a defined period (e.g., 4 years), after which it automatically converts to an open-source license (e.g., Apache 2.0).

**Pros:**
- Source is visible (good for trust, auditing, community contributions).
- Clearly restricts commercial competitors from running the software as a competing service.
- Automatically becomes fully open-source after the change date, giving the community a guarantee.
- Used by reputable companies (HashiCorp, MariaDB, Sentry).

**Cons:**
- Not an OSI-approved open-source license — some in the open-source community view it negatively.
- The "Additional Use Grant" must be written carefully to allow your own intended uses.
- Contributors may be reluctant to submit PRs if they feel the license is too restrictive.

**Best for:** SaaS products that want visible source code and protection from cloud providers or direct competitors copying the service. Strong fit for this use case.

---

### 3. Server Side Public License (SSPL v1)

**What it is:** Created by MongoDB. Extremely strong copyleft — if you offer the software as a service, you must open-source **all** the infrastructure code used to provide that service (databases, monitoring, load balancers, etc.).

**Pros:**
- Effectively prevents cloud providers (AWS, GCP, Azure) from offering the software as a managed service.

**Cons:**
- Not OSI-approved; controversial.
- Essentially impossible for third parties to offer it as a service, which may reduce adoption.
- Very aggressive — may deter even non-competing users.

**Best for:** Large infrastructure software threatened by cloud providers. Likely overkill for a learning platform.

---

### 4. Commons Clause (Addendum)

**What it is:** Not a standalone license. An addendum added on top of an existing open-source license (e.g., Apache 2.0 + Commons Clause). Restricts selling the software itself.

**Pros:**
- Simple to add to an existing license.
- Specifically targets commercial resale.

**Cons:**
- Not a well-known or widely accepted standard.
- The wording ("sell") is vague and can cause confusion.
- Still allows competitors to run the software freely — only restricts selling the software itself.
- Not OSI-approved.

**Best for:** Preventing someone from reselling your software. Not ideal as the primary protection mechanism.

---

### 5. Proprietary / All Rights Reserved (No License)

**What it is:** If you publish no license, copyright law applies by default: no one has permission to copy, distribute, or modify your code (even if the repo is public).

**Pros:**
- Maximum legal protection by default.
- No need to define grant of rights.

**Cons:**
- Discourages community contributions — contributors have no legal basis to fork or submit PRs.
- Does not prevent viewing (the repo is public), only copying/use.
- May create confusion or distrust.

**Best for:** Fully closed products. Not ideal for a community learning platform.

---

### 6. Dual Licensing

**What it is:** Offer the code under two licenses simultaneously — one open-source (e.g., AGPL) for community use, and one commercial license sold to businesses that want to use the code without copyleft obligations.

**Pros:**
- Community can use and contribute freely under AGPL.
- Businesses that want to integrate the code commercially pay for a commercial license.
- Used successfully by MySQL, Qt, MongoDB (before SSPL).

**Cons:**
- Requires contributor license agreements (CLAs) from all contributors so you retain the right to sell commercial licenses.
- More complex to communicate and enforce.
- Requires setting up a commercial licensing sales process.

**Best for:** Projects with a strong community and a business arm. A good long-term strategy for this use case as the community grows.

---

## Options for Learning Content (Markdown, Tutorials, Exercises)

Content should be licensed separately from code. Common choices:

### CC BY-NC-SA 4.0 (Recommended for Protected Free Content)

**Attribution-NonCommercial-ShareAlike**

- ✅ Free to share and adapt for non-commercial purposes
- ✅ Modifications must be shared under the same license (prevents closed forks of your content)
- ✅ Clearly prevents competitors from monetizing your content directly
- ❌ Does not allow you to use this content commercially yourself without a separate agreement (not an issue since you own the copyright)

### CC BY-NC-ND 4.0 (Strictest Protection)

**Attribution-NonCommercial-NoDerivatives**

- ✅ Free to share for non-commercial purposes
- ✅ No derivatives allowed — content cannot be adapted or remixed
- ❌ Prevents even non-commercial educational remixing

### CC BY-SA 4.0 (Open Education Friendly)

**Attribution-ShareAlike**

- ✅ Allows commercial use
- ✅ Derivatives must share under the same license
- ❌ Allows competitors to use your content commercially, as long as they also release their versions openly

### All Rights Reserved (Content Only)

- Maximum protection for your learning materials
- Users can read the content but cannot copy or redistribute it
- Common for paid content platforms

---

## Recommended Strategy

Given your use case (public repo, free learning, future subscription monetization, protect content from competitors):

### Short-Term (Now)

| Asset | Recommended License |
|---|---|
| **Application code** | **Business Source License 1.1 (BUSL-1.1)** — Visible source, restricts competing commercial use. Change date: 4 years, converts to Apache 2.0. |
| **Learning content** | **CC BY-NC-SA 4.0** — Free to share and adapt non-commercially, prevents competitors from monetizing your materials. |

### Long-Term (As the Community Grows)

- Transition the **application code** to **dual licensing** (AGPL + commercial) once you have a large contributor community and a CLA process in place.
- Keep content under **CC BY-NC-SA** unless you create a paid tier of content, which you'd protect as **All Rights Reserved**.

---

## Practical Steps

1. **Add a `LICENSE` file** to the repository root with your chosen code license (BUSL-1.1 text).
2. **Add a `LICENSE-CONTENT` file** (or a `CONTENT_LICENSE` note in your README) specifying CC BY-NC-SA 4.0 for learning materials.
3. **Add a license notice** at the top of your `README.md` clarifying both licenses and what users can/cannot do.
4. **Consult a lawyer** before finalizing — especially if contributors will be involved and you want dual-licensing rights later. A CLA (Contributor License Agreement) is often needed.
5. **Consider your GitHub repo settings** — a public repo with BUSL still has visible source, but your LICENSE file is the legal instrument.

---

## Quick Reference Comparison Table

| License | OSI Approved | Allows Community Fork | Restricts Competing SaaS | Allows Your Own SaaS | Auto-converts to OSS |
|---|---|---|---|---|---|
| AGPL-3.0 | ✅ | ✅ | ⚠️ Partial | ✅ | No |
| BUSL 1.1 | ❌ | ⚠️ Non-commercial only | ✅ | ✅ | ✅ (after change date) |
| SSPL v1 | ❌ | ⚠️ Very restrictive | ✅ Very strong | ✅ | No |
| Proprietary | ❌ | ❌ | ✅ | ✅ | No |
| Dual (AGPL + Commercial) | ✅/N/A | ✅ (AGPL) | ⚠️ Partial | ✅ (commercial) | No |

| Content License | Free Sharing | Allows Derivatives | Allows Commercial Use | Prevents Competitor Use |
|---|---|---|---|---|
| CC BY-NC-SA 4.0 | ✅ | ✅ (non-commercial) | ❌ | ✅ |
| CC BY-NC-ND 4.0 | ✅ | ❌ | ❌ | ✅ |
| CC BY-SA 4.0 | ✅ | ✅ | ✅ | ❌ |
| All Rights Reserved | ❌ | ❌ | ❌ | ✅ |

---

## References

- [Business Source License 1.1](https://mariadb.com/bsl11/)
- [AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html)
- [SSPL v1](https://www.mongodb.com/licensing/server-side-public-license)
- [Creative Commons Licenses](https://creativecommons.org/licenses/)
- [ChooseALicense.com](https://choosealicense.com/)
- [Commons Clause](https://commonsclause.com/)
- [OSI Approved Licenses](https://opensource.org/licenses/)
