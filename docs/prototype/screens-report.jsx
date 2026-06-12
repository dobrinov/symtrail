// screens-report.jsx — clinician-facing summary export
const TR = window.TOKENS;

const RANGE_OPTS = [
  { k: '90', l: '3 mo', days: 90 },
  { k: '180', l: '6 mo', days: 180 },
  { k: '365', l: '12 mo', days: 365 },
  { k: 'all', l: 'All', days: 100000 },
];

function buildReport(profile, entries, days, unit) {
  const start = window.addDays(window.TODAY, -days);
  const pe = entries.filter(e => e.profile === profile.id && e.date >= start);
  // symptoms
  const symCounts = {};
  pe.filter(e => e.type === 'symptom').forEach(e => {
    const name = e.symptom ? (window.SYMPTOM_BY_KEY[e.symptom] ? window.SYMPTOM_BY_KEY[e.symptom].label : e.symptom) : (e.symptomName || 'Other');
    symCounts[name] = (symCounts[name] || 0) + 1;
  });
  const symptoms = Object.entries(symCounts).sort((a, b) => b[1] - a[1]);
  // meds
  const medMap = {};
  pe.filter(e => e.type === 'med').forEach(e => {
    const k = e.med || ('c:' + (e.medName || '?'));
    const m = window.MED_BY_KEY[e.med];
    const name = m ? (m.brand ? `${m.label} (${m.brand})` : m.label) : (e.medName || 'Medication');
    if (!medMap[k]) medMap[k] = { name, count: 0, last: e.date };
    medMap[k].count++;
    if (e.date > medMap[k].last) medMap[k].last = e.date;
  });
  const meds = Object.values(medMap).sort((a, b) => b.last - a.last);
  // temps
  const temps = pe.filter(e => e.type === 'temp');
  const maxTemp = temps.length ? Math.max(...temps.map(e => e.temp)) : null;
  const feverDays = new Set(temps.filter(e => e.temp >= 38).map(e => e.dateKey)).size;
  // flares
  const flares = profile.condition === 'PFAPA' ? window.getFlares(entries, profile.id).filter(f => f.onset >= start) : [];
  const cycle = flares.length >= 2 ? window.cycleStats(flares) : null;
  return { start, symptoms, meds, maxTemp, feverDays, flares, cycle, totalEntries: pe.length };
}

function ReportView({ profile, entries, days, unit }) {
  const r = buildReport(profile, entries, days, unit);
  const rangeLabel = days >= 100000
    ? 'All time'
    : `${window.fmtDate(r.start, { day: 'numeric', month: 'short', year: 'numeric' })} – ${window.fmtDate(window.TODAY, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const sectionLabel = { fontSize: 11.5, fontWeight: 700, color: TR.approach, textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 10px' };
  const rule = { height: 1, background: TR.calm, margin: '18px 0' };
  const kv = (label, value) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', gap: 12 }}>
      <span style={{ fontSize: 13.5, color: TR.grey }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: TR.anchor, textAlign: 'right' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ background: '#fff', borderRadius: 18, padding: 22, boxShadow: '0 1px 2px rgba(12,9,23,0.04), 0 8px 24px rgba(12,9,23,0.06)' }}>
      {/* letterhead */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, borderBottom: `2px solid ${TR.anchor}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {window.LogoMark ? <window.LogoMark size={26} radius={8} /> : <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--accent, #FEAE2E)' }} />}
          <span style={{ fontSize: 17, fontWeight: 800, color: TR.anchor, letterSpacing: -0.3 }}>Symtrail</span>
        </div>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: TR.grey }}>Medical summary</span>
      </div>

      {/* patient */}
      <div style={{ paddingTop: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: TR.anchor, letterSpacing: -0.4 }}>{profile.name}</div>
        <div style={{ fontSize: 13.5, color: TR.grey, marginTop: 2 }}>
          {[profile.birthDate ? `${window.profileRole(profile)} old` : null,
            profile.sex ? (profile.sex === 'male' ? 'Male' : 'Female') : null,
            profile.condition ? profile.condition : null].filter(Boolean).join(' · ')}
        </div>
        {profile.birthDate && <div style={{ fontSize: 12.5, color: TR.grey, marginTop: 2 }}>DOB {window.fmtDate(profile.birthDate, { day: 'numeric', month: 'short', year: 'numeric' })}</div>}
        <div style={{ fontSize: 12.5, color: TR.grey, marginTop: 8 }}>Reporting period · {rangeLabel}</div>
      </div>

      {/* flare cycle */}
      {profile.condition === 'PFAPA' && (
        <>
          <div style={rule} />
          <div style={sectionLabel}>PFAPA flare cycle</div>
          {r.cycle ? (
            <>
              {kv('Flares in period', r.flares.length)}
              {kv('Average interval', `${r.cycle.avg} days`)}
              {kv('Interval range', `${r.cycle.min}–${r.cycle.max} days`)}
              {kv('Last flare onset', window.fmtDate(r.cycle.last, { day: 'numeric', month: 'short', year: 'numeric' }))}
              {kv('Days since last flare', r.cycle.sinceLast)}
              {kv('Predicted next window', `${window.fmtDate(r.cycle.windowStart)} – ${window.fmtDate(r.cycle.windowEnd)}`)}
            </>
          ) : (
            <div style={{ fontSize: 13.5, color: TR.grey }}>{r.flares.length} flare logged — not enough data to estimate cycle.</div>
          )}
        </>
      )}

      {/* flare episodes */}
      {r.flares.length > 0 && (
        <>
          <div style={rule} />
          <div style={sectionLabel}>Flare episodes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[...r.flares].reverse().map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '6px 0', borderBottom: i === r.flares.length - 1 ? 'none' : `1px solid ${TR.calm}` }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: TR.anchor, width: 96, flexShrink: 0 }}>{window.fmtDate(f.onset)}–{window.fmtDate(f.end)}</span>
                <span style={{ fontSize: 13, color: TR.grey, flex: 1 }}>{window.daysBetween(f.onset, f.end) + 1} days · peak {window.fmtTemp(f.peak, unit)}{f.steroid ? ' · steroid' : ''}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* temperature */}
      <div style={rule} />
      <div style={sectionLabel}>Temperature</div>
      {r.maxTemp != null ? (
        <>
          {kv('Highest recorded', window.fmtTemp(r.maxTemp, unit))}
          {kv('Days with fever (≥38°C)', r.feverDays)}
        </>
      ) : <div style={{ fontSize: 13.5, color: TR.grey }}>No temperature readings in this period.</div>}

      {/* symptoms */}
      <div style={rule} />
      <div style={sectionLabel}>Symptoms logged</div>
      {r.symptoms.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {r.symptoms.map(([name, count]) => (
            <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: TR.calm, borderRadius: 999, padding: '6px 12px', fontSize: 13, fontWeight: 600, color: TR.anchor }}>
              {name}<span style={{ color: TR.approach, fontWeight: 800 }}>{count}</span>
            </span>
          ))}
        </div>
      ) : <div style={{ fontSize: 13.5, color: TR.grey }}>No symptoms logged in this period.</div>}

      {/* medications */}
      <div style={rule} />
      <div style={sectionLabel}>Medications given</div>
      {r.meds.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {r.meds.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, padding: '6px 0', borderBottom: i === r.meds.length - 1 ? 'none' : `1px solid ${TR.calm}` }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: TR.anchor }}>{m.name}</span>
              <span style={{ fontSize: 13, color: TR.grey, flexShrink: 0 }}>{m.count} dose{m.count === 1 ? '' : 's'} · last {window.fmtDate(m.last)}</span>
            </div>
          ))}
        </div>
      ) : <div style={{ fontSize: 13.5, color: TR.grey }}>No medications logged in this period.</div>}

      {/* footer */}
      <div style={{ marginTop: 20, paddingTop: 12, borderTop: `1px solid ${TR.calm}`, fontSize: 11, color: TR.grey, lineHeight: 1.5 }}>
        Generated by Symtrail on {window.fmtDate(window.TODAY, { day: 'numeric', month: 'long', year: 'numeric' })}. This is a self-tracked summary for discussion with a clinician, not a medical diagnosis.
      </div>
    </div>
  );
}

function ReportSheet({ profile, entries, onShare }) {
  const unit = window.useUnit();
  const [range, setRange] = React.useState('180');
  const days = RANGE_OPTS.find(o => o.k === range).days;
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: TR.grey, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Period</div>
      <div style={{ display: 'flex', gap: 7, marginBottom: 18 }}>
        {RANGE_OPTS.map(o => {
          const on = range === o.k;
          return (
            <Pressable key={o.k} onClick={() => setRange(o.k)} style={{ flex: 1 }}>
              <div style={{ height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? TR.anchor : '#fff', color: on ? '#fff' : TR.balance, border: on ? 'none' : `1.5px solid ${TR.lavender}`, fontWeight: 700, fontSize: 14 }}>{o.l}</div>
            </Pressable>
          );
        })}
      </div>

      <ReportView profile={profile} entries={entries} days={days} unit={unit} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
        <Button icon={<Icon name="share" size={20} color={TR.anchor} sw={2} />} onClick={() => onShare('share')}>Share with doctor</Button>
        <Button variant="secondary" icon={<Icon name="note" size={19} color={TR.anchor} sw={1.9} />} onClick={() => onShare('pdf')}>Save as PDF</Button>
      </div>
    </div>
  );
}

Object.assign(window, { ReportSheet, ReportView });
