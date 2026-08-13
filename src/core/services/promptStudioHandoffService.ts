import { get, keys, set } from 'idb-keyval';
import type {
  MusicPromptArtifactInput,
  PromptArtifactV1,
  PromptStudioHandoff,
  SunoPack,
} from '@core/types';
import { logger } from './loggerService';
import {
  adaptSunoPackToMusicInput,
  compileMusicPromptArtifact,
  compileVideoHistoryArtifact,
} from './promptStudioService';

const HANDOFF_PREFIX = 'prompt-studio-handoff:';
const ARTIFACT_PREFIX = `${HANDOFF_PREFIX}artifact:`;

class PromptStudioHandoffService {
  private static instance: PromptStudioHandoffService;

  static getInstance(): PromptStudioHandoffService {
    if (!PromptStudioHandoffService.instance) {
      PromptStudioHandoffService.instance = new PromptStudioHandoffService();
    }
    return PromptStudioHandoffService.instance;
  }

  async createDraft(
    artifact: PromptArtifactV1,
    destination: PromptStudioHandoff['destination'],
  ): Promise<PromptStudioHandoff> {
    const handoff: PromptStudioHandoff = {
      id: `${artifact.id}-${destination}`,
      artifactId: artifact.id,
      destination,
      createdAt: new Date().toISOString(),
      status: 'draft',
    };

    try {
      await this.saveArtifact(artifact);
      await set(`${HANDOFF_PREFIX}${handoff.id}`, { handoff, artifact });
      return handoff;
    } catch (error) {
      logger.error('Failed to store Prompt Studio handoff', 'PromptStudioHandoffService', error);
      throw error;
    }
  }

  async saveArtifact(artifact: PromptArtifactV1): Promise<void> {
    await set(`${ARTIFACT_PREFIX}${artifact.id}`, artifact);
  }

  async saveArtifacts(artifacts: PromptArtifactV1[]): Promise<void> {
    await Promise.all(artifacts.map((artifact) => this.saveArtifact(artifact)));
  }

  /** Import legacy video history into the shared artifact store idempotently. */
  async migrateLegacyHistory(): Promise<PromptArtifactV1[]> {
    try {
      const { historyService } = await import('./historyService');
      const entries = await historyService.getEntries();
      const artifacts = entries.map((entry) => compileVideoHistoryArtifact(entry));
      await this.saveArtifacts(artifacts);
      return artifacts;
    } catch (error) {
      logger.error(
        'Failed to migrate legacy Prompt Studio history',
        'PromptStudioHandoffService',
        error,
      );
      return [];
    }
  }

  /** Adapt an in-memory legacy SunoPack before storing a new common artifact. */
  async importLegacySunoPack(
    pack: SunoPack,
    overrides: Partial<MusicPromptArtifactInput> = {},
  ): Promise<PromptArtifactV1> {
    const artifact = compileMusicPromptArtifact(adaptSunoPackToMusicInput(pack, overrides));
    await this.saveArtifact(artifact);
    return artifact;
  }

  async listArtifacts(): Promise<PromptArtifactV1[]> {
    try {
      const artifactKeys = (await keys()).filter(
        (key): key is string => typeof key === 'string' && key.startsWith(ARTIFACT_PREFIX),
      );
      const artifacts = await Promise.all(artifactKeys.map((key) => get<PromptArtifactV1>(key)));
      return artifacts.filter((artifact): artifact is PromptArtifactV1 => Boolean(artifact));
    } catch (error) {
      logger.error('Failed to list Prompt Studio artifacts', 'PromptStudioHandoffService', error);
      return [];
    }
  }

  async getDraft(
    id: string,
  ): Promise<{ handoff: PromptStudioHandoff; artifact: PromptArtifactV1 } | null> {
    try {
      return (
        (await get<{ handoff: PromptStudioHandoff; artifact: PromptArtifactV1 }>(
          `${HANDOFF_PREFIX}${id}`,
        )) ?? null
      );
    } catch (error) {
      logger.error('Failed to read Prompt Studio handoff', 'PromptStudioHandoffService', error);
      return null;
    }
  }
}

export const promptStudioHandoffService = PromptStudioHandoffService.getInstance();
