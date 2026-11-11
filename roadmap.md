# Fine-Print Translator — Roadmap

## Phase 0: Define the boundary

**Goal:** Decide what the product can responsibly claim.

Tasks:
- Choose the first platform: local-first web app or desktop app.
- Define supported file types and maximum file size.
- Select the initial document type: consumer subscription terms.
- Write the status definitions: found, possible match, not found, could not analyze.
- Create sample documents covering clear, ambiguous, contradictory, and absent terms.
- Decide what data is stored locally and how users delete it.

**Exit criteria:**
- A written scope and non-goals document.
- A test set with manually annotated passages.
- A privacy/data-flow diagram showing no document upload.

## Phase 1: Clickable prototype

**Goal:** Validate the user experience before building the parser.

Tasks:
- Design import, progress, results, evidence, and delete screens.
- Prototype five categories: trial, renewal, price, cancellation, refund.
- Test with people unfamiliar with the product.
- Check whether users understand that a detected phrase is not legal advice.
- Check whether “not found” is understood as “not detected,” not “does not exist.”

**Exit criteria:**
- Users can locate the evidence behind a result.
- Users understand uncertainty labels.
- The main flow does not imply that the app has verified legal meaning.

## Phase 2: Local text MVP

**Goal:** Analyze pasted text and text-based PDFs without a network connection.

Tasks:
- Implement text input and local PDF text extraction.
- Preserve page numbers and source offsets where possible.
- Implement section splitting.
- Build the rule engine and five initial categories.
- Build evidence-linked results.
- Add rule versioning and automated tests.
- Add export and delete controls.

**Exit criteria:**
- Core analysis works with networking disabled.
- Every result links to its supporting passage.
- Rule tests cover positive, negative, and ambiguous examples.
- No document content appears in logs or telemetry.

## Phase 3: Private pilot

**Goal:** Measure accuracy and discover failure modes.

Tasks:
- Recruit a small, diverse group of testers.
- Test documents from several subscription providers and layouts.
- Compare results with human-annotated passages.
- Record errors by category: missed match, irrelevant match, wrong extraction, extraction failure.
- Improve rules only when the change passes regression tests.
- Add a clear “report a missed clause” workflow that does not transmit the document by default.

**Exit criteria:**
- Each supported category has measured precision and recall on the test set.
- Major known failure modes are documented.
- The interface communicates limitations clearly.

## Phase 4: OCR and usability improvements

**Goal:** Support scanned documents while retaining offline operation.

Tasks:
- Add optional on-device OCR.
- Indicate which text came from OCR.
- Preserve page references and flag OCR uncertainty.
- Test on scans with different quality and layouts.
- Improve keyboard access, screen-reader output, and large-text behavior.

**Exit criteria:**
- OCR works offline on supported devices.
- OCR-derived results are visibly distinguishable.
- OCR errors do not silently appear as certain extracted facts.

## Phase 5: Controlled expansion

**Goal:** Add coverage without reducing trust.

Possible additions:
- Data-use and sharing clauses.
- Dispute-resolution and governing-law clauses.
- More document formats.
- Confirmed deadline reminders.
- Local search across saved documents.

For each category:
1. Define what the rule is allowed to claim.
2. Gather representative test documents.
3. Annotate examples.
4. Build and test rules.
5. Pilot the category separately.
6. Release only with evidence and uncertainty labels.

## Release gates

Do not release a new rule category unless:
- It has a documented purpose and limitations.
- It has positive, negative, and ambiguous tests.
- Results include evidence.
- It does not turn absence of a match into a claim of absence.
- It works without sending document content off-device.
