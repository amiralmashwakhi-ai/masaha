# Masaha (مساحة)

Surveying services broker app for Jordan. Expo (React Native), TypeScript, Arabic-first with RTL.

Run: `npm install`, then `npx expo start` and scan the QR code with Expo Go on Android or iOS.

Current state: connected to the live Supabase project "masaha".
- Sign up / sign in with email and password; new users pick customer or provider (a licensed surveying office).
- Customer: request a survey by Lands and Survey plot location, compare quotes, open each provider's CV and reviews,
  accept a quote, sign the agreement, pay into escrow, release 30% after field work and 70% on delivery.
- Provider: fill in CV and profile, see open requests and the customer's past reviews, quote (10% commission shown),
  sign, report progress.
- After a job is done, each side reviews the other once.
- Job state changes run through database functions in `backend/migrations/002_job_actions.sql`, which check who is calling.
- Payment is still simulated (`mock_pay_escrow`, enabled by `app_settings.payments_mode = 'mock'`) until HyperPay is connected.
- `website/` is the public site, deployed to Vercel from this repository.

Placeholders to confirm: prices in `src/services.ts`, commission rate and milestone split (`src/money.ts` and `accept_quote`).
