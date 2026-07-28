# FreeGency — Frontend Context

## Stack
- Angular 21, standalone components, signals (not NgModules/RxJS BehaviorSubject
  patterns unless already used elsewhere in the repo)
- Backend: ASP.NET Core + SQL Server, base route `/api/v1`
- Auth: JWT, `[Authorize]` on protected endpoints

## Project structure (existing)
```
src/app/
  core/            # http interceptors, loading service
  features/
    auth/
    client/
      pages/
        client-create-project-choice/
        client-create-project-layout/
        client-home/
        manage-work/          ← building this now
    developer/
    landing/
    setting/
  shared/
    components/    # loading-overlay, toast
    models/        # shared interfaces
```

## Manage Work — confirmed API endpoints

### GET /api/v1/projects/mine?role=as-client
Returns projects where the user is the client/owner. Response:
```json
{
  "data": [
    {
      "id": "guid",
      "title": "string",
      "description": "string",
      "isFixedPrice": true,
      "budgetMin": 200.00,
      "budgetMax": 200.00,
      "currency": "USD",
      "deadline": null,
      "estimatedDurationDays": 90,
      "status": "Open",
      "createdAt": "ISO date",
      "categoryName": "string",
      "clientName": "string",
      "clientAvatarUrl": "string",
      "specialties": ["string"],
      "skills": ["string"],
      "proposalCount": 0
    }
  ],
  "isSuccess": true,
  "isFailure": false
}
```

**Important field rules:**
- `deadline` is `null` until a proposal is accepted (it's set at proposal
  acceptance, not project creation). Never show a "closes in" / countdown UI
  element on Open projects. Only show a deadline countdown on In-progress
  projects, labeled "Due in X days" (a project deadline, not an application
  window).
- `budgetMin`/`budgetMax` is a range — display as `min–max USD` unless equal,
  then show a single value.
- `status` values seen so far: `Open`, likely also `Draft`, `InProgress`,
  `Completed`, `Cancelled` — confirm exact enum casing with backend before
  assuming.
- `role` query param only accepts `as-client` or `as-assignee` (enforced
  server-side in `ProjectService`) — any other value throws a validation
  error.

### POST /api/v1/projects (Create Project)
Body: `CreateProjectRequestDto` — flat object, no wrapper:
```json
{
  "title": "string",
  "description": "string",
  "categoryId": "guid",
  "isFixedPrice": true,
  "budgetMin": 500,
  "budgetMax": 1500,
  "currency": "USD",
  "estimatedDurationDays": 14,
  "skillIds": ["guid"],
  "specialtyIds": ["guid"]
}
```
Requires `Content-Type: application/json` header. `categoryId`/`skillIds`/
`specialtyIds` must be real GUIDs (from Platform Lookups endpoints), not
placeholders.

### Controller reference (ProjectsController)
```csharp
[Route("api/v1/projects")]
public class ProjectsController(IProjectService _projectService) : BaseApiController
{
    // Commands
    [Authorize] [HttpPost]                    Create(CreateProjectRequestDto request)
    [Authorize] [HttpPost("{id}/save")]       Save(Guid id)
    [Authorize] [HttpDelete("{id}")]          Delete(Guid id)
    [Authorize] [HttpDelete("{id}/save")]     UnSave(Guid id)
    [Authorize] [HttpPatch("{id}/publish")]   Publish(Guid id)
    [Authorize] [HttpPut("{id}")]             Edit(UpdateProjectRequestDto request)
    [Authorize] [HttpPut("{id}/skills")]      ReplaceSkills(Guid id, IEnumerable<Guid> skillsIds)

    // Queries
    [HttpGet]                                 Browse(FilterProjectsRequestDto request)
    [HttpGet("{id}")]                         GetDetails(Guid id)
    [Authorize] [HttpGet("mine")]             GetMyProjects(string role)
    [Authorize] [HttpGet("saved")]            GetMySavedProjects()
}
```

### Not yet built (stub these)
- Milestones per project — no endpoint yet
- Members per project — no endpoint yet
- Stub as `Observable<[]>` in the service with a `// TODO: replace once
  backend ready` comment. Don't block UI on these.

### Proposals collection (endpoint names only, bodies not yet confirmed)
`Browse Proposals`, `Get Proposal By ID`, `Create Proposal`, `Update Proposal`,
`Withdraw Proposal`, `Accept Proposal`, `Reject Proposal`, `Delete Proposal
(Admin)` — get real request/response bodies before building this tab.

## Design system rules (from Figma, not Stitch)
- Primary actions are always solid pill buttons (fully rounded, indigo/purple,
  white text) — never bare text links for primary actions like "View details"
- Secondary info panels (sidebar widgets) are solid dark navy cards — not
  light/white cards
- Skill tags: small gray rounded chips
- Price/budget and delivery time: small colored pill badges (distinct color
  from status badges — never the same color sitting next to each other)
- Status badges: soft, lowercase pills (e.g. "open", "in progress") — not
  bold all-caps
- Proposals/review-type pages are NOT dashboards — no stacked metric tiles,
  no charts, no activity feeds. Keep sidebar content to 1 small panel max.
- "Needs your attention" pattern: only show a line item if its count > 0;
  if nothing needs attention, show a plain "You're all caught up" state

## Conventions
- Standalone Angular components, one component per file
- Models live in `shared/models/`, one interface per file
- Services live in `features/{feature}/data-access/`
- Never invent API fields not confirmed in this file or an actual response —
  ask before assuming