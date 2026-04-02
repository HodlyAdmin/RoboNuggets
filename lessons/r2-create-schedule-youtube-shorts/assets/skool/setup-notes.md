# R2 | Create & Schedule 100 YouTube Shorts

Course URL:
https://www.skool.com/robonuggets/classroom/3e13f00c?md=dee64cf94ebe449395d2892657721fdb

Video:
https://www.youtube.com/watch?v=jZkpuDWRe7k

Summary:
This tutorial shows how to create YouTube Shorts from quote records using ChatGPT, Make.com, ElevenLabs, Dropbox, JSON2Video, and a YouTube upload step.

Original lesson notes:

- Register for Make.com if you want to inspect the original hosted workflow:
  https://www.make.com/en/register?pc=robonuggets
- Transcript helper mentioned in the lesson:
  https://tactiq.io/tools/youtube-transcript
- JSON2Video signup link from the lesson:
  https://json2video.com/?afco=robonuggets
- ElevenLabs signup link from the lesson:
  https://try.elevenlabs.io/m5mn2jkv5rzk
- Google Sheets templates referenced in the lesson:
  https://docs.google.com/spreadsheets/d/1Jq5e1kdReDNjtzecMNfrgIB5DowzKAuaoF6wiVHXQ_g/edit?usp=sharing
  https://docs.google.com/spreadsheets/d/1vE2rScRhAIZCyJxxgvf1iHIqkYkXH8Dlw35gPULrXWs/edit?usp=drive_link

Prompt from the lesson:

> Get the most viral quotes from this transcript and show in a table format.
>
> Column 1 is index starting from 1
> Column 2 is a short and punchy Title
> Column 3 is the quote.
>
> Make it 2-3 sentences per quote
>
> Give 20 quotes

Blueprint summary:

1. Pull the next `Not Posted` row from Google Sheets.
2. Turn the quote text into speech with ElevenLabs.
3. Upload the audio to Dropbox and create a public download URL.
4. Send the background video template plus audio URL to JSON2Video.
5. Wait, fetch the rendered movie URL, then download the video file.
6. Route the finished short to YouTube, with an optional disabled Instagram Reel branch.

Local rebuild note:

- The local module keeps the same content flow but swaps the hosted runtime pieces for local equivalents.
- Google Sheets becomes a local dataset or Gemini transcript extraction step.
- ElevenLabs becomes a provider interface, with macOS `say` as the no-credential default.
- JSON2Video becomes a local ffmpeg renderer using the downloaded sample background video.
- Social publishing is standardized on Blotato instead of wiring platform-specific upload modules directly into the lesson runtime.
