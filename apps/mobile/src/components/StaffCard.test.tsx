import { render, screen } from "@testing-library/react-native";
import { describe, it, expect, jest } from "@jest/globals";
import StaffCard from "./StaffCard";
import type { Staff } from "@eazque/shared";

jest.mock("react-native-gesture-handler", () => ({
  Swipeable: ({ children, renderRightActions }: any) => (
    <>
      {children}
      {renderRightActions && renderRightActions()}
    </>
  ),
}));

const mockOwner: Staff = {
  id: "uid1",
  email: "owner@test.com",
  name: "Alice",
  role: "owner",
  status: "active",
  createdAt: new Date(),
};

const mockStaff: Staff = {
  id: "uid2",
  email: "staff@test.com",
  name: "Bob",
  role: "staff",
  status: "pending",
  createdAt: new Date(),
};

const noop = () => {};

describe("StaffCard", () => {
  it("displays name and email", () => {
    render(<StaffCard member={mockOwner} onRemove={noop} isCurrentUser={false} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("owner@test.com")).toBeTruthy();
  });

  it("displays role badge", () => {
    render(<StaffCard member={mockOwner} onRemove={noop} isCurrentUser={false} />);
    expect(screen.getByText("Owner")).toBeTruthy();
  });

  it("displays pending status badge", () => {
    render(<StaffCard member={mockStaff} onRemove={noop} isCurrentUser={false} />);
    expect(screen.getByText("Pending")).toBeTruthy();
  });

  it("shows remove action for non-current-user staff", () => {
    render(<StaffCard member={mockStaff} onRemove={noop} isCurrentUser={false} />);
    expect(screen.getByText("Remove")).toBeTruthy();
  });

  it("does not show remove action for current user", () => {
    render(<StaffCard member={mockOwner} onRemove={noop} isCurrentUser={true} />);
    expect(screen.queryByText("Remove")).toBeNull();
  });
});
