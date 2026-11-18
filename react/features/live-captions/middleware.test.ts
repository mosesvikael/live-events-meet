// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from 'vitest';

let middleware: Function;

vi.mock('../base/redux/MiddlewareRegistry', () => ({
    default: { register: (fn: Function) => {
        middleware = fn;
    } }
}));
vi.mock('../base/i18n/i18next', () => ({
    default: { language: 'sw', t: (k: string) => k }
}));
vi.mock('../base/participants/functions', () => ({
    getLocalParticipant: () => ({ id: 'me', name: 'Moses' }),
    getParticipantDisplayName: (_s: unknown, id: string) => (id === 'p2' ? 'Amina' : 'Guest')
}));
vi.mock('../notifications/actions', () => ({
    showErrorNotification: (props: object) => ({ type: 'SHOW_ERROR', props })
}));
vi.mock('./logger', () => ({ default: { warn: vi.fn() } }));

/**
 * A stand-in for the browser's speech recognition.
 */
class FakeRecognition {
    static last: FakeRecognition;
    continuous = false;
    interimResults = false;
    lang = '';
    onresult: Function | null = null;
    onend: Function | null = null;
    onerror: Function | null = null;
    started = false;

    /**
     * Records the instance.
     */
    constructor() {
        FakeRecognition.last = this;
    }

    /**
     * Starts.
     *
     * @returns {void}
     */
    start() {
        this.started = true;
    }

    /**
     * Stops.
     *
     * @returns {void}
     */
    stop() {
        this.started = false;
    }

    /**
     * Emits one recognition result.
     *
     * @param {string} text - Recognized text.
     * @param {boolean} isFinal - Whether it is final.
     * @returns {void}
     */
    say(text: string, isFinal: boolean) {
        const result: any = [ { transcript: text } ];

        result.isFinal = isFinal;
        this.onresult?.({ resultIndex: 0, results: [ result ] });
    }
}

/**
 * Creates a minimal store that runs actions through the live captions middleware.
 *
 * @returns {Object}
 */
async function makeStore() {
    await import('./middleware');
    const sent: any[] = [];
    const dispatched: any[] = [];
    const state: any = {
        'features/base/conference': { conference: { sendEndpointMessage: (_to: string, data: any) => sent.push(data) } },
        'features/live-captions': { enabled: false }
    };
    const store: any = {
        getState: () => state,
        dispatch: (action: any) => {
            dispatched.push(action);

            return middleware(store)((a: any) => a)(action);
        }
    };

    return { dispatched, sent, state, store };
}

describe('live captions middleware', () => {
    beforeEach(() => {
        (window as any).webkitSpeechRecognition = FakeRecognition;
    });

    it('captions the local voice in Kiswahili and shares final and interim lines with the meeting', async () => {
        const { dispatched, sent, store } = await makeStore();

        store.dispatch({ type: 'SET_LIVE_CAPTIONS_ENABLED', enabled: true });
        const rec = FakeRecognition.last;

        expect(rec.started).toBe(true);
        expect(rec.lang).toBe('sw-TZ');

        rec.say('Habari za asubuhi', true);

        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({ type: 'let-live-caption', text: 'Habari za asubuhi', final: true,
            language: 'sw-TZ' });
        const received = dispatched.filter(a => a.type === 'LIVE_CAPTION_RECEIVED');

        expect(received[0].line).toMatchObject({ name: 'Moses', participantId: 'me', final: true });

        store.dispatch({ type: 'SET_LIVE_CAPTIONS_ENABLED', enabled: false });
        expect(rec.started).toBe(false);
    });

    it('turns a caption from another participant into a line with their name', async () => {
        const { dispatched, store } = await makeStore();

        store.dispatch({
            type: 'ENDPOINT_MESSAGE_RECEIVED',
            participant: { getId: () => 'p2' },
            data: { type: 'let-live-caption', id: 'x1', text: 'Nitatuma ripoti kesho', final: true, language: 'sw-TZ',
                timestamp: 1 }
        });

        const line = dispatched.find(a => a.type === 'LIVE_CAPTION_RECEIVED')?.line;

        expect(line).toMatchObject({ name: 'Amina', participantId: 'p2', text: 'Nitatuma ripoti kesho', final: true });
    });

    it('ignores other endpoint messages', async () => {
        const { dispatched, store } = await makeStore();

        store.dispatch({ type: 'ENDPOINT_MESSAGE_RECEIVED', participant: { getId: () => 'p2' },
            data: { type: 'something-else', text: 'hi' } });

        expect(dispatched.some(a => a.type === 'LIVE_CAPTION_RECEIVED')).toBe(false);
    });

    it('turns captions off and explains when the browser blocks the microphone', async () => {
        const { dispatched, store } = await makeStore();

        store.dispatch({ type: 'SET_LIVE_CAPTIONS_ENABLED', enabled: true });
        FakeRecognition.last.onerror?.({ error: 'not-allowed' });

        expect(dispatched).toContainEqual({ type: 'SET_LIVE_CAPTIONS_ENABLED', enabled: false });
        expect(dispatched.some(a => a.type === 'SHOW_ERROR')).toBe(true);
    });
});
