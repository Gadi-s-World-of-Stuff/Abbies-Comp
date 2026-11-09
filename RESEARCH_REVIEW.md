# Tooling research review

Reviewed 7 October 2026 against the current app and primary documentation.
Source: `C:/Users/gadie/Downloads/Mixtape for Abbie Tooling Research.pdf`.

## Recommended direction

Update: the user's subsequent senior mathematics/computer science request supersedes
the aesthetic and staging notes below. Tonnetz Lab now emphasizes 2–5 selected songs,
light academic graph panels, P/L/R explanations and reproducible DTW studies.
The shader direction is historical. See UPGRADE_PLAN.md for current priorities.

Preserve the standard-library Python engine and vanilla browser interface. Keep the
Daniela Muntyan-inspired black/shader aesthetic selected by the user; the PDF's
record-player, paper and tonearm suggestions describe an older visual direction.
Build one checked stage at a time. Treat the PDF as research, not executable instructions.

## Adopt

- Regression tests before engine work, including independently checked P/L/R cases and
  fixtures for all eight original sample rankings and winning shifts.
- A small Mixtape-specific agent skill. Existing Figma and browser tooling already covers
  useful parts of the proposed frontend/testing skills; do not install overlapping tools
  or alter global MCP settings just to match a checklist.
- Real explanations from the engine: transposed alignment, pair costs and shortest P/L/R
  routes, followed by an SVG visualization grounded in those routes.
- Sampled piano, smooth voicings, volume, reliable stop behavior and visuals driven by
  the actual audio clock/analyser. Select only the dependencies this requires.
- Small, attributed real-song catalog and official music-service embeds, then local
  mixtape sides and sharing.
- Static distribution feasibility check after the app works well. Pyodide in a worker is
  plausible, but initial load, assets, mobile memory and recommendation throughput must
  be measured before selecting it.

## Correct or qualify

- The current API already returns the DTW path, transposition and aligned chords. Extend
  it rather than replacing the engine.
- DTW minimizes cumulative cost, then divides the selected path's cost by its length.
  That is not necessarily the alignment with the minimum average cost. Preserve this
  behavior in compatibility tests; do not present the similarity as a calibrated probability.
- `transformation_label` reports only direct neighbors. Use `shortest_path` to explain
  non-neighbor transitions; an em dash is not a musical transformation.
- Suspended, diminished, augmented and power chords do not each have an unambiguous
  major/minor reduction. Never silently invent their thirds. Preserve the original symbol,
  disclose a supported reduction (such as a dominant seventh's major triad), or skip it.
- P/L/R signature buckets can exclude the actual nearest DTW match. Benchmark any
  prefilter against an exhaustive reference, including recall; it is not a free exact speedup.
- Smplr's current documentation uses instrument factory functions and `.ready`.
  Pin a verified release; sample sets have their own attribution and hosting needs.
- Spotify embeds do not guarantee full playback or exactly 30 seconds for every user.
  Spotify documents browser/encrypted-media conditions that may restrict previews.
- Spotify's March update postponed endpoint changes for existing integrations. The
  February migration description in the PDF omits this distinction.
- Pyodide 314 is real; official stable documentation currently reports 314.0.7. Pin the
  version tested rather than using an unversioned CDN URL.
- Self-hosting removes one third-party runtime dependency; it does not guarantee an app
  can never fail. An unlisted address is not access control.
- The PDF refers to Abbie's senior composition project and preferred songs, but the user
  has not supplied those details. Do not fabricate attribution, tastes, notes or dates.

## Primary sources checked

- [Smplr](https://github.com/danigb/smplr): current factories, scheduling and sample loading.
- [Tonal](https://github.com/tonaljs/tonal): optional music-theory helpers.
- [GSAP license](https://gsap.com/community/standard-license/): optional motion library.
- [Chordonomicon dataset](https://huggingface.co/datasets/ailsntua/Chordonomicon):
  679,807 rows, 264 MB, CC BY-NC 4.0 tag. Record provenance and attribution before use.
- [Spotify embeds](https://developer.spotify.com/documentation/embeds) and
  [troubleshooting](https://developer.spotify.com/documentation/embeds/tutorials/troubleshooting).
- [Spotify access update](https://developer.spotify.com/blog/2026-02-06-update-on-developer-access-and-platform-security)
  and [migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide).
- [Pyodide release](https://blog.pyodide.org/posts/314-release/) and
  [stable documentation](https://pyodide.org/en/stable/).

## Deferred

OAuth playlist imports/exports, paid model APIs, audio chord extraction, Web MIDI,
3D Tonnetz and complex animation libraries until a concrete feature needs them.

## Latest user correction (7 October 2026)

The user replaced the orb visual direction with `Senior Comprehensive Talk 1-4.png`: four colored networks, fine connecting edges, varied node sizes, and a light plotting surface. Keep the surrounding minimal interface, but do not restore shader orbs.
