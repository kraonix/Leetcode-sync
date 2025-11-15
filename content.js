// Debug flag
window.__leetsync_test = "LOADED";
console.log("%c[LeetSync] content.js LOADED", "color:#4ade80;font-weight:bold;");

// ======================================
// Listen for popup "push_now"
// ======================================
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "push_now") {
    console.log("[LeetSync] Push triggered from popup");
    startPushFlow();
  }
});

// ======================================
// Promisified storage
// ======================================
function getStorage(keys) {
  return new Promise((res) =>
    chrome.storage.sync.get(keys, (items) => res(items))
  );
}

// ======================================
// UTF-8 SAFE Base64 encoding
// ======================================
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

// ======================================
// FULL CODE SCRAPER (Monaco + fallbacks)
// ======================================
function scrapeCode() {
  try {
    // Monaco model → best method, always full code
    const model = window.monaco?.editor?.getModels?.()[0];
    if (model) {
      const full = model.getValue();
      if (full && full.length > 0) return full;
    }
  } catch (err) {
    console.warn("[LeetSync] Monaco scrape error:", err);
  }

  // Fallback: visible Monaco lines
  const monacoLines = document.querySelectorAll(".view-line");
  if (monacoLines.length)
    return [...monacoLines].map((l) => l.innerText).join("\n");

  // Fallback: textarea
  const ta = document.querySelector("textarea");
  if (ta) return ta.value || ta.innerText;

  return "";
}

// ======================================
// Problem Title → Clean filename
// ======================================
function getProblemTitle() {
  const el = document.querySelector("a[data-cy='question-title']");
  if (!el) return "LeetCode Problem";

  let raw = el.innerText.trim();  // e.g., "52. N-Queens II"
  raw = raw.replace(/[\\/:*?"<>|]/g, ""); // remove invalid chars
  return raw;
}

// ======================================
// Detect active language
// ======================================
function detectLanguage() {
  const el =
    document.querySelector(".ant-select-selection-item") ||
    document.querySelector(".lang-select") ||
    document.querySelector(".css-1hwfws3");

  return (el?.innerText || "cpp").toLowerCase();
}

function guessExtension(lang) {
  if (lang.includes("cpp") || lang.includes("c++")) return ".cpp";
  if (lang.includes("python")) return ".py";
  if (lang.includes("java")) return ".java";
  if (lang.includes("js")) return ".js";
  if (lang.includes("c#") || lang.includes("csharp")) return ".cs";
  return ".txt";
}

// ======================================
// MAIN PUSH FLOW
// ======================================
async function startPushFlow() {
  console.log("[LeetSync] Starting push...");

  const code = scrapeCode();
  if (!code || code.length < 2) {
    alert("LeetSync: Could not read code. Ensure the editor is visible.");
    return;
  }

  const cleanTitle = getProblemTitle();
  const filename = cleanTitle + guessExtension(detectLanguage());

  const creds = await getStorage(["token", "username", "repo", "branch"]);

  if (!creds.token || !creds.username || !creds.repo) {
    alert("LeetSync: Missing GitHub info. Click Update Info.");
    return;
  }

  const api = `https://api.github.com/repos/${creds.username}/${creds.repo}/contents/${encodeURIComponent(
    filename
  )}`;

  console.log("[LeetSync] Checking file:", api);

  const exists = await fetch(api, {
    headers: { Authorization: `Bearer ${creds.token}` },
  });

  if (exists.status === 200) {
    const data = await exists.json();
    const old = atob(data.content.replace(/\n/g, ""));
    const combined = `${old}\n\n// --- New Submission ---\n${code}`;
    pushFile(filename, combined, data.sha, creds);
  } else {
    pushFile(filename, code, null, creds);
  }
}

// ======================================
// PUSH TO GITHUB
// ======================================
async function pushFile(filename, code, sha, creds) {
  console.log("[LeetSync] Uploading:", filename);

  const api = `https://api.github.com/repos/${creds.username}/${creds.repo}/contents/${encodeURIComponent(
    filename
  )}`;

  const contentBase64 = toBase64(code);

  const body = {
    message: sha
      ? `Append submission to ${filename}`
      : `Add ${filename}`,
    content: contentBase64,
    branch: creds.branch || "main",
  };

  if (sha) body.sha = sha;

  const res = await fetch(api, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${creds.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (res.status === 200 || res.status === 201) {
    console.log("[LeetSync] Push successful!");
    flashTiny("Pushed to GitHub 🎉");
  } else {
    const txt = await res.text();
    console.error("[LeetSync] Push error:", res.status, txt);
    alert("LeetSync: Push failed. See console.");
  }
}

// ======================================
// TOAST
// ======================================
function flashTiny(msg) {
  const el = document.createElement("div");
  el.innerHTML = `<div style="font-weight:600">${msg}</div>`;
  Object.assign(el.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    background: "#121314",
    padding: "12px 16px",
    color: "white",
    borderRadius: "10px",
    zIndex: 999999,
    boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}
