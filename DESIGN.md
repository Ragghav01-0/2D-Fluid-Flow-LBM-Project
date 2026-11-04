---
name: Vessel Flow Lab
description: A plain-spoken, Apple-grade web app for seeing how blood flows past a narrowing in a vessel, built in the HybriDock-Pep design language.
colors:
  accent-blue: "#0071e3"
  accent-blue-dark: "#0a84ff"
  link-blue: "#0066cc"
  accent-ink: "#ffffff"
  page: "#ffffff"
  page-dark: "#000000"
  page-second: "#f5f5f7"
  page-second-dark: "#0a0a0c"
  ink: "#1d1d1f"
  ink-2: "#424245"
  ink-3: "#6e6e73"
  ink-dark: "#f5f5f7"
  ink-2-dark: "#d1d1d6"
  ink-3-dark: "#98989f"
  group: "#f5f5f7"
  group-hover: "#ebebf0"
  group-dark: "#1c1c1e"
  group-hover-dark: "#2c2c2e"
  warn: "#a35200"
  warn-dark: "#ffb340"
  danger: "#d70015"
  danger-dark: "#ff6961"
  ok: "#217a3a"
  ok-dark: "#4cd964"
  demo-ink: "#8a4600"
  stage-ground: "#f5f5f7"
  stage-ground-dark: "#1c1c1e"
  stage-wall: "#8593a8"
  stage-wall-dark: "#a4b2c7"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, system-ui, sans-serif"
    fontSize: "clamp(44px, 7vw, 84px)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, system-ui, sans-serif"
    fontSize: "clamp(32px, 4.4vw, 48px)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.19
    letterSpacing: "-0.018em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: "-0.011em"
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0"
  figure:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', Inter, system-ui, sans-serif"
    fontSize: "clamp(44px, 5vw, 64px)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.045em"
    fontFeature: "tnum"
rounded:
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "28px"
  pill: "980px"
spacing:
  gutter: "clamp(20px, 5vw, 48px)"
  nav-h: "48px"
  max-width: "1180px"
  row-pad: "14px 16px"
  stack: "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent-blue}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "44px"
  button-default:
    backgroundColor: "{colors.group}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "44px"
  button-ghost:
    textColor: "{colors.link-blue}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "44px"
  field:
    backgroundColor: "{colors.group}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
    height: "48px"
  group:
    backgroundColor: "{colors.group}"
    rounded: "{rounded.md}"
  tile:
    backgroundColor: "{colors.group}"
    rounded: "{rounded.xl}"
    padding: "30px"
  flow-window:
    backgroundColor: "{colors.stage-ground}"
    rounded: "{rounded.xl}"
---

# Design System: Vessel Flow Lab

## Overview

**Creative North Star: "The Product Shot"**

The app follows the HybriDock-Pep web app's design language: white and true-black pages, system-grey grouped surfaces, one blue accent, the platform's own font set run large and tight, hairlines instead of boxes, and pill buttons. The flow window is the product shot. It is the one saturated, moving thing on any screen, and everything else is quiet enough to let it read.

Density is calm and generous: a 1180px column, large display type on Home, grouped lists and big tabular figures elsewhere. Depth is mostly tonal (page, then grey group, then glass over the flow). The flow carries the only chromatic range beyond the accent. Plain language is part of the look: figures are large, labels are short, and a small grey technical line sits under the plain one.

The direction was pinned by the user rather than rolled: follow HybriDock-Pep, with the chart restyled to match. The previous nautical-chart look (web_v2) is superseded.

**Key Characteristics:**
- Two appearances, Light, Dark and Auto; `data-theme` is always set explicitly on the root.
- One accent, swappable at runtime from five choices; everything accent-coloured reads `--accent`.
- Grouped grey surfaces and hairlines, not bordered cards.
- Pill buttons, 44px touch height, press scales to 0.97.
- The flow window is the only place with a multi-hue ramp, and it is a GPU canvas.
- Large tabular figures for results; units and plain meaning sit beside them.

## Colors

A neutral Apple-grey system with one blue accent; chroma beyond that lives only inside the flow window.

### Primary
- **Signal Blue** (accent-blue, #0071e3 light / #0a84ff dark): buttons, active step and tab, switches, slider fill, focus ring (at 42% mix), progress. It is the default of five runtime choices (Blue, Indigo #5856d6 / #7d7aff, Green #248a3d / #30d158, Orange #c93400 / #ff9f0a, Pink #d6336c / #ff6482). Choosing one sets both `--accent` and `--link`.
- **Link Blue** (link-blue, #0066cc): text links on white, tuned for 4.5:1.

### Neutral
- **Page White / Page Black** (page, #ffffff; page-dark, #000000): the page. A second tone (#f5f5f7 / #0a0a0c) is reserved for bands below the first screen.
- **Label Ink** (ink #1d1d1f; ink-dark #f5f5f7): primary text. Secondary (#424245 / #d1d1d6) and tertiary (#6e6e73 / #98989f) text step down; tertiary still holds 4.5:1 on page and group.
- **Group Grey** (group #f5f5f7 / #1c1c1e; hover #ebebf0 / #2c2c2e): lists, tiles, stat rows, notices and the flow window ground.
- **Hairline**: black at 12% (strong 24%) in light, white at 16% (strong 30%) in dark, for row dividers and the nav border.
- **Control fill**: grey (118,118,128) at 12% light, 24% dark, for fields, segmented tracks and the ghost state of buttons.

### Status
- **Warn** (#a35200 / #ffb340), **Danger** (#d70015 / #ff6961), **OK** (#217a3a / #4cd964): text and dots; notices tint the group grey with 10-12% of the status colour. The Demo badge uses an amber wash (demo-ink #8a4600).

### Flow window (shader-owned)
The flow ramp is six plain hex stops held in the shader module, separate from the CSS tokens: light #e8eef7, #bcd6fb, #5aa7ff, #5e5ce6, #ff6482, #ff9f0a (pale to hot, slow to fast); dark #1b2433, #173f78, #0a84ff, #7d7aff, #ff6482, #ff9f0a. The vessel wall colour (#8593a8 light, #a4b2c7 dark) and window ground come from `--stage-wall` and `--stage-ground`, which the shader reads as hex because it cannot parse `color-mix()`. The legend gradient and the Guide swatch strip in the stylesheet repeat the same stops by hand. These are three copies of one ramp: change them together.

### Named Rules
**The One Voice Rule.** Blue (or the chosen accent) is the only chromatic UI colour; the flow window is the only multi-hue surface. A screen with a coloured banner, a coloured card and a coloured button has lost the hierarchy.

**The Three Copies Rule.** The flow ramp exists in the shader, the legend gradient and the Guide swatch. They are not tokens and do not inherit. Edit all three or none.

## Typography

**Display, Body and Label Font:** the platform system stack (-apple-system, BlinkMacSystemFont, SF Pro Text / Display, then Inter, system-ui, Segoe UI, Roboto). Inter is bundled as a latin variable woff2 and sits behind the system faces as a deliberate fallback, the same as in HybriDock-Pep. **Mono:** ui-monospace, SF Mono, Menlo, Consolas, declared but little used.

**Character:** Large, tight and confident. Headlines pull letter-spacing in hard (-0.03 to -0.045em) at weight 600; body stays at 17px with a 1.47 line height. Numbers are always tabular.

### Hierarchy
- **Display** (600, clamp 44-84px, 1.02, -0.045em): Home hero headline (reduced to clamp 40-68px in the hero), balanced wrap.
- **Headline / h1** (600, clamp 32-48px, 1.08, -0.03em): screen titles; Running uses clamp 30-42px.
- **h2** (600, clamp 24-32px, 1.125, -0.024em) and **Title / h3** (600, 21px, 1.19): section heads, tile titles.
- **Lede** (400, clamp 19-24px, 1.3, tertiary ink, 30ch).
- **Body** (400, 17px, 1.47, -0.011em); row names 16px weight 500; secondary lines 14-15px.
- **Figure** (600, 38-84px, -0.035 to -0.045em, tabular): the Setup value, Summary result cells, Home fact strip. Callout figures are 22px weight 650 (15px compact).
- **Label** (500, 13px, no tracking): chips, legend, step captions, tab labels (11px weight 500), plus the 13px grey technical line (`.tech`) under plain-language names.

### Named Rules
**The Plain First Rule.** Plain wording leads, the technical term follows in small grey beneath it. Never lead with the symbol.

**The Tabular Rule.** Every changing or compared number uses tabular figures so values do not jitter.

## Layout

A single centred column (max 1180px, gutter clamp 20-48px) under a sticky 48px top bar. Home is a two-column hero (copy and illustration), a four-up fact strip, a recent list and three start tiles. Setup and Running use a split: controls left, a sticky flow window right (340-440px column); below 900px it stacks and the window stops sticking. Running centres a 720px text column under a full-width window. Summary puts a wide window first, then a three-cell result strip and two columns. Below 900px the nav links collapse to a fixed bottom tab bar with 24px icons and 11px labels; the page gains bottom padding for it.

Rhythm: stacks use 28px (22px inside Setup panels), rows 12-16px, list rows 52px minimum, section gaps clamp 40-80px. Corners get generous at the large end (tiles 28px).

Window controls and labels (phase, view toggle, play) live in a bar below the window, never on it, so nothing sits on the flow except callouts. On Running that bar aligns to the 720px text column. The 4:1 window is never stretched: a close-up changes the view and the aspect together. At 600px and below, Summary and Running start in a close-up crop and Summary shows only the main pin; Home callouts drop their secondary line.

### Named Rules
**The No Stretch Rule.** The flow window's aspect follows what it shows (4:1 whole vessel, narrower for a close-up). Never letterbox or scale a frame to fit a slot.

## Elevation & Depth

Hybrid, mostly tonal. Pages are flat; depth comes from the grey group tone and hairlines. Shadows appear only on things that float above content: glass pills, popovers, dialogs, toasts, the Home hero window and slider thumbs. The nav bar is opaque until content scrolls under it, then becomes a thin saturated blur with a hairline.

### Shadow Vocabulary
- **Floating** (`0 0 0 .5px rgba(0,0,0,.06), 0 12px 40px rgba(0,0,0,.14)`; dark `0 0 0 .5px rgba(255,255,255,.1), 0 16px 48px rgba(0,0,0,.7)`): popovers, dialogs, glass, toasts.
- **Hero float** (`0 30px 80px -24px rgba(0,0,0,.28), 0 8px 24px rgba(0,0,0,.08)`): the Home illustration only, with a slow 10px drift and pointer tilt.
- **Glass** (`rgba(255,255,255,.78)` light, `rgba(29,29,31,.72)` dark, saturate 180% and blur 24px): callout pills, tag pills, popovers.

### Named Rules
**The Flat Until Floating Rule.** Surfaces at rest have no shadow. Only elements that hover above content get one, and the flow window itself is flat except on Home.

## Shapes

Soft and rounded, scaled by size: 8px (focus, small), 12px (groups, fields, notices), 18px (glass, dialogs), 28px (flow window, tiles, fact strip), 980px (every button and chip), 50% (icon buttons, pins, ticks). Dividers are hairlines that start 16px in on choice lists. The flow window clips to 28px and isolates its layers.

## Components

### Buttons
- **Shape:** pill (980px), 44px tall (large 52px, small 34px, icon 36px circle).
- **Primary:** accent fill, white text, 22px side padding; hover brightens 10%.
- **Default:** control-fill grey with ink text; hover deepens the grey.
- **Ghost:** transparent with link text, underlines on hover. Danger is red text only.
- **Active:** scales to 0.97. Disabled: 40% opacity, not-allowed.

### Groups and rows
A grouped list is a grey 12px-radius block with hairline separators and 52px rows: name (500, 16px) and grey technical line left, tabular value right. Choice lists add a trailing accent checkmark on the selected row, tinted link blue. Summary lists use a two-column definition grid.

### Inputs / Fields
Control-fill grey, 12px radius, 48px tall, transparent border. Focus: accent border, page-colour fill, 4px accent-soft ring. Sliders: 6px track filled with accent, 28px white thumb. Switches are 51x31 with a white thumb; ticks are 24px circles. Segmented controls: grey track, white thumb segment with a small shadow, 9px outer radius.

### Navigation
Sticky 48px bar: brand left, centred links (14px, tertiary ink, current in ink weight 500), actions right (appearance and accent popover). Accent swatches are 28px circles with a ring on the selected one. Phone: bottom tab bar with the current tab in accent.

### Flow window (signature)
A rounded 28px canvas group: a WebGL layer shows solver colours, the vessel wall is drawn analytically in the shader from the clot parameters (a cosine profile) so it is smooth rather than blocky, and a 2D layer draws drifting streak particles. The shader blends the previous and next solver frames on the GPU every display refresh, so playback is smooth between sparse frames. The Home hero uses an analytic parabolic flow and is labelled "Illustration only". A veil (blur over ground) covers empty or loading states. Reduced motion freezes advance.

### Callouts
Glass pills tied to a white pin with an accent ring by a 1px leader. Home and Setup use the full label (22px figure plus a 12px caption). Running and Summary use compact pins: a 10px pin and the figure only, and the label opens on hover or keyboard focus. Pins pop in with a staggered exponential ease-out.

### Steps, tracks and progress
Setup steps are 4px segments (done at 45% accent, current solid). Running progress is a four-step track of 20px dots (done filled with a tick, active pulsing) and a 4px accent bar. Meters are 6px with ok, warn and critical fills.

### Dialogs, toasts, notices
Dialogs use the page colour at 94% with a 30px blur, 18px radius, a 32% black scrim. Toasts are an ink-coloured pill. Notices are a group tile tinted by status. The compare view is a clipped second window with a white 2px divider and a 44px handle.

### Motion
Three curves: `--ease` (standard, 250ms-ish UI changes), `--ease-sheet` (cubic-bezier .32,.72,0,1, an iOS sheet curve for dialogs, panels, hero entrance, switch thumbs) and `--ease-out` (cubic-bezier .22,1,.36,1, exponential, no overshoot, for pins, pills, thumbs and swatches). Durations 150ms fast, 260ms medium; entrances run 380-900ms. Screens fade up 6px on entry. Reduced motion collapses all durations.

## Do's and Don'ts

### Do:
- **Do** keep the accent as the only UI colour and let the flow window carry the colour range.
- **Do** group with the grey tone and hairlines before reaching for a border or a shadow.
- **Do** give every button the pill shape and a 44px minimum touch height.
- **Do** put window controls and labels in the bar below the window, and show figures through callouts.
- **Do** set `data-theme` explicitly and design both appearances; read flow colours from the shader stops, not from CSS tokens.
- **Do** lead with the plain name and put the technical term in small grey under it.
- **Do** end entrance and pin motion on `--ease-out` or `--ease-sheet`.

### Don't:
- **Don't** stretch the window to fill a slot; change the view and the aspect together.
- **Don't** place labels, controls or banners on top of the flow beyond callouts and the empty-state veil.
- **Don't** introduce a second accent, gradient text or coloured card fills.
- **Don't** add overshoot or bounce easing.
- **Don't** treat the Home illustration as data; it stays labelled "Illustration only".
- **Don't** add flow colours in only one of the three places the ramp lives.

### Not canonized (defects the build carries)
- The compare handle draws its grip with the text glyphs "‹ ›" rather than an inline icon; do not copy it for new controls.
- Several controls carry accent-ring or white values as literals (pin ring, slider thumbs, `#000` start tile) rather than tokens; they are not an invitation for more.
- Inter is the detector's remaining overused-font finding; it is kept only as the fallback behind the system stack.
- Late fixes (Running bar aligned to the text column, Running warnings container hiding when empty, phone Running crop verified on a phone-width load) were checked by the build thread but not re-scored by the reviewer; treat them as fixed, unreviewed.

### Adaptations from the reference (HybriDock-Pep)
Followed as-is: the colour tokens, radii scale (8, 12, 18, pill), `--ease`, `--ease-sheet`, durations, gutter, max width, nav height and the font stack. Adapted: radius `--r-xl` (28px) added for the flow window and tiles; `--ease-out` added; `--stage-ground` and `--stage-wall` replace the reference's protein, peptide and haze tokens; the accent is runtime-swappable (five choices); the reference's molecule viewer is replaced by the flow window with GPU frame blending; a bottom tab bar and compact callouts are new for phones.
