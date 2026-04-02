# R3 | 4 Social Media Channels, 1 AI Agent

Course URL:
https://www.skool.com/robonuggets/classroom/13ac6451

Video:
https://www.youtube.com/watch?v=-wp5NFCNpZ4

Summary:
This tutorial shows how to take one news article and generate content for four social media channels at once.

Original lesson notes:

- Register for Make.com if you want to inspect the original hosted workflow:
  https://www.make.com/en/register?pc=robonuggets
- Perplexity API settings page referenced in the lesson:
  https://www.perplexity.ai/settings/api
- Twitter/X Make setup instructions referenced in the lesson:
  https://www.make.com/en/help/app/twitter
- Google Sheets template referenced in the lesson:
  https://docs.google.com/spreadsheets/d/1sSnBxvstUfB8uMwUEebHzm4zdcLBR4X7BeGO4_2IgCg/edit?usp=sharing

Important note from the lesson:

- Make discontinued their X/Twitter integration, so the original X module in the hosted automation is no longer usable there.
- In this repo, social publishing is standardized behind Blotato instead of relying on the old Make platform modules.

Blueprint summary:

1. Watch a Google Sheet row containing a news article link and personal notes.
2. Shorten the article link with Bitly.
3. Ask Perplexity to summarize the article while incorporating the notes.
4. Route the result into four platform-specific branches:
   - X/Twitter text
   - LinkedIn post
   - Facebook post
   - Instagram caption plus generated image

Local rebuild note:

- The local module keeps the same one-article-to-many-posts shape, but replaces the hosted APIs with local seams.
- Article context can come from local text or from browser-fetched page content.
- Content generation runs through Gemini in the logged-in Chrome session.
- Publishing is routed to Blotato or a local queue instead of the original Make social modules.
