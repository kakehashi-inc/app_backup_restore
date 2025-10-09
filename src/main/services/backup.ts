import path from 'path';
import { BACKUP_FILE_NAMES, BACKUP_METADATA_FILENAME } from '../../shared/constants';
import type { BackupMetadata, ManagerId } from '../../shared/types';
import { writeJsonFile, readJsonFile } from '../utils/fsx';
import { listWinget, listMsStore, listScoop, listChocolatey } from './managers';

export async function runBackup(
    backupDir: string,
    managers?: ManagerId[]
): Promise<{ written: string[]; metadataUpdated: boolean }> {
    const targetManagers: ManagerId[] =
        managers && managers.length ? managers : ['winget', 'msstore', 'scoop', 'chocolatey'];

    const written: string[] = [];

    for (const m of targetManagers) {
        if (m === 'winget') {
            const items = await listWinget();
            const file = path.join(backupDir, BACKUP_FILE_NAMES.winget);
            writeJsonFile(file, items);
            written.push(file);
        } else if (m === 'msstore') {
            const items = await listMsStore();
            const file = path.join(backupDir, BACKUP_FILE_NAMES.msstore);
            writeJsonFile(file, items);
            written.push(file);
        } else if (m === 'scoop') {
            const items = await listScoop();
            const file = path.join(backupDir, BACKUP_FILE_NAMES.scoop);
            writeJsonFile(file, items);
            written.push(file);
        } else if (m === 'chocolatey') {
            const items = await listChocolatey();
            const file = path.join(backupDir, BACKUP_FILE_NAMES.chocolatey);
            writeJsonFile(file, items);
            written.push(file);
        }
    }

    // update metadata
    const metadataPath = path.join(backupDir, BACKUP_METADATA_FILENAME);
    const metadata = readJsonFile<BackupMetadata>(metadataPath, {} as BackupMetadata);
    const now = new Date().toISOString();
    for (const m of targetManagers) {
        (metadata as any)[m] = { last_backup: now };
    }
    writeJsonFile(metadataPath, metadata);

    return { written, metadataUpdated: true };
}

export function getBackupMetadata(backupDir: string): BackupMetadata {
    const metadataPath = path.join(backupDir, BACKUP_METADATA_FILENAME);
    return readJsonFile<BackupMetadata>(metadataPath, {} as BackupMetadata);
}

export async function runBackupSelected(
    backupDir: string,
    manager: ManagerId,
    identifiers: string[]
): Promise<{ written: string[]; metadataUpdated: boolean }> {
    const written: string[] = [];
    if (manager === 'winget' || manager === 'msstore') {
        // For list-based backups we always write full list; selection matters on restore
        return runBackup(backupDir, [manager]);
    }
    if (manager === 'scoop') {
        const items = await listScoop();
        const selected = items.filter(i => identifiers.includes(i.Name));
        const file = path.join(backupDir, BACKUP_FILE_NAMES.scoop);
        writeJsonFile(file, selected);
        written.push(file);
    } else if (manager === 'chocolatey') {
        const items = await listChocolatey();
        const selected = items.filter(i => identifiers.includes(i.PackageId));
        const file = path.join(backupDir, BACKUP_FILE_NAMES.chocolatey);
        writeJsonFile(file, selected);
        written.push(file);
    }
    const metadataPath = path.join(backupDir, BACKUP_METADATA_FILENAME);
    const metadata = readJsonFile<BackupMetadata>(metadataPath, {} as BackupMetadata);
    (metadata as any)[manager] = { last_backup: new Date().toISOString() };
    writeJsonFile(metadataPath, metadata);
    return { written, metadataUpdated: true };
}
