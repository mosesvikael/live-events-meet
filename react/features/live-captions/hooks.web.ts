import LiveCaptionsButton from './components/web/LiveCaptionsButton';
import MeetingNotesButton from './components/web/MeetingNotesButton';

const liveCaptions = {
    key: 'livecaptions',
    Content: LiveCaptionsButton,
    group: 2
};

const meetingNotes = {
    key: 'meetingnotes',
    Content: MeetingNotesButton,
    group: 2
};

/**
 * The toolbar button that turns the local user's live captions on or off.
 *
 * @returns {Object}
 */
export function useLiveCaptionsButton() {
    return liveCaptions;
}

/**
 * The toolbar button that opens the meeting notes.
 *
 * @returns {Object}
 */
export function useMeetingNotesButton() {
    return meetingNotes;
}
