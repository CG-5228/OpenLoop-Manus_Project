# AI Provider Integration Handoff

## Current evidence

Member 5 performed a **sandbox-only server-side connectivity probe** against the preconfigured OpenAI-compatible provider:

- Model catalog request succeeded.
- A real structured chat completion using `gpt-5-nano` returned valid JSON.
- No provider key, endpoint value, or response credential is recorded in this repository.

This confirms that the development environment can reach a compatible provider. It **does not** prove that the eventual public deployment has a usable credential, billing authorization, or a configured environment variable.

## Required decision: Member 3 + Member 5

Before building the demo around AI extraction, agree on the deployed provider and record only the non-secret configuration contract:

| Decision | Required outcome |
|---|---|
| Provider and model | A model validated against the project’s fictional sample; choose quality and latency appropriate for commitment extraction. |
| Secret name | A server-only secret such as `OPENAI_API_KEY` if that provider is selected. Never prefix it with `NEXT_PUBLIC_` or commit it. |
| Model configuration | A non-secret optional variable such as `OPENAI_MODEL`, or a documented server default. |
| Deployment secret | The exact secret is entered in the hosting environment before the release check. Sandbox credentials must not be assumed to transfer. |
| Failure behavior | The API returns informative 4xx/5xx errors; the UI shows the error and never substitutes a hidden fixture. |

## Required endpoint contract

```text
POST /api/commitments/extract
Body: { messages: Message[], currentUserLabel: string, referenceDate?: string }
200:  { commitments: Commitment[] }
```

Validate request size, `Message[]` structure, and model output against `src/types/openloop.ts`. Model output must retain exact source evidence, use `null` for unsupported dates, and allow `unknown` direction rather than guessing.

## Live acceptance sample

Run the fictional conversation in `PROJECT_BRIEF.md` through the deployed endpoint. The expected outcome is four definite commitments:

- two **You Owe**;
- two **They Owe You**;
- no commitment for Sarah’s tentative “might review” statement;
- James’s “tomorrow” resolved only from the supplied 8 October reference date;
- Alex’s deadline left `null`;
- every commitment linked to the exact original evidence quote.

## Release-owner gate

Member 5 does not mark the product ready for public deployment until the public, logged-out site completes the sample journey using real server-side inference. If deployment credentials are unavailable, surface that fact honestly; do not present hardcoded output as live AI.
