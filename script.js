const app = document.getElementById("app");

const PREFERS_REDUCED_MOTION = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOTION = {
  enabled: !PREFERS_REDUCED_MOTION,
  durationMs: 520,
  quickMs: 260
};

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

const DEFAULT_TRANSIT_WINDOW_YEARS = 5;

const MET_OBJECT_CACHE = new Map();

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
      <div class="masthead__inner">
        <span class="eyebrow">Met Astro World</span>
        <h1>From Earthly Objects to Celestial Time</h1>
        <p class="lede">
          This narrative follows a sample of ${analytics.totalRows} objects in the Met Collection designated as “Highlights”, connected
          to historical incidents, made between ${analytics.objectRange.min} and ${analytics.objectRange.max}.
          That is ${analytics.objectRange.span} years of cultural production.
        </p>
        <div class="hero-metrics">
          <div class="metric-card">
            <strong>${analytics.totalRows}</strong>
            <span>Total rows</span>
          </div>
          <div class="metric-card">
            <strong>${analytics.objectRange.min}-${analytics.objectRange.max}</strong>
            <span>Object creation span</span>
          </div>
          <div class="metric-card">
            <strong>${analytics.countryCount}</strong>
            <span>Countries represented</span>
          </div>
        </div>
        <a class="masthead__skip" href="#section-00">Skip to Section 00</a>
      </div>
    </header>

    <main class="page" id="section-00">
      <section class="story-shell">
        <section class="story">
          <article class="story-step story-step--hero is-active" data-step="intro">
            <div class="copy-card">
              <div class="step-topline">
                <span class="eyebrow">00 / Overview</span>
                <span class="step-tag">Scene setter</span>
              </div>
              <h2>321 years of cultural production—set against history and the sky.</h2>
              <p class="lede">
                The Met Museum was founded in 1870 and as of 2026 is 156 years old. A few of the objects in this
                collection were acquired as early as 1889.
              </p>
              <div class="metric-grid">
                <div class="metric"><strong>${analytics.totalRows}</strong><span>Total dataset rows</span></div>
                <div class="metric"><strong>${analytics.objectRange.span}</strong><span>Years of cultural production</span></div>
                <div class="metric"><strong>${analytics.objectRange.min}</strong><span>Earliest object year</span></div>
                <div class="metric"><strong>${analytics.objectRange.max}</strong><span>Latest object year</span></div>
              </div>
            </div>
          </article>

          <article class="story-step" data-step="patterns">
            <div class="copy-card">
              <div class="step-topline">
                <span class="eyebrow">01 / Temporal clustering</span>
                <span class="step-tag">Distribution</span>
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
          </article>

          <article class="story-step" data-step="geography">
            <div class="copy-card">
              <div class="step-topline">
                <span class="eyebrow">02 / Geographic concentration</span>
                <span class="step-tag">Place</span>
              </div>
              <h2>The objects are globally distributed, but strongly concentrated.</h2>
              <p>
                The top five countries account for <strong>${formatPercent(analytics.topFiveShare)}</strong> of all records.
                Roughly 2 out of every 5 objects in this file were created in Paris.
              </p>
              <ul class="insight-list">
                ${analytics.topCountries.slice(0, 5).map((country, index) => `
                  <li>${index + 1}. <strong>${escapeHTML(country.label)}</strong>: ${country.count} rows</li>
                `).join("")}
              </ul>
            </div>
          </article>

          <article class="story-step" data-step="history">
            <div class="copy-card">
              <div class="step-topline">
                <span class="eyebrow">03 / Objects beside incidents</span>
                <span class="step-tag">Alignment</span>
              </div>
              <h2>Object dates sit unusually close to historical event dates.</h2>
              <p>
                Most object dates in this file are tightly linked to incident dates, because the dataset is curated as object-incident pairs.
                The median gap is <strong>${analytics.gapMetrics.medianGap}</strong> years.
              </p>
              <div class="metric-grid">
                <div class="metric"><strong>${formatPercent(analytics.gapMetrics.within1)}</strong><span>Within ±1 year</span></div>
                <div class="metric"><strong>${formatPercent(analytics.gapMetrics.within5)}</strong><span>Within ±5 years</span></div>
                <div class="metric"><strong>${formatPercent(analytics.gapMetrics.within25)}</strong><span>Within ±25 years</span></div>
              </div>
            </div>
          </article>

          <article class="story-step" data-step="transits">
            <div class="copy-card">
              <div class="step-topline">
                <span class="eyebrow">04 / Symbolic transit layer</span>
                <span class="step-tag">Interpretive lens</span>
              </div>
              <h2>This is a symbolic lens, not a causal claim.</h2>
              <p>
                It asks whether object creation clusters overlap with broad collective-cycle transit windows. The following transits
                feature movements by planets considered generation or era markers in astrology.
              </p>
              <ul class="insight-list">
                <li>Jupiter-Saturn ±5 years: <strong>${formatPercent(analytics.transitMetrics.jupiterSaturn.plusMinus5)}</strong></li>
                <li>Saturn in Aries ±5 years: <strong>${formatPercent(analytics.transitMetrics.saturnAries.plusMinus5)}</strong></li>
                <li>Uranus in Aries ±3 years: <strong>${formatPercent(analytics.transitMetrics.uranusAries.plusMinus3)}</strong></li>
              </ul>
            </div>
          </article>

          <article class="story-step story-step--closing" data-step="takeaways">
            <div class="copy-card">
              <div class="step-topline">
                <span class="eyebrow">05 / Takeaways</span>
                <span class="step-tag">Synthesis</span>
              </div>
              <h2>Three clocks, one narrative frame.</h2>
              <p>
                This dataset combines three clocks: object creation time, historical event time, and symbolic transit time.
                Seen together, they make cultural memories easier to feel and compare.
              </p>
              <div class="metric-grid">
                <div class="metric"><strong>${analytics.centuries["18th"]}</strong><span>Largest century cluster</span></div>
                <div class="metric"><strong>${formatPercent(analytics.topFiveShare)}</strong><span>Top-five country share</span></div>
                <div class="metric"><strong>${formatPercent(analytics.gapMetrics.within25)}</strong><span>Pairs within ±25 years</span></div>
              </div>
              <div class="cta-row">
                <a class="cta" href="https://www.metmuseum.org/en/hubs/open-access" target="_blank" rel="noreferrer">Met Open Access</a>
                <a class="cta" href="https://ssd.jpl.nasa.gov/horizons/" target="_blank" rel="noreferrer">NASA JPL Horizons</a>
              </div>
            </div>
          </article>
        </section>
      </section>

      <aside class="sticky-panel">
        <div class="panel-content">
          <div class="panel-topbar">
            <span class="panel-pill"><span class="panel-dot"></span>Interactive panel</span>
            <span class="panel-pill">Stage 02</span>
          </div>

          <div class="viz-header">
            <div>
              <span class="eyebrow" id="viz-kicker">Overview</span>
              <h3 id="viz-title">Dataset overview</h3>
            </div>
            <span class="panel-step-index" id="panel-step-index">00</span>
          </div>

          <p id="viz-description" class="viz-description">
            The visual panel updates as each story chapter becomes active.
          </p>

          <div class="panel-controls">
            <label class="control">
              <span class="control-label">Country focus</span>
              <select id="country-filter" class="control-select">
                <option value="all">All countries</option>
                ${analytics.topCountries.slice(0, 10).map((country) => `<option value="${escapeHTML(country.label)}">${escapeHTML(country.label)}</option>`).join("")}
              </select>
            </label>
            <label class="control">
              <span class="control-label">City</span>
              <select id="city-filter" class="control-select">
                <option value="all">All cities</option>
                ${cities.slice(0, 12).map((city) => `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`).join("")}
              </select>
            </label>
            <label class="control">
              <span class="control-label">Event type</span>
              <select id="event-filter" class="control-select">
                <option value="all">All event types</option>
                ${eventTypes.map((type) => `<option value="${escapeHTML(type)}">${escapeHTML(type)}</option>`).join("")}
              </select>
            </label>
            <button type="button" class="control-reset" id="filter-reset">Reset filters</button>
          </div>

          <div class="panel-toggles">
            <div class="toggle-group" role="group" aria-label="Geography view toggle">
              <button type="button" class="toggle is-active" id="geo-view-country" data-value="country">Country view</button>
              <button type="button" class="toggle" id="geo-view-city" data-value="city">City view</button>
            </div>
            <div class="toggle-group" role="group" aria-label="Transit overlay toggle">
              <button type="button" class="toggle is-active" id="transit-overlay-off" data-value="off">History only</button>
              <button type="button" class="toggle" id="transit-overlay-on" data-value="on">History + transits</button>
            </div>
          </div>

          <div class="panel-highlights">
            <div class="panel-highlight">
              <span class="panel-label">Rows</span>
              <strong id="stat-rows">${analytics.totalRows}</strong>
            </div>
            <div class="panel-highlight">
              <span class="panel-label">Span</span>
              <strong id="stat-span">${analytics.objectRange.span}y</strong>
            </div>
            <div class="panel-highlight">
              <span class="panel-label">Countries</span>
              <strong id="stat-countries">${analytics.countryCount}</strong>
            </div>
          </div>

          <div class="legend" id="legend"></div>
          <div class="viz-frame">
            <svg class="viz-layer is-active" id="viz" viewBox="0 0 860 820" preserveAspectRatio="xMidYMid meet"></svg>
            <svg class="viz-layer" id="viz-next" viewBox="0 0 860 820" preserveAspectRatio="xMidYMid meet"></svg>
          </div>
          <div class="panel-debug" id="panel-debug" aria-hidden="true"></div>

          <details class="dq-drawer" id="dq-panel">
            <summary class="dq-summary">
              <span>Methodology &amp; data quality</span>
              <span class="dq-summary__hint">Transit window, missing fields, duplicates</span>
            </summary>
            <div class="dq-body">
              <div class="dq-block">
                <div class="dq-block__title">Transit proximity window</div>
                <div class="dq-slider">
                  <input id="transit-window" type="range" min="1" max="10" step="1" value="5" />
                  <div class="dq-slider__meta">
                    <span class="dq-label">Current</span>
                    <strong id="transit-window-value">±5 years</strong>
                  </div>
                </div>
                <p class="dq-note">
                  Overlap numbers are simple year-level proximity checks (exploratory), not timestamp-accurate transits.
                </p>
              </div>

              <div class="dq-block">
                <div class="dq-block__title">Data quality snapshot</div>
                <div class="dq-metrics">
                  <div class="dq-metric"><span>Duplicate Object.IDs</span><strong id="dq-dup-objects">-</strong></div>
                  <div class="dq-metric"><span>Missing incident year</span><strong id="dq-missing-event-year">-</strong></div>
                  <div class="dq-metric"><span>Missing object year</span><strong id="dq-missing-object-year">-</strong></div>
                  <div class="dq-metric"><span>Unknown city</span><strong id="dq-unknown-city">-</strong></div>
                  <div class="dq-metric"><span>Unknown country</span><strong id="dq-unknown-country">-</strong></div>
                </div>
              </div>
            </div>
          </details>

          <div class="panel-footer">
            <div class="panel-note" id="viz-footnote"></div>
            <div class="panel-progress">
              <span class="panel-progress-label">Active view</span>
              <span class="panel-progress-value" id="panel-progress-value">Overview</span>
            </div>
          </div>
        </div>
      </aside>
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
  const vizFrame = document.querySelector(".viz-frame");
  const svgPrimary = document.getElementById("viz");
  const svgSecondary = document.getElementById("viz-next");
  const tooltip = document.getElementById("tooltip");
  const legend = document.getElementById("legend");
  const title = document.getElementById("viz-title");
  const kicker = document.getElementById("viz-kicker");
  const description = document.getElementById("viz-description");
  const footnote = document.getElementById("viz-footnote");
  const stepIndex = document.getElementById("panel-step-index");
  const progressValue = document.getElementById("panel-progress-value");
  const countryFilter = document.getElementById("country-filter");
  const geographyModeButtons = Array.from(document.querySelectorAll("[data-geo-mode]"));
  const transitModeButtons = Array.from(document.querySelectorAll("[data-transit-mode]"));
  const transitWindow = document.getElementById("transit-window");
  const transitWindowValue = document.getElementById("transit-window-value");
  const dqPanel = document.getElementById("dq-panel");
  const dqDuplicateIds = document.getElementById("dq-duplicate-ids");
  const dqMissingIncidentYear = document.getElementById("dq-missing-incident-year");
  const dqUnknownCity = document.getElementById("dq-unknown-city");
  const dqUnknownCountry = document.getElementById("dq-unknown-country");
  const dqMissingObjectYear = document.getElementById("dq-missing-object-year");
  const cityFilter = document.getElementById("city-filter");
  const eventFilter = document.getElementById("event-filter");
  const resetButton = document.getElementById("filter-reset");
  const statRows = document.getElementById("stat-rows");
  const statSpan = document.getElementById("stat-span");
  const statCountries = document.getElementById("stat-countries");
  const panelDebug = document.getElementById("panel-debug");
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

  const transitionMs = MOTION.enabled ? 260 : 0;
  let activeSvg = svgPrimary;
  let inactiveSvg = svgSecondary;
  let currentStep = "intro";
  let geographyMode = "country";
  let transitMode = "history-plus-transits";
  let state = buildState(records, countryFilter.value, cityFilter.value, eventFilter.value, Number.parseInt(transitWindow?.value || "5", 10));

  const ui = {
    title,
    kicker,
    description,
    footnote,
    legend,
    tooltip,
    stepIndex,
    progressValue,
    detailCard,
    view: {
      get geographyMode() {
        return geographyMode;
      },
      get transitMode() {
        return transitMode;
      }
    }
  };
  const renders = {
    intro: (svg) => renderIntro(svg, state.analytics, ui),
    patterns: (svg) => renderPatterns(svg, state.analytics, ui),
    geography: (svg) => renderGeography(svg, state.analytics, ui),
    history: (svg) => renderHistory(svg, state.analytics, ui),
    transits: (svg) => renderTransits(svg, state.analytics, ui),
    takeaways: (svg) => renderTakeaways(svg, state.analytics, ui)
  };

  function swapVizLayers() {
    const currentActive = activeSvg;
    activeSvg = inactiveSvg;
    inactiveSvg = currentActive;
  }

  function renderWithTransition(renderFn) {
    if (!vizFrame) {
      renderFn(activeSvg);
      return;
    }

    // Prepare inactive layer.
    clearSVG(inactiveSvg);
    try {
      renderFn(inactiveSvg);
    } catch (error) {
      console.error(error);
      clearSVG(inactiveSvg);
      appendText(inactiveSvg, 430, 410, "Visualization error", "middle", "#edf4ff", 22, 800);
      appendText(inactiveSvg, 430, 448, String(error?.message || error), "middle", "#9cadc6", 14, 500);
    }

    if (!inactiveSvg.childNodes.length) {
      appendText(inactiveSvg, 430, 410, "No visualization rendered for this section yet", "middle", "#edf4ff", 18, 800);
      appendText(inactiveSvg, 430, 446, "This step needs its planned visual element implemented.", "middle", "#9cadc6", 14, 500);
    }

    if (transitionMs === 0) {
      activeSvg.classList.remove("is-active");
      inactiveSvg.classList.add("is-active");
      clearSVG(activeSvg);
      swapVizLayers();
      return;
    }

    const oldActive = activeSvg;
    const newActive = inactiveSvg;
    vizFrame.classList.add("viz-frame--transitioning");
    newActive.classList.add("is-active");
    oldActive.classList.remove("is-active");

    window.setTimeout(() => {
      // Clear the now-inactive SVG so it doesn't capture events.
      clearSVG(oldActive);
      swapVizLayers();
      vizFrame.classList.remove("viz-frame--transitioning");
    }, transitionMs + 40);
  }

  function renderCurrentStep() {
    const filteredLabel = getFilterLabel(state.filters);
    statRows.textContent = String(state.analytics.totalRows);
    statSpan.textContent = `${state.analytics.objectRange.span}y`;
    statCountries.textContent = String(state.analytics.countryCount);
    progressValue.textContent = `${stepLabel(currentStep)}${filteredLabel ? ` / ${filteredLabel}` : ""}`;
    ui.stepIndex.textContent = stepMeta[currentStep];
    renderDataQualityPanel();
    renderWithTransition((svg) => renders[currentStep](svg));
    if (panelDebug) {
      panelDebug.textContent = `step=${currentStep} activeSvg=${activeSvg?.id}:${activeSvg?.className?.baseVal || ""}`;
    }
  }

  function renderDataQualityPanel() {
    if (!dqPanel) return;
    const dq = state.analytics.dataQuality;
    if (!dq) return;
    if (dqDuplicateIds) dqDuplicateIds.textContent = String(dq.duplicateObjectIds);
    if (dqMissingIncidentYear) dqMissingIncidentYear.textContent = String(dq.missingIncidentYear);
    if (dqUnknownCity) dqUnknownCity.textContent = String(dq.unknownCity);
    if (dqUnknownCountry) dqUnknownCountry.textContent = String(dq.unknownCountry);
    if (dqMissingObjectYear) dqMissingObjectYear.textContent = String(dq.missingObjectYear);
  }

  function rebuildCityOptions() {
    if (!cityFilter) return;
    const cities = getCityOptions(records, countryFilter.value, eventFilter.value);
    const current = cityFilter.value;
    cityFilter.innerHTML = [
      `<option value="all">All cities</option>`,
      ...cities.map((city) => `<option value="${escapeHTML(city)}">${escapeHTML(city)}</option>`)
    ].join("");
    cityFilter.value = cities.includes(current) ? current : "all";
  }

  function applyFilters() {
    rebuildCityOptions();
    state = buildState(records, countryFilter.value, cityFilter.value, eventFilter.value, Number.parseInt(transitWindow?.value || "5", 10));
    updateDetailCard(detailCard, null, state.analytics.totalRows);
    renderCurrentStep();
  }

  function resetFilters() {
    countryFilter.value = "all";
    cityFilter.value = "all";
    eventFilter.value = "all";
    if (transitWindow) {
      transitWindow.value = "5";
    }
    applyFilters();
  }

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
    stepNodes.forEach((node) => {
      node.classList.toggle("is-active", node.dataset.step === step);
    });
    renderCurrentStep();
  }, { threshold: [0.35, 0.55, 0.75] });

  stepNodes.forEach((step) => observer.observe(step));
  countryFilter.addEventListener("change", applyFilters);
  cityFilter.addEventListener("change", applyFilters);
  eventFilter.addEventListener("change", applyFilters);
  resetButton.addEventListener("click", resetFilters);
  updateDetailCard(detailCard, null, state.analytics.totalRows);
  rebuildCityOptions();
  if (transitWindow && transitWindowValue) {
    transitWindowValue.textContent = `±${transitWindow.value} years`;
    transitWindow.addEventListener("input", () => {
      transitWindowValue.textContent = `±${transitWindow.value} years`;
    });
    transitWindow.addEventListener("change", applyFilters);
  }
  renderDataQualityPanel();
  renderCurrentStep();

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

  appendText(svg, padding, startY - 6, "Met Open Access collage", "start", "rgba(237,244,255,0.9)", 12, 700);

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
      if (!href) return;
      image.setAttribute("href", href);
      image.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
      placeholder.setAttribute("fill", "rgba(255,255,255,0.02)");
    });
  });

  // Soft gradient overlay so the collage reads as background texture.
  const overlay = appendRect(svg, padding, startY, gridW, gridH, "rgba(7, 17, 29, 0.18)", "none", 18);
  overlay.setAttribute("opacity", "0.35");
  overlay.style.pointerEvents = "none";
}

function renderIntro(svg, analytics, ui) {
  updateHeader(ui, {
    kicker: "Overview",
    title: "Timeline of object creation years",
    description: "Each dot is one record from the filtered dataset, plotted across the full time span of the current selection.",
    footnote: `Filtered view contains ${analytics.totalRows} rows spanning ${analytics.objectRange.span} years.`
  });

  setLegend(ui.legend, [
    { color: "#7fd6ff", label: "Object row" },
    { color: "#b68cff", label: "Timeline axis" }
  ]);

  clearSVG(svg);

  const width = 860;
  const height = 820;
  const margin = { top: 120, right: 60, bottom: 120, left: 60 };
  const axisY = height / 2;
  const x = scaleLinear(analytics.objectRange.min, analytics.objectRange.max, margin.left, width - margin.right);

  appendAtmosphere(svg, width, height);
  renderIntroCollage(svg, analytics);
  appendLine(svg, margin.left, axisY, width - margin.right, axisY, "#8e77ff", 2, 0.5);

  [analytics.objectRange.min, 1800, 1900, analytics.objectRange.max].forEach((year) => {
    const px = x(year);
    appendLine(svg, px, axisY - 18, px, axisY + 18, "rgba(255,255,255,0.35)", 1, 1);
    appendText(svg, px, axisY + 44, String(year), "middle", "#9cadc6", 14, 500);
  });

  analytics.objectYears.forEach((year, index) => {
    const amplitude = 14 + (index % 5) * 5;
    const y = axisY + Math.sin(index * 0.65) * amplitude;
    const circle = appendCircle(svg, x(year), y, 4.1, "#7fd6ff", 0.84);
    animateCirclePop(circle, 4.1, Math.min(index, 44) * 6);
    circle.addEventListener("mouseenter", () => showTooltip(ui.tooltip, `Object year ${year}`));
    circle.addEventListener("mouseleave", () => hideTooltip(ui.tooltip));
  });

  appendText(svg, width / 2, 78, `${analytics.objectRange.span} years of object creation`, "middle", "#edf4ff", 30, 750);
  appendText(svg, width / 2, 110, `From ${analytics.objectRange.min} to ${analytics.objectRange.max}`, "middle", "#95a8c8", 16, 500);
}

function renderPatterns(svg, analytics, ui) {
  updateHeader(ui, {
    kicker: "Temporal clustering",
    title: "Density by creation year",
    description: "A smoothed density line reveals how strongly the sample concentrates in the 18th century and then re-forms in later centuries.",
    footnote: analytics.topDecades.length ? `Peak decade: ${analytics.topDecades[0].label} with ${analytics.topDecades[0].count} records.` : "No decade data available for this filter."
  });

  setLegend(ui.legend, [
    { color: "#7fd6ff", label: "Year density" },
    { color: "#ffd27f", label: "Peak decade annotation" },
    { color: "#79e2b0", label: "Event-type frequency" }
  ]);

  clearSVG(svg);

  const width = 860;
  const height = 820;
  const margin = { top: 90, right: 44, bottom: 90, left: 56 };
  const bins = analytics.yearBins;
  const x = scaleLinear(analytics.objectRange.min, analytics.objectRange.max, margin.left, width - margin.right);
  const y = scaleLinear(0, Math.max(...bins.map((bin) => bin.count)) || 1, height - margin.bottom, margin.top);

  appendAtmosphere(svg, width, height);
  appendRect(svg, margin.left, margin.top, width - margin.left - margin.right, height - margin.top - margin.bottom, "rgba(255,255,255,0.015)", "rgba(255,255,255,0.06)", 26);

  for (let year = 1720; year <= 2020; year += 40) {
    const px = x(year);
    appendLine(svg, px, margin.top, px, height - margin.bottom, "rgba(255,255,255,0.06)", 1, 1);
    appendText(svg, px, height - margin.bottom + 28, String(year), "middle", "#90a0b7", 13, 500);
  }

  appendLine(svg, margin.left, height - margin.bottom, width - margin.right, height - margin.bottom, "rgba(255,255,255,0.4)", 1.2, 1);
  appendLine(svg, margin.left, margin.top, margin.left, height - margin.bottom, "rgba(255,255,255,0.22)", 1.2, 1);

  const path = bins.map((bin, index) => `${index === 0 ? "M" : "L"} ${x(bin.year)} ${y(bin.count)}`).join(" ");
  const fillPath = `${path} L ${x(bins[bins.length - 1].year)} ${height - margin.bottom} L ${x(bins[0].year)} ${height - margin.bottom} Z`;
  appendPath(svg, fillPath, "rgba(127, 214, 255, 0.18)", "none", 0);
  const densityLine = appendPath(svg, path, "none", "#7fd6ff", 4, 0.98);
  animatePathDraw(densityLine, 60, 560);

  analytics.topDecades.slice(0, 3).forEach((decade) => {
    const px = x(decade.year);
    const py = y(decade.count);
    appendCircle(svg, px, py, 7.5, "#ffd27f", 1);
    appendText(svg, px, py - 18, `${decade.label} / ${decade.count}`, "middle", "#ffd27f", 13, 700);
  });

  appendText(svg, margin.left, margin.top - 26, "Object count", "start", "#95a8c8", 14, 650);

  // Optional sidebar: event-type frequency.
  if (analytics.topEventTypes?.length) {
    const sidebarX = width - margin.right - 220;
    const sidebarY = margin.top + 18;
    const sidebarW = 200;
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
}

function renderGeography(svg, analytics, ui) {
  const mode = ui.geoMode === "city" ? "city" : "country";
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
}

function renderHistory(svg, analytics, ui) {
  updateHeader(ui, {
    kicker: "Object vs event years",
    title: "Two-lane history alignment view",
    description: "Connection lines link object creation years to paired incident years, showing just how tight the timeline relationships are.",
    footnote: `${analytics.gapMetrics.validPairs} valid object-event pairs; ${formatPercent(analytics.gapMetrics.within25)} fall within ±25 years.`
  });

  setLegend(ui.legend, [
    { color: "#7fd6ff", label: "Object year" },
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
  appendText(svg, margin.left, topLane - 24, "Object year", "start", "#7fd6ff", 15, 700);
  appendText(svg, margin.left, bottomLane - 24, "Incident year", "start", "#ffd27f", 15, 700);

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
    const objectDot = appendCircle(svg, objectX, topLane + ((index % 7) - 3) * 6, 3.5, "#7fd6ff", 0.86);
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
}

function renderTransits(svg, analytics, ui) {
  const transitsEnabled = ui?.toggles?.transitsEnabled ?? true;
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
  const transitLane = 250;
  const objectLane = 565;
  const x = scaleLinear(analytics.objectRange.min, analytics.objectRange.max, margin.left, width - margin.right);

  appendAtmosphere(svg, width, height);
  if (transitsEnabled) {
    appendLine(svg, margin.left, transitLane, width - margin.right, transitLane, "rgba(255,255,255,0.32)", 1.5, 1);
    appendText(svg, margin.left, transitLane - 24, "Transit milestones", "start", "#edf4ff", 15, 700);
  }
  appendLine(svg, margin.left, objectLane, width - margin.right, objectLane, "rgba(127,214,255,0.7)", 2, 1);
  appendText(svg, margin.left, objectLane - 24, transitsEnabled ? "Object creation years" : "Object creation years (history-only)", "start", "#7fd6ff", 15, 700);

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
    const dot = appendCircle(svg, x(year), objectLane + jitter, 3.8, "#7fd6ff", 0.7);
    animateCirclePop(dot, 3.8, Math.min(index, 70) * 4 + 180, 200);
    dot.addEventListener("mouseenter", () => {
      showTooltip(ui.tooltip, `Object year ${year}`);
      updateDetailCard(ui.detailCard, analytics.timelineExamples.get(year) || null, analytics.totalRows);
    });
    dot.addEventListener("mouseleave", () => hideTooltip(ui.tooltip));
  });

  if (!transitsEnabled) {
    return;
  }

  const cards = [
    ["Jupiter-Saturn ±5", formatPercent(analytics.transitMetrics.jupiterSaturn.plusMinus5)],
    ["Saturn in Aries ±5", formatPercent(analytics.transitMetrics.saturnAries.plusMinus5)],
    ["Uranus in Aries ±3", formatPercent(analytics.transitMetrics.uranusAries.plusMinus3)]
  ];

  cards.forEach((card, index) => {
    const rect = appendRect(svg, 64 + index * 240, 654, 190, 92, "rgba(255,255,255,0.045)", "rgba(255,255,255,0.08)", 18);
    animateFadeIn(rect, 240 + index * 90, 260);
    appendText(svg, 84 + index * 240, 690, card[0], "start", "#9cadc6", 13, 600);
    appendText(svg, 84 + index * 240, 722, card[1], "start", "#edf4ff", 28, 700);
  });
}

function renderTakeaways(svg, analytics, ui) {
  updateHeader(ui, {
    kicker: "Takeaways",
    title: "Three strongest signals in the prototype",
    description: "This final frame translates the storyline into reusable summary cards for future drill-down interactions.",
    footnote: "Next stage ideas: richer media, image cards, filters, and a dedicated data-quality panel."
  });

  setLegend(ui.legend, [
    { color: "#7fd6ff", label: "Time" },
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
      color: "#7fd6ff",
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
    appendText(svg, card.x + 24, card.y + 56, card.label, "start", "#edf4ff", 18, 700);
    appendText(svg, card.x + 24, card.y + 130, card.value, "start", card.color, 46, 800);
    appendText(svg, card.x + 24, card.y + 168, card.detail, "start", "#9cadc6", 14, 500);

    const spark = analytics.yearBins.slice(card.x < 200 ? 0 : card.x < 400 ? 12 : 24, card.x < 200 ? 18 : card.x < 400 ? 30 : 42);
    const max = Math.max(...spark.map((point) => point.count), 1);

    spark.forEach((point, index) => {
      const barHeight = (point.count / max) * 110;
      const y = card.y + card.h - 36 - barHeight;
      const rect = appendRect(svg, card.x + 24 + index * 10, y, 7, barHeight, `${card.color}aa`, "none", 4);
      animateRectGrow(rect, y, barHeight, index * 14, 240);
    });
  });

  appendText(svg, 430, 700, "Prototype next steps", "middle", "#edf4ff", 26, 700);
  appendText(svg, 430, 736, "Add media, object-image cards, deeper filtering, and more nuanced transitions.", "middle", "#9cadc6", 16, 500);
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
  if (!item) {
    card.title.textContent = "Hover a mark for details";
    card.meta.textContent = `${totalRows} rows are active in the current filtered selection.`;
    card.objectYear.textContent = "-";
    card.eventYear.textContent = "-";
    card.country.textContent = "-";
    card.eventType.textContent = "-";
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
  ui.kicker.textContent = content.kicker;
  ui.title.textContent = content.title;
  ui.description.textContent = content.description;
  ui.footnote.textContent = content.footnote;
}

function setLegend(node, items) {
  node.innerHTML = items.map((item) => `
    <span class="legend-pill">
      <span class="swatch" style="background:${item.color}"></span>
      ${escapeHTML(item.label)}
    </span>
  `).join("");
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

function appendText(svg, x, y, text, anchor, fill, size, weight, rotate = 0) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", "text");
  node.setAttribute("x", x);
  node.setAttribute("y", y);
  node.setAttribute("text-anchor", anchor);
  node.setAttribute("fill", fill);
  node.setAttribute("font-size", size);
  node.setAttribute("font-weight", weight);
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

function showTooltip(node, html) {
  node.innerHTML = html;
  node.classList.add("visible");
}

function hideTooltip(node) {
  node.classList.remove("visible");
}
