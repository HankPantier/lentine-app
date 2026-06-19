// ProfileScreen — name / how we should greet you
function ProfileScreen({ state, setState, onContinue, onBack, step, totalSteps }) {
  const valid = state.firstName && state.firstName.trim().length > 1;
  return (
    <Screen>
      <OnbTopBar onBack={onBack} current={step} total={totalSteps} />
      <div style={{ marginTop: "1.5rem" }}>
        <Eyebrow>A little about you</Eyebrow>
        <h1 style={{
          fontSize: "2.4rem", lineHeight: 1.05, fontWeight: 400,
          margin: "1rem 0 0.5rem", letterSpacing: "-0.01em",
        }}>
          What should I <em>call you?</em>
        </h1>
        <p style={{ fontSize: "0.92rem", lineHeight: 1.65, color: "var(--fg-2)", maxWidth: "32ch", marginTop: "0.75rem" }}>
          I'll use your first name when we chat, in recipe notes, and in your morning rituals.
        </p>
      </div>

      <div style={{ marginTop: "2.25rem" }}>
        <Field label="First name" value={state.firstName} onChange={v => setState({ ...state, firstName: v })} placeholder="Lentine" autoFocus />
        <Field label="Last name (optional)" value={state.lastName} onChange={v => setState({ ...state, lastName: v })} placeholder="Alexis" />
      </div>

      <div style={{ flex: 1 }} />

      <Button variant="default" fullWidth size="lg" onClick={onContinue} disabled={!valid}>
        Continue
      </Button>
    </Screen>
  );
}

window.ProfileScreen = ProfileScreen;
