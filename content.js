// ======================================
// LeetSync — Content Script (Final Stable)
// ======================================

// ------------------------------
// Helper: Promisified storage
// ------------------------------
function getStorage(keys) {
  return new Promise((res) =>
    chrome.storage.sync.get(keys, (items) => res(items))
  );
}

// ======================================
// 1. Submit Button Detection (Guaranteed Working)
// ======================================
function hookSubmitButton() {
  // The REAL submit button on LeetCode:
  // <button data-e2e-locator="console-submit-button">...</button>
  const getSubmitButton = () =>
    document.querySelector(
      'button[data-e2e-locator="console-submit-button"]'
    );

  const attach = (btn) => {
    if (!btn) return;
    if (btn.dataset.leetsyncAttached) return;

    btn.dataset.leetsyncAttached = "1";

    btn.addEventListener(
      "click",
      () => {
        setTimeout(onSubmitDetected, 300); // wait for LC to process submission
      },
      { capture: true }
    );
  };

  // Try immediate attach
  let btn = getSubmitButton();
  if (btn) attach(btn);

  // Observe DOM changes
  const mo = new MutationObserver(() => {
    const b = getSubmitButton();
    if (b) attach(b);
  });

  mo.observe(document.body, { childList: true, subtree: true });

  // Retry loop (safety)
  let tries = 0;
  const interval = setInterval(() => {
    tries++;
    const b = getSubmitButton();
    if (b) {
      attach(b);
      clearInterval(interval);
    }
    if (tries > 25) clearInterval(interval);
  }, 300);
}

hookSubmitButton();

// ======================================
// 2. Toast UI
// ======================================
function removeToast() {
  const old = document.querySelector(".leetsync-toast");
  if (old) old.remove();
}

function showToast(titleShort) {
  removeToast();
  const t = document.createElement("div");
  t.className = "leetsync-toast";
  t.innerHTML = `
    <div style="min-width:0;">
      <div style="font-weight:600">Push submission to GitHub?</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:6px">${titleShort}</div>
    </div>
    <div class="actions">
      <button class="leetsync-btn" id="leetsync-push">Push to Repo</button>
      <button class="leetsync-cancel" id="leetsync-cancel">Cancel</button>
    </div>
  `;
  document.body.appendChild(t);

  document.getElementById("leetsync-cancel").onclick = () => t.remove();
  document.getElementById("leetsync-push").onclick = () => {
    t.remove();
    startPushFlow();
  };
}

async function onSubmitDetected() {
  const title =
    document.querySelector("a[data-cy='question-title']")?.innerText ||
    document.querySelector("h1")?.innerText ||
    "LeetCode Problem";

  const short = title.length > 80 ? title.slice(0, 77) + "…" : title;

  showToast(short);
}

// ======================================
// 3. Extract Code
// ======================================
function scrapeCode() {
  const monacoLines = document.querySelectorAll(".view-line");
  if (monacoLines.length)
    return [...monacoLines].map((l) => l.innerText).join("\n");

  const ta = document.querySelector("textarea");
  if (ta) return ta.value || ta.innerText;

  return "";
}

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
  if (lang.includes("c#")) return ".cs";
  return ".txt";
}

function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

// ======================================
// 4. Start Push Flow
// ======================================
async function startPushFlow() {
  const code = scrapeCode();
  if (code.length < 5) return alert("Code not detected.");

  const title =
    document.querySelector("a[data-cy='question-title']")?.innerText ||
    document.querySelector("h1")?.innerText ||
    "Problem";

  const filename =
    sanitizeFilename(title) + guessExtension(detectLanguage());

  const creds = await getStorage(["token", "username", "repo", "branch"]);
  if (!creds.token) return alert("GitHub token missing in popup.");
  if (!creds.username || !creds.repo)
    return alert("GitHub username or repo missing.");

  const api = `https://api.github.com/repos/${creds.username}/${creds.repo}/contents/${encodeURIComponent(
    filename
  )}`;

  const exists = await fetch(api, {
    headers: { Authorization: `Bearer ${creds.token}` },
  });

  if (exists.status === 200) {
    const data = await exists.json();
    showAppendModal(filename, code, data.sha, creds);
  } else {
    pushFile(filename, code, null, creds);
  }
}

// ======================================
// 5. Append Modal
// ======================================
function showAppendModal(filename, newCode, sha, creds) {
  const back = document.createElement("div");
  back.className = "leetsync-modal-backdrop";

  const m = document.createElement("div");
  m.className = "leetsync-modal";
  m.innerHTML = `
    <h4>File Already Exists</h4>
    <div style="color:#94a3b8">${filename}</div>
    <div style="margin-top:10px;font-size:13px">Append new submission?</div>
    <div class="row">
      <button class="leetsync-append" id="append-yes">Append</button>
      <button class="leetsync-cancel-2" id="append-no">Cancel</button>
    </div>
  `;

  document.body.append(back, m);

  document.getElementById("append-no").onclick = () => {
    m.remove();
    back.remove();
  };

  document.getElementById("append-yes").onclick = async () => {
    m.remove();
    back.remove();

    const url = `https://api.github.com/repos/${creds.username}/${creds.repo}/contents/${encodeURIComponent(
      filename
    )}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${creds.token}` },
    });

    const data = await res.json();
    const old = atob(data.content.replace(/\n/g, ""));
    const combined = `${old}\n\n// --- New Submission ---\n${newCode}`;

    pushFile(filename, combined, data.sha, creds);
  };
}

// ======================================
// 6. Push File
// ======================================
async function pushFile(filename, code, sha, creds) {
  const api = `https://api.github.com/repos/${creds.username}/${creds.repo}/contents/${encodeURIComponent(
    filename
  )}`;

  const contentBase64 = btoa(unescape(encodeURIComponent(code)));

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
    flashTiny("Pushed to GitHub 🎉");
  } else {
    const txt = await res.text();
    console.error("GitHub Push Error:", res.status, txt);
    alert("Push failed — open console.");
  }
}

// ======================================
// 7. Tiny Success Toast
// ======================================
function flashTiny(msg) {
  const el = document.createElement("div");
  el.className = "leetsync-toast";
  el.innerHTML = `<div style="font-weight:600">${msg}</div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}
