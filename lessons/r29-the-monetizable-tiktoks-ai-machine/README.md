# R29 | R29 | The Monetizable Tiktoks AI Machine

The RoboNuggets Community
99+
Community
Classroom
Calendar
Members
Map
Leaderboards
About
99+
R29 | The Monetizable Tiktoks AI Machine
0%
R29 | The Monetizable Tiktoks AI Machine
Prompts & Codes
Bonus Content
R29 | The Monetizable Tiktoks AI Machine
46:03




This AI system auto-generates one-minute, monetizable, faceless TikToks in your niche, using the open-source FFMPEG tool as an alternative to other costly services. Set it up once, and it vibeposts for you—building a brand that grows your following on autopilot 👨🏻‍✈️

💡 TIP: all prompts and templates are attached at the bottom of the page

💡 TIP 2: turn on closed captions (CC) for a better experience

🔧 For support, post in the Troubleshooting discussion category. Be sure to include the issue screenshot and the full error message (copy-paste if possible) — it helps us help you faster!




Visual Framework of What We'll Learn:







Resources: 

n8n

Get a free trial of n8n: https://n8n.partnerlinks.io/o3jqtj032c02

"n8n" on Google Trends: https://trends.google.com/trends/explore?date=today%205-y&q=zapier,n8n,make.com&hl=en-GB

INPUT section

openAI API key: https://platform.openai.com/api-keys

STEP 1: Generate Prompts

Google sheets template: link

STEP 2: Generate Images

Fal AI: https://fal.ai/ 

Menu of models: https://fal.ai/models

Billing page: https://fal.ai/dashboard/billing

Image models:

cheap but not as good: https://fal.ai/models/fal-ai/flux/schnell

good but not as cheap: https://fal.ai/models/fal-ai/flux-pro

STEP 3: Generate Videos

Video models:

cheap but not as good: https://fal.ai/models/fal-ai/kling-video/v1/standard/image-to-video

good but not as cheap: https://fal.ai/models/fal-ai/kling-video/v1.6/pro/image-to-video

STEP 4: Generate Sounds

Sound model: https://fal.ai/models/fal-ai/mmaudio-v2

OUTPUT section

FFMPEG model: https://fal.ai/models/fal-ai/ffmpeg-api/compose




Prompts & Code:

See the sub-pages at the right of this page!

Resources
R29 | Monetizable Faceless AI
7
iBoy Droid
May '25 • 
💬 Chat
R29 Changing Idea Guide
So I see most of you are asking how to change the ideas for #R29 | The Monetizable Tiktoks AI Machine so here you go: Only thing you need to do is go chat gpt and write this: I have this prompt for AI model that generates me quotes lets call it Idea Prompt #1. We need to repurpose this prompt to be for this (your topic) while keeping the structure same. Idea Prompt #1: Generate unique quotes based on these rules: 1. Do live research on the most popular quote today or this week on all social platforms. 2. Provide a quote that is trending all-time on social media platforms. 3. Give a meaningful quote that provokes deep thought. Also, perform live research for: - **4 most popular hashtags across all social media today.** - **4 all-time most popular hashtags.** - **4 relevant hashtags related to the quote.** ### IMPORTANT ### - **Retrieve the last used index from Google Sheets:** '{{ $json.latestIndex }}' - **Avoid using these past quotes from Google Sheets:** '{{ $json.combinedQuotes }}' - **If a quote is trending again, reword it slightly to make it unique.** ### TITLE FORMAT FIX ### - **Each Title must summarize the meaning of the quote and include an emoji matching the quote’s meaning.** - **Each Title must include exactly 12 hashtags formatted in this order:** - **4 hashtags relevant to the quote.** - **4 all-time most popular hashtags.** - **4 most trending hashtags today (live research).** ### OUTPUT FORMAT (ENSURE SINGLE-LINE JSON, EMOJIS, & LOWERCASE HASHTAGS) ### Return a **valid JSON array in a single line**, formatted exactly like this: ```json [ {"Index": {{ $json.latestIndex + 1 }}, "Title": "Title (emoji) #4_relevant_hashtags #4_all_time_popular_hashtags #4_trending_hashtags", "Quote": "Generated quote text", "Status": "for production"}, {"Index": {{ $json.latestIndex + 2 }}, "Title": "Title (emoji) #4_relevant_hashtags #4_all_time_popular_hashtags #4_trending_hashtags", "Quote": "Generated quote text", "Status": "for production"},
25
35
New comment Jul '25
8
Jay E
👑
🔥
May '25 • 
⭐ Announcements
🥚 R29 | The Monetizable Tiktoks AI Machine (n8n no-code ⚡)
Hi Robo fam! A new course just dropped over at the Classroom! 🙌🏻 This AI system auto-generates 𝗼𝗻𝗲-𝗺𝗶𝗻𝘂𝘁𝗲, 𝗺𝗼𝗻𝗲𝘁𝗶𝘇𝗮𝗯𝗹𝗲, 𝗳𝗮𝗰𝗲𝗹𝗲𝘀𝘀 𝗧𝗶𝗸𝗧𝗼𝗸𝘀 𝗶𝗻 𝘆𝗼𝘂𝗿 𝗻𝗶𝗰𝗵𝗲, using the open-source FFmpeg tool as an alternative to other costly services. Set it up once, and it 𝘃𝗶𝗯𝗲𝗽𝗼𝘀𝘁𝘀 for you - building a brand that grows your following on autopilot 👨🏻‍✈️ *** 🍳𝗚𝗲𝘁 𝘁𝗵𝗲 𝗥𝟮𝟵 𝗰𝗼𝘂𝗿𝘀𝗲 𝗮𝗻𝗱 𝗿𝗲𝘀𝗼𝘂𝗿𝗰𝗲𝘀 𝗵𝗲𝗿𝗲! 𝗔𝘀 𝗯𝗼𝗻𝘂𝘀 𝗰𝗼𝗻𝘁𝗲𝗻𝘁, I've also included: - a custom GPT that helps you ideate your niche and customize the prompts accordingly - a business case on how this type of content can be turned into profit - and even some tips and links on further learning especially around FFmpeg *** In this lesson, we're finally using the 𝗹𝗲𝗴𝗲𝗻𝗱𝗮𝗿𝘆 𝗙𝗙𝗺𝗽𝗲𝗴 𝘁𝗼𝗼𝗹! - 