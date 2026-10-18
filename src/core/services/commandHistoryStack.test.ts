import { describe, expect, it, vi } from 'vitest';
import { CommandHistoryStack } from './commandHistoryStack';

describe('CommandHistoryStack', () => {
  it('executes, undoes, and redoes commands deterministically', async () => {
    const stack = new CommandHistoryStack(10);
    let value = 0;

    await stack.execute({
      description: 'Add 10',
      execute: () => {
        value += 10;
      },
      undo: () => {
        value -= 10;
      },
    });

    expect(value).toBe(10);
    expect(stack.canUndo()).toBe(true);
    expect(stack.canRedo()).toBe(false);

    await stack.undo();
    expect(value).toBe(0);
    expect(stack.canUndo()).toBe(false);
    expect(stack.canRedo()).toBe(true);

    await stack.redo();
    expect(value).toBe(10);
    expect(stack.canUndo()).toBe(true);
    expect(stack.canRedo()).toBe(false);
  });

  it('enforces bounded capacity and drops oldest commands', async () => {
    const stack = new CommandHistoryStack(3);
    const log: string[] = [];

    for (let i = 1; i <= 5; i++) {
      await stack.execute({
        description: `Action ${i}`,
        execute: () => {
          log.push(`do-${i}`);
        },
        undo: () => {
          log.push(`undo-${i}`);
        },
      });
    }

    const state = stack.getState();
    expect(state.undoCount).toBe(3);
    expect(state.lastCommandDescription).toBe('Action 5');

    // Only actions 5, 4, 3 can be undone
    await stack.undo(); // 5
    await stack.undo(); // 4
    await stack.undo(); // 3
    const canUndoMore = await stack.undo();
    expect(canUndoMore).toBe(false);

    expect(log).toEqual(['do-1', 'do-2', 'do-3', 'do-4', 'do-5', 'undo-5', 'undo-4', 'undo-3']);
  });

  it('clears redo stack when a new command is executed', async () => {
    const stack = new CommandHistoryStack(10);
    let count = 0;

    await stack.execute({
      description: 'Step 1',
      execute: () => {
        count = 1;
      },
      undo: () => {
        count = 0;
      },
    });

    await stack.undo();
    expect(stack.canRedo()).toBe(true);

    // New action executed
    await stack.execute({
      description: 'Step 2',
      execute: () => {
        count = 2;
      },
      undo: () => {
        count = 0;
      },
    });

    expect(stack.canRedo()).toBe(false);
    expect(count).toBe(2);
  });

  it('bundles multiple sub-actions into an atomic transaction', async () => {
    const stack = new CommandHistoryStack(10);
    const values: number[] = [];

    stack.beginTransaction('Batch add items');

    await stack.execute({
      description: 'Add 1',
      execute: () => {
        values.push(1);
      },
      undo: () => {
        values.pop();
      },
    });

    await stack.execute({
      description: 'Add 2',
      execute: () => {
        values.push(2);
      },
      undo: () => {
        values.pop();
      },
    });

    await stack.execute({
      description: 'Add 3',
      execute: () => {
        values.push(3);
      },
      undo: () => {
        values.pop();
      },
    });

    stack.commitTransaction();

    expect(values).toEqual([1, 2, 3]);
    expect(stack.getState().undoCount).toBe(1); // 1 composite command
    expect(stack.getState().lastCommandDescription).toBe('Batch add items');

    // Undoing undoes all 3 operations atomically in reverse order
    await stack.undo();
    expect(values).toEqual([]);

    // Redoing applies all 3 operations atomically
    await stack.redo();
    expect(values).toEqual([1, 2, 3]);
  });

  it('rolls back uncommitted transaction on failure', async () => {
    const stack = new CommandHistoryStack(10);
    const values: number[] = [];

    stack.beginTransaction('Failing batch');

    await stack.execute({
      description: 'Add 100',
      execute: () => {
        values.push(100);
      },
      undo: () => {
        values.pop();
      },
    });

    await stack.execute({
      description: 'Add 200',
      execute: () => {
        values.push(200);
      },
      undo: () => {
        values.pop();
      },
    });

    // Rollback
    await stack.rollbackTransaction();

    expect(values).toEqual([]);
    expect(stack.getState().undoCount).toBe(0);
  });

  it('notifies subscribers of state changes', async () => {
    const stack = new CommandHistoryStack(5);
    const listener = vi.fn();
    const unsub = stack.subscribe(listener);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ canUndo: false, canRedo: false }),
    );

    await stack.execute({
      description: 'Test notify',
      execute: () => {},
      undo: () => {},
    });

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ canUndo: true, canRedo: false, undoCount: 1 }),
    );

    unsub();
  });
});
