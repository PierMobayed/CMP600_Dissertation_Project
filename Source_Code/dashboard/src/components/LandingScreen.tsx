import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "../ThemeToggle";

const JOURNEY = [
  { n: 1, title: "Sign in", desc: "Office dispatcher account (admin)" },
  { n: 2, title: "Overview", desc: "KPIs — total, in transit, delivered, delayed" },
  { n: 3, title: "Live map", desc: "Drivers and shipments on one view" },
  { n: 4, title: "Dispatch", desc: "Assign drivers, filters, delivery dates" },
  { n: 5, title: "Simulate", desc: "GPS and status simulation for Viva demo" },
] as const;

type Props = {
  onSignIn: () => void;
};

export function LandingScreen({ onSignIn }: Props) {
  return (
    <div className="app-landing app-landing--dashboard">
      <div className="app-landing-bg" aria-hidden />
      <header className="app-landing-top">
        <span className="app-landing-brand">
          <BrandMark />
          Door2Door Ops
        </span>
        <ThemeToggle />
      </header>

      <main className="app-landing-main">
        <section className="app-landing-hero">
          <p className="app-landing-eyebrow">Office operations · CMP600 prototype</p>
          <h1>
            Fleet visibility for dispatch —
            <span className="app-landing-accent"> map, KPIs, and live control</span>
          </h1>
          <p className="app-landing-lead">
            Monitor simulated London door-to-door logistics: assign drivers, watch GPS updates, and
            respond to delayed shipments from one dashboard.
          </p>
          <div className="app-landing-cta">
            <button type="button" className="app-landing-btn app-landing-btn--primary" onClick={onSignIn}>
              Sign in to dashboard
            </button>
          </div>
          <ul className="app-landing-pills">
            <li>Live KPI refresh</li>
            <li>Map + dispatch table</li>
            <li>Simulated data only</li>
          </ul>
        </section>

        <section className="app-landing-journey" aria-labelledby="dash-journey-title">
          <h2 id="dash-journey-title">What you can do</h2>
          <ol className="app-landing-steps">
            {JOURNEY.map((s) => (
              <li key={s.n} className="app-landing-step-card">
                <span className="app-landing-step-num">{s.n}</span>
                <div>
                  <strong>{s.title}</strong>
                  <p>{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <button type="button" className="app-landing-link" onClick={onSignIn}>
            Sign in to get started →
          </button>
        </section>
      </main>

      <p className="app-footer-note">CMP600 dissertation prototype · Door2Door · simulated data</p>
    </div>
  );
}
