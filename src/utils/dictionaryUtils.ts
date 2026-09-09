import { initializeEngine, Lexicon } from '../game/runtime';

let dictionary: Lexicon | null = null;
let inFlight: Promise<Lexicon> | null = null;

/** Load the existing French lexicon, sharing work and retaining only successful data. */
export function loadDictionary(): Promise<Lexicon> {
  if (dictionary) return Promise.resolve(dictionary);
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const [response] = await Promise.all([fetch('/interstice/dictionnary/french.txt'), initializeEngine()]);
    if (!response.ok) {
      throw new Error(`Failed to load dictionary: ${response.status}`);
    }

    const text = await response.text();
    dictionary = Lexicon.fromText(text);
    return dictionary;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
