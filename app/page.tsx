import Link from "next/link";
import { NewExperimentForm } from "./components/new-experiment-form";
import {
  baselineCreationAllowed,
  ensureDefaultExperiment,
  getRuntime,
} from "@/src/server/runtime";

export const dynamic = "force-dynamic";

export default function HomePage() {
  ensureDefaultExperiment();
  const runtime = getRuntime();
  const experiments = runtime.store.listExperiments();
  return (
    <main className="shell narrow">
      <header className="site-header">
        <div>
          <p className="eyebrow">A TINY SOCIETY</p>
          <h1>FOLKS</h1>
        </div>
        <p className="header-note">継承されるものを、静かに読む。</p>
      </header>
      <section className="intro-card">
        <p>
          四人の住民が一人ずつ日直を務め、直近の日誌と自分だけの記憶を受け渡します。
          ここでは、結果を作るのではなく、残ったものを観察します。
        </p>
      </section>
      <section className="section-heading">
        <div>
          <p className="eyebrow">EXPERIMENTS</p>
          <h2>実験を選ぶ</h2>
        </div>
        <NewExperimentForm
          defaultKind={
            baselineCreationAllowed() && runtime.adapter.name !== "fake"
              ? "baseline"
              : "technical"
          }
        />
      </section>
      <div className="experiment-list">
        {experiments.map((experiment) => (
          <Link
            className="experiment-card"
            href={"/experiments/" + experiment.id}
            key={experiment.id}
          >
            <div className="experiment-card-top">
              <span className="tag">{experiment.kind}</span>
              <span className="status">{experiment.status}</span>
            </div>
            <h3>{experiment.name}</h3>
            <p>
              {experiment.committedCycle} / {experiment.totalCycles} cycle
            </p>
            <small>
              {experiment.language} · {experiment.modelIdentifier}
            </small>
          </Link>
        ))}
      </div>
    </main>
  );
}
