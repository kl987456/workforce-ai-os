export type HunarLanguage =
  | "ENGLISH"
  | "HINDI"
  | "TAMIL"
  | "TELUGU"
  | "KANNADA"
  | "MARATHI"
  | "MALAYALAM"
  | "GUJARATI"
  | "BENGALI"
  | "TURKISH"
  | "ARABIC"
  | "SPANISH";

export type HunarVoicePersona = "NEHA" | "ROY" | "ZOE" | "SAM" | "MIRA" | "EESHA";

export type HunarCallStatus =
  | "COMPLETED"
  | "IN_PROGRESS"
  | "NOT_CONNECTED"
  | "FAILED"
  | "CANCELLED"
  | "INITIATED"
  | "RINGING"
  | "NOT_STARTED"
  | "SCHEDULED";

export interface HunarResultSchemaField {
  [key: string]: string;
}

export interface CreateAgentPayload {
  name: string;
  language: HunarLanguage;
  voice_persona: HunarVoicePersona;
  persona_name?: string;
  agent_prompt: string;
  objective: string;
  introduction: string;
  result_prompt: string;
  result_schema: HunarResultSchemaField;
}

export interface HunarAgent extends CreateAgentPayload {
  id: string;
  created_at?: string;
  status?: string;
}

export interface RetryConfig {
  max_retry_count: number;
  retry_interval_hours: 0 | 3 | 6 | 9 | 12 | 24;
}

export interface Guardrails {
  allowed_days: Array<"MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN">;
  earliest_call_time: string;
  last_call_time: string;
}

export interface CallbackConfig {
  call_status_callback_url?: string;
  call_recording_callback_url?: string;
  call_result_callback_url?: string;
  call_summary_callback_url?: string;
}

export interface CreateCallPayload {
  agent_id: string;
  callee_name: string;
  mobile_number: string;
  custom_data?: Record<string, unknown>;
  from_phone_number?: string;
  request_id?: string;
  retry_config?: RetryConfig;
  guardrails?: Guardrails;
  timezone?: string;
  callback_config?: CallbackConfig;
}

export interface HunarCall {
  id: string;
  agent_id: string;
  request_id?: string | null;
  to_number: string;
  from_phone_number?: string | null;
  status: HunarCallStatus;
  lifecycle_status: string;
  answered_by?: "HUMAN" | "MACHINE" | "UNKNOWN" | null;
  duration_seconds?: number | null;
  duration_minutes?: number | null;
  recording_url?: string | null;
  result?: Record<string, unknown> | null;
  created_at?: string;
  started_at?: string | null;
  ended_at?: string | null;
}

export interface HunarPhoneNumber {
  phone_number: string;
  label?: string;
  status?: string;
}

export type HunarWebhookEventType =
  | "call_status_updated"
  | "call_recording_done"
  | "call_result_done"
  | "call_summary";

export interface HunarWebhookPayload {
  event_type: HunarWebhookEventType;
  call_id: string;
  agent_id: string;
  request_id?: string | null;
  to_number?: string;
  from_phone_number?: string | null;
  status?: HunarCallStatus;
  lifecycle_status?: string;
  answered_by?: "HUMAN" | "MACHINE" | "UNKNOWN" | null;
  max_retries?: number;
  retry_count?: number;
  retries_left?: number;
  next_retry_scheduled_at?: string | null;
  retry_reason?: string | null;
  duration_seconds?: number | null;
  duration_minutes?: number | null;
  created_at?: string;
  started_at?: string | null;
  ended_at?: string | null;
  timezone?: string;
  recording_url?: string | null;
  result?: Record<string, unknown> | null;
}
