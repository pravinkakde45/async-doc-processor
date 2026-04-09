import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useTopBarContext } from '../context/TopBarContext';

export const Layout: React.FC = () => {
  const { topbarTitle } = useTopBarContext();

  return (
    <div className="app-container">
      <Sidebar />
      <main className="main-content">
        <Topbar title={topbarTitle} />
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
