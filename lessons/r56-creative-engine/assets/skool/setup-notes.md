# R56 Lesson Notes

Source: https://www.skool.com/robonuggets/classroom/4fd11490?md=410db1af99764d0f9c0f9034ebdd068f

## Lesson Page Content

```text
The RoboNuggets Community
Community
Classroom
Calendar
Members
Map
Leaderboards
About
R56 | The Antigravity Creative Engine
100%
R56 | The Antigravity Creative Engine
R56 | The Antigravity Creative Engine
23:20

This lesson gives you a system and skill that lets Antigravity or Claude Code connect to every major image and video AI — so your agent becomes a creative engine that prompts, generates, and delivers content for you.

📌 Need translations from English? We also shared this as an unlisted YT vid here

🔧 For support, please check this Where to get help page


Timestamps: 

00:00 Intro 
00:31 Why this skill? 
02:39 Advantage 1 + Demo 
08:24 Advantage 2 + adding any AI model 
12:13 Advantage 3 + Multi-agent demo 
15:58 Advantage 4 
17:28 Advantage 5 
20:18 Set up 
22:27 Shortcut for setup (skill)



Resources 

AI Agent template and skill: check file pack attached at the bottom of the page. This includes all best practice prompting techniques, connectors to the image & video models featured in the video, and a set up guide for your AI Agent to follow.

To install - just drop it to Claude Code / Antigravity and send this prompt to set it up:

"I just imported the Creative Engine template into my workspace. Read README.md and CLAUDE.md and walk me through the first-time setup."

AirTable template: link



Tools

Antigravity: https://antigravity.google/

Claude Code — https://claude.ai/code 

Airtable — Spreadsheet-style database used as a better interface for creative quality checks. https://www.airtable.com/  | How to set up AirTable Credential

Set up API keys in Kie AI, Google AI Studio, Wavespeed AI - all credential tutorials are available here



Lesson released: Feb 21 2026

Resources
R56 - Creative Engine Template
```

## Key Details from Lesson Page

- **Lesson length**: 23:20
- **Release date**: Feb 21 2026
- **Install prompt**: "I just imported the Creative Engine template into my workspace. Read README.md and CLAUDE.md and walk me through the first-time setup."
- **Primary tools**: Antigravity (https://antigravity.google/), Claude Code, Airtable
- **API key providers**: Kie AI, Google AI Studio, WaveSpeed AI
- **Attachment**: `R56 - Creative Engine Template` (zip file unpacked in `assets/original/creative-engine-template/`)
- **YouTube**: Unlisted video at https://youtu.be/P5kofOFEaBo (title: "R56 | The Antigravity / Claude Code Creative Engine", 246 views, Feb 20, 2026, by Jay E | RoboNuggets, 129K subscribers)
- **Transcript**: YouTube auto-captions available (extracted 2026-04-02, saved in `transcript-notes.md`)
- **Airtable template**: https://airtable.com/appecSeJgJTgttKdI/shrM5aDhieQGyEJi6

## Lesson 5-Advantage Framework (Transcript-Derived)

The video is structured around 5 advantages of the agentic approach over traditional automation:

| # | Advantage | Timestamp | Summary |
|---|-----------|-----------|---------|
| 1 | Cross-model prompting | 02:39 | Provider abstraction lets the agent connect to any model without learning each API |
| 2 | Model selection + prompting quality | 08:24 | Agent trained on prompt best practices file; adding new models via wrapper pattern |
| 3 | Parallel multi-agent workflows | 12:13 | Multiple subagents run simultaneously ("Creative Dark Factory" — you are the director) |
| 4 | Memory and context | 15:58 | Persistent agent environment remembers choices; style guide in memory for on-brand output |
| 5 | Building for the future (CREATE framework) | 17:28 | Local file structure keeps agent and codebase in sync; alternative to SaaS lock-in |

## Timestamp Analysis (Updated: Transcript-Derived)

| Timestamp | Topic | Transcript Finding | Remaining Gap |
|-----------|-------|--------------------|---------------|
| 00:00-00:31 | Intro | "Creative AI assistant" framing — trains on best practices, generates content while you sleep | **Resolved** |
| 00:31-02:39 | Why this skill? | Pain points: complex prompts, manual repetition, n8n/Wave node spaghetti, model-update breakage, inflexibility | **Resolved** |
| 02:39-08:24 | Advantage 1 + Demo | Cross-model prompting: "create 10 ads for this lipstick brand using GPT Image 1.5 and Nano Banana Pro" — shows Airtable as review hub | **Resolved** (visual demo details still unknown) |
| 08:24-12:13 | Advantage 2 + adding any AI model | Shows `providers/` folder, explains wrapper pattern, "future-proof" — teaches provider abstraction as a core advantage | **Resolved** |
| 12:13-15:58 | Advantage 3 + Multi-agent demo | Parallel subagents: one for image gen, one for video, one for Airtable — "CTO managing a team" / "Creative Dark Factory" | **Resolved** |
| 15:58-17:28 | Advantage 4 | Memory and Context — agent remembers preferences, style guide in memory for on-brand consistency | **Resolved** |
| 17:28-20:18 | Advantage 5 | Building for the future / CREATE framework — local files sync with agent's mental model, vs SaaS lock-in | **Resolved** |
| 20:18-22:27 | Setup | Matches README: clone, .env, Airtable base, verify script | **Resolved** |
| 22:27-23:20 | Shortcut for setup (skill) | "Drop it in and say this prompt" pattern, matches install prompt | **Resolved** |

## Template Pack Contents (Verified)

The attached template `R56 - Creative Engine Template` contains:

```
creative-engine-template/
├── .claude/              # Agent config (not unpacked — may contain .env.example, requirements.txt)
├── .gitignore            # 290 bytes
├── CLAUDE.md             # 16.8KB — Full agent operational instructions (352 lines)
├── README.md             # 5.5KB — First-time setup guide (152 lines)
├── references/
│   ├── docs/
│   │   ├── kie-ai-api.md          # 1.8KB — Kie AI API reference
│   │   └── prompt-best-practices.md  # 21KB — 445-line prompt engineering guide
│   └── inputs/           # 14 files (sample reference images + videos)
│       ├── character.jpg          # Character reference
│       ├── serum-reference.jpg    # Product reference (esmi skin treat serum)
│       ├── serum-open.jpg         # Product alternate shot
│       ├── closeup_ad.jpeg        # Sample ad closeup
│       ├── closeup_ad_2.jpeg      # Sample ad closeup 2
│       ├── goli.jpg               # Product reference (Goli)
│       ├── lojel-reference.jpg    # Product reference (Lojel)
│       ├── luxury_lipstick.jpg    # Product reference
│       ├── matcha.jpg             # Product reference 
│       ├── product_shots.jpeg     # Multi-product shot
│       ├── orange.mp4             # Reference video (1.4MB) — for Workflow 0 analysis
│       ├── parallax.mp4           # Reference video (1.4MB) — for Workflow 0 analysis
│       └── parallax_frame.png     # Frame from parallax video
└── tools/
    ├── __init__.py
    ├── config.py          # 4.8KB — API keys, cost matrix, model mappings (141 lines)
    ├── airtable.py        # 10.2KB — Airtable CRUD operations
    ├── kie_upload.py      # 2.4KB — Upload reference images to Kie.ai
    ├── image_gen.py       # 16KB — Multi-provider batch image generation (382 lines)
    ├── video_gen.py       # 12.6KB — Multi-provider batch video generation (320 lines)
    ├── video_analyze.py   # 14.8KB — Reference video analysis via Gemini Files API (442 lines)
    ├── utils.py           # 11.4KB — Polling, downloads, status utilities
    └── providers/
        ├── __init__.py    # 3.7KB — Provider registry and routing
        ├── google.py      # 12.4KB — Google AI Studio provider
        ├── kie.py         # 4.4KB — Kie AI provider
        └── wavespeed.py   # 7.7KB — WaveSpeed AI provider
```

## API Key Requirements (from Template README)

| Key | Source | Required? |
|-----|--------|-----------|
| `GOOGLE_API_KEY` | https://aistudio.google.com/apikey | Yes (default image + Veo 3.1) |
| `KIE_API_KEY` | https://kie.ai/api-key | Yes (file hosting + Kling/Sora + fallback images) |
| `WAVESPEED_API_KEY` | https://wavespeed.ai | Optional (backup video provider) |
| `AIRTABLE_API_KEY` | PAT with data.records + schema.bases scopes | Yes (review hub) |
| `AIRTABLE_BASE_ID` | From Airtable base URL `appXXXXXX` | Yes |

## Rebuild Adaptation

The local rebuild replaces all API keys with Chrome CDP automation against a shared Google AI Ultra account. No API keys are required. The economic rationale is documented in `FIDELITY.md`.
