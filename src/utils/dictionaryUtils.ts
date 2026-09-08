let dictionary: ReadonlySet<string> | null = null;
let inFlight: Promise<ReadonlySet<string>> | null = null;

/** Load the existing French lexicon, sharing work and retaining only successful data. */
export function loadDictionary(): Promise<ReadonlySet<string>> {
  if (dictionary) return Promise.resolve(dictionary);
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const response = await fetch('/skrabble/dictionnary/french.txt');
    if (!response.ok) {
      throw new Error(`Failed to load dictionary: ${response.status}`);
    }

    const text = await response.text();
    const words = new Set<string>();
    for (const line of text.split('\n')) {
      const word = line.trim().toUpperCase();
      if (word) words.add(word);
    }
    dictionary = words;
    return dictionary;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
