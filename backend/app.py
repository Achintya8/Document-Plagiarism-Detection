from flask import Flask, jsonify, request
from flask_cors import CORS
from algorithms import lcs_dp, kmp_search, rabin_karp_search

app = Flask(__name__)
CORS(app)

@app.route('/api/compare', methods=['POST'])
def compare_documents():
    data = request.json
    doc1 = data.get('doc1', '')
    doc2 = data.get('doc2', '')
    algo = data.get('algorithm', '').lower()
    
    if algo in ['dp', 'lcs', 'dynamic programming']:
        result = lcs_dp(doc1, doc2)
    elif algo == 'kmp':
        result = kmp_search(doc1, doc2)
    elif algo in ['rabin-karp', 'rabinkarp', 'rk']:
        result = rabin_karp_search(doc1, doc2)
    else:
        # Default to DP if not specified or unknown
        result = lcs_dp(doc1, doc2)
        
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True, port=5000)