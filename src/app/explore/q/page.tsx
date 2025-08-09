import { Suspense } from 'react';
import Explore from '../../../components/Explore';

export default function ExploreQPage() {
  return (
    <Suspense fallback={<></>}>
      <Explore />
    </Suspense>
  );
}