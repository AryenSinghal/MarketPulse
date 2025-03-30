import React, { useState, useEffect } from 'react';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import './MarketOverview.css';

const MarketOverview = () => {
    // State to store the market data
    const [marketData, setMarketData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const FLASK_API_URL = process.env.REACT_APP_API_BASE_URL;

    useEffect(() => {
        // Function to fetch trending stocks data from our backend API
        const fetchTrendingStocks = async () => {
            try {
                setLoading(true);
                setError(null);

                // Make a call to our backend API
                const response = await fetch(`${FLASK_API_URL}/api/trending_stocks?count=6`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch trending stocks: ${response.statusText}`);
                }

                const data = await response.json();

                // Check if we received valid data
                if (!Array.isArray(data)) {
                    throw new Error("Received invalid data format");
                }

                setMarketData(data);
                console.log("Updated market data:", data);
            } catch (error) {
                console.error("Error fetching market data:", error);
                setError("Failed to load market data. Please try again later.");

                // Fallback data in case of error
                setMarketData([
                    { name: 'NVDA', value: '$875.28', change: '2.35%', positive: true },
                    { name: 'AAPL', value: '$178.61', change: '0.93%', positive: true },
                    { name: 'TSLA', value: '$172.63', change: '1.45%', positive: false },
                    { name: 'AMD', value: '$159.34', change: '3.27%', positive: true },
                    { name: 'META', value: '$491.83', change: '0.76%', positive: true },
                    { name: 'MSFT', value: '$417.22', change: '1.12%', positive: true }
                ]);
            } finally {
                setLoading(false);
            }
        };

        // Fetch data on component mount
        fetchTrendingStocks();

        // Set up a refresh interval (every 5 minutes)
        const intervalId = setInterval(fetchTrendingStocks, 300000);

        // Clean up interval on component unmount
        return () => clearInterval(intervalId);
    }, []);

    // Show a loading indicator while data is being fetched
    if (loading && !marketData.length) {
        return <div className="market-overview loading">Loading market data...</div>;
    }

    return (
        <div className="market-overview">
            {error && <div className="market-error">{error}</div>}
            <div className="market-overview-scroll">
                {marketData.map((item, index) => (
                    <div key={index} className="market-item">
                        <div className="market-name">{item.name}</div>
                        <div className="market-value">{item.value}</div>
                        <div className={`market-change ${item.positive ? 'positive' : 'negative'}`}>
                            {item.positive ? <FaArrowUp className="arrow-icon" /> : <FaArrowDown className="arrow-icon" />}
                            {item.change}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MarketOverview;