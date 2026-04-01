import { useState, useCallback } from 'react';
import type { RestoreConflictItem } from '@shared/types';
import type { RestoreConfirmResult } from '../components/RestoreConfirmDialog';

interface RestoreConfirmState {
    open: boolean;
    conflicts: RestoreConflictItem[];
    currentIndex: number;
}

/**
 * Hook to manage per-file overwrite confirmation during restore.
 * Returns the list of file paths that should be skipped.
 */
export const useRestoreConfirm = () => {
    const [state, setState] = useState<RestoreConfirmState>({
        open: false,
        conflicts: [],
        currentIndex: 0,
    });
    const [resolveRef, setResolveRef] = useState<((skipPaths: string[] | null) => void) | null>(null);
    const [skipPaths, setSkipPaths] = useState<string[]>([]);

    const showConflicts = useCallback((conflicts: RestoreConflictItem[]): Promise<string[] | null> => {
        if (conflicts.length === 0) {
            return Promise.resolve([]);
        }
        return new Promise(resolve => {
            setSkipPaths([]);
            setState({ open: true, conflicts, currentIndex: 0 });
            setResolveRef(() => resolve);
        });
    }, []);

    const handleResult = useCallback(
        (result: RestoreConfirmResult) => {
            const { conflicts, currentIndex } = state;
            const currentConflict = conflicts[currentIndex];

            if (result === 'cancel') {
                setState({ open: false, conflicts: [], currentIndex: 0 });
                resolveRef?.(null);
                setResolveRef(null);
                return;
            }

            if (result === 'overwriteAll') {
                // Don't skip any remaining conflicts
                setState({ open: false, conflicts: [], currentIndex: 0 });
                resolveRef?.(skipPaths);
                setResolveRef(null);
                return;
            }

            if (result === 'skipAll') {
                // Skip all remaining conflicts
                const remaining = conflicts.slice(currentIndex).map(c => c.filePath);
                const allSkips = [...skipPaths, ...remaining];
                setState({ open: false, conflicts: [], currentIndex: 0 });
                resolveRef?.(allSkips);
                setResolveRef(null);
                return;
            }

            // 'yes' or 'no' for current file
            const newSkipPaths = result === 'no' ? [...skipPaths, currentConflict.filePath] : skipPaths;
            setSkipPaths(newSkipPaths);

            const nextIndex = currentIndex + 1;
            if (nextIndex >= conflicts.length) {
                // All conflicts resolved
                setState({ open: false, conflicts: [], currentIndex: 0 });
                resolveRef?.(newSkipPaths);
                setResolveRef(null);
            } else {
                setState(prev => ({ ...prev, currentIndex: nextIndex }));
            }
        },
        [state, resolveRef, skipPaths]
    );

    return {
        restoreConfirmState: state,
        currentConflict: state.conflicts[state.currentIndex] || null,
        showConflicts,
        handleRestoreConfirmResult: handleResult,
    };
};
