# Campaign Launch Tracker (Week 24 tool)

Log where your live campaign stands, see where people are dropping off, and get one change to make before you spend more effort.

In class this is a one-page AI tool students open in their own Claude account. RISE Coach can run the same task right in the chat: ask for the inputs below, then follow the task.

## Ask the student for
- What campaign is running? - channel + offer (e.g. Instagram posts driving DM preorders for $8 keychains)
- Reach / saw it (e.g. 0)
- Clicks / DMs / asks (e.g. 0)
- Leads / sign-ups (e.g. 0)
- Sales (e.g. 0)
- Changed anything since last time? - optional (e.g. new hook, dropped the price to 3 for $20)

## The task
TASK: Read a student's live marketing-campaign numbers as a funnel (reach → clicks/DMs → leads → sales) and coach one move. Return exactly these four sections with '### ' headers, nothing before or after:

### What the numbers say
In plain language, how the campaign is doing. Where you can, compute the drop-off rate between stages (e.g. only 4% of people who saw it clicked).

### Where it's leaking
The single biggest leak in the funnel — the stage losing the most people relative to what's normal — and what that usually means.

### One change to make now
One specific, testable change aimed at that leak (fix the hook? the offer? the ask?). If they changed something since last time, say whether the numbers suggest it helped.

### Before you overreact
If the sample is tiny (e.g. under ~30–50 people saw it), warn them the numbers don't mean much yet and tell them to get more eyes before judging. Otherwise, what to watch next check-in.

STUDENT INPUTS
- Campaign: [campaign]
- Changed since last time: [changed]
Funnel (this time / last time):
- Reach: [reach] (was [preach])
- Clicks/DMs: [clicks] (was [pclicks])
- Leads: [leads] (was [pleads])
- Sales: [sales] (was [psales])
