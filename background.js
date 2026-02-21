// ============================================================================
// Anti-Porn Background Service Worker v4.1
// ============================================================================

const KEYWORD_RULE_BASE  = 1000;
const USER_KW_RULE_BASE  = 4000; // Separate block for user keywords — NEVER whitelisted
const SITE_RULE_BASE     = 2000;
const SAFESEARCH_RULE_BASE = 5000;
const MAX_KEYWORDS       = 2500; // default keywords (ids 1000-3499)
const MAX_USER_KEYWORDS  = 500;  // user keywords  (ids 4000-4499)
const MAX_SITES          = 2000;

// ─── PERMANENT WHITELIST (extension infra only) ───────────────────────────────
const PERMANENT_WHITELIST = [
  "github.com"
];

// ─── TEMP WHITELIST ───────────────────────────────────────────────────────────
// Normal mode: these sites skip DEFAULT keyword DOM scanning only.
// User keyword URL blocking, SafeSearch, and scanning itself still apply.
const DEFAULT_TEMP_WHITELIST = [
  "google.com","youtube.com","reddit.com","twitter.com","x.com",
  "instagram.com","facebook.com","tiktok.com","bing.com","duckduckgo.com",
  "bbc.com","bbc.co.uk","cnn.com","nytimes.com","theguardian.com",
  "reuters.com","apnews.com","nbcnews.com","abcnews.go.com","foxnews.com",
// Search Engines
  "google.com",
  "bing.com",
  "yahoo.com",
  "duckduckgo.com",
  "brave.com",
  "startpage.com",
  "ecosia.org",
  // Social Media
  "youtube.com",
  "reddit.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "linkedin.com",
  "pinterest.com",
  "snapchat.com",
  // News
  "cnn.com",
  "bbc.com",
  "bbc.co.uk",
  "nytimes.com",
  "washingtonpost.com",
  "reuters.com",
  "theguardian.com",
  "foxnews.com",
  "nbcnews.com",
  "abcnews.go.com",
  "usatoday.com",
  "forbes.com",
  "bloomberg.com",
  "aljazeera.com",
  // Forums / Casual / Community
  "stackoverflow.com",
  "stackexchange.com",
  "quora.com",
  "medium.com",
  "github.com",
  "gitlab.com",
  "superuser.com",
  "askubuntu.com",
  "tumblr.com",
  "discord.com",
  "telegram.org",
  // Shopping
  "amazon.com",
  "ebay.com",
  "aliexpress.com",
  "etsy.com",
  // Educational
  "wikipedia.org",
  "coursera.org",
  "udemy.com",
  "edx.org",
  "khanacademy.org",
  "chromewebstore.google.com",
  "microsoftedge.microsoft.com",
  "addons.opera.com",
  "addons.mozilla.org"
];

// ─── SHORT HIGH-RISK KEYWORDS (url-pattern matching only) ────────────────────
const SHORT_HIGH_RISK_KEYWORDS = [
  "sex","porn","proxy","xxx","nsfw","nude","nudity",
  "cumming","cumshot","slut","sluts","anal","oral","blowjob","handjob",
  "masturbate","masturbation","orgasm","orgasms",
  "hardcore","sexvideo","erotic","erotica","threesome","gangbang"
];

// ─── DEFAULT KEYWORDS ─────────────────────────────────────────────────────────
const DEFAULT_KEYWORDS = [
  "porn","xxx","sex","hentai","nsfw","nude","nudity","proxy",
  "blowjob","handjob","milf","cams","camgirl","onlyfans",
  "erotic","escort","fetish","adult","xvideos","pornhub",
  "explicit","cumshot","slut","anal","oral","masturbate","orgasm","hardcore",
  "threesome","gangbang","erotica"
];

// ─── PANIC EXTRA KEYWORDS ────────────────────────────────────────────────────
const PANIC_EXTRA_KEYWORDS = [
  "sexy","nude","naked","nudes","nudity","nsfw",
  "lingerie","thong","boobs","tits","cleavage","topless","bottomless","braless",
  "cameltoe","nipple","nipples","foot fetish","foot pics",
  "tight dress","tight pants","yoga pants","onlyfans","only fans",
  "nsfw content","nsfw pics","leaked pics","leaked photos","leaks",
  "horny","kinky","naughty","stripper","stripping","striptease",
  "lap dance","lapdance","pole dance","pole dancing",
  "cam girl","camgirl","webcam girl","escort","hooker","prostitute",
  "nudes exchange","dick pic","dick pics","cock pic",
  "send nudes","tribute","cum tribute","jerk off instruction","nsfw asmr",
  "lewd","lewds","hentai","ecchi","ahegao","rule 34","rule34","doujin","doujinshi"
];

// ─── DEFAULT BLOCKED SITES ───────────────────────────────────────────────────
const DEFAULT_SITES = [
  "pornhub.com","xvideos.com","xnxx.com","redtube.com","youporn.com",
  "xhamster.com","spankbang.com","chaturbate.com","xnxx.tv","pornhd.com",
  "tube8.com","beeg.com","drtuber.com","keezmovies.com","extremetube.com",
  "mofosex.com","pornerbros.com","sunporno.com","4tube.com","alphaporno.com",
  "fapdu.com","nuvid.com","pornoxo.com","tnaflix.com","tubewolf.com",
  "xbabe.com","upornia.com","txxx.com","flyflv.com","motherless.com",
  "eporner.com","hclips.com","hotmovs.com","vjav.com","definebabe.com",
  "proporn.com","hdzog.com","analdin.com","sexvid.xxx","91porn.com",
  "ashemaletube.com","bravotube.net","camwhores.tv","cliphunter.com",
  "faphouse.com","freeporn.com","heavy-r.com","hentaigasm.com",
  "justporno.tv","koktube.com","madthumbs.com","myxvids.com",
  "noodlemagazine.com","perfectgirls.net","pinkworld.com","porndig.com",
  "porngo.com","pornhost.com","pornkino.to","pornky.com","pornmz.com",
  "pornone.com","pornpics.com","porntube.com","pornve.com",
  "rule34.xxx","rule34.paheal.net","sex.com","sexu.com","spankwire.com",
  "streamate.com","stripzilla.com","thumbzilla.com","tubegalore.com",
  "tuberel.com","tubev.sex","veporn.net","wankoz.com","watchmygf.me",
  "xcafe.com","xfantasy.tv","xfree.com","xtits.com","xxxbunker.com",
  "xxxfiles.com","youjizz.com","yuvutu.com","zbporn.com","livejasmin.com",
  "bongacams.com","stripchat.com","myfreecams.com","cam4.com",
  "flirt4free.com","imlive.com","jerkmate.com","brazzers.com",
  "realitykings.com","mofos.com","babes.com","nubiles.com","nubilefilms.com",
  "twistys.com","metart.com","playboy.com","penthouse.com","hustler.com",
  "vivid.com","brazzers-leaked.com","brazz-leaked.com","proxyorb.com",
  "pornhat.com","bonporn.com","browserling.com","locabrowser.com",
  "picazor.com","browser.lol","croxyproxy.com","proxyium.com",
  "proxysite.com","hide.me","kproxy.com","oxyproxy.site","proxy-seller.com",
  "proxywing.com","oxylabs.io","brightdata.com","iproyal.com","webshare.io",
  "smartproxy.com","marsproxies.com","stormproxies.com","packetstream.com",
  "decodo.com","soax.com","proxidize.com","rayobyte.com","proxyblocks.com",
  "lightningproxies.com","swiftproxy.com","roundproxies.com",
  "anonymous-proxies.net","freeproxylist.net","proxyscrape.com",
  "hidemy.name","spys.one","openproxy.space","scrapeops.io","proxynova.com",
  "geonode.com","proxy-list.download","proxystash.com","adspower.com",
  "luminati.io","luminati-china.io","generatorproxy.com",
  "free-proxy-list.net","sslproxies.org","us-proxy.org","socks-proxy.net",
  "proxybros.com","proxyline.net","my-private-network.co.uk"
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function normalizeKeyword(s) { return String(s || "").trim().toLowerCase(); }

function normalizeSite(s) {
  let site = String(s || "").trim().toLowerCase();
  site = site.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  return site;
}

function domainMatches(h, d) {
  return h === d || h.endsWith("." + d);
}

// High-intent URL patterns for short risky keywords
function generateHighIntentPatterns(kw) {
  const patterns = [];
  ["q=","query=","search=","keyword=","text=","s=","k="].forEach(p => {
    patterns.push(`*${p}${kw}*`, `*${p}${kw}&*`, `*${p}${kw}%20*`, `*${p}${kw}+*`);
  });
  patterns.push(
    `*/search*${kw}*`, `*/results*${kw}*`, `*/find*${kw}*`,
    `*/${kw}/*`, `*/${kw}-*`, `*-${kw}-*`, `*_${kw}_*`, `*.${kw}.*`
  );
  return patterns;
}

// ─── SAFESEARCH DNR RULES ────────────────────────────────────────────────────
function buildSafeSearchRules() {
  const rules = [];
  let id = SAFESEARCH_RULE_BASE;
  const mkRule = (filter, params) => ({
    id: id++, priority: 10,
    action: { type: "redirect", redirect: { transform: { queryTransform: {
      addOrReplaceParams: params
    }}}},
    condition: { urlFilter: filter, resourceTypes: ["main_frame"] }
  });
  rules.push(mkRule("||google.com/search*",  [{ key:"safe",       value:"active" }]));
  rules.push(mkRule("||bing.com/search*",    [{ key:"adlt",       value:"strict" }]));
  rules.push(mkRule("||youtube.com/results*",[{ key:"safeSearch", value:"strict" }]));
  rules.push(mkRule("||duckduckgo.com/*",    [{ key:"kp",         value:"1"      }]));
  return rules;
}

// ─── ENSURE DEFAULTS ─────────────────────────────────────────────────────────
async function ensureDefaults() {
  const data = await chrome.storage.sync.get({
    userKeywords: [], userSites: [], userWhitelistSites: [], userGraySites: [],
    commitEnabled: false, freeDeleteUsed: false, deletePenaltyLevel: 0,
    pendingDeletions: [], panicUntil: null, panicCount: 0,
    streakStart: null, lastRelapse: null,
    blockedAttemptsToday: 0, blockedAttemptsDate: ""
  });
  const u = {};
  if (!Array.isArray(data.userKeywords))           u.userKeywords = [];
  if (!Array.isArray(data.userSites))              u.userSites = [];
  if (!Array.isArray(data.userWhitelistSites))     u.userWhitelistSites = [];
  if (!Array.isArray(data.userGraySites))          u.userGraySites = [];
  if (!Array.isArray(data.pendingDeletions))       u.pendingDeletions = [];
  if (typeof data.commitEnabled !== "boolean")     u.commitEnabled = false;
  if (typeof data.freeDeleteUsed !== "boolean")    u.freeDeleteUsed = false;
  if (typeof data.deletePenaltyLevel !== "number") u.deletePenaltyLevel = 0;
  if (typeof data.panicCount !== "number")         u.panicCount = 0;
  if (!data.streakStart)                           u.streakStart = Date.now();
  if (Object.keys(u).length) {
    await chrome.storage.sync.set(u);
    console.log("[Anti-Porn v4.1] Defaults initialized");
  }
  // Seed permanent whitelist
  const wl = Array.isArray(data.userWhitelistSites) ? [...data.userWhitelistSites] : [];
  let changed = false;
  for (const site of PERMANENT_WHITELIST) {
    if (!wl.includes(site)) { wl.push(site); changed = true; }
  }
  if (changed) await chrome.storage.sync.set({ userWhitelistSites: wl });
}

// ─── MAIN RULE REBUILD ───────────────────────────────────────────────────────
async function rebuildRules() {
  const data = await chrome.storage.sync.get({
    userKeywords: [], userSites: [], userWhitelistSites: [],
    userGraySites: [], panicUntil: null
  });

  const panicActive = !!(data.panicUntil && Date.now() < data.panicUntil);

  // Full whitelist for default keyword exclusions (permanent + user-added)
  const fullWhitelist = [
    ...PERMANENT_WHITELIST,
    ...(Array.isArray(data.userWhitelistSites) ? data.userWhitelistSites : [])
  ].map(normalizeSite).filter(Boolean);

  // Validated user keywords: >=5 chars (Fix 2), normalized, not duplicating default set
  const defaultKwSet = new Set(DEFAULT_KEYWORDS.map(normalizeKeyword));
  const rawUser = Array.isArray(data.userKeywords) ? data.userKeywords : [];
  const userKeywords = [...new Set(
    rawUser.map(normalizeKeyword).filter(k => k.length >= 5 && !defaultKwSet.has(k))
  )];

  // Default keyword list for DNR (expanded with panic keywords if panic active)
  let defaultKwList = [...DEFAULT_KEYWORDS.map(normalizeKeyword)];
  if (panicActive) defaultKwList = [...defaultKwList, ...PANIC_EXTRA_KEYWORDS.map(normalizeKeyword)];
  const defaultKwUnique = [...new Set(defaultKwList)].filter(Boolean);

  // Fix 1: Combined exclusion list for DEFAULT keyword DNR rules in normal mode.
  // Includes permanent/user whitelist AND temp whitelist — both skip default keyword URL blocking.
  const tempWhitelistNorm = DEFAULT_TEMP_WHITELIST.map(normalizeSite);
  const defaultKwExclusions = [...new Set([...fullWhitelist, ...tempWhitelistNorm])];

  // Content script receives defaultKeywords and userKeywords separately (Fix 3)
  const allUniqueKeywords = [...new Set([...defaultKwUnique, ...userKeywords])];

  const dnrRules = [];
  let ruleId = KEYWORD_RULE_BASE;

  // ── DEFAULT keyword DNR rules ─────────────────────────────────────────────
  // Fix 1: Normal mode excludes fullWhitelist + DEFAULT_TEMP_WHITELIST.
  // Panic mode: no exclusions at all.
  for (const kw of defaultKwUnique) {
    if (ruleId >= KEYWORD_RULE_BASE + MAX_KEYWORDS) break;
    if (SHORT_HIGH_RISK_KEYWORDS.includes(kw)) {
      for (const pattern of generateHighIntentPatterns(kw)) {
        if (ruleId >= KEYWORD_RULE_BASE + MAX_KEYWORDS) break;
        const rule = {
          id: ruleId++, priority: 1,
          action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
          condition: { urlFilter: pattern, resourceTypes: ["main_frame"] }
        };
        if (!panicActive && defaultKwExclusions.length)
          rule.condition.excludedRequestDomains = defaultKwExclusions;
        dnrRules.push(rule);
      }
    } else if (kw.length >= 5) {
      const rule = {
        id: ruleId++, priority: 1,
        action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
        condition: { urlFilter: `*${kw}*`, resourceTypes: ["main_frame"] }
      };
      if (!panicActive && defaultKwExclusions.length)
        rule.condition.excludedRequestDomains = defaultKwExclusions;
      dnrRules.push(rule);
    }
  }

  // ── USER keyword DNR rules ────────────────────────────────────────────────
  // CRITICAL: NO excludedRequestDomains ever — user keywords override ALL whitelists
  // (permanent, user-added, and temp whitelist). Priority 5 > default priority 1.
  // Active in both normal and panic mode.
  let userRuleId = USER_KW_RULE_BASE;
  for (const kw of userKeywords) {
    if (userRuleId >= USER_KW_RULE_BASE + MAX_USER_KEYWORDS) break;
    if (SHORT_HIGH_RISK_KEYWORDS.includes(kw)) {
      for (const pattern of generateHighIntentPatterns(kw)) {
        if (userRuleId >= USER_KW_RULE_BASE + MAX_USER_KEYWORDS) break;
        dnrRules.push({
          id: userRuleId++, priority: 5,
          action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
          condition: { urlFilter: pattern, resourceTypes: ["main_frame"] }
          // intentionally NO excludedRequestDomains
        });
      }
    } else {
      // Broad match — user keyword min 5 chars validated above
      dnrRules.push({
        id: userRuleId++, priority: 5,
        action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
        condition: { urlFilter: `*${kw}*`, resourceTypes: ["main_frame"] }
        // intentionally NO excludedRequestDomains
      });
    }
  }

  // ── Site DNR rules ────────────────────────────────────────────────────────
  const userSitesNorm = (Array.isArray(data.userSites) ? data.userSites : [])
    .map(normalizeSite).filter(Boolean);

  const defaultSitesNorm = DEFAULT_SITES.map(normalizeSite);
  let sitesToBlock = [...new Set([...defaultSitesNorm, ...userSitesNorm])];

  if (!panicActive) {
    sitesToBlock = sitesToBlock.filter(site => {
      if (defaultSitesNorm.includes(site)) return true; // default sites never whitelistable
      return !fullWhitelist.some(wl => domainMatches(site, wl) || domainMatches(wl, site));
    });
  }

  sitesToBlock.slice(0, MAX_SITES).forEach((site, i) => {
    dnrRules.push({
      id: SITE_RULE_BASE + i, priority: 2,
      action: { type: "redirect", redirect: { extensionPath: "/blocked.html" } },
      condition: { requestDomains: [site], resourceTypes: ["main_frame", "sub_frame"] }
    });
  });

  // ── SafeSearch rules (always active) ────────────────────────────────────
  const allRules = [...dnrRules, ...buildSafeSearchRules()];

  // Remove IDs
  const removeRuleIds = [];
  for (let i = 0; i < MAX_KEYWORDS; i++)      removeRuleIds.push(KEYWORD_RULE_BASE + i);
  for (let i = 0; i < MAX_USER_KEYWORDS; i++) removeRuleIds.push(USER_KW_RULE_BASE + i);
  for (let i = 0; i < MAX_SITES; i++)         removeRuleIds.push(SITE_RULE_BASE + i);
  for (let i = 0; i < 20; i++)                removeRuleIds.push(SAFESEARCH_RULE_BASE + i);

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules: allRules });
    console.log(
      `[Anti-Porn v4.1] ${allRules.length} rules | panic=${panicActive} | ` +
      `defaultKw=${defaultKwUnique.length} | userKw=${userKeywords.length} | sites=${sitesToBlock.length}`
    );
  } catch (err) {
    console.error("[Anti-Porn v4.1] DNR update failed:", err);
  }

  // Store config for content scripts
  // Fix 3: store defaultKeywords and userKeywords separately.
  // Content script DOM scanning uses defaultKeywords only (user keywords are URL-only).
  await chrome.storage.local.set({
    defaultKeywords:     defaultKwUnique,
    userKeywords:        userKeywords,
    combinedKeywords:    allUniqueKeywords, // kept for compatibility
    defaultBlocklistSites: defaultSitesNorm,
    whitelistSites:      fullWhitelist,
    tempWhitelistSites:  tempWhitelistNorm,
    graySites:           (Array.isArray(data.userGraySites) ? data.userGraySites : []).map(normalizeSite),
    panicActive,
    lastRuleUpdate:      Date.now()
  });
}

// ─── RELAPSE TRACKER ─────────────────────────────────────────────────────────
async function trackRelapse(url) {
  const todayStr = new Date().toLocaleDateString("en-CA");
  const data = await chrome.storage.sync.get({ blockedAttemptsToday: 0, blockedAttemptsDate: "" });
  const u = { lastRelapse: Date.now() };
  if (data.blockedAttemptsDate === todayStr) {
    u.blockedAttemptsToday = (data.blockedAttemptsToday || 0) + 1;
  } else {
    u.blockedAttemptsToday = 1;
    u.blockedAttemptsDate = todayStr;
  }
  await chrome.storage.sync.set(u);
}

// ─── MESSAGE HANDLER ─────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "rebuildRules") {
    rebuildRules()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Issue 5 fix: always redirect to blocked.html (never chrome://newtab/)
  if (message.action === "hardBlock") {
    const tabId = sender?.tab?.id;
    if (!tabId) { sendResponse({ success: false }); return false; }
    trackRelapse(message.url || "");
    chrome.storage.local.set({
      lastBlocked: {
        url: message.url || "", reason: message.reason || "dom_keyword",
        keyword: message.keyword || "", time: Date.now()
      }
    });
    const dest = chrome.runtime.getURL("blocked.html");
    chrome.tabs.update(tabId, { url: dest }, () => {
      if (chrome.runtime.lastError)
        console.error("[Anti-Porn v4.1] Tab update error:", chrome.runtime.lastError.message);
    });
    sendResponse({ success: true });
    return false;
  }

  if (message.action === "getKeywords") {
    chrome.storage.local.get(["defaultKeywords", "userKeywords", "combinedKeywords"], (data) => {
      sendResponse({
        defaultKeywords: data.defaultKeywords || [],   // DOM scanning only (Fix 3)
        userKeywords:    data.userKeywords    || [],   // URL-only blocking
        keywords:        data.combinedKeywords || []   // legacy / URL analysis
      });
    });
    return true;
  }

  if (message.action === "getScanConfig") {
    chrome.storage.local.get(
      ["whitelistSites","tempWhitelistSites","graySites","defaultBlocklistSites","panicActive"],
      (data) => {
        sendResponse({
          whitelist:        data.whitelistSites || [],
          tempWhitelist:    data.tempWhitelistSites || [],
          graySites:        data.graySites || [],
          defaultBlocklist: data.defaultBlocklistSites || [],
          panicActive:      data.panicActive || false
        });
      }
    );
    return true;
  }
});

// ─── DNR DEBUG FEEDBACK ───────────────────────────────────────────────────────
if (chrome.declarativeNetRequest?.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    if ((info.rule?.ruleId || 0) >= SAFESEARCH_RULE_BASE) return;
    const url = info.request?.url || "";
    trackRelapse(url);
    chrome.storage.local.set({
      lastBlocked: { url, reason: "dnr_rule", ruleId: info.rule?.ruleId || null, time: Date.now() }
    });
  });
}

// ─── LIFECYCLE ───────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log("[Anti-Porn v4.1] Installed/Updated");
  await ensureDefaults();
  await rebuildRules();
  if (details.reason === "install") chrome.runtime.openOptionsPage();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log("[Anti-Porn v4.1] Browser started");
  await rebuildRules();
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "sync") return;
  const relevant = ["userKeywords","userSites","userWhitelistSites","userGraySites","panicUntil"];
  if (relevant.some(k => k in changes)) {
    console.log("[Anti-Porn v4.1] Config changed, rebuilding rules");
    await rebuildRules();
  }
});

console.log("[Anti-Porn v4.1] Background service worker loaded");
