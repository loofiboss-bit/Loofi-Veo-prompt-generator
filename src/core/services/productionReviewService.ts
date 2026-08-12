import { analyzeVideo } from '@core/services/gemini/geminiVisionService';
import { logger } from '@core/services/loggerService';
import type {
  ProductionReviewDimension,
  ProductionReviewFinding,
  ProductionContinuityReview,
  ProductionShot,
  ProductionTake,
  ShotReviewResult,
} from '@core/types';

interface ReviewTakeInput {
  shot: ProductionShot;
  take: ProductionTake;
  video?: { data: string; mimeType: string };
  referenceImages?: Array<{ data: string; mimeType: string }>;
  useGemini?: boolean;
}

interface GeminiReviewPayload {
  dimensions?: Array<{ id?: string; score?: number; summary?: string }>;
  findings?: Array<{
    severity?: string;
    category?: string;
    message?: string;
    timestampSeconds?: number;
  }>;
  continuity?: Partial<ProductionContinuityReview>;
  proposedRevisionPrompt?: string;
}

const DIMENSION_IDS: ProductionReviewDimension['id'][] = [
  'prompt-adherence',
  'subject-continuity',
  'composition',
  'motion',
  'audio',
];

const clampScore = (score: number): number => Math.max(0, Math.min(100, Math.round(score)));

class ProductionReviewService {
  private static instance: ProductionReviewService;

  static getInstance(): ProductionReviewService {
    if (!ProductionReviewService.instance) {
      ProductionReviewService.instance = new ProductionReviewService();
    }
    return ProductionReviewService.instance;
  }

  async reviewTake(input: ReviewTakeInput): Promise<ShotReviewResult> {
    const localDimensions = this.buildLocalDimensions(input.shot, input.take);
    let dimensions = localDimensions;
    let findings: ProductionReviewFinding[] = [];
    let continuity = this.buildContinuityReview(input.shot, input.take);
    let proposedRevisionPrompt: string | undefined;
    let source: ShotReviewResult['source'] = 'local';

    if (input.useGemini && input.video) {
      try {
        const semantic = await this.getGeminiReview(input);
        dimensions = this.mergeDimensions(localDimensions, semantic.dimensions ?? []);
        findings = this.normalizeFindings(semantic.findings ?? []);
        continuity = this.mergeContinuity(continuity, semantic.continuity);
        proposedRevisionPrompt = semantic.proposedRevisionPrompt;
        source = 'mixed';
      } catch (error) {
        logger.warn(
          'ProductionReviewService',
          'Gemini review unavailable; using local review',
          error,
        );
        findings.push({
          id: crypto.randomUUID(),
          severity: 'warning',
          category: 'prompt-adherence',
          message: 'Semantic review was unavailable. Review this take manually before acceptance.',
        });
      }
    }

    const overallScore = clampScore(
      dimensions.reduce((sum, dimension) => sum + dimension.score, 0) / dimensions.length,
    );
    if (overallScore < 75 && !proposedRevisionPrompt) {
      proposedRevisionPrompt = this.buildRevisionPrompt(input.shot, findings);
    }

    return {
      id: crypto.randomUUID(),
      shotId: input.shot.id,
      takeId: input.take.id,
      overallScore,
      dimensions,
      findings,
      continuity,
      continuitySnapshotHash:
        input.take.continuitySnapshot?.snapshotHash ?? input.shot.continuitySnapshot?.snapshotHash,
      proposedRevisionPrompt,
      source,
      createdAt: Date.now(),
    };
  }

  private buildContinuityReview(
    shot: ProductionShot,
    take: ProductionTake,
  ): ProductionContinuityReview {
    const snapshot = take.continuitySnapshot ?? shot.continuitySnapshot;
    const hasIdentityReference = Boolean(
      snapshot?.referenceAssetIds.length || snapshot?.profileIds.length,
    );
    const hasTransitionInputs = Boolean(
      take.request.extensionSourceTakeId ||
      take.request.firstFrameAssetId ||
      take.request.lastFrameAssetId,
    );
    const hasProfileVersions = Boolean(
      snapshot &&
      snapshot.profileIds.length > 0 &&
      snapshot.profileIds.every((profileId) => snapshot.profileVersions[profileId] !== undefined),
    );
    const hasReferenceProvenance = Boolean(
      snapshot &&
      snapshot.referenceAssetIds.length > 0 &&
      snapshot.referenceAssetIds.every((assetId) =>
        Boolean(snapshot.referenceAssetHashes[assetId]),
      ),
    );
    const snapshotMatchesReport = Boolean(
      snapshot &&
      shot.continuityReport &&
      shot.continuityReport.snapshotHash === snapshot.snapshotHash,
    );
    const review = {
      subjectIdentity:
        hasIdentityReference && hasReferenceProvenance ? 90 : hasIdentityReference ? 82 : 65,
      wardrobeProps:
        snapshot?.profileIds.length && hasProfileVersions
          ? 88
          : snapshot?.profileIds.length
            ? 78
            : 65,
      locationLook:
        snapshot?.profileIds.length && snapshotMatchesReport
          ? 86
          : snapshot?.profileIds.length
            ? 76
            : 65,
      shotTransition:
        hasTransitionInputs && snapshotMatchesReport ? 86 : hasTransitionInputs ? 78 : 70,
    };
    return {
      ...review,
      summary: `Local continuity check: ${hasIdentityReference ? 'identity references present' : 'no identity reference'}, ${hasReferenceProvenance ? 'reference hashes verified' : 'reference provenance incomplete'}, ${hasProfileVersions ? 'profile versions pinned' : 'profile versions incomplete'}, ${hasTransitionInputs ? 'shot-chain inputs present' : 'no shot-chain input'}${snapshotMatchesReport ? ', snapshot/report match' : ', snapshot/report mismatch'}.`,
    };
  }

  private mergeContinuity(
    local: ProductionContinuityReview,
    semantic?: Partial<ProductionContinuityReview>,
  ): ProductionContinuityReview {
    if (!semantic) return local;
    const score = (value: number | undefined, fallback: number): number =>
      typeof value === 'number' && Number.isFinite(value)
        ? clampScore((fallback + value) / 2)
        : fallback;
    return {
      subjectIdentity: score(semantic.subjectIdentity, local.subjectIdentity),
      wardrobeProps: score(semantic.wardrobeProps, local.wardrobeProps),
      locationLook: score(semantic.locationLook, local.locationLook),
      shotTransition: score(semantic.shotTransition, local.shotTransition),
      summary: semantic.summary?.trim() || local.summary,
    };
  }

  private buildLocalDimensions(
    shot: ProductionShot,
    take: ProductionTake,
  ): ProductionReviewDimension[] {
    const hasMedia = Boolean(take.localMediaKey || take.providerMediaUri);
    const hasContinuityInputs =
      take.request.referenceAssetIds.length > 0 || Boolean(take.request.firstFrameAssetId);
    return [
      {
        id: 'prompt-adherence',
        score: hasMedia && shot.prompt.trim().length > 20 ? 80 : 60,
        summary: hasMedia
          ? 'Media is available for prompt review.'
          : 'Generated media is unavailable.',
      },
      {
        id: 'subject-continuity',
        score: hasContinuityInputs ? 85 : 70,
        summary: hasContinuityInputs
          ? 'Continuity references were supplied.'
          : 'No explicit continuity reference was supplied.',
      },
      {
        id: 'composition',
        score: shot.camera.trim() ? 80 : 65,
        summary: shot.camera.trim()
          ? 'Camera direction is explicit.'
          : 'Camera direction is broad.',
      },
      {
        id: 'motion',
        score: shot.durationSeconds <= 8 ? 80 : 60,
        summary: 'Duration and generation segment constraints were checked locally.',
      },
      {
        id: 'audio',
        score: /audio|dialogue|sound|music|voice/i.test(shot.prompt) ? 80 : 70,
        summary: 'Audio intent is inferred from the approved prompt.',
      },
    ];
  }

  private async getGeminiReview(input: ReviewTakeInput): Promise<GeminiReviewPayload> {
    const response = await analyzeVideo(
      input.video!.data,
      input.video!.mimeType,
      `Compare this generated clip to the approved production shot. Return JSON only with
dimensions [{id, score, summary}] for prompt-adherence, subject-continuity, composition, motion,
and audio; continuity {subjectIdentity, wardrobeProps, locationLook, shotTransition, summary}; findings [{severity, category, message, timestampSeconds}]; and
proposedRevisionPrompt. Compare the clip against every supplied continuity reference image for
subject identity, wardrobe/props, location/look, and shot-to-shot transition. Approved prompt:
${input.shot.prompt}`,
      input.referenceImages ?? [],
    );
    const json = response.match(/\{[\s\S]*\}/)?.[0] ?? response;
    return JSON.parse(json) as GeminiReviewPayload;
  }

  private mergeDimensions(
    local: ProductionReviewDimension[],
    semantic: GeminiReviewPayload['dimensions'],
  ): ProductionReviewDimension[] {
    return local.map((dimension) => {
      const candidate = semantic?.find((item) => item.id === dimension.id);
      if (!candidate || typeof candidate.score !== 'number') {
        return dimension;
      }
      return {
        ...dimension,
        score: clampScore((dimension.score + candidate.score) / 2),
        summary: candidate.summary?.trim() || dimension.summary,
      };
    });
  }

  private normalizeFindings(
    findings: NonNullable<GeminiReviewPayload['findings']>,
  ): ProductionReviewFinding[] {
    return findings
      .filter((finding) => finding.message?.trim())
      .map((finding) => ({
        id: crypto.randomUUID(),
        severity: ['info', 'warning', 'critical'].includes(finding.severity ?? '')
          ? (finding.severity as ProductionReviewFinding['severity'])
          : 'warning',
        category: DIMENSION_IDS.includes(finding.category as ProductionReviewDimension['id'])
          ? (finding.category as ProductionReviewDimension['id'])
          : 'prompt-adherence',
        message: finding.message!.trim(),
        timestampSeconds: finding.timestampSeconds,
      }));
  }

  private buildRevisionPrompt(shot: ProductionShot, findings: ProductionReviewFinding[]): string {
    const guidance = findings.length
      ? findings.map((finding) => finding.message).join(' ')
      : 'Increase prompt adherence, continuity, composition clarity, motion quality, and audio intent.';
    return `${shot.prompt}\nRevision requirements: ${guidance}`;
  }
}

export const productionReviewService = ProductionReviewService.getInstance();
