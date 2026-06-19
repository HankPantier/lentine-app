// PageMembership.jsx
function PageMembership({ onNav }) {
  const tiers = [
    {
      eb: "Weekly infusion",
      name: "Recipe Club",
      price: "$9",
      per: "/mo",
      body: "A weekly drop of balanced culinary inspiration, delivered to your inbox. Full recipe library access.",
      cta: "Join Recipe Club",
      important: false,
    },
    {
      eb: "Full immersion",
      name: "Back to Forward",
      price: "$29",
      per: "/mo",
      body: "Everything in Recipe Club, plus a consistent drip of practical, holistic magic moves to empower excellence, every day.",
      cta: "Step In",
      important: true,
    },
  ];
  return (
    <React.Fragment>
      <Hero
        variant="c"
        eyebrow="Membership"
        title="Back to Forward."
        body="Drops of ancient wisdom to inform modern life, dedicated to staying connected to what has always been true on our journey towards 'the new'."
        primary="Become a Member"
        secondary="See What's Inside"
      />

      <section style={{ maxWidth: "72rem", margin: "0 auto", padding: "5rem 3%" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <Eyebrow>Two ways in</Eyebrow>
          <h2 style={{ fontSize: "clamp(2rem, 2vw + 1rem, 2.7rem)", fontWeight: 400, margin: "1rem 0 1rem" }}>Meet yourself where you're at.</h2>
          <p style={{ maxWidth: "48ch", margin: "0 auto", color: "var(--fg-2)" }}>
            Whether you're looking for a weekly infusion of balanced culinary inspiration, or a consistent drip of practical, holistic magic moves — there's an immersive option ready for you.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {tiers.map(t => (
            <div key={t.name} style={{
              padding: "2.5rem 2rem",
              background: t.important ? "var(--color-blue)" : "var(--color-taupe)",
              border: t.important ? "1px solid var(--color-blue)" : "1px solid var(--color-gray)",
              color: t.important ? "#fff" : "var(--color-blue)",
              display: "flex", flexDirection: "column", gap: "1rem",
            }}>
              <Eyebrow light={t.important} style={{ color: t.important ? "var(--color-blue-light)" : "var(--color-blue-bright)" }}>{t.eb}</Eyebrow>
              <h3 style={{ fontSize: "2.2rem", fontWeight: 400, margin: 0, lineHeight: 1.1 }}>{t.name}</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem" }}>
                <span style={{ fontSize: "2.6rem", lineHeight: 1 }}>{t.price}</span>
                <span style={{ fontSize: "0.85rem", fontStyle: "italic", opacity: 0.7 }}>{t.per}</span>
              </div>
              <p style={{ margin: 0, lineHeight: 1.8, fontSize: "0.95rem", color: t.important ? "rgba(255,255,255,0.85)" : "var(--fg-2)" }}>{t.body}</p>
              <div style={{ marginTop: "auto" }}>
                <Button variant={t.important ? "important" : "default"}>{t.cta}</Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "4rem 3%", maxWidth: "80rem", margin: "0 auto", borderTop: "1px solid var(--color-gray)" }}>
        <Eyebrow>What members say</Eyebrow>
        <blockquote style={{ margin: "1.5rem 0 0", fontSize: "clamp(1.5rem, 2vw + 0.5rem, 2.2rem)", lineHeight: 1.35, fontStyle: "italic", maxWidth: "40ch" }}>
          "The recipes are one thing — the <em>way of seeing</em> is what changed everything."
        </blockquote>
        <p style={{ marginTop: "1.5rem", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05rem", fontStyle: "italic", color: "var(--fg-2)" }}>
          — Sara K., Member since 2022
        </p>
      </section>
    </React.Fragment>
  );
}
window.PageMembership = PageMembership;
