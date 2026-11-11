# Fine-Print Translator — Features and Requirements

## MVP goal

Help users locate and understand common subscription terms in a document, entirely on-device, with the original text available as evidence.

## MVP features

### Document input
- Import PDF and plain-text documents.
- Paste text directly.
- Validate format and size before analysis.
- Detect likely image-only or empty-text PDFs.
- Never upload document contents.

### Local analysis
- Extract text and preserve page boundaries where possible.
- Split text into sections using headings, numbering, and paragraph boundaries.
- Run deterministic, versioned rules.
- Store the rule-set version with each analysis.
- Provide cancellation and progress feedback.

### Initial detection categories
1. Trial end and conversion
2. Renewal frequency and renewal wording
3. Price, fees, and stated price changes
4. Cancellation method and notice period
5. Refund terms

Data-use and dispute clauses are post-MVP because they require broader language coverage and more careful explanations.

### Results
- Status: found, possible match, not found, or could not analyze.
- Evidence excerpt and page reference when available.
- Rule explanation in plain language.
- Extracted values shown as candidates, not authoritative facts.
- Link from each result to the original passage.
- “Review needed” state for conflicting or ambiguous findings.

### Local user controls
- Optional local saving.
- Edit extracted values.
- Add local notes.
- Export a report.
- Delete an analysis and associated stored document.
- No account required.

### Accessibility
- Keyboard-operable controls.
- Screen-reader labels for status and evidence.
- Do not rely on color alone for status.
- Support text resizing and high contrast.
- Preserve a logical reading order.

## Post-MVP features

- On-device OCR for scanned documents.
- Additional document formats.
- More subscription-related clause categories.
- User-confirmed local deadline reminders.
- Search across saved analyses.
- User-defined phrase rules.
- Optional encrypted backup, only after a separate privacy and security review.

## Out of scope

- Generative AI or remote model calls.
- Legal advice or legal risk scoring.
- Claims that a document is complete or legally enforceable.
- Automatic acceptance, cancellation, or modification of agreements.
- Automatic email or cloud-drive scanning.
- Uploading documents for analysis.
- Silent analytics containing text, filenames, or extracted terms.

## Rule-engine design

Each rule should be data-driven and independently testable.

Example conceptual rule:

- **Category:** renewal
- **Trigger patterns:** phrases indicating automatic or recurring renewal
- **Supporting patterns:** a duration or billing interval nearby
- **Exclusion patterns:** negation or explicit non-renewal language
- **Output:** candidate excerpt, matched signals, confidence class
- **Explanation:** human-readable reason for the match

Do not treat a keyword match as proof. Rules should return evidence and a status, not a legal conclusion.

## Quality requirements

- Every result must include a source span or explain why one is unavailable.
- Every rule must have positive, negative, and ambiguous test cases.
- “Not found” must never be presented as proof of absence.
- Analysis must work with networking disabled.
- Errors must not expose document contents in logs.
- Document text must not be included in crash reports.
- Deleting a saved analysis must remove its local records and associated file copies managed by the app.

## Suggested success metrics

- Share of test documents where the relevant passage is surfaced.
- Share of surfaced passages judged relevant by human reviewers.
- Rate of missed important passages in the supported categories.
- Text-extraction failure rate.
- User-reported corrections per category.
- Time from opening a document to finding a key term.

Do not optimize solely for the number of detected clauses. False confidence is worse than a clearly labeled “possible match.”
