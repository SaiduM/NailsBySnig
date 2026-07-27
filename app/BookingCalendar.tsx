"use client";

import { useMemo, useState } from "react";

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function monthKey(value: string) {
  return value.slice(0, 7);
}

function moveMonth(value: string, amount: number) {
  const date = new Date(`${value}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

export function BookingCalendar({
  value,
  minimum,
  maximum,
  closedDates,
  onChange,
}: {
  value: string;
  minimum: string;
  maximum: string;
  closedDates: string[];
  onChange: (value: string) => void;
}) {
  const [month, setMonth] = useState(monthKey(value));
  const dates = useMemo(() => {
    const first = `${month}-01`;
    const leading = new Date(`${first}T12:00:00Z`).getUTCDay();
    const start = addDays(first, -leading);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [month]);
  const minimumMonth = monthKey(minimum);
  const maximumMonth = monthKey(maximum);

  return (
    <div className="booking-calendar" aria-label="Appointment calendar">
      <div className="booking-calendar-header">
        <button disabled={month <= minimumMonth} onClick={() => setMonth((current) => moveMonth(current, -1))} type="button" aria-label="Previous month">←</button>
        <strong>{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(`${month}-01T12:00:00Z`))}</strong>
        <button disabled={month >= maximumMonth} onClick={() => setMonth((current) => moveMonth(current, 1))} type="button" aria-label="Next month">→</button>
      </div>
      <div className="booking-calendar-weekdays" aria-hidden="true">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </div>
      <div className="booking-calendar-days">
        {dates.map((date) => {
          const day = new Date(`${date}T12:00:00Z`).getUTCDay();
          const outside = monthKey(date) !== month;
          const disabled = outside || date < minimum || date > maximum || day < 2 || day > 6 || closedDates.includes(date);
          return (
            <button
              aria-label={new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${date}T12:00:00Z`))}
              aria-pressed={date === value}
              className={`${date === value ? "selected" : ""} ${outside ? "outside" : ""}`}
              disabled={disabled}
              key={date}
              onClick={() => onChange(date)}
              type="button"
            >
              {Number(date.slice(-2))}
              {closedDates.includes(date) && <small>Closed</small>}
            </button>
          );
        })}
      </div>
      <p><strong>{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${value}T12:00:00Z`))}</strong> selected · Phoenix time</p>
    </div>
  );
}
