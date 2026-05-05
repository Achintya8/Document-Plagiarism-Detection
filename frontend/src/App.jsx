import React, { useState } from 'react';
import axios from 'axios';
import { Search, FileText, Settings, AlertCircle, Clock, Percent, FileCheck } from 'lucide-react';
import './index.css';

function App() {
  const [doc1, setDoc1] = useState('');
  const [doc2, setDoc2] = useState('');
  const [algorithm, setAlgorithm] = useState('dp');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCompare = async () => {
    if (!doc1.trim() || !doc2.trim()) {
      setError('Please enter text in both documents to compare.');
      return;
    }
    
    setError('');
    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post('http://localhost:5000/api/compare', {
        doc1,
        doc2,
        algorithm
      });
      
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError('Failed to connect to the backend server. Make sure it is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityClass = (score) => {
    if (score >= 70) return 'similarity-high';
    if (score >= 30) return 'similarity-medium';
    return 'similarity-low';
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Document Plagiarism Detection</h1>
        <p>Advanced string matching and sequence alignment algorithms</p>
      </header>

      <div className="glass-panel">
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={20} />
            {error}
          </div>
        )}
        
        <div className="input-grid">
          <div className="input-group">
            <label htmlFor="doc1">
              <FileText size={18} />
              Source Document
            </label>
            <textarea 
              id="doc1"
              value={doc1}
              onChange={(e) => setDoc1(e.target.value)}
              placeholder="Paste the original source text here..."
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="doc2">
              <FileSearchIcon />
              Suspected Document / Pattern
            </label>
            <textarea 
              id="doc2"
              value={doc2}
              onChange={(e) => setDoc2(e.target.value)}
              placeholder="Paste the text to check for plagiarism..."
            />
          </div>
        </div>

        <div className="controls">
          <div className="algo-select">
            <label htmlFor="algo">
              <Settings size={18} />
              Algorithm:
            </label>
            <select 
              id="algo" 
              value={algorithm} 
              onChange={(e) => setAlgorithm(e.target.value)}
            >
              <option value="dp">Dynamic Programming (LCS)</option>
              <option value="kmp">Knuth-Morris-Pratt (KMP)</option>
              <option value="rabin-karp">Rabin-Karp</option>
            </select>
          </div>
          
          <button 
            className="btn-primary" 
            onClick={handleCompare}
            disabled={loading}
          >
            {loading ? <span className="loader"></span> : (
              <>
                <Search size={18} />
                Analyze Texts
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="glass-panel results-panel">
          <div className="results-grid">
            <div className="metric-card">
              <div className={`metric-value ${getSimilarityClass(result.similarity)}`}>
                <Percent size={32} />
                {result.similarity.toFixed(1)}%
              </div>
              <div className="metric-label">Similarity Score</div>
            </div>
            
            <div className="metric-card">
              <div className="metric-value" style={{ color: '#60a5fa' }}>
                <Clock size={32} />
                {result.execution_time}
              </div>
              <div className="metric-label">Execution Time</div>
            </div>
          </div>

          <div className="matches-container">
            <h3>
              <FileCheck size={20} color="#3b82f6" />
              Identified Matches
            </h3>
            {result.matches && result.matches.length > 0 ? (
              result.matches.map((match, idx) => (
                <div key={idx} className="match-item">
                  {match}
                </div>
              ))
            ) : (
              <p className="no-matches">No significant plagiarism patterns detected.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper icon component
function FileSearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <circle cx="10" cy="13" r="2"></circle>
      <line x1="11.41" y1="14.41" x2="13" y2="16"></line>
    </svg>
  );
}

export default App;
