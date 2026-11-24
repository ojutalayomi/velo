import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";

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

function Example({ mobile, onOpenChange = () => {} }: { mobile?: "drawer" | "fullscreen"; onOpenChange?: (open: boolean) => void }) {
  return (
    <ResponsiveDialog open onOpenChange={onOpenChange} mobile={mobile}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Forward to</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>Pick chats</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <input aria-label="Search" />
        <ResponsiveDialogFooter>
          <button>Send</button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

describe("ResponsiveDialog", () => {
  it("is a centred dialog on large screens", () => {
    setPhone(false);
    render(<Example mobile="fullscreen" />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Forward to");
    // The dialog card, not the full-screen sheet.
    expect(dialog.className).toContain("max-w-lg");
    expect(dialog.className).not.toContain("h-dvh");
  });

  it("is a full-screen sheet on phones when asked, with a close button", async () => {
    setPhone(true);
    const onOpenChange = jest.fn();
    render(<Example mobile="fullscreen" onOpenChange={onOpenChange} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("h-dvh");
    expect(dialog.className).toContain("bg-background");
    expect(screen.getByText("Forward to")).toBeInTheDocument();
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("is a bottom drawer on phones by default", () => {
    setPhone(true);
    render(<Example />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).not.toContain("h-dvh");
    expect(dialog.className).not.toContain("max-w-lg");
    expect(screen.getByText("Forward to")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });
});
