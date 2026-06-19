// PageAyurveda.jsx
function PageAyurveda({ onNav }) {
  const services = [
    { eb: "1:1", title: "Ayurvedic Consultations", body: "Individual sessions to map your dosha + build a practical, personalised plan." },
    { eb: "Courses", title: "Courses + Resets", body: "Seasonal programs to recalibrate digestion, sleep and energy from the root up." },
    { eb: "Quiz", title: "Dosha Quiz", body: "A ten-minute starting point — understand your constitution before you book." },
    { eb: "Stories", title: "Testimonials", body: "Read what long-time clients say about the work and the shifts that followed." },
  ];
  return (
    <React.Fragment>
      <Hero
        variant="b"
        eyebrow="Ayurvedic medicine"
        title="Peak vitality is in your nature."
        body="Empowering frameworks + ancient wisdom for high-achieving humans who want to feel as good as they perform."
        primary="Book a Consultation"
        secondary="Take the Dosha Quiz"
      />

      <section style={{ maxWidth: "80rem", margin: "0 auto", padding: "5rem 3%" }}>
        <Eyebrow>What I offer</Eyebrow>
        <h2 style={{ margin: "1rem 0 3rem", fontSize: "clamp(2rem, 2vw + 1rem, 2.7rem)", fontWeight: 400, borderBottom: "1px solid var(--color-blue)", paddingBottom: "0.75rem" }}>
          Whole-body coaching, rooted in tradition.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "2rem 3rem" }}>
          {services.map(s => (
            <div key={s.title} style={{ paddingBottom: "1.5rem", borderBottom: "1px solid var(--color-gray)" }}>
              <Eyebrow style={{ color: "var(--color-blue-bright)", marginBottom: "0.5rem" }}>{s.eb}</Eyebrow>
              <h3 style={{ fontSize: "1.6rem", fontWeight: 400, margin: "0 0 0.5rem" }}>{s.title}</h3>
              <p style={{ margin: "0 0 1rem", color: "var(--fg-2)", fontSize: "0.95rem", lineHeight: 1.8 }}>{s.body}</p>
              <a href="#" style={{ fontSize: "0.85rem", color: "var(--color-blue-bright)" }}>Learn more →</a>
            </div>
          ))}
        </div>
      </section>

      <SectionSplit
        eyebrow="How it works"
        title="A path that meets you where you're at."
        body="Every client starts with a consultation. From there, we pick the shape of the work — weekly coaching, a seasonal reset, or a longer arc that moves with your life. No rigid programs; real alignment."
        cta="Book a Consultation"
        reverse
        imageTone="a"
      />
    </React.Fragment>
  );
}
window.PageAyurveda = PageAyurveda;
