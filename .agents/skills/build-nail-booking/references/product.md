# NailsBySnig product brief

## Goal

Create a polished, mobile-first business website that also feels like an installable app. Let a client understand the studio and request an appointment without navigating a marketplace.

## MVP release

1. Business landing page with services, trust signals, hours, location placeholder, and contact placeholder.
2. Four-step booking flow: choose service, choose date, choose available time, enter contact details and confirm.
3. Durable appointment records with server-side validation and slot conflict protection.
4. Responsive confirmation view with a booking reference.

## Initial service catalog

Treat these as editable launch defaults until the owner confirms the final menu.

| Service | Duration | Price |
| --- | ---: | ---: |
| Signature Gel Manicure | 60 min | $55 |
| Structured Gel Manicure | 75 min | $70 |
| Gel-X Full Set | 90 min | $85 |
| Custom Nail Art | 30 min add-on | $25 |

## Operating defaults

- Time zone: America/Phoenix.
- Booking window: tomorrow through two calendar months ahead.
- Available days: Tuesday through Saturday.
- Clients may select one or more services in a single appointment; duration and price are the sum of all selections.
- Prices remain stored with appointments but are temporarily hidden from all customer and owner interfaces.
- Operating hours: 9:00 AM–5:00 PM, with appointment starts every 15 minutes when all selected services can finish by 5:00 PM.
- Turnaround gap: reserve 15 minutes after every appointment for cleanup and preparation before the next client.
- Conflict protection: reserve every 15-minute segment of the combined service duration plus the turnaround gap in one atomic database operation so overlapping appointments cannot both succeed.
- Conflict-safe bookings are confirmed immediately after their reserved slots are saved.

## Later roadmap

1. Configure production email/SMS provider credentials and daily reminder scheduling.
3. Calendar sync and configurable availability.
4. Deposits and cancellation policy acceptance.
5. Returning-client convenience.

## Completed

- Installable PWA with home-screen icon, standalone display, offline shell, and platform-specific install guidance.
- Client cancellation links that release reserved appointment slots.
- Both email and phone are required for booking; notification delivery supports email, SMS, immediate receipts, and one-day manage/cancel reminders.
- Owner dashboard provides Today, Day, Week, and List views with open-time gaps, color-coded statuses, quick details, completion, cancellation, and manual booking.
- Owner access supports a private password with a signed, secure, 12-hour session.
