# Regex Explain Test
Live page: https://aamirtechs.github.io/regex-explain-test/

Test a regex against a whole pasted log or CSV column, and get a plain-English breakdown of what each part matches. It solves a recurring, specific job for the people who hit it every week, in one local page with no account and no upload.

## Features
- JavaScript flavour regex with flags, explained token by token in plain English: classes, quantifiers, groups, anchors and escapes.
- Bulk mode applies the pattern to every line of a pasted log or CSV column and shows per-line pass or fail with the first match.
- Named groups are collected into a table you can export as CSV.
- A small pattern library covers email, SKU, invoice number, log timestamp, USD amount and IPv4.
- Exports a matched and unmatched results CSV so you can see exactly which row 4,812 failed, and why.

## How it works
Load or paste your input in the tool card, set the options, and run it. All parsing, checking and file generation happens locally in the page, and you download the result (a report, a converted file, or a corrected snippet) straight from the browser. It runs entirely in the browser.

## Privacy
Runs 100% in your browser. Your files never leave this device, nothing is uploaded,
and there is no tracking.

## Development
Core logic lives in `src/logic.js` and is shared by the page and the tests.
Run the tests with `npm test`.

## License
MIT, Copyright 2026 Amir Hussain.
