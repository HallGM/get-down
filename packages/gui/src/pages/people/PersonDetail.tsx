import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { usePerson, usePersonRoles, useAddPersonRole, useRemovePersonRole } from "../../api/hooks/usePeople.js";
import { useRoles } from "../../api/hooks/useRoles.js";
import LoadingState from "../../components/LoadingState.js";
import ErrorBanner from "../../components/ErrorBanner.js";
import PersonEditDialog from "../../components/PersonEditDialog.js";
import TabBar from "../../components/TabBar.js";
import { formatPersonName } from "../../utils/people.js";

type Tab = "details" | "capabilities";

function displayValue(input: string | number | undefined): string | number {
  return input ?? "—";
}

const PERSON_TABS: Tab[] = ["details", "capabilities"];
const PERSON_TAB_LABELS: Record<Tab, string> = {
  details: "Details",
  capabilities: "Role capabilities",
};

export default function PersonDetail() {
  const personId = Number(useParams<{ personId: string }>().personId);
  const navigate = useNavigate();
  const { data: person, isLoading, error } = usePerson(personId);
  const { data: roles = [] } = useRoles();
  const { data: personRoles = [] } = usePersonRoles(personId);
  const add = useAddPersonRole();
  const remove = useRemovePersonRole();
  const [tab, setTab] = useState<Tab>("details");
  const [editing, setEditing] = useState(false);

  if (isLoading) return <main className="container"><LoadingState /></main>;
  if (error || !person) return <main className="container"><ErrorBanner error={error ?? "Person not found"} /></main>;

  const assigned = new Set(personRoles.map((role) => role.id));

  return (
    <main className="container">
      <p><Link to="/people">People</Link></p>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>{formatPersonName(person)}</h1>
          <p>{person.isActive ? "Active" : "Inactive"}</p>
        </div>
        <button onClick={() => setEditing(true)}>Edit</button>
      </header>

      <TabBar tabs={PERSON_TABS} labels={PERSON_TAB_LABELS} active={tab} onChange={setTab} />

      {tab === "details" ? (
        <section>
          <h2>Personal details</h2>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
            <dt>First name</dt><dd>{person.firstName}</dd>
            <dt>Last name</dt><dd>{displayValue(person.lastName)}</dd>
            <dt>Display name</dt><dd>{displayValue(person.displayName)}</dd>
            <dt>Business name</dt><dd>{displayValue(person.businessName)}</dd>
            <dt>Email</dt><dd>{displayValue(person.email)}</dd>
            <dt>Phone</dt><dd>{displayValue(person.phone)}</dd>
            <dt>Partner</dt><dd>{person.isPartner ? "Yes" : "No"}</dd>
            <dt>Active</dt><dd>{person.isActive ? "Yes" : "No"}</dd>
          </dl>

          <h2>Address</h2>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
            <dt>Address line 1</dt><dd>{displayValue(person.addressLine1)}</dd>
            <dt>Address line 2</dt><dd>{displayValue(person.addressLine2)}</dd>
            <dt>Town</dt><dd>{displayValue(person.addressTown)}</dd>
            <dt>County</dt><dd>{displayValue(person.addressCounty)}</dd>
            <dt>Postcode</dt><dd>{displayValue(person.addressPostcode)}</dd>
          </dl>

          <h2>Payment details</h2>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
            <dt>Account number</dt><dd>{displayValue(person.accountNumber)}</dd>
            <dt>Sort code</dt><dd>{displayValue(person.sortCode)}</dd>
            <dt>Bank details</dt><dd>{displayValue(person.bankDetails)}</dd>
          </dl>

          <h2>Other</h2>
          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.5rem 1.5rem" }}>
            <dt>Performer token</dt><dd>{displayValue(person.performerToken)}</dd>
            <dt>Airtable ID</dt><dd>{displayValue(person.airtableId)}</dd>
          </dl>
        </section>
      ) : (
        <section>
          <h2>Role capabilities</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {roles.map((role) => (
              <label key={role.id}>
                <input
                  type="checkbox"
                  checked={assigned.has(role.id)}
                  onChange={() => assigned.has(role.id)
                    ? remove.mutate({ personId, roleId: role.id })
                    : add.mutate({ personId, roleId: role.id })}
                /> {role.name}
              </label>
            ))}
          </div>
        </section>
      )}

      <PersonEditDialog
        person={editing ? person : null}
        onClose={() => setEditing(false)}
        onDeleted={() => navigate("/people")}
      />
    </main>
  );
}
