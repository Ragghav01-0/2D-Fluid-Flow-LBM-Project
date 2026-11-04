---
version: 1
slug: "web-v2-index-html"
primary_target: "web_v2/index.html"
related_targets: []
---

---
version: 1
slug: "web-v2-index-html"
primary_target: "web_v2/index.html"
related_targets: []
---

# Surface brief: Vessel Flow Lab, web_v2 (whole app)

Mode: Operate. Replacement of the web/static front end; same features, same backend protocol.

Audience, job: curious non-experts (classrooms, science-fair judges) set a blockage, watch a real flow develop, read three plain-language results, compare runs. Task states: idle, preparing, running, paused, finished, failed, cooldown, demo.

## Direction contract

THESIS: The vessel is a channel on a hydrographic chart. Flow speed is drawn as depth contours (isotachs) with flow ticks, the clot is land with a hatched shoreline, and each result is a sounding placed on the chart at the throat. It refuses the category default of rainbow heatmap inside rounded cards.

OWN-WORLD: Chart paper white-blue ground with shoal-blue tints, buff land, hazard magenta used only for the peak and for failure, sounding-ink navy for text and contours; a night-chart theme with dimmed blues. Archivo (variable width and weight) for everything: italic for water features and labels on the chart, tabular figures for soundings. A neatline graticule frames every chart plate with real tick scales (position along the vessel, height). Crisp 4px corners, 1px ink rules, no soft shadows.

STORY: A visitor sees a living chart of a narrowing channel, understands that blue deepens where the liquid is faster, sets a blockage, and ends with soundings that say how much faster and how much harder the push is.

FIRST VIEWPORT: Slim left rail (brand, Simulate, History, Guide, then status lamps and theme). The main area opens with the headline and the single primary action, Start a simulation (plus a link to the last result when one exists), then one large chart plate (4:1, neatline and tick scales) with a live WebGL isotach field; a title cartouche in its corner reads the product name and "Educational model, not for medical use". The headline leads because a first-time visitor must be told what the chart is before reading it; the plate still fits in the first viewport at 1280x720.

SIGNATURE: Isotach contours with a plotter reveal: when a run ends, the results plot onto the chart as soundings (ring, leader, figure) drawn stroke by stroke. Motion grammar: continuous flow ticks at local speed; one authored plot-in moment per page load and per finished run; everything else responds to input only. Reduced motion holds a still chart.

FORM: Candidate 3 of my grounded list (hydrographic chart), Impeccable's pick; seed: 00cd18d9092b4ad6.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
