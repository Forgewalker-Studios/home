# ForgeWalker Studios Home

Static GitHub Pages homepage for ForgeWalker Studios.

## Pages

- `index.html` - overview homepage
- `work.html` - public member work
- `1g1w.html` - One Game a Week Jam hub
- `about.html` - studio purpose and workflow principles
- `members.html` - current member profile
- `support.html` - Patreon, itch.io, and GitHub links

## Local Preview

Open `index.html` directly in a browser, or serve the folder with any static file server.

## Publishing

This repository is intended to publish through GitHub Pages from the repository root on the `main` branch.

## Links

- Homepage source: https://github.com/Forgewalker-Studios/home
- Patreon: https://www.patreon.com/forgewalkerstudios
- ForgeWalker Studios itch.io: https://forgewalkerstudios.itch.io/
- Jazhikho about page: https://forgewalker-studios.github.io/jazhikho/

## Branding Assets

ForgeWalker Studios logo and cover art are stored locally in `assets/branding/` so the site does not depend on expiring Patreon media URLs.

## Maintenance Notes

ForgeWalker Studios itch.io project data is refreshed by `.github/workflows/update-itch-projects.yml`.
One Game a Week Jam data and published result rankings are refreshed by `.github/workflows/update-gameaweek-jams.yml`.
Overall One Game a Week leaderboard scores are stored in `content/one-game-a-week-leaderboard.json`.

## Validation

Run `node scripts/test-site-content.mjs` to check local page links, public page copy, and One Game a Week jam data shape.
