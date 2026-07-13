# Native Option Sequence Integrity Review

Generated: 2026-07-13T14:19:35.160Z

**PRIMARY RESEARCH SEQUENCE REVIEW — NOT PRODUCTION VERIFIED**

Automated findings in this report are human-review suggestions only. They do not verify College Football 27 options, counts, order, wrap behavior, or production readiness.

## Summary

- Categories analyzed: 7
- Candidate records reviewed: 86
- Deliberate selection events reviewed: 85
- Human-review suggestions: 119

## Category Results

### Head Templates 1-29

- Candidate records: 29
- Deliberate selected events: 28
- Matched known selected records: 24
- Selector completeness claim: not_proven
- Review suggestions: 44

| Priority | Code | Labels | Timeline IDs | Review action |
| --- | --- | --- | --- | --- |
| high | accidentalJump | Face 4, Face 8 | video-002-tl-007, video-002-tl-008 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Face 5, Face 9 | video-002-tl-011, video-002-tl-012 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Face 12, Face 16 | video-002-tl-015, video-002-tl-016 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Face 16, Face 12 | video-002-tl-016, video-003-tl-001 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Face 12, Face 16 | video-003-tl-001, video-003-tl-002 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Face 13, Face 17 | video-003-tl-004, video-003-tl-005 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Face 18, Face 23 | video-003-tl-006, video-003-tl-007 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Face 21, Face 27 | video-003-tl-010, video-003-tl-011 | Inspect the exact source timestamps and document the navigation intent. |
| high | incompleteSelectorEnding | Face 29 | video-003-tl-015 | Record first/final value, boundary, wrap behavior, and category exit evidence before production publication. |
| high | reversedMovement | Face 16, Face 12 | video-002-tl-016, video-003-tl-001 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| high | reversedMovement | Face 16, Face 14 | video-003-tl-002, video-003-tl-003 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| high | reversedMovement | Face 24, Face 22 | video-003-tl-008, video-003-tl-009 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| high | selectedLabelOutsideCandidateScope | Face 31 | video-003-tl-013 | Prompt 103 scope covers current Head Template research candidates Face 1 through Face 29 only. Later visible selected labels must be reviewed before creating more records. |
| high | selectedLabelOutsideCandidateScope | Face 30 | video-003-tl-014 | Prompt 103 scope covers current Head Template research candidates Face 1 through Face 29 only. Later visible selected labels must be reviewed before creating more records. |
| high | skippedIndices | Face 4, Face 8 | video-002-tl-007, video-002-tl-008 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Face 5, Face 9 | video-002-tl-011, video-002-tl-012 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Face 12, Face 16 | video-002-tl-015, video-002-tl-016 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Face 16, Face 12 | video-002-tl-016, video-003-tl-001 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Face 12, Face 16 | video-003-tl-001, video-003-tl-002 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Face 13, Face 17 | video-003-tl-004, video-003-tl-005 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Face 18, Face 23 | video-003-tl-006, video-003-tl-007 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Face 21, Face 27 | video-003-tl-010, video-003-tl-011 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| medium | accidentalJump | Face 16, Face 14 | video-003-tl-002, video-003-tl-003 | Inspect the exact source timestamps and document the navigation intent. |
| medium | accidentalJump | Face 24, Face 22 | video-003-tl-008, video-003-tl-009 | Inspect the exact source timestamps and document the navigation intent. |
| medium | accidentalJump | Face 28, Face 31 | video-003-tl-012, video-003-tl-013 | Inspect the exact source timestamps and document the navigation intent. |
| medium | candidateRecordWithoutTimelineSelection | Face 15 |  | Confirm the candidate selected-menu evidence and timeline mapping before publication. |
| medium | candidateRecordWithoutTimelineSelection | Face 19 |  | Confirm the candidate selected-menu evidence and timeline mapping before publication. |
| medium | candidateRecordWithoutTimelineSelection | Face 20 |  | Confirm the candidate selected-menu evidence and timeline mapping before publication. |
| medium | candidateRecordWithoutTimelineSelection | Face 25 |  | Confirm the candidate selected-menu evidence and timeline mapping before publication. |
| medium | candidateRecordWithoutTimelineSelection | Face 26 |  | Confirm the candidate selected-menu evidence and timeline mapping before publication. |
| medium | overlappingClip | Face 12, Face 12 | video-002-tl-015, video-003-tl-001 | Confirm this is intentional clip overlap and preserve both evidence references without creating duplicate catalog identities. |
| medium | overlappingClip | Face 16, Face 16 | video-002-tl-016, video-003-tl-002 | Confirm this is intentional clip overlap and preserve both evidence references without creating duplicate catalog identities. |
| medium | repeatedSelection | Face 12, Face 12 | video-002-tl-015, video-003-tl-001 | Confirm whether this is intentional overlap, selector wrap, or an accidental repeated selection before publication. |
| medium | repeatedSelection | Face 16, Face 16 | video-002-tl-016, video-003-tl-002 | Confirm whether this is intentional overlap, selector wrap, or an accidental repeated selection before publication. |
| medium | reversedMovement | Face 8, Face 7 | video-002-tl-008, video-002-tl-009 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | reversedMovement | Face 7, Face 6 | video-002-tl-009, video-002-tl-010 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | reversedMovement | Face 6, Face 5 | video-002-tl-010, video-002-tl-011 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | reversedMovement | Face 14, Face 13 | video-003-tl-003, video-003-tl-004 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | reversedMovement | Face 22, Face 21 | video-003-tl-009, video-003-tl-010 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | reversedMovement | Face 31, Face 30 | video-003-tl-013, video-003-tl-014 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | reversedMovement | Face 30, Face 29 | video-003-tl-014, video-003-tl-015 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | skippedIndices | Face 16, Face 14 | video-003-tl-002, video-003-tl-003 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| medium | skippedIndices | Face 24, Face 22 | video-003-tl-008, video-003-tl-009 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| medium | skippedIndices | Face 28, Face 31 | video-003-tl-012, video-003-tl-013 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |

### Skin Tone

- Candidate records: 24
- Deliberate selected events: 22
- Matched known selected records: 20
- Selector completeness claim: not_proven
- Review suggestions: 49

| Priority | Code | Labels | Timeline IDs | Review action |
| --- | --- | --- | --- | --- |
| high | accidentalJump | Skin Tone 09, Skin Tone 04 | video-004-tl-002, video-004-tl-003 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Skin Tone 04, Skin Tone 10 | video-004-tl-003, video-004-tl-004 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Skin Tone 10, Skin Tone 20 | video-004-tl-004, video-004-tl-005 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Skin Tone 21, Skin Tone 08 | video-004-tl-008, video-004-tl-009 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Skin Tone 06, Skin Tone 29 | video-004-tl-011, video-004-tl-012 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Skin Tone 29, Skin Tone 24 | video-004-tl-012, video-004-tl-013 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Skin Tone 22, Skin Tone 17 | video-004-tl-014, video-004-tl-015 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Skin Tone 17, Skin Tone 13 | video-004-tl-015, video-004-tl-016 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Skin Tone 12, Skin Tone 01 | video-004-tl-018, video-004-tl-019 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Skin Tone 03, Skin Tone 11 | video-004-tl-021, video-004-tl-022 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Skin Tone 11, Skin Tone 23 | video-004-tl-022, video-004-tl-023 | Inspect the exact source timestamps and document the navigation intent. |
| high | incompleteSelectorEnding | Skin Tone 23 | video-004-tl-023 | Record first/final value, boundary, wrap behavior, and category exit evidence before production publication. |
| high | reversedMovement | Skin Tone 09, Skin Tone 04 | video-004-tl-002, video-004-tl-003 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| high | reversedMovement | Skin Tone 21, Skin Tone 08 | video-004-tl-008, video-004-tl-009 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| high | reversedMovement | Skin Tone 29, Skin Tone 24 | video-004-tl-012, video-004-tl-013 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| high | reversedMovement | Skin Tone 24, Skin Tone 22 | video-004-tl-013, video-004-tl-014 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| high | reversedMovement | Skin Tone 22, Skin Tone 17 | video-004-tl-014, video-004-tl-015 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| high | reversedMovement | Skin Tone 17, Skin Tone 13 | video-004-tl-015, video-004-tl-016 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| high | reversedMovement | Skin Tone 13, Skin Tone 10 | video-004-tl-016, video-004-tl-017 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| high | reversedMovement | Skin Tone 12, Skin Tone 01 | video-004-tl-018, video-004-tl-019 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| high | selectedLabelOutsideCandidateScope | Skin Tone 29 | video-004-tl-012 | Review source evidence before creating, excluding, or deferring this candidate record. |
| high | skippedIndices | Skin Tone 09, Skin Tone 04 | video-004-tl-002, video-004-tl-003 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Skin Tone 04, Skin Tone 10 | video-004-tl-003, video-004-tl-004 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Skin Tone 10, Skin Tone 20 | video-004-tl-004, video-004-tl-005 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Skin Tone 21, Skin Tone 08 | video-004-tl-008, video-004-tl-009 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Skin Tone 06, Skin Tone 29 | video-004-tl-011, video-004-tl-012 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Skin Tone 29, Skin Tone 24 | video-004-tl-012, video-004-tl-013 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Skin Tone 22, Skin Tone 17 | video-004-tl-014, video-004-tl-015 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Skin Tone 17, Skin Tone 13 | video-004-tl-015, video-004-tl-016 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Skin Tone 12, Skin Tone 01 | video-004-tl-018, video-004-tl-019 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Skin Tone 03, Skin Tone 11 | video-004-tl-021, video-004-tl-022 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Skin Tone 11, Skin Tone 23 | video-004-tl-022, video-004-tl-023 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| medium | accidentalJump | Skin Tone 18, Skin Tone 21 | video-004-tl-007, video-004-tl-008 | Inspect the exact source timestamps and document the navigation intent. |
| medium | accidentalJump | Skin Tone 24, Skin Tone 22 | video-004-tl-013, video-004-tl-014 | Inspect the exact source timestamps and document the navigation intent. |
| medium | accidentalJump | Skin Tone 13, Skin Tone 10 | video-004-tl-016, video-004-tl-017 | Inspect the exact source timestamps and document the navigation intent. |
| medium | accidentalJump | Skin Tone 10, Skin Tone 12 | video-004-tl-017, video-004-tl-018 | Inspect the exact source timestamps and document the navigation intent. |
| medium | candidateRecordWithoutTimelineSelection | Skin Tone 05 |  | Confirm the candidate selected-menu evidence and timeline mapping before publication. |
| medium | candidateRecordWithoutTimelineSelection | Skin Tone 14 |  | Confirm the candidate selected-menu evidence and timeline mapping before publication. |
| medium | candidateRecordWithoutTimelineSelection | Skin Tone 15 |  | Confirm the candidate selected-menu evidence and timeline mapping before publication. |
| medium | candidateRecordWithoutTimelineSelection | Skin Tone 16 |  | Confirm the candidate selected-menu evidence and timeline mapping before publication. |
| medium | repeatedSelection | Skin Tone 10, Skin Tone 10 | video-004-tl-004, video-004-tl-017 | Confirm whether this is intentional overlap, selector wrap, or an accidental repeated selection before publication. |
| medium | reversedMovement | Skin Tone 20, Skin Tone 19 | video-004-tl-005, video-004-tl-006 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | reversedMovement | Skin Tone 19, Skin Tone 18 | video-004-tl-006, video-004-tl-007 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | reversedMovement | Skin Tone 08, Skin Tone 07 | video-004-tl-009, video-004-tl-010 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | reversedMovement | Skin Tone 07, Skin Tone 06 | video-004-tl-010, video-004-tl-011 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | skippedIndices | Skin Tone 18, Skin Tone 21 | video-004-tl-007, video-004-tl-008 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| medium | skippedIndices | Skin Tone 24, Skin Tone 22 | video-004-tl-013, video-004-tl-014 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| medium | skippedIndices | Skin Tone 13, Skin Tone 10 | video-004-tl-016, video-004-tl-017 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| medium | skippedIndices | Skin Tone 10, Skin Tone 12 | video-004-tl-017, video-004-tl-018 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |

### Skin Details

- Candidate records: 10
- Deliberate selected events: 10
- Matched known selected records: 10
- Selector completeness claim: not_proven
- Review suggestions: 8

| Priority | Code | Labels | Timeline IDs | Review action |
| --- | --- | --- | --- | --- |
| high | accidentalJump | Scar 2, Redness 2 | video-005-tl-005, video-005-tl-006 | Inspect the exact source timestamps and document the navigation intent. |
| high | accidentalJump | Scar 1, Redness 1 | video-005-tl-009, video-005-tl-010 | Inspect the exact source timestamps and document the navigation intent. |
| high | incompleteSelectorEnding | Freckles 1 | video-005-tl-011 | Record first/final value, boundary, wrap behavior, and category exit evidence before production publication. |
| high | skippedIndices | Scar 2, Redness 2 | video-005-tl-005, video-005-tl-006 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| high | skippedIndices | Scar 1, Redness 1 | video-005-tl-009, video-005-tl-010 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| medium | reversedMovement | Redness 2, Redness 3 | video-005-tl-006, video-005-tl-007 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | reversedMovement | Redness 3, Acne Scar 1 | video-005-tl-007, video-005-tl-008 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | reversedMovement | Acne Scar 1, Scar 1 | video-005-tl-008, video-005-tl-009 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |

### Eye Shape

- Candidate records: 5
- Deliberate selected events: 5
- Matched known selected records: 5
- Selector completeness claim: not_proven
- Review suggestions: 1

| Priority | Code | Labels | Timeline IDs | Review action |
| --- | --- | --- | --- | --- |
| high | incompleteSelectorEnding | Hooded | video-006-tl-006 | Record first/final value, boundary, wrap behavior, and category exit evidence before production publication. |

### Eye Color

- Candidate records: 7
- Deliberate selected events: 7
- Matched known selected records: 7
- Selector completeness claim: not_proven
- Review suggestions: 5

| Priority | Code | Labels | Timeline IDs | Review action |
| --- | --- | --- | --- | --- |
| high | incompleteSelectorEnding | Light Green | video-007-tl-008 | Record first/final value, boundary, wrap behavior, and category exit evidence before production publication. |
| medium | accidentalJump | Blue, Hazel | video-007-tl-005, video-007-tl-006 | Inspect the exact source timestamps and document the navigation intent. |
| medium | reversedMovement | Hazel, Grey | video-007-tl-006, video-007-tl-007 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | reversedMovement | Grey, Light Green | video-007-tl-007, video-007-tl-008 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | skippedIndices | Blue, Hazel | video-007-tl-005, video-007-tl-006 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |

### Nose

- Candidate records: 7
- Deliberate selected events: 8
- Matched known selected records: 7
- Selector completeness claim: not_proven_with_warnings
- Review suggestions: 9

| Priority | Code | Labels | Timeline IDs | Review action |
| --- | --- | --- | --- | --- |
| high | accidentalJump | Aquiline, None | video-008-tl-002, video-008-tl-003 | Inspect the exact source timestamps and document the navigation intent. |
| high | incompleteSelectorEnding | Aquiline | video-008-tl-009 | Record first/final value, boundary, wrap behavior, and category exit evidence before production publication. |
| high | reversedMovement | Aquiline, None | video-008-tl-002, video-008-tl-003 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| high | skippedIndices | Aquiline, None | video-008-tl-002, video-008-tl-003 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |
| medium | accidentalJump | Nubian, Funnel | video-008-tl-006, video-008-tl-007 | Inspect the exact source timestamps and document the navigation intent. |
| medium | repeatedSelection | Aquiline, Aquiline | video-008-tl-002, video-008-tl-009 | Confirm whether this is intentional overlap, selector wrap, or an accidental repeated selection before publication. |
| medium | reversedMovement | Funnel, Roman | video-008-tl-007, video-008-tl-008 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | reversedMovement | Roman, Aquiline | video-008-tl-008, video-008-tl-009 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |
| medium | skippedIndices | Nubian, Funnel | video-008-tl-006, video-008-tl-007 | Confirm whether intermediate options were skipped, visible only as thumbnails, or captured in another clip. |

### Ear Shape

- Candidate records: 4
- Deliberate selected events: 5
- Matched known selected records: 4
- Selector completeness claim: not_proven_with_warnings
- Review suggestions: 3

| Priority | Code | Labels | Timeline IDs | Review action |
| --- | --- | --- | --- | --- |
| high | incompleteSelectorEnding | Pointed | video-009-tl-006 | Record first/final value, boundary, wrap behavior, and category exit evidence before production publication. |
| medium | repeatedSelection | None, None | video-009-tl-002, video-009-tl-004 | Confirm whether this is intentional overlap, selector wrap, or an accidental repeated selection before publication. |
| medium | reversedMovement | None, Attached Lobe | video-009-tl-002, video-009-tl-003 | Review the source frames to decide whether this is intentional reverse navigation, wrap, or a record-order issue. |

## Human Review Queue

Use `native_sequence_human_review_queue.csv` for operational review beside the source videos.

