import { useState } from "react";
import type { FeeAllocation, FeeAllocationLineItem } from "@get-down/shared";
import MoneyDisplay from "./MoneyDisplay.js";
import MoneyField from "./MoneyField.js";

export interface FeeAllocationPanelProps {
  allocation: FeeAllocation;
  onAddLineItem?: (description: string, amount: number) => void;
  onUpdateLineItem?: (item: FeeAllocationLineItem, description: string, amount: number) => void;
  onRemoveLineItem?: (item: FeeAllocationLineItem) => void;
}

export function FeeAllocationPanel({
  allocation,
  onAddLineItem,
  onUpdateLineItem,
  onRemoveLineItem,
}: FeeAllocationPanelProps) {
  const [addDesc, setAddDesc] = useState("");
  const [addAmt, setAddAmt] = useState<number | undefined>(undefined);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmt, setEditAmt] = useState<number | undefined>(undefined);

  const lineItems = allocation.lineItems ?? [];
  const total = lineItems.reduce((sum, li) => sum + (li.amount ?? 0), 0);

  function startEditItem(li: FeeAllocationLineItem) {
    setEditingItem(li.id);
    setEditDesc(li.description ?? "");
    setEditAmt(li.amount ?? undefined);
  }

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addDesc || addAmt == null) return;
    onAddLineItem?.(addDesc, addAmt);
    setAddDesc("");
    setAddAmt(undefined);
  }

  function handleEditSubmit(e: React.FormEvent, li: FeeAllocationLineItem) {
    e.preventDefault();
    if (!editDesc || editAmt == null) return;
    onUpdateLineItem?.(li, editDesc, editAmt);
    setEditingItem(null);
  }

  return (
    <div>
      {lineItems.length > 0 ? (
        <table style={{ fontSize: "0.9em" }}>
          <thead>
            <tr><th>Description</th><th>Amount</th><th style={{ width: "1%" }}></th></tr>
          </thead>
          <tbody>
            {lineItems.map((li) =>
              editingItem === li.id ? (
                <tr key={li.id}>
                  <td>
                    <form onSubmit={(e) => handleEditSubmit(e, li)} style={{ display: "contents" }}>
                      <input
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        style={{ width: "100%", margin: 0 }}
                        required
                        autoFocus
                      />
                    </form>
                  </td>
                  <td>
                    <MoneyField
                      label=""
                      value={editAmt}
                      onChange={(pounds) => setEditAmt(pounds)}
                      style={{ width: "100%", margin: 0 }}
                      min={0}
                      required
                    />
                  </td>
                  <td style={{ display: "flex", gap: "0.3rem" }}>
                    <button
                      type="button"
                      className="secondary outline"
                      style={{ padding: "0.15em 0.4em", fontSize: "0.85em" }}
                      onClick={(e) => handleEditSubmit(e as unknown as React.FormEvent, li)}
                    >✓</button>
                    <button
                      type="button"
                      className="secondary outline"
                      style={{ padding: "0.15em 0.4em", fontSize: "0.85em" }}
                      onClick={() => setEditingItem(null)}
                    >✕</button>
                  </td>
                </tr>
              ) : (
                <tr key={li.id}>
                  <td>{li.description ?? "—"}</td>
                  <td><MoneyDisplay pennies={li.amount} /></td>
                  <td style={{ display: "flex", gap: "0.3rem" }}>
                    <button
                      type="button"
                      className="secondary outline"
                      style={{ padding: "0.15em 0.4em", fontSize: "0.85em" }}
                      onClick={() => startEditItem(li)}
                    >Edit</button>
                    <button
                      type="button"
                      className="contrast outline"
                      style={{ padding: "0.15em 0.4em", fontSize: "0.85em" }}
                      onClick={() => onRemoveLineItem?.(li)}
                    >✕</button>
                  </td>
                </tr>
              )
            )}
            <tr>
              <td><strong>Total</strong></td>
              <td><strong><MoneyDisplay pennies={total} /></strong></td>
              <td></td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p style={{ color: "var(--pico-muted-color)", fontSize: "0.9em" }}>No line items yet.</p>
      )}

      {/* Add line item */}
      <form onSubmit={handleAddSubmit} style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", alignItems: "flex-end" }}>
        <div style={{ flex: 2 }}>
          <input
            placeholder="Description"
            value={addDesc}
            onChange={(e) => setAddDesc(e.target.value)}
            style={{ margin: 0 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <MoneyField
            label=""
            value={addAmt}
            onChange={(pennies) => setAddAmt(pennies)}
            style={{ margin: 0 }}
            min={0}
          />
        </div>
        <button
          type="submit"
          className="secondary outline"
          style={{ padding: "0.3em 0.7em", width: "auto" }}
          disabled={!addDesc || addAmt == null}
        >
          + Add
        </button>
      </form>
    </div>
  );
}
