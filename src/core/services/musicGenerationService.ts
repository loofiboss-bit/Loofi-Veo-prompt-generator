import { estimateMaximumModelCost, requireUsableCostEstimate } from '@core/models/cost';
import { getModel } from '@core/models/catalog';
import type {
  LyriaModelId,
  MusicGenerationRequest,
  MusicGenerationTask,
  MusicImageInput,
} from '@core/types';

export interface CreateMusicRequestInput {
  modelId: LyriaModelId;
  prompt: string;
  lyrics?: string;
  structure?: string;
  responseFormat: 'mp3' | 'wav';
  images?: MusicImageInput[];
}

class MusicGenerationService {
  private static instance: MusicGenerationService;

  static getInstance(): MusicGenerationService {
    if (!MusicGenerationService.instance) {
      MusicGenerationService.instance = new MusicGenerationService();
    }
    return MusicGenerationService.instance;
  }

  estimateMaximumCharge(modelId: LyriaModelId): number {
    const model = getModel(modelId);
    if (!model || !model.capabilities.operations.includes('music')) {
      throw new Error('The selected Lyria model is not in the executable catalog.');
    }
    return requireUsableCostEstimate(estimateMaximumModelCost(model, { requestCount: 1 }));
  }

  createTask(input: CreateMusicRequestInput): MusicGenerationTask {
    const model = getModel(input.modelId);
    if (!model || !model.capabilities.operations.includes('music')) {
      throw new Error('The selected Lyria model is not executable.');
    }
    const prompt = input.prompt.trim();
    if (!prompt) throw new Error('A music prompt is required.');
    const images = input.images ?? [];
    if (images.length > (model.capabilities.maximumInputImages ?? 0)) {
      throw new Error('Lyria accepts at most ten image inputs.');
    }
    if (!model.capabilities.supportedAudioFormats?.includes(input.responseFormat)) {
      throw new Error(
        `${model.displayName} does not support ${input.responseFormat.toUpperCase()}.`,
      );
    }
    const maximumChargeUsd = this.estimateMaximumCharge(input.modelId);
    const request: MusicGenerationRequest = {
      modelId: input.modelId,
      prompt,
      lyrics: input.lyrics?.trim() || undefined,
      structure: input.structure?.trim() || undefined,
      responseFormat: input.responseFormat,
      images,
    };
    const now = Date.now();
    return {
      id: `music-${crypto.randomUUID()}`,
      jobKind: 'music',
      status: 'Queued',
      prompt,
      request,
      costApproval: {
        approvalId: crypto.randomUUID(),
        modelId: input.modelId,
        maximumChargeUsd,
        currency: 'USD',
        confidence: 'exact',
        sourceUrl: model.pricing.source.sourceUrl,
        verifiedDate: model.pricing.source.verifiedDate,
        approvedAt: now,
      },
      timestamp: now,
    };
  }

  async submit(input: CreateMusicRequestInput): Promise<MusicGenerationTask> {
    const bridge = window.electron;
    if (!bridge?.submitPaidJob) {
      throw new Error('Official Lyria generation requires the desktop paid-job bridge.');
    }
    return (await bridge.submitPaidJob(this.createTask(input))) as MusicGenerationTask;
  }

  async list(): Promise<MusicGenerationTask[]> {
    const jobs = (await window.electron?.listPaidJobs?.()) ?? [];
    return jobs.filter(
      (job): job is MusicGenerationTask => 'jobKind' in job && job.jobKind === 'music',
    );
  }

  subscribe(callback: (task: MusicGenerationTask) => void): () => void {
    return (
      window.electron?.onPaidJobUpdate?.((job) => {
        if ('jobKind' in job && job.jobKind === 'music') callback(job);
      }) ?? (() => {})
    );
  }
}

export const musicGenerationService = MusicGenerationService.getInstance();
