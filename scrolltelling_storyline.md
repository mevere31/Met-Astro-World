# Scrolltelling Data Story Blueprint

## Theme
**“From Earthly Objects to Celestial Time: How The Met’s Highlight Works Sit Between Human History and Planetary Cycles.”**

This blueprint is designed for your scrolltelling project and follows your required 6-part structure.  
Because the attached CSV is not available in this runtime, each section includes **fill-in metric slots** you can replace with exact values from your file.

---

## Quick metric pull (so your story uses exact CSV values)

Use this once on your CSV to populate the `[ ... ]` values below:

```python
import pandas as pd

df = pd.read_csv("YOUR_FILE.csv")

# Typical Met fields (rename if needed)
date_col = "objectBeginDate"
country_col = "country"
classification_col = "classification"

# Basic ranges
min_year = int(df[date_col].dropna().min())
max_year = int(df[date_col].dropna().max())
span_years = max_year - min_year

# Creation geography
geo = (df[country_col].fillna("Unknown")
         .value_counts()
         .rename_axis("country")
         .reset_index(name="count"))
top5_share = geo.head(5)["count"].sum() / len(df) * 100

# Category patterns
top_class = df[classification_col].fillna("Unknown").value_counts().head(5)

print(min_year, max_year, span_years, top5_share)
print(geo.head(10))
print(top_class)
```

---

## 1) Introduction (Hook + Scope)

### Narrative copy
“This story follows **[N] highlight objects** from The Met, made between **[MIN_YEAR] and [MAX_YEAR]** — a span of **[SPAN_YEARS] years**.  
That is roughly **[SPAN_YEARS / 80] human lifetimes** of making, believing, celebrating, and surviving.”

### Data insight to show
- Total objects in your selected set: `[N]`
- Time span: `[MIN_YEAR]` to `[MAX_YEAR]`
- Coverage in years: `[SPAN_YEARS]`

### Visual element
- **Full-screen timeline ribbon** (left = oldest, right = newest)
- Intro collage of 6-10 highlight object images
- Subtle star field background that increases in visibility as user scrolls

### Transition
- Objects “drop” onto the timeline as dots, leading into distribution patterns.

---

## 2) Patterns in the dataset (What appears most often)

### Narrative copy
“Not all highlight objects are evenly distributed.  
Creation clusters appear around **[TOP_ERA_1]**, **[TOP_ERA_2]**, and **[TOP_ERA_3]**, with **[TOP_CATEGORY]** as the largest object type.”

### Data insight to show
- Top 3 century/era bins by count
- Top 5 classifications (paintings, textiles, sculpture, etc.)
- Optional: rolling 50-year average to smooth noisy periods

### Visual element
- **Ridgeline or density plot** of object creation year
- **Horizontal bar chart** for top classifications
- Annotated peaks with plain-language notes:
  - “This peak equals about **[X objects per generation]**.”

### Transition
- The highest bars morph into map markers, moving from “when” to “where.”

---

## 3) Where objects were created (Geography)

### Narrative copy
“These highlights were made across many geographies, but creation is concentrated: the top five places account for **[TOP5_SHARE]%** of all objects.”

### Data insight to show
- Top 10 countries/regions by object count
- Share of total represented by top 5
- Count of objects with unknown/uncertain geography (important for transparency)

### Visual element
- **Choropleth + proportional symbol map**
- Toggle between country and region views
- Hover card: object thumbnail, title, date, country

### Transition
- Map points animate into a horizontal timeline where markers align with major world events.

---

## 4) Object dates vs. historical incidents (Context in human history)

### Narrative copy
“When we place object dates next to major historical incidents, we see culture being made **during** upheaval—not just before or after it.”

### Data insight to show
- % of objects whose creation dates fall within ±25 years of selected incidents
- Example incidents:
  - Black Death period
  - Mongol expansions
  - European colonial expansions
  - Industrial Revolution
  - World Wars

### Visual element
- **Layered timeline**:
  - Lane A: object creation dots
  - Lane B: incident bands
- Brushing interaction: selecting one incident highlights overlapping objects

### Transition
- Historical bands fade into celestial arcs to introduce transit overlays.

---

## 5) Object dates vs. astrological transits (Symbolic sky layer)

### Narrative copy
“A second reading layers symbolic time: planetary transits.  
We are not claiming causation; this layer asks whether culturally important works cluster around periods people historically framed as collective change.”

### Data insight to show
- Count and % of object dates within windows around selected transits (e.g., ±1 to ±3 years)
- Focus on slower, collective-cycle transits:
  - Jupiter-Saturn conjunctions
  - Saturn sign ingresses
  - Uranus/Neptune/Pluto sign ingresses

### Visual element
- **Dual-axis timeline**:
  - Bottom: object points
  - Top: transit markers and arcs
- Optional “constellation mode”: connect object clusters to nearby transit windows

### Transition
- Collapse both layers into 3 key takeaways cards.

---

## 6) Final thoughts + next steps

### Narrative copy
“This dataset shows three kinds of time at once:  
1) artistic time (objects),  
2) historical time (incidents), and  
3) symbolic time (transits).  
Together, they create a richer way to read cultural memory.”

### Data insight to end on
- 3 strongest quantified takeaways from your CSV
  - Example: “**[X%]** of objects cluster in **[period]**.”
  - Example: “Top geography contributes **[Y%]** of records.”
  - Example: “**[Z%]** lie near selected incident/transit windows.”

### Visual element
- **Summary cards + mini-sparklines**
- CTA buttons:
  - “Explore by place”
  - “Explore by event”
  - “Explore by transit”

### Next-step interactions
- Add filters: medium, department, culture, confidence score of date
- Add a “skeptic mode” toggle that hides transit layer for historical-only reading

---

## Source set (data + latest relevant reading)

### Core data/documentation
1. The Met Open Access Hub (CC0 data, >492,000 open-access images):  
   https://www.metmuseum.org/en/hubs/open-access
2. The Met Collection API docs (>470,000 artworks, field definitions incl. `isHighlight`, `objectBeginDate`, geography fields):  
   https://metmuseum.github.io/
3. The Met Open Access / API impact article (context on usage, metadata expansion):  
   https://www.metmuseum.org/perspectives/met-api-third-anniversary

### Historical incidents data options
4. Wikidata SPARQL Query Service (queryable event dates and entities):  
   https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service
5. Histolines open historical events archive (CSV/JSON snapshots):  
   https://github.com/histolines/Histolines_events_archive

### Planetary/Transit data sources
6. NASA JPL Horizons (authoritative planetary ephemerides):  
   https://ssd.jpl.nasa.gov/horizons/
7. NASA JPL Horizons API documentation:  
   https://ssd-api.jpl.nasa.gov/doc/horizons.html
8. Cafe Astrology 2025 Ephemeris (human-readable sign ingress/station tables):  
   https://cafeastrology.com/2025-ephemeris.html

### Latest and relevant storytelling inspiration
9. The Met press release (Feb 2026): >100 high-fidelity 3D models released under Open Access  
   https://www.metmuseum.org/en/press-releases/3-d-models-announcement-2026
10. The Met “Our First Virtual Worlds” (Nov 2025): virtual experience design, photogrammetry details  
   https://www.metmuseum.org/en/perspectives/our-first-virtual-worlds-atopia
11. Baldoni, Yon, Loiselle (2026), *Metadata for Storytelling* (ITAL):  
   https://ital.corejournals.org/index.php/ital/article/view/17495

---

## Visual style notes inspired by your references

- **From Stefan Pullen’s Van Gogh projects**: use immersive full-screen object-first transitions and generous whitespace.  
- **From Information is Beautiful (Horoscoped)**: use symbolic iconography sparingly, but keep labels explicit and quantified.
- Keep every “poetic” moment paired with one hard metric so lay viewers never lose the data thread.

