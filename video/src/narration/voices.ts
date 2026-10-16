/**
 * The house narrators. A script names one with `voice` (types.ts), and
 * scripts/narrate.mjs records it in one take on `NARRATION_MODEL`. Both are
 * professional voices from the ElevenLabs library, fine-tuned for that model.
 *
 * Pick by register rather than by subject: Drew is conversational and
 * curious, for a video that walks through a puzzle with the viewer; Hope is
 * brighter and more even, for one that explains a result step by step.
 */
export const VOICES = {
  drew: {
    id: "q0IMILNRPxOgtBTS4taI",
    label: "Drew: casual, curious and fun (young American male)",
  },
  hope: {
    id: "tnSpp4vdxKPjI9w0GnoV",
    label: "Hope: upbeat and clear (young American female)",
  },
} as const;

export type VoiceName = keyof typeof VOICES;

/** The voice of a script that doesn't name one. */
export const DEFAULT_VOICE: VoiceName = "drew";

export const NARRATION_MODEL = "eleven_v4_turbo";

/** The ElevenLabs voice id a script is voiced with. */
export const voiceId = (name: VoiceName | undefined) => VOICES[name ?? DEFAULT_VOICE].id;
