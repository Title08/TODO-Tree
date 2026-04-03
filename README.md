# TODO Tree for Obsidian (MVP)

An Obsidian community plugin that scans markdown notes for TODO-style tags and displays them in a tree view in the left sidebar.

## Features (MVP)
- Scan markdown files (`.md`) for tags such as `TODO`, `FIXME`, `BUG`, `HACK`.
- Optional support for markdown task items (`- [ ]` and `[x]`) via settings.
- Left sidebar TODO tree grouped by folder/file.
- SVG-style expand/collapse icons with open/close animation.
- Checkbox state icons for markdown tasks (display-only in tree).
- Circle-check icon for `TODO` tag items (theme accent color).
- Click an item to open the file and jump to the TODO line.
- Manual refresh command and automatic refresh from vault file events.
- Configurable tags, regex, case sensitivity, include/exclude globs.

## Development setup
1. Place this folder inside your test vault:
   `.obsidian/plugins/todo-tree`
2. Install dependencies:
   `npm install`
3. Start development build:
   `npm run dev`
4. In Obsidian:
   - Enable community plugins.
   - Enable **TODO Tree**.
   - Use command palette: **TODO Tree: Open TODO Tree view**

## Build
- `npm run build` to produce `main.js`.

## Notes
- This repository currently implements MVP scope and is structured for future enhancements toward deeper VSCode Todo Tree parity.
