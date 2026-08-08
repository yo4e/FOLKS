import Link from "next/link";
import { notFound } from "next/navigation";
import { RunControls } from "@/app/components/run-controls";
import { getRuntime } from "@/src/server/runtime";

export const dynamic = "force-dynamic";

export default async function FolksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const runtime = getRuntime();
  const experiment = runtime.store.getExperiment(id);
  if (!experiment) {
    notFound();
  }
  const view = runtime.store.getFolksView(id);
  return (
    <main className="shell">
      <header className="site-header">
        <div>
          <Link className="back-link" href="/">
            ← 実験一覧
          </Link>
          <p className="eyebrow">FOLKS VIEW</p>
          <h1>{view.experiment.name}</h1>
        </div>
        <div className="cycle-display">
          <span>cycle</span>
          <strong>
            {view.experiment.committedCycle} / {view.experiment.totalCycles}
          </strong>
          <small>{view.experiment.status}</small>
        </div>
      </header>

      <section className="duty-banner">
        <div>
          <span className="eyebrow">最近の日直</span>
          <strong>{view.duty.recentResidentName ?? "まだ始まっていない"}</strong>
        </div>
        <div className="arrow">→</div>
        <div>
          <span className="eyebrow">次の日直</span>
          <strong>{view.duty.nextResidentName}</strong>
        </div>
      </section>

      <div className="folks-grid">
        <section className="paper-card world-card">
          <div className="card-heading">
            <span className="eyebrow">THE SMALL WORLD</span>
            <span className="weather">{view.world.weather}</span>
          </div>
          <div className="places">
            {view.world.places.map((place) => (
              <article className="place" key={place.description}>
                <p>{place.description}</p>
                <ul>
                  {place.objects.length === 0 ? (
                    <li className="muted">何も置かれていない</li>
                  ) : (
                    place.objects.map((object) => <li key={object}>{object}</li>)
                  )}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="paper-card journal-card">
          <div className="card-heading">
            <span className="eyebrow">SHARED JOURNAL</span>
            <span className="muted">{view.journal.length} entries</span>
          </div>
          <div className="journal">
            {view.journal.length === 0 ? (
              <p className="empty-state">まだ日誌はありません。</p>
            ) : (
              [...view.journal].reverse().map((entry) => (
                <article className="journal-entry" key={entry.cycle}>
                  <div className="journal-meta">
                    <span>日直 {entry.cycle}</span>
                    <strong>{entry.authorName}</strong>
                  </div>
                  <p>{entry.publicText}</p>
                  {entry.questionForNext ? (
                    <p className="question">次へ：{entry.questionForNext}</p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="drift-card">
        <span className="eyebrow">A DISTANT TRACE</span>
        <p>{view.drift ?? "この実験の日直は終わりました。"}</p>
      </section>

      <RunControls experimentId={id} />
    </main>
  );
}
