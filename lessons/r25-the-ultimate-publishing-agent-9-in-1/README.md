# R25 | R25 | The Ultimate Publishing Agent (9-in-1!)

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
R25 | The Ultimate Publishing Agent (9-in-1!)
0%
R25 | The Ultimate Publishing Agent (9-in-1!)
R25 | The Ultimate Publishing Agent (9-in-1!)
29:48

ℹ️ IMPORTANT: Blotato now has n8n nodes which make it so much easier to use. Check the tutorial here for the latest template.

In this lesson, you'll learn how to set up the best publishing agent available right now - as it seamlessly integrates with not 2, not 3, but 9 Social Media Platforms - all in one system 😉

💡 TIP: all prompts and templates are attached at the bottom of the page

💡 TIP 2: turn on closed captions (CC) for a better experience

🔧 For support, post in the Troubleshooting discussion category. Be sure to include the issue screenshot and the full error message (copy-paste if possible) — it helps us help you faster!




Visual Framework of the Workflow:




Resources: 

n8n blueprint template - see resource file at bottom of page

Get a free trial of n8n: https://n8n.partnerlinks.io/o3jqtj032c02

Google Sheet template: link here

Get a free trial of Blotato: https://blotato.com/?ref=robonuggets

Remember to use code ROBONUGGETS at Blotato checkout for 30% off for life!

Blotato API docs: https://help.blotato.com/advanced/api-docs/publish-post 

Blotato support: https://help.blotato.com/support/get-support

"n8n" on Google Trends: https://trends.google.com/trends/explore?date=today%205-y&q=zapier,n8n,make.com&hl=en-GB




Prompts & Code




Set Blotato IDs template

{
    "instagram": "111",
    "youtube": "222",
    "tiktok": "333",
    "facebook": "444",
    "facebook_page_id": "555",
    "threads": "666",
    "twitter": "777",
    "linkedin": "888",
    "pinterest": "999",
    "pinterest_board_id": "101010",
    "bluesky": "111111"
}






Ready Video in Blotato

https://backend.blotato.com/v2/media

blotato-api-key




Instagram - Blotato Config

https://backend.blotato.com/v2/posts

{
  "post": {
    "target": {
      "targetType": "instagram"
    },
    "content": {
      "text": "{{ $('Google Sheets').item.json.caption }}",
      "platform": "instagram",
      "mediaUrls": ["{{ $json.url }}"]
    },
    "accountId": "{{ $('Set Blotato IDs').item.json.instagram }}"
  }
}



YouTube - Blotato Config

{
  "post": {
    "target": {
      "targetType": "youtube",
      "title": "{{ $('Google Sheets').item.json.idea }}",
      "privacyStatus": "unlisted",
      "shouldNotifySubscribers":false
    },
    "content": {
      "text": "{{ $('Google Sheets').item.json.caption }}",
      "platform": "youtube",
      "mediaUrls": ["{{ $json.url }}"]
    },
    "accountId": "{{ $('Set Blotato IDs').item.json.youtube }}"
  }
}




Tiktok - Blotato Config

{
  "post": {
    "target": {
      "targetType": "tiktok",
      "isYourBrand": false,
      "disabledDuet": false,
      "privacyLevel": "PUBLIC_TO_EVERYONE",
      "isAiGenerated": true,
      "disabledStitch": false,
      "disabledComments": false,
      "isBrandedContent": false
    },
    "content": {
      "text": "{{ $('Google Sheets').item.json.caption }}",
      "platform": "tiktok",
      "mediaUrls": ["{{ $json.url }}"]
    },
    "accountId": "{{ $('Set Blotato IDs').item.json.tiktok }}"
  }
} 

Facebook- Blotato Config

{
  "post": {
    "target": {
      "pageId": "{{ $('Set Blotato IDs').item.json.facebook_page_id }}",
      "targetType": "facebook"
    },
    "content": {
      "text": "{{ $('Google Sheets').item.json.caption }}",
      "platform": "facebook",
      "mediaUrls": ["{{ $json.url }}"]
    },
    "accountId": "{{ $('Set Blotato IDs').item.json.facebook }}"
  }
}

Threads - Blotato Config

{

  "post": {

    "target": {

      "targetType": "threads"

    },

    "content": {

      "text": "{{ $('Google Sheets').item.json.caption }}",

      "platform": "threads",

      "mediaUrls": ["{{ $json.url }}"]

    },

    "accountId": "{{ $('Set Blotato IDs').item.json.threads }}"

  }

}

Twitter - Blotato Config

{
  "post": {
    "target": {
      "targetType": "twitter"
    },
    "content": {
      "text": "{{ $('Google Sheets').item.json.caption }}",
      "platform": "twitter",
      "mediaUrls": ["{{ $json.url }}"]
    },
    "accountId": "{{ $('Set Blotato IDs').item.json.twitter }}"
  }
}

LinkedIn - Blotato Config

{
  "post": {
    "target": {
      "targetType": "linkedin"
    },
    "content": {
      "text": "{{ $('Google Sheets').item.json.caption }}",
      "platform": "linkedin",
      "mediaUrls": [ "{{ $json.url }}" ]
    },
    "accountId": "{{ $('Set Blotato IDs').item.json.linkedin }}"
  }
}

Bluesky - Blotato Config

{
  "post": {
    "target": {
      "targetType": "bluesky"
    },
    "content": {
      "text": "{{ $('Google Sheets').item.json.caption }}",
      "platform": "bluesky",
      "mediaUrls": ["{{ $json.url }}"]
    },
    "accountId": "{{ $('Set Blotato IDs').item.json.bluesky }}"
  }
}

Pinterest - Blotato Config

{
  "post": {
    "target": {
 