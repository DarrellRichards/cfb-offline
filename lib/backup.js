const fs = require('fs');
const path = require('path');

const BACKUP_FOLDER_NAME = 'CFBOfflineBackups';

function buildBackupPath(savePath) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupDir = path.join(path.dirname(savePath), BACKUP_FOLDER_NAME);
	fs.mkdirSync(backupDir, { recursive: true });
	return path.join(backupDir, `${path.basename(savePath)}.backup-${timestamp}`);
}

function copySaveBackup(savePath, options = {}) {
	const backupPath = options.backupPath || buildBackupPath(savePath);
	fs.copyFileSync(savePath, backupPath);
	return backupPath;
}

module.exports = {
	BACKUP_FOLDER_NAME,
	buildBackupPath,
	copySaveBackup,
};
