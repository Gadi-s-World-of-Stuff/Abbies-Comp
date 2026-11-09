Update: the two prepared excerpts are now integrated into /api/catalog and the lab UI.
Source disclosures and exported study provenance are implemented. Historical stage
notes below describe preparation.

# Curated catalog preparation

The playlist UI still contains examples and manually entered triads. No new real-song
entries have been shipped in this stage. `catalog_import.py` prepares reviewed data;
it does not fetch music, identify songs or automatically connect its output to the UI.

## Candidate source checked 12 October 2026

Chordonomicon's authors link to https://huggingface.co/datasets/ailsntua/Chordonomicon.
The dataset card identifies CC-BY-NC-4.0 and requests citation of Kantarelis, Thomas,
Lyberatos, Dervakos and Stamou (2024), CHORDONOMICON:
https://doi.org/10.48550/arXiv.2410.22046.
The published table includes chord sequences and Spotify identifiers, but not title
and artist-name columns. Resolve and verify names separately before labeling songs.
Do not infer names from row order or fabricate favorite songs.

## Input contract

Supply a JSON array. Every object needs string fields `id`, `title`, `artist`,
`source_url`, `source_record_id`, `source_revision`, `license`, `attribution`,
`excerpt`, and `title_source_url`, plus `original_chords` (1–32 strings).
`excerpt` must describe the actual section or slice chosen; record the original
source location so another researcher can recover it. Pin a dataset revision.
The validator checks structure, not whether an attribution or title is true.

Run `python catalog_import.py curated-input.json curated-output.json`.
An existing output is never overwritten; any invalid record prevents the import.

## Explicit reduction vocabulary

Major/minor triads (bare root, maj, min, m) retain their pitch classes.
7 and maj7 keep the major triad and record omission of the seventh.
m7 keeps the minor triad and records omission of the seventh.
Slash chords record omission of the bass/voicing; the chord before the slash
must itself be supported. Original symbols and every loss remain in the output.
Suspended, power, diminished, augmented, altered and other extensions are rejected.
No unsupported events are silently dropped, and long sequences are not truncated.

## Remaining integration

Select a small attributed corpus and verify titles/artist identities. Keep section
boundaries and repeat policy explicit. Display source links and reduction notices in
the playlist and propagate provenance into exported studies before enabling this
catalog in the app. Do not describe a short excerpt as a full-song analysis.


## Prepared subset — 12 October 2026

Two complete verse_1 excerpts are now prepared in data/curated-catalog.json:
- Row 2: I Want To Die A Beautiful Death — Everclear (13 chord events).
- Row 3: Sad Exchange — Finger Eleven (8 chord events).

Source CSV revision: f3a8b678bd65639c01caa342921733f1db01be23.
Saved original rows and Spotify oEmbed identity references are in
`data/chordonomicon-source-rows.json`. Track and artist identifiers resolve to these
names; chord transcription/matching accuracy has not been independently audio-checked.
Data attribution: Kantarelis et al., CHORDONOMICON (2024), CC-BY-NC-4.0.
The original source URL and citation are retained in every curated record.

The explicit `notation: chordonomicon` mode normalizes s accidentals to # and min
quality to m before reduction, recording notation changes separately in the audit.
Standard notation does not accept these s spellings. Source symbols are preserved.
The UI still uses examples until provenance-aware catalog integration is complete.
