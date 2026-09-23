# CODE.IO

## API health check

The Cloudflare Pages D1 database binding is named `DB`. The `/api/health` endpoint runs a database connection test by querying D1, and reports whether the API can reach the database.

## Server-side authentication

Authentication endpoints use the existing `users` and `sessions` D1 tables. No schema change is required.

Passwords use the versioned format `pbkdf2-sha256$600000$<base64url-16-byte-salt>$<base64url-32-byte-derived-key>`, created with PBKDF2-HMAC-SHA-256 and a fresh cryptographic salt. Existing password hashes are never guessed or verified unless they match this exact format. Development accounts with unknown hashes must be reset through the setup endpoint below.

Sessions use a random 256-bit token in the `__Host-codeio_session` cookie. D1 stores only the SHA-256 hash of that token. The cookie is `HttpOnly`, `Secure`, `SameSite=Lax`, scoped to `/`, and expires after eight hours by default or seven days when “Remember me” is selected. Password reset revokes the user's existing sessions before issuing a new session.

### First admin setup and development-account reset

1. In Cloudflare Dashboard, open **Workers & Pages → your Pages project → Settings → Variables and Secrets**.
2. Add `AUTH_SETUP_SECRET` as a **secret** for the production environment. Generate a one-time random value locally, for example in PowerShell:

   ```powershell
   $setupSecret = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
   ```

   Save the value securely; it is sent in the request header and is not returned by the API. Redeploy if Cloudflare prompts you to apply the new setting.
3. For a new first administrator (allowed only while D1 contains no row with `role = 'admin'`), call:

   ```powershell
   $password = Read-Host 'Enter a unique password of at least 12 characters'
   $body = @{ name = 'Your Name'; email = 'you@example.com'; password = $password } | ConvertTo-Json -Compress
   Invoke-RestMethod -Method Post -Uri 'https://YOUR-DOMAIN/api/auth/setup-admin' -Headers @{ 'X-Auth-Setup-Secret' = $setupSecret } -ContentType 'application/json' -Body $body -SessionVariable authSession
   ```

4. To migrate/reset an existing development account with an unknown hash, use its existing email. This preserves its database role and account data, replaces only its password hash and `updated_at`, and revokes its sessions:

   ```powershell
   $password = Read-Host 'Enter a unique password of at least 12 characters'
   $body = @{ action = 'reset-existing'; email = 'existing-user@example.com'; password = $password } | ConvertTo-Json -Compress
   Invoke-RestMethod -Method Post -Uri 'https://YOUR-DOMAIN/api/auth/setup-admin' -Headers @{ 'X-Auth-Setup-Secret' = $setupSecret } -ContentType 'application/json' -Body $body -SessionVariable authSession
   ```

5. After the setup/reset succeeds, immediately remove `AUTH_SETUP_SECRET` from the Pages production secrets and redeploy. The endpoint then returns 404. If you need another account reset later, temporarily set a newly generated secret, perform the reset, and remove it again. Existing D1 rows are not deleted automatically.

The setup endpoint sets a normal authenticated session cookie in the response. The password is sent only in the HTTPS request body; never put it or the setup secret in source code, a URL, or a committed file.

### API endpoints

- `POST /api/auth/login` — validates credentials and issues the session cookie.
- `POST /api/auth/logout` — invalidates the current session and clears the cookie.
- `GET /api/auth/me` — returns the authenticated user's safe fields or 401.
- `POST /api/auth/setup-admin` — secret-gated first-admin setup or existing-account password reset; disable it by removing `AUTH_SETUP_SECRET`.

`requireAuth(request, env)` and `requireAdmin(request, env)` are exported from `lib/auth.js` for future protected Functions. There are currently no admin data APIs in this repository, so the admin dashboard's project/message/media operations remain local mock data and are not server-protected application data. Its page-level role check is for navigation only; every future data endpoint must enforce `requireAdmin()` itself.

New account registration and self-service email password recovery are not implemented. Use the secret-gated setup/reset procedure for development accounts. No migration is attempted for unknown legacy hashes until an account is explicitly reset.
