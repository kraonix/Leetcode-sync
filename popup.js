const $ = id => document.getElementById(id);


// populate saved values
chrome.storage.sync.get(["token", "username", "repo", "branch"], (items) => {
    $("token").value = items.token || '';
    $("username").value = items.username || '';
    $("repo").value = items.repo || '';
    $("branch").value = items.branch || 'main';
});


$("save").addEventListener('click', () => {
    const token = $("token").value.trim();
    const username = $("username").value.trim();
    const repo = $("repo").value.trim();
    const branch = $("branch").value.trim() || 'main';
    if (!token || !username || !repo) {
        $("status").innerText = 'Token, username and repo are required.';
        return;
    }
    chrome.storage.sync.set({
        token,
        username,
        repo,
        branch
    }, () => {
        $("status").innerText = 'Saved!';
        setTimeout(() => $("status").innerText = '', 2000);
    });
});