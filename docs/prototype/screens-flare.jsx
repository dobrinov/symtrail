// screens-flare.jsx — single flare episode detail with temperature chart
const TF = window.TOKENS;

function TempChart({ readings, unit = 'c' }) {
  // readings: [{date, temp}] sorted ascending (temp in °C)
  const W = 320, H = 150, padL = 34, padR = 12, padT = 14, padB = 24;
  const lo = unit === 'f' ? 98 : 37, hi = unit === 'f' ? 106 : 41;
  const grid = unit === 'f' ? [98,100,102,104,106] : [37,38,39,40,41];
  const feverLine = window.cToDisplay(38, unit);
  if (readings.length < 2) return null;
  const t0 = readings[0].date.getTime(), t1 = readings[readings.length-1].date.getTime();
  const x = (d) => padL + ((d.getTime() - t0) / Math.max(1, t1 - t0)) * (W - padL - padR);
  const y = (t) => padT + (1 - (t - lo) / (hi - lo)) * (H - padT - padB);
  const pts = readings.map(r => [x(r.date), y(window.cToDisplay(r.temp, unit))]);
  const line = pts.map((p,i) => `${i===0?'M':'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length-1][0].toFixed(1)} ${H-padB} L${pts[0][0].toFixed(1)} ${H-padB} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <defs>
        <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={TF.yellow} stopOpacity="0.32" />
          <stop offset="100%" stopColor={TF.yellow} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {grid.map(g => (
        <g key={g}>
          <line x1={padL} y1={y(g)} x2={W-padR} y2={y(g)} stroke={TF.calm} strokeWidth="1" />
          <text x={padL-7} y={y(g)+3.5} textAnchor="end" fontSize="9" fill={TF.grey} fontWeight="600">{g}°</text>
        </g>
      ))}
      {/* fever threshold */}
      <line x1={padL} y1={y(feverLine)} x2={W-padR} y2={y(feverLine)} stroke={TF.approach} strokeWidth="1" strokeDasharray="3 3" />
      <path d={area} fill="url(#tg)" />
      <path d={line} fill="none" stroke="#F2802E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#fff" stroke="#F2802E" strokeWidth="2" />)}
    </svg>
  );
}

function FlareDetail({ flare, entries, profileId = 'leo' }) {
  const start = new Date(flare.onset.getFullYear(), flare.onset.getMonth(), flare.onset.getDate());
  const end = new Date(flare.end.getFullYear(), flare.end.getMonth(), flare.end.getDate(), 23, 59);
  const inFlare = entries.filter(e => e.profile === profileId && e.date >= start && e.date <= end).sort((a,b)=>a.date-b.date);
  const temps = inFlare.filter(e => e.type === 'temp').map(e => ({ date: e.date, temp: e.temp }));
  const symptomKeys = [...new Set(inFlare.filter(e => e.type === 'symptom').map(e => e.symptom))];
  const medChips = (() => {
    const seen = new Set(), out = [];
    inFlare.filter(e => e.type === 'med').forEach(e => {
      const key = e.med || ('c:' + (e.medName || ''));
      if (seen.has(key)) return; seen.add(key);
      const preset = window.MED_BY_KEY[e.med];
      out.push(preset ? { key, label: preset.label, color: preset.color, form: preset.form }
                      : { key, label: e.medName || 'Medication', color: TF.balance, form: window.unitIcon(e.unit) });
    });
    return out;
  })();
  const len = window.daysBetween(flare.onset, flare.end) + 1;
  const unit = window.useUnit();

  const stat = (label, value, sub) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: TF.anchor, letterSpacing: -0.5, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: TF.grey, fontWeight: 600, marginTop: 4 }}>{label}</div>
    </div>
  );

  return (
    <div>
      {/* summary stats */}
      <Card pad={18} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {stat('duration', `${len} days`)}
          <div style={{ width: 1, height: 34, background: TF.calm }} />
          {stat('peak temp', window.fmtTemp(flare.peak, unit, false))}
          <div style={{ width: 1, height: 34, background: TF.calm }} />
          {stat('symptoms', symptomKeys.length)}
        </div>
      </Card>

      {/* temp chart */}
      {temps.length >= 2 && (
        <Card pad={16} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TF.grey, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Temperature</div>
          <TempChart readings={temps} unit={unit} />
        </Card>
      )}

      {/* symptoms present */}
      {symptomKeys.length > 0 && (
        <Card pad={16} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TF.grey, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Symptoms</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {symptomKeys.map(k => {
              const s = window.SYMPTOM_BY_KEY[k];
              return (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 7, background: TF.calm, borderRadius: 11, padding: '8px 13px 8px 9px' }}>
                  <Icon name={s.icon} size={20} color={TF.balance} sw={1.9} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: TF.anchor }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* meds given */}
      {medChips.length > 0 && (
        <Card pad={16} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: TF.grey, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Medications given</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {medChips.map(m => {
              const form = m.form === 'tablet' ? 'tablet' : m.form === 'drops' ? 'drops' : 'syrup';
              return (
                <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 7, background: m.color + '18', borderRadius: 11, padding: '8px 13px 8px 9px' }}>
                  <Icon name={form} size={20} color={m.color} sw={1.9} />
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: TF.anchor }}>{m.label}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* full timeline */}
      <SectionHeader title="Timeline" />
      <Card pad={14}>
        {inFlare.map((e,i) => (
          <div key={e.id}>
            {(i === 0 || e.dateKey !== inFlare[i-1].dateKey) && (
              <div style={{ fontSize: 12, fontWeight: 700, color: TF.approach, padding: '8px 4px 4px', textTransform: 'uppercase', letterSpacing: 0.4 }}>{e.date.toLocaleDateString('en-GB',{ weekday:'short', day:'numeric', month:'short' })}</div>
            )}
            <EntryRow entry={e} last={i === inFlare.length-1} />
          </div>
        ))}
      </Card>
    </div>
  );
}

Object.assign(window, { FlareDetail, TempChart });
