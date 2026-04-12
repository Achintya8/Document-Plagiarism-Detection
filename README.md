# Document Plagiarism Detection

A full-stack university assignment project for comparing two documents using multiple plagiarism detection algorithms.

## Features
- Compare two inputs using:
  - Dynamic Programming (Longest Common Substring)
  - Knuth–Morris–Pratt (KMP)
  - Rabin-Karp
- Compare all algorithms side-by-side in one action
- Support for text input and searchable PDF upload on either side
- PDF extraction with preview, page count, and character count
- Sample test cases for quick validation
- Clear UI notes explaining algorithm metric differences

## Run locally

### Backend
```powershell
cd backend
python -m pip install -r requirements.txt
python app.py
```

### Frontend
```powershell
cd frontend
npm install
npm run dev
```

Open the Vite app in your browser and confirm the backend is running at `http://localhost:5000`.

## API Endpoints
- `POST /api/compare`
  - JSON payload: `{ doc1, doc2, algorithm }`
  - Supports form-data with `file1` / `file2` for PDF uploads too
- `POST /api/compare-all`
  - JSON payload: `{ doc1, doc2 }`
  - Supports form-data with `file1` / `file2`
- `POST /api/extract-pdf`
  - Multipart form-data: `file`
  - Returns extracted `text`, `page_count`, and `char_count`

## Notes
- PDF comparison works for searchable text-based PDFs only.
- Image-only or scanned PDFs are not supported without OCR.
- The UI explains why DP shows longest common substring while KMP/Rabin-Karp show n-gram overlap percentages.
