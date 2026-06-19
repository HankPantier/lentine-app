// DoshaQuizScreen — conversational chat UI with a warm unnamed guide.
// Messages appear with a brief typing delay for realism. Input method varies per turn.
//
// Turn script (4 turns):
//  0. Intro + multiple choice: morning energy
//  1. Free text: what brings you here
//  2. Multiple choice chips: body tendency
//  3. Voice note (placeholder) OR text: describe your sleep
// Then → compute result → advance.

const QUIZ_TURNS = [
  {
    guide: [
      "Before we begin — I want to know you a little.",
      "This isn't a test. Answer from the gut; we can always revisit.",
      "First: when you wake up on a good day, how do you feel?",
    ],
    input: {
      kind: "chips",
      options: [
        { id: "vata",  label: "Light, a bit wired, ready to move" },
        { id: "pitta", label: "Focused, warm, already planning" },
        { id: "kapha", label: "Slow to rise, heavy, but steady" },
      ],
    },
  },
  {
    guide: [
      "Mm — that tells me a lot.",
      "In a sentence or two: what brought you here?",
    ],
    input: {
      kind: "text",
      placeholder: "I've been feeling…",
    },
  },
  {
    guide: [
      "Thank you for sharing that.",
      "Physically — which feels most true about your body, most of the time?",
    ],
    input: {
      kind: "chips",
      options: [
        { id: "vata",  label: "Lean, quick, often cold" },
        { id: "pitta", label: "Medium, muscular, runs warm" },
        { id: "kapha", label: "Soft, sturdy, holds weight easily" },
      ],
    },
  },
  {
    guide: [
      "One last one — and you can say it out loud if that's easier.",
      "How does your sleep feel lately?",
    ],
    input: {
      kind: "voice",
      placeholder: "Tap to record, or type instead",
    },
  },
];

// Bubble components
function GuideBubble({ children, delay = 0 }) {
  const [show, setShow] = React.useState(delay === 0);
  React.useEffect(() => {
    if (delay === 0) return;
    const t = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div style={{
      alignSelf: "flex-start", maxWidth: "85%",
      background: "#fff", border: "1px solid rgba(0,0,51,0.08)",
      padding: "0.85rem 1.05rem",
      fontSize: "0.95rem", lineHeight: 1.55,
      color: "var(--color-blue)",
      borderRadius: "2px 14px 14px 14px",
      animation: "bubbleIn 333ms cubic-bezier(0.4,0,0.2,1)",
    }}>{children}</div>
  );
}

function UserBubble({ children }) {
  return (
    <div style={{
      alignSelf: "flex-end", maxWidth: "85%",
      background: "var(--color-blue)", color: "#fff",
      padding: "0.85rem 1.05rem",
      fontSize: "0.95rem", lineHeight: 1.55,
      borderRadius: "14px 14px 2px 14px",
      fontStyle: "italic",
      animation: "bubbleIn 333ms cubic-bezier(0.4,0,0.2,1)",
    }}>{children}</div>
  );
}

function TypingBubble() {
  return (
    <div style={{
      alignSelf: "flex-start",
      background: "#fff", border: "1px solid rgba(0,0,51,0.08)",
      padding: "0.85rem 1.05rem", display: "flex", gap: 5,
      borderRadius: "2px 14px 14px 14px",
    }}>
      {[0,1,2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "rgba(0,0,51,0.35)",
          animation: `typingDot 1200ms infinite ease-in-out ${i * 160}ms`,
        }} />
      ))}
    </div>
  );
}

function DoshaQuizScreen({ state, setState, onComplete, onBack, step, totalSteps }) {
  // Persistent chat log + current turn state
  const [turnIdx, setTurnIdx] = React.useState(state.quizTurnIdx || 0);
  const [log, setLog] = React.useState(state.quizLog || []); // {role, text, turn}
  const [revealed, setRevealed] = React.useState(0); // how many guide lines visible this turn
  const [typing, setTyping] = React.useState(false);
  const [textInput, setTextInput] = React.useState("");
  const scrollRef = React.useRef(null);

  // If persisted turnIdx is past end (quiz already finished), reset to 0 to avoid crash
  const safeTurnIdx = turnIdx >= QUIZ_TURNS.length ? 0 : turnIdx;
  const currentTurn = QUIZ_TURNS[safeTurnIdx];
  React.useEffect(() => {
    if (turnIdx >= QUIZ_TURNS.length) { setTurnIdx(0); setLog([]); }
  }, []);

  // Reveal guide lines for this turn one at a time with typing indicator
  React.useEffect(() => {
    setRevealed(0);
    if (!currentTurn) return;
    let cancelled = false;
    (async () => {
      for (let i = 0; i < currentTurn.guide.length; i++) {
        setTyping(true);
        await new Promise(r => setTimeout(r, 600 + i * 180));
        if (cancelled) return;
        setTyping(false);
        setRevealed(i + 1);
        await new Promise(r => setTimeout(r, 120));
        if (cancelled) return;
      }
    })();
    return () => { cancelled = true; };
  }, [turnIdx]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [revealed, log, typing]);

  const submitAnswer = (answerObj) => {
    // answerObj: {display, doshaLean?}
    const newLog = [...log, { role: "user", text: answerObj.display, turn: turnIdx, lean: answerObj.doshaLean }];
    setLog(newLog);
    setTextInput("");
    const next = turnIdx + 1;
    if (next >= QUIZ_TURNS.length) {
      // Compute dosha result from leans
      const tally = { vata: 0, pitta: 0, kapha: 0 };
      for (const m of newLog) if (m.lean && tally[m.lean] !== undefined) tally[m.lean]++;
      const winner = Object.entries(tally).sort((a,b) => b[1]-a[1])[0][0];
      setState({ ...state, quizLog: newLog, quizTurnIdx: next, dosha: winner });
      setTimeout(() => onComplete(winner), 600);
    } else {
      setState({ ...state, quizLog: newLog, quizTurnIdx: next });
      setTurnIdx(next);
    }
  };

  // Build chronological render list: prior turns (guide lines + user answer), current turn up to `revealed`
  const renderTurn = (tIdx, opts = {}) => {
    const t = QUIZ_TURNS[tIdx];
    if (!t) return null;
    const userMsg = log.find(m => m.role === "user" && m.turn === tIdx);
    const lines = opts.guideLimit === undefined ? t.guide : t.guide.slice(0, opts.guideLimit);
    return (
      <React.Fragment key={"t" + tIdx}>
        {lines.map((line, i) => (
          <GuideBubble key={"g"+tIdx+"-"+i}>{line}</GuideBubble>
        ))}
        {userMsg && <UserBubble>{userMsg.text}</UserBubble>}
      </React.Fragment>
    );
  };

  return (
    <Screen padding="0" style={{ background: "var(--color-taupe)" }}>
      <div style={{ padding: "1.5rem 1.5rem 0.5rem" }}>
        <OnbTopBar onBack={onBack} current={step} total={totalSteps} />
        <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%",
            background: "var(--color-blue)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--color-blue-light)" }} />
          </div>
          <div>
            <div style={{ fontSize: "0.78rem", fontStyle: "italic", color: "var(--color-blue)" }}>Your guide</div>
            <div style={{ fontSize: "0.62rem", letterSpacing: "0.08rem", textTransform: "uppercase", color: "var(--fg-3)", fontStyle: "italic" }}>Dosha intake · {turnIdx + 1}/{QUIZ_TURNS.length}</div>
          </div>
        </div>
      </div>

      {/* Chat log */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: "auto",
        display: "flex", flexDirection: "column", gap: "0.6rem",
        padding: "1.25rem 1.5rem 0.5rem",
      }}>
        {Array.from({ length: turnIdx }).map((_, i) => renderTurn(i))}
        {renderTurn(turnIdx, { guideLimit: revealed })}
        {typing && <TypingBubble />}
      </div>

      {/* Input area — varies per turn, only shows after all guide lines revealed */}
      {currentTurn && revealed === currentTurn.guide.length && !typing && (
        <QuizInput
          turn={currentTurn}
          textInput={textInput}
          setTextInput={setTextInput}
          onSubmit={submitAnswer}
        />
      )}

      <style>{`
        @keyframes bubbleIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>
    </Screen>
  );
}

function QuizInput({ turn, textInput, setTextInput, onSubmit }) {
  const input = turn.input;
  if (input.kind === "chips") {
    return (
      <div style={{
        padding: "0.75rem 1.5rem 1.5rem",
        background: "var(--color-taupe)",
        borderTop: "1px solid rgba(0,0,51,0.06)",
        display: "flex", flexDirection: "column", gap: "0.5rem",
      }}>
        {input.options.map(opt => (
          <button key={opt.id} onClick={() => onSubmit({ display: opt.label, doshaLean: opt.id })} style={{
            textAlign: "left",
            padding: "0.85rem 1rem",
            background: "#fff",
            border: "1px solid rgba(0,0,51,0.12)",
            borderRadius: "0.3rem",
            fontFamily: "inherit", fontSize: "0.9rem",
            color: "var(--color-blue)",
            cursor: "pointer",
            transition: "all 333ms",
            fontStyle: "italic",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color-blue)"; e.currentTarget.style.background = "var(--color-blue)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(0,0,51,0.12)"; e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "var(--color-blue)"; }}
          >{opt.label}</button>
        ))}
      </div>
    );
  }
  if (input.kind === "text") {
    return (
      <div style={{
        padding: "0.75rem 1rem 1.25rem",
        background: "var(--color-taupe)",
        borderTop: "1px solid rgba(0,0,51,0.06)",
        display: "flex", gap: "0.5rem", alignItems: "flex-end",
      }}>
        <textarea
          value={textInput}
          onChange={e => setTextInput(e.target.value)}
          placeholder={input.placeholder}
          rows={2}
          autoFocus
          style={{
            flex: 1, resize: "none",
            background: "#fff",
            border: "1px solid rgba(0,0,51,0.12)",
            borderRadius: "0.3rem",
            padding: "0.7rem 0.8rem",
            fontFamily: "inherit", fontSize: "0.9rem",
            color: "var(--color-blue)",
            outline: "none",
            lineHeight: 1.5,
          }}
        />
        <button
          onClick={() => textInput.trim() && onSubmit({ display: textInput.trim() })}
          disabled={!textInput.trim()}
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: textInput.trim() ? "var(--color-blue)" : "rgba(0,0,51,0.15)",
            border: "none", cursor: textInput.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            transition: "background 333ms",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 13V3M8 3L3 8M8 3l5 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    );
  }
  if (input.kind === "voice") {
    return (
      <div style={{
        padding: "1rem 1.5rem 1.5rem",
        background: "var(--color-taupe)",
        borderTop: "1px solid rgba(0,0,51,0.06)",
      }}>
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "stretch" }}>
          <button
            onClick={() => onSubmit({ display: "🎤 Voice note · 0:14" })}
            style={{
              flex: 1,
              padding: "0.7rem 0.9rem",
              background: "var(--color-blue)",
              color: "#fff", border: "2px solid var(--color-blue)",
              borderRadius: "0.3rem",
              fontFamily: "inherit", fontSize: "0.78rem", fontStyle: "italic",
              textTransform: "uppercase", letterSpacing: "0.05rem",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-red)", animation: "pulse 1500ms infinite" }} />
            Hold to record
          </button>
          <button
            onClick={() => onSubmit({ display: "I'm sleeping, but waking up tired — even after a full night." })}
            style={{
              padding: "0.7rem 0.9rem",
              background: "transparent",
              color: "var(--color-blue)", border: "2px solid rgba(0,0,51,0.25)",
              borderRadius: "0.3rem",
              fontFamily: "inherit", fontSize: "0.78rem", fontStyle: "italic",
              textTransform: "uppercase", letterSpacing: "0.05rem",
              cursor: "pointer",
            }}
          >Type instead</button>
        </div>
        <div style={{ fontSize: "0.7rem", color: "var(--fg-3)", textAlign: "center", marginTop: "0.6rem", fontStyle: "italic" }}>
          Tap once here to simulate — transcription happens on-device.
        </div>
        <style>{`@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </div>
    );
  }
  return null;
}

Object.assign(window, { DoshaQuizScreen });
