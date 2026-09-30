# Product principles

- **One Qur'an. Many readers. One shared Khatma.** Every screen answers "what do I do next?".
- **Calm, never pressuring.** There are no points, XP, streaks, leaderboards or public rankings. Nobody is named as "behind". Notifications are few and gentle.
- **Humble.** The app never guarantees reward, acceptance or spiritual outcomes. Copy uses phrasing like "May Allah accept it from you."
- **Private by design.** Dedications are private by default, and making one public needs explicit confirmation. Analytics are opt-in and anonymous. Users can export and delete their data.
- **Trustworthy.** Qur'an text comes from verified sources and is integrity-checked. Statistics come from real data only, and demo data is labelled.

## Roadmap

- **Phase 1 (done):** auth, home, reader, Juz data, create/join Khatma, group management, assignments, progress, completion.
- **Phase 2 (done):** dedications, global statistics, notifications (in-app), bookmarks, reading history, sharing.
- **Phase 3 (architecture ready):**
  - Ramadan mode (basic version available)
  - More translations with attribution
  - Audio recitation with multiple reciters
  - Tafsir from trusted, attributed sources
  - Email and push delivery adapters
  - Service-worker offline caching
  - Native iOS/Android apps on the same services
  - Advanced, consent-based analytics

## Open items before production

- Have native speakers review the Arabic and Urdu UI copy.
- Have a qualified reviewer check the Qur'an text against a printed mushaf, and record the review in `data/quran/SOURCES.md`.
- Configure an email provider (verification, password reset, optional notification emails).
- Provide a privacy policy and terms reviewed for GDPR / UK GDPR.
