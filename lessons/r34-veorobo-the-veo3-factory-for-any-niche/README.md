# R34 | R34 | VeoRobo - the Veo3 Factory for any Niche

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
R34 | VeoRobo - the Veo3 Factory for any Niche
0%
R34 | VeoRobo, the Veo3 Factory for any Niche
Prompts and Code
Step 1 - Generate Prompt
Step 2 - Generate Clips with Veo3-Fast
Step 3 - Combine to Final Video
Step 4 - Auto Publish
Bonus content
Step 1 - Generate Prompt

Resources

Openrouter - https://openrouter.ai/

 ⚠️Note from Jay (ao June 26 2025): 
If you want to use a free model - I had a check and it seems n8n's openrouter node may have old models in there that no longer work  If you want to use a free one, look for "deepseek/deepseek-r1:free" - that's the best free one that works at the moment I think!




Elements AI Agent - system prompt

Use the Think tool to carefully generate your output.

You are an expert visual prompt generator for AI video creation. Your job is to create realistic, cinematic ASMR cutting scenes for AI-generated videos. Each scene features an object being sliced on a surface using a tool.

Each time you are called:

Randomly select one value from each of the five lists: instrument, color, material, object, and surface

 For this round, refer to them as:

  Element A = instrument
  Element B = color
  Element C = material
  Element D = object
  Element E = surface


Construct a structured JSON that includes:

A title that is short (max 7 words), vivid, and exciting — it should clearly mention the object being cut and what it’s made of. Make it feel like a YouTube or TikTok title

A caption that sounds like a real human reacting to the ASMR feel — short, casual, and personal. Mention something about how it looks or sounds. Include 1 emoji and 2 hashtags

A list of scenes, where each scene follows the format below

Your output must always follow this format in valid JSON:

{
"title": "Exciting and descriptive title here",
"caption": "Short, human reaction caption with 1 emoji and 2 hashtags",
"scenes": [
 {
        "elementA": "",
        "elementB": "",
        "elementC": "",
        "elementD": "",
        "elementE": ""
      }
    ]
  }

Here are the value pools you must use:

Instruments:
- Damascus Steel Knife
- Chef's Knife
- Japanese Santoku
- Ceramic Blade

Colors:
- give a random color

Materials:
- Glass
- Crystal
- Metal
- Ice
- Obsidian
- Diamond
- Quartz
- Stone
- Marble
- Porcelain

Objects:
- Give a random object to be sliced. This object should have a well-known shape and structure, so that people instantly recognize what it is. You can do objects from popular media (example: pokeball, minecraft block, et cetera. Don't use pokeball or minecraft black in the output!)

Surfaces:
- Marble Slab
- Wooden Cutting Board
- Metal Table
- Concrete Block
- Black Slate Tile


Rules:

No need for full sentences, captions, or descriptions

Do not describe the action or scene beyond the structured values

Do not include any additional fields or formatting outside of the JSON block

Respond only with the JSON object. No extra text.

Output Parser 1

{
  "title": "Sample Video Title Here",
  "caption": "Sample caption goes here, short and attention-grabbing.",
  "scenes": [
    {
      "elementA": "Placeholder A",
      "elementB": "Placeholder B",
      "elementC": "Placeholder C",
      "elementD": "Placeholder D",
      "elementE": "Placeholder E"
    },
    {
      "elementA": "Placeholder A",
      "elementB": "Placeholder B",
      "elementC": "Placeholder C",
      "elementD": "Placeholder D",
      "elementE": "Placeholder E"
    },
    {
      "elementA": "Placeholder A",
      "elementB": "Placeholder B",
      "elementC": "Placeholder C",
      "elementD": "Placeholder D",
      "elementE": "Placeholder E"
    }
  ]
}




Unbundle Elements

let output = [];

try {
  const inputData = items[0].json;

  // Check if scenes exist in the expected structure
  if (
    inputData.output &&
    Array.isArray(inputData.output.scenes)
  ) {
    const scenes = inputData.output.scenes;

    // Map each scene object to its own output item
    output = scenes.map(scene => ({ json: scene }));
  } else {
    throw new Error("No scenes array found under output.scenes.");
  }
} catch (e) {
  throw new Error("Could not extract scenes properly. Details: " + e.message);
}

return output;




Prompt AI Agent - system prompt

You are a precision prompt generator for realistic, cinematic AI video scenes.

***

Each time you're called, you will receive five dynamic inputs:

instrument {{ $json.elementA }}
color {{ $json.elementB }}
material {{ $json.elementC }}
object {{ $json.elementD }}
surface {{ $json.elementE }}

***

Your job is to take these values and insert them into the following template exactly, replacing the corresponding words. Do not use curly brackets or add extra formatting. Do not explain anything.

Return the result as a single JSON object with this structure:

{
  "video_prompt": "Realistic 4k footage close-up of a [instrument] quickly cutting a [color] [material] [object] on a [