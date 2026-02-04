# Anti-Porn — Hardcore Content Blocking Extension

Anti-Porn is a Chromium-based browser extension designed to help users block explicit and adult content, reduce distractions, and maintain long-term self-control while browsing the web.

Unlike simple blockers, Anti-Porn introduces a commitment-based protection system that makes impulsive disabling or rule changes intentionally difficult.

This extension is built for users who want serious, intentional protection.

✨ Core Features
🔒 Website Blocking

Blocks known adult websites using domain-based rules

Uses Chrome/Edge Declarative Net Request (DNR) for fast, reliable blocking

Automatically redirects blocked pages to a custom block screen

🧠 Keyword-Based Protection

Blocks pages based on explicit keywords in URLs

Detects high-intent searches (e.g. search?q=keyword)

Smart pattern matching to reduce false positives

Supports custom user-defined keywords

Short and risky keywords are handled carefully to avoid accidental blocking of normal sites.

📄 Content (DOM) Scanning

Scans page text when needed to detect explicit content

Runs only on allowed or “gray” sites

Lightweight and optimized to avoid performance issues

📋 Site Lists System

Anti-Porn uses four clear lists to avoid conflicts:

Default Block List
Built-in list of known adult domains (always blocked)

Blocked Sites
User-added domains that are always blocked

Whitelist
Domains that are always allowed
(disabled temporarily during Panic Mode)

Gray List
Allowed sites that are scanned for content

Each site can exist in only one list at a time.

🔐 Commitment Mode

Commitment Mode is the heart of Anti-Porn.

Once enabled:

Protection becomes harder to bypass

Rule deletions are restricted

Impulsive disabling is discouraged

Activation requires holding the button for 5 seconds, ensuring intentional choice.

This mode is optional, but strongly recommended.

⏳ Deletion Penalty System

When Commitment Mode is active:

First deletion is free

Every additional deletion adds a waiting penalty

Penalty time increases progressively

Deletions are queued and must be confirmed after the wait

This system is designed to slow down impulsive decisions.

⚠️ Panic Mode

Panic Mode provides temporary maximum protection.

When activated:

Lasts for 10 hours

Expands keyword scanning

Temporarily disables whitelist protection

Treats most sites as gray (scanning enabled)

Activation requires holding the button for 5 seconds to prevent accidental use.

📊 Statistics & Tracking

Anti-Porn tracks useful local stats:

Days since last relapse

Number of blocked attempts

Panic Mode usage count

Current protection status

All data is stored locally or via browser sync storage.

🧭 How to Use
🔹 Initial Setup

Install the extension

Open the settings popup

Add keywords or sites you want blocked

(Optional) Enable Commitment Mode

🔹 Managing Lists

Add or remove keywords and sites via the Lists tab

Whitelisted sites are fully allowed unless Panic Mode is active

Gray sites are allowed but monitored

🔹 Commitment Mode

Hold the Commit button for 5 seconds

Once enabled, deletions may require waiting

Designed to prevent impulsive changes

🔹 Panic Mode

Hold the Panic button for 5 seconds

Maximum protection is applied immediately

Automatically disables after 10 hours

🛠️ Installation (Developer Mode)

Clone the repository:

git clone https://github.com/your-username/anti-porn-extension.git


Open your browser:

chrome://extensions


Enable Developer Mode

Click Load unpacked

Select the project folder

🔐 Permissions Explained
Permission	Purpose
storage	Save settings and stats
declarativeNetRequest	Block and redirect sites
declarativeNetRequestFeedback	Monitor blocking results
scripting	Inject content scanning logic
<all_urls>	Required to protect all websites

No data is sent to external servers.

🔒 Privacy

No analytics

No tracking

No external servers

No data collection

All data stays on the user’s device

⚠️ Disclaimer

This extension is a self-control and productivity tool.
It does not guarantee complete protection and should be used alongside personal responsibility.

📄 License

MIT License

📌 GitHub Repository Description (short)

Anti-Porn is a hardcore Chromium extension for blocking adult content using site rules, keyword detection, commitment mode, deletion penalties, and panic protection — built for long-term self-control and focus.
