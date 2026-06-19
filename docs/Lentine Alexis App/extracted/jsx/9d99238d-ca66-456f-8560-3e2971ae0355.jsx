// Header.jsx — navy bar, white wordmark, top nav
function Header({ active, onNav }) {
  const links = [
    { id: "home",       label: "About" },
    { id: "ayurveda",   label: "Ayurveda" },
    { id: "recipes",    label: "Recipe Library" },
    { id: "membership", label: "Membership" },
    { id: "shop",       label: "Shop" },
  ];
  const [openMobile, setOpen] = React.useState(false);
  return (
    <header style={{
      background: "var(--site-header-color)",
      color: "#fff",
      height: "81px",
      display: "flex",
      alignItems: "center",
      padding: "0 3%",
      position: "sticky",
      top: 0,
      zIndex: 10,
      borderBottom: "1px solid rgba(255,255,255,0.06)",
    }}>
      <a href="#" onClick={(e) => { e.preventDefault(); onNav("home"); }} style={{ display: "flex", alignItems: "center" }}>
        <img src={window.__resources.logoWhite} alt="Lentine Alexis" style={{ height: 40, width: "auto" }} />
      </a>
      <nav style={{ marginLeft: "auto", display: "flex", gap: "1.75rem", alignItems: "center" }}>
        {links.map(l => (
          <a
            key={l.id}
            href="#"
            onClick={(e) => { e.preventDefault(); onNav(l.id); }}
            style={{
              color: active === l.id ? "var(--color-blue-light)" : "#fff",
              fontSize: "0.85rem",
              textDecoration: "none",
              transition: "color 333ms ease-in-out",
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "var(--color-blue-light)"}
            onMouseLeave={(e) => e.currentTarget.style.color = active === l.id ? "var(--color-blue-light)" : "#fff"}
          >
            {l.label}
          </a>
        ))}
        <Button variant="ghostLight" onClick={() => onNav("membership")} style={{ marginRight: 0 }}>Join Now</Button>
      </nav>
    </header>
  );
}
window.Header = Header;
