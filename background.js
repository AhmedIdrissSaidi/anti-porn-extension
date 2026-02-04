// ============================================================================
// Anti-Porn Background Service Worker v3.3
// FIXED: Whitelist properly excludes DNR keyword rules
// ============================================================================

const KEYWORD_RULE_BASE = 1000;
const SITE_RULE_BASE = 2000;
const MAX_KEYWORDS = 5000;
const MAX_SITES = 2000;

const DEFAULT_WHITELIST_SITES = [
  "github.com",
  // Chromium-based extension stores
  "chromewebstore.google.com",
  "microsoftedge.microsoft.com",
  "addons.opera.com",
  "chrome.google.com",
  "addons.mozilla.org"
];

// SHORT HIGH-RISK KEYWORDS: Smart URL pattern matching only
const SHORT_HIGH_RISK_KEYWORDS = [
  "sex", "porn","proxy", "xxx", "nsfw", "nude", "nudity",
  "cumming", "cumshot", "slut", "sluts",
  "anal", "oral", "blowjob", "handjob",
  "masturbate", "masturbation",
  "orgasm", "orgasms",
  "hardcore", "sexvideo",
  "erotic", "erotica",
  "threesome", "gangbang"
];

// ALL DEFAULT KEYWORDS (for DOM scanning and longer keywords for URL blocking)
const DEFAULT_KEYWORDS = [
  "porn", "xxx", "sex", "hentai", "nsfw", "nude", "nudity","proxy", 
  "blowjob", "handjob", "milf", "cams", "camgirl", "onlyfans",
  "erotic", "escort", "fetish", "adult", "xvideos", "pornhub",
  "explicit", "cumshot", "slut", "anal", "oral", "masturbate", "orgasm", "hardcore",
  "threesome", "gangbang", "erotica"
];

const DEFAULT_SITES = [
  "pornhub.com", "xvideos.com", "xnxx.com", "redtube.com", "youporn.com",
  "xhamster.com", "spankbang.com", "chaturbate.com",
  "xnxx.tv", "pornhd.com", "tube8.com", "beeg.com", "drtuber.com",
  "keezmovies.com", "extremetube.com", "mofosex.com", "pornerbros.com",
  "sunporno.com", "4tube.com", "alphaporno.com", "fapdu.com",
  "nuvid.com", "pornoxo.com", "tnaflix.com", "tubewolf.com",
  "xbabe.com", "upornia.com", "txxx.com", "flyflv.com",
  "motherless.com", "eporner.com", "hclips.com", "hotmovs.com",
  "vjav.com", "definebabe.com", "proporn.com", "hdzog.com",
  "analdin.com", "sexvid.xxx", "91porn.com", "ashemaletube.com",
  "bravotube.net", "camwhores.tv", "cliphunter.com",
  "faphouse.com", "freeporn.com", "heavy-r.com", "hentaigasm.com",
  "justporno.tv", "koktube.com", "madthumbs.com",
  "myxvids.com", "noodlemagazine.com", "perfectgirls.net", "pinkworld.com",
  "porndig.com", "porngo.com", "pornhost.com", "pornkino.to",
  "pornky.com", "pornmz.com", "pornone.com", "pornpics.com",
  "porntube.com", "pornve.com", "rule34.xxx", "rule34.paheal.net",
  "sex.com", "sexu.com", "spankwire.com", "streamate.com",
  "stripzilla.com", "thumbzilla.com", "tubegalore.com", "tuberel.com",
  "tubev.sex", "veporn.net", "wankoz.com", "watchmygf.me",
  "xcafe.com", "xfantasy.tv", "xfree.com", "xtits.com",
  "xxxbunker.com", "xxxfiles.com", "youjizz.com", "yuvutu.com",
  "zbporn.com", "livejasmin.com", "bongacams.com", "stripchat.com",
  "myfreecams.com", "cam4.com", "flirt4free.com", "imlive.com",
  "jerkmate.com", "brazzers.com", "realitykings.com", "mofos.com",
  "babes.com", "nubiles.com", "nubilefilms.com", "twistys.com",
  "metart.com", "playboy.com", "penthouse.com", "hustler.com", "vivid.com"
];

// MASSIVELY EXPANDED PANIC KEYWORDS - DOM scanning only
const PANIC_EXTRA_KEYWORDS = [
  "sexy", "nude", "naked", "nudes", "nudity", "nsfw",
  "lingerie", "thong", "boobs", "tits",
  "cleavage", "topless", "bottomless", "braless",
  "cameltoe", "nipple", "nipples",
  "foot fetish", "foot pics",
  "tight dress", "tight pants", "yoga pants",
  "onlyfans", "only fans",
  "nsfw content", "nsfw pics",
  "leaked pics", "leaked photos", "leaks",
  "horny", "kinky", "naughty",
  "stripper", "stripping", "striptease",
  "lap dance", "lapdance",
  "pole dance", "pole dancing",
  "cam girl", "camgirl", "webcam girl",
  "escort", "hooker", "prostitute",
  "nudes exchange",
  "dick pic", "dick pics", "cock pic",
  "send nudes", "tribute", "cum tribute",
  "jerk off instruction", "nsfw asmr",
  "lewd", "lewds",
  "hentai", "ecchi", "ahegao",
  "rule 34", "rule34",
  "doujin", "doujinshi"
];

// =========================
// INSTALL HANDLER (ONLY ADDITION)
// =========================
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason !== "install") return;

  const data = await chrome.storage.sync.get({
    userWhitelistSites: []
  });

  let whitelist = Array.isArray(data.userWhitelistSites)
    ? data.userWhitelistSites
    : [];

  let changed = false;

  for (const site of DEFAULT_WHITELIST_SITES) {
    if (!whitelist.includes(site)) {
      whitelist.push(site);
      changed = true;
    }
  }

  if (changed) {
    await chrome.storage.sync.set({
      userWhitelistSites: whitelist
    });
  }
});

// =========================
// HELPERS
// =========================
function normalizeSite(s) {
  let site = String(s || "").trim().toLowerCase();
  site = site.replace(/^https?:\/\//, "");
  site = site.replace(/^www\./, "");
  site = site.split("/")[0];
  return site;
}

function domainMatches(hostname, domain) {
  return hostname === domain || hostname.endsWith("." + domain);
}

// =========================
// RULE REBUILD
// =========================
async function rebuildRules() {
  const data = await chrome.storage.sync.get({
    userKeywords: [],
    userSites: [],
    userWhitelistSites: [],
    panicUntil: null
  });

  const panicActive = data.panicUntil && Date.now() < data.panicUntil;

  const whitelist = (Array.isArray(data.userWhitelistSites)
    ? data.userWhitelistSites
    : []).map(normalizeSite);

  let allKeywords = [
    ...DEFAULT_KEYWORDS,
    ...(Array.isArray(data.userKeywords) ? data.userKeywords : [])
  ];

  if (panicActive) {
    allKeywords.push(...PANIC_EXTRA_KEYWORDS);
  }

  allKeywords = [...new Set(allKeywords.map(k => k.toLowerCase()))];

  const rules = [];
  let ruleId = KEYWORD_RULE_BASE;

  for (const keyword of allKeywords) {
    if (ruleId >= KEYWORD_RULE_BASE + MAX_KEYWORDS) break;

    const rule = {
      id: ruleId++,
      priority: 1,
      action: {
        type: "redirect",
        redirect: { extensionPath: "/blocked.html" }
      },
      condition: {
        urlFilter: `*${keyword}*`,
        resourceTypes: ["main_frame"]
      }
    };

    if (!panicActive && whitelist.length) {
      rule.condition.excludedRequestDomains = whitelist;
    }

    rules.push(rule);
  }

  const userSites = (Array.isArray(data.userSites)
    ? data.userSites
    : []).map(normalizeSite);

  const sitesToBlock = [...new Set([...DEFAULT_SITES, ...userSites])];

  sitesToBlock.forEach((site, i) => {
    rules.push({
      id: SITE_RULE_BASE + i,
      priority: 2,
      action: {
        type: "redirect",
        redirect: { extensionPath: "/blocked.html" }
      },
      condition: {
        requestDomains: [site],
        resourceTypes: ["main_frame", "sub_frame"]
      }
    });
  });

  const removeRuleIds = [];
  for (let i = 0; i < MAX_KEYWORDS; i++) removeRuleIds.push(KEYWORD_RULE_BASE + i);
  for (let i = 0; i < MAX_SITES; i++) removeRuleIds.push(SITE_RULE_BASE + i);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules: rules
  });
}

// =========================
// MESSAGE HANDLERS
// =========================
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "rebuildRules") {
    rebuildRules();
  }
});

// Initial boot
rebuildRules();

function normalizeKeyword(s) {
  return String(s || "").trim().toLowerCase();
}

function normalizeSite(s) {
  let site = String(s || "").trim().toLowerCase();
  site = site.replace(/^https?:\/\//, "");
  site = site.replace(/^www\./, "");
  site = site.split('/')[0];
  return site;
}

function domainMatches(hostname, domain) {
  const h = hostname.toLowerCase();
  const d = domain.toLowerCase();
  // EXACT match or subdomain match
  return h === d || h.endsWith('.' + d);
}

function isInDefaultSites(domain) {
  const normalized = normalizeSite(domain);
  return DEFAULT_SITES.some(d => {
    // EXACT match only - prevent "tube8.com" matching "youtube.com"
    return normalized === d || normalized.endsWith('.' + d);
  });
}

async function ensureDefaults() {
  const data = await chrome.storage.sync.get({
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
    blockedAttemptsDate: new Date().toDateString()
  });

  let changed = false;
  const updates = {};

  if (!Array.isArray(data.userKeywords)) {
    updates.userKeywords = [];
    changed = true;
  }
  if (!Array.isArray(data.userSites)) {
    updates.userSites = [];
    changed = true;
  }
  if (!Array.isArray(data.userWhitelistSites)) {
    updates.userWhitelistSites = [];
    changed = true;
  }
  if (!Array.isArray(data.userGraySites)) {
    updates.userGraySites = [];
    changed = true;
  }
  if (!Array.isArray(data.pendingDeletions)) {
    updates.pendingDeletions = [];
    changed = true;
  }
  if (typeof data.commitEnabled !== 'boolean') {
    updates.commitEnabled = false;
    changed = true;
  }
  if (typeof data.freeDeleteUsed !== 'boolean') {
    updates.freeDeleteUsed = false;
    changed = true;
  }
  if (typeof data.deletePenaltyLevel !== 'number') {
    updates.deletePenaltyLevel = 0;
    changed = true;
  }
  if (typeof data.panicCount !== 'number') {
    updates.panicCount = 0;
    changed = true;
  }

  if (changed) {
    await chrome.storage.sync.set(updates);
    console.log("[Anti-Porn] Storage initialized");
  }

  await rebuildRules();
}

async function isPanicActive() {
  const { panicUntil } = await chrome.storage.sync.get({ panicUntil: null });
  return panicUntil && Date.now() < panicUntil;
}

// Generate high-intent URL patterns for a keyword to reduce false positives
function generateHighIntentPatterns(keyword) {
  const patterns = [];
  
  // Common search query parameters
  const queryParams = ['q=', 'query=', 'search=', 'keyword=', 'text=', 's=', 'k='];
  
  for (const param of queryParams) {
    patterns.push(`*${param}${keyword}*`);
    patterns.push(`*${param}${keyword}&*`);
    patterns.push(`*${param}${keyword}%20*`);
    patterns.push(`*${param}${keyword}+*`);
  }
  
  // Common search paths combined with keyword
  patterns.push(`*/search*${keyword}*`);
  patterns.push(`*/results*${keyword}*`);
  patterns.push(`*/find*${keyword}*`);
  
  // Keyword with separators (word boundaries)
  patterns.push(`*/${keyword}/*`);
  patterns.push(`*/${keyword}-*`);
  patterns.push(`*-${keyword}-*`);
  patterns.push(`*_${keyword}_*`);
  patterns.push(`*.${keyword}.*`);
  
  return patterns;
}

async function rebuildRules() {
  const data = await chrome.storage.sync.get({
    userKeywords: [],
    userSites: [],
    userWhitelistSites: [],
    userGraySites: [],
    panicUntil: null
  });

  const panicActive = data.panicUntil && Date.now() < data.panicUntil;

  // Get whitelist domains FIRST
  const whitelist = (Array.isArray(data.userWhitelistSites) ? data.userWhitelistSites : [])
    .map(normalizeSite).filter(Boolean);

  // Collect all keywords for DOM scanning
  let allKeywords = [
    ...DEFAULT_KEYWORDS.map(normalizeKeyword),
    ...(Array.isArray(data.userKeywords) ? data.userKeywords.map(normalizeKeyword) : [])
  ];

  if (panicActive) {
    allKeywords = [...allKeywords, ...PANIC_EXTRA_KEYWORDS.map(normalizeKeyword)];
  }

  const allUniqueKeywords = [...new Set(allKeywords)].filter(Boolean);

  // Build DNR rules with smart URL patterns
  // CRITICAL: Keyword rules must EXCLUDE whitelisted domains
  const dnrRules = [];
  let ruleId = KEYWORD_RULE_BASE;

  for (const keyword of allUniqueKeywords) {
    if (ruleId >= KEYWORD_RULE_BASE + MAX_KEYWORDS) break;
    
    // Check if this is a short high-risk keyword
    if (SHORT_HIGH_RISK_KEYWORDS.includes(keyword)) {
      // Generate high-intent patterns to avoid false positives
      const patterns = generateHighIntentPatterns(keyword);
      
      for (const pattern of patterns) {
        if (ruleId >= KEYWORD_RULE_BASE + MAX_KEYWORDS) break;
        
        const rule = {
          id: ruleId++,
          priority: 1,
          action: {
            type: "redirect",
            redirect: { extensionPath: "/blocked.html" }
          },
          condition: {
            urlFilter: pattern,
            resourceTypes: ["main_frame"]
          }
        };

        // EXCLUDE whitelisted domains from keyword rules (unless panic)
        if (!panicActive && whitelist.length > 0) {
          rule.condition.excludedRequestDomains = whitelist;
        }

        dnrRules.push(rule);
      }
    } else if (keyword.length >= 5) {
      // Longer keywords are less likely to cause false positives
      const rule = {
        id: ruleId++,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { extensionPath: "/blocked.html" }
        },
        condition: {
          urlFilter: `*${keyword}*`,
          resourceTypes: ["main_frame"]
        }
      };

      // EXCLUDE whitelisted domains from keyword rules (unless panic)
      if (!panicActive && whitelist.length > 0) {
        rule.condition.excludedRequestDomains = whitelist;
      }

      dnrRules.push(rule);
    }
    // Keywords < 5 chars that aren't in SHORT_HIGH_RISK_KEYWORDS are DOM-only
  }

  const userSitesNormalized = (Array.isArray(data.userSites) ? data.userSites : [])
    .map(normalizeSite).filter(Boolean);

  let sitesToBlock = [...DEFAULT_SITES.map(normalizeSite)];

  for (const site of userSitesNormalized) {
    let shouldBlock = true;
    
    if (!panicActive) {
      for (const wl of whitelist) {
        if (domainMatches(site, wl)) {
          shouldBlock = false;
          break;
        }
      }
    }
    
    if (shouldBlock) {
      sitesToBlock.push(site);
    }
  }

  const uniqueSites = [...new Set(sitesToBlock)].slice(0, MAX_SITES);

  // Build site rules (these are always blocked, whitelist doesn't affect them)
  uniqueSites.forEach((site, i) => {
    if (ruleId < SITE_RULE_BASE + MAX_SITES) {
      dnrRules.push({
        id: SITE_RULE_BASE + i,
        priority: 2,
        action: {
          type: "redirect",
          redirect: { extensionPath: "/blocked.html" }
        },
        condition: {
          requestDomains: [site],
          resourceTypes: ["main_frame", "sub_frame"]
        }
      });
    }
  });

  console.log(`[Anti-Porn] Building ${dnrRules.length} DNR rules (${allUniqueKeywords.length} total keywords for DOM)`);
  console.log(`[Anti-Porn] Whitelist: ${whitelist.length} domains`);
  console.log(`[Anti-Porn] Panic active: ${panicActive}`);

  // Remove old rules and add new ones
  const removeRuleIds = [];
  for (let i = 0; i < MAX_KEYWORDS; i++) removeRuleIds.push(KEYWORD_RULE_BASE + i);
  for (let i = 0; i < MAX_SITES; i++) removeRuleIds.push(SITE_RULE_BASE + i);

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules: dnrRules
    });
    console.log(`[Anti-Porn] Successfully installed ${dnrRules.length} DNR rules`);
  } catch (error) {
    console.error("[Anti-Porn] Failed to update DNR rules:", error);
  }

  // Store ALL keywords (including short ones) for content script DOM scanning
  await chrome.storage.local.set({ 
    combinedKeywords: allUniqueKeywords,
    defaultBlocklistSites: DEFAULT_SITES.map(normalizeSite),
    whitelistSites: whitelist,
    graySites: (Array.isArray(data.userGraySites) ? data.userGraySites : []).map(normalizeSite),
    panicActive: panicActive,
    lastRuleUpdate: Date.now()
  });
}

async function trackRelapse(url) {
  const today = new Date().toDateString();
  const data = await chrome.storage.sync.get({
    lastRelapse: null,
    blockedAttemptsToday: 0,
    blockedAttemptsDate: ""
  });

  const updates = {
    lastRelapse: Date.now()
  };

  if (data.blockedAttemptsDate === today) {
    updates.blockedAttemptsToday = (data.blockedAttemptsToday || 0) + 1;
    updates.blockedAttemptsDate = today;
  } else {
    updates.blockedAttemptsToday = 1;
    updates.blockedAttemptsDate = today;
  }

  await chrome.storage.sync.set(updates);
  console.log(`[Anti-Porn] Relapse tracked: ${url}`);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "rebuildRules") {
    console.log("[Anti-Porn] Rebuild request received");
    rebuildRules()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.action === "blockPage") {
    console.log(`[Anti-Porn] DOM block triggered: ${message.url}`);
    trackRelapse(message.url);
    chrome.storage.local.set({
      lastBlocked: {
        url: message.url,
        reason: message.reason || "dom_keyword",
        keyword: message.keyword || "",
        time: Date.now()
      }
    });
    sendResponse({ success: true });
    return false;
  }
  
  if (message.action === "getKeywords") {
    chrome.storage.local.get(["combinedKeywords"], (data) => {
      sendResponse({ keywords: data.combinedKeywords || [] });
    });
    return true;
  }

  if (message.action === "getScanConfig") {
    chrome.storage.local.get([
      "whitelistSites",
      "graySites",
      "defaultBlocklistSites",
      "panicActive"
    ], (data) => {
      sendResponse({
        whitelist: data.whitelistSites || [],
        graySites: data.graySites || [],
        defaultBlocklist: data.defaultBlocklistSites || [],
        panicActive: data.panicActive || false
      });
    });
    return true;
  }
});

if (chrome.declarativeNetRequest?.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    const url = info.request?.url || "";
    console.log(`[Anti-Porn] DNR blocked: ${url}`);
    trackRelapse(url);
    chrome.storage.local.set({
      lastBlocked: {
        url: url,
        reason: "dnr_rule",
        ruleId: info.rule?.ruleId || null,
        time: Date.now()
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[Anti-Porn] Extension installed/updated");
  await ensureDefaults();
  
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onStartup.addListener(async () => {
  console.log("[Anti-Porn] Browser started");
  await rebuildRules();
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "sync") return;
  if (changes.userKeywords || changes.userSites || changes.userWhitelistSites || 
      changes.userGraySites || changes.panicUntil) {
    console.log("[Anti-Porn] User lists or panic changed, rebuilding rules");
    await rebuildRules();
  }
});

console.log("[Anti-Porn] Background service worker loaded");
