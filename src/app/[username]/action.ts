"use server";
import { PostSchema } from "@/lib/types/type";
import { UserData } from "@/lib/types/user";
import { headers } from "next/headers";

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

export async function getUserPosts(username: string) {
  try {
    const headersList = headers();
    const protocol = (await headersList).get("x-forwarded-proto");
    const host = (await headersList).get("host");

    const res = await fetch(`${protocol}://${host}/api/posts/${username}`, {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Cookie: (await headersList).get("cookie") || "",
      },
    });

    if (!res.ok) {
      console.error(`Error fetching posts: ${res.status} ${res.statusText}`);
      return [];
    }

    const text = await res.text();
    try {
      return JSON.parse(text) as PostSchema[];
    } catch (e) {
      console.error("Failed to parse response as JSON:", text.substring(0, 200));
      return [];
    }
  } catch (error) {
    console.error("Error fetching posts:", error);
    return [];
  }
}
