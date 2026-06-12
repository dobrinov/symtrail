// components.jsx — shared Symptio UI primitives.
const T = window.TOKENS;

// ── Avatar ──────────────────────────────────────────────────
function Avatar({ profile, size = 40, ring = false, onClick }) {
  return (
    <div onClick={onClick} style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: profile.color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.4, letterSpacing: 0.2,
      boxShadow: ring ? `0 0 0 3px ${T.canvas}, 0 0 0 5px ${profile.color}` : 'none',
      cursor: onClick ? 'pointer' : 'default', userSelect: 'none',
    }}>{profile.initial}</div>
  );
}

// ── Severity chip & dot ─────────────────────────────────────
function SeverityChip({ level, small = false }) {
  const s = window.SEVERITY[level];
  if (!s) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.color, color: s.text, fontWeight: 600,
      fontSize: small ? 11 : 12.5, padding: small ? '2px 8px' : '3px 10px',
      borderRadius: 999, letterSpacing: 0.1, lineHeight: 1.3,
    }}>{s.label}</span>
  );
}
function SeverityDot({ level, size = 10 }) {
  const s = window.SEVERITY[level] || window.SEVERITY.none;
  return <span style={{ width: size, height: size, borderRadius: '50%', background: s.dot, display: 'inline-block', flexShrink: 0 }} />;
}

// ── Card ────────────────────────────────────────────────────
function Card({ children, style = {}, pad = 18, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 'var(--card-r, 22px)', padding: pad,
      boxShadow: '0 1px 2px rgba(12,9,23,0.04), 0 6px 20px rgba(12,9,23,0.05)',
      cursor: onClick ? 'pointer' : 'default', ...style,
    }}>{children}</div>
  );
}

// ── Section header ──────────────────────────────────────────
function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px 10px' }}>
      <div style={{ fontSize: 19, fontWeight: 700, color: T.anchor, letterSpacing: -0.3 }}>{title}</div>
      {action && <button onClick={onAction} style={{ border: 'none', background: 'none', color: T.approach, fontWeight: 600, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}>{action}</button>}
    </div>
  );
}

// ── Pressable (subtle scale on tap) ─────────────────────────
function Pressable({ children, onClick, style = {}, as = 'button' }) {
  const [down, setDown] = React.useState(false);
  const El = as;
  return (
    <El
      onClick={onClick}
      onPointerDown={() => setDown(true)}
      onPointerUp={() => setDown(false)}
      onPointerLeave={() => setDown(false)}
      style={{
        border: 'none', background: 'none', font: 'inherit', textAlign: 'left',
        cursor: 'pointer', transition: 'transform .12s ease, opacity .12s ease',
        transform: down ? 'scale(0.97)' : 'scale(1)', opacity: down ? 0.85 : 1,
        ...style,
      }}
    >{children}</El>
  );
}

// ── Bottom sheet ────────────────────────────────────────────
function Sheet({ open, onClose, children, title, full = false }) {
  const [render, setRender] = React.useState(open);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    let t;
    if (open) { setRender(true); t = setTimeout(() => setShown(true), 20); }
    else { setShown(false); t = setTimeout(() => setRender(false), 300); }
    return () => clearTimeout(t);
  }, [open]);
  if (!render) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(12,9,23,0.32)',
        backdropFilter: 'blur(2px)', opacity: shown ? 1 : 0, transition: 'opacity .28s ease',
      }} />
      <div style={{
        position: 'relative', background: T.canvas,
        borderTopLeftRadius: 30, borderTopRightRadius: 30,
        maxHeight: full ? '94%' : '86%', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -10px 40px rgba(12,9,23,0.2)', overflow: 'hidden',
        transform: shown ? 'translateY(0)' : 'translateY(101%)',
        transition: 'transform .34s cubic-bezier(.32,.72,0,1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 10 }}>
          <div style={{ width: 38, height: 5, borderRadius: 999, background: T.lavender }} />
        </div>
        {title !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 6px', gap: 12 }}>
            <div style={{ fontSize: 21, fontWeight: 700, color: T.anchor, letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>{title}</div>
            <Pressable onClick={onClose} style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '50%', background: T.calm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="close" size={18} color={T.balance} sw={2} />
            </Pressable>
          </div>
        )}
        <div style={{ overflow: 'auto', padding: '8px 20px 28px', WebkitOverflowScrolling: 'touch' }}>{children}</div>
      </div>
    </div>
  );
}

// ── Primary / secondary buttons ─────────────────────────────
function Button({ children, onClick, variant = 'primary', disabled = false, full = true, icon }) {
  const styles = {
    primary:   { background: disabled ? T.lavender : 'var(--accent, #FEAE2E)', color: disabled ? '#fff' : T.anchor },
    dark:      { background: T.anchor, color: '#fff' },
    secondary: { background: T.calm, color: T.anchor },
    danger:    { background: '#E1542E', color: '#fff' },
    ghost:     { background: 'transparent', color: T.approach },
  };
  return (
    <Pressable onClick={disabled ? undefined : onClick} style={{
      width: full ? '100%' : 'auto', height: 54, borderRadius: 16,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      fontSize: 17, fontWeight: 700, letterSpacing: -0.2,
      opacity: disabled ? 0.6 : 1, ...styles[variant],
    }}>
      {icon}{children}
    </Pressable>
  );
}

// ── Bottom tab bar ──────────────────────────────────────────
function TabBar({ active, onChange, onAdd }) {
  const tabs = [
    { key: 'today', label: 'Today', icon: 'today' },
    { key: 'calendar', label: 'Calendar', icon: 'calendar' },
    { key: 'add', label: '', icon: 'plus' },
    { key: 'meds', label: 'Meds', icon: 'syrup' },
    { key: 'profile', label: 'Profile', icon: 'profile' },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 100,
      paddingBottom: 24, paddingTop: 8,
      background: 'linear-gradient(to top, rgba(248,250,255,0.96) 70%, rgba(248,250,255,0))',
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', padding: '0 14px' }}>
        {tabs.map(t => {
          if (t.key === 'add') {
            return (
              <Pressable key="add" onClick={onAdd} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -18 }}>
                <div style={{
                  width: 58, height: 58, borderRadius: 20, background: 'var(--accent, #FEAE2E)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 6px 18px rgba(254,174,46,0.5)',
                }}>
                  <Icon name="plus" size={30} color={T.anchor} sw={2.4} />
                </div>
              </Pressable>
            );
          }
          const on = active === t.key;
          return (
            <Pressable key={t.key} onClick={() => onChange(t.key)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1, paddingTop: 4 }}>
              <Icon name={t.icon} size={26} color={on ? T.anchor : T.grey} sw={on ? 2.1 : 1.8} />
              <span style={{ fontSize: 10.5, fontWeight: on ? 700 : 500, color: on ? T.anchor : T.grey, letterSpacing: 0.1 }}>{t.label}</span>
            </Pressable>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { Avatar, SeverityChip, SeverityDot, Card, SectionHeader, Pressable, Sheet, Button, TabBar });

// Temperature unit context (stored values are always °C)
const UnitContext = React.createContext('c');
window.UnitContext = UnitContext;
