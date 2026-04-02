# R26 | R26 | The RAG AI Agent Auto-Builder (n8n no-code)

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
R26 | The RAG AI Agent Auto-Builder (n8n no-code)
0%
R26 | The RAG AI Agent Auto-Builder (n8n no-code)
R26 | The RAG AI Agent Auto-Builder (n8n no-code)
34:23




This lesson breaks down RAG (Retrieval Augmented Generation) in a way that actually makes sense! You'll learn how it all works through simple explanations and then build something genuinely useful - an AI Agent Auto-builder that you can use to create custom knowledge helpers for real-world business and communities 🤖

💡 TIP: all prompts and templates are attached at the bottom of the page

💡 TIP 2: turn on closed captions (CC) for a better experience

🔧 For support, post in the Troubleshooting discussion category. Be sure to include the issue screenshot and the full error message (copy-paste if possible) — it helps us help you faster!




Visual Framework of the Workflow:




Resources: 

n8n blueprint template - see resource file at bottom of page

Get a free trial of n8n: https://n8n.partnerlinks.io/o3jqtj032c02

Apify: https://www.apify.com?fpr=sffv1

YouTube Scraper: https://console.apify.com/actors/1p1aa7gcSydPkAE0d/input

YouTube Transcript: https://console.apify.com/actors/1s7eXiaukVuOr4Ueg/input

Note: Apify now requires at least the starter plan for the YouTube scrapers to work. You can use this code SECRET25 to get 25% off!

Tutorial on connecting google drive: https://www.youtube.com/watch?v=qSqiBD3hE-A&t=243s 

n8n documentation on connecting to google/youtube: https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/

Pinecone: https://www.pinecone.io/

OpenAI API key: https://platform.openai.com/api-keys




Extras

"ai RAG agent" on Google Trends: https://trends.google.com/trends/explore?date=all&q=AI%20RAG%20Agent&hl=en-GB

"n8n" on Google Trends: https://trends.google.com/trends/explore?date=today%205-y&q=zapier,n8n,make.com&hl=en-GB




Prompts & Code




YouTube Scraper JSON

{
    "duration": "all",
    "features": "all",
    "getTrending": false,
    "includeShorts": false,
    "maxItems": 10,
    "sort": "u",
    "startUrls": [
"https://www.youtube.com/@VideoCopilot"
    ],
    "uploadDate": "all"
}

YouTube Transcript JSON

{
    "channelHandleBoolean": false,
    "channelIDBoolean": false,
    "channelNameBoolean": false,
    "commentsBoolean": false,
    "datePublishedBoolean": false,
    "dateTextBoolean": false,
    "descriptionBoolean": false,
    "keywordsBoolean": false,
    "likesBoolean": false,
    "maxRetries": 8,
    "outputFormat": "xmlWithTimestamps",
    "proxyOptions": {
        "useApifyProxy": true,
        "apifyProxyGroups": []
    },
    "relativeDateTextBoolean": false,
    "subscriberCountBoolean": false,
    "thumbnailBoolean": false,
    "uploadDateBoolean": false,
    "urls": [
        "{{ $json.url }}"
    ],
    "viewCountBoolean": false
} 

Transcript Code Cleaner

/**
 * This script parses an XML transcript, extracts all <text> nodes with timestamps,
 * decodes HTML entities, and returns the cleaned text with YouTube title and URL
 * inserted every 15 lines.
 *
 * Expected input: a JSON object with a property "input" containing the XML transcript.
 */

// Function to decode HTML entities (including numeric entities)
function decodeHTMLEntities(text) {
  // First, decode entities like &amp;#39; (which become &#39;) into characters
  text = text.replace(/&amp;#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  
  // Then decode any remaining numeric character references (e.g. &#39;)
  text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  
  // Decode some common HTML entities
  const entities = {
    '&amp;': '&',
    '&quot;': '"',
    '&apos;': "'",
    '&lt;': '<',
    '&gt;': '>'
  };
  
  for (const entity in entities) {
    text = text.replace(new RegExp(entity, 'g'), entities[entity]);
  }
  
  return text;
}

// Function to format seconds as [MM:SS]
function formatTimestamp(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `[${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}]`;
}

// Get the XML string from the input JSON (adjust the property name as needed)
const xmlInput = $json.captions;

// Extract YouTube title and URL from parameters or use defaults
const youtubeTitle = $('Get Vids').item.json.title || "YouTube Video";
const youtubeURL = $('Get Vids').item.json.url || "https://www.youtube.com/watch?v=videoId";

// Initialize the formatted text with the title and URL at the beginning
let cleanedText = `youtubeTitle: ${youtubeTitle}\nyoutubeURL: ${youtubeURL}\n\n`;

// Use a regex to extract text and start time inside <text> tags
const regex = /<text start="([^"]*)"[^>]*>(.*?)<\/text>/g;
let match;
let lineCount = 0;

while ((match = regex.exec(xmlInput)) !== null) {
  const startTime = parseFloat(match[1]);
  let textSegment = match[2];
