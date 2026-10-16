"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { APP_STORE_URL, CODE, factsLine, senderName, serviceName, countryName, yearAndRuntime, type FilmLink, type Reaction } from "@/lib/wsww-link";
import { DiscAvatar } from "./DiscAvatar";
import { LinkFrame, LinkUnavailable } from "./LinkStates";
import "@/styles/wsww-link.css";

/* wsww.app/f/<token>: a film someone sent, opened without the app. A 1:1 port of Claude Design's
   Taste together boards: 2 (S3 "Received without the app") for the film, the app's "How was it?"
   sheet for Seen it, and 8's redraws for what follows: S3 after Keep it in the app (the code,
   copied) and X10 after Seen it (told, or "Kept to you." after Not for me). Answers go through this
   site's /api/links/ routes. The only thing this page keeps is a random id in localStorage, sent
   as webId so one browser's answers stay one answer. No cookies, no analytics. */

type View = { kind: "film" } | { kind: "told"; reaction: Reaction; code: string } | { kind: "kept"; code: string; copied: boolean } | { kind: "gone" };
type Answer = { ok: true; code: string } | { ok: false; error: "gone" | "slow" | "down" };

// Not drawn for this page yet (design-gaps-web.md, 9): the waitlist's lines for the same failures.
const ERR_SLOW = "Easy. Give it a minute and try again.";
const ERR_DOWN = "I couldn’t confirm that. Try again in a minute.";

const WEB_ID_KEY = "wsww-web-id";
let memoryId: string | null = null;
function webId(): string {
  const fresh = () => {
    const b = crypto.getRandomValues(new Uint8Array(16));
    return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  try {
    let id = localStorage.getItem(WEB_ID_KEY);
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      id = fresh();
      localStorage.setItem(WEB_ID_KEY, id);
    }
    return id;
  } catch {
    // Storage blocked (private mode, settings): one id for as long as the page is open.
    return (memoryId ??= fresh());
  }
}

async function answer(token: string, action: "react" | "keep", body: Record<string, string>): Promise<Answer> {
  try {
    // The token goes in the body, never in a URL that a request log would keep.
    const res = await fetch(`/api/links/${action}/`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, token, webId: webId() }), cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as { code?: unknown };
    if (res.ok && typeof data.code === "string" && CODE.test(data.code)) return { ok: true, code: data.code };
    if (res.status === 404) return { ok: false, error: "gone" };
    return { ok: false, error: res.status === 429 ? "slow" : "down" };
  } catch {
    return { ok: false, error: "down" };
  }
}

/* The clipboard needs the person's tap. Safari only allows a write inside the tap itself, so the
   write starts now with a promise of the text (ClipboardItem); other browsers fall back to
   writing once the code is back, still within the tap's grace period. */
async function copyWhenReady(code: Promise<string | null>): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      const blob = code.then((c) => {
        if (!c) throw new Error("no code");
        return new Blob([c], { type: "text/plain" });
      });
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
      return true;
    }
  } catch {}
  try {
    const c = await code;
    if (!c) return false;
    await navigator.clipboard.writeText(c);
    return true;
  } catch {
    return false;
  }
}

function Poster({ link }: { link: FilmLink }) {
  return (
    <span className="wsl-poster">
      {link.film.posterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- the API's poster URL, shown as is (no optimiser fetching it with the page's URL)
        <img src={link.film.posterUrl} alt="" width={120} height={180} referrerPolicy="no-referrer" fetchPriority="high" />
      ) : (
        <span>{link.film.title}</span>
      )}
    </span>
  );
}

export function FilmLinkView({ token, link }: { token: string; link: FilmLink }) {
  const [view, setView] = useState<View>({ kind: "film" });
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seenRef = useRef<HTMLButtonElement>(null);
  const sheetFirst = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const name = senderName(link);
  const { film } = link;
  const service = serviceName(film.service);
  const watchUrl = service ? film.link : null;

  const fail = useCallback((e: "gone" | "slow" | "down") => {
    if (e === "gone") return setView({ kind: "gone" });
    setError(e === "slow" ? ERR_SLOW : ERR_DOWN);
  }, []);

  const react = async (reaction: Reaction) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await answer(token, "react", { reaction });
    setBusy(false);
    if (!r.ok) return fail(r.error);
    setSheet(false);
    setView({ kind: "told", reaction, code: r.code });
  };

  const keep = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const pending = answer(token, "keep", {});
    const copied = copyWhenReady(pending.then((r) => (r.ok ? r.code : null)));
    const r = await pending;
    if (!r.ok) {
      setBusy(false);
      return fail(r.error);
    }
    const didCopy = await copied;
    setBusy(false);
    setView({ kind: "kept", code: r.code, copied: didCopy });
  };

  // Each new state moves focus to its heading, so a screen reader hears what changed.
  useEffect(() => {
    if (view.kind !== "film") headingRef.current?.focus();
  }, [view]);

  useEffect(() => {
    if (!sheet) return;
    sheetFirst.current?.focus();
    const seen = seenRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheet(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      seen?.focus();
    };
  }, [sheet]);

  if (view.kind === "gone") return <LinkUnavailable />;

  if (view.kind === "kept") {
    return (
      <LinkFrame>
        <div className="wsl-kept">
          <Poster link={link} />
          <span className="wsl-kept-facts">
            <span className="wsl-micro">From {name}</span>
            <h1 className="wsl-display-m" ref={headingRef} tabIndex={-1}>{film.title}</h1>
            <p className="wsl-kept-meta">{factsLine(link)}</p>
            {link.note && <p className="wsl-kept-note">“{link.note}”</p>}
          </span>
        </div>
        <section className="wsl-code" aria-label="Your code">
          <span className="wsl-micro">{view.copied ? "Your code · copied" : "Your code"}</span>
          <span className="wsl-code-value">{view.code}</span>
          <p className="wsl-code-text">
            {view.copied ? "It’s on your clipboard and good for 24 hours." : "It’s good for 24 hours."} Get the app, paste or type it on the first screen, and this film is already waiting. Or just tap {name}’s link again once the app is on your phone.
          </p>
        </section>
        <div className="wsl-bottom">
          <a className="wsl-btn wsl-btn--primary" href={APP_STORE_URL}>Get the app</a>
          {watchUrl && <a className="wsl-btn wsl-btn--tertiary" href={watchUrl} rel="noopener noreferrer">Open {service} instead</a>}
        </div>
      </LinkFrame>
    );
  }

  if (view.kind === "told") {
    const title = view.reaction === "liked" ? `Told ${name} you liked it.` : view.reaction === "okay" ? `Told ${name} it was okay.` : "Kept to you.";
    const body =
      view.reaction === "liked" ? `That’s all ${name} hears: watched, and liked it. Nothing else about you.`
      : view.reaction === "okay" ? `That’s all ${name} hears: watched, and it was okay. Nothing else about you.`
      : `${name} only hears about the films you liked.`;
    const code = view.code;
    return (
      <LinkFrame>
        <h1 className="wsl-display-l wsl-told" ref={headingRef} tabIndex={-1}>{title}</h1>
        <p className="wsl-told-body">{body}</p>
        <section className="wsl-code" aria-label="Your code">
          <span className="wsl-micro">Keep this in the app · your code</span>
          <span className="wsl-code-value">{code}</span>
          <p className="wsl-code-text">
            Paste or type it on the app’s first screen and {film.title} is in your Watched list, {view.reaction === "liked" ? "liked, " : ""}with {name} as the one who sent it.
          </p>
        </section>
        <div className="wsl-bottom">
          {/* The link itself goes to the store; the tap is what lets the page write the clipboard. */}
          <a className="wsl-btn wsl-btn--primary" href={APP_STORE_URL} onClick={() => void navigator.clipboard?.writeText(code).catch(() => {})}>Copy the code and get the app</a>
          <button type="button" className="wsl-btn wsl-btn--tertiary" onClick={() => setView({ kind: "film" })}>Done</button>
        </div>
      </LinkFrame>
    );
  }

  const where = service ? `On ${service} in ${countryName(link.country)} tonight.` : null;
  return (
    <LinkFrame>
      <div className="wsl-recv">
        <div className="wsl-from">
          <DiscAvatar avatar={link.from.avatar} size={36} label={name} />
          <h1 className="wsl-display-m">{name} sent you {film.title}</h1>
        </div>
        <div className="wsl-film">
          <Poster link={link} />
          <div className="wsl-facts">
            <p className="wsl-caption">{yearAndRuntime(film)}</p>
            {where && <p className="wsl-body">{where}</p>}
            {link.note && <p className="wsl-note">“{link.note}”</p>}
          </div>
        </div>
        <div className="wsl-actions">
          {watchUrl && <a className="wsl-btn wsl-btn--primary" href={watchUrl} rel="noopener noreferrer">Open {service}</a>}
          <button ref={seenRef} type="button" className="wsl-btn wsl-btn--secondary" onClick={() => { setError(null); setSheet(true); }} disabled={busy}>Seen it</button>
          <button type="button" className="wsl-btn wsl-btn--tertiary" onClick={keep} disabled={busy} aria-busy={busy}>Keep it in the app</button>
          {error && !sheet && <p className="wsl-error" role="status">{error}</p>}
        </div>
        <p className="wsl-foot">Nothing here reaches {name} unless you tap Seen it. Get the app and this film is already waiting on your shortlist.</p>
      </div>
      {sheet && (
        <>
          <div className="wsl-scrim" onClick={() => !busy && setSheet(false)} aria-hidden="true" />
          <div className="wsl-sheet" role="dialog" aria-modal="true" aria-labelledby="wsl-how">
            <span className="wsl-grabber" aria-hidden="true" />
            <h2 id="wsl-how" className="wsl-display-m">How was it?</h2>
            <button ref={sheetFirst} type="button" className="wsl-btn wsl-btn--primary wsl-btn--sheet" onClick={() => react("liked")} disabled={busy}>Liked it</button>
            <button type="button" className="wsl-btn wsl-btn--secondary wsl-btn--sheet" onClick={() => react("okay")} disabled={busy}>It was okay</button>
            <button type="button" className="wsl-btn wsl-btn--secondary wsl-btn--sheet" onClick={() => react("not_for_me")} disabled={busy}>Not for me</button>
            {error ? <p className="wsl-error" role="status">{error}</p> : <p className="wsl-foot">{name} hears the first two. The third stays with you.</p>}
          </div>
        </>
      )}
    </LinkFrame>
  );
}
