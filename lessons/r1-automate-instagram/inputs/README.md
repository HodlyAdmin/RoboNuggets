Place local dataset files here.

Supported formats:

- `.json`: either an array of records or an object with a `records` array
- `.csv`
- `.tsv`

Recognized columns:

- `Index`
- `Title`
- `Quote`
- `Instagram Caption` or `Instagram Caption Summary`
- `Status`
- `Image Path` (optional)

The lesson blueprint maps these fields to the original Make scenario:

- `Index` -> daily counter match
- `Title` -> local metadata only
- `Quote` -> card body text
- `Instagram Caption Summary` -> published caption
- `Image Path` -> optional local replacement for the old Dropbox image
