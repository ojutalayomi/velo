import { Suspense } from 'react';
import FeedbackClient from './FeedbackClient';

export default function FeedbackPage() {
  return (
    <Suspense fallback={<></>}>
      <FeedbackClient />
    </Suspense>
  );
}