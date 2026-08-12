# design-handoff/

Self-contained packages for handing a slice of the app to a design tool (e.g. Claude Design) for
visual improvements, then folding the result back into the codebase.

- **`recipe-reader/`** — improve the in-app recipe reading experience.
  - `recipe-sample.html` — faithful "before" render of the current recipe reader (open in a browser).
  - `DESIGN-BRIEF.md` — goal, hard constraints (it's React Native, not a website), brand tokens,
    content structure, and where the result lands in code.

These are reference/handoff artifacts — not shipped with the app.
