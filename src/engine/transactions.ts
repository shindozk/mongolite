export interface TransactionSession {
  id: string;
  active: boolean;
  operations: string[];
}

export class TransactionManager {
  private sessions: Map<string, TransactionSession> = new Map();

  begin(): string {
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.sessions.set(id, { id, active: true, operations: [] });
    return id;
  }

  commit(id: string): boolean {
    const session = this.sessions.get(id);
    if (session && session.active) {
      session.active = false;
      session.operations.push("commit");
      return true;
    }
    return false;
  }

  abort(id: string): boolean {
    const session = this.sessions.get(id);
    if (session && session.active) {
      session.active = false;
      session.operations.push("abort");
      return true;
    }
    return false;
  }

  getSession(id: string): TransactionSession | undefined {
    return this.sessions.get(id);
  }
}
