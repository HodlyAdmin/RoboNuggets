# R30 | R30 | The Baby Podcasts AI Machine

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
R30 | The Baby Podcasts AI Machine
0%
R30 | The Baby Podcasts AI Machine
R30 | The Baby Podcasts AI Machine
34:20

In this lesson, you'll learn how to create the super cute 'Babyfied' videos that are blowing up on TikTok, all automated via n8n. You'll learn how to use Apify, the new Hedra AI model, and share tips on how to start monetizing as you grow your content business. These might be the cutest videos we’ve made so far—have fun! 👶🏻

💡 TIP: all prompts and templates are attached at the bottom of the page

💡 TIP 2: turn on closed captions (CC) for a better experience

🔧 For support, post in the Troubleshooting discussion category. Be sure to include the issue screenshot and the full error message (copy-paste if possible) — it helps us help you faster!




Visual Framework of What We'll Learn:







Resources: 

n8n

Get a free trial of n8n: https://n8n.partnerlinks.io/o3jqtj032c02

"n8n" on Google Trends: https://trends.google.com/trends/explore?date=today%205-y&q=zapier,n8n,make.com&hl=en-GB

Blueprints and templates are at the bottom of the page!

Part 1 - Original Vids Agent

Apify:  https://www.apify.com?fpr=sffv1

Apify tiktok scraper: https://console.apify.com/actors/GdWCkxBtKWOsKjdch/input

JSON format for tiktok scraper

{
    "excludePinnedPosts": true,
    "oldestPostDateUnified": "30 days",
    "profileScrapeSections": [
        "videos"
    ],
    "profileSorting": "latest",
    "profiles": [
        "neildegrassetyson"
    ],
    "proxyCountryCode": "None",
    "resultsPerPage": 100,
    "shouldDownloadAvatars": false,
    "shouldDownloadCovers": false,
    "shouldDownloadMusicCovers": false,
    "shouldDownloadSlideshowImages": false,
    "shouldDownloadSubtitles": false,
    "shouldDownloadVideos": false
}

Google sheet template: link

Excel formula for id : =ROW()-1

Excel formula for image_url: =Sheet2!C2

Baby images:

Upload here: https://freeimage.host/

Prompt

Create a photo-realistic, vertical 9:16 portrait of a baby version of this person. Keep their facial structure and profile recognizable. Make it cute and stylized like a toddler. Show them seated at a podcast studio desk with a professional microphone in front of them, with studio lighting, to clearly emphasize the podcast setting.




Part 2 - Babyfied Vids Agent

Create audio container

URL: https://api.hedra.com/web-app/public/assets

Get API key for Hedra: https://www.hedra.com/api-profile

{
  "name": "audio-file",
  "type": "audio"
}

Upload audio

URL: https://api.hedra.com/web-app/public/assets/{{ $json.id }}/upload

Create image container

{
  "name": "image-file",
  "type": "image"
}

Create video

URL: https://api.hedra.com/web-app/public/generations

JSON request

{
  "type": "video",
  "ai_model_id": "d1dd37a3-e39a-4854-a298-6510289f9cf2",
  "start_keyframe_id": "{{ $('Create image container').item.json.id }}",
  "audio_id": "{{ $('Create audio container').item.json.id }}",
  "generated_video_inputs": {
    "text_prompt": "A baby podcast host sitting in front of a microphone, speaking with calm intensity and natural focus. Expressive facial reactions, animated head movements, and strong eye contact with the camera. A professional podcast studio setup with polished lighting in the background",
    "resolution": "720p",
    "aspect_ratio": "9:16"
  }
}

Get Video

URL: https://api.hedra.com/web-app/public/generations/{{ $json.id }}/status




Resources
R30 | Part 1 - Original Vids Agent
R30 | Part 2 - Babyfied Vids Agent

R30 | The Baby Podcasts AI Machine - R30 | The Baby Podcasts AI Machine · The RoboNuggets Community