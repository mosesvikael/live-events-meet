import {
    LIVE_CAPTION_EXPIRED,
    LIVE_CAPTION_RECEIVED,
    SET_LIVE_CAPTIONS_ENABLED,
    SET_LIVE_CAPTIONS_ERROR
} from './actionTypes';
import { ICaptionLine } from './types';

/**
 * Turns the local user's live captions on or off.
 *
 * @param {boolean} enabled - Whether captions should be on.
 * @returns {Object}
 */
export function setLiveCaptionsEnabled(enabled: boolean) {
    return {
        type: SET_LIVE_CAPTIONS_ENABLED,
        enabled
    };
}

/**
 * Stores a caption line from the local user or from someone else in the meeting.
 *
 * @param {ICaptionLine} line - The caption line.
 * @returns {Object}
 */
export function liveCaptionReceived(line: ICaptionLine) {
    return {
        type: LIVE_CAPTION_RECEIVED,
        line
    };
}

/**
 * Hides the caption a participant has on stage, if it is still the given one.
 *
 * @param {string} participantId - The participant.
 * @param {string} id - The caption id that expired.
 * @returns {Object}
 */
export function liveCaptionExpired(participantId: string, id: string) {
    return {
        type: LIVE_CAPTION_EXPIRED,
        participantId,
        id
    };
}

/**
 * Sets the live captions error key, or clears it.
 *
 * @param {string|undefined} error - A translation key describing the error.
 * @returns {Object}
 */
export function setLiveCaptionsError(error?: string) {
    return {
        type: SET_LIVE_CAPTIONS_ERROR,
        error
    };
}
