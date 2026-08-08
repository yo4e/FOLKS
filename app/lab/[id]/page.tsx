import Link from "next/link";
import { notFound } from "next/navigation";
import { getRuntime } from "@/src/server/runtime";

export const dynamic = "force-dynamic";

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export default async function LabPage({
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
  const lab = runtime.store.getLabView(id);
  return (
    <main className="shell lab-shell">
      <header className="site-header">
        <div>
          <Link className="back-link" href={"/experiments/" + id}>
            ← FOLKS view
          </Link>
          <p className="eyebrow">LAB VIEW</p>
          <h1>{lab.experiment.name}</h1>
        </div>
        <a className="button-link" href={"/api/experiments/" + id + "/export"}>
          Audit JSONを保存
        </a>
      </header>

      <section className="lab-config paper-card">
        <div className="card-heading">
          <span className="eyebrow">FROZEN CONFIGURATION</span>
          <span className="tag">{lab.experiment.kind}</span>
        </div>
        <pre>{pretty(lab.experiment)}</pre>
      </section>

      <section className="lab-overview">
        <div className="paper-card">
          <span className="eyebrow">CURRENT WORLD</span>
          <pre>{pretty(lab.state.objects)}</pre>
        </div>
        <div className="paper-card">
          <span className="eyebrow">RELATIONSHIPS</span>
          <pre>{pretty(lab.state.relationships)}</pre>
        </div>
      </section>

      <section className="turn-inspector">
        <div className="section-heading">
          <div>
            <p className="eyebrow">AUDIT TRAIL</p>
            <h2>日直の記録</h2>
          </div>
          <span className="muted">{lab.turns.length} turns</span>
        </div>
        {lab.turns.length === 0 ? (
          <div className="paper-card empty-state">まだturnはありません。</div>
        ) : (
          lab.turns.map((turn) => (
            <details className="turn-card paper-card" key={turn.id}>
              <summary>
                <span>日直 {turn.cycle} · {turn.residentId}</span>
                <span className={"status status-" + turn.status.toLowerCase()}>
                  {turn.status}
                </span>
              </summary>
              <div className="turn-grid">
                <div>
                  <h3>TurnInput</h3>
                  <pre>{pretty(turn.inputSnapshot)}</pre>
                </div>
                <div>
                  <h3>TurnRefMap</h3>
                  <pre>{pretty(turn.refMapSnapshot)}</pre>
                </div>
                <div>
                  <h3>Validated output</h3>
                  <pre>{pretty(turn.validatedOutputSnapshot)}</pre>
                </div>
                <div>
                  <h3>Validation / failure</h3>
                  <pre>
                    {pretty({
                      failureKind: turn.failureKind,
                      validationErrors: turn.validationErrors,
                    })}
                  </pre>
                </div>
                <div className="turn-wide">
                  <h3>Raw model attempts</h3>
                  {turn.modelRuns.map((run) => (
                    <details className="model-run" key={run.id}>
                      <summary>
                        attempt {run.attempt} · {run.kind} · {run.adapter}
                      </summary>
                      <pre>
                        {pretty({
                          metadata: {
                            modelIdentifier: run.modelIdentifier,
                            promptVersion: run.promptVersion,
                            startedAt: run.startedAt,
                            finishedAt: run.finishedAt,
                            latencyMs: run.latencyMs,
                            inputTokens: run.inputTokens,
                            outputTokens: run.outputTokens,
                            finishReason: run.finishReason,
                          },
                          rawInput: run.rawInput,
                          rawOutput: run.rawOutput,
                          validationErrors: run.validationErrors,
                        })}
                      </pre>
                    </details>
                  ))}
                </div>
              </div>
            </details>
          ))
        )}
      </section>
    </main>
  );
}
