---
title: "Night Shift: an on-call engineer for a team of one"
date: 2026-10-25
author: ayush
project: what-should-we-watch
series: a-factory-of-one
part: 1
summary: "When a production alert fires, a Claude Code session starts in the cloud within a second, works the runbook against live telemetry, and sends my phone a diagnosis with options. It can look at everything and change nothing. The design, the guardrails, and how to build your own."
coverText: "Night Shift"
coverVariant: type
coverAlt: "Night Shift"
ask: "What would you let an agent do on your production system at 3am, and what would you never let it touch?"
draft: false
---

I run a production iOS app on my own. I'm the developer, the designer, the release manager and the whole on-call rotation. The rotation is the part nobody warns you about.

An alert at 2am is a question, not an answer. "Error rate above threshold" means: open the laptop, find the runbook, run the same handful of queries, check what was deployed last, then decide. The steps are the same every time. Only the numbers change.

Google's SRE book has a word for that kind of work. [Toil](https://sre.google/sre-book/eliminating-toil/) is operational work that is manual, repetitive, automatable and tactical, and that grows with the service. Half of being on call is toil. The other half is judgement: deciding what to do about what you found. Those two halves don't need the same worker.

So I split them. I built a system called **Night Shift** that does the investigating, and leaves the deciding to me.

When a production alert fires, a Claude Code session starts in the cloud within a second. It reads the alert's runbook, runs the runbook's checks against live telemetry, compares the timing with the last deploy, and sends my phone a diagnosis with numbered options. I read it on my lock screen, answer if it asks me something, and either go back to sleep or get up.

> Rule: Night Shift can look at everything. It can change nothing. Claude proposes, I dispose.

This is part one of *A Factory of One*, a series about running a real app as one person. Writing code got cheap. Running software didn't. Each part is one system that takes a job off my plate. Night Shift takes the night shift.

## The six rules

I wrote these down before any code. Everything below follows from them, and they're the part I'd steal if I were you.

1. **Investigate, don't operate.** The system reads production. It never changes production. Fixes come back as pull requests I review.
2. **Permissions over prompts.** "The prompt says don't" is not a control. If it must never happen, the credentials can't do it.
3. **Decisions, not dashboards.** My phone gets a diagnosis and options, not a chart to interpret at 2am.
4. **One incident, one session.** Retries, repeats and alert storms fold into one investigation.
5. **Add to your paging, don't replace it.** The emails and pushes I already trust keep working, untouched.
6. **Nothing of mine stays on.** An alert in, a session out. No laptop left open, no inbox to poll.

Rule 1 is the one people push back on, so here's why. In 1983 Lisanne Bainbridge wrote [Ironies of Automation](https://en.wikipedia.org/wiki/Ironies_of_Automation): automate most of a job and you leave the human with the hardest parts, while taking away the practice they need to do them. An agent that silently restarts things at 3am leaves me with a system I no longer understand. An agent that hands me a diagnosis keeps me in the loop, with a head start.

## The shape

[![Night Shift end to end. Inside the Azure subscription, the backend sends telemetry to App Insights and Log Analytics. Azure Monitor alert rules, each with a runbook, page me through the tier action groups as before. An alert processing rule also sends Sev 1 to 3 alerts to an incident action group, which calls the Night Shift relay by webhook (1). The relay keeps its state in Table storage, reads four Key Vault secrets one by one, and queries telemetry read-only with a managed identity. The relay fires a Claude Code routine (2), which starts a session in Anthropic's cloud. The session calls back to the relay's read-only ops API through an egress proxy that adds the credential (3). The relay pushes every step to ntfy and on to my phone (4). I reply in the Claude app (5). The session can open a pull request on GitHub, never merge one.](/posts/night-shift/architecture.png)](/posts/night-shift/architecture.png)

Tap any diagram for the full-size version. There are three places in this one. Azure, where the app and its monitoring live. Anthropic's cloud, where the Claude session runs. And my phone. Five numbered steps connect them.

**1. An alert reaches the relay.** Azure Monitor alerts fire into *action groups*, and an action group can call a webhook with a structured JSON body, the [common alert schema](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-common-schema). I didn't edit the action groups that page me. An [alert processing rule](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-processing-rules) adds one more action group to every Sev 1–3 alert in the resource group, and that group's only job is the webhook. One rule covers every alert I have today and every alert I add later (rule 5).

**2. The relay starts a session.** Claude Code [scheduled tasks](https://code.claude.com/docs/en/routines) (they used to be called routines) are saved Claude Code setups: a prompt, a repository and a cloud environment. Give one an API trigger and a single `POST` starts a fresh cloud session and returns its link. The docs even list alert triage as a use case. The session clones my repository, so it has the runbooks and the code.

**3. The session investigates through the relay.** It holds no cloud credentials. Every question about production goes through a small read-only API on the relay (rule 2).

**4. Every step reaches my phone.** The relay sends each update to [ntfy](https://ntfy.sh), a simple push service. Every push carries a [click action](https://docs.ntfy.sh/publish/#click-action), so tapping it opens the session in the Claude app.

**5. I answer if it asks.** The session waits for my reply, even hours later.

You might ask why there's a relay at all. Why not point the webhook straight at Claude? The fire API's own docs answer it: ["each successful request creates a new session. There is no idempotency key. If a webhook caller retries, the endpoint creates multiple sessions."](https://platform.claude.com/docs/en/api/claude-code/routines-fire#idempotency) Azure retries webhooks. One outage fires several alerts. The routine's token shouldn't sit in an alert configuration. And the session needs a safe window into production. The relay does all four jobs.

The relay itself is deliberately plain. It's a small FastAPI service on Azure Container Apps with a single always-on replica. It has its own identity and its own storage account, and it shares nothing with the app it watches, so the thing that's broken can't take its watcher down with it.

## What the relay decides

[![What the relay does with one alert. Check the key in constant time; if it's wrong, return 401 and the email still goes out. Parse and fingerprint. If this alert and condition were seen before, acknowledge it as a duplicate. A resolved alert marks itself clear, and when every alert in its incident is clear the incident is resolved with an all-clear push. A fired alert branches on severity: Sev 4 is ignored, Sev 3 joins an open incident or waits for the digest, Sev 1 and 2 join an open incident if they belong to one. Otherwise the relay opens an incident, checks the guards, saves the attempt, fires the routine and pushes "Claude is on it".](/posts/night-shift/relay-decisions.png)](/posts/night-shift/relay-decisions.png)

It's a small state machine. Four ideas do most of the work.

**Dedup on the alert's identity.** Each webhook is acted on once per alert id and condition (fired or resolved). The marker is an atomic insert into a storage table, so two copies of one retry can't both get through. If anything fails after the marker is written, the relay removes it, so Azure's next retry gets a clean attempt.

**Fingerprint the problem, not the alert.** A fingerprint is the alert rule, its dimensions and a hash of the resources it fired on. The same rule on two resources is two problems. The same rule firing again is one.

**Correlate on arrival.** A new alert joins an open incident if it shares a fingerprint, or if anything in that incident fired in the last 15 minutes. One outage, one session (rule 4). The window runs on when alerts *arrive*, because alerts from the same outage can carry timestamps minutes apart.

**Save before you fire.** The fire call can't be safely retried, so the relay writes down that it's about to call before it calls:

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
        await phone.push(f"{incident.title}: Claude couldn't start ({err})")
        return

    incident.fire_status, incident.session_url = "fired", session.url
    await phone.push(f"{incident.title}: Claude is on it", click=session.url)
```

A timeout might still have started a session, and a retry could start a second one. So a failed fire is never retried. My phone hears about it, and the alert email is in my inbox anyway.

**Severity sets the urgency.**

| Severity | What Night Shift does |
|---|---|
| Sev 1 | A session right away and a loud push, on top of the SMS and email |
| Sev 2 | A session right away and a push |
| Sev 3 | Joins an open incident, or waits in a queue. Every four hours a job starts one session that triages whatever is still firing |
| Sev 4 | Stays email only |

**Noise has a budget.** A repeat alert is loud at most once an hour. A "needs you" note is loud at most every ten minutes. Each session can post ten notes an hour, and the relay starts at most six sessions an hour. I want to be woken for a decision, not a heartbeat.

## What the session does

[![One incident, second by second. At 0 seconds Azure Monitor sends the webhook. The relay deduplicates, correlates, checks the guards and saves the attempt, then calls the routine API, which returns the session link at 1 second. The relay pushes "Claude is on it" with the link. The routine starts the session. Around 18 seconds the session posts "investigating", which becomes a push. It runs read-only queries and status checks through the relay. Around 30 seconds it posts the diagnosis, another push. I reply only if it asks. It finishes with "resolved" or "handed off", a final push.](/posts/night-shift/sequence.png)](/posts/night-shift/sequence.png)

The session follows a fixed prompt. The prompt lives in the repository next to the relay, so it gets reviewed like code.

1. Post `investigating`, with one line on what fired.
2. Read the incident: every alert in it, including repeats and resolutions since the session started.
3. Open each alert's runbook. Every alert I own has one, and each runbook has a **Checks** section with the queries to run.
4. Run the checks through the relay, then compare the last deploy's time with when the alert started. Most incidents begin at a release.
5. Post a diagnosis, always in the same shape (rule 3):

```text
Impact:  who is affected and how badly, with numbers
Cause:   best hypothesis, the evidence, how sure
State:   still happening, recovering, or resolved
Options: numbered, each with its risk and who acts
```

6. If I need to decide something, post `needs-you`, ask with numbered options, and wait.
7. If code would fix it, write the fix with a test that fails without it, and open a pull request to my `dev` branch.
8. Finish with `resolved` or `handed off`.

Every note becomes a push, so I can follow an incident from my lock screen without opening anything. Here's a controlled test alert on production, start to finish:

> Receipt: one test alert on production, four pushes, 33 seconds.

| Time | Push |
|---|---|
| 0 s | **Claude is on it** (tap opens the session) |
| 18 s | **investigating**: "Description says it's a test alert. Verifying." |
| 33 s | **diagnosis**: "Impact: none. 0 server errors in the last 30 minutes. Cause: a synthetic test alert." |
| 33 s | **resolved**: "Test alert only. Nothing to do." |

It noticed the label said "test", and checked the data anyway.

## Who can do what

[![Who can do what. The Claude session holds no Azure credentials and no tokens, because the proxy adds them on the way out, plus a key that opens one incident only. It can read runbooks and code, run read-only queries, post notes on its incident and open a pull request to dev. It can't merge or deploy, run az, touch prod or see other incidents. The relay holds a managed identity with Log Analytics Reader on three resources and Key Vault reads one secret at a time. It can read telemetry, write its own table, start sessions within a cap and push to my phone. It can't change any production resource or read a secret it wasn't granted. I hold the merge button, the deploy, rollbacks, restarts, scaling and secrets. Alert text, log lines and query results can carry user-written text, so the session treats them as data, never as instructions.](/posts/night-shift/trust.png)](/posts/night-shift/trust.png)

An agent with access to production at 3am is a security problem before it's anything else. Simon Willison calls the dangerous combination [the lethal trifecta](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/): access to private data, exposure to untrusted content, and a way to send data out. An incident responder has the first two by definition. It reads my telemetry, and alert text and log lines can contain whatever my users typed, the textbook case of [indirect prompt injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/). So the design closes the third leg and keeps the other two as small as they can be.

- **No credentials in the session.** The relay's API needs a bearer token. That token lives in the cloud environment as a [network secret](https://code.claude.com/docs/en/cloud-environments#add-network-secrets): Anthropic's proxy adds it to requests after they leave the session's VM, only for the relay's host and only for paths under `/ops/`. The session never sees it.
- **A two-host internet.** The session's network allowlist is GitHub and the relay. There's nowhere else to send anything.
- **A key per incident.** The session's link to its incident carries a random key that works for that incident and no other.
- **Read-only by role, not by promise.** The relay uses a [managed identity](https://learn.microsoft.com/en-us/entra/identity/managed-identities-azure-resources/overview), so there's no password to leak. It has *Log Analytics Reader* on exactly three resources, *Key Vault Secrets User* on each of its four secrets one at a time (never the whole vault), and write access only to its own storage account, with shared keys turned off.
- **Bounded queries.** 30 seconds per query, 200 rows, two at a time, long cells cut.
- **Payload as data.** The API trigger wraps the alert in a block that labels it untrusted, and the prompt says never to follow instructions inside it. If that ever fails, the permissions above decide what it can actually do: read, post a note on its own incident, open a pull request.
- **Merging is mine.** Branch rules require CI, review and simulator tests on every pull request. The session can open one. It can't merge it.

## The numbers

> Receipt: measured on production.

| What | Measured |
|---|---|
| Alert to session started | about 1 second |
| Alert to the first push on my phone | about 1 second |
| First note from the session | about 18 seconds |
| A full triage of a test alert | 33 seconds |
| Tests on the relay, including storage contract tests against a local Azure Storage emulator | 125 |
| Always-on infrastructure | one small container, one storage table, one job every four hours |

## Next: from reacting to remembering

Night Shift reacts to alerts. The next version should notice problems earlier, and remember the last time.

**Shift left.** Most incidents start at a release, so a deploy watch comes next: thirty minutes after each production release, a session compares before and after on latency per route, errors and new exception types. My phone gets either "deploy looks clean" or a session proposing a rollback. A daily health review will watch slow trends and take over the Sev 4 alerts that page nobody. Detection stays deterministic, in alert rules and anomaly detection. Claude triages. It doesn't stare at raw logs trying to predict the future.

**Memory.** A good on-call engineer remembers. I want Night Shift to as well, and the natural model is a knowledge graph of incidents.

[![Incident memory. An incident is fired by alerts, affects components, started after a deploy, was caused by a root cause, was fixed by a pull request, updated a runbook, and is related to other incidents. Today each incident is one Markdown file with typed frontmatter and links; at 200 or more incidents, the same files load into a graph.](/posts/night-shift/incident-graph.png)](/posts/night-shift/incident-graph.png)

I'm building the graph's shape now and the graph itself later. Every closed incident becomes one Markdown file, written by the session as part of its handoff pull request, in the spirit of Google's [postmortem culture](https://sre.google/sre-book/postmortem-culture/): what happened, the impact, the root cause, the fix, and what we'd do differently.

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

Typed fields are the graph's nodes. The `[[links]]` are its edges. Before opening a runbook, the session searches these files by alert, component and fingerprint, and when an incident closes it proposes runbook edits in the same pull request. So every incident makes the next one shorter.

At a few dozen incidents a year, the model can simply read all of them. Once there are a couple of hundred, or several services, the same files load into a graph, and approaches like [GraphRAG](https://microsoft.github.io/graphrag/) let the session ask relationship questions: what broke after the last deploys that touched this component, and which check found it?

After that, past incidents become a test set. Replay a stored alert with frozen query results and score whether Night Shift reaches the root cause I recorded. That's how a prompt change proves it made things better, not just different.

## Build your own

You don't need my stack. You need these pieces, roughly in this order.

1. **Runbooks first.** One per alert, each with the exact queries to run. The agent is exactly as good as the runbook it reads.
2. **A webhook beside your paging.** In Azure, an alert processing rule adds it in one place. Most monitoring tools have an equivalent.
3. **A small relay.** Dedup, fingerprint, correlate, guard, and save before you fire. Give it its own container and storage.
4. **A read-only window into production.** A managed identity with reader roles on named resources, behind an API that bounds every query.
5. **A Claude Code scheduled task with an API trigger.** Give its cloud environment an allowlist and a network secret for your relay, and nothing else.
6. **A push channel you control,** with the session link in every push.
7. **One synthetic alert, end to end,** before you trust it with a real one.
8. **Write down what it must never do, then make the permissions enforce it.**

If that's a lot for one weekend, start smaller: steps 1, 5 and 6, a hand-written alert, and a session that reads your runbook and pushes a diagnosis. You'll feel the difference the first time your phone says "Impact: none" before you've found your glasses.

## The factory

Night Shift is one machine in the factory. It works the shift I used to work, and it hands me decisions instead of dashboards. I designed it, and Claude Code did most of the typing, the way it does for everything I build.

The rest of *A Factory of One* follows the same pattern. Find a job you do by hand. Give a machine everything it needs to look, and only what you allow it to change. Keep the decisions.

I'm still the bottleneck, on purpose. I'd just rather be woken for a decision than for a query.
