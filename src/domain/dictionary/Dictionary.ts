/**
 * Dictionary domain module - Word validation and loading
 *
 * This module provides all dictionary-related functionality in a centralized,
 * self-contained way. It handles loading the French dictionary and validating words.
 */

let dictionarySet: Set<string> | null = null;
let isLoading = false;
let loadPromise: Promise<Set<string>> | null = null;

/**
 * Fetches and parses the French dictionary file
 * @returns Promise<Set<string>> - Set of uppercase French words
 */
async function loadDictionary(): Promise<Set<string>> {
  if (dictionarySet) {
    return dictionarySet;
  }

  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      const response = await fetch('/dictionary/french.txt');
      if (!response.ok) {
        throw new Error(`Failed to load dictionary: ${response.status}`);
      }

      const text = await response.text();
      const words = text
        .split('\n')
        .map(word => word.trim().toUpperCase())
        .filter(word => word.length > 0);

      dictionarySet = new Set(words);
      return dictionarySet;
    } catch (error) {
      console.error('Error loading dictionary:', error);
      // Return empty set on error to prevent crashes
      dictionarySet = new Set();
      return dictionarySet;
    } finally {
      isLoading = false;
    }
  })();

  return loadPromise;
}

/**
 * Preloads the dictionary for better performance
 * @returns Promise<void>
 */
export async function preload(): Promise<void> {
  await loadDictionary();
}

/**
 * Validates if a word exists in the French dictionary
 * @param word - The word to validate (case insensitive)
 * @returns Promise<boolean> - True if word is valid, false otherwise
 */
export async function isValidWord(word: string): Promise<boolean> {
  if (!word || word.length < 2) {
    return false;
  }

  const dictionary = await loadDictionary();
  return dictionary.has(word.toUpperCase());
}

/**
 * Synchronously validates a word if dictionary is already loaded
 * @param word - The word to validate (case insensitive)
 * @returns boolean - True if valid, false if invalid or dictionary not loaded
 */
export function isValidWordSync(word: string): boolean {
  if (!word || word.length < 2) {
    return false;
  }

  if (!dictionarySet) {
    // Dictionary not loaded yet, consider invalid for sync calls
    return false;
  }

  return dictionarySet.has(word.toUpperCase());
}
