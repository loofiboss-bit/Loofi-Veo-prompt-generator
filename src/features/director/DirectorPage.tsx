import type { ProductionStepId } from '@features/production/hooks/useProductionWorkflow';
import { CreateWorkflow } from '@features/create/CreateWorkflow';

/**
 * Compatibility surface for tests and legacy internal imports.
 * The canonical creator workflow is owned by `features/create` in v9.
 */
export function DirectorPage({ activeStep = 'generate' }: { activeStep?: ProductionStepId }) {
  return <CreateWorkflow activeStep={activeStep} />;
}
