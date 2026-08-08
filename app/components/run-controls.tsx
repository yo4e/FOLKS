"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunControls({ experimentId }: { experimentId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run(mode: "one" | "continue") {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        "/api/experiments/" + experimentId + "/turn",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode }),
        },
      );
      const body = (await response.json()) as {
        error?: string;
        result?: Array<{ turn?: { status?: string }; committed?: boolean }>;
      };
      if (!response.ok) {
        throw new Error(body.error ?? "日直を進められませんでした。");
      }
      const last = body.result?.[body.result.length - 1];
      setMessage(
        last?.turn?.status === "FAILED"
          ? "この日直は確定していません。Labで確認してください。"
          : "日誌が更新されました。",
      );
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "実行に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  async function pause() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        "/api/experiments/" + experimentId + "/pause",
        { method: "POST" },
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "停止できませんでした。");
      }
      setMessage("停止しました。次の日直を進めると再開します。");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "停止に失敗しました。");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    setBusy(true);
    try {
      const response = await fetch(
        "/api/experiments/" + experimentId + "/duplicate",
        { method: "POST" },
      );
      const body = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !body.id) {
        throw new Error(body.error ?? "実験を複製できませんでした。");
      }
      router.push("/experiments/" + body.id);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "実験の複製に失敗しました。",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="controls">
      <button disabled={busy} onClick={() => void run("one")}>
        {busy ? "日直を処理中…" : "一回進める"}
      </button>
      <button
        className="button-secondary"
        disabled={busy}
        onClick={() => void run("continue")}
      >
        続ける
      </button>
      <button className="button-secondary" disabled={busy} onClick={() => void pause()}>
        一時停止
      </button>
      <button className="button-secondary" disabled={busy} onClick={() => void duplicate()}>
        最初から複製
      </button>
      <a className="button-link" href={"/lab/" + experimentId}>
        Labを見る
      </a>
      {message ? <span className="control-message">{message}</span> : null}
    </div>
  );
}
