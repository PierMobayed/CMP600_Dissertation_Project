import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "../ThemeToggle";

const JOURNEY = [
  { n: 1, title: "Sign in", desc: "Driver account (driver1 / demo)" },
  { n: 2, title: "Your run", desc: "Ordered queue — collect then deliver" },
  { n: 3, title: "Navigate", desc: "Open Google Maps or Waze per leg" },
  { n: 4, title: "Stops", desc: "Mark picked up, in transit, delivered" },
  { n: 5, title: "Live sync", desc: "GPS to office dashboard map" },
] as const;

type Props = {
  onSignIn: () => void;
};

export function LandingScreen({ onSignIn }: Props) {
  return (
    <div className="app-landing app-landing--driver">
      <div className="app-landing-bg" aria-hidden />
      <header className="app-landing-top">
        <span className="app-landing-brand">
          <BrandMark />
          Door2Door Driver
        </span>
        <ThemeToggle />
      </header>

      <main className="app-landing-main">
        <section className="app-landing-hero">
          <p className="app-landing-eyebrow">Courier workspace · CMP600 prototype</p>
          <h1>
            Your route, your stops —
            <span className="app-landing-accent"> door-to-door on the map</span>
          </h1>
          <p className="app-landing-lead">
            Run today&apos;s parcels with numbered map pins, route summary, and one-tap navigation.
            The office dashboard sees your position in real time (simulated).
          </p>
          <div className="app-landing-cta">
            <button type="button" className="app-landing-btn app-landing-btn--primary" onClick={onSignIn}>
              Sign in to driver app
            </button>
          </div>
          <ul className="app-landing-pills">
            <li>Map + list views</li>
            <li>Optimise route (simulated)</li>
            <li>Works on mobile web</li>
          </ul>
        </section>

        <section className="app-landing-journey" aria-labelledby="driver-journey-title">
          <h2 id="driver-journey-title">Daily workflow</h2>
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
