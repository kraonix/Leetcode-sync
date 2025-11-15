window.onload = () => {

  const form = document.getElementById("form");
  const actions = document.getElementById("actions");

  const token = document.getElementById("token");
  const username = document.getElementById("username");
  const repo = document.getElementById("repo");
  const branch = document.getElementById("branch");

  const saveBtn = document.getElementById("save");
  const pushBtn = document.getElementById("push");
  const updateBtn = document.getElementById("update");

  if (!form || !actions || !saveBtn || !pushBtn || !updateBtn) {
    console.error("❌ Popup DOM not ready (Chrome bug). Reloading…");
    setTimeout(() => window.onload(), 30);
    return;
  }

  chrome.storage.sync.get(["token","username","repo","branch"], (d) => {
    const saved = d.token && d.username && d.repo;

    if (saved) {
      form.style.display = "none";
      actions.style.display = "block";
    } else {
      form.style.display = "block";
      actions.style.display = "none";
    }

    token.value = d.token || "";
    username.value = d.username || "";
    repo.value = d.repo || "";
    branch.value = d.branch || "main";
  });

  saveBtn.addEventListener("click", () => {
    chrome.storage.sync.set(
      {
        token: token.value,
        username: username.value,
        repo: repo.value,
        branch: branch.value,
      },
      () => {
        form.style.display = "none";
        actions.style.display = "block";
      }
    );
  });

  updateBtn.addEventListener("click", () => {
    actions.style.display = "none";
    form.style.display = "block";
  });

  pushBtn.addEventListener("click", () => {
    chrome.tabs.query(
      { active: true, currentWindow: true },
      (tabs) => chrome.tabs.sendMessage(tabs[0].id, { action: "push_now" })
    );
  });

};
