// ============================================================
// 高三地理试题库 - 管理后台逻辑
// 功能：GitHub Token（会话级）/ 试卷增删改 / 题目增删改 / data.js 发布
// ============================================================

const GH = CONFIG.github;
const TOKEN_KEY = "geo_admin_token";
const DEEPSEEK_KEY = "geo_deepseek_key";
let DATA = QUESTION_BANK;
let editingPaperId = null;
let smartResult = null;

document.addEventListener("DOMContentLoaded", initAdmin);

function initAdmin() {
  const saved = sessionStorage.getItem(TOKEN_KEY);
  if (saved) {
    document.getElementById("github-token").value = saved;
    document.getElementById("token-status").textContent = "已保存（当前会话）";
  }

  const dsSaved = sessionStorage.getItem(DEEPSEEK_KEY);
  if (dsSaved) {
    document.getElementById("deepseek-key").value = dsSaved;
    document.getElementById("deepseek-status").textContent = "已保存（当前会话）";
  }

  fillAdminProvince();
  fillSmartProvince();
  document.getElementById("p-year").value = String(new Date().getFullYear());
  document.getElementById("smart-year").value = String(new Date().getFullYear());
  renderManageList();
  bindUpload();
  bindSmartUpload();
  bindExit();

  if (saved) pullLatestData();
}

function bindExit() {
  document.getElementById("admin-lock").addEventListener("click", () => {
    sessionStorage.removeItem(TOKEN_KEY);
    location.reload();
  });
}

function fillAdminProvince() {
  const sel = document.getElementById("p-province");
  (DATA.provinces || []).forEach((p) => {
    const opt = document.createElement("option");
    opt.textContent = p;
    sel.appendChild(opt);
  });
}

// ==================== Token ====================
function saveToken() {
  const v = document.getElementById("github-token").value.trim();
  if (!v) {
    sessionStorage.removeItem(TOKEN_KEY);
    document.getElementById("token-status").textContent = "已清除";
    return;
  }
  sessionStorage.setItem(TOKEN_KEY, v);
  document.getElementById("token-status").textContent = "已保存（当前会话）";
  showStatus("Token 已保存，正在同步线上最新数据", "ok");
  pullLatestData();
}

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || "";
}

// ==================== GitHub API ====================
async function ghGet(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: "token " + getToken(), Accept: "application/vnd.github+json" }
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
      Authorization: "token " + getToken(),
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

async function pullLatestData() {
  if (!getToken()) return;
  try {
    const meta = await ghGet(`/repos/${GH.owner}/${GH.repo}/contents/${GH.dataFile}?ref=${GH.branch}&t=${Date.now()}`);
    const text = decodeURIComponent(escape(atob(meta.content.replace(/\n/g, ""))));
    if (text.includes("QUESTION_BANK")) {
      const latest = new Function(text + "\n; return QUESTION_BANK;")();
      if (latest && latest.questions) DATA = latest;
      renderManageList();
      document.getElementById("p-province").innerHTML = "";
      fillAdminProvince();
    }
  } catch (e) {
    console.warn("拉取线上数据失败，使用本地数据：", e.message);
  }
}

async function publishData(message) {
  const header = [
    "// ============================================================",
    "// 高三地理试题库 - 数据文件（由管理后台自动生成）",
    "// ============================================================",
    "// 数据结构见 data.js 顶部注释；题目配图用 figures 数组，可挂多张图。",
    "// ============================================================",
    ""
  ].join("\n");
  const content = header + "const QUESTION_BANK = " + JSON.stringify(DATA, null, 2) + ";\n";
  const path = `/repos/${GH.owner}/${GH.repo}/contents/${GH.dataFile}`;
  let sha = null;
  try {
    const meta = await ghGet(`${path}?ref=${GH.branch}`);
    sha = meta.sha;
  } catch (e) { /* 新建文件 */ }
  await ghPutFile(path, message, base64Utf8(content), sha);
}

function base64Utf8(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

// ==================== 试卷 ====================
async function savePaper() {
  const title = document.getElementById("p-title").value.trim();
  const province = document.getElementById("p-province").value;
  const year = document.getElementById("p-year").value.trim();
  const type = document.getElementById("p-type").value;
  if (!title || !province || !year) return showStatus("请填写标题、省份、年份", "err");
  if (!getToken()) return showStatus("请先填写并保存 GitHub Token", "err");

  try {
    showStatus("正在保存...", "");
    let url = document.getElementById("p-url").value.trim();
    const fileInput = document.getElementById("p-file");
    if (fileInput.files.length > 0) {
      if (fileInput.files[0].size > 25 * 1024 * 1024) return showStatus("文件超过 25MB", "err");
      url = await uploadFile(fileInput.files[0], GH.fileDir);
    }

    const paper = {
      id: editingPaperId || "p-" + String(Date.now()).slice(-8),
      title, province, year, type, url,
      hasAnswer: document.getElementById("p-hasanswer").value === "true",
      hasAnalysis: document.getElementById("p-hasanalysis").value === "true",
      dateAdded: today()
    };
    const idx = DATA.papers.findIndex((p) => p.id === paper.id);
    if (idx >= 0) DATA.papers[idx] = paper;
    else DATA.papers.push(paper);

    await publishData(`${editingPaperId ? "更新" : "添加"}试卷：${title}`);
    resetPaperForm();
    renderManageList();
    showStatus("✅ 试卷已发布，前台稍后生效", "ok");
  } catch (e) {
    showStatus("保存失败：" + e.message, "err");
  }
}

function resetPaperForm() {
  editingPaperId = null;
  document.getElementById("paper-form-title").textContent = "📄 添加试卷";
  ["p-title", "p-year", "p-url"].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("p-year").value = String(new Date().getFullYear());
  document.getElementById("p-file").value = "";
  document.getElementById("p-file-info").textContent = "支持 .pdf / .doc / .docx，拖拽到此处也可上传";
}

function editPaper(id) {
  const p = DATA.papers.find((x) => x.id === id);
  if (!p) return;
  editingPaperId = id;
  document.getElementById("paper-form-title").textContent = "📄 编辑试卷";
  document.getElementById("p-title").value = p.title;
  document.getElementById("p-province").value = p.province;
  document.getElementById("p-year").value = p.year;
  document.getElementById("p-type").value = p.type;
  document.getElementById("p-hasanswer").value = String(!!p.hasAnswer);
  document.getElementById("p-hasanalysis").value = String(!!p.hasAnalysis);
  document.getElementById("p-url").value = p.url || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deletePaper(id) {
  const p = DATA.papers.find((x) => x.id === id);
  if (!p) return;
  const linked = DATA.questions.filter((q) => q.paperId === id).length;
  const msg = linked > 0 ? `确定删除「${p.title}」？其下 ${linked} 道题目会一并删除！` : `确定删除「${p.title}」？`;
  if (!confirm(msg)) return;
  if (!getToken()) return showStatus("请先填写并保存 GitHub Token", "err");
  try {
    DATA.papers = DATA.papers.filter((x) => x.id !== id);
    DATA.questions = DATA.questions.filter((q) => q.paperId !== id);
    await publishData(`删除试卷：${p.title}`);
    renderManageList();
    showStatus("✅ 已删除并发布", "ok");
  } catch (e) {
    showStatus("删除失败：" + e.message, "err");
  }
}

// ==================== 题目删除 ====================
async function deleteQuestion(id) {
  const q = DATA.questions.find((x) => x.id === id);
  if (!q) return;
  if (!confirm(`确定删除「第 ${q.number} 题（${q.topic}）」？`)) return;
  if (!getToken()) return showStatus("请先填写并保存 GitHub Token", "err");
  try {
    DATA.questions = DATA.questions.filter((x) => x.id !== id);
    await publishData(`删除题目：${q.topic} 第${q.number}题`);
    renderManageList();
    showStatus("✅ 已删除并发布", "ok");
  } catch (e) {
    showStatus("删除失败：" + e.message, "err");
  }
}

// ==================== 列表 ====================
function renderManageList() {
  const type = document.getElementById("manage-type").value;
  const list = document.getElementById("manage-list");
  document.getElementById("paper-count").textContent = (DATA.papers || []).length;
  document.getElementById("question-count").textContent = (DATA.questions || []).length;

  if (type === "papers") {
    if (!(DATA.papers || []).length) return (list.innerHTML = '<div class="empty-state">暂无试卷</div>');
    list.innerHTML = DATA.papers
      .map(
        (p) => `
      <div class="manage-item">
        <div style="flex:1;min-width:0;">
          <div class="mi-title">${esc(p.title)}</div>
          <div class="mi-info">${esc(p.province)} · ${esc(p.year)} · ${esc(p.type)} · ${p.url ? "已上传文件" : "未上传文件"}</div>
        </div>
        <button class="mi-btn edit" onclick="editPaper('${esc(p.id)}')">编辑</button>
        <button class="mi-btn del" onclick="deletePaper('${esc(p.id)}')">删除</button>
      </div>`
      )
      .join("");
  } else {
    if (!(DATA.questions || []).length) return (list.innerHTML = '<div class="empty-state">暂无题目</div>');
    list.innerHTML = DATA.questions
      .map((q) => {
        const paper = DATA.papers.find((p) => p.id === q.paperId);
        const paperName = paper ? paper.province + paper.year : "未知试卷";
        return `
      <div class="manage-item">
        <div style="flex:1;min-width:0;">
          <div class="mi-title">第 ${esc(q.number)} 题 · ${esc(q.topic)}</div>
          <div class="mi-info">${esc(paperName)} · ${esc((q.desc || "").slice(0, 30))}</div>
        </div>
        <button class="mi-btn del" onclick="deleteQuestion('${esc(q.id)}')">删除</button>
      </div>`;
      })
      .join("");
  }
}

// ==================== 上传 ====================
function bindUpload() {
  const fileInput = document.getElementById("p-file");
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      document.getElementById("p-file-info").textContent = "已选择：" + fileInput.files[0].name + "（" + formatSize(fileInput.files[0].size) + "）";
    }
  });
  const box = document.getElementById("paper-upload-box");
  box.addEventListener("dragover", (e) => { e.preventDefault(); box.classList.add("dragover"); });
  box.addEventListener("dragleave", () => box.classList.remove("dragover"));
  box.addEventListener("drop", (e) => {
    e.preventDefault();
    box.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      fileInput.dispatchEvent(new Event("change"));
    }
  });
}

async function uploadFile(file, dir) {
  showStatus(`正在上传 ${file.name}（${formatSize(file.size)}）...`, "");
  const safeName = file.name.replace(/[^\w.\-\u4e00-\u9fa5]/g, "_");
  const path = `/repos/${GH.owner}/${GH.repo}/contents/${dir}/${safeName}`;
  const base64 = await fileToBase64(file);
  await ghPutFile(path, `上传文件：${safeName}`, base64);
  return (CONFIG.pagesBase || "").replace(/\/?$/, "/") + dir + "/" + encodeURIComponent(safeName);
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

// ==================== 智能录入 ====================
function fillSmartProvince() {
  const sel = document.getElementById("smart-province");
  (DATA.provinces || []).forEach((p) => {
    const opt = document.createElement("option");
    opt.textContent = p;
    sel.appendChild(opt);
  });
}

function bindSmartUpload() {
  const fileInput = document.getElementById("smart-file");
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      document.getElementById("smart-file-info").textContent =
        "已选择：" + fileInput.files[0].name + "（" + formatSize(fileInput.files[0].size) + "）";
    }
  });
  const box = document.getElementById("smart-upload-box");
  box.addEventListener("dragover", (e) => { e.preventDefault(); box.classList.add("dragover"); });
  box.addEventListener("dragleave", () => box.classList.remove("dragover"));
  box.addEventListener("drop", (e) => {
    e.preventDefault();
    box.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      fileInput.dispatchEvent(new Event("change"));
    }
  });
}

function saveDeepSeekKey() {
  const v = document.getElementById("deepseek-key").value.trim();
  if (!v) {
    sessionStorage.removeItem(DEEPSEEK_KEY);
    document.getElementById("deepseek-status").textContent = "已清除";
    return;
  }
  sessionStorage.setItem(DEEPSEEK_KEY, v);
  document.getElementById("deepseek-status").textContent = "已保存（当前会话）";
  showStatus("DeepSeek Key 已保存", "ok");
}

function getDeepSeekKey() {
  return sessionStorage.getItem(DEEPSEEK_KEY) || "";
}

async function smartParse() {
  const status = document.getElementById("smart-status");
  document.getElementById("smart-preview").style.display = "none";
  smartResult = null;

  if (!getDeepSeekKey()) {
    status.textContent = "缺少 DeepSeek Key";
    showStatus("请先填写并保存 DeepSeek Key", "err");
    return;
  }

  const fileInput = document.getElementById("smart-file");
  const pasted = document.getElementById("smart-text").value.trim();
  let text = pasted;
  const file = fileInput.files.length > 0 ? fileInput.files[0] : null;

  try {
    status.textContent = "正在提取文字...";
    if (file) text = await extractText(file);
    if (!text || text.trim().length < 20) {
      status.textContent = "没有读到有效文字，请换文件或直接粘贴文字";
      return;
    }

    status.textContent = "正在调用 DeepSeek 自动拆题归类...";
    const raw = await callDeepSeek(text);
    const result = parseAiJson(raw);
    if (!result || !result.questions || !result.questions.length) {
      status.textContent = "解析结果为空，请检查试卷内容或稍后重试";
      return;
    }

    const paper = result.paper || {};
    const title = document.getElementById("smart-title").value.trim() || paper.title || "";
    const province = document.getElementById("smart-province").value || paper.province || "";
    const year = document.getElementById("smart-year").value.trim() || paper.year || "";
    const type = document.getElementById("smart-type").value || paper.type || "高考真题";

    smartResult = { file, paper: { ...paper, title, province, year, type }, questions: result.questions };
    renderSmartPreview(smartResult);
    status.textContent = "已解析出 " + result.questions.length + " 道题，请确认后发布";
  } catch (e) {
    status.textContent = "解析失败：" + e.message;
    showStatus("解析失败：" + e.message, "err");
  }
}

async function extractText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md")) return await file.text();
  if (name.endsWith(".pdf")) return await extractPdfText(file);
  if (name.endsWith(".docx")) return await extractDocxText(file);
  throw new Error("暂不支持该格式，请用 .txt / .md / .pdf / .docx");
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (window.__loadedScripts && window.__loadedScripts[src]) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => { (window.__loadedScripts = window.__loadedScripts || {})[src] = true; resolve(); };
    s.onerror = () => reject(new Error("加载解析库失败：" + src));
    document.head.appendChild(s);
  });
}

async function extractPdfText(file) {
  await loadScript("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js");
  const pdfjsLib = window.pdfjsLib;
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  const data = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    text += tc.items.map((it) => it.str).join(" ") + "\n";
  }
  return text;
}

async function extractDocxText(file) {
  await loadScript("https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js");
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function callDeepSeek(text) {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + getDeepSeekKey() },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.2,
      messages: [
        { role: "system", content: "你是高三地理试卷结构化整理助手。你只输出 JSON，不输出任何解释、Markdown 代码块或多余文字。" },
        { role: "user", content: buildAiPrompt(text) }
      ]
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error("DeepSeek " + res.status + ": " + err.slice(0, 160));
  }
  const data = await res.json();
  const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!content) throw new Error("DeepSeek 返回为空");
  return content;
}

function buildAiPrompt(text) {
  return [
    "请把下面这份高三地理试卷整理成 JSON（必须是合法 JSON，不要用 ``` 包裹，直接输出 JSON 对象）：",
    "",
    "JSON 结构：",
    "{",
    '  "paper": { "title": "试卷标题", "province": "江苏", "year": "2026", "type": "高考真题", "hasAnswer": true, "hasAnalysis": false },',
    '  "questions": [',
    "    {",
    '      "number": "1",',
    '      "topic": "专题名",',
    '      "knowledgePoint": "知识点",',
    '      "difficulty": "易|中|难",',
    '      "desc": "一句话简述",',
    '      "keywords": ["关键词1","关键词2"],',
    '      "questionGroup": "同组小题用相同值，如 qg-加达村；独立题用空字符串",',
    '      "sharedMaterial": "共享材料，同组只写一遍，独立题可空",',
    '      "content": "完整题干（含材料、问题、选项）",',
    '      "answer": "答案",',
    '      "analysis": "解析，没有则空字符串",',
    '      "hasFigure": true,',
    '      "figureHint": "配图说明，无图则空字符串"',
    "    }",
    "  ]",
    "}",
    "",
    "专题只能从下面选择：",
    "自然地理：经纬网和地图、地理信息技术、地球运动和天文、大气、水、地表形态的塑造、整体性和差异性、土壤、植被",
    "人文地理：人口、乡村和城镇、地域文化、产业、交通、环境与发展、国家安全",
    "区域：江苏地理、中国地理、世界地理",
    "",
    "规则：",
    "1. 共用同一段材料的小题必须归为同一题组：questionGroup 相同、topic 相同，sharedMaterial 只写一遍。",
    "2. 综合题整题录入不拆小题，number 用题号如 24，content 含全部材料和小问，answer 按 (1)(2)(3) 分条。",
    "3. 答案和解析尽量从试卷原文提取；试卷标注了答案就填进 answer。",
    "4. difficulty 只用 易/中/难。",
    "5. keywords 输出中文关键词数组。",
    "6. 只输出 JSON，不要任何多余文字。",
    "",
    "试卷内容如下：",
    text
  ].join("\n");
}

function parseAiJson(raw) {
  let s = String(raw).trim();
  s = s.replace(/^```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  try {
    return JSON.parse(s);
  } catch (e) {
    throw new Error("AI 返回的不是合法 JSON");
  }
}

function renderSmartPreview(result) {
  const el = document.getElementById("smart-preview");
  const paper = result.paper || {};
  const qs = result.questions || [];
  const qHtml = qs
    .map(
      (q, i) => `
    <div class="smart-q-item">
      <div class="sq-head">
        <span class="q-number">第 ${esc(q.number || i + 1)} 题</span>
        <span class="badge badge-topic">${esc(q.topic || "未分类")}</span>
        ${q.difficulty ? `<span class="badge badge-difficulty badge-difficulty-${esc(q.difficulty)}">${esc(q.difficulty)}</span>` : ""}
        ${q.hasFigure ? '<span class="badge badge-fig">🖼 含图</span>' : ""}
        <button class="btn-ghost" style="margin-left:auto;padding:4px 10px;" onclick="toggleSmartEdit(${i})">✏️ 编辑</button>
      </div>
      <div class="sq-desc">${esc(q.desc || "")}</div>
      ${q.answer ? `<div class="sq-ans">答案：${esc(q.answer)}</div>` : ""}
      <div id="smart-edit-${i}" class="smart-edit" style="display:none;margin-top:12px;">
        <div class="form-grid">
          <div class="form-field"><label>专题</label><select id="se-topic-${i}">${topicOptionsHtml(q.topic)}</select></div>
          <div class="form-field"><label>知识点</label><input id="se-knowledge-${i}" value="${esc(q.knowledgePoint || "")}"></div>
          <div class="form-field"><label>难度</label><select id="se-diff-${i}">${diffOptionsHtml(q.difficulty)}</select></div>
          <div class="form-field"><label>题组标识</label><input id="se-group-${i}" value="${esc(q.questionGroup || "")}"></div>
          <div class="form-field full"><label>题目简述</label><textarea id="se-desc-${i}">${esc(q.desc || "")}</textarea></div>
          <div class="form-field full"><label>完整题干</label><textarea id="se-content-${i}">${esc(q.content || "")}</textarea></div>
          <div class="form-field full"><label>答案</label><textarea id="se-answer-${i}">${esc(q.answer || "")}</textarea></div>
          <div class="form-field full"><label>解析</label><textarea id="se-analysis-${i}">${esc(q.analysis || "")}</textarea></div>
          <div class="form-field"><label>含图</label><select id="se-fig-${i}"><option value="false" ${!q.hasFigure ? "selected" : ""}>无图</option><option value="true" ${q.hasFigure ? "selected" : ""}>含图</option></select></div>
          <div class="form-field full form-actions">
            <button class="btn-primary" onclick="saveSmartEdit(${i})">💾 保存此题</button>
            <button class="btn-ghost" onclick="toggleSmartEdit(${i})">取消</button>
          </div>
        </div>
      </div>
    </div>`
    )
    .join("");

  el.innerHTML = `
    <div class="smart-paper-head">
      <b>${esc(paper.title || "未命名试卷")}</b>
      <span style="color:var(--text-sub);"> · ${esc(paper.province || "")} · ${esc(paper.year || "")} · ${esc(paper.type || "")} · 共 ${qs.length} 题</span>
    </div>
    ${qHtml}
    <div class="form-actions">
      <button class="btn-primary" onclick="smartPublish()">✅ 确认并发布</button>
      <button class="btn-ghost" onclick="smartResetPreview()">↺ 重新解析</button>
    </div>`;
  el.style.display = "block";
}

function topicOptionsHtml(selected) {
  let html = "";
  (DATA.topicGroups || []).forEach((g) => {
    html += `<optgroup label="${esc(g.group)}">`;
    g.topics.forEach((t) => {
      html += `<option value="${esc(t)}" ${t === selected ? "selected" : ""}>${esc(t)}</option>`;
    });
    html += "</optgroup>";
  });
  return html;
}

function diffOptionsHtml(selected) {
  return ["易", "中", "难"]
    .map((d) => `<option value="${d}" ${d === selected ? "selected" : ""}>${d}</option>`)
    .join("");
}

function toggleSmartEdit(i) {
  const el = document.getElementById("smart-edit-" + i);
  if (el) el.style.display = el.style.display === "none" ? "block" : "none";
}

function saveSmartEdit(i) {
  const q = smartResult.questions[i];
  q.topic = document.getElementById("se-topic-" + i).value;
  q.knowledgePoint = document.getElementById("se-knowledge-" + i).value.trim();
  q.difficulty = document.getElementById("se-diff-" + i).value;
  q.questionGroup = document.getElementById("se-group-" + i).value.trim();
  q.desc = document.getElementById("se-desc-" + i).value.trim();
  q.content = document.getElementById("se-content-" + i).value.trim();
  q.answer = document.getElementById("se-answer-" + i).value.trim();
  q.analysis = document.getElementById("se-analysis-" + i).value.trim();
  q.hasFigure = document.getElementById("se-fig-" + i).value === "true";
  renderSmartPreview(smartResult);
  showStatus("已保存第 " + q.number + " 题的修改", "ok");
}

function smartResetPreview() {
  smartResult = null;
  document.getElementById("smart-preview").style.display = "none";
  document.getElementById("smart-status").textContent = "";
}

async function smartPublish() {
  if (!smartResult) return;
  if (!getToken()) {
    showStatus("请先填写并保存 GitHub Token", "err");
    return;
  }
  const status = document.getElementById("smart-status");
  try {
    status.textContent = "正在发布...";
    let url = "";
    const file = smartResult.file;
    if (file) {
      const n = file.name.toLowerCase();
      if (n.endsWith(".pdf") || n.endsWith(".docx")) {
        url = await uploadFile(file, GH.fileDir);
      }
    }

    const paper = smartResult.paper || {};
    const paperId = "p-" + String(Date.now()).slice(-8);
    const paperObj = {
      id: paperId,
      title: paper.title || "未命名试卷",
      province: paper.province || "",
      year: paper.year || String(new Date().getFullYear()),
      type: paper.type || "高考真题",
      url,
      hasAnswer: !!paper.hasAnswer,
      hasAnalysis: !!paper.hasAnalysis,
      dateAdded: today()
    };
    DATA.papers.push(paperObj);

    const qs = (smartResult.questions || []).map((q, i) => ({
      id: "q-" + String(Date.now()).slice(-8) + "-" + i,
      paperId,
      number: String(q.number || i + 1),
      topic: q.topic || "",
      knowledgePoint: q.knowledgePoint || "",
      difficulty: ["易", "中", "难"].includes(q.difficulty) ? q.difficulty : "中",
      desc: q.desc || "",
      keywords: Array.isArray(q.keywords) ? q.keywords : [],
      questionGroup: q.questionGroup || "",
      sharedMaterial: q.sharedMaterial || "",
      figures: [],
      hasFigure: !!q.hasFigure,
      content: q.content || "",
      answer: q.answer || "",
      analysis: q.analysis || "",
      figureHint: q.figureHint || "",
      dateAdded: today()
    }));
    DATA.questions.push(...qs);

    await publishData("智能录入：" + paperObj.title);
    smartResetPreview();
    renderManageList();
    status.textContent = "";
    showStatus("✅ 已发布：" + qs.length + " 道题", "ok");
  } catch (e) {
    status.textContent = "";
    showStatus("发布失败：" + e.message, "err");
  }
}

// ==================== 工具 ====================
function today() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function showStatus(msg, type) {
  const el = document.getElementById("save-status");
  el.textContent = msg;
  el.className = "save-status " + (type || "");
  el.style.display = "block";
  clearTimeout(el._timer);
  if (type) el._timer = setTimeout(() => (el.style.display = "none"), 4000);
}

function esc(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
