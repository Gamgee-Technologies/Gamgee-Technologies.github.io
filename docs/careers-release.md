# Careers and shared footer review

The careers page is a self-contained HTML document, including fonts and flags. `site/careers/index.html` and `site/careers/Career.html` are identical entry points. It supports role details, a dedicated application view, and a confirmation view. Shared footer source and its checked-in bundle apply the approved alignment, flag position, US spelling and spacing across existing pages.

## Review checks

Run `npm ci` for the footer build dependencies. For browser checks, install Playwright separately (`npm install --no-save --package-lock=false playwright`) and install its Chromium browser (`npx playwright install chromium`). Then run:

```sh
npm run build:footer
npm run test:careers
npm run test:footer
```

Alternatively, set `GAMGEE_PLAYWRIGHT_MODULE` to an existing Playwright module path and optionally `GAMGEE_BROWSER_CHANNEL` to an installed supported channel such as `msedge`. No test contains machine-specific paths. Browser tests intercept requests rather than submitting real applications or solving real CAPTCHA challenges. Careers tests exercise the actual page handler with mocked receipts; they do not prove the private backend is deployed. Footer checks cover ten entry points at nine widths, including intermediate tablet widths and resize transitions.

## Separate backend release

The Google Apps Script backend remains private and is intentionally excluded from this public repository. Its prepared release and separate local integration suite cover literal spreadsheet writes, a shared `RECAPTCHA_ENFORCED` switch, and persistent email-plus-role duplicate prevention. The public frontend sends a stable server-allowlisted role ID, preserves request IDs after uncertain responses, and accepts only matching `saved` or `already_received` receipts for confirmation.

Repeated email/role applications preserve the original record and produce no new resume or emails. Different allowed roles remain separate applications. Emails are normalized with trim/lowercase; dots and plus addressing are preserved. Existing incomplete records require recovery. Duplicate checks and writes share a server lock. A new session's duplicate receipt contains no original answers, resume link or original reference.

The prepared Sheet schema adds **Role ID** and **Application Key** after the original 20 columns. A deployment-owner migration helper validates existing rows before backfilling those two columns, preserving original data and email states. Existing duplicates are preserved. Unknown roles or inconsistent keys stop migration for manual review. Public submissions never run migration automatically.

## Launch gates

- Keep the private deployment source and existing Sheet backed up. Verify the combined backend source matches the separately reviewed files.
- Configure the deployment owner, `career@gamgee.io` sender permission, recipients and restricted resume storage.
- Set the matching CAPTCHA secret and `RECAPTCHA_ENFORCED=true`. False or missing disables server verification across every form; it does not hide browser widgets. The current checkbox CAPTCHA does not use score thresholds.
- Inspect the live careers Sheet and run the explicit 20-to-22-column migration if needed, or initialize a blank Sheet. Confirm team access without public resume sharing.
- Deploy the backend and updated careers client as a coordinated release. Older clients without a role ID are rejected by the new backend; older backends do not satisfy this client's receipt contract.
- Verify a controlled HTTPS application, persisted row and resume, sender identity, both notification types, duplicate submissions and interrupted-response recovery. Local `file://` previews cannot complete real CAPTCHA.

A feature-branch push does not deploy this site; the Pages workflow runs on `main` or explicit manual dispatch. No live setup, migration, application write, email or deployment is part of this review branch.

## Remaining limits

Email ownership is not verified: an application is identified by the supplied mailbox and role, rather than a verified person. The first application is retained. Varying email addresses can consume storage and email quotas; general admission limits remain separate future work. CAPTCHA and duplicate prevention do not guarantee the absence of spam. Deployment actions currently use inherited version tags rather than immutable commit SHAs.
