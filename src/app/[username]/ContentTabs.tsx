import { MessageSquare, Share2, BookmarkPlus, Image, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { JSX, useEffect, useState } from "react";
import { useSelector } from "react-redux";

import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PostSchema } from "@/lib/types/type";
import { UserData } from "@/lib/types/user";
import { RootState } from "@/redux/store";
import MediaSlide from "@/templates/mediaSlides";

type ID = "comment" | "post" | "share" | "media" | "bookmark";
// Tab sections
const tabs: { id: ID; label: string }[] = [
  { id: "post", label: "Posts" },
  { id: "share", label: "Shares" },
  { id: "comment", label: "Comments" },
  { id: "bookmark", label: "Bookmarks" },
  { id: "media", label: "Media" },
];

export default function ContentSection({
  profileData,
  posts,
}: {
  profileData: UserData;
  posts: PostSchema[];
}) {
  const userdata = useSelector((state: RootState) => state.user.userdata);
  const [api, setApi] = useState<CarouselApi>();
  const [activeTab, setActiveTab] = useState<string>(tabs[0].id);
  const router = useRouter();

  const filterPosts = (type: ID) => {
    switch (type) {
      case "media":
        return posts.filter((post) => post.Image && post.Image.length > 0);
      case "bookmark":
        return posts.filter((post) => post.Bookmarked === true);
      case "share":
        return posts.filter((post) => post.Type === "quote" || post.Type === "repost");
      default:
        return posts.filter((post) => post.Type === type);
    }
  };

  // Handle tab change
  const handleTabChange = (value: ID | (string & {})) => {
    if (!api) return;
    setActiveTab(value);
    api.scrollTo(
      tabs.findIndex((tab) => tab.id === value),
      true
    );
  };

  useEffect(() => {
    if (!api) {
      return;
    }

    const updateActiveTab = () => {
      const index = api.selectedScrollSnap();
      if (index >= 0 && index < tabs.length) {
        setActiveTab(tabs[index].id);
      }
    };

    updateActiveTab();
    api.on("select", updateActiveTab);
  }, [api]);

  const shouldHideTab = (tab: { id: string; label: string }) => {
    const isPrivateTab = tab.id === "bookmark" || tab.id === "share" || tab.id === "comment";
    const isNotOwnProfile = userdata._id !== profileData._id?.toString();
    return isPrivateTab && isNotOwnProfile;
  };

  return (
    <div className="w-full px-2">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Fixed TabsList */}
        <TabsList
          className={`grid ${userdata._id !== profileData._id?.toString() ? "grid-cols-2" : "grid-cols-5"} bg-transparent`}
        >
          {tabs.map((tab, index) => {
            if (shouldHideTab(tab)) {
              return null;
            }
            return (
              <TabsTrigger key={index + tab.id} value={tab.id}>
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <Carousel setApi={setApi} className="min-h-screen w-full border-t">
          <CarouselContent>
            {tabs.map((tab, index) => {
              if (shouldHideTab(tab)) {
                return null;
              }
              return (
                <CarouselItem key={tab.id + index} className="w-full" data-label={tab.label}>
                  {(() => {
                    const filteredPosts = filterPosts(tab.id);
                    // console.log("%s -> %s", tab.id, filteredPosts.length);
                    return (
                      <TabsContent
                        value={tab.id}
                        className={`${tab.id === "media" && filteredPosts.length > 0 ? "!grid grid-cols-3 gap-1 lg:grid-cols-4" : ""} mt-0 data-[state=active]:block`}
                      >
                        {filteredPosts.length === 0 && (
                          <EmptyStateCard
                            postType={tab.id}
                            {...(userdata._id === profileData._id?.toString()
                              ? { onAction: () => router.push("/compose/post") }
                              : {})}
                          />
                        )}
                        {filteredPosts.map((post, index) => {
                          if (tab.id === "media") {
                            return (
                              <MediaSlide
                                className="aspect-square"
                                postData={post}
                                isLink
                                key={`${post._id}-${index}`}
                              />
                            );
                          } else {
                            return <PostCard postData={post} key={`${post._id}-${index}`} />;
                          }
                        })}
                      </TabsContent>
                    );
                  })()}
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </Tabs>
    </div>
  );
}

type EmptyStateProps = {
  postType: string;
  onAction?: () => void;
};

export const EmptyStateCard = ({ postType, onAction }: EmptyStateProps) => {
  const icons: Record<string, JSX.Element> = {
    comment: <MessageSquare className="size-8 text-muted-foreground" />,
    post: <FileText className="size-8 text-muted-foreground" />,
    share: <Share2 className="size-8 text-muted-foreground" />,
    bookmark: <BookmarkPlus className="size-8 text-muted-foreground" />,
    media: <Image className="size-8 text-muted-foreground" />,
  };

  return (
    <Card className="flex flex-col items-center justify-center rounded-none border-0 bg-transparent p-6 text-center">
      <CardHeader className="items-center">
        {icons[postType] || <FileText className="size-8 text-muted-foreground" />}
        <CardTitle className="mt-4 text-lg font-semibold">
          No{" "}
          {postType === "share"
            ? "posts"
            : postType === "media"
              ? "media"
              : postType === "bookmark"
                ? "bookmarks"
                : postType === "comment"
                  ? "comments"
                  : "posts"}{" "}
          available
        </CardTitle>
      </CardHeader>
      <CardContent>
        {onAction && (
          <p className="text-sm text-muted-foreground">
            You can{" "}
            {postType === "media"
              ? "upload a media"
              : postType === "share"
                ? "share a post"
                : postType === "bookmark"
                  ? "bookmark a post"
                  : "create a post"}{" "}
            now to get started.
          </p>
        )}
        {onAction && (postType === "post" || postType === "media") && (
          <Button className="mt-4" onClick={onAction}>
            {postType === "media" ? "Upload a media" : "Create a post"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
