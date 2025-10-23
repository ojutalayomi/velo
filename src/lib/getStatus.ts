import { Comments, Post } from "../templates/PostProps";
import { PostSchema } from "./types/type";

const url1: string = "/api/status";
const url2: string = "/api/posts";
const url4: string = "/api/comments/";

export const getStatus = async (): Promise<string[]> => {
  const response = await fetch(url1, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    // Try to parse the response to see if it contains a custom error message
    const errorJson = JSON.parse(errorText);
    throw new Error(errorJson.error || "Network response was not ok");
  }
  return response.json();
};

export const getPosts = async (): Promise<PostSchema[]> => {
  const response = await fetch(url2, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    // Try to parse the response to see if it contains a custom error message
    const errorJson = JSON.parse(errorText);
    throw new Error(errorJson.error || "Network response was not ok");
  }
  return response.json();
};

export const getPost = async (id: string | string[] | undefined): Promise<Post> => {
  // Handle array case - take the first element
  const postId = Array.isArray(id) ? id[0] : id;
  
  if (!postId) {
    throw new Error("Post ID is required");
  }
  
  // Check if we're in a server-side context
  let url3: string;
  if (typeof window === 'undefined') {
    // Server-side: construct full URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    url3 = `${baseUrl}/api/post/${postId}`;
  } else {
    // Client-side: use relative URL
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
    // Try to parse the response to see if it contains a custom error message
    const errorJson = JSON.parse(errorText);
    throw new Error(errorJson.error || "Network response was not ok");
  }
  return response.json();
};

export const getComments = async (id: string | string[] | undefined): Promise<Comments> => {
  const response = await fetch(url4 + id, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    // Try to parse the response to see if it contains a custom error message
    const errorJson = JSON.parse(errorText);
    throw new Error(errorJson.error || "Network response was not ok");
  }
  return response.json();
};
