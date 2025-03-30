import React, { useState, useEffect } from 'react';

const StockChart = ({ data, positive = true }) => {
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [currentData, setCurrentData] = useState([]);

    // Handle smooth transitions between different data sets
    useEffect(() => {
        // When data changes, set transitioning state
        setIsTransitioning(true);

        // Short timeout to allow for fade animation
        const timer = setTimeout(() => {
            setCurrentData(data);
            setIsTransitioning(false);
        }, 150);

        return () => clearTimeout(timer);
    }, [data]);

    // Extract closing prices from the data
    const getClosingPrices = () => {
        if (!currentData || currentData.length === 0) {
            // Fallback to random data if no data is provided
            return generateRandomData();
        }

        // Use actual closing prices from the data
        return currentData.map(item => item.close);
    };

    // Generate random data for fallback
    const generateRandomData = () => {
        let randomData = [];
        let lastValue = 100 + Math.random() * 50;

        for (let i = 0; i < 50; i++) {
            // More likely to follow the trend (positive or negative)
            const direction = Math.random() < (positive ? 0.6 : 0.4) ? 1 : -1;
            const change = Math.random() * 5 * direction;
            lastValue += change;
            lastValue = Math.max(lastValue, 50); // Ensure no negative values
            randomData.push(lastValue);
        }

        return randomData;
    };

    const chartData = getClosingPrices();

    // Only calculate these if we have data
    const minValue = chartData.length ? Math.min(...chartData) * 0.9 : 0;
    const maxValue = chartData.length ? Math.max(...chartData) * 1.1 : 100;
    const range = maxValue - minValue;

    // Create the SVG path
    const createPath = () => {
        if (!chartData.length) return '';

        const width = 100; // percent
        const height = 100; // percent
        const segments = chartData.length - 1;
        const segmentWidth = width / segments;

        let path = `M 0,${100 - ((chartData[0] - minValue) / range * 100)}`;

        for (let i = 1; i < chartData.length; i++) {
            const x = i * segmentWidth;
            const y = 100 - ((chartData[i] - minValue) / range * 100);
            path += ` L ${x},${y}`;
        }

        return path;
    };

    // Determine if the trend is positive
    const determineTrend = () => {
        if (currentData && currentData.length >= 2) {
            return currentData[currentData.length - 1].close >= currentData[0].close;
        }
        return positive;
    };

    const isPositive = determineTrend();
    const lineColor = isPositive ? 'var(--accent-green)' : 'var(--accent-red)';
    const gradientId = `gradient-${Date.now()}`; // Use timestamp to ensure unique ID

    if (isTransitioning) {
        return (
            <div className="chart-loading period-transition">
                <div className="chart-mini-spinner"></div>
                <p>Loading chart data...</p>
            </div>
        );
    }

    return (
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="period-transition">
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                </linearGradient>
            </defs>

            {/* Area fill */}
            <path
                d={`${createPath()} L 100,100 L 0,100 Z`}
                fill={`url(#${gradientId})`}
            />

            {/* Line */}
            <path
                d={createPath()}
                fill="none"
                stroke={lineColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default StockChart;