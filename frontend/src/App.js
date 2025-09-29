import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import DetectionList from './components/DetectionList';
import Upload from './pages/Upload';
import Results from './pages/Results';
import History from './pages/History';
import StatisticsPage from './pages/StatisticsPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Toaster position="top-right" />
        <main className="pt-20 pb-10 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<DetectionList />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/results/:id" element={<Results />} />
            <Route path="/history" element={<History />} />
            <Route path="/statistics" element={<StatisticsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;