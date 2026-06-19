// DoshaResultScreen — reveal with navy backdrop, large wordmark-style type
// dosha one of: vata, pitta, kapha
const DOSHAS = {
  vata: {
    name: "Vāta",
    element: "Air + Ether",
    color: "#3FBECC",
    summary: "Movement, creativity, quick intuition. When in balance: inspired, articulate, graceful. When out: scattered, anxious, cold.",
    prescription: [
      "Warm, grounding, oily foods",
      "A consistent daily rhythm",
      "Slower, heavier movement",
    ],
  },
  pitta: {
    name: "Pitta",
    element: "Fire + Water",
    color: "#c47a3a",
    summary: "Transformation, drive, sharp focus. When in balance: decisive, courageous, warm. When out: critical, overheated, impatient.",
    prescription: [
      "Cooling, sweet, bitter foods",
      "Protected rest in the afternoon",
      "Play — not just output",
    ],
  },
  kapha: {
    name: "Kapha",
    element: "Earth + Water",
    color: "#26A709",
    summary: "Stability, nourishment, deep love. When in balance: steady, grounded, compassionate. When out: heavy, stuck, slow.",
    prescription: [
      "Light, warm, stimulating foods",
      "Daily vigorous movement",
      "Variety and newness",
    ],
  },
};

function DoshaResultScreen({ state, onContinue, onBack }) {
  const d = DOSHAS[state.dosha] || DOSHAS.vata;
  return (
    <DarkScreen padding="0">
      <div style={{ padding: "1.5rem" }}>
        <OnbTopBar onBack={onBack} dark />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 1.5rem 1.5rem" }}>
        <div style={{ textAlign: "center", marginTop: "0.5rem" }}>
          <Eyebrow light style={{ color: d.color }}>Your primary dosha</Eyebrow>
          <h1 style={{
            fontSize: "4.2rem", fontStyle: "italic", fontWeight: 400,
            letterSpacing: "-0.03em", lineHeight: 1,
            margin: "1rem 0 0.5rem",
          }}>{d.name}</h1>
          <div style={{ fontSize: "0.8rem", letterSpacing: "0.2em", textTransform: "uppercase",
            color: "rgba(255,255,255,0.55)", marginBottom: "1.5rem" }}>
            {d.element}
          </div>
          <div style={{ width: 40, height: 1, background: d.color, margin: "0 auto" }} />
        </div>

        <p style={{
          fontSize: "1rem", lineHeight: 1.7,
          color: "rgba(255,255,255,0.9)",
          marginTop: "1.75rem", textAlign: "left",
        }}>{d.summary}</p>

        <div style={{ marginTop: "1.75rem" }}>
          <Eyebrow light style={{ color: "rgba(255,255,255,0.55)" }}>What will support you</Eyebrow>
          <div style={{ marginTop: "0.85rem" }}>
            {d.prescription.map((p, i) => (
              <div key={i} style={{
                display: "flex", gap: "0.8rem", alignItems: "flex-start",
                padding: "0.85rem 0",
                borderBottom: i < d.prescription.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
              }}>
                <div style={{
                  width: 22, height: 22, flexShrink: 0, marginTop: 2,
                  border: `1px solid ${d.color}`,
                  color: d.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.68rem", fontStyle: "italic",
                }}>{i + 1}</div>
                <div style={{ fontSize: "0.92rem", lineHeight: 1.55, color: "rgba(255,255,255,0.9)", fontStyle: "italic" }}>{p}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          marginTop: "1.75rem", padding: "1rem 1.1rem",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          fontSize: "0.78rem", lineHeight: 1.6,
          color: "rgba(255,255,255,0.6)", fontStyle: "italic",
        }}>
          This is a starting point, not a label. Your dosha shifts with season, stress, and life — we'll check in.
        </div>
      </div>

      <div style={{ padding: "1rem 1.5rem 2rem" }}>
        <Button variant="ghostLight" fullWidth size="lg" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </DarkScreen>
  );
}

window.DoshaResultScreen = DoshaResultScreen;
window.DOSHAS = DOSHAS;
