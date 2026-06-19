// Footer.jsx — navy footer, wordmark + nav + newsletter
function Footer({ onNav }) {
  const [email, setEmail] = React.useState("");
  const submit = (e) => {
    e.preventDefault();
    console.log("newsletter signup:", email);
    setEmail("");
  };
  return (
    <footer style={{
      background: "var(--site-footer-color)",
      color: "#fff",
      padding: "4rem 3% 2rem",
      marginTop: "6rem",
    }}>
      <div style={{ maxWidth: "80rem", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem" }}>
        <div>
          <img src={window.__resources.logoWhite} alt="Lentine Alexis" style={{ height: 56, width: "auto", marginBottom: "1rem" }} />
          <p style={{ color: "rgba(255,255,255,0.72)", maxWidth: "32ch", fontSize: "0.95rem", lineHeight: 1.8 }}>
            Drops of ancient wisdom to inform modern life — <em>flavorful food + adventure at the center.</em>
          </p>
        </div>
        <div>
          <span style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05rem", fontStyle: "italic", color: "rgba(255,255,255,0.72)", display: "block", marginBottom: "1rem" }}>Stay up to date</span>
          <form onSubmit={submit} style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                flex: 1, padding: "12px", fontFamily: "inherit", fontSize: 16, fontWeight: 400,
                background: "#fff", color: "var(--color-blue)", border: "1px solid #E7E7E7", borderRadius: 0,
              }}
            />
            <Button variant="important" onClick={submit}>Level Up!</Button>
          </form>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            {["Account", "Work With Me", "Ayurveda", "About", "Contact"].map(l => (
              <a key={l} href="#" style={{
                color: "rgba(255,255,255,0.85)", fontSize: "0.85rem", textDecoration: "none",
                transition: "color 333ms ease-in-out",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-blue-light)"}
              onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.85)"}
              >{l}</a>
            ))}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: "80rem", margin: "3rem auto 0", paddingTop: "1.5rem", borderTop: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
        © Lentine Alexis 2022 — All Rights Reserved &nbsp;|&nbsp; <a href="#" style={{ color: "rgba(255,255,255,0.5)" }}>Privacy Policy</a>
      </div>
    </footer>
  );
}
window.Footer = Footer;
