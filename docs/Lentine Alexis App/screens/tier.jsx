// TierScreen — Recipe vs Back to Forward
function TierScreen({ state, setState, onContinue, onBack, step, totalSteps }) {
  const tiers = [
    {
      id: "recipe",
      eb: "Weekly infusion",
      name: "Recipe Club",
      priceMo: 9, priceYr: 84,
      body: "A weekly drop of balanced culinary inspiration. Full recipe library access, shopping lists, and seasonal menus.",
      bullets: ["Full recipe library", "Seasonal menus", "Shopping lists"],
    },
    {
      id: "back_to_forward",
      eb: "Full immersion",
      name: "Back to Forward",
      priceMo: 29, priceYr: 276,
      body: "Everything in Recipe Club, plus practical holistic frameworks, monthly rituals, and audio teachings.",
      bullets: ["Everything in Recipe Club", "Monthly rituals + audio", "Dosha-aware meal plans", "Member-only live sessions"],
      featured: true,
    },
  ];
  return (
    <Screen>
      <OnbTopBar onBack={onBack} current={step} total={totalSteps} />
      <div style={{ marginTop: "1rem" }}>
        <Eyebrow>Choose your membership</Eyebrow>
        <h1 style={{ fontSize: "2.2rem", lineHeight: 1.05, fontWeight: 400, margin: "0.85rem 0 0.5rem", letterSpacing: "-0.01em" }}>
          Two ways <em>in.</em>
        </h1>
        <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--fg-2)", marginTop: "0.5rem" }}>
          Pick what meets you where you're at. You can change or cancel at any time.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginTop: "1.5rem" }}>
        {tiers.map(t => {
          const selected = state.tier === t.id;
          const dark = t.featured;
          return (
            <button key={t.id}
              onClick={() => setState({ ...state, tier: t.id })}
              style={{
                textAlign: "left",
                background: dark ? "var(--color-blue)" : "#fff",
                color: dark ? "#fff" : "var(--color-blue)",
                border: selected
                  ? `2px solid ${dark ? "var(--color-blue-light)" : "var(--color-blue)"}`
                  : `2px solid ${dark ? "var(--color-blue)" : "rgba(0,0,51,0.12)"}`,
                padding: "1.25rem",
                cursor: "pointer",
                fontFamily: "inherit",
                position: "relative",
                transition: "border 333ms",
              }}>
              {t.featured && (
                <div style={{
                  position: "absolute", top: -10, right: 14,
                  background: "var(--color-blue)",
                  color: "#fff", padding: "0.2rem 0.5rem",
                  fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.08rem", fontStyle: "italic",
                }}>Most popular</div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <Eyebrow light={dark} style={{ color: dark ? "var(--color-blue-light)" : "var(--color-blue-bright)" }}>{t.eb}</Eyebrow>
                  <h3 style={{ fontSize: "1.65rem", fontWeight: 400, margin: "0.4rem 0 0.5rem", lineHeight: 1.1, letterSpacing: "-0.01em" }}>{t.name}</h3>
                </div>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  border: selected
                    ? `6px solid ${dark ? "var(--color-blue-light)" : "var(--color-blue)"}`
                    : `1px solid ${dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,51,0.3)"}`,
                  background: selected ? "#fff" : "transparent",
                  transition: "all 333ms",
                }} />
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.25rem", marginBottom: "0.7rem" }}>
                <span style={{ fontSize: "2rem", lineHeight: 1 }}>${t.priceMo}</span>
                <span style={{ fontSize: "0.85rem", fontStyle: "italic", opacity: 0.7 }}>/mo · or ${t.priceYr}/yr</span>
              </div>
              <p style={{ margin: 0, lineHeight: 1.6, fontSize: "0.88rem", color: dark ? "rgba(255,255,255,0.82)" : "var(--fg-2)" }}>{t.body}</p>
              <ul style={{ margin: "0.85rem 0 0", padding: 0, listStyle: "none" }}>
                {t.bullets.map((b, i) => (
                  <li key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.3rem 0", fontSize: "0.82rem", color: dark ? "rgba(255,255,255,0.88)" : "var(--color-blue)" }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" style={{ flexShrink: 0, color: dark ? "var(--color-blue-light)" : "var(--color-blue-bright)" }}>
                      <path d="M2 6l3 3 5-7" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontStyle: "italic" }}>{b}</span>
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: "1rem" }} />

      <Button variant="default" fullWidth size="lg" onClick={onContinue} disabled={!state.tier}>
        Continue
      </Button>
    </Screen>
  );
}

// BillingScreen — monthly vs annual toggle
function BillingScreen({ state, setState, onContinue, onBack, step, totalSteps }) {
  const tierIs = state.tier === "back_to_forward" ? { name: "Back to Forward", mo: 29, yr: 276 } : { name: "Recipe Club", mo: 9, yr: 84 };
  const saved = (tierIs.mo * 12 - tierIs.yr).toFixed(0);
  const options = [
    { id: "month", label: "Monthly", price: tierIs.mo, per: "per month", note: null },
    { id: "year",  label: "Annual",  price: Math.round(tierIs.yr / 12), per: "per month, billed annually", note: `Save $${saved}/yr` },
  ];
  return (
    <Screen>
      <OnbTopBar onBack={onBack} current={step} total={totalSteps} />
      <div style={{ marginTop: "1rem" }}>
        <Eyebrow>{tierIs.name}</Eyebrow>
        <h1 style={{ fontSize: "2.2rem", lineHeight: 1.05, fontWeight: 400, margin: "0.85rem 0 0.5rem", letterSpacing: "-0.01em" }}>
          How often would you <em>like to be billed?</em>
        </h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
        {options.map(o => {
          const sel = state.interval === o.id;
          return (
            <button key={o.id} onClick={() => setState({ ...state, interval: o.id })} style={{
              textAlign: "left", padding: "1.1rem 1.25rem",
              background: "#fff",
              border: sel ? "2px solid var(--color-blue)" : "2px solid rgba(0,0,51,0.12)",
              fontFamily: "inherit", cursor: "pointer", color: "var(--color-blue)",
              display: "flex", alignItems: "center", gap: "0.85rem",
              transition: "border 333ms",
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                border: sel ? "6px solid var(--color-blue)" : "1px solid rgba(0,0,51,0.3)",
                background: sel ? "#fff" : "transparent",
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.05rem", fontStyle: "italic" }}>{o.label}</span>
                  <span style={{ fontSize: "1.1rem" }}>${o.price}</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--fg-2)", fontStyle: "italic", marginTop: "0.2rem" }}>
                  {o.per}{o.note && <span style={{ color: "var(--color-blue)", fontWeight: 500, marginLeft: "0.5rem" }}>· {o.note}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: "1.25rem", padding: "0.85rem 1rem", background: "rgba(0,0,51,0.04)", fontSize: "0.78rem", lineHeight: 1.55, color: "var(--fg-2)", fontStyle: "italic" }}>
        Cancel anytime from Settings. Your dosha profile and saved recipes stay with you.
      </div>

      <div style={{ flex: 1, minHeight: "1rem" }} />

      <Button variant="default" fullWidth size="lg" onClick={onContinue} disabled={!state.interval}>
        Continue to payment
      </Button>
    </Screen>
  );
}

Object.assign(window, { TierScreen, BillingScreen });
