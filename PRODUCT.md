# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Delegated: no build step. Native ES modules, WebGL and CSS, served as static files by the existing Python server (`python -m web`), so it runs offline and needs no Node. The first front end lives in `web/static`; the redesign lives in `web_v2/`.

## Users
Curious non-experts: students, teachers and science-fair judges. They are at a laptop, usually for a few minutes, and want to change how blocked a blood vessel is and see what happens to the flow. The author also uses the app for research, so raw data and Expert detail must stay reachable, but they are not the primary audience.

## Product Purpose
Make a lattice-Boltzmann arterial-flow simulation understandable to people with no physics background: pick a blockage (stenosis), watch the real flow develop, read three plain-language results, and compare runs. Success is that a layman can say why a narrower vessel makes the liquid faster and needs more pressure. It is an educational tool and explicitly not clinical or medical.

## Positioning
The flow is computed live by a real D2Q9/TRT solver on the user's own computer, not a canned animation. That makes the picture and the numbers actually respond to the settings.

## Operating Context
Local app: `python -m web` starts a server on 127.0.0.1 and opens the browser. One run at a time, each a fresh worker process on the CPU. Frames stream over a WebSocket (binary, 512x128 scalar field, newest frame wins); streaming must cost under 2% of solver speed. After a run the app enforces a cooldown (half the run time, 30 s to 5 min, then until the machine is cool) and shows memory, CPU and thermal warnings while running. Runs that fail are not saved.

## Capabilities and Constraints
- Screens: Home, Setup, Running, Summary (opens automatically when a run ends), History with Compare (last 3 runs kept), Guide.
- Layman controls: stenosis severity (limited to 75%), symmetric or one-sided clot, clot location. Run length: until settled, Quick, Medium, Long, or until stopped.
- Expert panel (collapsed section, no separate mode): tau_s, inlet speed, clot length, lopsidedness, exact step count; raw numbers; the engine's full failure report. Ranges come from measured stability limits; a throat-speed rule (inlet speed / open fraction <= 0.22) keeps runs stable.
- Results: percent blocked, speed-up vs a clear vessel, pressure vs a clear vessel (measured clear-vessel baseline; formula fallback labelled "rough estimate"). Wall shear stress, pressure maps and streamlines are v2.
- Downloads: a zip with settings, summary, velocity profile CSV and final fields, named with the settings.
- A Demo adapter (analytic stand-in, labelled "Demo") runs when no solver is connected.
- The backend protocol (WebSocket JSON + binary frames, `/download/<run>`) is fixed; a front end may not change it.
- CPU only in v1. Packaging and install scripts are handled separately by the author.

## Brand Commitments
Working name "Vessel Flow Lab". No logo or brand assets exist yet.
User-pinned visual direction (after trying a nautical-chart look and finding it less friendly, choppy and unprofessional): follow the HybriDock-Pep web app's design language (Apple-style white / true-black surfaces, system font set large and tight, pill buttons, inset grouped lists, translucent nav, a floating hero, springy motion, a rich feature set), with the flow visualization restyled to match it. Smooth motion is a requirement.

## Evidence on Hand
Real solver output (flow fields, metrics) from the running app. No testimonials, customers or benchmarks exist and none may be invented. Measured facts available to copy: about 220 MLUPS on the author's machine, streaming overhead about 1.4%.

## Product Principles
- Show the real thing: the live flow is the product, not decoration around it.
- Plain words first, numbers second; Expert detail is always one click away and never in the way.
- Honest about limits: simplified 2D model, approximate results, never medical.
- Protect the machine and the user's time: say what is happening, why a wait exists, and what to do when something fails.

## Accessibility & Inclusion
Audience includes classrooms and judges on unfamiliar machines: keyboard operable, readable contrast in light and dark, motion that respects reduced-motion, works at phone width.
