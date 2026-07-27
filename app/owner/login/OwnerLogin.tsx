"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export function OwnerLogin() {
  const [state, setState] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/owner/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: String(form.get("password") ?? "") }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setMessage(data.error || "We couldn’t sign you in.");
      setState("error");
      return;
    }
    window.location.assign("/owner");
  }

  return (
    <main className="manage-appointment">
      <form
        action="/api/owner/session"
        className="manage-card owner-login"
        method="post"
        onSubmit={submit}
      >
        <Link className="brand" href="/"><span className="brand-mark">NS</span><span>NailsBySnig</span></Link>
        <p className="eyebrow">Private owner access</p>
        <h1>Welcome back.</h1>
        <label>Owner password<input name="password" type="password" autoComplete="current-password" required /></label>
        {state === "error" && <p className="form-error" role="alert">{message}</p>}
        <button disabled={state === "submitting"} type="submit">
          {state === "submitting" ? "Signing in…" : "Open dashboard"}
        </button>
        <Link className="manage-home" href="/">Back to NailsBySnig</Link>
      </form>
    </main>
  );
}
