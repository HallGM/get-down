import FormField from "./FormField.js";
import MoneyField from "./MoneyField.js";

export interface LineItemEditorProps {
  lineItems: Array<{
    description: string;
    amount: number;
  }>;
  onLineItemChange: (index: number, field: "description" | "amount", value: string | number | undefined) => void;
  onAddLineItem: () => void;
  onRemoveLineItem: (index: number) => void;
}

export default function LineItemEditor({
  lineItems,
  onLineItemChange,
  onAddLineItem,
  onRemoveLineItem,
}: LineItemEditorProps) {
  return (
    <>
      <h3>Line Items</h3>
      {lineItems?.map((item, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 30px", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <FormField
            label={i === 0 ? "Description" : ""}
            value={item.description}
            onChange={(e) => onLineItemChange(i, "description", e.target.value)}
            required
          />
          <MoneyField
            label={i === 0 ? "Amount" : ""}
            value={item.amount}
            onChange={(pennies) => onLineItemChange(i, "amount", pennies)}
            required
          />
          <button
            type="button"
            className="contrast outline"
            style={{ padding: "0.2em", marginTop: i === 0 ? "1.5rem" : "0" }}
            onClick={() => onRemoveLineItem(i)}
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="secondary" onClick={onAddLineItem}>
        + Add Line Item
      </button>
    </>
  );
}
