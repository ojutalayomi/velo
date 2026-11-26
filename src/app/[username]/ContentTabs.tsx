import {
  MessageSquare,
  Share2,
  BookmarkPlus,
  Image,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { JSX, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";

import PostCard from "@/components/PostCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClientPostSchema } from "@/lib/types/type";
import { UserData } from "@/lib/types/user";
import { RootState } from "@/redux/store";
import ThreadsSlide from "@/templates/ThreadSlides";

type ID = "comment" | "post" | "share" | "media" | "bookmark";
// Tab sections
const tabs: { id: ID; label: string; icon: LucideIcon }[] = [
  { id: "post", label: "Posts", icon: FileText },
  { id: "share", label: "Shares", icon: Share2 },
  { id: "comment", label: "Comments", icon: MessageSquare },
  { id: "bookmark", label: "Bookmarks", icon: BookmarkPlus },
  { id: "media", label: "Media", icon: Image },
];

export default function ContentSection({
  profileData,
  posts,
  postsHasMore,
  onLoadMorePosts,
  postsLoadingMore,
}: {
  profileData: UserData;
  posts: ClientPostSchema[];
  postsHasMore?: boolean;
  onLoadMorePosts?: () => void | Promise<void>;
  postsLoadingMore?: boolean;
}) {
  const userdata = useSelector((state: RootState) => state.user.userdata);
  const [api, setApi] = useState<CarouselApi>();
  const [activeTab, setActiveTab] = useState<string>(tabs[0].id);
  const router = useRouter();

  // Private tabs are removed on other users' profiles, so carousel indexes must
  // map onto this filtered list, not the full `tabs` array.
  const isOwnProfile = userdata._id === profileData._id?.toString();
  const visibleTabs = useMemo(
    () =>
      tabs.filter((tab) => isOwnProfile || !["bookmark", "share", "comment"].includes(tab.id)),
    [isOwnProfile]
  );

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
      visibleTabs.findIndex((tab) => tab.id === value),
      true
    );
  };

  useEffect(() => {
    if (!api) {
      return;
    }

    const updateActiveTab = () => {
      const index = api.selectedScrollSnap();
      if (index >= 0 && index < visibleTabs.length) {
        setActiveTab(visibleTabs[index].id);
      }
    };

    updateActiveTab();
    api.on("select", updateActiveTab);
    return () => {
      api.off("select", updateActiveTab);
    };
  }, [api, visibleTabs]);

  return (
    <div className="w-full px-2">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Fixed TabsList */}
        <TabsList
          className={`grid ${isOwnProfile ? "grid-cols-5" : "grid-cols-2"} bg-transparent`}
        >
          {visibleTabs.map((tab, index) => {
            return (
              <TabsTrigger
                key={index + tab.id}
                value={tab.id}
                aria-label={tab.label}
                className="gap-1.5"
              >
                <tab.icon className="size-4 shrink-0" />
                {activeTab === tab.id && <span>{tab.label}</span>}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <Carousel setApi={setApi} className="min-h-screen w-full border-t">
          <CarouselContent>
            {visibleTabs.map((tab, index) => {
              return (
                <CarouselItem key={tab.id + index} className="w-full" data-label={tab.label}>
                  {(() => {
                    const filteredPosts = filterPosts(tab.id);
                    // console.log("%s -> %s", tab.id, filteredPosts.length);
                    return (
                      <TabsContent
                        value={tab.id}
                        className={`${tab.id === "media" && filteredPosts.length > 0 ? "grid! grid-cols-3 gap-1 lg:grid-cols-4" : ""} mt-0 data-[state=active]:block`}
                      >
                        {filteredPosts.length === 0 && (
                          <EmptyStateCard
                            postType={tab.id}
                            {...(isOwnProfile
                              ? { onAction: () => router.push("/compose/post") }
                              : {})}
                          />
                        )}
                        {filteredPosts.map((post, index) => {
                          if (tab.id === "media") {
                            return (
                              <ThreadsSlide
                                className="aspect-square"
                                postData={post}
                                isLink
                                fill
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
        {postsHasMore && onLoadMorePosts ? (
          <div className="flex justify-center pb-8 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={postsLoadingMore}
              onClick={() => void onLoadMorePosts()}
            >
              {postsLoadingMore ? "Loading…" : "Load more posts"}
            </Button>
          </div>
        ) : null}
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
