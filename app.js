// ============================================================
// 高三地理试题库 - 主站逻辑
// 功能:密码门 / 双维检索(按试卷 / 按专题) / 全文检索 / 水印
// ============================================================

// ==================== 密码门 ====================
(async function initGate() {
  const gate = document.getElementById("gate-screen");
  const mainApp = document.getElementById("main-app");
  const input = document.getElementById("gate-password");
  const submit = document.getElementById("gate-submit");
  const error = document.getElementById("gate-error");

  // 会话级登录态(关闭标签页即失效,安全性更好)
  if (sessionStorage.getItem("geo_authed") === "1") {
    gate.style.display = "none";
    mainApp.style.display = "block";
    init();
    return;
  }

  async function tryEnter() {
    const hash = await sha256(input.value.trim());
    if (hash === CONFIG.studentPasswordHash || hash === CONFIG.adminPasswordHash) {
      sessionStorage.setItem("geo_authed", "1");
      gate.style.display = "none";
      mainApp.style.display = "block";
      init();
    } else {
      error.style.display = "block";
      input.value = "";
      input.focus();
    }
  }

  submit.addEventListener("click", tryEnter);
  input.addEventListener("keydown", e => { if (e.key === "Enter") tryEnter(); });
})();

// 锁定按钮
document.getElementById("lock-btn").addEventListener("click", () => {
  sessionStorage.removeItem("geo_authed");
  location.reload();
});

// ==================== 标签页切换 ====================
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
  });
});

// ==================== 初始化 ====================
function init() {
  // 填充省份下拉
  const provSel = document.getElementById("paper-filter-province");
  (RESOURCES.provinces || []).forEach(p => {
    const opt = document.createElement("option");
    opt.textContent = p;
    provSel.appendChild(opt);
  });

  // 填充年份下拉(从试卷数据里取,倒序)
  const yearSel = document.getElementById("paper-filter-year");
  const years = [...new Set((RESOURCES.papers || []).map(p => p.year))].sort((a, b) => b - a);
  years.forEach(y => {
    const opt = document.createElement("option");
    opt.textContent = y;
    yearSel.appendChild(opt);
  });

  // 统计
  document.getElementById("stat-papers").textContent = (RESOURCES.papers || []).length;
  document.getElementById("stat-questions").textContent = (RESOURCES.questions || []).length;

  renderPapers();
  renderTopicGroups();
}

// ==================== 渲染:按试卷检索 ====================
function renderPapers() {
  const keyword = document.getElementById("paper-search").value.trim().toLowerCase();
  const province = document.getElementById("paper-filter-province").value;
  const year = document.getElementById("paper-filter-year").value;
  const paperType = document.getElementById("paper-filter-type").value;

  const list = (RESOURCES.papers || []).filter(p => {
    if (province && p.province !== province) return false;
    if (year && p.year !== year) return false;
    if (paperType && p.paperType !== paperType) return false;
    if (keyword) {
      const text = [p.title, p.province, p.year, p.paperType].join(" ").toLowerCase();
      if (!text.includes(keyword)) return false;
    }
    return true;
  });

  const container = document.getElementById("paper-list");
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">📭 暂无符合条件的试卷</div>';
    return;
  }

  container.innerHTML = list.map(p => `
    <div class="exam-card">
      <div class="exam-main">
        <div class="exam-title">${escapeHtml(p.title)}</div>
        <div class="exam-meta">
          <span class="badge badge-province">${escapeHtml(p.province)}</span>
          <span class="badge badge-year">${escapeHtml(p.year)}</span>
          <span class="badge badge-type">${escapeHtml(p.paperType)}</span>
          ${p.hasAnswer ? '<span class="flag flag-answer">✓ 含答案</span>' : ""}
          ${p.hasAnalysis ? '<span class="flag flag-analysis">✓ 含解析</span>' : ""}
        </div>
      </div>
      <div class="exam-actions">
        <button class="btn-primary" onclick="openExamViewer('${p.id}')">查看试卷</button>
      </div>
    </div>
  `).join("");
}

// ==================== 渲染:按专题检索(总览) ====================
function renderTopicGroups() {
  const keyword = document.getElementById("topic-search").value.trim().toLowerCase();

  // 全文检索模式:有关键词时,先筛出命中的题目
  let matchedQuestions = null;
  if (keyword) {
    matchedQuestions = (RESOURCES.questions || []).filter(q => {
      const paper = getPaper(q.paperId);
      const text = [q.topic, q.desc, q.keywords, q.number, paper ? paper.title : "", paper ? paper.province + paper.year : ""]
        .join(" ").toLowerCase();
      return text.includes(keyword);
    });
  }

  const container = document.getElementById("topic-groups");
  let html = "";

  TOPIC_GROUPS.forEach(g => {
    const chips = g.topics.map(t => {
      const count = (RESOURCES.questions || []).filter(q => q.topic === t).length;
      return `<button class="topic-chip ${count === 0 ? "empty" : ""}" onclick="enterTopic('${escapeAttr(t)}')">${escapeHtml(t)}<span class="chip-count">${count}</span></button>`;
    }).join("");

    // 全文检索模式:给每组标注命中数
    let groupBadge = "";
    if (matchedQuestions) {
      const hit = matchedQuestions.filter(q => g.topics.includes(q.topic)).length;
      groupBadge = hit > 0 ? `<span class="group-hit">命中 ${hit} 题</span>` : '<span class="group-hit zero">0</span>';
    }

    html += `
      <div class="topic-group">
        <div class="topic-group-header">
          <h3>${escapeHtml(g.group)}</h3>${groupBadge}
        </div>
        <div class="topic-chips">${chips}</div>
      </div>
    `;
  });

  // 全文检索模式:直接展示命中题目列表
  if (matchedQuestions) {
    if (matchedQuestions.length === 0) {
      html += '<div class="empty-state">📭 没有找到与 "' + escapeHtml(keyword) + '" 相关的题目,换个关键词试试(如:锋面、阶地、城市化)</div>';
    } else {
      html += `<div class="search-result-bar">🔍 关键词 "${escapeHtml(keyword)}" 共命中 <b>${matchedQuestions.length}</b> 道题:</div>`;
      html += renderQuestionCards(matchedQuestions);
    }
  }

  container.innerHTML = html;
}

// ==================== 渲染:题目卡片(专题模式 / 检索模式共用) ====================
function renderQuestionCards(questions) {
  return questions.map(q => {
    const paper = getPaper(q.paperId);
    const paperTitle = paper ? paper.title : "未知试卷";
    const paperLabel = paper ? `${paper.province} · ${paper.year} · ${paper.paperType}` : "";
    return `
    <div class="question-card">
      <div class="q-left">
        <div class="q-number">第 ${escapeHtml(q.number)} 题</div>
      </div>
      <div class="q-main">
        <div class="q-desc">${escapeHtml(q.desc)}</div>
        <div class="q-source">
          <span class="badge badge-topic">${escapeHtml(q.topic)}</span>
          <span class="q-paper">${escapeHtml(paperTitle)}</span>
          <span class="q-paper-label">${escapeHtml(paperLabel)}</span>
        </div>
      </div>
      <div class="q-actions">
        ${paper && paper.url ? `<button class="btn-primary btn-sm" onclick="openExamViewer('${paper.id}')">查看试卷</button>` : ""}
      </div>
    </div>
  `}).join("");
}

// ==================== 进入某个专题(题目列表模式) ====================
function enterTopic(topic) {
  const questions = (RESOURCES.questions || []).filter(q => q.topic === topic);
  if (questions.length === 0) {
    showToast("该专题暂无题目,请先在管理后台添加");
    return;
  }

  document.getElementById("topic-overview").style.display = "none";
  document.getElementById("topic-detail").style.display = "block";
  document.getElementById("topic-current").textContent = "🔖 " + topic + "(" + questions.length + " 题)";

  const list = document.getElementById("question-list");
  list.innerHTML = questions.length > 0 ? renderQuestionCards(questions)
    : '<div class="empty-state">📭 该专题暂无题目</div>';

  // 滚到顶部
  window.scrollTo({ top: 0 });
}

// 返回专题列表
document.getElementById("topic-back").addEventListener("click", () => {
  document.getElementById("topic-overview").style.display = "block";
  document.getElementById("topic-detail").style.display = "none";
});

// ==================== 试卷查看器(带水印) ====================
function openExamViewer(paperId) {
  const paper = (RESOURCES.papers || []).find(p => p.id === paperId);
  if (!paper) return;

  const viewer = document.getElementById("exam-viewer");
  const title = document.getElementById("viewer-title");
  const newtab = document.getElementById("viewer-newtab");
  const content = document.getElementById("viewer-content");

  title.textContent = paper.title;

  // 生成水印:教研组名 + 日期
  const now = new Date();
  const dateStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  const wm = document.getElementById("viewer-watermark");
  if (CONFIG.features.watermark) {
    wm.style.display = "block";
    wm.setAttribute("data-text", CONFIG.watermarkText + " " + dateStr);
  } else {
    wm.style.display = "none";
  }

  // 根据文件类型渲染
  const url = paper.url || "";
  newtab.style.display = "none";
  if (!url) {
    content.innerHTML = `
      <div class="viewer-placeholder">
        <div class="vp-icon">📄</div>
        <p><b>${escapeHtml(paper.title)}</b></p>
        <p>该试卷文件尚未上传</p>
        <p class="vp-hint">管理员可在管理后台上传 PDF / Word 文件或填写在线链接</p>
      </div>`;
  } else if (/\.(docx?|wps)$/i.test(url)) {
    // Word 文档:浏览器无法直接预览,提供下载 + 在线预览两条路
    const officeViewer = "https://view.officeapps.live.com/op/embed.aspx?src=" + encodeURIComponent(url);
    content.innerHTML = `
      <div class="viewer-placeholder">
        <div class="vp-icon">📝</div>
        <p><b>Word 文档</b></p>
        <p>Word 文件无法在页面内直接显示,请选择:</p>
        <div class="vp-btns">
          <a class="btn-primary" style="text-decoration:none;display:inline-block;" href="${escapeAttr(url)}" download>⬇ 下载 Word 文件</a>
          <a class="btn-primary" style="text-decoration:none;display:inline-block;" href="${escapeAttr(officeViewer)}" target="_blank" rel="noopener noreferrer">👁 在线预览(微软)</a>
        </div>
        <p class="vp-hint">在线预览由微软 Office Online 提供,需文件地址可公开访问</p>
      </div>`;
    newtab.href = url;
    newtab.style.display = "inline";
  } else {
    // PDF 或网页:iframe 内嵌
    content.innerHTML = `<iframe src="${escapeAttr(url)}" style="width:100%;height:100%;border:none;" loading="lazy"></iframe>`;
    newtab.href = url;
    newtab.style.display = "inline";
  }

  viewer.style.display = "flex";
  document.body.style.overflow = "hidden";
}

document.getElementById("viewer-close").addEventListener("click", () => {
  document.getElementById("exam-viewer").style.display = "none";
  document.getElementById("viewer-content").innerHTML = "";
  document.body.style.overflow = "";
});

// Esc 关闭查看器
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    const viewer = document.getElementById("exam-viewer");
    if (viewer.style.display !== "none" && viewer.style.display !== "") {
      document.getElementById("viewer-close").click();
    }
  }
});

// ==================== 搜索/筛选事件绑定 ====================
["paper-search"].forEach(id => {
  document.getElementById(id).addEventListener("input", renderPapers);
});
["paper-filter-province", "paper-filter-year", "paper-filter-type"].forEach(id => {
  document.getElementById(id).addEventListener("change", renderPapers);
});
document.getElementById("topic-search").addEventListener("input", renderTopicGroups);

// ==================== 工具函数 ====================
function getPaper(id) {
  return (RESOURCES.papers || []).find(p => p.id === id);
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeAttr(str) {
  return escapeHtml(str);
}

function showToast(msg) {
  let t = document.getElementById("__toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "__toast";
    t.style.cssText = "position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 22px;border-radius:8px;font-size:13px;z-index:400;box-shadow:0 8px 24px rgba(0,0,0,.3);";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = "none"; }, 2200);
}
