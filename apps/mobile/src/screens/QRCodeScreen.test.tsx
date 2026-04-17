import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import QRCodeScreen from "./QRCodeScreen";

jest.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ businessId: "biz1" }),
}));

jest.mock("../hooks/useBusinessSettings", () => ({
  useBusinessSettings: () => ({
    business: {
      id: "biz1",
      name: "Test Cafe",
      primaryColor: "#B8926A",
      whatsappNumber: "",
      whatsappApiKey: "",
      defaultEstimatedTimePerCustomer: 10,
      approachingThreshold: 3,
      formFields: [],
    },
    loading: false,
  }),
}));

jest.mock("react-native-qrcode-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ value }: { value: string }) =>
      React.createElement(View, { testID: "qr-code", accessibilityLabel: value }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCaptureRef = (jest.fn() as any).mockResolvedValue("file://qr.png");
jest.mock("react-native-view-shot", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: React.forwardRef(({ children }: any, _ref: any) =>
      React.createElement(View, null, children)
    ),
    captureRef: (...args: any[]) => mockCaptureRef(...args),
  };
});

jest.mock("expo-media-library", () => ({
  requestPermissionsAsync: jest.fn(),
  saveToLibraryAsync: jest.fn(),
}));

jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

describe("QRCodeScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders business name and QR code", () => {
    render(<QRCodeScreen />);
    expect(screen.getByText("Test Cafe")).toBeTruthy();
    expect(screen.getByTestId("qr-code")).toBeTruthy();
  });

  it("QR code encodes the correct URL", () => {
    render(<QRCodeScreen />);
    const qr = screen.getByTestId("qr-code");
    expect(qr.props.accessibilityLabel).toContain("/q/biz1");
  });

  it("Save to Photos requests permission and saves when granted", async () => {
    (MediaLibrary.requestPermissionsAsync as any).mockResolvedValue({
      status: "granted",
    });
    (MediaLibrary.saveToLibraryAsync as any).mockResolvedValue(undefined);

    render(<QRCodeScreen />);
    fireEvent.press(screen.getByText("Save to Photos"));

    await waitFor(() => {
      expect(MediaLibrary.requestPermissionsAsync).toHaveBeenCalled();
      expect(MediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith("file://qr.png");
    });
  });

  it("Save to Photos shows alert when permission denied", async () => {
    (MediaLibrary.requestPermissionsAsync as any).mockResolvedValue({
      status: "denied",
    });

    const alertSpy = jest.spyOn(require("react-native").Alert, "alert");
    render(<QRCodeScreen />);
    fireEvent.press(screen.getByText("Save to Photos"));

    await waitFor(() => {
      expect(MediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledWith(
        "Permission Required",
        expect.any(String)
      );
    });
  });

  it("Share button calls Sharing.shareAsync with captured URI", async () => {
    (Sharing.isAvailableAsync as any).mockResolvedValue(true);
    (Sharing.shareAsync as any).mockResolvedValue(undefined);

    render(<QRCodeScreen />);
    fireEvent.press(screen.getByText("Share"));

    await waitFor(() => {
      expect(Sharing.shareAsync).toHaveBeenCalledWith("file://qr.png", {
        mimeType: "image/png",
        UTI: "public.png",
      });
    });
  });
});
