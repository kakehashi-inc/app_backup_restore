import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { DialogType } from '../components/MessageDialog';

export type DialogResult = 'ok' | 'yes' | 'no' | 'cancel';

export interface MessageDialogOptions {
    title?: string;
    message: string;
    type: DialogType;
    okText?: string;
    yesText?: string;
    noText?: string;
    cancelText?: string;
}

export const useMessageDialog = () => {
    const { t } = useTranslation();
    const [dialogState, setDialogState] = useState<{
        open: boolean;
        options: MessageDialogOptions | null;
        resolve: ((value: DialogResult) => void) | null;
    }>({
        open: false,
        options: null,
        resolve: null,
    });

    const showDialog = useCallback(
        (options: MessageDialogOptions): Promise<DialogResult> => {
            return new Promise(resolve => {
                setDialogState({
                    open: true,
                    options: {
                        ...options,
                        okText: options.okText || t('ok'),
                        yesText: options.yesText || t('yes'),
                        noText: options.noText || t('no'),
                        cancelText: options.cancelText || t('cancel'),
                    },
                    resolve,
                });
            });
        },
        [t]
    );

    const handleClose = useCallback(() => {
        if (dialogState.resolve) {
            dialogState.resolve('cancel');
        }
        setDialogState({
            open: false,
            options: null,
            resolve: null,
        });
    }, [dialogState.resolve]);

    const handleResult = useCallback(
        (result: DialogResult) => {
            if (dialogState.resolve) {
                dialogState.resolve(result);
            }
            setDialogState({
                open: false,
                options: null,
                resolve: null,
            });
        },
        [dialogState.resolve]
    );

    // Convenience methods
    const showOk = useCallback(
        (message: string, title?: string) => {
            return showDialog({ message, title, type: 'ok' });
        },
        [showDialog]
    );

    const showYesNo = useCallback(
        (message: string, title?: string) => {
            return showDialog({ message, title, type: 'yesno' });
        },
        [showDialog]
    );

    const showYesNoCancel = useCallback(
        (message: string, title?: string) => {
            return showDialog({ message, title, type: 'yesnocancel' });
        },
        [showDialog]
    );

    return {
        dialogState,
        showDialog,
        showOk,
        showYesNo,
        showYesNoCancel,
        handleClose,
        handleResult,
    };
};
