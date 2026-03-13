export interface Session {
  id: string;
  cwd: string;
  status: 'active' | 'idle' | 'done';
  lastTool: string | null;
  lastToolInput: string | null;
  lastActivity: number;
  startedAt: number;
  endedAt: number | null;
  lastMessage: string | null;
}

export interface ParsedMessage {
  role: 'user' | 'assistant';
  type: 'text' | 'thinking' | 'tool_use' | 'tool_result';
  content: string;
  timestamp: string;
  toolName?: string;
}
