"use server";

import { headers } from "next/headers";

import type { PaginationMeta } from "@/lib/apiPagination";
import { DEFAULT_POST_LIMIT } from "@/lib/apiPagination";
import type { PostSchema } from "@/lib/types/type";
import type { UserData } from "@/lib/types/user";

export async function getUser(username: string): Promise<UserData> {
  try {
    const headersList = headers();
    const protocol = (await headersList).get("x-forwarded-proto");
    const host = (await headersList).get("host");

    const res = await fetch(`${protocol}://${host}/api/users/${username}`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Cookie: (await headersList).get("cookie") || "",
      },
    });

    if (!res.ok) {
      console.error(`Error fetching user: ${res.status} ${res.statusText}`);
      return {} as UserData;
    }

    const text = await res.text();
    try {
      return JSON.parse(text) as UserData;
    } catch (e) {
      console.error("Failed to parse response as JSON:", text.substring(0, 200));
      return {} as UserData;
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    return {} as UserData;
  }
}

export async function getProfilePostsFirstPage(username: string): Promise<{
  posts: PostSchema[];
  pagination: PaginationMeta;
}> {
  const empty: PaginationMeta = { skip: 0, limit: DEFAULT_POST_LIMIT, hasMore: false };
  try {
    const headersList = headers();
    const protocol = (await headersList).get("x-forwarded-proto");
    const host = (await headersList).get("host");

    const res = await fetch(
      `${protocol}://${host}/api/posts/${encodeURIComponent(username)}?limit=${DEFAULT_POST_LIMIT}&skip=0`,
      {
        method: "GET",
        cache: "no-store",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Cookie: (await headersList).get("cookie") || "",
        },
      }
    );

    if (!res.ok) {
      console.error(`Error fetching posts: ${res.status} ${res.statusText}`);
      return { posts: [], pagination: empty };
    }

    const text = await res.text();
    let body: {
      data?: PostSchema[];
      pagination?: PaginationMeta;
    };

    try {
      body = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse response as JSON:", text.substring(0, 200));
      return { posts: [], pagination: empty };
    }

    return {
      posts: body.data ?? [],
      pagination: body.pagination ?? empty,
    };
  } catch (error) {
    console.error("Error fetching posts:", error);
    return { posts: [], pagination: empty };
  }
}
