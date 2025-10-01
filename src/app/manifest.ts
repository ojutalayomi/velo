import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Velo App",
    short_name: "Velo",
    icons: [
      {
        src: "/web-app-manifest-144x144.png",
        sizes: "144x144",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    start_url: "/home",
    display: "standalone",
    theme_color: "#000000",
    background_color: "#000000",
    shortcuts: [
      {
        name: "Open Home",
        short_name: "Home",
        description: "View the home feed",
        url: "/home?utm_source=homescreen",
        icons: [{ src: "/home.png", sizes: "192x192" }],
      },
      {
        name: "View Profile",
        short_name: "Profile",
        description: "View your profile",
        url: "/profile?utm_source=homescreen",
        icons: [{ src: "/profile.png", sizes: "192x192" }],
      },
      {
        name: "Open Messages",
        short_name: "Messages",
        description: "View your messages",
        url: "/chats?utm_source=homescreen",
        icons: [{ src: "/messages.png", sizes: "192x192" }],
      },
      {
        name: "Open Notifications",
        short_name: "Notifications",
        description: "View your notifications",
        url: "/notifications?utm_source=homescreen",
        icons: [{ src: "/notifications.png", sizes: "192x192" }],
      },
      {
        name: "Open Settings",
        short_name: "Settings",
        description: "View your settings",
        url: "/general?utm_source=homescreen",
        icons: [{ src: "/settings.png", sizes: "192x192" }],
      },
    ],
    screenshots: [
      {
        src: "/mobileScreenShot_home.png",
        sizes: "425x720",
        type: "image/png",
        form_factor: "narrow",
        label: "Home screen showing main navigation and featured content",
      },
      {
        src: "/largeScreenShot_home.png",
        sizes: "1280x720",
        type: "image/png",
        form_factor: "wide",
        label: "Home screen showing main navigation and featured content",
      },
    ],
  };
}
