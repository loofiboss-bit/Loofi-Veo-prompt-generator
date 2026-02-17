/**
 * Streaming response utilities for Gemini API text generation.
 * Wraps `generateContentStream()` from @google/genai with abort support,
 * chunk callbacks, and accumulated text collection.
 *
 * @module core/utils/streaming
 */
import type { GenerateContentResponse, GenerateContentParameters } from '@google/genai';
import type { GoogleGenAI } from '@google/genai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Callback invoked for each streamed text chunk */
export type StreamChunkCallback = (chunk: string, accumulated: string) => void;

/** Options for a streaming generation call */
export interface StreamOptions {
  /** Called for every text chunk received */
  onChunk: StreamChunkCallback;
  /** AbortSignal to cancel the stream early */
  signal?: AbortSignal;
  /** Called once when the stream completes (with full text) */
  onComplete?: (fullText: string) => void;
  /** Called if the stream errors */
  onError?: (error: unknown) => void;
}

/** Result returned after a streaming call completes */
export interface StreamResult {
  /** The fully accumulated text */
  text: string;
  /** Whether the stream was aborted before completion */
  aborted: boolean;
  /** Total number of chunks received */
  chunkCount: number;
}

// ---------------------------------------------------------------------------
// Core streaming helper
// ---------------------------------------------------------------------------

/**
 * Stream text content from a Gemini model, invoking `onChunk` for each piece.
 *
 * @example
 * ```ts
 * const result = await streamGenerateContent(ai, params, {
 *   onChunk: (chunk, acc) => setPartialText(acc),
 *   signal: abortController.signal,
 * });
 * console.log(result.text); // full response
 * ```
 */
export async function streamGenerateContent(
  ai: GoogleGenAI,
  params: GenerateContentParameters,
  options: StreamOptions,
): Promise<StreamResult> {
  const { onChunk, signal, onComplete, onError } = options;

  let accumulated = '';
  let chunkCount = 0;
  let aborted = false;

  try {
    // Check if already aborted before starting
    if (signal?.aborted) {
      aborted = true;
      return { text: '', aborted, chunkCount: 0 };
    }

    const stream: AsyncGenerator<GenerateContentResponse> =
      await ai.models.generateContentStream(params);

    for await (const chunk of stream) {
      // Check abort between chunks
      if (signal?.aborted) {
        aborted = true;
        break;
      }

      const text = chunk.text ?? '';
      if (text) {
        accumulated += text;
        chunkCount++;
        onChunk(text, accumulated);
      }
    }

    if (!aborted) {
      onComplete?.(accumulated);
    }

    return { text: accumulated, aborted, chunkCount };
  } catch (error: unknown) {
    // Abort errors are expected — not real failures
    if (error instanceof DOMException && error.name === 'AbortError') {
      aborted = true;
      return { text: accumulated, aborted, chunkCount };
    }

    onError?.(error);
    throw error;
  }
}
