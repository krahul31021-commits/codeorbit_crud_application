const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const { readFilesMeta, writeFilesMeta, vaultFilesDir } = require('../db/fileDb');
const { encryptBuffer, decryptBuffer } = require('../services/cryptoService');

const router = express.Router();

// Apply auth middleware to all file routes (Strict Access Control)
router.use(authMiddleware);

// Configure multer memory storage (Files are encrypted before ever touching disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  },
});

// Helper: Determine category from mimetype
function getCategory(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('text') ||
    mimeType.includes('document') ||
    mimeType.includes('sheet') ||
    mimeType.includes('presentation')
  ) {
    return 'document';
  }
  return 'file';
}

// POST /api/files/upload - Encrypt and save file
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please choose a file.',
      });
    }

    const { originalname, mimetype, size, buffer } = req.file;

    // 1. Encrypt buffer with AES-256
    const { encryptedBuffer, iv } = encryptBuffer(buffer);

    // 2. Generate unique secure file ID and encrypted file path
    const fileId = 'vault_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const encFilePath = path.join(vaultFilesDir, `${fileId}.enc`);

    // 3. Save raw encrypted ciphertext to disk
    fs.writeFileSync(encFilePath, encryptedBuffer);

    // 4. Save metadata record (linked to current user ID)
    const files = readFilesMeta();
    const newFileMeta = {
      id: fileId,
      userId: req.user.id,
      originalName: originalname,
      mimeType: mimetype,
      size: size,
      category: getCategory(mimetype),
      iv: iv,
      createdAt: new Date().toISOString(),
    };

    files.push(newFileMeta);
    writeFilesMeta(files);

    res.status(201).json({
      success: true,
      message: 'File encrypted with AES-256 and safely stored in your vault!',
      file: {
        id: newFileMeta.id,
        originalName: newFileMeta.originalName,
        mimeType: newFileMeta.mimeType,
        size: newFileMeta.size,
        category: newFileMeta.category,
        createdAt: newFileMeta.createdAt,
      },
    });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({
      success: false,
      message: 'Error encrypting and saving file: ' + err.message,
    });
  }
});

// GET /api/files - Get current user's encrypted file list
router.get('/', (req, res) => {
  const files = readFilesMeta();
  // Strictly filter by current logged-in user
  const userFiles = files
    .filter((f) => f.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((f) => ({
      id: f.id,
      originalName: f.originalName,
      mimeType: f.mimeType,
      size: f.size,
      category: f.category,
      createdAt: f.createdAt,
    }));

  res.status(200).json({
    success: true,
    count: userFiles.length,
    files: userFiles,
  });
});

// GET /api/files/:id/view - Decrypt and view/stream in application
router.get('/:id/view', (req, res) => {
  try {
    const { id } = req.params;
    const files = readFilesMeta();
    const fileMeta = files.find((f) => f.id === id);

    if (!fileMeta) {
      return res.status(404).json({
        success: false,
        message: 'File not found.',
      });
    }

    // STRICT USER AUTHORIZATION: Nobody else can access this file
    if (fileMeta.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden! You are not authorized to view this encrypted file.',
      });
    }

    const encFilePath = path.join(vaultFilesDir, `${fileMeta.id}.enc`);
    if (!fs.existsSync(encFilePath)) {
      return res.status(404).json({
        success: false,
        message: 'Encrypted storage file is missing from disk.',
      });
    }

    // Read ciphertext and decrypt with AES-256
    const encryptedData = fs.readFileSync(encFilePath);
    const decryptedBuffer = decryptBuffer(encryptedData, fileMeta.iv);

    // Set headers for in-browser viewing / streaming
    res.setHeader('Content-Type', fileMeta.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileMeta.originalName)}"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Content-Length', decryptedBuffer.length);

    res.send(decryptedBuffer);
  } catch (err) {
    console.error('File view error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to decrypt file: ' + err.message,
    });
  }
});

// GET /api/files/:id/download - Decrypt and download
router.get('/:id/download', (req, res) => {
  try {
    const { id } = req.params;
    const files = readFilesMeta();
    const fileMeta = files.find((f) => f.id === id);

    if (!fileMeta) {
      return res.status(404).json({
        success: false,
        message: 'File not found.',
      });
    }

    // STRICT USER AUTHORIZATION
    if (fileMeta.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden! You are not authorized to download this file.',
      });
    }

    const encFilePath = path.join(vaultFilesDir, `${fileMeta.id}.enc`);
    if (!fs.existsSync(encFilePath)) {
      return res.status(404).json({
        success: false,
        message: 'Encrypted storage file is missing from disk.',
      });
    }

    const encryptedData = fs.readFileSync(encFilePath);
    const decryptedBuffer = decryptBuffer(encryptedData, fileMeta.iv);

    res.setHeader('Content-Type', fileMeta.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileMeta.originalName)}"`);
    res.setHeader('Content-Length', decryptedBuffer.length);

    res.send(decryptedBuffer);
  } catch (err) {
    console.error('File download error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to decrypt file for download: ' + err.message,
    });
  }
});

// DELETE /api/files/:id - Delete encrypted file and metadata
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const files = readFilesMeta();
    const fileIndex = files.findIndex((f) => f.id === id);

    if (fileIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'File not found.',
      });
    }

    // STRICT AUTHORIZATION
    if (files[fileIndex].userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden! You cannot delete another user\'s file.',
      });
    }

    const fileMeta = files[fileIndex];
    const encFilePath = path.join(vaultFilesDir, `${fileMeta.id}.enc`);

    // Delete encrypted binary from disk
    if (fs.existsSync(encFilePath)) {
      fs.unlinkSync(encFilePath);
    }

    // Remove from metadata JSON
    files.splice(fileIndex, 1);
    writeFilesMeta(files);

    res.status(200).json({
      success: true,
      message: 'Encrypted file permanently erased from vault.',
      deletedId: id,
    });
  } catch (err) {
    console.error('File delete error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to delete file: ' + err.message,
    });
  }
});

module.exports = router;
