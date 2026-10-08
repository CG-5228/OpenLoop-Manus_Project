# Deployment (Vercel)

| Item | Value |
|---|---|
| Vercel team | `cg-5228's projects` (Hobby) |
| Project | `openloop` (`prj_LZTAizsAddhjks3mr1t47lZx6Wkg`) |
| Production branch | `main` |
| Production URL | https://openloop-gules.vercel.app |
| Framework preset | Next.js (auto-detected; no `vercel.json` needed) |

## How deployments happen

| Trigger | Path | Result |
|---|---|---|
| Commit authored by the Hobby team owner (`CG-5228`) | Vercel Git integration | Automatic production (`main`) or preview (other branches) |
| Any merge to `main`, by anyone | GitHub Actions → `.github/workflows/deploy.yml` (Vercel CLI) | Production deployment |
| Pull request to `main` | GitHub Actions → `deploy.yml` | Preview deployment; URL posted as a PR comment |

**Why both paths exist:** on a Hobby team with a private repository, Vercel's Git integration only deploys commits whose author is the team owner. Commits and merges by other teammates show as **Blocked** in Vercel. The CLI workflow authenticates with a token instead, so the whole team's merges deploy.

### One-time setup (repository admin)

1. Create a token at <https://vercel.com/account/tokens> with scope **cg-5228's projects**.
2. Add it as a repository secret named **`VERCEL_TOKEN`** (GitHub → Settings → Secrets and variables → Actions), or run `gh secret set VERCEL_TOKEN`.

Until the secret exists, the Deploy workflow skips with a warning rather than failing.

## Quality gate

`.github/workflows/ci.yml` runs `npm ci`, `npm run lint`, `npm run typecheck` and `npm run build` on every pull request to `main` and on pushes to `main`, `feature/**`, `chore/**` and `fix/**`. Keep it green before merging.

## Environment variables

None are required. Without `OPENAI_API_KEY`, the extraction endpoint runs **demo extraction** (rule-based, labelled in the UI) and data is stored in the visitor's browser. To switch to AI extraction later, add `OPENAI_API_KEY` (server-only, never prefixed `NEXT_PUBLIC_`; optional `OPENAI_MODEL`) in Vercel → Project → Settings → Environment Variables for **Production** and **Preview**, then redeploy. `OPENLOOP_EXTRACTION_MODE=ai|demo` forces a mode.

## Preview access

Deployment protection (Vercel Authentication) is **disabled** for this project, so the production URL and every deployment or preview URL open for anyone with the link, with no Vercel login. Re-enable it in Vercel → Project → Settings → Deployment Protection if previews ever need to be private.

## Commit identity

Vercel matches commits to accounts by email. Make sure `git config user.email` is an email verified on your GitHub account. Your GitHub noreply address has the form `<numeric-id>+<username>@users.noreply.github.com`; the ID must be plain digits, not scientific notation.
