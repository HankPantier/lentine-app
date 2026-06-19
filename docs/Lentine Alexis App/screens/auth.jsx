// SignUpScreen — email + password. Taupe screen.
function SignUpScreen({ state, setState, onContinue, onSwitchToLogin, step, totalSteps, onBack }) {
  const valid = state.email && state.email.includes("@") && state.password && state.password.length >= 6;
  return (
    <Screen>
      <OnbTopBar onBack={onBack} current={step} total={totalSteps} />
      <div style={{ marginTop: "1.5rem" }}>
        <Eyebrow>Create your account</Eyebrow>
        <h1 style={{
          fontSize: "2.4rem", lineHeight: 1.05, fontWeight: 400,
          margin: "1rem 0 0.5rem", letterSpacing: "-0.01em",
        }}>
          Let's begin <em>together.</em>
        </h1>
        <p style={{ fontSize: "0.92rem", lineHeight: 1.65, color: "var(--fg-2)", maxWidth: "30ch", marginTop: "0.75rem" }}>
          A members-only space for recipes, rituals, and the frameworks I use daily.
        </p>
      </div>

      <div style={{ marginTop: "2.25rem" }}>
        <Field
          label="Email"
          type="email"
          value={state.email}
          onChange={v => setState({ ...state, email: v })}
          placeholder="you@example.com"
          autoFocus
        />
        <Field
          label="Password"
          type="password"
          value={state.password}
          onChange={v => setState({ ...state, password: v })}
          placeholder="At least 6 characters"
          hint="Must be at least 6 characters"
        />
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ marginTop: "1.5rem" }}>
        <Button variant="default" fullWidth size="lg" onClick={onContinue} disabled={!valid}>
          Continue
        </Button>
        <p style={{ fontSize: "0.7rem", color: "var(--fg-3)", lineHeight: 1.5, marginTop: "1rem", textAlign: "center" }}>
          By continuing you agree to our <em>Terms</em> and <em>Privacy Policy.</em>
        </p>
        <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
          <button onClick={onSwitchToLogin} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--fg-2)", fontSize: "0.82rem", fontStyle: "italic",
            fontFamily: "inherit",
          }}>
            Already a member? <span style={{ color: "var(--color-blue-bright)", textDecoration: "underline", textUnderlineOffset: 3 }}>Sign in</span>
          </button>
        </div>
      </div>
    </Screen>
  );
}

// LoginScreen — for migrating users. Lives in a subtly different flow.
function LoginScreen({ state, setState, onContinue, onForgot, onSwitchToSignup, onBack }) {
  const valid = state.email && state.password;
  return (
    <Screen>
      <OnbTopBar onBack={onBack} />
      <div style={{ marginTop: "1.5rem" }}>
        <Eyebrow>Welcome back</Eyebrow>
        <h1 style={{
          fontSize: "2.4rem", lineHeight: 1.05, fontWeight: 400,
          margin: "1rem 0 0.5rem", letterSpacing: "-0.01em",
        }}>
          Nice to see you <em>again.</em>
        </h1>
        <p style={{ fontSize: "0.92rem", lineHeight: 1.65, color: "var(--fg-2)", maxWidth: "34ch", marginTop: "0.75rem" }}>
          We've rebuilt the member space — you'll set a new password for this device on your first sign-in.
        </p>
      </div>

      <div style={{ marginTop: "2.25rem" }}>
        <Field label="Email" type="email" value={state.email} onChange={v => setState({ ...state, email: v })} placeholder="you@example.com" autoFocus />
        <Field label="Password" type="password" value={state.password} onChange={v => setState({ ...state, password: v })} placeholder="••••••••" />
      </div>

      <button onClick={onForgot} style={{
        background: "transparent", border: "none", cursor: "pointer",
        color: "var(--color-blue-bright)", fontSize: "0.78rem", fontStyle: "italic",
        fontFamily: "inherit", padding: 0, marginTop: "0.25rem",
        alignSelf: "flex-start",
      }}>Forgot your password?</button>

      <div style={{ flex: 1 }} />

      <div style={{ marginTop: "1.5rem" }}>
        <Button variant="default" fullWidth size="lg" onClick={onContinue} disabled={!valid}>
          Sign in
        </Button>
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button onClick={onSwitchToSignup} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "var(--fg-2)", fontSize: "0.82rem", fontStyle: "italic",
            fontFamily: "inherit",
          }}>
            New here? <span style={{ color: "var(--color-blue-bright)", textDecoration: "underline", textUnderlineOffset: 3 }}>Create an account</span>
          </button>
        </div>
      </div>
    </Screen>
  );
}

// ResetPasswordScreen — post-migration branch
function ResetPasswordScreen({ state, setState, onContinue, onBack }) {
  const [sent, setSent] = React.useState(false);
  return (
    <Screen>
      <OnbTopBar onBack={onBack} />
      <div style={{ marginTop: "1.5rem" }}>
        <Eyebrow>Reset password</Eyebrow>
        <h1 style={{ fontSize: "2.2rem", lineHeight: 1.05, fontWeight: 400, margin: "1rem 0 0.5rem", letterSpacing: "-0.01em" }}>
          {sent ? <React.Fragment>Check your <em>email.</em></React.Fragment> : <React.Fragment>Let's get you <em>back in.</em></React.Fragment>}
        </h1>
        <p style={{ fontSize: "0.92rem", lineHeight: 1.65, color: "var(--fg-2)", maxWidth: "32ch", marginTop: "0.75rem" }}>
          {sent
            ? <React.Fragment>A reset link is on its way to <em>{state.email || "your inbox"}.</em> It'll take you straight back here once you've set a new password.</React.Fragment>
            : <React.Fragment>Enter the email you've always used — we'll send a link to set a fresh password for the new app.</React.Fragment>}
        </p>
      </div>

      {!sent && (
        <div style={{ marginTop: "2.25rem" }}>
          <Field label="Email" type="email" value={state.email} onChange={v => setState({ ...state, email: v })} placeholder="you@example.com" autoFocus />
        </div>
      )}

      {sent && (
        <div style={{
          marginTop: "2rem", padding: "1.25rem", background: "#fff",
          border: "1px solid var(--color-gray)",
          display: "flex", alignItems: "flex-start", gap: "0.9rem",
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "var(--color-blue-light)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l3 3 7-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "0.88rem", fontStyle: "italic", marginBottom: "0.25rem" }}>Sent to {state.email || "your inbox"}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--fg-2)" }}>Didn't arrive? Check spam, or request another.</div>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ marginTop: "1.5rem" }}>
        {!sent ? (
          <Button variant="default" fullWidth size="lg" onClick={() => setSent(true)} disabled={!state.email || !state.email.includes("@")}>
            Send reset link
          </Button>
        ) : (
          <Button variant="default" fullWidth size="lg" onClick={onContinue}>
            I've set a new password
          </Button>
        )}
      </div>
    </Screen>
  );
}

Object.assign(window, { SignUpScreen, LoginScreen, ResetPasswordScreen });
