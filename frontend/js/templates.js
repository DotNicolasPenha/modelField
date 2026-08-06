const Templates = {
  blank: "",

  // ===========================
  // PRODUCT
  // ===========================

  "feature": `# Feature Specification

## Summary

Brief overview of the feature in 1-2 sentences.

---

## Context

What is the current situation? What exists today?

---

## Problem

What problem needs to be solved?

Who is affected?

What happens if this is not addressed?

---

## Goals

-
-
-

---

## Scope

### In Scope

-

### Out of Scope

-

---

## Requirements

### Functional

- [ ]
- [ ]
- [ ]

### Non-Functional

Performance

Security

Scalability

Reliability

---

## Design / Solution

How will the solution work?

Describe the approach, flow, and key decisions.

---

## Dependencies

Internal

External

Third-party

---

## Edge Cases

-
-
-

---

## Constraints

Technology

Budget

Timeline

Performance

Security

---

## Risks & Trade-offs

### Risks

-

### Trade-offs

What was sacrificed and why?

---

## Acceptance Criteria

- [ ]
- [ ]
- [ ]

---

## Testing / Validation

How will this be verified?

- Unit Tests
- Integration Tests
- Manual Tests

---

## References

-
-

---

## Future Work

-
-`,

  // ===========================
  // PRODUCT
  // ===========================

  "bug-fix": `# Bug Fix Specification

## Summary

Brief description of the bug.

---

## Context

Where does this bug occur? Under what conditions?

---

## Problem

### Current Behavior

What currently happens?

### Expected Behavior

What should happen instead?

---

## Root Cause

Document the identified root cause, if known.

---

## Goals

Fix the bug without introducing regressions.

---

## Scope

### In Scope

-

### Out of Scope

-

---

## Requirements

- [ ]
- [ ]

---

## Design / Solution

How will the fix be implemented?

---

## Dependencies

Internal

External

---

## Edge Cases

-
-

---

## Constraints

-

---

## Regression Risks

-
-

---

## Risks & Trade-offs

### Risks

-

### Trade-offs

-

---

## Acceptance Criteria

- [ ]
- [ ]
- [ ]

---

## Testing / Validation

- Unit Tests
- Integration Tests
- Manual Tests

---

## Rollback Plan

How to revert if the fix causes issues.

---

## References

-
-

---

## Future Work

Related improvements to consider.`,

  "technical-refactor": `# Technical Refactor Specification

## Summary

Brief overview of the refactor.

---

## Context

What is the current state of the code/system?

---

## Problem

What technical debt or issues motivated this refactor?

---

## Goals

-
-
-

---

## Scope

### In Scope

-

### Out of Scope

-

---

## Requirements

Must preserve existing behavior.

Must not break existing tests.

- [ ]
- [ ]

---

## Design / Solution

Describe the proposed changes.

What patterns or approaches will be used?

---

## Dependencies

Internal

External

---

## Edge Cases

-
-

---

## Constraints

Technology

Timeline

Performance

---

## Invariants

Behavior that must remain unchanged.

---

## Risks & Trade-offs

### Risks

-

### Trade-offs

What was sacrificed and why?

---

## Acceptance Criteria

- [ ]
- [ ]

---

## Testing / Validation

How will correctness be verified?

- Existing Tests Pass
- New Tests Added
- Manual Verification

---

## Technical Debt Addressed

-
-

---

## References

-
-

---

## Follow-Up Tasks

-
-`,

  // ===========================
  // ENGINEERING
  // ===========================

  "architecture": `# Architecture Specification

## Summary

High-level overview of the architectural change.

---

## Context

Describe the business and technical context.

---

## Problem

What architectural problem is being solved?

---

## Goals

-
-
-

---

## Scope

### In Scope

-

### Out of Scope

-

---

## Requirements

Scalability

Performance

Security

Availability

Maintainability

---

## High-Level Design

Describe the overall architecture.

Include diagrams if applicable.

---

## Components

### Component

Purpose

Responsibilities

Inputs

Outputs

Dependencies

Failure Modes

---

## Data Flow

How does data move through the system?

---

## Communication

REST

gRPC

Events

Queues

WebSockets

---

## Dependencies

Internal

External

Third-party

---

## Edge Cases

-
-

---

## Constraints

Technology

Budget

Timeline

Performance

Security

Compliance

---

## Scalability Strategy

-

---

## Security Considerations

-

---

## Observability

Logging

Metrics

Tracing

Monitoring

---

## Failure Scenarios

-
-

---

## Risks & Trade-offs

### Risks

-

### Trade-offs

Why was this architecture chosen?

---

## Alternatives Considered

-
-

---

## Acceptance Criteria

- [ ]
- [ ]

---

## Testing / Validation

-
-

---

## References

-
-

---

## Open Questions

-
-`,

  "adr": `# Architecture Decision Record

## Status

Proposed | Accepted | Deprecated | Superseded

---

## Summary

Brief overview of the decision.

---

## Context

Describe the problem or situation that requires a decision.

---

## Problem

What question are we answering?

Why does a decision need to be made now?

---

## Goals

What are we optimizing for?

---

## Decision

Describe the selected solution.

Why was this option chosen?

---

## Alternatives Considered

### Option A

Pros

Cons

### Option B

Pros

Cons

### Option C

Pros

Cons

---

## Consequences

### Positive

-

### Negative

-

---

## Scope

### In Scope

-

### Out of Scope

-

---

## Dependencies

What does this decision depend on?

---

## Risks & Trade-offs

### Risks

-

### Trade-offs

What are we giving up?

---

## Acceptance Criteria

How will we know this decision was correct?

- [ ]
- [ ]

---

## References

-
-`,

  "rfc": `# Request For Comments

## Summary

Brief overview of the proposal.

---

## Motivation

Why is this proposal necessary?

What problem does it solve?

---

## Context

What is the current state?

---

## Problem

What needs to be changed and why?

---

## Goals

-
-
-

---

## Proposal

Describe the proposed solution in detail.

---

## Scope

### In Scope

-

### Out of Scope

-

---

## Requirements

- [ ]
- [ ]

---

## Design / Solution

Technical details of the proposal.

---

## Alternatives Considered

-
-

---

## Dependencies

Internal

External

Third-party

---

## Edge Cases

-
-

---

## Constraints

Technology

Timeline

Performance

---

## Migration Plan

How will this be rolled out?

Steps

Rollback

Communication

---

## Risks & Trade-offs

### Risks

-

### Trade-offs

-

---

## Acceptance Criteria

- [ ]
- [ ]

---

## Testing / Validation

-
-

---

## Open Questions

-
-

---

## References

-
-`,

  // ===========================
  // BACKEND
  // ===========================

  "api": `# API Specification

## Summary

Brief overview of the API or endpoint.

---

## Context

Why is this API needed?

---

## Problem

What problem does this API solve?

---

## Goals

-
-
-

---

## Endpoint

METHOD /resource

---

## Scope

### In Scope

-

### Out of Scope

-

---

## Authentication

How is the client authenticated?

---

## Authorization

What permissions are required?

---

## Headers

| Header | Required | Description |
|--------|----------|-------------|

---

## Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|

---

## Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|

---

## Request Body

\`\`\`json
{}
\`\`\`

---

## Validation Rules

-
-

---

## Success Response

\`\`\`json
{}
\`\`\`

---

## Error Responses

| Status | Description |
|--------|-------------|

---

## Rate Limits

-
-

---

## Dependencies

Internal

External

---

## Edge Cases

-
-

---

## Constraints

Performance

Security

Versioning

---

## Risks & Trade-offs

### Risks

-

### Trade-offs

-

---

## Acceptance Criteria

- [ ]
- [ ]

---

## Testing / Validation

- Unit Tests
- Integration Tests
- Contract Tests

---

## Examples

### Request

### Response

---

## References

-
-

---

## Future Work

-
-`,

  "database": `# Database Specification

## Summary

Brief overview of the database changes.

---

## Context

Why are these changes needed?

---

## Problem

What problem do these schema changes solve?

---

## Goals

-
-
-

---

## Scope

### In Scope

-

### Out of Scope

-

---

## Tables

List all affected tables.

---

## Columns

| Table | Column | Type | Nullable | Default | Description |
|-------|--------|------|----------|---------|-------------|

---

## Relationships

-
-

---

## Constraints

-
-

---

## Indexes

-
-

---

## Dependencies

Internal

External

---

## Edge Cases

-
-

---

## Constraints

Performance

Storage

Compliance

---

## Migrations

### Up

Steps to apply.

### Down

Steps to rollback.

---

## Data Integrity

How is consistency maintained?

---

## Risks & Trade-offs

### Risks

-

### Trade-offs

-

---

## Acceptance Criteria

- [ ]
- [ ]

---

## Testing / Validation

- Migration Tests
- Data Integrity Tests
- Performance Tests

---

## Backup Strategy

-
-

---

## Rollback Plan

-
-

---

## References

-
-

---

## Future Work

-
-`,

  "domain-model": `# Domain Model Specification

## Summary

Brief overview of the domain model.

---

## Context

What business domain does this model represent?

---

## Problem

What problem does this domain model solve?

---

## Goals

-
-
-

---

## Scope

### In Scope

-

### Out of Scope

-

---

## Ubiquitous Language

| Term | Meaning |
|------|---------|
| | |

---

## Bounded Contexts

-
-

---

## Entities

### Entity

Purpose

Attributes

Invariants

---

## Value Objects

-
-

---

## Aggregates

-
-

---

## Domain Services

-
-

---

## Domain Events

-
-

---

## Business Rules

-
-

---

## Relationships

-
-

---

## Dependencies

Internal

External

---

## Edge Cases

-
-

---

## Constraints

-

---

## Risks & Trade-offs

### Risks

-

### Trade-offs

-

---

## Acceptance Criteria

- [ ]
- [ ]

---

## Testing / Validation

-
-

---

## References

-
-

---

## Open Questions

-
-`,

  // ===========================
  // FRONTEND
  // ===========================

  "component": `# UI Component Specification

## Summary

Brief overview of the component.

---

## Context

Where is this component used? What problem does it solve?

---

## Problem

What user or system problem does this component address?

---

## Goals

-
-
-

---

## Scope

### In Scope

-

### Out of Scope

-

---

## Public API

### Props

| Name | Type | Default | Required | Description |
|------|------|---------|----------|-------------|

### Events

| Event | Payload | Description |
|-------|---------|-------------|

### Slots

| Name | Description |
|------|-------------|

### Exposed Methods

| Method | Signature | Description |
|--------|-----------|-------------|

---

## Internal State

-
-

---

## Behavior

How does the component behave in different situations?

---

## Variants

-
-

---

## Dependencies

Internal

External

---

## Edge Cases

-
-

---

## Constraints

Performance

Accessibility

Browser Support

---

## Accessibility

Keyboard Navigation

Screen Reader

ARIA Attributes

Color Contrast

---

## Responsive Behavior

-
-

---

## Error States

-
-

---

## Risks & Trade-offs

### Risks

-

### Trade-offs

-

---

## Acceptance Criteria

- [ ]
- [ ]

---

## Testing / Validation

- Unit Tests
- Visual Tests
- Accessibility Tests

---

## References

-
-

---

## Future Work

-
-`,

  "design-system": `# Design System Specification

## Summary

Brief overview of the design system or component library.

---

## Context

Why is this design system needed?

---

## Problem

What consistency or quality problem does this solve?

---

## Goals

-
-
-

---

## Scope

### In Scope

-

### Out of Scope

-

---

## Design Principles

-
-

---

## Brand Identity

-
-

---

## Color Palette

### Primary

### Secondary

### Neutral

### Semantic (Success, Warning, Error, Info)

---

## Typography

### Font Families

### Font Sizes

### Font Weights

### Line Heights

---

## Spacing System

-
-

---

## Grid System

-
-

---

## Border Radius

-
-

---

## Shadows

-
-

---

## Icons

Style

Size

Stroke

---

## Components

### Component

Purpose

Variants

States

Accessibility

Usage Guidelines

---

## Motion & Animation

Duration

Easing

Principles

---

## Responsive Design Rules

-
-

---

## Accessibility Guidelines

WCAG Level

Contrast Ratios

Focus States

---

## Dependencies

Internal

External

---

## Constraints

-

---

## Risks & Trade-offs

### Risks

-

### Trade-offs

-

---

## Acceptance Criteria

- [ ]
- [ ]

---

## Testing / Validation

- Visual Regression
- Accessibility Audit
- Cross-Browser Testing

---

## Anti-Patterns

-
-

---

## References

-
-

---

## Future Work

-
-`,

  // ===========================
  // OPERATIONS
  // ===========================

  "runbook": `# Operational Runbook

## Summary

Brief overview of the procedure.

---

## Purpose

What does this runbook accomplish?

---

## Preconditions

What must be true before starting?

---

## Scope

### In Scope

-

### Out of Scope

-

---

## Procedure

1.
2.
3.

---

## Dependencies

Services

Tools

Access Required

---

## Validation

How do you verify success?

---

## Rollback Procedure

Steps to undo the operation.

---

## Troubleshooting

| Symptom | Possible Cause | Resolution |
|---------|---------------|------------|

---

## Constraints

Time Window

Impact

Approval Required

---

## Risks & Trade-offs

### Risks

-

### Trade-offs

-

---

## References

-
-`,

  "postmortem": `# Incident Postmortem

## Summary

Brief overview of the incident.

---

## Timeline

| Time | Event |
|------|-------|
| | Incident detected |
| | Investigation started |
| | Root cause identified |
| | Mitigation applied |
| | Incident resolved |

---

## Impact

### Users Affected

-

### Duration

-

### Services Affected

-

### Data Impact

-

---

## Root Cause

What caused the incident?

Why did it happen?

Why was it not caught earlier?

---

## Resolution

How was the incident resolved?

---

## Detection

How was the incident detected?

Could it have been detected sooner?

---

## Lessons Learned

### What went well

-

### What went poorly

-

### Where we got lucky

-

---

## Action Items

| Action | Owner | Priority | Due Date |
|--------|-------|----------|----------|

---

## Scope

### In Scope

-

### Out of Scope

-

---

## Dependencies

-
-

---

## Risks & Trade-offs

### Risks

-

### Trade-offs

What was sacrificed during mitigation?

---

## References

-
-`
};
