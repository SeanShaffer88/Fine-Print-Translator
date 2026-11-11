# Fine-Print Translator — User Workflow

## Product principles

1. **Offline by default:** document contents are processed and stored on the user's device.
2. **Evidence before interpretation:** every detected term links to the exact source passage and page.
3. **Uncertainty is visible:** the app distinguishes “found,” “possible,” “not found,” and “could not analyze.”
4. **No legal conclusions:** the app identifies language; it does not decide what a clause legally means.
5. **User remains in control:** nothing is uploaded, shared, or automatically acted on.

## Primary workflow: analyze a document

### 1. Open the app

The user lands on a screen with:
- “Choose a document”
- “Paste text”
- A brief statement: “Documents are analyzed on this device.”

No account is required.

### 2. Select a document

Accept the supported formats listed in the app, initially PDF and plain text.

Before processing:
- Validate file type and size.
- Explain if the file appears to be scanned or image-only.
- Offer local OCR if available, or explain how to use a text-based copy.
- Do not send the document to a server.

### 3. Analyze locally

Show progress stages:
1. Reading document
2. Splitting into sections
3. Checking for key terms
4. Preparing results

Allow cancellation at any point. If analysis fails, preserve the original file only if the user has chosen to save it.

### 4. Review the summary

Show a results page with one card per category:

- Trial and conversion
- Renewal
- Price and fees
- Cancellation
- Refunds
- Data use
- Disputes

Each card has one of these statuses:
- **Found:** a rule identified a relevant passage.
- **Possible match:** language may be relevant, but the rule is uncertain.
- **Not found:** no supported match was detected.
- **Could not analyze:** text extraction failed or the document was incomplete.

Never display “not found” as “the document has no such term.”

### 5. Inspect evidence

Selecting a card opens:
- The exact matching excerpt
- Page number, when available
- The extracted value, if any
- A short explanation of the matching rule
- A link to the full section in the document

Example:

> **Possible renewal term**  
> “Your subscription will automatically renew for successive periods of one month…”  
> Detected: recurring renewal language and a one-month period.  
> Review the complete section; exceptions may appear elsewhere.

### 6. Correct or annotate

The user may:
- Mark a result useful or incorrect
- Add a personal note
- Edit an extracted date or amount
- Hide a result

Corrections are local by default. They do not silently alter the shared rule set.

### 7. Save, export, or delete

Offer:
- Save analysis on this device
- Export a report as a local file
- Delete the document and analysis

Clearly distinguish deleting an analysis from deleting a downloaded source file if the app does not manage both.

## Returning-user workflow

The home screen lists saved analyses only if the user enabled local saving. Each entry shows document name, analysis date, and detected deadlines. The user can open, export, or permanently delete it.

## Error workflows

### Scanned or image-only document
Explain that text could not be extracted. Offer on-device OCR where supported. If OCR is unavailable, let the user paste text manually.

### Unsupported or encrypted document
Explain the issue in plain language and offer a supported alternative. Do not attempt to bypass document protections.

### No matches
Say: “No supported terms were detected. This does not mean the document contains none.” Offer text extraction status and a way to inspect the document.

### Conflicting matches
Show both passages and label the result “Review needed.” Never select one as authoritative without a deterministic, documented rule.

## Future workflow: deadline reminders

Only add reminders after the user confirms a detected date. Show the source passage and ask the user to choose a reminder date. Reminders stay local unless the user explicitly enables an external calendar integration.
