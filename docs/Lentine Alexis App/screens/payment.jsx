// PaymentScreen — Stripe payment entry (simulated)
function PaymentScreen({ state, setState, onContinue, onBack, step, totalSteps }) {
  const [num, setNum] = React.useState("");
  const [exp, setExp] = React.useState("");
  const [cvc, setCvc] = React.useState("");
  const [processing, setProcessing] = React.useState(false);
  const valid = num.length >= 16 && exp.length >= 4 && cvc.length >= 3;
  const tierIs = state.tier === "back_to_forward" ? { name: "Back to Forward", mo: 29, yr: 276 } : { name: "Recipe Club", mo: 9, yr: 84 };
  const total = state.interval === "year" ? tierIs.yr : tierIs.mo;
  const interval = state.interval === "year" ? "year" : "month";

  const submit = () => {
    setProcessing(true);
    setTimeout(onContinue, 900);
  };

  const fmtCard = (v) => v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  const fmtExp = (v) => { const d = v.replace(/\D/g, "").slice(0, 4); return d.length >= 3 ? d.slice(0,2) + "/" + d.slice(2) : d; };

  return (
    <Screen>
      <OnbTopBar onBack={onBack} current={step} total={totalSteps} />
      <div style={{ marginTop: "1rem" }}>
        <Eyebrow>Payment</Eyebrow>
        <h1 style={{ fontSize: "2rem", lineHeight: 1.05, fontWeight: 400, margin: "0.85rem 0 0.5rem", letterSpacing: "-0.01em" }}>
          Seal the <em>deal.</em>
        </h1>
      </div>

      {/* Summary card */}
      <div style={{ marginTop: "1.5rem", padding: "1.1rem 1.15rem", background: "var(--color-blue)", color: "#fff" }}>
        <Eyebrow light style={{ color: "var(--color-blue-light)" }}>Your plan</Eyebrow>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: "0.5rem" }}>
          <div>
            <div style={{ fontSize: "1.25rem", fontStyle: "italic" }}>{tierIs.name}</div>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.65)", marginTop: "0.15rem" }}>Billed {interval}ly</div>
          </div>
          <div style={{ fontSize: "1.5rem" }}>${total}</div>
        </div>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <Field label="Card number" value={num} onChange={v => setNum(fmtCard(v))} placeholder="1234 5678 9012 3456" />
        <div style={{ display: "flex", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <Field label="Expiry" value={exp} onChange={v => setExp(fmtExp(v))} placeholder="MM/YY" />
          </div>
          <div style={{ flex: 1 }}>
            <Field label="CVC" value={cvc} onChange={v => setCvc(v.replace(/\D/g,"").slice(0,4))} placeholder="123" />
          </div>
        </div>
      </div>

      <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.72rem", color: "var(--fg-3)", fontStyle: "italic" }}>
        <svg width="10" height="12" viewBox="0 0 10 12"><path d="M5 1a2.5 2.5 0 00-2.5 2.5V5H1v6h8V5H7.5V3.5A2.5 2.5 0 005 1zm1.5 4h-3V3.5a1.5 1.5 0 013 0V5z" fill="currentColor"/></svg>
        Encrypted with Stripe. We never see your card.
      </div>

      <div style={{ flex: 1, minHeight: "1rem" }} />

      <Button variant="default" fullWidth size="lg" onClick={submit} disabled={!valid || processing}>
        {processing ? "Processing…" : `Pay $${total} and start`}
      </Button>
    </Screen>
  );
}

// NotificationsScreen — push permission prompt
function NotificationsScreen({ onContinue, onBack, step, totalSteps, state }) {
  const firstName = (state && state.firstName) || "there";
  const [choice, setChoice] = React.useState(null);
  return (
    <Screen>
      <OnbTopBar onBack={onBack} current={step} total={totalSteps} onSkip={onContinue} />
      <div style={{ marginTop: "1rem" }}>
        <Eyebrow>Stay connected</Eyebrow>
        <h1 style={{ fontSize: "2.2rem", lineHeight: 1.05, fontWeight: 400, margin: "0.85rem 0 0.5rem", letterSpacing: "-0.01em" }}>
          Gentle nudges, <em>not noise.</em>
        </h1>
        <p style={{ fontSize: "0.92rem", lineHeight: 1.65, color: "var(--fg-2)", marginTop: "0.75rem", maxWidth: "32ch" }}>
          {firstName && firstName !== "there" ? firstName + ", c" : "C"}hoose what you'd like to hear about. You can change this any time.
        </p>
      </div>

      <div style={{ marginTop: "1.75rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {[
          { id: "rituals",  title: "Daily rituals", body: "One small practice each morning, matched to your dosha." },
          { id: "recipes",  title: "New recipes",   body: "A weekly seasonal drop in your inbox and here." },
          { id: "b2f",      title: "Back to Forward drops", body: "Monthly audio + frameworks, released in full moons." },
        ].map(r => (
          <label key={r.id} style={{
            display: "flex", gap: "0.85rem", alignItems: "flex-start",
            padding: "0.95rem 1rem", background: "#fff",
            border: "1px solid rgba(0,0,51,0.1)",
            cursor: "pointer",
          }}>
            <input
              type="checkbox"
              defaultChecked={r.id !== "b2f" ? true : false}
              style={{ marginTop: 4, accentColor: "var(--color-blue)" }}
            />
            <div>
              <div style={{ fontSize: "0.9rem", fontStyle: "italic" }}>{r.title}</div>
              <div style={{ fontSize: "0.76rem", color: "var(--fg-2)", marginTop: "0.2rem", lineHeight: 1.5 }}>{r.body}</div>
            </div>
          </label>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: "1rem" }} />

      {/* OS prompt simulation */}
      {choice === "ask" && (
        <div style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", zIndex: 30,
        }}>
          <div style={{ background: "rgba(245,245,250,0.96)", borderRadius: 14, padding: "1.25rem", maxWidth: 280, width: "100%", textAlign: "center",
            backdropFilter: "blur(20px)", fontFamily: "-apple-system, system-ui",
          }}>
            <div style={{ fontSize: "1rem", fontWeight: 600, color: "#000", marginBottom: "0.3rem" }}>"Lentine Alexis" Would Like to Send You Notifications</div>
            <div style={{ fontSize: "0.82rem", color: "rgba(60,60,67,0.8)", lineHeight: 1.35 }}>Notifications may include alerts, sounds, and icon badges.</div>
            <div style={{ borderTop: "0.5px solid rgba(60,60,67,0.29)", marginTop: "0.85rem", display: "flex" }}>
              <button onClick={onContinue} style={{ flex: 1, padding: "0.7rem", background: "transparent", border: "none", color: "#007aff", fontSize: "1rem", fontFamily: "inherit", cursor: "pointer", borderRight: "0.5px solid rgba(60,60,67,0.29)" }}>Don't Allow</button>
              <button onClick={onContinue} style={{ flex: 1, padding: "0.7rem", background: "transparent", border: "none", color: "#007aff", fontSize: "1rem", fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}>Allow</button>
            </div>
          </div>
        </div>
      )}

      <Button variant="default" fullWidth size="lg" onClick={() => setChoice("ask")}>
        Turn on notifications
      </Button>
      <button onClick={onContinue} style={{ background: "transparent", border: "none", marginTop: "0.75rem", color: "var(--fg-2)", fontSize: "0.82rem", fontStyle: "italic", fontFamily: "inherit", cursor: "pointer", alignSelf: "center" }}>
        Maybe later
      </button>
    </Screen>
  );
}

Object.assign(window, { PaymentScreen, NotificationsScreen });
