# R28 | R28 | The Longform YouTube Creator AI Agent

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
R28 | The Longform YouTube Creator AI Agent
0%
R28 | The Longform YouTube Creator AI Agent
Appendix A: Customizable Template for JSON2Video
Appendix B: 50 Niche Ideas for YouTube
Appendix C: Troubleshooting Tips!
R28 | The Longform YouTube Creator AI Agent
34:21

This tutorial teaches you how to use AI to create 𝗹𝗼𝗻𝗴-𝗳𝗼𝗿𝗺 𝗬𝗼𝘂𝗧𝘂𝗯𝗲 𝘃𝗶𝗱𝗲𝗼𝘀 𝗼𝗻 𝗮𝘂𝘁𝗼𝗽𝗶𝗹𝗼𝘁. It handles the ideas, visuals, editing, music - all of it! Set it up once—and it keeps your channel active, surprising you with new videos 👏🏻 every 👏🏻 single 👏🏻 day

💡 TIP: all prompts and templates are attached at the bottom of the page

💡 TIP 2: turn on closed captions (CC) for a better experience

🔧 For support, post in the Troubleshooting discussion category. Be sure to include the issue screenshot and the full error message (copy-paste if possible) — it helps us help you faster!




Visual Framework of What We'll Learn:







Resources: 

Ideas Agency

Gsheets template - link

ChatGPT prompt - see below

Creator Agency

n8n blueprint - see file at the bottom of the page

Get a free trial of n8n: https://n8n.partnerlinks.io/o3jqtj032c02

"n8n" on Google Trends: https://trends.google.com/trends/explore?date=today%205-y&q=zapier,n8n,make.com&hl=en-GB

openAI API key: https://platform.openai.com/api-keys

Generate your music via: https://suno.com/

Json2Video: https://json2video.com/?afco=robonuggets

To get 50% off on JSON2Video on the first month, check out our Discounts Page

ElevenLabs: https://try.elevenlabs.io/m5mn2jkv5rzk 

voice we're using: https://elevenlabs.io/app/voice-lab?voiceId=AeRdCCKzvd23BpJoofzx

Tutorial on connecting YouTube to n8n: https://www.youtube.com/watch?v=qSqiBD3hE-A&t=243s 

n8n documentation on connecting to google/youtube: https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/




Prompts & Code:

Ideas Agent Prompt

USER INPUTS (replace placeholders): 
• TOPIC: [Stoicism as taught through animal analogies] → Main theme for the content (e.g. stoicism, motivation, gym training)  
• COUNT: [5] → Number of ideas to generate  
• CHANNEL KEYWORDS: [Stoicism, Lessons on life, analogies for animals] → Keywords for the channel's topic  

________________________________________ 

Generate a table with the following exact columns, in this order:  
id 
idea 
caption 
channel_style_prompt 
character_style_prompt 
production_status 
final_output 
publishing_status 
error_log 
________________________________________ 
COLUMN RULES: 
• id → Start from 1, increment by 1 
• idea → A short YouTube title, 7–10 words max, matching the [TOPIC]. Each idea is unique 
• caption → caption for youtube. have one line talking about the video, one line talking about the channel, one line as a call to action for user to subscribe. end with 3 topic-relevant hashtags 
• channel_style_prompt → Expound on CHANNEL KEYWORDS and give around 5 to 10 words 
• character_style_prompt → A unique, detailed visual character that matches the idea and topic (no repeats) 
• production_status → should always be "for production" 
• final_output → Leave blank 
• publishing_status → should always be "pending"  
• error_log → Leave blank 


Do not include double-quotes in your output




Prompts Generator - Text

Video Title: {{ $json.idea }}
Video Description: {{ $json.caption }}




Prompts Generator - System Prompt

ROLE:
You are an expert prompt engineer. Your task is to create sequential voiceover and image prompts for a flowing video. These must follow the narrative arc of a short video:

Intro (Scene 1–3)
Build-up (Scene 4–6)
Conclusion (Scene 7–10)

The user will provide you the title and description of the video they are making.

***

TASK:
Return a JSON array of 10 objects with the following format:


***

voiceText OUTPUT
voiceText: a 2-sentence voiceover. Each voiceText needs to be 11 to 15 words strictly. It must connect with the previous scene and help the story flow. These voiceTexts need to adhere to the channel's niche, topic and style which is provided below:


style and topic
{{ $json.channel_style_prompt }}

Each voiceText is delicately and intellectually crafted, but is not difficult to understand. 
You use metaphors and analogies using the main character below when it's relevant.


***

image_prompt OUTPUT
image_prompt: A vivid, cinematic, and highly descriptive visual prompt. The prompt should describe the environment, subject, lighting, mood, and composition in detail. It also describes the foreground and background. At the end of each image prompt, it must also explicity include the Style below verbatim. When you need to include a character in the prompt, use the main character description below. The image prompts are at least 700 characters in length. You over-describe the details especially that of the background of every character

Main Character Description: {{ $json.character_style_prompt 