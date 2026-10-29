import { API_BASE_URL, FALLBACK_API_BASE_URL, CANDIDATE_BASE_URLS } from '../config';
import {
  StartInterviewPayload,
  StartInterviewResponse,
  SubmitAnswerResponse,
  InterviewSessionDetail,
  RoadmapDTO,
  UserProfile,
  UserStatisticsDTO,
  ChatHistoryDTO,
} from '../types';

let activeBaseUrl = API_BASE_URL;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function fetchWithFallback(path: string, options: RequestInit = {}): Promise<Response> {
  // Try currently active base URL first
  try {
    const res = await fetchWithTimeout(`${activeBaseUrl}${path}`, options, 4000);
    return res;
  } catch (err: any) {
    // If active base URL failed, probe candidates
    for (const candidate of CANDIDATE_BASE_URLS) {
      if (candidate === activeBaseUrl) continue;
      try {
        const fallbackRes = await fetchWithTimeout(`${candidate}${path}`, options, 3000);
        activeBaseUrl = candidate;
        return fallbackRes;
      } catch (fallbackErr: any) {
        // continue trying next candidate
      }
    }
    throw new Error('Cannot reach FastAPI backend on localhost:8000 or Wi-Fi IP. Ensure python run.py is active!');
  }
}

export const api = {
  async getRecommendedTechStacks(role: string): Promise<string[]> {
    try {
      const res = await fetchWithFallback(`/auth/tech-stacks?role=${encodeURIComponent(role)}`, {
        method: 'GET',
      });
      if (res.ok) {
        const data = await res.json();
        return data.recommended_stacks || [];
      }
    } catch (e) {
      // fallback
    }
    return ['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'Redis', 'System Design'];
  },

  async tokenLogin(email: string, name?: string) {
    const res = await fetchWithFallback('/auth/token-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Authentication failed');
    }
    return res.json();
  },

  async authenticateGoogle(accessToken?: string, idToken?: string) {
    const res = await fetchWithFallback('/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: accessToken, id_token: idToken }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Google authentication failed on server');
    }
    return res.json();
  },

  async authenticateDemo(name = 'Kristian Watson', email = 'kristian.watson@student.dev') {
    const res = await fetchWithFallback('/auth/demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Demo login failed');
    }
    return res.json();
  },

  async completeOnboarding(payload: {
    user_id: string;
    name?: string;
    dob?: string;
    target_role: string;
    expected_lpa: string;
    interested_companies: string;
    experience_level?: string;
    primary_stack?: string;
  }) {
    const res = await fetchWithFallback('/auth/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to save onboarding details');
    }
    return res.json();
  },

  async fetchRoadmap(payload: {
    user_id?: string;
    role: string;
    tech_stack?: string[];
    target_company?: string;
    level?: string;
    force_refresh?: boolean;
  }): Promise<RoadmapDTO> {
    const res = await fetchWithFallback('/roadmap/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to generate roadmap');
    }
    return res.json();
  },

  async toggleRoadmapItem(payload: {
    user_id: string;
    roadmap_id: string;
    phase_id: string;
    item_id: string;
    completed: boolean;
  }) {
    const res = await fetchWithFallback('/roadmap/toggle-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update checklist item');
    }
    return res.json();
  },

  async startInterview(payload: StartInterviewPayload): Promise<StartInterviewResponse> {
    const res = await fetchWithFallback('/interview/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to start interview session');
    }
    return res.json();
  },

  async submitAnswer(sessionId: string, answer: string): Promise<SubmitAnswerResponse> {
    const res = await fetchWithFallback('/interview/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, answer }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to submit answer');
    }
    return res.json();
  },

  async finishInterview(sessionId: string): Promise<InterviewSessionDetail> {
    const res = await fetchWithFallback(`/interview/${sessionId}/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to finalize interview diagnostic');
    }
    return res.json();
  },

  async getInterviewDetail(sessionId: string): Promise<InterviewSessionDetail> {
    const res = await fetchWithFallback(`/interview/${sessionId}`, {
      method: 'GET',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to load interview history');
    }
    return res.json();
  },

  async updateProfile(userId: string, data: { name?: string; target_role?: string; expected_lpa?: string; interested_companies?: string }): Promise<UserProfile> {
    const res = await fetchWithFallback(`/auth/profile/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to update user profile');
    }
    return res.json();
  },

  async getRoadmapContext(userId?: string, level?: string) {
    const query = level ? `?level=${encodeURIComponent(level)}` : '';
    const res = await fetchWithFallback(`/roadmap/context/${userId || 'guest'}${query}`, {
      method: 'GET',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to load roadmap context');
    }
    return res.json();
  },

  async sendRoadmapChat(payload: {
    user_id?: string;
    level?: string;
    message: string;
    chat_history?: { role: string; content: string }[];
  }) {
    const res = await fetchWithFallback('/roadmap/assistant-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to send message to assistant');
    }
    return res.json();
  },

  async getUserStatistics(userId?: string, level?: string): Promise<UserStatisticsDTO> {
    const query = level ? `?level=${encodeURIComponent(level)}` : '';
    const res = await fetchWithFallback(`/statistics/${userId || 'guest'}${query}`, {
      method: 'GET',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to load user statistics');
    }
    return res.json();
  },

  async getRoadmapChatHistory(userId?: string, level?: string): Promise<ChatHistoryDTO> {
    const query = level ? `?level=${encodeURIComponent(level)}` : '';
    const res = await fetchWithFallback(`/roadmap/chat-history/${userId || 'guest'}${query}`, {
      method: 'GET',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to load chat history');
    }
    return res.json();
  },

  async clearRoadmapChatHistory(userId?: string, level?: string): Promise<{ status: string }> {
    const query = level ? `?level=${encodeURIComponent(level)}` : '';
    const res = await fetchWithFallback(`/roadmap/chat-history/${userId || 'guest'}${query}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to clear chat history');
    }
    return res.json();
  },
};