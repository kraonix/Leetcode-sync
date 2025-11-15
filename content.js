// =====================================
// LeetSync Content Script (FINAL)
// =====================================

console.log("%c[LeetSync] content.js loaded", "color:#4ade80;font-weight:bold;");

// --------------------------------------
// Listen for popup trigger
// --------------------------------------
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "push_now") {
    console.log("[LeetSync] Push triggered from popup");
    startPushFlow();
  }
});

// --------------------------------------
// Promisified storage fetch
// --------------------------------------
function getStorage(keys) {
  return new Promise((resolve) =>
    chrome.storage.sync.get(keys, (data) => resolve(data))
  );
}

// --------------------------------------
// UTF-8 Safe Base64 Encoder
// --------------------------------------
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  for (let b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// --------------------------------------
// FULL Monaco Code Scraper (100% Reliable)
// --------------------------------------
async function scrapeCode() {
  try {
    const slug = window.location.pathname.split("/")[2];
    const res = await fetch(`https://leetcode.com/api/submissions/${slug}/`, {
      credentials: "include"
    });
    const json = await res.json();

    if (json?.submissions_dump?.length > 0) {
      const code = json.submissions_dump[0].code;
      if (code && code.trim().length > 0) {
        console.log("[LeetSync] FULL CODE from API");
        return code;
      }
    }
  } catch (e) {
    console.error("[LeetSync] API error:", e);
  }

  // fallback
  return "";
}


// --------------------------------------
// Extract Problem Title (New LC UI)
// --------------------------------------
function getProblemTitle() {
  // New UI
  const a = document.querySelector("div.text-title-large a.no-underline");
  if (a?.innerText?.trim()) {
    return a.innerText.trim().replace(/[\\/:*?"<>|]/g, "");
  }

  // Old UI
  const old = document.querySelector("a[data-cy='question-title']");
  if (old?.innerText?.trim()) {
    return old.innerText.trim().replace(/[\\/:*?"<>|]/g, "");
  }

  // Last fallback
  const h1 = document.querySelector("h1");
  if (h1?.innerText?.trim()) {
    return h1.innerText.trim().replace(/[\\/:*?"<>|]/g, "");
  }

  return "LeetCode Problem";
}

// --------------------------------------
// Language Detection
// --------------------------------------
function detectLanguage() {
  const el =
    document.querySelector(".ant-select-selection-item") ||
    document.querySelector(".language-selector") ||
    document.querySelector(".css-1hwfws3");

  return (el?.innerText || "cpp").toLowerCase();
}

function guessExtension(lang) {
  if (lang.includes("cpp") || lang.includes("c++")) return ".cpp";
  if (lang.includes("python")) return ".py";
  if (lang.includes("java")) return ".java";
  if (lang.includes("js")) return ".js";
  if (lang.includes("c#")) return ".cs";
  return ".txt";
}

// --------------------------------------
// MAIN PUSH FLOW
// --------------------------------------
async function startPushFlow() {
  console.log("[LeetSync] Collecting code...");

  const code = await scrapeCode();
  if (!code || code.length < 3) {
    alert("LeetSync: Could not read your code. Make sure editor is visible.");
    return;
  }

  const title = getProblemTitle();
  console.log("[LeetSync] Problem title:", title);

  const lang = detectLanguage();
  const ext = guessExtension(lang);
  const filename = `${title}${ext}`;

  console.log("[LeetSync] Generated filename:", filename);

  const creds = await getStorage(["token", "username", "repo", "branch"]);
  if (!creds.token || !creds.username || !creds.repo) {
    alert("LeetSync: Missing GitHub info. Click Update Info.");
    return;
  }

  const api = `https://api.github.com/repos/${creds.username}/${creds.repo}/contents/${encodeURIComponent(
    filename
  )}`;

  console.log("[LeetSync] Checking file existence:", api);

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

// --------------------------------------
// Upload to GitHub
// --------------------------------------
async function pushFile(filename, code, sha, creds) {
  console.log("[LeetSync] Uploading:", filename);

  const api = `https://api.github.com/repos/${creds.username}/${creds.repo}/contents/${encodeURIComponent(
    filename
  )}`;

  const encoded = toBase64(code);

  const body = {
    message: sha ? `Append submission to ${filename}` : `Add ${filename}`,
    content: encoded,
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
    flashTiny("Pushed ✔");
    console.log("[LeetSync] Push complete");
  } else {
    const t = await res.text();
    console.error("[LeetSync] Push failed:", t);
    alert("LeetSync: Push failed. Check console.");
  }
}

// --------------------------------------
// Toast Notification
// --------------------------------------
function flashTiny(msg) {
  const el = document.createElement("div");
  el.innerText = msg;
  Object.assign(el.style, {
    position: "fixed",
    top: "20px",
    right: "20px",
    background: "#121314",
    padding: "12px 18px",
    color: "white",
    borderRadius: "10px",
    zIndex: 999999,
    fontWeight: "600",
    boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}
