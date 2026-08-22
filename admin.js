// ============================================================
// 高三地理试题库 - 管理后台逻辑
// 功能:管理员密码门 / GitHub Token 管理 /
//      试卷增删改 + PDF/Word 文件上传 /
//      题目增删改(专题检索用) / data.js 同步发布
// ============================================================

const GH = CONFIG.github;
const TOKEN_KEY = "geo_admin_token";

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
    startAdmin();
    return;
  }

  async function tryEnter() {
    const hash = await sha256(input.value.trim());
    if (hash === CONFIG.adminPasswordHash) {
      sessionStorage.setItem("geo_admin_authed", "1");
      gate.style.display = "none";
      main.style.display = "block";
      startAdmin();
    } else {
      error.style.display = "block";
      input.value = "";
      input.focus();
    }
  }

  submit.addEventListener("click", tryEnter);
  input.addEventListener("keydown", e => { if (e.key === "Enter") tryEnter(); });
})();

document.getElementById("admin-lock").addEventListener("click", () => {
  sessionStorage.removeItem("geo_admin_authed");
  location.reload();
});

// ==================== 管理界面初始化 ====================
function startAdmin() {
  // Token 回显
  const saved = localStorage.getItem(TOKEN_KEY);
  if (saved) {
    document.getElementById("github-token").value = saved;
    document.getElementById("token-status").textContent = "已保存(本机)";
  }

  // 省份下拉
  const provSel = document.getElementById("p-province");
  (RESOURCES.provinces || []).forEach(p => {
    const opt = document.createElement("option");
    opt.textContent = p;
    provSel.appendChild(opt);
  });

  // 专题下拉(从 TOPIC_GROUPS 展开)
  const topicSel = document.getElementById("q-topic");
  TOPIC_GROUPS.forEach(g => {
    const og = document.createElement("optgroup");
    og.label = g.group;
    g.topics.forEach(t => {
      const opt = document.createElement("option");
      opt.textContent = t;
      og.appendChild(opt);
    });
    topicSel.appendChild(og);
  });

  // 默认年份填当前年
  document.getElementById("p-year").value = String(new Date().getFullYear());

  refreshPaperSelect();
  renderManageList();

  // 文件选择 + 拖拽上传
  const fileInput = document.getElementById("p-file");
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      document.getElementById("p-file-info").textContent =
        "已选择:" + fileInput.files[0].name + "(" + formatSize(fileInput.files[0].size) + "),保存时自动上传";
    }
  });
  const box = document.getElementById("paper-upload-box");
  box.addEventListener("dragover", e => { e.preventDefault(); box.classList.add("dragover"); });
  box.addEventListener("dragleave", () => box.classList.remove("dragover"));
  box.addEventListener("drop", e => {
    e.preventDefault();
    box.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      fileInput.dispatchEvent(new Event("change"));
    }
  });

  // 拉取线上最新数据(避免本地旧数据覆盖)
  pullLatestData();
}

// ==================== Token 管理 ====================
function saveToken() {
  const v = document.getElementById("github-token").value.trim();
  if (!v) {
    localStorage.removeItem(TOKEN_KEY);
    document.getElementById("token-status").textContent = "已清除";
    return;
  }
  localStorage.setItem(TOKEN_KEY, v);
  document.getElementById("token-status").textContent = "已保存(本机)";
  showStatus("Token 已保存,将同步拉取线上最新数据", "ok");
  pullLatestData();
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

// ==================== GitHub API 封装 ====================
async function ghGet(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      "Authorization": "token " + getToken(),
      "Accept": "application/vnd.github+json"
    }
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

async function ghPutFile(path, message, base64Content, sha) {
  const body = { message, content: base64Content };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com${path}`, {
    method: "PUT",
    headers: {
      "Authorization": "token " + getToken(),
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API ${res.status}:${err.slice(0, 200)}`);
  }
  return res.json();
}

// 拉取线上最新 data.js
async function pullLatestData() {
  if (!getToken()) return;
  try {
    const meta = await ghGet(`/repos/${GH.owner}/${GH.repo}/contents/${GH.dataFile}?ref=${GH.branch}&t=${Date.now()}`);
    const text = decodeURIComponent(escape(atob(meta.content.replace(/\n/g, ""))));
    if (text.includes("const RESOURCES")) {
      // 用线上数据覆盖本地
      const blob = new Blob([text], { type: "text/javascript" });
      // 通过间接方式执行
      window.eval(text);
      refreshPaperSelect();
      renderManageList();
      document.getElementById("p-province").innerHTML = "";
      (RESOURCES.provinces || []).forEach(p => {
        const opt = document.createElement("option");
        opt.textContent = p;
        document.getElementById("p-province").appendChild(opt);
      });
    }
  } catch (e) {
    console.warn("拉取线上数据失败,使用本地数据:", e.message);
  }
}

// 序列化 data.js 并发布
async function publishData(message) {
  const lines = [];
  lines.push("// ============================================================");
  lines.push("// 高三地理试题库 - 数据文件(由管理后台自动生成)");
  lines.push("// papers:试卷(按省份+年份检索整卷) / questions:题目(按专题跨卷检索)");
  lines.push("// ============================================================");
  lines.push("");
  lines.push("const TOPIC_GROUPS = " + JSON.stringify(TOPIC_GROUPS, null, 2) + ";");
  lines.push("");
  lines.push("const RESOURCES = " + JSON.stringify(RESOURCES, null, 2) + ";");
  const content = lines.join("\n");

  const path = `/repos/${GH.owner}/${GH.repo}/contents/${GH.dataFile}`;
  let sha = null;
  try {
    const meta = await ghGet(`${path}?ref=${GH.branch}`);
    sha = meta.sha;
  } catch (e) { /* 文件不存在,新建 */ }

  await ghPutFile(path, message, base64Utf8(content), sha);
}

// UTF-8 安全的 base64 编码
function base64Utf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// ==================== 文件上传(PDF / Word) ====================
async function uploadPaperFile(file) {
  showStatus(`正在上传 ${file.name}(${formatSize(file.size)})...`, "");
  const safeName = file.name.replace(/[^\w.\-\u4e00-\u9fa5]/g, "_");
  const path = `/repos/${GH.owner}/${GH.repo}/contents/${GH.fileDir}/${safeName}`;
  const base64 = await fileToBase64(file);
  await ghPutFile(path, `上传试卷文件:${safeName}`, base64);
  return GH.pagesBase + GH.fileDir + "/" + encodeURIComponent(safeName);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

// ==================== 试卷:保存 ====================
let editingPaperId = null;

async function savePaper() {
  const title = document.getElementById("p-title").value.trim();
  const province = document.getElementById("p-province").value;
  const year = document.getElementById("p-year").value.trim();
  const paperType = document.getElementById("p-type").value;
  if (!title || !province || !year) {
    showStatus("请填写标题、省份、年份", "err");
    return;
  }
  if (!getToken()) {
    showStatus("请先填写并保存 GitHub Token", "err");
    return;
  }

  let url = document.getElementById("p-url").value.trim();

  try {
    showStatus("正在保存...", "");
    // 有新文件则先上传
    const fileInput = document.getElementById("p-file");
    if (fileInput.files.length > 0) {
      if (fileInput.files[0].size > 25 * 1024 * 1024) {
        showStatus("文件超过 25MB,建议上传到云盘后把分享链接填到\"在线链接\"", "err");
        return;
      }
      url = await uploadPaperFile(fileInput.files[0]);
    }

    const now = new Date();
    const dateStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");

    const paper = {
      id: editingPaperId || ("paper-" + String(Date.now()).slice(-8)),
      title, province, year, paperType, url,
      hasAnswer: document.getElementById("p-hasanswer").value === "true",
      hasAnalysis: document.getElementById("p-hasanalysis").value === "true",
      dateAdded: dateStr
    };

    const idx = RESOURCES.papers.findIndex(p => p.id === paper.id);
    if (idx >= 0) RESOURCES.papers[idx] = paper;
    else RESOURCES.papers.push(paper);

    await publishData(`${editingPaperId ? "更新" : "添加"}试卷:${title}`);
    resetPaperForm();
    refreshPaperSelect();
    renderManageList();
    showStatus("✅ 试卷已发布,前台 1 分钟内生效", "ok");
  } catch (e) {
    showStatus("保存失败:" + e.message, "err");
  }
}

function resetPaperForm() {
  editingPaperId = null;
  document.getElementById("paper-form-title").textContent = "📄 添加试卷";
  ["p-title", "p-year", "p-url"].forEach(id => document.getElementById(id).value = "");
  document.getElementById("p-year").value = String(new Date().getFullYear());
  document.getElementById("p-file").value = "";
  document.getElementById("p-file-info").textContent = "支持 .pdf / .doc / .docx,拖拽到此处也可上传";
}

// ==================== 题目:保存 ====================
let editingQuestionId = null;

async function saveQuestion() {
  const paperId = document.getElementById("q-paperid").value;
  const number = document.getElementById("q-number").value.trim();
  const topic = document.getElementById("q-topic").value;
  const desc = document.getElementById("q-desc").value.trim();
  const keywords = document.getElementById("q-keywords").value.trim();
  if (!paperId || !number || !topic || !desc) {
    showStatus("请填写所属试卷、题号、专题、内容简述", "err");
    return;
  }
  if (!getToken()) {
    showStatus("请先填写并保存 GitHub Token", "err");
    return;
  }

  try {
    showStatus("正在保存...", "");
    const now = new Date();
    const dateStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");

    const q = { id: editingQuestionId || ("q-" + String(Date.now()).slice(-8)), paperId, number, topic, desc, keywords, dateAdded: dateStr };
    const idx = RESOURCES.questions.findIndex(x => x.id === q.id);
    if (idx >= 0) RESOURCES.questions[idx] = q;
    else RESOURCES.questions.push(q);

    await publishData(`${editingQuestionId ? "更新" : "添加"}题目:${topic} 第${number}题`);
    resetQuestionForm();
    renderManageList();
    showStatus("✅ 题目已发布,前台 1 分钟内生效", "ok");
  } catch (e) {
    showStatus("保存失败:" + e.message, "err");
  }
}

function resetQuestionForm() {
  editingQuestionId = null;
  document.getElementById("question-form-title").textContent = "🔖 添加题目(用于按专题检索)";
  ["q-number", "q-desc", "q-keywords"].forEach(id => document.getElementById(id).value = "");
}

// ==================== 列表管理 ====================
function refreshPaperSelect() {
  const sel = document.getElementById("q-paperid");
  const cur = sel.value;
  sel.innerHTML = "";
  (RESOURCES.papers || []).forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.province} ${p.year} · ${p.title.slice(0, 24)}${p.title.length > 24 ? "…" : ""}`;
    sel.appendChild(opt);
  });
  if (cur) sel.value = cur;
}

function renderManageList() {
  const type = document.getElementById("manage-type").value;
  const list = document.getElementById("manage-list");
  document.getElementById("paper-count").textContent = (RESOURCES.papers || []).length;
  document.getElementById("question-count").textContent = (RESOURCES.questions || []).length;

  if (type === "papers") {
    if ((RESOURCES.papers || []).length === 0) {
      list.innerHTML = '<div class="empty-state">暂无试卷,用上方表单添加</div>';
      return;
    }
    list.innerHTML = RESOURCES.papers.map(p => `
      <div class="manage-item">
        <div style="flex:1;min-width:0;">
          <div class="mi-title">${escapeHtml(p.title)}</div>
          <div class="mi-info">${escapeHtml(p.province)} · ${escapeHtml(p.year)} · ${escapeHtml(p.paperType)} · ${p.url ? "已上传文件" : "未上传文件"}</div>
        </div>
        <button class="mi-btn edit" onclick="editPaper('${p.id}')">编辑</button>
        <button class="mi-btn del" onclick="deletePaper('${p.id}')">删除</button>
      </div>
    `).join("");
  } else {
    if ((RESOURCES.questions || []).length === 0) {
      list.innerHTML = '<div class="empty-state">暂无题目,用上方表单添加</div>';
      return;
    }
    list.innerHTML = RESOURCES.questions.map(q => {
      const paper = (RESOURCES.papers || []).find(p => p.id === q.paperId);
      const paperName = paper ? paper.province + paper.year : "未知试卷";
      return `
      <div class="manage-item">
        <div style="flex:1;min-width:0;">
          <div class="mi-title">第 ${escapeHtml(q.number)} 题 · ${escapeHtml(q.topic)}</div>
          <div class="mi-info">${escapeHtml(paperName)} · ${escapeHtml(q.desc.slice(0, 30))}${q.desc.length > 30 ? "…" : ""}</div>
        </div>
        <button class="mi-btn edit" onclick="editQuestion('${q.id}')">编辑</button>
        <button class="mi-btn del" onclick="deleteQuestion('${q.id}')">删除</button>
      </div>
    `;}).join("");
  }
}

function editPaper(id) {
  const p = RESOURCES.papers.find(x => x.id === id);
  if (!p) return;
  editingPaperId = id;
  document.getElementById("paper-form-title").textContent = "📄 编辑试卷";
  document.getElementById("p-title").value = p.title;
  document.getElementById("p-province").value = p.province;
  document.getElementById("p-year").value = p.year;
  document.getElementById("p-type").value = p.paperType;
  document.getElementById("p-hasanswer").value = String(!!p.hasAnswer);
  document.getElementById("p-hasanalysis").value = String(!!p.hasAnalysis);
  document.getElementById("p-url").value = p.url || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function editQuestion(id) {
  const q = RESOURCES.questions.find(x => x.id === id);
  if (!q) return;
  editingQuestionId = id;
  document.getElementById("question-form-title").textContent = "🔖 编辑题目";
  document.getElementById("q-paperid").value = q.paperId;
  document.getElementById("q-number").value = q.number;
  document.getElementById("q-topic").value = q.topic;
  document.getElementById("q-desc").value = q.desc;
  document.getElementById("q-keywords").value = q.keywords || "";
  document.getElementById("question-form").scrollIntoView({ behavior: "smooth" });
}

async function deletePaper(id) {
  const p = RESOURCES.papers.find(x => x.id === id);
  if (!p) return;
  // 该试卷下有题目时提醒
  const linked = RESOURCES.questions.filter(q => q.paperId === id).length;
  const msg = linked > 0
    ? `确定删除「${p.title}」?该试卷下还有 ${linked} 道题目会一并删除!`
    : `确定删除「${p.title}」?`;
  if (!confirm(msg)) return;
  if (!getToken()) { showStatus("请先填写并保存 GitHub Token", "err"); return; }

  try {
    showStatus("正在删除...", "");
    RESOURCES.papers = RESOURCES.papers.filter(x => x.id !== id);
    RESOURCES.questions = RESOURCES.questions.filter(q => q.paperId !== id);
    await publishData(`删除试卷:${p.title}`);
    refreshPaperSelect();
    renderManageList();
    showStatus("✅ 已删除并发布", "ok");
  } catch (e) {
    showStatus("删除失败:" + e.message, "err");
  }
}

async function deleteQuestion(id) {
  const q = RESOURCES.questions.find(x => x.id === id);
  if (!q) return;
  if (!confirm(`确定删除「第 ${q.number} 题(${q.topic})」?`)) return;
  if (!getToken()) { showStatus("请先填写并保存 GitHub Token", "err"); return; }

  try {
    showStatus("正在删除...", "");
    RESOURCES.questions = RESOURCES.questions.filter(x => x.id !== id);
    await publishData(`删除题目:${q.topic} 第${q.number}题`);
    renderManageList();
    showStatus("✅ 已删除并发布", "ok");
  } catch (e) {
    showStatus("删除失败:" + e.message, "err");
  }
}

// ==================== 工具 ====================
function showStatus(msg, type) {
  const el = document.getElementById("save-status");
  el.textContent = msg;
  el.className = "save-status " + (type || "");
  el.style.display = "block";
  clearTimeout(el._timer);
  if (type) el._timer = setTimeout(() => { el.style.display = "none"; }, 4000);
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
