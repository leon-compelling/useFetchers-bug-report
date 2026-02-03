import type { Route } from "./+types/home";
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { Await, useFetcher, useFetchers, useLoaderData } from 'react-router';
import { Suspense } from 'react';


// try these combinations: 
// 'blocking' + 0 -> partial overlaps of 1-3 inflight fetchers, immediate loading state, then one by one go idle/ vanish (as expected)
// 'blocking' + 2000 -> cascading overlaps of 1-5 inflight fetchers, starting off with submitting state, then one by one go into loading (as expected)
// ! 'deferred' + 2000 -> all fetchers get into submitting state, only first fetcher gets into loading state, then sudden idle/ vanish (unexpected)
// ! 'deferred' + 0 -> only the first fetcher gets into loading state, other fetchers don't even appear in useFetchers(), sudden idle/ vanish (unexpected)
const DATA_LOAD_MODE: 'blocking' | 'deferred' = 'deferred';
const ACTION_DELAY: number = 0;

async function loadDeferredData(): Promise<{loadedAt: string}> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return {
    loadedAt: new Date().toISOString(),
  };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const nonCriticalDataPromise = loadDeferredData();

  if (DATA_LOAD_MODE === 'deferred') {
    return { mode: 'deferred' as const, nonCriticalData: nonCriticalDataPromise };
  }
  const nonCriticalData = await nonCriticalDataPromise;
  return { mode: 'blocking' as const, nonCriticalData };
}

export async function action({ request }: ActionFunctionArgs) {
  const data = await request.json();
  await new Promise((resolve) => setTimeout(resolve, ACTION_DELAY));
  return { success: true, id: data.id };
}


function LoadingSkeleton() {
  return (
    <div className="p-8 space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 rounded" />
      <div className="h-24 bg-slate-200 rounded" />
      <div className="h-32 bg-slate-200 rounded" />
    </div>
  );
}

export default function Test() {
  const loaderData = useLoaderData<typeof loader>();

  if (loaderData.mode === 'deferred') {
    return (
      <Suspense fallback={<LoadingSkeleton />}>
        <Await resolve={loaderData.nonCriticalData}>
          {(data) => <TestContent data={data} />}
        </Await>
      </Suspense>
    );
  }

  return <TestContent data={loaderData.nonCriticalData} />;
}


function TestContent({ data }: { data: {loadedAt: string} }) {
  const allFetchers = useFetchers();
  const delay = 300;

  return (
    <div className="p-8 space-y-6 text-black">
      <h1 className="text-2xl font-bold">useFetchers() with Suspense/Await</h1>

      <div className="p-4 bg-blue-50 rounded-lg text-sm">
        Mode: {DATA_LOAD_MODE}
        <br />
        Action Delay: {ACTION_DELAY}ms
      </div>
      <div className="p-4 bg-slate-100 rounded-lg text-sm">
        Loaded at: {data.loadedAt}
      </div>
      <div className="p-4 bg-slate-100 rounded-lg">


        <h2 className="text-md font-bold">userFetchers() data</h2>
        <p className="text-sm text-slate-600">
          Length: {allFetchers.length}
          <br />
          Keys: {allFetchers.map((f) => f.key).join(', ') || 'none'}
          <br />
          States: {allFetchers.map((f) => f.state).join(', ') || 'none'}
          <br />
        </p>
      </div>
      <FireWithDelays delay={delay} />
    </div>
  );
}

/**
 * Simulate rapid succession user interactions that would need parallel
 * optimistic rendering. 
 */
function FireWithDelays({ delay }: { delay: number }) {
  const fetcher1 = useFetcher({ key: '1' });
  const fetcher2 = useFetcher({ key: '2' });
  const fetcher3 = useFetcher({ key: '3' });
  const fetcher4 = useFetcher({ key: '4' });
  const fetcher5 = useFetcher({ key: '5' });

  const fireWithDelays = async () => {
    fetcher1.submit(
      { id: '1', timestamp: Date.now() },
      { method: 'POST', encType: 'application/json' }
    );
    await new Promise((r) => setTimeout(r, delay));

    fetcher2.submit(
      { id: '2', timestamp: Date.now() },
      { method: 'POST', encType: 'application/json' }
    );
    await new Promise((r) => setTimeout(r, delay));

    fetcher3.submit(
      { id: '3', timestamp: Date.now() },
      { method: 'POST', encType: 'application/json' }
    );
    await new Promise((r) => setTimeout(r, delay));

    fetcher4.submit(
      { id: '4', timestamp: Date.now() },
      { method: 'POST', encType: 'application/json' }
    );
    await new Promise((r) => setTimeout(r, delay));

    fetcher5.submit(
      { id: '5', timestamp: Date.now() },
      { method: 'POST', encType: 'application/json' }
    );
  };
  const fetcherData = [fetcher1, fetcher2, fetcher3, fetcher4, fetcher5];

  return (
    <div className="space-y-2">
      <div className="p-4 bg-slate-100 rounded-lg">
        <h2 className="text-md font-bold">fetcher data</h2>
        <p className="text-sm text-slate-600">
          Length: {fetcherData.length}
          <br />
          Keys: none
          <br />
          States: {fetcherData.map((f) => f.state).join(', ') || 'none'}
        </p>
      </div>
      <button className='border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-100' onClick={fireWithDelays}>Fire 5 Fetchers ({delay}ms apart)</button>
    </div>
  );
}