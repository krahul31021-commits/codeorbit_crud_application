/**
 * OrbitVault Frontend Application Logic
 * Protected Authentication with HttpOnly Cookies, AES-256 File Vault & In-App Viewer
 */

// State Management
const STATE = {
  user: JSON.parse(localStorage.getItem('orbit_user') || 'null'),
  activeDashboardTab: 'files', // 'files' or 'notes'
  notes: [],
  noteFilter: 'all',
  noteSearch: '',
  files: [],
  fileFilter: 'all',
  fileSearch: '',
  stagedFile: null,
};

// DOM Elements - Auth & Nav
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authStatusPill = document.getElementById('auth-status-pill');
const authStatusText = document.getElementById('auth-status-text');
const userMenu = document.getElementById('user-menu');
const navUserAvatar = document.getElementById('nav-user-avatar');
const navUserName = document.getElementById('nav-user-name');
const navUserEmail = document.getElementById('nav-user-email');
const dashUserName = document.getElementById('dash-user-name');
const logoutBtn = document.getElementById('logout-btn');

// DOM Elements - Dashboard Tabs
const viewTabFiles = document.getElementById('view-tab-files');
const viewTabNotes = document.getElementById('view-tab-notes');
const vaultFilesView = document.getElementById('vault-files-view');
const vaultNotesView = document.getElementById('vault-notes-view');
const badgeFilesCount = document.getElementById('badge-files-count');
const badgeNotesCount = document.getElementById('badge-notes-count');

// DOM Elements - Files Vault
const uploadDropzone = document.getElementById('upload-dropzone');
const fileInput = document.getElementById('file-input');
const fileStaging = document.getElementById('file-staging');
const stagedFilename = document.getElementById('staged-filename');
const stagedFilesize = document.getElementById('staged-filesize');
const stagedFileIcon = document.getElementById('staged-file-icon');
const clearStagedBtn = document.getElementById('clear-staged-btn');
const uploadFileBtn = document.getElementById('upload-file-btn');
const filesContainer = document.getElementById('files-container');
const filesEmptyState = document.getElementById('files-empty-state');
const metricFilesTotal = document.getElementById('metric-files-total');
const metricFilesImages = document.getElementById('metric-files-images');
const metricFilesVideos = document.getElementById('metric-files-videos');
const metricFilesDocs = document.getElementById('metric-files-docs');
const fileFilterChips = document.querySelectorAll('.file-filter-chip');
const searchFilesInput = document.getElementById('search-files');

// DOM Elements - Notes Vault
const newNoteForm = document.getElementById('new-note-form');
const notesContainer = document.getElementById('notes-container');
const emptyState = document.getElementById('empty-state');
const metricTotal = document.getElementById('metric-total');
const metricCompleted = document.getElementById('metric-completed');
const metricPending = document.getElementById('metric-pending');
const noteFilterChips = document.querySelectorAll('.note-filter-chip');
const searchNotesInput = document.getElementById('search-notes');

// DOM Elements - In-App Media Viewer Modal
const mediaViewerModal = document.getElementById('media-viewer-modal');
const mediaModalTitle = document.getElementById('media-modal-title');
const mediaContentContainer = document.getElementById('media-content-container');
const mediaModalDownloadBtn = document.getElementById('media-modal-download-btn');
const closeMediaModalBtn = document.getElementById('close-media-modal-btn');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// ============================================================================
// Toast Notification Utility
// ============================================================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconClass = 'fa-circle-info';
  if (type === 'success') iconClass = 'fa-circle-check';
  if (type === 'error') iconClass = 'fa-circle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass} toast-icon"></i>
    <span class="toast-msg">${message}</span>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Format bytes to human readable format
function formatBytes(bytes, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Escape HTML
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

// ============================================================================
// Authentication UI Switches
// ============================================================================
tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabSignup.classList.remove('active');
  loginForm.classList.remove('hidden');
  signupForm.classList.add('hidden');
  authTitle.textContent = 'Welcome Back';
  authSubtitle.textContent = 'Enter your credentials to unlock your protected vault.';
});

tabSignup.addEventListener('click', () => {
  tabSignup.classList.add('active');
  tabLogin.classList.remove('active');
  signupForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  authTitle.textContent = 'Create Vault Account';
  authSubtitle.textContent = 'Set up a new secure profile with encrypted storage.';
});

// Password Show / Hide Toggles
document.querySelectorAll('.toggle-password').forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = btn.getAttribute('data-target');
    const input = document.getElementById(targetId);
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
      input.type = 'text';
      icon.className = 'fa-regular fa-eye-slash';
    } else {
      input.type = 'password';
      icon.className = 'fa-regular fa-eye';
    }
  });
});

// Password Strength Meter
const signupPasswordInput = document.getElementById('signup-password');
const bars = [
  document.getElementById('bar-1'),
  document.getElementById('bar-2'),
  document.getElementById('bar-3'),
  document.getElementById('bar-4'),
];
const strengthLabel = document.getElementById('strength-label');

signupPasswordInput.addEventListener('input', (e) => {
  const val = e.target.value;
  let score = 0;
  if (!val) {
    bars.forEach((b) => (b.style.background = 'rgba(255, 255, 255, 0.1)'));
    strengthLabel.textContent = 'Enter password';
    strengthLabel.style.color = 'var(--text-dim)';
    return;
  }

  if (val.length >= 6) score++;
  if (val.length >= 10) score++;
  if (/[0-9]/.test(val) && /[a-zA-Z]/.test(val)) score++;
  if (/[^a-zA-Z0-9]/.test(val)) score++;

  bars.forEach((b) => (b.style.background = 'rgba(255, 255, 255, 0.1)'));

  const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'];
  const labels = ['Weak (minimum 6 chars)', 'Fair', 'Strong', 'Very Secure!'];

  for (let i = 0; i < score; i++) {
    bars[i].style.background = colors[score - 1];
  }

  strengthLabel.textContent = labels[score - 1] || 'Weak';
  strengthLabel.style.color = colors[score - 1] || '#ef4444';
});

// ============================================================================
// API Helper (Sends Secure HttpOnly Cookie Credentials)
// ============================================================================
async function apiRequest(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'same-origin', // Automatically includes HttpOnly session cookie
    });

    const data = await res.json();

    // If unauthorized or session expired
    if (res.status === 401 || res.status === 403) {
      if (STATE.user) {
        showToast(data.message || 'Session expired. Please log in again.', 'error');
        resetUserSession();
      }
      return { ok: false, status: res.status, data };
    }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('Network error on ' + endpoint, err);
    showToast('Cannot connect to server. Ensure Node backend is running.', 'error');
    return { ok: false, status: 0, data: { message: 'Network connection error' } };
  }
}

// ============================================================================
// Signup Form Submission
// ============================================================================
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!name || !email || !password) {
    showToast('Please fill in all signup fields.', 'error');
    return;
  }

  const submitBtn = document.getElementById('signup-submit-btn');
  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text').textContent = 'Creating Account...';

  const res = await apiRequest('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

  submitBtn.disabled = false;
  submitBtn.querySelector('.btn-text').textContent = 'Create Free Account';

  if (res.ok) {
    showToast(res.data.message || 'Account created successfully!', 'success');
    saveSession(res.data.user);
    signupForm.reset();
  } else {
    showToast(res.data.message || 'Signup failed.', 'error');
  }
});

// ============================================================================
// Login Form Submission
// ============================================================================
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showToast('Please enter your email and password.', 'error');
    return;
  }

  const submitBtn = document.getElementById('login-submit-btn');
  submitBtn.disabled = true;
  submitBtn.querySelector('.btn-text').textContent = 'Authenticating...';

  const res = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  submitBtn.disabled = false;
  submitBtn.querySelector('.btn-text').textContent = 'Sign In to Vault';

  if (res.ok) {
    showToast(res.data.message || 'Logged in successfully!', 'success');
    saveSession(res.data.user);
    loginForm.reset();
  } else {
    showToast(res.data.message || 'Login failed.', 'error');
  }
});

// ============================================================================
// Session Management
// ============================================================================
function saveSession(user) {
  STATE.user = user;
  localStorage.setItem('orbit_user', JSON.stringify(user));
  renderAppState();
  fetchFiles();
  fetchNotes();
}

function resetUserSession() {
  STATE.user = null;
  STATE.files = [];
  STATE.notes = [];
  localStorage.removeItem('orbit_user');
  renderAppState();
}

async function logout() {
  await apiRequest('/api/auth/logout', { method: 'POST' });
  resetUserSession();
  showToast('You have been logged out securely.', 'info');
}

logoutBtn.addEventListener('click', logout);

// ============================================================================
// App State & Tab Switches
// ============================================================================
function renderAppState() {
  if (STATE.user) {
    // Authenticated View
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');

    authStatusPill.className = 'status-pill status-logged-in';
    authStatusText.textContent = 'Authenticated';

    userMenu.classList.remove('hidden');
    navUserAvatar.textContent = (STATE.user.name || 'U').charAt(0).toUpperCase();
    navUserName.textContent = STATE.user.name;
    navUserEmail.textContent = STATE.user.email;
    dashUserName.textContent = STATE.user.name;

    switchDashboardTab(STATE.activeDashboardTab);
  } else {
    // Public View
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');

    authStatusPill.className = 'status-pill status-logged-out';
    authStatusText.textContent = 'Public Mode';

    userMenu.classList.add('hidden');
  }
}

function switchDashboardTab(tabName) {
  STATE.activeDashboardTab = tabName;
  if (tabName === 'files') {
    viewTabFiles.classList.add('active');
    viewTabNotes.classList.remove('active');
    vaultFilesView.classList.remove('hidden');
    vaultNotesView.classList.add('hidden');
  } else {
    viewTabNotes.classList.add('active');
    viewTabFiles.classList.remove('active');
    vaultNotesView.classList.remove('hidden');
    vaultFilesView.classList.add('hidden');
  }
}

viewTabFiles.addEventListener('click', () => switchDashboardTab('files'));
viewTabNotes.addEventListener('click', () => switchDashboardTab('notes'));

// ============================================================================
// ENCRYPTED FILE VAULT (Upload, Gallery, In-App View, Delete)
// ============================================================================

// Drag & drop handlers
uploadDropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadDropzone.classList.add('dragover');
});

uploadDropzone.addEventListener('dragleave', () => {
  uploadDropzone.classList.remove('dragover');
});

uploadDropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadDropzone.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFileSelected(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFileSelected(e.target.files[0]);
  }
});

function handleFileSelected(file) {
  STATE.stagedFile = file;
  stagedFilename.textContent = file.name;
  stagedFilesize.textContent = formatBytes(file.size);

  let icon = 'fa-file';
  if (file.type.startsWith('image/')) icon = 'fa-file-image';
  else if (file.type.startsWith('video/')) icon = 'fa-file-video';
  else if (file.type.includes('pdf')) icon = 'fa-file-pdf';
  else if (file.type.includes('word') || file.type.includes('document')) icon = 'fa-file-word';
  stagedFileIcon.className = `fa-solid ${icon}`;

  fileStaging.classList.remove('hidden');
}

clearStagedBtn.addEventListener('click', () => {
  STATE.stagedFile = null;
  fileInput.value = '';
  fileStaging.classList.add('hidden');
});

// Upload File with AES-256 Encryption
uploadFileBtn.addEventListener('click', async () => {
  if (!STATE.stagedFile) return;

  const formData = new FormData();
  formData.append('file', STATE.stagedFile);

  const btnText = uploadFileBtn.querySelector('.btn-text');
  uploadFileBtn.disabled = true;
  btnText.textContent = 'Encrypting & Uploading...';

  const res = await apiRequest('/api/files/upload', {
    method: 'POST',
    body: formData,
  });

  uploadFileBtn.disabled = false;
  btnText.textContent = 'Encrypt & Upload to Vault';

  if (res.ok) {
    showToast('File encrypted with AES-256 and safely stored!', 'success');
    STATE.stagedFile = null;
    fileInput.value = '';
    fileStaging.classList.add('hidden');
    fetchFiles();
  } else {
    showToast(res.data.message || 'File upload failed.', 'error');
  }
});

// Fetch User's Encrypted Files
async function fetchFiles() {
  if (!STATE.user) return;
  const res = await apiRequest('/api/files');
  if (res.ok) {
    STATE.files = res.data.files || [];
    renderFiles();
    updateFileMetrics();
  }
}

function updateFileMetrics() {
  const total = STATE.files.length;
  const images = STATE.files.filter((f) => f.category === 'image').length;
  const videos = STATE.files.filter((f) => f.category === 'video').length;
  const docs = STATE.files.filter((f) => f.category === 'document').length;

  metricFilesTotal.textContent = total;
  metricFilesImages.textContent = images;
  metricFilesVideos.textContent = videos;
  metricFilesDocs.textContent = docs;
  badgeFilesCount.textContent = total;
}

function renderFiles() {
  filesContainer.innerHTML = '';

  let filtered = STATE.files;

  // Category filter
  if (STATE.fileFilter !== 'all') {
    filtered = filtered.filter((f) => f.category === STATE.fileFilter);
  }

  // Search filter
  if (STATE.fileSearch) {
    const q = STATE.fileSearch.toLowerCase();
    filtered = filtered.filter((f) => f.originalName.toLowerCase().includes(q));
  }

  if (filtered.length === 0) {
    filesEmptyState.classList.remove('hidden');
    return;
  }

  filesEmptyState.classList.add('hidden');

  filtered.forEach((file) => {
    const card = document.createElement('div');
    card.className = 'file-card';

    let iconClass = 'fa-file';
    let previewClass = 'preview-file';
    let actionLabel = 'View';

    if (file.category === 'image') {
      iconClass = 'fa-image';
      previewClass = 'preview-image';
      actionLabel = 'View Photo';
    } else if (file.category === 'video') {
      iconClass = 'fa-video';
      previewClass = 'preview-video';
      actionLabel = 'Play Video';
    } else if (file.category === 'document') {
      iconClass = 'fa-file-lines';
      previewClass = 'preview-document';
      actionLabel = 'View Doc';
    }

    const createdDate = new Date(file.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    card.innerHTML = `
      <div class="file-card-preview ${previewClass}">
        <span class="file-enc-tag"><i class="fa-solid fa-lock"></i> AES-256</span>
        <i class="fa-solid ${iconClass}"></i>
      </div>
      <div class="file-name" title="${escapeHtml(file.originalName)}">${escapeHtml(file.originalName)}</div>
      <div class="file-meta-row">
        <span><i class="fa-solid fa-database"></i> ${formatBytes(file.size)}</span>
        <span><i class="fa-regular fa-clock"></i> ${createdDate}</span>
      </div>
      <div class="file-actions">
        <button class="btn btn-primary btn-sm view-file-btn" data-id="${file.id}">
          <i class="fa-solid ${file.category === 'video' ? 'fa-play' : 'fa-eye'}"></i>
          <span>${actionLabel}</span>
        </button>
        <button class="btn btn-secondary btn-sm delete-file-btn" data-id="${file.id}" title="Permanently delete">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;

    // View file in application
    card.querySelector('.view-file-btn').addEventListener('click', () => {
      openMediaViewer(file);
    });

    // Delete file
    card.querySelector('.delete-file-btn').addEventListener('click', async () => {
      await deleteFile(file.id);
    });

    filesContainer.appendChild(card);
  });
}

// In-App Media Viewer Modal
function openMediaViewer(file) {
  mediaModalTitle.textContent = file.originalName;
  mediaModalDownloadBtn.href = `/api/files/${file.id}/download`;
  mediaModalDownloadBtn.setAttribute('download', file.originalName);

  mediaContentContainer.innerHTML = '<div style="color: #94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i> Decrypting AES-256 data...</div>';
  mediaViewerModal.classList.remove('hidden');

  const fileUrl = `/api/files/${file.id}/view`;

  if (file.category === 'image') {
    const img = document.createElement('img');
    img.src = fileUrl;
    img.alt = file.originalName;
    img.onload = () => {
      mediaContentContainer.innerHTML = '';
      mediaContentContainer.appendChild(img);
    };
    img.onerror = () => {
      mediaContentContainer.innerHTML = '<div style="color:#ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Error loading decrypted image.</div>';
    };
  } else if (file.category === 'video') {
    const video = document.createElement('video');
    video.src = fileUrl;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    mediaContentContainer.innerHTML = '';
    mediaContentContainer.appendChild(video);
  } else if (file.mimeType === 'application/pdf') {
    const iframe = document.createElement('iframe');
    iframe.src = fileUrl;
    mediaContentContainer.innerHTML = '';
    mediaContentContainer.appendChild(iframe);
  } else {
    // For text or binary docs
    fetch(fileUrl, { credentials: 'same-origin' })
      .then((res) => {
        if (file.mimeType.startsWith('text/') || file.originalName.endsWith('.txt')) {
          return res.text().then((text) => {
            const pre = document.createElement('pre');
            pre.className = 'text-doc-viewer';
            pre.textContent = text;
            mediaContentContainer.innerHTML = '';
            mediaContentContainer.appendChild(pre);
          });
        } else {
          mediaContentContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #94a3b8;">
              <i class="fa-solid fa-file-shield" style="font-size: 3rem; color: #fbbf24; margin-bottom: 1rem;"></i>
              <p>Confidential Encrypted Document (<code>${escapeHtml(file.originalName)}</code>)</p>
              <p style="font-size: 0.8rem; margin-top: 0.5rem;">Click "Download" above to view in your system viewer.</p>
            </div>
          `;
        }
      })
      .catch((err) => {
        mediaContentContainer.innerHTML = `<div style="color:#ef4444;">Error: ${err.message}</div>`;
      });
  }
}

closeMediaModalBtn.addEventListener('click', () => {
  mediaContentContainer.innerHTML = '';
  mediaViewerModal.classList.add('hidden');
});

mediaViewerModal.addEventListener('click', (e) => {
  if (e.target === mediaViewerModal) {
    mediaContentContainer.innerHTML = '';
    mediaViewerModal.classList.add('hidden');
  }
});

// Delete Encrypted File
async function deleteFile(id) {
  if (!confirm('Are you sure you want to permanently erase this encrypted file from your vault?')) return;

  const res = await apiRequest(`/api/files/${id}`, {
    method: 'DELETE',
  });

  if (res.ok) {
    showToast('File permanently deleted from vault.', 'info');
    fetchFiles();
  } else {
    showToast(res.data.message || 'Could not delete file.', 'error');
  }
}

// File category filter buttons
fileFilterChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    fileFilterChips.forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    STATE.fileFilter = chip.getAttribute('data-cat');
    renderFiles();
  });
});

searchFilesInput.addEventListener('input', (e) => {
  STATE.fileSearch = e.target.value.trim();
  renderFiles();
});

// ============================================================================
// Vault / Notes Management
// ============================================================================
async function fetchNotes() {
  if (!STATE.user) return;
  const res = await apiRequest('/api/notes');
  if (res.ok) {
    STATE.notes = res.data.notes || [];
    renderNotes();
    updateNoteMetrics();
  }
}

function updateNoteMetrics() {
  const total = STATE.notes.length;
  const completed = STATE.notes.filter((n) => n.completed).length;
  const pending = total - completed;

  metricTotal.textContent = total;
  metricCompleted.textContent = completed;
  metricPending.textContent = pending;
  badgeNotesCount.textContent = total;
}

function renderNotes() {
  notesContainer.innerHTML = '';

  let filtered = STATE.notes;

  // Filter tab
  if (STATE.noteFilter === 'pending') {
    filtered = filtered.filter((n) => !n.completed);
  } else if (STATE.noteFilter === 'completed') {
    filtered = filtered.filter((n) => n.completed);
  }

  // Search filter
  if (STATE.noteSearch) {
    const q = STATE.noteSearch.toLowerCase();
    filtered = filtered.filter(
      (n) => n.title.toLowerCase().includes(q) || (n.content && n.content.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  filtered.forEach((note) => {
    const card = document.createElement('div');
    card.className = `note-item ${note.completed ? 'completed' : ''}`;

    const tagClass = 'badge-' + (note.tag || 'personal').toLowerCase();
    const createdDate = new Date(note.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    card.innerHTML = `
      <div class="note-header">
        <span class="note-badge ${tagClass}">${note.tag || 'General'}</span>
        <div class="note-actions">
          <button class="action-btn delete-btn" data-id="${note.id}" title="Delete note">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
      <h4 class="note-title">${escapeHtml(note.title)}</h4>
      <div class="note-body">${escapeHtml(note.content || 'No details provided.')}</div>
      <div class="note-footer">
        <button class="toggle-task-btn" data-id="${note.id}">
          <i class="fa-${note.completed ? 'solid fa-circle-check' : 'regular fa-circle'}"></i>
          <span>${note.completed ? 'Completed' : 'Mark Done'}</span>
        </button>
        <span class="note-time"><i class="fa-regular fa-clock"></i> ${createdDate}</span>
      </div>
    `;

    card.querySelector('.toggle-task-btn').addEventListener('click', async () => {
      await toggleNoteStatus(note.id);
    });

    card.querySelector('.delete-btn').addEventListener('click', async () => {
      await deleteNote(note.id);
    });

    notesContainer.appendChild(card);
  });
}

// Add Note Form
newNoteForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('note-title').value.trim();
  const tag = document.getElementById('note-tag').value;
  const content = document.getElementById('note-content').value.trim();

  if (!title) {
    showToast('Please provide a note title.', 'error');
    return;
  }

  const saveBtn = document.getElementById('save-note-btn');
  saveBtn.disabled = true;

  const res = await apiRequest('/api/notes', {
    method: 'POST',
    body: JSON.stringify({ title, tag, content }),
  });

  saveBtn.disabled = false;

  if (res.ok) {
    showToast('Vault item secured!', 'success');
    newNoteForm.reset();
    fetchNotes();
  } else {
    showToast(res.data.message || 'Failed to save note.', 'error');
  }
});

async function toggleNoteStatus(id) {
  const res = await apiRequest(`/api/notes/${id}/toggle`, {
    method: 'PATCH',
  });
  if (res.ok) {
    fetchNotes();
  } else {
    showToast(res.data.message || 'Could not update status.', 'error');
  }
}

async function deleteNote(id) {
  if (!confirm('Are you sure you want to delete this vault item?')) return;
  const res = await apiRequest(`/api/notes/${id}`, {
    method: 'DELETE',
  });
  if (res.ok) {
    showToast('Item deleted from vault.', 'info');
    fetchNotes();
  } else {
    showToast(res.data.message || 'Could not delete item.', 'error');
  }
}

// Note filters & search
noteFilterChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    noteFilterChips.forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    STATE.noteFilter = chip.getAttribute('data-filter');
    renderNotes();
  });
});

searchNotesInput.addEventListener('input', (e) => {
  STATE.noteSearch = e.target.value.trim();
  renderNotes();
});

// ============================================================================
// Initialization on Load
// ============================================================================
window.addEventListener('DOMContentLoaded', async () => {
  // Validate active session against backend /api/auth/me using HttpOnly cookie
  const res = await apiRequest('/api/auth/me');
  if (res.ok && res.data.user) {
    STATE.user = res.data.user;
    localStorage.setItem('orbit_user', JSON.stringify(res.data.user));
    renderAppState();
    fetchFiles();
    fetchNotes();
  } else {
    resetUserSession();
  }
});
