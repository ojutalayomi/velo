import { Comments, Post, PostData } from "../templates/PostProps";

const domain: string ='http://localhost:5003';
const url1: string = '/api/status';
const url2: string = '/api/posts';
const url4: string = '/api/comments/';

export const getStatus = async (): Promise<string[]> => {
    const response = await fetch(url1, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });
    if (!response.ok) {
        const errorText = await response.text();
        // Try to parse the response to see if it contains a custom error message
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error || 'Network response was not ok');
    }
    return response.json();
};

export const getPosts = async (): Promise<PostData[]> => {
    const response = await fetch(url2, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });
    if (!response.ok) {
        const errorText = await response.text();
        // Try to parse the response to see if it contains a custom error message
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error || 'Network response was not ok');
    }
    return response.json();
};

export const getPost = async (id: string | string[] | undefined): Promise<Post> => {
    const url3: string = '/api/post/'+id;
    const response = await fetch(url3, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });
    if (!response.ok) {
        const errorText = await response.text();
        // Try to parse the response to see if it contains a custom error message
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error || 'Network response was not ok');
    }
    return response.json();
};

export const getComments = async (id: string | string[] | undefined): Promise<Comments> => {
    const response = await fetch(url4 + id, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    });
    if (!response.ok) {
        const errorText = await response.text();
        // Try to parse the response to see if it contains a custom error message
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.error || 'Network response was not ok');
    }
    return response.json();
};