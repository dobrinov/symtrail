// app.jsx — Symptio orchestrator
const TA = window.TOKENS;

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 110, zIndex: 300, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <div style={{ background: TA.anchor, color: '#fff', padding: '12px 20px', borderRadius: 999, fontSize: 14.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 24px rgba(12,9,23,0.3)' }}>
        <Icon name="check" size={18} color={TA.yellow} sw={2.6} />{msg}
      </div>
    </div>
  );
}

function flareTitle(flare) {
  const o = flare.onset, e = flare.end;
  const mo = o.toLocaleDateString('en-GB', { month: 'short' });
  const me = e.toLocaleDateString('en-GB', { month: 'short' });
  return mo === me ? `Flare · ${o.getDate()}–${e.getDate()} ${mo}` : `Flare · ${o.getDate()} ${mo} – ${e.getDate()} ${me}`;
}

function LogChooser({ name, onPick, forDate }) {
  const opts = [
    { k: 'symptom', label: 'Symptom', sub: 'Fever, throat, pain…', icon: 'rash', color: TA.approach },
    { k: 'temp', label: 'Temperature', sub: 'Record a reading', icon: 'fever', color: '#F2802E' },
    { k: 'med', label: 'Medication', sub: 'A dose you gave', icon: 'syrup', color: TA.yellow },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
      {forDate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: TA.calm, marginBottom: 3 }}>
          <Icon name="calendar" size={17} color={TA.balance} sw={2} />
          <span style={{ fontSize: 13.5, fontWeight: 600, color: TA.balance }}>Adding to {forDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' })}</span>
        </div>
      )}
      {opts.map(o => (
        <Pressable key={o.k} onClick={() => onPick(o.k)} as="div">
          <Card pad={16} style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <div style={{ width: 50, height: 50, borderRadius: 15, background: o.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={o.icon} size={27} color={o.color === TA.yellow ? '#C7841A' : o.color} sw={1.9} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: TA.anchor, letterSpacing: -0.2 }}>{o.label}</div>
              <div style={{ fontSize: 13, color: TA.grey }}>{o.sub}</div>
            </div>
            <Icon name="chevR" size={20} color={TA.grey} sw={2} />
          </Card>
        </Pressable>
      ))}
    </div>
  );
}

function EntryDetail({ entry, onDelete, onEdit }) {
  const unit = window.useUnit();
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
        <EntryGlyph entry={entry} size={60} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: TA.anchor, letterSpacing: -0.4 }}>{window.entryTitle(entry, unit)}</div>
          <div style={{ fontSize: 14, color: TA.grey }}>{window.entrySubtitle(entry)} · {window.fmtTime(entry.date)}</div>
        </div>
      </div>
      {entry.type === 'symptom' && entry.severity && (
        <Card pad={16} style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14.5, color: TA.balance, fontWeight: 600 }}>Severity</span>
          <SeverityChip level={entry.severity} />
        </Card>
      )}
      {entry.type === 'med' && entry.note && (
        <Card pad={16} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: TA.grey, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Notes</div>
          <div style={{ fontSize: 15, color: TA.anchor, lineHeight: 1.45 }}>{entry.note}</div>
        </Card>
      )}
      {entry.type === 'med' && entry.reminderAt && (
        <Card pad={14} style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: TA.calm, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="bell" size={19} color={TA.balance} sw={1.9} />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: TA.grey, textTransform: 'uppercase', letterSpacing: 0.5 }}>Reminder</div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: TA.anchor }}>{entry.reminderAt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · {window.fmtTime(entry.reminderAt)}</div>
          </div>
        </Card>
      )}
      <div style={{ fontSize: 13, color: TA.grey, textAlign: 'center', marginBottom: 18 }}>{entry.date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Button onClick={onEdit} icon={<Icon name="edit" size={19} color={TA.anchor} sw={2} />}>Edit entry</Button>
        <Button variant="secondary" onClick={onDelete}><span style={{ color: '#E1542E' }}>Delete entry</span></Button>
      </div>
    </div>
  );
}

// Settings sheet content
function SettingsSheet({ unit, onUnit }) {
  const opts = [{ k: 'c', l: 'Celsius', s: '°C' }, { k: 'f', l: 'Fahrenheit', s: '°F' }];
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: TA.grey, marginBottom: 9, textTransform: 'uppercase', letterSpacing: 0.5, paddingLeft: 4 }}>Temperature unit</div>
      <div style={{ display: 'flex', gap: 9, marginBottom: 8 }}>
        {opts.map(o => {
          const on = unit === o.k;
          return (
            <Pressable key={o.k} onClick={() => onUnit(o.k)} style={{ flex: 1 }}>
              <Card pad={16} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: on ? `2px solid ${TA.yellow}` : '2px solid transparent' }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: on ? TA.anchor : TA.grey, letterSpacing: -1 }}>{o.s}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: on ? TA.anchor : TA.grey }}>{o.l}</span>
              </Card>
            </Pressable>
          );
        })}
      </div>
      <div style={{ fontSize: 12.5, color: TA.grey, textAlign: 'center', padding: '6px 16px 0', lineHeight: 1.4 }}>Applies everywhere temperatures appear — logging, calendar, flare charts and history.</div>
    </div>
  );
}

function Symptio({ t }) {
  const [entries, setEntries] = React.useState(() => window.ENTRIES);
  const [activeId, setActiveId] = React.useState('leo');
  const [tab, setTab] = React.useState('today');
  const [switcher, setSwitcher] = React.useState(false);
  const [logMode, setLogMode] = React.useState(null); // choose|symptom|temp|med
  const [logDate, setLogDate] = React.useState(null); // preset date when adding from calendar
  const [sel, setSel] = React.useState(null);
  const [flare, setFlare] = React.useState(null);
  const [toast, setToast] = React.useState('');
  const [unit, setUnit] = React.useState(() => { try { return localStorage.getItem('symptio_unit') || 'c'; } catch (e) { return 'c'; } });
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [profiles, setProfiles] = React.useState(() => window.PROFILES);
  const [addPersonOpen, setAddPersonOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [editTarget, setEditTarget] = React.useState(null);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [editEntryTarget, setEditEntryTarget] = React.useState(null);
  const [authed, setAuthed] = React.useState(false);
  const [authScreen, setAuthScreen] = React.useState('signin');
  const changeUnit = (u) => { setUnit(u); try { localStorage.setItem('symptio_unit', u); } catch (e) {} };
  const profile = profiles.find(p => p.id === activeId) || profiles[0];
  const toastTimer = React.useRef(null);

  const updateProfile = (id, data) => {
    setProfiles(prev => prev.map(x => x.id === id ? { ...x, name: data.name, birthDate: data.birthDate, sex: data.sex, color: data.color, initial: data.initial, condition: data.condition } : x));
    setEditTarget(null);
    fireToast('Profile updated');
  };

  const addPerson = (p) => {
    const id = 'p_' + Math.random().toString(36).slice(2, 8);
    const newProfile = {
      id, name: p.name, sex: p.sex, color: p.color, initial: p.initial,
      birthDate: p.birthDate || null, condition: p.condition || null,
    };
    setProfiles(prev => [...prev, newProfile]);
    setAddPersonOpen(false);
    setActiveId(id);
    setTab('today');
    fireToast(`${p.name} added`);
  };

  const fireToast = (m) => {
    setToast(m);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  };

  const addEntries = (partials) => {
    const stamped = partials.map(p => ({
      id: `${activeId}-${window.dKey(p.date)}-${Math.random().toString(36).slice(2,8)}`,
      profile: activeId, dateKey: window.dKey(p.date), ...p,
    }));
    setEntries(prev => [...stamped, ...prev].sort((a,b) => b.date - a.date));
    setLogMode(null);
    const m = stamped.find(p => p.type === 'med');
    fireToast(m && m.reminderAt ? 'Logged · reminder set' : partials.length > 1 ? 'Saved' : partials[0].type === 'med' ? 'Medication logged' : 'Saved');
  };

  const deleteEntry = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    setSel(null);
    fireToast('Entry deleted');
  };

  const updateEntry = (id, patch) => {
    setEntries(prev => prev
      .map(e => e.id === id ? { ...e, ...patch, dateKey: patch.date ? window.dKey(patch.date) : e.dateKey } : e)
      .sort((a, b) => b.date - a.date));
    setEditEntryTarget(null);
    setSel(null);
    fireToast('Entry updated');
  };

  const deleteProfile = (p) => {
    const remaining = profiles.filter(x => x.id !== p.id);
    setProfiles(remaining);
    setEntries(prev => prev.filter(e => e.profile !== p.id));
    if (activeId === p.id) { setActiveId(remaining.length ? remaining[0].id : null); setTab('today'); }
    setDeleteTarget(null);
    fireToast(`${p.name === 'You' ? 'Your profile' : p.name} removed`);
  };

  const openMostRecentFlare = () => {
    const flares = window.getFlares(entries, activeId);
    if (flares.length) setFlare([...flares].sort((a,b)=>b.onset-a.onset)[0]);
  };

  const sheetTitle = logMode === 'choose' ? `Add to ${profile.name}`
    : logMode === 'symptom' ? 'Log a symptom'
    : logMode === 'temp' ? 'Temperature'
    : logMode === 'med' ? 'Medication' : '';

  const cardR = t.cardCorners === 'sharp' ? '13px' : '22px';

  if (!authed) {
    return (
      <IOSDevice>
        <AuthFlow screen={authScreen} setScreen={setAuthScreen} variant={t.loginStyle} accent={t.accent} onAuthed={() => { setAuthed(true); setTab('today'); }} />
      </IOSDevice>
    );
  }
  return (
    <window.UnitContext.Provider value={unit}>
    <IOSDevice>
      <div style={{ height: '100%', background: TA.canvas, position: 'relative', display: 'flex', flexDirection: 'column', fontFamily: "'Sora','Roboto',system-ui,sans-serif", '--accent': t.accent, '--card-r': cardR }}>
        {/* top safe-area spacer below dynamic island */}
        <div style={{ height: 58, flexShrink: 0 }} />
        <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {tab === 'today' && <TodayScreen profile={profile} entries={entries} onSwitch={() => setSwitcher(true)} onLog={(m) => setLogMode(m)} onOpenFlare={openMostRecentFlare} onSelectEntry={setSel} onSeeAll={() => setTab('calendar')} showPrediction={t.prediction} />}
          {tab === 'calendar' && <CalendarScreen profile={profile} entries={entries} onSelectEntry={setSel} onOpenFlare={setFlare} onLogForDay={(d) => { const n = new Date(); setLogDate(new Date(d.getFullYear(), d.getMonth(), d.getDate(), n.getHours(), n.getMinutes())); setLogMode('choose'); }} />}
          {tab === 'meds' && <MedsScreen profile={profile} entries={entries} onSelectEntry={setSel} />}
          {tab === 'profile' && <ProfileScreen profiles={profiles} activeId={activeId} onSwitch={(id) => { setActiveId(id); setTab('today'); }} onExport={() => setReportOpen(true)} onOpenSettings={() => setSettingsOpen(true)} onAddPerson={() => setAddPersonOpen(true)} onDeleteProfile={(p) => setDeleteTarget(p)} onEditProfile={(p) => setEditTarget(p)} onSignOut={() => { setAuthed(false); setAuthScreen('signin'); }} unit={unit} />}
        </div>

        <TabBar active={tab} onChange={setTab} onAdd={() => setLogMode('choose')} />
        <Toast msg={toast} />

        {/* profile switcher */}
        <Sheet open={switcher} onClose={() => setSwitcher(false)} title="Who are you tracking?">
          <ProfileSwitcher profiles={profiles} activeId={activeId} onPick={(id) => { setActiveId(id); setSwitcher(false); setTab('today'); }} />
        </Sheet>

        {/* logging */}
        <Sheet open={!!logMode} onClose={() => { setLogMode(null); setLogDate(null); }} title={sheetTitle} full={logMode === 'symptom' || logMode === 'med'}>
          {logMode === 'choose' && <LogChooser name={profile.name} forDate={logDate} onPick={(k) => setLogMode(k)} />}
          {logMode === 'symptom' && <LogSymptom onSave={addEntries} isPfapa={profile.condition === 'PFAPA'} initialDate={logDate} />}
          {logMode === 'temp' && <LogTemp onSave={addEntries} initialDate={logDate} />}
          {logMode === 'med' && <LogMed onSave={addEntries} initialDate={logDate} />}
        </Sheet>

        {/* entry detail */}
        <Sheet open={!!sel} onClose={() => setSel(null)} title="Entry">
          {sel && <EntryDetail entry={sel} onDelete={() => deleteEntry(sel.id)} onEdit={() => { setEditEntryTarget(sel); setSel(null); }} />}
        </Sheet>

        {/* edit entry */}
        <Sheet open={!!editEntryTarget} onClose={() => setEditEntryTarget(null)} title="Edit entry" full={editEntryTarget && editEntryTarget.type === 'med'}>
          {editEntryTarget && <EditEntry entry={editEntryTarget} onSave={(patch) => updateEntry(editEntryTarget.id, patch)} />}
        </Sheet>

        {/* flare detail */}
        <Sheet open={!!flare} onClose={() => setFlare(null)} title={flare ? flareTitle(flare) : ''} full>
          {flare && <FlareDetail flare={flare} entries={entries} profileId={activeId} />}
        </Sheet>

        {/* settings */}
        <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
          <SettingsSheet unit={unit} onUnit={changeUnit} />
        </Sheet>

        {/* add person */}
        <Sheet open={addPersonOpen} onClose={() => setAddPersonOpen(false)} title="Add a person" full>
          <AddPersonForm onSave={addPerson} />
        </Sheet>

        {/* edit person */}
        <Sheet open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit profile" full>
          {editTarget && <AddPersonForm initial={editTarget} onSave={(d) => updateProfile(editTarget.id, d)} />}
        </Sheet>

        {/* doctor report */}
        <Sheet open={reportOpen} onClose={() => setReportOpen(false)} title={`Report · ${profile.name}`} full>
          <ReportSheet profile={profile} entries={entries} onShare={(kind) => { setReportOpen(false); fireToast(kind === 'pdf' ? 'PDF saved to Files' : 'Report ready to share'); }} />
        </Sheet>

        {/* delete person confirm */}
        <Sheet open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove person">
          {deleteTarget && (() => {
            const self = deleteTarget.id === 'self';
            return (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '4px 8px 18px' }}>
                <Avatar profile={deleteTarget} size={64} />
                <div style={{ fontSize: 18, fontWeight: 700, color: TA.anchor, marginTop: 12 }}>{self ? 'Delete your profile?' : `Remove ${deleteTarget.name}?`}</div>
                <div style={{ fontSize: 14, color: TA.grey, marginTop: 6, lineHeight: 1.45, maxWidth: 280 }}>{self
                  ? 'This permanently deletes your profile and all your logged symptoms, temperatures and medications.'
                  : `This permanently deletes ${deleteTarget.name}'s profile and all their logged symptoms, temperatures and medications.`}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Button variant="danger" onClick={() => deleteProfile(deleteTarget)}>{self ? 'Delete my profile' : `Delete ${deleteTarget.name}`}</Button>
                <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              </div>
            </div>
            );
          })()}
        </Sheet>
      </div>
    </IOSDevice>
    </window.UnitContext.Provider>
  );
}

// ── Scaling stage ───────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#FEAE2E",
  "cardCorners": "soft",
  "prediction": true,
  "loginStyle": "centered"
}/*EDITMODE-END*/;

function Stage() {
  const [scale, setScale] = React.useState(1);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => {
    const fit = () => {
      const s = Math.min((window.innerWidth - 32) / 402, (window.innerHeight - 32) / 874, 1.15);
      setScale(Math.max(0.4, s));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#E9EBF2', padding: 16, boxSizing: 'border-box' }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
        <Symptio t={t} />
      </div>
      <TweaksPanel>
        <TweakSection label="Appearance" />
        <TweakColor label="Accent" value={t.accent}
          options={['#FEAE2E', '#F2802E', '#958CBE', '#59586E']}
          onChange={(v) => setTweak('accent', v)} />
        <TweakRadio label="Card corners" value={t.cardCorners}
          options={['soft', 'sharp']}
          onChange={(v) => setTweak('cardCorners', v)} />
        <TweakSection label="Behaviour" />
        <TweakToggle label="Flare prediction" value={t.prediction}
          onChange={(v) => setTweak('prediction', v)} />
        <TweakSection label="Login screen" />
        <TweakRadio label="Login style" value={t.loginStyle}
          options={['centered', 'panel', 'hero']}
          onChange={(v) => setTweak('loginStyle', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Stage />);
