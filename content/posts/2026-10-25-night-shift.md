---
title: "Night Shift: an on-call engineer for a team of one"
date: 2026-10-25
author: ayush
project: what-should-we-watch
series: a-factory-of-one
part: 1
summary: "When a production alert fires, Owl, a Claude Code agent, starts in the cloud within a second, works the runbook against live telemetry, and sends my phone a diagnosis with options. It can look at everything and change nothing. The design, the guardrails, and how to build your own."
cover: /posts/night-shift/cover.png
coverAlt: "Night Shift. An owl with glowing eyes perches on the first of two hills, a crescent moon rising behind the second. A lock-screen push reads: Sev 2, error rate: Owl is on it. Beside it, a limerick: An owl keeps my servers at night and reads every log by moonlight. It can't touch a thing, so it sends me a ping: Impact: none. Back to sleep. Sleep tight."
shareImage: /posts/night-shift/cover.png
shareTitle: "An AI works my night shift. It can look at everything and change nothing."
shareSummary: "Every production alert now becomes a diagnosis on my phone in about 30 seconds. How I built Owl, an on-call agent, with Claude Code and Azure as a solo developer, and the rule that keeps it safe."
ask: "Want an Owl watching your app? Tell me what you run and what wakes you up at night. Or tap \"Send privately instead\", leave your email, and I'll help you set it up."
draft: false
---

I run a production iOS app on my own. Developer, designer, release manager, and the entire on-call rotation.

The rotation is the part nobody warns you about.

> An alert at 2am is a question, not an answer.

"Error rate above threshold" means the same routine every time. Open the laptop. Find the runbook. Run the same handful of queries. Check what shipped last. Then decide. ==The steps never change. Only the numbers do.==

Google's SRE book has a name for that kind of work: **[toil](https://sre.google/sre-book/eliminating-toil/)**. Manual, repetitive, automatable, tactical, and it grows with the service. Half of being on call is toil. The other half is judgement.

> ==Those two halves don't need the same worker.==

So I split them. I built **Night Shift**, a system that does the investigating and leaves the deciding to me. The agent that works it is called **::coral[Owl]**: awake at night, sees in the dark, quiet until it matters.

When a production alert fires, Owl wakes up in a fresh Claude Code cloud session within a second. It reads the runbook, runs the checks against live telemetry, lines the timing up with the last deploy, and sends my phone a diagnosis with numbered options. I read it on my lock screen and either answer, go back to sleep, or get up.

> Rule: Owl can look at everything. It can **::rose[change nothing]**. **::moss[Owl proposes]**, I dispose.

This is part one of *A Factory of One*, a series about running a real app as one person. ::sun[Writing code got cheap. Running software didn't.] Each part is one system that takes a job off my plate. Night Shift takes the night shift.

> Note: Want an Owl watching your own app? There's a box at the end of this post. Tell me what you run.

## The six rules

I wrote these down before any code. Everything else follows from them. If you take one thing from this post, take these.

| | Rule | What it means |
|---|---|---|
| 1 | **Investigate, don't operate** | Owl reads production. It **::rose[never changes]** production. Fixes arrive as pull requests I review. |
| 2 | **Permissions over prompts** | If something must never happen, the credentials can't do it. The prompt is not a control. |
| 3 | **Decisions, not dashboards** | My phone gets a diagnosis and options, not a chart to squint at. |
| 4 | **One incident, one session** | Retries, repeats and alert storms fold into one investigation. |
| 5 | **Add to your paging, don't replace it** | The emails and pushes I already trust keep working, untouched. |
| 6 | **Nothing of mine stays on** | An alert in, a session out. No laptop left open, no inbox to poll. |

Rule 1 is the one people push back on. In 1983 Lisanne Bainbridge wrote **[Ironies of Automation](https://en.wikipedia.org/wiki/Ironies_of_Automation)**: automate most of a job and you leave the human with only the hardest parts, minus the practice they need to do them.

> An agent that quietly restarts things at 3am leaves me with a system I no longer understand. An agent that hands me a diagnosis keeps me in the loop, with a head start.

## The shape

[![Night Shift end to end. Inside the Azure subscription, the backend sends telemetry to App Insights and Log Analytics. Azure Monitor alert rules, each with a runbook, page me through the tier action groups as before. An alert processing rule also sends Sev 1 to 3 alerts to an incident action group, which calls the Night Shift relay by webhook (1). The relay keeps its state in Table storage, reads four Key Vault secrets one by one, and queries telemetry read-only with a managed identity. The relay wakes Owl, a Claude Code routine (2), which starts a session in Anthropic's cloud. Owl calls back to the relay's read-only ops API through an egress proxy that adds the credential (3). The relay pushes every step to ntfy and on to my phone (4). I reply in the Claude app (5). Owl can open a pull request on GitHub, never merge one.](/posts/night-shift/architecture.png)](/posts/night-shift/architecture.png)

Three places, five steps. Tap any diagram for the full size.

1. **An alert reaches the relay.** Azure Monitor fires alerts into *action groups*, which can call a webhook with a structured JSON body, the [common alert schema](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-common-schema). I didn't touch the groups that page me. One [alert processing rule](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-processing-rules) adds a webhook-only group to every Sev 1–3 alert, today's and tomorrow's.
2. **The relay wakes Owl.** Owl is a Claude Code [scheduled task](https://code.claude.com/docs/en/routines) (formerly "routines"): a saved prompt, a repository and a cloud environment. Its API trigger turns one `POST` into a fresh session with a link. The docs list alert triage as a use case.
3. **Owl investigates through the relay.** It holds no cloud credentials. Every question about production goes through the relay's read-only API.
4. **Every step reaches my phone** through [ntfy](https://ntfy.sh). Each push has a [click action](https://docs.ntfy.sh/publish/#click-action) that opens the session in the Claude app.
5. **I answer if it asks.** Owl waits for my reply, even hours later.

Why a relay, and not a webhook straight to Owl? The fire API's docs answer that one themselves:

> "Each successful request creates a new session. There is no idempotency key. If a webhook caller retries, the endpoint creates multiple sessions." ([Claude API docs](https://platform.claude.com/docs/en/api/claude-code/routines-fire#idempotency))

And Azure retries webhooks. So the relay does four jobs:

- ==one alert starts one session==, however many times Azure retries
- one outage, firing five alerts, becomes one incident
- the routine's token never sits in an alert's configuration
- Owl gets a safe, read-only window into production

It's deliberately plain: a small FastAPI service on Azure Container Apps, one always-on replica, its own identity and its own storage. It shares nothing with the app it watches, so an outage in the app can't stop the relay.

## What the relay decides

[![What the relay does with one alert. Check the key in constant time; if it's wrong, return 401 and the email still goes out. Parse and fingerprint. If this alert and condition were seen before, acknowledge it as a duplicate. A resolved alert marks itself clear, and when every alert in its incident is clear the incident is resolved with an all-clear push. A fired alert branches on severity: Sev 4 is ignored, Sev 3 joins an open incident or waits for the digest, Sev 1 and 2 join an open incident if they belong to one. Otherwise the relay opens an incident, checks the guards, saves the attempt, wakes Owl and pushes "Owl is on it".](/posts/night-shift/relay-decisions.png)](/posts/night-shift/relay-decisions.png)

A small state machine. Four ideas do most of the work.

- **Dedup on the alert's identity.** One action per alert id and condition. The marker is an atomic insert into a storage table, so two copies of a retry can't both get through.
- **Fingerprint the problem, not the alert.** Rule, dimensions and a hash of the resources. The same rule on two resources is two problems. The same rule firing again is one.
- **Correlate on arrival.** Same fingerprint, or anything in the incident firing in the last 15 minutes, means it joins. One outage, one session.
- **Save before you fire.** The fire call can't be safely retried, so the relay writes down that it's about to call before it calls.

```python
async def start_session(incident):
    if reason := guards.why_not():          # kill switch, prod only, hourly cap
        await phone.push(f"{incident.title}: no session ({reason})")
        return

    incident.fire_status = "pending"
    await store.save(incident)              # on record before the call

    try:
        session = await routine.fire(incident.summary())
    except FireError as err:
        incident.fire_status = "failed"     # never retried: it may have started
        await store.save(incident)
        await phone.push(f"{incident.title}: Owl couldn't start ({err})")
        return

    incident.fire_status, incident.session_url = "fired", session.url
    await phone.push(f"{incident.title}: Owl is on it", click=session.url)  # the phone hears first
    await store.save(incident)              # then the record: a failed save can't un-start Owl
```

> A timeout might still have started a session. A retry could start a second one. So a failed fire is **::rose[never retried]**: my phone hears about it instead.

Severity sets the urgency:

| Severity | What Night Shift does |
|---|---|
| Sev 1 | Owl right away, and a loud push on top of the SMS and email |
| Sev 2 | Owl right away, and a push |
| Sev 3 | Joins an open incident, or waits. Every four hours, one session triages whatever is still firing |
| Sev 4 | Email only |

And noise has a budget. A repeat alert is loud at most once an hour. A "needs you" is loud at most every ten minutes. At most six sessions an hour, ten notes per session per hour.

> I want to be woken for a decision, not a heartbeat.

## What Owl does

[![One incident, second by second. At 0 seconds Azure Monitor sends the webhook. The relay deduplicates, correlates, checks the guards and saves the attempt, then calls the routine API, which returns the session link at 1 second. The relay pushes "Owl is on it" with the link. The routine starts Owl's session. Around 18 seconds Owl posts "investigating", which becomes a push. It runs read-only queries and status checks through the relay. Around 30 seconds it posts the diagnosis, another push. I reply only if it asks. It finishes with "resolved" or "handed off", a final push.](/posts/night-shift/sequence.png)](/posts/night-shift/sequence.png)

Owl follows a fixed prompt that lives in the repository, reviewed like code:

1. Post `investigating`, one line on what fired.
2. Read the incident, including every alert that joined since.
3. Open each alert's runbook. Every alert I own has one, and each runbook has a **Checks** section with the exact queries.
4. Run the checks, then line up the last deploy with when the alert started. ==Most incidents begin at a release.==
5. Post a diagnosis in a fixed shape.
6. If I need to decide, post `needs-you` with numbered options, and wait.
7. If code would fix it, write the fix with a test that fails without it, and open a pull request to `dev`.
8. Finish with `resolved` or `handed off`.

The diagnosis always looks like this, because at 2am I want to read it in five seconds:

```text
Impact:  who is affected and how badly, with numbers
Cause:   best hypothesis, the evidence, how sure
State:   still happening, recovering, or resolved
Options: numbered, each with its risk and who acts
```

Every note is a push. Here's a controlled test alert on production, start to finish:

> Receipt: One test alert on production. Four pushes. 33 seconds.

| Time | Push |
|---|---|
| 0 s | **Owl is on it** (tap opens the session) |
| 18 s | **investigating**: "Description says it's a test alert. Verifying." |
| 33 s | **diagnosis**: "**::moss[Impact: none.]** 0 server errors in the last 30 minutes. Cause: a synthetic test alert." |
| 33 s | **resolved**: "Test alert only. Nothing to do." |

> It saw the alert was labelled a test, and it checked the data anyway.

## The prep: why Owl is useful on day one

Here's the part that's easy to miss. Owl has never seen my app before it wakes up. It knows nothing I haven't written down.

> Owl doesn't know my app. It knows my docs. ==That only works because the docs are true.==

So most of the real work happened before Night Shift existed. The repository describes the whole system, and it describes it *as it is today*:

| What Owl reads | How it stays current |
|---|---|
| **A runbook for every alert**, 46 of them, each with the exact queries to run | A test fails the build if an alert has no runbook, the wrong severity, a missing section, or isn't in the index |
| **A living architecture map**, 30 docs, each stamped "Verified: date against commit" | A change in behaviour updates its doc in the same pull request. CI names the doc to check when code that shapes the architecture changes |
| **Why things are the way they are**, as decision records | Written when the decision is made, not reconstructed later |
| **What production runs** | Production deploys only from `main`, every deploy records its commit, and Owl's status check reports the running revision |

Every architecture doc has the same shape: what's true now, what's proposed and the issue tracking it, and the known gaps. When the code and a diagram disagree, the diagram is wrong, and it gets fixed in the same pull request as the code. Design gets the same treatment: every screen comes from one source of truth, so "what should this look like" has exactly one answer.

> Note: if you build only one thing from this post, build this. A runbook per alert and docs that match production make every engineer faster, human or not. Owl just happens to read them in seconds.

## Who can do what

[![Who can do what. Owl, the Claude session, holds no Azure credentials and no tokens, because the proxy adds them on the way out, plus a key that opens one incident only. It can read runbooks and code, run read-only queries, post notes on its incident and open a pull request to dev. It can't merge or deploy, run az, touch prod or see other live incidents. The relay holds a managed identity with Log Analytics Reader on three resources and Key Vault reads one secret at a time. It can read telemetry, write its own table, start sessions within a cap and push to my phone. It can't change any production resource or read a secret it wasn't granted. I hold the merge button, the deploy, rollbacks, restarts, scaling and secrets. Alert text, log lines and query results can carry user-written text, so the session treats them as data, never as instructions.](/posts/night-shift/trust.png)](/posts/night-shift/trust.png)

> An agent with access to production at 3am is a security problem before it's anything else.

Simon Willison calls the dangerous combination **[the lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)**: private data, untrusted content, and a way to send data out. An incident responder has the first two by definition. It reads my telemetry, and log lines can contain anything my users typed, the textbook setup for [indirect prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/).

==So Night Shift narrows the third leg to two places I control, and shrinks the other two.==

- **No credentials in Owl's session.** The relay's token is a [network secret](https://code.claude.com/docs/en/cloud-environments#add-network-secrets): Anthropic's proxy adds it after the request leaves the VM, only for the relay's host, only on `/ops/`. Owl never sees it.
- **A two-host internet.** Owl can reach the relay and my private repository. Nothing else. Anything it writes to GitHub is a branch or a pull request that waits for my review.
- **A key per incident.** Owl's link opens its own live incident and no other.
- **Read-only by role.** The relay uses a [managed identity](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview), so there's no password to leak. *Log Analytics Reader* on exactly three resources. Key Vault access one secret at a time, never the vault. Write access only to its own storage.
- **Bounded queries.** 30 seconds, 200 rows, two at a time.
- **The alert is data.** The trigger wraps it in a block labelled untrusted, and the prompt never follows instructions found inside it.
- **Merging is mine.** Branch rules require CI, review and simulator tests. Owl can open a pull request. It **::rose[can't merge one]**.

> Rule: Write down what it must never do, then make that true in permissions. The prompt is the last line of defence, not the first.

## The numbers

| What | Measured |
|---|---|
| Alert to Owl's session started | **::moss[about 1 second]** |
| Alert to the first push on my phone | about 1 second |
| First note from Owl | about 18 seconds |
| Full triage of a test alert | **::moss[33 seconds]** |
| Tests on the relay, including storage contract tests on a local emulator | 125 |
| Always-on infrastructure | one small container, one table, one job every four hours |

## Next: from reacting to remembering

Night Shift reacts. The next version should notice earlier, and remember.

**Shift left.** Most incidents start at a release, so a deploy watch is next. Thirty minutes after each production release, Owl compares before and after: latency per route, errors, new exception types. My phone gets "deploy looks clean" or a proposed rollback. A daily health review will watch slow trends and take over the Sev 4s.

> Detection stays deterministic. Claude triages. Nobody stares at raw logs hoping to predict the future.

**Memory.** A good on-call engineer remembers the last time. The natural model for that is a knowledge graph of incidents.

[![Incident memory. An incident is fired by alerts, affects components, started after a deploy, was caused by a root cause, was fixed by a pull request, updated a runbook, and is related to other incidents. Today each incident is one Markdown file with typed frontmatter and links; at 200 or more incidents, the same files load into a graph.](/posts/night-shift/incident-graph.png)](/posts/night-shift/incident-graph.png)

I'm building the graph's *shape* now and the graph later. Every closed incident becomes one Markdown file in the private repository, in the spirit of Google's [postmortem culture](https://sre.google/sre-book/postmortem-culture/). Owl drafts it in its handoff pull request, and it only becomes memory once I've reviewed and merged it. It holds a summary, not raw telemetry. Unlike a live incident, a closed one is meant to be shared with every future Owl:

```yaml
---
id: error-spike-after-release       # an example, not a real incident
alerts: [error-rate, latency-p95]
components: [api, database]
trigger: deploy            # deploy · config · traffic · upstream
root_cause: "a query lost its index after a schema change"
fix: <pull request>
time_to_mitigate: 18m
runbook_gap: "checks didn't compare before and after the deploy"
related: ["[[latency-after-a-release]]"]
---
```

Typed fields are the nodes. The `[[links]]` are the edges. Owl searches these files before it opens a runbook, and proposes runbook edits when an incident closes.

> ==Every incident makes the next one shorter.==

At a few dozen incidents a year, the model can simply read them all. At a couple of hundred, the same files load into a graph, and approaches like [GraphRAG](https://microsoft.github.io/graphrag/) let Owl ask relationship questions: *what broke after the last deploys that touched this component, and which check found it?*

Then past incidents become a test set: replay a stored alert with frozen query results, and score whether Owl finds the root cause I recorded. That's how a prompt change proves it made things better, not just different.

## Build your own

You don't need my stack. You need these pieces, roughly in this order:

1. **Runbooks and docs first.** One runbook per alert, with the exact queries, and docs that describe production as it is. ==The agent is exactly as good as what it reads.==
2. **A webhook beside your paging,** not instead of it.
3. **A small relay:** dedup, fingerprint, correlate, guard, save before you fire.
4. **A read-only window into production:** reader roles on named resources, behind an API that bounds every query.
5. **A Claude Code scheduled task with an API trigger,** in a cloud environment with an allowlist and a network secret.
6. **A push channel you control,** with the session link in every push.
7. **One synthetic alert, end to end,** before you trust it with a real one.

> Note: Short on time? Start with steps 1, 5 and 6 and a hand-written alert. You'll feel the difference the first time your phone says "Impact: none" before you've found your glasses.

> Note: If this was useful, tap a reaction. It's one anonymous tap. Reactions tell me what landed, and the posts that collect them are the ones I share more widely, so a tap helps this reach more people who build the way you do. **Learned something** and **Ship it** are my favourites.

## Want an ::coral[Owl] of your own?

I'm opening Night Shift up to a few builders who run production on their own or with a tiny team.

- **Comment below** with what you run and what wakes you up. I read every one, and I'll answer questions about any piece of this.
- **Want help setting it up?** Tap **Send privately instead** in the box below, leave your email, and write "Owl". It comes straight to me.

> Your first page from Owl is the best kind of 2am notification: one you can read in five seconds and go back to sleep.

## The factory

Night Shift is one machine in the factory, and Owl is its operator. ==Every system in the factory gets a named agent. Owl is the first.== I designed it, and Claude Code did most of the typing, the way it does for everything I build.

The rest of *A Factory of One* follows the same pattern. Find a job you do by hand. Give a machine everything it needs to look, and only what you allow it to change. Keep the decisions.

I'm still the bottleneck, on purpose. ::sun[I'd just rather be woken for a decision than for a query.]
