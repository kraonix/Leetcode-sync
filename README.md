# LeetSync — Auto-Sync Your LeetCode Solutions to GitHub

> LeetSync is a modern Chrome extension that lets you instantly push your LeetCode submissions to your GitHub repository — no copy-paste, no manual file creation, just one click.

## 🚀 Features

* `🔄` Push latest LeetCode submission directly to GitHub
* `📝` Automatically generates clean filenames, e.g.: `21. Merge Two Sorted Lists.cpp`
* `🔐` Secure GitHub token storage
* `🌍` Supports all languages (C++, Java, Python, JS, etc.)
* `🧠` Pulls FULL code via LeetCode API (avoids Monaco editor / visible lines issue)
* `✨` Minimal UI with Push + Update Info buttons
* `🔔` In-page toast notifications
* `📂` Auto-append if file already exists

---

## 📥 Installation

1.  Clone or download this repository.
2.  Open Chrome → Extensions.
3.  Enable **Developer Mode**.
4.  Click **Load Unpacked** and select this folder.
5.  Done — the extension icon will appear in Chrome.

---

## 🛠 Setup

1.  Click the extension icon.
2.  Fill in:
    * **GitHub Token** (must have `repo → content/write` access)
    * **GitHub Username**
    * **Repository Name**
    * **Branch Name** (default: `main`)
3.  Click **Save**.

You will now see:
* **Push** → sends latest LC solution to GitHub
* **Update Info** → edit GitHub settings

---

## 🔄 How It Works

When you click **Push**, the extension:

1.  **Reads the problem slug** from the URL
    > **Example:**
    > `https://leetcode.com/problems/merge-two-sorted-lists/`
    > → slug: `merge-two-sorted-lists`

2.  **Calls the LeetCode submissions API:**
    `https://leetcode.com/api/submissions/<problem-slug>/`

3.  **Extracts your most recent submission:**
    * Full code (not truncated)
    * Language
    * Metadata

4.  **Generates a filename:**
    `<problem number>. <problem title>.<extension>`

5.  **Uploads to your GitHub repo:**
    * Creates file if not exists
    * Appends new submission if file exists

---

## 📁 Filename Examples

| Problem | Language | Saved As |
| :--- | :--- | :--- |
| Merge Two Sorted Lists | C++ | `21. Merge Two Sorted Lists.cpp` |
| Two Sum | JavaScript | `1. Two Sum.js` |
| Binary Tree Level Order Traversal | Python | `102. Binary Tree Level Order Traversal.py` |

---

## 🔐 GitHub Token Permissions

Your GitHub fine-grained token must allow:
* **Repository permissions:** ✓ **Contents:** Read & Write

This token is stored locally by Chrome’s sync storage.

---

## 📦 Project Structure
* `LeetSync/`
    * `manifest.json`
    * `popup.html`
    * `popup.js`
    * `content.js`
    * `ui.css`
    * `README.md`


---

## 🧪 Tested On

* Chrome (latest)
* Edge Chromium
* Brave
* LeetCode global (leetcode.com)

---

## 🤝 Contributing

PRs and feature requests are welcome!

---
