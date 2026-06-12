// screens-home.jsx — Today / Home screen
const TH = window.TOKENS;

// App header with profile switcher trigger
function Header({ profile, onSwitch, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 20px 14px' }}>
      <Pressable onClick={onSwitch} as="div" style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <Avatar profile={profile} size={46} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: TH.anchor, letterSpacing: -0.4 }}>{profile.name}</span>
            <Icon name="chevD" size={18} color={TH.grey} sw={2.2} />
          </div>
          <div style={{ fontSize: 13, color: TH.grey, marginTop: -1 }}>{subtitle}</div>
        </div>
      </Pressable>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {profile.condition && (
          <span style={{ fontSize: 12, fontWeight: 700, color: TH.balance, background: TH.lavender, padding: '5px 11px', borderRadius: 999, letterSpacing: 0.2 }}>{profile.condition}</span>
        )}
      </div>
    </div>
  );
}

// ── Flare cycle card (PFAPA profiles) ───────────────────────
function FlareCycleCard({ cycle, onOpen, showPrediction = true }) {
  const maxDay = cycle.max + 5;
  const pct = (n) => Math.min(100, (n / maxDay) * 100);
  const today = pct(cycle.sinceLast);
  const wStart = pct(cycle.min), wEnd = pct(cycle.max);
  const toWindow = window.daysBetween(window.TODAY, cycle.windowStart);
  const hint = toWindow <= 0
    ? 'Inside the expected flare window now'
    : toWindow <= 7 ? `Next window likely in about ${toWindow} day${toWindow===1?'':'s'}`
    : `Next window in roughly ${toWindow} days`;
  return (
    <Card onClick={onOpen} pad={20} style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: TH.grey, textTransform: 'uppercase', letterSpacing: 0.6 }}>Flare cycle</span>
        <span style={{ fontSize: 13, color: TH.balance, fontWeight: 600 }}>avg every {cycle.avg} days</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 46, fontWeight: 800, color: TH.anchor, letterSpacing: -1.5, lineHeight: 0.9 }}>Day {cycle.sinceLast}</span>
        <span style={{ fontSize: 14, color: TH.grey, marginBottom: 6 }}>since last flare · {window.fmtDate(cycle.last)}</span>
      </div>
      {/* cycle track */}
      <div style={{ position: 'relative', height: 14, borderRadius: 999, background: TH.calm, overflow: 'visible', marginBottom: 8 }}>
        {/* window band */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${wStart}%`, width: `${wEnd-wStart}%`, background: TH.approach + '55', borderRadius: 4 }} />
        {/* elapsed fill */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${today}%`, background: 'var(--accent, #FEAE2E)', borderRadius: 999 }} />
        {/* today marker */}
        <div style={{ position: 'absolute', top: -4, left: `calc(${today}% - 4px)`, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(12,9,23,0.25)', border: `3px solid ${TH.anchor}`, boxSizing: 'border-box' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: TH.grey, marginBottom: 16 }}>
        <span>last flare</span>
        <span style={{ color: TH.approach, fontWeight: 600 }}>likely window</span>
      </div>
      {/* subtle hint */}
      {showPrediction && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: TH.calm, borderRadius: 14, padding: '12px 14px' }}>
        <Icon name="sparkle" size={20} color={TH.approach} sw={1.7} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: TH.anchor, letterSpacing: -0.2 }}>{hint}</div>
          <div style={{ fontSize: 12.5, color: TH.grey }}>Around {window.fmtDate(cycle.windowStart)} – {window.fmtDate(cycle.windowEnd)}</div>
        </div>
        <Icon name="chevR" size={18} color={TH.grey} sw={2} />
      </div>
      )}
    </Card>
  );
}

// ── Wellness card (non-PFAPA profiles) ──────────────────────
function WellnessCard({ profile, lastEntry, summary }) {
  const unit = window.useUnit();
  const level = summary ? summary.maxLevel : 'none';
  const unwell = level !== 'none';
  const sev = window.SEVERITY[level] || window.SEVERITY.mild;

  // Build a short summary of what's logged today
  let title = 'Feeling well';
  let sub = lastEntry ? `Last logged ${window.fmtDate(lastEntry.date)}` : 'No recent symptoms';
  let glyphIcon = 'check', glyphBg = '#E3F0E8', glyphColor = '#1F8A5B';

  if (unwell) {
    title = level === 'severe' ? 'Very unwell' : level === 'mild' ? 'Mild symptoms' : 'Feeling unwell';
    // collect distinct symptom names + fever reading
    const names = [];
    let topSymptomIcon = null, topIdx = -1;
    summary.entries.forEach(e => {
      if (e.type === 'symptom') {
        const s = window.SYMPTOM_BY_KEY[e.symptom];
        const nm = s ? s.label : (e.symptomName || 'Symptom');
        if (!names.includes(nm)) names.push(nm);
        const idx = window.SEVERITY_ORDER.indexOf(e.severity || 'mild');
        if (idx > topIdx) { topIdx = idx; topSymptomIcon = s ? s.icon : 'rash'; }
      }
    });
    if (summary.peakTemp != null && window.tempToSeverity(summary.peakTemp) !== 'none') {
      names.push(`Fever ${window.fmtTemp(summary.peakTemp, unit)}`);
      if (!topSymptomIcon) topSymptomIcon = 'fever';
    }
    const shown = names.slice(0, 2).join(' · ');
    sub = names.length > 2 ? `${shown} +${names.length - 2} more` : (shown || 'Symptoms logged today');
    glyphIcon = topSymptomIcon || 'fever';
    glyphBg = sev.color;
    glyphColor = sev.key === 'mild' ? sev.dot : sev.text;
  }

  return (
    <Card pad={20} style={{ marginBottom: 16 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: TH.grey, textTransform: 'uppercase', letterSpacing: 0.6 }}>Status</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: glyphBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name={glyphIcon} size={26} color={glyphColor} sw={2.2} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: TH.anchor, letterSpacing: -0.3 }}>{title}</div>
          <div style={{ fontSize: 13, color: TH.grey, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
        </div>
        {unwell && <SeverityChip level={level} />}
      </div>
    </Card>
  );
}

// ── Quick log strip ─────────────────────────────────────────
function QuickLog({ onSymptom, onTemp, onMed }) {
  const items = [
    { label: 'Symptom', icon: 'rash', color: TH.approach, fn: onSymptom },
    { label: 'Temp', icon: 'fever', color: '#F2802E', fn: onTemp },
    { label: 'Medication', icon: 'syrup', color: TH.yellow, fn: onMed },
  ];
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
      {items.map(it => (
        <Pressable key={it.label} onClick={it.fn} style={{ flex: 1 }}>
          <Card pad={14} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: it.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={it.icon} size={23} color={it.color === TH.yellow ? '#C7841A' : it.color} sw={1.9} />
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: TH.anchor }}>{it.label}</span>
          </Card>
        </Pressable>
      ))}
    </div>
  );
}

// ── Today screen ────────────────────────────────────────────
function TodayScreen({ profile, entries, onSwitch, onLog, onOpenFlare, onSelectEntry, onSeeAll, showPrediction }) {
  const todayKey = window.dKey(window.TODAY);
  const profEntries = entries.filter(e => e.profile === profile.id);
  const todays = profEntries.filter(e => e.dateKey === todayKey);
  const recent = profEntries.filter(e => e.dateKey !== todayKey).slice(0, 4);
  const subtitle = window.TODAY.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const flares = profile.condition === 'PFAPA' ? window.getFlares(entries, profile.id) : [];
  const cycle = flares.length >= 2 ? window.cycleStats(flares) : null;

  return (
    <div style={{ paddingBottom: 120 }}>
      <Header profile={profile} onSwitch={onSwitch} subtitle={subtitle} />
      <div style={{ padding: '0 20px' }}>
        {profile.condition === 'PFAPA'
          ? (cycle
              ? <FlareCycleCard cycle={cycle} onOpen={onOpenFlare} showPrediction={showPrediction} />
              : <PfapaIntroCard flareCount={flares.length} />)
          : <WellnessCard profile={profile} lastEntry={profEntries[0]} summary={window.daySummary(entries, profile.id, window.TODAY)} />}

        <QuickLog onSymptom={() => onLog('symptom')} onTemp={() => onLog('temp')} onMed={() => onLog('med')} />

        <SectionHeader title="Today" action={todays.length ? undefined : undefined} />
        {todays.length === 0 ? (
          <Card pad={22} style={{ textAlign: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 15, color: TH.grey }}>Nothing logged yet today.</div>
            <div style={{ fontSize: 13.5, color: TH.approach, marginTop: 4, fontWeight: 600 }}>Tap + to add a symptom or medication.</div>
          </Card>
        ) : (
          <Card pad={14} style={{ marginBottom: 18 }}>
            {todays.map((e, i) => <EntryRow key={e.id} entry={e} onClick={() => onSelectEntry(e)} last={i === todays.length - 1} />)}
          </Card>
        )}

        {recent.length > 0 && (
          <>
            <SectionHeader title="Earlier" action="See all" onAction={onSeeAll} />
            <Card pad={14}>
              {recent.map((e, i) => <EntryRow key={e.id} entry={e} onClick={() => onSelectEntry(e)} last={i === recent.length - 1} />)}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

// ── PFAPA intro card (PFAPA profile, not enough flares to predict yet) ──
function PfapaIntroCard({ flareCount }) {
  return (
    <Card pad={20} style={{ marginBottom: 16 }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: TH.grey, textTransform: 'uppercase', letterSpacing: 0.6 }}>Flare cycle</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: TH.lavender, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon name="sparkle" size={24} color={TH.balance} sw={1.8} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: TH.anchor, letterSpacing: -0.3 }}>Building the picture</div>
          <div style={{ fontSize: 13, color: TH.grey }}>{flareCount === 0 ? 'No flares logged yet' : `${flareCount} flare logged`}</div>
        </div>
      </div>
      <div style={{ fontSize: 13.5, color: TH.balance, lineHeight: 1.5, background: TH.calm, borderRadius: 14, padding: '12px 14px' }}>
        Log fever flares as they happen. After {flareCount === 0 ? 'two' : 'one more'} flare{flareCount === 0 ? 's' : ''}, Symtrail will estimate the cycle length and predict the next likely window.
      </div>
    </Card>
  );
}

Object.assign(window, { Header, FlareCycleCard, WellnessCard, PfapaIntroCard, QuickLog, TodayScreen });
