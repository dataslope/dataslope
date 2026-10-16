# Narration audio

One folder per narration script (`src/videos/<video>/script.ts`, its `id`),
holding one MP3 per beat and an `alignment.json` with each beat's ElevenLabs
character timestamps. When a folder exists, its video is timed from the audio
instead of the reading-speed estimate. `npm run narrate -- <video>` writes it;
the format is in `video/README.md`, under "Adding the voice-over later".

Voiced so far, each on `eleven_v4_turbo`, recorded as one take and cut into
its beats:

- `c-pointers/`: Drew (`q0IMILNRPxOgtBTS4taI`), eleven beats.
- `llm-temperature/`: Hope (`tnSpp4vdxKPjI9w0GnoV`), thirteen beats.
- `central-limit-theorem/`: Hope, fifteen beats. The Statistics course is
  narrated by Hope throughout.

Each script names its narrator (`voice` in its `script.ts`), and the take
each folder was cut from is committed in `video/takes/<script id>/`.
