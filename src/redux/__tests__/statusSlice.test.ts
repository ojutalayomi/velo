import reducer, {
  addViewerToOwnedStatus,
  markViewedLocal,
  setStatusGroups,
  setStatusLikes,
} from "@/redux/statusSlice";
import type { StatusClient, StatusGroup } from "@/lib/types/status";

const status = (over: Partial<StatusClient> = {}): StatusClient => ({
  _id: "s1",
  userId: "owner",
  mediaUrl: "",
  mediaKey: "",
  mediaType: "text",
  caption: "",
  createdAt: "2026-11-25T10:00:00.000Z",
  expiresAt: "2026-11-26T10:00:00.000Z",
  visibility: "followers",
  mentions: [],
  viewed: false,
  viewers: [],
  viewCount: 0,
  likeCount: 0,
  liked: false,
  ...over,
});

const group = (statuses: StatusClient[]): StatusGroup => ({
  user: { _id: "owner", name: "Ada", username: "ada", displayPicture: "", verified: false },
  statuses,
  hasUnviewed: true,
  latestAt: statuses[0].createdAt,
});

const load = (s = status()) => reducer(undefined, setStatusGroups([group([s])]));

describe("statusSlice likes and views", () => {
  it("sets the like count, and the heart only when told to", () => {
    let state = load();
    state = reducer(state, setStatusLikes({ statusId: "s1", likeCount: 4 }));
    expect(state.groups[0].statuses[0]).toMatchObject({ likeCount: 4, liked: false });
    state = reducer(state, setStatusLikes({ statusId: "s1", likeCount: 5, liked: true }));
    expect(state.groups[0].statuses[0]).toMatchObject({ likeCount: 5, liked: true });
  });

  it("counts a new viewer on the owner's status once", () => {
    let state = load();
    const viewer = { userId: "fan", viewedAt: "2026-11-25T11:00:00.000Z" };
    state = reducer(state, addViewerToOwnedStatus({ statusId: "s1", viewer }));
    state = reducer(state, addViewerToOwnedStatus({ statusId: "s1", viewer }));
    expect(state.groups[0].statuses[0].viewers).toHaveLength(1);
    expect(state.groups[0].statuses[0].viewCount).toBe(1);
  });

  it("counts your own first view, and clears the unviewed ring", () => {
    let state = load(status({ viewCount: 7 }));
    const viewer = { userId: "me", viewedAt: "2026-11-25T11:00:00.000Z" };
    state = reducer(state, markViewedLocal({ statusId: "s1", viewer }));
    expect(state.groups[0].statuses[0]).toMatchObject({ viewed: true, viewCount: 8 });
    expect(state.groups[0].hasUnviewed).toBe(false);
    state = reducer(state, markViewedLocal({ statusId: "s1", viewer }));
    expect(state.groups[0].statuses[0].viewCount).toBe(8);
  });
});
