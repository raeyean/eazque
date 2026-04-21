import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SignUpPage from "./SignUpPage";

const mockNavigate = vi.fn();
const mockSignUp = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock("../StaffAuthContext", () => ({
  useStaffAuth: () => ({ signUp: mockSignUp }),
}));

function renderPage() {
  return render(<SignUpPage />);
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockSignUp.mockReset();
});

describe("SignUpPage", () => {
  it("renders all 4 section headings", () => {
    renderPage();
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Business Info")).toBeInTheDocument();
    expect(screen.getByText("Branding")).toBeInTheDocument();
    expect(screen.getByText("Customer Form Fields")).toBeInTheDocument();
  });

  it("submit button is disabled when required fields are empty", () => {
    renderPage();
    const btn = screen.getByRole("button", { name: /create account/i });
    expect(btn).toBeDisabled();
  });

  it("primary color input defaults to #B8926A", () => {
    renderPage();
    // Find color inputs — look for the text input showing the hex value
    const colorTextInput = screen.getAllByDisplayValue("#B8926A");
    expect(colorTextInput.length).toBeGreaterThan(0);
  });

  it("can add a form field and it appears in the list", async () => {
    renderPage();
    fireEvent.click(screen.getByText("+ Add Field"));
    const labelInput = screen.getByLabelText("Label");
    fireEvent.change(labelInput, { target: { value: "Phone Number" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => {
      expect(screen.getByText(/Phone Number/)).toBeInTheDocument();
    });
  });

  it("successful submit calls signUp with correct payload and navigates to /staff/queue", async () => {
    mockSignUp.mockResolvedValueOnce(undefined);
    renderPage();

    fireEvent.change(screen.getByLabelText(/owner name/i), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret123" } });
    fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: "Jane's Shop" } });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "jane@example.com",
          password: "secret123",
          ownerName: "Jane Doe",
          businessName: "Jane's Shop",
          primaryColor: "#B8926A",
        }),
        null,
      );
      expect(mockNavigate).toHaveBeenCalledWith("/staff/queue");
    });
  });

  it("shows 'Email already registered' when signUp rejects with functions/already-exists", async () => {
    const err = Object.assign(new Error("already exists"), { code: "functions/already-exists" });
    mockSignUp.mockRejectedValueOnce(err);
    renderPage();

    fireEvent.change(screen.getByLabelText(/owner name/i), { target: { value: "Jane Doe" } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jane@example.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "secret123" } });
    fireEvent.change(screen.getByLabelText(/business name/i), { target: { value: "Jane's Shop" } });

    fireEvent.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/email already registered/i)).toBeInTheDocument();
    });
  });
});
