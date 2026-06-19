// OnboardingFlow — state machine. Steps:
//  0 splash → 1 signup OR (login → reset → back to quiz)
//  1/2/3 signup, profile, quiz intro, quiz turns (handled inside quiz),
//  4 result, 5 tier, 6 billing, 7 payment, 8 notifications, 9 home
// We also support a separate `migrating` entry that detects if the quiz was
// already completed (from localStorage) — if so skip straight to home.

const STORAGE_KEY = "la_onb_state_v1";

const DEFAULT_STATE = {
  mode: null,                 // 'new' | 'migrating'
  email: "", password: "",
  firstName: "", lastName: "",
  dosha: null,                // 'vata' | 'pitta' | 'kapha'
  tier: null,                 // 'recipe' | 'back_to_forward'
  interval: null,             // 'month' | 'year'
  quizTurnIdx: 0,
  quizLog: [],
  quizDone: false,
  completed: false,           // full onboarding done
};

const NEW_STEPS = ["signup", "profile", "quiz", "result", "tier", "billing", "payment", "notifications", "home"];
const MIG_STEPS = ["login", "reset", "quiz", "result", "tier_confirm", "notifications", "home"]; // migrating users keep their tier

function OnboardingFlow({ forceStep, debugState }) {
  // Load persisted state
  const [screen, setScreen] = React.useState("splash"); // 'splash' | 'flow'
  const [flowKind, setFlowKind] = React.useState("new"); // 'new' | 'migrating'
  const [stepIdx, setStepIdx] = React.useState(0);
  const [state, setState] = React.useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULT_STATE, ...JSON.parse(stored) };
    } catch (e) {}
    return DEFAULT_STATE;
  });

  // persist
  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }, [state]);

  // If forceStep is set from outside (tweaks), honor it
  React.useEffect(() => {
    if (forceStep === undefined || forceStep === null) return;
    if (forceStep === "splash") { setScreen("splash"); setStepIdx(0); return; }
    const steps = flowKind === "migrating" ? MIG_STEPS : NEW_STEPS;
    const i = steps.indexOf(forceStep);
    if (i >= 0) { setScreen("flow"); setStepIdx(i); }
  }, [forceStep]);

  const steps = flowKind === "migrating" ? MIG_STEPS : NEW_STEPS;
  const total = steps.length - 1; // progress dots don't include 'home'

  const advance = () => {
    if (stepIdx >= steps.length - 1) return;
    setStepIdx(stepIdx + 1);
  };
  const back = () => {
    if (stepIdx === 0) { setScreen("splash"); return; }
    setStepIdx(stepIdx - 1);
  };
  const restart = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(DEFAULT_STATE);
    setScreen("splash");
    setStepIdx(0);
    setFlowKind("new");
  };

  // Splash handlers
  if (screen === "splash") {
    return <SplashScreen
      onContinue={() => { setFlowKind("new"); setState(s => ({ ...s, mode: "new" })); setScreen("flow"); setStepIdx(0); }}
      onLogin={() => { setFlowKind("migrating"); setState(s => ({ ...s, mode: "migrating" })); setScreen("flow"); setStepIdx(0); }}
    />;
  }

  const current = steps[stepIdx];

  // Render by current step
  if (current === "signup") {
    return <SignUpScreen
      state={state} setState={setState}
      step={stepIdx} totalSteps={total}
      onBack={back}
      onContinue={advance}
      onSwitchToLogin={() => { setFlowKind("migrating"); setStepIdx(0); }}
    />;
  }
  if (current === "login") {
    return <LoginScreen
      state={state} setState={setState}
      onBack={back}
      onContinue={() => {
        // After login: if quiz already done, skip to home. Otherwise go to quiz.
        if (state.quizDone) { setStepIdx(MIG_STEPS.indexOf("tier_confirm")); return; }
        setStepIdx(MIG_STEPS.indexOf("quiz"));
      }}
      onForgot={() => setStepIdx(MIG_STEPS.indexOf("reset"))}
      onSwitchToSignup={() => { setFlowKind("new"); setStepIdx(0); }}
    />;
  }
  if (current === "reset") {
    return <ResetPasswordScreen
      state={state} setState={setState}
      onBack={() => setStepIdx(MIG_STEPS.indexOf("login"))}
      onContinue={() => {
        if (state.quizDone) { setStepIdx(MIG_STEPS.indexOf("tier_confirm")); return; }
        setStepIdx(MIG_STEPS.indexOf("quiz"));
      }}
    />;
  }
  if (current === "profile") {
    return <ProfileScreen state={state} setState={setState} step={stepIdx} totalSteps={total} onBack={back} onContinue={advance} />;
  }
  if (current === "quiz") {
    return <DoshaQuizScreen
      state={state} setState={setState}
      step={stepIdx} totalSteps={total}
      onBack={back}
      onComplete={(dosha) => { setState(s => ({ ...s, dosha, quizDone: true })); advance(); }}
    />;
  }
  if (current === "result") {
    return <DoshaResultScreen state={state} onBack={back} onContinue={advance} />;
  }
  if (current === "tier") {
    return <TierScreen state={state} setState={setState} step={stepIdx} totalSteps={total} onBack={back} onContinue={advance} />;
  }
  if (current === "billing") {
    return <BillingScreen state={state} setState={setState} step={stepIdx} totalSteps={total} onBack={back} onContinue={advance} />;
  }
  if (current === "payment") {
    return <PaymentScreen state={state} setState={setState} step={stepIdx} totalSteps={total} onBack={back} onContinue={advance} />;
  }
  if (current === "tier_confirm") {
    // For migrating users — skip tier selection, show confirmation
    return <MigrationTierConfirmScreen state={state} setState={setState} step={stepIdx} totalSteps={total} onBack={back} onContinue={advance} />;
  }
  if (current === "notifications") {
    return <NotificationsScreen state={state} step={stepIdx} totalSteps={total} onBack={back} onContinue={() => { setState(s => ({ ...s, completed: true })); advance(); }} />;
  }
  if (current === "home") {
    return <HomeTeaserScreen state={state} onRestart={restart} />;
  }
  return null;
}

// A little screen just for migrating users — surfaces their existing subscription so
// they know they're not being re-charged, and lets them confirm.
function MigrationTierConfirmScreen({ state, onContinue, onBack }) {
  // Pretend we have an existing sub
  const existing = { name: "Back to Forward", interval: "year", renews: "November 3, 2026" };
  return (
    <Screen>
      <OnbTopBar onBack={onBack} />
      <div style={{ marginTop: "1rem" }}>
        <Eyebrow>Your membership is intact</Eyebrow>
        <h1 style={{ fontSize: "2rem", lineHeight: 1.05, fontWeight: 400, margin: "0.85rem 0 0.5rem", letterSpacing: "-0.01em" }}>
          Right where you <em>left off.</em>
        </h1>
        <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--fg-2)", marginTop: "0.5rem" }}>
          We've carried over your existing subscription and renewal date. No card details needed, no changes to billing.
        </p>
      </div>

      <div style={{ marginTop: "1.75rem", padding: "1.25rem", background: "var(--color-blue)", color: "#fff" }}>
        <Eyebrow light style={{ color: "var(--color-blue-light)" }}>Current plan</Eyebrow>
        <div style={{ fontSize: "1.5rem", fontStyle: "italic", marginTop: "0.5rem" }}>{existing.name}</div>
        <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", marginTop: "0.25rem" }}>Billed {existing.interval}ly · renews {existing.renews}</div>
      </div>

      <div style={{ flex: 1 }} />
      <Button variant="default" fullWidth size="lg" onClick={onContinue}>Continue</Button>
    </Screen>
  );
}

Object.assign(window, { OnboardingFlow, MigrationTierConfirmScreen });
