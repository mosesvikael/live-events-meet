import { CONFERENCE_JOINED } from '../base/conference/actionTypes';
import ReducerRegistry from '../base/redux/ReducerRegistry';

import {
    LIVE_CAPTION_EXPIRED,
    LIVE_CAPTION_RECEIVED,
    SET_LIVE_CAPTIONS_ENABLED,
    SET_LIVE_CAPTIONS_ERROR
} from './actionTypes';
import { ICaptionLine } from './types';

/**
 * Keep at most this many final lines, which is several hours of talking.
 */
const MAX_LINES = 5000;

export interface ILiveCaptionsState {

    /**
     * The caption each participant currently has on stage, keyed by participant id.
     */
    current: { [participantId: string]: ICaptionLine; };

    /**
     * Whether the local user is captioning their own voice.
     */
    enabled: boolean;

    /**
     * A translation key for the last error, if any.
     */
    error?: string;

    /**
     * All final caption lines of this meeting, oldest first. This is the transcript.
     */
    lines: ICaptionLine[];
}

const DEFAULT_STATE: ILiveCaptionsState = {
    current: {},
    enabled: false,
    error: undefined,
    lines: []
};

ReducerRegistry.register<ILiveCaptionsState>('features/live-captions',
(state = DEFAULT_STATE, action): ILiveCaptionsState => {
    switch (action.type) {
    case CONFERENCE_JOINED:
        // A new meeting starts with an empty transcript.
        return {
            ...DEFAULT_STATE,
            enabled: state.enabled
        };

    case SET_LIVE_CAPTIONS_ENABLED:
        return {
            ...state,
            enabled: action.enabled,
            error: action.enabled ? undefined : state.error
        };

    case SET_LIVE_CAPTIONS_ERROR:
        return {
            ...state,
            error: action.error
        };

    case LIVE_CAPTION_RECEIVED: {
        const line: ICaptionLine = action.line;

        return {
            ...state,
            current: {
                ...state.current,
                [line.participantId]: line
            },
            lines: line.final ? [ ...state.lines, line ].slice(-MAX_LINES) : state.lines
        };
    }

    case LIVE_CAPTION_EXPIRED: {
        if (state.current[action.participantId]?.id !== action.id) {
            return state;
        }
        const current = { ...state.current };

        delete current[action.participantId];

        return {
            ...state,
            current
        };
    }
    }

    return state;
});
