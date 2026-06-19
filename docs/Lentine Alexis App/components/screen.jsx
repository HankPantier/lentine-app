// Screen wrapper — handles the full-bleed taupe canvas with consistent padding
// Every screen gets 24px horizontal padding + consistent vertical rhythm.
function Screen({ children, background = "var(--color-taupe)", padding = "1.5rem", style = {}, scrollable = true }) {
  return (
    <div
      data-screen-root
      style={{
        height: "100%",
        background,
        display: "flex",
        flexDirection: "column",
        padding,
        boxSizing: "border-box",
        overflowY: scrollable ? "auto" : "hidden",
        color: "var(--color-blue)",
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >{children}</div>
  );
}

// Navy screen variant
function DarkScreen(props) {
  return <Screen {...props} background="var(--color-blue)" style={{ color: "#fff", ...(props.style || {}) }} />;
}

// Top bar for onboarding screens: back button + progress dots
function OnbTopBar({ onBack, current, total, dark = false, onSkip }) {
  const c = dark ? "#fff" : "var(--color-blue)";
  const sub = dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,51,0.5)";
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem", minHeight: 24 }}>
      {onBack ? (
        <button onClick={onBack} style={{
          background: "transparent", border: "none", cursor: "pointer",
          color: c, padding: 0, display: "flex", alignItems: "center", gap: 4,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      ) : <div style={{ width: 16 }} />}
      {total ? <ProgressDots current={current} total={total} dark={dark} /> : <div />}
      {onSkip ? (
        <button onClick={onSkip} style={{
          background: "transparent", border: "none", cursor: "pointer",
          color: sub, fontSize: "0.72rem", fontStyle: "italic",
          textTransform: "uppercase", letterSpacing: "0.05rem", fontFamily: "inherit",
        }}>Skip</button>
      ) : <div style={{ width: 30 }} />}
    </div>
  );
}

Object.assign(window, { Screen, DarkScreen, OnbTopBar });
