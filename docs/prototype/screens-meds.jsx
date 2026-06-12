// screens-meds.jsx — medication history & "when did I give X" view
const TM = window.TOKENS;

function medStats(entries, profileId) {
  const meds = entries.filter(e => e.profile === profileId && e.type === 'med');
  const byKey = {};
  meds.forEach(e => { const k = e.med || ('c:' + (e.medName || '?')); (byKey[k] = byKey[k] || []).push(e); });
  return Object.entries(byKey).map(([k, list]) => {
    list.sort((a,b) => b.date - a.date);
    const first = list[0];
    const preset = window.MED_BY_KEY[first.med];
    const med = preset || { key: k, label: first.medName || 'Medication', color: window.TOKENS.balance, form: window.unitIcon(first.unit) };
    const monthAgo = window.addDays(window.TODAY, -30);
    const last30 = list.filter(e => e.date >= monthAgo).length;
    return { med, last: first, count: list.length, last30 };
  }).sort((a,b) => b.last.date - a.last.date);
}

function groupByDay(list) {
  const groups = {};
  list.forEach(e => { (groups[e.dateKey] = groups[e.dateKey] || []).push(e); });
  return Object.entries(groups).map(([k, items]) => ({ key: k, date: items[0].date, items: items.sort((a,b)=>b.date-a.date) }))
    .sort((a,b) => b.date - a.date);
}

function relDay(d) {
  const diff = window.daysBetween(new Date(d.getFullYear(),d.getMonth(),d.getDate()), window.TODAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString('en-GB', { weekday: 'long' });
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Searchable text for a med entry (custom name + preset label/brand)
function medSearchText(e) {
  const m = window.MED_BY_KEY[e.med];
  return [(e.medName || ''), (m ? m.label : ''), (m ? m.brand : '')].join(' ').toLowerCase();
}

function MedsScreen({ profile, entries, onSelectEntry }) {
  const [query, setQuery] = React.useState('');
  const q = query.trim().toLowerCase();
  const stats = medStats(entries, profile.id);
  const allMeds = entries.filter(e => e.profile === profile.id && e.type === 'med');
  const days = groupByDay(allMeds).slice(0, 8);
  const searching = q.length > 0;
  const matches = searching ? allMeds.filter(e => medSearchText(e).includes(q)) : [];
  const matchDays = groupByDay(matches);

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', height: 48, borderRadius: 14, border: `1.5px solid ${TM.lavender}`,
    background: '#fff', padding: '0 44px', fontSize: 15.5, fontWeight: 600, color: TM.anchor, fontFamily: 'inherit', outline: 'none',
  };

  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{ padding: '4px 20px 10px' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: TM.anchor, letterSpacing: -0.6 }}>Medications</div>
        <div style={{ fontSize: 13.5, color: TM.grey }}>{profile.name}'s doses & history</div>
      </div>
      <div style={{ padding: '0 20px' }}>
        {stats.length === 0 ? (
          <Card pad={22} style={{ textAlign: 'center' }}><div style={{ color: TM.grey, fontSize: 15 }}>No medications logged yet.</div></Card>
        ) : (
          <>
            {/* search */}
            <div style={{ position: 'relative', marginBottom: 18 }}>
              <span style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <Icon name="search" size={19} color={TM.grey} sw={1.9} />
              </span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a medication…" style={inputStyle} />
              {searching && (
                <Pressable onClick={() => setQuery('')} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', width: 30, height: 30, borderRadius: '50%', background: TM.calm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="close" size={16} color={TM.balance} sw={2.2} />
                </Pressable>
              )}
            </div>

            {searching ? (
              <>
                <SectionHeader title={`${matches.length} dose${matches.length === 1 ? '' : 's'} found`} />
                {matches.length === 0 ? (
                  <Card pad={22} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, color: TM.grey }}>No doses match "{query}".</div>
                  </Card>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {matchDays.map(g => (
                      <div key={g.key}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: TM.balance, marginBottom: 8, paddingLeft: 4 }}>{relDay(g.date)} · {window.fmtDate(g.date)}</div>
                        <Card pad={14}>
                          {g.items.map((e,i) => <EntryRow key={e.id} entry={e} onClick={() => onSelectEntry(e)} last={i === g.items.length-1} />)}
                        </Card>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <SectionHeader title="Recently given" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                  {stats.map(st => {
                    const form = st.med.form === 'tablet' ? 'tablet' : st.med.form === 'drops' ? 'drops' : 'syrup';
                    const lastTxt = relDay(st.last.date);
                    return (
                      <Pressable key={st.med.key} onClick={() => setQuery(st.med.label)} as="div">
                      <Card pad={15} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 14, background: st.med.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon name={form} size={26} color={st.med.color} sw={1.9} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: TM.anchor, letterSpacing: -0.2 }}>{st.med.label}</div>
                          <div style={{ fontSize: 12.5, color: TM.grey }}>Last given {lastTxt.toLowerCase()} · {window.fmtTime(st.last.date)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: TM.anchor, lineHeight: 1 }}>{st.last30}</div>
                          <div style={{ fontSize: 10.5, color: TM.grey, fontWeight: 600 }}>last 30 days</div>
                        </div>
                      </Card>
                      </Pressable>
                    );
                  })}
                </div>

                <SectionHeader title="Dose history" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {days.map(g => (
                    <div key={g.key}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: TM.balance, marginBottom: 8, paddingLeft: 4 }}>{relDay(g.date)}</div>
                      <Card pad={14}>
                        {g.items.map((e,i) => <EntryRow key={e.id} entry={e} onClick={() => onSelectEntry(e)} last={i === g.items.length-1} />)}
                      </Card>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { MedsScreen, medStats, groupByDay, relDay });
