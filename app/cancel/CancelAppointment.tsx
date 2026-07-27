"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Appointment = {
  reference: string;
  service_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
};

export function CancelAppointment({ token }: { token: string }) {
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "saving" | "confirmed" | "cancelled" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/appointments/cancel?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json() as { appointment?: Appointment; error?: string };
        if (!response.ok || !data.appointment) throw new Error(data.error || "Appointment not found.");
        setAppointment(data.appointment);
        setState(data.appointment.status === "cancelled" ? "cancelled" : data.appointment.status === "confirmed" ? "confirmed" : "ready");
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Appointment not found.");
        setState("error");
      });
  }, [token]);

  async function updateAppointment(action: "confirm" | "cancel") {
    setState("saving");
    const response = await fetch(`/api/appointments/cancel?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) {
      setMessage(data.error || "We couldn’t cancel the appointment.");
      setState("error");
      return;
    }
    setState(action === "confirm" ? "confirmed" : "cancelled");
  }

  return (
    <main className="manage-appointment">
      <section className="manage-card">
        <Link className="brand" href="/"><span className="brand-mark">NS</span><span>NailsBySnig</span></Link>
        {state === "loading" && <p role="status">Loading your appointment…</p>}
        {state === "error" && <><h1>We couldn’t open that booking.</h1><p role="alert">{message}</p></>}
        {appointment && state !== "error" && (
          <>
            <p className="eyebrow">Manage appointment</p>
            <h1>{state === "cancelled" ? "Appointment cancelled." : state === "confirmed" ? "Appointment confirmed." : "Confirm or cancel."}</h1>
            <div className="manage-details">
              <strong>{appointment.service_name}</strong>
              <span>{appointment.appointment_date} at {appointment.appointment_time}</span>
              <span>Reference {appointment.reference}</span>
            </div>
            {state === "cancelled" ? (
              <p>Your reserved time has been released. You can return to NailsBySnig whenever you&apos;re ready.</p>
            ) : state === "confirmed" ? (
              <>
                <p>Thank you. We look forward to seeing you.</p>
                <button className="secondary-manage" onClick={() => updateAppointment("cancel")}>Cancel appointment</button>
              </>
            ) : (
              <>
                <p>Let us know whether you&apos;re still coming. Cancelling releases this time for another client.</p>
                <div className="manage-actions">
                  <button onClick={() => updateAppointment("confirm")} disabled={state === "saving"}>Confirm appointment</button>
                  <button className="secondary-manage" onClick={() => updateAppointment("cancel")} disabled={state === "saving"}>Cancel appointment</button>
                </div>
              </>
            )}
            <Link className="manage-home" href="/">Back to NailsBySnig</Link>
          </>
        )}
      </section>
    </main>
  );
}
