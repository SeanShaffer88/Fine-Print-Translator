# Scope and non-goals (Phase 0)

Status: Decision 1 is **accepted** (2026-11-11). Decisions 2–4 are proposed and awaiting sign-off.

## What the product is

A local-first reader that points to passages in consumer subscription terms that match
documented, deterministic rules. It surfaces wording and evidence. It does not interpret
legal meaning.

## What the product may claim

| It may say | It may not say |
|---|---|
| "A rule matched this passage." | "This contract renews automatically." |
| "Candidate value: 30 days." | "Your notice period is 30 days." |
| "No supported pattern was detected." | "This document has no cancellation clause." |
| "Two passages appear to differ. Review needed." | "Section 7 overrides section 2." |
| "Text could not be extracted from this file." | "This document is complete / enforceable / safe." |

## Decision 1: first platform (accepted)

**Static, local-first web app that runs entirely in the browser, with no backend.**

- No server exists to receive documents, so "no upload" is a structural property, not a policy.
- No install step; works on desktop and mobile browsers.
- Can be cached for offline use after first load.
- Accessibility is supported by standard HTML semantics and existing browser/screen-reader tooling.
- A desktop wrapper remains possible later without rewriting the analysis core.

Conditions attached to this choice (to be verified in Phase 2, not assumed):

- A Content-Security-Policy that blocks outbound connections (`connect-src 'none'`), and no third-party scripts, fonts, or analytics.
- All libraries (including PDF text extraction) are bundled; nothing is fetched at runtime.
- An automated test runs analysis with networking disabled.

## Decision 2: supported input

| Input | MVP | Proposed limit |
|---|---|---|
| Pasted text | Yes | 1,000,000 characters |
| Plain text file (`.txt`, UTF-8) | Yes | 2 MB |
| Text-based PDF (`.pdf`) | Yes | 20 MB and 300 pages |
| Scanned / image-only PDF | Detected and explained; no OCR | — |
| Encrypted / password-protected PDF | Rejected with explanation; no bypass | — |
| Word, HTML, images, email | No (post-MVP) | — |

The limits are starting values chosen to keep analysis responsive on modest devices. They
should be revisited once real extraction performance is measured.

## Decision 3: document type and categories

Initial document type: **English-language consumer subscription terms.**

MVP categories (five):

1. Trial end and conversion
2. Renewal frequency and renewal wording
3. Price, fees, and stated price changes
4. Cancellation method and notice period
5. Refund terms

`workflow.md` also lists **Data use** and **Disputes** cards. Per `features.md`, those are
**post-MVP** (Phase 5) and are not shown in the MVP. `workflow.md` describes the eventual
card set.

## Decision 4: local data and deletion

Default: **nothing is persisted.** A document and its analysis live in memory and are gone
when the tab is closed.

If the user turns on "Save analyses on this device":

| Stored (browser IndexedDB) | Notes |
|---|---|
| Analysis record: statuses, evidence spans, rule-set version, date | |
| Extracted text | Needed to show evidence in context |
| User edits, notes, hidden/incorrect marks | |
| Document name | Shown in the saved list |
| Copy of the original file | Only if the user chooses to keep it |

As built: saving is per analysis. Nothing is written until the user presses "Save on this
device"; after that, notes and corrections to that analysis are saved as they are made.
The app does **not** keep a copy of the original file, only the extracted text. Saved
records are **not encrypted** (see open questions).

Deletion:

- **Delete analysis** removes the record, extracted text, notes, and any app-managed copy of the file.
- **Delete all data** clears everything the app has stored.
- The app states plainly that it cannot delete the user's own original file elsewhere on the device, or any exported report.

Never stored or transmitted: telemetry, crash reports, or logs containing document text,
filenames, or extracted values.

## Non-goals

- Generative AI or any remote model call.
- Legal advice, risk scores, or "good/bad contract" ratings.
- Claims that a document is complete, fully analyzed, or enforceable.
- Choosing between conflicting passages without a documented deterministic rule.
- Acting on the user's behalf (accepting, cancelling, modifying agreements).
- Scanning email or cloud drives.
- Accounts, sync, or cloud backup.
- Languages other than English, and non-consumer contracts, in the MVP.
- Bypassing document protection.

## Resolved (2026-11-11)

- A passage that explicitly negates a term ("does not renew automatically") is reported as
  **Found** with that passage as evidence, and the explanation must say the wording is negated.
- "Review needed" is a **flag** on Found or Possible match, not a separate status.

See `status-definitions.md`.

## Open questions

1. Are the size limits acceptable, or should they be set after measuring extraction?
2. Should saved analyses be encrypted at rest, or is browser-profile protection sufficient for the MVP?
