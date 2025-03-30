import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import StockChart from "../components/StockChart";
import "./StockPage.css";
import Chatbot from "../components/Chatbot";

const StockPage = () => {
    const { ticker } = useParams();
    const [stockData, setStockData] = useState(null);
    const [chartData, setChartData] = useState({});
    const [relatedNews, setRelatedNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('1M');

    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

    function formatNumber(number) {
        if (!number) return "N/A";

        if (number >= 1e12) {
            return `${(number / 1e12).toFixed(1)} Trillion`;
        } else if (number >= 1e9) {
            return `${(number / 1e9).toFixed(1)} Billion`;
        } else if (number >= 1e6) {
            return `${(number / 1e6).toFixed(1)} Million`;
        } else {
            return number.toString();
        }
    }

    useEffect(() => {
        const fetchStockData = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/api/get_stock_data?ticker=${ticker}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch stock data");
                }
                const data = await response.json();

                // Set the basic stock data
                setStockData(data.stock_data);

                // Set the chart data for all periods if available
                if (data.stock_data && data.stock_data.chart_data) {
                    setChartData(data.stock_data.chart_data);
                } else {
                    setChartData({});
                }

                // Set related news
                setRelatedNews(data.related_news || []);
            } catch (error) {
                console.error("Error fetching stock data:", error);
                setStockData(null);
                setChartData({});
                setRelatedNews([]);
            } finally {
                setLoading(false);
            }
        };

        fetchStockData();
    }, [ticker, API_BASE_URL]);

    // Get the current period's chart data and positive state
    const getCurrentPeriodData = () => {
        if (!chartData || !chartData[timeFilter]) {
            return { data: [], positive: true };
        }
        return {
            data: chartData[timeFilter].data || [],
            positive: chartData[timeFilter].positive || true
        };
    };

    const getPriceChangeClass = (change) => {
        if (change > 0) return "positive";
        if (change < 0) return "negative";
        return "neutral";
    };

    const handleTimeFilterChange = (filter) => {
        setTimeFilter(filter);
        // No need to fetch new data, just update the filter
    };

    const currentPeriodData = getCurrentPeriodData();

    return (
        <div className="stock-page">
            {loading ? (
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading stock data...</p>
                </div>
            ) : (
                <div className="container">
                    <section className="stock-header">
                        <h1 className="fade-in">{ticker}</h1>
                        <div className="company-name fade-in delay-1">{stockData?.["Company"]}</div>
                    </section>

                    <section className="stock-overview fade-in delay-2">
                        <div className="overview-card">
                            <div className="data-label">Current Price</div>
                            <div className="data-value price-value">
                                ${stockData?.["Current Price"]}
                            </div>
                        </div>
                        <div className="overview-card">
                            <div className="data-label">Market Cap</div>
                            <div className="data-value">
                                ${formatNumber(stockData?.["Market Cap"])}
                            </div>
                        </div>
                        <div className="overview-card">
                            <div className="data-label">52 Week Range</div>
                            <div className="data-value">
                                ${stockData?.["52 Week Range"]}
                            </div>
                        </div>
                        <div className="overview-card">
                            <div className="data-label">Volume</div>
                            <div className="data-value">
                                {formatNumber(stockData?.["Volume"])}
                            </div>
                        </div>
                    </section>

                    <section className="chart-section fade-in delay-3">
                        <div className="chart-header">
                            <h2>Price Chart</h2>
                            <div className="time-filters">
                                {['1D', '1W', '1M', '3M', '1Y', 'All'].map(filter => (
                                    <button
                                        key={filter}
                                        className={`time-filter ${timeFilter === filter ? 'active' : ''}`}
                                        onClick={() => handleTimeFilterChange(filter)}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="stock-chart-container" style={{ height: '400px' }}>
                            {currentPeriodData.data.length > 0 ? (
                                <StockChart
                                    data={currentPeriodData.data}
                                    positive={currentPeriodData.positive}
                                />
                            ) : (
                                <div className="chart-loading">
                                    <p>Chart data unavailable for {timeFilter} period</p>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="news-section">
                        <h2 className="section-title">News & Impact Analysis</h2>
                        <div className="news-grid">
                            {relatedNews.length > 0 ? (
                                relatedNews.map((news, index) => (
                                    <div
                                        key={index}
                                        className={`news-card fade-in delay-${index % 3 + 1}`}
                                        style={{ animationDelay: `${0.1 * (index + 3)}s` }}
                                    >
                                        <h3 className="news-headline">{news.headline}</h3>
                                        <p className="news-summary">{news.summary}</p>
                                        <div className="prediction-container">
                                            <span className="prediction-label">Predicted Impact</span>
                                            <div className={`price-change ${getPriceChangeClass(news.price_change)}`}>
                                                {news.price_change > 0 ? "+" : ""}
                                                {news.price_change}%
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="no-news-message">
                                    <p>No related news articles found for {ticker}</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            )}
            <Chatbot mode="rag" ticker={ticker} />
        </div>
    );
};

export default StockPage;