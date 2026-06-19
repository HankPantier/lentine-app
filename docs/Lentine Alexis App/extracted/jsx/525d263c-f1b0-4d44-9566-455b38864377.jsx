// RecipeCard.jsx — image + title w/ inversion-motif on hover
function RecipeCard({ title, meta, tone = "a", onClick }) {
  const tones = {
    a: "linear-gradient(135deg,#d9b892,#8c5a2f)",
    b: "linear-gradient(135deg,#b8c5a0,#4a5d2c)",
    c: "linear-gradient(135deg,#d6a985,#7c4a2a)",
    d: "linear-gradient(135deg,#a8b5b4,#3e4f50)",
    e: "linear-gradient(135deg,#c9b8a0,#6b5235)",
    f: "linear-gradient(135deg,#e0c388,#9b7030)",
  };
  const [hover, setHover] = React.useState(false);
  return (
    <a href="#"
       onClick={(e) => { e.preventDefault(); onClick && onClick(); }}
       onMouseEnter={() => setHover(true)}
       onMouseLeave={() => setHover(false)}
       style={{
         position: "relative", display: "block", aspectRatio: "4/5", overflow: "hidden",
         textDecoration: "none", cursor: "pointer",
       }}>
      <div style={{ position: "absolute", inset: 0, background: tones[tone] }} />
      <div style={{
        position: "absolute", inset: 0,
        background: hover ? "rgba(244,240,236,0.88)" : "rgba(0,0,51,0.45)",
        transition: "background 333ms ease-in-out",
      }} />
      <div style={{ position: "relative", padding: "18px 20px", height: "100%", display: "flex", flexDirection: "column", color: hover ? "var(--color-blue)" : "#fff", transition: "color 333ms ease-in-out" }}>
        {meta && <Eyebrow light={!hover} style={{ color: hover ? "var(--color-blue)" : "rgba(255,255,255,0.92)" }}>{meta}</Eyebrow>}
        <h3 style={{
          marginTop: "auto", marginBottom: 0, fontWeight: 400,
          fontSize: "clamp(1.35rem, 1.8vw, 1.9rem)", lineHeight: 1.2,
        }}>{title}</h3>
      </div>
    </a>
  );
}
window.RecipeCard = RecipeCard;
