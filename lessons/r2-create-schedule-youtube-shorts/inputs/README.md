# R2 Inputs

Supported local dataset formats:

- `.json` array of objects
- `.csv`
- `.tsv`

Recommended fields:

- `index`
- `title`
- `quote`
- `description`
- `status`
- `tags`

If you want Gemini to extract quotes from a transcript instead, set:

- `datasetProvider` to `gemini-transcript`
- `transcriptPath` to a local `.txt` file
