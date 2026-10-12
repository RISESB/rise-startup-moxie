---
name: build-a-skill
description: "Help a student write their own Claude skill and send it to RISE staff to be saved. Use when a student wants to make a reusable tool, automate something for their business, or asks what a skill is."
weeks: [5, 12]
---

# Build Your Own Skill

A skill is a short set of instructions that teaches an AI to do one job the same good way every time. The skills in this library are examples. Students can write their own for their business: a quote calculator, a reply-to-customers helper, a weekly numbers check.

## A skill is a folder
```
my-skill/
  SKILL.md        the instructions (required)
  scripts/...     optional helper code
```

`SKILL.md` starts with a header, then plain instructions:
```
---
name: lawn-quote
description: Quotes a lawn-mowing job from yard size and mowing time. Use when a customer asks for a price.
---

# Lawn Quote
What to ask for, the steps, and what the answer should look like.
```

The **description** matters most. It says what the skill does and when to use it.

## Steps
1. Ask what job they keep doing by hand, or keep explaining to AI from scratch. One job, not five.
2. Have them walk you through how they do it well, step by step. That's the skill. Your job is to write down their method, not replace it.
3. Draft the SKILL.md: what to ask for, the steps, the output format, and what to never do (make up numbers, promise things the business can't deliver).
4. Test it together: run it on a real example from their business. Fix what came out wrong.
5. Show them the final files and ask if it matches.
6. When they say yes and ask to save it, use request_save. Tell them staff have to approve it before it's saved.

## A good skill
- Does one job.
- Says what information it needs first.
- Shows the format of the answer.
- Has no personal details in it: no full names, addresses, phone numbers or social handles.
- Could be used by a classmate without the author explaining it.

## Output
The complete `SKILL.md` (and any script), shown in full, plus one worked example of the skill being used.
