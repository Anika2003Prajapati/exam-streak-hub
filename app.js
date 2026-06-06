const PLAN_START = '2026-06-07';
const PLAN_END = '2026-11-25';
const CAT_DATE = '2026-11-25';
const TASKS = ['Deep Reading (45 min)', 'Active Notes (10 min)', 'Vocabulary (5 new words)', 'CAT RC Practice', 'One high-quality article'];
const QUOTE = "VARC isn't a topic — it's a habit. You're building it.";
const SOURCES = ['Economist', 'Aeon', 'Harvard Business Review', 'Guardian Long Read', 'Free Choice'];
const BOOKS = [
  ['The Psychology of Money', '2026-06-07', '2026-06-30', 256],
  ['Atomic Habits', '2026-07-01', '2026-07-25', 320],
  ['Factfulness', '2026-07-26', '2026-08-31', 342],
  ['Sapiens', '2026-09-01', '2026-10-10', 443],
  ['Thinking, Fast and Slow', '2026-10-11', '2026-11-10', 499],
  ['The Personal MBA', '2026-11-11', '2026-11-25', 416]
].map(([book, start, end, pages]) => ({ book, start, end, pages }));
const LEVELS = [
  [1, 'Beginner Reader', 0, 7, '#94A3B8'],
  [2, 'Consistent Learner', 8, 30, '#60A5FA'],
  [3, 'Serious Aspirant', 31, 60, '#34D399'],
  [4, 'Future IIM Candidate', 61, 90, '#A78BFA'],
  [5, 'Elite Performer', 91, 120, '#F472B6'],
  [6, 'CAT Warrior', 121, 150, '#F97316'],
  [7, '99 Percentiler', 151, 9999, '#FBBF24']
].map(([level, name, min, max, color]) => ({ level, name, min, max, color }));
const STORE_KEY = 'cat-2026-mission-state-v1';
const $ = (id) => document.getElementById(id);
const app = $('app');
let state = loadState();
let activeTab = 'Today';
let selectedDate = PLAN_START;

function loadState() {
  const fallback = { entries: {}, vocabulary: [], articles: [{ id: crypto.randomUUID(), date: '2026-06-06', source: 'Economist', title: 'TESTUI Article', keyIdea: 'key idea', insight: 'insight' }] };
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(STORE_KEY) || '{}') }; }
  catch { return fallback; }
}
function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function parseDate(d) { return new Date(`${d}T00:00:00`); }
function iso(date) { return date.toISOString().slice(0, 10); }
function addDays(d, n) { const x = parseDate(d); x.setDate(x.getDate() + n); return iso(x); }
function clampDate(d) { return d < PLAN_START ? PLAN_START : d > PLAN_END ? PLAN_END : d; }
function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }
function planDates() { return Array.from({ length: daysBetween(PLAN_START, PLAN_END) + 1 }, (_, i) => addDays(PLAN_START, i)); }
function fmtDate(d, long = true) { return parseDate(d).toLocaleDateString('en-US', long ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' }); }
function entry(date) { return state.entries[date] || { tasks: [] }; }
function score(date) { return entry(date).tasks.length; }
function todayIso() { return new Date().toISOString().slice(0, 10); }
function currentBook(date) { return BOOKS.find(b => date >= b.start && date <= b.end) || BOOKS.find(b => date < b.start) || BOOKS.at(-1); }
function readingTarget(date) {
  const book = currentBook(date); const totalDays = daysBetween(book.start, book.end) + 1;
  const day = Math.max(1, Math.min(totalDays, daysBetween(book.start, date) + 1));
  const perDay = Math.ceil(book.pages / totalDays);
  const start = Math.min(book.pages, ((day - 1) * perDay) + 1);
  const end = Math.min(book.pages, day * perDay);
  return { book, start, end, count: Math.max(0, end - start + 1) };
}
function bookProgress(book) {
  const doneDays = planDates().filter(d => d >= book.start && d <= book.end && score(d) === 5).length;
  const totalDays = daysBetween(book.start, book.end) + 1;
  const pct = Math.round((doneDays / totalDays) * 100);
  return { pagesDone: Math.round((pct / 100) * book.pages), pct, status: pct >= 100 ? 'complete' : todayIso() < book.start ? 'upcoming' : todayIso() > book.end ? 'past' : 'active' };
}
function stats() {
  const dates = planDates();
  const perfect = dates.filter(d => score(d) === 5);
  let current = 0;
  for (let d = clampDate(todayIso()); d >= PLAN_START; d = addDays(d, -1)) { if (score(d) === 5) current++; else break; }
  let longest = 0, run = 0;
  dates.forEach(d => { run = score(d) === 5 ? run + 1 : 0; longest = Math.max(longest, run); });
  const level = LEVELS.find(l => current >= l.min && current <= l.max) || LEVELS[0];
  const next = LEVELS.find(l => l.level === level.level + 1);
  return { daysUntilCat: Math.max(0, daysBetween(todayIso(), CAT_DATE)), daysSoFar: Math.max(0, daysBetween(PLAN_START, todayIso()) + 1), current, longest, completion: Math.round((perfect.length / dates.length) * 100), vocab: state.vocabulary.length, articles: state.articles.length, booksDone: BOOKS.filter(b => bookProgress(b).pct >= 100).length, todayScore: score(selectedDate), level, next, daysToNext: next ? Math.max(0, next.min - current) : 0 };
}
function icon(name, size = 14) { return `<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`; }
function mount() { render(); requestAnimationFrame(() => window.lucide?.createIcons()); }
function render() {
  app.innerHTML = `<div class="app-shell"><header><div class="brand"><div class="brand-mark">${icon('graduation-cap', 24)}</div><div><h1>CAT 2026 Mission</h1><p>VARC-first · Streak-powered · 172-day plan</p></div></div><nav>${['Today','Books','Vocabulary','Articles','Levels','Analytics'].map(t => `<button class="nav-btn ${activeTab === t ? 'active' : ''}" data-tab="${t}">${icon(tabIcon(t))}${t}</button>`).join('')}</nav></header><main>${renderTab()}</main><footer>Mission: CAT 2026 · 7 Jun → 25 Nov · VARC-first prep · Built for daily streaks.</footer></div>`;
  document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { activeTab = b.dataset.tab; mount(); }));
  bindTab(); window.lucide?.createIcons();
}
function tabIcon(t) { return ({Today:'sparkles', Books:'library', Vocabulary:'brain', Articles:'newspaper', Levels:'trophy', Analytics:'chart-column'})[t]; }
function renderTab() { return ({Today: renderToday, Books: renderBooks, Vocabulary: renderVocabulary, Articles: renderArticles, Levels: renderLevels, Analytics: renderAnalytics})[activeTab](); }
function renderToday() {
  const s = stats(); const rt = readingTarget(selectedDate); const tasks = entry(selectedDate).tasks;
  return `<div class="grid today-grid"><section class="card"><p class="kicker">${icon('quote',12)} Mission Brief</p><h2>${fmtDate(selectedDate)}</h2><p class="quote">" ${QUOTE} "</p><div class="date-row"><button class="icon-btn" id="prevDay" aria-label="Previous day">${icon('chevron-left',16)}</button><input class="date-input" id="datePick" type="date" value="${selectedDate}" min="${PLAN_START}" max="${PLAN_END}"><button class="icon-btn" id="nextDay" aria-label="Next day">${icon('chevron-right',16)}</button><button class="nav-btn" id="goToday">Today</button></div><div class="grid info-grid"><div class="info-card"><span class="label">Book</span><p class="value">${rt.book.book}</p></div><div class="info-card"><span class="label">Reading Target</span><p class="value">Pages ${rt.start}-${rt.end}</p><span class="subtle">${rt.count} pages · ${rt.book.pages} total</span></div><div class="info-card"><span class="label">Article Source</span><p class="value">Free Choice</p><span class="subtle">${parseDate(selectedDate).toLocaleDateString('en-US',{weekday:'long'})}</span></div></div><div class="check-head"><div><p class="kicker">Daily Mission Checklist</p></div><p><span class="score-pill">${tasks.length} /5</span> complete</p></div><ul>${TASKS.map((t,i) => `<li class="task ${tasks.includes(i) ? 'done' : ''}"><button class="check" data-task="${i}" aria-label="Toggle ${t}">${tasks.includes(i) ? icon('check',15) : ''}</button><span>${t}</span></li>`).join('')}</ul></section><aside class="grid metric-grid">${metricCards(s)}</aside></div>`;
}
function metricCards(s) {
  return `<div class="card metric"><p class="label">Active Streak</p><span class="subtle">Lv ${s.level.level} · ${s.level.name}</span><strong>${s.current}</strong><p class="subtle">days · don't break the chain</p><div class="progress"><span style="width:${s.next ? Math.min(100, s.current / s.next.min * 100) : 100}%"></span></div><p class="subtle">Next: ${s.next?.name || 'Top level'} · ${s.daysToNext} days</p></div><div class="card metric"><p class="label">Days to CAT</p><strong>${s.daysUntilCat}</strong><p class="subtle">Nov 25, 2026</p></div><div class="card metric"><p class="label">Completion</p><strong>${s.completion}%</strong><p class="subtle">${s.daysSoFar} days in</p></div><div class="card metric"><p class="label">Vocabulary</p><strong>${s.vocab}</strong><p class="subtle">of 500 target</p></div><div class="card metric"><p class="label">Articles Read</p><strong>${s.articles}</strong><p class="subtle">all sources</p></div><div class="card metric"><p class="label">Books Completed</p><strong>${s.booksDone}<span class="subtle"> / 6</span></strong><p class="subtle">${6 - s.booksDone} more on your runway to CAT.</p></div>`;
}
function renderBooks() { return `<div class="grid books">${BOOKS.map((b,i) => { const p = bookProgress(b); return `<section class="card book-card" style="--accent:${LEVELS[i + 1]?.color || '#d6a84f'}"><div class="phase"><span>Phase ${i + 1} · ${p.status}</span><span>${p.pct} %</span></div><h3>${b.book}</h3><p class="subtle">${fmtDate(b.start)} -> ${fmtDate(b.end)}</p><div class="progress"><span style="width:${p.pct}%"></span></div><p class="subtle">${p.pagesDone} / ${b.pages} pages</p></section>`; }).join('')}</div>`; }
function renderVocabulary() { return `<section class="card"><div class="section-head"><div><p class="kicker">Add New Word</p><h2>Vocabulary Bank</h2><p class="subtle">${state.vocabulary.length} of 500 words - ${Math.round(state.vocabulary.length / 500 * 100)} %</p></div></div><form id="vocabForm" class="form-grid"><input name="word" placeholder="Word" required><input name="meaning" placeholder="Meaning" required><input class="wide" name="sentence" placeholder="My sentence (optional)"><button class="primary wide" type="submit">${icon('plus')}Add Word</button></form><div class="section-head"><h3>Your Words</h3><span class="subtle">Newest first · tap R1/R2/R3 to track revisions</span></div><div class="list">${state.vocabulary.length ? state.vocabulary.map(vocabRow).join('') : '<p class="empty">No words yet. Add your first one - 5 a day -> 500+ by CAT.</p>'}</div></section>`; }
function vocabRow(v) { return `<article class="row-card"><div class="row-top"><div><h3>${escapeHtml(v.word)}</h3><p>${escapeHtml(v.meaning)}</p>${v.sentence ? `<p class="subtle">${escapeHtml(v.sentence)}</p>` : ''}</div><button class="icon-btn" data-del-word="${v.id}">${icon('trash-2',15)}</button></div><div class="revisions">${[1,2,3].map(n => `<button class="chip-btn ${v.revisions?.includes(n) ? 'active' : ''}" data-rev="${v.id}:${n}">R${n}</button>`).join('')}</div></article>`; }
function renderArticles() { return `<section class="card"><p class="kicker">Log an Article</p><h2>Article Log</h2><p class="subtle">${state.articles.length} articles read · raw fuel for VARC.</p><form id="articleForm" class="form-grid"><input name="date" type="date" value="${todayIso()}" required><select name="source">${SOURCES.map(s => `<option>${s}</option>`).join('')}</select><input class="wide" name="title" placeholder="Article title" required><textarea name="keyIdea" placeholder="Key idea" required></textarea><textarea name="insight" placeholder="One insight learned" required></textarea><button class="primary wide" type="submit">${icon('plus')}Log Article</button></form><div class="section-head"><h3>Recent Reads</h3></div><div class="list">${state.articles.map(articleRow).join('')}</div></section>`; }
function articleRow(a) { return `<article class="row-card"><div class="row-top"><div><p class="subtle">${escapeHtml(a.source)} · ${fmtDate(a.date, false)}</p><h3>${escapeHtml(a.title)}</h3><p>Idea: ${escapeHtml(a.keyIdea)}</p><p>Insight: ${escapeHtml(a.insight)}</p></div><button class="icon-btn" data-del-article="${a.id}">${icon('trash-2',15)}</button></div></article>`; }
function renderLevels() { const s = stats(); return `<section class="card"><h2>The Streak Ladder</h2><p class="subtle">Climb from <strong>Beginner Reader</strong> to <strong>99 Percentiler</strong>. Each level unlocked by consecutive perfect days.</p><div class="grid levels">${LEVELS.map(l => `<article class="row-card"><div class="row-top"><div class="level-badge" style="--level:${l.color}">${l.level}</div>${s.level.level === l.level ? '<span class="active-tag">Active</span>' : ''}</div><h3>${l.name}</h3><p class="subtle">${l.min} ${l.max > 9000 ? '+' : '-' + l.max} day streak</p></article>`).join('')}</div></section>`; }
function renderAnalytics() { const dates = planDates(); const weeks = []; for (let i = 0; i < dates.length; i += 7) weeks.push(dates.slice(i, i + 7)); return `<div class="grid"><section class="card"><h3>Consistency Heatmap</h3><p class="subtle">Each square = one day · 0 (dark) -> 5 (gold-green)</p><div class="heatmap">${dates.map(d => `<div class="day-cell" title="${d} · ${score(d)}/5" style="--cell:${cellColor(score(d))}"></div>`).join('')}</div><div class="legend"><span class="subtle">Less</span>${[0,1,2,3,4,5].map(n => `<span class="day-cell" style="width:16px;--cell:${cellColor(n)}"></span>`).join('')}<span class="subtle">More</span></div></section><section class="card"><h3>Weekly Completion</h3><p class="subtle">Bars show your % completion across each week of the plan</p><div class="bars">${weeks.map((w,i) => { const pct = Math.round(w.reduce((a,d) => a + score(d), 0) / (w.length * 5) * 100); return `<div class="bar" title="W${i+1}: ${pct}%"><span style="height:${Math.max(5,pct)}%"></span><p>W${i+1}</p></div>`; }).join('')}</div></section></div>`; }
function cellColor(n) { return ['#111827','#374151','#47634f','#5f824e','#9ca84f','#d6a84f'][n]; }
function bindTab() {
  if (activeTab === 'Today') {
    $('prevDay').onclick = () => { selectedDate = clampDate(addDays(selectedDate, -1)); mount(); };
    $('nextDay').onclick = () => { selectedDate = clampDate(addDays(selectedDate, 1)); mount(); };
    $('goToday').onclick = () => { selectedDate = clampDate(todayIso()); mount(); };
    $('datePick').onchange = e => { selectedDate = clampDate(e.target.value); mount(); };
    document.querySelectorAll('[data-task]').forEach(b => b.onclick = () => { const i = Number(b.dataset.task); const e = entry(selectedDate); e.tasks = e.tasks.includes(i) ? e.tasks.filter(x => x !== i) : [...e.tasks, i].sort(); state.entries[selectedDate] = e; saveState(); mount(); });
  }
  if (activeTab === 'Vocabulary') {
    $('vocabForm').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); state.vocabulary.unshift({ id: crypto.randomUUID(), word: f.get('word'), meaning: f.get('meaning'), sentence: f.get('sentence'), revisions: [] }); saveState(); mount(); };
    document.querySelectorAll('[data-del-word]').forEach(b => b.onclick = () => { state.vocabulary = state.vocabulary.filter(v => v.id !== b.dataset.delWord); saveState(); mount(); });
    document.querySelectorAll('[data-rev]').forEach(b => b.onclick = () => { const [id,nRaw] = b.dataset.rev.split(':'); const n = Number(nRaw); const v = state.vocabulary.find(x => x.id === id); v.revisions = v.revisions || []; v.revisions = v.revisions.includes(n) ? v.revisions.filter(x => x !== n) : [...v.revisions, n]; saveState(); mount(); });
  }
  if (activeTab === 'Articles') {
    $('articleForm').onsubmit = e => { e.preventDefault(); const f = new FormData(e.target); state.articles.unshift({ id: crypto.randomUUID(), date: f.get('date'), source: f.get('source'), title: f.get('title'), keyIdea: f.get('keyIdea'), insight: f.get('insight') }); saveState(); mount(); };
    document.querySelectorAll('[data-del-article]').forEach(b => b.onclick = () => { state.articles = state.articles.filter(a => a.id !== b.dataset.delArticle); saveState(); mount(); });
  }
}
function escapeHtml(v) { return String(v || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
mount();




