import { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import CounterLegacyRedirect from './CounterLegacyRedirect';

const PageLoader = () => (
  <div className="flex items-center justify-center p-20 min-h-[50vh]">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
  </div>
);

export default function CounterRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="*" element={<CounterLegacyRedirect />} />
      </Routes>
    </Suspense>
  );
}
