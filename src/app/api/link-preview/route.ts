import { getLinkPreview } from "link-preview-js";
import { NextResponse } from "next/server";

interface LinkPreviewData {
  url: string;
  title?: string;
  siteName?: string;
  description?: string;
  mediaType: string;
  contentType?: string;
  images: string[];
  videos: {
    url?: string;
    secureUrl?: string;
    type?: string;
    width?: string;
  }[];
  favicons: string[];
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    console.log("URL: ", url);

    const data = (await getLinkPreview(url, {
      timeout: 3000,
      headers: {
        "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)",
      },
    })) as LinkPreviewData;
    console.log("Data: ", data);
    return NextResponse.json({
      title: data.title,
      description: data.description,
      image: data.images?.[0],
      favicon: data.favicons?.[0],
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch preview" }, { status: 500 });
  }
}
