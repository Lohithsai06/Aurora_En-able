import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import NavBar from './NavBar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  
  // Pages that have their own navbar
  const pagesWithOwnNavbar = ['/', '/login', '/register', '/dashboard'];
  
  // Check if current path starts with any page that has its own navbar
  const showNavBar = !pagesWithOwnNavbar.includes(location.pathname) && 
                     !location.pathname.startsWith('/blind') &&
                     !location.pathname.startsWith('/deaf') &&
                     !location.pathname.startsWith('/dumb') &&
                     !location.pathname.startsWith('/adhd');

  return (
    <div className="min-h-screen flex flex-col">
      {showNavBar && <NavBar />}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
