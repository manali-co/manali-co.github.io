---
title: "Screening rounds are changed forever."
date: 2026-09-29
author: ayush
project: portfolio
summary: "The first-round call is gone. Your own agent takes the screen, on your own site, from a record you control, and the recruiter walks away with notes and evidence. The early preview is live."
cover: /posts/screening-rounds-just-changed/cover.png
coverAlt: "The screening bar on ayushmagrawal.com answering a question and highlighting the Microsoft role on the page."
ask: "What should a candidate's agent always answer, and what should it never touch? Leave an email if you want an invite."
draft: false
---

The first-round screening call is a thirty-minute meeting to confirm what a resume already says. Every candidate gives it a dozen times. Every recruiter sits through hundreds. It exists because a resume can't answer a follow-up question.

Now it can. I built the thing that replaces the call, and the ==very early== preview is live.

> The recruiter asks. Your agent answers from your record, scrolls to the evidence, and hands over notes. Six minutes, no call, no calendar.

![A screening in Type mode on ayushmagrawal.com. One question, the page scrolls to the role, the agent answers from the record and highlights the evidence.](/posts/screening-rounds-just-changed/screening.mp4)

## What a screen looks like now

A recruiter opens your site and there is one object on it: the screen. They pick Talk or Type. Talk narrates and scrolls the page, and they can interrupt by speaking. Type does the same with captions and nothing spoken, which suits an open office. The agenda is short and fixed. Background, experience, projects, a fit check against their role, then anything else.

The agent moves the page. Ask about your work and the page scrolls to the role, draws a box around it, and the answer starts with "on the page". The recruiter never reads a transcript. They read your site, with a guide who knows every line of it.

Then the part no call has ever done well. Paste the job description and the agent goes through it line by line: matches, partial, or not on record. ::sun[**"Not on record"**] is a real answer. It is the answer that used to cost everyone a meeting to discover.

At the end there is a wrap-up with the notes it kept and one button that sends the whole conversation to the candidate. The recruiter keeps the notes. The candidate gets the questions. Both sides leave with more than a call ever gave them.

## Why this is different from a chatbot on a portfolio

Three reasons, and each one is a rule the framework enforces.

> Rule: the agent answers only from the record. If the record does not say, it says so. It never guesses on your behalf.

> Rule: the candidate owns the record. Public documents live in the repo. Private material, the full text of papers, the resume, notes only the agent may read, stays out of git and off the page. You decide what is on record, how it is phrased, and what the agent must decline. Salary, visa and availability are declined by default. Those stay with people.

> Rule: the record is the product. The site is generated from it. Change the record, rebuild the index, and the next screen uses it. No redeploy. Same framework, your record, your site.

That last one is the point. This is not my portfolio with a chat box. It is ::indigo[**a framework**]: the agent, the fit check, the notes, the page tools, the voice session and the abuse guard were built once, then pointed at my record. My site is the first instance.

> Receipt: the whole thing, agent to infrastructure, was designed in Claude Design and built with coding agents in evenings. The candidate-facing part is a folder of Markdown.

## Try the early preview

It's live at [ayushmagrawal.com](https://www.ayushmagrawal.com). Pick Type, ask it something you'd ask on a screening call, and watch the page move. Then paste a real job description and see what it refuses to claim. ::moss[That refusal is the feature.]

It's ::loud[very] early. One instance, mine, and I'm the only candidate on it. That's about to change.

---

I'm opening it to a small group next. If you want your own record and your own screen, reply below with what you do and where, and leave an email. No account needed. Invites go out from the replies, in order, before it opens to everyone.

The screening call was never the interesting part of hiring. It was the part that could be a link. ::big[Now it is one.]
