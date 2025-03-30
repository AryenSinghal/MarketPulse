import React from 'react';
import './NewsCard.css';

export default function NewsCard({ headline, summary, priceChanges, delay }) {
    return (
        <div className="news-card" style={{ animationDelay: `${delay}s` }}>
            <h3 className="news-headline">{headline}</h3>
            <p className="news-summary">{summary}</p>
            <div className="price-changes">
                {Object.entries(priceChanges).map(([ticker, change]) => (
                    <div key={ticker} className="price-change">
                        <span className="ticker">{ticker}</span>
                        <span
                            className={`change ${change >= 0 ? 'positive' : 'negative'
                                }`}
                        >
                            {change > 0 ? '+' : ''}
                            {change}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}