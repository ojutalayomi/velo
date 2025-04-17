import { JSX, SetStateAction, useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Carousel, CarouselApi, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious} from '@/components/ui/carousel';
import MediaSlide from '@/templates/mediaSlides';
import PostCard from '@/components/PostCard';
import { PostData } from '@/templates/PostProps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Share2, BookmarkPlus, Image, FileText } from 'lucide-react';

type ID = 'comment' | 'post' | 'share' | 'media' | 'bookmark'
// Tab sections
const tabs: { id: ID, label: string }[] = [
  { id: "post", label: "Posts" },
  { id: "share", label: "Shares" },
  { id: "comment", label: "Comments" },
  { id: "bookmark", label: "Bookmarks" },
  { id: "media", label: "Media" }
];

export default function ContentSection({ posts }: { posts: PostData[] }) {
  const [api, setApi] = useState<CarouselApi>()
  const [activeTab, setActiveTab] = useState<string>(tabs[0].id);

  const filterPosts = (type: ID) => {
    switch (type) {
      case 'media':
        return posts.filter(post => post.Image && post.Image.length > 0)
      case 'bookmark':
        return posts.filter(post => post.Bookmarked === true)
      case 'share':
        return posts.filter(post => post.Type === 'quote' || post.Type === 'repost')
      default:
        return posts.filter(post => post.Type === type)
    }
  }

  // Handle tab change
  const handleTabChange = (value: ID | (string & {})) => {
    if(!api) return;
    setActiveTab(value);
    api.scrollTo(tabs.findIndex(tab => tab.id === value), true);
  };

  useEffect(() => {
    if (!api) {
      return
    }

    const updateActiveTab = () => {
      const index = api.selectedScrollSnap();
      if (index >= 0 && index < tabs.length) {
        setActiveTab(tabs[index].id);
      }
    };
  
    updateActiveTab();
    api.on("select", updateActiveTab);
  }, [api])

  return (
    <div className="w-full px-2">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* Fixed TabsList */}
        <TabsList className="grid grid-cols-5 bg-transparent">
          {tabs.map((tab, index) => (
            <TabsTrigger key={index + tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <Carousel setApi={setApi} className="w-full min-h-screen border-t">
          <CarouselContent>
            {tabs.map((tab, index) => (
              <CarouselItem key={tab.id + index} className="w-full" data-label={tab.label}>
                <TabsContent value={tab.id} className={`${tab.id === 'media' ? '!grid grid-cols-3 lg:grid-cols-4 gap-1' : ''} mt-0 data-[state=active]:block`}>
                  {(() => {
                    const filteredPosts = filterPosts(tab.id);
                    // console.log("%s -> %s", tab.id, filteredPosts.length);
                    if (filteredPosts.length === 0) {
                      return <EmptyStateCard postType={tab.id} />;
                    }
                    return filteredPosts.map((post, index) => {
                      if (tab.id === 'media') {
                        return <MediaSlide className='aspect-square' postData={post} isLink key={post._id + index} />;
                      }
                      return <PostCard postData={post} key={post._id + index} />;
                    });
                  })()}
                </TabsContent>
              </CarouselItem>
            ))}
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
    comment: <MessageSquare className="w-8 h-8 text-muted-foreground" />,
    post: <FileText className="w-8 h-8 text-muted-foreground" />,
    share: <Share2 className="w-8 h-8 text-muted-foreground" />,
    bookmark: <BookmarkPlus className="w-8 h-8 text-muted-foreground" />,
    media: <Image className="w-8 h-8 text-muted-foreground" />,
  };

  return (
    <Card className="flex flex-col items-center justify-center bg-transparent border-0 rounded-none p-6 text-center">
      <CardHeader className='items-center'>
        {icons[postType] || <FileText className="w-8 h-8 text-muted-foreground" />}
        <CardTitle className="mt-4 text-lg font-semibold">
          No {postType} available
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          You can {postType} now to get started.
        </p>
        {onAction && (
          <Button className="mt-4" onClick={onAction}>
            Create {postType}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};