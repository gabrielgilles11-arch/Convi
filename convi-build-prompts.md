# Convi — Website Build Prompts for Claude Code

Run these five prompts **in order, in the same project folder**, so each step
builds on the files created by the last one. Paste your actual scenario
content into Step 1 before running it.

---

## Step 1 — Content Architecture

```
I have 15 real-world Spanish conversation scenarios for Spain travelers, 
structured as question / model answer / likely reply-back. Here they are:
[paste your full content here]

Convert this into a JSON content architecture for an Astro site called Convi.
Requirements:
- One JSON file per language, starting with es-ES.json — we'll add other 
  languages later, so treat language purely as data, no hardcoded strings 
  in components.
- Each scenario object needs: id, title, situation context, the prompt to 
  say, 2-3 model-answer variants, an array of 3-5 "what they'll probably 
  say back" replies with translations, slang/regional notes, and a 
  difficulty tag.
- Also stub an empty quiz-questions array per scenario — we'll populate 
  it in step 3.
- Output the JSON file plus a short schema.md explaining the structure, 
  written so a future contributor adding fr-FR.json knows exactly what's expected.
```

---

## Step 2 — Site Scaffold

```
Scaffold an Astro project for Convi. Structure:
- / home page with hero + brand intro
- /scenarios listing all scenarios as cards, pulling from content/es-ES.json
- /scenarios/[id] individual scenario page
- /quiz linking to the quiz section (built next)
Keep components generic enough that adding content/fr-FR.json later 
requires zero component changes. Deploy target is Vercel.
```

---

## Step 3 — Quiz Engine (Combined Review + Test Modes)

```
Build /quiz as a hybrid of Quizlet and Duolingo:
1. Review mode: flashcards per scenario — front is the phrase/prompt, 
   back is the translation + likely replies, with flip animation, 
   shuffle, and next/prev.
2. Test mode: multiple-choice ("what would they most likely say back?") 
   with 3 distractors, a running streak counter, and a session score.
Track progress in localStorage (no login for v1): scenarios reviewed, 
current streak, best score per scenario. Build as a React island within 
Astro. If a scenario's quiz-questions array is empty, auto-generate 
plausible distractors from other scenarios' replies.
```

---

## Step 4 — Branding

```
Apply the Convi brand. Audience mostly arrives from TikTok, so design 
mobile-first and thumb-friendly. Avoid a generic AI-template look — give 
it real personality: warm, punchy, a little playful, suited to Spain 
travel and casual slang, not corporate. Pick a distinctive color palette 
and typography pairing. Include a simple text-based logo mark for v1.
```

---

## Step 5 — QA and Deploy

```
Review your own work: check the quiz logic for bugs (can a distractor 
ever match the correct answer?), confirm responsiveness at mobile widths, 
and use vision to check the rendered pages against the step 4 brand 
direction. Then produce a README with local dev + Vercel deploy steps, 
and a clearly marked spot to drop in the Gumroad purchase link once the 
storefront is live.
```
