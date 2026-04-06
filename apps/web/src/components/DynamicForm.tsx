import { useState, type FormEvent } from "react";
import type { FormField } from "@eazque/shared";

interface DynamicFormProps {
  fields: FormField[];
  primaryColor: string;
  loading: boolean;
  onSubmit: (data: {
    customerName: string;
    phone: string;
    formData: Record<string, string | number | boolean>;
  }) => void;
}

export default function DynamicForm({
  fields,
  primaryColor,
  loading,
  onSubmit,
}: DynamicFormProps) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [formData, setFormData] = useState<
    Record<string, string | number | boolean>
  >({});

  const handleFieldChange = (
    fieldId: string,
    value: string | number | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ customerName, phone, formData });
  };

  return (
    <form onSubmit={handleSubmit} className="dynamic-form">
      <div className="form-field">
        <label htmlFor="customerName">Name *</label>
        <input
          id="customerName"
          type="text"
          required
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Your name"
        />
      </div>

      <div className="form-field">
        <label htmlFor="phone">Phone *</label>
        <input
          id="phone"
          type="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Your phone number"
        />
      </div>

      {fields.map((field) => (
        <div key={field.id} className="form-field">
          <label htmlFor={field.id}>
            {field.label}
            {field.required ? " *" : ""}
          </label>
          {renderField(field, formData[field.id], (val) =>
            handleFieldChange(field.id, val)
          )}
        </div>
      ))}

      <button
        type="submit"
        className="submit-button"
        style={{ backgroundColor: primaryColor }}
        disabled={loading}
      >
        {loading ? "Joining..." : "Join Queue"}
      </button>
    </form>
  );
}

function renderField(
  field: FormField,
  value: string | number | boolean | undefined,
  onChange: (val: string | number | boolean) => void
) {
  switch (field.type) {
    case "text":
      return (
        <input
          id={field.id}
          type="text"
          required={field.required}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "number":
      return (
        <input
          id={field.id}
          type="number"
          required={field.required}
          value={(value as number) ?? ""}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    case "phone":
      return (
        <input
          id={field.id}
          type="tel"
          required={field.required}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "dropdown":
      return (
        <select
          id={field.id}
          required={field.required}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select...</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    case "checkbox":
      return (
        <div className="checkbox-field">
          <input
            id={field.id}
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
        </div>
      );
  }
}
