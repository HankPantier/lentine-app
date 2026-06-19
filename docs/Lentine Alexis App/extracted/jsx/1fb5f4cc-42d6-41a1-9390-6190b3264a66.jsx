// PageRecipes.jsx
function PageRecipes({ onNav }) {
  const filters = ["All", "Free", "Members", "Breakfast", "Soups", "Sweets", "Magic Tricks", "Spring"];
  const [active, setActive] = React.useState("All");
  const recipes = [
    { tone: "a", meta: "Soups · Spring",   title: "Carrot + Ginger + Orange Soup" },
    { tone: "b", meta: "Sweets",           title: "Date-Sweetened Carrot Quick Cake" },
    { tone: "c", meta: "Magic Tricks",     title: "Magic Trick Ginger Tea" },
    { tone: "d", meta: "Breakfast",        title: "Warm Golden Milk Oats" },
    { tone: "e", meta: "Members",          title: "Slow-Roasted Winter Roots" },
    { tone: "f", meta: "Sweets",           title: "Cardamom-Cashew Energy Bites" },
    { tone: "a", meta: "Breakfast · Free", title: "Ghee-Crisped Chickpea Toast" },
    { tone: "b", meta: "Soups",            title: "Green Mung Dal Kitchari" },
  ];
  return (
    <React.Fragment>
      <section style={{ padding: "5rem 3% 2rem", maxWidth: "80rem", margin: "0 auto" }}>
        <Eyebrow>Recipe library</Eyebrow>
        <h1 style={{ fontSize: "clamp(3rem, 6vw, 6rem)", letterSpacing: "-0.05rem", lineHeight: 1, fontWeight: 400, margin: "1rem 0 1.5rem" }}>
          Recipes,<br/>Redefined.
        </h1>
        <p style={{ maxWidth: "52ch", fontSize: "1.05rem" }}>
          A recipe is just a "recipe" unless it's designed to <em>fuel good, feel good and create joy.</em> Hundreds of recipes designed to power your best self, from the root up.
        </p>
      </section>

      <section style={{ padding: "0 3% 5rem", maxWidth: "80rem", margin: "0 auto" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", borderBottom: "1px solid var(--color-gray)", paddingBottom: "1.25rem", marginBottom: "2.5rem" }}>
          {filters.map(f => (
            <button key={f} onClick={() => setActive(f)} style={{
              padding: "0.45rem 0.9rem",
              fontFamily: "inherit",
              fontSize: "0.72rem",
              fontStyle: "italic",
              letterSpacing: "0.05rem",
              textTransform: "uppercase",
              background: active === f ? "var(--color-blue)" : "transparent",
              color: active === f ? "#fff" : "var(--color-blue)",
              border: "1px solid var(--color-blue)",
              borderRadius: "0.3rem",
              cursor: "pointer",
              transition: "all 333ms ease-in-out",
            }}>{f}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem" }}>
          {recipes.map((r, i) => <RecipeCard key={i} {...r} />)}
        </div>
      </section>
    </React.Fragment>
  );
}
window.PageRecipes = PageRecipes;
