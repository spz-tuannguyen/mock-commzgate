// Global State
let allMessages = [];
let currentFilter = 'all';
let currentSearch = '';
let currentSettings = {};
let sseSource = null;

// DOM Elements
const statTotal = document.getElementById('statTotal');
const statCloud = document.getElementById('statCloud');
const statDevice = document.getElementById('statDevice');
const statRate = document.getElementById('statRate');
const sseBadge = document.getElementById('sseBadge');
const sseStatusText = document.getElementById('sseStatusText');
const messageList = document.getElementById('messageList');
const emptyState = document.getElementById('emptyState');
const searchInput = document.getElementById('searchInput');
const filterBtns = document.querySelectorAll('.filter-btn');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');
const btnClearLog = document.getElementById('btnClearLog');
const btnRefresh = document.getElementById('btnRefresh');

// Simulator Form
const simulatorForm = document.getElementById('simulatorForm');
const simMode = document.getElementById('simMode');
const simMobile = document.getElementById('simMobile');
const simMessage = document.getElementById('simMessage');
const simType = document.getElementById('simType');
const simOtp = document.getElementById('simOtp');
const simResponseBox = document.getElementById('simResponseBox');
const simResponseText = document.getElementById('simResponseText');

// Settings Form
const settingsForm = document.getElementById('settingsForm');
const cfgSimulationMode = document.getElementById('cfgSimulationMode');
const customErrorFields = document.getElementById('customErrorFields');
const cfgCustomCode = document.getElementById('cfgCustomCode');
const cfgCustomText = document.getElementById('cfgCustomText');
const cfgLatency = document.getElementById('cfgLatency');
const latencyDisplay = document.getElementById('latencyDisplay');
const cfgFormat = document.getElementById('cfgFormat');
const cfgRequireAuth = document.getElementById('cfgRequireAuth');
const cfgValidCloudId = document.getElementById('cfgValidCloudId');
const cfgValidCloudPassword = document.getElementById('cfgValidCloudPassword');
const cfgValidDeviceToken = document.getElementById('cfgValidDeviceToken');

// Modal Elements
const messageModal = document.getElementById('messageModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const modalBody = document.getElementById('modalBody');
const toast = document.getElementById('toast');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initCodeTabs();
  initSSE();
  fetchMessages();
  fetchSettings();
  initEventListeners();
});

// Tab Navigation
function initTabs() {
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const target = btn.dataset.tab;
      document.getElementById(target).classList.add('active');
    });
  });
}

function initCodeTabs() {
  const codeBtns = document.querySelectorAll('.code-tab-btn');
  const codePanes = document.querySelectorAll('.code-pane');

  codeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      codeBtns.forEach(b => b.classList.remove('active'));
      codePanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const lang = btn.dataset.lang;
      document.getElementById(`code-${lang}`).classList.add('active');
    });
  });
}

// Server-Sent Events (SSE)
function initSSE() {
  if (sseSource) {
    sseSource.close();
  }

  sseSource = new EventSource('/api/events');

  sseSource.onopen = () => {
    sseBadge.classList.remove('disconnected');
    sseStatusText.textContent = 'Live SSE Feed';
  };

  sseSource.addEventListener('connected', () => {
    sseBadge.classList.remove('disconnected');
    sseStatusText.textContent = 'Live SSE Feed';
  });

  sseSource.addEventListener('new_message', (e) => {
    const msg = JSON.parse(e.data);
    allMessages.unshift(msg);
    renderMessages();
    updateStats();
    showToast(`Đã nhận SMS mới tới: ${msg.recipient}`);
  });

  sseSource.addEventListener('clear_messages', () => {
    allMessages = [];
    renderMessages();
    updateStats();
    showToast('Lịch sử tin nhắn đã được xóa');
  });

  sseSource.addEventListener('settings_updated', (e) => {
    currentSettings = JSON.parse(e.data);
    applySettingsToForm(currentSettings);
  });

  sseSource.onerror = () => {
    sseBadge.classList.add('disconnected');
    sseStatusText.textContent = 'Reconnecting...';
  };
}

// Fetch Messages
async function fetchMessages() {
  try {
    const res = await fetch('/api/messages');
    const data = await res.json();
    if (data.success) {
      allMessages = data.messages || [];
      renderMessages();
      updateStats();
    }
  } catch (err) {
    console.error('Error fetching messages:', err);
  }
}

// Fetch Settings
async function fetchSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.success) {
      currentSettings = data.settings || {};
      applySettingsToForm(currentSettings);
      updateStats();
    }
  } catch (err) {
    console.error('Error fetching settings:', err);
  }
}

function applySettingsToForm(s) {
  if (!s) return;
  cfgSimulationMode.value = s.simulationMode || 'normal';
  toggleCustomError(s.simulationMode === 'custom');

  cfgCustomCode.value = s.customStatusCode || '01099';
  cfgCustomText.value = s.customStatusText || '';
  cfgLatency.value = s.latencyMs || 0;
  latencyDisplay.textContent = `${s.latencyMs || 0} ms`;
  cfgFormat.value = s.responseFormat || 'text';
  cfgRequireAuth.checked = !!s.requireAuth;
  cfgValidCloudId.value = s.validCloudId || '';
  cfgValidCloudPassword.value = s.validCloudPassword || '';
  cfgValidDeviceToken.value = s.validDeviceToken || '';
}

function toggleCustomError(show) {
  customErrorFields.style.display = show ? 'grid' : 'none';
}

// Event Listeners
function initEventListeners() {
  // Filters
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderMessages();
    });
  });

  // Search
  searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value.trim().toLowerCase();
    renderMessages();
  });

  // Clear log
  btnClearLog.addEventListener('click', async () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử SMS không?')) {
      await fetch('/api/messages', { method: 'DELETE' });
    }
  });

  btnRefresh.addEventListener('click', () => {
    fetchMessages();
    fetchSettings();
    showToast('Đã làm mới dữ liệu!');
  });

  // Latency slider
  cfgLatency.addEventListener('input', (e) => {
    latencyDisplay.textContent = `${e.target.value} ms`;
  });

  cfgSimulationMode.addEventListener('change', (e) => {
    toggleCustomError(e.target.value === 'custom');
  });

  // Save Settings
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      simulationMode: cfgSimulationMode.value,
      customStatusCode: cfgCustomCode.value,
      customStatusText: cfgCustomText.value,
      latencyMs: parseInt(cfgLatency.value, 10),
      responseFormat: cfgFormat.value,
      requireAuth: cfgRequireAuth.checked,
      validCloudId: cfgValidCloudId.value,
      validCloudPassword: cfgValidCloudPassword.value,
      validDeviceToken: cfgValidDeviceToken.value
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã lưu cấu hình mô phỏng thành công!');
      }
    } catch (err) {
      showToast('Lỗi lưu cấu hình: ' + err.message);
    }
  });

  // Simulator Form
  simulatorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const mode = simMode.value;
    const mobile = simMobile.value.trim();
    const message = simMessage.value.trim();
    const type = simType.value;
    const otp = simOtp.checked;

    let targetUrl = '';
    if (mode === 'cloud') {
      targetUrl = `/gateway/SendMessage?ID=demo_user&Password=demo_password&Mobile=${encodeURIComponent(mobile)}&Type=${type}&Message=${encodeURIComponent(message)}&OTP=${otp}`;
    } else {
      targetUrl = `/api/SendMsg?token=cg_token_secret&mobile=${encodeURIComponent(mobile)}&message=${encodeURIComponent(message)}&otp=${otp}`;
    }

    try {
      const res = await fetch(targetUrl);
      const text = await res.text();

      simResponseBox.style.display = 'block';
      simResponseText.textContent = `[HTTP ${res.status}] ${text}`;
      showToast('Đã gửi SMS thành công qua mock!');
    } catch (err) {
      simResponseBox.style.display = 'block';
      simResponseText.textContent = `Error: ${err.message}`;
    }
  });

  // Modal close
  btnCloseModal.addEventListener('click', () => {
    messageModal.classList.remove('active');
  });

  messageModal.addEventListener('click', (e) => {
    if (e.target === messageModal) {
      messageModal.classList.remove('active');
    }
  });
}

// Render Messages List
function renderMessages() {
  let filtered = allMessages;

  if (currentFilter !== 'all') {
    filtered = filtered.filter(m => m.mode === currentFilter);
  }

  if (currentSearch) {
    filtered = filtered.filter(m =>
      (m.recipient && m.recipient.toLowerCase().includes(currentSearch)) ||
      (m.content && m.content.toLowerCase().includes(currentSearch)) ||
      (m.id && m.id.toLowerCase().includes(currentSearch))
    );
  }

  if (filtered.length === 0) {
    emptyState.style.display = 'block';
    messageList.innerHTML = '';
    return;
  }

  emptyState.style.display = 'none';

  messageList.innerHTML = filtered.map(m => {
    const isCloud = m.mode === 'cloud';
    const isSuccess = m.status === 'SUCCESS';
    const timeStr = new Date(m.receivedAt).toLocaleTimeString('vi-VN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    return `
      <div class="msg-card mode-${m.mode} ${isSuccess ? 'status-success' : 'status-failed'}">
        <div class="msg-header">
          <div class="msg-meta">
            <span class="badge-mode ${m.mode}">${isCloud ? 'CommzGate Cloud' : 'CG-ONE Device'}</span>
            <span class="badge-status ${isSuccess ? 'success' : 'failed'}">
              ${isSuccess ? '✓ ' + (m.statusCode || '000') : '✕ ' + (m.statusCode || 'ERROR')}
            </span>
            ${m.otp ? `<span class="badge-otp" title="Mã OTP được sinh">OTP: ${m.otp}</span>` : ''}
          </div>
          <span class="msg-time">${timeStr} (${m.id})</span>
        </div>

        <div class="msg-main">
          <div class="msg-details">
            <div class="msg-phone">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              ${m.recipient || '(No phone)'}
            </div>
            <div class="msg-body-text">${escapeHtml(m.content || '')}</div>
          </div>
          <div class="msg-actions">
            <button class="btn btn-icon" onclick="inspectMessage('${m.id}')" title="Xem chi tiết Request">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Update Top Stat Numbers
function updateStats() {
  const total = allMessages.length;
  const cloud = allMessages.filter(m => m.mode === 'cloud').length;
  const device = allMessages.filter(m => m.mode === 'device').length;
  const success = allMessages.filter(m => m.status === 'SUCCESS').length;
  const rate = total === 0 ? 100 : Math.round((success / total) * 100);

  statTotal.textContent = total;
  statCloud.textContent = cloud;
  statDevice.textContent = device;
  statRate.textContent = `${rate}%`;
}

// Inspect Message in Modal
window.inspectMessage = function(id) {
  const msg = allMessages.find(m => m.id === id);
  if (!msg) return;

  const curlCmd = generateCurl(msg);

  modalBody.innerHTML = `
    <div class="detail-section">
      <h4>Thông Tin Cơ Bản:</h4>
      <p><strong>ID:</strong> ${msg.id} | <strong>Mode:</strong> ${msg.mode.toUpperCase()}</p>
      <p><strong>Method & Endpoint:</strong> <code>${msg.method} ${msg.endpoint}</code></p>
      <p><strong>Thời gian nhận:</strong> ${new Date(msg.receivedAt).toLocaleString('vi-VN')}</p>
      <p><strong>Client IP:</strong> ${msg.clientIp || 'Unknown'}</p>
    </div>

    <div class="detail-section">
      <h4>Nội Dung Tin Nhắn:</h4>
      <div class="detail-code">${escapeHtml(msg.content)}</div>
    </div>

    ${msg.otp ? `
    <div class="detail-section">
      <h4>Mã OTP Sinh Tự Động:</h4>
      <div class="detail-code" style="color: #fbbf24; font-size: 1.1rem; font-weight: bold;">${msg.otp}</div>
    </div>` : ''}

    <div class="detail-section">
      <h4>Lệnh cURL Replay:</h4>
      <div class="detail-code" style="cursor: pointer;" onclick="copyToClipboard('${escapeAttr(curlCmd)}')" title="Bấm để copy">${escapeHtml(curlCmd)}</div>
    </div>

    <div class="detail-section">
      <h4>Toàn Bộ Payload Request (JSON):</h4>
      <div class="detail-code"><pre>${escapeHtml(JSON.stringify(msg, null, 2))}</pre></div>
    </div>
  `;

  messageModal.classList.add('active');
};

function generateCurl(m) {
  const origin = window.location.origin;
  if (m.method === 'POST') {
    return `curl -X POST "${origin}${m.endpoint}" -H "Content-Type: application/json" -d '${JSON.stringify(m.rawBody || {})}'`;
  }
  return `curl "${origin}${m.endpoint}"`;
}

// Helpers
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Đã sao chép vào clipboard!');
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
