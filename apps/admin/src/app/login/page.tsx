export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  const hasError = sp.error === '1';
  const next = typeof sp.next === 'string' ? sp.next : '';

  return (
    <div className="login-wrap">
      <div className="card login-card">
        <h1 className="login-title">
          dots<span className="brand-dot">.</span> <span className="brand-suffix">Admin</span>
        </h1>
        <p className="hint">Bitte mit dem Admin-Passwort anmelden.</p>
        {hasError && <div className="notice err">Falsches Passwort.</div>}
        <form method="post" action="/api/login" className="form">
          {next && <input type="hidden" name="next" value={next} />}
          <div className="field">
            <label htmlFor="password">Passwort</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Anmelden
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
