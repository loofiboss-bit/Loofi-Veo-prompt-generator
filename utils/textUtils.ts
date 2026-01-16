
/**
 * Estimates the number of syllables in a word using a regex heuristic.
 * Handles common English patterns like silent 'e', diphthongs, etc.
 */
function countSyllablesInWord(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;

    // Remove common silent suffixes
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    // Handle 'y' at start
    word = word.replace(/^y/, '');
    
    // Count vowel groups
    const vowels = word.match(/[aeiouy]{1,2}/g);
    return vowels ? vowels.length : 1;
}

/**
 * Counts total syllables in a line of text, ignoring meta-tags in brackets/parentheses.
 */
export const countSyllables = (text: string): number => {
    if (!text.trim()) return 0;

    // Remove meta tags like [Chorus], (Ad-lib)
    const cleanText = text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '');
    
    // Split into words
    const words = cleanText.trim().split(/\s+/);
    
    return words.reduce((sum, word) => {
        if (!word) return sum;
        return sum + countSyllablesInWord(word);
    }, 0);
};
