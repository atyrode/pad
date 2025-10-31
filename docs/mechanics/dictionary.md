# Dictionary Mechanics

This document explains the word validation system using the French dictionary, including loading, validation methods, and performance optimizations.

## Dictionary Overview

The game validates words against a French dictionary to ensure only valid words can be played. The dictionary is loaded asynchronously and cached for performance.

## Dictionary Loading

### Asynchronous Loading

`src/domain/dictionary/Dictionary.ts` manages dictionary lifecycle:

```typescript
let dictionarySet: Set<string> | null = null;
let isLoading = false;
let loadPromise: Promise<Set<string>> | null = null;

/**
 * Loads and parses the French dictionary file
 */
async function loadDictionary(): Promise<Set<string>> {
    if (dictionarySet) {
        return dictionarySet; // Return cached dictionary
    }

    if (isLoading && loadPromise) {
        return loadPromise; // Return existing load promise
    }

    isLoading = true;
    loadPromise = (async () => {
        try {
            const response = await fetch('/dictionnary/french.txt');
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
```

### Loading States

- **Not Loaded**: `dictionarySet === null`
- **Loading**: `isLoading === true`
- **Loaded**: `dictionarySet instanceof Set`
- **Failed**: `dictionarySet` is empty Set

### Preloading

Dictionary is preloaded at app startup:

```typescript
// In GameContext.tsx
useEffect(() => {
    let isMounted = true;
    Dictionary.preload()
        .then(() => {
            if (isMounted) {
                dispatch({ type: "initDictionaryLoaded", payload: { loaded: true } });
            }
        })
        .catch(() => {
            if (isMounted) {
                // Still mark as loaded to avoid blocking UI
                dispatch({ type: "initDictionaryLoaded", payload: { loaded: true } });
            }
        });
    return () => {
        isMounted = false;
    };
}, []);
```

### State Integration

Dictionary loaded state is tracked in global state:

```typescript
interface GameState {
    // ... other state
    isDictionaryLoaded: boolean;
}
```

## Word Validation

### Asynchronous Validation

`Dictionary.isValidWord()` performs async validation:

```typescript
export async function isValidWord(word: string): Promise<boolean> {
    if (!word || word.length < 2) {
        return false;
    }

    const dictionary = await loadDictionary();
    return dictionary.has(word.toUpperCase());
}
```

### Synchronous Validation

`Dictionary.isValidWordSync()` validates if dictionary is already loaded:

```typescript
export function isValidWordSync(word: string): boolean {
    if (!word || word.length < 2) {
        return false;
    }

    if (!dictionarySet) {
        return false; // Dictionary not loaded yet
    }

    return dictionarySet.has(word.toUpperCase());
}
```

### Validation Rules

- **Minimum Length**: Words must be 2+ characters
- **Case Insensitive**: Converted to uppercase for comparison
- **Empty Input**: Invalid (returns false)
- **Non-loaded State**: Returns null (unknown validity)

## Dictionary Usage in Gameplay

### Play Validation

Dictionary validation is required for play:

```typescript
// In selectors.ts
export function canPlaySelector(args: {
    board: BoardState;
    stickers: StickerState;
    isDictionaryLoaded: boolean;
}): boolean {
    if (!args.isDictionaryLoaded) return false; // Can't validate without dictionary

    const words = findAllWords(args.board);
    const currentWords = words.filter(w => !w.isLocked);

    if (currentWords.length === 0) return false;

    // Dictionary validation
    const allWordsValid = currentWords.every(wordInfo =>
        Dictionary.isValidWordSync(wordInfo.word) === true
    );
    if (!allWordsValid) return false;

    // ... other validation
    return true;
}
```

### Real-time Feedback

UI provides validation status:

```typescript
// In components
const canPlay = canPlaySelector({ board, stickers, isDictionaryLoaded });

if (!isDictionaryLoaded) {
    return <div>Loading dictionary...</div>;
}

if (!canPlay) {
    return <button disabled title="Invalid play - check words">Play</button>;
}

return <button onClick={handlePlay}>Play</button>;
```

## Dictionary File Format

### Source File

The dictionary is loaded from `/dictionnary/french.txt`:

```
A
ABANDON
ABANDONNAIENT
ABANDONNAIT
...
```

### Processing

- **Line-based**: One word per line
- **Trimmed**: Whitespace removed
- **Uppercased**: All words converted to uppercase
- **Filtered**: Empty lines removed

### Set Storage

Words stored in `Set<string>` for O(1) lookup performance:

```typescript
dictionarySet = new Set(['A', 'ABANDON', 'ABANDONNAIENT', ...]);
```

## Performance Optimizations

### Caching Strategy

- **Singleton Pattern**: Single dictionary instance
- **Promise Deduplication**: Multiple load calls share same promise
- **Memory Efficiency**: Set provides fast lookups with low memory overhead

### Lookup Performance

- **Time Complexity**: O(1) average case for Set.has()
- **Space Complexity**: O(n) for n words in dictionary
- **Load Time**: One-time cost, then cached forever

### Loading Performance

- **Lazy Loading**: Dictionary loads only when first needed
- **Progress Indication**: UI shows loading state
- **Error Resilience**: Fails gracefully with empty dictionary

## Error Handling

### Loading Failures

```typescript
catch (error) {
    console.error('Error loading dictionary:', error);
    dictionarySet = new Set(); // Empty set prevents crashes
    return dictionarySet;
}
```

### Validation Failures

- **Network Errors**: Fallback to empty dictionary
- **Parse Errors**: Invalid words filtered out
- **Missing File**: Graceful degradation

### State Consistency

- **Loading State**: `isDictionaryLoaded` tracks completion
- **Validation State**: `canPlaySelector` depends on loaded state
- **UI State**: Components adapt to loading/validation states

## Dictionary Maintenance

### Word List Updates

To update the dictionary:

1. **Replace File**: Update `/dictionnary/french.txt`
2. **Clear Cache**: Reset `dictionarySet = null`
3. **Reload**: Call `Dictionary.preload()` again
4. **Test**: Validate with known words

### Dictionary Statistics

Current French dictionary contains approximately:

- **Total Words**: ~330,000+ entries
- **Load Time**: ~500ms on modern connections
- **Memory Usage**: ~5-10MB for Set storage
- **Lookup Time**: Sub-millisecond per word

## Debug Operations

### Dictionary Testing

Debug menu provides dictionary inspection:

```typescript
// Test word validation
const testWords = ['BONJOUR', 'INVALIDWORD', 'CHAT'];
testWords.forEach(word => {
    const isValid = Dictionary.isValidWordSync(word);
    console.log(`${word}: ${isValid}`);
});

// Check loading state
console.log('Dictionary loaded:', dictionarySet !== null);
console.log('Word count:', dictionarySet?.size || 0);
```

### Dictionary Reset

```typescript
// Force reload dictionary
dictionarySet = null;
isLoading = false;
loadPromise = null;
Dictionary.preload();
```

## Alternative Validation

### Offline Fallback

If dictionary fails to load:

```typescript
// Could implement basic validation rules
function basicWordValidation(word: string): boolean {
    // Check minimum length, no special characters, etc.
    return word.length >= 2 && /^[A-Z]+$/.test(word);
}
```

### Custom Dictionaries

System could support multiple dictionaries:

```typescript
const dictionaries = {
    french: loadFrenchDictionary(),
    english: loadEnglishDictionary(),
    custom: loadCustomDictionary(),
};
```

## Refactoring Opportunities

1. **Dictionary Selection**: Support multiple languages
2. **Partial Loading**: Load dictionary in chunks for better UX
3. **Compression**: Compress dictionary for smaller bundle size
4. **Validation Caching**: Cache validation results
5. **Stemming**: Support root word validation
6. **Suggestions**: Provide word suggestions for invalid plays

The dictionary system provides reliable word validation with good performance and error resilience, ensuring fair gameplay through accurate French word checking.
