# Glass Notes — ultra-premium glassmorphism note app

A standalone three-column note-taking app with a deep GitHub-dark glass aesthetic and exact GitHub Dark syntax colors.

## Layout

```text
+-----------+------------------+---------------------------+
| Sidebar   | Note list        | Editor / preview          |
| blur-xl   | blur-lg          | blur-md over #0d1117      |
| New Note  | glass cards      | markdown toolbar          |
| Search    | title/date/snip  | live editing + preview    |
| All/Favs  | hover scale+ring | favorite / collection /   |
| Collections|                 | delete actions            |
+-----------+------------------+---------------------------+
```

- Column 1: ultra-translucent sidebar, GitHub-green "New Note" button with a slow sophisticated pulse, search field, All Notes, Favorites, and user-creatable Collections (add/rename/delete, note counts).
- Column 2: translucent list of refined glass cards (title, subtle relative date, two-line body snippet, favorite star). Hover: subtle scale + brighter border. Selected: persistent highlight.
- Column 3: large editor panel with a minimal markdown toolbar (Bold, Italic, Code, Link) that wraps the current selection, plus an Edit/Preview toggle. Content area uses GitHub's `#0d1117`.
- Responsive: on narrow screens the columns collapse to a single stack with back navigation.

## Visual system

- Multi-layered fixed background: deep slate base with soft sapphire and violet radial glows plus a fine noise/grid texture, floating beneath all panels.
- Every panel: `backdrop-blur` (lg–xl), `border-white/5`, layered diffuse shadows for depth.
- Inter loaded via `<link>` in the root route; refined negative letter-spacing on headers.
- All colors added as semantic tokens in `src/styles.css` (oklch) — no hardcoded color utilities in components.

## Markdown + syntax highlighting

- `react-markdown` + `remark-gfm` for parsing, `react-syntax-highlighter` (Prism) for fenced code blocks with ```` ```lang ```` tags.
- Custom Prism theme overriding tokens to exactly:
  keywords `#ff7b72`, functions/built-ins `#d2a8ff`, variables/params `#79c0ff`, strings `#a5d6ff`, comments `#8b949e`, punctuation/operators `#c9d1d9`, background `#0d1117`.
- Code font stack: `'Fira Code','JetBrains Mono','Consolas',monospace`. A global CSS override ensures no default gray leaks onto keywords or function names.

## Note management

- Create, edit (debounced real-time save), delete, favorite, assign to a collection.
- Instant search filtering the list by title and body.
- Filters: All Notes, Favorites, per-collection.
- Persistence: browser localStorage (no login needed, works instantly). Seeded with a few demo notes including a Python code block so the highlighting is visible on first load.

## Motion

- Panels fade/slide in on mount; note cards stagger in; selection cross-fades the editor; new notes animate into the list; "New Note" button carries a soft glow pulse. Implemented with CSS keyframes/`tw-animate-css` (Motion only if needed).

## Technical notes

- Rewrites `src/routes/index.tsx` as the app (replacing the placeholder) with its own `head()` metadata; state lives in a `useNotes` hook backed by localStorage.
- New components under `src/components/notes/`: `Sidebar`, `NoteList`, `NoteCard`, `NoteEditor`, `MarkdownPreview`, `MarkdownToolbar`.
- New deps: `react-markdown`, `remark-gfm`, `react-syntax-highlighter`.
- If you'd rather have notes sync across devices/browsers later, that's a follow-up switch to Lovable Cloud.
