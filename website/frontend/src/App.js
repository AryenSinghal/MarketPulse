import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Header from './components/Header';
import Home from './pages/Home';
import StockPage from './pages/StockPage';
import BackgroundGraphic from './components/BackgroundGraphic';
import './App.css';

function App() {
    return (
        <Router>
            <div className="App">
                <BackgroundGraphic />
                <Header />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/stock/:ticker" element={<StockPage />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;