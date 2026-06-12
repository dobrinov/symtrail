// data.jsx — Symptio design tokens, domain definitions & mock data
// Exported to window for use across the other babel scripts.

// ── Wiser Design System tokens ──────────────────────────────
const TOKENS = {
  anchor:   '#0C0917', // Anchor Blue — primary text / dark surfaces
  yellow:   '#FEAE2E', // Assertion Yellow — primary action / accent
  white:    '#FFFFFF', // Clarity White
  canvas:   '#F8FAFF', // Canvas White — app background
  calm:     '#F2F3F9', // Calm Canvas — supporting surfaces
  lavender: '#DAD8E3', // Clarity Lavender
  approach: '#958CBE', // Approach Lavender
  balance:  '#59586E', // Balance Amethyst
  depth:    '#302936', // Depth Amethyst
  grey:     '#606C83', // Control Grey
};

// Severity / fever "heat" scale — derived to stay harmonious with the
// brand yellow but read clearly from calm → hot.
const SEVERITY = {
  none:     { key: 'none',     label: 'Well',     color: '#DAD8E3', text: '#59586E', dot: '#C7C3D6' },
  mild:     { key: 'mild',     label: 'Mild',     color: '#FBE3A6', text: '#8A6A12', dot: '#F4CD63' },
  moderate: { key: 'moderate', label: 'Moderate', color: '#FEAE2E', text: '#5C3D00', dot: '#FEAE2E' },
  high:     { key: 'high',     label: 'High',     color: '#F2802E', text: '#FFFFFF', dot: '#F2802E' },
  severe:   { key: 'severe',   label: 'Severe',   color: '#E1542E', text: '#FFFFFF', dot: '#E1542E' },
};
const SEVERITY_ORDER = ['none', 'mild', 'moderate', 'high', 'severe'];

// Map a temperature (°C) to a severity bucket.
function tempToSeverity(t) {
  if (t == null) return 'none';
  if (t < 37.0) return 'none';   // below 37.0
  if (t < 38.0) return 'mild';   // 37.0–37.9
  if (t < 39.0) return 'moderate'; // 38.0–38.9
  if (t < 40.0) return 'high';   // 39.0–39.9
  return 'severe';               // 40.0–42.0
}

// ── Symptom catalogue ───────────────────────────────────────
// icon key matches a glyph in icons.jsx
const SYMPTOMS = [
  { key: 'fever',     label: 'Fever',          icon: 'fever',     group: 'PFAPA' },
  { key: 'throat',    label: 'Sore throat',    icon: 'throat',    group: 'PFAPA' },
  { key: 'ulcers',    label: 'Mouth ulcers',   icon: 'ulcers',    group: 'PFAPA' },
  { key: 'glands',    label: 'Swollen glands', icon: 'glands',    group: 'PFAPA' },
  { key: 'legpain',   label: 'Leg pain',       icon: 'legpain',   group: 'PFAPA' },
  { key: 'tummy',     label: 'Stomachache',    icon: 'tummy',     group: 'PFAPA' },
  { key: 'headache',  label: 'Headache',       icon: 'headache',  group: 'PFAPA' },
  { key: 'nosebleed', label: 'Nosebleed',      icon: 'nosebleed', group: 'PFAPA' },
  { key: 'cough',     label: 'Cough',          icon: 'cough',     group: 'Infection' },
  { key: 'runnynose', label: 'Runny nose',     icon: 'runnynose', group: 'Infection' },
  { key: 'stuffynose',label: 'Stuffy nose',    icon: 'stuffynose',group: 'Infection' },
  { key: 'earpain',   label: 'Ear pain',       icon: 'earpain',   group: 'Infection' },
  { key: 'nausea',    label: 'Nausea',         icon: 'nausea',    group: 'Infection' },
  { key: 'vomiting',  label: 'Vomiting',       icon: 'vomiting',  group: 'Infection' },
  { key: 'diarrhea',  label: 'Diarrhea',       icon: 'diarrhea',  group: 'Infection' },
  { key: 'constipation', label: 'Constipation', icon: 'constipation', group: 'Infection' },
  { key: 'cramps',    label: 'Cramps',         icon: 'cramps',    group: 'General' },
  { key: 'bloating',  label: 'Bloating',       icon: 'bloating',  group: 'General' },
  { key: 'chestpain', label: 'Chest pain',     icon: 'chestpain', group: 'General' },
  { key: 'palpitations', label: 'Palpitations', icon: 'palpitations', group: 'General' },
  { key: 'dizziness', label: 'Dizziness',      icon: 'dizziness', group: 'General' },
  { key: 'jointpain', label: 'Joint pain',     icon: 'jointpain', group: 'General' },
  { key: 'hotflashes',label: 'Hot flashes',    icon: 'hotflashes',group: 'General' },
  { key: 'rash',      label: 'Rash',           icon: 'rash',      group: 'General' },
  { key: 'fatigue',   label: 'Fatigue',        icon: 'fatigue',   group: 'General' },
  { key: 'sleepiness',label: 'Sleepiness',     icon: 'sleepiness',group: 'General' },
  { key: 'chills',    label: 'Chills',         icon: 'chills',    group: 'General' },
  { key: 'appetite',  label: 'Low appetite',   icon: 'appetite',  group: 'General' },
];
const SYMPTOM_BY_KEY = Object.fromEntries(SYMPTOMS.map(s => [s.key, s]));

// ── Medication catalogue ────────────────────────────────────
const MEDS = [
  { key: 'ibuprofen',    label: 'Ibuprofen',    brand: 'Nurofen',  form: 'syrup', defaultDose: '5 ml', strength: '100mg/5ml', color: '#F2802E', kind: 'Pain / fever' },
  { key: 'paracetamol',  label: 'Paracetamol',  brand: 'Calpol',   form: 'syrup', defaultDose: '7.5 ml', strength: '120mg/5ml', color: '#FEAE2E', kind: 'Pain / fever' },
  { key: 'prednisolone', label: 'Prednisolone', brand: '',         form: 'tablet', defaultDose: '15 mg', strength: '5mg', color: '#958CBE', kind: 'Steroid · flare' },
  { key: 'amoxicillin',  label: 'Amoxicillin',  brand: '',         form: 'syrup', defaultDose: '5 ml', strength: '250mg/5ml', color: '#59586E', kind: 'Antibiotic' },
  { key: 'vitd',         label: 'Vitamin D',    brand: '',         form: 'drops', defaultDose: '1 drop', strength: '400 IU', color: '#606C83', kind: 'Supplement' },
];
const MED_BY_KEY = Object.fromEntries(MEDS.map(m => [m.key, m]));

// ── Profiles ────────────────────────────────────────────────
const PROFILES = [
  { id: 'leo',  name: 'Leo',   role: '5 yrs',  color: '#FEAE2E', initial: 'L', condition: 'PFAPA', sex: 'male',   birthDate: new Date(2021, 1, 20) },
  { id: 'mia',  name: 'Mia',   role: '8 yrs',  color: '#958CBE', initial: 'M', condition: null,    sex: 'female', birthDate: new Date(2017, 9, 5) },
  { id: 'self', name: 'You',   role: 'Parent', color: '#59586E', initial: 'Y', condition: null,    sex: null,     birthDate: null },
];

// Curated avatar colours for new profiles (from the Wiser palette + harmonious tones)
const AVATAR_COLORS = ['#FEAE2E', '#958CBE', '#59586E', '#F2802E', '#606C83', '#1F8A5B'];

// Age from a birth date, relative to a reference day (default = TODAY).
function computeAge(birth, ref) {
  if (!birth) return null;
  const today = ref || TODAY;
  let years = today.getFullYear() - birth.getFullYear();
  const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (beforeBirthday) years--;
  return years;
}
// Display label for a profile's age band (months under 1 yr).
function profileRole(p, ref) {
  if (!p.birthDate) return p.role || '';
  const today = ref || TODAY;
  const age = computeAge(p.birthDate, today);
  if (age >= 1) return `${age} yr${age === 1 ? '' : 's'}`;
  let months = (today.getFullYear() - p.birthDate.getFullYear()) * 12 + (today.getMonth() - p.birthDate.getMonth());
  if (today.getDate() < p.birthDate.getDate()) months--;
  months = Math.max(0, months);
  return `${months} mo`;
}

// ── Date helpers ────────────────────────────────────────────
const TODAY = new Date(2026, 5, 10); // June 10 2026 (month is 0-indexed)
function dKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
function fmtDate(d, opts) { return d.toLocaleDateString('en-GB', opts || { day: 'numeric', month: 'short' }); }

// ── Mock log generator ──────────────────────────────────────
// A flare = a clustered episode (3–5 days) of fever + PFAPA symptoms.
// Builds entries[] keyed by date for Leo's recurring flares, plus a couple
// of one-off illnesses for Mia, and light data for the parent.

function mk(profile, date, type, payload) {
  return { id: `${profile}-${dKey(date)}-${Math.random().toString(36).slice(2,7)}`, profile, date, dateKey: dKey(date), type, ...payload };
}

function buildLeoFlare(onset, peakTemp, lengthDays, opts = {}) {
  const entries = [];
  const symptomSet = opts.symptoms || ['fever', 'throat', 'ulcers', 'glands', 'legpain'];
  for (let i = 0; i < lengthDays; i++) {
    const d = addDays(onset, i);
    // fever curve: rises then falls
    const phase = i / Math.max(1, lengthDays - 1);
    let t = peakTemp - Math.abs(phase - 0.35) * 3.4;
    t = Math.max(37.6, Math.min(peakTemp, Math.round(t * 10) / 10));
    // morning + evening temp readings
    entries.push(mk('leo', new Date(d.getFullYear(),d.getMonth(),d.getDate(),8,15), 'temp', { temp: Math.round((t-0.4)*10)/10 }));
    entries.push(mk('leo', new Date(d.getFullYear(),d.getMonth(),d.getDate(),19,40), 'temp', { temp: t }));
    // symptoms present this day
    symptomSet.forEach((s, idx) => {
      if (s === 'fever') return;
      if (i <= 1 || idx % 2 === (i % 2)) {
        entries.push(mk('leo', new Date(d.getFullYear(),d.getMonth(),d.getDate(),10+idx,0), 'symptom', { symptom: s, severity: i < 2 ? 'moderate' : 'mild' }));
      }
    });
    // meds: ibuprofen / paracetamol alternating, prednisolone on day 1 for some flares
    entries.push(mk('leo', new Date(d.getFullYear(),d.getMonth(),d.getDate(),9,0), 'med', { med: 'ibuprofen', dose: '5 ml' }));
    if (t > 38.6) entries.push(mk('leo', new Date(d.getFullYear(),d.getMonth(),d.getDate(),15,30), 'med', { med: 'paracetamol', dose: '7.5 ml' }));
    if (i === 0 && opts.steroid) entries.push(mk('leo', new Date(d.getFullYear(),d.getMonth(),d.getDate(),20,0), 'med', { med: 'prednisolone', dose: '15 mg' }));
  }
  return entries;
}

// Source of truth for Leo's recurring flares (~5 week cycle, irregular).
const LEO_FLARE_DEFS = [
  { onset: new Date(2025,11,20), length: 4, peak: 39.4 },
  { onset: new Date(2026,0,24),  length: 5, peak: 40.1, steroid: true },
  { onset: new Date(2026,1,28),  length: 4, peak: 39.8 },
  { onset: new Date(2026,3,6),   length: 3, peak: 39.2 },
  { onset: new Date(2026,4,11),  length: 4, peak: 40.2, steroid: true, symptoms: ['fever','throat','ulcers','glands','legpain','tummy'] },
];

function buildAllEntries() {
  let e = [];
  LEO_FLARE_DEFS.forEach(f => { e = e.concat(buildLeoFlare(f.onset, f.peak, f.length, f)); });
  // Leo — recent routine + subtle early signs near the predicted window
  e.push(mk('leo', new Date(2026,5,8,8,0),  'med', { med: 'vitd', dose: '1 drop' }));
  e.push(mk('leo', new Date(2026,5,9,8,0),  'med', { med: 'vitd', dose: '1 drop' }));
  e.push(mk('leo', new Date(2026,5,9,19,30),'temp', { temp: 37.4 }));
  e.push(mk('leo', new Date(2026,5,9,20,0), 'note', { text: 'A bit tired after nursery, off his dinner.' }));
  e.push(mk('leo', new Date(2026,5,10,7,50),'med', { med: 'vitd', dose: '1 drop' }));
  e.push(mk('leo', new Date(2026,5,10,8,5), 'temp', { temp: 37.6 }));
  e.push(mk('leo', new Date(2026,5,10,9,15),'symptom', { symptom: 'throat', severity: 'mild' }));
  // Mia — a one-off viral cold
  ['runnynose','cough','throat','fatigue'].forEach((s,i) => {
    e.push(mk('mia', new Date(2026,4,2+ (i%2),11,0), 'symptom', { symptom: s, severity: 'mild' }));
  });
  e.push(mk('mia', new Date(2026,4,2,12,0), 'temp', { temp: 37.8 }));
  e.push(mk('mia', new Date(2026,4,2,12,5), 'med', { med: 'paracetamol', dose: '10 ml' }));
  // Parent — occasional headache + vitamin
  e.push(mk('self', new Date(2026,5,8,8,0), 'med', { med: 'vitd', dose: '1 drop' }));
  e.push(mk('self', new Date(2026,5,6,21,0), 'symptom', { symptom: 'headache', severity: 'mild' }));
  return e.sort((a,b) => b.date - a.date);
}

const ENTRIES = buildAllEntries();

// Flare episodes (derived summary) for Leo — for cycle stats & timeline.
const LEO_FLARES = LEO_FLARE_DEFS.map(f => ({
  onset: f.onset, end: addDays(f.onset, f.length - 1), peak: f.peak, steroid: !!f.steroid, length: f.length,
}));

function cycleStats(flares) {
  const onsets = flares.map(f => f.onset).sort((a,b)=>a-b);
  const gaps = [];
  for (let i = 1; i < onsets.length; i++) gaps.push(daysBetween(onsets[i-1], onsets[i]));
  const avg = Math.round(gaps.reduce((a,b)=>a+b,0) / gaps.length);
  const min = Math.min(...gaps), max = Math.max(...gaps);
  const last = onsets[onsets.length-1];
  const sinceLast = daysBetween(last, TODAY);
  const predicted = addDays(last, avg);
  const windowStart = addDays(last, min);
  const windowEnd = addDays(last, max);
  return { avg, min, max, gaps, last, sinceLast, predicted, windowStart, windowEnd };
}

const LEO_CYCLE = cycleStats(LEO_FLARES);

// Derive flare episodes for any profile from their logged entries.
// A flare = a cluster of days (≤2 day gaps) containing a fever (≥38°C or a fever symptom).
function deriveFlares(entries, profileId) {
  const byDay = {};
  entries.filter(e => e.profile === profileId).forEach(e => {
    const d = new Date(e.date.getFullYear(), e.date.getMonth(), e.date.getDate());
    const k = dKey(e.date);
    if (!byDay[k]) byDay[k] = { date: d, peak: 0, fever: false };
    if (e.type === 'temp') { if (e.temp > byDay[k].peak) byDay[k].peak = e.temp; if (e.temp >= 38) byDay[k].fever = true; }
    if (e.type === 'symptom' && e.symptom === 'fever') byDay[k].fever = true;
  });
  const days = Object.values(byDay).filter(d => d.fever).sort((a, b) => a.date - b.date);
  const eps = [];
  let cur = null;
  days.forEach(d => {
    if (cur && daysBetween(cur.end, d.date) <= 2) { cur.end = d.date; cur.peak = Math.max(cur.peak, d.peak); }
    else { if (cur) eps.push(cur); cur = { onset: d.date, end: d.date, peak: d.peak }; }
  });
  if (cur) eps.push(cur);
  return eps.map(e => ({ onset: e.onset, end: e.end, peak: e.peak || 38, steroid: false, length: daysBetween(e.onset, e.end) + 1 }));
}

// Flares for a profile: Leo uses the curated history; others derive from logs.
function getFlares(entries, profileId) {
  return profileId === 'leo' ? LEO_FLARES : deriveFlares(entries, profileId);
}

Object.assign(window, {
  TOKENS, SEVERITY, SEVERITY_ORDER, tempToSeverity,
  SYMPTOMS, SYMPTOM_BY_KEY, MEDS, MED_BY_KEY, PROFILES, AVATAR_COLORS, computeAge, profileRole,
  TODAY, dKey, addDays, daysBetween, fmtDate,
  ENTRIES, LEO_FLARES, LEO_CYCLE, cycleStats, deriveFlares, getFlares,
});
