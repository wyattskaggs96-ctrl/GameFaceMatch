# Privacy Implementation Notes

- Collect only what is needed for the current recommendation.
- Delete raw video after selecting usable frames.
- Delete rejected frames immediately.
- Delete selected raw frames and depth data after profile generation unless the user separately opts in.
- Save derived measurements only when the user explicitly chooses to save a profile.
- Cloud sync is opt-in and is not part of the initial prototype.
- Analytics must not contain raw face media or precise facial measurements.
- The user must be able to delete session data, saved profiles, screenshots, and all local data.
