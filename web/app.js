const state = {
  rows: [],
  metrics: null,
  activeStep: 0,
  transitYears: [1702, 1723, 1742, 1762, 1782, 1802, 1821, 1842, 1861, 1881, 1901, 1921, 1940, 1961, 1980, 2000, 2020],
  globalAnchors: [
    { label: "French Revolution", year: 1789 },
    { label: "Industrial Midpoint", year: 1800 },
    { label: "WWI", year: 1914 },
    { label: "WWII", year: 1939 },
    { label: "Decolonization", year: 1960 },
  ],
};

function parseCSV(text) {
  const rows = [];
  let cur = "";
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(cur);
      cur = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      if (cur.length > 0 || row.length > 0) {
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
      }
      continue;
    }
    cur += ch;
  }
  if (cur.length > 0 || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  const headers = rows[0];
  return rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function summarize(rows) {
  const objectYears = [];
  const incidentYears = [];
  const countries = {};
  const cityCounts = {};
  const objectIds = new Set();
  let paired = 0;
  const deltas = [];

  rows.forEach((r) => {
    const oy = toNum(r["Object.Begin.Date"]);
    const iy = toNum(r["Year"]);
    if (oy !== null) objectYears.push(oy);
    if (iy !== null) incidentYears.push(iy);
    if (oy !== null && iy !== null) {
      paired++;
      deltas.push(Math.abs(oy - iy));
    }
    const c = (r["Country"] || "Unknown").trim() || "Unknown";
    countries[c] = (countries[c] || 0) + 1;
    const city = (r["City"] || "Unknown").trim() || "Unknown";
    cityCounts[city] = (cityCounts[city] || 0) + 1;
    if (r["Object.ID"]) objectIds.add(r["Object.ID"]);
  });

  const sortedCountries = Object.entries(countries).sort((a, b) => b[1] - a[1]);
  const top5Share = (sortedCountries.slice(0, 5).reduce((a, d) => a + d[1], 0) / rows.length) * 100;
  const within25 = deltas.filter((d) => d <= 25).length;
  const within5 = deltas.filter((d) => d <= 5).length;
  const within1 = deltas.filter((d) => d <= 1).length;
  const avgDelta = deltas.length ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;

  return {
    rows: rows.length,
    uniqueObjects: objectIds.size,
    minYear: Math.min(...objectYears),
    maxYear: Math.max(...objectYears),
    objectYears,
    incidentYears,
    deltas,
    paired,
    topCountries: sortedCountries.slice(0, 10),
    topCities: Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 10),
    top5Share,
    proximity: {
      one: paired ? (within1 / paired) * 100 : 0,
      five: paired ? (within5 / paired) * 100 : 0,
      twentyFive: paired ? (within25 / paired) * 100 : 0,
      avgDelta,
    },
  };
}

function fillKpis(m) {
  const kpis = [
    ["Rows", m.rows],
    ["Unique Object IDs", m.uniqueObjects],
    ["Creation Span", `${m.minYear}–${m.maxYear}`],
    ["Top-5 Country Share", `${m.top5Share.toFixed(2)}%`],
  ];
  const root = document.getElementById("kpis");
  root.innerHTML = kpis
    .map(
      ([label, value]) => `
      <article class="kpi">
        <div class="value">${value}</div>
        <div class="label">${label}</div>
      </article>`
    )
    .join("");
}

function fillStepSnippets(m) {
  const s1 = document.querySelector('.step[data-step="1"] .dynamic');
  const s2 = document.querySelector('.step[data-step="2"] .dynamic');
  const s3 = document.querySelector('.step[data-step="3"] .dynamic');
  const s4 = document.querySelector('.step[data-step="4"] .dynamic');
  const s5 = document.querySelector('.step[data-step="5"] .dynamic');
  const s6 = document.querySelector('.step[data-step="6"] .dynamic');
  if (s1) s1.textContent = `${m.rows} objects across ${m.maxYear - m.minYear} years (${m.minYear}-${m.maxYear}).`;
  if (s2) s2.textContent = `18th c. cluster dominates; top-5 decades pattern remains stable.`;
  if (s3) s3.textContent = `Top-5 countries represent ${m.top5Share.toFixed(2)}% of all rows.`;
  if (s4) s4.textContent = `${m.proximity.twentyFive.toFixed(2)}% of paired records are within +/-25 years.`;
  if (s5) s5.textContent = `Transit overlay is symbolic only; year-level proximity, non-causal.`;
  if (s6) s6.textContent = `Synthesis: temporal, geographic, and historical alignment in one story arc.`;
}

function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}

function drawAxes(ctx, { left, top, width, height, xLabelStart, xLabelEnd }) {
  ctx.strokeStyle = "#273349";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, top + height);
  ctx.lineTo(left + width, top + height);
  ctx.stroke();
  ctx.fillStyle = "#8f9aad";
  ctx.font = "11px \"Special Elite\"";
  ctx.fillText(String(xLabelStart), left, top + height + 16);
  ctx.fillText(String(xLabelEnd), left + width - 28, top + height + 16);
}

function drawTimelineDensity(m) {
  const canvas = document.getElementById("mainViz");
  const ctx = setupCanvas(canvas);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  const pad = { left: 34, right: 16, top: 24, bottom: 30 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const min = m.minYear;
  const max = m.maxYear;
  const bins = 30;
  const arr = Array(bins).fill(0);
  m.objectYears.forEach((y) => {
    const idx = Math.max(0, Math.min(bins - 1, Math.floor(((y - min) / (max - min)) * bins)));
    arr[idx] += 1;
  });
  const peak = Math.max(...arr, 1);
  drawAxes(ctx, { left: pad.left, top: pad.top, width: plotW, height: plotH, xLabelStart: min, xLabelEnd: max });
  const bw = plotW / bins;
  arr.forEach((v, i) => {
    const bh = (v / peak) * (plotH - 4);
    const x = pad.left + i * bw + 1;
    const y = pad.top + plotH - bh;
    ctx.fillStyle = "#7eb8ef";
    ctx.fillRect(x, y, Math.max(1, bw - 2), bh);
  });
}

function drawCountryBars(m) {
  const canvas = document.getElementById("mainViz");
  const ctx = setupCanvas(canvas);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  const data = m.topCountries.slice(0, 8);
  const max = Math.max(...data.map((d) => d[1]), 1);
  const left = 130;
  const right = 18;
  const top = 18;
  const bottom = 18;
  const plotW = w - left - right;
  const rowH = (h - top - bottom) / data.length;
  ctx.font = "12px \"Special Elite\"";
  data.forEach((d, i) => {
    const y = top + i * rowH + rowH * 0.65;
    const bw = (d[1] / max) * plotW;
    ctx.fillStyle = "#97d5b7";
    ctx.fillRect(left, y - 9, bw, 12);
    ctx.fillStyle = "#9aa6ba";
    ctx.fillText(d[0], 8, y);
    ctx.fillStyle = "#f4f2ea";
    ctx.fillText(String(d[1]), left + bw + 6, y);
  });
}

function drawIncidentAlignment(m) {
  const canvas = document.getElementById("mainViz");
  const ctx = setupCanvas(canvas);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  const left = 30;
  const right = 16;
  const top = 24;
  const bottom = 34;
  const plotW = w - left - right;
  const mid = h * 0.56;
  const min = m.minYear;
  const max = m.maxYear;
  const xFor = (y) => left + ((y - min) / (max - min)) * plotW;
  ctx.strokeStyle = "#273349";
  ctx.beginPath();
  ctx.moveTo(left, mid);
  ctx.lineTo(left + plotW, mid);
  ctx.stroke();
  ctx.fillStyle = "#eac07a";
  state.globalAnchors.forEach((a) => {
    const x = xFor(a.year);
    ctx.fillRect(x - 1, top, 2, mid - top - 6);
    ctx.fillStyle = "#9aa6ba";
    ctx.font = "10px \"Special Elite\"";
    ctx.fillText(a.label, Math.min(x + 4, w - 85), top + 10);
    ctx.fillStyle = "#eac07a";
  });
  ctx.fillStyle = "#7eb8ef";
  m.objectYears.forEach((y) => {
    const x = xFor(y);
    const jitter = (Math.random() - 0.5) * 18;
    ctx.beginPath();
    ctx.arc(x, mid + 11 + jitter, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#8f9aad";
  ctx.font = "11px \"Special Elite\"";
  ctx.fillText(String(min), left, h - 10);
  ctx.fillText(String(max), left + plotW - 30, h - 10);
}

function drawTransitOverlay(m) {
  const canvas = document.getElementById("mainViz");
  const ctx = setupCanvas(canvas);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);
  const left = 30;
  const right = 16;
  const top = 20;
  const bottom = 30;
  const plotW = w - left - right;
  const mid = h * 0.58;
  const min = m.minYear;
  const max = m.maxYear;
  const xFor = (y) => left + ((y - min) / (max - min)) * plotW;

  ctx.strokeStyle = "#273349";
  ctx.beginPath();
  ctx.moveTo(left, mid);
  ctx.lineTo(left + plotW, mid);
  ctx.stroke();

  ctx.strokeStyle = "#eac07a";
  state.transitYears.forEach((y) => {
    const x = xFor(y);
    ctx.beginPath();
    ctx.moveTo(x, top + 8);
    ctx.lineTo(x, mid - 10);
    ctx.stroke();
  });

  ctx.fillStyle = "#7eb8ef";
  m.objectYears.forEach((y) => {
    const x = xFor(y);
    const jitter = (Math.random() - 0.5) * 16;
    ctx.beginPath();
    ctx.arc(x, mid + 10 + jitter, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#8f9aad";
  ctx.font = "11px \"Special Elite\"";
  ctx.fillText(String(min), left, h - 10);
  ctx.fillText(String(max), left + plotW - 30, h - 10);
}

function drawFinalCards(m) {
  const canvas = document.getElementById("mainViz");
  const ctx = setupCanvas(canvas);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  const cards = [
    { label: "Temporal Concentration", value: "18th century strongest cluster" },
    { label: "Spatial Concentration", value: `${m.top5Share.toFixed(2)}% in top 5 countries` },
    { label: "History Alignment", value: `${m.proximity.twentyFive.toFixed(2)}% within +/-25 yrs` },
  ];

  const gap = 16;
  const pad = 20;
  const cardW = (w - pad * 2 - gap * 2) / 3;
  const cardH = h - 60;
  cards.forEach((c, i) => {
    const x = pad + i * (cardW + gap);
    const y = 28;
    ctx.fillStyle = "#121a29";
    ctx.strokeStyle = "#2a374f";
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, cardW, cardH);
    ctx.strokeRect(x, y, cardW, cardH);
    ctx.fillStyle = "#eac07a";
    ctx.font = "12px \"Special Elite\"";
    ctx.fillText(c.label, x + 12, y + 22);
    ctx.fillStyle = "#f2efe6";
    ctx.font = "14px \"Special Elite\"";
    wrapText(ctx, c.value, x + 12, y + 50, cardW - 24, 20);
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && i > 0) {
      ctx.fillText(line, x, yy);
      line = words[i] + " ";
      yy += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawSubViz(m, stepIdx) {
  const canvas = document.getElementById("subViz");
  const ctx = setupCanvas(canvas);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  ctx.clearRect(0, 0, w, h);

  if (stepIdx === 2) {
    const data = m.topCities.slice(0, 7);
    const max = Math.max(...data.map((d) => d[1]), 1);
    const left = 120;
    const right = 12;
    const top = 16;
    const rowH = (h - top - 12) / data.length;
    ctx.font = '11px "Special Elite"';
    data.forEach((d, i) => {
      const y = top + i * rowH + rowH * 0.65;
      const bw = ((w - left - right) * d[1]) / max;
      ctx.fillStyle = "#6dbf9f";
      ctx.fillRect(left, y - 8, bw, 10);
      ctx.fillStyle = "#a8b2c2";
      ctx.fillText(d[0], 6, y);
      ctx.fillStyle = "#f2efe6";
      ctx.fillText(String(d[1]), left + bw + 6, y);
    });
    return;
  }

  if (stepIdx === 3) {
    const bins = [1, 5, 10, 25, 50];
    const counts = bins.map((b) => m.deltas.filter((d) => d <= b).length);
    const max = Math.max(...counts, 1);
    const left = 70;
    const right = 12;
    const top = 18;
    const rowH = (h - top - 12) / bins.length;
    ctx.font = '11px "Special Elite"';
    bins.forEach((b, i) => {
      const y = top + i * rowH + rowH * 0.65;
      const bw = ((w - left - right) * counts[i]) / max;
      ctx.fillStyle = "#e88f66";
      ctx.fillRect(left, y - 8, bw, 10);
      ctx.fillStyle = "#a8b2c2";
      ctx.fillText(`<= ${b}`, 6, y);
      ctx.fillStyle = "#f2efe6";
      ctx.fillText(String(counts[i]), left + bw + 6, y);
    });
    return;
  }

  if (stepIdx === 4) {
    const min = m.minYear;
    const max = m.maxYear;
    const left = 26;
    const right = 14;
    const plotW = w - left - right;
    const mid = h * 0.6;
    const xFor = (y) => left + ((y - min) / (max - min)) * plotW;
    ctx.strokeStyle = "#273349";
    ctx.beginPath();
    ctx.moveTo(left, mid);
    ctx.lineTo(left + plotW, mid);
    ctx.stroke();
    state.transitYears.forEach((y) => {
      const x = xFor(y);
      ctx.strokeStyle = "#7ea8ff";
      ctx.beginPath();
      ctx.moveTo(x, 18);
      ctx.lineTo(x, mid - 8);
      ctx.stroke();
    });
    ctx.fillStyle = "#8f9aad";
    ctx.font = '10px "Special Elite"';
    ctx.fillText("Transit markers", 8, 12);
    return;
  }

  ctx.fillStyle = "#8f9aad";
  ctx.font = '12px "Special Elite"';
  ctx.fillText("Scroll to activate section-specific supporting chart", 14, h / 2);
}

function updateLegend(stepIdx) {
  const legend = document.getElementById("legend");
  if (stepIdx === 0 || stepIdx === 1) {
    legend.innerHTML =
      '<span><i class="dot-legend" style="background:#7ea8ff"></i>Object-year density</span>';
  } else if (stepIdx === 2) {
    legend.innerHTML =
      '<span><i class="dot-legend" style="background:#65b69c"></i>Country count bars</span><span><i class="dot-legend" style="background:#6dbf9f"></i>Top city bars</span>';
  } else if (stepIdx === 3) {
    legend.innerHTML =
      '<span><i class="dot-legend" style="background:#7ea8ff"></i>Object-year dots</span><span><i class="dot-legend" style="background:#eac07a"></i>Historical anchors</span>';
  } else if (stepIdx === 4) {
    legend.innerHTML =
      '<span><i class="dot-legend" style="background:#7ea8ff"></i>Object years</span><span><i class="dot-legend" style="background:#eac07a"></i>Transit years</span>';
  } else {
    legend.innerHTML =
      '<span><i class="dot-legend" style="background:#e0af5f"></i>Final takeaways</span>';
  }
}

function updateVizMeta(stepIdx) {
  const titles = [
    "Section 1: Introduction",
    "Section 2: Temporal Patterns",
    "Section 3: Creation Geography",
    "Section 4: Historical Alignment",
    "Section 5: Transit Overlay",
    "Section 6: Final Synthesis",
  ];
  const descs = [
    "Creation-year timeline across 1701-2022.",
    "Century and decade concentrations in the dataset.",
    "Country concentration and city-level emphasis.",
    "Object vs incident year proximity and global anchors.",
    "Symbolic, non-causal transit proximity view.",
    "Three quantitative takeaways for the narrative close.",
  ];
  document.getElementById("vizTitle").textContent = titles[stepIdx] || titles[0];
  document.getElementById("vizDesc").textContent = descs[stepIdx] || descs[0];
}

function updateProgressDots(stepIdx) {
  document.querySelectorAll(".progress-dot").forEach((dot, idx) => {
    dot.classList.toggle("active", idx === stepIdx);
  });
}

function updateActiveStep(stepIdx) {
  state.activeStep = stepIdx;
  document.querySelectorAll(".step").forEach((el, i) => {
    el.classList.toggle("is-active", i === stepIdx);
  });
  const m = state.metrics;
  if (!m) return;
  updateVizMeta(stepIdx);
  updateLegend(stepIdx);
  updateProgressDots(stepIdx);
  switch (stepIdx) {
    case 0:
    case 1:
      drawTimelineDensity(m);
      break;
    case 2:
      drawCountryBars(m);
      break;
    case 3:
      drawIncidentAlignment(m);
      break;
    case 4:
      drawTransitOverlay(m);
      break;
    case 5:
      drawFinalCards(m);
      break;
    default:
      drawTimelineDensity(m);
  }
  drawSubViz(m, stepIdx);
}

function setupScroller() {
  const steps = [...document.querySelectorAll(".step")];
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const idx = Math.max(0, Number(entry.target.dataset.step || "1") - 1);
          updateActiveStep(idx);
        }
      });
    },
    { threshold: 0.55, rootMargin: "-10% 0px -15% 0px" }
  );
  steps.forEach((s) => observer.observe(s));
}

function setupResize() {
  window.addEventListener("resize", () => {
    updateActiveStep(state.activeStep);
  });
}

async function main() {
  const csvText = await fetch("../ObjectsvsHistory.csv").then((r) => r.text());
  state.rows = parseCSV(csvText);
  state.metrics = summarize(state.rows);
  fillKpis(state.metrics);
  fillStepSnippets(state.metrics);
  setupScroller();
  setupResize();
  updateActiveStep(0);
}

main().catch((err) => {
  console.error(err);
  const fallback = document.createElement("div");
  fallback.style.padding = "1rem";
  fallback.style.color = "#ffd4a8";
  fallback.textContent = "Failed to load data. Ensure server root is /workspace.";
  document.body.prepend(fallback);
});
