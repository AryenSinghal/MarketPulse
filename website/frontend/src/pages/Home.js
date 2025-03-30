import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StockSearch from '../components/StockSearch';
import StockChart from '../components/StockChart';
import MarketOverview from '../components/MarketOverview';
import NewsCard from '../components/NewsCard';
import Chatbot from '../components/Chatbot';
import Select from 'react-select';
import stockList from '../data/stockList';
import interestOptions from '../data/interestOptions';
import './Home.css';

export default function Home() {
    const [events, setEvents] = useState([]);
    const [trendingStocks, setTrendingStocks] = useState([
        { ticker: 'AAPL', name: 'Apple Inc.', price: 189.84, change: 2.31 },
        { ticker: 'MSFT', name: 'Microsoft Corp.', price: 417.88, change: 1.44 },
        { ticker: 'NVDA', name: 'NVIDIA Corp.', price: 950.02, change: 3.75 },
        { ticker: 'AMZN', name: 'Amazon.com Inc.', price: 182.41, change: -0.52 },
        { ticker: 'GOOGL', name: 'Alphabet Inc.', price: 152.19, change: 0.83 },
    ]);
    const [loading, setLoading] = useState(true);
    const FLASK_API_URL = process.env.REACT_APP_API_BASE_URL;

    const [selectedHoldings, setSelectedHoldings] = useState([]);
    const [selectedInterests, setSelectedInterests] = useState([]);

    useEffect(() => {
        // Fetch data from the API
        const fetchEvents = async () => {
            try {
                const response = await fetch(`${FLASK_API_URL}/api/get_events`);
                if (!response.ok) {
                    throw new Error('Failed to fetch events data');
                }
                const data = await response.json();
                setEvents(data);
            } catch (error) {
                console.error('Error fetching events:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();

        const savedHoldings = JSON.parse(localStorage.getItem('userHoldings') || '[]');
        const savedInterests = JSON.parse(localStorage.getItem('userInterests') || '[]');

        setSelectedHoldings(stockList.filter(opt => savedHoldings.includes(opt.value)));
        setSelectedInterests(interestOptions.filter(opt => savedInterests.includes(opt.value)));
    }, []);

    const customSelectStyles = {
        control: (provided) => ({
            ...provided,
            backgroundColor: '#1e1e2f',
            borderColor: '#555',
            color: '#fff',
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: '#1e1e2f',
            color: '#fff',
        }),
        multiValue: (provided) => ({
            ...provided,
            backgroundColor: '#333',
        }),
        multiValueLabel: (provided) => ({
            ...provided,
            color: '#fff',
        }),
        input: (provided) => ({
            ...provided,
            color: '#fff',
        }),
        placeholder: (provided) => ({
            ...provided,
            color: '#aaa',
        }),
        singleValue: (provided) => ({
            ...provided,
            color: '#fff',
        }),
    };

    return (
        <div className="home-page">
            <section className="hero-section">
                <div className="container">
                    <div className="hero-content animate-fade-in">
                        <h1>Smarter investing with <span className="text-gradient">MarketPulse</span></h1>
                        <p className="hero-subtitle">AI-powered market insights and predictive analytics for the modern investor</p>
                        <StockSearch />
                    </div>
                </div>
            </section>

            <section className="section market-overview-section">
                <div className="container">
                    <h2 className="section-title">Market Pulse</h2>
                    <MarketOverview />
                </div>
            </section>

            {/* <section className="section trending-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">Trending Stocks</h2>
                        <Link to="/markets" className="view-all-link">View all</Link>
                    </div>

                    <div className="trending-stocks animate-fade-in">
                        {trendingStocks.map((stock, index) => (
                            <Link
                                to={`/stock/${stock.ticker}`}
                                className="trending-stock-card"
                                key={stock.ticker}
                                style={{ animationDelay: `${0.1 * index}s` }}
                            >
                                <div className="stock-info">
                                    <div className="stock-name">
                                        <h3>{stock.ticker}</h3>
                                        <span>{stock.name}</span>
                                    </div>
                                    <div className="stock-price">
                                        <span className="price">${stock.price}</span>
                                        <span className={stock.change >= 0 ? "change positive" : "change negative"}>
                                            {stock.change > 0 ? '+' : ''}{stock.change}%
                                        </span>
                                    </div>
                                </div>
                                <div className="stock-chart">
                                    <StockChart ticker={stock.ticker} positive={stock.change >= 0} />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section> */}

            <section className="section holdings-interests-section">
                <div className="container">
                    <div className="section-header">
                        <h2 className="section-title">My Holdings & Interests</h2>
                    </div>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            localStorage.setItem('userHoldings', JSON.stringify(selectedHoldings.map(opt => opt.value)));
                            localStorage.setItem('userInterests', JSON.stringify(selectedInterests.map(opt => opt.value)));
                        }}
                    >
                        <div className="two-column-form">
                            {/* Holdings */}
                            <div className="form-column">
                                <label>Select Stocks You Hold</label>
                                <Select
                                    isMulti
                                    options={stockList}
                                    value={selectedHoldings}
                                    onChange={setSelectedHoldings}
                                    placeholder="Choose your stocks..."
                                    styles={customSelectStyles}
                                />
                                {selectedHoldings.length > 0 && (
                                    <div className="selected-items">
                                        <strong>Currently Selected Holdings:</strong>
                                        <ul>
                                            {selectedHoldings.map((stock) => (
                                                <li key={stock.value}>{stock.label}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>

                            {/* Interests */}
                            <div className="form-column">
                                <label>Select Areas of Interest</label>
                                <Select
                                    isMulti
                                    options={interestOptions}
                                    value={selectedInterests}
                                    onChange={setSelectedInterests}
                                    placeholder="Choose your interests..."
                                    styles={customSelectStyles}
                                />
                                {selectedInterests.length > 0 && (
                                    <div className="selected-items">
                                        <strong>Currently Selected Interests:</strong>
                                        <ul>
                                            {selectedInterests.map((interest) => (
                                                <li key={interest.value}>{interest.label}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button type="submit" className="save-preferences-button">
                            Save Preferences
                        </button>
                    </form>
                </div>
            </section>


            <section className="section news-section">
                <div className="container">
                    <h2 className="section-title">News & Impact</h2>

                    {loading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p>Loading insights...</p>
                        </div>
                    ) : (
                        <div className="news-grid">
                            {events.map((event, index) => (
                                <NewsCard
                                    key={index}
                                    headline={event.headline}
                                    summary={event.summary}
                                    priceChanges={event.pricechanges}
                                    delay={index * 0.1}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* AI Assistant Chatbot */}
            <Chatbot />
        </div>
    );
}