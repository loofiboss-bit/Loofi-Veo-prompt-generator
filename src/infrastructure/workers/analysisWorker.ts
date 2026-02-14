/**
 * Project Analysis Worker
 * v1.8.0 — Project Intelligence Layer
 *
 * Offloads heavy analysis computation to a background thread.
 * Receives AnalysisRequest, returns AnalysisResult.
 *
 * @module analysisWorker
 */

import type {
  AnalysisRequest,
  AnalysisResult,
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
import type { Shot, TimelineClip } from '@core/types';

// ─── Helpers (self-contained for worker isolation) ───────────────────────

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

// Inline prompt quality scorer (avoids import issues in worker)
function scorePromptBasic(promptState: AnalysisRequest['promptState']): number {
  let score = 0;
  if (promptState.idea && promptState.idea.length > 10) score += 15;
  if (promptState.idea && promptState.idea.length > 50) score += 15;
  if (promptState.artStyle && promptState.artStyle !== 'Cinematic') score += 10;
  if (promptState.visualEffect && promptState.visualEffect !== 'None') score += 5;
  if (promptState.colorPalette && promptState.colorPalette !== 'Vibrant and saturated') score += 5;
  if (promptState.cameraMovement && promptState.cameraMovement !== 'Static shot') score += 5;
  if (promptState.cameraDistance && promptState.cameraDistance !== 'Medium shot') score += 5;
  if (promptState.lensType && promptState.lensType !== 'Standard prime lens') score += 5;
  if (promptState.environment && promptState.environment.length > 5) score += 5;
  if (promptState.timeOfDay && promptState.timeOfDay !== 'Any') score += 5;
  if (promptState.lightingStyle && promptState.lightingStyle !== 'Any') score += 5;
  if (promptState.characterActions && promptState.characterActions.length > 5) score += 5;
  if (promptState.negativePrompt && promptState.negativePrompt.length > 3) score += 5;
  return Math.min(score, 100);
}

// ─── Analysis Functions ──────────────────────────────────────────────────

function computeProjectHealth(req: AnalysisRequest): {
  health: ProjectHealthScore;
  issues: DiagnosticIssue[];
} {
  const issues: DiagnosticIssue[] = [];
  const dimensions: HealthDimension[] = [];

  // Content Completeness (25)
  let contentScore = 0;
  const shotCount = req.shots.length;
  const shotsWithAction = req.shots.filter((s: Shot) => s.action?.trim().length > 0).length;
  if (shotCount > 0) contentScore += 5;
  if (shotCount >= 3) contentScore += 5;
  if (shotsWithAction === shotCount && shotCount > 0) contentScore += 10;
  else if (shotsWithAction > 0) contentScore += 5;
  if (req.shots.some((s: Shot) => s.characterId)) contentScore += 5;
  dimensions.push({
    name: 'Content Completeness',
    score: contentScore,
    maxScore: 25,
    description: 'Shot definition completeness',
  });

  // Prompt Quality (25)
  const pq = scorePromptBasic(req.promptState);
  const promptScore = Math.round(pq * 0.25);
  dimensions.push({
    name: 'Prompt Quality',
    score: promptScore,
    maxScore: 25,
    description: 'Prompt parameter quality',
  });

  // Timeline Completeness (25)
  let timelineScore = 0;
  if (req.clips.length > 0) timelineScore += 5;
  const videoClips = req.clips.filter((c: TimelineClip) => c.type === 'video').length;
  if (videoClips >= shotCount && shotCount > 0) timelineScore += 10;
  else if (videoClips > 0) timelineScore += 5;
  if (req.clips.filter((c: TimelineClip) => c.type === 'audio').length > 0) timelineScore += 5;
  if (req.tracks.length >= 3) timelineScore += 5;
  dimensions.push({
    name: 'Timeline Completeness',
    score: timelineScore,
    maxScore: 25,
    description: 'Timeline build status',
  });

  // Organization (25)
  let orgScore = 0;
  if (req.characters.length > 0) orgScore += 8;
  if (req.locations.length > 0) orgScore += 7;
  if (req.globalContext.style.trim().length > 0) orgScore += 5;
  if (req.globalContext.character.trim().length > 0) orgScore += 3;
  if (req.globalContext.setting.trim().length > 0) orgScore += 2;
  dimensions.push({
    name: 'Project Organization',
    score: orgScore,
    maxScore: 25,
    description: 'Character, location, context usage',
  });

  const overall = dimensions.reduce((s, d) => s + d.score, 0);
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

  return { health: { overall, tier, color, dimensions, computedAt: Date.now() }, issues };
}

function validateSceneConsistency(req: AnalysisRequest): SceneConsistencyResult {
  const issues: DiagnosticIssue[] = [];
  const shotResults: ShotConsistencyDetail[] = [];
  const charIds = new Set(req.characters.map((c) => c.id));
  const locIds = new Set(req.locations.map((l) => l.id));

  for (const shot of req.shots) {
    if (shot.characterId && !charIds.has(shot.characterId)) {
      issues.push(
        createIssue(
          'scene-consistency',
          'error',
          `Shot ${shot.id} references unknown character`,
          undefined,
          { type: 'shot', entityId: shot.id },
        ),
      );
    }
    if (shot.locationId && !locIds.has(shot.locationId)) {
      issues.push(
        createIssue(
          'scene-consistency',
          'error',
          `Shot ${shot.id} references unknown location`,
          undefined,
          { type: 'shot', entityId: shot.id },
        ),
      );
    }
    if (shot.duration <= 0) {
      issues.push(
        createIssue(
          'scene-consistency',
          'error',
          `Shot ${shot.id} has zero/negative duration`,
          undefined,
          { type: 'shot', entityId: shot.id },
        ),
      );
    }
    shotResults.push({
      shotId: shot.id,
      hasCharacter: !!shot.characterId && charIds.has(shot.characterId),
      hasLocation: !!shot.locationId && locIds.has(shot.locationId),
      transitionValid: shot.duration > 0,
      styleDrift: !shot.action ? 1.0 : shot.action.trim().length < 10 ? 0.5 : 0.0,
    });
  }

  return {
    isConsistent: issues.filter((i) => i.severity === 'error').length === 0,
    shotResults,
    issues,
  };
}

function checkTimelineIntegrity(req: AnalysisRequest): TimelineIntegrityResult {
  const issues: DiagnosticIssue[] = [];
  const gaps: TimelineGap[] = [];
  const overlaps: TimelineOverlap[] = [];
  const orphanClips: string[] = [];
  const unlinkedShots: number[] = [];
  const shotIds = new Set(req.shots.map((s: Shot) => s.id));
  const clipsWithRef = new Set<number>();

  for (const clip of req.clips) {
    if (typeof clip.resourceId === 'number') {
      if (shotIds.has(clip.resourceId)) clipsWithRef.add(clip.resourceId);
      else orphanClips.push(clip.id);
    }
  }

  for (const shot of req.shots) {
    if (shot.action?.trim().length > 0 && !clipsWithRef.has(shot.id)) {
      unlinkedShots.push(shot.id);
    }
  }

  const trackIds = [...new Set(req.clips.map((c: TimelineClip) => c.trackId))];
  for (const trackId of trackIds) {
    const tc = req.clips
      .filter((c: TimelineClip) => c.trackId === trackId)
      .sort((a: TimelineClip, b: TimelineClip) => a.startTime - b.startTime);
    for (let i = 0; i < tc.length - 1; i++) {
      const end = tc[i].startTime + tc[i].duration;
      if (end < tc[i + 1].startTime - 0.1) {
        gaps.push({
          trackId,
          startTime: end,
          endTime: tc[i + 1].startTime,
          duration: tc[i + 1].startTime - end,
        });
      } else if (end > tc[i + 1].startTime) {
        overlaps.push({
          trackId,
          clipAId: tc[i].id,
          clipBId: tc[i + 1].id,
          overlapStart: tc[i + 1].startTime,
          overlapEnd: Math.min(end, tc[i + 1].startTime + tc[i + 1].duration),
        });
      }
    }
  }

  return {
    isValid: issues.filter((i) => i.severity === 'error').length === 0 && overlaps.length === 0,
    gaps,
    overlaps,
    orphanClips,
    unlinkedShots,
    issues,
  };
}

function buildDependencyMap(req: AnalysisRequest): DependencyMap {
  const nodes: DependencyNode[] = [];
  const edges: DependencyEdge[] = [];
  const weights = new Map<string, number>();
  const addNode = (id: string, type: DependencyNode['type'], label: string) => {
    if (!weights.has(id)) {
      weights.set(id, 0);
      nodes.push({ id, type, label, weight: 0 });
    }
  };
  const addEdge = (from: string, to: string, rel: DependencyEdge['relationship']) => {
    edges.push({ from, to, relationship: rel });
    weights.set(from, (weights.get(from) || 0) + 1);
    weights.set(to, (weights.get(to) || 0) + 1);
  };

  const pid = `project_${req.projectId}`;
  addNode(pid, 'project', 'Project');
  req.characters.forEach((c) => {
    addNode(`char_${c.id}`, 'character', c.name);
    addEdge(pid, `char_${c.id}`, 'contains');
  });
  req.locations.forEach((l) => {
    addNode(`loc_${l.id}`, 'location', l.name);
    addEdge(pid, `loc_${l.id}`, 'contains');
  });
  req.shots.forEach((s: Shot) => {
    addNode(`shot_${s.id}`, 'shot', `Shot ${s.id}`);
    addEdge(pid, `shot_${s.id}`, 'contains');
    if (s.characterId) addEdge(`shot_${s.id}`, `char_${s.characterId}`, 'references');
    if (s.locationId) addEdge(`shot_${s.id}`, `loc_${s.locationId}`, 'references');
  });
  req.clips.forEach((c: TimelineClip) => {
    addNode(`clip_${c.id}`, 'clip', c.label);
    if (typeof c.resourceId === 'number')
      addEdge(`clip_${c.id}`, `shot_${c.resourceId}`, 'depends-on');
  });

  nodes.forEach((n) => {
    n.weight = weights.get(n.id) || 0;
  });
  const connected = new Set<string>();
  edges.forEach((e) => {
    connected.add(e.from);
    connected.add(e.to);
  });
  return {
    nodes,
    edges,
    isolatedNodes: nodes.filter((n) => !connected.has(n.id)).map((n) => n.id),
  };
}

// ─── Worker Message Handler ──────────────────────────────────────────────

self.onmessage = (event: MessageEvent<AnalysisRequest>) => {
  try {
    issueCounter = 0;
    const req = event.data;
    const start = performance.now();

    const { health, issues: healthIssues } = computeProjectHealth(req);
    const sceneConsistency = validateSceneConsistency(req);
    const timelineIntegrity = checkTimelineIntegrity(req);
    const dependencyMap = buildDependencyMap(req);

    const allIssues = [...healthIssues, ...sceneConsistency.issues, ...timelineIntegrity.issues];
    const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2, hint: 3 };
    allIssues.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));

    const result: AnalysisResult = {
      projectId: req.projectId,
      health,
      sceneConsistency,
      timelineIntegrity,
      dependencyMap,
      allIssues,
      analysisTimeMs: performance.now() - start,
      lastAnalyzedAt: Date.now(),
    };

    self.postMessage({ type: 'analysis-result', result });
  } catch (err) {
    self.postMessage({ type: 'analysis-error', error: String(err) });
  }
};
