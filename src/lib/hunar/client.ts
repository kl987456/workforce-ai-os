import "server-only";
import type {
  CreateAgentPayload,
  CreateCallPayload,
  HunarAgent,
  HunarCall,
  HunarPhoneNumber,
} from "./types";

const BASE_URL =
  process.env.HUNAR_API_BASE_URL?.replace(/\/$/, "") ??
  "https://api.voice.hunar.ai/external/v1";

class HunarApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`Hunar API error (${status}): ${JSON.stringify(body)}`);
    this.status = status;
    this.body = body;
  }
}

function apiKey(): string {
  const key = process.env.HUNAR_API_KEY;
  if (!key) {
    throw new Error(
      "HUNAR_API_KEY is not set. Add it to your environment variables (never commit it)."
    );
  }
  return key;
}

async function hunarFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new HunarApiError(res.status, body);
  }
  return body as T;
}

export const hunar = {
  agents: {
    list: (params?: { language?: string; status?: string }) => {
      const qs = params
        ? "?" + new URLSearchParams(params as Record<string, string>).toString()
        : "";
      return hunarFetch<{ results: HunarAgent[]; count?: number } | HunarAgent[]>(
        `/agents/${qs}`
      );
    },
    get: (agentId: string) => hunarFetch<HunarAgent>(`/agents/${agentId}/`),
    create: (payload: CreateAgentPayload) =>
      hunarFetch<HunarAgent>(`/agents/`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (agentId: string, payload: Partial<CreateAgentPayload>) =>
      hunarFetch<HunarAgent>(`/agents/${agentId}/`, {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
  },
  calls: {
    list: (params?: { status?: string; agent_id?: string }) => {
      const qs = params
        ? "?" + new URLSearchParams(params as Record<string, string>).toString()
        : "";
      return hunarFetch<{ results: HunarCall[]; count?: number } | HunarCall[]>(
        `/calls/${qs}`
      );
    },
    get: (callId: string) => hunarFetch<HunarCall>(`/calls/${callId}/`),
    create: (payload: CreateCallPayload) =>
      hunarFetch<HunarCall>(`/calls/`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    createBulk: (payload: {
      agent_id: string;
      data: Array<{
        callee_name: string;
        mobile_number: string;
        custom_data?: Record<string, unknown>;
      }>;
      request_id?: string;
      from_phone_number?: string;
      retry_config?: CreateCallPayload["retry_config"];
      guardrails?: CreateCallPayload["guardrails"];
      timezone?: string;
      callback_config?: CreateCallPayload["callback_config"];
      remove_invalid_rows?: boolean;
      remove_duplicate_phone_numbers?: boolean;
    }) =>
      hunarFetch<{ created: number } | HunarCall[]>(`/calls/bulk/`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  numbers: {
    list: () => hunarFetch<{ results: HunarPhoneNumber[] } | HunarPhoneNumber[]>(`/numbers/`),
  },
};

export { HunarApiError };
