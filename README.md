# YEESZONE — Shop. Sell. Discover.

A starter frontend for the YEESZONE marketplace.

## Setup
1. Copy `config.example.js` to `config.js`.
2. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `config.js`.
3. Serve the folder from a static web host (for example, Netlify) or a local development server. ES modules generally do not work when opening `index.html` directly as a `file://` URL.

## Included
- Marketplace landing page and listing search
- Supabase email/password sign-up and sign-in
- Read-only listing retrieval from the `listings` table
- Seller and admin dashboard placeholders

## Security and production status
This is an initial starter, not a production-ready marketplace. Never put an `sb_secret_...` or `service_role` key in browser code or GitHub. Configure and test Supabase RLS policies before exposing user data. Listing creation, orders, payments, storage, and admin authorization are intentionally not enabled until the exact database schema and server-side security rules are reviewed.
