import { connect } from 'react-redux';

import { IReduxState } from '../../../app/types';
import { translate } from '../../../base/i18n/functions';
import { IconSubtitles } from '../../../base/icons/svg';
import AbstractButton, { IProps as AbstractButtonProps } from '../../../base/toolbox/components/AbstractButton';
import { setLiveCaptionsEnabled } from '../../actions';

interface IProps extends AbstractButtonProps {

    /**
     * Whether the local user is captioning their voice.
     */
    _enabled: boolean;
}

/**
 * Turns the local user's live captions on or off. Everyone in the meeting sees them, with this user's name.
 */
class LiveCaptionsButton extends AbstractButton<IProps> {
    override accessibilityLabel = 'liveEvents.captionsOn';
    override toggledAccessibilityLabel = 'liveEvents.captionsOff';
    override icon = IconSubtitles;
    override label = 'liveEvents.captionsOn';
    override toggledLabel = 'liveEvents.captionsOff';
    override tooltip = 'liveEvents.captionsTooltip';

    /**
     * Toggles captions.
     *
     * @returns {void}
     */
    override _handleClick() {
        const { _enabled, dispatch } = this.props;

        dispatch(setLiveCaptionsEnabled(!_enabled));
    }

    /**
     * Whether captions are on.
     *
     * @returns {boolean}
     */
    override _isToggled() {
        return this.props._enabled;
    }
}

const mapStateToProps = (state: IReduxState) => {
    return {
        _enabled: state['features/live-captions'].enabled
    };
};

export default translate(connect(mapStateToProps)(LiveCaptionsButton));
