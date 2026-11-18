import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { makeStyles } from 'tss-react/mui';

import { IReduxState } from '../../../app/types';
import { getConferenceName } from '../../../base/conference/functions';
import Dialog from '../../../base/ui/components/web/Dialog';
import { buildMeetingNotes, notesToText } from '../../functions';

const useStyles = makeStyles()(theme => {
    return {
        body: {
            ...theme.typography.bodyShortRegular,
            color: theme.palette.text01
        },
        heading: {
            ...theme.typography.labelBold,
            margin: '16px 0 6px'
        },
        list: {
            margin: 0,
            paddingLeft: '20px',
            '& li': {
                marginBottom: '4px'
            }
        },
        muted: {
            color: theme.palette.text03
        },
        who: {
            fontWeight: 600
        },
        download: {
            color: theme.palette.link01,
            display: 'inline-block',
            marginTop: '16px'
        }
    };
});

/**
 * Shows draft meeting notes built from everyone's live captions and the public chat.
 *
 * @returns {JSX.Element}
 */
const MeetingNotesDialog = () => {
    const { t } = useTranslation();
    const { classes } = useStyles();
    const state = useSelector((s: IReduxState) => s);
    const notes = useMemo(() => buildMeetingNotes(state), [ state ]);
    const room = getConferenceName(state);
    const text = useMemo(() => notesToText(notes, t, room), [ notes, t, room ]);
    const [ copied, setCopied ] = useState(false);
    const downloadHref = useMemo(() => `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`, [ text ]);

    const onCopy = useCallback(() => {
        navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false));
    }, [ text ]);

    const item = (who: string, line: string, key: number) => (
        <li key = { key }><span className = { classes.who }>{ who }:</span> { line }</li>
    );

    return (
        <Dialog
            cancel = {{ translationKey: 'dialog.close' }}
            disableAutoHideOnSubmit = { true }
            ok = {{
                disabled: !notes.lines.length,
                translationKey: copied ? 'liveEvents.copied' : 'liveEvents.copyNotes'
            }}
            onSubmit = { onCopy }
            size = 'large'
            titleKey = 'liveEvents.notesTitle'>
            <div className = { classes.body }>
                { notes.lines.length ? (
                    <>
                        <p>{ t('liveEvents.notesSummary', {
                            count: notes.lines.length,
                            people: notes.speakers.length,
                            minutes: notes.minutes
                        }) }</p>
                        <div className = { classes.heading }>{ t('liveEvents.actionItems') }</div>
                        { notes.actionItems.length
                            ? <ul className = { classes.list }>
                                { notes.actionItems.map((l, i) => item(l.who, l.text, i)) }
                            </ul>
                            : <p className = { classes.muted }>{ t('liveEvents.none') }</p> }
                        <div className = { classes.heading }>{ t('liveEvents.keyPoints') }</div>
                        <ul className = { classes.list }>
                            { notes.keyPoints.map((l, i) => item(l.who, l.text, i)) }
                        </ul>
                        <div className = { classes.heading }>{ t('liveEvents.whoSpoke') }</div>
                        <ul className = { classes.list }>
                            { notes.speakers.map((s, i) => <li key = { i }>{ s.name }: { s.count }</li>) }
                        </ul>
                        <a
                            className = { classes.download }
                            download = { `${room || 'meeting'}-notes.txt` }
                            href = { downloadHref }>
                            { t('liveEvents.downloadNotes') }
                        </a>
                        <p className = { classes.muted }>{ t('liveEvents.notesDraft') }</p>
                    </>
                ) : (
                    <p className = { classes.muted }>{ t('liveEvents.notesEmpty') }</p>
                ) }
            </div>
        </Dialog>
    );
};

export default MeetingNotesDialog;
