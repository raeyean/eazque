import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import DynamicForm from "./DynamicForm";
import type { FormField } from "@eazque/shared";

const defaultProps = {
  fields: [] as FormField[],
  primaryColor: "#B8926A",
  loading: false,
  onSubmit: vi.fn(),
};

describe("DynamicForm", () => {
  it("renders name and phone inputs always", () => {
    render(<DynamicForm {...defaultProps} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
  });

  it("renders text input for text field type", () => {
    const fields: FormField[] = [
      { id: "notes", type: "text", label: "Notes", required: false },
    ];
    render(<DynamicForm {...defaultProps} fields={fields} />);
    const input = screen.getByLabelText(/notes/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "text");
  });

  it("renders select for dropdown field with options", () => {
    const fields: FormField[] = [
      {
        id: "service",
        type: "dropdown",
        label: "Service Type",
        required: true,
        options: ["Haircut", "Shave", "Trim"],
      },
    ];
    render(<DynamicForm {...defaultProps} fields={fields} />);
    const select = screen.getByLabelText(/service type/i);
    expect(select.tagName).toBe("SELECT");
    expect(screen.getByText("Haircut")).toBeInTheDocument();
    expect(screen.getByText("Shave")).toBeInTheDocument();
    expect(screen.getByText("Trim")).toBeInTheDocument();
  });

  it("renders checkbox for checkbox field type", () => {
    const fields: FormField[] = [
      { id: "vip", type: "checkbox", label: "VIP Customer", required: false },
    ];
    render(<DynamicForm {...defaultProps} fields={fields} />);
    expect(screen.getByLabelText(/vip customer/i)).toHaveAttribute(
      "type",
      "checkbox"
    );
  });

  it("calls onSubmit with collected form data", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const fields: FormField[] = [
      { id: "notes", type: "text", label: "Notes", required: false },
    ];
    render(
      <DynamicForm {...defaultProps} fields={fields} onSubmit={onSubmit} />
    );

    await user.type(screen.getByLabelText(/name/i), "John");
    await user.type(screen.getByLabelText(/phone/i), "+60123");
    await user.type(screen.getByLabelText(/notes/i), "Window seat");
    await user.click(screen.getByRole("button", { name: /join queue/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      customerName: "John",
      phone: "+60123",
      formData: { notes: "Window seat" },
    });
  });

  it("shows loading state when submitting", () => {
    render(<DynamicForm {...defaultProps} loading={true} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Joining...");
  });
});
