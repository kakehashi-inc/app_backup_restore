import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            appTitle: 'App Backup Restore',
            backupDir: 'Backup Directory',
            chooseBackupDir: 'Choose Backup Directory',
            runBackupAll: 'Run Backup (All)',
            manager: 'Manager',
            detectAndList: 'Detect & List',
            restoreExecute: 'Restore (Execute)',
            exportScript: 'Export Script',
        },
    },
    ja: {
        translation: {
            appTitle: 'App Backup Restore',
            backupDir: 'バックアップ先',
            chooseBackupDir: 'バックアップ先を選択',
            runBackupAll: 'バックアップ実行（すべて）',
            manager: 'マネージャー',
            detectAndList: '検出と一覧',
            restoreExecute: 'リストア（実行）',
            exportScript: 'スクリプト出力',
        },
    },
};

i18n.use(initReactI18next).init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
});

export default i18n;
