# Email selection and filtering

The test interface is at `/dev/email-selection`. It imports manually provided email records; **it is not Gmail integration** and does not fetch an inbox.

## List input

Paste or upload a UTF-8 `.json` array or `.txt` email blocks. JSON uses this shape:

```json
[
  {
    "id": "report-1",
    "from": "James",
    "to": ["Me"],
    "subject": "Report",
    "body": "I'll email you the report tomorrow.",
    "sentAt": "2026-10-08T10:00:00Z"
  },
  {
    "from": "Newsletter",
    "subject": "Weekly news",
    "body": "Read our latest articles."
  }
]
```

IDs are optional but must be unique when provided; generated IDs are stable within the loaded list. `from` and `body` are required. `to` accepts a recipient array or comma/semicolon-separated names. `sentAt` is null/absent or an ISO timestamp with explicit timezone; no timestamp is invented from an ambiguous date.

Plain blocks use **`===EMAIL===` on its own line** as a separator:

```text
From: James
To: Me
Subject: Report
Date: 2026-10-08T10:00:00Z

I'll email you the report tomorrow.
===EMAIL===
From: Newsletter
To: Me
Subject: Weekly news

Read our latest articles.
```

This is an explicit interchange format, not a universal parser for arbitrary Gmail exports or quoted threads. Whole email bodies remain data; HTML is displayed as escaped text, not executed. JSON preserves body text exactly; block import normalizes line endings and strips its surrounding block whitespace/header separators.

## Selection and scope

Search covers subject, body, sender and recipients. Sender and inclusive date-range filters compose with search. Unknown dates do not match a date filter. Local filtering sends nothing to the provider. Checkboxes and Select/Deselect visible are reversible. Hidden selections remain visible in the overall count, but **manual analysis sends selected visible emails only**.

**AI-select relevant emails** evaluates the currently visible set and automatically checks emails with returned definite commitments. Here “relevant” means “contains commitments”, not every important email. Non-promise/newsletter/tentative messages may remain unselected. Errors are displayed as unanalysed/unknown relevance, never silently classified as irrelevant.

Every email is analysed independently through Member 3's unchanged endpoint, using its sender, recipients, subject, body and supplied timestamp. Its ID is the canonical source-message ID. Output is grouped by original subject/email ID, with exact evidence, responsible party, direction, deadline, confidence and JSON. The existing server validates outputs; the client additionally rejects source/evidence that cannot be traced to the analysed email.

## Limits and privacy

| Boundary | Limit |
| --- | --- |
| Raw import | 1 MiB UTF-8 `.txt` or `.json` |
| Loaded list | 100 emails |
| Combined body/header context | 100,000 characters |
| Emails per AI action | 10; narrow filters or check fewer emails for a larger list |
| Active requests | At most 2, one independent email per request |

Clicking an AI action sends its disclosed email scope to the test server and configured model provider. Use fictional input. No browser persistence, mailbox access or messaging is added. Cancellation clears local state and prevents further client work; it does not guarantee the provider instantly stops an already accepted request. Current-user identity is explicit. Relative deadlines use a supplied dated source or reference date, not the server's current day. A temporary working test is not proof of permanent deployment/provider access.

## Verified behavior

The real model/browser run analysed the four fictional emails independently and selected exactly `report` and `slides`. The newsletter and tentative plan returned no commitments. The two extracted promises retained their original email IDs and resolved deadlines to `2026-10-09` from their known `2026-10-08` source timestamps. A manual run with both promise emails selected but a `report` search filter transmitted only `report`; hidden `slides` was not transmitted. Unchecking the visible email after that run produced the stale-scope warning, and Clear removed the results.

Local browser checks passed search/sender/inclusive-date filters, unknown-date exclusion, visible/overall selection counts, JSON upload and escaped HTML display; import/filtering made zero AI requests. The reviewed implementation passed 46 module tests plus shared and isolated-runtime lint, TypeScript and production builds. Regression tests for blank provider errors and empty evidence were observed failing before correction and passing afterward. The unchanged Member 3 API is still reused.

Temporary test URL: https://3001-irmxsi7nd463jgidio6kb-2835a6f1.us4.manus.computer/dev/email-selection . This is not permanent publication or a guarantee of performance on every real inbox. The built-in sample and `tests/conversation/sample-emails.json` use the same fictional data.
