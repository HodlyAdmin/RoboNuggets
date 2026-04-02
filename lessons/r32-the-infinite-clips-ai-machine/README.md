# R32 | R32 | The Infinite Clips AI Machine

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
R32 | The Infinite Clips AI Machine
0%
R32 | The Infinite Clips AI Machine
R32 | The Infinite Clips AI Machine
36:32




In this lesson I teach you how to set up an AI System that clips shorts from any longform video, and posts it to the social channels that matter to you - all on autopilot. 

This one was co-created with one of our top members: Xavi D! Check out more of his work here: http://xavidigi.com/



💡 TIP: all prompts and templates are attached at the bottom of the page

💡 TIP 2: turn on closed captions (CC) for a better experience

🔧 For support, post in the Troubleshooting discussion category. Be sure to include the issue screenshot and the full error message (copy-paste if possible) — it helps us help you faster!




Visual Framework of What We'll Learn:




Resources: 

n8n

Get a free trial of n8n: https://n8n.partnerlinks.io/o3jqtj032c02

"n8n" on Google Trends: https://trends.google.com/trends/explore?date=today%205-y&q=zapier,n8n,make.com&hl=en-GB

Blueprints and templates are at the bottom of the page!

Step 1 -  Get Longfrorm

Google sheet template: link

Step 2 - Analyze Longform

Analyze Longform URL: https://api.klap.app/v2/tasks/video-to-shorts

Sign up at Klap: https://klap.app/?via=robo

Klap API pricing: https://docs.klap.app/pricing

Analyze Longform Json request

{
  "source_video_url": "{{ $json.longform_links }}",

  "language": "en",
  "target_clip_count": 2,
  "max_clip_count": 2,


  "editing_options": {
    "captions": true,
    "reframe": true,
    "emojis": true,
    "remove_silences": true,
    "intro_title": false
  },


  "dimensions": {
    "width": 1080,
    "height": 1920
  },


  "min_duration": 15,
  "max_duration": 60,
  "target_duration": 30
}

Get Status url: https://api.klap.app/v2/tasks/{{ $json.id }}

Get Shorts Details url: https://api.klap.app/v2/projects/{{ $json.output_id }}

Step 3 - Produce Shorts

Export Shorts url: https://api.klap.app/v2/projects/{{ $json.folder_id }}/{{ $json.id }}/exports

JSON for Export Shorts

{
  "preset_id": "123"
}

Get Shorts url: https://api.klap.app/v2/projects/{{ $json.folder_id }}/{{ $json.id }}/exports/{{ $json.id }}

date_published: {{ new Date().toISOString().split('T')[0] }}

Step 4 - Publish Shorts

Blotato sign up: https://blotato.com/?ref=robonuggets

Remember to use our discount code at Blotato checkout for 30% off for life!

Resources
R32 | Infinite Clips AI Machine
7
iBoy Droid
Jun '25 • 
🍳 Tips & News
R32 Merge Node Necessary
Hey guys this is for R32 but practically you can use it for any R that uses loop logic or in case something fails logic here is photos how to set it up. Basically from whichever you node you need to ger back from always use merge node before it goes back into the node that needs to return to.
14
9
New comment Dec '25

R32 | The Infinite Clips AI Machine - R32 | The Infinite Clips AI Machine · The RoboNuggets Community