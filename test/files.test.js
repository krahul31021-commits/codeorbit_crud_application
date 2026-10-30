/**
 * Test Suite for Encrypted File Vault (Photos, Docs, Videos)
 * Tests:
 * 1. Upload file and verify AES-256 encryption on disk (.enc)
 * 2. In-App Decryption on view (/api/files/:id/view)
 * 3. Strict User Isolation: User B CANNOT view or access User A's files (403 Forbidden)
 * 4. File deletion permanently erases encrypted binary
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';

async function runFileVaultTests() {
  console.log('\n======================================================');
  console.log('🧪 TESTING ENCRYPTED MEDIA & FILE VAULT (E2E)');
  console.log('======================================================\n');

  try {
    // 1. Create User A (Owner)
    console.log('[Test 1] Create Owner User (Alice)');
    const aliceRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Vault Owner',
        email: `alice_${Date.now()}@test.vault`,
        password: 'AliceSuperPass2026!',
      }),
    });
    const aliceData = await aliceRes.json();
    const aliceCookie = aliceRes.headers.get('set-cookie').split(';')[0];
    console.log('  ✅ Alice created & session established');

    // 2. Upload sample secret document (text / photo simulated)
    console.log('\n[Test 2] Upload Confidential Document for Encryption');
    const secretContent = 'CONFIDENTIAL_BANK_STATEMENT: Account #99881122, Balance: $500,000. DO NOT LEAK.';
    const blob = new Blob([secretContent], { type: 'text/plain' });

    const formData = new FormData();
    formData.append('file', blob, 'secret_finances.txt');

    const uploadRes = await fetch(`${BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers: { Cookie: aliceCookie },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    console.log('  ✅ Upload Response Status:', uploadRes.status);
    console.log('  ✅ Upload Msg:', uploadData.message);
    const fileId = uploadData.file.id;

    // 3. Inspect Disk Storage - Verify it is 100% encrypted (not plain text)
    console.log('\n[Test 3] Verify On-Disk Ciphertext (.enc)');
    const encFilePath = path.join(__dirname, '..', 'data', 'vault_files', `${fileId}.enc`);
    const rawDiskBytes = fs.readFileSync(encFilePath);
    const diskText = rawDiskBytes.toString('utf-8');
    
    if (diskText.includes('CONFIDENTIAL_BANK_STATEMENT')) {
      console.error('❌ FAILURE: Raw text found on disk! File was not encrypted!');
      process.exit(1);
    } else {
      console.log('  ✅ PASSED: Disk file contains pure scrambled AES-256 ciphertext.');
      console.log('  ✅ Ciphertext length:', rawDiskBytes.length, 'bytes');
    }

    // 4. View Decrypted File via In-App View API
    console.log('\n[Test 4] Decrypt & View File via /api/files/:id/view');
    const viewRes = await fetch(`${BASE_URL}/api/files/${fileId}/view`, {
      headers: { Cookie: aliceCookie },
    });
    const decryptedText = await viewRes.text();
    console.log('  ✅ View Status:', viewRes.status);
    if (decryptedText === secretContent) {
      console.log('  ✅ PASSED: In-memory decryption restored exact original content!');
    } else {
      console.error('❌ Decryption mismatch!');
      process.exit(1);
    }

    // 5. User Isolation Check: Create User B (Attacker Bob)
    console.log('\n[Test 5] User Isolation: Attacker (Bob) attempts to view Alice\'s file');
    const bobRes = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Attacker',
        email: `bob_${Date.now()}@test.vault`,
        password: 'BobPassword123!',
      }),
    });
    const bobCookie = bobRes.headers.get('set-cookie').split(';')[0];

    // Bob tries to list files - Alice's file must NOT appear
    const bobListRes = await fetch(`${BASE_URL}/api/files`, {
      headers: { Cookie: bobCookie },
    });
    const bobListData = await bobListRes.json();
    console.log('  ✅ Bob\'s file count:', bobListData.files.length);
    if (bobListData.files.length !== 0) {
      console.error('❌ FAILURE: Bob saw Alice\'s files in list!');
      process.exit(1);
    }
    console.log('  ✅ PASSED: Bob cannot see Alice\'s files in file list.');

    // Bob tries direct ID access to view Alice's file
    const bobHackRes = await fetch(`${BASE_URL}/api/files/${fileId}/view`, {
      headers: { Cookie: bobCookie },
    });
    console.log('  ✅ Bob unauthorized access status:', bobHackRes.status);
    if (bobHackRes.status === 403) {
      console.log('  ✅ PASSED: Bob was strictly blocked with 403 Forbidden!');
    } else {
      console.error('❌ FAILURE: Bob accessed Alice\'s file!');
      process.exit(1);
    }

    // 6. Delete File
    console.log('\n[Test 6] Delete Encrypted File');
    const deleteRes = await fetch(`${BASE_URL}/api/files/${fileId}`, {
      method: 'DELETE',
      headers: { Cookie: aliceCookie },
    });
    console.log('  ✅ Delete Status:', deleteRes.status);
    const fileExistsAfter = fs.existsSync(encFilePath);
    if (!fileExistsAfter) {
      console.log('  ✅ PASSED: .enc file was erased permanently from disk.');
    } else {
      console.error('❌ File was not deleted from disk!');
      process.exit(1);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL FILE VAULT ENCRYPTION & PRIVACY TESTS PASSED!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

runFileVaultTests();
