// DS primitives — Lentine Alexis
// Eyebrow: the signature tiny tracked italic label
function Eyebrow({ children, light = false, style = {} }) {
  return (
    <span className="la-eyebrow" style={{
      color: light ? "rgba(255,255,255,0.9)" : "rgba(0,0,51,0.72)",
      ...style,
    }}>{children}</span>
  );
}

// Button: italic uppercase, variants: default / outline / important / ghostLight / ghostDark
function Button({ variant = "default", children, onClick, style = {}, fullWidth = false, disabled = false, size = "md" }) {
  const sizes = {
    sm: { padding: "0.55rem 0.95rem 0.5rem", fontSize: "0.72rem" },
    md: { padding: "0.85rem 1.35rem 0.75rem", fontSize: "0.8rem" },
    lg: { padding: "1.1rem 1.5rem 1rem", fontSize: "0.85rem" },
  };
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "inherit",
    fontStyle: "italic",
    fontWeight: 400,
    letterSpacing: "0.04rem",
    textTransform: "uppercase",
    borderRadius: "0.3rem",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 333ms cubic-bezier(0.4,0,0.2,1)",
    border: "2px solid",
    lineHeight: 1.1,
    width: fullWidth ? "100%" : undefined,
    opacity: disabled ? 0.5 : 1,
    ...sizes[size],
  };
  const variants = {
    default:   { background: "var(--color-blue)", borderColor: "var(--color-blue)", color: "#fff" },
    outline:   { background: "transparent", borderColor: "var(--color-blue)", color: "var(--color-blue)" },
    important: { background: "var(--color-orange)", borderColor: "var(--color-orange)", color: "#fff" },
    ghostLight:{ background: "transparent", borderColor: "rgba(255,255,255,0.8)", color: "#fff" },
    ghostDark: { background: "transparent", borderColor: "rgba(0,0,51,0.2)", color: "var(--color-blue)" },
    plain:     { background: "transparent", borderColor: "transparent", color: "var(--color-blue)" },
  };
  const [h, setH] = React.useState(false);
  const hoverMap = {
    default:   { background: "transparent", borderColor: "var(--color-blue)", color: "var(--color-blue)" },
    outline:   { background: "var(--color-blue)", borderColor: "var(--color-blue)", color: "#fff" },
    important: { background: "#e88700", borderColor: "#e88700", color: "#fff" },
    ghostLight:{ background: "rgba(255,255,255,0.1)" },
    ghostDark: { borderColor: "var(--color-blue)" },
    plain:     { color: "var(--color-blue-bright)" },
  };
  const s = { ...base, ...variants[variant], ...(h && !disabled ? hoverMap[variant] : {}) };
  return (
    <button onClick={disabled ? undefined : onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)} style={{ ...s, ...style }}>{children}</button>
  );
}

// Wordmark — official Lentine Alexis script logo (white on dark)
function Wordmark({ color = "#fff", size = 1 }) {
  // color is kept for API compat but the logo asset is fixed white.
  return (
    <img
      src="assets/lentine-wordmark-white.webp"
      alt="Lentine Alexis"
      style={{
        width: `${12 * size}rem`,
        maxWidth: "90%",
        height: "auto",
        display: "block",
        userSelect: "none",
      }}
    />
  );
}

// Text input styled to DS — sharp corners, navy focus ring, italic label
function Field({ label, type = "text", value, onChange, placeholder, dark = false, error, hint, autoFocus }) {
  const [focus, setFocus] = React.useState(false);
  const textC = dark ? "#fff" : "var(--color-blue)";
  const subtleC = dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,51,0.55)";
  const borderC = error ? "var(--color-red)" : focus ? (dark ? "var(--color-blue-light)" : "var(--color-blue)") : (dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,51,0.18)");
  return (
    <label style={{ display: "block", marginBottom: "0.8rem" }}>
      <div className="la-eyebrow" style={{
        fontSize: "0.62rem", letterSpacing: "0.08rem", fontStyle: "italic",
        textTransform: "uppercase", color: subtleC, marginBottom: "0.4rem",
      }}>{label}</div>
      <input
        type={type}
        value={value || ""}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          borderBottom: `1px solid ${borderC}`,
          padding: "0.45rem 0 0.55rem",
          fontSize: "1rem",
          fontFamily: "inherit",
          color: textC,
          outline: "none",
          transition: "border-color 333ms",
        }}
      />
      {hint && !error && <div style={{ fontSize: "0.72rem", fontStyle: "italic", color: subtleC, marginTop: "0.35rem" }}>{hint}</div>}
      {error && <div style={{ fontSize: "0.72rem", fontStyle: "italic", color: "var(--color-red)", marginTop: "0.35rem" }}>{error}</div>}
    </label>
  );
}

// Rule — the hairline divider the DS loves
function Rule({ color, style = {} }) {
  return <div style={{ height: 1, background: color || "rgba(0,0,51,0.12)", ...style }} />;
}

// ProgressDots — horizontal step indicator
function ProgressDots({ current, total, dark = false }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 6,
          height: 2,
          background: i <= current
            ? (dark ? "rgba(255,255,255,0.9)" : "var(--color-blue)")
            : (dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,51,0.18)"),
          transition: "all 333ms cubic-bezier(0.4,0,0.2,1)",
        }} />
      ))}
    </div>
  );
}

Object.assign(window, { Eyebrow, Button, Wordmark, Field, Rule, ProgressDots });
