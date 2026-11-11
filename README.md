# Fine-Print Translator

A local-first document reader that helps people find common terms in subscription agreements.

It uses text extraction and transparent, deterministic rules—not generative AI. The app points to the passages it matched so users can inspect the original wording.

## Status

Early product blueprint. Implementation details and supported formats are to be confirmed during development.

## What it aims to detect

The first version focuses on:
- Trial conversion
- Renewal language and billing frequency
- Price and fees
- Cancellation instructions and notice periods
- Refund terms

A result is a pointer to wording, not a legal conclusion.

## Core principles

- Documents are analyzed on the user's device.
- No document upload or remote AI analysis.
- Results include source passages whenever possible.
- Uncertainty is clearly labeled.
- “Not found” means the app did not detect a supported pattern; it does not prove the term is absent.
- Users can inspect, correct, export, and delete their results.

## Proposed technology direction

A local-first application with:
- A browser or desktop interface
- Local document text extraction
- A deterministic rules engine
- Local storage for user-approved saved analyses
- Optional on-device OCR in a later release

The exact platform and libraries should be selected after testing offline support, accessibility, document handling, and maintainability.

## User flow

1. Open a document or paste text.
2. Analyze it locally.
3. Review categorized candidate terms.
4. Open the cited passage in context.
5. Correct, annotate, save, export, or delete the analysis.

## Development status

- [ ] Product scope and test corpus
- [ ] UX prototype
- [ ] Text input and local extraction
- [ ] Initial deterministic rules
- [ ] Evidence-linked results
- [ ] Offline and data-flow verification
- [ ] Private pilot
- [ ] Optional on-device OCR

See `workflow.md`, `features.md`, and `roadmap.md` for the product workflow, requirements, and staged plan.

Phase 0 drafts (awaiting review): `docs/scope.md`, `docs/status-definitions.md`, `docs/data-flow.md`, and the annotated samples in `test-corpus/`.

## Trust and limitations

This tool is for document navigation and plain-language assistance. It does not determine whether a clause is enforceable, provide legal advice, or guarantee that a document has been fully analyzed. Always review the source text, especially before making a financial or legal decision.

## Contribution principles

- Keep analysis offline.
- Do not add telemetry containing document text, filenames, or extracted terms.
- Make rules understandable and testable.
- Include positive, negative, and ambiguous examples for every rule.
- Preserve evidence links for every detected result.
- Prefer “uncertain” over an unsupported confident claim.
