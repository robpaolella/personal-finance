Final polish pass on the Ledger app.

## Production Build Configuration
- Configure Vite to build the client into a static `dist/` folder
- Configure the Express server to serve the static client files in production
- Add a `npm run build` script at the root that builds both client and server
- Add a `npm run start` script that runs the production server
- The production server should serve the React app for all non-API routes (SPA fallback)

## Security Hardening
- Add rate limiting to the login endpoint (5 attempts per minute per IP)
- Add CORS configuration (allow only the client origin in dev, same-origin in production)
- Add helmet middleware for security headers
- Sanitize all user inputs on the server side
- Ensure JWT tokens are HttpOnly if using cookies (or properly validated if using localStorage)

## Error Handling
- Add a global error handling middleware on the server that returns consistent error JSON: { error: string, details?: string }
- Add toast notifications on the client for success/error feedback (e.g., "Transaction saved", "Import failed")
- Show a friendly error state when API calls fail (not just a blank page)

## UI Polish
- Ensure all monetary values use DM Mono font consistently
- Ensure all dates use DM Mono font at 12px
- Verify consistent card styling across all pages (12px border radius, 1px #e8ecf1 border, subtle shadow)
- Add loading skeletons/spinners for all data-fetching states
- Ensure the active page is highlighted in the sidebar based on current route
- Add a user menu at the bottom of the sidebar showing the logged-in user's name with a logout option

## Favicon & Title
- Set the page title to "Ledger — Personal Finance"
- Create a simple SVG favicon that matches the logo (gradient square with $)

## README
- Generate a README.md with:
  - Project description
  - Tech stack
  - Setup instructions (install, seed, dev, build, start)
  - Default credentials
  - Project structure overview
  - Screenshots placeholder section
