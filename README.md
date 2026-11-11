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

- 23 starting catalog cards across Apps, AI Agents, Automations, Business, Music, Research, and Local Tools
- Search, category and status filters, favorites, per-tool detail panels
- Custom add/edit/delete tool cards and local backup import/export
- DJ Music Finder request generator with an actual Google Sheet shortcut delivered by a protected server endpoint
- Honest progress labels distinguishing recorded links from proven functional integrations
- Test and launch checklist

## Security model and important limitations

- **The GitHub repository is public**, even though **Vercel web access is protected**. Do not commit API keys, private customer information, webhook URLs with tokens, or restricted spreadsheet links to it. A private GitHub repository is preferred before handling sensitive business configuration.
- `api/links.js` reads `DJ_SHEET_URL` from an encrypted Vercel environment variable, instead of committing the private sheet URL.
- The browser stores custom catalog edits and favorites in localStorage. These **do not automatically sync** across devices; export/import backups as needed. A future iteration can use authenticated Supabase storage.
- This dashboard opens links. It does not automatically trigger external services unless a real integration is implemented and verified.
- OpenSEO and OpenClaw require your local computer and services.
- The DJ Finder currently copies a structured ChatGPT request; it does **not yet** automatically search YouTube and write to Sheets.
- An SSO-protected Vercel site may require an owner/team login. Confirm logged-out access is denied before distributing the hostname.
- Recording a tool's URL and obtaining a successful Vercel deployment do not certify its login, payment flows, data integrity, accuracy, or automation.

## Test instructions

The repository has a dependency-free CI smoke test:

```sh
node tests/smoke.cjs
```

GitHub Actions runs the same script on push and pull requests. It checks JavaScript parsing, initial card rendering, search, category filtering, favorite persistence, main forms, and DJ prompt generation using a simulated DOM.

### Required end-to-end checks before public launch

1. Log into the protected site on desktop and phone; confirm that anonymous visitors cannot access pages or private server routes.
2. Test every linked application with valid credentials and representative inputs.
3. Identify the exact Google Sheet/tab and test verified YouTube searches, duplicate prevention, and actual write-back.
4. Connect Make.com scenarios and other workflow endpoints securely; do not place bearer webhook URLs in HTML.
5. Test local tools from the Windows computer with Docker running; do not assume they're reachable on the public internet.
6. Decide whether cross-device syncing is necessary, and configure authenticated backend storage before relying on updates across devices.
7. Review the catalog for omissions and stale projects, then approve a public launch separately.

No outside service should be marked fully functional until these tests are completed.
