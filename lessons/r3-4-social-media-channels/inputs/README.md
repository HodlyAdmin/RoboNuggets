# R3 Inputs

Supported local dataset formats:

- `.json` array of objects
- `.csv`
- `.tsv`

Recommended fields:

- `index`
- `news link`
- `my notes`
- `article title`
- `article text`
- `short url`
- `status`

If `article text` is omitted, the module will try to open the article URL in the dedicated Chrome session and capture the visible page text.
