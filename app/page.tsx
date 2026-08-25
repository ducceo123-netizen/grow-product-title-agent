"use client";

import { FormEvent, useState } from "react";
import type { ApiErrorResponse, GeneratedTitle, GenerateResponse, LearnResponse, Lesson, ProductContext, ReviewAction } from "@/lib/types";

type ReviewState = ReviewAction | null;

const fields = [
  ["Product Description", "productDescription", "Personalized memorial ornament featuring a customer's dog photo and name."],
  ["Product Line", "productLine", "Ornament"],
  ["Product Theme", "productTheme", "Memorial"],
  ["Recipient", "recipient", "Pet Owner"],
  ["Occasion", "occasion", "Christmas"],
  ["Niche / Interest", "niche", "Dog Lovers"],
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

function ProductForm({ onGenerate, loading, error }: { onGenerate: (context: ProductContext) => Promise<void>; loading: boolean; error: string | null }) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void onGenerate({
      productDescription: String(data.get("productDescription") || ""),
      productLine: String(data.get("productLine") || ""),
      productTheme: String(data.get("productTheme") || ""),
      recipient: String(data.get("recipient") || ""),
      occasion: String(data.get("occasion") || ""),
      niche: String(data.get("niche") || ""),
    });
  };

  return (
    <section className="workspace-panel pb-8 lg:pr-8">
      <h2 className="section-title">Product context</h2>
      <p className="section-caption">Give the agent enough context to understand the product.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        {fields.map(([label, name, value], index) => (
          <label className="block" key={label}>
            <span className="mb-2 block text-[13px] font-medium">{label}</span>
            {index === 0 ? (
              <textarea className="field min-h-24 resize-y" defaultValue={value} name={name} />
            ) : (
              <input className="field" defaultValue={value} name={name} />
            )}
          </label>
        ))}
        <button className="button-primary mt-2 w-full disabled:cursor-not-allowed disabled:bg-zinc-500" disabled={loading} type="submit">
          {loading ? <><LoadingSpinner /> Generating...</> : <><Sparkle /> Generate titles</>}
        </button>
        {error && <p className="text-[13px] leading-5 text-secondary" role="alert">{error}</p>}
      </form>
    </section>
  );
}

function LoadingSpinner() {
  return <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border border-white/40 border-t-white" />;
}

function Sparkle() {
  return <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16"><path d="M8 1.5c.42 3.4 2.1 5.08 5.5 5.5C10.1 7.42 8.42 9.1 8 12.5 7.58 9.1 5.9 7.42 2.5 7 5.9 6.58 7.58 4.9 8 1.5Z" stroke="currentColor" strokeLinejoin="round"/><path d="M3.5 11c.16 1.26.74 1.84 2 2-1.26.16-1.84.74-2 2-.16-1.26-.74-1.84-2-2 1.26-.16 1.84-.74 2-2Z" fill="currentColor"/></svg>;
}

function LessonView({ lesson }: { lesson: Lesson }) {
  return <div className="mt-4 rounded-xl border border-aloe bg-pistachio/45 p-4 sm:p-5" role="status">
    <p className="text-[11px] font-medium tracking-[0.06em]">NEW LESSON LEARNED</p>
    <div className="mt-4 space-y-4 text-sm">
      <div><p className="text-xs font-medium tracking-[0.04em] text-secondary">CONTEXT</p><p className="mt-1">{lesson.context}</p></div>
      <div><p className="text-xs font-medium tracking-[0.04em] text-secondary">DO</p><ul className="mt-1.5 space-y-1">{lesson.do.map((rule) => <li className="flex gap-2" key={rule}><span aria-hidden="true">✓</span><span>{rule}</span></li>)}</ul></div>
      {lesson.dont.length > 0 && <div><p className="text-xs font-medium tracking-[0.04em] text-secondary">DON&apos;T</p><ul className="mt-1.5 space-y-1">{lesson.dont.map((rule) => <li className="flex gap-2" key={rule}><span aria-hidden="true">×</span><span>{rule}</span></li>)}</ul></div>}
      <div><p className="text-xs font-medium tracking-[0.04em] text-secondary">WHY</p><p className="mt-1 leading-5">{lesson.reason}</p></div>
      {(lesson.goodExample || lesson.badExample) && <div className="grid gap-3 border-t border-hairline pt-4 sm:grid-cols-2">
        {lesson.goodExample && <div><p className="text-xs font-medium text-secondary">Good example</p><p className="mt-1 leading-5">{lesson.goodExample}</p></div>}
        {lesson.badExample && <div><p className="text-xs font-medium text-secondary">Bad example</p><p className="mt-1 leading-5">{lesson.badExample}</p></div>}
      </div>}
      <div className="flex items-center justify-between border-t border-hairline pt-3"><span className="text-xs font-medium text-secondary">Confidence</span><span className="rounded-full bg-aloe px-3 py-1 text-xs font-medium">{Math.round(lesson.confidence * 100)}%</span></div>
    </div>
  </div>;
}

function FeedbackBox({ state, productContext, originalTitle, editedTitle }: { state: Exclude<ReviewState, null>; productContext: ProductContext; originalTitle: string; editedTitle?: string }) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [learning, setLearning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (lesson) return <LessonView lesson={lesson} />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const reason = String(data.get("reason") || "").trim();
    setError(null);
    if (!reason) {
      setError("Tell the agent why before submitting feedback.");
      return;
    }
    setLearning(true);
    try {
      const response = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productContext, review: { action: state, originalTitle, ...(state === "edit" ? { editedTitle } : {}), reason } }),
      });
      const result = (await response.json()) as LearnResponse | ApiErrorResponse;
      if (!response.ok || "error" in result) throw new Error("error" in result ? result.error : "Learning failed.");
      setLesson(result.lesson);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Network error. Please try again.");
    } finally {
      setLearning(false);
    }
  };

  return (
    <form className="mt-4 border-t border-hairline pt-4" onSubmit={submit}>
      <label className="text-[13px] font-medium" htmlFor={`feedback-${state}`}>Why?</label>
      <textarea id={`feedback-${state}`} name="reason" className="field mt-2 min-h-20 resize-y" placeholder="Tell the agent what worked or what should change..." required />
      <button className="button-secondary mt-3 disabled:cursor-not-allowed disabled:text-tertiary" disabled={learning} type="submit">{learning ? <><LoadingSpinner /> Learning...</> : "Submit feedback"}</button>
      {error && <p className="mt-2 text-[13px] leading-5 text-secondary" role="alert">{error}</p>}
    </form>
  );
}

function TitleCard({ title, index, productContext }: { title: string; index: number; productContext: ProductContext }) {
  const [review, setReview] = useState<ReviewState>(null);
  const [editing, setEditing] = useState(false);
  const [savedTitle, setSavedTitle] = useState(title);
  const [draft, setDraft] = useState(title);
  const save = () => { if (draft.trim()) { setSavedTitle(draft.trim()); setEditing(false); setReview("edit"); } };

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
        <button aria-pressed={review === "approve"} className={review === "approve" ? "button-primary button-small" : "button-ghost button-small"} onClick={() => setReview(review === "approve" ? null : "approve")} type="button">Approve</button>
        <button className="button-ghost button-small border-black" onClick={() => setEditing(true)} type="button">Edit</button>
        <button aria-pressed={review === "reject"} className={review === "reject" ? "button-primary button-small" : "button-ghost button-small"} onClick={() => setReview(review === "reject" ? null : "reject")} type="button">Reject</button>
      </div>}
      {review && !editing && <div className="sm:pl-8"><FeedbackBox editedTitle={review === "edit" ? savedTitle : undefined} key={`${review}-${savedTitle}`} originalTitle={title} productContext={productContext} state={review} /></div>}
    </article>
  );
}

function TitleList({ titles, productContext }: { titles: GeneratedTitle[]; productContext: ProductContext | null }) {
  return (
    <section className="workspace-panel border-hairline py-8 md:border-l md:pl-8 lg:border-r lg:px-8 lg:py-0">
      <div className="flex items-center justify-between gap-4">
        <h2 className="section-title">Generated titles</h2>
        <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-secondary">AI Generated</span>
      </div>
      {titles.length === 0 ? (
        <div className="flex min-h-64 items-center justify-center border-b border-t border-hairline py-12 text-center md:min-h-[430px]">
          <div><p className="font-medium">Ready when you are.</p><p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-secondary">Add your product context and generate your first set of titles.</p></div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">{productContext && titles.map((title, index) => <TitleCard index={index} key={title.id} productContext={productContext} title={title.text} />)}</div>
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
  const [titles, setTitles] = useState<GeneratedTitle[]>([]);
  const [generatedContext, setGeneratedContext] = useState<ProductContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (context: ProductContext) => {
    setError(null);
    if (!context.productDescription.trim()) {
      setError("Product description is required.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });
      const result = (await response.json()) as GenerateResponse | ApiErrorResponse;
      if (!response.ok || "error" in result) {
        throw new Error("error" in result ? result.error : "Title generation failed.");
      }
      if (!Array.isArray(result.titles) || result.titles.length !== 5) {
        throw new Error("The server returned an invalid title response.");
      }
      setTitles(result.titles);
      setGeneratedContext(context);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <><AppHeader /><main className="mx-auto max-w-[1440px] px-5 pb-16 sm:px-8">
      <div className="pb-8 pt-10 sm:pt-12">
        <p className="text-xs tracking-[0.06em] text-secondary">PRODUCT TITLE AGENT</p>
        <h1 className="mt-3 max-w-2xl text-[32px] font-light leading-[1.12] tracking-[-0.025em] sm:text-[38px]">Create better titles,<br />one feedback at a time.</h1>
        <p className="mt-4 max-w-lg text-[15px] leading-6 text-secondary">Generate product titles, review the results,<br className="hidden sm:block" /> and teach the agent what your team prefers.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[minmax(240px,0.75fr)_minmax(0,1.5fr)] lg:grid-cols-[minmax(230px,0.85fr)_minmax(440px,1.45fr)_minmax(220px,0.75fr)]">
        <ProductForm error={error} loading={loading} onGenerate={generate} /><TitleList productContext={generatedContext} titles={titles} /><MemoryPanel />
      </div>
    </main></>
  );
}
