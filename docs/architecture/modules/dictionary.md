# Dictionary Domain Module

This document describes the Dictionary domain module, which encapsulates all dictionary-related operations in a single, self-contained API.

## Overview

The Dictionary module (`src/domain/dictionary/Dictionary.ts`) provides a clean API for word validation and dictionary loading. It handles the French dictionary file loading and provides both synchronous and asynchronous word validation.

## API

### Loading and Initialization

#### `preload(): Promise<void>`
Preloads the dictionary for better performance. Call this once at application startup.

```typescript
await Dictionary.preload();
// Dictionary is now loaded and ready for sync validation
```

### Word Validation

#### `isValidWord(word: string): Promise<boolean>`
Validates if a word exists in the French dictionary (async).

```typescript
const isValid = await Dictionary.isValidWord("BONJOUR");
// Returns true for valid French words
```

#### `isValidWordSync(word: string): boolean`
Synchronously validates a word if dictionary is already loaded.

```typescript
// After preload() has completed:
const isValid = Dictionary.isValidWordSync("BONJOUR");
// Returns true immediately for valid French words
// Returns false for invalid words or if dictionary not loaded
```

## Invariants

- **Single Loading**: Dictionary is loaded exactly once, even with multiple concurrent calls
- **Case Insensitive**: All validation is case-insensitive (converts to uppercase)
- **Minimum Length**: Words shorter than 2 characters are always invalid
- **Error Handling**: Network failures return empty dictionary (prevents crashes)
- **Thread Safety**: Module-level state is safely managed across async operations

## Implementation Details

### Dictionary Source
The module loads words from `/dictionnary/french.txt`, which contains one word per line. Words are normalized to uppercase and stored in a Set for O(1) lookup performance.

### Loading Strategy
- **Lazy Loading**: Dictionary loads only when first validation is requested
- **Promise Deduplication**: Multiple concurrent preload calls share the same loading promise
- **Caching**: Loaded dictionary is cached in module scope for subsequent calls
- **Error Resilience**: Network failures result in empty dictionary rather than crashes

### Validation Rules
- **Length Check**: Words < 2 characters are invalid
- **Case Normalization**: Input converted to uppercase before validation
- **Dictionary Lookup**: Set membership check for O(1) performance

## Usage Examples

### Application Startup
```typescript
// In GameContext.tsx
import * as Dictionary from "../domain/dictionary/Dictionary";

useEffect(() => {
  Dictionary.preload().then(() => {
    setDictionaryLoaded(true);
  });
}, []);
```

### Word Validation in Selectors
```typescript
// In selectors.ts
import * as Dictionary from "../domain/dictionary/Dictionary";

export function areAllCurrentWordsValidSelector(board, stickers) {
  const currentWords = getCurrentWords(board);
  return currentWords.every(wordInfo =>
    Dictionary.isValidWordSync(wordInfo.word) === true
  );
}
```

### Debug Word Checking
```typescript
// In DebugMenu.tsx
import * as Dictionary from "../domain/dictionary/Dictionary";

const isValid = Dictionary.isValidWordSync(userInputWord);
if (isValid) {
  // Word is valid French
}
```

## Migration Notes

This module replaces the functions that were previously in `src/utils/dictionaryUtils.ts`. The API has been simplified:

| Old Function | New Function | Notes |
|--------------|--------------|-------|
| `preloadDictionary()` | `Dictionary.preload()` | Same behavior |
| `isValidWord(word)` | `Dictionary.isValidWord(word)` | Same async behavior |
| `isValidWordSync(word)` | `Dictionary.isValidWordSync(word)` | Simplified: returns boolean, false if not loaded |

### Breaking Changes
- `isValidWordSync()` now returns `boolean` instead of `boolean | null`
- If dictionary is not loaded, sync validation returns `false` instead of `null`
- This simplifies calling code - no need to check for `null` loading state

## Performance Considerations

### Loading Performance
- **Initial Load**: ~50-100ms for French dictionary (depends on network)
- **Memory Usage**: ~200KB for French word set
- **Subsequent Access**: O(1) lookup performance

### Optimization Strategies
- **Preload Early**: Call `preload()` at app startup for best UX
- **Async Fallback**: Use `isValidWord()` if sync validation might fail
- **Batch Validation**: For multiple words, use sync validation after preload

## Error Handling

The module gracefully handles network failures:
- **404 Errors**: Returns empty dictionary (no valid words)
- **Network Issues**: Returns empty dictionary (no crashes)
- **Parse Errors**: Returns empty dictionary (invalid file format)

This ensures the application continues to function even with dictionary loading failures.
