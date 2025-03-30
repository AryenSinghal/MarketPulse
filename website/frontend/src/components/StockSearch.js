import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSearch } from 'react-icons/fa';
import './StockSearch.css';

export default function StockSearch() {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const navigate = useNavigate();
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

    const handleInputChange = async (e) => {
        const value = e.target.value;
        setQuery(value);

        if (value.trim() === '') {
            setSuggestions([]);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/stocks/autocomplete?q=${value}`);
            const data = await response.json();
            setSuggestions(data);
        } catch (error) {
            console.error('Error fetching autocomplete results:', error);
        }
    };

    const handleSuggestionClick = (ticker) => {
        setQuery(ticker);
        setSuggestions([]);
        navigate(`/stock/${ticker}`); // Navigate immediately when suggestion is clicked
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (query.trim() !== '') {
            navigate(`/stock/${query}`);
        }
    };

    return (
        <div className="search-wrapper animate-fade-in">
            <form onSubmit={handleSearchSubmit} className="search-form">
                <input
                    type="text"
                    placeholder="Search stocks by name or ticker..."
                    className="search-input"
                    value={query}
                    onChange={handleInputChange}
                    autoComplete="off"
                />
                <button
                    type="submit"
                    className="search-button"
                >
                    <FaSearch />
                </button>
            </form>
            {suggestions.length > 0 && (
                <ul className="suggestions-list">
                    {suggestions.map((stock) => (
                        <li
                            key={stock.Ticker}
                            className="suggestion-item"
                            onClick={() => handleSuggestionClick(stock.Ticker)}
                        >
                            <span className="suggestion-ticker">{stock.Ticker}</span>
                            <span className="suggestion-name">{stock.Name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}