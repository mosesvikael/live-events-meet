import { describe, expect, it, vi } from 'vitest';

import { IReduxState } from '../app/types';

import { buildMeetingNotes, notesToText } from './functions';
import { ICaptionLine } from './types';

vi.mock('../chat/constants', () => ({
    MESSAGE_TYPE_LOCAL: 'local',
    MESSAGE_TYPE_REMOTE: 'remote'
}));

const T0 = Date.UTC(2026, 10, 18, 13, 0, 0);

/**
 * Builds a caption line.
 *
 * @param {string} name - Who spoke.
 * @param {string} text - What they said.
 * @param {number} minute - Minutes after the start.
 * @returns {ICaptionLine}
 */
function caption(name: string, text: string, minute: number): ICaptionLine {
    return {
        final: true,
        id: `${name}-${minute}`,
        language: 'sw-TZ',
        name,
        participantId: name.toLowerCase(),
        text,
        timestamp: T0 + (minute * 60000)
    };
}

/**
 * Builds the slice of redux state the notes read.
 *
 * @returns {IReduxState}
 */
function makeState() {
    return {
        'features/base/conference': { conferenceTimestamp: T0 },
        'features/live-captions': {
            current: {},
            enabled: false,
            lines: [
                caption('Amina', 'Karibuni wote kwenye kikao cha leo.', 1),
                caption('Joseph', 'Nitatuma bajeti kesho asubuhi.', 2),
                caption('Neema', 'Nous allons confirmer la salle demain.', 3)
            ]
        },
        'features/chat': {
            messages: [
                { displayName: 'Moses', message: 'I will share the slides by Friday.', messageType: 'remote',
                    timestamp: T0 + 150000, privateMessage: false, isReaction: false, lobbyChat: false },
                { displayName: 'Moses', message: 'secret plan, will tell you later', messageType: 'remote',
                    timestamp: T0 + 160000, privateMessage: true, isReaction: false, lobbyChat: false },
                { displayName: '', message: 'Connection error', messageType: 'error',
                    timestamp: T0 + 170000, privateMessage: false, isReaction: false, lobbyChat: false }
            ]
        }
    } as unknown as IReduxState;
}

describe('buildMeetingNotes', () => {
    it('merges captions and public chat in time order, leaving out private and error messages', () => {
        const notes = buildMeetingNotes(makeState());

        expect(notes.lines.map(l => l.who)).toEqual([ 'Amina', 'Joseph', 'Moses', 'Neema' ]);
        expect(notes.lines.find(l => l.text.includes('secret'))).toBeUndefined();
        expect(notes.speakers).toHaveLength(4);
    });

    it('finds action items in Kiswahili, French and English', () => {
        const notes = buildMeetingNotes(makeState());

        expect(notes.actionItems.map(l => l.who)).toEqual([ 'Joseph', 'Moses', 'Neema' ]);
    });

    it('writes plain-text notes with the transcript', () => {
        const t = (key: string) => key;
        const text = notesToText(buildMeetingNotes(makeState()), t, 'kikao-cha-leo');

        expect(text).toContain('kikao-cha-leo');
        expect(text).toContain('Joseph: Nitatuma bajeti kesho asubuhi.');
        expect(text).toContain('Moses (chat): I will share the slides by Friday.');
    });
});
