/* Shown the moment /admin/ is opened, while the owner check runs; the panels then stream in one by one. */
export default function Loading() {
  return (
    <section className="admin" aria-busy="true" aria-label="Loading admin">
      <div className="section__head">
        <h1 className="page-head__title">Admin</h1>
        <span className="muted">Waking the APIs…</span>
      </div>
      <div className="admin__grid">
        {[true, true, false, false].map((wide, i) => (
          <div key={i} className={`panel ${wide ? "admin__wide" : ""}`}>
            <span className="skel" style={{ height: 20, width: "40%" }} />
            <span className="skel" style={{ height: 32, width: "30%" }} />
            {[88, 74, 80].map((w) => <span key={w} className="skel" style={{ height: 18, width: `${w}%` }} />)}
          </div>
        ))}
      </div>
    </section>
  );
}
