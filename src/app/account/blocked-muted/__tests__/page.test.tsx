import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import BlockedMutedPage from "@/app/account/blocked-muted/page";
import { fetchRelatedUsers } from "@/lib/relatedUsersApi";
import { toast } from "@/lib/toast";
import { setUserBlocked, setUserMuted } from "@/lib/userRelations";

jest.mock("@/lib/relatedUsersApi", () => ({ fetchRelatedUsers: jest.fn() }));
jest.mock("@/lib/userRelations", () => ({ setUserMuted: jest.fn(), setUserBlocked: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));
jest.mock("@/components/settings/SettingsUI", () => ({ SettingsHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
jest.mock("@/components/VerificationComponent", () => ({ Statuser: () => <span data-testid="verified" /> }));

const user = (username: string, verified = false) => ({
  _id: `id-${username}`,
  name: username.toUpperCase(),
  username,
  displayPicture: "",
  verified,
  since: "2026-11-20T00:00:00.000Z",
});

const lists = (muted: ReturnType<typeof user>[], blocked: ReturnType<typeof user>[]) =>
  (fetchRelatedUsers as jest.Mock).mockImplementation(async (kind: string) => (kind === "muted" ? muted : blocked));

beforeEach(() => {
  jest.clearAllMocks();
  (setUserMuted as jest.Mock).mockResolvedValue(null);
  (setUserBlocked as jest.Mock).mockResolvedValue(null);
});

describe("Muted and blocked accounts", () => {
  it("lists muted accounts, with a count on each tab", async () => {
    lists([user("ada", true), user("bo")], [user("cy")]);
    render(<BlockedMutedPage />);
    expect(await screen.findByText("ADA")).toBeInTheDocument();
    expect(screen.getByText("@bo")).toBeInTheDocument();
    expect(screen.getByTestId("verified")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Muted (2)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Blocked (1)" })).toBeInTheDocument();
  });

  it("unmutes with one tap and takes the account off the list", async () => {
    lists([user("ada"), user("bo")], []);
    render(<BlockedMutedPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Unmute @ada" }));
    expect(setUserMuted).toHaveBeenCalledWith("id-ada", false);
    await waitFor(() => expect(screen.queryByText("@ada")).toBeNull());
    expect(screen.getByText("@bo")).toBeInTheDocument();
    expect(toast).toHaveBeenCalledWith("Unmuted @ada", expect.objectContaining({ action: expect.anything() }));
  });

  it("unblocks from the Blocked tab", async () => {
    lists([], [user("cy")]);
    render(<BlockedMutedPage />);
    await userEvent.click(await screen.findByRole("tab", { name: /Blocked/ }));
    await userEvent.click(within(screen.getByRole("tabpanel")).getByRole("button", { name: "Unblock @cy" }));
    expect(setUserBlocked).toHaveBeenCalledWith("id-cy", false);
    expect(setUserMuted).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("You haven't blocked anyone.")).toBeInTheDocument());
  });

  it("keeps the account and shows the error when undoing fails", async () => {
    lists([user("ada")], []);
    (setUserMuted as jest.Mock).mockResolvedValue("You're offline. Try again when you're back online.");
    render(<BlockedMutedPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Unmute @ada" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("You're offline. Try again when you're back online."));
    expect(screen.getByText("@ada")).toBeInTheDocument();
  });

  it("says so when there is nobody, and offers a retry when loading fails", async () => {
    lists([], []);
    const { unmount } = render(<BlockedMutedPage />);
    expect(await screen.findByText("You haven't muted anyone.")).toBeInTheDocument();
    unmount();

    (fetchRelatedUsers as jest.Mock).mockRejectedValue(new Error("Couldn't load this list. Try again."));
    render(<BlockedMutedPage />);
    expect(await screen.findAllByText("Couldn't load this list. Try again.")).not.toHaveLength(0);
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
