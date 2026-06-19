// SplashScreen — the first view. Navy field with wordmark centered.
// Tapping anywhere (or the CTA) advances.
function SplashScreen({ onContinue, onLogin }) {
  return (
    <DarkScreen padding="0" style={{ justifyContent: "space-between" }}>
      {/* Top spacer with eyebrow */}
      <div style={{ padding: "4rem 1.5rem 0", textAlign: "center" }}>
        <Eyebrow light style={{ color: "var(--color-blue-light)" }}>Welcome</Eyebrow>
      </div>

      {/* Centered wordmark */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 1.5rem" }}>
        <Wordmark size={1.8} />
        <div style={{ width: 60, height: 1, background: "var(--color-blue-light)", margin: "2rem 0" }} />
        <p style={{
          textAlign: "center", fontSize: "1.05rem", lineHeight: 1.55,
          maxWidth: "22ch", color: "rgba(255,255,255,0.85)", margin: 0,
          fontStyle: "italic",
        }}>
          Balanced, purposeful <em>+ joyful.</em>
        </p>
        <p style={{
          textAlign: "center", fontSize: "0.88rem", lineHeight: 1.7,
          maxWidth: "28ch", color: "rgba(255,255,255,0.6)", marginTop: "1.25rem",
        }}>
          Ancient wisdom for modern life — recipes, rituals, and Ayurvedic guidance.
        </p>
      </div>

      {/* Bottom CTAs */}
      <div style={{ padding: "0 1.5rem 2.5rem" }}>
        <Button variant="ghostLight" size="lg" fullWidth onClick={onContinue}>Begin your journey</Button>
        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button onClick={onLogin} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.85)", fontFamily: "inherit",
            fontSize: "0.82rem", fontStyle: "italic",
          }}>
            Already a member? <span style={{ color: "var(--color-blue-light)", textDecoration: "underline", textUnderlineOffset: 3 }}>Sign in</span>
          </button>
        </div>
      </div>
    </DarkScreen>
  );
}

window.SplashScreen = SplashScreen;
