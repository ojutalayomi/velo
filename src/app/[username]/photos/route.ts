import { NextRequest, NextResponse } from "next/server";
import { MongoDBClient } from "@/lib/mongodb";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    // const username = request.nextUrl.searchParams.get('username');
    // console.log(request.nextUrl.searchParams);
    const username = (await params).username;
    const db = await new MongoDBClient().init();

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    const user = await db.users().findOne({ username }, { projection: { displayPicture: 1 } });
    if (!user?.displayPicture) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // const tokenCollection = client.db('mydb').collection('Tokens');
    // const cookieStore = cookies();
    // const token = cookieStore.get('velo_12')?.value;

    // if (!token) {
    //   return NextResponse.json({ error: 'No token provided' }, { status: 400 });
    // }

    // Create a new response
    const imageUrl = !user.displayPicture.includes("https://")
      ? "https://s3.amazonaws.com/profile-display-images/" + user.displayPicture
      : user.displayPicture;
    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch image" }, { status: 500 });
    }

    // Get the image buffer and content type
    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

    // Create and return the response with the image
    const response = new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });

    return response;
  } catch (error) {
    console.error("An error occurred:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
