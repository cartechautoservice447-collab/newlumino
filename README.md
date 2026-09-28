# NewLumino — Glass Notes

Build a completely new, standalone, ultra-premium note-taking application from scratch. This application must embody a profound 'Glassmorphism' aesthetic and use the specific syntax highlighting colors found in GitHub's dark themes.



1. UI LAYOUT & STRUCTURE (NEW DEFINITION):



Implement a polished, sophisticated three-column layout (rather than a widget dashboard):



- COLUMN 1 (Sidebar Navigation): Ultra-translucent background with heavy `backdrop-blur-xl`. Contains 'New Note' button (GitHub green button style), Search, 'All Notes', 'Favorites', and customizable 'Collections' (folders).



- COLUMN 2 (Note List): Translucent panel with `backdrop-blur-lg`. Displays vertical, refined, glassmorphism card snippets of notes (Title, subtle created-at date, short body snippet). Hovering cards should trigger a subtle scaling effect and highlight border.



- COLUMN 3 (Note Editor): Main focus area. When a note is selected, it appears in a large, clean central panel. Include a refined, minimal Markdown toolbar (Bold, Italic, Code, Link).



2. ULTRA-PREMIUM GLASSMORPHISM AESTHETIC:



- BACKGROUND: Implement a sophisticated, multi-layered background gradient using deep slate (like GitHub) and subtle sapphire/violet tones that appear to float beneath the panels. Use high-resolution, translucent patterns.



- PANELS & BORDERS: Every panel (sidebar, list, editor) must have `backdrop-blur` enabled (varying from -lg to -xl). Apply a very subtle, light border (1px `border-white/5`) to all panels and elements to define edges. Use diffuse, layered shadows to give elements significant depth.



- TYPOGRAPHY: Use an elegant, refined sans-serif font (like Inter or San Francisco Pro) with refined letter-spacing for headers.



3. GITHUB THEME NOTE CONTENT (SYNTAX HIGHLIGHTING):



- NOTE EDITOR content area must default to a refined dark background matching GitHub's.



- Implement robust Markdown parsing (using React-Markdown or similar).



- Note content, especially code blocks (using \`\`\` language tags), MUST use GitHub’s standard dark code highlighting theme (colors for keywords, variables, comments, functions, strings).



4. DEFINITION NOTE MANAGEMENT FEATURES:



- CORE ACTIONS: Real-time save, Delete, Favorite, Assign to Collection.



- SEARCH: Fast, real-time search filtering the Note List (Column 2) based on content and title.



- MICRO-INTERACTIONS: Refined, fluid animations on note selection, note creation, and panel loading. The 'New Note' button should have a sophisticated pulse animation.                                                                                                                                                                                         Apply this exact GitHub Dark / VS Code Dark syntax highlighting color palette to all code editors, previews, and syntax blocks:



1. EDITOR CONTAINER & FONTS:



- Background: Deep Dark Slate (`#0d1117`)



- Font Family: Monospace (`'Fira Code', 'JetBrains Mono', 'Consolas', monospace`)



2. TOKEN COLOR PALETTE (EXACT IMAGE MATCH):



- Keywords (`def`, `class`, `return`, `if`, `import`, `for`): Soft Salmon / Coral Pink (`#ff7b72`)



- Function Definitions & Calls (`main`, `hello`): Soft Purple / Lavender (`#d2a8ff`)



- Built-in Functions (`input`, `print`, `len`): Soft Purple / Lavender (`#d2a8ff`)



- Function Parameters & Variables (`name`, `to`): Soft Cyan / Sky Blue (`#79c0ff`)



- String Literals (`"What's your name? "`, `"world"`): Light Ice Blue (`#a5d6ff`)



- Comments (`# Output using...`): Muted Slate Gray (`#8b949e`)



- Punctuation & Operators (`=`, `:`, `(`, `)`): Off-White / Light Gray (`#c9d1d9`)



3. INTEGRATION INSTRUCTIONS:



- Override Prism.js / Highlight.js / Monaco / Shiki token CSS styles using these exact hex values.



- Ensure no default light gray falls back onto keywords or function names.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```