---
version: 1
slug: "web-v3-index-html"
primary_target: "web_v3/index.html"
related_targets: []
---

---
version: 1
slug: "web-v3-index-html"
primary_target: "web_v3/index.html"
related_targets: []
---

# Surface brief: Vessel Flow Lab, web_v3 (whole app)

Mode: Operate (Home carries the product shot). User-pinned direction: HybriDock-Pep's web design language, with the flow visualization altered to match it. Replaces web_v2's nautical-chart look; same features and same backend protocol.

Audience, job: curious non-experts set a blockage, watch a real flow develop, read three plain-language results, compare runs. States: idle, preparing, running, paused, finished, failed, measuring, cooldown, demo.

## Direction contract

THESIS: A calm, Apple-grade app whose product shot is the live flow itself: a soft, glowing window onto the vessel that floats on Home and stays put beside the controls. It refuses the heavy technical-chart framing and any choppy, stepped motion.

OWN-WORLD: White and true-black surfaces with system-gray groups, one blue accent (swappable), the system font set large and tight, no uppercase labels, hairlines instead of boxes, pill buttons, inset grouped lists, iOS switches and segmented controls, translucent material only where something floats. The flow reads as an indigo-to-coral-to-orange gradient on a soft ground, fine translucent isotach lines, ink streaks with comet trails, and a cool-gray vessel wall; results are glass callout pills with a pulsing dot.

STORY: A visitor sees a gently floating flow, understands from one sentence what it shows, starts in two taps, watches a smooth live view, and ends with a wide, unobstructed flow window and three big plain-language numbers beneath it (the main figure is also pinned to the flow).

FIRST VIEWPORT: Translucent top bar (brand, Simulate, History, Guide, machine status chip, settings). Left: a very large tight headline and one primary pill, Start a simulation (plus a quiet link to the last result when one exists). Right: the floating flow window with a glass callout. Below the fold: four plain facts in one soft panel, recent runs as an inset list, and three large rounded start tiles. On phones the flow window leads and a tab bar replaces the nav links.

SIGNATURE: The floating flow window: frames from the solver are blended on the GPU so motion is continuous at display rate; callout pins ease in (exponential ease-out, no overshoot) when a run ends; on Home the window tilts gently with the pointer and drifts at rest. On Running and Summary the pins are small and show only the figure, the label opens on hover or focus, so nothing covers the flow. Window controls and labels sit in a bar below the window, never over it. On phones the flow starts in a taller close-up crop with only the main pin. Reduced motion holds a still window.

FORM: User-pinned direction, no roll. seed: none (unavailable)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
