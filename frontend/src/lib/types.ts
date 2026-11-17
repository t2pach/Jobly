export type Status = "plan" | "prep" | "sent" | "seen" | "inv" | "int" | "rej" | "offer" | "hired" | "closed";
export type WorkFormat = "any" | "remote" | "hybrid" | "office";
export type Confidence = "high" | "medium" | "low";

export interface Me {
  id: number;
  email: string;
  is_admin: boolean;
}

export interface Experience {
  company: string;
  position: string;
  start: string;
  end: string;
  description: string;
  achievements: string[];
}

export interface Education {
  institution: string;
  specialty: string;
  year: number | null;
}

export interface Profile {
  full_name: string | null;
  city: string | null;
  goal: string | null;
  years: number | null;
  salary_expectation: number | null;
  work_format: WorkFormat | null;
  about: string | null;
  weights: Record<string, number> | null;
  skills: string[];
  experience: Experience[];
  education: Education[];
}

export interface Vacancy {
  id: number;
  source: string;
  also_on: string[];
  title: string;
  company: string;
  city: string;
  region: string;
  work_format: string | null;
  salary_from: number | null;
  salary_to: number | null;
  currency: string;
  salary_gross: boolean | null;
  experience_years_min: number | null;
  employment: string;
  schedule: string;
  description: string;
  skills: string[];
  url: string;
  published_at: string | null;
  match_score: number | null;
  match_confidence: Confidence | null;
  saved: boolean;
}

export interface SourceStatus {
  status: "ok" | "unavailable" | "error";
  count?: number;
  detail?: string;
}

export interface SearchResult {
  items: Vacancy[];
  sources: Record<string, SourceStatus>;
  page: number;
  note: string;
}

export interface BreakdownItem {
  key: string;
  label: string;
  weight: number;
  value: number | null;
}

export interface MatchResult {
  vacancy_id: number;
  score: number;
  confidence: Confidence;
  matched_requirements: string[];
  missing_requirements: string[];
  uncertain_requirements: string[];
  risks: string[];
  recommendations: string[];
  breakdown: BreakdownItem[];
}

export interface Letter {
  id: number;
  text: string;
  placeholders_to_fill: number;
}

export interface Application {
  id: number;
  vacancy_id: number | null;
  title: string;
  company: string;
  source: string;
  url: string;
  status: Status;
  applied_at: string | null;
  note: string;
  next_action: string;
  remind_at: string | null;
  cover_letter_id: number | null;
}

export interface ApplicationEvent {
  from: Status | null;
  to: Status;
  at: string;
}

export interface Goal {
  id: number;
  title: string;
  description: string;
  target_salary: number | null;
  status: string;
}

export interface MarketStats {
  sample_size: number;
  with_salary: number;
  salary: { median: number | null; min: number | null; max: number | null; basis: string };
  formats: Record<string, number>;
  top_skills: [string, number][];
  period: { from: string | null; to: string | null };
  notes: string[];
  vs_expectation?: { expectation: number; median: number; above_median: boolean };
}

export interface Integration {
  code: string;
  title: string;
  enabled: boolean;
  capabilities: {
    search: boolean;
    get_by_id: boolean;
    server_filters: string[];
    apply_from_app: boolean;
    commercial_use_verified: boolean;
  };
  health: { status: "ok" | "degraded" | "not_configured" | "error"; detail: string; checked_at: string };
}

export interface AdminSource {
  code: string;
  title: string;
  enabled: boolean;
  last_sync_at: string | null;
  last_status: string | null;
  last_error: string | null;
}

export interface AdminUser {
  id: number;
  email: string;
  is_admin: boolean;
  is_blocked: boolean;
  created_at: string;
}
