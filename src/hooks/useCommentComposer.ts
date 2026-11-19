"use client";

import { useCallback, useState } from "react";

import { useSocket } from "@/app/providers/SocketProvider";
import { useUser } from "@/app/providers/UserProvider";
import { PostSchema } from "@/lib/types/type";
import { useAppDispatch } from "@/redux/hooks";
import { updatePost } from "@/redux/postsSlice";

/**
 * Builds the payload the socket server expects for `post`. The server fills in
 * the author fields, so everything identity-related is left blank.
 */
export function buildPostPayload(
  type: PostSchema["Type"],
  fields: Partial<PostSchema> & { parentId?: string }
): PostSchema {
  const { parentId, ...rest } = fields;
  return {
    _id: "",
    UserId: "",
    DisplayPicture: "",
    NameOfPoster: "",
    Verified: false,
    TimeOfPost: new Date().toISOString(),
    Visibility: "everyone",
    Caption: "",
    Image: [],
    IsFollowing: false,
    NoOfLikes: 0,
    Liked: false,
    NoOfComment: 0,
    NoOfShares: 0,
    NoOfBookmarks: 0,
    Bookmarked: false,
    Username: "",
    PostID: "",
    Code: "",
    WhoCanComment: "everyone",
    Shared: false,
    Type: type,
    ParentId: parentId ?? "",
    ...rest,
  } as PostSchema;
}

export interface UseCommentComposerOptions {
  /** Called after the comment has been emitted. */
  onSubmitted?: (comment: PostSchema) => void;
  /** Bump the parent's NoOfComment in Redux right away. Defaults to true. */
  optimistic?: boolean;
  /** Optional controlled text, e.g. to share one draft between two inputs. */
  text?: string;
  onTextChange?: (text: string) => void;
}

/**
 * Headless comment composer: owns the text, validation, socket emit and the
 * optimistic comment-count bump. Layout is up to the caller (see CommentComposer).
 */
export function useCommentComposer(
  parent: PostSchema | null | undefined,
  { onSubmitted, optimistic = true, text: controlledText, onTextChange }: UseCommentComposerOptions = {}
) {
  const socket = useSocket();
  const dispatch = useAppDispatch();
  const { userdata } = useUser();
  const [innerText, setInnerText] = useState("");
  const text = controlledText ?? innerText;
  const setText = useCallback(
    (next: string) => {
      setInnerText(next);
      onTextChange?.(next);
    },
    [onTextChange]
  );

  const isSignedIn = Boolean(userdata._id);
  const canSubmit = Boolean(parent?.PostID) && isSignedIn && Boolean(socket) && text.trim().length > 0;

  const submit = useCallback(
    (override?: string): boolean => {
      const caption = (override ?? text).trim();
      if (!parent?.PostID || !isSignedIn || !socket || !caption) return false;

      const comment = buildPostPayload("comment", {
        Caption: caption,
        WhoCanComment: "everyone",
        parentId: parent.PostID,
      });
      socket.emit("post", comment);

      if (optimistic) {
        dispatch(
          updatePost({
            id: parent.PostID,
            updates: { NoOfComment: (parent.NoOfComment ?? 0) + 1 },
          })
        );
      }
      setText("");
      onSubmitted?.(comment);
      return true;
    },
    [parent, isSignedIn, socket, text, setText, optimistic, dispatch, onSubmitted]
  );

  return { text, setText, submit, canSubmit, isSignedIn };
}
