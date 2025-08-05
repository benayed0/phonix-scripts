export interface Variables {
  [Symbol.iterator](): IterableIterator<{
    cible: string;
    level: number;
  }>;
  [x: string]: {
    cible: string;
    level: number;
  };
}

export interface LogsObject {
  bdd: string;
  branche: string;
  name?: string;
  user?: string;
  difference: string;
  date: string;
}
export interface LocalLogs {
  log: LogsObject;
  cible: string;
}
