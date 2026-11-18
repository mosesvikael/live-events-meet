import { AnyAction } from 'redux';

import { IStore } from '../app/types';
import {
    CONFERENCE_JOINED,
    CONFERENCE_LEFT,
    CONFERENCE_WILL_LEAVE,
    ENDPOINT_MESSAGE_RECEIVED
} from '../base/conference/actionTypes';
import i18next from '../base/i18n/i18next';
import { getLocalParticipant, getParticipantDisplayName } from '../base/participants/functions';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import { showErrorNotification } from '../notifications/actions';

import { LIVE_CAPTION_RECEIVED, SET_LIVE_CAPTIONS_ENABLED } from './actionTypes';
import { liveCaptionExpired, liveCaptionReceived, setLiveCaptionsEnabled, setLiveCaptionsError } from './actions';
import {
    CAPTION_DISPLAY_MS,
    INTERIM_THROTTLE_MS,
    LIVE_CAPTION_MESSAGE_TYPE,
    MAX_CAPTION_LENGTH,
    RECOGNITION_LANGUAGES
} from './constants';
import { LiveRecognizer, isSpeechRecognitionSupported } from './recognizer';
import { ICaptionLine } from './types';

let recognizer: LiveRecognizer | undefined;
const expiryTimers = new Map<string, number>();

/**
 * The speech recognition language for the current UI language.
 *
 * @returns {string}
 */
export function getRecognitionLanguage(): string {
    const ui = (i18next.language || 'en').split(/[-_]/)[0].toLowerCase();

    return RECOGNITION_LANGUAGES[ui] ?? 'en-US';
}

/**
 * Starts captioning the local user's voice and sharing each line with the meeting.
 *
 * @param {IStore} store - The redux store.
 * @returns {void}
 */
function startRecognizer({ dispatch, getState }: IStore) {
    stopRecognizer();

    if (!isSpeechRecognitionSupported()) {
        dispatch(setLiveCaptionsEnabled(false));
        dispatch(setLiveCaptionsError('liveEvents.captionsUnsupported'));
        dispatch(showErrorNotification({ titleKey: 'liveEvents.captionsUnsupported' }));

        return;
    }

    const language = getRecognitionLanguage();
    let segment = 0;
    let lastInterimSent = 0;
    let lineId = `${Date.now()}-${segment}`;

    recognizer = new LiveRecognizer(language, (text, final) => {
        const state = getState();
        const { conference } = state['features/base/conference'];
        const local = getLocalParticipant(state);

        if (!local) {
            return;
        }
        const now = Date.now();
        const line: ICaptionLine = {
            final,
            id: lineId,
            language,
            name: local.name || i18next.t('liveEvents.you'),
            participantId: local.id,
            text: text.slice(0, MAX_CAPTION_LENGTH),
            timestamp: now
        };

        dispatch(liveCaptionReceived(line));

        if (conference && (final || now - lastInterimSent > INTERIM_THROTTLE_MS)) {
            lastInterimSent = now;
            try {
                conference.sendEndpointMessage('', {
                    type: LIVE_CAPTION_MESSAGE_TYPE,
                    id: line.id,
                    text: line.text,
                    final,
                    language,
                    timestamp: now
                });
            } catch (e) {
                // The data channel may not be open yet; the next line will try again.
            }
        }
        if (final) {
            segment += 1;
            lineId = `${Date.now()}-${segment}`;
        }
    }, (_fatal, code) => {
        recognizer = undefined;
        dispatch(setLiveCaptionsEnabled(false));
        dispatch(setLiveCaptionsError(`liveEvents.captionsError.${code}`));
        dispatch(showErrorNotification({
            titleKey: 'liveEvents.captionsStopped',
            descriptionKey: code === 'language-not-supported'
                ? 'liveEvents.captionsLanguageUnsupported' : 'liveEvents.captionsBlocked'
        }));
    });
    recognizer.start();
}

/**
 * Stops captioning the local user's voice.
 *
 * @returns {void}
 */
function stopRecognizer() {
    recognizer?.stop();
    recognizer = undefined;
}

/**
 * Hides a participant's caption a few seconds after it last changed.
 *
 * @param {IStore} store - The redux store.
 * @param {ICaptionLine} line - The line now on stage.
 * @returns {void}
 */
function scheduleExpiry({ dispatch }: IStore, line: ICaptionLine) {
    const previous = expiryTimers.get(line.participantId);

    if (previous) {
        window.clearTimeout(previous);
    }
    expiryTimers.set(line.participantId, window.setTimeout(() => {
        expiryTimers.delete(line.participantId);
        dispatch(liveCaptionExpired(line.participantId, line.id));
    }, CAPTION_DISPLAY_MS));
}

MiddlewareRegistry.register(store => next => (action: AnyAction) => {
    switch (action.type) {
    case SET_LIVE_CAPTIONS_ENABLED: {
        const result = next(action);

        if (action.enabled && store.getState()['features/base/conference'].conference) {
            startRecognizer(store);
        } else if (!action.enabled) {
            stopRecognizer();
        }

        return result;
    }

    case CONFERENCE_JOINED: {
        const result = next(action);

        if (store.getState()['features/live-captions'].enabled) {
            startRecognizer(store);
        }

        return result;
    }

    case CONFERENCE_WILL_LEAVE:
    case CONFERENCE_LEFT:
        stopRecognizer();
        expiryTimers.forEach(t => window.clearTimeout(t));
        expiryTimers.clear();

        return next(action);

    case ENDPOINT_MESSAGE_RECEIVED: {
        const { participant, data } = action;

        if (data?.type === LIVE_CAPTION_MESSAGE_TYPE && typeof data.text === 'string' && participant) {
            const participantId = participant.getId();

            store.dispatch(liveCaptionReceived({
                final: Boolean(data.final),
                id: String(data.id ?? Date.now()).slice(0, 64),
                language: String(data.language ?? '').slice(0, 16),
                name: getParticipantDisplayName(store.getState(), participantId),
                participantId,
                text: data.text.slice(0, MAX_CAPTION_LENGTH),
                timestamp: Number(data.timestamp) || Date.now()
            }));
        }

        return next(action);
    }

    case LIVE_CAPTION_RECEIVED: {
        const result = next(action);

        scheduleExpiry(store, action.line);

        return result;
    }
    }

    return next(action);
});
