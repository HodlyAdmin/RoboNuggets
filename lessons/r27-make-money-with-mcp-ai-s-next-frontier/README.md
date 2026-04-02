# R27 | R27 | Make Money with MCP - AI's Next Frontier

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
R27 | Make Money with MCP - AI's Next Frontier
0%
R27 | Make Money with MCP - AI's Next Frontier
R27 | Troubleshooting Tips!
R27 | Make Money with MCP - AI's Next Frontier
40:48

This tutorial explains MCP in a way that anyone can understand, and goes through some of the ways by which you can monetize this space in the coming weeks to months as the ecosystem matures 😉

This lesson's packed, because it's actually like 4 tutorials in 1! Not only do you get to know about ...

[1] MCP and how to start using it; but you also learn...

[2] how to use OpenRouter to switch between models seamlessly

[3] how to self-host in n8n so you can start using community nodes

[4] how to build an Infinite Leads AI Agent powered by Google Maps' MCP server




💡 TIP: all prompts and templates are attached at the bottom of the page

💡 TIP 2: turn on closed captions (CC) for a better experience

🔧 For support, post in the Troubleshooting discussion category. Be sure to include the issue screenshot and the full error message (copy-paste if possible) — it helps us help you faster!




Visual Framework of What We'll Learn:







Resources: 

MCP App Store

Ras Mic's mockup of an MCP app store: https://www.mcpappstore.com/

Podcast with Greg Isenberg and Ras Mic: https://www.youtube.com/watch?v=7j_NE6Pjv-E&t=1030s

Creating MCP Servers

MCP's official documentation: https://modelcontextprotocol.io/introduction

Self-hosting n8n

Simplest way to self-host: https://railway.com?referralCode=St3Gg

add code below to your environment variables for Railway

N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE = true

Building the workflow

n8n blueprint template - see resource file at bottom of page

A great way to try out different models: http://openrouter.ai/

Install the MCP community node: https://github.com/nerding-io/n8n-nodes-mcp

Copy this to install the node in your self-hosted n8n: n8n-nodes-mcp

MCP servers lists

https://github.com/modelcontextprotocol/servers (most popular list)

https://glama.ai/mcp/servers (biggest one so far with 3,000+)

https://github.com/punkpeye/awesome-mcp-servers

mcphub.io (an early search engine for MCP servers)

Apify's MCP server

Documentation on their MCP server: https://apify.com/apify/actors-mcp-server

Sign up at apify: https://www.apify.com?fpr=sffv1

Copy this in "environment":  

APIFY_TOKEN=[your-apify-token]

Tool name: 
lukaskrivka-slash-google-maps-with-contact-details

Install the tool in your Apify dashboard here: https://console.apify.com/actors/WnMxbsRLNbPeYL6ge/input

If you're facing an "Unrecognized node type" error when running the MCP node, check out this troubleshooting video! 

Note: You can use this code at Apify: SECRET25 to get 25% off!

Google Drive credential

How to get Client ID and Client Secret: : https://www.youtube.com/watch?v=qSqiBD3hE-A&t=243s 

if being asked...

Authorization URL: https://accounts.google.com/o/oauth2/v2/auth

Access Token URL: https://oauth2.googleapis.com/token

n8n documentation on connecting to google: https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/

File name code:

{{ new Date().toISOString().split('T')[0]}}__{{$json.chatInput.substring(0, 50)}}.csv






Extras

"MCP" on Google Trends: https://trends.google.com/trends/explore?q=MCP,n8n,make.com,ai%20agent,rag%20ai&hl=en-GB

"n8n" on Google Trends: https://trends.google.com/trends/explore?date=today%205-y&q=zapier,n8n,make.com&hl=en-GB

documentation on the $fromAI function of n8n: https://docs.n8n.io/advanced-ai/examples/using-the-fromai-function/#use-the-fromai-function 




Prompts & Code:

Execute Tool tester for Apify

{
  "locationQuery": "Sydney",
  "maxCrawledPlacesPerSearch": 2,
  "searchStringsArray": [
    "restaurants"
  ]
}




Tool parameters for AI Agent - MCP node

{
  "locationQuery": "{{ $fromAI("locationQuery", "location user wants to search", string) }}",
  "maxCrawledPlacesPerSearch": {{ $fromAI("maxCrawledPlacesPerSearch", "how many places user wants", number) }},
  "searchStringsArray": ["{{ $fromAI("searchStringsArray", "what the user wants to search", json) }}"],
  "skipClosedPlaces": true
}






System prompt for AI Agent

Note: the MCP community node currently has a hardcoded timeout of 60 seconds; when this is fixed in their code, then the last part of the system prompt below limiting the number of places one can search can be removed.

You are an AI agent with 20 years experience in lead generation and contacting people for business purposes, particularly using information from Google Maps, which you have access to through the MCP Google Maps tool. CRITICAL REQUIREMENT: Whenever you successfully retrieve information from Google Maps, you MUST ALWAYS generate a CSV file using the Google Drive tool. This is a non-negotiable, mandatory step that follows every successful Maps query - creating and storing the results in a CSV file in Google Driv