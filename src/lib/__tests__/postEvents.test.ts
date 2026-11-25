import {
  countsAsPost,
  emitPostRemoved,
  emitPostRestored,
  onPostRemoved,
  onPostRestored,
} from "@/lib/postEvents";
import type { ClientPostSchema } from "@/lib/types/type";

describe("postEvents", () => {
  it("tells listeners which post was removed, until they unsubscribe", () => {
    const heard = jest.fn();
    const off = onPostRemoved(heard);
    emitPostRemoved({ postId: "p1", type: "post" });
    expect(heard).toHaveBeenCalledWith({ postId: "p1", type: "post" });
    off();
    emitPostRemoved({ postId: "p2" });
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it("tells listeners when a failed delete brings the post back", () => {
    const heard = jest.fn();
    const off = onPostRestored(heard);
    const post = { PostID: "p1", Type: "quote" } as ClientPostSchema;
    emitPostRestored(post);
    expect(heard).toHaveBeenCalledWith(post);
    off();
  });

  it("counts posts and quotes, not comments or reposts", () => {
    expect(countsAsPost("post")).toBe(true);
    expect(countsAsPost("quote")).toBe(true);
    expect(countsAsPost("comment")).toBe(false);
    expect(countsAsPost("repost")).toBe(false);
    expect(countsAsPost(undefined)).toBe(false);
  });
});
