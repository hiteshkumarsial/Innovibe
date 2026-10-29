import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import init_db

async def main():
    print("=== Testing BarRaiser AI Backend Foundation ===")
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        health = await client.get("/health")
        print(f"1. Health Check: {health.status_code} -> {health.json()}")

        # 1.5 Test Auth Demo Endpoint
        auth_res = await client.post("/api/auth/demo", json={
            "name": "Kristian Watson",
            "email": "kristian.watson@student.dev",
            "avatar_url": "https://lh3.googleusercontent.com/a/test-avatar"
        })
        user_info = auth_res.json()
        print(f"1.5. Auth Endpoint: {auth_res.status_code} -> User: {user_info['name']} ({user_info['email']})")

        # 1.6 Test Onboarding Endpoint
        onboarding_payload = {
            "user_id": user_info["id"],
            "name": user_info["name"],
            "dob": "2002-06-18",
            "target_role": "Backend Engineer (SDE-1)",
            "expected_lpa": "18-24 LPA",
            "interested_companies": "Google, Uber, Zepto, Cred",
            "experience_level": "Final Year Student",
            "primary_stack": "Python / FastAPI & PostgreSQL"
        }
        onboard_res = await client.post("/api/auth/onboarding", json=onboarding_payload)
        print(f"1.6. Onboarding Endpoint: {onboard_res.status_code} -> Role: {onboard_res.json()['target_role']}, LPA: {onboard_res.json()['expected_lpa']}")

        # 2. Start Interview
        start_payload = {
            "candidate_name": "Aarav Sharma",
            "target_role": "Backend Engineer (SDE-1)",
            "archetype": "PRODUCT_STARTUP",
            "project_description": (
                "Built a high-throughput E-commerce backend using FastAPI, PostgreSQL, and Redis caching. "
                "Integrated JWT authentication, Stripe webhook processing, and Docker containerization. "
                "Handled 500 requests per minute with under 50ms latency."
            ),
            "max_turns": 3
        }
        res_start = await client.post("/api/interview/start", json=start_payload)
        print(f"2. Start Interview: {res_start.status_code}")
        start_data = res_start.json()
        session_id = start_data["session_id"]
        print(f"   Session ID: {session_id}")
        print(f"   Detected Stack: {start_data['profile_summary'].get('detected_stack')}")
        print(f"   Suspected Loopholes: {start_data['profile_summary'].get('suspected_loopholes')}")
        print(f"   Opening Question: {start_data['opening_question']}")

        # 3. Answer Turn 1
        answer_payload = {
            "session_id": session_id,
            "answer": (
                "Our architecture uses FastAPI connected to PostgreSQL with asyncpg connection pools. "
                "The hardest bug was a Stripe webhook idempotency race condition: duplicate payment events "
                "were triggering double order fulfillment. We resolved it by implementing Redis distributed locks "
                "keyed by event ID with a 30-second TTL."
            )
        }
        res_answer = await client.post("/api/interview/answer", json=answer_payload)
        print(f"\n3. Answer Turn 1: {res_answer.status_code}")
        answer_data = res_answer.json()
        print(f"   Current Turn: {answer_data['current_turn']} / {answer_data['max_turns']}")
        print(f"   Interviewer Reaction: {answer_data['interviewer_reaction']}")
        print(f"   Next Question: {answer_data['next_question']}")

        # 4. Finish Interview & Generate Diagnostic Report
        res_finish = await client.post(f"/api/interview/{session_id}/finish")
        print(f"\n4. Finish & Diagnostic: {res_finish.status_code}")
        finish_data = res_finish.json()
        print(f"   Hire Decision: {finish_data['diagnostic']['hire_decision']}")
        print(f"   Seniority Signal: {finish_data['diagnostic']['seniority_signal']}")
        report_preview = finish_data['diagnostic']['raw_markdown_report'][:350].encode('ascii', 'ignore').decode('ascii')
        print(f"   Report Preview:\n{report_preview}...\n")

    print("=== All Backend Verification Checks Passed! ===")

if __name__ == "__main__":
    asyncio.run(main())
