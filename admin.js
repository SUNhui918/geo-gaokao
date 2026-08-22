// ============================================================
// 高三地理教学资源库 - 管理后台逻辑
// 功能:独立管理员密码 / 资源增删改 / GitHub API 提交
// ============================================================

let editingId = null; // 当前编辑中的资源 ID(null = 新增模式)
let localData = null; // 本地工作副本

// ==================== 管理员密码门 ====================
(async function initAdminGate() {
  const gate = document.getElementById("admin-gate");
  const main = document.getElementById("admin-main");
  const input = document.getElementById("admin-password");
  const submit = document.getElementById("admin-gate-submit");
  const error = document.getElementById("admin-gate-error");

  if (sessionStorage.getItem("geo_admin_authed") === "1") {
    gate.style.display = "none";
    main.style.display = "block";
    initAdmin();
    return;
  }

  async function tryEnter() {
    const hash = await sha256(input.value.trim());
    if (hash === CONFIG.adminPasswordHash) {
      sessionStorage.setItem("geo_admin_authed", "1");
      gate.style.display = "none";
      main.style.display = "block";
      initAdmin();
    } else {
      error.style.display = "block";
      input.value = "";
      input.focus();
    }
  }

  submit.addEventListener("click", tryEnter);
  input.addEventListener("keydown", e => { if (e.key === "Enter") tryEnter(); });

  document.getElementById("admin-lock").addEventListener("click", () => {
    sessionStorage.removeItem("geo_admin_authed");
    location.reload();
  });
})();

// ==================== 初始化 ====================
function initAdmin() {
  // 深拷贝数据为本地工作副本
  localData = JSON.parse(JSON.stringify(RESOURCES));

  // 恢复已保存的 Token
  const savedToken = localStorage.getItem("geo_github_token");
  if (savedToken) {
    document.getElementById("github-token").value = savedToken;
    document.getElementById("token-status").textContent = "✅ Token 已保存(本机)";
  }

  renderManageList();
}

// ==================== GitHub Token ====================
function saveToken() {
  const token = document.getElementById("github-token").value.trim();
  if (!token) {
    localStorage.removeItem("geo_github_token");
    document.getElementById("token-status").textContent = "已清除";
    return;
  }
  localStorage.setItem("geo_github_token", token);
  document.getElementById("token-status").textContent = "✅ Token 已保存(仅存本机浏览器)";
  showStatus("Token 已保存,后续发布将自动使用", "ok");
}

function getToken() {
  return localStorage.getItem("geo_github_token") || "";
}

// ==================== 表单:类型切换 ====================
function onTypeChange() {
  const type = document.getElementById("f-type").value;
  document.getElementById("fields-exams").style.display = type === "exams" ? "block" : "none";
  document.getElementById("fields-templates").style.display = type === "templates" ? "block" : "none";
  document.getElementById("fields-links").style.display = type === "links" ? "block" : "none";
}

// ==================== 表单:收集数据 ====================
function collectFormData() {
  const type = document.getElementById("f-type").value;
  const title = document.getElementById("f-title").value.trim();
  if (!title) { showStatus("请填写标题", "err"); return null; }

  const today = new Date().toISOString().slice(0, 10);

  if (type === "exams") {
    return {
      id: editingId || ("exam-" + Date.now()),
      title,
      year: document.getElementById("f-year").value,
      examType: document.getElementById("f-examtype").value,
      topic: document.getElementById("f-topic").value,
      tags: document.getElementById("f-tags").value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      link: document.getElementById("f-link").value.trim(),
      hasAnswer: document.getElementById("f-hasanswer").value === "true",
      hasAnalysis: document.getElementById("f-hasanalysis").value === "true",
      dateAdded: today
    };
  }

  if (type === "templates") {
    const mem = document.getElementById("f-memorize").value;
    const dic = document.getElementById("f-dictation").value;
    if (!mem || !dic) { showStatus("背诵版和默写版内容都要填写", "err"); return null; }
    return {
      id: editingId || ("tpl-" + Date.now()),
      title,
      category: document.getElementById("f-category").value,
      topic: document.getElementById("f-ttopic").value.trim(),
      memorizeContent: mem,
      dictationContent: dic,
      tags: document.getElementById("f-ttags").value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      dateAdded: today
    };
  }

  if (type === "links") {
    const url = document.getElementById("f-url").value.trim();
    if (!url) { showStatus("请填写网址", "err"); return null; }
    return {
      id: editingId || ("link-" + Date.now()),
      title,
      url,
      category: document.getElementById("f-lcategory").value,
      description: document.getElementById("f-desc").value.trim(),
      status: "active",
      lastChecked: today,
      dateAdded: today
    };
  }
  return null;
}

// ==================== 保存资源(本地 + GitHub) ====================
async function saveResource() {
  const data = collectFormData();
  if (!data) return;

  const type = document.getElementById("f-type").value;
  const list = localData[type] || [];

  if (editingId) {
    // 编辑模式:替换
    const idx = list.findIndex(item => item.id === editingId);
    if (idx >= 0) list[idx] = data;
  } else {
    // 新增模式:查重(同标题不重复添加)
    if (list.some(item => item.title === data.title)) {
      showStatus("已存在同名资源,如需修改请在下方列表点「编辑」", "err");
      return;
    }
    list.unshift(data); // 新的排前面
  }

  // 先更新本地预览
  const ok = await pushToGitHub();
  if (ok) {
    // 同步到页面全局数据(刷新前台可见)
    RESOURCES[type] = JSON.parse(JSON.stringify(list));
    renderManageList();
    resetForm();
    showStatus("✅ 已发布!前台站点已更新(如部署了 GitHub Pages,约 1 分钟后生效)", "ok");
  } else {
    // GitHub 提交失败,保留本地副本提示
    renderManageList();
    showStatus("⚠️ 已保存到本地预览,但未发布到 GitHub(请检查 Token 或网络)——数据在您点发布前不会丢失", "err");
  }
}

// ==================== 推送到 GitHub ====================
async function pushToGitHub() {
  const token = getToken();
  const gh = CONFIG.github;

  // 未配置 Token 或仓库信息时,视为仅本地保存
  if (!token || !gh.owner) {
    console.log("[admin] 未配置 Token 或仓库信息,跳过 GitHub 推送");
    return false;
  }

  try {
    // 1. 获取当前文件的 SHA(增量更新必须)
    const getUrl = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${gh.dataFile}?ref=${gh.branch}`;
    const getResp = await fetch(getUrl, {
      headers: { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" }
    });

    let fileSha = null;
    if (getResp.ok) {
      const fileData = await getResp.json();
      fileSha = fileData.sha;
    }

    // 2. 生成新的 data.js 内容
    const newContent = generateDataJs(localData);
    const contentBase64 = btoa(unescape(encodeURIComponent(newContent)));

    // 3. 提交
    const putUrl = `https://api.github.com/repos/${gh.owner}/${gh.repo}/contents/${gh.dataFile}`;
    const now = new Date().toLocaleString("zh-CN");
    const putResp = await fetch(putUrl, {
      method: "PUT",
      headers: {
        "Authorization": "token " + token,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "管理后台更新数据 " + now,
        content: contentBase64,
        sha: fileSha,
        branch: gh.branch
      })
    });

    if (putResp.ok) {
      console.log("[admin] GitHub 推送成功");
      return true;
    } else {
      const err = await putResp.json();
      console.error("[admin] GitHub 推送失败:", err);
      showStatus("GitHub 推送失败: " + (err.message || putResp.status), "err");
      return false;
    }
  } catch (e) {
    console.error("[admin] 网络错误:", e);
    return false;
  }
}

// 生成 data.js 文件内容
function generateDataJs(data) {
  return "// ============================================================\n" +
    "// 高三地理教学资源库 - 数据文件(管理后台自动更新)\n" +
    "// 最后更新: " + new Date().toLocaleString("zh-CN") + "\n" +
    "// ============================================================\n\n" +
    "const RESOURCES = " + JSON.stringify(data, null, 2) + ";\n";
}

// ==================== 资源管理列表 ====================
function renderManageList() {
  const type = document.getElementById("manage-type").value;
  const list = localData[type] || [];
  document.getElementById("res-count").textContent = list.length;

  const container = document.getElementById("manage-list");
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">暂无资源,请在上方添加</div>';
    return;
  }

  container.innerHTML = list.map(item => {
    let info = "";
    if (type === "exams") info = item.year + " · " + item.examType + " · " + item.topic;
    else if (type === "templates") info = item.category + " · " + (item.topic || "");
    else info = item.category + " · " + item.url;

    return `
      <div class="manage-item">
        <div>
          <div class="mi-title">${escapeHtml(item.title)}</div>
          <div class="mi-info">${escapeHtml(info)} · 添加于 ${escapeHtml(item.dateAdded || "")}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="mi-btn edit" onclick="editResource('${type}','${item.id}')">✏️ 编辑</button>
          <button class="mi-btn del" onclick="deleteResource('${type}','${item.id}')">🗑️ 删除</button>
        </div>
      </div>
    `;
  }).join("");
}

// ==================== 编辑资源 ====================
function editResource(type, id) {
  const item = (localData[type] || []).find(i => i.id === id);
  if (!item) return;

  editingId = id;

  // 切换表单类型并填充
  document.getElementById("f-type").value = type;
  onTypeChange();
  document.getElementById("form-title").textContent = "✏️ 编辑资源:" + item.title;
  document.getElementById("f-title").value = item.title || "";

  if (type === "exams") {
    document.getElementById("f-year").value = item.year || "2025";
    document.getElementById("f-examtype").value = item.examType || "江苏卷";
    document.getElementById("f-topic").value = item.topic || "综合";
    document.getElementById("f-tags").value = (item.tags || []).join(",");
    document.getElementById("f-link").value = item.link || "";
    document.getElementById("f-hasanswer").value = String(!!item.hasAnswer);
    document.getElementById("f-hasanalysis").value = String(!!item.hasAnalysis);
  } else if (type === "templates") {
    document.getElementById("f-category").value = item.category || "自然地理";
    document.getElementById("f-ttopic").value = item.topic || "";
    document.getElementById("f-memorize").value = item.memorizeContent || "";
    document.getElementById("f-dictation").value = item.dictationContent || "";
    document.getElementById("f-ttags").value = (item.tags || []).join(",");
  } else if (type === "links") {
    document.getElementById("f-lcategory").value = item.category || "地理资讯";
    document.getElementById("f-url").value = item.url || "";
    document.getElementById("f-desc").value = item.description || "";
  }

  // 滚到表单
  document.getElementById("resource-form").scrollIntoView({ behavior: "smooth" });
}

// ==================== 删除资源 ====================
async function deleteResource(type, id) {
  const item = (localData[type] || []).find(i => i.id === id);
  if (!item) return;

  if (!confirm("确定删除「" + item.title + "」吗?\n删除后需发布才会同步到 GitHub。")) return;

  localData[type] = (localData[type] || []).filter(i => i.id !== id);
  const ok = await pushToGitHub();
  if (ok) {
    RESOURCES[type] = JSON.parse(JSON.stringify(localData[type]));
    showStatus("✅ 已删除并发布", "ok");
  }
  renderManageList();
}

// ==================== 重置表单 ====================
function resetForm() {
  editingId = null;
  document.getElementById("form-title").textContent = "➕ 添加资源";
  document.querySelectorAll("#resource-form input, #resource-form textarea").forEach(el => el.value = "");
  document.querySelectorAll("#resource-form select").forEach(el => el.selectedIndex = 0);
  onTypeChange();
}

// ==================== 状态提示 ====================
function showStatus(msg, type) {
  const el = document.getElementById("save-status");
  el.textContent = msg;
  el.className = "save-status " + (type || "");
  el.style.display = "block";
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.style.display = "none"; }, 5000);
}

// ==================== 工具 ====================
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
