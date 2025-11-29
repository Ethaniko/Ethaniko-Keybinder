// ============================================
// ETHANIKO KEYBINDER - RENDERER SCRIPT
// ============================================

// State
let keybinds = [];
let editingIndex = -1;
let isRecording = false;
let recordedKey = '';

// DOM Elements
const elements = {
  // Window controls
  minimizeBtn: document.getElementById('minimizeBtn'),
  closeBtn: document.getElementById('closeBtn'),

  // Status
  statusIndicator: document.getElementById('statusIndicator'),
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  restartBtn: document.getElementById('restartBtn'),

  // Navigation
  menuItems: document.querySelectorAll('.menu-item'),
  tabContents: document.querySelectorAll('.tab-content'),

  // Keybinds
  keybindsContainer: document.getElementById('keybindsContainer'),
  keybindsList: document.getElementById('keybindsList'),
  emptyState: document.getElementById('emptyState'),
  keybindCount: document.getElementById('keybindCount'),
  addKeybindBtn: document.getElementById('addKeybindBtn'),

  // Modal
  keybindModal: document.getElementById('keybindModal'),
  modalTitle: document.getElementById('modalTitle'),
  closeModal: document.getElementById('closeModal'),
  keyRecorder: document.getElementById('keyRecorder'),
  keyDisplay: document.getElementById('keyDisplay'),
  clearKeyBtn: document.getElementById('clearKeyBtn'),
  messageInput: document.getElementById('messageInput'),
  delayInput: document.getElementById('delayInput'),
  cancelKeybind: document.getElementById('cancelKeybind'),
  saveKeybind: document.getElementById('saveKeybind'),

  // Recording Modal
  recordingModal: document.getElementById('recordingModal'),
  cancelRecording: document.getElementById('cancelRecording'),

  // Settings
  installAHKBtn: document.getElementById('installAHKBtn'),
  ahkStatusText: document.getElementById('ahkStatusText'),
  openConfigBtn: document.getElementById('openConfigBtn'),
  checkUpdateBtn: document.getElementById('checkUpdateBtn'),

  // Toast
  toastContainer: document.getElementById('toastContainer')
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadKeybinds();
  checkAHKStatus();
});

function initEventListeners() {
  // Window controls
  elements.minimizeBtn.addEventListener('click', () => window.electronAPI.minimizeWindow());
  elements.closeBtn.addEventListener('click', () => window.electronAPI.closeWindow());

  // Status controls
  elements.startBtn.addEventListener('click', startAHK);
  elements.stopBtn.addEventListener('click', stopAHK);
  elements.restartBtn.addEventListener('click', restartAHK);

  // Navigation
  elements.menuItems.forEach(item => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });

  // Add keybind
  elements.addKeybindBtn.addEventListener('click', () => openModal());

  // Modal controls
  elements.closeModal.addEventListener('click', closeModal);
  elements.cancelKeybind.addEventListener('click', closeModal);
  elements.saveKeybind.addEventListener('click', saveKeybindHandler);
  elements.keybindModal.addEventListener('click', (e) => {
    if (e.target === elements.keybindModal) closeModal();
  });

  // Key recorder
  elements.keyRecorder.addEventListener('click', startRecording);
  elements.clearKeyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    clearRecordedKey();
  });
  elements.cancelRecording.addEventListener('click', stopRecording);

  // Settings
  elements.installAHKBtn.addEventListener('click', installAHK);
  elements.openConfigBtn.addEventListener('click', () => window.electronAPI.openConfigFolder());
  elements.checkUpdateBtn.addEventListener('click', checkForUpdates);

  // Global key/mouse listeners for recording
  document.addEventListener('keydown', handleKeyRecord);
  document.addEventListener('mousedown', handleMouseRecord);

  // IPC listeners
  window.electronAPI.onAHKStatus(updateStatus);
  window.electronAPI.onKeybindsLoaded((data) => {
    keybinds = data;
    renderKeybinds();
  });
  window.electronAPI.onUpdateAvailable((info) => {
    showToast(`Update available: v${info.version}`, 'info');
  });
}

// ============================================
// TAB NAVIGATION
// ============================================

function switchTab(tabId) {
  elements.menuItems.forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabId);
  });

  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `${tabId}Tab`);
  });
}

// ============================================
// KEYBIND MANAGEMENT
// ============================================

async function loadKeybinds() {
  try {
    keybinds = await window.electronAPI.getKeybinds();
    renderKeybinds();
  } catch (error) {
    console.error('Failed to load keybinds:', error);
    showToast('Failed to load keybinds', 'error');
  }
}

function renderKeybinds() {
  elements.keybindCount.textContent = keybinds.length;

  if (keybinds.length === 0) {
    elements.emptyState.style.display = 'flex';
    elements.keybindsList.style.display = 'none';
    return;
  }

  elements.emptyState.style.display = 'none';
  elements.keybindsList.style.display = 'flex';

  elements.keybindsList.innerHTML = keybinds.map((bind, index) => `
    <div class="keybind-card" data-index="${index}">
      <div class="keybind-key">${escapeHtml(bind.key)}</div>
      <div class="keybind-info">
        <div class="keybind-message">${escapeHtml(bind.message)}</div>
        <div class="keybind-delay">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          ${bind.delay || 0}ms delay
        </div>
      </div>
      <div class="keybind-actions">
        <button class="btn-edit" title="Edit" onclick="editKeybind(${index})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-delete" title="Delete" onclick="deleteKeybind(${index})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

async function saveKeybinds() {
  try {
    await window.electronAPI.saveKeybinds(keybinds);
    // Restart AHK to apply changes
    const result = await window.electronAPI.restartAHK();
    if (result.success) {
      updateStatus('running');
    }
    return true;
  } catch (error) {
    console.error('Failed to save keybinds:', error);
    showToast('Failed to save keybinds', 'error');
    return false;
  }
}

// ============================================
// MODAL HANDLING
// ============================================

function openModal(index = -1) {
  editingIndex = index;

  if (index >= 0 && keybinds[index]) {
    // Edit mode
    elements.modalTitle.textContent = 'Edit Keybind';
    recordedKey = keybinds[index].key;
    elements.keyDisplay.textContent = recordedKey;
    elements.keyDisplay.classList.add('has-key');
    elements.messageInput.value = keybinds[index].message;
    elements.delayInput.value = keybinds[index].delay || 0;
  } else {
    // Add mode
    elements.modalTitle.textContent = 'Add Keybind';
    recordedKey = '';
    elements.keyDisplay.textContent = 'Click to record...';
    elements.keyDisplay.classList.remove('has-key');
    elements.messageInput.value = '';
    elements.delayInput.value = 0;
  }

  elements.keybindModal.classList.add('active');
  elements.messageInput.focus();
}

function closeModal() {
  elements.keybindModal.classList.remove('active');
  editingIndex = -1;
  recordedKey = '';
  stopRecording();
}

async function saveKeybindHandler() {
  const key = recordedKey.trim();
  const message = elements.messageInput.value.trim();
  const delay = parseInt(elements.delayInput.value) || 0;

  if (!key) {
    showToast('Please record a key', 'error');
    return;
  }

  if (!message) {
    showToast('Please enter a message', 'error');
    return;
  }

  const keybind = { key, message, delay };

  if (editingIndex >= 0) {
    keybinds[editingIndex] = keybind;
    showToast('Keybind updated successfully', 'success');
  } else {
    keybinds.push(keybind);
    showToast('Keybind added successfully', 'success');
  }

  await saveKeybinds();
  renderKeybinds();
  closeModal();
}

// Make functions available globally for onclick handlers
window.editKeybind = (index) => openModal(index);

window.deleteKeybind = async (index) => {
  if (confirm('Are you sure you want to delete this keybind?')) {
    keybinds.splice(index, 1);
    await saveKeybinds();
    renderKeybinds();
    showToast('Keybind deleted', 'success');
  }
};

// ============================================
// KEY RECORDING
// ============================================

function startRecording() {
  isRecording = true;
  elements.recordingModal.classList.add('active');
  elements.keyRecorder.classList.add('recording');
}

function stopRecording() {
  isRecording = false;
  elements.recordingModal.classList.remove('active');
  elements.keyRecorder.classList.remove('recording');
}

function clearRecordedKey() {
  recordedKey = '';
  elements.keyDisplay.textContent = 'Click to record...';
  elements.keyDisplay.classList.remove('has-key');
}

function handleKeyRecord(event) {
  if (!isRecording) return;

  event.preventDefault();
  event.stopPropagation();

  const key = convertKeyToAHK(event);
  if (key) {
    recordedKey = key;
    elements.keyDisplay.textContent = key;
    elements.keyDisplay.classList.add('has-key');
    stopRecording();
  }
}

function handleMouseRecord(event) {
  if (!isRecording) return;

  // Ignore clicks on the cancel button
  if (event.target.closest('#cancelRecording')) return;

  event.preventDefault();
  event.stopPropagation();

  const mouseButtons = {
    0: 'LButton',
    1: 'MButton',
    2: 'RButton',
    3: 'XButton1',
    4: 'XButton2'
  };

  const key = mouseButtons[event.button];
  if (key) {
    recordedKey = key;
    elements.keyDisplay.textContent = key;
    elements.keyDisplay.classList.add('has-key');
    stopRecording();
  }
}

function convertKeyToAHK(event) {
  const modifiers = [];

  if (event.ctrlKey) modifiers.push('^');
  if (event.altKey) modifiers.push('!');
  if (event.shiftKey) modifiers.push('+');
  if (event.metaKey) modifiers.push('#');

  // Special key mappings
  const keyMap = {
    'Escape': 'Escape',
    'F1': 'F1', 'F2': 'F2', 'F3': 'F3', 'F4': 'F4',
    'F5': 'F5', 'F6': 'F6', 'F7': 'F7', 'F8': 'F8',
    'F9': 'F9', 'F10': 'F10', 'F11': 'F11', 'F12': 'F12',
    'Backquote': '`',
    'Minus': '-',
    'Equal': '=',
    'Backspace': 'Backspace',
    'Tab': 'Tab',
    'BracketLeft': '[',
    'BracketRight': ']',
    'Backslash': '\\',
    'Semicolon': ';',
    'Quote': "'",
    'Enter': 'Enter',
    'Comma': ',',
    'Period': '.',
    'Slash': '/',
    'Space': 'Space',
    'CapsLock': 'CapsLock',
    'Insert': 'Insert',
    'Delete': 'Delete',
    'Home': 'Home',
    'End': 'End',
    'PageUp': 'PgUp',
    'PageDown': 'PgDn',
    'ArrowUp': 'Up',
    'ArrowDown': 'Down',
    'ArrowLeft': 'Left',
    'ArrowRight': 'Right',
    'NumLock': 'NumLock',
    'NumpadDivide': 'NumpadDiv',
    'NumpadMultiply': 'NumpadMult',
    'NumpadSubtract': 'NumpadSub',
    'NumpadAdd': 'NumpadAdd',
    'NumpadEnter': 'NumpadEnter',
    'NumpadDecimal': 'NumpadDot',
    'Numpad0': 'Numpad0',
    'Numpad1': 'Numpad1',
    'Numpad2': 'Numpad2',
    'Numpad3': 'Numpad3',
    'Numpad4': 'Numpad4',
    'Numpad5': 'Numpad5',
    'Numpad6': 'Numpad6',
    'Numpad7': 'Numpad7',
    'Numpad8': 'Numpad8',
    'Numpad9': 'Numpad9',
    'PrintScreen': 'PrintScreen',
    'ScrollLock': 'ScrollLock',
    'Pause': 'Pause'
  };

  let key = keyMap[event.code] || '';

  // Handle letter keys
  if (event.code.startsWith('Key')) {
    key = event.code.replace('Key', '').toLowerCase();
  }

  // Handle digit keys
  if (event.code.startsWith('Digit')) {
    key = event.code.replace('Digit', '');
  }

  // Skip modifier-only presses
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
    return '';
  }

  if (!key) return '';

  return modifiers.join('') + key;
}

// ============================================
// AHK STATUS & CONTROL
// ============================================

async function checkAHKStatus() {
  try {
    const result = await window.electronAPI.checkAHK();
    if (result.installed) {
      elements.ahkStatusText.textContent = 'AutoHotkey v2 is installed';
      elements.installAHKBtn.textContent = 'Reinstall';
      updateStatus('ready');
    } else {
      elements.ahkStatusText.textContent = 'AutoHotkey v2 is not installed';
      elements.installAHKBtn.textContent = 'Install AHK v2';
      updateStatus('not-installed');
    }
  } catch (error) {
    console.error('Failed to check AHK status:', error);
  }
}

async function installAHK() {
  elements.installAHKBtn.disabled = true;
  elements.installAHKBtn.textContent = 'Installing...';
  elements.ahkStatusText.textContent = 'Downloading and installing...';

  try {
    const result = await window.electronAPI.installAHK();
    if (result.success) {
      showToast('AutoHotkey v2 installed successfully', 'success');
      elements.ahkStatusText.textContent = 'AutoHotkey v2 is installed';
      elements.installAHKBtn.textContent = 'Reinstall';
      updateStatus('ready');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showToast('Failed to install AutoHotkey v2', 'error');
    elements.ahkStatusText.textContent = 'Installation failed';
  } finally {
    elements.installAHKBtn.disabled = false;
  }
}

async function startAHK() {
  try {
    const result = await window.electronAPI.startAHK();
    if (result.success) {
      updateStatus('running');
      showToast('Keybinds started', 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showToast('Failed to start keybinds', 'error');
    updateStatus('error');
  }
}

async function stopAHK() {
  try {
    await window.electronAPI.stopAHK();
    updateStatus('stopped');
    showToast('Keybinds stopped', 'success');
  } catch (error) {
    showToast('Failed to stop keybinds', 'error');
  }
}

async function restartAHK() {
  try {
    const result = await window.electronAPI.restartAHK();
    if (result.success) {
      updateStatus('running');
      showToast('Keybinds restarted', 'success');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showToast('Failed to restart keybinds', 'error');
    updateStatus('error');
  }
}

function updateStatus(status) {
  const indicator = elements.statusIndicator;
  const statusText = indicator.querySelector('.status-text');

  indicator.className = 'status-indicator';

  switch (status) {
    case 'running':
      indicator.classList.add('running');
      statusText.textContent = 'Running';
      break;
    case 'stopped':
      indicator.classList.add('stopped');
      statusText.textContent = 'Stopped';
      break;
    case 'ready':
      indicator.classList.add('ready');
      statusText.textContent = 'Ready';
      break;
    case 'not-installed':
      statusText.textContent = 'AHK Not Found';
      break;
    case 'downloading':
      statusText.textContent = 'Downloading...';
      break;
    case 'installing':
      statusText.textContent = 'Installing...';
      break;
    case 'error':
      indicator.classList.add('stopped');
      statusText.textContent = 'Error';
      break;
    default:
      statusText.textContent = 'Unknown';
  }
}

// ============================================
// UPDATES
// ============================================

async function checkForUpdates() {
  elements.checkUpdateBtn.disabled = true;
  elements.checkUpdateBtn.textContent = 'Checking...';

  try {
    const result = await window.electronAPI.checkForUpdates();
    if (result.available) {
      showToast('Update available! Downloading...', 'info');
    } else {
      showToast('You are using the latest version', 'success');
    }
  } catch (error) {
    showToast('Failed to check for updates', 'error');
  } finally {
    elements.checkUpdateBtn.disabled = false;
    elements.checkUpdateBtn.textContent = 'Check Updates';
  }
}

// ============================================
// UTILITIES
// ============================================

function showToast(message, type = 'info') {
  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type]}</div>
    <div class="toast-message">${escapeHtml(message)}</div>
  `;

  elements.toastContainer.appendChild(toast);

  // Remove toast after animation
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}