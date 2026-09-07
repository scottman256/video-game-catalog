# Video Game Catalog

A catalog application for tracking video games you own.

## Stack

- **Backend:** Python (3.14), 3-layer architecture
- **Frontend:** Angular
- **Database:** SQLite locally, PostgreSQL in production
- **Testing:** full unit test and integration test suites required for all backend and frontend code

## Architecture

The backend follows a simple 3-layer architecture:

1. **API / Controller layer** — handles HTTP requests/responses, input validation, routing. No business logic.
2. **Service layer** — business logic and orchestration. No direct database access.
3. **Repository / Data access layer** — database queries and persistence. No business logic.

Each layer only calls into the layer directly below it. Keep layers thin and focused on their single responsibility.

## Coding Style

- Prioritize simple, clean, maintainable, and performant code over clever code.
- Methods should generally be **10 lines or fewer**. Exceptions should be rare and justified (e.g. unavoidable branching required by the problem itself, not by poor decomposition).
- If a method grows past ~10 lines, extract well-named helper methods rather than adding a comment to explain a section.
- Name variables, classes, methods, and database fields clearly and precisely — names should make comments unnecessary. Avoid abbreviations unless they are universally understood.
- Avoid premature abstraction. Don't add configurability, indirection, or generic frameworks for hypothetical future needs.
- Avoid unnecessary comments. Code should be self-explanatory through naming and structure; use comments only for non-obvious "why" (e.g. a workaround, a subtle constraint).
- Prefer composition and small, focused classes over large, multi-purpose ones.

## Testing

- Every method with meaningful logic should have unit test coverage.
- Integration tests should cover each layer boundary (API → Service → Repository → Database).
- Tests should be clean and readable, following the same style principles as production code.

## Data Safety

- Never delete data in the local dev database (or any other environment) as a side effect of setup, testing, or cleanup work — this includes truncating/deleting rows from tables, dropping tables, or deleting the database file.
- If deleting data is genuinely necessary, always ask for explicit permission first and say exactly what will be deleted (which rows/tables) before doing it.
- When cleaning up data created during testing (e.g. via an automated smoke test), delete only the specific records created for that test (match on the exact username/email/ID used), never a blanket delete against a shared table.
