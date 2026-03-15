import React, { createContext, useContext, useState } from "react";

const RequestCountContext = createContext<{
  requestCount: number;
  setRequestCount: (n: number) => void;
}>({ requestCount: 0, setRequestCount: () => {} });

export function RequestCountProvider({ children }: { children: React.ReactNode }) {
  const [requestCount, setRequestCount] = useState(0);
  return (
    <RequestCountContext.Provider value={{ requestCount, setRequestCount }}>
      {children}
    </RequestCountContext.Provider>
  );
}

export const useRequestCount = () => useContext(RequestCountContext);