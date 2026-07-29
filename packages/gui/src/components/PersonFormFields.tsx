import type { ChangeEvent } from "react";
import FormField from "./FormField.js";

export interface PersonFieldValues {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  businessName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressTown?: string;
  addressCounty?: string;
  addressPostcode?: string;
  accountNumber?: string;
  sortCode?: string;
  bankDetails?: string;
  isPartner?: boolean;
  isActive?: boolean;
}

interface Props {
  values: PersonFieldValues;
  onFieldChange: <K extends keyof PersonFieldValues>(field: K, value: PersonFieldValues[K]) => void;
  /** Show the "Active" checkbox (only relevant when editing an existing person). */
  showActive?: boolean;
}

/**
 * Shared set of person detail fields, used by both the create and edit forms
 * in PeopleList. Keeping this in one place avoids the two forms drifting out
 * of sync whenever a field is added, removed, or relabelled.
 */
export default function PersonFormFields({ values, onFieldChange, showActive }: Props) {
  function textHandler<K extends keyof PersonFieldValues>(field: K) {
    return (e: ChangeEvent<HTMLInputElement>) => onFieldChange(field, e.target.value as PersonFieldValues[K]);
  }

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <FormField label="First Name" value={values.firstName ?? ""} onChange={textHandler("firstName")} required />
        <FormField label="Last Name" value={values.lastName ?? ""} onChange={textHandler("lastName")} />
        <FormField label="Display Name" value={values.displayName ?? ""} onChange={textHandler("displayName")} />
        <FormField label="Business Name" value={values.businessName ?? ""} onChange={textHandler("businessName")} />
        <FormField label="Email" type="email" value={values.email ?? ""} onChange={textHandler("email")} />
        <FormField label="Phone" type="tel" value={values.phone ?? ""} onChange={textHandler("phone")} />
        <FormField label="Address Line 1" value={values.addressLine1 ?? ""} onChange={textHandler("addressLine1")} />
        <FormField label="Address Line 2" value={values.addressLine2 ?? ""} onChange={textHandler("addressLine2")} />
        <FormField label="Town" value={values.addressTown ?? ""} onChange={textHandler("addressTown")} />
        <FormField label="County" value={values.addressCounty ?? ""} onChange={textHandler("addressCounty")} />
        <FormField label="Postcode" value={values.addressPostcode ?? ""} onChange={textHandler("addressPostcode")} />
        <FormField label="Account Number" value={values.accountNumber ?? ""} onChange={textHandler("accountNumber")} />
        <FormField label="Sort Code" value={values.sortCode ?? ""} onChange={textHandler("sortCode")} />
        <FormField label="Bank Details (Legacy)" value={values.bankDetails ?? ""} onChange={textHandler("bankDetails")} />
      </div>
      <label>
        <input
          type="checkbox"
          checked={!!values.isPartner}
          onChange={(e) => onFieldChange("isPartner", e.target.checked)}
        /> Partner
      </label>
      {showActive && (
        <label>
          <input
            type="checkbox"
            checked={!!values.isActive}
            onChange={(e) => onFieldChange("isActive", e.target.checked)}
          /> Active
        </label>
      )}
    </>
  );
}
