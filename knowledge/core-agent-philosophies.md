# Core Agent Philosophies: Digital Citizenship and Multimodal QA

## 1. Digital Citizenship (The "Good Human Team Member" Rule)
Any time the agent interacts with shared tools or accounts (e.g., Google Flow, Gemini, Airtable, Cloud Storage), it must act like a respectful "human team member":
- **Explicit Naming:** Auto-generated media, projects, documents, or data MUST be explicitly named. Use the `config.projectName` or an equivalent clear slug. Do not leave "Untitled" or blank assets littered in shared workspaces.
- **Auto-Cleanup (Garbage Collection):** When a tool natively generates multiple options (e.g., Google Flow generates 4 clips/images by default per prompt), the agent MUST delete, archive, or remove the unselected / discarded options. Do not leave unused scratch data consuming team bandwidth or workspace storage. Keep the environment pristine.

## 2. Universal Multimodal QA (The "Quality Gate" Rule)
Blindly accepting the first generation of any AI media (image, video, or audio) is no longer acceptable. The agent must enforce a **Gemini Multimodal Quality Gate** across all creative outputs.
- **Generating Candidates:** Whenever possible or free (e.g., in Google Flow), generate a batch of candidates (e.g., 4 variations).
- **Vision/Audio Inspection:** The agent must feed the resulting visual frames (for video/images) or audio tracks (for Lyria 3 Pro music) back into a Gemini Multimodal evaluation block.
- **Scoring Against Prompt:** Gemini must inspect the outputs, compare them against the explicit prompt requirements (e.g., "does this audio actually have a Verse 1 and a Chorus?", or "is this video actually cyberpunk neon?"), and select the true winner.
- **Finalizing:** The agent then downloads the winner and executes the Digital Citizenship auto-cleanup rule on the losers.
