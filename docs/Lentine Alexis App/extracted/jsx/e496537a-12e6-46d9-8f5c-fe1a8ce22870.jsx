// Hero.jsx — full-bleed image hero with navy overlay + oversized h1
function Hero({ eyebrow, title, body, primary, secondary, variant = "a" }) {
  // Placeholder "image" — taupe or navy gradient block, per DS rule
  const bgs = {
    a: "linear-gradient(135deg,#c2a982 0%,#8b6f4a 60%,#5b3f26 100%)",
    b: "linear-gradient(135deg,#6b7b7a 0%,#3e4f50 60%,#1f2a2d 100%)",
    c: "linear-gradient(135deg,#d9bd94 0%,#a98058 60%,#725033 100%)",
  };
  return (
    <section style={{ position: "relative", minHeight: "32rem", display: "flex", alignItems: "center", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: bgs[variant] }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,51,0.35) 0%, rgba(0,0,51,0.65) 100%)" }} />
      <div style={{ position: "relative", maxWidth: "80rem", width: "100%", margin: "0 auto", padding: "5rem 3%", color: "#fff" }}>
        {eyebrow && <Eyebrow light style={{ marginBottom: "1.25rem" }}>{eyebrow}</Eyebrow>}
        <h1 style={{
          fontSize: "clamp(3rem, 6vw + 1rem, 7rem)",
          lineHeight: 1,
          margin: "0 0 1.5rem",
          fontWeight: 400,
          maxWidth: "18ch",
        }}>{title}</h1>
        {body && (
          <p style={{ fontSize: "1.1rem", lineHeight: 1.8, maxWidth: "48ch", color: "rgba(255,255,255,0.92)", marginBottom: "2rem" }}>
            {body}
          </p>
        )}
        <div>
          {primary && <Button variant="important">{primary}</Button>}
          {secondary && <Button variant="ghostLight">{secondary}</Button>}
        </div>
      </div>
    </section>
  );
}
window.Hero = Hero;
