# Documentation (Product submission)

Technical evidence for the CMP600 **product** artefact (Product ZIP). Not the 7000-word dissertation.

## Core documents (Word)

| File | Purpose |
|------|---------|
| `Requirements Document.docx` | FR/NFR register (MVP, as-built) |
| `Architecture Document.docx` | System structure |
| `API_Contract_v1.docx` | REST `/api/v1` routes |
| `Evaluation_Plan_v1.docx` | Performance and usability methods |

## Supporting documents (Word — converted from Markdown)

| File | Purpose |
|------|---------|
| `Implementation_Notes_DEV.docx` | Stack and modules |
| `Door_to_Door_Parcel_Flow_Plan.docx` | Status model and flows |
| `Door_to_Door_Routing_Strategy.docx` | Driver routing policy |
| `Evaluation_Heuristics_SUS_Ethics.docx` | Ethics, heuristics, latency pointers |
| `Cloud_Deploy_Railway_Render.docx` | Optional cloud deploy |
| `Developer_Checklist_Reference.docx` | Phase verification (reference) |
| `Developer_Implementation_Plan_Reference.docx` | Delivery order (reference) |

Markdown sources (`.md`) remain for Git editing. Regenerate Word copies:

`python Documentation/build_all_docs.py`

Repository: https://github.com/PierMobayed/CMP600_Dissertation_Project
