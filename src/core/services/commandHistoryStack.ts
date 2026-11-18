/**
 * Bounded Patch/Command Undo-Redo Stack
 *
 * Implements a deterministic, command-pattern undo/redo engine for NLE timeline
 * and node-graph operations. Unlike state snapshotting, command objects store
 * lightweight reversible delta operations, completely isolated from heavy
 * full-document serialization and autosave disk I/O.
 */

export interface Command<T = unknown> {
  id: string;
  description: string;
  timestamp: number;
  execute: () => void | Promise<void>;
  undo: () => void | Promise<void>;
  payload?: T;
}

export type CommandAction<T = unknown> = Omit<Command<T>, 'id' | 'timestamp'> & {
  id?: string;
  timestamp?: number;
};

export interface CommandHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  lastCommandDescription?: string;
}

export class CommandHistoryStack {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private activeTransaction: {
    description: string;
    commands: Command[];
  } | null = null;
  private listeners = new Set<(state: CommandHistoryState) => void>();

  constructor(public readonly maxCapacity: number = 50) {}

  /**
   * Execute and record a new reversible command.
   */
  async execute<T>(action: CommandAction<T>): Promise<void> {
    const command: Command<T> = {
      id: action.id ?? crypto.randomUUID(),
      description: action.description,
      timestamp: action.timestamp ?? Date.now(),
      execute: action.execute,
      undo: action.undo,
      payload: action.payload,
    };

    await command.execute();

    if (this.activeTransaction) {
      this.activeTransaction.commands.push(command as Command);
      return;
    }

    this.undoStack.push(command as Command);
    if (this.undoStack.length > this.maxCapacity) {
      this.undoStack.shift();
    }

    this.redoStack = [];
    this.notify();
  }

  /**
   * Undo the most recent command or transaction.
   */
  async undo(): Promise<boolean> {
    if (this.undoStack.length === 0) return false;

    const command = this.undoStack.pop()!;
    await command.undo();
    this.redoStack.push(command);
    this.notify();
    return true;
  }

  /**
   * Redo the most recently undone command or transaction.
   */
  async redo(): Promise<boolean> {
    if (this.redoStack.length === 0) return false;

    const command = this.redoStack.pop()!;
    await command.execute();
    this.undoStack.push(command);
    this.notify();
    return true;
  }

  /**
   * Begin an atomic transaction to group multiple sub-actions into a single undo step.
   */
  beginTransaction(description: string): void {
    if (this.activeTransaction) {
      throw new Error('Nested transactions are not supported.');
    }
    this.activeTransaction = {
      description,
      commands: [],
    };
  }

  /**
   * Commit the active transaction, bundling all sub-commands into one composite command.
   */
  commitTransaction(): void {
    if (!this.activeTransaction) return;

    const { description, commands } = this.activeTransaction;
    this.activeTransaction = null;

    if (commands.length === 0) return;

    const compositeCommand: Command = {
      id: crypto.randomUUID(),
      description,
      timestamp: Date.now(),
      execute: async () => {
        for (const cmd of commands) {
          await cmd.execute();
        }
      },
      undo: async () => {
        // Undo in reverse order
        for (let i = commands.length - 1; i >= 0; i--) {
          await commands[i].undo();
        }
      },
    };

    this.undoStack.push(compositeCommand);
    if (this.undoStack.length > this.maxCapacity) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.notify();
  }

  /**
   * Rollback the active transaction, undoing any commands executed within it.
   */
  async rollbackTransaction(): Promise<void> {
    if (!this.activeTransaction) return;

    const { commands } = this.activeTransaction;
    this.activeTransaction = null;

    for (let i = commands.length - 1; i >= 0; i--) {
      await commands[i].undo();
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.activeTransaction = null;
    this.notify();
  }

  getState(): CommandHistoryState {
    return {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoCount: this.undoStack.length,
      redoCount: this.redoStack.length,
      lastCommandDescription: this.undoStack.at(-1)?.description,
    };
  }

  subscribe(listener: (state: CommandHistoryState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}

export const timelineCommandStack = new CommandHistoryStack(50);
export const composerCommandStack = new CommandHistoryStack(50);
