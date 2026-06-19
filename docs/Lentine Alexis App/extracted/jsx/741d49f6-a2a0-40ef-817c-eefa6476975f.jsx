// SectionSplit.jsx — text / image split section
function SectionSplit({ eyebrow, title, body, cta, secondary, reverse = false, tone = "taupe", imageTone = "a" }) {
  const imgBgs = {
    a: "linear-gradient(135deg,#d9c9a8,#8b6f4a)",
    b: "linear-gradient(135deg,#a8917d,#3e3024)",
    c: "linear-gradient(135deg,#c4a77a,#6b4f2d)",
    d: "linear-gradient(135deg,#8a9996,#2c3e3f)",
  };
  return (
    <section style={{
      background: tone === "navy" ? "var(--color-blue)" : "var(--site-background-color)",
      color: tone === "navy" ? "#fff" : "var(--site-text-color)",
      padding: "5rem 3%",
    }}>
      <div style={{
        maxWidth: "80rem", margin: "0 auto",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "center",
        direction: reverse ? "rtl" : "ltr",
      }}>
        <div style={{ direction: "ltr" }}>
          {eyebrow && <Eyebrow light={tone === "navy"} style={{ marginBottom: "1.25rem" }}>{eyebrow}</Eyebrow>}
          <h2 style={{
            fontSize: "clamp(2rem, 2.4vw + 1rem, 2.7rem)",
            lineHeight: 1.15, margin: "0 0 1.25rem", fontWeight: 400, maxWidth: "14ch",
          }}>{title}</h2>
          <p style={{
            fontSize: "1rem", lineHeight: 1.8, marginBottom: "2rem",
            color: tone === "navy" ? "rgba(255,255,255,0.85)" : "var(--fg-2)", maxWidth: "44ch",
          }}>{body}</p>
          {cta && <Button variant={tone === "navy" ? "ghostLight" : "default"}>{cta}</Button>}
          {secondary && <Button variant="outline">{secondary}</Button>}
        </div>
        <div style={{ direction: "ltr", aspectRatio: "4 / 3", background: imgBgs[imageTone], position: "relative" }}>
          <Eyebrow light style={{ position: "absolute", top: 16, left: 16 }}>image</Eyebrow>
        </div>
      </div>
    </section>
  );
}
window.SectionSplit = SectionSplit;
