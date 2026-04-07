import { render, screen, fireEvent } from "@testing-library/react-native";
import { describe, it, expect, jest } from "@jest/globals";
import FormFieldItem from "./FormFieldItem";
import type { FormField } from "@eazque/shared";

const mockField: FormField = {
  id: "f1",
  type: "text",
  label: "Full Name",
  required: true,
};

const noop = () => {};

describe("FormFieldItem", () => {
  it("displays field label and type", () => {
    render(
      <FormFieldItem
        field={mockField}
        index={0}
        totalCount={3}
        onEdit={noop}
        onDelete={noop}
        onMoveUp={noop}
        onMoveDown={noop}
      />
    );
    expect(screen.getByText("Full Name")).toBeTruthy();
    expect(screen.getByText("text")).toBeTruthy();
  });

  it("shows required indicator", () => {
    render(
      <FormFieldItem
        field={mockField}
        index={0}
        totalCount={3}
        onEdit={noop}
        onDelete={noop}
        onMoveUp={noop}
        onMoveDown={noop}
      />
    );
    expect(screen.getByText("Required")).toBeTruthy();
  });

  it("does not show required indicator when optional", () => {
    const optionalField = { ...mockField, required: false };
    render(
      <FormFieldItem
        field={optionalField}
        index={0}
        totalCount={3}
        onEdit={noop}
        onDelete={noop}
        onMoveUp={noop}
        onMoveDown={noop}
      />
    );
    expect(screen.queryByText("Required")).toBeNull();
  });

  it("calls onEdit when edit button pressed", () => {
    const onEdit = jest.fn();
    render(
      <FormFieldItem
        field={mockField}
        index={0}
        totalCount={3}
        onEdit={onEdit}
        onDelete={noop}
        onMoveUp={noop}
        onMoveDown={noop}
      />
    );
    fireEvent.press(screen.getByLabelText("Edit field"));
    expect(onEdit).toHaveBeenCalledWith("f1");
  });

  it("calls onDelete when delete button pressed", () => {
    const onDelete = jest.fn();
    render(
      <FormFieldItem
        field={mockField}
        index={0}
        totalCount={3}
        onEdit={noop}
        onDelete={onDelete}
        onMoveUp={noop}
        onMoveDown={noop}
      />
    );
    fireEvent.press(screen.getByLabelText("Delete field"));
    expect(onDelete).toHaveBeenCalledWith("f1");
  });

  it("disables move up when first item", () => {
    const onMoveUp = jest.fn();
    render(
      <FormFieldItem
        field={mockField}
        index={0}
        totalCount={3}
        onEdit={noop}
        onDelete={noop}
        onMoveUp={onMoveUp}
        onMoveDown={noop}
      />
    );
    fireEvent.press(screen.getByLabelText("Move up"));
    expect(onMoveUp).not.toHaveBeenCalled();
  });

  it("disables move down when last item", () => {
    const onMoveDown = jest.fn();
    render(
      <FormFieldItem
        field={mockField}
        index={2}
        totalCount={3}
        onEdit={noop}
        onDelete={noop}
        onMoveUp={noop}
        onMoveDown={onMoveDown}
      />
    );
    fireEvent.press(screen.getByLabelText("Move down"));
    expect(onMoveDown).not.toHaveBeenCalled();
  });
});
