import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeComfyUiEndpoint,
  checkComfyUiHealth,
  buildComfyUiWorkflow,
  queueComfyUiPrompt,
  fetchComfyUiHistory,
  extractOutputMediaUrls,
  pollComfyUiExecution,
  DEFAULT_COMFYUI_ENDPOINT,
} from './comfyUiService';
import type { ComfyUiSystemStats, ComfyUiHistoryItem } from '@core/types/comfyUi';

describe('comfyUiService', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('normalizeComfyUiEndpoint', () => {
    it('returns default endpoint when input is empty or undefined', () => {
      expect(normalizeComfyUiEndpoint()).toBe(DEFAULT_COMFYUI_ENDPOINT);
      expect(normalizeComfyUiEndpoint('')).toBe(DEFAULT_COMFYUI_ENDPOINT);
      expect(normalizeComfyUiEndpoint('   ')).toBe(DEFAULT_COMFYUI_ENDPOINT);
    });

    it('strips trailing slashes from custom endpoint', () => {
      expect(normalizeComfyUiEndpoint('http://localhost:8188/')).toBe('http://localhost:8188');
      expect(normalizeComfyUiEndpoint('http://192.168.1.50:8188///')).toBe(
        'http://192.168.1.50:8188',
      );
    });
  });

  describe('checkComfyUiHealth', () => {
    it('returns online: true and system stats when endpoint is responsive', async () => {
      const mockStats: ComfyUiSystemStats = {
        system: { os: 'linux', python_version: '3.11.2', embedded_python: false },
        devices: [
          {
            name: 'NVIDIA GeForce RTX 4090',
            type: 'cuda',
            vram_total: 24576,
            vram_free: 20100,
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockStats,
      });

      const result = await checkComfyUiHealth('http://127.0.0.1:8188');
      expect(result.online).toBe(true);
      expect(result.systemStats?.devices[0].name).toBe('NVIDIA GeForce RTX 4090');
      expect(result.systemStats?.devices[0].vram_free).toBe(20100);
    });

    it('returns online: false when server responds with HTTP error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      });

      const result = await checkComfyUiHealth();
      expect(result.online).toBe(false);
      expect(result.error).toContain('HTTP 503');
    });

    it('handles connection failure / network error gracefully', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await checkComfyUiHealth();
      expect(result.online).toBe(false);
      expect(result.error).toBe('ECONNREFUSED');
    });
  });

  describe('buildComfyUiWorkflow', () => {
    it('generates a standard SVD video workflow graph with correct node links', () => {
      const graph = buildComfyUiWorkflow({
        positivePrompt: 'A majestic eagle flying through misty mountain peaks',
        negativePrompt: 'blurry, shaky',
        frames: 30,
        fps: 24,
        preset: 'stable-video-diffusion',
      });

      expect(graph['1'].class_type).toBe('CheckpointLoaderSimple');
      expect(graph['1'].inputs.ckpt_name).toBe('svd_xt.safetensors');

      expect(graph['2'].class_type).toBe('CLIPTextEncode');
      expect(graph['2'].inputs.text).toBe('A majestic eagle flying through misty mountain peaks');

      expect(graph['3'].class_type).toBe('CLIPTextEncode');
      expect(graph['3'].inputs.text).toBe('blurry, shaky');

      expect(graph['4'].class_type).toBe('EmptyLatentImage');
      expect(graph['4'].inputs.batch_size).toBe(30);

      expect(graph['5'].class_type).toBe('KSampler');
      expect(graph['7'].class_type).toBe('SaveAnimatedWEBP');
      expect(graph['7'].inputs.fps).toBe(24);
    });

    it('adapts model checkpoint for HunyuanVideo and CogVideoX presets', () => {
      const hunyuan = buildComfyUiWorkflow({
        positivePrompt: 'A cinematic street scene',
        preset: 'hunyuan-video',
      });
      expect(hunyuan['1'].inputs.ckpt_name).toBe('hunyuan_video_720p.safetensors');

      const cog = buildComfyUiWorkflow({
        positivePrompt: 'A cinematic street scene',
        preset: 'cogvideox',
      });
      expect(cog['1'].inputs.ckpt_name).toBe('cogvideox_5b.safetensors');
    });
  });

  describe('queueComfyUiPrompt', () => {
    it('posts workflow prompt graph to /prompt endpoint and returns prompt_id', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ prompt_id: 'test-prompt-uuid-1234', number: 1 }),
      });

      const graph = buildComfyUiWorkflow({ positivePrompt: 'Test scene' });
      const response = await queueComfyUiPrompt(graph, 'http://127.0.0.1:8188');

      expect(response.prompt_id).toBe('test-prompt-uuid-1234');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://127.0.0.1:8188/prompt',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('throws error if queue response is not ok', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Invalid node link in graph',
      });

      const graph = buildComfyUiWorkflow({ positivePrompt: 'Test' });
      await expect(queueComfyUiPrompt(graph)).rejects.toThrow(/ComfyUI queue failed \(HTTP 400\)/);
    });
  });

  describe('fetchComfyUiHistory and extractOutputMediaUrls', () => {
    it('fetches history item and formats media view URLs', async () => {
      const mockHistoryItem: ComfyUiHistoryItem = {
        prompt: [1, 'test-prompt-id', {}, {}, []],
        outputs: {
          '7': {
            videos: [{ filename: 'output_001.mp4', subfolder: 'renders', type: 'output' }],
          },
        },
        status: { status_str: 'success', completed: true, messages: [] },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 'test-prompt-id': mockHistoryItem }),
      });

      const history = await fetchComfyUiHistory('test-prompt-id', 'http://127.0.0.1:8188');
      expect(history).toBeDefined();

      const urls = extractOutputMediaUrls(history!, 'http://127.0.0.1:8188');
      expect(urls).toHaveLength(1);
      expect(urls[0].url).toBe(
        'http://127.0.0.1:8188/view?filename=output_001.mp4&subfolder=renders&type=output',
      );
    });
  });

  describe('pollComfyUiExecution', () => {
    it('polls until completion and returns output URLs', async () => {
      const mockHistoryItem: ComfyUiHistoryItem = {
        prompt: [1, 'prompt-uuid', {}, {}, []],
        outputs: {
          '7': {
            gifs: [{ filename: 'anim_001.webp', subfolder: '', type: 'output' }],
          },
        },
        status: { status_str: 'success', completed: true, messages: [] },
      };

      let calls = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        calls += 1;
        if (calls === 1) {
          return { ok: true, json: async () => ({}) };
        }
        return { ok: true, json: async () => ({ 'prompt-uuid': mockHistoryItem }) };
      });

      const outputs = await pollComfyUiExecution('prompt-uuid', {
        endpoint: 'http://127.0.0.1:8188',
        intervalMs: 10,
        maxAttempts: 5,
      });

      expect(outputs).toHaveLength(1);
      expect(outputs[0].filename).toBe('anim_001.webp');
    });

    it('throws when execution fails in status_str', async () => {
      const mockFailedItem: ComfyUiHistoryItem = {
        prompt: [1, 'prompt-uuid', {}, {}, []],
        outputs: {},
        status: { status_str: 'error', completed: false, messages: ['Out of Memory'] },
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 'prompt-uuid': mockFailedItem }),
      });

      await expect(
        pollComfyUiExecution('prompt-uuid', { intervalMs: 10, maxAttempts: 2 }),
      ).rejects.toThrow(/ComfyUI execution failed in prompt graph/);
    });
  });
});
