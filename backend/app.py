import io
import os
import re
from flask import Flask, jsonify, request
from flask_cors import CORS
from pypdf import PdfReader
from algorithms import lcs_dp, kmp_search, rabin_karp_search

app = Flask(__name__)
CORS(app)

MAX_PDF_SIZE = 10 * 1024 * 1024
ALGORITHM_INFO = {
    'dp': {
        'name': 'Dynamic Programming (Longest Common Substring)',
        'description': 'Finds the longest exact matching substring between two documents.',
        'complexity': 'O(m·n) time, O(m·n) space'
    },
    'kmp': {
        'name': 'Knuth–Morris–Pratt (KMP)',
        'description': 'Searches 3-word chunks with KMP to detect partial overlap quickly.',
        'complexity': 'O(n + m) per chunk average, overall chunk comparison depends on text size'
    },
    'rabin-karp': {
        'name': 'Rabin-Karp (Rolling Hash)',
        'description': 'Uses rolling hashes to compare n-gram segments for partial plagiarism detection.',
        'complexity': 'O(n + m) per chunk average, overall chunk comparison depends on text size'
    }
}


def normalize_text(text: str) -> str:
    if not text:
        return ''
    return re.sub(r'\s+', ' ', text).strip()


def extract_text_from_pdf(file_storage):
    filename = os.path.basename(file_storage.filename or 'document.pdf')
    if not filename.lower().endswith('.pdf'):
        raise ValueError('Only .pdf files are supported.')

    content = file_storage.read()
    if not content:
        raise ValueError('The uploaded PDF file is empty.')

    if len(content) > MAX_PDF_SIZE:
        raise IOError('Uploaded PDF exceeds the 10 MB file size limit.')

    try:
        reader = PdfReader(io.BytesIO(content))
        pages = reader.pages
        extracted_fragments = []
        for page in pages:
            page_text = page.extract_text() or ''
            if page_text:
                extracted_fragments.append(page_text)
    except Exception as exc:
        raise ValueError(f'Unable to extract text from PDF. The file may be corrupted or scanned as an image-only PDF. ({exc})')

    extracted_text = normalize_text(' '.join(extracted_fragments))
    if not extracted_text:
        raise ValueError('No searchable text was found in the PDF. Image-only PDFs require OCR and are not supported.')

    return {
        'text': extracted_text,
        'page_count': len(pages),
        'char_count': len(extracted_text),
        'filename': filename
    }


def get_request_texts():
    doc1 = ''
    doc2 = ''
    doc1_source = 'text'
    doc2_source = 'text'

    if request.is_json:
        payload = request.get_json(silent=True) or {}
        doc1 = payload.get('doc1', '') or ''
        doc2 = payload.get('doc2', '') or ''
    else:
        doc1 = request.form.get('doc1', '') or ''
        doc2 = request.form.get('doc2', '') or ''

    if request.files:
        if 'file1' in request.files and request.files['file1'].filename:
            pdf_info = extract_text_from_pdf(request.files['file1'])
            doc1 = pdf_info['text']
            doc1_source = 'pdf'
        if 'file2' in request.files and request.files['file2'].filename:
            pdf_info = extract_text_from_pdf(request.files['file2'])
            doc2 = pdf_info['text']
            doc2_source = 'pdf'

    return normalize_text(doc1), normalize_text(doc2), doc1_source, doc2_source


def build_result(algorithm_key, raw_result):
    info = ALGORITHM_INFO.get(algorithm_key, {})
    return {
        'algorithm': algorithm_key,
        'name': info.get('name', algorithm_key),
        'description': info.get('description', ''),
        'complexity': info.get('complexity', ''),
        'similarity': raw_result.get('similarity', 0),
        'matches': raw_result.get('matches', []),
        'execution_time': raw_result.get('execution_time', '0.00ms')
    }


def select_algorithm(key, doc1, doc2):
    if key in ['dp', 'lcs', 'dynamic programming']:
        return 'dp', lcs_dp(doc1, doc2)
    if key == 'kmp':
        return 'kmp', kmp_search(doc1, doc2)
    if key in ['rabin-karp', 'rabinkarp', 'rk']:
        return 'rabin-karp', rabin_karp_search(doc1, doc2)
    return 'dp', lcs_dp(doc1, doc2)


@app.route('/api/compare', methods=['POST'])
def compare_documents():
    try:
        doc1, doc2, source1, source2 = get_request_texts()
        if not doc1 or not doc2:
            return jsonify({'error': 'Both documents must include text or a supported PDF file.'}), 400

        if request.is_json:
            payload = request.get_json(silent=True) or {}
            algorithm = (payload.get('algorithm', '') or '').lower()
        else:
            algorithm = (request.form.get('algorithm', '') or '').lower()

        algo_key, raw_result = select_algorithm(algorithm, doc1, doc2)
        result = build_result(algo_key, raw_result)
        result['sources'] = {'left': source1, 'right': source2}
        return jsonify(result)

    except IOError as exc:
        return jsonify({'error': str(exc)}), 413
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:
        app.logger.exception(exc)
        return jsonify({'error': 'An internal server error occurred while processing the documents.'}), 500


@app.route('/api/compare-all', methods=['POST'])
def compare_all():
    try:
        doc1, doc2, source1, source2 = get_request_texts()
        if not doc1 or not doc2:
            return jsonify({'error': 'Both documents must include text or a supported PDF file.'}), 400

        results = []
        for algo_key in ['dp', 'kmp', 'rabin-karp']:
            _, raw_result = select_algorithm(algo_key, doc1, doc2)
            results.append(build_result(algo_key, raw_result))

        return jsonify({
            'results': results,
            'sources': {'left': source1, 'right': source2},
            'note': 'DP reports longest common substring similarity while KMP/Rabin-Karp report n-gram overlap percentages.'
        })

    except IOError as exc:
        return jsonify({'error': str(exc)}), 413
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:
        app.logger.exception(exc)
        return jsonify({'error': 'An internal server error occurred while processing the documents.'}), 500


@app.route('/api/extract-pdf', methods=['POST'])
def extract_pdf():
    if 'file' not in request.files or not request.files['file'].filename:
        return jsonify({'error': 'No PDF file was uploaded.'}), 400

    try:
        pdf_info = extract_text_from_pdf(request.files['file'])
        return jsonify(pdf_info)

    except IOError as exc:
        return jsonify({'error': str(exc)}), 413
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except Exception as exc:
        app.logger.exception(exc)
        return jsonify({'error': 'Unable to extract text from the PDF file.'}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)
