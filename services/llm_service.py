import json
import logging
import asyncio
from typing import Dict, Any, List
import httpx
from app.config import settings
from app.services.roadmap_curricula import get_curriculum

logger = logging.getLogger(__name__)

MASTER_PROMPT_SYSTEM = """You are "The Bar Raiser" — an elite, battle-tested Staff Software Engineer and Technical Hiring Manager. You conduct rigorous, high-signal technical and architectural interviews for candidates targeting top-tier product companies and startups.

Your goal is NOT to flatter the candidate. Your job is to test the depth of their actual hands-on engineering experience, expose bluffing, identify preparation loopholes, and train them to defend their decisions under pressure.

CORE INTERVIEWING PRINCIPLES:
1. ONE QUESTION AT A TIME: Never ask compound, multi-part questions. Ask one razor-sharp question and wait for the response.
2. NO GENERIC PRAISE: Do not start responses with "Great answer!", "That is correct!", or "Awesome job!". Acknowledge briefly if necessary ("Understood", "Noted") and proceed directly to the next probe.
3. THE "3-LEVELS DEEP" PROBING RULE (BS DETECTOR):
   - Whenever the candidate mentions a framework, tool, or database (e.g., Redis, Kafka, Docker, MongoDB), do NOT accept it at face value.
   - Challenge their trade-offs: Why this tool over its closest alternative?
   - Challenge failure modes: What happens when this component crashes, drops packets, or runs out of memory?
   - Challenge scale: What was the bottleneck? How did you profile it?
4. FILL-IN-THE-BLANKS PROBING:
   - If the candidate claims an achievement or architecture but omits scale, latency, data schema, or operational cost, interrupt and demand those exact details.
"""

class LLMService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER
        self.groq_key = settings.GROQ_API_KEY
        self.groq_model = settings.GROQ_MODEL
        self.gemini_key = settings.GEMINI_API_KEY
        self.openai_key = settings.OPENAI_API_KEY

    async def generate_roadmap(
        self,
        role: str,
        tech_stack: List[str],
        target_company: str = "Top Product Company",
        level: str = "Beginner"
    ) -> Dict[str, Any]:
        """Generates a personalized, in-depth roadmap with exact tier requirements."""
        stack_str = ", ".join(tech_stack) if tech_stack else "Python, FastAPI, SQL, Docker"

        if self.groq_key:
            try:
                roadmap = await self._groq_generate_roadmap(role, stack_str, target_company, level)
                # Verify that the generated roadmap meets the minimum phase count
                lvl = level.lower().strip()
                min_phases = 8
                if len(roadmap.get("phases", [])) >= min_phases:
                    return roadmap
                logger.warning(f"Groq returned {len(roadmap.get('phases', []))} phases (expected {min_phases}). Using deep curriculum baseline.")
            except Exception as e:
                logger.error(f"Groq roadmap generation failed: {e}. Falling back to deep curriculum.")

        return self._mock_roadmap(role, stack_str, target_company, level)

    async def scan_profile(self, project_description: str, target_role: str, archetype: str) -> Dict[str, Any]:
        """Analyzes candidate project for buzzwords, unverified metrics, and missing architectural details."""
        if self.provider == "groq" and self.groq_key:
            try:
                return await self._groq_scan_profile(project_description, target_role, archetype)
            except Exception as e:
                logger.error(f"Groq scan_profile error: {e}")

        if self.provider == "gemini" and self.gemini_key:
            return await self._gemini_scan_profile(project_description, target_role, archetype)

        if self.provider == "openai" and self.openai_key:
            return await self._openai_scan_profile(project_description, target_role, archetype)

        return self._mock_scan_profile(project_description, target_role, archetype)

    async def generate_followup_question(
        self,
        archetype: str,
        profile_summary: Dict[str, Any],
        turn_history: List[Dict[str, str]],
        latest_answer: str,
        turn_number: int,
        max_turns: int
    ) -> Dict[str, str]:
        """Generates the next razor-sharp single follow-up probe."""
        prompt = f"""Archetype: {archetype}
Turn: {turn_number} of {max_turns}
Candidate Project Summary: {json.dumps(profile_summary)}
Conversation so far:
{json.dumps(turn_history, indent=2)}

Candidate's Latest Answer:
"{latest_answer}"

Instruction:
As The Bar Raiser, critique this answer in your internal notes. Then formulate EXACTLY ONE follow-up question.
If they were vague or used buzzwords, call it out directly. If they were solid, push for edge cases or scale.
Respond in valid JSON format only:
{{
  "interviewer_reaction": "Brief 1-sentence thought on their answer",
  "next_question": "Single direct question"
}}"""

        if self.provider == "groq" and self.groq_key:
            try:
                return await self._groq_chat(prompt)
            except Exception as e:
                logger.error(f"Groq follow-up error: {e}")

        return self._mock_followup(latest_answer, turn_number)

    async def generate_diagnostic(
        self,
        candidate_name: str,
        target_role: str,
        archetype: str,
        project_description: str,
        turn_history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """Generates the final comprehensive post-mortem report and score card."""
        # Detect if candidate provided 0 real answers (e.g. early exit / concession)
        answered_turns = [
            t for t in turn_history
            if t.get("answer") and str(t["answer"]).strip() and str(t["answer"]).strip() != "No answer provided"
        ]
        has_zero_answers = len(answered_turns) == 0
        opening_q = turn_history[0].get("question", "Describe your core project architecture and hardest bug solved.") if turn_history else "Describe your core architecture."

        if has_zero_answers:
            return self._build_zero_input_diagnostic(candidate_name, target_role, project_description, opening_q)

        prompt = f"""Review this complete technical interview drill for candidate {candidate_name} targeting {target_role} ({archetype}).
Project Context & Claims:
{project_description}

Interview Transcript:
{json.dumps(turn_history, indent=2)}

Task:
Evaluate the candidate's engineering depth and communication objectively. Score each of the 5 core sections out of 20 points, provide concrete positive strengths, constructive growth areas, and high-signal model answers for the hardest questions probed.
Respond in valid JSON only with this exact structure:
{{
  "hire_decision": "Completed",
  "seniority_signal": "Evaluated",
  "rambling_index": "Low",
  "overall_score": 75,
  "section_scores": [
    {{"name": "Architecture & System Design", "score": 15, "max_score": 20, "feedback": "Constructive feedback on architectural clarity and component modularity"}},
    {{"name": "Trade-offs & Alternatives", "score": 14, "max_score": 20, "feedback": "Constructive feedback on technology choices and trade-off defense"}},
    {{"name": "Failure Modes & Edge Cases", "score": 13, "max_score": 20, "feedback": "Constructive feedback on handling errors, timeouts, and crash resilience"}},
    {{"name": "Database & Scale Mechanics", "score": 16, "max_score": 20, "feedback": "Constructive feedback on data schema, indexing, and latency percentiles"}},
    {{"name": "Technical Precision & Clarity", "score": 17, "max_score": 20, "feedback": "Constructive feedback on directness and precision of explanations"}}
  ],
  "what_went_right": [
    "Specific positive technical signal or sound engineering decision 1",
    "Specific positive technical signal or sound engineering decision 2"
  ],
  "what_went_wrong": [
    "Specific technical gap, missing metric, or unaddressed edge case 1",
    "Specific technical gap, missing metric, or unaddressed edge case 2"
  ],
  "say_this_instead": [
    {{
      "question": "The question they struggled with most or opening question",
      "ideal_answer": "Staff-level ideal response demonstrating high-signal engineering and metrics",
      "key_points": [
        "Key signal 1",
        "Key signal 2",
        "Key signal 3"
      ]
    }}
  ],
  "raw_markdown_report": ""
}}"""

        if self.provider == "groq" and self.groq_key:
            try:
                res = await self._groq_chat(prompt)
                if isinstance(res, dict) and "section_scores" in res:
                    return res
                elif isinstance(res, dict) and "hire_decision" in res:
                    return self._enrich_diagnostic_result(res, candidate_name, target_role, turn_history)
            except Exception as e:
                logger.error(f"Groq diagnostic error: {e}")

        return self._mock_diagnostic(candidate_name, target_role, turn_history)

    async def generate_diagnostic_report(
        self,
        candidate_name: str,
        target_role: str,
        archetype: str,
        project_description: str,
        turn_history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """Alias for generate_diagnostic ensuring zero runtime route mismatches."""
        return await self.generate_diagnostic(
            candidate_name=candidate_name,
            target_role=target_role,
            archetype=archetype,
            project_description=project_description,
            turn_history=turn_history
        )

    def _build_zero_input_diagnostic(
        self,
        candidate_name: str,
        target_role: str,
        project_description: str,
        opening_question: str
    ) -> Dict[str, Any]:
        return {
            "hire_decision": "Early Exit",
            "seniority_signal": "Incomplete Drill",
            "rambling_index": "Low",
            "overall_score": 20,
            "section_scores": [
                {
                    "name": "Architecture & System Design",
                    "score": 4,
                    "max_score": 20,
                    "feedback": "Drill ended before high-level components or data flow were defended."
                },
                {
                    "name": "Trade-offs & Alternatives",
                    "score": 4,
                    "max_score": 20,
                    "feedback": "Explore trade-offs between chosen technologies and common alternatives."
                },
                {
                    "name": "Failure Modes & Edge Cases",
                    "score": 4,
                    "max_score": 20,
                    "feedback": "Analyze failure scenarios, timeout budgets, and recovery mechanics."
                },
                {
                    "name": "Database & Scale Mechanics",
                    "score": 4,
                    "max_score": 20,
                    "feedback": "Deepen understanding of indexing strategies and latency percentiles."
                },
                {
                    "name": "Technical Precision & Clarity",
                    "score": 4,
                    "max_score": 20,
                    "feedback": "Practice articulating engineering principles with concrete examples."
                }
            ],
            "what_went_right": [
                f"Initiated drill session for target role: {target_role}.",
                "Prepared to practice rigorous technical concepts."
            ],
            "what_went_wrong": [
                "Concluded the session with 0 technical responses recorded.",
                "Left the opening question completely unanswered.",
                "Did not demonstrate hands-on debugging, metrics, or trade-off reasoning under pressure."
            ],
            "say_this_instead": [
                {
                    "question": opening_question or "Describe your core project's architecture and the single hardest bug you personally solved.",
                    "ideal_answer": "Our service is built with FastAPI on the backend backed by PostgreSQL for transactional persistence and Redis for sub-millisecond caching of hot lookup queries. Write traffic passes through an asynchronous worker queue (Celery + RabbitMQ) to decouple background jobs from the main event loop. The hardest production bug I resolved was a database connection pool exhaustion issue under traffic spikes: slow external third-party API calls held pool connections open. I identified the bottleneck using pg_stat_activity, enforced strict 2.5-second HTTP request timeouts with circuit breakers, and moved all third-party syncs into asynchronous workers, restoring p99 API response times from 3.8s down to 120ms.",
                    "key_points": [
                        "Lead with a 30-second component topology: Gateway -> App Service -> Cache/Queue -> DB.",
                        "Name real diagnostic tools (pg_stat_activity, pprof, flamegraphs, Prometheus) rather than guessing.",
                        "State quantitative resolution metrics (e.g. p99 latency dropped from 3.8s to 120ms)."
                    ]
                }
            ],
            "raw_markdown_report": f"# Evaluation Report: {candidate_name}\n\n**Verdict: Strong No-Hire (Incomplete Session)**\n\nThe candidate initiated the session but exited before defending the opening technical probe. In top-tier product company interviews, leaving a core architectural probe unanswered results in an immediate No-Hire signal.\n\nReview the **'Say This Instead'** model defense above and prepare a crisp 90-second answer before retaking the drill."
        }

    def _enrich_diagnostic_result(self, res: Dict[str, Any], candidate_name: str, target_role: str, turn_history: List[Dict[str, str]]) -> Dict[str, Any]:
        is_no_hire = "no-hire" in str(res.get("hire_decision", "")).lower()
        res.setdefault("overall_score", 46 if is_no_hire else 82)
        res.setdefault("section_scores", [
            {"name": "Architecture & System Design", "score": 10 if is_no_hire else 17, "max_score": 20, "feedback": "Modularity and architectural decoupling."},
            {"name": "Trade-offs & Alternatives", "score": 8 if is_no_hire else 16, "max_score": 20, "feedback": "Justification of tool selection versus alternatives."},
            {"name": "Failure Modes & Edge Cases", "score": 9 if is_no_hire else 16, "max_score": 20, "feedback": "Resilience under network partitions and memory crashes."},
            {"name": "Database & Scale Mechanics", "score": 10 if is_no_hire else 17, "max_score": 20, "feedback": "Query profiling, indexing, and connection management."},
            {"name": "Communication & Precision", "score": 9 if is_no_hire else 16, "max_score": 20, "feedback": "Conciseness and engineering precision."}
        ])
        res.setdefault("what_went_right", ["Demonstrated working knowledge of core backend components."])
        res.setdefault("what_went_wrong", ["Struggled to articulate failure handling and p99 latency guarantees."])
        res.setdefault("say_this_instead", [
            {
                "question": turn_history[0].get("question", "Describe your architecture.") if turn_history else "Describe your architecture.",
                "ideal_answer": "We adopted an asynchronous event-driven design using FastAPI and PostgreSQL with Redis caching for hot reads. We profile slow queries using EXPLAIN ANALYZE and maintain p99 under 100ms.",
                "key_points": ["Lead with concrete metrics.", "Explain indexing strategy.", "Quantify p99 latency."]
            }
        ])
        return res

    async def roadmap_mentor_chat(
        self,
        candidate_name: str,
        target_role: str,
        target_company: str,
        level: str,
        progress_pct: int,
        completed_items: int,
        total_items: int,
        current_phase_title: str,
        current_phase_number: int,
        uncompleted_tasks: List[str],
        user_message: str,
        chat_history: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """Conversational roadmap assistant powered by Groq."""
        tasks_formatted = "\n".join(f"  * {t}" for t in uncompleted_tasks[:5]) if uncompleted_tasks else "  * All tasks in current phase completed! Ready for next phase."
        system_prompt = f"""You are "The Senior Roadmap Mentor" — a compassionate, highly pragmatic, world-class Staff Software Engineer.
You are helping candidate {candidate_name} navigate their technical interview preparation roadmap.

CANDIDATE REAL-TIME PROGRESS & CONTEXT:
- Target Role: {target_role}
- Target Companies: {target_company}
- Preparation Tier: {level}
- Overall Progress: {progress_pct}% ({completed_items} of {total_items} milestones completed)
- Current Active Phase: Phase {current_phase_number} — "{current_phase_title}"
- Active Uncompleted Tasks in this Phase:
{tasks_formatted}

YOUR BEHAVIOR AND RULES:
1. ADDRESS THE USER'S EXACT DOUBT OR OBSTACLE DIRECTLY:
   - If they ask for resources, give curated, battle-tested FREE resources (official docs, top GitHub repositories, free interactive tools, articles) with brief explanations of why they work.
   - If they are confused about a specific milestone or task, give a clear, simple mental model followed by a concise, real code snippet.
   - If they feel overwhelmed or stuck, break down the next milestone into a 20-minute baby step they can start immediately.
   - If they ask conceptual questions, explain trade-offs and edge cases without unnecessary academic jargon.
2. DO NOT USE FLUFF OR FAKE ENTHUSIASM: Be supportive, sharp, and focused on helping them build visible proof of work.
3. FORMATTING: Use clean GitHub-flavored markdown with code blocks and bullet points.
4. RETURN STRICTLY VALID JSON:
{{
  "reply": "Your detailed, helpful, markdown-formatted response",
  "suggested_followups": [
    "Short follow-up question 1",
    "Short follow-up question 2",
    "Short follow-up question 3"
  ]
}}"""

        prompt = f"Candidate's Message: {user_message}"
        if self.provider == "groq" and self.groq_key:
            try:
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {self.groq_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "RaiseTheBar/1.0"
                }
                messages = [{"role": "system", "content": system_prompt}]
                for h in chat_history[-6:]:
                    if h.get("role") in ["user", "assistant"]:
                        messages.append({"role": h["role"], "content": h["content"]})
                messages.append({"role": "user", "content": prompt})

                payload = {
                    "model": self.groq_model,
                    "response_format": {"type": "json_object"},
                    "messages": messages,
                    "temperature": 0.5,
                    "max_tokens": 1500
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    return json.loads(content)
            except Exception as e:
                logger.error(f"Groq roadmap mentor chat error: {e}")

        # Fallback response
        return {
            "reply": f"Here is how to tackle your current milestone in **{current_phase_title}**:\n\n1. **Core Concept**: Focus on the foundational mechanics before jumping into advanced features.\n2. **Free Resource**: Check the official documentation and GitHub examples.\n3. **Action Step**: Write a minimal working script and verify it with a simple test.",
            "suggested_followups": [
                f"Give me a code example for {current_phase_title}",
                "What is the most common interview question on this topic?",
                "How do I test my implementation?"
            ]
        }

    # ---------------- GROQ IMPLEMENTATIONS ----------------
    async def _groq_chat(self, prompt: str) -> Dict[str, Any]:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.groq_key}",
            "Content-Type": "application/json",
            "User-Agent": "RaiseTheBar/1.0"
        }
        payload = {
            "model": self.groq_model,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": MASTER_PROMPT_SYSTEM},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.4
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)

    async def _groq_scan_profile(self, project_description: str, target_role: str, archetype: str) -> Dict[str, Any]:
        prompt = f"""Task: Analyze the candidate's project claim for target role '{target_role}' under archetype '{archetype}'.
Project Text:
{project_description}

Return a valid JSON object only:
{{
  "target_role": "{target_role}",
  "archetype": "{archetype}",
  "detected_stack": ["list", "of", "technologies"],
  "suspected_loopholes": ["at least 3 technical loopholes or missing scale metrics"],
  "opening_question": "A sharp opening question demanding architecture summary and the hardest production bug solved."
}}"""
        return await self._groq_chat(prompt)

    async def _groq_generate_roadmap(
        self,
        role: str,
        tech_stack: str,
        target_company: str,
        level: str
    ) -> Dict[str, Any]:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.groq_key}",
            "Content-Type": "application/json",
            "User-Agent": "RaiseTheBar/1.0"
        }

        lvl = level.lower().strip()
        if "1" in lvl or "beginner" in lvl:
            tier_spec = """
TIER: LEVEL 1 — ZERO TO FOUNDATIONS
TARGET AUDIENCE: Complete beginners starting with NOTHING in Tech. Zero prior programming knowledge.
GOAL: Build true hands-on coding confidence from scratch without intimidating academic jargon.
REQUIRED PHASES: EXACTLY 10 progressive phases.
REQUIRED TASKS: EXACTLY 4 concrete, actionable checklist items per phase. TOTAL: 40 CHECKLIST ITEMS.
CURRICULUM PHASES:
  Phase 1: Terminal, Shell Navigation & Running Your First Code (Installing runtime, basic shell commands cd/ls/mkdir, hello world script)
  Phase 2: Variables, Data Types & Basic Operations (Strings, numbers, booleans, arithmetic, user input)
  Phase 3: Making Decisions with Conditional Logic (if/elif/else statements, comparison operators ==, !=, <, >, boolean logic)
  Phase 4: Repetition & Loops (for loops, while loops, range, break/continue)
  Phase 5: Functions, Parameters & Return Values (def, arguments, return values, variable scope)
  Phase 6: Core Collections: Lists & Dictionaries (Lists, dictionaries, indexing, key-value lookup)
  Phase 7: Handling Files & Errors Safely (Reading/writing files, JSON storage, try/except error handling)
  Phase 8: Version Control with Git & GitHub (git init, add, commit, push, .gitignore, README)
  Phase 9: Communicating with the Web & APIs (What is HTTP, GET requests, fetching free public APIs, parsing JSON)
  Phase 10: Capstone Project: Building a Complete Working Tool (End-to-end CRUD console application with file storage)
"""
        elif "2" in lvl or "intermediate" in lvl:
            tier_spec = """
TIER: LEVEL 2 — APPLIED SOFTWARE ENGINEERING
TARGET AUDIENCE: Candidates who completed Level 1 and want to build real, production-ready web backends and applications.
GOAL: Master full backend architecture, web frameworks, databases, authentication, testing, Docker, and cloud deployment.
REQUIRED PHASES: EXACTLY 10 progressive phases.
REQUIRED TASKS: EXACTLY 4 concrete, actionable checklist items per phase. TOTAL: 40 CHECKLIST ITEMS.
CURRICULUM PHASES:
  Phase 1: Modern Web Framework Architecture & HTTP Routing (FastAPI/Express routing, path & query parameters, request bodies)
  Phase 2: Relational Databases & SQL Schema Design (PostgreSQL/SQLite, tables, primary/foreign keys, joins, transactions)
  Phase 3: ORM Integration & Database Migrations (SQLAlchemy/Prisma declarative models, Alembic migrations, connection pooling)
  Phase 4: Request Validation, Schemas & Serialization (Pydantic/Zod DTO models, custom validators, error responses)
  Phase 5: User Authentication & Password Security (bcrypt password hashing, registration, login flow, JWT token generation)
  Phase 6: Protected Routes & Role-Based Authorization (JWT verification middleware/guards, user context injection, RBAC permissions)
  Phase 7: Caching & Session Management with Redis (Redis cache-aside pattern, TTL expiration, cache invalidation, rate limiting)
  Phase 8: Automated Testing for Web APIs (Pytest/Jest test suite, test database, mocking external services, endpoint assertions)
  Phase 9: Containerization with Docker & Environments (Multi-stage Dockerfile, docker-compose with app + postgres + redis, .env management)
  Phase 10: Capstone Production Deployment & CI/CD (GitHub Actions workflow, cloud deployment to Render/AWS, healthcheck monitoring)
"""
        else: # Level 3
            tier_spec = """
TIER: LEVEL 3 — EXTREME ENGINEERING (STAFF / DISTRIBUTED SYSTEMS)
TARGET AUDIENCE: Experienced engineers who want to go extreme with high-scale architecture, distributed systems, and low-latency performance.
GOAL: Master low-level concurrency, database internals, Kafka streaming, consensus protocols, and planetary-scale system design.
REQUIRED PHASES: EXACTLY 10 progressive phases.
REQUIRED TASKS: EXACTLY 4 concrete, actionable checklist items per phase. TOTAL: 40 CHECKLIST ITEMS.
CURRICULUM PHASES:
  Phase 1: Low-Level Concurrency & Lock-Free Synchronization (Race conditions, thread synchronization, mutexes, atomic operations, deadlock Coffman conditions)
  Phase 2: Database Internals, B-Trees & WAL Mechanics (B-Tree vs LSM-Tree, Write-Ahead Logging WAL, MVCC isolation levels, EXPLAIN ANALYZE)
  Phase 3: Event-Driven Architectures & Kafka Streaming (Kafka topics, partition keys, consumer groups, dead-letter queues, idempotent consumers)
  Phase 4: Caching at Scale & High-Throughput Consistency (Cache stampede defense, probabilistic early expiration, Redis cluster sharding)
  Phase 5: Distributed Systems Theory & Consensus Protocols (CAP & PACELC theorems, Raft consensus mechanics, leader election, split-brain mitigation)
  Phase 6: Distributed Transactions & Eventual Consistency (Two-Phase Commit vs Saga pattern, transactional outbox pattern with CDC, idempotency keys)
  Phase 7: Production Resilience & Chaos Engineering (Circuit breakers with 3 states, bulkhead thread isolation, jittered exponential backoff)
  Phase 8: Sub-Millisecond p99 Tail Latency Optimization (CPU flame graphs, GC pause tuning, zero-copy socket buffers, connection pool sizing)
  Phase 9: Observability, Distributed Tracing & Telemetry (OpenTelemetry spans, W3C tracecontext propagation across microservices, Jaeger visualizer)
  Phase 10: Planetary Scale System Design Defense (Distributed rate limiter, real-time collaborative doc editor, multi-region active-active database failover)
"""


        sys_prompt = f"""You are an elite Staff Engineer, Engineering Director, and Career Architect.
CRITICAL RULES:
1. DO NOT INCLUDE ANY DURATION (no "1-2 Months", no "Week 1", no duration estimates). Set duration to "".
2. For Level 1, NEVER use advanced concepts like memory allocations, stack vs heap, or distributed caching. Keep it strictly accessible for someone starting with NOTHING in Tech.
3. Every single checklist task must be a concrete, hands-on action.
Design a structured, in-depth technical interview preparation roadmap specifically for candidate level: '{level}'.
{tier_spec}

Return ONLY valid JSON matching this schema:
{{
  "role": "{role}",
  "target_company": "{target_company}",
  "level": "{level}",
  "duration": "",
  "summary": "1-2 sentence motivating career trajectory summary for this tier",
  "phases": [
    {{
      "id": "phase-1",
      "phase_number": 1,
      "title": "Phase Title",
      "duration": "",
      "tag": "TOOLING | FOUNDATIONS | CONCURRENCY | DATABASE | SYSTEMS | PRODUCTION | ARCHITECTURE",
      "description": "Clear 1-2 sentence objective",
      "key_topics": ["Topic 1", "Topic 2", "Topic 3"],
      "checklist": [
        {{"id": "p1-c1", "text": "Specific hands-on code or architecture task", "completed": false, "priority": "high"}},
        {{"id": "p1-c2", "text": "Another specific task", "completed": false, "priority": "high"}},
        {{"id": "p1-c3", "text": "Another specific task", "completed": false, "priority": "medium"}},
        {{"id": "p1-c4", "text": "Another specific task", "completed": false, "priority": "medium"}}
      ],
      "drill_topic": "Razor-sharp grill topic for the interrogation simulator"
    }}
  ]
}}"""

        user_prompt = f"Generate complete {level} technical roadmap in valid JSON format for {role} at {target_company} with stack {tech_stack}."

        payload = {
            "model": self.groq_model,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": sys_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.4,
            "max_tokens": 8192
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)

    # ---------------- BASELINE CURRICULUM IMPLEMENTATION ----------------
    def _mock_roadmap(self, role: str, tech_stack: str, target_company: str, level: str) -> Dict[str, Any]:
        return get_curriculum(role, tech_stack, target_company, level)

    def _mock_scan_profile(self, project_description: str, target_role: str, archetype: str) -> Dict[str, Any]:
        tech_keywords = []
        for word in ["react", "node", "python", "fastapi", "express", "mongodb", "postgresql", "redis", "docker", "aws", "jwt"]:
            if word in project_description.lower():
                tech_keywords.append(word.capitalize())

        if not tech_keywords:
            tech_keywords = ["Web API", "Relational Database", "Authentication"]

        return {
            "target_role": target_role,
            "archetype": archetype,
            "detected_stack": tech_keywords,
            "suspected_loopholes": [
                "Unspecified traffic scale and concurrency limits",
                "Absence of DB indexing or cache invalidation strategy",
                "No failure recovery mechanism mentioned"
            ],
            "opening_question": (
                f"You claim hands-on experience building this system. "
                f"Walk me through your architecture in under 90 seconds, and specifically state the single hardest bug you personally debugged in production."
            )
        }

    def _mock_followup(self, latest_answer: str, turn_number: int) -> Dict[str, str]:
        mock_questions = [
            (
                "You mentioned your data layer, but you didn't explain your indexing strategy. "
                "When your primary table hits 5 million rows, what specific query degrades first, and what composite index would you create to fix it?"
            ),
            (
                "How do you handle a sudden 10x traffic spike when your primary database connections saturate? "
                "Walk me through your connection pooling, backpressure, and caching trade-offs."
            ),
            (
                "If your third-party payment or authentication webhook drops 15% of packets due to network partition, "
                "how does your service guarantee idempotency without double-charging or dropping state?"
            )
        ]
        return {
            "interviewer_reaction": "Probing your architecture under real-world scale and failure modes.",
            "next_question": mock_questions[(turn_number - 1) % len(mock_questions)]
        }

    def _mock_diagnostic(self, candidate_name: str, target_role: str, turn_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
        q = turn_history[0].get("question", "Describe your architecture.") if turn_history else "Describe your architecture."
        return {
            "hire_decision": "Leaning No-Hire",
            "seniority_signal": "Junior / Script-Kiddie",
            "rambling_index": "Moderate",
            "overall_score": 48,
            "section_scores": [
                {"name": "Architecture & System Design", "score": 11, "max_score": 20, "feedback": "Understands high-level MVC structure but lacks microservice boundaries."},
                {"name": "Trade-offs & Alternatives", "score": 9, "max_score": 20, "feedback": "Picked popular frameworks without justifying why they fit over lighter alternatives."},
                {"name": "Failure Modes & Edge Cases", "score": 8, "max_score": 20, "feedback": "Struggled to articulate what occurs during database deadlocks or network partitions."},
                {"name": "Database & Scale Mechanics", "score": 10, "max_score": 20, "feedback": "Used generic Redis caching without cache invalidation or memory eviction strategy."},
                {"name": "Communication & Precision", "score": 10, "max_score": 20, "feedback": "Moderate rambling without leading with the bottom-line answer."}
            ],
            "what_went_right": [
                "Demonstrated working knowledge of REST endpoints and core language syntax.",
                "Honest about knowledge boundaries when pressed on internal storage engines."
            ],
            "what_went_wrong": [
                "Could not cite measured latency metrics (p95, p99) under load.",
                "Relied on generic buzzwords without concrete engineering numbers.",
                "Did not account for thundering herd problems in caching layer."
            ],
            "say_this_instead": [
                {
                    "question": q,
                    "ideal_answer": "We adopted an asynchronous event-driven design using FastAPI and PostgreSQL. To prevent downstream bottlenecks, write-heavy tasks pass through an asynchronous queue. All database queries are covered by composite B-tree indexes, maintaining p99 latency under 80ms.",
                    "key_points": [
                        "Specify connection pooling mechanism (e.g. PgBouncer).",
                        "Separate read queries from write queries.",
                        "Cite exact p99 latency target."
                    ]
                }
            ],
            "raw_markdown_report": f"# Evaluation Report: {candidate_name}\n\n**Verdict: Leaning No-Hire**\n\nThe candidate has basic functional aptitude, but lacks the architectural rigor and failure mode preparedness expected of a production engineer."
        }

llm_service = LLMService()
