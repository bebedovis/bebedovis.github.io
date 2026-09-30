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

The content comes from `maucv.pdf`, covering background, education, work and research experience, and skills. The CV's "Independent Projects" section is intentionally left out. When you add a job, add it both to the `.timeline` in `#experience` and as a `.pg-card` in the playground, with a matching `id`/`href`. The phone number from the CV is deliberately not shown on the public site.

## Playground gotchas

- Body sizes come from each element's rendered size (`offsetWidth`/`offsetHeight`) at the moment the pile is built. The pile is built the first time `#pg` scrolls into view, and rebuilt when the viewport crosses the phone breakpoint. Resize the items in CSS; never set their size in JS.
- The phone breakpoint appears in two places: `@media (max-width: 767px)` in `styles.css` and `mobileQuery` in `playground.js`. Keep them in sync.
- Styles for items in physics mode belong under `.pg.is-live`. Plain `.pg` styles are the static fallback layout.

## Deploy

Pushing to `main` is the deploy: GitHub Pages publishes the repo root within about a minute. There is no CI. To confirm a deploy, run `curl -s https://bebedovis.github.io/` and check the output for the new content. Before the rebuild, the site was a self-unpacking bundle; it is still available in git history (commit `81b089b`) if you need anything from it.

## Verifying changes

There are no tests. Check changes in a browser at 375, 768 and 1440 px widths:

- `document.documentElement.scrollWidth` must equal `innerWidth` (no horizontal overflow).
- The console must show no errors.
- The playground must still drag and throw.

For headless checks, Google Chrome is installed at `/usr/bin/google-chrome`. Playwright can drive it (`channel="chrome"`); install Playwright in a scratch venv, not in this repo. To simulate touch, use CDP `Input.dispatchTouchEvent`. `Input.synthesizeScrollGesture` doesn't scroll the page here, even outside the playground.
