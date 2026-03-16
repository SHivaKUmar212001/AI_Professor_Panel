# Wallet And UPI Rollout Notes

This is a backup note for the wallet feature that was removed from the live app for pre-deployment user testing.

## Intended scope

- Wallet balance per user
- Manual top-up flow through generated UPI deep links
- Admin ability to credit any user after confirming payment
- Discussion-only charging model
- Price range from `$0.02` to `$0.10` based on selected rounds

## Previous implementation shape

- Pricing helper:
  - `3` rounds => `$0.02`
  - `8` rounds => `$0.10`
  - linear scaling in between
- UPI env vars:
  - `UPI_PAYEE_VPA`
  - `UPI_PAYEE_NAME`
  - `UPI_USD_TO_INR_RATE`
- Admin env var:
  - `ADMIN_USERNAMES`
- API routes that existed:
  - `/api/wallet`
  - `/api/wallet/admin/credit`
- UI surface that existed:
  - wallet dashboard in the arena workspace
  - admin credit panel
  - discussion cost preview in topic setup

## Reintroduce later

When this returns for deployment, it should ideally include:

- automatic payment verification instead of admin-only manual crediting
- refund handling if discussion startup fails after a charge attempt
- transaction history export for support/admin review
