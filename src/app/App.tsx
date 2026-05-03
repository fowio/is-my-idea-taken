import { useState, useEffect, useRef } from "react";

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  blue:    "#3c91e6",
  dark:    "#342e37",
  lime:    "#a2d729",
  bg:      "#fafffd",
  orange:  "#fa824c",
};

// ── Deterministic hash ────────────────────────────────────────────────────────
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function pick<T>(arr: T[], n: number): T {
  return arr[Math.abs(n) % arr.length];
}

// ── Competitor generator ──────────────────────────────────────────────────────
const SUFFIXES = ["-ly", ".io", "-ify", "-ai", "-hub", "-lab", "-hq", "-co"];
const TLD_PICKS = ["io", "ai", "co", "app", "xyz"];
const STATUSES = ["Acquired", "Series A", "Active", "Series B", "Seed Stage"];
const SEED_AMOUNTS = ["1.2M", "3.5M", "7.8M", "2.1M", "5.0M", "12.4M", "0.8M"];
const SERIES_A = ["18M", "22M", "35M", "40M", "15M"];

interface Competitor {
  name: string;
  domain: string;
  tld: string;
  founded: number;
  raised: string;
  round: string;
  status: string;
  score: number;
}

function generateCompetitor(idea: string): Competitor {
  const words = idea.trim().split(/\s+/);
  const first = words[0].toLowerCase().replace(/[^a-z]/g, "") || "idea";
  const h1 = hash(idea);
  const h2 = hash(idea + "x");
  const h3 = hash(idea + "y");
  const h4 = hash(idea + "z");
  const h5 = hash(idea + "w");
  const h6 = hash(idea + "s");

  const suffix = pick(SUFFIXES, h1);
  const rawName = first + suffix.replace(/[.\-]/, "");
  const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  const tld = pick(TLD_PICKS, h2);
  const domain = `${first}.${tld}`;
  const founded = 2017 + (Math.abs(h3) % 6);  // 2017–2022
  const status = pick(STATUSES, h4);
  const raised = status === "Series A" || status === "Series B"
    ? "$" + pick(SERIES_A, h5)
    : "$" + pick(SEED_AMOUNTS, h5);
  const round = status === "Series A" ? "Series A"
    : status === "Series B" ? "Series B"
    : "Seed";
  const score = 20 + (Math.abs(h6) % 61); // 20–80

  return { name, domain, tld, founded, raised, round, status, score };
}

// ── Paywall messages ─────────────────────────────────────────────────────────
const PAYWALL_MSGS = [
  { headline: "Whoa, slow down there 👀", body: "You've unlocked our Premium Insight™. Only $29/mo to see results that are slightly more made-up than the free ones." },
  { headline: "This idea is too good to show for free 💎", body: "Upgrade to RateMyIdea Pro and get access to even faker competitors, inflated funding numbers, and a certificate of participation." },
  { headline: "Our AI is tired 😴", body: "We've used up all our compute generating nonsense for you. Subscribe for $19/mo and we'll generate slightly different nonsense." },
  { headline: "You found a competitor! 🎉", body: "To view the full teardown, roast report, and totally real market analysis, please enter your credit card. We promise not to charge it more than once a week." },
  { headline: "Hold on — this is a premium result 🔒", body: "For just $9/mo you get unlimited idea ratings, a fake pitch deck template, and the emotional validation you came here for." },
];

// ── Loading messages ─────────────────────────────────────────────────────────
const LOADING_STEPS = [
  "scanning the market…",
  "checking Crunchbase…",
  "querying Y Combinator…",
  "cross-referencing Product Hunt…",
  "compiling results…",
];

// ── App ──────────────────────────────────────────────────────────────────────
type Phase = "idle" | "loading" | "result";

export default function App() {
  const [idea, setIdea] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [loadingStep, setLoadingStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [dots, setDots] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallMsg, setPaywallMsg] = useState(PAYWALL_MSGS[0]);
  const [paywallXVisible, setPaywallXVisible] = useState(false);

  // Animate dots
  useEffect(() => {
    if (phase === "loading") {
      const iv = setInterval(() => {
        setDots((d) => (d.length >= 3 ? "" : d + "."));
      }, 400);
      return () => clearInterval(iv);
    }
  }, [phase]);

  // Progress bar + step cycling
  useEffect(() => {
    if (phase !== "loading") return;
    setProgress(0);
    setLoadingStep(0);

    let elapsed = 0;
    const TOTAL = 2000;
    const TICK = 40;

    intervalRef.current = setInterval(() => {
      elapsed += TICK;
      const pct = Math.min((elapsed / TOTAL) * 100, 100);
      setProgress(pct);
      setLoadingStep(Math.min(
        Math.floor((elapsed / TOTAL) * LOADING_STEPS.length),
        LOADING_STEPS.length - 1
      ));
      if (elapsed >= TOTAL) {
        clearInterval(intervalRef.current!);
      }
    }, TICK);

    const timeout = setTimeout(() => {
      setPhase("result");
    }, TOTAL);

    return () => {
      clearInterval(intervalRef.current!);
      clearTimeout(timeout);
    };
  }, [phase]);

  const handleSubmit = () => {
    if (!idea.trim()) return;
    setCompetitor(generateCompetitor(idea));
    setPhase("loading");
    // 1 in 4 chance of paywall after loading
    if (Math.random() < 0.25) {
      setPaywallMsg(PAYWALL_MSGS[Math.floor(Math.random() * PAYWALL_MSGS.length)]);
      setShowPaywall(false);
      setPaywallXVisible(false);
      // show after loading finishes (2s) + tiny delay
      setTimeout(() => {
        setShowPaywall(true);
        setPaywallXVisible(false);
        setTimeout(() => setPaywallXVisible(true), 2000);
      }, 2100);
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setIdea("");
    setCompetitor(null);
    setProgress(0);
    setLoadingStep(0);
  };

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        background: C.bg,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "#ffffff",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 2rem",
          height: "56px",
        }}
      >
        <span
          style={{
            color: C.dark,
            fontWeight: 700,
            fontSize: "1rem",
            letterSpacing: "-0.01em",
          }}
        >
          Is my idea taken?
        </span>
        <span
          style={{
            color: "#9b9ba6",
            fontSize: "0.75rem",
            fontWeight: 400,
            letterSpacing: "0.02em",
          }}
        >
          uses the most advanced APIs for determine-ing
        </span>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 1rem",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid rgba(0,0,0,0.07)",
            boxShadow: "0 4px 32px rgba(52,46,55,0.07)",
            width: "100%",
            maxWidth: "520px",
            padding: "2.5rem",
            transition: "all 0.3s ease",
          }}
        >
          {/* ── IDLE / LOADING ─────────────────────────────────────────── */}
          {(phase === "idle" || phase === "loading") && (
            <>
              <label
                htmlFor="idea-input"
                style={{
                  display: "block",
                  color: C.dark,
                  fontWeight: 700,
                  fontSize: "1.125rem",
                  marginBottom: "1rem",
                  letterSpacing: "-0.01em",
                }}
              >
                Describe your idea
              </label>

              <input
                id="idea-input"
                type="text"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && phase === "idle" && handleSubmit()}
                placeholder="e.g. Uber for dog walkers"
                disabled={phase === "loading"}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  border: `1.5px solid ${phase === "loading" ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.12)"}`,
                  background: phase === "loading" ? "#f9f9fb" : "#fafffd",
                  color: C.dark,
                  fontSize: "0.95rem",
                  outline: "none",
                  marginBottom: "1rem",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => { if (phase === "idle") e.target.style.borderColor = C.blue; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(0,0,0,0.12)"; }}
              />

              {phase === "idle" ? (
                <button
                  onClick={handleSubmit}
                  disabled={!idea.trim()}
                  style={{
                    width: "100%",
                    padding: "0.8rem 1rem",
                    borderRadius: "10px",
                    border: "none",
                    background: idea.trim() ? C.dark : "#c8c5cc",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "0.95rem",
                    cursor: idea.trim() ? "pointer" : "not-allowed",
                    transition: "background 0.2s, transform 0.1s",
                    letterSpacing: "0.01em",
                  }}
                  onMouseEnter={(e) => { if (idea.trim()) (e.target as HTMLButtonElement).style.background = "#1e1a21"; }}
                  onMouseLeave={(e) => { if (idea.trim()) (e.target as HTMLButtonElement).style.background = C.dark; }}
                  onMouseDown={(e) => { if (idea.trim()) (e.target as HTMLButtonElement).style.transform = "scale(0.98)"; }}
                  onMouseUp={(e) => { (e.target as HTMLButtonElement).style.transform = "scale(1)"; }}
                >
                  Rate it →
                </button>
              ) : (
                /* ── Loading state ─────────────────────────────────────── */
                <div style={{ marginTop: "0.25rem" }}>
                  {/* Progress bar track */}
                  <div
                    style={{
                      width: "100%",
                      height: "5px",
                      background: "rgba(0,0,0,0.06)",
                      borderRadius: "99px",
                      overflow: "hidden",
                      marginBottom: "1rem",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${C.blue}, ${C.orange})`,
                        borderRadius: "99px",
                        transition: "width 0.04s linear",
                      }}
                    />
                  </div>

                  {/* Status text + dots */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    {/* Animated spinner dots */}
                    <div style={{ display: "flex", gap: "4px" }}>
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          style={{
                            display: "inline-block",
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: C.orange,
                            animation: `bounce 0.8s ease-in-out ${i * 0.16}s infinite`,
                          }}
                        />
                      ))}
                    </div>
                    <span
                      style={{
                        color: "#9b9ba6",
                        fontSize: "0.8rem",
                        fontWeight: 400,
                      }}
                    >
                      {LOADING_STEPS[loadingStep]}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── RESULT ─────────────────────────────────────────────────── */}
          {phase === "result" && competitor && (
            <div style={{ animation: "fadeIn 0.4s ease" }}>
              {/* Verdict label */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "rgba(250,130,76,0.1)",
                  border: `1px solid rgba(250,130,76,0.25)`,
                  borderRadius: "99px",
                  padding: "0.3rem 0.75rem",
                  marginBottom: "1.5rem",
                }}
              >
                <span
                  style={{
                    color: C.orange,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                  }}
                >
                  Sounds like it already exists.
                </span>
              </div>

              {/* Competitor name */}
              <h2
                style={{
                  color: C.dark,
                  fontSize: "2rem",
                  fontWeight: 800,
                  letterSpacing: "-0.03em",
                  margin: "0 0 0.25rem",
                  lineHeight: 1.1,
                }}
              >
                {competitor.name}
              </h2>

              {/* URL */}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                style={{
                  color: C.orange,
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  display: "inline-block",
                  marginBottom: "1.75rem",
                  borderBottom: `1px solid ${C.orange}33`,
                  paddingBottom: "1px",
                }}
              >
                {competitor.domain}
              </a>

              {/* Stats row */}
              <div
                style={{
                  display: "flex",
                  gap: "0",
                  borderTop: "1px solid rgba(0,0,0,0.07)",
                  borderBottom: "1px solid rgba(0,0,0,0.07)",
                  marginBottom: "1.75rem",
                }}
              >
                {[
                  { label: "Founded", value: String(competitor.founded) },
                  { label: "Raised", value: `${competitor.raised} ${competitor.round}` },
                  { label: "Status", value: competitor.status },
                ].map((stat, i, arr) => (
                  <div
                    key={stat.label}
                    style={{
                      flex: 1,
                      padding: "1rem 0.75rem",
                      borderRight: i < arr.length - 1 ? "1px solid rgba(0,0,0,0.07)" : "none",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#b0adb5",
                        fontSize: "0.65rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "0.3rem",
                      }}
                    >
                      {stat.label}
                    </div>
                    <div
                      style={{
                        color: C.dark,
                        fontSize: "0.85rem",
                        fontWeight: 600,
                      }}
                    >
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Score bar */}
              <div style={{ marginBottom: "1.75rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      color: "#b0adb5",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Originality Score
                  </span>
                  <span
                    style={{
                      color: competitor.score > 50 ? C.lime : C.orange,
                      fontSize: "0.85rem",
                      fontWeight: 700,
                    }}
                  >
                    {competitor.score}/100
                  </span>
                </div>
                <div
                  style={{
                    height: "6px",
                    background: "rgba(0,0,0,0.06)",
                    borderRadius: "99px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${competitor.score}%`,
                      background: competitor.score > 50
                        ? `linear-gradient(90deg, ${C.blue}, ${C.lime})`
                        : `linear-gradient(90deg, ${C.orange}, #fa4c4c)`,
                      borderRadius: "99px",
                      transition: "width 0.8s ease",
                    }}
                  />
                </div>
                <p
                  style={{
                    color: "#b0adb5",
                    fontSize: "0.72rem",
                    marginTop: "0.4rem",
                    fontStyle: "italic",
                  }}
                >
                  {competitor.score > 65
                    ? "There's still a niche — pivot fast."
                    : competitor.score > 40
                    ? "You'll need a strong differentiator."
                    : "Highly saturated space. Tread carefully."}
                </p>
              </div>

              {/* Reset link */}
              <button
                onClick={handleReset}
                style={{
                  background: "none",
                  border: "none",
                  color: "#b0adb5",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                  textUnderlineOffset: "3px",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.color = C.dark; }}
                onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.color = "#b0adb5"; }}
              >
                Try another idea
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer
        style={{
          textAlign: "center",
          padding: "1.5rem",
          color: "#c8c5cc",
          fontSize: "0.7rem",
        }}
      >
        All results are fictional and generated for entertainment only.
      </footer>

      {/* ── Keyframes ──────────────────────────────────────────────────── */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        input::placeholder { color: #c8c5cc; }
        input:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      {/* ── Paywall modal ───────────────────────────────────────────────── */}
      {showPaywall && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(52,46,55,0.55)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              padding: "2rem",
              maxWidth: "400px",
              width: "100%",
              boxShadow: "0 24px 64px rgba(52,46,55,0.18)",
              position: "relative",
              animation: "modalIn 0.3s ease",
            }}
          >
            {/* Close X — only visible after 2s */}
            <button
              onClick={() => setShowPaywall(false)}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                background: "rgba(0,0,0,0.06)",
                border: "none",
                borderRadius: "50%",
                width: "28px",
                height: "28px",
                cursor: paywallXVisible ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.85rem",
                color: C.dark,
                transition: "opacity 0.4s ease, background 0.2s",
                opacity: paywallXVisible ? 1 : 0,
                pointerEvents: paywallXVisible ? "auto" : "none",
                fontFamily: "inherit",
              }}
              aria-label="Close"
            >
              ✕
            </button>

            {/* Content */}
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>💸</div>
            <h3
              style={{
                color: C.dark,
                fontWeight: 700,
                fontSize: "1.05rem",
                marginBottom: "0.6rem",
                lineHeight: 1.3,
              }}
            >
              {paywallMsg.headline}
            </h3>
            <p
              style={{
                color: "#9b9ba6",
                fontSize: "0.82rem",
                lineHeight: 1.6,
                marginBottom: "1.5rem",
              }}
            >
              {paywallMsg.body}
            </p>
            <button
              onClick={() => setShowPaywall(false)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "10px",
                border: "none",
                background: C.dark,
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { (e.target as HTMLButtonElement).style.background = "#1e1a21"; }}
              onMouseLeave={(e) => { (e.target as HTMLButtonElement).style.background = C.dark; }}
            >
              Subscribe now
            </button>

            {/* Timer hint */}
            {!paywallXVisible && (
              <p style={{ textAlign: "center", color: "#c8c5cc", fontSize: "0.7rem", marginTop: "0.75rem" }}>
                close button appears in a moment…
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Watermark ───────────────────────────────────────────────────── */}
      <div
        style={{
          position: "fixed",
          bottom: "0.75rem",
          right: "1rem",
          color: "#d8d5db",
          fontSize: "0.65rem",
          letterSpacing: "0.04em",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        fowiohuu
      </div>
    </div>
  );
}