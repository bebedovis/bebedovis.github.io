# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

The personal portfolio of Mauricio González Ortiz, an AI/ML and backend engineer, served by GitHub Pages from the root of `main` at https://bebedovis.github.io. It is plain static HTML/CSS/JS with no build step, package manager or tests. To preview it, run `python3 -m http.server` and open http://localhost:8000.

## Layout

- `index.html`: all page content as real text. The top bar has no JS. The hero `section#pg.hero.pg` is also the physics playground: `.hero__text` (name, intro, hint) sits behind `.pg-items`. The avatar SVG is inlined in `#avatar`, which is itself a playground item, so `main.js` can animate its `#pupils` and `#mouth` groups and the page works over `file://`.
- `css/styles.css`: tokens on `:root`.
  - Colors: `--ink #121110` bg, `--graphite` object surfaces, `--bone` text, `--ash` secondary, `--rule` hairlines, `--brass #d6b25e`.
  - Brass is the only accent and is reserved for detection boxes and links. Don't use it as decoration.
  - Type: Newsreader for display and reading text, Hanken Grotesk for UI and meta text. JetBrains Mono is used only in detection labels.
  - Sections use a left heading rail from 1024px up, on the `.section` grid. Breakpoints are 767/768 and 1024.
- `js/main.js`: the footer year and the avatar. Its pupils look toward the pointer relative to the avatar's current position, and a click shows the "ouch" face.
- `js/playground.js`: the Matter.js (cdnjs) hero playground. Each `.pg-item` DOM element is backed by a body, and its CSS `transform` is written every frame.
  - `data-shape` (`rect` | `pill` | `circle`) selects the body shape. `data-optional` items are hidden on phones via CSS and skipped. `data-label` is the text on the detection label.
  - **Detection overlay:** each item gets a sibling `.bbox`, sized every frame from `body.bounds` so it stays axis-aligned while the object rotates. It shows (`.is-seen`) while the body moves, is hovered or is dragged, and fades `SEEN_MS` after it rests. While dragging, the label changes to a tracker id (`id 07`).
  - Items spawn below `.hero__text`, in the right half on screens ≥1024px wide. Walls are inset by `INSET` so boxes aren't clipped.
  - Dragging uses custom pointer events plus a `Constraint`, not `MouseConstraint`, so touch swipes on empty space still scroll the page. Items use `touch-action: none` and the hero uses `pan-y`.
  - Click vs drag: under 5 px of movement counts as a click. A real drag swallows the click with `stopImmediatePropagation`, so dragging the avatar doesn't trigger "ouch" and dragging a card doesn't follow its link.
  - Fallback: when Matter.js fails to load or `prefers-reduced-motion` is set, the script exits early. Without `.is-live`, the items wrap in a static row, there are no boxes, and the hint is hidden.
- `assets/avatar.svg`: the same avatar, used as the favicon.
- `maucv.pdf`: the CV linked from the nav and contact section.
- `.nojekyll`: tells GitHub Pages to serve the files as-is.

## Content and style rules

- The content comes from `maucv.pdf`: background, education, work and research experience, and skills. The CV's "Independent Projects" section is intentionally left out.
- The phone number is deliberately not shown on the public site.
- Don't use em dashes in page text; use parentheses, commas or "to" instead.
- To add a job, add a `.job` to `#work` and a `.pg-job` to the hero, with a matching `id`/`href`.
- Keep the design restrained. There is one animated moment (the drop-in with detection boxes). Avoid all-caps labels, numbered section eyebrows, one-word italic accents, chip or tag clouds, and card grids.

## Playground gotchas

- Body sizes come from each element's rendered size at build time. Resize the items in CSS; never set their size in JS.
  - The first build waits for the exact web-font faces the objects use, via `document.fonts.load(...)` with a 3 s timeout. `document.fonts.ready` alone resolves too early.
  - A per-item `ResizeObserver` (`resyncItem`) rebuilds a body in place if its element's size changes later. Without both of these, boxes and collisions don't match the objects on slow phone connections.
  - If an object uses a new font weight, add it to `faces` in `playground.js`.
  - The pile is also rebuilt when the viewport crosses the phone breakpoint.
- The phone breakpoint appears in two places: `@media (max-width: 767px)` in `styles.css` and `mobileQuery` in `playground.js`. Keep them in sync.
- Styles for items in physics mode go under `.pg.is-live`; plain `.pg-items` styles are the fallback layout.

## Deploy

Pushing to `main` is the deploy: GitHub Pages publishes the repo root within about a minute. There is no CI. To confirm a deploy, run `curl -s https://bebedovis.github.io/` and check the output for the new content. Before the rebuild, the site was a self-unpacking bundle; it is still available in git history (commit `81b089b`) if you need anything from it.

## Verifying changes

There are no tests. Check changes in a browser at 375, 768 and 1440 px widths:

- `document.documentElement.scrollWidth` must equal `innerWidth` (no horizontal overflow).
- The console must show no errors.
- The playground must still drag and throw.

For headless checks, Google Chrome is installed at `/usr/bin/google-chrome`. Playwright can drive it (`channel="chrome"`); install Playwright in a scratch venv, not in this repo. To simulate touch, use CDP `Input.dispatchTouchEvent`. `Input.synthesizeScrollGesture` doesn't scroll the page here, even outside the playground.
