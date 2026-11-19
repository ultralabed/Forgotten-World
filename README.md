# The Forgotten World

An imaginary valley you can walk around in 3D, in a web page.
A ring of stone stands in the middle. Around it are a gate, a lake temple, a watchtower,
an empty village, a circle of standing stones, a great arch on a hill and a broken aqueduct.
Seven glowing relics are hidden among them; each one tells a line of the story.

## Run it

There is no build step. Serve this folder with any static server and open `index.html`:

    npx serve .        # or: python3 -m http.server

three.js (r128) is loaded from cdnjs, so you need to be online.

## Controls

- Desktop: drag to look, `W A S D` or arrow keys to walk, hold `Shift` to run.
- Phone: left thumb walks, right thumb looks around.

## What is in here

| File | What it does |
| --- | --- |
| `index.html` | The page, the words on screen and their styling. |
| `js/core.js` | Noise, the map (where each landmark and path is), the height of the land. |
| `js/gfx.js` | The sky colour and haze maths that every shader shares; all textures. |
| `js/world.js` | Sky dome, clouds, far mountains, sunlight and shadows, the ground, the stone material. |
| `js/ruins.js` | Every ruin, stacked from single stone blocks. |
| `js/flora.js` | Pine trees, bushes, ferns, and the grass that follows you. |
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

It was checked in headless Chromium at desktop and phone sizes. It has not been run on a real phone.
