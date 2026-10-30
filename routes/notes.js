const express = require('express');
const { readNotes, writeNotes } = require('../db/fileDb');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all notes routes
router.use(authMiddleware);

// GET /api/notes - Fetch user's notes
router.get('/', (req, res) => {
  const notes = readNotes();
  const userNotes = notes.filter((n) => n.userId === req.user.id);
  res.status(200).json({
    success: true,
    count: userNotes.length,
    notes: userNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
  });
});

// POST /api/notes - Create a new note
router.post('/', (req, res) => {
  const { title, content, tag } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Note title is required.',
    });
  }

  const notes = readNotes();
  const newNote = {
    id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId: req.user.id,
    title: title.trim(),
    content: (content || '').trim(),
    tag: (tag || 'General').trim(),
    completed: false,
    createdAt: new Date().toISOString(),
  };

  notes.push(newNote);
  writeNotes(notes);

  res.status(201).json({
    success: true,
    message: 'Note created successfully!',
    note: newNote,
  });
});

// PATCH /api/notes/:id/toggle - Toggle completion
router.patch('/:id/toggle', (req, res) => {
  const { id } = req.params;
  const notes = readNotes();

  const noteIndex = notes.findIndex((n) => n.id === id && n.userId === req.user.id);
  if (noteIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Note not found or unauthorized access.',
    });
  }

  notes[noteIndex].completed = !notes[noteIndex].completed;
  notes[noteIndex].updatedAt = new Date().toISOString();
  writeNotes(notes);

  res.status(200).json({
    success: true,
    message: `Note marked as ${notes[noteIndex].completed ? 'completed' : 'pending'}.`,
    note: notes[noteIndex],
  });
});

// DELETE /api/notes/:id - Delete a note
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const notes = readNotes();

  const noteIndex = notes.findIndex((n) => n.id === id && n.userId === req.user.id);
  if (noteIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Note not found or unauthorized access.',
    });
  }

  const deleted = notes.splice(noteIndex, 1)[0];
  writeNotes(notes);

  res.status(200).json({
    success: true,
    message: 'Note deleted successfully.',
    deletedId: deleted.id,
  });
});

module.exports = router;
