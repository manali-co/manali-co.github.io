<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/manali-co/.github/main/brand/svg/lockup-dark.svg">
    <img alt="manali apps" src="https://raw.githubusercontent.com/manali-co/.github/main/brand/svg/lockup-light.svg" width="220">
  </picture>
</p>

# manali apps, the website

Home page, blog, subscriptions and a small admin area for [Manali Apps](https://github.com/manali-co). Next.js on Vercel; the look comes from the *Manali Apps Design System* in Claude Design and is ported into `src/styles/`. Claude Design drives every visual change and is kept in step with what ships; the rule is in `CLAUDE.md`.

| Piece | How |
|---|---|
| Posts | Markdown in `content/posts/`, written by people and agents, merged by PR. |
| Comments and reactions | GitHub Discussions, through [giscus](https://giscus.app), one discussion per post. GitHub emails people when someone replies. |
| Subscribe by email | Form → `/api/subscribe` → [manali-api](https://github.com/manali-co/manali-api) (Azure Functions) → Resend. Double opt-in, one-click unsubscribe. |
| Admin | `/admin`, Clerk sign-in, only the emails in `ADMIN_EMAILS` get in. Subscriber count, send the latest post, links to moderate on GitHub. |
| Releases | Pulled from GitHub Releases at build time; the home page shows a download button when a public build exists. |
| Telemetry | Page views, route changes and client errors go to Application Insights (`wsww-dev-appi`), the same component the API reports to. |

## Publishing

`main` is protected: pull requests only, and the CI check (types, lint, build, static export) must pass. Merging a pull request is publishing; Vercel deploys `main` to manali.page within a couple of minutes and the Pages mirror follows. Every pull request gets a Vercel preview URL, which is where a post is read before it goes up. `npm run new` starts a `post/<slug>` branch for you when you run it on `main`. Admins can bypass the ruleset in an emergency; nobody should need to.

## How a post should feel

Meaningful or it doesn't go up. Findings, thoughts, the odd evening; never a changelog, never filler. And playful: use the toys. A pull quote (`> ...`) for the line worth repeating, an aside for the detour (`> Aside: ...`, also `Note:`, `Confession:`, `Receipt:`, `Rule:`), a small table for receipts, `<kbd>`-style keys with backticks, a rule (`---`) for a breath, a clip for proof, and colour when a word needs it: `==highlight==`, `::sun[text]` (also `indigo`, `rose`, `coral`, `moss`), `::big[text]` for a size up, `::loud[text]` for the one word you want shouted. End every post with `ask:` in the front matter: one specific question, shown above the reply box. Headings are sentences with a point, not labels. Short paragraphs. End on something, not on "thanks for reading". Before it goes up, run it through `/unslop` (the skill lives in `.claude/skills/unslop/`): no AI vocabulary, no em dashes, no rule-of-three padding, active voice, say what it does rather than how it feels.

## Two hosts, one home

manali.page (Vercel) is the site. manali-co.github.io is a static export that redirects every URL to the same path on manali.page; it exists so old links and the org profile keep working, and as a fallback if Vercel is down. Reactions, subscribe, confirm, unsubscribe and admin only work on manali.page.

## Images in posts

Put files under `public/posts/<slug>/` and reference them with a site path: `cover: /posts/<slug>/cover.webp` in front matter, `![what it shows](/posts/<slug>/step-2.webp)` in the body. Relative paths like `./shot.png` do not work: `content/` is not served. Keep them small: WebP or PNG, at most 1600px wide, ideally under 300KB, and 1200×675 for a cover. Body images load lazily and never stretch past their own size. A short clip works the same way: `![what it shows](/posts/<slug>/clip.mp4)` renders a silent looping video, with `/posts/<slug>/clip-poster.jpg` as its poster if present. Keep clips under about 3MB, H.264 MP4, no audio. The build fails if a cover path points at a file that is not there.

Front matter is checked at build time: `author` must be a key in `authors` (`src/lib/site.ts`), `project` one of the known projects, `date` a `YYYY-MM-DD`, the slug lowercase and unique, and a `summary` is required unless the post is a draft. Markdown only: raw HTML in a post is rendered as text, never executed.

## Write a post

```sh
npm run new -- --title "Yapp learns to undo" --project yapp --author claude
```

That creates `content/posts/<date>-<slug>.md`:

```yaml
title: "Yapp learns to undo"
date: 2026-09-25
author: claude            # ayush | claude   (src/lib/site.ts)
project: yapp             # yapp | what-should-we-watch | manali
summary: ""               # one sentence; index, feed and the email use it
cover: /posts/undo/cover.webp   # optional, 16:9; without it the project's brand placeholder is used
draft: true               # optional; drafts never build
```

Agent-written posts show "Claude for Yapp, by Ayush Manish Agrawal" and a note that a person read it first. Voice: casual, dry, honest, short sentences. Never "we're excited to announce".

After merging, open `/admin` and press "Preview and send" to email subscribers. Nothing is sent automatically.

## Start a series

A series is a file in `content/series/<slug>.md`. Its hub lives at `/series/<slug>/` once a part is out.

```yaml
title: "Evening builds"
summary: "One or two sentences; the hub, the shelf card and the social card use it."
project: manali           # optional, same values as a post
upcoming:                 # optional: titles of parts not written yet, shown as coming soon
  - "What comes next"
complete: false           # true after the last part; hides coming soon and Follow
```

A post joins with two lines in its front matter, `series: <slug>` and `part: <n>`. The post then gets the series marker at the top, the next part (or coming soon plus "Follow this series") at the end, and the parts rail on laptops. The build fails on a missing series, a part number used twice, `part` without `series`, or published parts with a gap (part 3 out while part 2 is still a draft). The `upcoming` titles stand for every part not out yet, drafts included. Readers who follow a series get one email per new part and nothing else: sending the announcement from `/admin` for a series post reaches every subscriber plus that series' followers. The design is the *series* group in the Claude Design system.

## Run it

```sh
cp .env.example .env.local     # fill in what you have; everything is optional locally
npm install
npm run dev
```

Without Clerk keys the admin area is simply unprotected on localhost. Without `API_BASE_URL` the subscribe form reports a backend error, which is the honest state.

## Deploy

Vercel, from this repo: import it, framework Next.js, set the variables from `.env.example` (Clerk keys, `ADMIN_EMAILS`, `API_BASE_URL`, `API_KEY`, `NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING`, `NEXT_PUBLIC_SITE_URL`). Every push to `main` deploys; PRs get previews. The backend deploys itself from its own repo.

## Understanding traffic

Everything lands in `wsww-dev-appi`. Start with **Application map** (browser → manali-web → manali-dev-api → Resend) and **Usage › Users / Sessions / Events**. Handy KQL:

```kusto
// page views by path, last 7 days
pageViews | where timestamp > ago(7d) | summarize views = count(), people = dcount(user_Id) by name | order by views desc
// subscribe funnel
requests | where name has "subscribe" or name has "confirm" | summarize count() by name, resultCode
// what broke in browsers
exceptions | where client_Type == "Browser" | summarize count() by problemId | order by count_ desc
```

## Layout

| Path | What |
|---|---|
| `src/app/` | Routes: home, `blog`, `blog/[slug]`, `[project]`, `subscribe`, `unsubscribe`, `sign-in`, `admin`, `api/subscribe`, `api/confirm`, `feed.xml`. |
| `src/components/` | Nav, Footer, ThemeToggle, Cover, PostCard, AuthorLine, Giscus, SubscribeForm, Telemetry. |
| `src/lib/` | `posts.ts` (Markdown → HTML), `site.ts` (projects, authors, giscus ids), `releases.ts`, `backend.ts`, `admin.ts`. |
| `src/styles/` | `tokens.css` (design-system tokens), `site.css` (components), `app.css` (web-app additions). |
| `content/posts/` | The blog. |
| `public/brand/`, `public/apps/` | Lockups, marks, covers, app icons. |
| `public/posts/<slug>/` | Images for one post. Reference them as `/posts/<slug>/name.webp` in front matter and Markdown. |
| `scripts/new-post.mjs` | Post generator. |

## Licence

Site code and words: CC BY 4.0, credit Manali. App icons belong to their apps.
