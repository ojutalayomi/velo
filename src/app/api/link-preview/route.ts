import { getLinkPreview } from 'link-preview-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    
    const data = await getLinkPreview(url, {
      timeout: 3000,
      headers: {
        'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)',
      },
    });
    return NextResponse.json({
      title: data.url,
      description: data.contentType,
      image: data.favicons?.[0],
      favicon: data.favicons?.[0],
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch preview' }, { status: 500 });
  }
} 