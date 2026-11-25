import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PasskeyManager, passkeyKind } from "@/components/passkey/PasskeyManager";
import { deletePasskey, listPasskeys } from "@/lib/passkey-client";

jest.mock("@/lib/passkey-client", () => ({
  listPasskeys: jest.fn(),
  deletePasskey: jest.fn(),
  isPasskeySupported: () => true,
  registerPasskey: jest.fn(),
}));

const now = new Date().toISOString();
const key = (over = {}) => ({ id: "1", name: "Samsung A04s", createdAt: now, lastUsedAt: now, ...over });

describe("passkeyKind", () => {
  it("tells phones, computers and security keys apart", () => {
    expect(passkeyKind({ name: "Samsung A04s", transports: ["internal"] })).toBe("phone");
    expect(passkeyKind({ name: "MacBook Pro" })).toBe("computer");
    expect(passkeyKind({ name: "Passkey", transports: ["hybrid"] })).toBe("phone");
    expect(passkeyKind({ name: "YubiKey", transports: ["usb"] })).toBe("key");
    expect(passkeyKind({ name: "Passkey", transports: ["internal"] })).toBe("computer");
  });
});

describe("PasskeyManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.matchMedia = ((query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
  });

  it("lists passkeys with a backed-up chip and an add row", async () => {
    (listPasskeys as jest.Mock).mockResolvedValue({
      success: true,
      passkeys: [key({ credentialBackedUp: true })],
    });
    render(<PasskeyManager />);
    expect(await screen.findByText("Samsung A04s")).toBeInTheDocument();
    expect(screen.getByText("Backed up")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add a passkey" })).toBeInTheDocument();
  });

  it("shows an empty message when there are none", async () => {
    (listPasskeys as jest.Mock).mockResolvedValue({ success: true, passkeys: [] });
    render(<PasskeyManager />);
    expect(await screen.findByText(/No passkeys yet/)).toBeInTheDocument();
  });

  it("deletes only after confirming", async () => {
    (listPasskeys as jest.Mock).mockResolvedValue({ success: true, passkeys: [key()] });
    (deletePasskey as jest.Mock).mockResolvedValue({ success: true });
    render(<PasskeyManager />);
    await userEvent.click(await screen.findByRole("button", { name: "Delete passkey Samsung A04s" }));
    expect(deletePasskey).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deletePasskey).toHaveBeenCalledWith("1"));
    await waitFor(() => expect(screen.queryByText("Samsung A04s")).toBeNull());
  });
});
