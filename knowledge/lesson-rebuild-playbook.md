# Lesson Rebuild Playbook

This is the repo-standard process for turning a RoboNuggets lesson into a local, economically viable rebuild without losing track of source fidelity.

R45 is the first lesson that fully exercised this loop:

- original lesson assets preserved locally
- source audit written down
- repeatable source baseline created
- live local run verified against the original lesson shape

Use that same pattern for future lessons.

## Core Rule

Do not treat a lesson as "done" just because the outcome looks similar.

For this repo, a strong rebuild has two separate qualities:

- **Economic viability**: it uses already-paid tools, local runtimes, hybrid wrappers, or browser automation where that meaningfully reduces cost
- **Source fidelity awareness**: it records how the rebuild compares to the original lesson's toolchain, prompts, inputs, and outputs

We do not need every lesson to preserve the exact provider stack. We do need to know what changed and why.

## Standard Deliverables

Every lesson that receives a real source pass should have these artifacts:

- `assets/original/`
  Keep downloaded templates, exported workflows, screenshots, sample media, and other raw lesson assets here.
- `assets/skool/setup-notes.md`
  Capture the lesson page notes, tool list, resource links, and setup warnings here.
- `assets/skool/troubleshooting.md`
  Capture follow-up fixes, comments, separate troubleshooting posts, or gotchas here when they exist.
- `FIDELITY.md`
  Record the source-vs-rebuild audit here.

When the lesson has meaningful runtime inputs or source-provided media, add a repeatable baseline fixture too, like R45:

- `config.source-baseline.json`
- local source-aligned fixture data

## Five-Step Workflow

### 1. Capture the Source

Collect as much of the real lesson source as you can before making architecture claims:

- lesson page notes
- original templates or workflow exports
- sample input/output files
- custom GPT / Gem / prompt resources
- lesson video or transcript references

If a custom GPT or Gem is present, treat it as a **resource to inspect**, not automatically as a runtime dependency.

### 2. Write the Source Notes

Fill in `assets/skool/setup-notes.md` with:

- source URL
- tool stack used by the lesson
- attached resources
- warnings, costs, version notes, or account requirements

Use `assets/skool/troubleshooting.md` for separate fixes or community notes that materially affect execution.

### 3. Audit Fidelity

Use `FIDELITY.md` to answer:

- What did the original lesson explicitly use?
- What does the rebuild use now?
- Which substitutions are acceptable for this repo's goals?
- What still needs a source-derived verification pass?

The right outcome is often:

- `economically optimized alternative implementation`

not necessarily:

- `perfectly source-faithful recreation`

### 4. Create a Repeatable Baseline

If the lesson has volatile providers or AI-generated inputs, create a baseline that freezes the important moving parts for testing:

- original sample assets
- local fixture inputs
- explicit config file
- optional provider opt-outs so one flaky API does not poison the whole test

R45 is the example:

- original sample image
- local structured intake fixture
- source-baseline config
- timestamps disabled so the core pipeline could be tested without Gemini quota noise

### 5. Verify Live

Run a real proof pass and record what happened.

What counts:

- verified local scaffold output
- successful live media generation
- saved manifest/report
- notes on the exact failure that blocked progress

If a provider blocks the run, record the concrete reason. Do not collapse different failures into a generic "automation flaky" label.

## Economic Substitution Rules

Substitutions are encouraged when they preserve the lesson outcome and improve economics.

Good substitutions:

- Kie-hosted Suno API -> local Suno hybrid wrapper
- FFMPEG API -> local `ffmpeg`
- shared spreadsheet logging -> local manifest/report files
- direct pay-as-you-go prompting -> already-paid model tiers or local/provider-swappable seams

Be careful when substituting:

- custom GPT / Gem prompt contracts
- provider-specific request fields
- model selection defaults
- artifact dimensions or packaging format

Those can materially change the lesson output even when the high-level task looks the same.

## Custom GPT / Gem Guidance

Treat these as three different cases:

1. **Prompt contract exposed elsewhere**
   If the original workflow export already contains the important prompt rules, the custom GPT/Gem is a reference, not a blocker.

2. **Prompt contract hidden but behavior inferable**
   Try to reconstruct it from the workflow, lesson notes, transcript, and outputs. Document that it is inferred.

3. **Prompt contract essential and not inferable**
   Mark it as an open fidelity gap. Do not pretend the rebuild is exact.

R45 currently falls into case 1.

## Suno-Specific Note

One of the most useful R45 lessons is operational, not architectural:

- description-style prompts that are acceptable in a generic LLM or older API path can still be rejected by the live Suno UI as `Description is too long`

So when a lesson targets Suno:

- keep instrumental descriptions compact
- prefer engine-side guardrails for prompt length
- record the real provider constraint in the lesson audit

## Helper Tool

Use the scaffold helper to create the standard source-fidelity file set for a lesson:

```bash
node shared/lesson-fidelity-scaffold.js \
  --lesson-dir lessons/r46-ultimate-extract-system \
  --lesson-id R46 \
  --lesson-title "Ultimate Extract System" \
  --source-url "https://www.skool.com/robonuggets/..."
```

Dry run:

```bash
node shared/lesson-fidelity-scaffold.js \
  --lesson-dir lessons/r46-ultimate-extract-system \
  --dry-run
```

## Exit Criteria

Before calling a lesson "rebuilt", aim for this minimum:

- original assets preserved or explicitly unavailable
- source notes captured
- fidelity audit written
- economic substitutions explained
- repeatable baseline created when useful
- at least one verified local proof artifact or live run

When those are missing, call it what it is:

- scaffolded
- working reconstruction
- source pass pending

That honesty is part of the standard.
