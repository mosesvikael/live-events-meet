import { IReduxState } from '../app/types';
import { MESSAGE_TYPE_LOCAL, MESSAGE_TYPE_REMOTE } from '../chat/constants';

export interface INoteLine {
    source: 'caption' | 'chat';
    text: string;
    timestamp: number;
    who: string;
}

export interface IMeetingNotes {
    actionItems: INoteLine[];
    keyPoints: INoteLine[];
    lines: INoteLine[];
    minutes: number;
    speakers: Array<{ count: number; name: string; }>;
}

/**
 * Phrases that usually mean someone committed to doing something, in English, Kiswahili and French.
 * This rule-based draft is the place to plug in a language model later.
 */
const ACTION_CUES = new RegExp([

    // English
    'will', 'i’ll', 'i\'ll', 'we\'ll', 'need to', 'needs to', 'should', 'must', 'let’s', 'let\'s',
    'deadline', 'follow up', 'send', 'share', 'by (?:monday|tuesday|wednesday|thursday|friday|tomorrow|next week)',

    // Kiswahili: nita- (I will), tuta- (we will), ata- (they will), lazima, inabidi, kesho, wiki ijayo, ifikapo
    'nita\\w+', 'tuta\\w+', 'atatuma', 'atafanya', 'lazima', 'inabidi', 'tafadhali', 'kesho', 'wiki ijayo',
    'ifikapo', 'kabla ya',

    // French
    'je vais', 'nous allons', 'on va', 'il faut', 'doit', 'demain', 'la semaine prochaine', 'avant'
].map(c => `\\b${c}\\b`).join('|'), 'i');

/**
 * Collects the meeting transcript (everyone's final captions) and public chat, oldest first.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {INoteLine[]}
 */
export function getMeetingLines(state: IReduxState): INoteLine[] {
    const captions: INoteLine[] = state['features/live-captions'].lines.map(l => ({
        source: 'caption',
        text: l.text,
        timestamp: l.timestamp,
        who: l.name
    }));
    const chat: INoteLine[] = state['features/chat'].messages
        .filter(m => !m.privateMessage && !m.isReaction && !m.isDeleted && !m.lobbyChat
            && (m.messageType === MESSAGE_TYPE_LOCAL || m.messageType === MESSAGE_TYPE_REMOTE)
            && m.message)
        .map(m => ({
            source: 'chat',
            text: m.message,
            timestamp: m.timestamp,
            who: m.displayName
        }));

    return [ ...captions, ...chat ].sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Builds draft meeting notes: who spoke, key points and action items.
 *
 * @param {IReduxState} state - The redux state.
 * @returns {IMeetingNotes}
 */
export function buildMeetingNotes(state: IReduxState): IMeetingNotes {
    const lines = getMeetingLines(state);
    const started = state['features/base/conference'].conferenceTimestamp || lines[0]?.timestamp || Date.now();
    const counts = new Map<string, number>();

    lines.forEach(l => counts.set(l.who, (counts.get(l.who) ?? 0) + 1));

    return {
        actionItems: lines.filter(l => ACTION_CUES.test(l.text)),
        keyPoints: [ ...lines ].sort((a, b) => b.text.length - a.text.length).slice(0, 5),
        lines,
        minutes: Math.max(1, Math.round((Date.now() - started) / 60000)),
        speakers: [ ...counts.entries() ].map(([ name, count ]) => ({
            count,
            name
        }))
            .sort((a, b) => b.count - a.count)
    };
}

/**
 * Formats notes as plain text, for copying or downloading.
 *
 * @param {IMeetingNotes} notes - The notes.
 * @param {Function} t - The translate function.
 * @param {string} room - The meeting name.
 * @returns {string}
 */
export function notesToText(notes: IMeetingNotes, t: Function, room: string): string {
    const time = (ts: number) => new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    const out = [
        `${t('liveEvents.notesTitle')}: ${room}`,
        t('liveEvents.notesSummary', {
            count: notes.lines.length,
            people: notes.speakers.length,
            minutes: notes.minutes
        }),
        '',
        `## ${t('liveEvents.actionItems')}`,
        ...(notes.actionItems.length ? notes.actionItems.map(l => `- ${l.who}: ${l.text}`) : [ t('liveEvents.none') ]),
        '',
        `## ${t('liveEvents.keyPoints')}`,
        ...notes.keyPoints.map(l => `- ${l.who}: ${l.text}`),
        '',
        `## ${t('liveEvents.whoSpoke')}`,
        ...notes.speakers.map(s => `- ${s.name}: ${s.count}`),
        '',
        `## ${t('liveEvents.transcript')}`,
        ...notes.lines.map(l => `[${time(l.timestamp)}] ${l.who}${l.source === 'chat' ? ' (chat)' : ''}: ${l.text}`)
    ];

    return out.join('\n');
}
