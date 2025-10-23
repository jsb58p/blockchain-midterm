import React from "react";

export function Toast({ msg, kind = "info" }: { msg: string; kind?: "info" | "warn" | "error" }) {
  const color =
    kind === "error" ? "danger" : kind === "warn" ? "warn" : "ok";
  return (
    <div className={`panel`} style={{ borderColor: "var(--border)" }}>
      <div className={`badge ${color}`} style={{ marginRight: 8 }}>{kind.toUpperCase()}</div> {msg}
    </div>
  );
}

