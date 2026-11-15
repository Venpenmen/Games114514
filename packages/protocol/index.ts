export const protocolVersion = 1
export type Command = { v: 1; id: string; type: string; room?: string; match?: string; phase?: number; data?: unknown }
export type Reply = { ok: true; room?: string } | { ok: false; error: string }
export type Profile = { id: string; name: string; avatar: number }
export type Snapshot = {
  code: string; host: string; gameId: string; config: unknown; lobby?: Record<string, unknown>;
  members: (Profile & { ready: boolean; online: boolean })[];
  match?: { id: string; phase: number; deadline: number | null; finished: boolean; public: unknown; private: unknown };
  chat: { author: string; text: string; at: number }[];
}
export const avatars = ['🐱','🐶','🦊','🐼','🐸','🐰']
