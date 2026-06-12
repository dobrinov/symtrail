// screens-calendar.jsx — month heatmap + day detail + episode list
const TC = window.TOKENS;

// Per-day rollup for a profile
function daySummary(entries, profileId, d) {
  const key = window.dKey(d);
  const es = entries.filter(e => e.profile === profileId && e.dateKey === key);
  let maxIdx = 0, peakTemp = null;
  let hasMed = false, hasSymptom = false;
  es.forEach(e => {
    let lvl = 'none';
    if (e.type === 'temp') { lvl = window.tempToSeverity(e.temp); if (peakTemp == null || e.temp > peakTemp) peakTemp = e.temp; }
    else if (e.type === 'symptom') { lvl = e.severity || 'mild'; hasSymptom = true; }
    else if (e.type === 'med') hasMed = true;
    const idx = window.SEVERITY_ORDER.indexOf(lvl);
    if (idx > maxIdx) maxIdx = idx;
  });
  return { key, entries: es, maxLevel: window.SEVERITY_ORDER[maxIdx], maxIdx, peakTemp, hasMed, hasSymptom, count: es.length };
}

function isFlareDay(d, flares) {
  return (flares || []).some(f => d >= new Date(f.onset.getFullYear(),f.onset.getMonth(),f.onset.getDate()) && d <= new Date(f.end.getFullYear(),f.end.getMonth(),f.end.getDate()));
}

// Medication reminders scheduled to fire on a given day
function remindersOn(entries, profileId, d) {
  const key = window.dKey(d);
  return entries.filter(e => e.profile === profileId && e.reminderAt && window.dKey(e.reminderAt) === key)
    .sort((a, b) => a.reminderAt - b.reminderAt);
}

function MonthGrid({ year, month, entries, profile, flares, onPickDay, selectedKey }) {
  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday-start
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let dnum = 1; dnum <= daysInMonth; dnum++) cells.push(new Date(year, month, dnum));
  const weekdays = ['M','T','W','T','F','S','S'];
  const todayKey = window.dKey(window.TODAY);

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 8 }}>
        {weekdays.map((w,i) => <div key={i} style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: TC.grey }}>{w}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const future = d > window.TODAY;
          const sum = daySummary(entries, profile.id, d);
          const reminders = remindersOn(entries, profile.id, d);
          const hasRemind = reminders.length > 0;
          const sev = window.SEVERITY[sum.maxLevel];
          const flare = profile.condition === 'PFAPA' && isFlareDay(d, flares);
          const isToday = sum.key === todayKey;
          const isSelected = selectedKey && sum.key === selectedKey;
          const filled = sum.maxIdx > 0;
          const clickable = !future || hasRemind;
          const bg = future ? (isSelected ? '#FFF6E6' : '#fff') : filled ? sev.color : (isSelected ? '#FFF6E6' : '#fff');
          const fg = future ? (hasRemind ? TC.balance : TC.lavender) : sum.maxIdx >= 3 ? '#fff' : filled ? sev.text : TC.anchor;
          const border = isSelected ? '2.5px solid var(--accent, #FEAE2E)'
            : isToday ? `2px solid ${TC.anchor}`
            : flare ? `1.5px solid ${TC.approach}` : `1px solid ${TC.calm}`;
          return (
            <Pressable key={i} onClick={() => clickable && onPickDay(d)} as="div" style={{
              aspectRatio: '1', borderRadius: 12, background: bg,
              border,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              position: 'relative', boxSizing: 'border-box', opacity: (future && !hasRemind) ? 0.45 : 1,
              cursor: clickable ? 'pointer' : 'default',
            }}>
              <span style={{ fontSize: 14.5, fontWeight: (isToday||isSelected) ? 800 : filled ? 700 : 500, color: fg, lineHeight: 1 }}>{d.getDate()}</span>
              {/* indicators */}
              <div style={{ display: 'flex', gap: 2, marginTop: 3, height: 4 }}>
                {sum.hasMed && <span style={{ width: 4, height: 4, borderRadius: '50%', background: sum.maxIdx >= 3 ? 'rgba(255,255,255,0.85)' : TC.yellow }} />}
                {hasRemind && <span style={{ width: 4, height: 4, borderRadius: '50%', background: TC.approach }} />}
              </div>
            </Pressable>
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { c: '#fff', b: TC.calm, l: 'Well' },
    { c: window.SEVERITY.mild.color, l: 'Mild' },
    { c: window.SEVERITY.moderate.color, l: 'Moderate' },
    { c: window.SEVERITY.high.color, l: 'High' },
    { c: window.SEVERITY.severe.color, l: 'Severe' },
    { c: TC.approach, l: 'Reminder', dot: true },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', rowGap: 10, columnGap: 16, padding: '16px 2px 2px' }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 13, height: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {it.dot
              ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: it.c }} />
              : <span style={{ width: 13, height: 13, borderRadius: 4, background: it.c, border: `1px solid ${it.b || 'transparent'}` }} />}
          </span>
          <span style={{ fontSize: 12, color: TC.grey, fontWeight: 600, whiteSpace: 'nowrap' }}>{it.l}</span>
        </div>
      ))}
    </div>
  );
}

// Day-detail sheet content
function DayDetail({ date, entries, profileId, onAdd }) {
  const unit = window.useUnit();
  const sum = daySummary(entries, profileId, date);
  const sorted = [...sum.entries].sort((a,b) => a.date - b.date);
  const reminders = remindersOn(entries, profileId, date);
  return (
    <div>
      {sum.peakTemp != null && (
        <Card pad={16} style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
          <EntryGlyph entry={{ type: 'temp', temp: sum.peakTemp }} size={46} />
          <div>
            <div style={{ fontSize: 13, color: TC.grey, fontWeight: 600 }}>Peak temperature</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: TC.anchor, letterSpacing: -0.5 }}>{window.fmtTemp(sum.peakTemp, unit)}</div>
          </div>
          <div style={{ marginLeft: 'auto' }}><SeverityChip level={window.tempToSeverity(sum.peakTemp)} /></div>
        </Card>
      )}
      {sorted.length === 0 && reminders.length === 0 && (
        <div style={{ textAlign: 'center', color: TC.grey, padding: '24px 0 20px' }}>Nothing logged on this day.</div>
      )}
      {sorted.length > 0 && (
        <Card pad={14} style={{ marginBottom: 14 }}>
          {sorted.map((e,i) => <EntryRow key={e.id} entry={e} last={i === sorted.length-1} />)}
        </Card>
      )}
      {reminders.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: TC.grey, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 9, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="bell" size={14} color={TC.approach} sw={2} /> Reminders
          </div>
          <Card pad={14}>
            {reminders.map((e,i) => {
              const m = window.MED_BY_KEY[e.med];
              const name = e.medName || (m ? m.label : 'Medication');
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: i === reminders.length-1 ? 'none' : `1px solid ${TC.calm}` }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(149,140,190,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="bell" size={19} color={TC.approach} sw={1.9} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: TC.anchor }}>{name}{e.dose ? ` · ${e.dose}` : ''}</div>
                    <div style={{ fontSize: 12.5, color: TC.grey }}>Dose reminder</div>
                  </div>
                  <span style={{ fontSize: 13, color: TC.balance, fontWeight: 700 }}>{window.fmtTime(e.reminderAt)}</span>
                </div>
              );
            })}
          </Card>
        </div>
      )}
      {onAdd && (
        <Button variant="secondary" onClick={onAdd} icon={<Icon name="plus" size={20} color={TC.anchor} sw={2.4} />}>Add entry for this day</Button>
      )}
    </div>
  );
}

function EpisodeList({ flares, onOpen }) {
  const unit = window.useUnit();
  const list = [...flares].reverse();
  return (
    <Card pad={6}>
      {list.map((f, i) => {
        const len = window.daysBetween(f.onset, f.end) + 1;
        return (
          <Pressable key={i} onClick={() => onOpen(f)} as="div" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 12px', borderBottom: i === list.length-1 ? 'none' : `1px solid ${TC.calm}` }}>
            <div style={{ width: 44, height: 44, borderRadius: 13, background: window.SEVERITY[window.tempToSeverity(f.peak)].color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: window.SEVERITY[window.tempToSeverity(f.peak)].text }}>
              <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.8, lineHeight: 1 }}>{f.onset.toLocaleDateString('en-GB',{month:'short'}).toUpperCase()}</span>
              <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.1 }}>{f.onset.getDate()}</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: TC.anchor, letterSpacing: -0.2 }}>{len}-day flare</div>
              <div style={{ fontSize: 12.5, color: TC.grey }}>Peak {window.fmtTemp(f.peak, unit)}{f.steroid ? ' · steroid used' : ''}</div>
            </div>
            <Icon name="chevR" size={18} color={TC.grey} sw={2} />
          </Pressable>
        );
      })}
    </Card>
  );
}

function CalendarScreen({ profile, entries, onSelectEntry, onOpenFlare, onLogForDay }) {
  const [ym, setYm] = React.useState({ y: 2026, m: 5 });
  const [day, setDay] = React.useState(() => window.TODAY);
  const flares = profile.condition === 'PFAPA' ? window.getFlares(entries, profile.id) : [];
  const monthName = new Date(ym.y, ym.m, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const canNext = !(ym.y === 2026 && ym.m >= 5);
  const move = (delta) => {
    let m = ym.m + delta, y = ym.y;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    if (y === 2026 && m > 5) return;
    setYm({ y, m });
  };
  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{ padding: '4px 20px 10px' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: TC.anchor, letterSpacing: -0.6 }}>Calendar</div>
        <div style={{ fontSize: 13.5, color: TC.grey }}>{profile.name}'s symptom history</div>
      </div>
      <div style={{ padding: '0 20px' }}>
        <Card pad={18} style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: TC.anchor, letterSpacing: -0.3 }}>{monthName}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Pressable onClick={() => move(-1)} style={{ width: 34, height: 34, borderRadius: '50%', background: TC.calm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevL" size={18} color={TC.balance} sw={2.2} /></Pressable>
              <Pressable onClick={() => move(1)} style={{ width: 34, height: 34, borderRadius: '50%', background: canNext ? TC.calm : '#fafbff', opacity: canNext ? 1 : 0.4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="chevR" size={18} color={TC.balance} sw={2.2} /></Pressable>
            </div>
          </div>
          <MonthGrid year={ym.y} month={ym.m} entries={entries} profile={profile} flares={flares} onPickDay={setDay} selectedKey={window.dKey(day)} />
          <Legend />
        </Card>

        {/* selected day — inline */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, padding: '2px 4px 11px' }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: TC.anchor, letterSpacing: -0.3 }}>{day.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            {window.dKey(day) === window.dKey(window.TODAY) && <span style={{ fontSize: 11.5, fontWeight: 700, color: TC.balance, background: TC.calm, borderRadius: 999, padding: '3px 9px' }}>Today</span>}
          </div>
          <DayDetail date={day} entries={entries} profileId={profile.id} onAdd={onLogForDay ? () => onLogForDay(day) : null} />
        </div>

        {profile.condition === 'PFAPA' && flares.length > 0 && (
          <>
            <SectionHeader title="Flare episodes" />
            <EpisodeList flares={flares} onOpen={onOpenFlare} />
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { daySummary, isFlareDay, remindersOn, CalendarScreen });
