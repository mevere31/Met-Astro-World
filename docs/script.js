const app = document.getElementById("app");

const PREFERS_REDUCED_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOTION = {
  enabled: !PREFERS_REDUCED_MOTION,
  durationMs: 520,
  quickMs: 260
};

const SVG_TEXT_FONT = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

let svgMeasureCtx = null;

function measureSvgTextWidth(text, fontSizePx, fontWeight) {
  if (!svgMeasureCtx) {
    svgMeasureCtx = document.createElement("canvas").getContext("2d");
  }
  const w = typeof fontWeight === "number" ? String(fontWeight) : fontWeight;
  svgMeasureCtx.font = `${w} ${fontSizePx}px ${SVG_TEXT_FONT}`;
  return svgMeasureCtx.measureText(text).width;
}

function wrapWordsToWidth(text, maxWidthPx, fontSize, fontWeight) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [""];
  }
  const lines = [];
  let line = "";
  const widthOf = (str) => measureSvgTextWidth(str, fontSize, fontWeight);

  for (const word of words) {
    if (widthOf(word) > maxWidthPx) {
      if (line) {
        lines.push(line);
        line = "";
      }
      let chunk = "";
      for (let i = 0; i < word.length; i += 1) {
        const letter = word[i];
        const trial = chunk + letter;
        if (widthOf(trial) <= maxWidthPx) {
          chunk = trial;
        } else {
          if (chunk) lines.push(chunk);
          chunk = letter;
        }
      }
      if (chunk) line = chunk;
      continue;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (widthOf(candidate) <= maxWidthPx) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fitValueFontSize(text, innerWidthPx, maxSize = 46, minSize = 18) {
  const str = String(text);
  let size = maxSize;
  while (size >= minSize) {
    if (measureSvgTextWidth(str, size, 800) <= innerWidthPx) {
      return size;
    }
    size -= 1;
  }
  return minSize;
}

const HISTORY_ANCHORS = [
  { year: 1789, label: "French Revolution", color: "#ffd27f" },
  { year: 1800, label: "Industrial Revolution midpoint", color: "#7fd6ff" },
  { year: 1914, label: "World War I", color: "#f08ad2" },
  { year: 1939, label: "World War II", color: "#ff8f70" },
  { year: 1960, label: "Post-colonial independence wave", color: "#79e2b0" }
];

const TRANSIT_GROUPS = [
  {
    key: "jupiterSaturn",
    label: "Jupiter-Saturn cycle",
    color: "#b68cff",
    years: [1723, 1743, 1763, 1782, 1802, 1821, 1842, 1861, 1881, 1901, 1921, 1940, 1961, 1980, 2000, 2020]
  },
  {
    key: "saturnAries",
    label: "Saturn in Aries",
    color: "#7fd6ff",
    years: [1758, 1787, 1817, 1846, 1876, 1905, 1935, 1964, 1996]
  },
  {
    key: "uranusAries",
    label: "Uranus in Aries",
    color: "#ffd27f",
    years: [1767, 1851, 1927, 2011]
  }
];

/** Inclusive year ranges between milestone years (section 5 bin shading). */
const TRANSIT_BIN_RANGES = {
  jupiterSaturn: [
    [1723, 1741],
    [1742, 1762],
    [1763, 1781],
    [1782, 1801],
    [1802, 1820],
    [1821, 1841],
    [1842, 1860],
    [1861, 1880],
    [1881, 1900],
    [1901, 1920],
    [1921, 1939],
    [1940, 1960],
    [1961, 1979],
    [1980, 2000],
    [2001, 2020]
  ],
  saturnAries: [
    [1759, 1761],
    [1789, 1791],
    [1819, 1821],
    [1849, 1851],
    [1878, 1881],
    [1909, 1912],
    [1937, 1939],
    [1967, 1969],
    [1996, 1999]
  ],
  uranusAries: [
    [1767, 1774],
    [1851, 1859],
    [1927, 1927],
    [2011, 2018]
  ]
};

const DEFAULT_TRANSIT_WINDOW_YEARS = 5;

const MET_OBJECT_CACHE = new Map();
const MET_STEPS_FALLBACK_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/7/70/Metropolitan_Museum_of_Art_entrance_NYC.JPG";

function getMetObjectUrl(objectId) {
  return `https://www.metmuseum.org/art/collection/search/${objectId}`;
}

async function fetchMetObject(objectId) {
  if (!Number.isFinite(objectId)) {
    return null;
  }
  if (MET_OBJECT_CACHE.has(objectId)) {
    return MET_OBJECT_CACHE.get(objectId);
  }

  const request = fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectId}`)
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);

  MET_OBJECT_CACHE.set(objectId, request);
  return request;
}

fetch(new URL("./ObjectsvsHistory.csv", import.meta.url))
  .then((response) => response.text())
  .then((csvText) => {
    const records = parseCSV(csvText);
    renderPage(records);
  })
  .catch((error) => {
    console.error(error);
    app.className = "loading";
    const message = error instanceof Error ? error.message : String(error);
    app.textContent = `Unable to load or process ObjectsvsHistory.csv (${message}).`;
  });

window.addEventListener("error", (event) => {
  const error = event?.error;
  if (!error) return;
  if (!app || !app.classList.contains("loading")) return;
  app.textContent = `Prototype error: ${error.message || String(error)}`;
});

function renderPage(records) {
  const analytics = computeAnalytics(records);
  const eventTypes = analytics.topEventTypes.map((entry) => entry.label);
  const cities = analytics.topCities.map((entry) => entry.label);
  app.className = "";
  app.innerHTML = `
  <header class="masthead" id="masthead">
    <div class="astro-sky" aria-hidden="true"></div>
    <svg class="zodiac-wheel" viewBox="0 0 1000 1000" aria-hidden="true">
  <defs>
    <!-- A real circle made of two arcs -->
    <path id="zodiacPath"
      d="M 500 120
         A 380 380 0 1 1 500 880
         A 380 380 0 1 1 500 120" />
  </defs>

  <text class="zodiac-wheel__text">
    <textPath href="#zodiacPath" startOffset="50%" text-anchor="middle">
      ♈︎  ♉︎  ♊︎  ♋︎  ♌︎  ♍︎  ♎︎  ♏︎  ♐︎  ♑︎  ♒︎  ♓︎
    </textPath>
  </text>
</svg>
    <div class="masthead__inner">
      <span class="eyebrow">Met Astro World</span>
      <h1>From Earthly Objects to Celestial Time: How The Met Collection's Highlights Objects Sit Between Human History and Planetary Cycles</h1>
      <p class="lede">
        This narrative follows a sample of ${analytics.totalRows} objects in the Met Collection designated as “Highlights”.
        These objects were created in years connected to important historical incidents between ${analytics.objectRange.min} and ${analytics.objectRange.max}.
        These objects represent ${analytics.objectRange.span} years of cultural production.
      </p>
      <a class="masthead__btn" href="#section-01">Skip to Section 01</a>
    </div>
  </header>

  <main class="page" id="section-01">
      <section class="story-shell">
        <section class="story">
          <article class="story-step story-step--hero is-active" data-step="intro">
            <div class="copy-card">
              <div class="step-topline">
                <span class="eyebrow">01 | Overview</span>
              </div>
              <h2>321 years of cultural production set against historical and celestial change.</h2>
              <p class="lede">
                The Met Museum was founded in 1870 and as of 2026 is 156 years old. A few of the objects in this
                collection were acquired as early as 1889.
              </p>
              <div class="metric-grid">
                <div class="metric"><strong>${analytics.totalRows}</strong><span>Total Objects in Sample</span></div>
                <div class="metric"><strong>${analytics.objectRange.span}</strong><span>Years of Cultural Production</span></div>
                <div class="metric"><strong>${analytics.objectRange.min}</strong><span>Earliest Object Year</span></div>
                <div class="metric"><strong>${analytics.objectRange.max}</strong><span>Latest Object Year</span></div>
              </div>
            </div>
            <div class="step-controls" data-step-scope="intro" aria-label="Overview controls">
              <div class="panel-controls">
                <label class="control">
                  <span class="control-label">Country focus</span>
                  <select class="control-select" data-country>
                    <option value="all">All countries</option>
                    ${analytics.topCountries.slice(0, 10).map((country) => `<option value="${escapeHTML(country.label)}">${escapeHTML(country.label)}</option>`).join("")}
                  </select>
                </label>
                <label class="control">
                  <span class="control-label">City</span>
                  <select class="control-select" data-city>
                    <option value="all">All cities</option>
                    ${cities.slice(0, 12).map((city) => `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`).join("")}
                  </select>
                </label>
                <label class="control">
                  <span class="control-label">Event type</span>
                  <select class="control-select" data-event>
                    <option value="all">All event types</option>
                    ${eventTypes.map((type) => `<option value="${escapeHTML(type)}">${escapeHTML(type)}</option>`).join("")}
                  </select>
                </label>
                <button type="button" class="control-reset" data-reset>Reset filters</button>
              </div>
              <div class="panel-toggles">
                <div class="toggle-group" role="group" aria-label="Geography view toggle">
                  <button type="button" class="toggle is-active" data-geo-mode="country">Country view</button>
                  <button type="button" class="toggle" data-geo-mode="city">City view</button>
                </div>
                <div class="toggle-group" role="group" aria-label="Transit overlay toggle">
                  <button type="button" class="toggle" data-transit-mode="history-only">History only</button>
                  <button type="button" class="toggle is-active" data-transit-mode="history-plus-transits">History + transits</button>
                </div>
              </div>
            </div>
            <div class="step-viz">
              <svg class="step-viz__svg" data-step-viz="intro" viewBox="0 0 860 820" preserveAspectRatio="xMidYMid meet"></svg>
            </div>
          </article>

          <article class="story-step" data-step="patterns">
            <div class="copy-card">
              <div class="step-topline">
                <span class="eyebrow">02 | Temporal Distribution</span>
              </div>
              <h2>These objects are not evenly spread in time.</h2>
              <p>
                They are heavily concentrated in the 18th century, with additional dense clusters in the 20th and 19th centuries.
                About <strong>${formatPercent(analytics.pre1900Share)}</strong> of rows were created between 1700 and 1899.
              </p>
              <ul class="insight-list">
                <li>18th century: <strong>${analytics.centuries["18th"]}</strong> (42.25%)</li>
                <li>19th century: <strong>${analytics.centuries["19th"]}</strong> (25.35%)</li>
                <li>20th century: <strong>${analytics.centuries["20th"]}</strong> (28.17%)</li>
                <li>21st century: <strong>${analytics.centuries["21st"]}</strong> (4.23%)</li>
              </ul>
            </div>
            <div class="step-controls" data-step-scope="patterns" aria-label="Temporal distribution controls">
              <div class="panel-controls">
                <label class="control">
                  <span class="control-label">Country focus</span>
                  <select class="control-select" data-country>
                    <option value="all">All countries</option>
                    ${analytics.topCountries.slice(0, 10).map((country) => `<option value="${escapeHTML(country.label)}">${escapeHTML(country.label)}</option>`).join("")}
                  </select>
                </label>
                <label class="control">
                  <span class="control-label">City</span>
                  <select class="control-select" data-city>
                    <option value="all">All cities</option>
                    ${cities.slice(0, 12).map((city) => `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`).join("")}
                  </select>
                </label>
                <label class="control">
                  <span class="control-label">Event type</span>
                  <select class="control-select" data-event>
                    <option value="all">All event types</option>
                    ${eventTypes.map((type) => `<option value="${escapeHTML(type)}">${escapeHTML(type)}</option>`).join("")}
                  </select>
                </label>
                <button type="button" class="control-reset" data-reset>Reset filters</button>
              </div>
              <div class="panel-toggles">
                <div class="toggle-group" role="group" aria-label="Geography view toggle">
                  <button type="button" class="toggle is-active" data-geo-mode="country">Country view</button>
                  <button type="button" class="toggle" data-geo-mode="city">City view</button>
                </div>
                <div class="toggle-group" role="group" aria-label="Transit overlay toggle">
                  <button type="button" class="toggle" data-transit-mode="history-only">History only</button>
                  <button type="button" class="toggle is-active" data-transit-mode="history-plus-transits">History + transits</button>
                </div>
              </div>
            </div>
            <div class="step-viz">
              <svg class="step-viz__svg" data-step-viz="patterns" viewBox="0 0 860 820" preserveAspectRatio="xMidYMid meet"></svg>
            </div>
          </article>

          <article class="story-step" data-step="geography">
            <div class="copy-card">
              <div class="step-topline">
                <span class="eyebrow">03 | Geographic Concentration</span>
              </div>
              <h2>The objects are globally distributed, but strongly concentrated.</h2>
              <p>
                The top five countries account for <strong>${formatPercent(analytics.topFiveShare)}</strong> of all records.
                Roughly 2 out of every 5 objects in this file were created in Paris. It is important to note that most objects designated as "Highlights" hail from European countries. 
                Within the sample and broader collection, data in the Met Collection API for objects from non-Western/European countries is riddled with missing values and images. Those objects are also underrepresented in the "isHighlight" designation. 
              </p>
              <ul class="insight-list">
                ${analytics.topCountries.slice(0, 5).map((country, index) => `
                  <li>${index + 1}. <strong>${escapeHTML(country.label)}</strong>: ${country.count} rows</li>
                `).join("")}
              </ul>
            </div>
            <div class="step-controls" data-step-scope="geography" aria-label="Geography controls">
              <div class="panel-controls">
                <label class="control">
                  <span class="control-label">Country focus</span>
                  <select class="control-select" data-country>
                    <option value="all">All countries</option>
                    ${analytics.topCountries.slice(0, 10).map((country) => `<option value="${escapeHTML(country.label)}">${escapeHTML(country.label)}</option>`).join("")}
                  </select>
                </label>
                <label class="control">
                  <span class="control-label">City</span>
                  <select class="control-select" data-city>
                    <option value="all">All cities</option>
                    ${cities.slice(0, 12).map((city) => `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`).join("")}
                  </select>
                </label>
                <label class="control">
                  <span class="control-label">Event type</span>
                  <select class="control-select" data-event>
                    <option value="all">All event types</option>
                    ${eventTypes.map((type) => `<option value="${escapeHTML(type)}">${escapeHTML(type)}</option>`).join("")}
                  </select>
                </label>
                <button type="button" class="control-reset" data-reset>Reset filters</button>
              </div>
              <div class="panel-toggles">
                <div class="toggle-group" role="group" aria-label="Geography view toggle">
                  <button type="button" class="toggle is-active" data-geo-mode="country">Country view</button>
                  <button type="button" class="toggle" data-geo-mode="city">City view</button>
                </div>
                <div class="toggle-group" role="group" aria-label="Transit overlay toggle">
                  <button type="button" class="toggle" data-transit-mode="history-only">History only</button>
                  <button type="button" class="toggle is-active" data-transit-mode="history-plus-transits">History + transits</button>
                </div>
              </div>
            </div>
            <div class="step-viz">
              <svg class="step-viz__svg" data-step-viz="geography" viewBox="0 0 860 820" preserveAspectRatio="xMidYMid meet"></svg>
            </div>
          </article>

          <article class="story-step" data-step="history">
            <div class="copy-card">
              <div class="step-topline">
                <span class="eyebrow">04 | Object Creation Linked with History</span>
              </div>
              <h2>Object creation dates sit in alignment to historical event dates.</h2>
              <p>
                Most object dates in this project are tightly linked to incident dates, because the dataset is curated as object-incident pairs.
                The median gap is <strong>${analytics.gapMetrics.medianGap}</strong> years.
              </p>
              <div class="metric-grid">
                <div class="metric"><strong>${formatPercent(analytics.gapMetrics.within1)}</strong><span>Within ±1 year of a historical incident</span></div>
                <div class="metric"><strong>${formatPercent(analytics.gapMetrics.within5)}</strong><span>Within ±5 years of a historical incident</span></div>
                <div class="metric"><strong>${formatPercent(analytics.gapMetrics.within25)}</strong><span>Within ±25 years of a historical incident</span></div>
              </div>
            </div>
            <div class="step-controls" data-step-scope="history" aria-label="History controls">
              <div class="panel-controls">
                <label class="control">
                  <span class="control-label">Country focus</span>
                  <select class="control-select" data-country>
                    <option value="all">All countries</option>
                    ${analytics.topCountries.slice(0, 10).map((country) => `<option value="${escapeHTML(country.label)}">${escapeHTML(country.label)}</option>`).join("")}
                  </select>
                </label>
                <label class="control">
                  <span class="control-label">City</span>
                  <select class="control-select" data-city>
                    <option value="all">All cities</option>
                    ${cities.slice(0, 12).map((city) => `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`).join("")}
                  </select>
                </label>
                <label class="control">
                  <span class="control-label">Event type</span>
                  <select class="control-select" data-event>
                    <option value="all">All event types</option>
                    ${eventTypes.map((type) => `<option value="${escapeHTML(type)}">${escapeHTML(type)}</option>`).join("")}
                  </select>
                </label>
                <button type="button" class="control-reset" data-reset>Reset filters</button>
              </div>
              <div class="panel-toggles">
                <div class="toggle-group" role="group" aria-label="Geography view toggle">
                  <button type="button" class="toggle is-active" data-geo-mode="country">Country view</button>
                  <button type="button" class="toggle" data-geo-mode="city">City view</button>
                </div>
                <div class="toggle-group" role="group" aria-label="Transit overlay toggle">
                  <button type="button" class="toggle" data-transit-mode="history-only">History only</button>
                  <button type="button" class="toggle is-active" data-transit-mode="history-plus-transits">History + transits</button>
                </div>
              </div>
            </div>
            <div class="step-viz">
              <svg class="step-viz__svg" data-step-viz="history" viewBox="0 0 860 820" preserveAspectRatio="xMidYMid meet"></svg>
            </div>
          </article>

          <article class="story-step" data-step="transits">
            <div class="copy-card">
              <div class="step-topline">
                <span class="eyebrow">05 | Object Creation Linked with Astrological Transitsr</span>
              </div>
              <h2>This is a symbolic lens, not a causal claim.</h2>
              <p>
                The project asks whether object creation clusters overlap with broad collective-cycle transit windows. Transits represent theongoing, phycial movements of planets in the sky. Astrologers use these movements to predict patterns in everyday life. Transits act as "cosmic timing devices." indicating when specific lessons, opportunities or challenges are likely to occur.
                The following transits feature movements by planets considered generation or era markers in astrology. They represent major, long-lasting life changes, opportunities for growth or signficant challenges. Jupiter, Saturn, and Uranus mark generational changes and societal restructures in astrological terms. Uranus represents technology, innovation, discovery, and all that is progressive. 
                Saturn is associated with restriction and limitation, it ushers in a generation's growth into adulthood and maturity. Jupiter is expansive and teaches reaching for broader purpose, reach, and possiblity.
              </p>
               <p>
               Two of these transits happen in the sign of Aries. When a planet is in Aries it carries a "cardinal fire" energy focused on initiative, boldness, and leadership.
              </p>
            </div>
            <div class="step-controls" data-step-scope="transits" aria-label="Transits controls">
              <div class="panel-controls">
                <label class="control">
                  <span class="control-label">Country focus</span>
                  <select class="control-select" data-country>
                    <option value="all">All countries</option>
                    ${analytics.topCountries.slice(0, 10).map((country) => `<option value="${escapeHTML(country.label)}">${escapeHTML(country.label)}</option>`).join("")}
                  </select>
                </label>
                <label class="control">
                  <span class="control-label">City</span>
                  <select class="control-select" data-city>
                    <option value="all">All cities</option>
                    ${cities.slice(0, 12).map((city) => `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`).join("")}
                  </select>
                </label>
                <label class="control">
                  <span class="control-label">Event type</span>
                  <select class="control-select" data-event>
                    <option value="all">All event types</option>
                    ${eventTypes.map((type) => `<option value="${escapeHTML(type)}">${escapeHTML(type)}</option>`).join("")}
                  </select>
                </label>
                <button type="button" class="control-reset" data-reset>Reset filters</button>
              </div>
              <div class="panel-toggles">
                <div class="toggle-group" role="group" aria-label="Geography view toggle">
                  <button type="button" class="toggle is-active" data-geo-mode="country">Country view</button>
                  <button type="button" class="toggle" data-geo-mode="city">City view</button>
                </div>
                <div class="toggle-group" role="group" aria-label="Transit overlay toggle">
                  <button type="button" class="toggle" data-transit-mode="history-only">History only</button>
                  <button type="button" class="toggle is-active" data-transit-mode="history-plus-transits">History + transits</button>
                </div>
              </div>
            </div>
            <div class="step-viz">
              <svg class="step-viz__svg" data-step-viz="transits" viewBox="0 0 860 820" preserveAspectRatio="xMidYMid meet"></svg>
            </div>
          </article>
          
          <article class="story-step story-step--closing" data-step="takeaways">
            <div class="copy-card">
              <div class="step-topline">
                <span class="eyebrow">06 | Takeaways</span>
              </div>
              <h2>Three temporal spaces, one narrative frame.</h2>
              <p>
                This dataset combines three clocks: object creation dates, historical event dates, and astrological transit dates.
                Seen together, they make cultural memories easier to feel and compare.This project was created with the goal to inspire different ways to interact with Met Data and the The Met Collection API. 
              </p>
              <div class="metric-grid">
                <div class="metric"><strong>${analytics.centuries["18th"]}</strong><span>The 18th century is the largest century cluster. </span></div>
                <div class="metric"><strong>${formatPercent(analytics.topFiveShare)}</strong><span>Most of the objects in this sample come from five countries. </span></div>
                <div class="metric"><strong>${formatPercent(analytics.gapMetrics.within25)}</strong><span>Object creation dates are near historical incidents.</span></div>
              </div>
              <div class="cta-row">
                <a class="cta" href="https://www.metmuseum.org/en/hubs/open-access" target="_blank" rel="noreferrer">Met Open Access</a>
                <a class="cta" href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noreferrer">NASA JPL Horizons</a>
                <a class="cta" href="https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service" target="_blank" rel="noreferrer">Wikidata SPARQL Query Service</a>
                <a class="cta" href="https://github.com/histolines/Histolines_events_archive" target="_blank" rel="noreferrer">Histolines Events Archive</a>
                <a class="cta" href="https://cafeastrology.com/2025-ephemeris.html" target="_blank" rel="noreferrer">Cafe Astrology Ephemeris</a>
              </div>
            </div>
            <div class="step-viz">
              <svg class="step-viz__svg" data-step-viz="takeaways" viewBox="0 0 860 820" preserveAspectRatio="xMidYMid meet"></svg>
            </div>
          </article>
        </section>
      </section>
    </main>
    <div class="tooltip" id="tooltip"></div>
    <aside class="detail-card" id="detail-card">
      <span class="detail-card__eyebrow">Selection</span>
      <h3 id="detail-title">Hover a mark for details</h3>
      <p id="detail-meta">Filters update the story metrics and visual states across the full panel.</p>
      <div class="object-card" id="object-card" data-status="idle">
        <a class="object-card__link" id="object-link" href="#" target="_blank" rel="noreferrer">
          <div class="object-card__media">
            <img id="object-image" alt="" loading="lazy" />
            <div class="object-card__media-fallback" id="object-fallback">
              Image unavailable
            </div>
          </div>
          <div class="object-card__body">
            <div class="object-card__kicker">Met Open Access</div>
            <div class="object-card__title" id="object-card-title">No object selected</div>
            <div class="object-card__meta" id="object-card-meta"></div>
          </div>
        </a>
      </div>
      <dl class="detail-grid">
        <div><dt>Object year</dt><dd id="detail-object-year">-</dd></div>
        <div><dt>Incident year</dt><dd id="detail-event-year">-</dd></div>
        <div><dt>Country</dt><dd id="detail-country">-</dd></div>
        <div><dt>Event type</dt><dd id="detail-event-type">-</dd></div>
      </dl>
    </aside>
  `;

  setupScrollytelling(records);
}

function setupScrollytelling(records) {
  const tooltip = document.getElementById("tooltip");
  const stepNodes = Array.from(document.querySelectorAll(".story-step"));
  const detailCard = {
    title: document.getElementById("detail-title"),
    meta: document.getElementById("detail-meta"),
    objectYear: document.getElementById("detail-object-year"),
    eventYear: document.getElementById("detail-event-year"),
    country: document.getElementById("detail-country"),
    eventType: document.getElementById("detail-event-type"),
    objectCard: document.getElementById("object-card"),
    objectLink: document.getElementById("object-link"),
    objectImage: document.getElementById("object-image"),
    objectFallback: document.getElementById("object-fallback"),
    objectCardTitle: document.getElementById("object-card-title"),
    objectCardMeta: document.getElementById("object-card-meta")
  };

  const stepMeta = {
    intro: "00",
    patterns: "01",
    geography: "02",
    history: "03",
    transits: "04",
    takeaways: "05"
  };

  let currentStep = "intro";
  const baseAnalytics = computeAnalytics(records);

  const ui = {
    tooltip,
    detailCard,
    view: {}
  };
  const renders = {
    intro: (svg, analytics, settings) => renderIntro(svg, analytics, ui, settings),
    patterns: (svg, analytics, settings) => renderPatterns(svg, analytics, ui, settings),
    geography: (svg, analytics, settings) => renderGeography(svg, analytics, ui, settings),
    history: (svg, analytics, settings) => renderHistory(svg, analytics, ui, settings),
    transits: (svg, analytics, settings) => renderTransits(svg, analytics, ui, settings),
    takeaways: (svg, analytics, settings) => renderTakeaways(svg, analytics, ui, settings)
  };

  const perStepSettings = new Map();

  function getStepSettings(step) {
    if (!perStepSettings.has(step)) {
      perStepSettings.set(step, {
        country: "all",
        city: "all",
        eventType: "all",
        geoMode: "country",
        transitMode: "history-plus-transits"
      });
    }
    return perStepSettings.get(step);
  }

  function populateCountryOptions(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = [
      `<option value="all">All countries</option>`,
      ...baseAnalytics.topCountries.slice(0, 24).map((country) => `<option value="${escapeHTML(country.label)}">${escapeHTML(country.label)}</option>`)
    ].join("");
  }

  function populateEventOptions(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = [
      `<option value="all">All event types</option>`,
      ...baseAnalytics.topEventTypes.map((entry) => `<option value="${escapeHTML(entry.label)}">${escapeHTML(entry.label)}</option>`)
    ].join("");
  }

  function populateCityOptions(selectEl, country, eventType) {
    if (!selectEl) return;
    const cities = getCityOptions(records, country, eventType);
    selectEl.innerHTML = [
      `<option value="all">All cities</option>`,
      ...cities.slice(0, 32).map((city) => `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`)
    ].join("");
  }

  function renderStepViz(step) {
    const svg = document.querySelector(`[data-step-viz="${step}"]`);
    const render = renders[step];
    if (!svg || !render) return;
    const settings = getStepSettings(step);
    const stepState = buildState(records, settings.country, settings.city, settings.eventType, 5);
    clearSVG(svg);
    try {
      render(svg, stepState.analytics, settings);
    } catch (error) {
      console.error(error);
      clearSVG(svg);
      appendText(svg, 430, 410, "Visualization error", "middle", "#edf4ff", 22, 800);
      appendText(svg, 430, 448, String(error?.message || error), "middle", "#9cadc6", 14, 500);
    }
  }

  function initStepToolbarControls() {
    document.querySelectorAll(".step-controls[data-step-scope]").forEach((controls) => {
      const step = controls.getAttribute("data-step-scope");
      if (!step || !renders[step]) return;
      const settings = getStepSettings(step);
      const countrySelect = controls.querySelector("[data-country]");
      const citySelect = controls.querySelector("[data-city]");
      const eventSelect = controls.querySelector("[data-event]");
      const resetBtn = controls.querySelector("[data-reset]");
      const geoButtons = Array.from(controls.querySelectorAll("[data-geo-mode]"));
      const transitButtons = Array.from(controls.querySelectorAll("[data-transit-mode]"));

      populateCountryOptions(countrySelect);
      populateEventOptions(eventSelect);
      populateCityOptions(citySelect, settings.country, settings.eventType);

      if (countrySelect) countrySelect.value = settings.country;
      if (eventSelect) eventSelect.value = settings.eventType;
      if (citySelect) citySelect.value = settings.city;

      function syncCityOptions() {
        populateCityOptions(citySelect, settings.country, settings.eventType);
        if (citySelect) {
          const options = Array.from(citySelect.options).map((o) => o.value);
          citySelect.value = options.includes(settings.city) ? settings.city : "all";
          settings.city = citySelect.value;
        }
      }

      function syncToggleActive(buttons, key, value) {
        buttons.forEach((btn) => btn.classList.toggle("is-active", btn.getAttribute(key) === value));
      }

      syncToggleActive(geoButtons, "data-geo-mode", settings.geoMode);
      syncToggleActive(transitButtons, "data-transit-mode", settings.transitMode);

      countrySelect?.addEventListener("change", () => {
        settings.country = countrySelect.value || "all";
        settings.city = "all";
        syncCityOptions();
        renderStepViz(step);
      });

      eventSelect?.addEventListener("change", () => {
        settings.eventType = eventSelect.value || "all";
        settings.city = "all";
        syncCityOptions();
        renderStepViz(step);
      });

      citySelect?.addEventListener("change", () => {
        settings.city = citySelect.value || "all";
        renderStepViz(step);
      });

      geoButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          settings.geoMode = btn.getAttribute("data-geo-mode") || "country";
          syncToggleActive(geoButtons, "data-geo-mode", settings.geoMode);
          renderStepViz(step);
        });
      });

      transitButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          settings.transitMode = btn.getAttribute("data-transit-mode") || "history-plus-transits";
          syncToggleActive(transitButtons, "data-transit-mode", settings.transitMode);
          renderStepViz(step);
        });
      });

      resetBtn?.addEventListener("click", () => {
        settings.country = "all";
        settings.city = "all";
        settings.eventType = "all";
        settings.geoMode = "country";
        settings.transitMode = "history-plus-transits";

        if (countrySelect) countrySelect.value = "all";
        if (eventSelect) eventSelect.value = "all";
        syncCityOptions();
        syncToggleActive(geoButtons, "data-geo-mode", settings.geoMode);
        syncToggleActive(transitButtons, "data-transit-mode", settings.transitMode);
        renderStepViz(step);
      });
    });
  }

  initStepToolbarControls();
  // Initial static renders
  renderStepViz("intro");

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (!visible) {
      return;
    }

    const step = visible.target.dataset.step;
    if (step === currentStep) {
      return;
    }

    currentStep = step;
    renderStepViz(step);
    stepNodes.forEach((node) => {
      node.classList.toggle("is-active", node.dataset.step === step);
    });
  }, { threshold: [0.35, 0.55, 0.75] });

  stepNodes.forEach((step) => observer.observe(step));
  updateDetailCard(detailCard, null, baseAnalytics.totalRows);

  window.addEventListener("mousemove", (event) => {
    tooltip.style.left = `${event.clientX + 18}px`;
    tooltip.style.top = `${event.clientY + 18}px`;
  });
}

function animateFadeIn(node, delayMs = 0, durationMs = MOTION.quickMs) {
  if (!MOTION.enabled) return;
  node.style.opacity = "0";
  node.style.transition = `opacity ${durationMs}ms ease ${delayMs}ms`;
  window.requestAnimationFrame(() => {
    node.style.opacity = "1";
  });
}

function animateCirclePop(node, finalRadius, delayMs = 0, durationMs = MOTION.quickMs) {
  if (!MOTION.enabled) return;
  node.setAttribute("r", "0");
  node.style.opacity = "0.35";
  node.style.transition = `r ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, opacity ${durationMs}ms ease ${delayMs}ms`;
  window.requestAnimationFrame(() => {
    node.setAttribute("r", String(finalRadius));
    node.style.opacity = "1";
  });
}

function animateRectGrow(node, finalY, finalHeight, delayMs = 0, durationMs = MOTION.quickMs) {
  if (!MOTION.enabled) return;
  const startY = finalY + finalHeight;
  node.setAttribute("y", String(startY));
  node.setAttribute("height", "0");
  node.style.opacity = "0.55";
  node.style.transition = `y ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, height ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms, opacity ${durationMs}ms ease ${delayMs}ms`;
  window.requestAnimationFrame(() => {
    node.setAttribute("y", String(finalY));
    node.setAttribute("height", String(finalHeight));
    node.style.opacity = "1";
  });
}

function animatePathDraw(pathNode, delayMs = 0, durationMs = MOTION.durationMs) {
  if (!MOTION.enabled) return;
  try {
    const length = pathNode.getTotalLength();
    pathNode.style.strokeDasharray = `${length}`;
    pathNode.style.strokeDashoffset = `${length}`;
    pathNode.style.opacity = "0.7";
    pathNode.style.transition = `stroke-dashoffset ${durationMs}ms ease ${delayMs}ms, opacity ${durationMs}ms ease ${delayMs}ms`;
    window.requestAnimationFrame(() => {
      pathNode.style.strokeDashoffset = "0";
      pathNode.style.opacity = "1";
    });
  } catch {
    // Some paths may not support getTotalLength.
  }
}

function appendImage(svg, x, y, width, height, href, opacity = 1) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "image");
  node.setAttribute("x", x);
  node.setAttribute("y", y);
  node.setAttribute("width", width);
  node.setAttribute("height", height);
  node.setAttribute("opacity", opacity);
  node.setAttribute("preserveAspectRatio", "xMidYMid slice");
  if (href) {
    node.setAttribute("href", href);
    node.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
  }
  svg.appendChild(node);
  return node;
}

function pickIntroCollageObjectIds(records, count = 12) {
  const candidates = records
    .filter((row) => Number.isFinite(row.objectId) && Number.isFinite(row.objectYear))
    .sort((a, b) => a.objectYear - b.objectYear);
  if (!candidates.length) return [];

  const ids = [];
  const used = new Set();
  const steps = Math.min(count, candidates.length);
  for (let i = 0; i < steps; i += 1) {
    const idx = Math.floor((i / (steps - 1 || 1)) * (candidates.length - 1));
    const row = candidates[idx];
    if (!used.has(row.objectId)) {
      used.add(row.objectId);
      ids.push(row.objectId);
    }
  }
  // Fill any remaining slots with unique IDs (in order) to reach target count.
  for (let i = 0; ids.length < Math.min(count, candidates.length) && i < candidates.length; i += 1) {
    const id = candidates[i].objectId;
    if (!used.has(id)) {
      used.add(id);
      ids.push(id);
    }
  }
  return ids;
}

function renderIntroCollage(svg, analytics) {
  const ids = pickIntroCollageObjectIds(analytics.records || [], 12);
  if (!ids.length) return;

  const width = 860;
  const height = 820;
  const cols = 4;
  const rows = 3;
  const padding = 16;
  const gridW = width - padding * 2;
  const gridH = 250;
  const tileW = (gridW - (cols - 1) * 10) / cols;
  const tileH = (gridH - (rows - 1) * 10) / rows;
  const startX = padding;
  const startY = 18;

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  svg.appendChild(defs);

  const key = `${analytics.totalRows}-${analytics.objectRange.min}-${analytics.objectRange.max}`;
  svg.dataset.introKey = key;


  ids.forEach((objectId, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = startX + col * (tileW + 10);
    const y = startY + row * (tileH + 10);

    const clipId = `clip-intro-${index}`;
    const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    clipPath.setAttribute("id", clipId);
    const clipRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    clipRect.setAttribute("x", x);
    clipRect.setAttribute("y", y);
    clipRect.setAttribute("width", tileW);
    clipRect.setAttribute("height", tileH);
    clipRect.setAttribute("rx", "16");
    clipPath.appendChild(clipRect);
    defs.appendChild(clipPath);

    const frame = appendRect(svg, x, y, tileW, tileH, "rgba(255,255,255,0.06)", "rgba(255,255,255,0.16)", 16);
    animateFadeIn(frame, 60 + index * 35, 220);
    const placeholder = appendRect(svg, x, y, tileW, tileH, "rgba(127,214,255,0.08)", "none", 16);
    placeholder.setAttribute("clip-path", `url(#${clipId})`);
    const image = appendImage(svg, x, y, tileW, tileH, "", 0.85);
    image.setAttribute("clip-path", `url(#${clipId})`);
    image.style.filter = "saturate(1.05) contrast(1.02)";
    animateFadeIn(image, 120 + index * 35, 260);

    fetchMetObject(objectId).then((metObject) => {
      if (svg.dataset.introKey !== key) return;
      const href = metObject?.primaryImageSmall || metObject?.primaryImage || "";
      const finalHref = href || MET_STEPS_FALLBACK_IMAGE;
      image.setAttribute("href", finalHref);
      image.setAttributeNS("http://www.w3.org/1999/xlink", "href", finalHref);
      placeholder.setAttribute("fill", "rgba(255,255,255,0.02)");
    });
  });

  // Soft gradient overlay so the collage reads as background texture.
  const overlay = appendRect(svg, padding, startY, gridW, gridH, "rgba(7, 17, 29, 0.18)", "none", 18);
  overlay.setAttribute("opacity", "0.35");
  overlay.style.pointerEvents = "none";
}

function renderIntro(svg, analytics, ui, settings = {}) {
  updateHeader(ui, {
    kicker: "Overview",
    title: "Timeline of object Creation Years",
    description: "Each dot is one record from the filtered dataset, plotted across the full time span of the current selection.",
    footnote: `Filtered view contains ${analytics.totalRows} rows spanning ${analytics.objectRange.span} years.`
  });

  setLegend(ui.legend, [
    { color: "#EC008C", label: "Object row" },
    { color: "#b68cff", label: "Timeline axis" }
  ]);

  clearSVG(svg);

  const width = 860;
  const height = 820;
  const margin = { top: 120, right: 60, bottom: 120, left: 60 };
  const axisY = height / 2;
  const x = scaleLinear(analytics.objectRange.min, analytics.objectRange.max, margin.left, width - margin.right);

  appendText(svg, margin.left, margin.top - 36, `${analytics.objectRange.span} years of object creation`, "start", "#edf4ff", 22, 800);
  appendText(svg, margin.left, margin.top - 14, `From ${analytics.objectRange.min} to ${analytics.objectRange.max}`, "start", "#95a8c8", 14, 600);

  appendAtmosphere(svg, width, height);
  appendLine(svg, margin.left, axisY, width - margin.right, axisY, "#8e77ff", 2, 0.5);

  [analytics.objectRange.min, 1800, 1900, analytics.objectRange.max].forEach((year) => {
    const px = x(year);
    appendLine(svg, px, axisY - 18, px, axisY + 18, "rgba(255,255,255,0.35)", 1, 1);
    appendText(svg, px, axisY + 44, String(year), "middle", "#9cadc6", 14, 500);
  });

 analytics.objectYears.forEach((year, index) => {
  const amplitude = 14 + (index % 5) * 5;
  const y = axisY + Math.sin(index * 0.65) * amplitude;
  const circle = appendCircle(svg, x(year), y, 4.1, "#EC008C", 0.84);
  animateCirclePop(circle, 4.1, Math.min(index, 44) * 6);

  circle.addEventListener("mouseenter", async () => {
    const example = analytics.timelineExamples?.get(year) || null;

    if (!example?.objectId) {
      showTooltip(ui.tooltip, `Year ${year}`);
      return;
    }

    showTooltip(ui.tooltip, `Loading image…<br>Object ID ${example.objectId}<br>Year ${year}`);

    const metObject = await fetchMetObject(example.objectId);
    const href = metObject?.primaryImageSmall || metObject?.primaryImage || MET_STEPS_FALLBACK_IMAGE;

    showTooltip(
      ui.tooltip,
      `<img src="${href}" alt="" style="display:block;width:160px;height:110px;object-fit:cover;border-radius:12px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.14)"/>
<div style="font-weight:700;margin-bottom:4px">Object ID ${example.objectId}</div>
<div style="color:rgba(197,210,234,0.9)">Year ${year}</div>`
    );
  });

  circle.addEventListener("mouseleave", () => hideTooltip(ui.tooltip));
});

applyPlanetOverlay(svg, settings.planet);
}

function renderPatterns(svg, analytics, ui, settings = {}) {
  updateHeader(ui, {
    kicker: "Temporal clustering",
    title: "Density by creation year",
    description: "A smoothed density line reveals how strongly the sample concentrates in the 18th century and then re-forms in later centuries.",
    footnote: analytics.topDecades.length ? `Peak decade: ${analytics.topDecades[0].label} with ${analytics.topDecades[0].count} records.` : "No decade data available for this filter."
  });

  setLegend(ui.legend, [
    { color: "#EC008C", label: "Year density" },
    { color: "#ffd27f", label: "Peak decade annotation" },
    { color: "#79e2b0", label: "Event-type frequency" }
  ]);

  clearSVG(svg);

  const width = 860;
  const height = 820;
  const margin = { top: 90, bottom: 90, left: 66 };
  const legendPanelW = 200;
  const legendOuterPad = 26;
  const legendGap = 24;
  const legendX = width - legendOuterPad - legendPanelW;
  const plotRight = legendX - legendGap;

  const bins = analytics.yearBins;
  const maxBinCount = Math.max(...bins.map((bin) => bin.count), 0);
  const peakDecadeCount =
    analytics.topDecades?.length > 0 ? Math.max(...analytics.topDecades.slice(0, 3).map((decade) => decade.count)) : 0;
  const yDomainMax = Math.max(maxBinCount, peakDecadeCount, 1);
  const yTicks = buildCountAxisTicks(yDomainMax, 5);

  const x = scaleLinear(analytics.objectRange.min, analytics.objectRange.max, margin.left, plotRight);
  const y = scaleLinear(0, yDomainMax, height - margin.bottom, margin.top);

  appendAtmosphere(svg, width, height);
  appendRect(svg, margin.left, margin.top, plotRight - margin.left, height - margin.top - margin.bottom, "rgba(255,255,255,0.015)", "rgba(255,255,255,0.06)", 26);

  yTicks.forEach((tickValue) => {
    const yy = y(tickValue);
    appendLine(svg, margin.left, yy, plotRight, yy, "rgba(255,255,255,0.06)", 1, 1);
  });

  for (let year = 1720; year <= 2020; year += 40) {
    const px = x(year);
    appendLine(svg, px, margin.top, px, height - margin.bottom, "rgba(255,255,255,0.06)", 1, 1);
    appendText(svg, px, height - margin.bottom + 28, String(year), "middle", "#90a0b7", 13, 500);
  }

  appendLine(svg, margin.left, height - margin.bottom, plotRight, height - margin.bottom, "rgba(255,255,255,0.4)", 1.2, 1);
  appendLine(svg, margin.left, margin.top, margin.left, height - margin.bottom, "rgba(255,255,255,0.22)", 1.2, 1);

  const yAxisLabelX = margin.left - 10;
  yTicks.forEach((tickValue) => {
    const yy = y(tickValue);
    appendLine(svg, margin.left - 6, yy, margin.left, yy, "rgba(255,255,255,0.28)", 1, 1);
    appendText(svg, yAxisLabelX, yy + 4, String(tickValue), "end", "#90a0b7", 12, 500);
  });

  const path = bins.map((bin, index) => `${index === 0 ? "M" : "L"} ${x(bin.year)} ${y(bin.count)}`).join(" ");
  const fillPath = `${path} L ${x(bins[bins.length - 1].year)} ${height - margin.bottom} L ${x(bins[0].year)} ${height - margin.bottom} Z`;
  appendPath(svg, fillPath, "rgba(127, 214, 255, 0.18)", "none", 0);
  const densityLine = appendPath(svg, path, "none", "#000080", 4, 0.98);
  animatePathDraw(densityLine, 60, 560);

  analytics.topDecades.slice(0, 3).forEach((decade) => {
    const px = x(decade.year);
    const py = y(decade.count);
    appendCircle(svg, px, py, 7.5, "#ffd27f", 1);
    appendText(svg, px, py - 18, `${decade.label} / ${decade.count}`, "middle", "#ffd27f", 13, 700);
  });

  appendText(svg, margin.left, margin.top - 26, "Object count", "start", "#95a8c8", 14, 650);

  // Optional sidebar: event-type frequency (fixed strip along the SVG right edge).
  if (analytics.topEventTypes?.length) {
    const sidebarX = legendX;
    const sidebarY = margin.top + 18;
    const sidebarW = legendPanelW;
    const rowH = 18;
    const maxRows = 10;
    const list = analytics.topEventTypes.slice(0, maxRows);
    const maxCount = Math.max(...list.map((d) => d.count), 1);

    appendText(svg, sidebarX, sidebarY - 12, "Event types (top)", "start", "#95a8c8", 12, 700);
    list.forEach((entry, idx) => {
      const y0 = sidebarY + idx * (rowH + 10);
      const label = entry.label.length > 18 ? `${entry.label.slice(0, 18)}…` : entry.label;
      appendText(svg, sidebarX, y0 + 12, label, "start", "#c5d2ea", 12, 600);

      const barW = (entry.count / maxCount) * sidebarW;
      const bar = appendRect(svg, sidebarX, y0 + 18, barW, 8, "rgba(121,226,176,0.7)", "none", 6);
      animateFadeIn(bar, 180 + idx * 50, 240);

      bar.addEventListener("mouseenter", () => {
        showTooltip(ui.tooltip, `${escapeHTML(entry.label)}<br>${entry.count} rows (${formatPercent(entry.share)})`);
        const example = analytics.eventTypeExamples?.get(entry.label) || null;
        updateDetailCard(ui.detailCard, example, analytics.totalRows);
      });
      bar.addEventListener("mouseleave", () => hideTooltip(ui.tooltip));
    });
  }

  applyPlanetOverlay(svg, settings.planet);
}

function renderGeography(svg, analytics, ui, settings = {}) {
  const mode = settings.geoMode === "city" ? "city" : "country";
  clearSVG(svg);

  const width = 860;
  const height = 820;
  const centerX = width / 2;
  const centerY = height / 2 + 32;
  const layout = [
    [0, -165], [-200, -74], [204, -68], [-238, 136], [226, 144],
    [0, 205], [-96, 38], [94, 42], [-305, 20], [306, 12]
  ];

  appendAtmosphere(svg, width, height);

  if (mode === "city") {
    updateHeader(ui, {
      kicker: "Geographic concentration",
      title: "Top cities in the sample",
      description: "City view highlights urban hotspots (including metadata caveats like Unknown city). Bubble size encodes the number of rows tagged to each city.",
      footnote: `Paris appears in ${analytics.cityMetrics.parisCount} rows; unknown city metadata appears in ${analytics.cityMetrics.unknownCount}.`
    });

    setLegend(ui.legend, [
      { color: "#ffd27f", label: "Known city" },
      { color: "#9cadc6", label: "Unknown city" }
    ]);

    const cities = (analytics.topCities || []).slice(0, 10);
    if (!cities.length) {
      appendText(svg, width / 2, height / 2, "No city data available for this filter.", "middle", "#9cadc6", 16, 600);
      return;
    }

    cities.forEach((city, index) => {
      const [dx, dy] = layout[index] || [0, 0];
      const radius = 20 + (city.count / cities[0].count) * 92;
      const isUnknown = city.label === "Unknown city" || city.label === "Unknown";
      const fill = isUnknown ? "#9cadc6" : "#ffd27f";
      const circle = appendCircle(svg, centerX + dx, centerY + dy, radius, fill, 0.78);
      animateCirclePop(circle, radius, index * 70);
      circle.setAttribute("stroke", "rgba(255,255,255,0.16)");
      circle.setAttribute("stroke-width", "1");
      circle.addEventListener("mouseenter", () => {
        showTooltip(ui.tooltip, `${escapeHTML(city.label)}<br>${city.count} rows<br>${formatPercent(city.share)} of sample`);
        updateDetailCard(ui.detailCard, analytics.cityExamples?.get(city.label) || null, analytics.totalRows);
      });
      circle.addEventListener("mouseleave", () => hideTooltip(ui.tooltip));

      appendText(svg, centerX + dx, centerY + dy - 6, city.label, "middle", "#08111f", Math.max(11, Math.min(14, radius / 5)), 760);
      appendText(svg, centerX + dx, centerY + dy + 16, `${city.count}`, "middle", "#08111f", 13, 600);
    });

    appendText(svg, width / 2, 82, "City hotspots in the dataset", "middle", "#edf4ff", 26, 720);
    appendText(svg, width / 2, 114, "Switch back to Country view to see national concentration", "middle", "#95a8c8", 15, 500);
    return;
  }

  updateHeader(ui, {
    kicker: "Geographic concentration",
    title: "Top countries in the sample",
    description: "Country view emphasizes how strongly the sample concentrates in a few places. Bubble size encodes country counts.",
    footnote: `Paris appears in ${analytics.cityMetrics.parisCount} rows; unknown city metadata appears in ${analytics.cityMetrics.unknownCount}.`
  });

  setLegend(ui.legend, [
    { color: "#ffb56b", label: "Top five countries" },
    { color: "#79e2b0", label: "Remaining top ten" }
  ]);

  const countries = analytics.topCountries.slice(0, 10);
  countries.forEach((country, index) => {
    const [dx, dy] = layout[index] || [0, 0];
    const radius = 20 + (country.count / countries[0].count) * 92;
    const isTopFive = index < 5;
    const fill = isTopFive ? "#ffb56b" : "#79e2b0";
    const circle = appendCircle(svg, centerX + dx, centerY + dy, radius, fill, 0.78);
    animateCirclePop(circle, radius, index * 70);
    circle.setAttribute("stroke", "rgba(255,255,255,0.16)");
    circle.setAttribute("stroke-width", "1");
    circle.addEventListener("mouseenter", () => {
      showTooltip(ui.tooltip, `${escapeHTML(country.label)}<br>${country.count} rows<br>${formatPercent(country.share)} of sample`);
      updateDetailCard(ui.detailCard, analytics.countryExamples.get(country.label) || null, analytics.totalRows);
    });
    circle.addEventListener("mouseleave", () => hideTooltip(ui.tooltip));

    appendText(svg, centerX + dx, centerY + dy - 6, country.label, "middle", "#08111f", Math.max(11, Math.min(14, radius / 5)), 760);
    appendText(svg, centerX + dx, centerY + dy + 16, `${country.count}`, "middle", "#08111f", 13, 600);
  });

  appendText(svg, width / 2, 82, `${formatPercent(analytics.topFiveShare)} of the sample comes from just five countries`, "middle", "#edf4ff", 26, 720);
  appendText(svg, width / 2, 114, "Toggle to City view to see hotspots like Paris", "middle", "#95a8c8", 15, 500);

  applyPlanetOverlay(svg, settings.planet);
}

function renderHistory(svg, analytics, ui, settings = {}) {
  updateHeader(ui, {
    kicker: "Object vs event years",
    title: "Two-lane history alignment view",
    description: "Connection lines link object creation years to paired incident years, showing just how tight the timeline relationships are.",
    footnote: `${analytics.gapMetrics.validPairs} valid object-event pairs; ${formatPercent(analytics.gapMetrics.within25)} fall within ±25 years.`
  });

  setLegend(ui.legend, [
    { color: "#EC008C", label: "Object year" },
    { color: "#ffd27f", label: "Incident year" },
    { color: "#f08ad2", label: "World-history anchors" }
  ]);

  clearSVG(svg);

  const width = 860;
  const height = 820;
  const margin = { top: 120, right: 46, bottom: 100, left: 46 };
  const topLane = 270;
  const bottomLane = 560;
  const x = scaleLinear(analytics.objectRange.min, analytics.incidentRange.max, margin.left, width - margin.right);

  appendAtmosphere(svg, width, height);
  appendLine(svg, margin.left, topLane, width - margin.right, topLane, "rgba(127,214,255,0.8)", 2, 1);
  appendLine(svg, margin.left, bottomLane, width - margin.right, bottomLane, "rgba(255,210,127,0.8)", 2, 1);
  appendText(svg, margin.left, topLane - 24, "Object year", "start", "#EC008C", 15, 700);
  appendText(svg, margin.left, bottomLane + 36, "Incident year", "start", "#ffd27f", 15, 700);

  HISTORY_ANCHORS.forEach((anchor) => {
    const px = x(anchor.year);
    appendLine(svg, px, margin.top, px, height - margin.bottom, anchor.color, 1.2, 0.28);
    appendText(svg, px, margin.top - 18, anchor.label, "middle", anchor.color, 12, 600, -30);
  });

  analytics.validPairs.slice(0, 160).forEach((pair, index) => {
    const objectX = x(pair.objectYear);
    const eventX = x(pair.eventYear);
    const path = `M ${objectX} ${topLane} C ${objectX} ${(topLane + bottomLane) / 2}, ${eventX} ${(topLane + bottomLane) / 2}, ${eventX} ${bottomLane}`;
    const stroke = pair.gap <= 1 ? "#79e2b0" : "rgba(255,255,255,0.12)";
    const line = appendPath(svg, path, "none", stroke, 1.2, 0.42);
    const objectDot = appendCircle(svg, objectX, topLane + ((index % 7) - 3) * 6, 3.5, "#EC008C", 0.86);
    const eventDot = appendCircle(svg, eventX, bottomLane + ((index % 7) - 3) * 6, 3.5, "#ffd27f", 0.86);
    animateFadeIn(line, Math.min(index, 40) * 8, 360);
    animateCirclePop(objectDot, 3.5, Math.min(index, 60) * 5, 240);
    animateCirclePop(eventDot, 3.5, Math.min(index, 60) * 5 + 50, 240);

    [line, objectDot, eventDot].forEach((node) => {
      node.addEventListener("mouseenter", () => {
        showTooltip(ui.tooltip, `<strong>${escapeHTML(pair.title || pair.objectName || "Untitled object")}</strong><br>Object year: ${pair.objectYear}<br>Incident year: ${pair.eventYear}<br>Gap: ${pair.gap} years`);
        updateDetailCard(ui.detailCard, pair, analytics.totalRows);
      });
      node.addEventListener("mouseleave", () => hideTooltip(ui.tooltip));
    });
  });

  [1701, 1789, 1800, 1900, 1939, 2022].forEach((year) => {
    appendText(svg, x(year), height - margin.bottom + 34, String(year), "middle", "#95a8c8", 13, 500);
  });

  applyPlanetOverlay(svg, settings.planet);
}

function appendTransitBinBands(svg, xScale, transitLane, objectLane, yearBins, fill) {
  const pad = 4;
  const top = transitLane + pad;
  const h = objectLane - transitLane - pad * 2;
  if (h <= 1 || !yearBins?.length) {
    return;
  }
  yearBins.forEach(([start, end]) => {
    const x0 = xScale(start);
    const x1 = xScale(end + 1);
    const w = Math.max(1, x1 - x0);
    appendRect(svg, x0, top, w, h, fill, "none", 0);
  });
}

function renderTransits(svg, analytics, ui, settings = {}) {
  const transitsEnabled = settings.transitMode !== "history-only";
  updateHeader(ui, {
    kicker: "Symbolic sky layer",
    title: transitsEnabled ? "Objects and transit milestone windows" : "History-only baseline (no transits)",
    description: transitsEnabled
      ? "Transit markers sit above the shared x-axis while object creation years stay grounded below."
      : "This view hides the transit layer so you can compare the same objects against world-history anchors only.",
    footnote: transitsEnabled
      ? "These year-window checks are exploratory and should later be upgraded with precise ephemeris timestamps."
      : "Toggle transits back on to compare against symbolic milestone windows."
  });

  setLegend(ui.legend, transitsEnabled
    ? [
      { color: "#b68cff", label: "Jupiter-Saturn" },
      { color: "#7fd6ff", label: "Saturn in Aries" },
      { color: "#ffd27f", label: "Uranus in Aries" },
      { color: "#7fd6ff", label: "Object year" }
    ]
    : [
      { color: "#7fd6ff", label: "Object year" },
      { color: "#f08ad2", label: "World-history anchors" }
    ]);

  clearSVG(svg);

  const width = 860;
  const height = 820;
  const margin = { top: 120, right: 40, bottom: 100, left: 50 };
  const transitMilestoneTitleY = margin.top + 12;
  const transitLane = 262;
  const objectLane = 398;
  const objectLaneTitleY = objectLane + 62;
  const legendX = width - 228;
  const legendY = margin.top + 10;
  const x = scaleLinear(analytics.objectRange.min, analytics.objectRange.max, margin.left, width - margin.right);

  appendAtmosphere(svg, width, height);
  if (transitsEnabled) {
    appendTransitBinBands(svg, x, transitLane, objectLane, TRANSIT_BIN_RANGES.jupiterSaturn, "rgba(182, 140, 255, 0.11)");
    appendTransitBinBands(svg, x, transitLane, objectLane, TRANSIT_BIN_RANGES.saturnAries, "rgba(127, 214, 255, 0.14)");
    appendTransitBinBands(svg, x, transitLane, objectLane, TRANSIT_BIN_RANGES.uranusAries, "rgba(255, 210, 127, 0.14)");
    appendLine(svg, margin.left, transitLane, width - margin.right, transitLane, "rgba(255,255,255,0.32)", 1.5, 1);
    appendText(svg, margin.left, transitMilestoneTitleY, "Transit milestones", "start", "#edf4ff", 15, 700);
  }
  appendLine(svg, margin.left, objectLane, width - margin.right, objectLane, "rgba(127,214,255,0.7)", 2, 1);
  appendText(
    svg,
    margin.left,
    objectLaneTitleY,
    transitsEnabled ? "Object creation years" : "Object creation years (history-only)",
    "start",
    "#edf4ff",
    15,
    700
  );

  if (!transitsEnabled) {
    HISTORY_ANCHORS.forEach((anchor) => {
      const px = x(anchor.year);
      appendLine(svg, px, margin.top, px, height - margin.bottom, anchor.color, 1.2, 0.22);
      appendText(svg, px, margin.top - 18, anchor.label, "middle", anchor.color, 12, 600, -30);
    });
  }

  if (transitsEnabled) {
    TRANSIT_GROUPS.forEach((group, groupIndex) => {
      group.years.forEach((year, index) => {
        const px = x(year);
        const y = transitLane - 54 + groupIndex * 52;
        appendLine(svg, px, y + 10, px, objectLane, group.color, 0.9, 0.12);
        const dot = appendCircle(svg, px, y, 6.2, group.color, 0.95);
        animateCirclePop(dot, 6.2, groupIndex * 140 + Math.min(index, 6) * 50, 240);
        dot.addEventListener("mouseenter", () => showTooltip(ui.tooltip, `${group.label}<br>${year}`));
        dot.addEventListener("mouseleave", () => hideTooltip(ui.tooltip));

        if (index < 5 || index === group.years.length - 1) {
          appendText(svg, px, y - 16, String(year), "middle", group.color, 11, 600);
        }
      });
    });
  }

  analytics.objectYears.forEach((year, index) => {
    const jitter = ((index % 15) - 7) * 6;
    const dot = appendCircle(svg, x(year), objectLane + jitter, 3.8, "#EC008C", 0.7);
    animateCirclePop(dot, 3.8, Math.min(index, 70) * 4 + 180, 200);
    dot.addEventListener("mouseenter", () => {
      showTooltip(ui.tooltip, `Object year ${year}`);
      updateDetailCard(ui.detailCard, analytics.timelineExamples.get(year) || null, analytics.totalRows);
    });
    dot.addEventListener("mouseleave", () => hideTooltip(ui.tooltip));
  });

  if (!transitsEnabled) {
    appendSvgLegend(svg, legendX, legendY, [
      { color: "#EC008C", label: "Object creation year" },
      { color: "#f08ad2", label: "World-history anchor" }
    ]);
    applyPlanetOverlay(svg, settings.planet);
    return;
  }

  const cards = [
    ["Jupiter-Saturn ±5", formatPercent(analytics.transitMetrics.jupiterSaturn.plusMinus5), "A conjunction is when two celestial objects line up in the sky during their orbit.Both Jupiter and Saturn are outer planets and a conjunction between the two symbolizes a period of constructive accomplisment. People are more practical, realistic and we are encouraged to slow down to get things right. This transit occurs roughly every 20 years and is called a Great Conjunction."],
    ["Saturn in Aries ±5", formatPercent(analytics.transitMetrics.saturnAries.plusMinus5), "Saturn transits and cycles can be considered cycles of achievement and maturity. Saturn transits teach us to take responsibility for ourselves. In the sign of Aries this can look like assessing whether our systems are working regarding how we use our initiative, excercise our independence, express ourselves authentically, and assert ourselves effectively."],
    ["Uranus in Aries ±3", formatPercent(analytics.transitMetrics.uranusAries.plusMinus3), "Uranus in Aries is a generation transit characterized by rapid, disruptive, and revolutionary change focused on individual freedom, personal identity and technological innovation. Uranus enters Aries approximately every 84 years."]
  ];

  cards.forEach((card, index) => {
    const rect = appendRect(svg, 64 + index * 240, 654, 190, 92, "rgba(255,255,255,0.045)", "rgba(255,255,255,0.08)", 18);
    animateFadeIn(rect, 240 + index * 90, 260);
    appendText(svg, 84 + index * 240, 690, card[0], "start", "#9cadc6", 13, 600);
    appendText(svg, 84 + index * 240, 722, card[1], "start", "#edf4ff", 28, 700);
  });

  appendSvgLegend(svg, legendX, legendY, [
    { color: "#b68cff", label: "Jupiter-Saturn" },
    { color: "#7fd6ff", label: "Saturn in Aries" },
    { color: "#ffd27f", label: "Uranus in Aries" },
    { color: "#EC008C", label: "Object creation year", opacity: 0.85 }
  ]);

  applyPlanetOverlay(svg, settings.planet);
}

function renderTakeaways(svg, analytics, ui, settings = {}) {
  updateHeader(ui, {
    kicker: "Takeaways",
    title: "Three strongest signals in the prototype",
    description: "This final frame translates the storyline into reusable summary cards for future drill-down interactions.",
    footnote: "Next stage ideas: richer media, image cards, filters, and a dedicated data-quality panel."
  });

  setLegend(ui.legend, [
    { color: "#EC008C", label: "Time" },
    { color: "#ffb56b", label: "Place" },
    { color: "#79e2b0", label: "History alignment" }
  ]);

  clearSVG(svg);
  appendAtmosphere(svg, 860, 820);

  const cards = [
    {
      x: 70,
      y: 160,
      w: 220,
      h: 420,
      color: "#EC008C",
      label: "Temporal concentration",
      value: `${analytics.centuries["18th"]}`,
      detail: "Objects in the 18th century cluster"
    },
    {
      x: 320,
      y: 130,
      w: 220,
      h: 450,
      color: "#ffb56b",
      label: "Spatial concentration",
      value: formatPercent(analytics.topFiveShare),
      detail: "Rows from the top five countries"
    },
    {
      x: 570,
      y: 100,
      w: 220,
      h: 480,
      color: "#79e2b0",
      label: "History alignment",
      value: formatPercent(analytics.gapMetrics.within25),
      detail: "Pairs within ±25 years"
    }
  ];

  cards.forEach((card) => {
    appendRect(svg, card.x, card.y, card.w, card.h, `${card.color}22`, `${card.color}66`, 24);
    const innerPad = 26;
    const innerW = card.w - innerPad * 2;
    const textMaxW = Math.max(40, innerW - 10);

    const labelLines = wrapWordsToWidth(card.label, textMaxW, 18, 700);
    const labelLineHeight = 22;
    let textY = card.y + 56;
    appendTextMultiline(svg, card.x + innerPad, textY, labelLines, "start", "#edf4ff", 18, 700, labelLineHeight);
    textY += labelLines.length * labelLineHeight + 26;

    const valueStr = String(card.value);
    const valueSize = fitValueFontSize(valueStr, textMaxW, 46, 18);
    appendText(svg, card.x + innerPad, textY, valueStr, "start", card.color, valueSize, 800);
    textY += valueSize + 14;

    const detailLines = wrapWordsToWidth(card.detail, textMaxW, 14, 500);
    appendTextMultiline(svg, card.x + innerPad, textY, detailLines, "start", "#9cadc6", 14, 500, 19);

    const spark = analytics.yearBins.slice(card.x < 200 ? 0 : card.x < 400 ? 12 : 24, card.x < 200 ? 18 : card.x < 400 ? 30 : 42);
    const max = Math.max(...spark.map((point) => point.count), 1);
    const n = spark.length;
    let barW = 7;
    let gap = n <= 1 ? 0 : (innerW - n * barW) / (n - 1);
    if (n > 1 && gap < 2) {
      barW = Math.max(3, Math.floor((innerW - (n - 1) * 2) / n));
      gap = (innerW - n * barW) / (n - 1);
    }

    spark.forEach((point, index) => {
      const barHeight = (point.count / max) * 110;
      const y = card.y + card.h - 36 - barHeight;
      const bx = card.x + innerPad + index * (barW + gap);
      const rect = appendRect(svg, bx, y, barW, barHeight, `${card.color}aa`, "none", 4);
      animateRectGrow(rect, y, barHeight, index * 14, 240);
    });
  });

  appendText(svg, 430, 694, "Project Inspirations", "middle", "#edf4ff", 26, 700);

  const vizWidth = 860;
  const pillY = 728;
  const pillH = 40;
  const sidePad = 42;
  const pillGap = 16;
  const pillW = (vizWidth - 2 * sidePad - 2 * pillGap) / 3;
  const inspirationLinks = [
    ["https://van-gogh-collection.stefanpullen.com/", "Van Gogh Collection"],
    ["https://vangogh.stefanpullen.com/", "Van Gogh — Pullen"],
    ["https://informationisbeautiful.net/visualizations/horoscoped/", "Horoscoped"]
  ];
  inspirationLinks.forEach(([href, label], index) => {
    const px = sidePad + index * (pillW + pillGap);
    appendSvgLinkPill(svg, px, pillY, pillW, pillH, href, label);
  });
}

function computeAnalytics(records) {
  if (!records.length) {
    return emptyAnalytics();
  }
  const objectYears = records.map((row) => row.objectYear).filter(isFiniteNumber).sort((a, b) => a - b);
  const incidentYears = records.map((row) => row.eventYear).filter(isFiniteNumber).sort((a, b) => a - b);

  const objectRange = {
    min: Math.min(...objectYears),
    max: Math.max(...objectYears),
    span: Math.max(...objectYears) - Math.min(...objectYears) + 1
  };

  const incidentRange = {
    min: Math.min(...incidentYears),
    max: Math.max(...incidentYears)
  };

  const centuries = {
    "18th": countWhere(objectYears, (year) => year >= 1700 && year <= 1799),
    "19th": countWhere(objectYears, (year) => year >= 1800 && year <= 1899),
    "20th": countWhere(objectYears, (year) => year >= 1900 && year <= 1999),
    "21st": countWhere(objectYears, (year) => year >= 2000 && year <= 2099)
  };

  const pre1900Share = countWhere(objectYears, (year) => year < 1900) / records.length;
  const countryMap = tally(records.map((row) => cleanLabel(row.country) || "Unknown"));
  const cityMap = tally(records.map((row) => cleanLabel(row.city) || "Unknown city"));
  const topCountries = mapToSortedArray(countryMap, records.length);
  const topFiveShare = topCountries.slice(0, 5).reduce((sum, entry) => sum + entry.count, 0) / records.length;
  const countryCount = topCountries.length;
  const eventTypeMap = tally(records.map((row) => cleanLabel(row.eventType) || "Unknown event"));
  const topEventTypes = mapToSortedArray(eventTypeMap, records.length).slice(0, 12);

  const decadeMap = tally(objectYears.map((year) => Math.floor(year / 10) * 10));
  const topDecades = mapToSortedArray(decadeMap, records.length)
    .map((entry) => ({ ...entry, year: Number(entry.label), label: `${entry.label}s` }))
    .slice(0, 6);

  const yearBins = [];
  for (let year = objectRange.min; year <= objectRange.max; year += 5) {
    const count = countWhere(objectYears, (objectYear) => objectYear >= year && objectYear < year + 5);
    yearBins.push({ year: year + 2, count });
  }

  const validPairs = records
    .filter((row) => isFiniteNumber(row.objectYear) && isFiniteNumber(row.eventYear))
    .map((row) => ({
      objectId: row.objectId,
      title: row.title,
      objectName: row.objectName,
      artist: row.artist,
      country: row.country,
      city: row.city,
      eventName: row.eventName,
      eventType: row.eventType,
      objectYear: row.objectYear,
      eventYear: row.eventYear,
      gap: Math.abs(row.objectYear - row.eventYear)
    }))
    .sort((a, b) => a.objectYear - b.objectYear);

  const gaps = validPairs.map((pair) => pair.gap).sort((a, b) => a - b);
  const gapMetrics = {
    validPairs: validPairs.length,
    within1: countWhere(gaps, (gap) => gap <= 1) / validPairs.length,
    within5: countWhere(gaps, (gap) => gap <= 5) / validPairs.length,
    within25: countWhere(gaps, (gap) => gap <= 25) / validPairs.length,
    medianGap: median(gaps)
  };

  const transitMetrics = {};
  TRANSIT_GROUPS.forEach((group) => {
    transitMetrics[group.key] = {
      plusMinus1: shareNearYears(objectYears, group.years, 1),
      plusMinus3: shareNearYears(objectYears, group.years, 3),
      plusMinus5: shareNearYears(objectYears, group.years, 5)
    };
  });

  const dataQuality = computeDataQuality(records);

  return {
    totalRows: records.length,
    records,
    objectYears,
    objectRange,
    incidentRange,
    centuries,
    pre1900Share,
    topCountries,
    topFiveShare,
    countryCount,
    topCities: mapToSortedArray(cityMap, records.length).slice(0, 20),
    topEventTypes,
    cityMetrics: {
      parisCount: cityMap.get("Paris") || 0,
      unknownCount: cityMap.get("Unknown city") || 0
    },
    eventTypeExamples: buildEventTypeExamples(records),
    countryExamples: buildCountryExamples(records),
    timelineExamples: buildTimelineExamples(records),
    eventTypeExamples: buildEventTypeExamples(records),
    topDecades,
    yearBins,
    validPairs,
    gapMetrics,
    transitMetrics,
    dataQuality
  };
}

function computeDataQuality(records) {
  const objectIdCounts = new Map();
  let missingObjectId = 0;
  let missingIncidentYear = 0;
  let missingObjectYear = 0;
  let unknownCity = 0;
  let unknownCountry = 0;
  let unknownEventType = 0;

  records.forEach((row) => {
    if (Number.isFinite(row.objectId)) {
      objectIdCounts.set(row.objectId, (objectIdCounts.get(row.objectId) || 0) + 1);
    } else {
      missingObjectId += 1;
    }

    if (!Number.isFinite(row.eventYear)) {
      missingIncidentYear += 1;
    }
    if (!Number.isFinite(row.objectYear)) {
      missingObjectYear += 1;
    }

    const city = cleanLabel(row.city);
    if (!city || city.toLowerCase() === "unknown" || city.toLowerCase() === "unknown city") {
      unknownCity += 1;
    }

    const country = cleanLabel(row.country);
    if (!country || country.toLowerCase() === "unknown") {
      unknownCountry += 1;
    }

    const eventType = cleanLabel(row.eventType);
    if (!eventType || eventType.toLowerCase() === "unknown event") {
      unknownEventType += 1;
    }
  });

  let duplicateObjectIds = 0;
  objectIdCounts.forEach((count) => {
    if (count > 1) {
      duplicateObjectIds += (count - 1);
    }
  });

  return {
    totalRows: records.length,
    missingObjectId,
    duplicateObjectIds,
    missingIncidentYear,
    missingObjectYear,
    unknownCity,
    unknownCountry,
    unknownEventType
  };
}

function parseCSV(text) {
  const rows = [];
  let current = "";
  let row = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (insideQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      row.push(current);
      current = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  const [header, ...dataRows] = rows;

  return dataRows.map((cells) => {
    const item = Object.fromEntries(header.map((key, index) => [key, (cells[index] || "").trim()]));
    return {
      objectId: parseNumber(item["Object.ID"]),
      title: item["Title"],
      objectName: item["Object.Name"],
      artist: item["Artist.Display.Name"],
      country: item["Country"],
      city: item["City"],
      eventName: item["Historical Incident"],
      eventType: item["Type of Event "],
      objectYear: parseNumber(item["Object.Begin.Date"]),
      eventYear: parseNumber(item["Year"])
    };
  });
}

function buildState(records, country, city, eventType) {
  const filtered = records.filter((row) => {
    const countryMatches = country === "all" || cleanLabel(row.country) === country;
    const cityMatches = city === "all" || cleanLabel(row.city) === city;
    const eventMatches = eventType === "all" || cleanLabel(row.eventType) === eventType;
    return countryMatches && cityMatches && eventMatches;
  });
  const recordsForAnalytics = filtered.length ? filtered : records;
  return {
    filters: { country, city, eventType, isFallback: filtered.length === 0 },
    analytics: computeAnalytics(recordsForAnalytics)
  };
}

function buildCountryExamples(records) {
  const map = new Map();
  records.forEach((row) => {
    const key = cleanLabel(row.country) || "Unknown";
    if (!map.has(key)) {
      map.set(key, row);
    }
  });
  return map;
}

function buildTimelineExamples(records) {
  const map = new Map();
  records.forEach((row) => {
    if (isFiniteNumber(row.objectYear) && !map.has(row.objectYear)) {
      map.set(row.objectYear, row);
    }
  });
  return map;
}

function buildEventTypeExamples(records) {
  const map = new Map();
  records.forEach((row) => {
    const key = cleanLabel(row.eventType) || "Unknown event";
    if (!map.has(key)) {
      map.set(key, row);
    }
  });
  return map;
}

function emptyAnalytics() {
  return {
    totalRows: 0,
    records: [],
    objectYears: [0],
    objectRange: { min: 0, max: 0, span: 0 },
    incidentRange: { min: 0, max: 0 },
    centuries: { "18th": 0, "19th": 0, "20th": 0, "21st": 0 },
    pre1900Share: 0,
    topCountries: [],
    topFiveShare: 0,
    countryCount: 0,
    topEventTypes: [],
    cityMetrics: { parisCount: 0, unknownCount: 0 },
    eventTypeExamples: new Map(),
    countryExamples: new Map(),
    timelineExamples: new Map(),
    topDecades: [],
    yearBins: [{ year: 0, count: 0 }],
    validPairs: [],
    gapMetrics: { validPairs: 0, within1: 0, within5: 0, within25: 0, medianGap: 0 },
    transitMetrics: {
      jupiterSaturn: { plusMinus1: 0, plusMinus3: 0, plusMinus5: 0 },
      saturnAries: { plusMinus1: 0, plusMinus3: 0, plusMinus5: 0 },
      uranusAries: { plusMinus1: 0, plusMinus3: 0, plusMinus5: 0 }
    }
  };
}

function getFilterLabel(filters) {
  const parts = [];
  if (filters.country !== "all") {
    parts.push(filters.country);
  }
  if (filters.city !== "all") {
    parts.push(filters.city);
  }
  if (filters.eventType !== "all") {
    parts.push(filters.eventType);
  }
  return parts.join(" / ");
}

function getCityOptions(records, country, eventType) {
  const filtered = records.filter((row) => {
    const countryMatches = country === "all" || cleanLabel(row.country) === country;
    const eventMatches = eventType === "all" || cleanLabel(row.eventType) === eventType;
    return countryMatches && eventMatches;
  });
  if (!filtered.length) {
    return [];
  }
  const cityMap = tally(filtered.map((row) => cleanLabel(row.city) || "Unknown city"));
  return mapToSortedArray(cityMap, filtered.length)
    .slice(0, 30)
    .map((entry) => entry.label);
}

function stepLabel(step) {
  const labels = {
    intro: "Overview",
    patterns: "Temporal clustering",
    geography: "Geography",
    history: "History alignment",
    transits: "Transit layer",
    takeaways: "Takeaways"
  };
  return labels[step] || "Overview";
}

function setObjectCardIdle(card) {
  if (!card.objectCard) {
    return;
  }
  card.objectCard.dataset.status = "idle";
  card.objectCard.dataset.requestKey = "";
  card.objectLink.href = "#";
  card.objectLink.setAttribute("aria-disabled", "true");
  card.objectImage.removeAttribute("src");
  card.objectImage.alt = "";
  card.objectImage.style.display = "none";
  card.objectFallback.style.display = "grid";
  card.objectCardTitle.textContent = "No object selected";
  card.objectCardMeta.textContent = "";
}

function setObjectCardLoading(card, item) {
  card.objectCard.dataset.status = "loading";
  card.objectLink.href = getMetObjectUrl(item.objectId);
  card.objectLink.removeAttribute("aria-disabled");
  card.objectImage.removeAttribute("src");
  card.objectImage.alt = "";
  card.objectImage.style.display = "none";
  card.objectFallback.style.display = "grid";
  card.objectCardTitle.textContent = item.title || item.objectName || "Loading object…";
  card.objectCardMeta.textContent = `Object ID ${item.objectId}`;
}

function setObjectCardResult(card, item, metObject) {
  const title = metObject?.title || item?.title || item?.objectName || `Object ${item.objectId}`;
  const artist = metObject?.artistDisplayName || item?.artist || "";
  const date = metObject?.objectDate || "";
  const culture = metObject?.culture || "";
  const metaParts = [artist, culture, date].map((value) => (value || "").trim()).filter(Boolean).slice(0, 3);

  card.objectCard.dataset.status = "ready";
  card.objectLink.href = getMetObjectUrl(item.objectId);
  card.objectLink.removeAttribute("aria-disabled");
  card.objectCardTitle.textContent = title;
  card.objectCardMeta.textContent = metaParts.join(" · ");

  const imageUrl = metObject?.primaryImageSmall || metObject?.primaryImage || "";
  if (imageUrl) {
    card.objectImage.src = imageUrl;
    card.objectImage.alt = title;
    card.objectImage.style.display = "block";
    card.objectFallback.style.display = "none";
  } else {
    card.objectImage.removeAttribute("src");
    card.objectImage.alt = "";
    card.objectImage.style.display = "none";
    card.objectFallback.style.display = "grid";
  }
}

function updateDetailCard(card, item, totalRows) {
  if (!card?.title || !card?.meta) return;

  if (!item) {
    card.title.textContent = "Hover a mark for details";
    card.meta.textContent = `${totalRows} rows are active in the current filtered selection.`;
    if (card.objectYear) card.objectYear.textContent = "-";
    if (card.eventYear) card.eventYear.textContent = "-";
    if (card.country) card.country.textContent = "-";
    if (card.eventType) card.eventType.textContent = "-";
    setObjectCardIdle(card);
    return;
  }

  card.title.textContent = item.title || item.objectName || item.eventName || "Selected record";
  card.meta.textContent = item.eventName || item.artist || "Record details from the active view.";
  card.objectYear.textContent = isFiniteNumber(item.objectYear) ? String(item.objectYear) : "-";
  card.eventYear.textContent = isFiniteNumber(item.eventYear) ? String(item.eventYear) : "-";
  card.country.textContent = cleanLabel(item.country) || "-";
  card.eventType.textContent = cleanLabel(item.eventType) || "-";

  if (!Number.isFinite(item.objectId)) {
    setObjectCardIdle(card);
    return;
  }

  const requestKey = String(item.objectId);
  card.objectCard.dataset.requestKey = requestKey;
  setObjectCardLoading(card, item);
  fetchMetObject(item.objectId).then((metObject) => {
    if (card.objectCard.dataset.requestKey !== requestKey) {
      return;
    }
    setObjectCardResult(card, item, metObject);
  });
}

function updateHeader(ui, content) {
  if (!ui) return;
  if (ui.kicker) ui.kicker.textContent = content.kicker;
  if (ui.title) ui.title.textContent = content.title;
  if (ui.description) ui.description.textContent = content.description;
  if (ui.footnote) ui.footnote.textContent = content.footnote;
}

function setLegend(node, items) {
  if (!node) return;
  node.innerHTML = items.map((item) => `
    <span class="legend-pill">
      <span class="swatch" style="background:${item.color}"></span>
      ${escapeHTML(item.label)}
    </span>
  `).join("");
}

function applyPlanetOverlay(svg, planet) {
  if (!svg || !planet || planet === "none") return;

  const planetLabel = String(planet);
  const palette = {
    saturn: { color: "#b68cff", ring: true },
    jupiter: { color: "#ffd27f", ring: false },
    uranus: { color: "#79e2b0", ring: false },
    neptune: { color: "#7fd6ff", ring: false },
    pluto: { color: "#ff4fd8", ring: false }
  };
  const token = palette[planetLabel] || { color: "rgba(255,255,255,0.7)", ring: false };

  // Subtle badge in the upper-right corner (doesn't affect the underlying chart).
  const cx = 820;
  const cy = 64;
  const r = 16;
  const planetDot = appendCircle(svg, cx, cy, r, token.color, 0.22);
  planetDot.setAttribute("stroke", token.color);
  planetDot.setAttribute("stroke-width", "1.4");

  if (token.ring) {
    const ring = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    ring.setAttribute("cx", String(cx));
    ring.setAttribute("cy", String(cy));
    ring.setAttribute("rx", "26");
    ring.setAttribute("ry", "10");
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", token.color);
    ring.setAttribute("stroke-width", "1.2");
    ring.setAttribute("opacity", "0.55");
    ring.setAttribute("transform", `rotate(-18 ${cx} ${cy})`);
    svg.appendChild(ring);
  }

  appendText(svg, cx - 26, cy + 4, planetLabel.toUpperCase(), "end", "rgba(237,243,251,0.85)", 12, 700);
}

function tally(values) {
  const map = new Map();
  values.forEach((value) => {
    map.set(value, (map.get(value) || 0) + 1);
  });
  return map;
}

function mapToSortedArray(map, total) {
  return Array.from(map.entries())
    .map(([label, count]) => ({ label, count, share: count / total }))
    .sort((a, b) => b.count - a.count);
}

function shareNearYears(baseYears, referenceYears, threshold) {
  const matches = baseYears.filter((year) => referenceYears.some((reference) => Math.abs(reference - year) <= threshold));
  return matches.length / baseYears.length;
}

/** Integer tick stops from 0 through maxValue for count axes (e.g. density chart). */
function buildCountAxisTicks(maxValue, targetSteps = 5) {
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return [0];
  }
  let step = Math.ceil(maxValue / targetSteps);
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(step, 1)));
  const normalized = step / magnitude;
  const niceFactor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  step = niceFactor * magnitude;
  const ticks = [];
  for (let value = 0; value <= maxValue; value += step) {
    ticks.push(value);
  }
  if (ticks[ticks.length - 1] !== maxValue) {
    ticks.push(maxValue);
  }
  return ticks;
}

function scaleLinear(domainMin, domainMax, rangeMin, rangeMax) {
  const domainSpan = domainMax - domainMin || 1;
  const rangeSpan = rangeMax - rangeMin;
  return (value) => rangeMin + ((value - domainMin) / domainSpan) * rangeSpan;
}

function median(values) {
  if (!values.length) {
    return 0;
  }
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

function countWhere(values, predicate) {
  return values.reduce((total, value) => total + (predicate(value) ? 1 : 0), 0);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function parseNumber(value) {
  const result = Number.parseInt(value, 10);
  return Number.isFinite(result) ? result : null;
}

function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function cleanLabel(value) {
  return value && value.trim() ? value.trim() : "";
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function clearSVG(svg) {
  svg.innerHTML = "";
}

function appendAtmosphere(svg, width, height) {
  appendCircle(svg, width * 0.12, height * 0.14, 110, "rgba(127,214,255,0.08)", 1);
  appendCircle(svg, width * 0.82, height * 0.16, 90, "rgba(182,140,255,0.08)", 1);
  appendCircle(svg, width * 0.56, height * 0.82, 150, "rgba(255,210,127,0.05)", 1);
}

function appendCircle(svg, cx, cy, r, fill, opacity = 1) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  node.setAttribute("cx", cx);
  node.setAttribute("cy", cy);
  node.setAttribute("r", r);
  node.setAttribute("fill", fill);
  node.setAttribute("opacity", opacity);
  svg.appendChild(node);
  return node;
}

function appendLine(svg, x1, y1, x2, y2, stroke, width, opacity = 1) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "line");
  node.setAttribute("x1", x1);
  node.setAttribute("y1", y1);
  node.setAttribute("x2", x2);
  node.setAttribute("y2", y2);
  node.setAttribute("stroke", stroke);
  node.setAttribute("stroke-width", width);
  node.setAttribute("opacity", opacity);
  svg.appendChild(node);
  return node;
}

function appendTextMultiline(svg, x, y, lines, anchor, fill, size, weight, lineHeight) {
  const NS = "http://www.w3.org/2000/svg";
  const textEl = document.createElementNS(NS, "text");
  textEl.setAttribute("x", String(x));
  textEl.setAttribute("y", String(y));
  textEl.setAttribute("text-anchor", anchor);
  textEl.setAttribute("fill", fill);
  textEl.setAttribute("font-size", String(size));
  textEl.setAttribute("font-weight", String(weight));
  textEl.setAttribute("font-family", SVG_TEXT_FONT);
  lines.forEach((lineText, index) => {
    const tspan = document.createElementNS(NS, "tspan");
    tspan.setAttribute("x", String(x));
    tspan.setAttribute("dy", index === 0 ? "0" : String(lineHeight));
    tspan.textContent = lineText;
    textEl.appendChild(tspan);
  });
  svg.appendChild(textEl);
  return textEl;
}

function appendText(svg, x, y, text, anchor, fill, size, weight, rotate = 0) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "text");
  node.setAttribute("x", x);
  node.setAttribute("y", y);
  node.setAttribute("text-anchor", anchor);
  node.setAttribute("fill", fill);
  node.setAttribute("font-size", size);
  node.setAttribute("font-weight", weight);
  node.setAttribute("font-family", SVG_TEXT_FONT);
  if (rotate) {
    node.setAttribute("transform", `rotate(${rotate} ${x} ${y})`);
  }
  node.textContent = text;
  svg.appendChild(node);
  return node;
}

function appendPath(svg, d, fill, stroke, width, opacity = 1) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "path");
  node.setAttribute("d", d);
  node.setAttribute("fill", fill);
  node.setAttribute("stroke", stroke);
  node.setAttribute("stroke-width", width);
  node.setAttribute("opacity", opacity);
  node.setAttribute("stroke-linecap", "round");
  node.setAttribute("stroke-linejoin", "round");
  svg.appendChild(node);
  return node;
}

function appendRect(svg, x, y, width, height, fill, stroke, radius = 18) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  node.setAttribute("x", x);
  node.setAttribute("y", y);
  node.setAttribute("width", width);
  node.setAttribute("height", height);
  node.setAttribute("rx", radius);
  node.setAttribute("fill", fill);
  node.setAttribute("stroke", stroke);
  svg.appendChild(node);
  return node;
}

function appendSvgLegend(svg, originX, originY, entries, lineHeight = 19) {
  entries.forEach((entry, index) => {
    const y = originY + index * lineHeight;
    appendCircle(svg, originX + 5, y + 2, 5.5, entry.color, entry.opacity ?? 1);
    appendText(svg, originX + 18, y + 7, entry.label, "start", "#c5d2ea", 11, 600);
  });
}

function appendSvgLinkPill(svg, x, y, width, height, href, label, fontSize = 11) {
  const NS = "http://www.w3.org/2000/svg";
  const link = document.createElementNS(NS, "a");
  link.setAttribute("href", href);
  link.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
  link.setAttribute("target", "_blank");
  link.setAttribute("rel", "noreferrer");

  const rect = document.createElementNS(NS, "rect");
  rect.setAttribute("x", String(x));
  rect.setAttribute("y", String(y));
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  rect.setAttribute("rx", String(height / 2));
  rect.setAttribute("fill", "rgba(255,255,255,0.045)");
  rect.setAttribute("stroke", "rgba(255,255,255,0.12)");
  rect.setAttribute("stroke-width", "1");
  link.appendChild(rect);

  const labelNode = document.createElementNS(NS, "text");
  labelNode.setAttribute("x", String(x + width / 2));
  labelNode.setAttribute("y", String(y + height / 2 + fontSize * 0.35));
  labelNode.setAttribute("text-anchor", "middle");
  labelNode.setAttribute("fill", "#edf4ff");
  labelNode.setAttribute("font-size", String(fontSize));
  labelNode.setAttribute("font-weight", "600");
  labelNode.setAttribute("font-family", SVG_TEXT_FONT);
  labelNode.textContent = label;
  link.appendChild(labelNode);

  svg.appendChild(link);
  return link;
}

function showTooltip(node, html) {
  node.innerHTML = html;
  node.classList.add("visible");
}

function hideTooltip(node) {
  node.classList.remove("visible");
}
