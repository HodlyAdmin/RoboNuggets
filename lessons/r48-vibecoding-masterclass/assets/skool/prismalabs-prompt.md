# R48 Prisma Labs VIBE Prompt

Source: https://www.skool.com/robonuggets/classroom/64ef71ee?md=d72601aa8e544c8d8083377c83b46719

```text
The RoboNuggets Community
Community
Classroom
Calendar
Members
Map
Leaderboards
About
R48 | Gemini 3 x N8N Vibecoding Masterclass
0%
R48 | Gemini 3 x n8n Vibecoding Masterclass
Resources & Tools (R48)
Prisma Labs VIBE framework prompt
Prisma Labs VIBE framework prompt

Copy the prompt below to test it in Gemini. Make sure to attach this UI mock up to get the best results:







V: Visuals




Create a "billion-dollar" single-page web application called PRISMA LABS. Refer to the attached reference image for the typography style and layout density.




Aesthetic Identity:




Theme: "Industrial Silver & Void". A high-end, monochromatic tech look inspired by obsidian glass and brushed platinum, accented with Safety Orange (#ff5500).




Background: Deep void black (#050505).




Layering (Crucial):




Layer 1 (Bottom): The "PRISMA LABS" text.




Layer 2 (Middle): The 3D Canvas (containing the Triangle and Particles). This canvas must have a transparent background and sit physically in front (z-index: 5) of the text so the 3D object occludes the letters.




Layer 3 (Top): The UI Content (Cards and Form) which scrolls over everything.




Specific Elements:




Typography: Use Inter (Google Fonts).




Hero Title: Match the reference image. Massive, stacked sans-serif. Top line "PRISMA" (Solid White, Weight 900). Bottom line "LABS" (Translucent White/Glassy opacity, Weight 900, vertically overlapping the top line).




Headers: Thin, elegant weight (300), sentence case (e.g., "See what we can do...").




3D Centerpiece (Three.js):




Shape: A procedurally generated Penrose Triangle. Use a TorusGeometry (radius 1.8, tube 0.3, radialSegments 16, tubularSegments 3) rotated to look triangular.




Material: "Dark Chrome" (MeshPhysicalMaterial, metalness 0.9, roughness 0.2, black color) with a white/silver wireframe overlay (LineSegments) to give it a schematic look.




Particle System (The Vortex):




Visuals: High density swarm of 5,000+ white/silver particles (PointsMaterial, size 0.06, opacity 0.7). They must look like a living cloud of digital matter, not just static dots.




UI Components (Metallic Glassmorphism):




Upload Cards: Large vertical cards (320x440px). border-radius: 24px.




Card Material: Dark metallic gradient background (linear-gradient(145deg, rgba(40, 40, 45, 0.6), rgba(10, 10, 12, 0.8))) with backdrop-filter: blur(20px).




Scanner Effect: A silver/white conic gradient must rotate perpetually along the card borders (::before pseudo-element animation).




Submit Button: Silver gradient background. Distinct Feature: A solid 4px border-bottom in Safety Orange. On hover, the button glows with an orange tint.




Cursor: Custom "Digital Precision" cursor. A small white dot (8px) that instantly tracks the mouse, trailing a larger silver ring (40px) that follows with lag. The ring expands and turns Orange when hovering interactables.




I: Interface




The app acts as a futuristic intake form for an AI ad generation service.




1. Physics Engine (The "Gravity Vortex" - CRITICAL):




Implement a custom physics loop in the animate() function.




For every single particle, calculate the distance to the mouse cursor.




If distance < 10.0 units:




Force 1 (Attraction): Apply a strong vector force pulling the particle directly to the mouse (Strength: 15.0).




Force 2 (Swirl): Apply a tangential vector force (perpendicular to the attraction) to make the particle spin around the mouse (Strength: 5.0).




Result: Particles must snap to the cursor and spiral violently like a black hole accretion disk.




2. Scroll & Parallax Logic:




The 3D background is sticky/fixed position.




As the user scrolls down, the Hero Section stays in place, but the Content Section (with the cards) slides up over it.




3D Interaction: Mouse movement (mousemove) must rotate the Penrose Triangle on both X and Y axes for a parallax feel.




3. Upload Card Logic:




Context: User sees two cards: "Source Identity" and "Target Product".




Action: Clicking anywhere on the card triggers the hidden <input type="file">.




Reaction (On File Select):




Get the file using FileReader.




Display the image in a layer inside the card (absolute positioning).




Apply mix-blend-mode: overlay to the image so it looks embedded in the glass/metal material.




Change the card's border color and scanner light color to Safety Orange.




4. Form Submission Logic:




User fills "Request" (textarea) and "Email" (input).




Action: User clicks "Execute".




Reaction:




Change button text to "Sending...".




Fade the entire form container to opacity: 0.




Reveal the Success Message container (display: block).




Success Text: Header "Request Received", Subtext "Your AI ad preview is on its way...".




B: Backend




Endpoint: The form data (FormData object containing the two images and text fields) must be sent via a POST request to: https://robonuggets.app.n8n.cloud/webhook-test/gemini




Resilience: Wrap the fetch call in a handler that triggers the Success UI Transition regardless of the HTTP response (even if it fails due to CORS/Test mode). This ensures the demo flow is never broken.




E: Exclusions




Single File Mandate: Output MUST be a single index.html file. CSS goes in <style>, JS goes in <script>.




No External Media: Do not use <img> tags with external URLs for the background or icons. All icons must be inline SVGs. The 3D objects must be code-generated.




No Frameworks: Pure HTML5, CSS3, and Vanilla JS only. No React, Vue, or Tailwind.




Responsive Constraints: On mobile screens (max-width: 768px), the Upload Cards must stack vertically, and the "Giant Text" must resize using clamp() to fit the screen width.
```
