import time

def get_word_ngrams(text, n=3):
    """Helper function to break text into sequences of n words for partial matching."""
    words = text.split()
    if len(words) < n:
        return [" ".join(words)] if words else []
    return [" ".join(words[i:i+n]) for i in range(len(words)-n+1)]

def lcs_dp(doc1: str, doc2: str):
    """
    Dynamic Programming: Longest Common Substring (LCS)
    Builds a 2D matrix where L[i][j] represents the length of the longest common suffix.
    """
    m = len(doc1)
    n = len(doc2)
    
    if m == 0 or n == 0:
        return {"similarity": 0, "matches": [], "execution_time": "0.00ms"}
    
    # Initialize DP table
    L = [[0] * (n + 1) for _ in range(m + 1)]
    
    longest = 0
    end_index = 0  # To track the end of the longest common substring in doc1
    
    start_time = time.perf_counter()
    
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if doc1[i - 1] == doc2[j - 1]:
                L[i][j] = L[i - 1][j - 1] + 1
                if L[i][j] > longest:
                    longest = L[i][j]
                    end_index = i
            else:
                L[i][j] = 0
                
    execution_time = (time.perf_counter() - start_time) * 1000 # in ms
    
    # Extract the longest common substring
    match_str = doc1[end_index - longest: end_index] if longest > 0 else ""
    
    # Calculate similarity score based on the longest match relative to the shorter document
    similarity = (longest / min(m, n)) * 100 if min(m, n) > 0 else 0
    
    return {
        "similarity": round(similarity, 2),
        "matches": [match_str] if match_str else [],
        "execution_time": f"{execution_time:.2f}ms"
    }

def compute_lps_array(pattern: str, m: int, lps: list):
    length = 0
    lps[0] = 0
    i = 1
    while i < m:
        if pattern[i] == pattern[length]:
            length += 1
            lps[i] = length
            i += 1
        else:
            if length != 0:
                length = lps[length - 1]
            else:
                lps[i] = 0
                i += 1

def kmp_search(text: str, pattern: str):
    """
    String Matching: Knuth-Morris-Pratt (KMP)
    Searches for occurrences of n-gram chunks from the "pattern" within the "text" to allow partial matching.
    """
    # For plagiarism detection between two arbitrary texts, we treat the shorter one as pattern.
    if len(pattern) > len(text):
        text, pattern = pattern, text
        
    n = len(text)
    if len(pattern) == 0 or n == 0:
        return {"similarity": 0, "matches": [], "execution_time": "0.00ms"}

    # Break pattern into 3-word chunks to detect partial plagiarism
    ngrams = get_word_ngrams(pattern, n=3)
    if not ngrams:
        return {"similarity": 0, "matches": [], "execution_time": "0.00ms"}

    matches = []
    matched_count = 0
    
    start_time = time.perf_counter()
    
    for gram in ngrams:
        m = len(gram)
        if m == 0 or m > n: continue
            
        lps = [0] * m
        compute_lps_array(gram, m, lps)
        
        i = 0  # index for text
        j = 0  # index for gram
        found = False
        while (n - i) >= (m - j):
            if gram[j] == text[i]:
                j += 1
                i += 1
                
            if j == m:
                # Found a match for this chunk
                matches.append(gram)
                found = True
                break # Only need to find it once
            elif i < n and gram[j] != text[i]:
                if j != 0:
                    j = lps[j - 1]
                else:
                    i += 1
        if found:
            matched_count += 1
                
    execution_time = (time.perf_counter() - start_time) * 1000 # in ms
    
    # Similarity based on how many chunks were found
    similarity = (matched_count / len(ngrams)) * 100
    # Deduplicate and sort longest-first so frontend highlights longest spans first
    seen = set()
    unique_matches = []
    for m in matches:
        if m not in seen:
            seen.add(m)
            unique_matches.append(m)
    unique_matches.sort(key=len, reverse=True)
    
    return {
        "similarity": round(similarity, 2),
        "matches": unique_matches[:30],
        "execution_time": f"{execution_time:.2f}ms"
    }

def rabin_karp_search(text: str, pattern: str):
    """
    Hashing: Rabin-Karp Algorithm
    Uses "Rolling Hashes" to find n-gram pattern strings in a text to allow partial matching.
    """
    if len(pattern) > len(text):
        text, pattern = pattern, text
        
    n = len(text)
    if len(pattern) == 0 or n == 0:
        return {"similarity": 0, "matches": [], "execution_time": "0.00ms"}
        
    # Break pattern into 3-word chunks to detect partial plagiarism
    ngrams = get_word_ngrams(pattern, n=3)
    if not ngrams:
        return {"similarity": 0, "matches": [], "execution_time": "0.00ms"}

    d = 256 # Number of characters in the input alphabet
    q = 101 # A prime number
    matches = []
    matched_count = 0
    
    start_time = time.perf_counter()
    
    for gram in ngrams:
        m = len(gram)
        if m == 0 or m > n: continue
            
        p = 0 # hash value for pattern chunk
        t = 0 # hash value for text window
        h = 1
        
        # The value of h would be "pow(d, m-1)%q"
        for i in range(m - 1):
            h = (h * d) % q
            
        # Calculate the hash value of pattern and first window of text
        for i in range(m):
            p = (d * p + ord(gram[i])) % q
            t = (d * t + ord(text[i])) % q
            
        found = False
        # Slide the pattern over text one by one
        for i in range(n - m + 1):
            if p == t:
                # Check for characters one by one
                match_found = True
                for j in range(m):
                    if text[i + j] != gram[j]:
                        match_found = False
                        break
                if match_found:
                    matches.append(gram)
                    found = True
                    break
                    
            # Calculate hash value for next window of text
            if i < n - m:
                t = (d * (t - ord(text[i]) * h) + ord(text[i + m])) % q
                if t < 0:
                    t = t + q
                    
        if found:
            matched_count += 1
                
    execution_time = (time.perf_counter() - start_time) * 1000 # in ms
    
    similarity = (matched_count / len(ngrams)) * 100
    # Deduplicate and sort longest-first so frontend highlights longest spans first
    seen = set()
    unique_matches = []
    for m in matches:
        if m not in seen:
            seen.add(m)
            unique_matches.append(m)
    unique_matches.sort(key=len, reverse=True)
    
    return {
        "similarity": round(similarity, 2),
        "matches": unique_matches[:30],
        "execution_time": f"{execution_time:.2f}ms"
    }
