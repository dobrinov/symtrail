// screens-auth.jsx — warm, reassuring login / sign-up / reset flow
// Three sign-in layout variants switchable via the "Login style" tweak.
const TAU = window.TOKENS;

// Warm tints derived from Assertion Yellow + Lavender (soft, low-sat)
const WARM = {
  peach:  '#FFEFD9',
  cream:  '#FFF8EE',
  amber:  '#FBE2B0',
  blush:  '#F0EAF1',
  lilac:  '#EBE8F2',
};

// Symtrail brand colours (heart + cross identity)
const LOGO_NAVY = '#16335B';
const LOGO_PINK = '#F49AC1';
const LOGO_BLUE = '#54C5E8';

// ── Heart + cross mark ──────────────────────────────────────
function LogoMark({ size = 64, navy = LOGO_NAVY }) {
  const h = Math.round(size * 112 / 120);
  return (
    <svg width={size} height={h} viewBox="0 0 120 112" fill="none" style={{ display: 'block', flexShrink: 0 }}>
      <path d="M60 100 C 28 79, 12 58, 12 38 C 12 23, 23 13, 36 13 C 47 13, 55 20, 60 30 C 65 20, 73 13, 84 13 C 97 13, 108 23, 108 38 C 108 58, 92 79, 60 100 Z"
        fill={LOGO_PINK} stroke={navy} strokeWidth="7" strokeLinejoin="round" />
      <path d="M52 34 H68 V40 H74 V56 H68 V62 H52 V56 H46 V40 H52 Z"
        fill={LOGO_BLUE} stroke={navy} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Full logo — mark + wordmark + tagline (matches supplied artwork)
function LogoFull({ markSize = 88, navy = LOGO_NAVY, gap = 14 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap }}>
      <LogoMark size={markSize} navy={navy} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
        <div style={{ fontSize: markSize * 0.4, fontWeight: 800, letterSpacing: 1.5, color: navy, lineHeight: 1 }}>SYMTRAIL</div>
        <div style={{ fontSize: markSize * 0.14, fontWeight: 700, letterSpacing: markSize * 0.06, color: LOGO_PINK, paddingLeft: markSize * 0.06 }}>SINCE 2026</div>
      </div>
    </div>
  );
}

function Wordmark({ light = false, size = 26 }) {
  return <div style={{ fontSize: size, fontWeight: 800, letterSpacing: -0.6, color: light ? '#fff' : TAU.anchor }}>Symtrail</div>;
}

// ── Input field ─────────────────────────────────────────────
function AuthField({ icon, label, type = 'text', placeholder, value, onChange, secure = false, autoFocus }) {
  const [show, setShow] = React.useState(false);
  const [focus, setFocus] = React.useState(false);
  return (
    <div>
      {label && <div style={{ fontSize: 12.5, fontWeight: 700, color: TAU.balance, marginBottom: 6, paddingLeft: 2 }}>{label}</div>}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, height: 54,
        background: '#fff', borderRadius: 14, padding: '0 14px',
        border: `1.5px solid ${focus ? 'var(--accent, #FEAE2E)' : TAU.lavender}`,
        boxShadow: focus ? '0 0 0 3px rgba(254,174,46,0.15)' : 'none',
        transition: 'border-color .15s, box-shadow .15s',
      }}>
        <Icon name={icon} size={20} color={focus ? TAU.balance : TAU.approach} sw={1.9} />
        <input
          value={value} onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          autoFocus={autoFocus}
          type={secure && !show ? 'password' : (type === 'email' ? 'email' : 'text')}
          placeholder={placeholder}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 16, fontFamily: 'inherit', color: TAU.anchor, letterSpacing: -0.2 }}
        />
        {secure && (
          <Pressable as="div" onClick={() => setShow((s) => !s)} style={{ padding: 4, display: 'flex' }}>
            <Icon name={show ? 'eyeoff' : 'eye'} size={19} color={TAU.grey} sw={1.9} />
          </Pressable>
        )}
      </div>
    </div>
  );
}

function OrDivider({ label = 'or' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: TAU.lavender }} />
      <span style={{ fontSize: 12.5, color: TAU.grey, fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: TAU.lavender }} />
    </div>
  );
}

function AppleButton({ onClick }) {
  return (
    <Pressable onClick={onClick} style={{
      width: '100%', height: 54, borderRadius: 16, background: TAU.anchor, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
      fontSize: 16.5, fontWeight: 700, letterSpacing: -0.2,
    }}>
      <Icon name="apple" size={19} color="#fff" /> Continue with Apple
    </Pressable>
  );
}

function FaceIDButton({ onClick }) {
  return (
    <Pressable onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '10px 4px', color: TAU.balance, fontSize: 14.5, fontWeight: 700,
    }}>
      <Icon name="faceid" size={20} color={TAU.balance} sw={1.9} /> Unlock with Face ID
    </Pressable>
  );
}

function LinkText({ children, onClick, color }) {
  return (
    <Pressable as="span" onClick={onClick} style={{ color: color || 'var(--accent, #FEAE2E)', fontWeight: 700, display: 'inline' }}>{children}</Pressable>
  );
}

// ════════════════════════════════════════════════════════════
// SIGN-IN — three layout variants
// ════════════════════════════════════════════════════════════
function SignInForm({ email, setEmail, pass, setPass, onAuthed, onForgot, compact }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <AuthField icon="mail" label="Email" type="email" placeholder="you@email.com" value={email} onChange={setEmail} />
      <div>
        <AuthField icon="lock" label="Password" placeholder="••••••••" value={pass} onChange={setPass} secure />
        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <LinkText onClick={onForgot} color={TAU.balance}>Forgot password?</LinkText>
        </div>
      </div>
      <Button onClick={onAuthed} disabled={!email || !pass}>Sign in</Button>
    </div>
  );
}

// Variant A — Calm centered
function SignInCentered({ s }) {
  return (
    <div style={{ minHeight: '100%', background: TAU.canvas, display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginBottom: 30 }}>
        <LogoFull markSize={84} />
        <div style={{ fontSize: 15, color: TAU.grey, textAlign: 'center', lineHeight: 1.45, maxWidth: 280 }}>{s.tagline}</div>
      </div>
      <SignInForm {...s} />
      <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <OrDivider />
        <AppleButton onClick={s.onAuthed} />
        <FaceIDButton onClick={s.onAuthed} />
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ textAlign: 'center', fontSize: 14.5, color: TAU.grey, padding: '14px 0 22px' }}>
        New here? <LinkText onClick={s.onSignup}>Create an account</LinkText>
      </div>
    </div>
  );
}

// Variant B — Warm top panel + form sheet
function SignInPanel({ s }) {
  return (
    <div style={{ minHeight: '100%', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        background: `linear-gradient(165deg, ${WARM.amber} 0%, ${WARM.peach} 55%, ${WARM.blush} 100%)`,
        padding: '70px 26px 40px', borderBottomLeftRadius: 34, borderBottomRightRadius: 34,
      }}>
        <LogoMark size={56} />
        <div style={{ fontSize: 30, fontWeight: 800, color: TAU.anchor, letterSpacing: -0.7, marginTop: 18, lineHeight: 1.1 }}>Hello</div>
        <div style={{ fontSize: 15, color: TAU.balance, marginTop: 8, lineHeight: 1.45, maxWidth: 300 }}>{s.tagline}</div>
      </div>
      <div style={{ padding: '26px 24px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <SignInForm {...s} />
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <OrDivider />
          <AppleButton onClick={s.onAuthed} />
          <FaceIDButton onClick={s.onAuthed} />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'center', fontSize: 14.5, color: TAU.grey, padding: '16px 0 22px' }}>
          New here? <LinkText onClick={s.onSignup}>Create an account</LinkText>
        </div>
      </div>
    </div>
  );
}

// Variant C — Friendly hero card + segmented toggle
function SignInHero({ s }) {
  return (
    <div style={{ minHeight: '100%', background: WARM.cream, display: 'flex', flexDirection: 'column', padding: '64px 22px 0' }}>
      {/* hero card with soft shapes */}
      <div style={{
        position: 'relative', borderRadius: 26, overflow: 'hidden', padding: '26px 24px 28px',
        background: `linear-gradient(145deg, ${WARM.peach}, ${WARM.lilac})`,
      }}>
        <div style={{ position: 'absolute', width: 130, height: 130, borderRadius: '50%', background: 'rgba(254,174,46,0.30)', top: -40, right: -30 }} />
        <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: 'rgba(149,140,190,0.28)', bottom: -24, left: 40 }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoMark size={42} radius={12} />
            <Wordmark size={22} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: TAU.anchor, letterSpacing: -0.6, marginTop: 18, lineHeight: 1.15 }}>Track flares with confidence.</div>
          <div style={{ fontSize: 14, color: TAU.balance, marginTop: 7, lineHeight: 1.45 }}>{s.tagline}</div>
        </div>
      </div>

      {/* segmented toggle */}
      <div style={{ display: 'flex', background: '#fff', borderRadius: 14, padding: 4, margin: '20px 0 18px', border: `1px solid ${TAU.lavender}` }}>
        <div style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 11, background: 'var(--accent, #FEAE2E)', color: TAU.anchor, fontWeight: 700, fontSize: 14.5 }}>Sign in</div>
        <Pressable as="div" onClick={s.onSignup} style={{ flex: 1, textAlign: 'center', padding: '10px 0', color: TAU.grey, fontWeight: 700, fontSize: 14.5 }}>Create account</Pressable>
      </div>

      <SignInForm {...s} />
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 13 }}>
        <OrDivider />
        <AppleButton onClick={s.onAuthed} />
        <FaceIDButton onClick={s.onAuthed} />
      </div>
      <div style={{ height: 24 }} />
    </div>
  );
}

function SignIn({ variant, onAuthed, onSignup, onForgot }) {
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const tagline = 'Track symptoms, flares & medications for everyone in your family.';
  const s = { email, setEmail, pass, setPass, onAuthed, onSignup, onForgot, tagline };
  if (variant === 'panel') return <SignInPanel s={s} />;
  if (variant === 'hero') return <SignInHero s={s} />;
  return <SignInCentered s={s} />;
}

// ── Top bar with back button (sign-up / reset) ──────────────
function AuthTopBar({ onBack }) {
  return (
    <div style={{ paddingTop: 56, padding: '56px 18px 0' }}>
      <Pressable onClick={onBack} style={{ width: 42, height: 42, borderRadius: '50%', background: '#fff', border: `1px solid ${TAU.lavender}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="chevL" size={22} color={TAU.anchor} sw={2.2} />
      </Pressable>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SIGN-UP
// ════════════════════════════════════════════════════════════
function SignUp({ onAuthed, onBack }) {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [pass, setPass] = React.useState('');
  const [agree, setAgree] = React.useState(false);
  const ready = name && email && pass.length >= 6 && agree;
  return (
    <div style={{ minHeight: '100%', background: TAU.canvas, display: 'flex', flexDirection: 'column' }}>
      <AuthTopBar onBack={onBack} />
      <div style={{ padding: '14px 24px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <LogoMark size={52} />
        <div style={{ fontSize: 27, fontWeight: 800, color: TAU.anchor, letterSpacing: -0.6, marginTop: 16 }}>Create your account</div>
        <div style={{ fontSize: 14.5, color: TAU.grey, marginTop: 6, lineHeight: 1.45 }}>One account for the whole family. Add each person once you’re in.</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
          <AuthField icon="profile" label="Your name" placeholder="e.g. Alex" value={name} onChange={setName} />
          <AuthField icon="mail" label="Email" type="email" placeholder="you@email.com" value={email} onChange={setEmail} />
          <AuthField icon="lock" label="Password" placeholder="At least 6 characters" value={pass} onChange={setPass} secure />

          <Pressable as="div" onClick={() => setAgree((a) => !a)} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '2px 2px' }}>
            <div style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 1, background: agree ? 'var(--accent, #FEAE2E)' : '#fff', border: `1.5px solid ${agree ? 'var(--accent, #FEAE2E)' : TAU.lavender}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {agree && <Icon name="check" size={14} color={TAU.anchor} sw={2.6} />}
            </div>
            <div style={{ fontSize: 13, color: TAU.balance, lineHeight: 1.45 }}>I agree to the <span style={{ color: TAU.anchor, fontWeight: 700 }}>Terms</span> and <span style={{ color: TAU.anchor, fontWeight: 700 }}>Privacy Policy</span>. Health data stays on your device.</div>
          </Pressable>

          <Button onClick={onAuthed} disabled={!ready}>Create account</Button>
          <OrDivider />
          <AppleButton onClick={onAuthed} />
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'center', fontSize: 14.5, color: TAU.grey, padding: '16px 0 22px' }}>
          Already have an account? <LinkText onClick={onBack}>Sign in</LinkText>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FORGOT PASSWORD
// ════════════════════════════════════════════════════════════
function Forgot({ onBack }) {
  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  return (
    <div style={{ minHeight: '100%', background: TAU.canvas, display: 'flex', flexDirection: 'column' }}>
      <AuthTopBar onBack={onBack} />
      <div style={{ padding: '14px 24px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!sent ? (
          <>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: WARM.peach, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="lock" size={26} color={TAU.balance} sw={1.9} />
            </div>
            <div style={{ fontSize: 27, fontWeight: 800, color: TAU.anchor, letterSpacing: -0.6, marginTop: 16 }}>Reset password</div>
            <div style={{ fontSize: 14.5, color: TAU.grey, marginTop: 6, lineHeight: 1.45 }}>Enter the email for your account and we’ll send a reset link.</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 22 }}>
              <AuthField icon="mail" label="Email" type="email" placeholder="you@email.com" value={email} onChange={setEmail} autoFocus />
              <Button onClick={() => setSent(true)} disabled={!email}>Send reset link</Button>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', marginTop: 40, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: '#E6F4EA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={36} color="#1F8A4C" sw={2.4} />
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: TAU.anchor, letterSpacing: -0.5, marginTop: 18 }}>Check your inbox</div>
            <div style={{ fontSize: 15, color: TAU.grey, marginTop: 8, lineHeight: 1.5, maxWidth: 280 }}>We sent a reset link to <span style={{ color: TAU.anchor, fontWeight: 700 }}>{email}</span>. It may take a minute to arrive.</div>
            <div style={{ height: 26 }} />
            <Button variant="secondary" onClick={onBack}>Back to sign in</Button>
          </div>
        )}
        <div style={{ flex: 1 }} />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FLOW ORCHESTRATOR
// ════════════════════════════════════════════════════════════
function AuthFlow({ screen, setScreen, variant, accent, onAuthed }) {
  return (
    <div style={{ height: '100%', overflow: 'auto', fontFamily: "'Sora','Roboto',system-ui,sans-serif", '--accent': accent || '#FEAE2E' }}>
      {screen === 'signup'
        ? <SignUp onAuthed={onAuthed} onBack={() => setScreen('signin')} />
        : screen === 'forgot'
          ? <Forgot onBack={() => setScreen('signin')} />
          : <SignIn variant={variant} onAuthed={onAuthed} onSignup={() => setScreen('signup')} onForgot={() => setScreen('forgot')} />}
    </div>
  );
}

Object.assign(window, { AuthFlow, LogoMark, LogoFull, Wordmark });
