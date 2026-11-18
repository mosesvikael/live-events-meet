/**
 * The local user turned their own live captions on or off.
 */
export const SET_LIVE_CAPTIONS_ENABLED = 'SET_LIVE_CAPTIONS_ENABLED';

/**
 * A caption line (local or remote) was received.
 */
export const LIVE_CAPTION_RECEIVED = 'LIVE_CAPTION_RECEIVED';

/**
 * The caption currently shown on stage should be hidden.
 */
export const LIVE_CAPTION_EXPIRED = 'LIVE_CAPTION_EXPIRED';

/**
 * The live captions error state changed (for example, the browser cannot recognize speech).
 */
export const SET_LIVE_CAPTIONS_ERROR = 'SET_LIVE_CAPTIONS_ERROR';
