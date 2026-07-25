import { createContext, useContext, useMemo, useState } from 'react';

const HomeChromeContext = createContext(null);

export const HomeChromeProvider = ({ children }) => {
  const [hideChrome, setHideChrome] = useState(false);

  const value = useMemo(
    () => ({ hideChrome, setHideChrome }),
    [hideChrome],
  );

  return (
    <HomeChromeContext.Provider value={value}>
      {children}
    </HomeChromeContext.Provider>
  );
};

export const useHomeChrome = () => {
  const ctx = useContext(HomeChromeContext);
  if (!ctx) {
    throw new Error('useHomeChrome must be used within HomeChromeProvider');
  }
  return ctx;
};
