# R2 Troubleshooting Notes

These notes were pulled from the separate `Troubleshooting tips!` module in the same Skool course.

## Google Sheets

- Point both Google Sheets modules to your own copy of the sheet template, not the instructor-owned sheet.
- If you see `Missing value of required parameter "rowNumber"`, either the sheet is out of `Not Posted` rows or the status text no longer matches `Not Posted` exactly.

## ElevenLabs

- Change the voice in the ElevenLabs module. The original template points to the instructor's cloned voice.
- If ElevenLabs reports unusual activity, the lesson notes say paid credits may now be required on the account.

## JSON2Video

- If creating a new movie template says `forbidden`, log out and back in.
- If `Store Video - Missing value of required parameter 'url'`, change the API key header name from `X-Api-key` to `x-api-key` in both JSON2Video HTTP modules.
- If JSON2Video says `src property is empty`, double-check the `src` value inside the request JSON and verify that the Dropbox audio link works in an incognito window.

## YouTube

- The original template hardcodes the YouTube description as `Test JSON description`.
- The lesson recommends mapping the description dynamically, usually back to the quote title.
