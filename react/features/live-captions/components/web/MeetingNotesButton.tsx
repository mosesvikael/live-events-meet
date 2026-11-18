import { connect } from 'react-redux';

import { openDialog } from '../../../base/dialog/actions';
import { translate } from '../../../base/i18n/functions';
import { IconShareDoc } from '../../../base/icons/svg';
import AbstractButton, { IProps as AbstractButtonProps } from '../../../base/toolbox/components/AbstractButton';

import MeetingNotesDialog from './MeetingNotesDialog';

/**
 * Opens the meeting notes: summary, action items and the transcript.
 */
class MeetingNotesButton extends AbstractButton<AbstractButtonProps> {
    override accessibilityLabel = 'liveEvents.notesTitle';
    override icon = IconShareDoc;
    override label = 'liveEvents.notesTitle';
    override tooltip = 'liveEvents.notesTitle';

    /**
     * Opens the notes dialog.
     *
     * @returns {void}
     */
    override _handleClick() {
        this.props.dispatch(openDialog('MeetingNotesDialog', MeetingNotesDialog));
    }
}

export default translate(connect()(MeetingNotesButton));
