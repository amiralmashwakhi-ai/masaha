# Masaha (مساحة)

Surveying services broker app for Jordan. Expo (React Native), TypeScript, Arabic-first with RTL.

Run: `npm install`, then `npx expo start` and scan the QR code with Expo Go on Android or iOS.

Current state: prototype with local data only.
- Customer: pick a service, enter the Lands and Survey plot location, see required documents and an estimated JOD range,
  compare quotes, open each provider's CV and reviews, accept a quote, sign the agreement, pay into escrow, release
  milestones (30% after field work, 70% after deliverables are accepted).
- Provider: see jobs, send a quote with the 10% Masaha commission and their net payout shown, sign the agreement.
- Every action is written to the job record.
- Payments go through `src/payments.ts`, a mock until a licensed payment provider is connected.
- `backend/schema.sql` is live on Supabase project "masaha" (Frankfurt), with row-level security. `src/supabase.ts` is the client; screens still use local data until sign-in is added.

Placeholders to confirm: prices in `src/services.ts`, commission rate and milestone split in `src/money.ts`.
