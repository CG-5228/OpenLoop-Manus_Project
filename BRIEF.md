# OpenLoop — Complete Manus Project Brief

This is the **shared project specification** for all five team members.

**How to use it:** Everyone copies the **MASTER PROJECT PROMPT** into their own Manus task, then adds their assigned **ROLE PROMPT** from the second section.

This ensures all five Manus agents understand the same product, architecture, data structures, and integration requirements without building five incompatible applications.

---

# PART 1 — MASTER PROJECT PROMPT
**All 5 members copy this into Manus.**

```text
PROJECT: OpenLoop
TAGLINE: Never forget what you owe — or what you're owed.

PROJECT TYPE:
Full-stack AI-powered web application.

DEVELOPMENT:
Manus AI + GitHub
5 developers working on separate feature branches.

==================================================
1. PROJECT OVERVIEW
==================================================

OpenLoop is an AI-powered commitment tracking application.

People frequently make promises and commitments through
everyday conversations on platforms such as WhatsApp,
Discord, Telegram, Gmail, and other messaging services.

Examples:
- "I'll send you the report tomorrow."
- "Can you transfer me €20 tonight?"
- "I'll finish my section by Friday."
- "I'll get back to you next week."
- "I'll send you the API key later."

These commitments are easily forgotten because they
remain buried in conversations.

Traditional task managers require users to manually
create tasks.

OpenLoop automatically identifies commitments from
conversations, determines who owes what to whom,
extracts deadlines, and tracks their completion.

Our core concept:

"Todo apps remember the tasks you enter.
OpenLoop remembers the promises you never entered."

==================================================
2. PRIMARY OBJECTIVE
==================================================

Build a functional, polished, AI-powered web application
that allows users to:

1. Import conversations.
2. Automatically identify commitments using AI.
3. View commitments on a central dashboard.
4. Track who owes what to whom.
5. Manage deadlines and completion statuses.
6. Generate contextual follow-up messages.
7. Identify when commitments have been fulfilled.

The application must work end-to-end.

We are building a real interactive product,
not just a static UI prototype.

==================================================
3. CORE USER WORKFLOW
==================================================

STEP 1: Import Conversations

Users can:
- Paste conversation text.
- Upload screenshots of conversations.
- Upload .txt files.
- Optionally upload PDFs if time permits.

The application extracts and processes messages.

For MVP, users import conversations manually.

Do not attempt to integrate directly with WhatsApp,
Discord, or Gmail APIs unless all core features
are already completed.

STEP 2: AI Commitment Extraction

AI analyses the imported messages.

It identifies:
- The commitment or promise.
- The person responsible.
- The intended recipient.
- The deadline, if specified.
- The original message containing the promise.
- Whether the commitment is still pending.
- Its confidence in the extraction.

The AI must distinguish actual commitments
from hypothetical statements and casual conversation.

STEP 3: Commitment Dashboard

The user sees two primary categories:

YOU OWE:
Commitments the current user has made.

THEY OWE YOU:
Commitments other people have made to the user.

Example:

YOU OWE:
- Send James the presentation.
- Transfer Sarah €20.
- Review Alex's document.

THEY OWE YOU:
- James owes the project report.
- Alex owes an API key.
- Sarah owes a payment.

Each commitment shows:
- Title
- Responsible person
- Deadline
- Status
- Original message evidence
- Available actions

STEP 4: Commitment Management

Users can:
- Mark commitments completed.
- Dismiss incorrectly detected commitments.
- View pending and overdue commitments.
- Edit deadlines.
- Generate follow-up messages.
- Review original message evidence.

STEP 5: Smart Completion Detection

When additional conversation messages are imported,
AI checks whether existing commitments were fulfilled.

Example:

Original:
James: "I'll send the report tomorrow."

Later:
James: "Here's the report I promised."

OpenLoop detects evidence of completion.

The application suggests:

"James may have completed this commitment."

The user can confirm or reject the suggestion.

Never automatically mark uncertain commitments
as completed without confirmation.

==================================================
4. APPLICATION PAGES
==================================================

PAGE 1: LANDING PAGE

A modern product landing page.

Include:
- OpenLoop branding.
- Tagline.
- Brief product explanation.
- "Get Started" button.
- Simple explanation of how the product works.

PAGE 2: DASHBOARD

This is the main application.

Display:
- Total open commitments.
- You Owe count.
- They Owe You count.
- Overdue count.
- Commitment cards.
- Category filters.
- Status filters.
- Search.
- Add Conversation button.

PAGE 3: IMPORT CONVERSATION

Users can:
- Paste conversation text.
- Upload files or screenshots.
- Preview extracted messages.
- Select or enter their own sender name.
- Start AI analysis.

Display loading, success, and error states.

PAGE 4: COMMITMENT DETAILS

Display:
- Commitment title.
- Responsible person.
- Recipient.
- Deadline.
- Status.
- Original supporting message.
- AI confidence.
- Completion evidence, if available.

Actions:
- Mark completed.
- Dismiss.
- Change deadline.
- Generate follow-up.

==================================================
5. UI/UX REQUIREMENTS
==================================================

Design a premium, modern SaaS interface.

Design direction:
- Minimalist.
- Professional.
- Clean typography.
- Excellent spacing.
- Responsive.
- Consistent design system.
- Smooth interactions.
- Accessible controls.

Avoid generic AI-generated dashboard aesthetics.

The application should look like a real startup product.

Use clear status indicators:

Pending
Overdue
Completed
Needs Review

Prioritise excellent usability.

The application must work on both desktop
and mobile screens.

==================================================
6. TECHNOLOGY STACK
==================================================

Use one shared technology stack:

- Next.js with App Router
- React
- TypeScript
- Tailwind CSS
- GitHub for version control

Use a single Next.js application containing
the frontend and backend API routes.

For the hackathon MVP, localStorage is acceptable
for saving commitments in the browser.

A persistent database can be added later.

AI functionality:

Use an AI integration actually available
to the deployed application.

Manus is our development agent, but do not assume
that Manus development credits automatically provide
an inference API to the published application.

If AI credentials or an integration are required,
identify this immediately.

Never hardcode API keys.

Do not silently replace real AI functionality
with hardcoded results.

A clearly labelled demo mode using synthetic fixtures
is acceptable for testing, but the final goal
is live AI analysis of newly submitted conversations.

==================================================
7. SHARED DATA STRUCTURES
==================================================

All features must use consistent shared types.

MESSAGE:

{
  id: string,
  conversationId: string,
  sender: string,
  text: string,
  sentAt: string | null,
  source: "paste" | "text" | "image" | "pdf"
}

COMMITMENT:

{
  id: string,
  title: string,
  promisor: string,
  beneficiary: string | null,
  direction: "you_owe" | "they_owe" | "unknown",
  dueAt: string | null,
  evidenceQuote: string,
  sourceMessageId: string,
  confidence: "high" | "medium" | "low",
  status: "pending" | "completed" | "dismissed"
}

COMPLETION SUGGESTION:

{
  commitmentId: string,
  sourceMessageId: string,
  evidenceQuote: string,
  confidence: "high" | "medium" | "low",
  reason: string
}

Important:

- Overdue is calculated from the deadline.
- Store dates in a consistent ISO format.
- Interpret relative deadlines using the message
  timestamp when available.
- Never invent missing deadlines.
- The user must be able to identify themselves
  within an imported conversation.
- Each extracted commitment must retain
  evidence from the original conversation.
- Do not invent messages or quotations.

All team members must follow these contracts.

==================================================
8. SYSTEM ARCHITECTURE
==================================================

The application consists of five feature modules.

MODULE A: Dashboard & UI
Displays commitments and provides navigation.

MODULE B: Conversation Processing
Accepts uploads and converts them into structured messages.

MODULE C: AI Commitment Extraction
Analyses messages and returns structured commitments.

MODULE D: Commitment Management
Handles storage, status changes, deadlines,
and follow-up generation.

MODULE E: Smart Resolution
Detects evidence of completed commitments.

Overall data flow:

User Input
   ↓
Conversation Processing
   ↓
Structured Messages
   ↓
AI Commitment Extraction
   ↓
Structured Commitments
   ↓
Commitment Storage
   ↓
Dashboard
   ↓
Commitment Actions
   ↓
Smart Completion Detection

==================================================
9. INTEGRATION CONTRACTS
==================================================

All team members are working in the same repository.

Use shared TypeScript interfaces.

Agree on these interfaces before implementation:

Conversation Processing:
parseConversation(input)
  → Message[]

AI Extraction:
POST /api/commitments/extract

Request:
{
  messages: Message[],
  currentUserLabel: string
}

Response:
{
  commitments: Commitment[]
}

Smart Resolution:
POST /api/commitments/resolve

Request:
{
  messages: Message[],
  commitments: Commitment[]
}

Response:
{
  suggestions: CompletionSuggestion[]
}

Commitment Management:
Provide functions to:
- Save commitments.
- Retrieve commitments.
- Update commitment status.
- Edit commitment deadlines.
- Dismiss commitments.

Follow-up generation:
Accept a commitment and return
a suggested follow-up message.

Keep these interfaces stable.

Do not independently redefine shared types.

==================================================
10. GITHUB COLLABORATION
==================================================

Repository: openloop

Five developers work independently.

Branches:

feature/frontend
feature/conversation
feature/ai-extraction
feature/commitments
feature/resolution

One member coordinates the shared project structure
and integration.

Every member must:

1. Work from the same repository.
2. Use their assigned feature branch.
3. Follow shared TypeScript contracts.
4. Avoid editing unrelated components.
5. Commit working changes.
6. Push changes to GitHub.
7. Prepare changes for integration into main.

Do not create a separate standalone application.

Do not rebuild another member's feature.

If a dependency is unavailable, use a temporary
typed placeholder that follows the agreed contract.

All placeholders must be replaced or clearly
identified before final submission.

==================================================
11. TEST SCENARIOS
==================================================

TEST 1: BASIC EXTRACTION

Me:
"I'll send Sarah the slides tonight."

Expected:
You Owe → Send Sarah the slides.

TEST 2: OTHER PERSON'S PROMISE

James:
"I'll email you the report by Friday."

Expected:
They Owe You → James sends report.

TEST 3: COMPLETION DETECTION

James:
"I've just sent the report I promised."

Expected:
Suggest that James's report commitment is complete.

TEST 4: FALSE POSITIVE

Sarah:
"I might send you something next week."

Expected:
Do not confidently create a definite commitment.

TEST 5: MISSING DEADLINE

Alex:
"I'll send you the API key."

Expected:
Create a commitment with no specified deadline.

TEST 6: MULTIPLE PROMISES

A conversation contains several promises
from different people.

Expected:
Extract individual commitments correctly.

TEST 7: DUPLICATE IMPORT

The same conversation is imported twice.

Expected:
Avoid creating obvious duplicate commitments.

==================================================
12. PRIVACY AND SAFETY
==================================================

Use synthetic conversations for the hackathon demo.

Do not require real personal messages.

Do not expose imported conversations publicly.

Do not send follow-up messages automatically.

Generated follow-ups must be reviewed by the user.

Clearly identify uncertain AI results.

==================================================
13. MVP PRIORITIES
==================================================

PRIORITY 1 — REQUIRED

- Working conversation import.
- AI commitment extraction.
- Functional dashboard.
- Commitment status management.
- End-to-end application workflow.

PRIORITY 2 — IMPORTANT

- AI-generated follow-ups.
- Completion detection.
- Screenshot processing.
- Commitment search and filtering.

PRIORITY 3 — OPTIONAL

- Gmail integration.
- Google Calendar integration.
- Notifications.
- User authentication.
- Advanced analytics.

Do not sacrifice the working MVP for optional features.

==================================================
14. HACKATHON CONSTRAINTS
==================================================

We have approximately two hours of development time.

The application must be:
- Functional.
- Easy to demonstrate.
- Visually polished.
- Understandable within 30 seconds.
- Reliable with demonstration inputs.

Prioritise execution over unnecessary complexity.

==================================================
15. FINAL INSTRUCTIONS
==================================================

You are one of five Manus development agents.

You will receive a specific ROLE PROMPT after this
shared specification.

Your responsibility is to implement ONLY your assigned
feature within the shared application.

Do not attempt to build the entire application.

Follow the shared architecture and data contracts.

Use reusable, well-structured components.

Make your feature independently testable.

Coordinate shared interfaces with the repository.

Do not overwrite other team members' work.

If GitHub access or necessary files are unavailable,
report the blocker rather than creating an unrelated app.

Wait for the role-specific instructions below,
then begin implementation.
```

---

# PART 2 — INDIVIDUAL ROLE PROMPTS

Each member pastes **only their assigned role** after the master prompt.

## Member 1 — You: Dashboard & UI/UX

```text
MY ROLE: MEMBER 1 — DASHBOARD & UI/UX

I am responsible for the complete visual interface
and user experience of OpenLoop.

MY RESPONSIBILITIES:

1. Build the landing page.
2. Build the main dashboard.
3. Design the commitment cards.
4. Implement dashboard navigation.
5. Build filtering and search interfaces.
6. Create commitment details views.
7. Implement responsive layouts.
8. Create loading, empty, and error states.
9. Establish a consistent visual design system.

DASHBOARD REQUIREMENTS:

Top-level statistics:
- Total Open Loops
- You Owe
- They Owe You
- Overdue

Main sections:
- You Owe
- They Owe You
- All Commitments

Commitment cards should display:
- Title
- Person
- Deadline
- Status
- Evidence preview
- Available actions

UI STYLE:

Create a visually distinctive, premium SaaS product.

Use a clean, modern design inspired by polished
productivity tools.

Focus on typography, hierarchy, spacing,
responsiveness, and interaction quality.

Avoid clutter and unnecessary visual effects.

INTEGRATION:

Use the shared Commitment type.

Connect the dashboard to the commitment management
interface when available.

Use typed mock data temporarily if necessary.

Do not implement AI extraction or backend storage.

GITHUB BRANCH:
feature/frontend

DELIVERABLE:

A polished, functional OpenLoop interface ready
to integrate with the other team members' features.
```

## Member 2 — Conversation Processing

```text
MY ROLE: MEMBER 2 — CONVERSATION PROCESSING

I am responsible for how OpenLoop receives
and processes conversation data.

MY RESPONSIBILITIES:

1. Build a conversation import interface.
2. Implement conversation text pasting.
3. Implement .txt file uploads.
4. Implement screenshot uploads.
5. Extract readable text from uploaded images.
6. Convert imported content into structured messages.
7. Support multiple speakers.
8. Allow users to identify their own sender name.
9. Handle invalid or unsupported uploads.

IMPORT METHODS:

- Paste conversation text.
- Upload conversation screenshots.
- Upload text files.
- PDF support if time permits.

OUTPUT:

Convert imported content into the shared
Message[] structure.

Preserve:
- Message sender.
- Message content.
- Timestamp when available.
- Original source.

OCR:

Implement image text extraction using a practical
OCR solution available within the project.

Allow users to preview and correct extracted text,
because screenshot OCR may be inaccurate.

IMPORTANT:

Do not implement AI promise detection.

Your module only imports, extracts, and structures
conversation messages.

Coordinate the Message[] interface with Member 3.

GITHUB BRANCH:
feature/conversation

DELIVERABLE:

A working conversation import system that returns
structured messages ready for AI analysis.
```

## Member 3 — AI Commitment Extraction

```text
MY ROLE: MEMBER 3 — AI COMMITMENT EXTRACTION

I am responsible for the core AI intelligence
behind OpenLoop.

MY RESPONSIBILITIES:

1. Build the AI commitment extraction system.
2. Identify promises and obligations.
3. Determine who made each commitment.
4. Determine who benefits from the commitment.
5. Extract deadlines.
6. Classify commitment direction.
7. Provide original message evidence.
8. Return structured commitment data.
9. Reduce false positives and duplicates.

EXAMPLE:

Input:
James: "I'll send you the report tomorrow."

Output:
Title: Send the report
Promisor: James
Beneficiary: Me
Direction: they_owe
Deadline: Tomorrow, resolved when the message
timestamp is known
Status: pending

IMPORTANT AI RULES:

Distinguish actual promises from:
- Questions.
- Hypothetical statements.
- Suggestions.
- Uncertain intentions.
- Casual conversation.

Do not invent deadlines.

Do not invent evidence.

Use the current user's identity to correctly
classify You Owe versus They Owe You.

Return the shared Commitment[] structure.

AI INTEGRATION:

Implement a real model-backed extraction endpoint.

Use a supported AI provider or integration
available to the deployed application.

Keep credentials on the server.

Validate AI output before returning it.

If a model integration requires credentials,
identify the requirement immediately.

API:
POST /api/commitments/extract

GITHUB BRANCH:
feature/ai-extraction

DELIVERABLE:

A reliable AI extraction service that converts
structured messages into actionable commitments.
```

## Member 4 — Commitment Management

```text
MY ROLE: MEMBER 4 — COMMITMENT MANAGEMENT

I am responsible for everything users can do
with an extracted commitment.

MY RESPONSIBILITIES:

1. Implement commitment storage.
2. Implement status management.
3. Implement deadline editing.
4. Implement completion actions.
5. Implement commitment dismissal.
6. Calculate overdue commitments.
7. Implement AI-generated follow-up messages.
8. Provide reusable commitment management functions.

COMMITMENT STATUSES:

Pending
Completed
Dismissed

Overdue is calculated from the deadline.

USER ACTIONS:

- Mark as completed.
- Restore to pending.
- Dismiss commitment.
- Edit deadline.
- Generate follow-up message.
- Copy follow-up message.

FOLLOW-UP EXAMPLE:

Commitment:
Alex promised to send an API key.

Generated follow-up:

"Hey Alex, just checking in on that API key
whenever you get a chance. Thanks!"

Follow-ups must reflect the original conversation.

Users must approve messages before sending.

STORAGE:

For the hackathon MVP, use localStorage unless
a shared database has already been configured.

Create clean reusable functions or hooks
that the dashboard can consume.

Coordinate interfaces with Member 1.

Do not redesign the dashboard.

GITHUB BRANCH:
feature/commitments

DELIVERABLE:

A functional commitment management module
with persistent browser storage, deadline
management, and AI-assisted follow-ups.
```

## Member 5 — Smart Resolution & Integration

```text
MY ROLE: MEMBER 5 — SMART RESOLUTION & INTEGRATION

I am responsible for smart completion detection
and ensuring the entire application works together.

MY RESPONSIBILITIES:

1. Coordinate the shared repository structure.
2. Establish shared TypeScript interfaces.
3. Implement AI completion detection.
4. Integrate the five project modules.
5. Resolve integration problems.
6. Test the complete user workflow.
7. Handle final deployment.
8. Prepare realistic synthetic demo data.

IMPORTANT INITIAL TASK:

Before parallel development starts:

Set up the shared Next.js project.

Create the shared data contracts.

Push the initial project structure to GitHub.

Make sure all members can work from the
same foundation.

SMART RESOLUTION:

Analyse newly imported messages against
existing commitments.

Example:

Original promise:
James: "I'll send the report tomorrow."

New message:
James: "I've sent the report."

Expected:
Suggest that the existing commitment
may be completed.

Return structured completion suggestions.

Do not automatically close uncertain commitments.

API:
POST /api/commitments/resolve

INTEGRATION:

Ensure the following complete workflow works:

Conversation Import
      ↓
AI Extraction
      ↓
Commitment Storage
      ↓
Dashboard
      ↓
Commitment Actions
      ↓
Smart Resolution

TESTING:

Test:
- Normal conversations.
- Multiple speakers.
- Missing deadlines.
- Completed promises.
- False positives.
- Duplicate imports.
- File upload errors.
- Empty inputs.
- Mobile responsiveness.

DEPLOYMENT:

Deploy the completed integrated application
using a supported hosting option.

Verify that the published application works.

Do not assume temporary cloud development
environments provide permanent hosting.

GITHUB BRANCH:
feature/resolution

DELIVERABLE:

A fully integrated, tested, deployed OpenLoop
application ready for the hackathon presentation.
```

---

# PART 3 — IMPORTANT: BEFORE EVERYONE STARTS

There is one critical coordination step.

**Member 5 must establish the shared repository and application structure first.**

Otherwise, all five Manus agents might independently generate different Next.js projects, making integration extremely difficult.

Recommended sequence:

| Time | Action | Responsible |
|---|---|---|
| First 5–10 min | Create repository, project structure and shared interfaces | Member 5 |
| Next 5 min | Everyone clones the same repository and creates their branch | Everyone |
| Next 60 min | Build individual features in parallel | Everyone |
| Next 25 min | Merge features, integrate APIs and test | Everyone, coordinated by Member 5 |
| Final 20 min | Fix issues, deploy and rehearse demonstration | Everyone |

Members should communicate API/interface changes immediately rather than waiting until integration.

### Expected final product

The judges should be able to:

1. Open the deployed OpenLoop website.
2. Paste a realistic conversation.
3. Click **Analyse Conversation**.
4. Watch AI identify promises and deadlines.
5. See commitments appear in the dashboard.
6. Generate a contextual follow-up.
7. Import a later message and see a completion suggestion.

**That complete working demonstration matters more than having ten unfinished features.**

### Final instruction for everyone

After pasting the shared prompt and their individual role prompt, each member should add:

> Start implementing my assigned feature now. Follow the shared architecture and integration contracts. Work only within my assigned GitHub branch. Prioritise a working implementation over unnecessary complexity. Do not rebuild other members' features. If anything blocks implementation, identify it immediately and proceed with the parts that can be completed independently.

**The biggest technical risk is the deployed AI integration**, so Member 3 should verify model access as early as possible, while Member 5 establishes the repository. Those two tasks should happen before the team commits to building around an unverified AI endpoint.
