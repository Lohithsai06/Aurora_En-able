import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import '../styles/navbar.css';

export default function NavBar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      setIsLoggedIn(true);
      setUserName(userData.name || userData.email);
    } else {
      setIsLoggedIn(false);
    }
  }, [location]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('user');
      setIsLoggedIn(false);
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand" onClick={() => navigate('/')}>
          <h1 className="navbar-logo">En-able</h1>
        </div>

        {/* Desktop Menu */}
        <div className="navbar-menu desktop-menu">
          {isLoggedIn ? (
            <>
              <span className="navbar-user">Welcome, {userName}</span>
              <button 
                onClick={handleLogout} 
                className="navbar-button logout-button"
                aria-label="Logout"
              >
                Logout
              </button>
            </>
          ) : (
            <button 
              onClick={() => navigate('/login')} 
              className="navbar-button login-button"
              aria-label="Login"
            >
              Login
            </button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="mobile-menu-toggle"
          onClick={toggleMobileMenu}
          aria-label="Toggle mobile menu"
          aria-expanded={isMobileMenuOpen}
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          {isLoggedIn ? (
            <>
              <span className="navbar-user mobile">Welcome, {userName}</span>
              <button 
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }} 
                className="navbar-button logout-button mobile"
              >
                Logout
              </button>
            </>
          ) : (
            <button 
              onClick={() => {
                navigate('/login');
                setIsMobileMenuOpen(false);
              }} 
              className="navbar-button login-button mobile"
            >
              Login
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
