import { Metadata } from "next";
import { getUser } from "./action";

let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
let description = "Velo is a modern social platform for sharing, connecting, and discovering new content.";
let title = "Velo App";
let siteName = "Velo";
let image = baseUrl + '/velo11.png';

let metadata: Metadata;

export default async function ProfileLayout({ children, params }: { children: React.ReactNode, params: Promise<{ username: string }> }) {
    const user = await getUser((await params).username);
    title = user.name + ' - ' + title;
    description = user.bio || description;
    image = user.displayPicture || image;

    metadata = {
        title: title,
        description: description,
        openGraph: {
            images: [
            {
                url: image,
            }
            ],
            siteName: siteName,
            title: title,
            description: description,
            url: baseUrl,
            type: "website",
            locale: "en_US"
        },
        twitter: {
            images: [
            {
                url: image,
            }
            ],
            card: "summary_large_image",
            title: title,
            description: description
        }
    };
  
  return children
}

export { metadata };