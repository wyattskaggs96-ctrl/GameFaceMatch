# Current College Football 27 Appearance Menu Hierarchy

**Status:** Research candidate only. Not production data. Not second-person verified.

This tree reconstructs only the directly observed portion of the College Football 27 Road to Glory appearance hierarchy from the current Xbox screen recordings. It does not create verified catalog records, recommendations, or game option IDs.

```text
Create Player
+-- Player
    +-- Appearance [observed, incomplete]
        +-- Head & Skin [observed, incomplete]
        |   +-- Head Template [inspected, incomplete]
        |   +-- Skin Tone [inspected, incomplete]
        |   +-- Skin Details [inspected, incomplete]
        |   +-- Eye Shape [inspected, incomplete]
        |   +-- Eye Color [inspected, incomplete]
        |   +-- Nose [inspected, incomplete]
        |   +-- Ear Shape [inspected, incomplete]
        |   +-- Mouth Shape [visible, not inspected]
        |   +-- Jaw Shape [visible, not inspected]
        |   +-- Chin [visible, not inspected]
        +-- Hair [visible, not inspected]
```

## Evidence Summary

| Menu | Parent | Native order | Evidence | Inspected | Complete | Additional recording required | Notes |
| --- | --- | ---: | --- | --- | --- | --- | --- |
| Appearance | menu-cf27-create-player-player-tab | 2 | video-001 35.0-45.0s, video-002 0.0-5.0s | true | false | true | Appearance is directly observed and entered. Boundary completeness is not claimed because only Head & Skin and Hair are visible; no dedicated Appearance boundary recording exists. |
| Head & Skin | cf27-menu-player-appearance | 1 | video-001 44.0-45.0s, video-002 6.0-7.0s, video-002 10.0-19.0s | true | false | true | Head & Skin hierarchy is directly observed. It is not marked complete because Mouth Shape, Jaw Shape, Chin, and full boundary checks are not independently inspected. |
| Hair | cf27-menu-player-appearance | 2 | video-001 44.0-45.0s, video-002 6.0-7.0s | false | false | true | Hair is visible as a sibling under Appearance, but no current recording opens Hair or proves its child controls. |
| Head Template | cf27-menu-appearance-head-skin | 1 | video-002 10.0-19.0s, video-003 0.0-133.02s | true | false | true | Head Template has dedicated recordings in video-002 and video-003 with selected Face labels, but both inventory and timeline require frame-level segmentation and boundary proof before completion. |
| Skin Tone | cf27-menu-appearance-head-skin | 2 | video-002 10.0-19.0s, video-004 8.0-53.82s | true | false | true | Skin Tone has a dedicated recording with selected labels, but selector boundary and full ordered value continuity are not yet proven. |
| Skin Details | cf27-menu-appearance-head-skin | 3 | video-002 10.0-19.0s, video-005 8.0-31.72s | true | false | true | Skin Details has a dedicated recording with selected labels, but selector boundary and full ordered value continuity are not yet proven. |
| Eye Shape | cf27-menu-appearance-head-skin | 4 | video-002 10.0-19.0s, video-006 14.0-24.93s | true | false | true | Eye Shape has a dedicated recording with selected labels, but selector boundary and full ordered value continuity are not yet proven. |
| Eye Color | cf27-menu-appearance-head-skin | 5 | video-002 10.0-19.0s, video-007 12.0-29.33s | true | false | true | Eye Color has a dedicated recording with selected labels, but selector boundary and full ordered value continuity are not yet proven. |
| Nose | cf27-menu-appearance-head-skin | 6 | video-002 10.0-19.0s, video-008 14.0-32.45s | true | false | true | Nose has a dedicated recording with selected labels, including a repeated Aquiline observation, but selector boundary and full ordered value continuity are not yet proven. |
| Ear Shape | cf27-menu-appearance-head-skin | 7 | video-002 10.0-19.0s, video-009 16.0-30.21s | true | false | true | Ear Shape has a dedicated recording with selected labels, but selector boundary and full ordered value continuity are not yet proven. |
| Mouth Shape | cf27-menu-appearance-head-skin | 8 | video-002 10.0-19.0s | false | false | true | Mouth Shape is visible in the Head & Skin tab row, but no current recording opens or inspects its selector. |
| Jaw Shape | cf27-menu-appearance-head-skin | 9 | video-002 10.0-19.0s | false | false | true | Jaw Shape is visible in the Head & Skin tab row, but no current recording opens or inspects its selector. |
| Chin | cf27-menu-appearance-head-skin | 10 | video-002 10.0-19.0s | false | false | true | Chin is visible in the Head & Skin tab row, but no current recording opens or inspects its selector. |

## Schema Comparison

The strict export at `data/research/cf27/catalog-candidates/research/appearance-menu-hierarchy/menu_map_schema_export.json` is shaped to `data/schemas/menu-map.schema.json`. It includes every required schema field while keeping all entries in `draft` verification status.

The richer research file at `appearance_menu_hierarchy.json` keeps Prompt 86-specific fields that the schema does not currently model directly: `inspected`, `complete`, `additionalRecordingRequired`, `dataClass`, `productionStatus`, source video IDs, timeline IDs, and timestamp ranges. In the schema export, those facts are preserved in `notes` and warning records.

## Completion Rules Used

A submenu is marked complete only when its own recording proves selector boundaries and values. Under that rule, no current Appearance hierarchy submenu is marked complete yet. This is intentionally conservative: several selectors have dedicated recordings, but the current evidence still needs boundary proof, ordering continuity, and second-person verification before any production use.
