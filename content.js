(function() {
  'use strict';

  const SCAN_DEBOUNCE_MS = 500;
  const MAX_TEXT_LENGTH = 10000;
  const CHECK_INTERVAL_MS = 2000;
  const BLOCK_THRESHOLD = 100;
  
  let keywords = [];
  let whitelist = [];
  let graySites = [];
  let defaultBlocklist = [];
  let panicActive = false;
  let scanTimer = null;
  let lastScanTime = 0;
  let isBlocked = false;
  let observer = null;
  let checkInterval = null;
  let shouldScan = false;
  let suspicionScore = 0;

  function domainMatches(hostname, domain) {
    const h = hostname.toLowerCase();
    const d = domain.toLowerCase();
    return h === d || h.endsWith('.' + d);
  }

  function checkIfShouldScan(hostname) {
    // PANIC MODE: SCAN EVERYTHING except default blocklist
    if (panicActive) {
      // Check if in default blocklist (DNR handles it)
      for (const d of defaultBlocklist) {
        if (domainMatches(hostname, d)) {
          console.log(`[Anti-Porn Content] PANIC MODE: ${hostname} in default blocklist, DNR handles it`);
          return false;
        }
      }
      
      // Everything else gets scanned during panic
      console.log(`[Anti-Porn Content] PANIC MODE: ${hostname} will be scanned (global gray behavior)`);
      return true;
    }

    // NORMAL MODE: Original logic
    for (const d of defaultBlocklist) {
      if (domainMatches(hostname, d)) {
        console.log(`[Anti-Porn Content] ${hostname} in default blocklist, DNR handles it`);
        return false;
      }
    }

    for (const d of graySites) {
      if (domainMatches(hostname, d)) {
        console.log(`[Anti-Porn Content] ${hostname} in gray list, scanning enabled`);
        return true;
      }
    }

    for (const d of whitelist) {
      if (domainMatches(hostname, d)) {
        console.log(`[Anti-Porn Content] ${hostname} whitelisted, no scanning`);
        return false;
      }
    }

    return false;
  }

  // Detect if a keyword appears in a random-looking token (low intent)
  function isRandomToken(segment) {
    if (segment.length < 16) return false;
    
    const alphanumCount = (segment.match(/[A-Za-z0-9]/g) || []).length;
    const alphanumRatio = alphanumCount / segment.length;
    
    // If >85% alphanumeric and no separators, treat as random
    if (alphanumRatio > 0.85) {
      const hasSeparators = /[-_./]/.test(segment);
      if (!hasSeparators) {
        return true;
      }
    }
    
    return false;
  }

  // Analyze URL for keyword matches and assign suspicion score
  function analyzeURL(url) {
    if (!keywords || keywords.length === 0) return 0;
    
    let score = 0;
    const urlLower = url.toLowerCase();
    
    for (const keyword of keywords) {
      if (!urlLower.includes(keyword)) continue;
      
      // Check for high-intent patterns (query parameters)
      const highIntentPatterns = [
        `q=${keyword}`,
        `query=${keyword}`,
        `search=${keyword}`,
        `keyword=${keyword}`,
        `text=${keyword}`,
        `s=${keyword}`,
        `k=${keyword}`
      ];
      
      let foundHighIntent = false;
      for (const pattern of highIntentPatterns) {
        if (urlLower.includes(pattern)) {
          score += 100; // Instant block threshold
          foundHighIntent = true;
          console.log(`[Anti-Porn Content] HIGH INTENT match: ${pattern}`);
          break;
        }
      }
      
      if (foundHighIntent) continue;
      
      // Check for keyword in search paths
      if ((urlLower.includes('/search') || urlLower.includes('/results') || urlLower.includes('/find')) 
          && urlLower.includes(keyword)) {
        score += 100;
        console.log(`[Anti-Porn Content] Search path + keyword match`);
        continue;
      }
      
      // Check if keyword appears with word boundaries
      const boundaryPattern = new RegExp(`[^a-z0-9]${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^a-z0-9]`, 'i');
      if (boundaryPattern.test(urlLower)) {
        score += 100;
        console.log(`[Anti-Porn Content] Word boundary match for ${keyword}`);
        continue;
      }
      
      // Check if keyword is in a random token (low intent)
      const urlParts = url.split(/[?&#=/]/);
      let inRandomToken = false;
      
      for (const part of urlParts) {
        if (part.toLowerCase().includes(keyword) && isRandomToken(part)) {
          score += 15; // Low suspicion
          inRandomToken = true;
          console.log(`[Anti-Porn Content] LOW INTENT (random token) match for ${keyword}`);
          break;
        }
      }
    }
    
    return score;
  }

  async function loadKeywords() {
    try {
      const response = await chrome.runtime.sendMessage({ action: "getKeywords" });
      if (response && Array.isArray(response.keywords)) {
        keywords = response.keywords.map(k => k.toLowerCase());
        console.log(`[Anti-Porn Content] Loaded ${keywords.length} keywords`);
      }
    } catch (error) {
      console.error("[Anti-Porn Content] Failed to load keywords:", error);
    }
  }

  async function loadScanConfig() {
    try {
      const response = await chrome.runtime.sendMessage({ action: "getScanConfig" });
      if (response) {
        whitelist = response.whitelist || [];
        graySites = response.graySites || [];
        defaultBlocklist = response.defaultBlocklist || [];
        panicActive = response.panicActive || false;
        
        console.log(`[Anti-Porn Content] Loaded config:`);
        console.log(`  Whitelist: ${whitelist.length}`);
        console.log(`  Gray: ${graySites.length}`);
        console.log(`  Default blocklist: ${defaultBlocklist.length}`);
        console.log(`  Panic active: ${panicActive}`);
      }
    } catch (error) {
      console.error("[Anti-Porn Content] Failed to load config:", error);
    }
  }

  function extractText(node, maxLength = MAX_TEXT_LENGTH) {
    let text = "";
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') {
        return "";
      }
      if (tagName === 'input' || tagName === 'textarea') {
        return "";
      }
    }
    
    if (node.nodeType === Node.TEXT_NODE) {
      text = node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (let child of node.childNodes) {
        if (text.length >= maxLength) break;
        text += extractText(child, maxLength - text.length);
      }
    }
    
    return text.substring(0, maxLength);
  }

  function findKeywordMatch(text) {
    if (!text || keywords.length === 0) return null;
    
    const lowerText = text.toLowerCase();
    
    for (const keyword of keywords) {
      const patterns = [
        new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i'),
        new RegExp(escapeRegex(keyword), 'i')
      ];
      
      for (const pattern of patterns) {
        if (pattern.test(lowerText)) {
          return keyword;
        }
      }
    }
    
    return null;
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function blockPage(keyword) {
    if (isBlocked) return;
    isBlocked = true;

    console.log(`[Anti-Porn Content] Blocking page for keyword: ${keyword}`);

    chrome.runtime.sendMessage({
      action: "blockPage",
      url: window.location.href,
      reason: "dom_keyword",
      keyword: keyword
    });

    const overlay = document.createElement('div');
    overlay.id = 'anti-porn-block-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%) !important;
      z-index: 2147483647 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
    `;

    overlay.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div style="width: 80px; height: 80px; margin: 0 auto 20px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fc8181" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
          </svg>
        </div>
        <h1 style="font-size: 36px; color: #2d3748; margin: 0 0 12px;">Content Blocked</h1>
        <p style="font-size: 16px; color: #718096; margin: 0 0 30px;">
          This page contains inappropriate content
        </p>
        <button id="anti-porn-back-btn" style="
          background: linear-gradient(135deg, #fc8181 0%, #f56565 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(245, 101, 101, 0.3);
        ">
          ← Go Back
        </button>
        <p style="font-size: 12px; color: #a0aec0; margin-top: 30px;">
          Matched keyword: <code style="background: #f7fafc; padding: 2px 8px; border-radius: 4px;">${keyword}</code>
        </p>
      </div>
    `;

    if (document.body) {
      document.body.innerHTML = '';
      document.body.appendChild(overlay);
    } else {
      document.documentElement.innerHTML = '';
      document.documentElement.appendChild(overlay);
    }

    const backBtn = document.getElementById('anti-porn-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.history.back();
      });
    }

    if (observer) {
      observer.disconnect();
      observer = null;
    }
    
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  }

  function scanDocument() {
    if (isBlocked || !shouldScan) return;
    
    const now = Date.now();
    if (now - lastScanTime < SCAN_DEBOUNCE_MS / 2) {
      return;
    }
    lastScanTime = now;

    // Start with URL suspicion score
    let totalScore = suspicionScore;

    const titleText = document.title || "";
    let match = findKeywordMatch(titleText);
    if (match) {
      totalScore += 100;
      console.log(`[Anti-Porn Content] Title match: ${match}, score: ${totalScore}`);
      if (totalScore >= BLOCK_THRESHOLD) {
        blockPage(match);
        return;
      }
    }

    if (document.body) {
      const bodyText = extractText(document.body, MAX_TEXT_LENGTH);
      match = findKeywordMatch(bodyText);
      if (match) {
        totalScore += 100;
        console.log(`[Anti-Porn Content] Body match: ${match}, score: ${totalScore}`);
        if (totalScore >= BLOCK_THRESHOLD) {
          blockPage(match);
          return;
        }
      }
    }
    
    if (totalScore >= BLOCK_THRESHOLD) {
      blockPage('cumulative suspicion');
    }
  }

  function debouncedScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      scanDocument();
    }, SCAN_DEBOUNCE_MS);
  }

  function startObserver() {
    if (observer || isBlocked || !shouldScan) return;

    observer = new MutationObserver((mutations) => {
      if (isBlocked || !shouldScan) return;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
              const text = extractText(node, MAX_TEXT_LENGTH);
              const match = findKeywordMatch(text);
              if (match) {
                blockPage(match);
                return;
              }
            }
          }
        }
      }

      debouncedScan();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });

    console.log("[Anti-Porn Content] Observer started");
  }

  function startPeriodicCheck() {
    if (checkInterval || !shouldScan) return;
    
    checkInterval = setInterval(() => {
      if (!isBlocked && shouldScan) {
        scanDocument();
      }
    }, CHECK_INTERVAL_MS);
  }

  async function init() {
    await loadScanConfig();
    await loadKeywords();

    shouldScan = checkIfShouldScan(window.location.hostname);

    if (!shouldScan) {
      console.log(`[Anti-Porn Content] No scanning needed for ${window.location.hostname}`);
      return;
    }

    console.log(`[Anti-Porn Content] Scanning enabled for ${window.location.hostname}`);

    // Analyze URL for suspicion score
    suspicionScore = analyzeURL(window.location.href);
    console.log(`[Anti-Porn Content] Initial URL suspicion score: ${suspicionScore}`);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        scanDocument();
        startObserver();
        startPeriodicCheck();
      });
    } else {
      scanDocument();
      startObserver();
      startPeriodicCheck();
    }

    let lastUrl = location.href;
    setInterval(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log("[Anti-Porn Content] URL changed, rescanning");
        suspicionScore = analyzeURL(location.href);
        scanDocument();
      }
    }, 1000);
  }

  init();

})();
