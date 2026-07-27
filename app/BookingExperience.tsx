"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

const services = [
  {
    id: "signature-gel",
    name: "Signature Gel Manicure",
    description: "Detailed prep, shaping, cuticle care, and glossy gel color.",
    duration: 60,
    price: 55,
    symbol: "◒",
  },
  {
    id: "structured-gel",
    name: "Structured Gel Manicure",
    description: "Added strength and structure for a long-lasting natural set.",
    duration: 75,
    price: 70,
    symbol: "◇",
  },
  {
    id: "gel-x",
    name: "Gel-X Full Set",
    description: "Lightweight soft-gel extensions shaped and finished for you.",
    duration: 90,
    price: 85,
    symbol: "✦",
  },
  {
    id: "custom-art",
    name: "Custom Nail Art",
    description: "An art add-on for chrome, linework, aura, or tiny details.",
    duration: 30,
    price: 25,
    symbol: "✺",
  },
] as const;

type Service = (typeof services)[number];

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function displayTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2026, 0, 1, hour, minute));
}

function bookingWindow() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const minimum = new Date(today);
  minimum.setDate(minimum.getDate() + 1);
  while (minimum.getDay() < 2 || minimum.getDay() > 6) {
    minimum.setDate(minimum.getDate() + 1);
  }
  const maximum = new Date(today);
  maximum.setMonth(maximum.getMonth() + 2);
  return { minimum: dateKey(minimum), maximum: dateKey(maximum) };
}

export function BookingExperience() {
  const window = useMemo(bookingWindow, []);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [serviceIds, setServiceIds] = useState<string[]>(["signature-gel"]);
  const [date, setDate] = useState(window.minimum);
  const [time, setTime] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [availabilityStatus, setAvailabilityStatus] = useState<"loading" | "ready" | "error">("loading");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [reference, setReference] = useState("");
  const [cancelUrl, setCancelUrl] = useState("");
  const selectedServices = services.filter((service) => serviceIds.includes(service.id));
  const totalDuration = selectedServices.reduce((total, service) => total + service.duration, 0);
  const totalPrice = selectedServices.reduce((total, service) => total + service.price, 0);

  useEffect(() => {
    const controller = new AbortController();
    if (!serviceIds.length) {
      setAvailableTimes([]);
      setTime("");
      setAvailabilityStatus("ready");
      return () => controller.abort();
    }
    setAvailabilityStatus("loading");
    setMessage("");
    const query = new URLSearchParams({ date });
    serviceIds.forEach((serviceId) => query.append("serviceId", serviceId));
    fetch(`/api/appointments?${query.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = (await response.json()) as { availableTimes?: string[]; error?: string };
        if (!response.ok) throw new Error(data.error || "We couldn’t load appointment times.");
        const nextTimes = data.availableTimes ?? [];
        setAvailableTimes(nextTimes);
        setTime((current) => (nextTimes.includes(current) ? current : nextTimes[0] ?? ""));
        setAvailabilityStatus("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setAvailableTimes([]);
        setTime("");
        setAvailabilityStatus("error");
        setMessage(error instanceof Error ? error.message : "We couldn’t load appointment times.");
      });
    return () => controller.abort();
  }, [date, serviceIds]);

  function openBooking(service?: Service) {
    if (service) setServiceIds([service.id]);
    setBookingOpen(true);
    setStatus("idle");
    requestAnimationFrame(() =>
      document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" }),
    );
  }

  function toggleService(serviceId: string) {
    setServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId],
    );
  }

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      serviceIds,
      date,
      time,
      name: String(form.get("name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      notes: String(form.get("notes") ?? "").trim(),
    };

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string; reference?: string; cancelUrl?: string };
      if (!response.ok) throw new Error(data.error || "We couldn’t save that appointment.");
      setReference(data.reference ?? "");
      setCancelUrl(data.cancelUrl ?? "");
      setStatus("success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
      setStatus("error");
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="NailsBySnig home">
          <span className="brand-mark">NS</span>
          <span>NailsBySnig</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#services">Services</a>
          <a href="#studio">The studio</a>
          <button className="header-book" onClick={() => openBooking()}>Book now</button>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Private nail studio · Phoenix</p>
          <h1>Small details.<br /><em>Big nail energy.</em></h1>
          <p className="hero-lede">
            Thoughtful prep, artful finishes, and appointments that never feel rushed.
            Your next favorite set is a few taps away.
          </p>
          <div className="hero-actions">
            <button className="primary-action" onClick={() => openBooking()}>
              Find an appointment <span>→</span>
            </button>
            <a href="#services">Explore services</a>
          </div>
          <div className="mini-proof">
            <span><strong>1:1</strong> private appointments</span>
          </div>
        </div>
        <div className="hero-art" aria-label="Abstract nail polish composition">
          <div className="arch arch-one"><span>fresh set</span></div>
          <div className="arch arch-two"></div>
          <div className="polish-bottle"><span>NS</span></div>
          <div className="spark spark-one">✦</div>
          <div className="spark spark-two">✦</div>
          <p>made with care<br />worn with joy</p>
        </div>
      </section>

      <section className="services-section" id="services">
        <div className="section-heading">
          <div>
            <p className="eyebrow">The menu</p>
            <h2>Choose your kind of <em>perfect</em></h2>
          </div>
          <p>Every service includes detailed prep and a calm, unhurried appointment.</p>
        </div>
        <div className="service-grid">
          {services.map((service, index) => (
            <article className="service-card" key={service.id}>
              <div className="service-index">0{index + 1}</div>
              <div className="service-symbol">{service.symbol}</div>
              <h3>{service.name}</h3>
              <p>{service.description}</p>
              <div className="service-meta">
                <span>{service.duration} min</span>
                <strong>from ${service.price}</strong>
              </div>
              <button onClick={() => openBooking(service)}>
                Book this service <span>↗</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="studio-section" id="studio">
        <div className="studio-note">
          <p className="eyebrow">Why NailsBySnig</p>
          <h2>A little appointment that feels like <em>your time.</em></h2>
        </div>
        <div className="studio-points">
          <div><span>01</span><h3>Clean & considered</h3><p>Single-use files and careful sanitation for every appointment.</p></div>
          <div><span>02</span><h3>Made for you</h3><p>We shape, color, and design around your nails and your style.</p></div>
          <div><span>03</span><h3>No crowded salon</h3><p>A quiet one-on-one studio experience from start to finish.</p></div>
        </div>
      </section>

      <section className={`booking-section ${bookingOpen ? "is-open" : ""}`} id="booking">
        {!bookingOpen ? (
          <div className="booking-invite">
            <p className="eyebrow">Ready when you are</p>
            <h2>Let&apos;s make something <em>beautiful.</em></h2>
            <button className="primary-action light" onClick={() => openBooking()}>
              Start booking <span>→</span>
            </button>
          </div>
        ) : status === "success" ? (
          <div className="confirmation" role="status">
            <div className="confirmation-mark">✓</div>
            <p className="eyebrow">Request received</p>
            <h2>You&apos;re on the books.</h2>
            <p>
              We&apos;ll confirm {selectedServices.map((service) => service.name).join(" + ")} for{" "}
              <strong>{displayDate(date)} at {displayTime(time)}</strong>.
            </p>
            <div className="reference">Booking reference <strong>{reference}</strong></div>
            {cancelUrl && <a className="confirmation-cancel" href={cancelUrl}>View or cancel appointment</a>}
            <button onClick={() => { setStatus("idle"); setBookingOpen(false); }}>Back to home</button>
          </div>
        ) : (
          <div className="booking-shell">
            <div className="booking-summary">
              <p className="eyebrow">Book your visit</p>
              <h2>Your next set starts here.</h2>
              <p>Choose what works for you. Your appointment stays pending until the studio confirms it.</p>
              <div className="selected-summary">
                <span>{selectedServices.length > 1 ? selectedServices.length : selectedServices[0]?.symbol ?? "＋"}</span>
                <div>
                  <small>{selectedServices.length === 1 ? "Your selection" : `${selectedServices.length} services selected`}</small>
                  <strong>{selectedServices.length ? selectedServices.map((service) => service.name).join(" + ") : "Choose at least one service"}</strong>
                  <p>{totalDuration} min · ${totalPrice}</p>
                </div>
              </div>
            </div>
            <form className="booking-form" onSubmit={submitBooking}>
              <fieldset>
                <legend><span>1</span> Choose one or more services</legend>
                <div className="service-choice-grid">
                  {services.map((service) => (
                    <label className={serviceIds.includes(service.id) ? "selected" : ""} key={service.id}>
                      <input
                        type="checkbox"
                        checked={serviceIds.includes(service.id)}
                        onChange={() => toggleService(service.id)}
                      />
                      <span className="choice-mark" aria-hidden="true">{serviceIds.includes(service.id) ? "✓" : service.symbol}</span>
                      <span>
                        <strong>{service.name}</strong>
                        <small>{service.duration} min · ${service.price}</small>
                      </span>
                    </label>
                  ))}
                </div>
                {!serviceIds.length && <p className="selection-error">Select at least one service to see available times.</p>}
              </fieldset>

              <fieldset>
                <legend><span>2</span> Pick a day</legend>
                <div className="date-picker">
                  <label>
                    Appointment date
                    <input
                      type="date"
                      value={date}
                      min={window.minimum}
                      max={window.maximum}
                      onChange={(event) => setDate(event.target.value)}
                      required
                    />
                  </label>
                  <div>
                    <strong>{displayDate(date)}</strong>
                    <span>Available Tuesday–Saturday · Book up to 2 months ahead</span>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend><span>3</span> Pick a time</legend>
                {availabilityStatus === "loading" ? (
                  <p className="availability-note" role="status">Checking available times…</p>
                ) : availableTimes.length ? (
                  <div className="time-row">
                    {availableTimes.map((value) => (
                      <button className={time === value ? "selected" : ""} type="button" onClick={() => setTime(value)} key={value}>
                        {displayTime(value)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="availability-note">No times are available for this day. Please choose another date.</p>
                )}
              </fieldset>

              <fieldset>
                <legend><span>4</span> Your details</legend>
                <div className="field-grid">
                  <label>Full name<input name="name" autoComplete="name" required minLength={2} /></label>
                  <label>Phone <small>Email or phone required</small><input name="phone" type="tel" autoComplete="tel" /></label>
                  <label>Email <small>Email or phone required</small><input name="email" type="email" autoComplete="email" /></label>
                  <label className="full-field">Anything we should know? <small>Optional</small><textarea name="notes" rows={3} placeholder="Nail art ideas, removal needed, or accessibility notes..." /></label>
                </div>
              </fieldset>

              {status === "error" && <p className="form-error" role="alert">{message}</p>}
              <button className="submit-booking" disabled={status === "submitting" || !serviceIds.length || !time || availabilityStatus !== "ready"} type="submit">
                {status === "submitting" ? "Saving your appointment…" : "Request appointment"} <span>→</span>
              </button>
              <p className="form-fineprint">No payment is collected today. We&apos;ll contact you to confirm.</p>
            </form>
          </div>
        )}
      </section>

      <footer>
        <a className="brand" href="#top"><span className="brand-mark">NS</span><span>NailsBySnig</span></a>
        <p>Thoughtful nails, simply booked.</p>
        <div><a href="#services">Services</a><a href="#booking">Book</a><span>Tue–Sat · Phoenix, AZ</span></div>
      </footer>
    </main>
  );
}
