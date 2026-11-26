import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { emitPostRemoved, emitPostRestored } from "@/lib/postEvents";
import type { ClientPostSchema } from "@/lib/types/type";
import type { UserData } from "@/lib/types/user";

import Profile from "../clientComps";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  notFound: jest.fn(),
}));
jest.mock("react-redux", () => ({ useSelector: () => ({ conversations: [] }) }));
jest.mock("@/lib/toast", () => ({ toast: Object.assign(jest.fn(), { error: jest.fn() }) }));
jest.mock("@/app/providers/SocketProvider", () => ({ useSocket: () => null }));
jest.mock("@/app/providers/UserProvider", () => ({ useUser: () => ({ userdata: { _id: "me" } }) }));
jest.mock("@/hooks/useNavigateWithHistory", () => ({ useNavigateWithHistory: () => jest.fn() }));
jest.mock("@/lib/followApi", () => ({ submitFollowUpdate: jest.fn() }));
jest.mock("@/components/VerificationComponent", () => ({ Statuser: () => null }));
jest.mock("../ProfileMenu", () => ({ __esModule: true, default: () => null }));
jest.mock("../ContentTabs", () => ({
  __esModule: true,
  default: ({ posts }: { posts: ClientPostSchema[] }) => (
    <ul>
      {posts.map((p) => (
        <li key={p.PostID}>{p.PostID}</li>
      ))}
    </ul>
  ),
}));
jest.mock("@/components/chat/MediaViewer", () => ({
  MediaViewer: ({ open, index, files }: { open: boolean; index: number; files: { name: string }[] }) =>
    open ? <div role="dialog">{files[index].name}</div> : null,
}));

const profile = {
  _id: "u1",
  username: "ada",
  name: "Ada Lovelace",
  firstname: "Ada",
  lastname: "Lovelace",
  displayPicture: "https://x/avatar.png",
  coverPhoto: "https://x/cover.png",
  postCount: 42,
} as unknown as UserData;

const card = (id: string, Type: ClientPostSchema["Type"], time = 1) =>
  ({ PostID: id, _id: id, UserId: "u1", Type, TimeOfPost: new Date(time).toISOString() }) as ClientPostSchema;

const cards = [card("a", "post", 3), card("b", "quote", 2), card("c", "comment", 1)];

function setup(data: UserData = profile, loaded: ClientPostSchema[] = cards) {
  return render(
    <Profile
      profileData={data}
      profilePostCards={loaded}
      postsPagination={{ skip: 0, limit: 20, hasMore: true }}
    />
  );
}

beforeAll(() => {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
});

describe("Profile post count", () => {
  it("shows the server's total, not how many posts happen to be loaded", () => {
    setup();
    expect(screen.getAllByText("42 posts")).toHaveLength(2); // top bar + stats line
  });

  it("goes down when one of your counted posts is deleted, and back if the delete fails", () => {
    setup();
    act(() => emitPostRemoved({ postId: "a", type: "post" }));
    expect(screen.getAllByText("41 posts")).toHaveLength(2);
    expect(screen.queryByText("a")).toBeNull();
    act(() => emitPostRestored(cards[0]));
    expect(screen.getAllByText("42 posts")).toHaveLength(2);
    expect(screen.getByText("a")).toBeInTheDocument();
  });

  it("counts quote posts but not comments", () => {
    setup();
    act(() => emitPostRemoved({ postId: "c", type: "comment" }));
    expect(screen.getAllByText("42 posts")).toHaveLength(2);
    act(() => emitPostRemoved({ postId: "b", type: "quote" }));
    expect(screen.getAllByText("41 posts")).toHaveLength(2);
  });

  it("handles a post that isn't loaded, using the type it was told", () => {
    setup();
    act(() => emitPostRemoved({ postId: "not-loaded", type: "post" }));
    expect(screen.getAllByText("41 posts")).toHaveLength(2);
  });

  it("says '1 post' in the singular", () => {
    setup({ ...profile, postCount: 1 } as UserData, []);
    expect(screen.getAllByText("1 post").length).toBeGreaterThan(0);
  });
});

describe("Profile photos", () => {
  it("opens the profile photo, then the cover, in the viewer", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "View profile photo" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("ada-profile");
  });

  it("opens the cover photo straight away from the cover", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "View cover photo" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("ada-cover");
  });

  it("has nothing to open without a photo", () => {
    setup({ ...profile, displayPicture: "", coverPhoto: "" } as UserData);
    expect(screen.getByRole("button", { name: "View profile photo" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "View cover photo" })).toBeNull();
  });
});
