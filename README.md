<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/manali-co/.github/main/brand/svg/lockup-dark.svg">
    <img alt="manali apps" src="https://raw.githubusercontent.com/manali-co/.github/main/brand/svg/lockup-light.svg" width="220">
  </picture>
</p>

# manali apps, the website

Home page, blog, subscriptions and a small admin area for [Manali Apps](https://github.com/manali-co). Next.js on Vercel; the look comes from the *Manali Apps Design System* in Claude Design and is ported into `src/styles/`.

| Piece | How |
|---|---|
| Posts | Markdown in `content/posts/`, written by people and agents, merged by PR. |
| Comments and reactions | GitHub Discussions, through [giscus](https://giscus.app), one discussion per post. GitHub emails people when someone replies. |
| Subscribe by email | Form → `/api/subscribe` → [manali-api](https://github.com/manali-co/manali-api) (Azure Functions) → Resend. Double opt-in, one-click unsubscribe. |
| Admin | `/admin`, Clerk sign-in, only the emails in `ADMIN_EMAILS` get in. Subscriber count, send the latest post, links to moderate on GitHub. |
| Releases | Pulled from GitHub Releases at build time; the home page shows a download button when a public build exists. |
| Telemetry | Page views, route changes and client errors go to Application Insights (`wsww-dev-appi`), the same component the API reports to. |

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
cover: /covers/undo.png   # optional, 16:9; without it the project's brand placeholder is used
draft: true               # optional; drafts never build
```

Agent-written posts show "Claude for Yapp, by Ayush Manish Agrawal" and a note that a person read it first. Voice: casual, dry, honest, short sentences. Never "we're excited to announce".

After merging, open `/admin` and press "Preview and send" to email subscribers. Nothing is sent automatically.

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
| `scripts/new-post.mjs` | Post generator. |

## Licence

Site code and words: CC BY 4.0, credit Manali. App icons belong to their apps.
