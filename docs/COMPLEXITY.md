# Algorithm Complexity Summary

## Dynamic Programming (Longest Common Substring)
- Time complexity: O(m · n)
- Space complexity: O(m · n)
- This algorithm builds a 2D table comparing every character in both documents.
- Use when you want the single longest exact copied span.

## Knuth–Morris–Pratt (KMP)
- Time complexity: O(n + m) for each n-gram search on average
- Space complexity: O(m) for the pattern's prefix table
- The implementation uses 3-word chunks and searches each chunk in the other document.
- Effective for partial plagiarism detection because it detects repeated phrase overlap.

## Rabin-Karp (Rolling Hash)
- Time complexity: O(n + m) for each n-gram search on average; worst-case can degrade because of hash collisions
- Space complexity: O(1) besides the text and chunk storage
- Uses rolling hash values to compare n-gram segments.
- Useful for fast approximate matching of repeated word sequences.

## Notes for report
- Compare the runtime and match semantics: DP uses exact substring length, while KMP/Rabin-Karp use chunk overlap percentages.
- The assignment expected students to discuss best/average/worst case behavior for each algorithm.
