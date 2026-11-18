/**
 * The endpoint message type used to share caption lines with everyone in the meeting.
 */
export const LIVE_CAPTION_MESSAGE_TYPE = 'let-live-caption';

/**
 * How long a caption stays on stage, in milliseconds.
 */
export const CAPTION_DISPLAY_MS = 5000;

/**
 * Interim (not yet final) captions are sent at most this often, in milliseconds.
 */
export const INTERIM_THROTTLE_MS = 400;

/**
 * The maximum length of a caption line we accept.
 */
export const MAX_CAPTION_LENGTH = 2000;

/**
 * Maps the UI language to a speech recognition language. Kiswahili uses the Tanzanian locale.
 */
export const RECOGNITION_LANGUAGES: { [key: string]: string; } = {
    en: 'en-US',
    fr: 'fr-FR',
    sw: 'sw-TZ'
};
