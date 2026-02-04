# Anti-Porn – Hardcore Content Blocking Extension

Anti-Porn is a Chromium-based browser extension designed to help users block explicit and adult content.
Unlike simple blockers, Anti-Porn is a commitment-based protection system.

---

## Features

### Website Blocking
- Blocks known adult websites using domain-based rules
- Uses Declarative Net Request (DNR) for fast and reliable blocking

---

### Keyword-Based Protection
- Blocks pages based on explicit keywords in URLs
- Supports user-defined custom keywords

---

### Content (DOM) Scanning
- Scans page text to detect explicit content when needed
- Runs only on allowed or gray-listed sites

---

### Site Lists System
Anti-Porn uses multiple lists to avoid conflicts:

- Default Block List  
  Built-in list of known adult domains (always blocked)

- Blocked Sites  
  User-added domains that are always blocked

- Whitelist  
  Domains that are always allowed (temporarily disabled during Panic Mode)

- Gray List  
  Allowed sites that are scanned for content (DOM Scanning)

Each site can exist in only one list at a time.

---

### Commitment Mode
Commitment Mode is the core protection feature.

When enabled:
- Makes protection harder to disable
- Restricts deletion of keywords and sites

Activation requires holding the button for 5 seconds to ensure intent.

---

### Deletion Penalty System
When Commitment Mode is active:
- The first deletion is free
- Subsequent deletions require waiting periods
- Penalty time increases progressively
- Deletions must be confirmed after the wait time expires

This system is designed to slow down impulsive behavior.

---

### Panic Mode
Panic Mode provides temporary maximum protection.

- Activates for 10 hours
- Expands keyword scanning
- Temporarily disables whitelist protection
- Treats most sites as gray-listed and scanned

Activation requires holding the button for 5 seconds.

---

### Statistics and Tracking
The extension tracks:
- Days since last relapse
- Number of blocked attempts
- Panic Mode usage count
- Current protection status

All data is stored locally or via browser sync storage.

---

## How to Use

### Initial Setup
1. Install the extension
2. Open the settings popup
3. Add keywords or sites you want blocked
4. Optionally enable Commitment Mode

---

### Managing Lists
- Add or remove keywords and sites from the Lists tab
- Whitelisted sites are fully allowed unless Panic Mode is active
- Gray-listed sites are allowed but monitored

---

### Using Commitment Mode
- Hold the Commit button for 5 seconds
- Deletions may require waiting periods
- Designed to prevent impulsive changes

---

### Using Panic Mode
- Hold the Panic button for 5 seconds
- Maximum protection activates immediately
- Automatically disables after 10 hours

---

## Installation (Developer Mode)

1. Clone the repository:
   git clone https://github.com/your-username/anti-porn-extension.git

2. Open your browser and go to:
   chrome://extensions

3. Enable Developer Mode

4. Click "Load unpacked"

5. Select the project folder

---

## Permissions

- storage – save settings and statistics
- declarativeNetRequest – block and redirect sites
- declarativeNetRequestFeedback – monitor blocking results
- scripting – inject content scanning logic
- all_urls – required to protect all websites

No data is sent to external servers.

---

## Privacy
- No analytics
- No tracking
- No external servers
- All data remains on the user’s device

---

## Disclaimer
This extension is a self-control and productivity tool.  
It does not guarantee complete protection and should be used alongside personal responsibility.

---

## License
MIT License
