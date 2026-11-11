# Status definitions (Phase 0)

Status: **accepted** (2026-11-11), including the negation rule and "Review needed" as a flag.

Each category card shows exactly one status. Statuses describe what the rules detected,
never what the document legally means.

## Category statuses

| Status | Meaning | Shown to user as | Evidence |
|---|---|---|---|
| **Found** | A rule's trigger and its supporting signals matched a passage, with no exclusion pattern. | "Found: a rule matched this passage." | Required: source span, page if available |
| **Possible match** | A trigger matched but supporting signals are missing, vague, or far away. | "Possible match: this wording may be relevant." | Required |
| **Not found** | No rule in this category matched the extracted text. | "No supported pattern was detected. This does not mean the document contains none." | None; show extraction status instead |
| **Could not analyze** | Text was missing, unreadable, or incomplete, so rules could not run reliably. | "Could not analyze: text could not be read from this document." | None; show the reason |

## Review needed (flag)

"Review needed" is a flag added to **Found** or **Possible match**, not a fifth status.
It is set when:

- two or more matched passages in one category yield different candidate values
  (for example, "monthly" in one section and "annual" in another), or
- a matched passage is qualified by nearby wording the rule cannot resolve.

When set, all conflicting passages are shown in document order. None is marked as
authoritative.

## Rules of use

1. **Not found is not absence.** The wording above is mandatory wherever "Not found" appears, including exports.
2. **Could not analyze beats Not found.** If extraction failed or was partial, categories without matches show "Could not analyze", never "Not found".
3. **Prefer the weaker claim.** If a rule cannot distinguish Found from Possible match, it reports Possible match.
4. **Extracted values are candidates.** Amounts, dates, and periods are labelled "Candidate" and are editable.
5. **Negated terms are still findings.** A passage such as "does not renew automatically" is relevant to the Renewal category. It is reported with its evidence, and the explanation must say the wording is negated. It must never be summarised as automatic renewal.
6. **Status is never colour-only.** Each status has a text label and a distinct icon.

## Mapping to the test corpus

Annotations in `test-corpus/annotations/` use:

| Field | Values |
|---|---|
| `expected_status` | `found`, `possible`, `not_found` |
| `review_needed` | `true` / `false` |
| `passages[].polarity` | `affirmed`, `negated` |

`could_not_analyze` is a document-level outcome of extraction. It will be covered by PDF
fixtures (image-only, encrypted, empty) in Phase 2 and has no plain-text sample here.
