'use strict';

/* =========================================================
   Prog Muscu — programme de musculation à la maison
   Données stockées localement sur l'appareil (localStorage).
   Le contenu du programme est dans program.js.
   ========================================================= */

const LOGS_KEY = 'progmuscu.logs.v1';
const SETTINGS_KEY = 'progmuscu.settings.v1';

const state = {
  logs: {},
  settings: { level: 0, sound: true, autoRest: true, welcomed: false },
  tab: 'today',
  month: startOfMonth(new Date()),
  exFilter: 'all',
  exSearch: '',
};

/* ---------------- Storage ---------------- */

function load() {
  try {
    const raw = localStorage.getItem(LOGS_KEY);
    if (raw) state.logs = JSON.parse(raw) || {};
  } catch (e) { state.logs = {}; }
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) Object.assign(state.settings, JSON.parse(raw));
  } catch (e) { /* valeurs par défaut */ }
}

function save() {
  try {
    localStorage.setItem(LOGS_KEY, JSON.stringify(state.logs));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch (e) {
    toast('⚠️ Impossible d\'enregistrer');
  }
}

/* ---------------- Dates ---------------- */

function pad(n) { return String(n).padStart(2, '0'); }
function toKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addDays(k, n) { const d = parseKey(k); d.setDate(d.getDate() + n); return toKey(d); }
function todayKey() { return toKey(new Date()); }
function weekdayIdx(k) { return (parseKey(k).getDay() + 6) % 7; } // 0 = lundi
function mondayOf(k) { return addDays(k, -weekdayIdx(k)); }

const fmt = {
  long: (k) => parseKey(k).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
  short: (k) => parseKey(k).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
  month: (d) => d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
  mon: (k) => parseKey(k).toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
  clock: (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; },
  dur: (s) => {
    if (s < 60) return `${s} s`;
    const m = Math.floor(s / 60); const r = s % 60;
    if (m >= 60) return `${Math.floor(m / 60)} h ${pad(m % 60)}`;
    return r ? `${m} min ${pad(r)}` : `${m} min`;
  },
  kg: (n) => `${String(Math.round(n * 10) / 10).replace('.', ',')} kg`,
  km: (n) => `${String(Math.round(n * 100) / 100).replace('.', ',')} km`,
};

/* ---------------- Programme ---------------- */

// Séance normalisée pour un jour du programme et un niveau
function session(dayIdx, level = state.settings.level) {
  const d = WEEK[dayIdx];
  const L = Math.max(0, Math.min(2, level));
  const block = (b, key) => ({ key, ex: b.ex, sets: b.sets[L], reps: b.reps, rest: b.rest, secs: b.secs ? b.secs[L] : 0 });
  return {
    ...d,
    dayIdx,
    minutes: d.minutes[L],
    blocks: (d.blocks || []).map((b, i) => block(b, `b${i}`)),
    after: (d.after || []).map((b, i) => block(b, `a${i}`)),
    circuit: d.circuit ? { rounds: d.circuit.rounds[L], rest: d.circuit.rest, items: d.circuit.items } : null,
    run: d.run ? d.run[L] : null,
  };
}

function runSeconds(run) { return run.phases.reduce((s, p) => s + p[1], 0); }

function sessionSummary(s) {
  if (s.kind === 'run') return s.run.summary;
  if (s.kind === 'rest') return `${s.run.summary} + étirements`;
  if (s.circuit) return `Circuit ${s.circuit.rounds} tours + ${s.run.summary.toLowerCase()}`;
  return `${s.blocks.length} exercices · ${s.blocks.reduce((n, b) => n + b.sets, 0)} séries`;
}

function defaultDay(k) { return weekdayIdx(k); }

/* ---------------- Journal ---------------- */

function getLog(k) { return state.logs[k] || null; }

function ensureLog(k) {
  if (!state.logs[k]) state.logs[k] = { day: defaultDay(k), sets: {}, kg: {} };
  const log = state.logs[k];
  if (!log.startedAt) log.startedAt = Date.now();
  return log;
}

function dayOf(k) { const l = getLog(k); return l ? l.day : defaultDay(k); }

function setsArr(log, key, n) {
  const arr = (log && log.sets && log.sets[key]) || [];
  return Array.from({ length: n }, (_, i) => !!arr[i]);
}

// Progression d'une séance (unités faites / total)
function progress(k) {
  const log = getLog(k);
  const s = session(dayOf(k));
  let total = 0; let done = 0;
  const count = (key, n) => { total += n; done += setsArr(log, key, n).filter(Boolean).length; };
  if (s.warmup) { total += 1; if (log && log.warm) done += 1; }
  s.blocks.forEach((b) => count(b.key, b.sets));
  if (s.circuit) count('circuit', s.circuit.rounds);
  if (s.run) { total += 1; if (log && log.run) done += 1; }
  s.after.forEach((b) => count(b.key, b.sets));
  if (s.stretch) count('stretch', s.stretch.length);
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

function doneLogs() {
  return Object.keys(state.logs).filter((k) => state.logs[k].done).sort();
}

// Historique des charges pour un exercice : [{ k, kg, full }]
function kgHistory(exId) {
  const out = [];
  Object.keys(state.logs).sort().forEach((k) => {
    const log = state.logs[k];
    const kg = log.kg && Number(log.kg[exId]);
    if (!kg) return;
    const s = session(log.day);
    const b = [...s.blocks, ...s.after].find((x) => x.ex === exId);
    const arr = b && log.sets && log.sets[b.key];
    out.push({ k, kg, full: !!(arr && arr.length >= b.sets && arr.slice(0, b.sets).every(Boolean)) });
  });
  return out;
}

function lastKgBefore(exId, k) {
  const h = kgHistory(exId).filter((x) => x.k < k);
  return h.length ? h[h.length - 1] : null;
}

function streak() {
  let k = todayKey();
  if (!(state.logs[k] && state.logs[k].done)) k = addDays(k, -1);
  let n = 0;
  while (state.logs[k] && state.logs[k].done) { n++; k = addDays(k, -1); }
  return n;
}

/* ---------------- Utils ---------------- */

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
}
function haptic(p = 8) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* iOS : pas de vibration */ } }

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------------- Son ---------------- */

let actx = null;
function audio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
  }
  if (actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}
function beep(freq = 880, dur = 0.12, vol = 0.3) {
  if (!state.settings.sound) return;
  try {
    const ctx = audio();
    if (!ctx) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur + 0.05);
  } catch (e) { /* pas de son */ }
}
function beepEnd() { beep(1320, 0.35, 0.35); haptic([120, 60, 120]); }
// iOS : le son doit être « débloqué » par un premier geste
document.addEventListener('touchend', function unlock() { audio(); document.removeEventListener('touchend', unlock); }, { once: true });

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) { wakeLock = null; }
}

/* ---------------- Icônes ---------------- */

const ICON = {
  chevL: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  chevR: '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" stroke-width="3.2"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M5 5l10 7-10 7z" fill="currentColor"/><path d="M19 5v14" stroke-width="2.6"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M19 5L9 12l10 7z" fill="currentColor"/><path d="M5 5v14" stroke-width="2.6"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  timer: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 15V3M7 8l5-5 5 5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4"/></svg>',
  sound: '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  run: '<svg viewBox="0 0 24 24"><circle cx="14.5" cy="4.5" r="2"/><path d="M8 21l3-6 3 2v5M6 11l3-3 4 1 2 3 3 1M11 15l-1-4"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12 22c4 0 7-2.7 7-6.8 0-4.5-4-6.7-4.6-11.2-2.9 2-4.9 5-4.4 8.3-1.2-.6-2-1.8-2.3-3C6.3 11 5 13 5 15.2 5 19.3 8 22 12 22z"/></svg>',
};

/* ---------------- Rendu : onglets ---------------- */

const view = document.getElementById('view');

function render() {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === state.tab));
  if (state.tab === 'today') renderToday();
  else if (state.tab === 'week') renderWeek();
  else if (state.tab === 'exercises') renderExercises();
  else if (state.tab === 'stats') renderStats();
  else renderSettings();
}

function chips(equip) {
  return equip.map((e) => `<span class="chip ${EQUIP[e].cls}">${EQUIP[e].label}</span>`).join('');
}

function ring(pct, size = 64, stroke = 7) {
  const r = (size - stroke) / 2; const c = 2 * Math.PI * r;
  return `<svg class="ring" viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-bg"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" class="ring-fg"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
  </svg>`;
}

/* ---------- Aujourd'hui ---------- */

function renderToday() {
  const k = todayKey();
  const log = getLog(k);
  const s = session(dayOf(k));
  const p = progress(k);
  const swapped = log && log.day !== defaultDay(k);
  const L = LEVELS[state.settings.level];
  let n = 0;

  const blockHTML = (b) => exerciseCard(k, log, b, ++n);

  view.innerHTML = `
    <header class="header">
      <div><div class="eyebrow">${esc(fmt.long(k))}</div><h1 class="title">Aujourd'hui</h1></div>
      <div class="header-actions"><button class="pill-btn" data-act="swap">${ICON.swap} Changer</button></div>
    </header>

    <section class="hero" style="--c:${s.color}">
      <div class="hero-main">
        <div class="hero-emoji">${s.emoji}</div>
        <div>
          <div class="hero-eyebrow">${swapped ? `Séance du ${WEEKDAYS[s.dayIdx].toLowerCase()}` : WEEKDAYS[s.dayIdx]} · ${L}</div>
          <h2 class="hero-title">${esc(s.title)}</h2>
          <div class="hero-sub">≈ ${s.minutes} min · ${esc(sessionSummary(s))}</div>
        </div>
      </div>
      <div class="hero-ring">${ring(log && log.done ? 100 : p.pct)}<b>${log && log.done ? '✓' : `${p.pct}%`}</b></div>
    </section>
    ${log && log.done ? `<div class="done-banner">${ICON.check} Séance terminée — bravo ! 🎉</div>` : ''}
    ${swapped ? '<button class="link-btn" data-act="unswap">Revenir à la séance prévue aujourd\'hui</button>' : ''}
    ${s.note ? `<p class="tip">💡 ${esc(s.note)}</p>` : ''}

    ${s.warmup ? routineCard('Échauffement', '🔥', s.warmup, 'warm', !!(log && log.warm)) : ''}

    ${s.blocks.length ? `<h3 class="section-title">Exercices</h3>${s.blocks.map(blockHTML).join('')}` : ''}
    ${s.finisher ? `<p class="tip">🏁 ${esc(s.finisher)}</p>` : ''}

    ${s.circuit ? circuitCard(k, log, s.circuit) : ''}

    ${s.run ? runCard(log, s.run) : ''}

    ${s.after.length ? `<h3 class="section-title">Renforcement</h3>${s.after.map(blockHTML).join('')}` : ''}

    ${s.stretch ? stretchCard(log, s.stretch) : ''}

    ${log && log.done
    ? `<button class="btn secondary" data-act="reopen">Rouvrir la séance</button>`
    : `<button class="btn" data-act="finish" style="--c:${s.color}">${ICON.check} Terminer la séance</button>`}
    <p class="hint center">Les séries cochées et les charges sont enregistrées automatiquement.</p>
  `;
}

function exerciseCard(k, log, b, num) {
  const ex = EXERCISES[b.ex];
  const arr = setsArr(log, b.key, b.sets);
  const allDone = arr.every(Boolean);
  const last = ex.weighted ? lastKgBefore(b.ex, k) : null;
  const kg = log && log.kg && log.kg[b.ex] !== undefined ? log.kg[b.ex] : (last ? last.kg : '');
  const hint = last && last.full && !allDone
    ? `<div class="up">📈 Toutes les séries réussies la dernière fois : tente un peu plus lourd.</div>` : '';
  return `
  <article class="ex${allDone ? ' complete' : ''}">
    <button class="ex-head" data-act="ex" data-id="${b.ex}">
      <span class="ex-num">${allDone ? ICON.check : num}</span>
      <span class="main">
        <span class="name">${esc(ex.name)}</span>
        <span class="sub">${b.sets} × ${esc(b.reps)} · repos ${fmt.clock(b.rest)}</span>
      </span>
      ${ICON.chevR}
    </button>
    ${ex.weighted ? `
    <div class="kg-row">
      <span class="kg-label">Charge <small>(par haltère)</small></span>
      <div class="stepper">
        <button data-act="kg" data-ex="${b.ex}" data-d="-1" aria-label="Moins">−</button>
        <input type="number" inputmode="decimal" step="0.5" min="0" data-kg="${b.ex}" value="${esc(kg)}" placeholder="0">
        <span>kg</span>
        <button data-act="kg" data-ex="${b.ex}" data-d="1" aria-label="Plus">+</button>
      </div>
    </div>
    ${last ? `<div class="last">Dernière fois : ${fmt.kg(last.kg)} · ${esc(fmt.short(last.k))}</div>` : ''}` : ''}
    <div class="sets">
      ${arr.map((on, i) => `<button class="set${on ? ' on' : ''}" data-act="set" data-key="${b.key}" data-i="${i}" data-ex="${b.ex}" data-rest="${b.rest}" data-secs="${b.secs || 0}">
        ${on ? ICON.check : (b.secs ? `${ICON.play}<small>${b.secs}s</small>` : i + 1)}</button>`).join('')}
    </div>
    ${hint}
  </article>`;
}

function routineCard(title, emoji, items, act, done) {
  const total = items.reduce((s, x) => s + x[1], 0);
  return `
  <h3 class="section-title">${title}</h3>
  <article class="ex${done ? ' complete' : ''}">
    <div class="routine">
      ${items.map((x) => `<div class="r-item"><span>${esc(x[0])}${x[2] ? ` <small>${esc(x[2])}</small>` : ''}</span><b>${fmt.dur(x[1])}</b></div>`).join('')}
    </div>
    <div class="row-btns">
      <button class="mini-btn primary" data-act="guide-${act}">${ICON.play} Chrono guidé · ${fmt.dur(total)}</button>
      <button class="mini-btn${done ? ' on' : ''}" data-act="toggle-${act}">${ICON.check} ${done ? 'Fait' : 'Marquer fait'}</button>
    </div>
  </article>`;
}

function stretchCard(log, items) {
  const arr = setsArr(log, 'stretch', items.length);
  const total = items.reduce((s, x) => s + x[1], 0);
  return `
  <h3 class="section-title">Étirements & mobilité</h3>
  <article class="ex${arr.every(Boolean) ? ' complete' : ''}">
    <div class="routine">
      ${items.map((x, i) => `<button class="r-item check" data-act="stretch" data-i="${i}">
        <span class="box${arr[i] ? ' on' : ''}">${arr[i] ? ICON.check : ''}</span>
        <span class="grow">${esc(x[0])}${x[2] ? `<small>${esc(x[2])}</small>` : ''}</span><b>${fmt.dur(x[1])}</b></button>`).join('')}
    </div>
    <div class="row-btns"><button class="mini-btn primary" data-act="guide-stretch">${ICON.play} Chrono guidé · ${fmt.dur(total)}</button></div>
  </article>`;
}

function circuitCard(k, log, c) {
  const arr = setsArr(log, 'circuit', c.rounds);
  return `
  <h3 class="section-title">Circuit · ${c.rounds} tours</h3>
  <article class="ex${arr.every(Boolean) ? ' complete' : ''}">
    <div class="routine">
      ${c.items.map((it, i) => {
    const ex = EXERCISES[it.ex];
    const last = ex.weighted ? lastKgBefore(it.ex, k) : null;
    const kg = log && log.kg && log.kg[it.ex] !== undefined ? log.kg[it.ex] : (last ? last.kg : '');
    return `<div class="c-item">
          <button class="r-item" data-act="ex" data-id="${it.ex}"><span><i class="c-n">${i + 1}</i>${esc(ex.name)}</span><b>${esc(it.reps)}</b></button>
          ${ex.weighted ? `<div class="stepper small">
            <button data-act="kg" data-ex="${it.ex}" data-d="-1">−</button>
            <input type="number" inputmode="decimal" step="0.5" min="0" data-kg="${it.ex}" value="${esc(kg)}" placeholder="0"><span>kg</span>
            <button data-act="kg" data-ex="${it.ex}" data-d="1">+</button></div>` : ''}
        </div>`;
  }).join('')}
    </div>
    <div class="last">Enchaîne les ${c.items.length} exercices sans pause, puis ${fmt.clock(c.rest)} de repos. Coche chaque tour :</div>
    <div class="sets">
      ${arr.map((on, i) => `<button class="set wide${on ? ' on' : ''}" data-act="set" data-key="circuit" data-i="${i}" data-rest="${c.rest}">${on ? ICON.check : `Tour ${i + 1}`}</button>`).join('')}
    </div>
  </article>`;
}

function runCard(log, run) {
  const done = !!(log && log.run);
  const kinds = {};
  run.phases.forEach((p) => { kinds[p[2]] = (kinds[p[2]] || 0) + p[1]; });
  const total = runSeconds(run);
  return `
  <h3 class="section-title">Course</h3>
  <article class="ex run-card${done ? ' complete' : ''}">
    <div class="run-top">
      <div class="run-ic">${ICON.run}</div>
      <div class="main"><div class="name">${esc(run.summary)}</div><div class="sub">Durée totale ${fmt.dur(total)}</div></div>
    </div>
    <div class="phase-bar">${run.phases.map((p) => `<i class="k-${p[2]}" style="flex:${p[1]}"></i>`).join('')}</div>
    <div class="phase-legend">${Object.keys(kinds).map((kd) => `<span><i class="k-${kd}"></i>${PHASE_LABEL[kd]} ${fmt.dur(kinds[kd])}</span>`).join('')}</div>
    ${done ? `<div class="last">✓ Course faite${log.km ? ` · ${fmt.km(log.km)}` : ''}${log.runSec ? ` · ${fmt.dur(log.runSec)}` : ''}</div>` : ''}
    <div class="row-btns">
      <button class="mini-btn primary" data-act="guide-run">${ICON.play} Lancer la course guidée</button>
      <button class="mini-btn${done ? ' on' : ''}" data-act="run-done">${ICON.check} ${done ? 'Modifier' : 'Faite'}</button>
    </div>
  </article>`;
}

/* ---------- Semaine ---------- */

function renderWeek() {
  const today = todayKey();
  const mon = mondayOf(today);
  const doneThisWeek = WEEK.filter((_, i) => { const l = getLog(addDays(mon, i)); return l && l.done; }).length;

  view.innerHTML = `
    <header class="header">
      <div><div class="eyebrow">Niveau ${LEVELS[state.settings.level].toLowerCase()}</div><h1 class="title">Ma semaine</h1></div>
      <div class="week-count"><b>${doneThisWeek}</b>/7</div>
    </header>
    <p class="tip">Programme maison : haltères, banc et poids du corps + 3 sorties course. Touchez un jour pour voir la séance ou la faire aujourd'hui.</p>
    ${WEEK.map((_, i) => {
    const k = addDays(mon, i);
    const log = getLog(k);
    const s = session(dayOf(k));
    const isToday = k === today;
    const p = log ? progress(k) : null;
    return `
      <button class="card day-card${isToday ? ' today' : ''}${log && log.done ? ' done' : ''}" data-act="preview" data-day="${s.dayIdx}" style="--c:${s.color}">
        <span class="dbox"><span class="d">${parseKey(k).getDate()}</span><span class="m">${WEEKDAYS[i].slice(0, 3)}</span></span>
        <span class="main">
          <span class="name">${s.emoji} ${esc(s.title)}</span>
          <span class="sub">${esc(sessionSummary(s))}</span>
        </span>
        <span class="right">${log && log.done ? `<span class="okdot">${ICON.check}</span>`
      : isToday ? '<span class="badge">Aujourd\'hui</span>'
        : p && p.done ? `<span class="small-pct">${p.pct}%</span>` : `<span class="mins">${s.minutes}′</span>`}</span>
      </button>`;
  }).join('')}

    <h3 class="section-title">Comment progresser</h3>
    <div class="group"><div class="notes">• <b>Double progression</b> : quand tu réussis toutes les séries en haut de la fourchette (ex. 4 × 12), augmente la charge la séance suivante et repars en bas (4 × 8).
• <b>Tempo</b> : descente lente (2-3 s), montée dynamique.
• <b>Course</b> : augmente d'environ 10 % par semaine maximum.
• Passe au <b>niveau supérieur</b> (Réglages) après 4 à 6 semaines régulières.
• Dors 7-9 h et mange suffisamment de protéines (≈ 1,6 g/kg/jour).</div></div>
  `;
}

function sessionListHTML(s) {
  const rows = [];
  if (s.warmup) rows.push(`<div class="row"><span class="k">🔥 Échauffement</span><span class="v">${fmt.dur(s.warmup.reduce((a, x) => a + x[1], 0))}</span></div>`);
  s.blocks.forEach((b) => rows.push(`<button class="row" data-act="ex" data-id="${b.ex}"><span class="k2">${esc(EXERCISES[b.ex].name)}</span><span class="v">${b.sets} × ${esc(b.reps)}</span></button>`));
  if (s.circuit) {
    rows.push(`<div class="row"><span class="k">🔁 Circuit</span><span class="v">${s.circuit.rounds} tours · repos ${fmt.clock(s.circuit.rest)}</span></div>`);
    s.circuit.items.forEach((it) => rows.push(`<button class="row" data-act="ex" data-id="${it.ex}"><span class="k2">${esc(EXERCISES[it.ex].name)}</span><span class="v">${esc(it.reps)}</span></button>`));
  }
  if (s.run) rows.push(`<div class="row"><span class="k">🏃 Course</span><span class="v">${esc(s.run.summary)}</span></div>`);
  s.after.forEach((b) => rows.push(`<button class="row" data-act="ex" data-id="${b.ex}"><span class="k2">${esc(EXERCISES[b.ex].name)}</span><span class="v">${b.sets} × ${esc(b.reps)}</span></button>`));
  if (s.stretch) rows.push(`<div class="row"><span class="k">🧘 Étirements</span><span class="v">${s.stretch.length} postures</span></div>`);
  return `<div class="group">${rows.join('')}</div>`;
}

function openPreview(dayIdx) {
  const s = session(dayIdx);
  const isTodays = dayOf(todayKey()) === dayIdx;
  openSheet({
    title: WEEKDAYS[dayIdx],
    right: '<button class="txt-btn r" data-close>OK</button>',
    body: `
      <div class="preview-head" style="--c:${s.color}"><div class="hero-emoji">${s.emoji}</div><h3>${esc(s.title)}</h3><p>≈ ${s.minutes} min · niveau ${LEVELS[state.settings.level].toLowerCase()}</p></div>
      ${s.note ? `<p class="tip">💡 ${esc(s.note)}</p>` : ''}
      ${sessionListHTML(s)}
      ${isTodays ? '<button class="btn" data-act="goto-today" data-close>Voir la séance du jour</button>'
    : `<button class="btn" data-act="do-today" data-day="${dayIdx}">Faire cette séance aujourd'hui</button>`}
    `,
  });
}

function swapToday(dayIdx) {
  const k = todayKey();
  const log = getLog(k);
  if (log && log.day !== dayIdx && progress(k).done > 0 && !log.done
    && !confirm('Tu as déjà commencé la séance du jour.\nChanger de séance efface ce qui est coché ?')) return false;
  if (log && log.done && log.day !== dayIdx && !confirm('La séance du jour est déjà terminée. La remplacer ?')) return false;
  state.logs[k] = { day: dayIdx, sets: {}, kg: {} };
  if (dayIdx === defaultDay(k)) delete state.logs[k];
  save();
  return true;
}

function openSwap() {
  const cur = dayOf(todayKey());
  openSheet({
    title: 'Choisir la séance',
    left: '<button class="txt-btn" data-close>Annuler</button>',
    body: `<p class="hint" style="margin:0 4px 12px">Pas envie de la séance prévue ou journée décalée ? Choisis une autre séance du programme pour aujourd'hui.</p>
      ${WEEK.map((_, i) => {
    const s = session(i);
    return `<button class="card day-card${i === cur ? ' today' : ''}" data-act="pick-day" data-day="${i}" style="--c:${s.color}">
          <span class="dbox"><span class="d">${s.emoji}</span><span class="m">${WEEKDAYS[i].slice(0, 3)}</span></span>
          <span class="main"><span class="name">${esc(s.title)}</span><span class="sub">≈ ${s.minutes} min · ${esc(sessionSummary(s))}</span></span>
          ${i === cur ? `<span class="okdot">${ICON.check}</span>` : ''}
        </button>`;
  }).join('')}`,
  });
}

/* ---------- Exercices ---------- */

function renderExercises() {
  view.innerHTML = `
    <header class="header"><div><div class="eyebrow">${Object.keys(EXERCISES).length} mouvements</div><h1 class="title">Exercices</h1></div></header>
    <label class="search">${ICON.search}<input id="exSearch" type="search" placeholder="Rechercher un exercice, un muscle…" value="${esc(state.exSearch)}"></label>
    <div class="segmented" id="exFilter">
      ${[['all', 'Tous'], ['db', 'Haltères'], ['bench', 'Banc'], ['bw', 'Poids du corps']].map(([v, l]) => `<button data-v="${v}" class="${state.exFilter === v ? 'on' : ''}">${l}</button>`).join('')}
    </div>
    <div id="exList"></div>`;
  renderExList();
  const input = document.getElementById('exSearch');
  input.addEventListener('input', () => { state.exSearch = input.value; renderExList(); });
  document.getElementById('exFilter').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    state.exFilter = b.dataset.v;
    document.querySelectorAll('#exFilter button').forEach((x) => x.classList.toggle('on', x === b));
    renderExList();
  });
}

function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

function renderExList() {
  const q = norm(state.exSearch.trim());
  const list = Object.entries(EXERCISES)
    .filter(([, e]) => state.exFilter === 'all' || e.equip.includes(state.exFilter))
    .filter(([, e]) => !q || norm(`${e.name} ${e.muscles}`).includes(q))
    .sort((a, b) => a[1].name.localeCompare(b[1].name, 'fr'));
  document.getElementById('exList').innerHTML = list.length ? list.map(([id, e]) => {
    const h = e.weighted ? kgHistory(id) : [];
    return `<button class="card" data-act="ex" data-id="${id}">
      <span class="main"><span class="name">${esc(e.name)}</span><span class="sub">${esc(e.muscles)}</span><span class="chips">${chips(e.equip)}</span></span>
      <span class="right">${h.length ? `<span class="kg-badge">${fmt.kg(h[h.length - 1].kg)}</span>` : ''}${ICON.chevR}</span>
    </button>`;
  }).join('') : '<div class="empty"><div class="big">🔎</div><b>Aucun exercice</b>Essaie un autre mot.</div>';
}

function sparkline(values) {
  if (values.length < 2) return '';
  const w = 300; const h = 70; const pd = 8;
  const min = Math.min(...values); const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [pd + (i * (w - 2 * pd)) / (values.length - 1), h - pd - ((v - min) / span) * (h - 2 * pd)]);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${pts.map((p) => p.join(',')).join(' ')}"/>
    ${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3.5"/>`).join('')}
  </svg>`;
}

function openExercise(id) {
  const e = EXERCISES[id];
  const used = WEEK.map((d, i) => {
    const s = session(i);
    const b = [...s.blocks, ...s.after].find((x) => x.ex === id);
    if (b) return `${WEEKDAYS[i]} · ${b.sets} × ${b.reps}`;
    if (s.circuit && s.circuit.items.some((x) => x.ex === id)) return `${WEEKDAYS[i]} · circuit`;
    return null;
  }).filter(Boolean);
  const h = e.weighted ? kgHistory(id) : [];
  const best = h.length ? Math.max(...h.map((x) => x.kg)) : 0;

  openSheet({
    title: 'Exercice',
    right: '<button class="txt-btn r" data-close>OK</button>',
    body: `
      <div class="ex-hero"><h3>${esc(e.name)}</h3><p>${esc(e.muscles)}</p><div class="chips center">${chips(e.equip)}</div></div>
      <div class="group-title">Exécution</div>
      <div class="group"><ol class="steps">${e.how.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>
      <div class="group-title">Conseil</div>
      <div class="group"><div class="notes">💡 ${esc(e.tips)}</div></div>
      ${used.length ? `<div class="group-title">Dans ton programme</div><div class="group">${used.map((u) => `<div class="row"><span>${esc(u)}</span></div>`).join('')}</div>` : ''}
      ${e.weighted ? `<div class="group-title">Mes charges</div>
        <div class="group">${h.length ? `
          ${sparkline(h.map((x) => x.kg))}
          <div class="row"><span class="k">Record</span><span class="v strong">${fmt.kg(best)}</span></div>
          ${h.slice(-8).reverse().map((x) => `<div class="row"><span class="k">${esc(fmt.short(x.k))}</span><span class="v">${fmt.kg(x.kg)}${x.full ? ' ✓' : ''}</span></div>`).join('')}`
    : '<div class="notes muted">Aucune charge enregistrée pour l\'instant. Note ta charge pendant la séance.</div>'}</div>` : ''}
    `,
  });
}

/* ---------- Suivi ---------- */

function renderStats() {
  const done = doneLogs();
  const ym = toKey(state.month).slice(0, 7);
  const monthDone = done.filter((k) => k.startsWith(ym));
  const km = monthDone.reduce((s, k) => s + (Number(state.logs[k].km) || 0), 0);
  const first = state.month;
  const startPad = (first.getDay() + 6) % 7;
  const nDays = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const today = todayKey();

  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push('<div class="day out"></div>');
  for (let d = 1; d <= nDays; d++) {
    const k = `${ym}-${pad(d)}`;
    const log = getLog(k);
    const s = log ? WEEK[log.day] : null;
    const cls = ['day'];
    if (k === today) cls.push('today');
    if (log && log.done) cls.push('done');
    else if (log && progress(k).done) cls.push('partial');
    cells.push(`<button class="${cls.join(' ')}" ${log ? `data-act="log" data-k="${k}" style="--c:${s.color}"` : ''}>
      <span>${d}</span>${log && log.done ? `<em>${s.emoji}</em>` : ''}</button>`);
  }

  const recent = done.slice(-6).reverse();
  const weighted = Object.keys(EXERCISES).filter((id) => EXERCISES[id].weighted)
    .map((id) => ({ id, h: kgHistory(id) })).filter((x) => x.h.length);

  view.innerHTML = `
    <header class="header"><div><div class="eyebrow">Suivi</div><h1 class="title">Progrès</h1></div></header>
    <div class="stats">
      <div class="stat hot"><div class="v">${streak()}</div><div class="l">Jours d'affilée 🔥</div></div>
      <div class="stat"><div class="v">${monthDone.length}</div><div class="l">Séances ce mois</div></div>
      <div class="stat run"><div class="v">${km ? String(Math.round(km * 10) / 10).replace('.', ',') : 0}</div><div class="l">km ce mois</div></div>
    </div>

    <div class="cal">
      <div class="cal-nav">
        <button class="icon-btn" data-act="month" data-d="-1" aria-label="Mois précédent">${ICON.chevL}</button>
        <b>${fmt.month(state.month)}</b>
        <button class="icon-btn" data-act="month" data-d="1" aria-label="Mois suivant">${ICON.chevR}</button>
      </div>
      <div class="cal-head">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => `<div>${x}</div>`).join('')}</div>
      <div class="cal-grid">${cells.join('')}</div>
    </div>

    <h3 class="section-title">Dernières séances</h3>
    ${recent.length ? recent.map((k) => {
    const log = state.logs[k]; const s = WEEK[log.day];
    return `<button class="card" data-act="log" data-k="${k}" style="--c:${s.color}">
        <span class="dbox"><span class="d">${parseKey(k).getDate()}</span><span class="m">${fmt.mon(k)}</span></span>
        <span class="main"><span class="name">${s.emoji} ${esc(s.title)}</span><span class="sub">${esc(logSummary(k))}</span></span>${ICON.chevR}
      </button>`;
  }).join('') : '<div class="empty"><div class="big">🏋️</div><b>Aucune séance terminée</b>Termine ta première séance pour la voir ici.</div>'}

    ${weighted.length ? `<h3 class="section-title">Mes charges</h3><div class="group">
      ${weighted.map(({ id, h }) => {
    const first1 = h[0].kg; const last1 = h[h.length - 1].kg; const diff = last1 - first1;
    return `<button class="row" data-act="ex" data-id="${id}"><span class="k2">${esc(EXERCISES[id].name)}</span>
          <span class="v">${fmt.kg(last1)}${diff > 0 ? ` <em class="gain">+${String(Math.round(diff * 10) / 10).replace('.', ',')}</em>` : ''}</span></button>`;
  }).join('')}</div>` : ''}
  `;
}

function logSummary(k) {
  const log = state.logs[k]; const s = session(log.day);
  const parts = [];
  const sets = [...s.blocks, ...s.after].reduce((n, b) => n + setsArr(log, b.key, b.sets).filter(Boolean).length, 0);
  if (sets) parts.push(`${sets} séries`);
  if (s.circuit) { const r = setsArr(log, 'circuit', s.circuit.rounds).filter(Boolean).length; if (r) parts.push(`${r} tours`); }
  if (log.km) parts.push(fmt.km(log.km));
  else if (log.run) parts.push('course ✓');
  if (log.doneAt && log.startedAt) {
    const min = Math.round((log.doneAt - log.startedAt) / 60000);
    if (min > 0 && min < 240) parts.push(`${min} min`);
  }
  return parts.join(' · ') || 'Terminée';
}

function openLog(k) {
  const log = state.logs[k]; if (!log) return;
  const s = session(log.day);
  const rows = [];
  [...s.blocks, ...s.after].forEach((b) => {
    const n = setsArr(log, b.key, b.sets).filter(Boolean).length;
    if (!n && !(log.kg && log.kg[b.ex])) return;
    rows.push(`<div class="row"><span class="k2">${esc(EXERCISES[b.ex].name)}</span><span class="v">${n}/${b.sets}${log.kg && log.kg[b.ex] ? ` · ${fmt.kg(log.kg[b.ex])}` : ''}</span></div>`);
  });
  if (s.circuit) rows.push(`<div class="row"><span class="k2">Circuit</span><span class="v">${setsArr(log, 'circuit', s.circuit.rounds).filter(Boolean).length}/${s.circuit.rounds} tours</span></div>`);
  if (s.run) rows.push(`<div class="row"><span class="k2">Course</span><span class="v">${log.run ? `✓${log.km ? ` · ${fmt.km(log.km)}` : ''}${log.runSec ? ` · ${fmt.dur(log.runSec)}` : ''}` : '—'}</span></div>`);
  if (s.stretch) rows.push(`<div class="row"><span class="k2">Étirements</span><span class="v">${setsArr(log, 'stretch', s.stretch.length).filter(Boolean).length}/${s.stretch.length}</span></div>`);

  const entry = openSheet({
    title: fmt.short(k),
    right: '<button class="txt-btn r" data-close>OK</button>',
    body: `
      <div class="preview-head" style="--c:${s.color}"><div class="hero-emoji">${s.emoji}</div><h3>${esc(s.title)}</h3>
        <p>${log.done ? `✓ Terminée · ${esc(logSummary(k))}` : `En cours · ${progress(k).pct}%`}</p></div>
      ${rows.length ? `<div class="group">${rows.join('')}</div>` : ''}
      ${log.note ? `<div class="group-title">Note</div><div class="group"><div class="notes">${esc(log.note)}</div></div>` : ''}
      <button class="btn danger" data-act="del-log">${ICON.trash} Supprimer cette séance</button>`,
  });
  entry.sheet.querySelector('[data-act="del-log"]').addEventListener('click', (e) => {
    e.stopPropagation();
    if (!confirm('Supprimer cette séance du suivi ?')) return;
    delete state.logs[k]; save(); closeSheet(entry); render(); toast('Séance supprimée');
  });
}

/* ---------- Réglages ---------- */

function renderSettings() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const st = state.settings;
  view.innerHTML = `
    <header class="header"><div><div class="eyebrow">Prog Muscu</div><h1 class="title">Réglages</h1></div></header>

    <div class="group-title">Mon niveau</div>
    <div class="segmented" id="levelPick">
      ${LEVELS.map((l, i) => `<button data-v="${i}" class="${st.level === i ? 'on' : ''}">${l}</button>`).join('')}
    </div>
    <p class="hint">${['Moins de séries et course / marche alternées. Idéal pour démarrer ou reprendre.',
    'Volume complet et footing continu. Après 1-2 mois de pratique régulière.',
    'Plus de séries, fractionné exigeant et sorties plus longues.'][st.level]}</p>

    <div class="group-title">Séance</div>
    <div class="group">
      <label class="setting-row"><span class="ic" style="background:#ff9f0a">${ICON.sound}</span>
        <span class="t">Sons du chrono<small>Bips pendant le repos et la course</small></span>
        <input type="checkbox" class="switch" data-set="sound" ${st.sound ? 'checked' : ''}></label>
      <label class="setting-row"><span class="ic" style="background:#30b158">${ICON.timer}</span>
        <span class="t">Repos automatique<small>Lance le chrono de repos quand tu coches une série</small></span>
        <input type="checkbox" class="switch" data-set="autoRest" ${st.autoRest ? 'checked' : ''}></label>
    </div>

    <div class="group-title">Matériel conseillé</div>
    <div class="group"><div class="notes">• Haltères réglables (idéalement 2 × 2 à 20 kg)
• Banc de musculation inclinable
• Tapis de sol, chaussures de running
Tu n'as pas la charge idéale ? Ralentis la descente, ajoute des répétitions ou fais une pause d'1 s en bas du mouvement.</div></div>

    <div class="group-title">Sauvegarde</div>
    <div class="group">
      <button class="setting-row" data-act="export">
        <span class="ic" style="background:#ff6b3d">${ICON.upload}</span>
        <span class="t">Exporter une sauvegarde<small>Fichier .json à garder dans Fichiers / iCloud</small></span>
      </button>
      <button class="setting-row" data-act="import">
        <span class="ic" style="background:#0a84ff">${ICON.download}</span>
        <span class="t">Restaurer une sauvegarde<small>Remplace les données actuelles</small></span>
      </button>
      <button class="setting-row danger" data-act="wipe">
        <span class="ic" style="background:#ff3b30">${ICON.trash}</span>
        <span class="t">Tout effacer</span>
      </button>
    </div>
    <p class="hint">Tes séances sont enregistrées uniquement sur ce téléphone. Pense à exporter une sauvegarde de temps en temps.</p>

    ${standalone ? '' : `
    <div class="group-title">Installer sur l'iPhone</div>
    <div class="group"><div class="notes">1. Ouvre cette page dans <b>Safari</b>.
2. Touche le bouton <b>Partager</b> ⬆︎.
3. Choisis <b>« Sur l'écran d'accueil »</b>.
L'appli s'ouvrira en plein écran, comme une vraie app, même sans connexion.</div></div>`}

    <div class="group-title">Santé</div>
    <p class="hint" style="margin-top:0">Échauffe-toi avant chaque séance et arrête-toi en cas de douleur. En cas de doute sur ta condition physique, demande l'avis d'un médecin.</p>

    <div class="brand"><img src="icons/icon-192.png" alt="">Prog Muscu · v1.0</div>
    <input type="file" id="importFile" accept="application/json,.json" hidden>
  `;

  document.getElementById('levelPick').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    st.level = Number(b.dataset.v); save(); render();
    toast(`Niveau ${LEVELS[st.level].toLowerCase()}`);
  });
  view.querySelectorAll('[data-set]').forEach((c) => c.addEventListener('change', () => { st[c.dataset.set] = c.checked; save(); }));
  document.getElementById('importFile').addEventListener('change', importBackup);
}

/* ---------------- Sheets (panneaux) ---------------- */

const sheets = [];

function openSheet({ title = '', left = '', right = '', body = '', full = false, onMount }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  const sheet = document.createElement('section');
  sheet.className = `sheet${full ? ' full' : ''}`;
  sheet.setAttribute('role', 'dialog');
  sheet.innerHTML = `
    <div class="sheet-top">
      <div class="grabber"></div>
      <div class="sheet-bar">
        <div style="min-width:76px">${left}</div>
        <h2>${esc(title)}</h2>
        <div style="min-width:76px;text-align:right">${right}</div>
      </div>
    </div>
    <div class="sheet-body">${body}</div>`;
  document.body.append(backdrop, sheet);
  const entry = { sheet, backdrop };
  sheets.push(entry);

  requestAnimationFrame(() => { backdrop.classList.add('show'); sheet.classList.add('show'); });
  backdrop.addEventListener('click', () => closeSheet(entry));

  // Glisser vers le bas pour fermer
  const top = sheet.querySelector('.sheet-top');
  let startY = null; let dy = 0;
  top.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; sheet.style.transition = 'none'; }, { passive: true });
  top.addEventListener('touchmove', (e) => {
    if (startY === null) return;
    dy = Math.max(0, e.touches[0].clientY - startY);
    sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  top.addEventListener('touchend', () => {
    sheet.style.transition = '';
    sheet.style.transform = '';
    if (dy > 110) closeSheet(entry);
    startY = null; dy = 0;
  });

  if (onMount) onMount(sheet, entry);
  return entry;
}

function closeSheet(entry) {
  const i = sheets.indexOf(entry);
  if (i === -1) return;
  sheets.splice(i, 1);
  entry.sheet.classList.remove('show');
  entry.backdrop.classList.remove('show');
  setTimeout(() => { entry.sheet.remove(); entry.backdrop.remove(); }, 340);
}

function closeAllSheets() { sheets.slice().forEach(closeSheet); }

/* ---------------- Actions de séance ---------------- */

function toggleSet(key, i, n) {
  const k = todayKey();
  const log = ensureLog(k);
  const arr = setsArr(log, key, n);
  arr[i] = !arr[i];
  log.sets[key] = arr;
  if (log.done && !arr[i]) log.done = false;
  save();
  return arr[i];
}

function setCount(key) {
  const s = session(dayOf(todayKey()));
  if (key === 'circuit') return s.circuit.rounds;
  if (key === 'stretch') return s.stretch.length;
  const b = [...s.blocks, ...s.after].find((x) => x.key === key);
  return b ? b.sets : 0;
}

function onSetTap(btn) {
  const { key, ex } = btn.dataset;
  const i = Number(btn.dataset.i);
  const rest = Number(btn.dataset.rest) || 60;
  const secs = Number(btn.dataset.secs) || 0;
  const n = setCount(key);
  const wasOn = btn.classList.contains('on');

  if (!wasOn && secs) {
    // Exercice chronométré : on lance le chrono d'effort, la série est cochée à la fin
    startCountdown({
      mode: 'work', secs, label: EXERCISES[ex].name,
      onEnd: () => { if (!setsArr(getLog(todayKey()), key, n)[i]) toggleSet(key, i, n); render(); maybeRest(key, rest, ex); },
    });
    return;
  }
  const on = toggleSet(key, i, n);
  haptic();
  render();
  if (on) maybeRest(key, rest, ex);
}

function maybeRest(key, rest, ex) {
  const arr = setsArr(getLog(todayKey()), key, setCount(key));
  const p = progress(todayKey());
  if (p.done >= p.total) { stopCountdown(); toast('Tout est fait ! Termine la séance 💪'); return; }
  if (!state.settings.autoRest) return;
  const label = arr.every(Boolean) ? 'exercice suivant' : key === 'circuit' ? `tour ${arr.filter(Boolean).length + 1}` : `série ${arr.filter(Boolean).length + 1} · ${EXERCISES[ex].name}`;
  startCountdown({ mode: 'rest', secs: rest, label });
}

function setKg(ex, value) {
  const log = ensureLog(todayKey());
  const v = Math.max(0, Math.round(Number(String(value).replace(',', '.')) * 2) / 2);
  if (Number.isFinite(v) && v > 0) log.kg[ex] = v; else delete log.kg[ex];
  save();
}

function finishSession() {
  const k = todayKey();
  const log = ensureLog(k);
  const p = progress(k);
  const s = session(log.day);
  const doIt = () => {
    log.done = true; log.doneAt = Date.now();
    stopCountdown(); save(); render();
    openFinish(k);
  };
  if (p.done < p.total && !confirm(`Tu as fait ${p.done}/${p.total} étapes.\nTerminer quand même la séance « ${s.short} » ?`)) return;
  doIt();
}

function openFinish(k) {
  const log = state.logs[k]; const s = session(log.day);
  const next = session((log.day + 1) % 7);
  const entry = openSheet({
    title: 'Séance terminée',
    right: '<button class="txt-btn r" data-close>OK</button>',
    body: `
      <div class="finish"><div class="big">🎉</div><h3>Bien joué !</h3><p>${esc(s.title)}<br>${esc(logSummary(k))}</p>
        <div class="streak">${ICON.flame} ${streak()} jour${streak() > 1 ? 's' : ''} d'affilée</div></div>
      <div class="group-title">Ressenti / note (facultatif)</div>
      <div class="group"><div class="field area"><textarea id="finishNote" placeholder="Ex. : sensation top, monter à 14 kg au développé…">${esc(log.note || '')}</textarea></div></div>
      <p class="hint">Demain : ${next.emoji} ${esc(next.title)}</p>`,
  });
  entry.sheet.querySelector('#finishNote').addEventListener('input', (e) => { log.note = e.target.value; save(); });
}

function openRunDone(runSec) {
  const k = todayKey();
  const log = ensureLog(k);
  const entry = openSheet({
    title: 'Course',
    left: '<button class="txt-btn" data-close>Annuler</button>',
    right: '<button class="txt-btn r" id="runSave">OK</button>',
    body: `
      <div class="finish"><div class="big">🏃</div><h3>${runSec ? 'Course terminée !' : 'Course faite ?'}</h3><p>${runSec ? `Durée : ${fmt.dur(runSec)}` : 'Note la distance si tu la connais (montre, appli GPS…)'}</p></div>
      <div class="group">
        <div class="field"><label for="km">Distance</label><input id="km" type="number" inputmode="decimal" step="0.01" min="0" placeholder="facultatif" value="${esc(log.km || '')}"><span class="suffix">km</span></div>
        <div class="field"><label for="rmin">Durée</label><input id="rmin" type="number" inputmode="numeric" min="0" placeholder="—" value="${log.runSec || runSec ? Math.round((runSec || log.runSec) / 60) : ''}"><span class="suffix">min</span></div>
      </div>
      ${log.run ? '<button class="btn danger" id="runUndo">Marquer comme non faite</button>' : ''}`,
  });
  entry.sheet.querySelector('#runSave').addEventListener('click', () => {
    const km = Number(String(entry.sheet.querySelector('#km').value).replace(',', '.'));
    const min = Number(entry.sheet.querySelector('#rmin').value);
    log.run = true;
    if (km > 0) log.km = Math.round(km * 100) / 100; else delete log.km;
    if (min > 0) log.runSec = Math.round(min * 60); else delete log.runSec;
    save(); closeSheet(entry); render(); toast('Course enregistrée ✓');
  });
  const undo = entry.sheet.querySelector('#runUndo');
  if (undo) undo.addEventListener('click', () => { log.run = false; delete log.km; delete log.runSec; log.done = false; save(); closeSheet(entry); render(); });
}

/* ---------------- Chrono de repos / effort (barre du bas) ---------------- */

let cd = null; // { mode, label, total, endAt, onEnd, lastBeep }
const restbar = document.getElementById('restbar');

function startCountdown({ mode, secs, label, onEnd }) {
  audio();
  cd = { mode, label, total: secs, endAt: Date.now() + secs * 1000, onEnd, lastBeep: null };
  keepAwake(true);
  if (mode === 'work') beep(990, 0.15);
  drawCountdown();
}

function stopCountdown() {
  cd = null;
  restbar.classList.remove('show');
  if (!runner) keepAwake(false);
}

function drawCountdown() {
  if (!cd) return;
  const left = Math.max(0, (cd.endAt - Date.now()) / 1000);
  restbar.className = `restbar show ${cd.mode}`;
  restbar.innerHTML = `
    <div class="rb-fill" style="transform:scaleX(${cd.total ? left / cd.total : 0})"></div>
    <div class="rb-content">
      <div class="rb-txt"><small>${cd.mode === 'work' ? 'Effort' : 'Repos'} · ${esc(cd.label)}</small><b>${fmt.clock(left)}</b></div>
      <button data-act="cd-add">+15 s</button>
      <button data-act="cd-skip" class="strong">${cd.mode === 'work' ? 'Terminer' : 'Passer'}</button>
    </div>`;
}

function tickCountdown() {
  if (!cd) return;
  const left = (cd.endAt - Date.now()) / 1000;
  const s = Math.ceil(left);
  if (s <= 3 && s > 0 && cd.lastBeep !== s) { cd.lastBeep = s; beep(660, 0.1); }
  if (left <= 0) {
    const done = cd.onEnd;
    beepEnd();
    stopCountdown();
    if (done) done(); else toast('C\'est reparti ! 💪');
    return;
  }
  drawCountdown();
}

/* ---------------- Chrono guidé plein écran (course, échauffement…) ---------------- */

let runner = null; // { title, color, phases, idx, endAt, pausedLeft, onDone, startAt, lastBeep }
const runnerEl = document.getElementById('runner');

function startRunner({ title, color, phases, onDone }) {
  audio();
  stopCountdown();
  runner = { title, color, phases, idx: 0, endAt: Date.now() + phases[0][1] * 1000, pausedLeft: null, onDone, startAt: Date.now(), lastBeep: null };
  keepAwake(true);
  beep(990, 0.2);
  runnerEl.classList.add('show');
  document.body.classList.add('noscroll');
  drawRunner();
}

function runnerLeft() {
  if (!runner) return 0;
  return runner.pausedLeft !== null ? runner.pausedLeft : Math.max(0, (runner.endAt - Date.now()) / 1000);
}

function runnerGo(idx) {
  if (!runner) return;
  if (idx >= runner.phases.length) { finishRunner(true); return; }
  runner.idx = Math.max(0, idx);
  const secs = runner.phases[runner.idx][1];
  if (runner.pausedLeft !== null) runner.pausedLeft = secs;
  else runner.endAt = Date.now() + secs * 1000;
  runner.lastBeep = null;
  drawRunner();
}

function finishRunner(completed) {
  const r = runner;
  runner = null;
  runnerEl.classList.remove('show');
  document.body.classList.remove('noscroll');
  keepAwake(false);
  if (completed) { beepEnd(); if (r.onDone) r.onDone(Math.round((Date.now() - r.startAt) / 1000)); }
}

function drawRunner() {
  if (!runner) return;
  const r = runner;
  const [label, secs, kind] = r.phases[r.idx];
  const left = runnerLeft();
  const totalAll = r.phases.reduce((s, p) => s + p[1], 0);
  const doneAll = r.phases.slice(0, r.idx).reduce((s, p) => s + p[1], 0) + (secs - left);
  const nxt = r.phases[r.idx + 1];
  runnerEl.style.setProperty('--c', r.color);
  runnerEl.className = `runner show k-${kind}`;
  runnerEl.innerHTML = `
    <div class="rn-top">
      <button class="rn-close" data-act="rn-close" aria-label="Fermer">${ICON.close}</button>
      <div class="rn-title">${esc(r.title)}</div>
      <div class="rn-count">${r.idx + 1}/${r.phases.length}</div>
    </div>
    <div class="rn-center">
      <div class="rn-kind">${PHASE_LABEL[kind] || ''}</div>
      <div class="rn-label">${esc(label)}</div>
      <div class="rn-time">${fmt.clock(left)}</div>
      <div class="rn-phase"><i style="transform:scaleX(${secs ? 1 - left / secs : 1})"></i></div>
      <div class="rn-next">${nxt ? `Ensuite : <b>${esc(nxt[0])}</b> · ${fmt.dur(nxt[1])}` : 'Dernière étape 💪'}</div>
    </div>
    <div class="rn-total">
      <div class="rn-bar"><i style="transform:scaleX(${doneAll / totalAll})"></i></div>
      <div class="rn-tt"><span>${fmt.clock(doneAll)}</span><span>-${fmt.clock(totalAll - doneAll)}</span></div>
    </div>
    <div class="rn-ctrls">
      <button data-act="rn-prev" aria-label="Étape précédente">${ICON.prev}</button>
      <button class="rn-play" data-act="rn-toggle" aria-label="Pause">${r.pausedLeft !== null ? ICON.play : ICON.pause}</button>
      <button data-act="rn-next" aria-label="Étape suivante">${ICON.next}</button>
    </div>`;
}

function tickRunner() {
  if (!runner || runner.pausedLeft !== null) return;
  const r = runner;
  let changed = false;
  // Rattrapage si l'écran était verrouillé
  while (runner && Date.now() >= r.endAt) {
    r.idx += 1;
    if (r.idx >= r.phases.length) { finishRunner(true); return; }
    r.endAt += r.phases[r.idx][1] * 1000;
    r.lastBeep = null;
    changed = true;
  }
  if (changed) { beep(1175, 0.35, 0.35); haptic([200]); }
  const s = Math.ceil((r.endAt - Date.now()) / 1000);
  if (s <= 3 && s > 0 && r.lastBeep !== s && r.phases[r.idx][1] > 5) { r.lastBeep = s; beep(660, 0.1); }
  drawRunner();
}

function guide(what) {
  const k = todayKey();
  const s = session(dayOf(k));
  if (what === 'run') {
    startRunner({ title: s.run.summary, color: s.color, phases: s.run.phases, onDone: (sec) => openRunDone(sec) });
  } else if (what === 'warm') {
    startRunner({
      title: 'Échauffement', color: s.color, phases: s.warmup.map((x) => [x[0], x[1], 'warm']),
      onDone: () => { ensureLog(k).warm = true; save(); render(); toast('Échauffé ✓ Place aux exercices'); },
    });
  } else if (what === 'stretch') {
    startRunner({
      title: 'Étirements', color: s.color, phases: s.stretch.map((x) => [x[2] ? `${x[0]} — ${x[2]}` : x[0], x[1], 'cool']),
      onDone: () => { ensureLog(k).sets.stretch = s.stretch.map(() => true); save(); render(); toast('Étirements faits ✓'); },
    });
  }
}

setInterval(() => { tickCountdown(); tickRunner(); }, 250);

/* ---------------- Sauvegarde ---------------- */

async function shareOrDownload(filename, content, type) {
  const blob = new Blob([content], { type });
  try {
    const file = new File([blob], filename, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function exportBackup() {
  const payload = { app: 'prog-muscu', version: 1, exportedAt: new Date().toISOString(), settings: state.settings, logs: state.logs };
  shareOrDownload(`prog-muscu-sauvegarde-${todayKey()}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

function importBackup(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data.logs !== 'object') throw new Error('format');
      const logs = {};
      Object.entries(data.logs).forEach(([k, l]) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(k) && l && Number.isInteger(l.day) && l.day >= 0 && l.day < 7) logs[k] = { sets: {}, kg: {}, ...l };
      });
      if (!confirm(`Restaurer ${Object.keys(logs).length} séance(s) ?\nLes données actuelles seront remplacées.`)) return;
      state.logs = logs;
      if (data.settings) Object.assign(state.settings, data.settings);
      save(); render();
      toast('Sauvegarde restaurée ✓');
    } catch (err) {
      toast('Fichier de sauvegarde invalide');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ---------------- Bienvenue ---------------- */

function openWelcome() {
  const entry = openSheet({
    title: 'Bienvenue',
    body: `
      <div class="finish"><div class="big">🏋️</div><h3>Ton programme maison</h3>
        <p>Chaque jour une séance : haltères, banc, poids du corps et course à pied.</p></div>
      <div class="group"><div class="notes">Lun · 💪 Pectoraux, épaules, triceps
Mar · 🏃 Course endurance
Mer · 🦍 Dos, biceps, gainage
Jeu · ⚡️ Course fractionnée
Ven · 🦵 Jambes, fessiers, abdos
Sam · 🔥 Full body circuit + footing
Dim · 🧘 Repos actif & mobilité</div></div>
      <div class="group-title">Choisis ton niveau</div>
      <div class="level-pick">
        ${LEVELS.map((l, i) => `<button data-lv="${i}"><b>${l}</b><small>${['Je débute ou je reprends', 'Je m\'entraîne déjà un peu', 'Je m\'entraîne régulièrement'][i]}</small></button>`).join('')}
      </div>
      <p class="hint">Modifiable à tout moment dans Réglages.</p>`,
  });
  entry.sheet.querySelectorAll('[data-lv]').forEach((b) => b.addEventListener('click', () => {
    state.settings.level = Number(b.dataset.lv);
    state.settings.welcomed = true;
    save(); closeSheet(entry); render();
    toast(`C'est parti ! Niveau ${LEVELS[state.settings.level].toLowerCase()}`);
  }));
}

/* ---------------- Événements ---------------- */

document.getElementById('tabbar').addEventListener('click', (e) => {
  const b = e.target.closest('.tab');
  if (!b) return;
  state.tab = b.dataset.tab;
  if (state.tab === 'stats') state.month = startOfMonth(new Date());
  render();
  window.scrollTo({ top: 0 });
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.kg) { setKg(t.dataset.kg, t.value); render(); }
});

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act], [data-close]');
  if (!t) return;
  const d = t.dataset;

  switch (d.act) {
    case 'set': onSetTap(t); return;
    case 'kg': {
      const input = view.querySelector(`input[data-kg="${d.ex}"]`);
      const cur = Number(String(input ? input.value : 0).replace(',', '.')) || 0;
      setKg(d.ex, Math.max(0, cur + Number(d.d)));
      haptic(); render(); return;
    }
    case 'ex': openExercise(d.id); return;
    case 'swap': openSwap(); return;
    case 'pick-day': if (swapToday(Number(d.day))) { closeAllSheets(); state.tab = 'today'; render(); toast('Séance changée'); } return;
    case 'unswap': if (swapToday(defaultDay(todayKey()))) render(); return;
    case 'preview': openPreview(Number(d.day)); return;
    case 'do-today': if (swapToday(Number(d.day))) { closeAllSheets(); state.tab = 'today'; render(); window.scrollTo({ top: 0 }); } return;
    case 'goto-today': state.tab = 'today'; render(); window.scrollTo({ top: 0 }); break;
    case 'guide-run': guide('run'); return;
    case 'guide-warm': guide('warm'); return;
    case 'guide-stretch': guide('stretch'); return;
    case 'toggle-warm': { const log = ensureLog(todayKey()); log.warm = !log.warm; save(); haptic(); render(); return; }
    case 'stretch': { toggleSet('stretch', Number(d.i), setCount('stretch')); haptic(); render(); return; }
    case 'run-done': openRunDone(0); return;
    case 'finish': finishSession(); return;
    case 'reopen': { const log = getLog(todayKey()); if (log) { log.done = false; save(); render(); } return; }
    case 'cd-add': if (cd) { cd.endAt += 15000; cd.total += 15; drawCountdown(); } return;
    case 'cd-skip': if (cd) { const f = cd.onEnd; stopCountdown(); if (f) f(); } return;
    case 'rn-toggle':
      if (!runner) return;
      if (runner.pausedLeft !== null) { runner.endAt = Date.now() + runner.pausedLeft * 1000; runner.pausedLeft = null; keepAwake(true); } else { runner.pausedLeft = runnerLeft(); }
      drawRunner(); return;
    case 'rn-next': runnerGo(runner.idx + 1); return;
    case 'rn-prev': runnerGo(runnerLeft() < runner.phases[runner.idx][1] - 3 ? runner.idx : runner.idx - 1); return;
    case 'rn-close':
      if (confirm('Arrêter le chrono ?')) {
        const r = runner; const sec = Math.round((Date.now() - r.startAt) / 1000);
        finishRunner(false);
        if (r.phases[0][2] !== 'warm' && r.phases[0][2] !== 'cool' && sec > 120 && confirm('Enregistrer la course quand même ?')) openRunDone(sec);
      }
      return;
    case 'month': state.month = new Date(state.month.getFullYear(), state.month.getMonth() + Number(d.d), 1); render(); return;
    case 'log': openLog(d.k); return;
    case 'export': exportBackup(); return;
    case 'import': document.getElementById('importFile').click(); return;
    case 'wipe':
      if (confirm('Effacer tout l\'historique des séances ?\nCette action est irréversible.') && confirm('Vraiment tout effacer ?')) {
        state.logs = {}; save(); render(); toast('Données effacées');
      }
      return;
    default: break;
  }
  if (t.hasAttribute('data-close')) closeSheet(sheets[sheets.length - 1]);
});

/* ---------------- Démarrage ---------------- */

load();
render();
if (!state.settings.welcomed) setTimeout(openWelcome, 300);

// Demande au navigateur de ne pas effacer les données
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// Hors ligne
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Retour sur l'appli : on rafraîchit « aujourd'hui » et les chronos
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  if (runner || cd) keepAwake(true);
  tickCountdown(); tickRunner();
  if (!sheets.length) render();
});
