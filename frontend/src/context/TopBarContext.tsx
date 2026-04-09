import React, { createContext, useContext, useState } from 'react';

interface TopBarContextType {
  topbarTitle: React.ReactNode;
  setTopbarTitle: (title: React.ReactNode) => void;
}

const TopBarContext = createContext<TopBarContextType | undefined>(undefined);

export const TopBarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [topbarTitle, setTopbarTitle] = useState<React.ReactNode>('');

  return (
    <TopBarContext.Provider value={{ topbarTitle, setTopbarTitle }}>
      {children}
    </TopBarContext.Provider>
  );
};

export const useTopBarContext = () => {
  const context = useContext(TopBarContext);
  if (context === undefined) {
    throw new Error('useTopBarContext must be used within a TopBarProvider');
  }
  return context;
};
