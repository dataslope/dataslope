# Narration audio

One folder per narration script (`src/videos/<video>/script.ts`, its `id`),
holding one MP3 per beat and an `alignment.json` with each beat's ElevenLabs
character timestamps. When a folder exists, its video is timed from the audio
instead of the reading-speed estimate. `npm run narrate -- <video>` writes it;
the format is in `video/README.md`, under "Adding the voice-over later".

`c-pointers/` is the one voiced so far: Drew on `eleven_v4_turbo`, recorded
as one take and cut into its eleven beats.
