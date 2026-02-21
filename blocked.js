// ============================================================================
// Anti-Porn Blocked Page Script (Stable Version)
// ============================================================================

async function loadLastBlocked() {
  try {
    const { lastBlocked } = await chrome.storage.local.get({ lastBlocked: null });

    const urlEl = document.getElementById('url');
    const timeEl = document.getElementById('time');

    if (!urlEl || !timeEl) return;

    if (!lastBlocked) {
      urlEl.textContent = '(Unavailable)';
      timeEl.textContent = '-';
      return;
    }

    urlEl.textContent = lastBlocked.url || '(Unavailable)';
    timeEl.textContent = new Date(
      lastBlocked.time || Date.now()
    ).toLocaleString();

  } catch (e) {
    console.error('[Blocked Page] loadLastBlocked error:', e);
  }
}

// Always redirect to a safe new tab
function goSafe() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const id = tabs?.[0]?.id;

    if (!id) {
      location.href = 'about:blank';
      return;
    }

    chrome.tabs.update(id, { url: 'chrome://newtab/' }, () => {
      if (chrome.runtime.lastError) {
        chrome.tabs.update(id, { url: 'about:blank' });
      }
    });
  });
}

// Back button → always go to new tab
document.addEventListener('DOMContentLoaded', () => {
  loadLastBlocked();

  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', goSafe);
  }
});