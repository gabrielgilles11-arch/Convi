# Speaknow → Convi: Strategic Direction Summary

## Brand
- Original name "Speaknow" conflicts with an existing funded AI speaking/
  assessment company (domain speaknow.co) — high enough risk to change now
  rather than after launch, since switching costs only grow over time.
- **New name: Convi** — no obvious conflicts found in the language-learning
  space, reads naturally as short for "conversation," and is ownable.
- Backups if Convi doesn't stick: **Majo** or **Molón** (Spain-specific slang
  for "nice" / "cool" — more distinctive than "Guay," which is already used
  by an unrelated crane-rental company and a workplace-wellness app).
- Not a full legal trademark clearance. Before final commitment: check
  EUIPO for EU trademarks and confirm the domain is actually available.

## Product
- Format: 15 real-world scenarios, each with a question, a model answer,
  and "what they'll probably say back."
- Content is fully written and ready to be structured into JSON.
- Quiz section: a hybrid of Quizlet (flashcard review) and Duolingo
  (multiple-choice test mode with streaks) — chosen over picking just one.

## Architecture Principles
- **Language as data**: one JSON file per language (starting with
  `es-ES.json`), with reusable components — future languages (French,
  Italian, etc.) require adding a data file, not rebuilding structure.
- **Tech stack**: Astro (static site) + React islands for the interactive
  quiz, hosted on Vercel or Netlify.
- **Progress tracking**: localStorage for v1 — no login/auth needed to ship.

## Distribution & Monetization
- Sell via Gumroad, one-time purchase at roughly €10.
- Gumroad's real cost at this price point: ~10% + €0.50 platform fee, plus
  ~2.9% + €0.30 card processing ≈ **~21% effective cut per sale** (fixed
  fees hit low-ticket items disproportionately hard).
- Marketing: TikTok-led.

## Cost to Launch
| Item | Estimate |
|---|---|
| Domain (.es or .app) | ~€15–20/year |
| Hosting (Vercel/Netlify) | €0 (free tier) |
| Build tool | Claude Code on a Pro (~$20/mo) or Max plan |
| **Rough total to go live** | **€40–90** |

Note: building via the raw Fable 5 API instead of a Claude Code subscription
would likely cost significantly more ($10/$50 per million input/output
tokens) for a project this size — the subscription route is the cheaper path.

## Build Plan
- Use **Claude Code** (agentic), not chat or the raw API — it keeps the
  whole project in context across steps.
- Five-step prompt sequence (see companion file `convi-build-prompts.md`):
  1. Content architecture (JSON schema)
  2. Site scaffold (Astro pages/routing)
  3. Quiz engine (flashcards + multiple choice, combined)
  4. Branding (mobile-first, TikTok-audience personality)
  5. QA, self-review, and deployment prep

## Timeline Context
- Go/no-go checkpoint: roughly 13 months before the master's program
  starts in August 2027.

## Open Items / Next Steps
1. Finalize the brand name (Convi vs. backups) — check domain availability
   and run an EUIPO search.
2. Run the five build prompts in Claude Code.
3. Develop the TikTok content and marketing strategy.
4. Set up the Gumroad storefront and drop in the purchase link.
