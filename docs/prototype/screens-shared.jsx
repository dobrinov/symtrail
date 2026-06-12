// screens-shared.jsx — shared row renderers & small visual helpers.
const TS = window.TOKENS;

function fmtTime(d) {
  let h = d.getHours(), m = d.getMinutes();
  const am = h < 12 ? 'am' : 'pm';
  h = h % 12; if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2,'0')} ${am}`;
}

// ── Temperature unit conversion (stored values are °C) ──────
function cToDisplay(c, unit) { return unit === 'f' ? c * 9/5 + 32 : c; }
function displayToC(v, unit) { return unit === 'f' ? (v - 32) * 5/9 : v; }
function fmtTemp(c, unit, withUnit = true) {
  const v = cToDisplay(c, unit).toFixed(1);
  return withUnit ? `${v}°${unit === 'f' ? 'F' : 'C'}` : `${v}°`;
}
function useUnit() { return React.useContext(window.UnitContext); }

// Pick an icon for a custom medication based on its dosage unit
function unitIcon(unit) {
  if (unit === 'tablet') return 'tablet';
  if (unit === 'drops') return 'drops';
  if (unit === 'suppository') return 'tablet';
  return 'syrup'; // ml, mg, tsp
}
// Dose display string from amount + unit (handles pluralisation)
function doseLabel(amount, unit) {
  if (amount == null || amount === '') return unit;
  const n = Number(amount);
  const countable = { tablet: 'tablet', drops: 'drop', suppository: 'suppository' };
  if (countable[unit]) {
    const base = countable[unit];
    return `${amount} ${base}${n === 1 ? '' : 's'}`;
  }
  return `${amount} ${unit}`;
}

// Coloured leading glyph for an entry
function EntryGlyph({ entry, size = 38 }) {
  if (entry.type === 'temp') {
    const sev = window.SEVERITY[window.tempToSeverity(entry.temp)];
    return (
      <div style={{ width: size, height: size, borderRadius: 12, background: sev.color + (sev.key==='none'?'':'33'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name="fever" size={size*0.55} color={sev.key==='none'?TS.balance:sev.dot} sw={1.9} />
      </div>
    );
  }
  if (entry.type === 'med') {
    const m = window.MED_BY_KEY[entry.med];
    const color = m ? m.color : TS.balance;
    const form = m ? (m.form === 'tablet' ? 'tablet' : m.form === 'drops' ? 'drops' : 'syrup') : unitIcon(entry.unit);
    return (
      <div style={{ width: size, height: size, borderRadius: 12, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={form} size={size*0.55} color={color} sw={1.9} />
      </div>
    );
  }
  if (entry.type === 'note') {
    return <div style={{ width: size, height: size, borderRadius: 12, background: TS.calm, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon name="note" size={size*0.52} color={TS.grey} sw={1.9} /></div>;
  }
  // symptom
  const s = window.SYMPTOM_BY_KEY[entry.symptom];
  const sev = window.SEVERITY[entry.severity || 'mild'];
  return (
    <div style={{ width: size, height: size, borderRadius: 12, background: sev.color + (sev.key==='none'?'':'33'), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon name={s ? s.icon : 'note'} size={size*0.56} color={sev.dot} sw={1.9} />
    </div>
  );
}

function entryTitle(entry, unit = 'c') {
  if (entry.type === 'temp') return fmtTemp(entry.temp, unit);
  if (entry.type === 'med') {
    const m = window.MED_BY_KEY[entry.med];
    const name = entry.medName || (m ? m.label : 'Medication');
    const dose = entry.dose || (entry.amount != null ? doseLabel(entry.amount, entry.unit) : '');
    return dose ? `${name} · ${dose}` : name;
  }
  if (entry.type === 'note') return entry.text;
  const s = window.SYMPTOM_BY_KEY[entry.symptom]; return s ? s.label : (entry.symptomName || 'Symptom');
}

function entrySubtitle(entry) {
  if (entry.type === 'temp') return window.SEVERITY[window.tempToSeverity(entry.temp)].key === 'none' ? 'Temperature · normal' : 'Temperature';
  if (entry.type === 'med') {
    const m = window.MED_BY_KEY[entry.med];
    if (m) return m.brand ? `${m.brand} · ${m.kind}` : m.kind;
    return 'Medication';
  }
  if (entry.type === 'note') return 'Note';
  return 'Symptom';
}

// A single timeline row
function EntryRow({ entry, onClick, showTime = true, last = false }) {
  const unit = useUnit();
  const right = entry.type === 'symptom'
    ? <SeverityChip level={entry.severity || 'mild'} small />
    : entry.type === 'temp' && window.tempToSeverity(entry.temp) !== 'none'
      ? <SeverityChip level={window.tempToSeverity(entry.temp)} small />
      : null;
  return (
    <Pressable onClick={onClick} as="div" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: last ? 'none' : `1px solid ${TS.calm}` }}>
      <EntryGlyph entry={entry} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 600, color: TS.anchor, letterSpacing: -0.2, whiteSpace: entry.type==='note'?'normal':'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entryTitle(entry, unit)}</div>
        <div style={{ fontSize: 12.5, color: TS.grey, marginTop: 1 }}>{entrySubtitle(entry)}</div>
      </div>
      {right}
      {showTime && <span style={{ fontSize: 12.5, color: TS.grey, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{fmtTime(entry.date)}</span>}
    </Pressable>
  );
}

Object.assign(window, { fmtTime, EntryGlyph, EntryRow, entryTitle, entrySubtitle, cToDisplay, displayToC, fmtTemp, useUnit, unitIcon, doseLabel });
