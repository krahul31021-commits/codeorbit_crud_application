const fs = require('fs');
const path = require('path');
const os = require('os');

// In Vercel / serverless environment, the filesystem is read-only except /tmp
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const dataDir = isServerless
  ? path.join(os.tmpdir(), 'orbitvault_data')
  : path.join(__dirname, '..', 'data');

const usersFile = path.join(dataDir, 'users.json');
const notesFile = path.join(dataDir, 'notes.json');
const filesMetaFile = path.join(dataDir, 'files.json');
const vaultFilesDir = path.join(dataDir, 'vault_files');

// Ensure data directory and files exist safely
function initDb() {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(vaultFilesDir)) {
      fs.mkdirSync(vaultFilesDir, { recursive: true });
    }
    if (!fs.existsSync(usersFile)) {
      fs.writeFileSync(usersFile, JSON.stringify([], null, 2), 'utf-8');
    }
    if (!fs.existsSync(notesFile)) {
      fs.writeFileSync(notesFile, JSON.stringify([], null, 2), 'utf-8');
    }
    if (!fs.existsSync(filesMetaFile)) {
      fs.writeFileSync(filesMetaFile, JSON.stringify([], null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn('initDb warning (filesystem operation):', err.message);
  }
}

function readUsers() {
  initDb();
  try {
    if (!fs.existsSync(usersFile)) return [];
    const data = fs.readFileSync(usersFile, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading users file:', err);
    return [];
  }
}

function writeUsers(users) {
  initDb();
  try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing users file:', err);
  }
}

function readNotes() {
  initDb();
  try {
    if (!fs.existsSync(notesFile)) return [];
    const data = fs.readFileSync(notesFile, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading notes file:', err);
    return [];
  }
}

function writeNotes(notes) {
  initDb();
  try {
    fs.writeFileSync(notesFile, JSON.stringify(notes, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing notes file:', err);
  }
}

function readFilesMeta() {
  initDb();
  try {
    if (!fs.existsSync(filesMetaFile)) return [];
    const data = fs.readFileSync(filesMetaFile, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading files meta:', err);
    return [];
  }
}

function writeFilesMeta(files) {
  initDb();
  try {
    fs.writeFileSync(filesMetaFile, JSON.stringify(files, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing files meta:', err);
  }
}

module.exports = {
  initDb,
  vaultFilesDir,
  readUsers,
  writeUsers,
  readNotes,
  writeNotes,
  readFilesMeta,
  writeFilesMeta,
};
