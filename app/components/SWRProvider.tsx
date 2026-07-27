"use client";

import { SWRConfig } from "swr";

export const SWRProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 10000, // 30s dedup window
        focusThrottleInterval: 60000, // throttle focus revalidation
        errorRetryCount: 2,
        fetcher: (url: string) => fetch(url).then((res) => res.json()),
      }}
    >
      {children}
    </SWRConfig>
  );
};
