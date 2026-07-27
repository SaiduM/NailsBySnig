"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { OwnerAvailability } from "./OwnerAvailability";

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

type CalendarView = "today" | "day" | "week" | "list" | "availability";
type StatusFilter = "all" | "confirmed" | "completed" | "cancelled";
type Gap = { start: string; end: string };

const OPEN_MINUTES = 9 * 60;
const CLOSE_MINUTES = 17 * 60;
const TURNAROUND_MINUTES = 15;

function phoenixToday() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function businessWeek(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  const day = date.getUTCDay();
  const daysSinceTuesday = (day - 2 + 7) % 7;
  const tuesday = addDays(value, -daysSinceTuesday);
  return Array.from({ length: 5 }, (_, index) => addDays(tuesday, index));
}

function dateLabel(value: string, long = false) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: long ? "long" : "short",
    month: long ? "long" : "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00Z`));
}

function toMinutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function timeLabel(value: string) {
  const minutes = toMinutes(value);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function minuteTime(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function openGaps(appointments: Appointment[]): Gap[] {
  const occupied = appointments
    .filter((appointment) => appointment.status !== "cancelled")
    .map((appointment) => ({
      start: toMinutes(appointment.appointment_time),
      end: Math.min(CLOSE_MINUTES, toMinutes(appointment.appointment_time) + appointment.duration_minutes + TURNAROUND_MINUTES),
    }))
    .sort((left, right) => left.start - right.start);

  const gaps: Gap[] = [];
  let cursor = OPEN_MINUTES;
  for (const interval of occupied) {
    if (interval.start > cursor) gaps.push({ start: minuteTime(cursor), end: minuteTime(interval.start) });
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < CLOSE_MINUTES) gaps.push({ start: minuteTime(cursor), end: minuteTime(CLOSE_MINUTES) });
  return gaps;
}

function AppointmentDetails({
  appointment,
  updateStatus,
}: {
  appointment: Appointment;
  updateStatus: (reference: string, status: string) => Promise<void>;
}) {
  return (
    <article className="appointment-card appointment-details">
      <div className="appointment-when">
        <strong>{dateLabel(appointment.appointment_date, true)}</strong>
        <span>{timeLabel(appointment.appointment_time)}</span>
      </div>
      <div className="appointment-main">
        <div>
          <h2>{appointment.client_name}</h2>
          <span className={`status status-${appointment.status}`}>{appointment.status}</span>
        </div>
        <strong>{appointment.service_name}</strong>
        <p>{appointment.duration_minutes} min · {appointment.reference}</p>
        <div className="appointment-contact">
          <a href={`mailto:${appointment.client_email}`}>{appointment.client_email}</a>
          <a href={`tel:${appointment.client_phone}`}>{appointment.client_phone}</a>
        </div>
        {appointment.notes && <p className="appointment-notes">{appointment.notes}</p>}
      </div>
      <div className="appointment-actions">
        {appointment.status === "confirmed" && (
          <button onClick={() => updateStatus(appointment.reference, "completed")}>Mark complete</button>
        )}
        {appointment.status !== "cancelled" && appointment.status !== "completed" && (
          <button className="danger" onClick={() => updateStatus(appointment.reference, "cancelled")}>Cancel</button>
        )}
      </div>
    </article>
  );
}

export function OwnerDashboard({ ownerName }: { ownerName: string }) {
  const today = useMemo(() => phoenixToday(), []);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [includePast, setIncludePast] = useState(false);
  const [view, setView] = useState<CalendarView>("today");
  const [anchorDate, setAnchorDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedReference, setSelectedReference] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/owner/appointments?includePast=true", { signal });
    const data = await response.json() as { appointments?: Appointment[]; error?: string };
    if (!response.ok) throw new Error(data.error || "Appointments could not be loaded.");
    setAppointments(data.appointments ?? []);
    setState("ready");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/owner/appointments?includePast=true", { signal: controller.signal })
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
  }, []);

  const visibleDates = view === "week" ? businessWeek(anchorDate) : [view === "today" ? today : anchorDate];
  const matchesStatus = (appointment: Appointment) =>
    statusFilter === "all" || appointment.status === statusFilter;
  const calendarAppointments = appointments.filter(
    (appointment) => visibleDates.includes(appointment.appointment_date) && matchesStatus(appointment),
  );
  const listAppointments = appointments.filter(
    (appointment) => (includePast || appointment.appointment_date >= today) && matchesStatus(appointment),
  );
  const selectedAppointment = appointments.find((appointment) => appointment.reference === selectedReference);

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

  function chooseView(nextView: CalendarView) {
    setView(nextView);
    setSelectedReference("");
    if (nextView === "today") setAnchorDate(today);
  }

  function chooseStatus(nextStatus: StatusFilter) {
    setStatusFilter(nextStatus);
    setSelectedReference("");
  }

  function moveDate(direction: number) {
    if (view === "today") {
      setView("day");
      setAnchorDate(addDays(today, direction));
      setSelectedReference("");
      return;
    }
    setAnchorDate((current) => addDays(current, direction * (view === "week" ? 7 : 1)));
    setSelectedReference("");
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
          <div><p className="eyebrow">Owner dashboard</p><h1>Calendar</h1></div>
          <Link className="owner-add" href="/#booking">＋ Add appointment</Link>
        </div>

        <div className="calendar-view-tabs" role="tablist" aria-label="Calendar view">
          {(["today", "day", "week", "list", "availability"] as CalendarView[]).map((option) => (
            <button
              aria-selected={view === option}
              className={view === option ? "selected" : ""}
              key={option}
              onClick={() => chooseView(option)}
              role="tab"
            >
              {option[0].toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>

        {view !== "list" && view !== "availability" && (
          <div className="calendar-navigation">
            <button aria-label="Previous date" onClick={() => moveDate(-1)}>←</button>
            <div>
              <strong>
                {view === "week"
                  ? `${dateLabel(visibleDates[0])} – ${dateLabel(visibleDates[visibleDates.length - 1])}`
                  : dateLabel(visibleDates[0], true)}
              </strong>
              <span>9:00 AM–5:00 PM · Phoenix time</span>
            </div>
            <input
              aria-label="Calendar date"
              onChange={(event) => {
                setAnchorDate(event.target.value);
                if (view === "today" && event.target.value !== today) setView("day");
              }}
              type="date"
              value={anchorDate}
            />
            <button aria-label="Next date" onClick={() => moveDate(1)}>→</button>
          </div>
        )}

        {view !== "availability" && <div className="calendar-legend" aria-label="Filter appointments by status">
          {(["all", "confirmed", "completed", "cancelled"] as StatusFilter[]).map((statusOption) => (
            <button
              aria-pressed={statusFilter === statusOption}
              className={`status-filter ${statusOption === "all" ? "" : `status status-${statusOption}`} ${statusFilter === statusOption ? "selected" : ""}`}
              key={statusOption}
              onClick={() => chooseStatus(statusOption)}
              type="button"
            >
              {statusOption[0].toUpperCase() + statusOption.slice(1)}
            </button>
          ))}
          <span className="gap-key">Open time</span>
          <button className="calendar-refresh" onClick={() => {
            setState("loading");
            load().catch(() => setState("error"));
          }}>Refresh</button>
        </div>}

        {state === "loading" && <p className="owner-state" role="status">Loading appointments…</p>}
        {state === "error" && <p className="owner-state error" role="alert">{message}</p>}

        {state === "ready" && view !== "list" && view !== "availability" && (
          <>
            <div className={`calendar-grid ${view === "week" ? "week-grid" : ""}`}>
              {visibleDates.map((date) => {
                const dayAppointments = calendarAppointments.filter((appointment) => appointment.appointment_date === date);
                const occupiedAppointments = appointments.filter((appointment) => appointment.appointment_date === date);
                const gaps = openGaps(occupiedAppointments);
                return (
                  <section className="calendar-day" key={date}>
                    <header><strong>{dateLabel(date)}</strong><span>{dayAppointments.length} appointment{dayAppointments.length === 1 ? "" : "s"}</span></header>
                    <div className="calendar-events">
                      {dayAppointments.map((appointment) => (
                        <button
                          className={`calendar-event calendar-event-${appointment.status}`}
                          key={appointment.reference}
                          onClick={() => setSelectedReference(appointment.reference)}
                        >
                          <span>{timeLabel(appointment.appointment_time)}</span>
                          <strong>{appointment.client_name}</strong>
                          <small>{appointment.service_name} · {appointment.duration_minutes} min</small>
                        </button>
                      ))}
                      {gaps.map((gap) => (
                        <div className="calendar-gap" key={`${date}-${gap.start}`}>
                          <span>{timeLabel(gap.start)}–{timeLabel(gap.end)}</span>
                          <small>Open</small>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
            {selectedAppointment && (
              <section className="quick-details" aria-live="polite">
                <div className="quick-details-heading">
                  <div><p className="eyebrow">Quick details</p><h2>Appointment</h2></div>
                  <button onClick={() => setSelectedReference("")}>Close</button>
                </div>
                <AppointmentDetails appointment={selectedAppointment} updateStatus={updateStatus} />
              </section>
            )}
          </>
        )}

        {state === "ready" && view === "list" && (
          <>
            <div className="owner-toolbar">
              <label><input type="checkbox" checked={includePast} onChange={(event) => setIncludePast(event.target.checked)} /> Show past appointments</label>
              <span>{listAppointments.length} appointment{listAppointments.length === 1 ? "" : "s"}</span>
            </div>
            {!listAppointments.length && <p className="owner-state">No appointments to show yet.</p>}
            <div className="appointment-list">
              {listAppointments.map((appointment) => (
                <AppointmentDetails appointment={appointment} key={appointment.reference} updateStatus={updateStatus} />
              ))}
            </div>
          </>
        )}
        {view === "availability" && <OwnerAvailability today={today} />}
      </section>
    </main>
  );
}
