import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendWhatsAppNotification } from "../src/whatsapp";

describe("sendWhatsAppNotification", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends POST request to WhatsApp API with correct template", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    await sendWhatsAppNotification({
      apiKey: "test-api-key",
      phoneNumberId: "12345",
      to: "+60123456789",
      template: "your_turn",
      params: { businessName: "Test Cafe", displayNumber: "Q-001" },
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("graph.facebook.com");
    expect(url).toContain("12345");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer test-api-key");

    const body = JSON.parse(options.body);
    expect(body.messaging_product).toBe("whatsapp");
    expect(body.to).toBe("+60123456789");
    expect(body.template.name).toBe("your_turn");
    expect(body.template.components[0].parameters).toEqual([
      { type: "text", text: "Test Cafe" },
      { type: "text", text: "Q-001" },
    ]);
  });

  it("does not throw on API error response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve("Unauthorized"),
    });
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      sendWhatsAppNotification({
        apiKey: "bad-key",
        phoneNumberId: "12345",
        to: "+1",
        template: "your_turn",
        params: { businessName: "Test", displayNumber: "Q-001" },
      })
    ).resolves.toBeUndefined();
  });

  it("does not throw on network error", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    vi.stubGlobal("fetch", mockFetch);

    await expect(
      sendWhatsAppNotification({
        apiKey: "key",
        phoneNumberId: "12345",
        to: "+1",
        template: "approaching",
        params: { businessName: "Test", displayNumber: "Q-001" },
      })
    ).resolves.toBeUndefined();
  });

  it("supports all three template types", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    for (const template of ["your_turn", "approaching", "skipped"] as const) {
      await sendWhatsAppNotification({
        apiKey: "key",
        phoneNumberId: "12345",
        to: "+1",
        template,
        params: { businessName: "Cafe", displayNumber: "Q-005" },
      });
    }

    expect(mockFetch).toHaveBeenCalledTimes(3);
    const templateNames = mockFetch.mock.calls.map(
      ([, opts]: [string, RequestInit]) =>
        JSON.parse(opts.body as string).template.name
    );
    expect(templateNames).toEqual(["your_turn", "approaching", "skipped"]);
  });
});
