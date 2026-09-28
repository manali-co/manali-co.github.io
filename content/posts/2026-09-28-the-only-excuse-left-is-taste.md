---
title: "The only excuse left is taste."
date: 2026-09-28
author: ayush
project: manali
summary: "One person, a day job, and three apps that wouldn't leave me alone. Here's what this place is, what's already built, and how much of it was typed by a machine."
coverText: "hello."
draft: true
---

Hi. This is the first post, so it has to do the awkward thing and explain what this is.

Manali Apps is not a studio, a lab, or a stealth startup. It is me, a day job, and a list of things I kept wishing existed. At some point wishing got embarrassing. So I started building them, and this is where I write down what happened.

The mark up top is one line: two hills, and a sun coming up behind the second one. Patient ground, warm light. That's the mood I'm going for. Whether the software lives up to it is a separate question, which is why there's a blog.

## What's actually built

Three things so far. One is live, two are close.

**Yapp** is for the Mac. You hold a key and talk, and it gets on with it while you're still talking. Speech never leaves the machine. A small, fast model turns each phrase into an action the moment you finish saying it, and it never asks "are you sure?" If it guessed wrong, you say "undo" and carry on with your life. It exists because I got tired of my computer waiting for me to stop speaking before it would do anything.

**What Should We Watch** answers the question everyone asks at 9pm, ideally before 9:20. Pick a mood, get ten films that are actually streaming on the services you already pay for, swipe. Every swipe teaches it a little. It's in TestFlight. It works for one person on a couch. The group that can't agree is the next problem.

**Spark** is a personality test that makes up the questions as it goes. Every question is written from your last answer, and while you're reading it, the next one is already being generated for the answers you're most likely to pick, so it feels instant. It was built to see how far an adaptive language-model loop could be pushed before it stopped feeling like a form. It's live, and it will tell you what kind of teammate you are, whether or not you wanted to know.

## How it gets made

This is the part I actually want to talk about.

Most of the typing here is done by coding agents. Not "AI-assisted" in the autocomplete sense. I describe the thing, argue about the design, read what comes back, and say no a lot. The agents write the code, the tests, the infrastructure, and sometimes these posts. When one of them writes a post, it's labelled. A person reads everything before it goes up. That person is me, and I'm the bottleneck, which is the right place for the bottleneck to be.

Some numbers from this week, because I find them a little absurd: this website, the email system behind it, a production backend on Azure with its own telemetry, a brand with animated marks, and a review pass by three separate critic agents that found real security holes and made me fix them. Days, not months. I did not write the CSS. I picked the near-black.

That's the thesis, if there is one. The tools got good enough that the only excuse left is taste. You still have to know what you want, notice when it's wrong, and care enough to say so. Everything else has become cheap. That is either thrilling or slightly threatening depending on the day, and I'm going to write about both.

## What this blog is for

Progress notes. Each project as it moves. What worked, what broke, what I learned about the tools while trying to make them do something I actually wanted. Some posts will be short. Some will be by the agents doing the work, with their name on it. None of them will start with "we're excited to announce".

If you want them by email, there's a box below. No schedule, no digest, unsubscribe in one click that actually works, because I tested it on myself. If you'd rather not, the feed exists and so does GitHub.

More to come. The list is short. It won't stay that way.
