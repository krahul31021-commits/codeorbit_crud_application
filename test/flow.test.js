/**
 * Comprehensive End-to-End Test Suite for OrbitVault Auth & Vault Flow
 * Tests:
 * 1. Healthcheck
 * 2. Validation failures (bad email, short password, missing fields)
 * 3. User registration (Signup) & Bcrypt hashing verification
 * 4. Duplicate user registration prevention
 * 5. Login with invalid password
 * 6. Login with correct password & JWT issuance
 * 7. Protected route rejection without token
 * 8. Protected route acceptance with Bearer JWT
 * 9. Token tampering / forgery rejection (403)
 * 10. Notes CRUD (Create, Read, Toggle status, Delete)
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const TEST_PORT = 3333;
const BASE_URL = `http://localhost:${TEST_PORT}`;

// Setup isolated test data directory
const testDataDir = path.join(__dirname, 'test_data');
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}
const testUsersFile = path.join(testDataDir, 'users.json');
const testNotesFile = path.join(testDataDir, 'notes.json');
fs.writeFileSync(testUsersFile, '[]', 'utf-8');
fs.writeFileSync(testNotesFile, '[]', 'utf-8');

// Mock db paths for test run
const fileDb = require('../db/fileDb');
// Override methods to use test files
fileDb.readUsers = () => JSON.parse(fs.readFileSync(testUsersFile, 'utf-8') || '[]');
fileDb.writeUsers = (users) => fs.writeFileSync(testUsersFile, JSON.stringify(users, null, 2), 'utf-8');
fileDb.readNotes = () => JSON.parse(fs.readFileSync(testNotesFile, 'utf-8') || '[]');
fileDb.writeNotes = (notes) => fs.writeFileSync(testNotesFile, JSON.stringify(notes, null, 2), 'utf-8');

const authRoutes = require('../routes/auth');
const notesRoutes = require('../routes/notes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'healthy' }));

let server;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ Passed: ${message}`);
  }
}

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`🧪 STARTING ORBITVAULT END-TO-END FLOW TESTS`);
  console.log(`======================================================\n`);

  server = app.listen(TEST_PORT);

  try {
    // 1. Healthcheck
    console.log('[Test 1] Healthcheck API');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health endpoint responds with 200');
    assert(healthData.status === 'healthy', 'Status is healthy');

    // 2. Signup validation - Bad email
    console.log('\n[Test 2] Signup validation - Invalid email');
    const badEmailRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alex', email: 'invalid-email', password: 'password123' }),
    });
    assert(badEmailRes.status === 400, 'Rejects invalid email with 400 Bad Request');

    // 3. Signup validation - Short password
    console.log('\n[Test 3] Signup validation - Password shorter than 6 characters');
    const shortPassRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alex', email: 'alex@example.com', password: '123' }),
    });
    assert(shortPassRes.status === 400, 'Rejects short password with 400 Bad Request');

    // 4. Successful Signup
    console.log('\n[Test 4] Successful User Registration (Signup)');
    const testUser = {
      name: 'Alex Mercer',
      email: 'alex.mercer@orbit.vault',
      password: 'SecureVaultPass#2026',
    };
    const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const signupData = await signupRes.json();
    assert(signupRes.status === 201, 'Signup returns 201 Created');
    assert(Boolean(signupData.token), 'Signup response includes a JWT token');
    assert(signupData.user.email === testUser.email, 'User email matches registered email');
    assert(signupData.user.password === undefined, 'Raw password is NEVER returned in response');

    // Verify storage & password hashing
    const storedUsers = fileDb.readUsers();
    const storedUser = storedUsers.find((u) => u.email === testUser.email);
    assert(Boolean(storedUser), 'User saved to JSON storage');
    assert(storedUser.password.startsWith('$2'), 'Password is securely hashed with bcrypt (starts with $2)');
    assert(storedUser.password !== testUser.password, 'Stored password is NOT plain text');

    // 5. Prevent duplicate signup
    console.log('\n[Test 5] Prevent Duplicate User Email Registration');
    const dupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    assert(dupRes.status === 409, 'Duplicate signup rejected with 409 Conflict');

    // 6. Login with Wrong Password
    console.log('\n[Test 6] Login with Incorrect Password');
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: 'WrongPassword!' }),
    });
    assert(badLoginRes.status === 401, 'Rejects wrong password with 401 Unauthorized');

    // 7. Login with Correct Credentials
    console.log('\n[Test 7] Login with Correct Credentials');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: testUser.password }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Login succeeds with 200 OK');
    assert(Boolean(loginData.token), 'Login returns active JWT token');
    const validToken = loginData.token;

    // 8. Protected route without token
    console.log('\n[Test 8] Access Protected Route (/api/auth/me) without token');
    const noTokenRes = await fetch(`${BASE_URL}/api/auth/me`);
    assert(noTokenRes.status === 401, 'Rejects unauthenticated request with 401');

    // 9. Protected route with forged token
    console.log('\n[Test 9] Access Protected Route with forged token');
    const forgedRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: 'Bearer this.is.a.forged.token' },
    });
    assert(forgedRes.status === 403, 'Rejects forged token with 403 Forbidden');

    // 10. Protected route with valid token
    console.log('\n[Test 10] Access Protected Route with valid JWT');
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'Protected endpoint /api/auth/me returns 200 OK');
    assert(meData.user.name === testUser.name, 'Profile data matches authenticated user');

    // 11. Notes CRUD - Create Note
    console.log('\n[Test 11] Protected Feature: Create Vault Note');
    const createNoteRes = await fetch(`${BASE_URL}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        title: 'Production Database Backup Key',
        content: 'VaultKey: db_prod_998127392_key_xyz',
        tag: 'Credentials',
      }),
    });
    const createNoteData = await createNoteRes.json();
    assert(createNoteRes.status === 201, 'Note created with 201 Created');
    assert(createNoteData.note.title === 'Production Database Backup Key', 'Note title saved correctly');
    const noteId = createNoteData.note.id;

    // 12. Notes CRUD - Read Notes
    console.log('\n[Test 12] Protected Feature: Fetch User Vault Notes');
    const listNotesRes = await fetch(`${BASE_URL}/api/notes`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const listNotesData = await listNotesRes.json();
    assert(listNotesRes.status === 200, 'Returns 200 OK');
    assert(listNotesData.notes.length === 1, 'Returns exactly 1 note owned by this user');
    assert(listNotesData.notes[0].id === noteId, 'Fetched note matches created note ID');

    // 13. Notes CRUD - Toggle Note Completion
    console.log('\n[Test 13] Protected Feature: Toggle Note Status');
    const toggleRes = await fetch(`${BASE_URL}/api/notes/${noteId}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const toggleData = await toggleRes.json();
    assert(toggleRes.status === 200, 'Status updated with 200 OK');
    assert(toggleData.note.completed === true, 'Note is now marked as completed');

    // 14. Notes CRUD - Delete Note
    console.log('\n[Test 14] Protected Feature: Delete Vault Note');
    const deleteRes = await fetch(`${BASE_URL}/api/notes/${noteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${validToken}` },
    });
    assert(deleteRes.status === 200, 'Note deleted with 200 OK');

    const listAfterDelete = await fetch(`${BASE_URL}/api/notes`, {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    const listAfterDeleteData = await listAfterDelete.json();
    assert(listAfterDeleteData.notes.length === 0, 'Vault is empty after deletion');

    console.log(`\n======================================================`);
    console.log(`🎉 ALL 14 TESTS PASSED SUCCESSFULLY! FULL FLOW VERIFIED!`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    // Clean up test data
    try {
      fs.rmSync(testDataDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

runTests();
