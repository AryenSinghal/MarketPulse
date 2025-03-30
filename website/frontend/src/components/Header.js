import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaRegBell, FaRegUser, FaArrowUp } from 'react-icons/fa';
import { useAuth0 } from "@auth0/auth0-react";
import './Header.css';

function Header() {
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const navigate = useNavigate();

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/stock/${searchQuery.trim()}`);
            setSearchQuery('');
            setShowSearch(false);
        }
    };

    const { loginWithRedirect } = useAuth0();

    return (
        <header className="app-header">
            <div className="header-container">
                <div className="logo-container">
                    <Link to="/" className="logo">
                        MarketPulse
                    </Link>
                </div>

                <nav className="main-nav">
                    <Link to="/" className="nav-item">Dashboard</Link>
                    <a href="#" className="nav-item">Portfolio</a>
                    <a href="#" className="nav-item">Markets</a>
                </nav>

                <div className="header-actions">
                    <button
                        className="action-button search-toggle"
                        onClick={() => setShowSearch(!showSearch)}
                    >
                        <FaSearch />
                    </button>
                    <button className="action-button">
                        <FaRegBell />
                        <span className="notification-badge">2</span>
                    </button>
                    <button className="action-button user-button" onClick={() => loginWithRedirect()}>
                        <FaRegUser />
                    </button>
                </div>
            </div>

            {showSearch && (
                <div className="search-overlay animate-fade-in">
                    <form onSubmit={handleSearchSubmit} className="search-form">
                        <input
                            type="search"
                            placeholder="Search by company or symbol..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                        <button type="submit">
                            <FaSearch />
                        </button>
                    </form>
                </div>
            )}
        </header>
    );
}

export default Header;