# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: gamers and hardware enthusiasts in Cuiabá and Várzea Grande (MT) — building or buying gaming PCs, drawn by free local delivery and real physical store presence. Secondary: general consumers across Brazil buying computers/hardware for study or office work, served nationwide via Correios. The catalog spans entry-level "Home" builds through extreme "Mad" tier gaming rigs; the same "Escolha seu Nível" tier system serves both audiences, but local/regional trust is the confirmed priority axis.

## Product Purpose

E-commerce for computer hardware, peripherals, and gaming PCs. Customers either browse/buy individual hardware by category (Hardware, Periféricos, Notebooks, Monitores, PC Gamer, Cadeiras Gamer) or pick a pre-curated build tier via "Escolha seu Nível" (Home → Crazy → Insane → Lunatic → Mad) instead of assembling a PC part-by-part. Success is a completed, paid real order (Pix or cartão), fulfilled by real Correios shipping calculated from actual product weight/dimensions, or — for Cuiabá/Várzea Grande — local delivery.

## Positioning

A hardware/gaming-PC retailer with a real physical store in Cuiabá, MT, competing against large online-only national chains (Kabum, Terabyte, Pichau) on local trust and presence rather than lowest price: a real place customers can visit, direct WhatsApp support, and free local delivery in Cuiabá/Várzea Grande for orders ≥ R$200 — something an online-only competitor in this market cannot offer.

## Operating Context

- Checkout requires a real account — no guest checkout.
- A product cannot be registered or sold without real weight + 3D dimensions on file; freight is always computed for real from Correios using the actual product data, never a generic placeholder package — except Cuiabá/Várzea Grande orders, which get free local delivery above R$200 (below that, the customer is routed to WhatsApp, since freight varies by bairro and can't be automated).
- Payment via Mercado Pago: Pix (with a per-product % discount) or credit card up to 12x sem juros.
- A separate admin panel (its own Vercel deploy) manages products, categories, orders, customers, coupons, staff/permissions, appearance/design system, stock, and invoices (notas fiscais), with role-based permissions per staff member.
- Order-confirmation email sends only once payment is actually confirmed — never for a pending Pix.

## Capabilities and Constraints

- Static HTML/JS/CSS site, no build step, no framework. Supabase (Postgres/Auth/Storage/Edge Functions) backend.
- Product photography must always be a real photo of the actual product — never an SVG/illustration placeholder.
- "Escolha seu Nível" terminology (Home, Crazy, Insane, Lunatic, Mad) is the actual customer-facing brand vocabulary, not a translation placeholder.
- Confirmed priority: gamers/regional (Cuiabá/VG) first; national general audience is served but not the primary lens for design and product decisions.

## Brand Commitments

- Name: Alfa Informática. Footer tagline: "Hardware · Periféricos · Setup Gamer".
- Primary brand color: #0066FF (blue). Dark theme is the default site-wide look.
- Has a real physical store in Cuiabá, MT (exact address/bairro not recorded yet — confirm before publishing a specific street address anywhere).

## Evidence on Hand

- No testimonial counts, "anos de mercado" claims, awards, or certifications are confirmed — do not invent any. The site's own review system (real customer-submitted reviews, moderated in the admin panel) is the only confirmed social-proof source; use it instead of fabricated claims.
- Real physical store in Cuiabá confirmed by the user; no address/neighborhood on file yet.

## Product Principles

1. Real data only — never fabricate stock, price, freight, or reviews; the server always recomputes price/freight/discount from the database, never trusts client-submitted values.
2. Real product photography always — no illustration/SVG stands in for a product.
3. Simplify the hard decision — "Escolha seu Nível" exists to spare non-expert buyers from part-by-part PC-building decisions.
4. Local trust as the differentiator — physical store + local delivery + WhatsApp support is the edge against bigger online-only competitors, not lowest price.
5. Trustworthy checkout — logged-in-only purchase, real freight, and payment confirmation gates customer communication (e.g. the confirmation e-mail fires only on actual payment, never on pending Pix).
