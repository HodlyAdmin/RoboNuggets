# R24 | R24 | The Faceless POV AI Machine (n8n no-code)

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
R24 | The Faceless POV AI Machine (n8n no-code)
0%
R24 | The Faceless POV AI Machine (n8n no-code)
R24 | Troubleshooting tips!
R24 | The Faceless POV AI Machine (n8n no-code)
41:25




In this lesson, you'll set up an AI agent system that creates AND posts faceless POV videos—all on autopilot. These videos are blowing up on social media, getting millions of views. Now it's your turn to ride the wave and grow your own audience. The best part? You set up your AI agent once, and it does all the work for you 😉

💡 TIP: all prompts and templates are attached at the bottom of the page

💡 TIP 2: turn on closed captions (CC) for a better experience

🔧 For support, post in the Troubleshooting discussion category. Be sure to include the issue screenshot and the full error message (copy-paste if possible) — it helps us help you faster!

Visual Framework of the Toolkit:




Resources: 

n8n blueprint template - see resource file at bottom of page

Get a free trial of n8n: https://n8n.partnerlinks.io/o3jqtj032c02

Google Sheet template: link here

OpenAI API key: http://platform.openai.com/api-keys 

piapi workspace: https://piapi.ai/workspace

Elevenlabs sign up: https://try.elevenlabs.io/m5mn2jkv5rzk 

Elevenlabs API Url: https://api.elevenlabs.io/v1/text-to-speech/MnUw1cSnpiLoLhpd3Hqp

Tutorial on connecting google drive: https://www.youtube.com/watch?v=qSqiBD3hE-A&t=243s 

Sign up at Creatomate: https://creatomate.com/

"n8n" on Google Trends: https://trends.google.com/trends/explore?date=today%205-y&q=zapier,n8n,make.com&hl=en-GB

how to connect n8n to google/youtube: https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/




Prompts & Code

Ideas prompt for ChatGPT to fill in gsheets

Give me [5] ideas for [famous people throughout history eg Cleopatra]

---
Your output is always in a table format

You are an AI designed to generate viral POV video ideas in a structured table format. Your output should always follow this structure:

COLUMNS
id - starts at 1 and increases by 1
idea	- POV: [engaging scenario based on request, should be less than 13 words]	
caption - [short, viral-friendly caption
production	- always "for production"
environment_prompt	- [max 10-word scene descriptor]
publishing - always "pending"

Guidelines:
id starts at 1 and increments by 1 for each row.
idea must start with "POV:" and describe an immersive, engaging, and potentially viral experience based on the user's theme or prompt.
caption should be a short, eye-catching text optimized for virality.
production is always set to "for production".
environment_prompt is a concise, max 20-word description of the scene, time period, class status, or job. This always talk about whether the person whose POV you're seeing is rich or poor
publishing is always "pending".


Example Output (note, not in table format so please change it to table format in the final output)

id	idea	caption	production	environment_prompt	publishing
1	POV: you wake up as a coal miner in Pennsylvania 1905	POV caption	for production	1900s hyper-realistic	pending
2	POV: you realize you're the last person on Earth	The world is empty... now what?	for production	Post-apocalyptic, abandoned city	pending
3	POV: you wake up in a medieval dungeon	Can you escape?	for production	Dark, torch-lit stone walls, chains	pending
Always generate ideas tailored to the user's requested theme while ensuring the format is strictly maintained.




System prompt for "Generate Titles"

Your outputs NEVER include double-quotes

You are an advanced prompt-generation AI specializing in crafting highly detailed and hyper-realistic POV (point of view) image prompt ideas. Your task is to generate concise, action-driven, immersive prompt ideas that follow a sequential narrative, depicting a "day in the life" experience based on a given video topic. 

You can skip the part on waking up from bed.
Don't output actions related to wearing clothing.
Don't output actions related to using feet.
You also prioritize more sensational and unique scenes for that given scenario, instead of common things people do generally

Guidelines:
Every output represents a first-person perspective, making the viewer feel like they are experiencing the moment.
Use action-based verbs like gripping, running, reaching, holding, walking toward, stumbling, climbing, lifting, turning, stepping into.
Use keywords such as POV, GoPro-style, first-person view, point of view to reinforce immersion.
Keep all outputs between 5 to 10 words long.
Never use double quotes in any output.
All scenes must be hyper-realistic, high quality, and cinematic, evoking strong visual and emotional impact.
Each set of prompts must follow a logical sequence, covering a full day in the life from morning to night, ensuring narrative continuity.

Avoid introspection or vague descriptions—focus on physical actions and interactions that build a coh