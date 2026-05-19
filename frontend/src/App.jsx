import React, { useState } from 'react';
import axios from 'axios';
import {
  Search,
  AlertCircle,
  Clock,
  Percent,
  FileCheck,
  Upload
} from 'lucide-react';
import './index.css';

const sampleCases = [
  {
    id: 'identical',
    title: 'Identical texts',
    description: 'Two identical short passages should produce very high similarity.',
    doc1: 'The quick brown fox jumps over the lazy dog.',
    doc2: 'The quick brown fox jumps over the lazy dog.'
  },
  {
    id: 'no-overlap',
    title: 'No overlap',
    description: 'Two unrelated passages should return near 0% similarity.',
    doc1: 'Data structures organize information for efficient access and modification.',
    doc2: 'A mountain bike ride in fall brings fresh air and scenic views.'
  },
  {
    id: 'partial-copy',
    title: 'Partial plagiarism',
    description: 'A copied sentence inside a larger paragraph should show partial match detection.',
    doc1: 'The course covers algorithms, data structures, and design techniques for efficient software.',
    doc2: 'In the project, the course covers algorithms, data structures, and design techniques for efficient software development, while also exploring user interface design.'
  }
];

function App() {
  const [doc1, setDoc1] = useState('');
  const [doc2, setDoc2] = useState('');
  const [doc1Mode, setDoc1Mode] = useState('text');
  const [doc2Mode, setDoc2Mode] = useState('text');
  const [file1, setFile1] = useState(null);
  const [file2, setFile2] = useState(null);
  const [pdf1Info, setPdf1Info] = useState(null);
  const [pdf2Info, setPdf2Info] = useState(null);
  const [algorithm, setAlgorithm] = useState('dp');
  const [runMode, setRunMode] = useState('compareAll');
  const [results, setResults] = useState([]);
  const [note, setNote] = useState('');
  const [sampleId, setSampleId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const normalizeText = (text) => text.replace(/\s+/g, ' ').trim();

  const getDocText = (side) => {
    if (side === 'left') {
      return doc1Mode === 'pdf' ? pdf1Info?.text || '' : doc1;
    }
    return doc2Mode === 'pdf' ? pdf2Info?.text || '' : doc2;
  };

  const getSourceLabel = (side) => {
    return side === 'left'
      ? doc1Mode === 'pdf'
        ? 'PDF'
        : 'Text'
      : doc2Mode === 'pdf'
      ? 'PDF'
      : 'Text';
  };

  const getSimilarityClass = (score) => {
    if (score >= 70) return 'similarity-high';
    if (score >= 30) return 'similarity-medium';
    return 'similarity-low';
  };

  const getSideMeta = (side) => {
    const text = getDocText(side);
    const normalized = normalizeText(text);
    const words = normalized ? normalized.split(' ').filter(Boolean).length : 0;
    return {
      text,
      normalized,
      words,
      chars: normalized.length
    };
  };

  const escapeHtml = (unsafe) =>
    unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const renderHighlightedPreview = (text, matches) => {
    if (!text) return 'No preview available.';
    const stripped = escapeHtml(text).slice(0, 1200);
    const uniqueMatches = Array.from(new Set(matches || [])).sort((a, b) => b.length - a.length).slice(0, 3);
    let highlighted = stripped;
    uniqueMatches.forEach((match) => {
      if (!match || match.length < 3) return;
      const safeMatch = escapeHtml(match);
      const regex = new RegExp(escapeRegExp(safeMatch), 'g');
      highlighted = highlighted.replace(regex, `<mark>${safeMatch}</mark>`);
    });
    if (stripped.length === 1200) {
      highlighted += '...';
    }
    return highlighted;
  };

  const handleSampleSelect = (sample) => {
    setDoc1(sample.doc1);
    setDoc2(sample.doc2);
    setDoc1Mode('text');
    setDoc2Mode('text');
    setFile1(null);
    setFile2(null);
    setPdf1Info(null);
    setPdf2Info(null);
    setSampleId(sample.id);
    setError('');
    setResults([]);
    setNote('');
  };

  const handleClearFile = (side) => {
    if (side === 'left') {
      setFile1(null);
      setPdf1Info(null);
    } else {
      setFile2(null);
      setPdf2Info(null);
    }
  };

  const handlePdfUpload = async (side, file) => {
    if (!file) return;
    setError('');
    const maxBytes = 10 * 1024 * 1024;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.');
      return;
    }
    if (file.size > maxBytes) {
      setError('PDF files must be smaller than 10 MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    if (side === 'left') {
      setFile1(file);
      setPdf1Info(null);
    } else {
      setFile2(file);
      setPdf2Info(null);
    }

    try {
      const response = await axios.post('http://localhost:5000/api/extract-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const payload = response.data;
      if (side === 'left') {
        setPdf1Info(payload);
        setDoc1Mode('pdf');
      } else {
        setPdf2Info(payload);
        setDoc2Mode('pdf');
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to extract text from the PDF.';
      setError(message);
    }
  };

  const handleModeSwitch = (side, mode) => {
    setError('');
    if (side === 'left') {
      setDoc1Mode(mode);
      if (mode === 'text') {
        setFile1(null);
        setPdf1Info(null);
      }
    } else {
      setDoc2Mode(mode);
      if (mode === 'text') {
        setFile2(null);
        setPdf2Info(null);
      }
    }
  };

  const buildPayload = () => {
    const leftText = getDocText('left');
    const rightText = getDocText('right');

    return {
      doc1: normalizeText(leftText),
      doc2: normalizeText(rightText)
    };
  };

  const handleCompare = async () => {
    const leftText = getDocText('left');
    const rightText = getDocText('right');

    if (!normalizeText(leftText) || !normalizeText(rightText)) {
      setError('Please provide text or upload searchable PDFs for both document sides.');
      return;
    }

    setError('');
    setLoading(true);
    setResults([]);
    setNote('');

    try {
      const payload = buildPayload();
      const endpoint = runMode === 'compareAll' ? '/api/compare-all' : '/api/compare';
      if (runMode === 'single') {
        payload.algorithm = algorithm;
      }

      const response = await axios.post(`http://localhost:5000${endpoint}`, payload);
      if (runMode === 'compareAll') {
        setResults(response.data.results || []);
        setNote(response.data.note || '');
      } else {
        setResults([response.data]);
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to connect to the backend server. Make sure it is running on port 5000.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const leftMeta = getSideMeta('left');
  const rightMeta = getSideMeta('right');
  const summaryScore = results.length ? results.reduce((sum, item) => sum + item.similarity, 0) / results.length : 0;
  const summaryValue = runMode === 'compareAll' ? summaryScore : results[0]?.similarity || 0;
  const summaryLabel = runMode === 'compareAll' ? 'Average similarity' : 'Algorithm verdict';
  const summaryBadge = summaryValue >= 70 ? 'RED FLAG' : summaryValue >= 30 ? 'CAUTION' : 'CLEAR';
  const summarySubtitle = runMode === 'compareAll'
    ? 'Consolidated report across all available algorithms.'
    : 'Single algorithm comparison result.';

  return (
    <div className="report-shell">
      <header className="report-header">
        <div className="report-intro">
          <h1>Document Plagiarism Detection</h1>
          <p>Inspect two documents in a clean report layout with text and PDF evidence side by side.</p>
        </div>
      </header>

      <div className="main-grid">
        <aside className="sample-aside">
          <div className="panel-box">
            <div className="panel-title">Sample cases</div>
            <p className="panel-copy">Load a built-in case to populate both sides.</p>
            <div className="sample-list">
              {sampleCases.map((sample) => (
                <button
                  key={sample.id}
                  className={sampleId === sample.id ? 'sample-item active' : 'sample-item'}
                  onClick={() => handleSampleSelect(sample)}
                >
                  <strong>{sample.title}</strong>
                  <span>{sample.description}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="input-stage">
          <div className="panel-box evidence-panel">
            {error && (
              <div className="alert-box" role="alert" aria-live="polite">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="input-grid">
              <article className="dossier dossier-left">
                <div className="dossier-head">
                  <div>
                    <span className="dossier-label">SOURCE</span>
                    <h2>Original document</h2>
                    <p className="dossier-subtitle">{getSourceLabel('left')}</p>
                  </div>
                  <div className="toggle-group">
                    <button
                      className={doc1Mode === 'text' ? 'toggle active' : 'toggle'}
                      onClick={() => handleModeSwitch('left', 'text')}
                    >
                      Text
                    </button>
                    <button
                      className={doc1Mode === 'pdf' ? 'toggle active' : 'toggle'}
                      onClick={() => handleModeSwitch('left', 'pdf')}
                    >
                      PDF
                    </button>
                  </div>
                </div>

                {doc1Mode === 'text' ? (
                  <>
                    <textarea
                      value={doc1}
                      onChange={(e) => setDoc1(e.target.value)}
                      placeholder="Paste source text here..."
                    />
                    <div className="doc-footer">{leftMeta.chars} chars · {leftMeta.words} words</div>
                  </>
                ) : (
                  <div className="file-panel">
                    <label className="file-upload" htmlFor="file1">
                      <Upload size={18} />
                      {file1 ? 'Replace PDF evidence' : 'Upload PDF evidence'}
                    </label>
                    <input
                      id="file1"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handlePdfUpload('left', e.target.files[0])}
                    />

                    {pdf1Info ? (
                      <div className="file-summary">
                        <span><strong>{pdf1Info.filename}</strong></span>
                        <span>{pdf1Info.page_count} pages</span>
                        <span>{pdf1Info.char_count} chars</span>
                        <button className="link-button" onClick={() => handleClearFile('left')}>Clear evidence</button>
                      </div>
                    ) : (
                      <p className="hint-text">Upload a searchable PDF to extract text and preserve it in the report.</p>
                    )}
                    <div className="preview-box" dangerouslySetInnerHTML={{ __html: renderHighlightedPreview(pdf1Info?.text || '', results.flatMap((r) => r.matches)) }} />
                  </div>
                )}
              </article>

              <article className="dossier dossier-right">
                <div className="dossier-head">
                  <div>
                    <span className="dossier-label neutral">SUSPECTED</span>
                    <h2>Suspected document</h2>
                    <p className="dossier-subtitle">{getSourceLabel('right')}</p>
                  </div>
                  <div className="toggle-group">
                    <button
                      className={doc2Mode === 'text' ? 'toggle active' : 'toggle'}
                      onClick={() => handleModeSwitch('right', 'text')}
                    >
                      Text
                    </button>
                    <button
                      className={doc2Mode === 'pdf' ? 'toggle active' : 'toggle'}
                      onClick={() => handleModeSwitch('right', 'pdf')}
                    >
                      PDF
                    </button>
                  </div>
                </div>

                {doc2Mode === 'text' ? (
                  <>
                    <textarea
                      value={doc2}
                      onChange={(e) => setDoc2(e.target.value)}
                      placeholder="Paste suspected text here..."
                    />
                    <div className="doc-footer">{rightMeta.chars} chars · {rightMeta.words} words</div>
                  </>
                ) : (
                  <div className="file-panel">
                    <label className="file-upload" htmlFor="file2">
                      <Upload size={18} />
                      {file2 ? 'Replace PDF evidence' : 'Upload PDF evidence'}
                    </label>
                    <input
                      id="file2"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handlePdfUpload('right', e.target.files[0])}
                    />

                    {pdf2Info ? (
                      <div className="file-summary">
                        <span><strong>{pdf2Info.filename}</strong></span>
                        <span>{pdf2Info.page_count} pages</span>
                        <span>{pdf2Info.char_count} chars</span>
                        <button className="link-button" onClick={() => handleClearFile('right')}>Clear evidence</button>
                      </div>
                    ) : (
                      <p className="hint-text">Upload a searchable PDF to extract text and preserve it in the report.</p>
                    )}
                    <div className="preview-box" dangerouslySetInnerHTML={{ __html: renderHighlightedPreview(pdf2Info?.text || '', results.flatMap((r) => r.matches)) }} />
                  </div>
                )}
              </article>
            </div>

            <section className="verdict-panel">
              <div className="verdict-card">
                <div className="verdict-header">
                  <span className="verdict-label">VERDICT</span>
                  <h2>Run the comparison</h2>
                </div>
                <p className="verdict-copy">Choose a mode, then run the report.</p>

                <div className="mode-block">
                  <button
                    className={runMode === 'compareAll' ? 'mode-button active' : 'mode-button'}
                    onClick={() => setRunMode('compareAll')}
                  >
                    Compare All
                  </button>
                  <button
                    className={runMode === 'single' ? 'mode-button active' : 'mode-button'}
                    onClick={() => setRunMode('single')}
                  >
                    Single Algorithm
                  </button>
                </div>

                {runMode === 'single' && (
                  <div className="algo-chip-row">
                    <button
                      type="button"
                      className={algorithm === 'dp' ? 'algo-chip active' : 'algo-chip'}
                      onClick={() => setAlgorithm('dp')}
                    >
                      DP
                    </button>
                    <button
                      type="button"
                      className={algorithm === 'kmp' ? 'algo-chip active' : 'algo-chip'}
                      onClick={() => setAlgorithm('kmp')}
                    >
                      KMP
                    </button>
                    <button
                      type="button"
                      className={algorithm === 'rabin-karp' ? 'algo-chip active' : 'algo-chip'}
                      onClick={() => setAlgorithm('rabin-karp')}
                    >
                      Rabin-Karp
                    </button>
                  </div>
                )}

                <button className="run-button" onClick={handleCompare} disabled={loading}>
                  {loading ? <span className="loader" /> : <Search size={18} />}
                  {loading ? 'Analyzing...' : 'Run report'}
                </button>
              </div>
            </section>
          </div>
        </section>
      </div>

      {results.length > 0 && (
        <section className="results-report">
          <div className="results-hero">
            <div className={`result-status ${getSimilarityClass(summaryValue)}`}>
              <span>{summaryBadge}</span>
            </div>
            <div className="results-copy">
              <span className="small-label">SUMMARY</span>
              <h2>{summaryLabel}</h2>
              <div className="score-display">{summaryValue.toFixed(1)}%</div>
              <p>{summarySubtitle}</p>
            </div>
          </div>

          <div className="results-grid">
            {results.map((item) => (
              <div key={item.algorithm} className="result-box">
                <div className="result-top">
                  <span className={getSimilarityClass(item.similarity)}>{item.name}</span>
                  <span>{item.execution_time}</span>
                </div>
                <div className={`score-badge ${getSimilarityClass(item.similarity)}`}>{item.similarity.toFixed(1)}%</div>
                <div className="result-meta">{item.complexity}</div>
                <div className="result-match">Matches: {item.matches.length}</div>
              </div>
            ))}
          </div>

          <div className="comparison-table">
            <div className="table-head">
              <div>Algorithm</div>
              <div>Similarity</div>
              <div>Time</div>
              <div>Top matches</div>
            </div>
            {results.map((item) => (
              <div key={item.algorithm} className="table-row">
                <div>
                  <strong>{item.name}</strong>
                </div>
                <div className={getSimilarityClass(item.similarity)}>{item.similarity.toFixed(1)}%</div>
                <div>{item.execution_time}</div>
                <div>
                  {item.matches.length > 0 ? (
                    <div className="tag-list">
                      {item.matches.slice(0, 4).map((match, index) => (
                        <span key={index} className="tag">{match}</span>
                      ))}
                    </div>
                  ) : (
                    <span className="tag muted">No matches found</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
