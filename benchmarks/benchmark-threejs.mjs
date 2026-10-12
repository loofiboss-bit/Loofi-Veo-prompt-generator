import * as THREE from 'three';

export async function runThreeJsBenchmark() {
  const frames = 100;

  // Nuvarande mönster: Skapar nya geometrier och material vid varje frame / progress-ändring
  let currentPatternAllocations = {
    geometries: 0,
    materials: 0,
    meshes: 0,
  };

  const currentStart = performance.now();
  for (let f = 0; f < frames; f++) {
    // 5 scene subjects
    for (let s = 0; s < 5; s++) {
      const geom = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshStandardMaterial({ color: 0xa855f7 });
      const mesh = new THREE.Mesh(geom, mat);
      currentPatternAllocations.geometries++;
      currentPatternAllocations.materials++;
      currentPatternAllocations.meshes++;
      // I nuvarande kod görs bara renderer.dispose() utan geom.dispose() / mat.dispose()
    }
  }
  const currentDurationMs = performance.now() - currentStart;

  // Optimerat mönster: Återanvänder instansierade geometrier och material, uppdaterar endast transforms
  let optimizedPatternAllocations = {
    geometries: 0,
    materials: 0,
    meshes: 0,
  };

  const optimizedStart = performance.now();
  // Engångs-initiering:
  const sharedGeom = new THREE.BoxGeometry(1, 1, 1);
  const sharedMat = new THREE.MeshStandardMaterial({ color: 0xa855f7 });
  optimizedPatternAllocations.geometries++;
  optimizedPatternAllocations.materials++;

  const meshes = [];
  for (let s = 0; s < 5; s++) {
    const mesh = new THREE.Mesh(sharedGeom, sharedMat);
    optimizedPatternAllocations.meshes++;
    meshes.push(mesh);
  }

  // 100 frames uppdatering (endast matrix/position mutation):
  for (let f = 0; f < frames; f++) {
    const progress = f / frames;
    for (let s = 0; s < 5; s++) {
      meshes[s].position.set(progress * s, 0, 0);
      meshes[s].updateMatrix();
    }
  }
  const optimizedDurationMs = performance.now() - optimizedStart;

  // Rensa upp delade resurser korrekt
  sharedGeom.dispose();
  sharedMat.dispose();

  return {
    frames,
    currentPattern: {
      totalGeometriesCreated: currentPatternAllocations.geometries,
      totalMaterialsCreated: currentPatternAllocations.materials,
      durationMs: Number(currentDurationMs.toFixed(2)),
    },
    optimizedPattern: {
      totalGeometriesCreated: optimizedPatternAllocations.geometries,
      totalMaterialsCreated: optimizedPatternAllocations.materials,
      durationMs: Number(optimizedDurationMs.toFixed(2)),
    },
    allocationReductionPct: Number(
      (
        ((currentPatternAllocations.geometries - optimizedPatternAllocations.geometries) /
          currentPatternAllocations.geometries) *
        100
      ).toFixed(1),
    ),
    durationReductionPct: Number(
      (((currentDurationMs - optimizedDurationMs) / currentDurationMs) * 100).toFixed(1),
    ),
  };
}

if (process.argv[1]?.endsWith('benchmark-threejs.mjs')) {
  const results = await runThreeJsBenchmark();
  console.log(JSON.stringify(results, null, 2));
}
