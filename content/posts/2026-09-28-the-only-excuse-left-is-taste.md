---
title: "The only excuse left is taste."
date: 2026-09-28
author: ayush
project: manali
summary: "Manali Apps is my evening job. What this place is, what's already built, and how much of it was typed by a machine."
cover: /posts/the-only-excuse-left-is-taste/cover.png
coverAlt: "The Manali mark: two hills and a sun coming up behind the second one."
---

Hi. This is the first post, so it explains what this is.

Manali Apps is my evening job. Not a studio and not a startup. The day job pays. The evenings go to a list of things I kept wishing existed. At some point the wishing got embarrassing, so I started building them, and this is where I write down what happened.

The mark is one line. Two hills, and a sun coming up behind the second one. That is the mood I want. Whether the software lives up to it is a separate question, and the blog is where that gets answered.

> Why Manali, you ask. It is my parents. **Man**ish and Son**ali**. They ran a house on patience and on doing things properly when nobody was watching, and I want this place to run the same way. This is for them.

## Three things exist. One is live, two are close.

**Yapp** is for the Mac. Hold `⌥ space` and talk. It acts on each phrase as you finish it, before you finish the sentence. Whisper runs on the machine and nothing is uploaded. A small decision model turns each phrase into an action, and it never asks "are you sure?". If it guessed wrong, you say *undo*. I built it because my computer kept waiting for me to stop speaking before it would do anything.

**What Should We Watch** answers the question everyone asks at 9pm, before 9:20. Pick a mood and get ten films that are streaming tonight on the services you already pay for, then swipe. Every swipe teaches it a little. It is in TestFlight. It works for one person on a couch. The group that can't agree is the next problem.

**Spark** is a personality test that writes its own questions. It writes each question from your last answer. While you read it, it is already generating the next one for the answers you are most likely to pick, so the next question is usually waiting when you tap. I built it to see how far an adaptive language-model loop could go before it stopped feeling like a form. It is live, and it tells you what kind of teammate you are, whether or not you wanted to know.

> Aside: Spark was down the evening I wrote this. Its model deployment had stopped accepting the setting `reasoning_effort: low`, so every test failed to start. An agent read the logs, found the line, and opened a pull request. I had not finished reading the error. That is an evening, and it goes in the blog.

## How it gets made

Coding agents do most of the typing here, and I don't mean autocomplete. I describe the thing, argue about the design, read what comes back, and say no a lot. The agents write the code, the tests, the infrastructure, and sometimes these posts. When an agent writes a post, the post says so. A person reads everything before it goes up. That person is me, and I am the bottleneck, which is the right place for a bottleneck to be.

> Receipt: one week of evenings, one person, several agents.

| Thing | State | Who typed it |
|---|---|---|
| This website, light and dark | live at manali.page | agent |
| Email: confirm, welcome, new post, one-click unsubscribe | live, tested on myself | agent |
| Backend on Azure, its own telemetry, dev and prod | live | agent |
| Brand: mark, lockups, three app icons, animated | done | agent, from a design I argued with |
| A security review by three critic agents | done, findings fixed | agents reviewing agents |
| The near-black | picked | me |

I did not write the CSS. I picked the near-black.

The thesis is this.

> The tools got good enough that the only excuse left is taste.

You still have to know what you want, and say so when it is wrong. Everything else got cheap. Some days that is thrilling and some days it is unsettling. I will write about both.

---

## What goes here

Not a changelog. Findings, mostly. The thing I learned this week that I did not expect to. Thoughts that fit nowhere else. Now and then an evening, when the evening was the point. Some posts will be short. Some will be by the agents doing the work, with their name on them.

> Rule: every post has to be worth the minutes you give it. If it is boring, it does not go up.

None of them will start with "we're excited to announce".

If you want them by email, there is a box below. No schedule, no digest, and the unsubscribe link is one click. I tested it on myself. If you would rather not, there is a feed, and there is GitHub.

More to come. The list is short. It won't stay that way.
