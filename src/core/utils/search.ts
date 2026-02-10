
/**
 * Calculates the Levenshtein distance between two strings.
 * This is used for fuzzy matching to account for typos in search.
 * @param a - The first string.
 * @param b - The second string.
 * @returns The number of edits required to change string 'a' to string 'b'.
 */
export const levenshteinDistance = (a: string, b: string): number => {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i += 1) {
        matrix[0][i] = i;
    }

    for (let j = 0; j <= b.length; j += 1) {
        matrix[j][0] = j;
    }

    for (let j = 1; j <= b.length; j += 1) {
        for (let i = 1; i <= a.length; i += 1) {
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,        // deletion
                matrix[j - 1][i] + 1,        // insertion
                matrix[j - 1][i - 1] + indicator, // substitution
            );
        }
    }

    return matrix[b.length][a.length];
};

/**
 * Filters items based on a query using exact and fuzzy matching.
 * @param query The search query.
 * @param texts Array of strings to match against (e.g., title, description).
 * @returns True if a match is found.
 */
export const filterItem = (query: string, ...texts: (string | undefined)[]) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    
    // Check for exact substring match first (fastest)
    if (texts.some(t => t?.toLowerCase().includes(q))) return true;

    // Fuzzy match for longer queries
    if (q.length > 2) {
        const threshold = q.length > 5 ? 2 : 1;
        return texts.some(t => {
            if (!t) return false;
            const words = t.toLowerCase().split(/\s+/);
            return words.some(word => levenshteinDistance(q, word) <= threshold);
        });
    }
    
    return false;
};
