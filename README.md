# The Forgotten World and The Salt Shore

Two imaginary places you can walk around in 3D, in a web page. Both use the same small engine.

- **The Forgotten World** (`index.html`): a misty valley at sunset. A ring of stone, a gate, a lake temple,
  a watchtower, an empty village, standing stones, a great arch and a broken aqueduct.
- **The Salt Shore** (`sea.html`): a hot, bright island. A big wrecked ship on the beach, a wooden pier,
  a white village, a lighthouse, a fort with old guns, whale bones, and an idol on a tiny islet you wade to.

Each world hides seven glowing relics; each relic tells a line of the story.

## Run it

There is no build step. Serve this folder with any static server and open `index.html`:

    npx serve .        # or: python3 -m http.server

three.js (r128) is loaded from cdnjs, so you need to be online.

## Controls

- Desktop: click the view once, then just move the mouse to look. `W A S D` or arrow keys walk, `Shift` runs, `Esc` frees the mouse.
  If the browser will not lock the mouse, dragging still works.
- Phone: left thumb walks, right thumb looks around.

## What is in here

| File | What it does |
| --- | --- |
| `index.html`, `sea.html` | One page per world: the words on screen and their styling. |
| `js/core.js` | Noise and the height grid shared by both worlds. |
| `js/valley.js` | The valley: its map, colours, story lines and every ruin. |
| `js/sea.js` | The island: its map, colours, story lines, the ships, pier, lighthouse and the rest. |
| `js/gfx.js` | The sky colour and haze maths that every shader shares; all textures. |
| `js/world.js` | Sky dome, clouds, far mountains, sunlight and shadows, the ground, the stone material. |
| `js/ruins.js` | The building kit: walls, columns, arches and towers stacked from single blocks. |
| `js/flora.js` | Pine and palm trees, bushes, ferns, and the grass that follows you. |
| `js/extras.js` | Lake water with reflections, birds, falling leaves, dust, and the glow / sun-ray pass. |
| `js/game.js` | Start-up, walking and collisions, relics, sound, the frame loop, automatic quality. |

How the look is made, in short:

- One sky-colour function is used by the sky, the haze on every object and the water, so far things fade into the real sky colour.
- Haze is thicker low down and warmer towards the sun.
- Stone is textured from three sides by world position, with moss on top and dirt at the foot.
- Trees are trunks plus many drooping branch cards; grass is about 40,000 small tufts (15,000 on phones) that move with you.
- The lake mirrors the sky everywhere and mirrors the land too on desktop.
- A cheap last pass adds glow, sun rays, a little contrast and grain.
- If frames get slow the page lowers its own quality step by step.

## Assets and licence notes

Everything you see and hear is made by code in this repo: shapes, textures (drawn at start-up) and sound.
**No outside art, models, textures or sounds are used**, so there are no asset licences to record.
three.js is MIT licensed. The mirror camera maths in `js/extras.js` follows the three.js `Reflector` example (MIT).
The title font is Marcellus from Google Fonts (SIL Open Font Licence), with a system serif as fallback.

## Not tested

Both worlds were checked in headless Chromium at desktop and phone sizes. They have not been run on a real phone.
