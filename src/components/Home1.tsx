"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import PostCard from "@/components/PostCard";
import { RefreshCw } from "lucide-react";
import { RootState } from "@/redux/store";
import { usePosts } from "@/app/providers/PostsProvider";
import { Skeleton } from "./ui/skeleton";
import { useUser } from "@/app/providers/UserProvider";
import { useRouter } from "next/navigation";

const Homepage: React.FC = () => {
  const { userdata } = useUser();
  const { posts, loading, error } = useSelector((state: RootState) => state.posts);
  const { success, setReload } = usePosts();
  const homeRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef(0);
  const [load, setLoad] = useState(false);
  const router = useRouter();

  // Handle scroll event
  const handleScroll = () => {
    if (homeRef.current && !loading && !load) {
      scrollPositionRef.current = homeRef.current.scrollTop;
      localStorage.setItem("homeScrollPosition", scrollPositionRef.current.toString());
    }
  };

  // Set initial client state and restore scroll position
  useEffect(() => {
    const savedPosition = localStorage.getItem("homeScrollPosition");
    if (homeRef.current && savedPosition) {
      const position = parseInt(savedPosition);
      // Small delay to ensure content is rendered
      setTimeout(() => {
        homeRef.current?.scrollTo({
          top: position,
          behavior: "instant", // Changed from 'smooth' for more reliable positioning
        });
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (!loading && !load) return;
    const savedPosition = localStorage.getItem("homeScrollPosition");
    if (homeRef.current && savedPosition) {
      const position = parseInt(savedPosition);
      // Small delay to ensure content is rendered
      setTimeout(() => {
        homeRef.current?.scrollTo({
          top: position,
          behavior: "instant", // Changed from 'smooth' for more reliable positioning
        });
      }, 100);
    }
  }, [loading, load]);

  return (
    <div onScroll={handleScroll} ref={homeRef} id="home" className="dark:text-slate-200">
      <header className="dark:bg-zinc-900 bg-gray-50 shadow-md sticky top-0 w-full z-[5]">
        <div
          onClick={() => userdata.name.includes("Ayomide") && setLoad(!load)}
          className="flex justify-center py-3 w-full"
        >
          <h1>Velo</h1>
        </div>
      </header>

      <div className="pre-status pl-2 mt-2">
        <div className="status p-2 flex items-center justify-center gap-4 w-fit">
          {(loading || load) &&
            [...Array(7)].map((_, i) => (
              <Skeleton key={"uidg" + i} className="size-10 rounded-full ring-4 ring-brand" />
            ))}
          {!loading &&
            !load &&
            success &&
            success.length > 0 &&
            success.map((status: string, index: number) => {
              return (
                <div
                  key={index}
                  id={`status-${index}`}
                  className="status-child rounded-full size-10 ring-4 ring-brand"
                  style={{
                    backgroundImage: `url(${!status.includes("/") ? "/default.jpeg" : status})`,
                  }}
                />
              );
            })}
          {!loading && error && <RefreshCw size={30} />}
        </div>
      </div>

      <div className="h3 dark:!text-slate-200">
        <h3>Connect with friends and the world around you on noow.</h3>
      </div>

      <>
        {loading || load ? (
          [...Array(6)].map((_, i) => (
            <div
              key={"uxdf" + i}
              className="flex flex-col space-y-3 cursor-progress m-4 rounded-xl p-4 bg-white dark:bg-zinc-900 shadow-md"
            >
              <div className="flex items-center justify-start gap-2">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex flex-col space-y-2">
                  <Skeleton className="h-4 w-16 rounded-xl" />
                  <Skeleton className="h-4 w-12 rounded-xl" />
                </div>
              </div>
              <Skeleton className="h-8 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-4 w-24 rounded-xl" />
              <div className="flex items-center justify-around gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i++} className="size-8" />
                ))}
              </div>
            </div>
          ))
        ) : posts ? (
          posts.length > 0 ? (
            posts.map((post) => <PostCard key={post._id} postData={post} />)
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-3/4 p-8 text-center">
              <div className="mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-2xl font-bold mb-2 dark:text-slate-200">Be the First!</h1>
                <p className="text-gray-600 dark:text-slate-400 mb-4">
                  Looks like no one has posted anything yet. Why not break the ice?
                </p>
              </div>
              <div className="bg-brand/10 p-6 rounded-lg border-2 border-dashed border-brand/30 mb-6">
                <p className="text-brand font-medium">
                  Share your thoughts, photos, or experiences - your post could start something
                  amazing!
                </p>
              </div>
              <button
                onClick={() => router.push("/compose/post")}
                className="bg-brand hover:bg-brand/90 text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 transition-colors"
              >
                <span>Create First Post</span>
                <span>✨</span>
              </button>
            </div>
          )
        ) : (
          error && (
            <div className="flex flex-col items-center justify-center w-full h-3/4">
              <RefreshCw className="cursor-pointer" size={30} onClick={() => setReload(true)} />
              <h1>Reload</h1>
            </div>
          )
        )}
      </>
      <div className="tablets:hidden h-20 w-full bg-transparent" />
    </div>
  );
};

export default Homepage;
