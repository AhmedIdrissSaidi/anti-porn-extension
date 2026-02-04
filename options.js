const $ = (id) => document.getElementById(id);

let commitEnabled = false;
let freeDeleteUsed = false;
let deletePenaltyLevel = 0;
let pendingDeletions = [];
let panicUntil = null;
let panicCount = 0;

let commitHoldStart = null;
let commitHoldTimer = null;

let panicHoldStart = null;
let panicHoldTimer = null;

const PENALTY_DURATIONS = [
  0,
  3600000,
  86400000,
  172800000,
  345600000,
];

function getPenaltyDuration(level) {
  if (level < PENALTY_DURATIONS.length) {
    return PENALTY_DURATIONS[level];
  }
  let duration = PENALTY_DURATIONS[PENALTY_DURATIONS.length - 1];
  for (let i = PENALTY_DURATIONS.length; i <= level; i++) {
    duration *= 2;
  }
  return duration;
}

function formatDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function formatTimeRemaining(ms) {
  if (ms <= 0) return "Ready";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Page switching
function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  
  $(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');
  
  if (page === 'stats') {
    loadStats();
  }
}

// Storage helpers
async function getData() {
  return await chrome.storage.sync.get({
    userKeywords: [],
    userSites: [],
    userWhitelistSites: [],
    userGraySites: [],
    commitEnabled: false,
    freeDeleteUsed: false,
    deletePenaltyLevel: 0,
    pendingDeletions: [],
    panicUntil: null,
    panicCount: 0,
    streakStart: Date.now(),
    lastRelapse: null,
    blockedAttemptsToday: 0,
    blockedAttemptsDate: ""
  });
}

async function setUserKeywords(keywords) {
  await chrome.storage.sync.set({ userKeywords: keywords });
  await triggerRebuild();
}

async function setUserSites(sites) {
  await chrome.storage.sync.set({ userSites: sites });
  await triggerRebuild();
}

async function setUserWhitelist(sites) {
  await chrome.storage.sync.set({ userWhitelistSites: sites });
  await triggerRebuild();
}

async function setUserGray(sites) {
  await chrome.storage.sync.set({ userGraySites: sites });
  await triggerRebuild();
}

async function triggerRebuild() {
  try {
    await chrome.runtime.sendMessage({ action: "rebuildRules" });
  } catch (error) {
    console.error("Failed to rebuild rules:", error);
  }
}

function showStatus(text, isError = false) {
  const status = $('status');
  status.textContent = text;
  status.className = isError ? 'show error' : 'show success';
  setTimeout(() => {
    status.classList.remove('show');
  }, 3000);
}

function normalizeSite(s) {
  let site = String(s || "").trim().toLowerCase();
  site = site.replace(/^https?:\/\//, "");
  site = site.replace(/^www\./, "");
  site = site.split('/')[0];
  return site;
}

function isInDefaultSites(site) {
  // Simple check - in production this would check against full DEFAULT_SITES
  const normalized = normalizeSite(site);
  const checks = ['porn', 'xxx', 'sex', 'cam', 'xvideo', 'xnxx', 'xhamster', 'redtube', 'youporn'];
  return checks.some(check => normalized.includes(check));
}

// Commit mode
function startCommitHold() {
  if (commitEnabled) return;
  
  commitHoldStart = Date.now();
  const button = $('commitButton');
  const progress = $('commitProgress');
  const text = $('commitText');
  
  text.textContent = 'HOLD...';
  
  commitHoldTimer = setInterval(() => {
    const elapsed = Date.now() - commitHoldStart;
    const percent = Math.min((elapsed / 5000) * 100, 100);
    progress.style.width = percent + '%';
    
    if (elapsed >= 5000) {
      clearInterval(commitHoldTimer);
      activateCommit();
    }
  }, 50);
}

function cancelCommitHold() {
  if (commitHoldTimer) {
    clearInterval(commitHoldTimer);
    commitHoldTimer = null;
  }
  commitHoldStart = null;
  $('commitProgress').style.width = '0%';
  $('commitText').textContent = 'HOLD 5 SECONDS TO COMMIT';
}

async function activateCommit() {
  await chrome.storage.sync.set({ commitEnabled: true });
  commitEnabled = true;
  updateCommitUI();
  showStatus('Commit activated. Deletion penalties now active.');
}

function updateCommitUI() {
  const button = $('commitButton');
  const warning = $('commitWarning');
  const success = $('commitSuccess');
  const lockIcon = $('commitLockIcon');
  
  if (commitEnabled) {
    button.disabled = true;
    button.style.background = '#3a3a3a';
    $('commitText').textContent = 'COMMITTED';
    $('commitProgress').style.width = '0%';
    lockIcon.textContent = '🔒';
    warning.style.display = 'none';
    success.style.display = 'block';
  } else {
    button.disabled = false;
    lockIcon.textContent = '🔓';
    warning.style.display = 'block';
    success.style.display = 'none';
  }
}

// Panic mode with 5-second hold
function startPanicHold(buttonEl) {
  const active = panicUntil && Date.now() < panicUntil;
  if (active) return;
  
  panicHoldStart = Date.now();
  const originalText = buttonEl.textContent;
  
  panicHoldTimer = setInterval(() => {
    const elapsed = Date.now() - panicHoldStart;
    const remaining = Math.max(0, 5 - Math.floor(elapsed / 1000));
    
    if (elapsed >= 5000) {
      clearInterval(panicHoldTimer);
      buttonEl.textContent = originalText;
      activatePanic();
    } else {
      buttonEl.textContent = `HOLD ${remaining}...`;
    }
  }, 100);
}

function cancelPanicHold(buttonEl) {
  if (panicHoldTimer) {
    clearInterval(panicHoldTimer);
    panicHoldTimer = null;
  }
  panicHoldStart = null;
  
  // Reset button text
  if (buttonEl.id === 'headerPanicBtn') {
    buttonEl.textContent = '⚠️ PANIC MODE';
  } else if (buttonEl.id === 'panicButtonLarge') {
    buttonEl.textContent = 'ACTIVATE\nPANIC';
  }
}

async function activatePanic() {
  const until = Date.now() + (10 * 3600000);
  panicCount = (panicCount || 0) + 1;
  await chrome.storage.sync.set({ 
    panicUntil: until,
    panicCount: panicCount
  });
  panicUntil = until;
  await triggerRebuild();
  updatePanicUI();
  showStatus('Panic Mode activated for 10 hours');
}

function updatePanicUI() {
  const headerBtn = $('headerPanicBtn');
  const largeBtn = $('panicButtonLarge');
  const statusText = $('panicStatusProtection');
  
  const active = panicUntil && Date.now() < panicUntil;
  
  if (active) {
    const remaining = panicUntil - Date.now();
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    
    headerBtn.classList.add('active');
    headerBtn.disabled = true;
    headerBtn.textContent = `⚠️ ACTIVE (${hours}h ${minutes}m)`;
    
    if (largeBtn) {
      largeBtn.classList.add('active');
      largeBtn.textContent = `PANIC\nACTIVE`;
      largeBtn.disabled = true;
    }
    
    if (statusText) {
      statusText.textContent = `Panic Mode active: ${hours}h ${minutes}m remaining`;
      statusText.style.color = '#ff6b6b';
      statusText.style.fontWeight = '600';
    }
  } else {
    headerBtn.classList.remove('active');
    headerBtn.disabled = false;
    headerBtn.textContent = '⚠️ PANIC MODE';
    
    if (largeBtn) {
      largeBtn.classList.remove('active');
      largeBtn.textContent = 'ACTIVATE\nPANIC';
      largeBtn.disabled = false;
    }
    
    if (statusText) {
      statusText.textContent = '';
    }
  }
}

// List rendering
function renderList(containerId, items, onDelete) {
  const container = $(containerId);
  container.innerHTML = '';

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No items';
    container.appendChild(empty);
    return;
  }

  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'list-item';
    
    const text = document.createElement('span');
    text.className = 'item-text';
    text.textContent = item;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => onDelete(item);
    
    row.appendChild(text);
    row.appendChild(deleteBtn);
    container.appendChild(row);
  });
}

// Deletion system
async function handleDelete(listType, value) {
  if (!commitEnabled) {
    showImmediateDeleteDialog(listType, value);
    return;
  }
  
  if (listType === 'whitelistSite') {
    showImmediateDeleteDialog(listType, value);
    return;
  }
  
  if (!freeDeleteUsed) {
    showFreeDeleteDialog(listType, value);
    return;
  }
  
  showPenaltyDeleteDialog(listType, value);
}

function showImmediateDeleteDialog(listType, value) {
  const confirmed = confirm(`Delete: ${value}\n\nThis will be deleted immediately.`);
  if (!confirmed) return;
  
  executeDelete(listType, value);
}

function showFreeDeleteDialog(listType, value) {
  const confirmed = confirm(`Delete: ${value}\n\nThis is your ONE free delete. Use it wisely. After this, all deletions require time penalties.`);
  if (!confirmed) return;
  
  freeDeleteUsed = true;
  chrome.storage.sync.set({ freeDeleteUsed: true });
  executeDelete(listType, value);
  showStatus('Free delete used');
}

function showPenaltyDeleteDialog(listType, value) {
  const nextLevel = deletePenaltyLevel + 1;
  const duration = getPenaltyDuration(nextLevel);
  const formatted = formatDuration(duration);
  
  const confirmed = confirm(
    `Delete: ${value}\n\n` +
    `Penalty Level: ${nextLevel}\n` +
    `Wait Time: ${formatted}\n\n` +
    `This deletion will be queued. After ${formatted}, you can confirm the deletion.\n\n` +
    `Continue?`
  );
  
  if (!confirmed) return;
  
  requestPendingDelete(listType, value, duration);
}

async function requestPendingDelete(listType, value, duration) {
  const deletion = {
    id: Date.now(),
    listType,
    value,
    requestedAt: Date.now(),
    executeAt: Date.now() + duration,
    status: 'pending'
  };
  
  pendingDeletions.push(deletion);
  deletePenaltyLevel++;
  
  await chrome.storage.sync.set({
    pendingDeletions,
    deletePenaltyLevel
  });
  
  renderPendingDeletions();
  showStatus(`Deletion queued. Wait ${formatDuration(duration)}.`);
}

async function confirmPendingDelete(deletion) {
  await executeDelete(deletion.listType, deletion.value);
  
  pendingDeletions = pendingDeletions.filter(d => d.id !== deletion.id);
  await chrome.storage.sync.set({ pendingDeletions });
  
  renderPendingDeletions();
  showStatus('Deletion confirmed');
}

async function executeDelete(listType, value) {
  const data = await getData();
  
  if (listType === 'keyword') {
    const keywords = Array.isArray(data.userKeywords) ? data.userKeywords : [];
    await setUserKeywords(keywords.filter(k => k !== value));
  } else if (listType === 'blockedSite') {
    const sites = Array.isArray(data.userSites) ? data.userSites : [];
    await setUserSites(sites.filter(s => s !== value));
  } else if (listType === 'whitelistSite') {
    const whitelist = Array.isArray(data.userWhitelistSites) ? data.userWhitelistSites : [];
    await setUserWhitelist(whitelist.filter(s => s !== value));
  } else if (listType === 'graySite') {
    const gray = Array.isArray(data.userGraySites) ? data.userGraySites : [];
    await setUserGray(gray.filter(s => s !== value));
  }
  
  refreshLists();
}

async function cancelPendingDelete(deletion) {
  const confirmed = confirm(`Cancel deletion of: ${deletion.value}\n\nWarning: The penalty time is NOT refunded. Are you sure?`);
  if (!confirmed) return;
  
  pendingDeletions = pendingDeletions.filter(d => d.id !== deletion.id);
  await chrome.storage.sync.set({ pendingDeletions });
  
  renderPendingDeletions();
  showStatus('Delete request cancelled (penalty NOT refunded)');
}

function renderPendingDeletions() {
  const container = $('pendingDeletionsList');
  const card = $('pendingDeletionsCard');
  
  if (!pendingDeletions.length) {
    card.style.display = 'none';
    return;
  }
  
  card.style.display = 'block';
  container.innerHTML = '';
  
  pendingDeletions.forEach(deletion => {
    const now = Date.now();
    const remaining = deletion.executeAt - now;
    const isReady = remaining <= 0;
    
    const div = document.createElement('div');
    div.className = 'pending-deletion';
    
    div.innerHTML = `
      <div class="pending-info">
        <div class="pending-item">${deletion.value}</div>
        <div class="pending-time">${isReady ? '✓ Ready to delete' : 'Wait: ' + formatTimeRemaining(remaining)}</div>
      </div>
      <div class="pending-actions">
        <button class="btn-primary" style="padding:4px 10px; font-size:10px;" ${!isReady ? 'disabled' : ''}>Confirm</button>
        <button class="btn-secondary" style="padding:4px 10px; font-size:10px;">Cancel</button>
      </div>
    `;
    
    const confirmBtn = div.querySelector('.btn-primary');
    const cancelBtn = div.querySelector('.btn-secondary');
    
    confirmBtn.onclick = () => confirmPendingDelete(deletion);
    cancelBtn.onclick = () => cancelPendingDelete(deletion);
    
    container.appendChild(div);
  });
}

// Add functions with strict list exclusivity
async function addKeyword() {
  const input = $('kwInput');
  const keyword = input.value.trim().toLowerCase();
  
  if (!keyword) {
    showStatus('Please enter a keyword', true);
    return;
  }
  
  const data = await getData();
  const keywords = Array.isArray(data.userKeywords) ? data.userKeywords : [];
  
  if (keywords.includes(keyword)) {
    showStatus('Keyword already exists', true);
    return;
  }
  
  keywords.push(keyword);
  await setUserKeywords(keywords);
  input.value = '';
  refreshLists();
  showStatus(`Added keyword: ${keyword}`);
}

async function addSite() {
  const input = $('siteInput');
  let site = normalizeSite(input.value);
  
  if (!site) {
    showStatus('Please enter a domain', true);
    return;
  }
  
  const data = await getData();
  const sites = Array.isArray(data.userSites) ? data.userSites : [];
  const whitelist = Array.isArray(data.userWhitelistSites) ? data.userWhitelistSites : [];
  const gray = Array.isArray(data.userGraySites) ? data.userGraySites : [];
  
  if (sites.includes(site)) {
    showStatus('Site already in blocked list', true);
    return;
  }
  
  if (whitelist.includes(site)) {
    showStatus('This site already exists in Whitelist. Remove it there first.', true);
    return;
  }
  
  if (gray.includes(site)) {
    showStatus('This site already exists in Gray List. Remove it there first.', true);
    return;
  }
  
  sites.push(site);
  await setUserSites(sites);
  input.value = '';
  refreshLists();
  showStatus(`Added blocked site: ${site}`);
}

async function addWhitelist() {
  const input = $('whitelistInput');
  let site = normalizeSite(input.value);
  
  if (!site) {
    showStatus('Please enter a domain', true);
    return;
  }
  
  if (isInDefaultSites(site)) {
    showStatus('This site can\'t go into whitelist (Default Block List)', true);
    return;
  }
  
  const data = await getData();
  const whitelist = Array.isArray(data.userWhitelistSites) ? data.userWhitelistSites : [];
  const sites = Array.isArray(data.userSites) ? data.userSites : [];
  const gray = Array.isArray(data.userGraySites) ? data.userGraySites : [];
  
  if (whitelist.includes(site)) {
    showStatus('Site already in whitelist', true);
    return;
  }
  
  if (sites.includes(site)) {
    showStatus('This site already exists in Blocked Sites. Remove it there first.', true);
    return;
  }
  
  if (gray.includes(site)) {
    showStatus('This site already exists in Gray List. Remove it there first.', true);
    return;
  }
  
  whitelist.push(site);
  await setUserWhitelist(whitelist);
  input.value = '';
  refreshLists();
  showStatus(`Added to whitelist: ${site}`);
}

async function addGray() {
  const input = $('grayInput');
  let site = normalizeSite(input.value);
  
  if (!site) {
    showStatus('Please enter a domain', true);
    return;
  }
  
  const data = await getData();
  const gray = Array.isArray(data.userGraySites) ? data.userGraySites : [];
  const sites = Array.isArray(data.userSites) ? data.userSites : [];
  const whitelist = Array.isArray(data.userWhitelistSites) ? data.userWhitelistSites : [];
  
  if (gray.includes(site)) {
    showStatus('Site already in gray list', true);
    return;
  }
  
  if (sites.includes(site)) {
    showStatus('This site already exists in Blocked Sites. Remove it there first.', true);
    return;
  }
  
  if (whitelist.includes(site)) {
    showStatus('This site already exists in Whitelist. Remove it there first.', true);
    return;
  }
  
  gray.push(site);
  await setUserGray(gray);
  input.value = '';
  refreshLists();
  showStatus(`Added to gray list: ${site}`);
}

async function refreshLists() {
  const data = await getData();
  
  const keywords = Array.isArray(data.userKeywords) ? data.userKeywords : [];
  const sites = Array.isArray(data.userSites) ? data.userSites : [];
  const whitelist = Array.isArray(data.userWhitelistSites) ? data.userWhitelistSites : [];
  const gray = Array.isArray(data.userGraySites) ? data.userGraySites : [];
  
  renderList('kwList', keywords, (item) => handleDelete('keyword', item));
  renderList('siteList', sites, (item) => handleDelete('blockedSite', item));
  renderList('whitelistList', whitelist, (item) => handleDelete('whitelistSite', item));
  renderList('grayList', gray, (item) => handleDelete('graySite', item));
}

async function loadStats() {
  const data = await getData();
  
  const lastRelapse = data.lastRelapse || data.streakStart;
  const daysClean = Math.floor((Date.now() - lastRelapse) / 86400000);
  $('daysClean').textContent = daysClean;
  
  const today = new Date().toDateString();
  const blockedToday = (data.blockedAttemptsDate === today) ? (data.blockedAttemptsToday || 0) : 0;
  $('blockedToday').textContent = blockedToday;
  
  $('panicActivations').textContent = data.panicCount || 0;
  panicCount = data.panicCount || 0;
}

async function handleRelapse() {
  const confirmed = confirm('Mark a relapse? This will reset your streak to 0 days clean.');
  if (!confirmed) return;
  
  const now = Date.now();
  await chrome.storage.sync.set({ 
    lastRelapse: now,
    streakStart: now
  });
  
  loadStats();
  showStatus('Relapse recorded. Streak reset.');
}

async function init() {
  const data = await getData();
  
  commitEnabled = data.commitEnabled;
  freeDeleteUsed = data.freeDeleteUsed;
  deletePenaltyLevel = data.deletePenaltyLevel;
  pendingDeletions = Array.isArray(data.pendingDeletions) ? data.pendingDeletions : [];
  panicUntil = data.panicUntil;
  panicCount = data.panicCount || 0;
  
  updateCommitUI();
  updatePanicUI();
  renderPendingDeletions();
  refreshLists();
  
  // Tab switching
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      switchPage(tab.dataset.page);
    });
  });
  
  // Commit button
  const commitBtn = $('commitButton');
  commitBtn.addEventListener('pointerdown', startCommitHold);
  commitBtn.addEventListener('pointerup', cancelCommitHold);
  commitBtn.addEventListener('pointercancel', cancelCommitHold);
  commitBtn.addEventListener('pointerleave', cancelCommitHold);
  
  // Header panic button (5-second hold)
  const headerPanicBtn = $('headerPanicBtn');
  headerPanicBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    startPanicHold(headerPanicBtn);
  });
  headerPanicBtn.addEventListener('pointerup', (e) => {
    e.preventDefault();
    cancelPanicHold(headerPanicBtn);
  });
  headerPanicBtn.addEventListener('pointercancel', (e) => {
    e.preventDefault();
    cancelPanicHold(headerPanicBtn);
  });
  headerPanicBtn.addEventListener('pointerleave', (e) => {
    e.preventDefault();
    cancelPanicHold(headerPanicBtn);
  });
  
  // Large panic button (5-second hold)
  const largePanicBtn = $('panicButtonLarge');
  if (largePanicBtn) {
    largePanicBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      startPanicHold(largePanicBtn);
    });
    largePanicBtn.addEventListener('pointerup', (e) => {
      e.preventDefault();
      cancelPanicHold(largePanicBtn);
    });
    largePanicBtn.addEventListener('pointercancel', (e) => {
      e.preventDefault();
      cancelPanicHold(largePanicBtn);
    });
    largePanicBtn.addEventListener('pointerleave', (e) => {
      e.preventDefault();
      cancelPanicHold(largePanicBtn);
    });
  }
  
  // Add buttons
  $('kwAddBtn').onclick = addKeyword;
  $('siteAddBtn').onclick = addSite;
  $('whitelistAddBtn').onclick = addWhitelist;
  $('grayAddBtn').onclick = addGray;
  
  // Enter keys
  $('kwInput').onkeydown = (e) => { if (e.key === 'Enter') addKeyword(); };
  $('siteInput').onkeydown = (e) => { if (e.key === 'Enter') addSite(); };
  $('whitelistInput').onkeydown = (e) => { if (e.key === 'Enter') addWhitelist(); };
  $('grayInput').onkeydown = (e) => { if (e.key === 'Enter') addGray(); };
  
  // Relapse button
  if ($('relapseButton')) {
    $('relapseButton').onclick = handleRelapse;
  }
  
  // Update panic UI every minute
  setInterval(updatePanicUI, 60000);
  setInterval(renderPendingDeletions, 60000);
}

init();
