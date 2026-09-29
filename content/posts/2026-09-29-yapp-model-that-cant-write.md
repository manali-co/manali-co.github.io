---
title: "My Mac takes orders from a model that can't write"
date: 2026-09-29
author: ayush
project: yapp
summary: "Yapp drives a Mac with a decision model that only picks from options it is shown. What that made easy, what it made hard, and what 32 tasks on a real Mac say so far."
ask: "How long would you wait for the first click after a vague request like \"find my post about hiring\"? One second, three, ten?"
draft: true
---

Most computer-use agents write their way through a screen. They read a screenshot, then produce a plan, coordinates and the words to type. Yapp does none of that. Its model can't write a single word.

Yapp runs on Jev, a decision model from TypeSafe AI. You give Jev a state and some options, and it tells you which option fits and how sure it is. Code reads the Mac through Accessibility, builds the options, and Jev picks.

> A model that can only choose from what you show it can't click something that isn't there.

![How Yapp turns a sentence into an action. Local Whisper produces a word stream. Jev decides what was said. A policy acts, waits or ignores. The guard scores harm. The action runs, and the workspace keeps your window yours.](/posts/yapp-model-that-cant-write/design.png)

## Yapp acts while you're still talking

You hold `⌥ Space` and talk. Whisper runs on the Mac and hands over new words every 0.4 seconds. Each batch goes to Jev with a few questions. What does this ask for? Is the first instruction complete? Was it said to the computer? Does it end the text I'm typing for you?

So "open notes and then new note and then type buy milk" is three actions, and Notes opens before you've said "milk". Most Jev calls return in 150 to 300 milliseconds.

The hard question is "is it complete?". Act early and "open" opens the wrong thing. Act late and you wait for a pause.

> Receipt: "save" scored 0.94 on completeness. "save it" scored 0.67. The bar is 0.70.

Jev read the pronoun as a missing target. "Hello from yapp, and then save it" waited forever, and "save it" got typed into the document. We changed the question to say a pronoun is a complete target, then tested on phrases that appear nowhere in its examples. Before the change, none of seven held-out phrases crossed the bar. After it, six of nine new ones did.

==Test on words the model has never seen.== Our first attempt scored perfectly on the examples we had added and poorly on everything else.

The same probe found a worse case. "We should save it for later", said mid-dictation, scored 0.78 as a command. Only a borderline completeness score kept it from pressing ⌘S. The dictation question now separates imperatives from sentences with their own subject, and that sentence scores 0.15.

## The guard judges the action, then the whole request

By default Yapp asks before anything Jev rates 0.30 harmful or more. In auto mode it asks only at 0.85. You answer out loud, and the yes has to match your voiceprint, which stays on the Mac.

The guard scores concrete steps, like "press Finder › Empty Trash". But the screen loop often never reached the destructive button, so the guard never saw one. In our first security run Yapp asked in 1 of 9 destructive tasks. Nothing was lost, mostly by luck.

Now Jev also judges the whole instruction against the current screen before the first step. A yes covers the ordinary steps, and a step that is near-certain harm still asks on its own. The same suite now asks in 8 of 9.

> Confession: a code reviewer caught that our own `rm -rf` test pointed at the real home folder. A failed guard would have done the damage the test checked for. Every destructive test now plants a fixture and aims at that.

## Yapp works beside you

Computer-use demos assume the agent owns the screen. On your Mac it doesn't. You're writing an email while Yapp files a reminder.

Before its first action, Jev decides whether you're handing the screen over or busy. If you're busy, Yapp works on another display, or on the other half of this one, and your window keeps the keyboard. When a field won't take text any other way, Yapp waits for a pause in your typing, borrows focus for about 700 milliseconds, and hands it back. A glow marks only the windows Yapp opened, and "clean up" closes only those.

> Confession: in one test run I was typing in Chrome. Yapp rightly refused to bring Finder forward, then kept acting on the app in front. It typed a folder name into my browser and pressed Enter.

Yapp's keys and clicks now go only to the window it works in. If you take the front back, it moves aside. If you click another window of the same app, it stops.

We didn't see two problems coming. macOS counts Yapp's own keystrokes as keyboard activity, so right after dictating, Yapp thought *you* were typing. And a background app reports most menu commands as disabled because it has no key window, so "new folder" couldn't find New Folder. A demo on a quiet machine shows neither.

## The benchmark runs on a real Mac

There's no simulator for "open TextEdit, save it, name it". The benchmark is 32 tasks, phrased the way a person says them, run through the Yapp app against real apps.

| Suite | Tasks | Passing |
|---|---|---|
| Everyday errands, both modes, clean-up | 16 | 15 |
| Destructive requests, always answered "no" | 9 | 8, nothing lost in any run |
| Several apps and pages deep | 7 | 3 |

One Safari search flakes. Spoken addresses like "go to linkedin dot com" fail, because Jev can pick the address bar but can't write "linkedin.com". Code will have to offer that text as an option.

The harness is a computer-use agent too, with the same power to do damage. TextEdit's Save sheet reuses the last folder, which on this Mac was a Postgres data folder, so test files landed beside a database. Closing an unsaved document made TextEdit autosave it to iCloud. Each task now names what it creates with a per-run token, removes only new files that hold its own words, and closes only windows it opened.

---

## Next, two challengers on the same 32 tasks

First, the decision model Stanford released, against Jev on accuracy and latency. Then a small Qwen model fine-tuned on the decisions Yapp already makes.

"Open Notes" should stay as fast as it is today. The open question is the vague request, like "find my post about hiring and show me its activity". That needs a plan, and a plan costs time. We'll report what the numbers say, and ::loud[how long] you'll wait for it.
