# Test corpus (Phase 0)

Small, hand-annotated documents used to check that rules surface the right passages and
do not overclaim.

All documents are **synthetic**. The providers are fictional and the wording was written
for this project, so there are no copyright or privacy concerns. They are short and tidy,
and do not represent the length, layout, or drafting style of real terms. Real provider
documents are a Phase 3 task.

## Documents

| File | Covers | Expected outcome |
|---|---|---|
| `01-clear.txt` | Explicit wording in all five categories | Found ×5 |
| `02-ambiguous.txt` | Vague wording without values | Possible match ×5 |
| `03-contradictory.txt` | Two differing passages per category | Found + Review needed ×4; trial Not found |
| `04-absent.txt` | No subscription terms; keyword distractors | Not found ×5 |
| `05-negated.txt` | Terms stated as not applying | Found ×4 (three negated); cancellation Possible match |

"Could not analyze" has no sample here. It needs PDF fixtures (image-only, encrypted,
empty) and is planned for Phase 2.

## Annotation format

One JSON file per document in `annotations/`:

```json
{
  "document": "01-clear.txt",
  "categories": {
    "renewal": {
      "expected_status": "found",
      "review_needed": false,
      "passages": [
        { "quote": "...", "start": 255, "end": 351, "polarity": "affirmed", "note": "..." }
      ]
    }
  },
  "distractors": [{ "quote": "...", "category": "renewal", "note": "..." }]
}
```

- `expected_status`: `found`, `possible`, or `not_found` (see `docs/status-definitions.md`).
- `start` / `end`: character offsets into the document, end-exclusive (JavaScript string indices).
- `polarity`: `negated` when the passage says the term does not apply.
- `distractors`: wording that contains a keyword but is not a subscription term.

A rule's evidence span counts as correct if it overlaps the annotated passage; exact
boundaries are not required.

## Checking annotations

```
node tools/check-corpus.mjs          # verify quotes, offsets, and schema
node tools/check-corpus.mjs --write  # recompute offsets after editing a quote or document
```

No dependencies are needed. The script prints file names and positions only, never document text.

## Limitations

- Annotations are a first draft by one annotator and have not been independently reviewed.
- Expected statuses for vague wording are judgement calls.
- Five documents are enough to start writing rules, not to measure precision or recall.
