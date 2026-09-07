import { useEffect, useState } from "react";
import type { Person, UpdatePersonRequest } from "@get-down/shared";
import Modal from "./Modal.js";
import ConfirmDelete from "./ConfirmDelete.js";
import PersonFormFields from "./PersonFormFields.js";
import { useDeletePerson, useUpdatePerson } from "../api/hooks/usePeople.js";

interface Props {
  person: Person | null;
  onClose: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
}

function formValues(person: Person): UpdatePersonRequest {
  return {
    firstName: person.firstName,
    lastName: person.lastName,
    displayName: person.displayName,
    email: person.email,
    phone: person.phone,
    bankDetails: person.bankDetails,
    businessName: person.businessName,
    addressLine1: person.addressLine1,
    addressLine2: person.addressLine2,
    addressTown: person.addressTown,
    addressCounty: person.addressCounty,
    addressPostcode: person.addressPostcode,
    accountNumber: person.accountNumber,
    sortCode: person.sortCode,
    isPartner: person.isPartner,
    isActive: person.isActive,
  };
}

export default function PersonEditDialog({ person, onClose, onSaved, onDeleted }: Props) {
  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();
  const [editForm, setEditForm] = useState<UpdatePersonRequest>({});
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (person) {
      setEditForm(formValues(person));
      setDeleteOpen(false);
    }
  }, [person]);

  async function handleUpdate(event: React.FormEvent) {
    event.preventDefault();
    if (!person) return;
    await updatePerson.mutateAsync({ id: person.id, input: editForm });
    onClose();
    onSaved?.();
  }

  async function handleDelete() {
    if (!person) return;
    await deletePerson.mutateAsync(person.id);
    setDeleteOpen(false);
    onClose();
    onDeleted?.();
  }

  return (
    <>
      <Modal open={person !== null && !deleteOpen} onClose={onClose} title="Edit Person">
        <form onSubmit={handleUpdate}>
          <PersonFormFields
            values={editForm}
            onFieldChange={(field, value) => setEditForm((current) => ({ ...current, [field]: value }))}
            showActive
          />
          <footer style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <button type="button" className="contrast outline" onClick={() => setDeleteOpen(true)}>Delete</button>
            <button type="button" className="secondary" onClick={onClose}>Cancel</button>
            <button type="submit" aria-busy={updatePerson.isPending} disabled={updatePerson.isPending}>Save</button>
          </footer>
        </form>
      </Modal>
      <ConfirmDelete
        open={deleteOpen}
        itemName={`${person?.firstName ?? ""} ${person?.lastName ?? ""}`.trim()}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteOpen(false)}
        loading={deletePerson.isPending}
      />
    </>
  );
}
