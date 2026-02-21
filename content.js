/// ============================================================================
// Anti-Porn Content Script v4.3 (Final Gray Logic)
// ============================================================================
(function () {
  'use strict';

  if (!/^https?:$/.test(location.protocol)) return;
  if (location.href.startsWith(chrome.runtime.getURL(""))) return;

  const SCAN_DEBOUNCE_MS  = 500;
  const MAX_TEXT_LENGTH   = 10000;
  const CHECK_INTERVAL_MS = 2000;
  const BLOCK_THRESHOLD   = 100;

  let defaultKeywords  = [];
  let userKeywords     = [];
  let whitelist        = [];
  let tempWhitelist    = [];
  let graySites        = [];
  let defaultBlocklist = [];
  let panicActive      = false;

  let scanTimer = null;
  let lastScanTime = 0;
  let isBlocked = false;
  let observer = null;
  let checkInterval = null;
  let suspicionScore = 0;

  // ─────────────────────────────────────────────────────────────
  function domainMatches(hostname, domain) {
    const h = hostname.toLowerCase();
    const d = domain.toLowerCase();
    return h === d || h.endsWith("." + d);
  }

  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function normalizeLeet(str) {
    return str
      .replace(/0/g, "o")
      .replace(/1/g, "i")
      .replace(/3/g, "e")
      .replace(/4/g, "a")
      .replace(/5/g, "s")
      .replace(/7/g, "t");
  }

  function isOnPermanentWhitelist(hostname) {
    return whitelist.some(d => domainMatches(hostname, d));
  }

  function isOnTempWhitelist(hostname) {
    return tempWhitelist.some(d => domainMatches(hostname, d));
  }

  function isOnGrayList(hostname) {
    return graySites.some(d => domainMatches(hostname, d));
  }

  function isOnDefaultBlocklist(hostname) {
    return defaultBlocklist.some(d => domainMatches(hostname, d));
  }

  // ─────────────────────────────────────────────────────────────
  // FINAL GRAY LIST LOGIC
  // ─────────────────────────────────────────────────────────────
  function getScanDecision(hostname) {

    // DNR default blocklist handled already
    if (isOnDefaultBlocklist(hostname)) return "skip";

    // Panic overrides everything
    if (panicActive) return "scan";

    // GRAY LIST ALWAYS FORCES SCAN
    if (isOnGrayList(hostname)) return "scan";

    // Permanent whitelist → skip
    if (isOnPermanentWhitelist(hostname)) return "skip";

    // Temp whitelist → skip
    if (isOnTempWhitelist(hostname)) return "skip";

    // Everything else → scan
    return "scan";
  }

  // ─────────────────────────────────────────────────────────────
  // USER KEYWORD URL BLOCK (ALWAYS OVERRIDE)
  // ─────────────────────────────────────────────────────────────
  function urlContainsUserKeyword(url) {
    if (!userKeywords.length) return null;
    const normalized = normalizeLeet(url.toLowerCase());
    for (const kw of userKeywords) {
      if (normalized.includes(kw)) return kw;
    }
    return null;
  }

  // ─────────────────────────────────────────────────────────────
  function extractText(node, maxLength) {
    maxLength = maxLength || MAX_TEXT_LENGTH;
    let text = "";

    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      if (["script","style","noscript","input","textarea"].includes(tag)) return "";
    }

    if (node.nodeType === Node.TEXT_NODE) {
      text = node.textContent || "";
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const child of node.childNodes) {
        if (text.length >= maxLength) break;
        text += extractText(child, maxLength - text.length);
      }
    }

    return text.substring(0, maxLength);
  }

  function findKeywordMatch(text) {
    if (!text || !defaultKeywords.length) return null;

    const normalizedText = normalizeLeet(text.toLowerCase());

    for (const kw of defaultKeywords) {
      const re = new RegExp(`\\b${escapeRegex(kw)}\\b`, "i");
      if (re.test(normalizedText)) return kw;
      if (normalizedText.includes(kw)) return kw;
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────────
  function hardBlock(keyword, reason) {
    if (isBlocked) return;
    isBlocked = true;

    if (observer) observer.disconnect();
    if (checkInterval) clearInterval(checkInterval);
    clearTimeout(scanTimer);

    chrome.runtime.sendMessage({
      action: "hardBlock",
      reason: reason || "dom_keyword",
      keyword: keyword || "",
      url: location.href
    }).catch(() => {
      location.replace(chrome.runtime.getURL("blocked.html"));
    });
  }

  function scanDocument() {
    if (isBlocked) return;

    const now = Date.now();
    if (now - lastScanTime < SCAN_DEBOUNCE_MS) return;
    lastScanTime = now;

    let totalScore = suspicionScore;

    const titleMatch = findKeywordMatch(document.title || "");
    if (titleMatch) {
      totalScore += 100;
      if (totalScore >= BLOCK_THRESHOLD) {
        hardBlock(titleMatch, "title_keyword");
        return;
      }
    }

    if (document.body) {
      const bodyText = extractText(document.body);
      const bodyMatch = findKeywordMatch(bodyText);
      if (bodyMatch) {
        totalScore += 100;
        if (totalScore >= BLOCK_THRESHOLD) {
          hardBlock(bodyMatch, "dom_keyword");
          return;
        }
      }
    }

    if (totalScore >= BLOCK_THRESHOLD) {
      hardBlock("cumulative", "score");
    }
  }

  function startObserver() {
    if (observer || isBlocked) return;

    observer = new MutationObserver(() => {
      scanDocument();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function startPeriodicCheck() {
    if (checkInterval) return;
    checkInterval = setInterval(scanDocument, CHECK_INTERVAL_MS);
  }

  // ─────────────────────────────────────────────────────────────
  async function loadConfig() {
    const [kwResp, cfgResp] = await Promise.all([
      chrome.runtime.sendMessage({ action: "getKeywords" }),
      chrome.runtime.sendMessage({ action: "getScanConfig" })
    ]);

    if (kwResp) {
      defaultKeywords = (kwResp.defaultKeywords || []).map(k => k.toLowerCase());
      userKeywords    = (kwResp.userKeywords || []).map(k => k.toLowerCase());
    }

    if (cfgResp) {
      whitelist        = (cfgResp.whitelist || []).map(d => d.toLowerCase());
      tempWhitelist    = (cfgResp.tempWhitelist || []).map(d => d.toLowerCase());
      graySites        = (cfgResp.graySites || []).map(d => d.toLowerCase());
      defaultBlocklist = (cfgResp.defaultBlocklist || []).map(d => d.toLowerCase());
      panicActive      = cfgResp.panicActive || false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  async function init() {
    await loadConfig();

    const hostname = location.hostname;

    // 1️⃣ USER KEYWORD URL OVERRIDE
    const userMatch = urlContainsUserKeyword(location.href);
    if (userMatch) {
      hardBlock(userMatch, "user_keyword_url");
      return;
    }

    // 2️⃣ SCAN DECISION
    const decision = getScanDecision(hostname);
    if (decision === "skip") return;

    suspicionScore = 0;

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        scanDocument();
        startObserver();
        startPeriodicCheck();
      });
    } else {
      scanDocument();
      startObserver();
      startPeriodicCheck();
    }

    // SPA monitoring
    let lastUrl = location.href;
    setInterval(() => {
      if (location.href === lastUrl) return;
      lastUrl = location.href;

      const match = urlContainsUserKeyword(location.href);
      if (match) {
        hardBlock(match, "user_keyword_url_spa");
        return;
      }

      suspicionScore = 0;
      scanDocument();
    }, 1000);
  }

  init();
})();