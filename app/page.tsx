"use client";

import { FormEvent, useState } from "react";

type ReviewState = "approved" | "rejected" | null;

const mockTitles = [
  "Personalized Dog Memorial Ornament with Photo & Name",
  "Custom Pet Memorial Christmas Ornament for Dog Lovers",
  "Forever in My Heart Personalized Dog Photo Ornament",
  "In Loving Memory Custom Dog Keepsake Christmas Ornament",
  "Personalized Rainbow Bridge Dog Memorial Ornament",
];

const fields = [
  ["Product Description", "Personalized memorial ornament featuring a customer's dog photo and name."],
  ["Product Line", "Ornament"],
  ["Product Theme", "Memorial"],
  ["Recipient", "Pet Owner"],
  ["Occasion", "Christmas"],
  ["Niche / Interest", "Dog Lovers"],
];

function AppHeader() {
  return (
    <header className="border-b border-hairline bg-white">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8">
        <div className="flex items-baseline gap-3">
          <span className="text-[17px] font-semibold tracking-[-0.02em]">GROW</span>
          <span className="hidden text-sm text-secondary sm:inline">Product Title Agent</span>
        </div>
        <span className="rounded-full bg-aloe px-3 py-1.5 text-[13px] font-medium">0 lessons learned</span>
      </div>
    </header>
  );
}

function ProductForm({ onGenerate }: { onGenerate: () => void }) {
  return (
    <section className="workspace-panel pb-8 lg:pr-8">
      <h2 className="section-title">Product context</h2>
      <p className="section-caption">Give the agent enough context to understand the product.</p>
      <form className="mt-6 space-y-4" onSubmit={(event) => { event.preventDefault(); onGenerate(); }}>
        {fields.map(([label, value], index) => (
          <label className="block" key={label}>
            <span className="mb-2 block text-[13px] font-medium">{label}</span>
            {index === 0 ? (
              <textarea className="field min-h-24 resize-y" defaultValue={value} />
            ) : (
              <input className="field" defaultValue={value} />
            )}
          </label>
        ))}
        <button className="button-primary mt-2 w-full" type="submit">
          <Sparkle /> Generate titles
        </button>
      </form>
    </section>
  );
}

function Sparkle() {
  return <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16"><path d="M8 1.5c.42 3.4 2.1 5.08 5.5 5.5C10.1 7.42 8.42 9.1 8 12.5 7.58 9.1 5.9 7.42 2.5 7 5.9 6.58 7.58 4.9 8 1.5Z" stroke="currentColor" strokeLinejoin="round"/><path d="M3.5 11c.16 1.26.74 1.84 2 2-1.26.16-1.84.74-2 2-.16-1.26-.74-1.84-2-2 1.26-.16 1.84-.74 2-2Z" fill="currentColor"/></svg>;
}

function FeedbackBox({ state }: { state: Exclude<ReviewState, null> }) {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) return (
    <div className="mt-4 flex gap-3 rounded-lg bg-pistachio/70 p-4" role="status">
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-black" />
      <div><p className="text-sm font-medium">Feedback captured</p><p className="mt-0.5 text-[13px] text-secondary">Learning will be added in the next milestone.</p></div>
    </div>
  );
  return (
    <form className="mt-4 border-t border-hairline pt-4" onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}>
      <label className="text-[13px] font-medium" htmlFor={`feedback-${state}`}>Why?</label>
      <textarea id={`feedback-${state}`} className="field mt-2 min-h-20 resize-y" placeholder="Tell the agent what worked or what should change..." required />
      <button className="button-secondary mt-3" type="submit">Submit feedback</button>
    </form>
  );
}

function TitleCard({ title, index }: { title: string; index: number }) {
  const [review, setReview] = useState<ReviewState>(null);
  const [editing, setEditing] = useState(false);
  const [savedTitle, setSavedTitle] = useState(title);
  const [draft, setDraft] = useState(title);
  const save = () => { if (draft.trim()) { setSavedTitle(draft.trim()); setEditing(false); } };

  return (
    <article className="rounded-xl border border-hairline bg-white p-4 sm:p-5">
      <div className="flex gap-4">
        <span className="pt-0.5 text-xs tracking-[0.06em] text-tertiary">{String(index + 1).padStart(2, "0")}</span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div>
              <input aria-label="Edit generated title" autoFocus className="field font-medium" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
              <div className="mt-3 flex flex-wrap gap-2"><button className="button-primary button-small" onClick={save} type="button">Save edit</button><button className="button-ghost button-small" onClick={() => { setDraft(savedTitle); setEditing(false); }} type="button">Cancel</button></div>
            </div>
          ) : (
            <p className="leading-6 font-medium">{savedTitle}</p>
          )}
        </div>
      </div>
      {!editing && <div className="mt-5 flex flex-wrap gap-2 pl-0 sm:pl-8">
        <button aria-pressed={review === "approved"} className={review === "approved" ? "button-primary button-small" : "button-ghost button-small"} onClick={() => setReview(review === "approved" ? null : "approved")} type="button">Approve</button>
        <button className="button-ghost button-small border-black" onClick={() => setEditing(true)} type="button">Edit</button>
        <button aria-pressed={review === "rejected"} className={review === "rejected" ? "button-primary button-small" : "button-ghost button-small"} onClick={() => setReview(review === "rejected" ? null : "rejected")} type="button">Reject</button>
      </div>}
      {review && !editing && <div className="sm:pl-8"><FeedbackBox key={review} state={review} /></div>}
    </article>
  );
}

function TitleList({ generated }: { generated: boolean }) {
  return (
    <section className="workspace-panel border-hairline py-8 md:border-l md:pl-8 lg:border-r lg:px-8 lg:py-0">
      <div className="flex items-center justify-between gap-4">
        <h2 className="section-title">Generated titles</h2>
        <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-secondary">AI Generated</span>
      </div>
      {!generated ? (
        <div className="flex min-h-64 items-center justify-center border-b border-t border-hairline py-12 text-center md:min-h-[430px]">
          <div><p className="font-medium">Ready when you are.</p><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-secondary">Add your product context and generate your first set of titles.</p></div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">{mockTitles.map((title, index) => <TitleCard index={index} key={title} title={title} />)}</div>
      )}
    </section>
  );
}

function MemoryPanel() {
  return (
    <aside className="workspace-panel border-t border-hairline pt-8 md:col-span-2 lg:col-span-1 lg:border-t-0 lg:pl-8 lg:pt-0">
      <div className="flex items-center justify-between"><h2 className="section-title">Team Memory</h2><span className="rounded-full bg-aloe px-3 py-1.5 text-[11px] tracking-[0.06em]">MEMORY</span></div>
      <div className="mt-7 border-b border-hairline pb-7"><p className="text-5xl font-light tracking-[-0.04em]">0</p><p className="mt-1 text-sm text-secondary">Lessons learned</p></div>
      <div className="py-7"><h3 className="font-medium">Nothing learned yet</h3><p className="mt-2 text-sm leading-6 text-secondary">Your feedback will become reusable lessons here.</p></div>
      <div className="rounded-xl bg-pistachio/45 p-4"><h3 className="text-sm font-medium">Relevant memories</h3><p className="mt-2 text-[13px] leading-5 text-secondary">No relevant memories for this product yet.</p></div>
    </aside>
  );
}

export default function Home() {
  const [generated, setGenerated] = useState(false);
  return (
    <><AppHeader /><main className="mx-auto max-w-[1440px] px-5 pb-16 sm:px-8">
      <div className="pb-8 pt-10 sm:pt-12">
        <p className="text-xs tracking-[0.06em] text-secondary">PRODUCT TITLE AGENT</p>
        <h1 className="mt-3 max-w-2xl text-[32px] font-light leading-[1.12] tracking-[-0.025em] sm:text-[38px]">Create better titles,<br />one feedback at a time.</h1>
        <p className="mt-4 max-w-lg text-[15px] leading-6 text-secondary">Generate product titles, review the results,<br className="hidden sm:block" /> and teach the agent what your team prefers.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(240px,0.75fr)_minmax(0,1.5fr)] lg:grid-cols-[minmax(230px,0.85fr)_minmax(440px,1.45fr)_minmax(220px,0.75fr)]">
        <ProductForm onGenerate={() => setGenerated(true)} /><TitleList generated={generated} /><MemoryPanel />
      </div>
    </main></>
  );
}
