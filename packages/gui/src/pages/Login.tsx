import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../api/auth.js";
import ErrorBanner from "../components/ErrorBanner.js";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ maxWidth: "400px", marginTop: "8vh" }}>
      <article>
        <hgroup>
          <h1>Every Angle</h1>
          <p>Sign in to continue</p>
        </hgroup>
        {!!error && <ErrorBanner error={error} />}
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit" aria-busy={loading} disabled={loading}>
            Sign in
          </button>
        </form>
      </article>
    </main>
  );
}
