# RISE Coach knowledge

What RISE Coach, the AI coach for Startup Moxie students, knows about the program: the Year 1 curriculum and a library of skills students can use to produce real outputs.

RISE Coach reads `index.json` for a table of contents, then opens individual files when a conversation needs them. Changes pushed here reach the coach within about 10 minutes. No deploy needed.

## What's here

| Folder | What | Edit by hand? |
|---|---|---|
| `curriculum/weeks/` | All 36 weeks: objectives, the week at a glance, materials, facilitator notes, the Monday slide outline, every video, source deck and doc links, lesson walkthrough | No. Generated from Moxie Hub |
| `curriculum/tools/` | The weekly AI tools (weeks 18, 23, 24, 25, 31): what each asks for and the task it runs | No. Generated |
| `curriculum/articles/` | One plain-language article per week | No. Generated |
| `curriculum/overview.md`, `how-we-teach.md` | The five units, and the teaching approach | No. Generated |
| `skills/<name>/SKILL.md` | Skills the coach follows to produce an output | **Yes** |
| `index.json` | Table of contents the coach reads | No. Generated |

## Skills

| Skill | Output | Weeks |
|---|---|---|
| `discovery-tracker` | Discovery Tracker entries + 5 Whys | 3, 7 |
| `may-b-p-test` | A 2-week May-B-P test plan with a pass/fail number | 4, 12, 16 |
| `outreach-message` | An outreach message or 3-message sequence | 5, 14, 22 |
| `micro-pitch` | 60-second Problem-Solution-Ask pitch, plus 30s and 2min | 6, 17, 25, 35 |
| `persona-and-market` | Persona card + TAM / SAM / SOM math | 10, 19 |
| `interview-script` | 5-question Mom Test interview + debrief | 7, 11 |
| `value-prop-and-pricing` | "So what?"-tested value proposition + 3-way pricing | 15 |
| `campaign-ab-test` | One-week campaign plan + A/B test | 19, 21, 23, 24 |
| `unit-economics` | One-sale math + break-even | 26, 27 |
| `business-snapshot` | One-page Business Snapshot | 18, 33, 34 |
| `build-a-skill` | A student's own skill, ready to send for approval | 5, 12 |

## Add or change a skill

1. Create `skills/<name>/SKILL.md` with a header:
   ```
   ---
   name: my-skill
   description: "What it does and when to use it. One or two sentences."
   weeks: [4, 12]
   ---
   ```
   Then plain instructions: what to ask the student for, the steps, and the output format.
2. Run `node tools/build.mjs` to refresh `index.json`.
3. Commit and push.

Skills written by students arrive a different way: they ask RISE Coach to save their work, staff approve it, and it lands in the private student-work repo. A good one can be copied here.

## Update the curriculum

The curriculum's source of truth is Moxie Hub. After it changes:

```
node tools/build.mjs /path/to/moxie-hub
```

The build carries over everything in Moxie Hub's curriculum. The one thing it strips is the Google account id on Drive links. Podcast audio isn't included because it isn't text.

## This repo is public

Nothing about any student belongs here: no names, no work samples, no class rosters.
