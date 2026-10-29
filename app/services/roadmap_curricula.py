"""
Battle-tested, production-ready engineering curricula across 3 career tiers:
- Level 1 (Zero to Foundations): 10 Phases x 4 Tasks = 40 Tasks (For candidates starting with NOTHING in Tech)
- Level 2 (Applied Software Engineering): 10 Phases x 4 Tasks = 40 Tasks (For candidates who completed Level 1)
- Level 3 (Extreme Engineering): 10 Phases x 4 Tasks = 40 Tasks (For candidates who want to go extreme)
"""
from typing import Dict, Any

def get_curriculum(role: str, tech_stack: str, target_company: str, level: str) -> Dict[str, Any]:
    lvl = level.lower().strip()
    if "1" in lvl or "beginner" in lvl:
        return get_beginner_curriculum(role, tech_stack, target_company)
    elif "2" in lvl or "intermediate" in lvl:
        return get_intermediate_curriculum(role, tech_stack, target_company)
    else:
        return get_advanced_curriculum(role, tech_stack, target_company)

def get_beginner_curriculum(role: str, tech_stack: str, target_company: str) -> Dict[str, Any]:
    return {
        "role": role,
        "target_company": target_company,
        "level": "Level 1",
        "duration": "",
        "summary": f"Level 1: Zero to Foundations for {role}. 10 progressive phases and 40 hands-on deliverables designed specifically for someone starting with nothing in Tech.",
        "phases": [
            {
                "id": "phase-1",
                "phase_number": 1,
                "title": "Terminal, Shell Navigation & Running Your First Code",
                "duration": "",
                "tag": "SETUP",
                "description": "Install your coding environment, master essential command-line navigation, and run your very first script.",
                "key_topics": ["Terminal Commands", "Environment Setup", "Running Code"],
                "checklist": [
                    {"id": "b1-1", "text": "Install runtime (Python/Node) and verify version in terminal", "completed": False, "priority": "high"},
                    {"id": "b1-2", "text": "Master 5 essential terminal commands: cd, ls/dir, pwd, mkdir, and clear", "completed": False, "priority": "high"},
                    {"id": "b1-3", "text": "Create hello_world script in a code editor and run it from the command line", "completed": False, "priority": "high"},
                    {"id": "b1-4", "text": "Practice passing simple inputs into the script and printing formatted terminal output", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Terminal Navigation & Script Execution Basics"
            },
            {
                "id": "phase-2",
                "phase_number": 2,
                "title": "Variables, Data Types & Basic Operations",
                "duration": "",
                "tag": "PRIMITIVES",
                "description": "Learn how computers store numbers, text, and true/false values, and perform basic calculations.",
                "key_topics": ["Variables & Naming", "Numbers & Strings", "Print Debugging"],
                "checklist": [
                    {"id": "b2-1", "text": "Declare variables with clear names for strings, integers, floats, and booleans", "completed": False, "priority": "high"},
                    {"id": "b2-2", "text": "Perform arithmetic operations and format text with string interpolation (f-strings)", "completed": False, "priority": "high"},
                    {"id": "b2-3", "text": "Accept interactive user input from the terminal and convert types safely", "completed": False, "priority": "medium"},
                    {"id": "b2-4", "text": "Identify and fix common syntax and type errors using print debugging", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Variables, Data Types & Basic Type Conversions"
            },
            {
                "id": "phase-3",
                "phase_number": 3,
                "title": "Making Decisions with Conditional Logic",
                "duration": "",
                "tag": "LOGIC",
                "description": "Teach your program to make decisions based on dynamic conditions using if, elif, and else statements.",
                "key_topics": ["If/Else Branches", "Comparison Operators", "Boolean Logic"],
                "checklist": [
                    {"id": "b3-1", "text": "Write if, elif, and else branches with comparison operators (==, !=, <, >)", "completed": False, "priority": "high"},
                    {"id": "b3-2", "text": "Combine multiple conditions using logical operators (and, or, not)", "completed": False, "priority": "high"},
                    {"id": "b3-3", "text": "Build a simple terminal decision tool (e.g. grade calculator or password checker)", "completed": False, "priority": "medium"},
                    {"id": "b3-4", "text": "Handle unexpected or invalid user choices cleanly using default else fallback", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Conditional Logic & Boolean Decision Trees"
            },
            {
                "id": "phase-4",
                "phase_number": 4,
                "title": "Loops & Repetition",
                "duration": "",
                "tag": "LOOPS",
                "description": "Automate repetitive tasks and iterate over collections of data effortlessly.",
                "key_topics": ["For Loops", "While Loops", "Loop Control"],
                "checklist": [
                    {"id": "b4-1", "text": "Use for loops to repeat actions and iterate over ranges of numbers", "completed": False, "priority": "high"},
                    {"id": "b4-2", "text": "Use while loops for actions that repeat until a specific condition changes", "completed": False, "priority": "high"},
                    {"id": "b4-3", "text": "Control loop execution using break to exit early and continue to skip steps", "completed": False, "priority": "medium"},
                    {"id": "b4-4", "text": "Build an interactive guessing game with a loop, score tracker, and replay option", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Loop Execution & Iteration Mechanics"
            },
            {
                "id": "phase-5",
                "phase_number": 5,
                "title": "Functions, Parameters & Clean Code Structure",
                "duration": "",
                "tag": "FUNCTIONS",
                "description": "Organize your code into reusable, modular blocks that take inputs and return outputs.",
                "key_topics": ["Function Definition", "Parameters & Arguments", "Return Values"],
                "checklist": [
                    {"id": "b5-1", "text": "Define custom functions using descriptive verb-based names", "completed": False, "priority": "high"},
                    {"id": "b5-2", "text": "Pass parameters into functions and return calculated results using return", "completed": False, "priority": "high"},
                    {"id": "b5-3", "text": "Understand the difference between local function variables and global variables", "completed": False, "priority": "medium"},
                    {"id": "b5-4", "text": "Refactor repeated code into a reusable helper function with docstrings", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Function Scoping & Modular Code Organization"
            },
            {
                "id": "phase-6",
                "phase_number": 6,
                "title": "Core Collections: Lists & Dictionaries",
                "duration": "",
                "tag": "COLLECTIONS",
                "description": "Store and manipulate groups of related items using ordered lists and key-value dictionaries.",
                "key_topics": ["Lists & Indexing", "Dictionaries & Keys", "Nested Data"],
                "checklist": [
                    {"id": "b6-1", "text": "Create lists, access elements by index, and use append, pop, and slice", "completed": False, "priority": "high"},
                    {"id": "b6-2", "text": "Create dictionaries to look up values by key and iterate over key-value pairs", "completed": False, "priority": "high"},
                    {"id": "b6-3", "text": "Store lists of dictionaries to model real-world records (e.g. users, products)", "completed": False, "priority": "medium"},
                    {"id": "b6-4", "text": "Sort and filter collections of data using simple loops and conditions", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "List Manipulation & Dictionary Key-Value Access"
            },
            {
                "id": "phase-7",
                "phase_number": 7,
                "title": "Handling Files & Errors Safely",
                "duration": "",
                "tag": "PERSISTENCE",
                "description": "Save your program's data to disk permanently and handle unexpected errors without crashing.",
                "key_topics": ["File Reading & Writing", "JSON Storage", "Try/Except Blocks"],
                "checklist": [
                    {"id": "b7-1", "text": "Open, read, and write plain text files using context managers (with open)", "completed": False, "priority": "high"},
                    {"id": "b7-2", "text": "Save and load structured data using the built-in JSON module", "completed": False, "priority": "high"},
                    {"id": "b7-3", "text": "Wrap risky operations (like user input or file reading) in try/except blocks", "completed": False, "priority": "medium"},
                    {"id": "b7-4", "text": "Display friendly, human-readable error messages instead of raw stack traces", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "File I/O Persistence & Safe Error Handling"
            },
            {
                "id": "phase-8",
                "phase_number": 8,
                "title": "Version Control with Git & GitHub",
                "duration": "",
                "tag": "TOOLING",
                "description": "Track changes in your code, revert mistakes, and publish your code portfolio on GitHub.",
                "key_topics": ["Git Init & Commit", "Push to GitHub", ".gitignore Setup"],
                "checklist": [
                    {"id": "b8-1", "text": "Initialize a Git repository (git init) and configure your user name and email", "completed": False, "priority": "high"},
                    {"id": "b8-2", "text": "Stage and commit changes (git add, git commit) with clear, descriptive messages", "completed": False, "priority": "high"},
                    {"id": "b8-3", "text": "Create a .gitignore file to exclude temporary files and private credentials", "completed": False, "priority": "medium"},
                    {"id": "b8-4", "text": "Push your repository to GitHub (git push) and write a clean README.md", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Git Commits, Branches & Remote Repository Synchronization"
            },
            {
                "id": "phase-9",
                "phase_number": 9,
                "title": "Communicating with the Web & APIs",
                "duration": "",
                "tag": "NETWORKING",
                "description": "Understand how the Internet works and fetch live data from free web APIs.",
                "key_topics": ["HTTP Requests (GET)", "Public APIs", "Parsing JSON Responses"],
                "checklist": [
                    {"id": "b9-1", "text": "Understand the basics of HTTP: what are URLs, clients, servers, and status codes", "completed": False, "priority": "high"},
                    {"id": "b9-2", "text": "Install an HTTP library (requests/httpx/fetch) and send your first GET request", "completed": False, "priority": "high"},
                    {"id": "b9-3", "text": "Fetch data from a free public API (e.g. weather, quotes, or jokes) and parse JSON", "completed": False, "priority": "medium"},
                    {"id": "b9-4", "text": "Format and display API response data cleanly in your terminal interface", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "HTTP Basics & External API Integration"
            },
            {
                "id": "phase-10",
                "phase_number": 10,
                "title": "Capstone Project: Building a Complete Working Tool",
                "duration": "",
                "tag": "CAPSTONE",
                "description": "Combine everything you learned into a complete, working console application from scratch and publish it.",
                "key_topics": ["Project Architecture", "Full CRUD Workflow", "Project Showcase"],
                "checklist": [
                    {"id": "b10-1", "text": "Plan the structure and user menu for a standalone application (e.g. Task Manager)", "completed": False, "priority": "high"},
                    {"id": "b10-2", "text": "Implement full CRUD operations (Create, Read, Update, Delete) with persistent JSON storage", "completed": False, "priority": "high"},
                    {"id": "b10-3", "text": "Add robust input validation, clear error messages, and clean interactive prompts", "completed": False, "priority": "medium"},
                    {"id": "b10-4", "text": "Publish the completed project to GitHub with documentation and setup instructions", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "End-to-End Application Architecture & CRUD Implementation"
            }
        ]
    }

def get_intermediate_curriculum(role: str, tech_stack: str, target_company: str) -> Dict[str, Any]:
    return {
        "role": role,
        "target_company": target_company,
        "level": "Level 2",
        "duration": "",
        "summary": f"Level 2: Applied Software Engineering for {role} targeting {target_company}. 10 progressive phases and 40 production deliverables across Web APIs, Databases, Auth, Testing, Docker, and Cloud Deployment.",
        "phases": [
            {
                "id": "phase-1",
                "phase_number": 1,
                "title": "Modern Web Framework Architecture & HTTP Routing",
                "duration": "",
                "tag": "BACKEND",
                "description": "Scaffold a production backend service with structured route handlers, query parameters, and JSON responses.",
                "key_topics": ["FastAPI / Express Routing", "HTTP Verbs & Status Codes", "Dependency Injection"],
                "checklist": [
                    {"id": "i1-1", "text": "Scaffold a clean web project with organized router directories and configuration", "completed": False, "priority": "high"},
                    {"id": "i1-2", "text": "Implement RESTful route handlers for GET, POST, PUT, and DELETE operations", "completed": False, "priority": "high"},
                    {"id": "i1-3", "text": "Extract path parameters, query parameters, and request headers cleanly", "completed": False, "priority": "medium"},
                    {"id": "i1-4", "text": "Configure CORS middleware and centralized error-handling middlewares", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "RESTful Routing & HTTP Middleware Architecture"
            },
            {
                "id": "phase-2",
                "phase_number": 2,
                "title": "Relational Databases & SQL Schema Design",
                "duration": "",
                "tag": "DATABASE",
                "description": "Model entities, enforce foreign key constraints, and write performant relational database queries.",
                "key_topics": ["PostgreSQL / SQLite", "Relational Schema Design", "Joins & Aggregations"],
                "checklist": [
                    {"id": "i2-1", "text": "Design normalized database tables with primary keys, foreign keys, and indexes", "completed": False, "priority": "high"},
                    {"id": "i2-2", "text": "Write and execute raw SQL queries covering multi-table INNER and LEFT JOINs", "completed": False, "priority": "high"},
                    {"id": "i2-3", "text": "Execute atomic multi-step operations using database transactions (BEGIN, COMMIT, ROLLBACK)", "completed": False, "priority": "high"},
                    {"id": "i2-4", "text": "Create database indexes on frequently queried columns and verify index usage", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "SQL Normalization & Relational Transaction Integrity"
            },
            {
                "id": "phase-3",
                "phase_number": 3,
                "title": "ORM Integration & Database Migrations",
                "duration": "",
                "tag": "DATABASE",
                "description": "Connect your backend to PostgreSQL with an ORM and safely manage database evolution using migrations.",
                "key_topics": ["SQLAlchemy / Prisma", "Declarative Models", "Alembic Migrations"],
                "checklist": [
                    {"id": "i3-1", "text": "Define declarative models representing application domain entities with relationships", "completed": False, "priority": "high"},
                    {"id": "i3-2", "text": "Configure database connection pooling with max overflow and recycle limits", "completed": False, "priority": "high"},
                    {"id": "i3-3", "text": "Initialize database migration tool (Alembic/Prisma) and generate initial migration", "completed": False, "priority": "high"},
                    {"id": "i3-4", "text": "Apply forward and rollback migrations without data loss in local environment", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "ORM Mapping & Safe Schema Migration Workflows"
            },
            {
                "id": "phase-4",
                "phase_number": 4,
                "title": "Request Validation, Schemas & Serialization",
                "duration": "",
                "tag": "BACKEND",
                "description": "Enforce strict data contracts for all API inputs and outputs with automated validation and documentation.",
                "key_topics": ["Pydantic / Zod", "DTO Contracts", "Automated OpenAPI Docs"],
                "checklist": [
                    {"id": "i4-1", "text": "Define strict Pydantic/Zod schemas for incoming request bodies and response payloads", "completed": False, "priority": "high"},
                    {"id": "i4-2", "text": "Implement custom field validators for business rules (e.g. password strength, email)", "completed": False, "priority": "high"},
                    {"id": "i4-3", "text": "Exclude internal database fields (hashed passwords, secrets) from response serialization", "completed": False, "priority": "medium"},
                    {"id": "i4-4", "text": "Verify interactive OpenAPI / Swagger documentation matches actual API endpoints", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Data Serialization, Validation & API Contract Design"
            },
            {
                "id": "phase-5",
                "phase_number": 5,
                "title": "User Authentication & Password Security",
                "duration": "",
                "tag": "SECURITY",
                "description": "Build secure user registration and login workflows using industry-standard password hashing and JWT tokens.",
                "key_topics": ["bcrypt / Argon2", "JWT Issuance & Signing", "User Registration"],
                "checklist": [
                    {"id": "i5-1", "text": "Hash passwords using bcrypt with a secure work factor before storing in database", "completed": False, "priority": "high"},
                    {"id": "i5-2", "text": "Verify password hashes on login attempts and return meaningful auth error codes", "completed": False, "priority": "high"},
                    {"id": "i5-3", "text": "Generate signed JWT access tokens containing user claims and explicit expiration times", "completed": False, "priority": "high"},
                    {"id": "i5-4", "text": "Store signing secrets in environment variables and never commit keys to Git", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Secure Password Hashing & JWT Token Generation"
            },
            {
                "id": "phase-6",
                "phase_number": 6,
                "title": "Protected Routes & Role-Based Authorization",
                "duration": "",
                "tag": "SECURITY",
                "description": "Protect private API endpoints, extract authenticated user identity, and enforce role permissions.",
                "key_topics": ["Auth Guards / Dependencies", "RBAC Permissions", "Token Invalidation"],
                "checklist": [
                    {"id": "i6-1", "text": "Implement an authentication dependency / guard that validates JWT from Bearer header", "completed": False, "priority": "high"},
                    {"id": "i6-2", "text": "Inject the current authenticated user object directly into protected route handlers", "completed": False, "priority": "high"},
                    {"id": "i6-3", "text": "Enforce Role-Based Access Control (RBAC) restricting admin actions from regular users", "completed": False, "priority": "medium"},
                    {"id": "i6-4", "text": "Handle token expiration and return 401 Unauthorized with clean guidance to client", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Authentication Guards & Role-Based Authorization"
            },
            {
                "id": "phase-7",
                "phase_number": 7,
                "title": "Caching & Session Management with Redis",
                "duration": "",
                "tag": "PERFORMANCE",
                "description": "Accelerate response times using Redis caching, TTL expiration, and rate-limiting middleware.",
                "key_topics": ["Redis Cache-Aside", "TTL Expiration", "Rate Limiting"],
                "checklist": [
                    {"id": "i7-1", "text": "Connect backend to local Redis server with robust reconnection handling", "completed": False, "priority": "high"},
                    {"id": "i7-2", "text": "Implement the cache-aside pattern for heavy database read endpoints with TTL", "completed": False, "priority": "high"},
                    {"id": "i7-3", "text": "Invalidate or refresh cached keys immediately whenever records are updated or deleted", "completed": False, "priority": "medium"},
                    {"id": "i7-4", "text": "Implement a basic IP/user rate limiter using Redis to protect against brute-force calls", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Cache-Aside Architecture & Cache Invalidation Strategies"
            },
            {
                "id": "phase-8",
                "phase_number": 8,
                "title": "Automated Testing for Web APIs",
                "duration": "",
                "tag": "TESTING",
                "description": "Write automated unit and integration tests to verify endpoints, database models, and authentication.",
                "key_topics": ["Pytest / Jest", "HTTP Test Client", "Mocking & Test DB"],
                "checklist": [
                    {"id": "i8-1", "text": "Set up a test runner (Pytest) with an isolated test SQLite/PostgreSQL database", "completed": False, "priority": "high"},
                    {"id": "i8-2", "text": "Write integration tests verifying registration, login, and token generation endpoints", "completed": False, "priority": "high"},
                    {"id": "i8-3", "text": "Test protected routes with valid, expired, and missing tokens to assert 401/403 codes", "completed": False, "priority": "medium"},
                    {"id": "i8-4", "text": "Mock external services and measure code coverage across core API routes", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Automated API Integration Testing & Fixture Design"
            },
            {
                "id": "phase-9",
                "phase_number": 9,
                "title": "Containerization with Docker & Environments",
                "duration": "",
                "tag": "DEVOPS",
                "description": "Package the application and its dependencies into reproducible Docker containers orchestrated with docker-compose.",
                "key_topics": ["Dockerfile", "docker-compose", "Multi-Stage Builds"],
                "checklist": [
                    {"id": "i9-1", "text": "Write a multi-stage Dockerfile minimizing image size and running as non-root user", "completed": False, "priority": "high"},
                    {"id": "i9-2", "text": "Create docker-compose.yml orchestrating the API service, PostgreSQL, and Redis", "completed": False, "priority": "high"},
                    {"id": "i9-3", "text": "Configure named volumes for PostgreSQL data persistence across container restarts", "completed": False, "priority": "medium"},
                    {"id": "i9-4", "text": "Manage configuration and database credentials using environment files (.env)", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Docker Containerization & Multi-Container Orchestration"
            },
            {
                "id": "phase-10",
                "phase_number": 10,
                "title": "Capstone Production Deployment & CI/CD",
                "duration": "",
                "tag": "PRODUCTION",
                "description": "Deploy the complete web API to the cloud with an automated CI/CD pipeline and health check monitoring.",
                "key_topics": ["GitHub Actions CI", "Cloud Hosting (Render/AWS)", "Production Health Checks"],
                "checklist": [
                    {"id": "i10-1", "text": "Configure a GitHub Actions workflow to run the test suite automatically on every push", "completed": False, "priority": "high"},
                    {"id": "i10-2", "text": "Deploy the containerized backend to a cloud hosting platform (Render, Railway, or AWS)", "completed": False, "priority": "high"},
                    {"id": "i10-3", "text": "Implement a dedicated /health endpoint verifying database and Redis connectivity", "completed": False, "priority": "medium"},
                    {"id": "i10-4", "text": "Document the live API with endpoint guides, cURL examples, and environment setup in README", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Continuous Integration Pipelines & Cloud Production Deployment"
            }
        ]
    }

def get_advanced_curriculum(role: str, tech_stack: str, target_company: str) -> Dict[str, Any]:
    return {
        "role": role,
        "target_company": target_company,
        "level": "Level 3",
        "duration": "",
        "summary": f"Level 3: Extreme Engineering for {role} targeting {target_company}. 10 hardcore phases and 40 staff-level deliverables covering Concurrency, Kafka, Database Internals, Consensus, and Planetary Scale.",
        "phases": [
            {
                "id": "phase-1",
                "phase_number": 1,
                "title": "Low-Level Concurrency & Lock-Free Synchronization",
                "duration": "",
                "tag": "CONCURRENCY",
                "description": "Master OS thread synchronization, atomic primitives, read-write locks, and race condition triage.",
                "key_topics": ["Race Conditions & Mutexes", "Atomic Compare-And-Swap", "Deadlock Coffman Conditions"],
                "checklist": [
                    {"id": "a1-1", "text": "Reproduce a race condition on a shared memory counter and resolve using atomic primitives", "completed": False, "priority": "high"},
                    {"id": "a1-2", "text": "Implement a read-write lock favoring high read-concurrency with safe exclusive write lock acquisition", "completed": False, "priority": "high"},
                    {"id": "a1-3", "text": "Simulate and eliminate deadlock scenarios by enforcing strict global lock hierarchy ordering", "completed": False, "priority": "high"},
                    {"id": "a1-4", "text": "Size thread pools accurately based on CPU-bound (N_cores) vs I/O-bound formulas", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Thread Contention, Atomic Primitives & Deadlock Prevention"
            },
            {
                "id": "phase-2",
                "phase_number": 2,
                "title": "Database Internals, B-Trees & WAL Mechanics",
                "duration": "",
                "tag": "DATABASE",
                "description": "Understand storage engine layout, Write-Ahead Logs, MVCC transaction isolation, and query execution plans.",
                "key_topics": ["B-Tree vs LSM-Tree", "Write-Ahead Logging (WAL)", "MVCC & Isolation Levels"],
                "checklist": [
                    {"id": "a2-1", "text": "Explain trade-offs between B-Tree (read-optimized) and LSM-Tree (write-optimized) storage engines", "completed": False, "priority": "high"},
                    {"id": "a2-2", "text": "Trace Write-Ahead Log (WAL) crash recovery and checkpointing mechanics under power failure", "completed": False, "priority": "high"},
                    {"id": "a2-3", "text": "Demonstrate dirty reads, non-repeatable reads, and phantom reads across 4 SQL isolation levels", "completed": False, "priority": "high"},
                    {"id": "a2-4", "text": "Profile slow queries using EXPLAIN ANALYZE, diagnosing sequential scans vs index bitmap scans", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Storage Engine Mechanics, WAL Logging & Query Profiling"
            },
            {
                "id": "phase-3",
                "phase_number": 3,
                "title": "Event-Driven Systems & Kafka Streaming",
                "duration": "",
                "tag": "STREAMING",
                "description": "Design resilient event streaming architectures using Apache Kafka, partitions, consumer groups, and dead-letter queues.",
                "key_topics": ["Kafka Architecture", "Partition Keys & Ordering", "Exactly-Once Semantics"],
                "checklist": [
                    {"id": "a3-1", "text": "Design topic partitioning strategies guaranteeing per-entity ordering using consistent hashing keys", "completed": False, "priority": "high"},
                    {"id": "a3-2", "text": "Configure consumer groups, handle partition rebalancing gracefully, and tune commit offsets", "completed": False, "priority": "high"},
                    {"id": "a3-3", "text": "Implement Dead-Letter Queues (DLQ) with exponential backoff retries for poisoned messages", "completed": False, "priority": "high"},
                    {"id": "a3-4", "text": "Achieve idempotent message processing by checking unique message IDs against persistent store", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Kafka Partition Ordering, Consumer Rebalancing & DLQ Patterns"
            },
            {
                "id": "phase-4",
                "phase_number": 4,
                "title": "Caching at Scale & High-Throughput Consistency",
                "duration": "",
                "tag": "PERFORMANCE",
                "description": "Mitigate high-traffic cache failures including stampedes, dogpiling, and dual-write inconsistencies.",
                "key_topics": ["Cache Stampede Defense", "Probabilistic Early Expiration", "Redis Cluster Sharding"],
                "checklist": [
                    {"id": "a4-1", "text": "Defend against cache stampede / dogpiling using mutex locking and probabilistic early expiration (XFetch)", "completed": False, "priority": "high"},
                    {"id": "a4-2", "text": "Resolve database-cache dual-write consistency issues using transactional outbox and CDC", "completed": False, "priority": "high"},
                    {"id": "a4-3", "text": "Design consistent hashing ring distributing keys across multiple Redis shards with virtual nodes", "completed": False, "priority": "high"},
                    {"id": "a4-4", "text": "Benchmark Redis throughput differences between pipeline batching, multi/exec transactions, and Lua scripts", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Cache Stampede Mitigation & High-Throughput Sharding"
            },
            {
                "id": "phase-5",
                "phase_number": 5,
                "title": "Distributed Systems Theory & Consensus Protocols",
                "duration": "",
                "tag": "DISTRIBUTED",
                "description": "Apply CAP and PACELC theorems, master Raft consensus, leader election, and split-brain resolution.",
                "key_topics": ["CAP & PACELC Theorems", "Raft Consensus Protocol", "Split-Brain Resolution"],
                "checklist": [
                    {"id": "a5-1", "text": "Evaluate trade-offs under network partitions using PACELC theorem for concrete system architectures", "completed": False, "priority": "high"},
                    {"id": "a5-2", "text": "Walk through Raft leader election, heartbeats, candidate terms, and quorum majority voting", "completed": False, "priority": "high"},
                    {"id": "a5-3", "text": "Explain log replication mechanics and uncommitted log entry rollback upon leader failover", "completed": False, "priority": "high"},
                    {"id": "a5-4", "text": "Design fencing tokens and generation clocks to prevent split-brain zombies from writing corrupted state", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Raft Consensus, Leader Election & Split-Brain Prevention"
            },
            {
                "id": "phase-6",
                "phase_number": 6,
                "title": "Distributed Transactions & Eventual Consistency",
                "duration": "",
                "tag": "ARCHITECTURE",
                "description": "Orchestrate multi-service transactions without blocking locks using the Saga pattern and transactional outbox.",
                "key_topics": ["Two-Phase Commit (2PC) vs Saga", "Transactional Outbox Pattern", "Idempotency Keys"],
                "checklist": [
                    {"id": "a6-1", "text": "Compare 2PC coordinator bottlenecks vs choreograph / orchestrate Saga pattern trade-offs", "completed": False, "priority": "high"},
                    {"id": "a6-2", "text": "Implement compensating transactions to automatically roll back completed steps upon downstream failures", "completed": False, "priority": "high"},
                    {"id": "a6-3", "text": "Implement transactional outbox pattern writing domain events and records in a single local DB transaction", "completed": False, "priority": "high"},
                    {"id": "a6-4", "text": "Design API idempotency using unique client tokens stored in Redis with atomic SETNX locking", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Saga Pattern, Compensating Transactions & Idempotency"
            },
            {
                "id": "phase-7",
                "phase_number": 7,
                "title": "Production Resilience, Circuit Breakers & Chaos Engineering",
                "duration": "",
                "tag": "RESILIENCE",
                "description": "Shield downstream dependencies using circuit breakers, bulkheads, adaptive rate limiters, and backoff with jitter.",
                "key_topics": ["Circuit Breakers (Open/Half-Open)", "Bulkhead Isolation", "Jittered Exponential Backoff"],
                "checklist": [
                    {"id": "a7-1", "text": "Implement a 3-state circuit breaker (Closed, Open, Half-Open) with failure rate thresholds", "completed": False, "priority": "high"},
                    {"id": "a7-2", "text": "Apply bulkhead thread isolation preventing slow dependency timeouts from exhausting main worker pool", "completed": False, "priority": "high"},
                    {"id": "a7-3", "text": "Implement full jitter exponential backoff retry algorithms to prevent thundering herd on recovery", "completed": False, "priority": "high"},
                    {"id": "a7-4", "text": "Simulate network packet loss and random latency injections using chaos engineering techniques", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Circuit Breakers, Bulkhead Isolation & Thundering Herd Defense"
            },
            {
                "id": "phase-8",
                "phase_number": 8,
                "title": "Sub-Millisecond p99 Tail Latency Optimization",
                "duration": "",
                "tag": "PERFORMANCE",
                "description": "Eliminate tail latency spikes, profile CPU memory bottlenecks, and tune OS socket network buffers.",
                "key_topics": ["p99 Tail Latency", "Zero-Copy I/O & Buffers", "Connection Pool Sizing"],
                "checklist": [
                    {"id": "a8-1", "text": "Profile application CPU flame graphs and identify hottest execution paths consuming compute cycles", "completed": False, "priority": "high"},
                    {"id": "a8-2", "text": "Diagnose garbage collection pauses and tune memory allocation to reduce stop-the-world latency", "completed": False, "priority": "high"},
                    {"id": "a8-3", "text": "Tune TCP socket options (SO_REUSEPORT, TCP_NODELAY) and tune connection pool sizing formulas", "completed": False, "priority": "high"},
                    {"id": "a8-4", "text": "Implement asynchronous batching pipelines coalescing multiple small writes into single bulk I/O ops", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "p99 Tail Latency Debugging, Flame Graphs & Socket Tuning"
            },
            {
                "id": "phase-9",
                "phase_number": 9,
                "title": "Observability, Distributed Tracing & Telemetry",
                "duration": "",
                "tag": "OBSERVABILITY",
                "description": "Instrument microservices with OpenTelemetry, trace context propagation across RPC boundaries, and debug bottlenecks in Jaeger.",
                "key_topics": ["OpenTelemetry Instrumentation", "Distributed Trace Propagation", "RED Metrics"],
                "checklist": [
                    {"id": "a9-1", "text": "Instrument web services with OpenTelemetry capturing spans, events, and error tags", "completed": False, "priority": "high"},
                    {"id": "a9-2", "text": "Propagate W3C TraceContext headers (traceparent) across asynchronous HTTP and Kafka boundaries", "completed": False, "priority": "high"},
                    {"id": "a9-3", "text": "Export distributed traces to Jaeger and pinpoint microservice latency bottlenecks in trace visualizer", "completed": False, "priority": "high"},
                    {"id": "a9-4", "text": "Export RED metrics (Rate, Errors, Duration) to Prometheus and build alerting thresholds", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "OpenTelemetry Context Propagation & Distributed Tracing"
            },
            {
                "id": "phase-10",
                "phase_number": 10,
                "title": "Planetary Scale System Design Defense",
                "duration": "",
                "tag": "ARCHITECTURE",
                "description": "Defend high-level and low-level architectural blueprints for mission-critical services under extreme load.",
                "key_topics": ["Distributed Rate Limiter", "Real-Time Collaborative Engine", "Multi-Region Active-Active"],
                "checklist": [
                    {"id": "a10-1", "text": "Design a globally distributed rate limiter handling 1,000,000 requests/sec with minimal sync overhead", "completed": False, "priority": "high"},
                    {"id": "a10-2", "text": "Design a real-time collaborative document editor using CRDTs or Operational Transformation", "completed": False, "priority": "high"},
                    {"id": "a10-3", "text": "Architect multi-region active-active database replication handling conflict resolution and failover", "completed": False, "priority": "high"},
                    {"id": "a10-4", "text": "Defend availability, latency, data integrity, and operational cost trade-offs under Bar Raiser grilling", "completed": False, "priority": "medium"}
                ],
                "drill_topic": "Planetary-Scale Architecture Defense & Multi-Region Trade-offs"
            }
        ]
    }
