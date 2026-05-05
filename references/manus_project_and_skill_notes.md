# Manus Project and Skill Notes

## Purpose
This note explains how to use the Staffbase demo UI workflow effectively inside Manus.

## Project Role
A Manus Project is the persistent workspace for recurring work.

Use the Project to store:
- the master instruction
- reference files
- templates
- brand materials
- previous deliverables
- reusable customer assets

Each new task in the Project inherits the Project-level context.

## Skill Role
A Manus Skill is the reusable execution pattern.

Use the Skill to:
- standardize the workflow
- keep output structure consistent
- preserve best practices
- reduce prompt repetition
- help the agent perform the same high-quality process across multiple customer requests

## Recommended Operating Model

### Put in the Project
Store:
- PROJECT_INSTRUCTION.md
- references/
- templates/
- example deliverables
- uploaded brand inputs

### Put in the Skill
Store:
- the reusable workflow
- output expectations
- guardrails
- quality checks
- required deliverable list

## Suggested Workflow
For each new customer request:

1. Read the intake brief
2. Research the customer brand
3. Extract or infer brand colors
4. Create a Staffbase branding mapping
5. Design demo-ready mock UI
6. Draft Staffbase-compatible custom CSS
7. Write apply notes
8. Write presenter notes
9. Review output quality
10. Package deliverables

## Progressive Disclosure Reminder
Skills are loaded in layers.
Therefore:
- keep the core workflow in SKILL.md
- keep factual guardrails in references/
- keep reusable scaffolds in templates/
- avoid putting everything into one file

## Best Practices
- use the Project for stable context
- use the Skill for repeatable execution
- keep references factual
- keep templates editable
- keep assumptions visible
- separate demo visuals from Staffbase-ready suggestions

## Quality Rules
Every task should verify:
- brand fit
- demo readiness
- readability
- separation of mock CSS and Staffbase CSS
- branding-first logic
- implementation caveats where needed

## What Good Output Looks Like
A good result should:
- feel specific to the customer
- look polished enough for a sales call
- be readable by a non-technical audience
- still be credible to a technical buyer
- explain what can be done through branding versus CSS

## Sources
- Manus Projects  
  https://manus.im/docs/features/projects
- Manus Skills  
  https://manus.im/docs/features/skills
- How to Share and Use Skills in Manus  
  https://help.manus.im/en/articles/14753565-how-to-share-and-use-skills-in-manus
