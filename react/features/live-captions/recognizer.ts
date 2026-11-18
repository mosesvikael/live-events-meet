import logger from './logger';

type ResultHandler = (text: string, final: boolean) => void;
type ErrorHandler = (fatal: boolean, code: string) => void;

/**
 * Returns the browser's speech recognition constructor, if any. Chrome and Edge have it.
 *
 * @returns {Function|undefined}
 */
function getRecognitionClass(): any {
    const w = window as any;

    return w.SpeechRecognition || w.webkitSpeechRecognition;
}

/**
 * Whether this browser can caption the local user's voice.
 *
 * @returns {boolean}
 */
export function isSpeechRecognitionSupported(): boolean {
    return typeof window !== 'undefined' && Boolean(getRecognitionClass());
}

/**
 * Wraps the browser's speech recognition. It keeps listening until stopped, restarting itself when
 * the browser ends a session, which Chrome does after a pause or about a minute of speech.
 */
export class LiveRecognizer {
    private recognition: any;
    private running = false;

    /**
     * Creates a recognizer.
     *
     * @param {string} language - BCP 47 language, such as sw-TZ.
     * @param {ResultHandler} onResult - Called with interim and final text.
     * @param {ErrorHandler} onError - Called when recognition fails.
     */
    constructor(private language: string, private onResult: ResultHandler, private onError: ErrorHandler) {}

    /**
     * Starts listening.
     *
     * @returns {void}
     */
    start() {
        const Recognition = getRecognitionClass();

        if (!Recognition || this.running) {
            return;
        }
        this.running = true;
        this.open(Recognition);
    }

    /**
     * Stops listening.
     *
     * @returns {void}
     */
    stop() {
        this.running = false;
        const r = this.recognition;

        this.recognition = undefined;
        if (r) {
            r.onend = null;
            try {
                r.stop();
            } catch (e) {
                // Already stopped.
            }
        }
    }

    /**
     * Opens one recognition session.
     *
     * @param {Function} Recognition - The constructor.
     * @returns {void}
     */
    private open(Recognition: any) {
        const r = new Recognition();

        r.continuous = true;
        r.interimResults = true;
        r.lang = this.language;
        r.onresult = (e: any) => {
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const text = String(e.results[i][0]?.transcript ?? '').trim();

                if (text) {
                    this.onResult(text, Boolean(e.results[i].isFinal));
                }
            }
        };
        r.onerror = (e: any) => {
            const fatal = e.error === 'not-allowed' || e.error === 'service-not-allowed'
                || e.error === 'language-not-supported';

            if (e.error !== 'no-speech' && e.error !== 'aborted') {
                logger.warn(`Speech recognition error: ${e.error}`);
            }
            if (fatal) {
                this.stop();
                this.onError(true, e.error);
            }
        };
        r.onend = () => {
            if (this.running) {
                this.open(Recognition);
            }
        };
        this.recognition = r;
        try {
            r.start();
        } catch (e) {
            logger.warn('Speech recognition could not start', e);
        }
    }
}
