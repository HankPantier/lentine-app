// Button.jsx — small italic uppercase. Default / outline / important.
function Button({ variant = "default", children, onClick, href, style = {} }) {
  const base = {
    display: "inline-block",
    padding: "0.75rem 1.25rem 0.65rem",
    marginRight: "0.5rem",
    fontFamily: "inherit",
    fontSize: "0.8rem",
    fontStyle: "italic",
    fontWeight: 400,
    letterSpacing: "0.01rem",
    textAlign: "center",
    textDecoration: "none",
    textTransform: "uppercase",
    borderRadius: "0.3rem",
    cursor: "pointer",
    transition: "all 333ms ease-in-out",
    border: "2px solid",
    lineHeight: 1.1,
  };
  const variants = {
    default:   { background: "var(--button-color)",     borderColor: "var(--button-color)",     color: "#fff" },
    outline:   { background: "transparent",             borderColor: "var(--button-color)",     color: "var(--button-color)" },
    important: { background: "var(--button-important)", borderColor: "var(--button-important)", color: "#fff" },
    ghostLight:{ background: "transparent",             borderColor: "#fff",                     color: "#fff" },
  };
  const [hover, setHover] = React.useState(false);
  const hoverStyle = hover
    ? { background: "var(--button-hover)", borderColor: "var(--button-hover)", color: "#fff" }
    : {};
  const Tag = href ? "a" : "button";
  return (
    <Tag
      href={href}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...base, ...variants[variant], ...hoverStyle, ...style }}
    >
      {children}
    </Tag>
  );
}
window.Button = Button;
