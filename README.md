# NailsBySnig

NailsBySnig is a mobile-first nail studio website and installable web app with
conflict-safe appointment booking and a private owner dashboard.

- Website: [nailsbysnig.pages.dev](https://nailsbysnig.pages.dev)
- Owner dashboard: [nailsbysnig.pages.dev/owner](https://nailsbysnig.pages.dev/owner)
- Repository: [SaiduM/NailsBySnig](https://github.com/SaiduM/NailsBySnig)

## Current production features

- Responsive business website and installable Progressive Web App (PWA)
- Multiple services in one appointment
- Booking from tomorrow through the next two calendar months
- Tuesday–Saturday availability from 9:00 AM to 5:00 PM
- Available start times every 15 minutes
- Combined service-duration calculation
- Required 15-minute turnaround time between appointments
- Atomic database slot reservation to prevent overlapping or double bookings
- Client name plus at least one valid contact method: email or phone
- Durable Cloudflare D1 appointment and reserved-slot records
- Booking reference and secure appointment management link
- Automatic confirmation and client cancellation flow
- Private owner dashboard with upcoming and past appointments
- Owner actions for completion, cancellation, and manual booking
- Encrypted owner password and signed 12-hour owner sessions
- Email/SMS delivery code for booking receipts, reminders, confirmations, and
  cancellations
- Service prices remain stored for future use but are temporarily hidden from
  customer and owner interfaces

## Production readiness

### Launch blockers

These should be completed before promoting the website broadly.

- [ ] Confirm the final service names, prices, and durations.
- [ ] Confirm the actual operating days, hours, Phoenix location, business
      email, and business phone number shown to clients.
- [ ] Replace the temporary owner password with a permanent password stored in
      a password manager.
- [ ] Configure email delivery and verify the sender address.
- [ ] Configure SMS delivery and register the sending phone number if text
      messages are required.
- [ ] Schedule the protected reminder endpoint to run once per day.
- [ ] Add owner controls for closed dates, vacations, and manually blocked time.
      Availability is currently fixed to Tuesday–Saturday, 9:00 AM–5:00 PM.
- [ ] Add a privacy notice explaining how client contact and appointment data is
      stored and used.
- [ ] Confirm and publish the cancellation/no-show policy.
- [ ] Add rate limiting or bot protection to public booking and owner-login
      requests.
- [ ] Perform a real production booking test using an external email address and
      phone number before announcing the site.

### Operational hardening

- [ ] Add notification delivery logs, retries, and an owner-visible failure
      status. A booking is still saved when a provider cannot send a message.
- [ ] Move table creation and schema updates into versioned D1 migrations.
- [ ] Document database export, backup, and restoration procedures.
- [ ] Add error monitoring and alerts for failed bookings and API errors.
- [ ] Add browser-level end-to-end tests for booking, conflict rejection,
      cancellation, reminders, and owner actions.
- [ ] Test keyboard navigation and representative iPhone and Android screen
      sizes before each major release.
- [ ] Add an appointment export or calendar sync for day-to-day operations.

### Recommended business improvements

- [ ] Connect a custom domain when one is purchased.
- [ ] Use that domain for a branded notification address such as
      `appointments@yourdomain.com`.
- [ ] Add Local Business structured data, social-sharing images, and finalized
      search metadata.
- [ ] Add basic privacy-friendly analytics and conversion tracking.
- [ ] Add configurable lead time, same-day booking rules, and service-specific
      availability if needed.
- [ ] Consider deposits and cancellation-policy acceptance only if the business
      requires them.
- [ ] Consider a separate client table only when client history or returning
      client features are needed. Contact details are currently stored with each
      appointment.

## Notification activation

The notification workflows are implemented but do not deliver messages until
provider credentials and scheduling are configured.

### Email

Configure these encrypted Cloudflare production secrets:

```text
RESEND_API_KEY
NOTIFICATION_FROM_EMAIL
```

`NOTIFICATION_FROM_EMAIL` must be an address approved by the configured email
provider.

### SMS

Configure these encrypted Cloudflare production secrets:

```text
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_FROM_NUMBER
```

### Daily reminders

Configure an encrypted value:

```text
REMINDER_SECRET
```

Then schedule a daily authenticated `POST` request to:

```text
https://nailsbysnig.pages.dev/api/reminders
```

with:

```text
Authorization: Bearer <REMINDER_SECRET>
```

The reminder job finds confirmed appointments scheduled for the
following day in the `America/Phoenix` time zone. It marks a reminder as sent
only after at least one configured delivery channel succeeds.

## Data storage

Cloudflare D1 stores two related record types.

### `appointments`

Stores:

- booking reference
- selected service IDs and names
- total duration and price
- appointment date and start time
- client name, email, and phone
- client notes
- appointment status
- cancellation token
- reminder delivery timestamp
- creation timestamp

Email and phone columns may contain an empty string individually, but the
booking API requires at least one valid contact method.

### `appointment_slots`

Stores every reserved 15-minute segment for an appointment, including the
15-minute turnaround period. Its date-and-time primary key prevents two
appointments from reserving the same segment.

There is no separate client table yet. Repeated client details are stored with
each appointment.

## Cloudflare production configuration

The Pages project needs:

- D1 binding `DB`
- `OWNER_EMAIL`
- encrypted `OWNER_PASSWORD`
- encrypted `OWNER_SESSION_SECRET`
- compatibility flag `nodejs_compat`

Notification secrets are additional and are listed above.

Do not commit passwords, API keys, authentication tokens, or production secrets
to this repository.

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run build
npm run build:pages
npm test
npm run lint
```

- `npm run build` creates the vinext production build.
- `npm run build:pages` prepares `dist/client` for Cloudflare Pages advanced
  worker mode.
- `npm test` builds the project and runs the focused booking tests.

## Release workflow

1. Make a focused change.
2. Run `npm test`.
3. Run `npm run build:pages` for deployment-related changes.
4. Review `git diff` and ensure no credentials are present.
5. Commit and push to `main`.
6. Wait for the Cloudflare Pages deployment to succeed.
7. Verify the public booking page and owner dashboard in production.

Cloudflare Pages automatically deploys pushes to `main`.
