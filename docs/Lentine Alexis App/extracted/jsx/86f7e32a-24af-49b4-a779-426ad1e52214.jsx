// Eyebrow.jsx — the signature small-caps label
function Eyebrow({ children, light = false, style = {}, className = "" }) {
  return (
    <span
      className={"la-eyebrow " + className}
      style={{
        fontSize: "0.7rem",
        textTransform: "uppercase",
        letterSpacing: "0.05rem",
        fontStyle: "italic",
        lineHeight: 1,
        color: light ? "rgba(255,255,255,0.9)" : "rgba(0,0,51,0.72)",
        display: "inline-block",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
window.Eyebrow = Eyebrow;
