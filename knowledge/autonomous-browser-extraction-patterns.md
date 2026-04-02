# Autonomous Browser Extraction Patterns & Digital Citizenship

As of March 2026, the RoboNuggets architecture relies heavily on live Chrome session hijacking (`--remote-debugging-port=9333`) to automate high-fidelity Google generative AI endpoints (like Google Flow for Video/Images and Lyria 3 Pro for Audio). This bypasses the need for costly API enterprise tiers while yielding native asset resolutions. 

However, live-driving a visible Chrome window presents unique challenges that MUST be respected by all future agentic logic applied to this repository.

## 1. Digital Citizenship (Workspace Hygiene)

When utilizing shared resources—like a centralized Google AI Ultra subscription used by multiple human team members—all automation **must leave virtually no trace**. 

- **Autonomous Chat Destruction**: After a media asset is successfully extracted from a Gemini/Lyria/Flow chat, the automation script MUST immediately navigate to the `Recent` threads sidebar, target the specific chat it just created, and permanently delete it.
- **Auto-Naming**: If an app requires named projects, the automation MUST use globally unique and self-cleaning nomenclature (e.g., `R56_1774567050471`) so humans instantly know a bot created it and can safely ignore or purge it.
- Failure to adhere to Digital Citizenship will result in a cluttered workspace, disrupting the workflow of the human team members sharing the account.

## 2. Headless CDP Network Payload Interception

A critical discovery was made regarding the downloading of generative media payloads. 

When a Chrome instance is non-headless (i.e., a visible window attached to a user profile), it is subject to the host operating system's native download dialogs (e.g., macOS "Save As..." popup). 
- Attempting to bypass this by sending `Page.setDownloadBehavior` via the Chrome DevTools Protocol (CDP) will frequently be ignored by the OS overlay. 
- Attempting to synthetically `.click()` the native "Download" UI buttons will often trigger the OS popup, instantly freezing the node script indefinitely because Puppeteer cannot see or interact with macOS-level dialog boxes.

**The Proven Solution:**
Do not rely on DOM-based download buttons. Instead, arm an aggressive CDP Network Interceptor `page.on('response', ...)` *before* submitting the generation prompt.
- Monitor the network traffic specifically looking for status `200` payloads bearing `content-type` headers like `video/mp4`, `audio/aac`, or URLs containing `videoplayback`.
- Buffer the response data natively. Google's web applications frequently transmit the final high-quality audio/video asset to the player as a monolithic MediaSource byte stream.
- The interceptor perfectly traps the unencrypted raw bytes (often 10MB+ for audio and 20MB+ for video) straight off the wire, totally circumventing the host OS. The Blob is then synced directly to the local filesystem using `fs.writeFileSync`.

## 3. Media Format Reality

When tapping Google endpoints like Lyria 3 Pro natively over the web:
- The `videoplayback` payload intercepted from the wire will inherently be a unified `.mp4` container holding the ultra-high bitrate AAC/Opus audio codec paired with a static album cover.
- **Do not attempt to force `.wav` extensions** or write complex FFmpeg isolation loops just to get an `.mp3`. The native `.mp4` wrapper is structurally identical for modern video/audio editing timelines. Emphasize pipeline speed and stability over pedantic file extension purity.
