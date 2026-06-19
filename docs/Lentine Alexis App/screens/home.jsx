// HomeTeaserScreen — the landing state after onboarding.
// Shows personalized greeting + dosha-aware recipe + B2F teaser.
function HomeTeaserScreen({ state, onRestart }) {
  const d = (window.DOSHAS || {})[state.dosha] || (window.DOSHAS || {}).vata;
  const first = state.firstName || "friend";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  // Dosha-aware daily ritual
  const ritual = {
    vata: { title: "Warm sesame oil self-massage", meta: "5 min · grounding" },
    pitta: { title: "Cool mint lassi + quiet walk", meta: "15 min · cooling" },
    kapha: { title: "Ginger tea + 20 squats", meta: "10 min · invigorating" },
  }[state.dosha || "vata"];

  const recipe = {
    vata: { title: "Warm cardamom oats with stewed pears", meta: "Breakfast · Grounding" },
    pitta: { title: "Fennel + cucumber cooling soup", meta: "Lunch · Cooling" },
    kapha: { title: "Spiced lentil & ginger dal", meta: "Lunch · Light + warming" },
  }[state.dosha || "vata"];

  return (
    <Screen padding="0">
      {/* Top hero band */}
      <div style={{ background: "var(--color-blue)", color: "#fff", padding: "2rem 1.5rem 1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <img
            src="assets/lentine-wordmark-white.webp"
            alt="Lentine Alexis"
            style={{ height: 38, width: "auto", display: "block" }}
          />
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: d.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.78rem", color: "var(--color-blue)", fontStyle: "italic" }}>
            {first[0].toUpperCase()}
          </div>
        </div>
        <Eyebrow light style={{ color: d.color }}>{greeting}, {first}</Eyebrow>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 400, lineHeight: 1.2, margin: "0.85rem 0 0.25rem", letterSpacing: "-0.01em" }}>
          Your <em>{d.name}</em> day begins.
        </h1>
        <p style={{ fontSize: "0.84rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.6, marginTop: "0.5rem", marginBottom: 0 }}>
          A small practice, a nourishing meal, and a moment to listen.
        </p>
      </div>

      {/* Today's ritual */}
      <div style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--color-blue)", paddingBottom: "0.5rem" }}>
          <Eyebrow>Today's ritual</Eyebrow>
          <span style={{ fontSize: "0.72rem", color: "var(--fg-3)", fontStyle: "italic" }}>{ritual.meta}</span>
        </div>
        <div style={{ marginTop: "0.85rem", padding: "1rem", background: "#fff", border: "1px solid rgba(0,0,51,0.08)", display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div style={{ width: 44, height: 44, background: d.color, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="3.5" stroke="#fff" strokeWidth="1.5"/><path d="M9 1v2M9 15v2M1 9h2M15 9h2M3 3l1.4 1.4M13.6 13.6L15 15M3 15l1.4-1.4M13.6 4.4L15 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "0.95rem", fontStyle: "italic", lineHeight: 1.3 }}>{ritual.title}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--color-blue)", marginTop: "0.25rem", fontStyle: "italic" }}>Begin →</div>
          </div>
        </div>

        {/* Recipe of the day */}
        <div style={{ marginTop: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px solid var(--color-blue)", paddingBottom: "0.5rem" }}>
          <Eyebrow>Made for your {d.name}</Eyebrow>
          <span style={{ fontSize: "0.72rem", color: "var(--color-blue)", fontStyle: "italic" }}>All recipes →</span>
        </div>
        <div style={{ marginTop: "0.85rem" }}>
          <div style={{
            aspectRatio: "4/5",
            backgroundImage: "url('assets/recipe-hero.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            marginBottom: "0.6rem",
          }} />
          <div style={{ fontSize: "0.65rem", letterSpacing: "0.1rem", textTransform: "uppercase", color: "var(--fg-3)", fontStyle: "italic", marginBottom: "0.3rem" }}>{recipe.meta}</div>
          <div style={{ fontSize: "1.1rem", lineHeight: 1.3, letterSpacing: "-0.01em" }}>{recipe.title}</div>
        </div>

        {/* B2F teaser (if tier is back_to_forward) or upsell */}
        <div style={{ marginTop: "1.75rem", padding: "1.1rem 1.15rem", background: "var(--color-blue)", color: "#fff" }}>
          <Eyebrow light style={{ color: "var(--color-blue-light)" }}>
            {state.tier === "back_to_forward" ? "This month" : "Coming up in Back to Forward"}
          </Eyebrow>
          <div style={{ fontSize: "1.1rem", fontStyle: "italic", marginTop: "0.5rem", lineHeight: 1.3 }}>
            The quiet art of doing less, beautifully.
          </div>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.65)", marginTop: "0.35rem", lineHeight: 1.5 }}>
            A full-moon audio teaching + ritual. Drops Thursday.
          </div>
        </div>

        {/* Dev: restart link */}
        <button onClick={onRestart} style={{
          background: "transparent", border: "none", color: "var(--fg-3)",
          fontSize: "0.72rem", fontStyle: "italic", fontFamily: "inherit",
          cursor: "pointer", marginTop: "1.5rem", padding: "0.5rem 0",
          textAlign: "center", width: "100%",
        }}>
          ↻ Restart onboarding (demo)
        </button>
      </div>
    </Screen>
  );
}

window.HomeTeaserScreen = HomeTeaserScreen;
