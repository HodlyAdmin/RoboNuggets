# Source: Skool lesson `Set up instructions & n8n template packs (R45)`

Lesson page:
- `https://www.skool.com/robonuggets/classroom/e3a5624c?md=f4cc926441bf4ac39bbb35ddd1ecb1f3`

Original lesson stack called out on the page:
- `n8n`
- `OpenAI API key`
- `Kie AI API`
- `Suno directly at Kie`
- `FFMPEG API`
- Google Sheets logging

Original attached resources preserved locally:
- n8n template JSON: [R45 _ Auto Music Creator (by RoboNuggets).json](/Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r45-auto-music-creator/assets/original/R45%20_%20Auto%20Music%20Creator%20(by%20RoboNuggets).json)
- sample image: [1761859830280q6p3oj3t.png](/Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r45-auto-music-creator/assets/original/1761859830280q6p3oj3t.png)

Important workflow facts from the original template:
- Input fields: `Theme`, `Describe the music`, `How many songs?`, `Should the songs be instrumental?`
- Image input: separate uploaded landscape image
- Prompt generation: OpenAI `gpt-4.1` via a structured-output agent
- Music generation: `https://api.kie.ai/api/v1/generate` with Suno model `V5`
- Polling: wait 15 minutes, then poll `generate/record-info`
- Song logging: append titles, durations, and URLs to Google Sheets
- Video assembly: upload image/audio to FFMPEG API and render a `1280:720` looping still-image video
- Final logging: append final video URL to Google Sheets
- Optional YouTube upload existed in the template but was disabled

Project adaptation stance:
- We intentionally replace Kie-hosted Suno and FFMPEG API with local wrappers/local ffmpeg for cost leverage.
- We intentionally replace Google Sheets with local `manifest.json`.
- We preserve the lesson outcome and core workflow shape where possible.
- See [FIDELITY.md](/Users/ryanpotteiger/Documents/AntiGravity/RoboNuggets/lessons/r45-auto-music-creator/FIDELITY.md) for the running source-vs-rebuild audit.
