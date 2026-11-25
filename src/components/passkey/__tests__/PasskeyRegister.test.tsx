import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PasskeyRegister } from "@/components/passkey/PasskeyRegister";

jest.mock("@/lib/passkey-client", () => ({
  isPasskeySupported: () => true,
  registerPasskey: jest.fn(),
}));

function setPhone(isPhone: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: isPhone,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
}

describe("PasskeyRegister", () => {
  it.each([
    ["a dialog on large screens", false, "max-w-"],
    ["a bottom sheet on phones", true, ""],
  ])("opens as %s from the default button", async (_name, phone, cls) => {
    setPhone(phone);
    render(<PasskeyRegister />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Add Passkey/ }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Create a Passkey");
    if (cls) expect(dialog.className).toContain(cls);
    else expect(dialog.className).not.toContain("max-w-lg");
    expect(screen.getByLabelText(/Device Name/)).toBeInTheDocument();
  });

  it("opens from a custom trigger and keeps its own click handler", async () => {
    setPhone(true);
    const onClick = jest.fn();
    render(<PasskeyRegister trigger={<button onClick={onClick}>Custom</button>} />);
    await userEvent.click(screen.getByRole("button", { name: "Custom" }));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
