'use server'
import { headers } from "next/headers";

export async function getUser(username: string) {
    try {
        const headersList = headers();
        const protocol = (await headersList).get("x-forwarded-proto");
        const host = (await headersList).get("host");

        const res = await fetch(`${protocol}://${host}/api/users/${username}`, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!res.ok) {
            console.error(`Error fetching user: ${res.status} ${res.statusText}`);
            return null;
        }

        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse response as JSON:', text.substring(0, 200));
            return null;
        }

    } catch (error) {
        console.error("Error fetching user:", error);
        return null;
    }
}

export async function getUserPosts(username: string) {
    try {
        const headersList = headers();
        const protocol = (await headersList).get("x-forwarded-proto");
        const host = (await headersList).get("host");

        const res = await fetch(`${protocol}://${host}/api/posts/${username}`, {
            method: 'GET',
            cache: 'no-store',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!res.ok) {
            console.error(`Error fetching posts: ${res.status} ${res.statusText}`);
            return [];
        }

        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error('Failed to parse response as JSON:', text.substring(0, 200));
            return [];
        }

    } catch (error) {
        console.error("Error fetching posts:", error);
        return [];
    }
}