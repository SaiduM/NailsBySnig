---
name: build-nail-booking
description: Build and evolve the NailsBySnig responsive website and appointment-booking app. Use for product planning, nail service catalog changes, booking-flow development, appointment persistence, mobile UX, release validation, or shipping a focused feature for this repository.
---

# Build Nail Booking

Deliver one complete, testable feature slice at a time.

## Workflow

1. Read `references/product.md` before changing product behavior.
2. Inspect the current implementation and preserve established patterns.
3. Choose the earliest unfinished roadmap item that matches the request.
4. Implement the smallest end-to-end slice, including accessible mobile UI, validation, storage, and clear success/error states.
5. Run the production build and relevant tests.
6. Update the roadmap only when a slice is genuinely complete.
7. Keep commits focused and describe the user-visible outcome.

## Product guardrails

- Keep booking faster and simpler than a marketplace product.
- Make service, date, time, and contact choices obvious on a phone.
- Store appointments durably; never treat browser storage as the booking record.
- Prevent accidental duplicate submissions and reject invalid or unavailable slots.
- Do not add payments, accounts, staff scheduling, memberships, or marketplace features until requested.
- Use specific business copy and prices from `references/product.md`; mark unknown business details clearly instead of inventing them.

## Definition of done

- Complete the intended flow from entry point through confirmation.
- Provide useful empty, loading, validation, success, and failure states.
- Verify keyboard labels, touch targets, and responsive layout.
- Pass the production build and focused tests.
- Avoid unrelated refactors.
