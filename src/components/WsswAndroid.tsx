"use client";
import { useRef, useState, type FormEvent } from "react";
import { checkTesterEmail } from "@/lib/android-testers";
import "@/styles/wsww-android.css";

/* wsww.app/android, a port of Claude Design's marketing/social/AndroidSignup.dc.html (board: marketing/
   social/Android testers). Everything the person agrees to comes before the field, and what happens to
   the email sits between the field and the button. DESIGN-GAP: the board didn't draw the server-failure
   state; it says to follow "Not you, us." */
const ERR = {
  empty: "Type the email on your Google Play account first.",
  invalid: "That isn’t a full email address yet. It needs an @ and a domain, like name@gmail.com.",
  server: "Not you, us. That didn’t save. Try again in a minute.",
  busy: "That’s a lot of tries. Give it a minute.",
} as const;
type Err = keyof typeof ERR | "typo" | null;

function Disco({ size, pleased }: { size: number; pleased?: boolean }) {
  const scale = size / 100;
  const discs = (
    <>
      <i className="ta-d ta-d1" /><i className="ta-d ta-d2" /><i className="ta-d ta-d3" />
      {pleased ? (
        <><i className="ta-eye-up" style={{ left: 39.75 }} /><i className="ta-eye-up" style={{ left: 52.75 }} /><i className="ta-grin" /></>
      ) : (
        <><i className="ta-eye" style={{ left: 39.75 }} /><i className="ta-eye" style={{ left: 52.75 }} /><i className="ta-smile" /></>
      )}
    </>
  );
  return (
    <span className="ta-disco" aria-hidden={pleased ? undefined : true} role={pleased ? "img" : undefined} aria-label={pleased ? "Disco, pleased" : undefined} style={{ width: size, height: size }}>
      <span className="ta-stage" style={{ transform: `scale(${scale})` }}>{pleased ? <span className="ta-hop">{discs}</span> : discs}</span>
    </span>
  );
}

export function WsswAndroid() {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState<Err>(null);
  const [fixed, setFixed] = useState("");
  const [phase, setPhase] = useState<"form" | "busy" | "done">("form");
  const input = useRef<HTMLInputElement>(null);
  const trap = useRef<HTMLInputElement>(null);
  const busy = phase === "busy";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const problem = checkTesterEmail(email);
    if (problem) {
      setErr(problem.err);
      setFixed(problem.err === "typo" ? problem.fixed : "");
      input.current?.focus();
      return;
    }
    const clean = email.trim();
    setEmail(clean);
    setPhase("busy");
    try {
      const res = await fetch("/api/android-testers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: clean, website: trap.current?.value || "" }),
      });
      if (!res.ok) throw res.status;
      setPhase("done");
      window.scrollTo(0, 0);
    } catch (status) {
      setErr(status === 429 ? "busy" : "server");
      setPhase("form");
      requestAnimationFrame(() => input.current?.focus());
    }
  };

  return (
    <div className="ta">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600&family=Figtree:wght@400;500;600&display=swap" />
      <header className="ta-head">
        <a className="ta-brand" href="https://wsww.app/"><Disco size={28} />What Should We Watch</a>
      </header>
      <div className="ta-main">
        {phase === "done" ? (
          <div className="ta-done" role="status">
            <Disco size={72} pleased />
            <div className="ta-intro">
              <h1>Thanks. You’re on the list.</h1>
              <p className="ta-lead">I add <b>{email}</b> by hand, so it can take up to a day. Then the test link comes by email. Open it on your phone, tap Become a tester, and stay in for 14 days.</p>
            </div>
            <button type="button" className="ta-again" onClick={() => { setErr(null); setPhase("form"); }}>Typed it wrong? Change it</button>
          </div>
        ) : (
          <div className="ta-stack">
            <div className="ta-intro">
              <h1>Could you help my app onto Google Play?</h1>
              <p className="ta-lead">Tell it how tonight feels and get ten films on your services tonight. Google keeps it private until 12 testers stay in its test for 14 days in a row, and Play needs your email to let you in.</p>
            </div>
            <ul className="ta-need" aria-label="You’ll need">
              <li>An Android phone</li>
              <li>To be in the US, India or the UK</li>
              <li>To stay in for 14 days</li>
              <li>Patience. It’s still rough.</li>
            </ul>
            <form className="ta-form" onSubmit={submit} noValidate>
              <label className="ta-label" htmlFor="ta-email">Email on your Google Play account</label>
              <span className="ta-hint" id="ta-hint">Usually your Gmail.</span>
              <input
                id="ta-email" ref={input} className="ta-input" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                placeholder="name@gmail.com" value={email} disabled={busy} aria-invalid={!!err} aria-describedby="ta-hint ta-err ta-use"
                onChange={(e) => { setEmail(e.target.value); setErr(null); }}
              />
              <input ref={trap} className="ta-trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
              <div className="ta-err" id="ta-err" role="alert">
                {err === "typo" ? (
                  <>
                    <span>Did you mean {fixed}? Google Play needs it exactly right.</span>
                    <button type="button" className="ta-fix" onClick={() => { setEmail(fixed); setErr(null); }}>Use {fixed}</button>
                  </>
                ) : err ? <span>{ERR[err]}</span> : null}
              </div>
              <p className="ta-use" id="ta-use">Only used to add you to the test and send you the link. No marketing. To be removed, email <a href="mailto:wsww.app@gmail.com?subject=Take%20me%20off%20the%20Android%20test">wsww.app@gmail.com</a>. <a href="https://wsww.app/privacy/">Privacy policy</a></p>
              <button type="submit" className="ta-go" disabled={busy} aria-busy={busy}>{busy ? "Adding you…" : "Add me to the test"}</button>
            </form>
          </div>
        )}
      </div>
      <footer className="ta-foot">
        <span>What Should We Watch is an app by Manali.</span>
        <nav>
          <a href="https://wsww.app/privacy/">Privacy</a>
          <a href="https://wsww.app/support/">Support</a>
        </nav>
      </footer>
    </div>
  );
}
