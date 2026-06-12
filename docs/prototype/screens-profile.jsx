// screens-profile.jsx — profile management + simple settings
const TP = window.TOKENS;

function ProfileScreen({ profiles, activeId, onSwitch, onExport, onOpenSettings, onAddPerson, onDeleteProfile, onEditProfile, onSignOut, unit }) {
  const ordered = [...profiles].sort((a, b) => (a.id === 'self' ? -1 : 0) - (b.id === 'self' ? -1 : 0));
  return (
    <div style={{ paddingBottom: 120 }}>
      <div style={{ padding: '4px 20px 14px' }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: TP.anchor, letterSpacing: -0.6 }}>Profiles</div>
      </div>
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          {ordered.map(p => (
            <Pressable key={p.id} onClick={() => onSwitch(p.id)} as="div" style={{}}>
              <Card pad={14} style={{ display: 'flex', alignItems: 'center', gap: 12, border: p.id === activeId ? `2px solid ${TP.yellow}` : '2px solid transparent' }}>
                <Avatar profile={p} size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: TP.anchor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                    {p.id === activeId && <span style={{ fontSize: 10.5, fontWeight: 700, color: TP.anchor, background: TP.yellow, padding: '2px 8px', borderRadius: 999, flexShrink: 0 }}>Active</span>}
                  </div>
                  <div style={{ fontSize: 13, color: TP.grey }}>{p.id === 'self' ? 'Main account' : window.profileRole(p)}{p.condition ? ` · ${p.condition}` : ''}</div>
                </div>
                <Pressable onClick={(e) => { e.stopPropagation(); onEditProfile(p); }} style={{ width: 36, height: 36, borderRadius: '50%', background: TP.calm, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name="edit" size={18} color={TP.balance} sw={1.9} />
                </Pressable>
                {p.id !== 'self' && (
                  <Pressable onClick={(e) => { e.stopPropagation(); onDeleteProfile(p); }} style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon name="trash" size={20} color={TP.grey} sw={1.8} />
                  </Pressable>
                )}
              </Card>
            </Pressable>
          ))}
          <Pressable onClick={onAddPerson} as="div">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px', borderRadius: 22, border: `1.5px dashed ${TP.lavender}` }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: TP.calm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={24} color={TP.balance} sw={2.2} /></div>
              <span style={{ fontSize: 15.5, fontWeight: 600, color: TP.balance }}>Add a person</span>
            </div>
          </Pressable>
        </div>

        <SectionHeader title="Tools" />
        <Card pad={6}>
          {[
            { icon: 'share', label: 'Export report for doctor', sub: 'PDF summary of flares & meds', fn: onExport },
            { icon: 'settings', label: 'Settings', sub: unit === 'f' ? 'Fahrenheit (°F)' : 'Celsius (°C)', fn: onOpenSettings },
          ].map((r,i,arr) => (
            <Pressable key={r.label} onClick={r.fn} as="div" style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 12px', borderBottom: i===arr.length-1?'none':`1px solid ${TP.calm}` }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: TP.calm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={r.icon} size={21} color={TP.balance} sw={1.9} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15.5, fontWeight: 600, color: TP.anchor }}>{r.label}</div>
                {r.sub && <div style={{ fontSize: 12.5, color: TP.grey }}>{r.sub}</div>}
              </div>
              <Icon name="chevR" size={18} color={TP.grey} sw={2} />
            </Pressable>
          ))}
        </Card>

        {onSignOut && (
          <Pressable onClick={onSignOut} style={{ width: '100%', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 16, background: '#fff', border: `1.5px solid ${TP.lavender}` }}>
            <Icon name="share" size={18} color={TP.balance} sw={2} />
            <span style={{ fontSize: 15, fontWeight: 700, color: TP.balance }}>Sign out</span>
          </Pressable>
        )}

        {profiles.find(p => p.id === 'self') && (
          <Pressable onClick={() => onDeleteProfile(profiles.find(p => p.id === 'self'))} style={{ width: '100%', marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', borderRadius: 16, background: '#FCE9E2' }}>
            <Icon name="trash" size={19} color="#E1542E" sw={1.9} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#E1542E' }}>Delete my profile &amp; data</span>
          </Pressable>
        )}
      </div>
    </div>
  );
}

// Profile switcher bottom sheet content
function ProfileSwitcher({ profiles, activeId, onPick }) {
  const ordered = [...profiles].sort((a, b) => (a.id === 'self' ? -1 : 0) - (b.id === 'self' ? -1 : 0));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {ordered.map(p => (
        <Pressable key={p.id} onClick={() => onPick(p.id)} as="div">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 15px', borderRadius: 18, background: p.id === activeId ? '#fff' : 'transparent', border: p.id === activeId ? `2px solid ${TP.yellow}` : `1.5px solid ${TP.lavender}` }}>
            <Avatar profile={p} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16.5, fontWeight: 700, color: TP.anchor }}>{p.name}</div>
              <div style={{ fontSize: 13, color: TP.grey }}>{p.id === 'self' ? 'Main account' : window.profileRole(p)}{p.condition ? ` · ${p.condition}` : ''}</div>
            </div>
            {p.id === activeId && <Icon name="check" size={22} color={TP.yellow} sw={2.6} />}
          </div>
        </Pressable>
      ))}
    </div>
  );
}

// ── Add / edit person form (bottom sheet content) ───────────
function AddPersonForm({ onSave, initial }) {
  const editing = !!initial;
  const [name, setName] = React.useState(initial ? initial.name : '');
  const [birth, setBirth] = React.useState(() => (initial && initial.birthDate) ? initial.birthDate : window.defaultBirth());
  const [sex, setSex] = React.useState(initial ? initial.sex : null);
  const [color, setColor] = React.useState(initial ? initial.color : window.AVATAR_COLORS[0]);
  const [pfapa, setPfapa] = React.useState(initial ? initial.condition === 'PFAPA' : false);
  const avatarInitial = (name.trim()[0] || '?').toUpperCase();
  const valid = name.trim().length > 0;
  const age = window.computeAge(birth);
  const ageLabel = window.profileRole({ birthDate: birth });

  const field = (label, node) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: TP.grey, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      {node}
    </div>
  );
  const inputStyle = {
    width: '100%', boxSizing: 'border-box', height: 52, borderRadius: 14, border: `1.5px solid ${TP.lavender}`,
    background: '#fff', padding: '0 16px', fontSize: 16.5, fontWeight: 600, color: TP.anchor,
    fontFamily: 'inherit', outline: 'none',
  };

  return (
    <div>
      {/* live avatar preview */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
        <div style={{ width: 76, height: 76, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, boxShadow: '0 6px 18px rgba(12,9,23,0.12)' }}>{avatarInitial}</div>
      </div>

      {field('Name', (
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Noah" style={inputStyle} />
      ))}

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: TP.grey, textTransform: 'uppercase', letterSpacing: 0.5 }}>Birth date</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: TP.approach }}>{ageLabel} old</span>
        </div>
        <window.BirthDateField value={birth} onChange={setBirth} />
      </div>

      {field('Sex', (
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ k: 'male', l: 'Male' }, { k: 'female', l: 'Female' }].map(o => {
            const on = sex === o.k;
            return (
              <Pressable key={o.k} onClick={() => setSex(o.k)} style={{ flex: 1 }}>
                <div style={{ height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? TP.anchor : '#fff', color: on ? '#fff' : TP.balance, border: on ? 'none' : `1.5px solid ${TP.lavender}`, fontWeight: 700, fontSize: 14.5 }}>{o.l}</div>
              </Pressable>
            );
          })}
        </div>
      ))}

      {field('Colour', (
        <div style={{ display: 'flex', gap: 12 }}>
          {window.AVATAR_COLORS.map(c => {
            const on = color === c;
            return (
              <Pressable key={c} onClick={() => setColor(c)} style={{}}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: on ? `0 0 0 3px #fff, 0 0 0 5px ${c}` : 'none' }}>
                  {on && <Icon name="check" size={18} color="#fff" sw={3} />}
                </div>
              </Pressable>
            );
          })}
        </div>
      ))}

      {field('Condition', (
        <Pressable onClick={() => setPfapa(!pfapa)} as="div" style={{}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderRadius: 16, background: '#fff', border: pfapa ? `2px solid ${TP.yellow}` : `1.5px solid ${TP.lavender}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: pfapa ? TP.yellow : TP.calm, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon name="fever" size={22} color={pfapa ? TP.anchor : TP.balance} sw={1.9} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15.5, fontWeight: 700, color: TP.anchor, letterSpacing: -0.2 }}>PFAPA patient</div>
              <div style={{ fontSize: 12.5, color: TP.grey, lineHeight: 1.35 }}>Tracks the flare cycle & predicts the next window</div>
            </div>
            {/* switch */}
            <div style={{ width: 46, height: 28, borderRadius: 999, background: pfapa ? '#1F8A5B' : TP.lavender, flexShrink: 0, position: 'relative', transition: 'background .2s' }}>
              <div style={{ position: 'absolute', top: 3, left: pfapa ? 21 : 3, width: 22, height: 22, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
        </Pressable>
      ))}

      <div style={{ marginTop: 8 }}>
        <Button disabled={!valid} onClick={() => valid && onSave({ name: name.trim(), birthDate: birth, sex, color, initial: avatarInitial, condition: pfapa ? 'PFAPA' : null })}>{editing ? 'Save changes' : 'Add person'}</Button>
      </div>
    </div>
  );
}

Object.assign(window, { ProfileScreen, ProfileSwitcher, AddPersonForm });
