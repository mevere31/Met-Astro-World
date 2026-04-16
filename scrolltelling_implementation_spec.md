# Scrolltelling Implementation Spec

## Goal
Implement a scroll-driven data story from `ObjectsvsHistory.csv` with six narrative sections, matching the updated storyline and using **digital typewriter-style typography**.

---

## 1) Inputs and data model

### Source files
- `ObjectsvsHistory.csv` (primary dataset)
- `scrolltelling_storyline.md` (narrative source)

### Required fields
- `Historical Incident`
- `Year` (incident year)
- `Type of Event `
- `Object.ID`
- `Object.Name`
- `Title`
- `Object.Begin.Date` (object creation year)
- `City`
- `Country`

### Data transforms
1. Parse year fields to integers:
   - `incidentYear = parseInt(Year)`
   - `objectYear = parseInt(Object.Begin.Date)`
2. Add derived dimensions:
   - `century = floor((objectYear - 1)/100) + 1`
   - `decade = floor(objectYear / 10) * 10`
3. Create grouped views:
   - Country counts
   - City counts
   - Century histogram
   - Event-type counts
4. Create object-incident proximity metric:
   - `deltaYears = abs(objectYear - incidentYear)` where both years exist
5. Transit proximity helper:
   - Keep arrays of key years (Jupiter-Saturn, Saturn Aries ingress, Uranus Aries ingress)
   - `minTransitDelta = min(abs(objectYear - transitYear))`

---

## 2) Narrative-to-visual mapping

### Section 1: Introduction
- Chart: horizontal timeline (1701-2022) with all object points.
- Overlay cards:
  - 213 rows
  - 212 unique object IDs
  - 321-year span

### Section 2: Patterns
- Chart A: histogram/ridgeline of object years.
- Chart B: century bars.
- Chart C: top decades (1800s, 1920s, 1780s).

### Section 3: Geography
- Chart A: country bar ranking (top 10).
- Chart B: city bubbles (with Paris emphasis).
- Optional map layer if geocoding is added later.

### Section 4: Historical incidents alignment
- Two-lane timeline:
  - Lane A: objectYear points
  - Lane B: incidentYear markers
- Interactive brush by event type.
- Proximity KPI cards (+/-1, +/-5, +/-25 years).

### Section 5: Astrological transits (symbolic)
- Shared x-axis timeline.
- Top lane: transit markers/arcs.
- Bottom lane: object points with density opacity.
- Toggle: history-only vs history+transits.
- Label this section explicitly as non-causal.

### Section 6: Final thoughts
- Three takeaway cards:
  - 18th century strongest cluster
  - Top-5 country concentration 71.36%
  - 94.95% within +/-25 years (paired rows)
- CTA buttons for exploration modes.

---

## 3) Visual design system

### Typography (required)
Use a digital typewriter stack:
```css
font-family: "Special Elite", "Courier Prime", "IBM Plex Mono", "Courier New", monospace;
```

### Color palette
- Background: `#0f1115`
- Primary text: `#f2ead3`
- Muted text: `#b9b39f`
- Accent history: `#d98f5c`
- Accent transit: `#7fa7ff`
- Accent geography: `#6dbf9f`
- Warning/note: `#d6a95f`

### Typewriter treatment
- Slight letter spacing (`0.015em`)
- Soft text shadow for phosphor/ink effect
- Optional cursor blink animation on key headings

---

## 4) Scrolltelling behavior

### Layout
- One full-viewport panel per narrative section.
- Sticky chart region + scrolling text rail.
- Progress indicator on left side.

### Transitions
- Section 1 -> 2: points expand into density peaks.
- Section 2 -> 3: bars morph to country/city circles.
- Section 3 -> 4: circles collapse into timeline events.
- Section 4 -> 5: incident bands fade while transit arcs fade in.
- Section 5 -> 6: arcs collapse into KPI cards.

### Accessibility
- Minimum contrast ratio 4.5:1
- Keyboard navigable section anchors
- Alt text for all object thumbnails

---

## 5) Technical implementation

### Recommended stack
- HTML/CSS/Vanilla JS (fast prototype)
- D3.js for chart rendering/joins
- PapaParse for CSV parsing

### File structure
```
/workspace
  |- ObjectsvsHistory.csv
  |- scrolltelling_storyline.md
  |- scrolltelling_implementation_spec.md
  |- web/
      |- index.html
      |- styles.css
      |- app.js
```

### Runtime
- Serve with Python HTTP server from `/workspace/web`
- Open at `http://localhost:8000`

---

## 6) Validation checklist

- [ ] Typography uses digital typewriter style globally.
- [ ] All 6 narrative sections present.
- [ ] Metrics match storyline values.
- [ ] CSV parsing handles missing years safely.
- [ ] Transit section includes non-causal disclaimer.
- [ ] Localhost preview loads charts and interactions without console errors.

