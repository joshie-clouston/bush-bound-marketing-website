# Bushbound

Custom vehicle fit-outs for 4WDs, vans and work vehicles. Gold Coast, QLD.

## Brand

- **Name:** Bushbound (one word, capital B)
- **Domain:** bushbound.au
- **Colours:** Forest green (#2D4A3E), sand (#C4A882), charcoal (#1A1A1A), stone (#E8E0D6)
- **Style:** Rugged adventure, earthy, premium but approachable
- **Spelling:** Australian English (colour, fitout, organisation, etc.)
- **Tone:** Direct, friendly, confident. Not corporate. Talk like a mate who knows their stuff.

## Tech Stack

- Astro 5.x (static + SSR for API routes)
- Tailwind CSS 4.x
- Cloudflare Workers + D1
- Resend for email
- anime.js for scroll animations

## Conventions

- Use `@/` path aliases for imports
- API routes use `export const prerender = false`
- Animations use `data-animate` attributes
- Component structure: `ui/`, `forms/`, `sections/`, `layout/`
- Email sending is always non-blocking (try/catch)

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
```
