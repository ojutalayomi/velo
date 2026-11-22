import type { Metadata } from "next";
import { Suspense } from "react";
import FeedbackClient from "./FeedbackClient";

export const metadata: Metadata = {
  title: "Feedback",
  description: "Tell us how to improve Velo.",
};

export default function FeedbackPage() {
  return (
    <Suspense fallback={<></>}>
      <FeedbackClient />
    </Suspense>
  );
}
