# Privacy and data flow (Phase 0)

Document contents never leave the device. There is no application server.

```mermaid
flowchart TD
    subgraph Device["User's device (browser tab)"]
        U[User] -->|chooses file or pastes text| IN[Input validation<br/>type, size, encryption]
        IN --> EX[Local text extraction<br/>pages and offsets]
        EX --> SP[Section splitting]
        SP --> RE[Rule engine<br/>versioned, deterministic]
        RE --> RS[Results<br/>status + evidence spans]
        RS --> UI[Results and evidence view]
        UI --> U

        UI -. only if user enables saving .-> DB[(Local storage<br/>IndexedDB)]
        DB -. open saved analysis .-> UI
        UI -->|user deletes| DEL[Delete record, text,<br/>notes, managed file copy]
        DEL --> DB
        UI -->|user exports| FILE[Report file saved<br/>by the user locally]
    end

    subgraph Network["Network"]
        HOST[Static file host<br/>app code only]
    end

    HOST -->|HTML, JS, CSS on first load| Device
    Device -. "no document text, filenames,<br/>extracted values, or telemetry" .-x HOST
```

## What crosses the device boundary

| Direction | Data | When |
|---|---|---|
| Inbound | App code (HTML, JS, CSS, bundled libraries) | First load and updates |
| Outbound | Ordinary request for app code (as with any website) | First load and updates |
| Outbound | Document text, filenames, extracted values, notes | **Never** |
| Outbound | Analytics, crash reports | **Never** in the MVP |

## Where data lives

| Data | Location | Lifetime |
|---|---|---|
| Opened document, extracted text, results | Memory | Until the tab closes or the user discards it |
| Saved analyses (opt-in) | IndexedDB in the user's browser profile | Until the user deletes them or clears site data |
| Exported report | Wherever the user saves it | Outside the app's control |
| Original source file | Wherever the user keeps it | Outside the app's control |

## How this will be enforced and checked (Phase 2)

- Content-Security-Policy with `connect-src 'none'`; no third-party origins.
- All dependencies bundled; no runtime fetches.
- Automated test: full analysis completes with networking disabled.
- Automated test: no document text appears in console output or error messages.
- Deletion test: after "Delete analysis", no record, text, or file copy remains in storage.

These are planned controls. None is implemented or verified yet.
