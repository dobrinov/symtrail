// screens-log.jsx — logging sheets for symptom / temperature / medication
const TL = window.TOKENS;

// Severity segmented selector (mild → severe)
function SeveritySelector({ value, onChange }) {
  const opts = ['mild','moderate','high','severe'];
  return (
    <div style={{ display: 'flex', gap: 7 }}>
      {opts.map(k => {
        const s = window.SEVERITY[k];
        const on = value === k;
        return (
          <Pressable key={k} onClick={() => onChange(k)} style={{ flex: 1 }}>
            <div style={{
              height: 46, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: on ? s.color : '#fff', color: on ? s.text : TL.balance,
              border: on ? 'none' : `1.5px solid ${TL.lavender}`, fontWeight: 700, fontSize: 13.5,
              transition: 'all .15s',
            }}>{s.label}</div>
          </Pressable>
        );
      })}
    </div>
  );
}

// Temperature stepper (stores °C; displays & steps in the chosen unit)
function TempStepper({ value, onChange, unit = 'c' }) {
  const sev = window.SEVERITY[window.tempToSeverity(value)];
  const disp = window.cToDisplay(value, unit);
  const loDisp = window.cToDisplay(36, unit), hiDisp = window.cToDisplay(42, unit);
  const pct = Math.max(0, Math.min(100, ((disp - loDisp) / (hiDisp - loDisp)) * 100));
  const trackColor = sev.key === 'none' ? TL.balance : sev.dot;
  const setFromDisp = (v) => { const c = window.displayToC(v, unit); onChange(Math.round(Math.max(36, Math.min(42, c)) * 1000) / 1000); };
  const step = (dDisp) => {
    const dC = unit === 'f' ? dDisp * 5/9 : dDisp;
    const nv = Math.max(36, Math.min(42, value + dC)); // clamp 36–42°C
    onChange(Math.round(nv * 1000) / 1000);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <Pressable onClick={() => step(-0.1)} style={{ width: 52, height: 52, borderRadius: '50%', background: TL.calm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 18, height: 3, background: TL.balance, borderRadius: 2 }} />
        </Pressable>
        <div style={{ textAlign: 'center', minWidth: 150 }}>
          <div style={{ fontSize: 56, fontWeight: 800, color: sev.key==='none'?TL.anchor:sev.dot, letterSpacing: -2, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{disp.toFixed(1)}°</div>
          <div style={{ marginTop: 8 }}><SeverityChip level={window.tempToSeverity(value)} /></div>
        </div>
        <Pressable onClick={() => step(0.1)} style={{ width: 52, height: 52, borderRadius: '50%', background: TL.calm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="plus" size={22} color={TL.balance} sw={2.4} />
        </Pressable>
      </div>
      {/* quick slider */}
      <div style={{ width: '100%', padding: '0 4px' }}>
        <input type="range" className="sym-temp-slider" min={loDisp} max={hiDisp} step={0.1} value={disp}
          onChange={(e) => setFromDisp(parseFloat(e.target.value))}
          style={{ color: trackColor, background: `linear-gradient(90deg, ${trackColor} 0%, ${trackColor} ${pct}%, ${TL.lavender} ${pct}%, ${TL.lavender} 100%)` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11.5, color: TL.grey, fontWeight: 600 }}>
          <span>{Math.round(loDisp)}°</span>
          <span>{Math.round(hiDisp)}°</span>
        </div>
      </div>
    </div>
  );
}

// ── Date + time wheel picker ────────────────────────────────
function defaultLogTime() {
  const t = window.TODAY, n = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate(), n.getHours(), n.getMinutes());
}
function sameYMD(a, b) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
function dayLabel(d) {
  if (sameYMD(d, window.TODAY)) return 'Today';
  if (sameYMD(d, window.addDays(window.TODAY, -1))) return 'Yesterday';
  if (sameYMD(d, window.addDays(window.TODAY, 1))) return 'Tomorrow';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

const WHEEL_IH = 38, WHEEL_VIS = 5;
function Wheel({ items, index, onChange, align = 'center', flex }) {
  const ref = React.useRef(null);
  const tmr = React.useRef(null);
  React.useEffect(() => { if (ref.current) ref.current.scrollTop = index * WHEEL_IH; }, []);
  const onScroll = () => {
    clearTimeout(tmr.current);
    tmr.current = setTimeout(() => {
      if (!ref.current) return;
      let i = Math.round(ref.current.scrollTop / WHEEL_IH);
      i = Math.max(0, Math.min(items.length - 1, i));
      const target = i * WHEEL_IH;
      if (Math.abs(ref.current.scrollTop - target) > 0.5) ref.current.scrollTo({ top: target, behavior: 'smooth' });
      if (i !== index) onChange(i);
    }, 110);
  };
  return (
    <div ref={ref} onScroll={onScroll} style={{ flex: flex ? 1 : undefined, height: WHEEL_IH * WHEEL_VIS, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
      <div style={{ height: WHEEL_IH * ((WHEEL_VIS - 1) / 2) }} />
      {items.map((it, i) => (
        <div key={i} onClick={() => { ref.current.scrollTo({ top: i * WHEEL_IH, behavior: 'smooth' }); if (i !== index) onChange(i); }} style={{
          height: WHEEL_IH, display: 'flex', alignItems: 'center', justifyContent: align, padding: '0 14px',
          fontSize: i === index ? 19 : 16, fontWeight: i === index ? 700 : 500,
          color: i === index ? TL.anchor : TL.grey, opacity: i === index ? 1 : 0.45,
          fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'font-size .12s, opacity .12s',
        }}>{it.label}</div>
      ))}
      <div style={{ height: WHEEL_IH * ((WHEEL_VIS - 1) / 2) }} />
    </div>
  );
}

function DateTimeField({ value, onChange, future = false, label = 'When' }) {
  const days = React.useMemo(() => {
    const arr = [];
    if (future) { for (let i = 0; i <= 90; i++) { const d = window.addDays(window.TODAY, i); arr.push({ date: d, label: dayLabel(d) }); } }
    else { for (let i = 120; i >= 0; i--) { const d = window.addDays(window.TODAY, -i); arr.push({ date: d, label: dayLabel(d) }); } }
    return arr;
  }, [future]);
  const dayIndex = Math.max(0, days.findIndex(x => sameYMD(x.date, value)));
  const hours = React.useMemo(() => Array.from({ length: 24 }, (_, i) => ({ label: String(i).padStart(2, '0') })), []);
  const mins = React.useMemo(() => Array.from({ length: 60 }, (_, i) => ({ label: String(i).padStart(2, '0') })), []);

  const setDay = (i) => { const d = days[i].date; onChange(new Date(d.getFullYear(), d.getMonth(), d.getDate(), value.getHours(), value.getMinutes())); };
  const setHour = (i) => { const nv = new Date(value); nv.setHours(i); onChange(nv); };
  const setMin = (i) => { const nv = new Date(value); nv.setMinutes(i); onChange(nv); };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: TL.grey, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <Card pad={6} style={{ position: 'relative' }}>
        {/* selection band */}
        <div style={{ position: 'absolute', left: 10, right: 10, top: `calc(50% - ${WHEEL_IH/2}px)`, height: WHEEL_IH, background: TL.calm, borderRadius: 11, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
          <Wheel items={days} index={dayIndex} onChange={setDay} align="flex-start" flex />
          <Wheel items={hours} index={value.getHours()} onChange={setHour} align="center" />
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 19, fontWeight: 700, color: TL.anchor }}>:</div>
          <Wheel items={mins} index={value.getMinutes()} onChange={setMin} align="center" />
        </div>
      </Card>
    </div>
  );
}

// ── Birth-date wheel (day / month / year) ───────────────────
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function defaultBirth() {
  const t = window.TODAY;
  return new Date(t.getFullYear() - 4, t.getMonth(), t.getDate());
}
function BirthDateField({ value, onChange }) {
  const v = value || defaultBirth();
  const year = v.getFullYear(), month = v.getMonth(), day = v.getDate();
  const years = React.useMemo(() => { const a = []; for (let y = window.TODAY.getFullYear(); y >= 1925; y--) a.push(y); return a; }, []);
  const months = React.useMemo(() => MONTH_ABBR.map(m => ({ label: m })), []);
  const dim = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: dim }, (_, i) => ({ label: String(i + 1) }));
  const yearItems = years.map(y => ({ label: String(y) }));

  const clampDay = (y, m, d) => Math.min(d, new Date(y, m + 1, 0).getDate());
  const setDay = (i) => onChange(new Date(year, month, i + 1));
  const setMonth = (i) => onChange(new Date(year, i, clampDay(year, i, day)));
  const setYear = (i) => { const y = years[i]; onChange(new Date(y, month, clampDay(y, month, day))); };

  return (
    <Card pad={6} style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', left: 10, right: 10, top: `calc(50% - ${WHEEL_IH/2}px)`, height: WHEEL_IH, background: TL.calm, borderRadius: 11, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'stretch' }}>
        <Wheel items={days} index={day - 1} onChange={setDay} align="center" flex />
        <Wheel items={months} index={month} onChange={setMonth} align="center" flex />
        <Wheel items={yearItems} index={Math.max(0, years.indexOf(year))} onChange={setYear} align="center" flex />
      </div>
    </Card>
  );
}

// ── Symptom log ─────────────────────────────────────────────
function LogSymptom({ onSave, isPfapa, initialDate }) {
  const unit = window.useUnit();
  const [sel, setSel] = React.useState(null);
  const [sev, setSev] = React.useState('moderate');
  const [temp, setTemp] = React.useState(38.5);
  const [at, setAt] = React.useState(() => initialDate || defaultLogTime());
  const [customName, setCustomName] = React.useState('');
  const inputStyle = { width: '100%', boxSizing: 'border-box', height: 50, borderRadius: 14, border: `1.5px solid ${TL.lavender}`, background: '#fff', padding: '0 16px', fontSize: 16, fontWeight: 600, color: TL.anchor, fontFamily: 'inherit', outline: 'none' };
  const byGroup = (g) => window.SYMPTOMS.filter(s => s.group === g);
  // PFAPA patients get a dedicated flare section on top; everyone else folds
  // those symptoms into General.
  const sections = isPfapa
    ? [['PFAPA', byGroup('PFAPA')], ['Infection', byGroup('Infection')], ['General', byGroup('General')]]
    : [['General', [...byGroup('PFAPA'), ...byGroup('General')]], ['Infection', byGroup('Infection')]];
  return (
    <div>
      {sections.map(([label, syms]) => (
        <div key={label} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: TL.grey, marginBottom: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {syms.map(s => {
              const on = sel === s.key;
              return (
                <Pressable key={s.key} onClick={() => { setSel(s.key); setCustomName(''); }} style={{}}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 4px', borderRadius: 15, background: on ? TL.anchor : '#fff', border: on ? 'none' : `1.5px solid ${TL.calm}`, transition: 'all .15s' }}>
                    <Icon name={s.icon} size={26} color={on ? TL.yellow : TL.balance} sw={1.8} />
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: on ? '#fff' : TL.anchor, textAlign: 'center', lineHeight: 1.15 }}>{s.label}</span>
                  </div>
                </Pressable>
              );
            })}
          </div>
        </div>
      ))}

      {/* add your own */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: TL.grey, marginBottom: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>Add your own</div>
        <input value={customName} onChange={(e) => { setCustomName(e.target.value); if (e.target.value) setSel(null); }} placeholder="e.g. Cramps, sore eyes…" style={inputStyle} />
      </div>

      {(sel || customName.trim()) && (
        <div style={{ marginTop: 4 }}>
          {sel === 'fever' && (
            <Card pad={18} style={{ marginBottom: 16 }}>
              <TempStepper value={temp} onChange={setTemp} unit={unit} />
            </Card>
          )}
          <div style={{ fontSize: 13, fontWeight: 700, color: TL.grey, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Severity</div>
          <div style={{ marginBottom: 18 }}><SeveritySelector value={sev} onChange={setSev} /></div>
          <div style={{ marginBottom: 20 }}><DateTimeField value={at} onChange={setAt} /></div>
          <Button onClick={() => {
            const date = at;
            const custom = customName.trim();
            if (custom) onSave([{ type: 'symptom', symptom: null, symptomName: custom, severity: sev, date }]);
            else if (sel === 'fever') onSave([{ type: 'temp', temp, date }, { type: 'symptom', symptom: 'fever', severity: sev, date }]);
            else onSave([{ type: 'symptom', symptom: sel, severity: sev, date }]);
          }}>{`Save ${(customName.trim() || window.SYMPTOM_BY_KEY[sel].label).toLowerCase()}`}</Button>
        </div>
      )}
    </div>
  );
}

// ── Temperature log ─────────────────────────────────────────
function LogTemp({ onSave, initialDate }) {
  const unit = window.useUnit();
  const [temp, setTemp] = React.useState(37.8);
  const [at, setAt] = React.useState(() => initialDate || defaultLogTime());
  return (
    <div>
      <Card pad={22} style={{ marginBottom: 18 }}>
        <TempStepper value={temp} onChange={setTemp} unit={unit} />
      </Card>
      <div style={{ marginBottom: 20 }}><DateTimeField value={at} onChange={setAt} /></div>
      <Button onClick={() => onSave([{ type: 'temp', temp, date: at }])}>Save temperature</Button>
    </div>
  );
}

// ── Medication log (manual entry) ───────────────────────────
const MED_UNITS = ['ml', 'oz', 'mg', 'tablet', 'drops', 'tsp', 'suppository'];

// iOS-style toggle
function Switch({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{ width: 50, height: 30, borderRadius: 999, background: on ? 'var(--accent, #FEAE2E)' : TL.lavender, position: 'relative', cursor: 'pointer', transition: 'background .18s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left .18s' }} />
    </div>
  );
}

const REMIND_PRESETS = [4, 6, 8, 12, 24];
function fmtReminder(d) {
  const today = window.dKey(d) === window.dKey(window.TODAY);
  const tom = window.dKey(d) === window.dKey(window.addDays(window.TODAY, 1));
  const day = today ? 'today' : tom ? 'tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${day} · ${window.fmtTime(d)}`;
}

// Reminder toggle + precise time picker (above Notes in med flows)
function ReminderField({ on, setOn, value, setValue, baseDate }) {
  const labelStyle = { fontSize: 13, fontWeight: 700, color: TL.grey, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 };
  const selHours = value ? Math.round((value.getTime() - baseDate.getTime()) / 3600000) : null;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={labelStyle}>Reminder</div>
      <Card pad={14}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: TL.calm, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="bell" size={20} color={on ? TL.balance : TL.approach} sw={1.9} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600, color: TL.anchor }}>Remind me for the next dose</div>
            <div style={{ fontSize: 12.5, color: TL.grey }}>Push notification</div>
          </div>
          <Switch on={on} onChange={setOn} />
        </div>
        {on && value && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${TL.calm}` }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: TL.grey, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Quick</div>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
              {REMIND_PRESETS.map(h => {
                const sel = selHours === h;
                return (
                  <Pressable key={h} onClick={() => setValue(new Date(baseDate.getTime() + h * 3600 * 1000))} style={{ flex: '1 0 auto' }}>
                    <div style={{ minWidth: 52, padding: '9px 14px', borderRadius: 11, textAlign: 'center', background: sel ? TL.anchor : '#fff', color: sel ? '#fff' : TL.balance, border: sel ? 'none' : `1.5px solid ${TL.lavender}`, fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap' }}>{`In ${h}h`}</div>
                  </Pressable>
                );
              })}
            </div>
            <DateTimeField value={value} onChange={setValue} future label="Remind me at" />
          </div>
        )}
      </Card>
    </div>
  );
}

function LogMed({ onSave, initialDate }) {
  const [name, setName] = React.useState('');
  const [medKey, setMedKey] = React.useState(null);
  const [amount, setAmount] = React.useState('');
  const [unit, setUnit] = React.useState('ml');
  const [at, setAt] = React.useState(() => initialDate || defaultLogTime());
  const [note, setNote] = React.useState('');
  const [remind, setRemind] = React.useState(false);
  const [remindAt, setRemindAt] = React.useState(null);
  const toggleRemind = (v) => { setRemind(v); if (v && !remindAt) setRemindAt(new Date(at.getTime() + 6 * 3600 * 1000)); };
  const valid = name.trim().length > 0 && amount.trim().length > 0;

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', height: 52, borderRadius: 14, border: `1.5px solid ${TL.lavender}`,
    background: '#fff', padding: '0 16px', fontSize: 16.5, fontWeight: 600, color: TL.anchor, fontFamily: 'inherit', outline: 'none',
  };
  const labelStyle = { fontSize: 13, fontWeight: 700, color: TL.grey, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 };

  const pickPreset = (m) => {
    setMedKey(m.key);
    setName(`${m.label}${m.brand ? ` · ${m.brand}` : ''}`);
    const u = m.form === 'tablet' ? 'tablet' : m.form === 'drops' ? 'drops' : 'ml';
    setUnit(u);
    const num = parseFloat(m.defaultDose);
    if (!isNaN(num)) setAmount(String(num));
  };
  const onName = (v) => { setName(v); setMedKey(null); };

  return (
    <div>
      {/* medication name */}
      <div style={{ marginBottom: 14 }}>
        <div style={labelStyle}>Medication</div>
        <input value={name} onChange={(e) => onName(e.target.value)} placeholder="e.g. Ibuprofen" style={inputStyle} />
      </div>

      {/* quick picks */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 18 }}>
        {window.MEDS.map(m => {
          const on = medKey === m.key;
          const form = m.form === 'tablet' ? 'tablet' : m.form === 'drops' ? 'drops' : 'syrup';
          return (
            <Pressable key={m.key} onClick={() => pickPreset(m)} style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 13px 8px 9px', borderRadius: 999, background: on ? TL.anchor : '#fff', border: on ? 'none' : `1.5px solid ${TL.lavender}` }}>
                <Icon name={form} size={18} color={on ? '#fff' : m.color} sw={1.9} />
                <span style={{ fontSize: 13.5, fontWeight: 600, color: on ? '#fff' : TL.anchor, whiteSpace: 'nowrap' }}>{m.label}</span>
              </div>
            </Pressable>
          );
        })}
      </div>

      {/* dosage amount */}
      <div style={{ marginBottom: 16 }}>
        <div style={labelStyle}>Dosage</div>
        <div style={{ position: 'relative' }}>
          <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, '').slice(0, 6))} inputMode="decimal" placeholder="0" style={{ ...inputStyle, paddingRight: 64 }} />
          <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 700, color: TL.approach, pointerEvents: 'none' }}>{unit}</span>
        </div>
      </div>

      {/* unit */}
      <div style={{ marginBottom: 18 }}>
        <div style={labelStyle}>Unit</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {MED_UNITS.map(u => {
            const on = unit === u;
            return (
              <Pressable key={u} onClick={() => setUnit(u)} style={{}}>
                <div style={{ height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? TL.yellow : '#fff', color: TL.anchor, border: on ? 'none' : `1.5px solid ${TL.lavender}`, fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap' }}>{u}</div>
              </Pressable>
            );
          })}
        </div>
      </div>

      {/* when */}
      <div style={{ marginBottom: 18 }}><DateTimeField value={at} onChange={setAt} /></div>

      {/* reminder */}
      <ReminderField on={remind} setOn={toggleRemind} value={remindAt} setValue={setRemindAt} baseDate={at} />

      {/* notes */}
      <div style={{ marginBottom: 20 }}>
        <div style={labelStyle}>Notes <span style={{ textTransform: 'none', fontWeight: 500, color: TL.lavender }}>· optional</span></div>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. reason, reaction, with food…" rows={2} style={{ ...inputStyle, height: 'auto', minHeight: 64, padding: 14, resize: 'none', lineHeight: 1.4, fontWeight: 500 }} />
      </div>

      <Button disabled={!valid} onClick={() => valid && onSave([{
        type: 'med', med: medKey, medName: name.trim(),
        amount: amount.trim(), unit, dose: window.doseLabel(amount.trim(), unit),
        note: note.trim(), date: at,
        reminderAt: remind ? remindAt : null,
      }])}>Log medication</Button>
    </div>
  );
}

// ── Edit an existing entry (type-aware) ─────────────────────
function EditEntry({ entry, onSave }) {
  const unit = window.useUnit();
  const [at, setAt] = React.useState(() => new Date(entry.date));
  const [temp, setTemp] = React.useState(entry.type === 'temp' ? entry.temp : 38);
  const [sev, setSev] = React.useState(entry.severity || 'moderate');
  const presetName = window.MED_BY_KEY[entry.med] ? window.MED_BY_KEY[entry.med].label : '';
  const initialName = entry.medName || presetName;
  const [name, setName] = React.useState(initialName);
  // Older / seeded med entries only have a `dose` string (e.g. "5 ml", "1 drop") — parse it.
  const doseMatch = (entry.dose || '').match(/^([\d.]+)\s*(.+)$/);
  const UNIT_NORMALIZE = { ml: 'ml', oz: 'oz', mg: 'mg', tsp: 'tsp', tablet: 'tablet', tablets: 'tablet', drop: 'drops', drops: 'drops', suppository: 'suppository', suppositorys: 'suppository', suppositories: 'suppository' };
  const parsedUnit = doseMatch ? doseMatch[2].trim().toLowerCase() : '';
  const initAmount = entry.amount != null ? String(entry.amount) : (doseMatch ? doseMatch[1] : '');
  const initUnit = (entry.unit && MED_UNITS.includes(entry.unit)) ? entry.unit : (UNIT_NORMALIZE[parsedUnit] || 'ml');
  const [amount, setAmount] = React.useState(initAmount);
  const [medUnit, setMedUnit] = React.useState(initUnit);
  const [note, setNote] = React.useState(entry.note || '');
  const [text, setText] = React.useState(entry.text || '');
  const [remind, setRemind] = React.useState(!!entry.reminderAt);
  const [remindAt, setRemindAt] = React.useState(entry.reminderAt ? new Date(entry.reminderAt) : null);
  const toggleRemind = (v) => { setRemind(v); if (v && !remindAt) setRemindAt(new Date(at.getTime() + 6 * 3600 * 1000)); };

  const inputStyle = { width: '100%', boxSizing: 'border-box', height: 52, borderRadius: 14, border: `1.5px solid ${TL.lavender}`, background: '#fff', padding: '0 16px', fontSize: 16.5, fontWeight: 600, color: TL.anchor, fontFamily: 'inherit', outline: 'none' };
  const labelStyle = { fontSize: 13, fontWeight: 700, color: TL.grey, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 };
  const medValid = name.trim().length > 0 && amount.trim().length > 0;

  const save = () => {
    if (entry.type === 'temp') return onSave({ temp, date: at });
    if (entry.type === 'symptom') return onSave({ severity: sev, date: at });
    if (entry.type === 'note') return onSave({ text: text.trim(), date: at });
    if (!medValid) return;
    const medKey = name.trim() === initialName ? entry.med : null;
    return onSave({ med: medKey, medName: name.trim(), amount: amount.trim(), unit: medUnit, dose: window.doseLabel(amount.trim(), medUnit), note: note.trim(), date: at,
      reminderAt: remind ? remindAt : null });
  };

  return (
    <div>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 20 }}>
        <EntryGlyph entry={entry} size={50} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: TL.anchor, letterSpacing: -0.3 }}>{window.entryTitle(entry, unit)}</div>
          <div style={{ fontSize: 13, color: TL.grey }}>{window.entrySubtitle(entry)}</div>
        </div>
      </div>

      {entry.type === 'temp' && (
        <Card pad={20} style={{ marginBottom: 18 }}>
          <TempStepper value={temp} onChange={setTemp} unit={unit} />
        </Card>
      )}

      {entry.type === 'symptom' && entry.severity && (
        <div style={{ marginBottom: 18 }}>
          <div style={labelStyle}>Severity</div>
          <SeveritySelector value={sev} onChange={setSev} />
        </div>
      )}

      {entry.type === 'med' && (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Medication</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ibuprofen" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Dosage</div>
            <div style={{ position: 'relative' }}>
              <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, '').slice(0, 6))} inputMode="decimal" placeholder="0" style={{ ...inputStyle, paddingRight: 64 }} />
              <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 700, color: TL.approach, pointerEvents: 'none' }}>{medUnit}</span>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Unit</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {MED_UNITS.map(u => {
                const on = medUnit === u;
                return (
                  <Pressable key={u} onClick={() => setMedUnit(u)} style={{}}>
                    <div style={{ height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? TL.yellow : '#fff', color: TL.anchor, border: on ? 'none' : `1.5px solid ${TL.lavender}`, fontWeight: 700, fontSize: 13.5, whiteSpace: 'nowrap' }}>{u}</div>
                  </Pressable>
                );
              })}
            </div>
          </div>
          <ReminderField on={remind} setOn={toggleRemind} value={remindAt} setValue={setRemindAt} baseDate={at} />
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Notes <span style={{ textTransform: 'none', fontWeight: 500, color: TL.lavender }}>· optional</span></div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. reason, reaction, with food…" rows={2} style={{ ...inputStyle, height: 'auto', minHeight: 64, padding: 14, resize: 'none', lineHeight: 1.4, fontWeight: 500 }} />
          </div>
        </>
      )}

      {entry.type === 'note' && (
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>Note</div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} style={{ ...inputStyle, height: 'auto', minHeight: 80, padding: 14, resize: 'none', lineHeight: 1.4, fontWeight: 500 }} />
        </div>
      )}

      <div style={{ marginBottom: 20 }}><DateTimeField value={at} onChange={setAt} /></div>
      <Button disabled={entry.type === 'med' && !medValid} onClick={save}>Save changes</Button>
    </div>
  );
}

Object.assign(window, { LogSymptom, LogTemp, LogMed, EditEntry, SeveritySelector, TempStepper, BirthDateField, defaultBirth });
