import React from 'react';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';

const useStyles = makeStyles()(theme => {
    return {
        container: {
            bottom: '96px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            left: '50%',
            maxWidth: 'min(720px, calc(100% - 32px))',
            pointerEvents: 'none',
            position: 'absolute',
            transform: 'translateX(-50%)',
            width: '100%',
            zIndex: 2
        },
        line: {
            ...theme.typography.bodyShortRegularLarge,
            background: 'rgba(10, 16, 20, 0.85)',
            borderRadius: '8px',
            color: '#fff',
            padding: '6px 14px',
            textAlign: 'center'
        },
        name: {
            color: '#E0A526',
            fontWeight: 700,
            marginRight: '8px'
        },
        interim: {
            opacity: 0.8
        }
    };
});

/**
 * Shows the latest caption of each person who is captioning, with their name, over the video.
 *
 * @returns {JSX.Element|null}
 */
const LiveCaptionsOverlay = () => {
    const { classes, cx } = useStyles();
    const current = useSelector((state: IReduxState) => state['features/live-captions'].current);
    const lines = Object.values(current).sort((a, b) => a.timestamp - b.timestamp)
        .slice(-3);

    if (!lines.length) {
        return null;
    }

    return (
        <div
            aria-live = 'polite'
            className = { classes.container }>
            { lines.map(l => (
                <div
                    className = { cx(classes.line, !l.final && classes.interim) }
                    key = { l.participantId }>
                    <span className = { classes.name }>{ l.name }</span>
                    { l.text }
                </div>
            )) }
        </div>
    );
};

export default LiveCaptionsOverlay;
