"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewExperimentForm() {
  const router = useRouter();
  const [kind, setKind] = useState<"baseline" | "technical">("baseline");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      const response = await fetch("/api/experiments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const experiment = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !experiment.id) {
        throw new Error(experiment.error ?? "実験を作成できませんでした。");
      }
      router.push("/experiments/" + experiment.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "実験を作成できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="new-experiment">
      <label>
        <span>新しい実験</span>
        <select
          value={kind}
          onChange={(event) =>
            setKind(event.target.value as "baseline" | "technical")
          }
        >
          <option value="baseline">baseline</option>
          <option value="technical">technical shakeout</option>
        </select>
      </label>
      <button disabled={busy} onClick={() => void create()}>
        作成する
      </button>
    </div>
  );
}
