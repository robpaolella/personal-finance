Now add the full authentication system to Ledger.

## Backend Auth

### Auth Routes (routes/auth.ts)
- POST /api/auth/login — accepts { username, password }, validates credentials with bcrypt, returns a JWT token (expires in 7 days) and user object { id, username, displayName }
- POST /api/auth/logout — clears the token (client-side only since we use JWT)
- GET /api/auth/me — validates the JWT from the Authorization header (Bearer token), returns the current user object or 401

### Auth Middleware (middleware/auth.ts)
- Create an `authenticate` middleware that extracts the Bearer token from the Authorization header, verifies it, and attaches the user to `req.user`
- Apply this middleware to ALL routes under /api/* EXCEPT /api/auth/login and /api/health

## Frontend Auth

### Auth Context (context/AuthContext.tsx)
- Create an AuthContext that stores the current user and JWT token
- On app load, check localStorage for an existing token and validate it against GET /api/auth/me
- Provide login(username, password) and logout() functions
- Store the token in localStorage for persistence across page reloads

### Login Page (pages/LoginPage.tsx)
- Clean, centered login form with username and password fields
- App name "Ledger" displayed above the form with the logo (a gradient square with a $ symbol)
- Error message display for invalid credentials
- On successful login, redirect to the dashboard

### Protected Routes
- Wrap all app routes in a ProtectedRoute component that redirects to /login if not authenticated
- The app shell (sidebar + main content area) should only render when authenticated

### API Client (lib/api.ts)
- Create a configured fetch wrapper that automatically includes the Authorization header
- Handle 401 responses by clearing auth state and redirecting to login
- Base URL should point to the API server

## Design Notes
- The login page should use the same dark navy (#0f172a) and gradient accent (blue to green) from the app's sidebar
- Use DM Sans and DM Mono fonts (Google Fonts)
- Keep the form minimal: just username, password, and a "Sign In" button
- Show a subtle loading state on the button while authenticating
