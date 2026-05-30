/**
 * AboutSection — lazy loaded (below the fold)
 * OPTIMIZATION: ~8 KB of HTML+logic never blocks initial paint
 */
import React, { memo } from "react";

const ScanIcon = memo(() => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="1.5" width="16" height="16">
    <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
    <line x1="7" y1="12" x2="17" y2="12"/>
  </svg>
));

const TYPES = [
  { name: "Esotropia",   dir: "inward ←",   note: "most common in children" },
  { name: "Exotropia",   dir: "outward →",   note: "often intermittent" },
  { name: "Hypertropia", dir: "upward ↑",    note: "vertical misalignment" },
  { name: "Hypotropia",  dir: "downward ↓",  note: "vertical misalignment" },
];

const TypeCard = memo(function TypeCard({ name, dir, note }) {
  return (
    <div className="type-card">
      <div className="type-name">{name}</div>
      <div className="type-dir">{dir}</div>
      <div className="type-note">{note}</div>
    </div>
  );
});

export default function AboutSection() {
  return (
    <section className="about-section" id="about" aria-labelledby="about-heading">
      <div className="about-grid">
        <div className="about-text">
          <p className="section-tag" aria-hidden="true">ABOUT STRABISMUS</p>
          <h2 className="about-heading" id="about-heading">
            What is<br /><em>Strabismus?</em>
          </h2>
          <p className="about-body">
            Strabismus (crossed eyes) is a condition where both eyes do not
            look at the same point simultaneously. One eye may deviate inward,
            outward, upward, or downward while the other fixates normally.
          </p>
          <p className="about-body">
            Left untreated, strabismus can lead to <strong>amblyopia</strong> (lazy eye)
            or permanent vision loss. Early detection — especially in children —
            significantly improves treatment outcomes.
          </p>
          <div className="about-note" role="note">
            <ScanIcon />
            <span>This AI tool is a screening aid, not a substitute for clinical examination.</span>
          </div>
        </div>

        <div className="types-grid" aria-label="Types of strabismus">
          {TYPES.map(t => <TypeCard key={t.name} {...t} />)}
        </div>
      </div>
    </section>
  );
}
