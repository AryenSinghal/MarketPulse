import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';

const Chatbot = ({ mode = "default", ticker = null }) => {
    const FLASK_API_URL = process.env.REACT_APP_API_BASE_URL;

    const [isOpen, setIsOpen] = useState(false);
    // Define the initial message based on the mode
    const initialMessage = mode === "rag"
        ? { text: `Analyzing ${ticker}'s 10-K report...`, sender: 'bot' }
        : { text: "Hi there! I'm your MarketPulse AI assistant. Ask me about any news articles, stocks, or get personalized predictions based on your interests and holdings.", sender: 'bot' };

    // Use useState unconditionally with the conditional initial value
    const [messages, setMessages] = useState([initialMessage]); const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (mode === "rag" && ticker) {
            fetch(`${FLASK_API_URL}/api/rag/load?ticker=${ticker}`)
                .then(res => res.json())
                .then(data => {
                    setMessages(prev => [...prev, {
                        text: `RAG model loaded for ${ticker}. Ask me anything about this stock!`,
                        sender: 'bot'
                    }]);
                })
                .catch(err => {
                    console.error("RAG load error:", err);
                    setMessages(prev => [...prev, { text: "Failed to load RAG model.", sender: 'bot' }]);
                });
        }
    }, [mode, ticker]);

    const toggleChatbot = () => {
        setIsOpen(!isOpen);
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!input.trim()) return;

        const userMessage = { text: input, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            let response;
            if (mode === "rag") {
                response = await fetch(`${FLASK_API_URL}/api/rag/ask`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: input }),
                });
            } else {
                const userHoldings = localStorage.getItem('userHoldings')?.split(',').map(t => t.trim().toUpperCase()) || [];
                const userInterests = localStorage.getItem('userInterests')?.split(',').map(t => t.trim()) || [];

                response = await fetch(`${FLASK_API_URL}/api/chatbot`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: input,
                        context: {
                            holdings: userHoldings,
                            interests: userInterests,
                        }
                    }),
                });
            }

            if (!response.ok) {
                throw new Error('Failed to get response');
            }

            const data = await response.json();
            const botResponse = data.response || data.answer || "Sorry, no response.";
            setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);

        } catch (error) {
            console.error('Error getting chatbot response:', error);
            setMessages(prev => [...prev, {
                text: "Sorry, I couldn't process your request. Please try again.",
                sender: 'bot'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chatbot-container">
            <button
                className={`chatbot-toggle ${isOpen ? 'active' : ''}`}
                onClick={toggleChatbot}
            >
                <span className="toggle-icon">
                    {isOpen ? '×' : '💬'}
                </span>
                {!isOpen && <span className="toggle-text">AI Assistant</span>}
            </button>

            {isOpen && (
                <div className="chatbot-window">
                    <div className="chatbot-header">
                        <h3>MarketPulse AI Assistant</h3>
                    </div>
                    <div className="chatbot-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`message ${msg.sender}`}>
                                {msg.text}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message bot loading">
                                <div className="typing-indicator">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <form className="chatbot-input" onSubmit={handleSubmit}>
                        <input
                            type="text"
                            value={input}
                            onChange={handleInputChange}
                            placeholder={mode === "rag" ? `Ask about ${ticker}'s 10-K report` : "Ask about stocks, news, or predictions"}
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !input.trim()}>
                            Send
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default Chatbot;
