import { Link, useParams } from "react-router-dom";
import { usePeople } from "../../api/hooks/usePeople.js";
import { useRole, useRolePeople, useAddRolePerson, useRemoveRolePerson } from "../../api/hooks/useRoles.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import MoneyDisplay from "../../components/MoneyDisplay.js";
import { formatPersonName } from "../../utils/people.js";

export default function RoleDetail() {
  const roleId = Number(useParams<{ roleId: string }>().roleId);
  const { data: role, isLoading, error } = useRole(roleId);
  const { data: people = [] } = usePeople();
  const { data: rolePeople = [] } = useRolePeople(roleId);
  const add = useAddRolePerson();
  const remove = useRemoveRolePerson();

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error || !role) return <main className="container"><ErrorBanner error={error ?? "Role not found"} /></main>;

  const assigned = new Set((rolePeople ?? []).map((person) => person.id));

  function togglePerson(personId: number) {
    if (assigned.has(personId)) {
      remove.mutate({ roleId, personId });
    } else {
      add.mutate({ roleId, personId });
    }
  }

  return (
    <main className="container">
      <div style={{ marginBottom: "0.5rem" }}>
        <Link to="/services/roles" style={{ color: "var(--pico-muted-color)", fontSize: "0.875rem" }}>
          ← Roles
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ marginBottom: "0.25rem" }}>{role.name}</h1>
          <p style={{ color: "var(--pico-muted-color)", marginBottom: 0 }}>
            {role.peopleCount ?? rolePeople.length} people
          </p>
        </div>
      </div>

      <article>
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
          <dt>Default fee</dt>
          <dd><MoneyDisplay pennies={role.fee} /></dd>
          <dt>People</dt>
          <dd>{role.peopleCount ?? rolePeople.length}</dd>
        </dl>
      </article>

      <section>
        <h2>People</h2>
        {people.length > 0 ? people.map((person) => (
          <label key={person.id} style={{ display: "block" }}>
            <input
              type="checkbox"
              checked={assigned.has(person.id)}
              onChange={() => togglePerson(person.id)}
            /> {formatPersonName(person)} ({person.isActive ? "Active" : "Inactive"})
          </label>
        )) : <p style={{ color: "var(--pico-muted-color)" }}>No people available.</p>}
      </section>
    </main>
  );
}
