---
title: "The screening call is now a link."
date: 2026-09-29
author: ayush
project: manali
summary: "A first-round screen used to be a thirty-minute call to find out what a resume already says. I built a version where the candidate's own agent takes that call, on the candidate's site, from the candidate's record. Early preview inside."
cover: /posts/screening-rounds-just-changed/cover.png
coverAlt: "The screening bar on ayushmagrawal.com answering a question and highlighting the Microsoft role on the page."
draft: true
---

Every hiring process starts the same way. A recruiter reads a resume, then books a thirty-minute call to ask the questions the resume already answers. What did you build. What was hard about it. Have you used this thing we use. The candidate tells the same story again and again. Nobody enjoys it, and it settles very little.

I have been building the other version. The screen happens on the candidate's own site, run by the candidate's own agent, from a record the candidate controls. The recruiter asks whatever they want, in text or out loud, and gets answers with the evidence pointed at on the page. It is about six minutes, there is no score, and the recruiter keeps the notes.

> Rule: the agent answers only from the record. If the record does not say, it says so.

![A screening in Type mode on ayushmagrawal.com. One question, the page scrolls to the role, the agent answers from the record and highlights the evidence.](/posts/screening-rounds-just-changed/screening.mp4)

## What the recruiter gets

They land on a page with one object on it: the screen. They pick Talk or Type. Talk narrates and scrolls the page, and they can interrupt by speaking. Type does the same with captions and nothing spoken, which suits an open office. The agenda is fixed and short. Background, experience, projects, a fit check against their role, then anything else.

The part I care about most is that it moves the page. Ask about the Microsoft work and the page scrolls to that role, draws a box around it, and the answer says "on the page" before it says anything else. The recruiter is never reading a chat transcript. They are reading the site, with a guide.

The fit check is the other part. Paste a job description and the agent goes line by line: matches, partial, or not on record. Not on record is an honest answer, and it is the one that saves everyone a call.

At the end there is a wrap-up with the notes it kept, and one button that sends the conversation to me. It never sends on its own. It also never talks about salary, visa or availability. Those are conversations for people.

## What the candidate controls

This is where it stops being a chatbot on a portfolio.

The record is a small knowledge graph the candidate writes and owns. Public documents live in the repo. Private material, the full text of papers, the resume, agent-only notes, stays out of git and out of the page, but the agent can read it. The candidate decides what is on record, how it is phrased, and what the agent must decline. When the record changes, the site does not need a redeploy. The knowledge index is rebuilt and uploaded, and the next screen uses it.

> Receipt: the agent, the fit check, the notes, the page tools, the voice session and the budget guard were built as one framework first, then pointed at my record. My site is the first instance, not the product.

The site is custom to the person because the record is the person. Same framework, different record, different site.

## What it is not, yet

It is one instance, mine, and it is early. The fit check is only as honest as the record behind it. And I am the only candidate on it, which is a small sample.

The preview is live: [ayushmagrawal.com](https://www.ayushmagrawal.com). Pick Type, ask it something a recruiter would ask, and see whether the answer is one you would trust. Then paste a real job description and watch what it refuses to claim.

---

I am opening this up to a few more people before it opens to everyone. If you want your own record and your own screen, leave a comment below with what you do. First invites go out from the comments, in order.

The screening call was never the interesting part of hiring. It was the part that could be a link.
