# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The personal portfolio of Mauricio González Ortiz, an AI/ML and backend engineer, served by GitHub Pages from the root of `main` at https://bebedovis.github.io. It is plain static HTML/CSS/JS with no build step, package manager or tests. To preview it, run `python3 -m http.server` and open http://localhost:8000.

## Layout

- `index.html`: all page content as real text. The avatar SVG is inlined inside `#avatar`, so `main.js` can animate its `#pupils` and `#mouth` groups without fetching them, which also makes the page work over `file://`.
- `css/styles.css`: design tokens on `:root`. The palette is dark: bg `#14120c`, text `#ece7dd`, gold `#e1c16e`, muted `#a39c8c`/`#756f60`. Fonts are Newsreader, Hanken Grotesk and JetBrains Mono, loaded from Google Fonts. Styles are mobile-first, with breakpoints at 480 / 768 / 1024 px.
- `js/main.js`: the mobile nav toggle, the word-by-word blur reveal on `.reveal` headings, the avatar (pupils follow the pointer, click shows an "ouch" face), and the role typewriter.
- `js/playground.js`: the drag/throw playground in `#pg`. Each `.pg-item` DOM element is backed by a Matter.js body (loaded from cdnjs), and its CSS `transform` is written every frame.
  - `data-shape` (`rect` | `pill` | `circle`) selects the body shape.
  - `data-optional` items are hidden on phones via CSS and skipped.
  - A card is an `<a href="#job-…">`. A click with less than 5 px of movement follows the link, while a real drag suppresses it.
  - Dragging uses custom pointer events plus a `Constraint`, not `MouseConstraint`, so touch swipes on empty space still scroll the page. Items use `touch-action: none` and the box uses `pan-y`.
  - Fallback: when Matter.js fails to load or `prefers-reduced-motion` is set, the script exits early and the CSS flex-wrap layout of `.pg` (without `.is-live`) stays.
- `assets/avatar.svg`: the same avatar, used as the favicon.
- `maucv.pdf`: the CV linked from the "Download CV" buttons.
- `.nojekyll`: tells GitHub Pages to serve the files as-is.

## Content rules

The content comes from `maucv.pdf`, covering background, education, work and research experience, and skills. The CV's "Independent Projects" section is intentionally left out. When you add a job, add it both to the `.timeline` in `#experience` and as a `.pg-card` in the playground, with a matching `id`/`href`.
