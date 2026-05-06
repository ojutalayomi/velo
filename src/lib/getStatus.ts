import { Comments, Post } from "../templates/PostProps";
import type { PaginationMeta } from "./apiPagination";
import { DEFAULT_COMMENT_LIMIT, DEFAULT_POST_LIMIT, DEFAULT_STATUS_LIMIT } from "./apiPagination";
import { PostSchema } from "./types/type";

const url1: string = "/api/status";
const url2: string = "/api/posts";
const url4: string = "/api/comments/";

async function parseJsonResponse(res: Response): Promise<unknown> {
  if (!res.ok) {
    const errorText = await res.text();
    try {
      const errorJson = JSON.parse(errorText) as { error?: string; message?: string };
      throw new Error(errorJson.error || errorJson.message || "Network response was not ok");
    } catch {
      throw new Error("Network response was not ok");
    }
  }
  return res.json();
}

export async function fetchStatusPage(
  skip = 0,
  limit = DEFAULT_STATUS_LIMIT
): Promise<{ data: string[]; pagination: PaginationMeta }> {
  const response = await fetch(`${url1}?limit=${limit}&skip=${skip}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const body = (await parseJsonResponse(response)) as {
    data?: string[];
    pagination?: PaginationMeta;
  };
  const data = Array.isArray(body?.data) ? body.data : [];
  const pagination = body.pagination ?? { skip: 0, limit, hasMore: false };
  return { data, pagination };
}

export async function fetchPostsPage(
  skip = 0,
  limit = DEFAULT_POST_LIMIT
): Promise<{ data: PostSchema[]; pagination: PaginationMeta }> {
  const response = await fetch(`${url2}?limit=${limit}&skip=${skip}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const body = (await parseJsonResponse(response)) as {
    data?: PostSchema[];
    pagination?: PaginationMeta;
  };
  const data = Array.isArray(body?.data) ? body.data : [];
  const pagination = body.pagination ?? { skip: 0, limit, hasMore: false };
  return { data, pagination };
}

export async function fetchFollowingPostsPage(
  skip = 0,
  limit = DEFAULT_POST_LIMIT
): Promise<{ data: PostSchema[]; pagination: PaginationMeta }> {
  const response = await fetch(`/api/posts/following?limit=${limit}&skip=${skip}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const body = (await parseJsonResponse(response)) as {
    data?: PostSchema[];
    pagination?: PaginationMeta;
  };
  const data = Array.isArray(body?.data) ? body.data : [];
  const pagination = body.pagination ?? { skip: 0, limit, hasMore: false };
  return { data, pagination };
}

export async function fetchCommentsPage(
  postId: string,
  skip = 0,
  limit = DEFAULT_COMMENT_LIMIT
): Promise<{
  data: Comments["comments"];
  message: Comments["message"];
  pagination: PaginationMeta;
}> {
  const response = await fetch(`${url4}${postId}?limit=${limit}&skip=${skip}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const body = (await parseJsonResponse(response)) as {
    data?: { comments?: PostSchema[]; message?: string; messge?: string };
    pagination?: PaginationMeta;
    comments?: PostSchema[];
  };
  const inner = body.data ?? {};
  const comments = inner.comments ?? body.comments ?? [];
  const msg =
    (typeof inner.message === "string" && inner.message) ||
    (typeof inner.messge === "string" && inner.messge) ||
    "Success";
  const pagination = body.pagination ?? { skip: 0, limit, hasMore: false };

  return { data: comments, message: msg, pagination };
}

const urlUsersSearch = "/api/users";

/** Autocomplete `/api/users?query=` (not `search` / `getSuggestions` flows). */
export async function fetchUsersSearchPage(
  query: string,
  skip = 0,
  limit = 15
): Promise<{ data: Record<string, unknown>[]; pagination: PaginationMeta }> {
  const clean = query.replace(/[^a-zA-Z0-9\s]/g, "").trim();
  if (!clean) {
    return { data: [], pagination: { skip: 0, limit, hasMore: false } };
  }
  const response = await fetch(
    `${urlUsersSearch}?query=${encodeURIComponent(clean)}&skip=${skip}&limit=${limit}`,
    { headers: { "Content-Type": "application/json" } }
  );
  const body = (await parseJsonResponse(response)) as {
    data?: Record<string, unknown>[];
    pagination?: PaginationMeta;
  };
  const data = Array.isArray(body?.data) ? body.data : [];
  const pagination = body.pagination ?? { skip: 0, limit, hasMore: false };
  return { data, pagination };
}

export const getPost = async (id: string | string[] | undefined): Promise<Post> => {
  const postId = Array.isArray(id) ? id[0] : id;

  if (!postId) {
    throw new Error("Post ID is required");
  }

  let url3: string;
  if (typeof window === "undefined") {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    url3 = `${baseUrl}/api/post/${postId}`;
  } else {
    url3 = `/api/post/${postId}`;
  }

  const response = await fetch(url3, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    const errorJson = JSON.parse(errorText);
    throw new Error(errorJson.error || "Network response was not ok");
  }
  return response.json();
};
