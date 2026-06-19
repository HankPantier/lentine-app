// PageHome.jsx
function PageHome({ onNav }) {
  return (
    <React.Fragment>
      <Hero
        eyebrow="Hello!"
        title={<React.Fragment>Balanced, purposeful <em>+ joyful</em>.</React.Fragment>}
        body="I'm Lentine Alexis — an (un)traditional Ayurvedic practitioner, holistic + classically trained chef, athlete + mother. My mission is to empower you to enjoy a hi-fi life with flavorful food + adventure at the center."
        primary="Become a Member"
        secondary="Explore Ayurveda"
      />

      <SectionSplit
        eyebrow="Back to Forward"
        title="Become a Member"
        body="My membership space, delivering drops of ancient wisdom to inform modern life — dedicated to staying connected to what has always been true on our journey towards 'the new'."
        cta="Become a Member"
        secondary="See What's Inside"
        imageTone="b"
      />

      <section style={{ padding: "5rem 3%", maxWidth: "80rem", margin: "0 auto" }}>
        <Eyebrow style={{ marginBottom: "1rem" }}>Recipe Library</Eyebrow>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "2rem", marginBottom: "2.5rem", borderBottom: "1px solid var(--color-blue)", paddingBottom: "0.75rem" }}>
          <h2 style={{ margin: 0, fontSize: "clamp(2rem, 2vw + 1rem, 2.7rem)", fontWeight: 400, lineHeight: 1.1 }}>Recipes, Redefined</h2>
          <a href="#" onClick={(e) => { e.preventDefault(); onNav("recipes"); }} style={{ fontSize: "0.85rem", color: "var(--color-blue-bright)" }}>Recipes! Recipes! →</a>
        </div>
        <p style={{ maxWidth: "56ch", marginBottom: "3rem" }}>
          A recipe is just a "recipe" unless it's designed to <em>fuel good, feel good and create joy.</em> The library contains hundreds of recipes designed to power your best self, from the root up.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }}>
          <RecipeCard tone="a" meta="Soups · Spring" title="Carrot + Ginger + Orange Soup" />
          <RecipeCard tone="b" meta="Sweets" title="Date-Sweetened Carrot Quick Cake" />
          <RecipeCard tone="c" meta="Magic Tricks" title="Magic Trick Ginger Tea" />
        </div>
      </section>

      <SectionSplit
        eyebrow="Ayurvedic medicine"
        title="Peak vitality is in your nature"
        body="I help empower high-achieving humans with holistic wisdom + empowering frameworks to make their dreams happen. I offer individual consultations and coaching sessions, courses + workshops and more."
        cta="Learn More"
        secondary="Book a Consultation"
        reverse
        imageTone="d"
      />

      <section style={{ background: "var(--color-blue)", color: "#fff", padding: "5rem 3%", textAlign: "center" }}>
        <Eyebrow light>Get in touch</Eyebrow>
        <h2 style={{ fontSize: "clamp(2.4rem, 3vw + 1rem, 4rem)", fontWeight: 400, margin: "1rem 0 1.5rem", lineHeight: 1.05 }}>Want More Joy?</h2>
        <p style={{ maxWidth: "40ch", margin: "0 auto 2rem", color: "rgba(255,255,255,0.85)" }}>Subscribe for more wisdom, recipes, flavors, and fun!</p>
        <Button variant="important">Level Up!</Button>
      </section>
    </React.Fragment>
  );
}
window.PageHome = PageHome;
