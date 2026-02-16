/**
 * Project Analysis Service
 * v1.8.0 — Project Intelligence Layer
 *
 * Orchestrates project health scoring, scene consistency validation,
 * timeline integrity checking, and dependency mapping.
 *
 * @module projectAnalysisService
 */

import { logger } from './loggerService';

import type {
  AnalysisResult,
  AnalysisRequest,
  ProjectHealthScore,
  HealthDimension,
  HealthTier,
  SceneConsistencyResult,
  ShotConsistencyDetail,
  TimelineIntegrityResult,
  TimelineGap,
  TimelineOverlap,
  DependencyMap,
  DependencyNode,
  DependencyEdge,
  DiagnosticIssue,
  DiagnosticSeverity,
} from '@core/types/diagnostics';
import { calculatePromptQuality } from '@core/utils/promptScoring';

// ─── Helpers ─────────────────────────────────────────────────────────────

let issueCounter = 0;

function createIssue(
  category: DiagnosticIssue['category'],
  severity: DiagnosticSeverity,
  message: string,
  detail?: string,
  location?: DiagnosticIssue['location'],
  fixAction?: string,
): DiagnosticIssue {
  return {
    id: `diag_${++issueCounter}_${Date.now()}`,
    message,
    detail,
    severity,
    category,
    location,
    fixAction,
    detectedAt: Date.now(),
  };
}

// ─── Project Health Scoring ──────────────────────────────────────────────

function computeProjectHealth(request: AnalysisRequest): {
  health: ProjectHealthScore;
  issues: DiagnosticIssue[];
} {
  const issues: DiagnosticIssue[] = [];
  const dimensions: HealthDimension[] = [];

  // 1. Content Completeness (25 pts)
  let contentScore = 0;
  const shotCount = request.shots.length;
  const shotsWithAction = request.shots.filter(
    (s) => s.action && s.action.trim().length > 0,
  ).length;
  const shotsWithCharacter = request.shots.filter((s) => s.characterId).length;

  if (shotCount > 0) contentScore += 5;
  if (shotCount >= 3) contentScore += 5;
  if (shotsWithAction === shotCount && shotCount > 0) {
    contentScore += 10;
  } else if (shotsWithAction > 0) {
    contentScore += 5;
    issues.push(
      createIssue(
        'project-health',
        'warning',
        `${shotCount - shotsWithAction} shot(s) have no action description`,
        'Add action descriptors to all shots for a complete project',
      ),
    );
  }
  if (shotsWithCharacter > 0) contentScore += 5;
  else {
    issues.push(
      createIssue(
        'project-health',
        'info',
        'No shots have character assignments',
        'Assign characters to shots for better consistency tracking',
      ),
    );
  }
  dimensions.push({
    name: 'Content Completeness',
    score: contentScore,
    maxScore: 25,
    description: 'How complete the shot definitions are',
  });

  // 2. Prompt Quality (25 pts)
  const promptQuality = calculatePromptQuality(request.promptState);
  const promptScore = Math.round(promptQuality.score * 0.25);
  dimensions.push({
    name: 'Prompt Quality',
    score: promptScore,
    maxScore: 25,
    description: 'Quality of the prompt parameters',
  });

  if (promptQuality.score < 40) {
    issues.push(
      createIssue(
        'project-health',
        'warning',
        `Prompt quality is ${promptQuality.tier} (${promptQuality.score}/100)`,
        promptQuality.suggestions.join('; '),
      ),
    );
  }

  // 3. Timeline Completeness (25 pts)
  let timelineScore = 0;
  const clipCount = request.clips.length;
  const videoClips = request.clips.filter((c) => c.type === 'video').length;
  const audioClips = request.clips.filter((c) => c.type === 'audio').length;

  if (clipCount > 0) timelineScore += 5;
  if (videoClips >= shotCount && shotCount > 0) timelineScore += 10;
  else if (videoClips > 0) {
    timelineScore += 5;
    issues.push(
      createIssue(
        'project-health',
        'info',
        'Not all shots have corresponding video clips',
        'Sync timeline from shots to generate clips',
      ),
    );
  }
  if (audioClips > 0) timelineScore += 5;
  if (request.tracks.length >= 3) timelineScore += 5;
  dimensions.push({
    name: 'Timeline Completeness',
    score: timelineScore,
    maxScore: 25,
    description: 'Whether timeline is fully built',
  });

  // 4. Project Organization (25 pts)
  let orgScore = 0;
  if (request.characters.length > 0) orgScore += 8;
  if (request.locations.length > 0) orgScore += 7;
  if (request.globalContext.style.trim().length > 0) orgScore += 5;
  if (request.globalContext.character.trim().length > 0) orgScore += 3;
  if (request.globalContext.setting.trim().length > 0) orgScore += 2;

  if (orgScore < 10) {
    issues.push(
      createIssue(
        'project-health',
        'info',
        'Project organization could be improved',
        'Add characters, locations, and global style context',
      ),
    );
  }
  dimensions.push({
    name: 'Project Organization',
    score: orgScore,
    maxScore: 25,
    description: 'Character bank, location bank, and global context usage',
  });

  const overall = dimensions.reduce((sum, d) => sum + d.score, 0);

  let tier: HealthTier = 'Critical';
  let color: ProjectHealthScore['color'] = 'red';
  if (overall >= 80) {
    tier = 'Excellent';
    color = 'green';
  } else if (overall >= 55) {
    tier = 'Good';
    color = 'yellow';
  } else if (overall >= 30) {
    tier = 'Needs Work';
    color = 'orange';
  }

  return {
    health: { overall, tier, color, dimensions, computedAt: Date.now() },
    issues,
  };
}

// ─── Scene Consistency Validator ─────────────────────────────────────────

function validateSceneConsistency(request: AnalysisRequest): SceneConsistencyResult {
  const issues: DiagnosticIssue[] = [];
  const shotResults: ShotConsistencyDetail[] = [];
  const characterIds = new Set(request.characters.map((c) => c.id));
  const locationIds = new Set(request.locations.map((l) => l.id));

  for (const shot of request.shots) {
    const hasCharacter = !!shot.characterId && characterIds.has(shot.characterId);
    const hasLocation = !!shot.locationId && locationIds.has(shot.locationId);

    // Validate character reference
    if (shot.characterId && !characterIds.has(shot.characterId)) {
      issues.push(
        createIssue(
          'scene-consistency',
          'error',
          `Shot ${shot.id} references unknown character "${shot.characterId}"`,
          'This character ID does not exist in the character bank',
          { type: 'shot', entityId: shot.id, label: `Shot ${shot.id}` },
          'remove-invalid-character',
        ),
      );
    }

    // Validate location reference
    if (shot.locationId && !locationIds.has(shot.locationId)) {
      issues.push(
        createIssue(
          'scene-consistency',
          'error',
          `Shot ${shot.id} references unknown location "${shot.locationId}"`,
          'This location ID does not exist in the location bank',
          { type: 'shot', entityId: shot.id, label: `Shot ${shot.id}` },
          'remove-invalid-location',
        ),
      );
    }

    // Transition validation against neighbors
    const shotIndex = request.shots.indexOf(shot);
    let transitionValid = true;
    if (shotIndex === 0 && shot.transition.type !== 'cut') {
      // First shot shouldn't typically have a transition (but it's a hint, not an error)
      issues.push(
        createIssue(
          'scene-consistency',
          'hint',
          `First shot uses "${shot.transition.type}" transition instead of "cut"`,
          'The first shot typically starts with a hard cut',
          { type: 'shot', entityId: shot.id, label: `Shot ${shot.id}` },
        ),
      );
    }

    // Duration warnings
    if (shot.duration <= 0) {
      transitionValid = false;
      issues.push(
        createIssue(
          'scene-consistency',
          'error',
          `Shot ${shot.id} has zero or negative duration`,
          'All shots must have a positive duration',
          { type: 'shot', entityId: shot.id, label: `Shot ${shot.id}` },
        ),
      );
    }

    if (shot.duration > 60) {
      issues.push(
        createIssue(
          'scene-consistency',
          'warning',
          `Shot ${shot.id} has an unusually long duration (${shot.duration}s)`,
          'Most AI video generators work best with clips under 30 seconds',
          { type: 'shot', entityId: shot.id, label: `Shot ${shot.id}` },
        ),
      );
    }

    // Style drift — simple heuristic: shots without action are drifting
    const styleDrift = !shot.action ? 1.0 : shot.action.trim().length < 10 ? 0.5 : 0.0;

    shotResults.push({
      shotId: shot.id,
      hasCharacter,
      hasLocation,
      transitionValid,
      styleDrift,
    });
  }

  // Cross-scene: check for character continuity gaps
  const usedCharacterIds = [
    ...new Set(request.shots.filter((s) => s.characterId).map((s) => s.characterId)),
  ];
  if (usedCharacterIds.length > 1) {
    // Check if characters alternate without scene breaks
    let lastCharacterId = '';
    let switches = 0;
    for (const shot of request.shots) {
      if (shot.characterId && shot.characterId !== lastCharacterId) {
        switches++;
        lastCharacterId = shot.characterId;
      }
    }
    if (switches > request.shots.length * 0.6) {
      issues.push(
        createIssue(
          'scene-consistency',
          'warning',
          'Frequent character switches detected',
          'Consider grouping shots by character for better scene coherence',
        ),
      );
    }
  }

  return {
    isConsistent: issues.filter((i) => i.severity === 'error').length === 0,
    shotResults,
    issues,
  };
}

// ─── Timeline Integrity Checker ──────────────────────────────────────────

function checkTimelineIntegrity(request: AnalysisRequest): TimelineIntegrityResult {
  const issues: DiagnosticIssue[] = [];
  const gaps: TimelineGap[] = [];
  const overlaps: TimelineOverlap[] = [];
  const orphanClips: string[] = [];
  const unlinkedShots: number[] = [];

  const shotIds = new Set(request.shots.map((s) => s.id));
  const clipsWithShotRef = new Set<number>();

  // Check each clip
  for (const clip of request.clips) {
    // Duration validation
    if (clip.duration <= 0) {
      issues.push(
        createIssue(
          'timeline-integrity',
          'error',
          `Clip "${clip.label}" has zero or negative duration`,
          undefined,
          { type: 'clip', entityId: clip.id, label: clip.label },
        ),
      );
    }

    // Negative start time
    if (clip.startTime < 0) {
      issues.push(
        createIssue(
          'timeline-integrity',
          'error',
          `Clip "${clip.label}" has negative start time`,
          undefined,
          { type: 'clip', entityId: clip.id, label: clip.label },
        ),
      );
    }

    // Track orphan detection
    if (typeof clip.resourceId === 'number') {
      if (shotIds.has(clip.resourceId)) {
        clipsWithShotRef.add(clip.resourceId);
      } else {
        orphanClips.push(clip.id);
        issues.push(
          createIssue(
            'timeline-integrity',
            'warning',
            `Clip "${clip.label}" references deleted shot ${clip.resourceId}`,
            'This clip references a shot that no longer exists',
            { type: 'clip', entityId: clip.id, label: clip.label },
            'remove-orphan-clip',
          ),
        );
      }
    }
  }

  // Check for unlinked shots (shots with action but no clip)
  for (const shot of request.shots) {
    if (shot.action && shot.action.trim().length > 0 && !clipsWithShotRef.has(shot.id)) {
      unlinkedShots.push(shot.id);
      issues.push(
        createIssue(
          'timeline-integrity',
          'info',
          `Shot ${shot.id} has no corresponding timeline clip`,
          'Sync timeline from shots to generate clips',
          { type: 'shot', entityId: shot.id, label: `Shot ${shot.id}` },
          'sync-timeline',
        ),
      );
    }
  }

  // Per-track gap and overlap detection
  const trackIds = [...new Set(request.clips.map((c) => c.trackId))];
  for (const trackId of trackIds) {
    const trackClips = request.clips
      .filter((c) => c.trackId === trackId)
      .sort((a, b) => a.startTime - b.startTime);

    for (let i = 0; i < trackClips.length - 1; i++) {
      const current = trackClips[i];
      const next = trackClips[i + 1];
      const currentEnd = current.startTime + current.duration;

      if (currentEnd < next.startTime) {
        // Gap detected
        const gapDuration = next.startTime - currentEnd;
        if (gapDuration > 0.1) {
          // Ignore sub-frame gaps
          gaps.push({
            trackId,
            startTime: currentEnd,
            endTime: next.startTime,
            duration: gapDuration,
          });
          issues.push(
            createIssue(
              'timeline-integrity',
              'warning',
              `${gapDuration.toFixed(1)}s gap on track "${trackId}" between "${current.label}" and "${next.label}"`,
              'There is dead space in the timeline that may cause visual issues',
              { type: 'track', entityId: trackId, label: trackId },
            ),
          );
        }
      } else if (currentEnd > next.startTime) {
        // Overlap detected
        overlaps.push({
          trackId,
          clipAId: current.id,
          clipBId: next.id,
          overlapStart: next.startTime,
          overlapEnd: Math.min(currentEnd, next.startTime + next.duration),
        });
        issues.push(
          createIssue(
            'timeline-integrity',
            'error',
            `Clips "${current.label}" and "${next.label}" overlap on track "${trackId}"`,
            `Overlap of ${(currentEnd - next.startTime).toFixed(1)}s`,
            { type: 'track', entityId: trackId, label: trackId },
            'resolve-overlap',
          ),
        );
      }
    }
  }

  return {
    isValid: issues.filter((i) => i.severity === 'error').length === 0,
    gaps,
    overlaps,
    orphanClips,
    unlinkedShots,
    issues,
  };
}

// ─── Dependency Map Builder ──────────────────────────────────────────────

function buildDependencyMap(request: AnalysisRequest): DependencyMap {
  const nodes: DependencyNode[] = [];
  const edges: DependencyEdge[] = [];
  const nodeWeights = new Map<string, number>();

  const addNode = (id: string, type: DependencyNode['type'], label: string) => {
    if (!nodeWeights.has(id)) {
      nodeWeights.set(id, 0);
      nodes.push({ id, type, label, weight: 0 });
    }
  };

  const addEdge = (from: string, to: string, relationship: DependencyEdge['relationship']) => {
    edges.push({ from, to, relationship });
    nodeWeights.set(from, (nodeWeights.get(from) || 0) + 1);
    nodeWeights.set(to, (nodeWeights.get(to) || 0) + 1);
  };

  // Project node
  const projectId = `project_${request.projectId}`;
  addNode(projectId, 'project', 'Project');

  // Character nodes
  for (const char of request.characters) {
    const nodeId = `char_${char.id}`;
    addNode(nodeId, 'character', char.name);
    addEdge(projectId, nodeId, 'contains');
  }

  // Location nodes
  for (const loc of request.locations) {
    const nodeId = `loc_${loc.id}`;
    addNode(nodeId, 'location', loc.name);
    addEdge(projectId, nodeId, 'contains');
  }

  // Shot nodes + edges
  for (const shot of request.shots) {
    const shotNodeId = `shot_${shot.id}`;
    addNode(shotNodeId, 'shot', `Shot ${shot.id}`);
    addEdge(projectId, shotNodeId, 'contains');

    if (shot.characterId) {
      addEdge(shotNodeId, `char_${shot.characterId}`, 'references');
    }
    if (shot.locationId) {
      addEdge(shotNodeId, `loc_${shot.locationId}`, 'references');
    }
  }

  // Clip nodes + edges
  for (const clip of request.clips) {
    const clipNodeId = `clip_${clip.id}`;
    addNode(clipNodeId, 'clip', clip.label);

    if (typeof clip.resourceId === 'number') {
      addEdge(clipNodeId, `shot_${clip.resourceId}`, 'depends-on');
    }
  }

  // Update weights
  for (const node of nodes) {
    node.weight = nodeWeights.get(node.id) || 0;
  }

  // Identify isolated nodes (no edges connecting them)
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.from);
    connectedIds.add(edge.to);
  }
  const isolatedNodes = nodes.filter((n) => !connectedIds.has(n.id)).map((n) => n.id);

  return { nodes, edges, isolatedNodes };
}

// ─── Service Class ───────────────────────────────────────────────────────

class ProjectAnalysisService {
  private static instance: ProjectAnalysisService;

  static getInstance(): ProjectAnalysisService {
    if (!ProjectAnalysisService.instance) {
      ProjectAnalysisService.instance = new ProjectAnalysisService();
    }
    return ProjectAnalysisService.instance;
  }

  /**
   * Run a full analysis on the given project data snapshot.
   */
  analyze(request: AnalysisRequest): AnalysisResult {
    const start = performance.now();
    issueCounter = 0;

    logger.info('Starting project analysis', undefined, {
      projectId: request.projectId,
      type: request.type,
    });

    const { health, issues: healthIssues } = computeProjectHealth(request);
    const sceneConsistency = validateSceneConsistency(request);
    const timelineIntegrity = checkTimelineIntegrity(request);
    const dependencyMap = buildDependencyMap(request);

    const allIssues = [...healthIssues, ...sceneConsistency.issues, ...timelineIntegrity.issues];

    // Sort: errors first, then warnings, then info, then hints
    const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2, hint: 3 };
    allIssues.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));

    const analysisTimeMs = performance.now() - start;

    logger.info('Project analysis complete', undefined, {
      projectId: request.projectId,
      healthScore: health.overall,
      issueCount: allIssues.length,
      analysisTimeMs: Math.round(analysisTimeMs),
    });

    return {
      projectId: request.projectId,
      health,
      sceneConsistency,
      timelineIntegrity,
      dependencyMap,
      allIssues,
      analysisTimeMs,
      lastAnalyzedAt: Date.now(),
    };
  }

  /**
   * Quick health check without full analysis.
   */
  quickHealthCheck(request: AnalysisRequest): ProjectHealthScore {
    const { health } = computeProjectHealth(request);
    return health;
  }
}

export const projectAnalysisService = ProjectAnalysisService.getInstance();
