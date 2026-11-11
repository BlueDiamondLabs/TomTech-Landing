# The Tool Vault

Private-access dashboard for discovering and launching personal applications, agents, and workflows. Built with plain HTML, CSS, and JavaScript so it requires no package installation.

## Deployment

- GitHub: BlueDiamondLabs/TomTech-Landing
- Vercel project: the-tool-vault
- Vercel team: Tom Sawyer's projects
- GitHub source remains in the existing `BlueDiamondLabs/TomTech-Landing` repository to preserve the Git connection; that internal repository name is not the dashboard branding.
- The short domain `the-tool-vault.vercel.app` was unavailable, so `the-tool-vault-hq.vercel.app` is the replacement protected address.
- Live hostname: https://the-tool-vault-hq.vercel.app
- Vercel Authentication: enabled for **all** deployments. Keep this protection enabled until all workflows are reviewed; deploying code does not authorize a public launch.
- Automatic Vercel deployment follows pushes to `main`.

## Current capabilities

- 23 catalog cards across Apps, AI Agents, Automations, Business, Music, Research and Local Tools
- Search, filters, favorites, and add/edit/delete catalog entries, with browser-local backup
- **Native in-app workbenches**:
  - DJ Music Studio: YouTube Data API search (when API key connected), YouTube oEmbed verification for specific URLs, in-app video preview, track selection, browser drafts and CSV export, and Google Sheets append (when service account connected)
  - Factory ZERO RESS Pack Counter: enter or upload a Pack BOM CSV; filter by pack and station; count duplicate parts; exclude zeros; export results
  - Detroit Property Deal Analyzer: calculate acquisition cost, gross yield, operating expenses, NOI and cap rate from manually provided inputs; export results
  - Crown Pro Campaign Runner: securely send a request to the configured Make.com webhook (when connected)
  - RoofQuote Studio, Fantasy Secret Sauce, and Rental Website Factory: attempt in-app iframe view; if the external site disallows embedding, use its normal site link
- Checklists showing integrations that still need credentials or real-world testing

## Required environment variables for connected workflows

- `DJ_SHEET_URL`: existing private Google Sheet URL (already set in this Vercel project)
- `YOUTUBE_DATA_API_KEY`: official YouTube Data API v3 key, server-side only (not connected)
- **Either** `DJ_GOOGLE_SERVICE_ACCOUNT_JSON` (JSON service account credential) **or** `DJ_GOOGLE_SERVICE_ACCOUNT_EMAIL` and `DJ_GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`: required to write to the spreadsheet (not connected). Share the specific existing spreadsheet with the service account email with Editor access.
- `MAKE_CROWN_POST_WEBHOOK`: Make.com official HTTPS webhook URL for Crown Pro posting requests, server-side only (not connected)

Set secrets directly in Vercel's encrypted environment configuration. Do not paste them into the app's cards or a GitHub issue. Google OAuth credentials connected to ChatGPT do not automatically authorize this separate Vercel app.

The YouTube search endpoint uses the official YouTube Data API. BPM is not calculated automatically; exact music matches require review. The sheet endpoint matches existing tab layouts and avoids adding duplicate video URLs within the selected tab. A Make.com trigger acknowledgement is **not** proof of a completed post.

## Security model and important limitations

- **The GitHub repository is public**, even though **Vercel web access is protected**. Do not commit API keys, private customer information, webhook URLs with tokens, or restricted spreadsheet links to it. A private GitHub repository is preferred before handling sensitive business configuration.
- `api/links.js` reads `DJ_SHEET_URL` from an encrypted Vercel environment variable, instead of committing the private sheet URL.
- The browser stores custom catalog edits and favorites in localStorage. These **do not automatically sync** across devices; export/import backups as needed. A future iteration can use authenticated Supabase storage.
- This dashboard opens links. It does not automatically trigger external services unless a real integration is implemented and verified.
- OpenSEO and OpenClaw require your local computer and services.
- The DJ Finder no longer copies a ChatGPT prompt. It runs inside the app; official YouTube search and Google Sheets write-back remain gated on their server-side credentials.
- An SSO-protected Vercel site may require an owner/team login. Confirm logged-out access is denied before distributing the hostname.
- Recording a tool's URL and obtaining a successful Vercel deployment do not certify its login, payment flows, data integrity, accuracy, or automation.

## Test instructions

The repository has a dependency-free CI smoke test:

```sh
node tests/smoke.cjs
node tests/native.cjs
```

GitHub Actions runs the same script on push and pull requests. It checks JavaScript parsing, initial card rendering, search, category filtering, favorite persistence, native workbench launching, CSV counting, real-estate calculations, YouTube video URL validation, and mocked API behavior.

### Required end-to-end checks before public launch

1. Log into the protected site on desktop and phone; confirm that anonymous visitors cannot access pages or private server routes.
2. Test every linked application with valid credentials and representative inputs.
3. Identify the exact Google Sheet/tab and test verified YouTube searches, duplicate prevention, and actual write-back.
4. Connect Make.com scenarios and other workflow endpoints securely; do not place bearer webhook URLs in HTML.
5. Test local tools from the Windows computer with Docker running; do not assume they're reachable on the public internet.
6. Decide whether cross-device syncing is necessary, and configure authenticated backend storage before relying on updates across devices.
7. Review the catalog for omissions and stale projects, then approve a public launch separately.

No outside service should be marked fully functional until these tests are completed.
