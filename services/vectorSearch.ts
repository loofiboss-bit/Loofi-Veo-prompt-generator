
import { pipeline, env } from '@xenova/transformers';
import { get, set, createStore } from 'idb-keyval';

// Configure transformers.js to download models from CDN and cache them
env.allowLocalModels = false;
env.useBrowserCache = true;

// Custom store for embeddings to keep them separate from app state
const embeddingStore = createStore('veo-vectors', 'embeddings');

// Singleton instance of the feature extraction pipeline
let extractor: any = null;
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

// Memory cache for fast cosine similarity comparison during a session
const memoryCache: Record<string, number[]> = {};

/**
 * Initializes the ML pipeline.
 */
const init = async () => {
    if (!extractor) {
        console.log("Loading Semantic Search Model...");
        extractor = await pipeline('feature-extraction', MODEL_NAME);
    }
    return extractor;
};

/**
 * Computes the cosine similarity between two vectors.
 * Assumes vectors are normalized (which MiniLM usually provides or we handle).
 */
const cosineSimilarity = (a: number[], b: number[]) => {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
};

/**
 * Indexes a batch of items. Checks IDB first, generates embedding if missing.
 */
export const indexItems = async (items: { id: string; text: string }[]) => {
    const pipe = await init();
    
    // 1. Load existing from IDB into memory cache
    for (const item of items) {
        if (memoryCache[item.id]) continue; // Already in memory

        const cached = await get(item.id, embeddingStore);
        if (cached) {
            memoryCache[item.id] = cached;
        } else {
            // 2. Generate new embedding
            // pooling: 'mean' aggregates token embeddings into a single sentence vector
            // normalize: true ensures we can use dot product/cosine sim easily
            const output = await pipe(item.text, { pooling: 'mean', normalize: true });
            const embedding = Array.from(output.data) as number[];
            
            // 3. Save
            await set(item.id, embedding, embeddingStore);
            memoryCache[item.id] = embedding;
        }
    }
};

/**
 * Performs a semantic search against the indexed items.
 * @param query The search string.
 * @param threshold Minimum similarity score (0 to 1).
 * @returns Array of { id, score } sorted by score descending.
 */
export const search = async (query: string, threshold = 0.25): Promise<{ id: string; score: number }[]> => {
    const pipe = await init();
    
    // Embed the query
    const output = await pipe(query, { pooling: 'mean', normalize: true });
    const queryVector = Array.from(output.data) as number[];
    
    // Compare against all in-memory embeddings
    const results = Object.entries(memoryCache).map(([id, vec]) => {
        return {
            id,
            score: cosineSimilarity(queryVector, vec)
        };
    });

    // Filter and Sort
    return results
        .filter(r => r.score > threshold)
        .sort((a, b) => b.score - a.score);
};
