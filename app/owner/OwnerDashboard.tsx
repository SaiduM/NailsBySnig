"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Appointment = {
  reference: string;
  service_name: string;
  duration_minutes: number;
  price_dollars: number;
  appointment_date: string;
  appointment_time: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  notes: string;
  status: string;
};

export function OwnerDashboard({ ownerName }: { ownerName: string }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [includePast, setIncludePast] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setState("loading");
    const response = await fetch(`/api/owner/appointments?includePast=${includePast}`);
    const data = await response.json() as { appointments?: Appointment[]; error?: string };
    if (!response.ok) {
      setMessage(data.error || "Appointments could not be loaded.");
      setState("error");
      return;
    }
    setAppointments(data.appointments ?? []);
    setState("ready");
  }, [includePast]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/owner/appointments?includePast=${includePast}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as { appointments?: Appointment[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Appointments could not be loaded.");
        setAppointments(data.appointments ?? []);
        setState("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessage(error instanceof Error ? error.message : "Appointments could not be loaded.");
        setState("error");
      });
    return () => controller.abort();
  }, [includePast]);

  async function updateStatus(reference: string, status: string) {
    const response = await fetch("/api/owner/appointments", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reference, status }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setMessage(data.error || "That appointment could not be updated.");
      setState("error");
      return;
    }
    await load();
  }

  async function signOut() {
    await fetch("/api/owner/session", { method: "DELETE" });
    window.location.assign("/owner/login");
  }

  return (
    <main className="owner-page">
      <header className="owner-header">
        <Link className="brand" href="/"><span className="brand-mark">NS</span><span>NailsBySnig</span></Link>
        <div><span>Signed in as {ownerName}</span><button className="owner-signout" onClick={signOut}>Sign out</button></div>
      </header>
      <section className="owner-content">
        <div className="owner-title">
          <div><p className="eyebrow">Owner dashboard</p><h1>Appointments</h1></div>
          <Link className="owner-add" href="/#booking">＋ Add appointment</Link>
        </div>
        <div className="owner-toolbar">
          <label><input type="checkbox" checked={includePast} onChange={(event) => setIncludePast(event.target.checked)} /> Show past appointments</label>
          <button onClick={load}>Refresh</button>
        </div>
        {state === "loading" && <p className="owner-state" role="status">Loading appointments…</p>}
        {state === "error" && <p className="owner-state error" role="alert">{message}</p>}
        {state === "ready" && !appointments.length && <p className="owner-state">No appointments to show yet.</p>}
        <div className="appointment-list">
          {appointments.map((appointment) => (
            <article className="appointment-card" key={appointment.reference}>
              <div className="appointment-when">
                <strong>{appointment.appointment_date}</strong>
                <span>{appointment.appointment_time}</span>
              </div>
              <div className="appointment-main">
                <div><h2>{appointment.client_name}</h2><span className={`status status-${appointment.status}`}>{appointment.status}</span></div>
                <strong>{appointment.service_name}</strong>
                <p>{appointment.duration_minutes} min · ${appointment.price_dollars} · {appointment.reference}</p>
                <div className="appointment-contact">
                  {appointment.client_email && <a href={`mailto:${appointment.client_email}`}>{appointment.client_email}</a>}
                  {appointment.client_phone && <a href={`tel:${appointment.client_phone}`}>{appointment.client_phone}</a>}
                </div>
                {appointment.notes && <p className="appointment-notes">{appointment.notes}</p>}
              </div>
              <div className="appointment-actions">
                {appointment.status === "pending" && <button onClick={() => updateStatus(appointment.reference, "confirmed")}>Confirm</button>}
                {appointment.status === "confirmed" && <button onClick={() => updateStatus(appointment.reference, "completed")}>Mark complete</button>}
                {appointment.status !== "cancelled" && appointment.status !== "completed" && (
                  <button className="danger" onClick={() => updateStatus(appointment.reference, "cancelled")}>Cancel</button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
