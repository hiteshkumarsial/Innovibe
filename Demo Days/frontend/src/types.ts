export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  avatar_url?: string;
  dob?: string;
  target_role?: string;
  expected_lpa?: string;
  interested_companies?: string;
  experience_level?: string;
  primary_stack?: string;
  onboarding_completed?: boolean;
  token?: string;
}

export interface ChecklistItemDTO {
  id: string;
  text: string;
  completed: boolean;
  priority?: 'high' | 'medium' | 'low';
}

export interface RoadmapPhaseDTO {
  id: string;
  phase_number: number;
  title: string;
  duration: string;
  tag: string;
  description: string;
  key_topics: string[];
  checklist: ChecklistItemDTO[];
  drill_topic?: string;
  is_expanded?: boolean;
}

export interface RoadmapDTO {
  id: string;
  user_id?: string;
  role: string;
  target_company: string;
  level: string;
  duration: string;
  summary: string;
  progress_percentage: number;
  total_items: number;
  completed_items: number;
  phases: RoadmapPhaseDTO[];
}

export interface StartInterviewPayload {
  user_id?: string;
  candidate_name?: string;
  target_role: string;
  archetype?: 'PRODUCT_STARTUP' | 'ENTERPRISE_BIGTECH' | 'AI_SCREENING_ROUND';
  project_description: string;
  max_turns?: number;
}

export interface ProfileSummary {
  target_role: string;
  archetype: string;
  detected_stack: string[];
  suspected_loopholes: string[];
  opening_question: string;
}

export interface StartInterviewResponse {
  session_id: string;
  status: string;
  current_turn: number;
  max_turns: number;
  opening_question: string;
  profile_summary: ProfileSummary;
}

export interface SubmitAnswerResponse {
  session_id: string;
  current_turn: number;
  max_turns: number;
  is_completed: boolean;
  next_question?: string | null;
  interviewer_reaction?: string | null;
}

export interface SectionScoreDTO {
  name: string;
  score: number;
  max_score: number;
  feedback: string;
}

export interface SayThisInsteadDTO {
  question: string;
  ideal_answer: string;
  key_points: string[];
}

export interface DiagnosticReportDTO {
  hire_decision: string;
  seniority_signal: string;
  rambling_index: string;
  raw_markdown_report: string;
  created_at: string;
  overall_score?: number;
  section_scores?: SectionScoreDTO[];
  what_went_right?: string[];
  what_went_wrong?: string[];
  say_this_instead?: SayThisInsteadDTO[];
}

export interface TurnLogDTO {
  turn_number: number;
  question: string;
  user_answer?: string | null;
  created_at: string;
}

export interface InterviewSessionDetail {
  id: string;
  candidate_name: string;
  target_role: string;
  archetype: string;
  project_description: string;
  status: string;
  current_turn: number;
  max_turns: number;
  created_at: string;
  turns: TurnLogDTO[];
  diagnostic?: DiagnosticReportDTO | null;
}


export interface DailyProgressBarDTO {
  day: string;
  date: string;
  tasks_done: number;
  turns_taken: number;
  activity_count: number;
  height_pct: number;
  is_today: boolean;
}

export interface PendingPhaseDrillDTO {
  phase_id: string;
  phase_number: number;
  title: string;
  tag: string;
  completed_tasks: number;
  total_tasks: number;
  completion_pct: number;
  drill_topic: string;
  drill_claims: string;
  status: 'PENDING_DRILL' | 'IN_PROGRESS' | 'DRILLED' | 'UNTOUCHED';
  has_been_drilled: boolean;
}

export interface TierMasteryDTO {
  level: string;
  percentage: number;
  completed: number;
  total: number;
}

export interface UserStatisticsDTO {
  candidate_name: string;
  target_role: string;
  target_company: string;
  active_level: string;
  overall_progress_percentage: number;
  total_tasks_completed: number;
  total_tasks_count: number;
  phases_completed_count: number;
  total_phases_count: number;
  weekly_tasks_count: number;
  peak_day_name: string;
  peak_day_count: number;
  daily_bars: DailyProgressBarDTO[];
  pending_drills: PendingPhaseDrillDTO[];
  completed_ungrilled_count: number;
  drilled_phases_count: number;
  latest_diagnostic?: DiagnosticReportDTO | null;
  tier_mastery: TierMasteryDTO[];
}

export interface StoredChatMessage {
  id: string;
  user_id: string;
  level: string;
  role: 'user' | 'assistant';
  content: string;
  suggested_followups?: string[];
  created_at: string;
}

export interface ChatHistoryDTO {
  user_id: string;
  level: string;
  messages: StoredChatMessage[];
}
