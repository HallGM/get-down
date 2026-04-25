import { useState } from "react";
import { Link } from "react-router-dom";
import { useAccounts, useCreateAccount, usePeopleWithoutAccounts } from "../../api/hooks/useAccounts.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import Modal from "../../components/Modal.js";
import { formatPennies } from "../../utils/money.js";
import { caLabel } from "../../utils/accounts.js";
import type { Account } from "@get-down/shared";

function AccountCard({ account }: { account: Account }) {
  const { text, color } = caLabel(account.caBalance);
  return (
    <Link to={`/accounts/${account.id}`} style={{ textDecoration: "none", color: "inherit" }}>
      <article style={{ cursor: "pointer" }}>
        <header>
          <strong>{account.personName}</strong>
        </header>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem" }}>
          <div>
            <small style={{ color: "var(--pico-muted-color)" }}>Balance (all-time)</small>
            <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              {formatPennies(Math.abs(account.caBalance))}
            </div>
          </div>
          <span style={{ color, fontWeight: 600 }}>{text}</span>
        </div>
        <footer style={{ marginTop: "0.5rem" }}>
          <small style={{ color: "var(--pico-muted-color)" }}>View ledger →</small>
        </footer>
      </article>
    </Link>
  );
}

function CreateAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [personId, setPersonId] = useState<number | "">("");
  const { data: people } = usePeopleWithoutAccounts();
  const createAccount = useCreateAccount();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!personId) return;
    await createAccount.mutateAsync({ personId: Number(personId) });
    setPersonId("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Account">
      <form onSubmit={handleSubmit}>
        <label>
          Person
          <select
            value={personId}
            onChange={(e) => setPersonId(e.target.value ? Number(e.target.value) : "")}
            required
          >
            <option value="">— select a person —</option>
            {(people ?? []).map((p) => (
              <option key={p.id} value={p.id}>{p.personName}</option>
            ))}
          </select>
        </label>
        {people?.length === 0 && (
          <p style={{ color: "var(--pico-muted-color)", fontSize: "0.875rem" }}>
            All people already have accounts.
          </p>
        )}
        <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1rem" }}>
          <button type="button" className="secondary" onClick={onClose}>Cancel</button>
          <button type="submit" aria-busy={createAccount.isPending} disabled={createAccount.isPending || !personId}>
            Create
          </button>
        </footer>
      </form>
    </Modal>
  );
}

export default function AccountsList() {
  const { data: accounts, isLoading, error } = useAccounts();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error) return <main className="container"><ErrorBanner error={error} /></main>;

  return (
    <main className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>Accounts</h1>
        <button onClick={() => setShowCreate(true)}>+ Create Account</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {(accounts ?? []).map((a) => (
          <AccountCard key={a.id} account={a} />
        ))}
      </div>
      {accounts?.length === 0 && (
        <p style={{ textAlign: "center", color: "var(--pico-muted-color)", padding: "2rem 0" }}>
          No accounts yet. Create one to get started.
        </p>
      )}
      <CreateAccountModal open={showCreate} onClose={() => setShowCreate(false)} />
    </main>
  );
}
