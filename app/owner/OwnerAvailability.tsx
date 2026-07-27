"use client";

import { FormEvent, useEffect, useState } from "react";

type Block = {
  id: string;
  block_date: string;
  start_time: string;
  end_time: string;
  label: string;
};

const times = Array.from({ length: 33 }, (_, index) => {
  const minutes = 9 * 60 + index * 15;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

function labelTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

export function OwnerAvailability({ today }: { today: string }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [fullDay, setFullDay] = useState(true);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [message, setMessage] = useState("");
  const upcomingBlocks = blocks.filter((block) => block.block_date >= today);

  async function load() {
    const response = await fetch("/api/owner/availability");
    const data = await response.json() as { blocks?: Block[]; error?: string };
    if (!response.ok) throw new Error(data.error || "Availability could not be loaded.");
    setBlocks(data.blocks ?? []);
    setState("ready");
  }

  useEffect(() => {
    fetch("/api/owner/availability")
      .then(async (response) => {
        const data = await response.json() as { blocks?: Block[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Availability could not be loaded.");
        setBlocks(data.blocks ?? []);
        setState("ready");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Availability could not be loaded.");
        setState("error");
      });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setState("saving");
    setMessage("");
    const form = new FormData(formElement);
    const response = await fetch("/api/owner/availability", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date: form.get("date"),
        startTime: fullDay ? "09:00" : form.get("startTime"),
        endTime: fullDay ? "17:00" : form.get("endTime"),
        label: form.get("label"),
      }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setMessage(data.error || "That blocked time could not be saved.");
      setState("error");
      return;
    }
    formElement.reset();
    setFullDay(true);
    await load();
  }

  async function remove(id: string) {
    setState("saving");
    const response = await fetch(`/api/owner/availability?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setMessage(data.error || "That blocked time could not be removed.");
      setState("error");
      return;
    }
    await load();
  }

  return (
    <div className="availability-manager">
      <section className="availability-form-card">
        <div><p className="eyebrow">Time off</p><h2>Block your calendar</h2></div>
        <p>Full days, appointments, breaks, and personal time immediately disappear from client availability.</p>
        <form onSubmit={submit}>
          <label>Date<input name="date" type="date" min={today} required /></label>
          <label className="availability-check">
            <input checked={fullDay} onChange={(event) => setFullDay(event.target.checked)} type="checkbox" />
            Block the full day
          </label>
          {!fullDay && (
            <div className="availability-time-row">
              <label>Start<select name="startTime" defaultValue="09:00">{times.slice(0, -1).map((time) => <option key={time} value={time}>{labelTime(time)}</option>)}</select></label>
              <label>End<select name="endTime" defaultValue="10:00">{times.slice(1).map((time) => <option key={time} value={time}>{labelTime(time)}</option>)}</select></label>
            </div>
          )}
          <label>Reason <small>Optional, owner only</small><input name="label" placeholder="Vacation, lunch, personal…" /></label>
          {state === "error" && <p className="form-error" role="alert">{message}</p>}
          <button disabled={state === "saving"} type="submit">{state === "saving" ? "Saving…" : "Block time"}</button>
        </form>
      </section>
      <section className="availability-list-card">
        <p className="eyebrow">Upcoming closures</p>
        <h2>Blocked time</h2>
        {state === "loading" && <p role="status">Loading availability…</p>}
        {state !== "loading" && !upcomingBlocks.length && <p className="owner-state">No upcoming blocked time.</p>}
        <div className="availability-blocks">
          {upcomingBlocks.map((block) => (
            <article key={block.id}>
              <div><strong>{block.block_date}</strong><span>{labelTime(block.start_time)}–{labelTime(block.end_time)}</span>{block.label && <small>{block.label}</small>}</div>
              <button onClick={() => remove(block.id)}>Remove</button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
