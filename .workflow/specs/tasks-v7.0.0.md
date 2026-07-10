# Tasks — v7.0.0 "Director Mode"

**Date**: 2026-07-10
**Status**: Complete
**Arch Spec**: `arch-v7.0.0.md`

## Task List

| ID      | Status   | Task                                                | Agent                        | Layer          | Size | Depends                   |
| ------- | -------- | --------------------------------------------------- | ---------------------------- | -------------- | ---- | ------------------------- |
| TASK001 | Complete | Reconcile v6 status and activate v7 authority docs  | project-coordinator          | shared         | S    | —                         |
| TASK002 | Complete | Define production-run types and state transitions   | architecture-advisor         | types          | M    | TASK001                   |
| TASK003 | Complete | Implement run persistence, hydration, and migration | backend-builder              | services       | L    | TASK002                   |
| TASK004 | Complete | Add durable Blob media storage and cleanup          | backend-builder              | infrastructure | L    | TASK002                   |
| TASK005 | Complete | Implement Veo capability validation and pricing     | backend-builder              | services       | L    | TASK002                   |
| TASK006 | Complete | Upgrade worker protocol for operation-safe recovery | code-implementer             | infrastructure | L    | TASK003, TASK005          |
| TASK007 | Complete | Build local-first Director planning orchestration   | backend-builder              | services       | L    | TASK003, TASK005          |
| TASK008 | Complete | Add structured video review and revision proposals  | backend-builder              | services       | L    | TASK004, TASK007          |
| TASK009 | Complete | Wire production store and mediator events           | frontend-integration-builder | store          | M    | TASK003, TASK007, TASK008 |
| TASK010 | Complete | Build lazy-loaded `/director` stepper workspace     | frontend-integration-builder | features       | L    | TASK009                   |
| TASK011 | Complete | Integrate approvals, timeline commits, and exports  | code-implementer             | features       | L    | TASK006, TASK008, TASK010 |
| TASK012 | Complete | Add service, migration, pricing, and recovery tests | test-writer                  | services       | L    | TASK003–TASK008           |
| TASK013 | Complete | Add route, accessibility, reload, and E2E tests     | test-writer                  | features       | L    | TASK010, TASK011          |
| TASK014 | Complete | Update README, changelog, screenshots, and ADRs     | release-planner              | shared         | M    | TASK012, TASK013          |
| TASK015 | Complete | Run release validation, packaging, and smoke gates  | release-planner              | shared         | M    | TASK014                   |

## Acceptance

- No cloud call occurs without a recorded approval grant.
- Each approval authorizes a fixed number of submissions and reviews with a maximum displayed cost.
- Known provider operations resume polling; ambiguous submissions never automatically repeat.
- Accepted takes are cached locally and committed to assets, storyboard, and timeline.
- Existing v6 projects, tasks, and workflows continue to load.
- All validation and packaging gates pass before release.
