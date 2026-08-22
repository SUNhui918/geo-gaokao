// ============================================================
// 高三地理教学资源库 - 主站逻辑
// 功能:密码门 / 标签页切换 / 双层检索 / 背诵默写切换 / 水印
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
    return;
  }

  async function tryEnter() {
    const hash = await sha256(input.value.trim());
    if (hash === CONFIG.studentPasswordHash) {
      sessionStorage.setItem("geo_authed", "1");
      gate.style.display = "none";
      mainApp.style.display = "block";
      renderAll();
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

// ==================== 渲染:试题库 ====================
function renderExams() {
  const keyword = document.getElementById("exam-search").value.trim().toLowerCase();
  const year = document.getElementById("exam-filter-year").value;
  const examType = document.getElementById("exam-filter-type").value;
  const topic = document.getElementById("exam-filter-topic").value;

  const list = (RESOURCES.exams || []).filter(e => {
    if (year && e.year !== year) return false;
    if (examType && e.examType !== examType) return false;
    if (topic && !(e.topic === topic || (e.tags || []).includes(topic))) return false;
    if (keyword) {
      const text = [e.title, e.topic, e.examType, ...(e.tags || [])].join(" ").toLowerCase();
      if (!text.includes(keyword)) return false;
    }
    return true;
  });

  const container = document.getElementById("exam-list");
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">📭 暂无符合条件的试题</div>';
    return;
  }

  container.innerHTML = list.map(e => `
    <div class="exam-card" data-id="${e.id}">
      <div class="exam-main">
        <div class="exam-title">${escapeHtml(e.title)}</div>
        <div class="exam-meta">
          <span class="badge badge-year">${escapeHtml(e.year)}</span>
          <span class="badge badge-type">${escapeHtml(e.examType)}</span>
          <span class="badge badge-topic">${escapeHtml(e.topic)}</span>
          ${(e.tags || []).map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join("")}
        </div>
      </div>
      <div class="exam-actions">
        ${e.hasAnswer ? '<span class="flag flag-answer">含答案</span>' : ""}
        ${e.hasAnalysis ? '<span class="flag flag-analysis">含解析</span>' : ""}
        <button class="btn-primary" onclick="openExamViewer('${e.id}')">查看试卷</button>
      </div>
    </div>
  `).join("");
}

// ==================== 渲染:答题模板库 ====================
let tplVersion = "memorize"; // memorize | dictation

function renderTemplates() {
  const keyword = document.getElementById("tpl-search").value.trim().toLowerCase();
  const list = (RESOURCES.templates || []).filter(t => {
    if (keyword) {
      const text = [t.title, t.category, t.topic, ...(t.tags || [])].join(" ").toLowerCase();
      if (!text.includes(keyword)) return false;
    }
    return true;
  });

  const container = document.getElementById("template-list");
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">📭 暂无符合条件的模板</div>';
    return;
  }

  container.innerHTML = list.map(t => {
    const content = tplVersion === "memorize" ? t.memorizeContent : t.dictationContent;
    return `
    <div class="tpl-card">
      <div class="tpl-header">
        <div class="tpl-title">${escapeHtml(t.title)}</div>
        <div class="tpl-meta">
          <span class="badge badge-cat">${escapeHtml(t.category)}</span>
          <span class="badge badge-topic">${escapeHtml(t.topic)}</span>
        </div>
      </div>
      <pre class="tpl-content ${tplVersion === "dictation" ? "dictation" : ""}">${escapeHtml(content || "")}</pre>
      ${tplVersion === "dictation" ? '<button class="btn-ghost toggle-answer" data-id="' + t.id + '">👀 显示答案</button>' : ""}
    </div>
  `;}).join("");

  // 默写版"显示答案"切换
  container.querySelectorAll(".toggle-answer").forEach(btn => {
    btn.addEventListener("click", () => {
      const tpl = (RESOURCES.templates || []).find(t => t.id === btn.dataset.id);
      const pre = btn.parentElement.querySelector(".tpl-content");
      if (pre.classList.contains("showing")) {
        pre.textContent = tpl.dictationContent;
        pre.classList.remove("showing");
        btn.textContent = "👀 显示答案";
      } else {
        pre.textContent = tpl.memorizeContent;
        pre.classList.add("showing");
        btn.textContent = "🙈 隐藏答案";
      }
    });
  });
}

// 背诵/默写切换
document.querySelectorAll(".ver-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".ver-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    tplVersion = btn.dataset.ver;
    renderTemplates();
  });
});

// ==================== 渲染:拓展视野库 ====================
function renderLinks() {
  const keyword = document.getElementById("link-search").value.trim().toLowerCase();
  const category = document.getElementById("link-filter-category").value;

  const list = (RESOURCES.links || []).filter(l => {
    if (category && l.category !== category) return false;
    if (keyword) {
      const text = [l.title, l.description, l.category].join(" ").toLowerCase();
      if (!text.includes(keyword)) return false;
    }
    return true;
  });

  const grid = document.getElementById("link-grid");
  if (list.length === 0) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1;">📭 暂无符合条件的链接</div>';
    return;
  }

  grid.innerHTML = list.map(l => {
    const statusDot = l.status === "active" ? "🟢" : (l.status === "broken" ? "🔴" : "🟡");
    return `
    <a class="link-card" href="${escapeAttr(l.url)}" target="_blank" rel="noopener noreferrer">
      <div class="link-status">${statusDot}</div>
      <div class="link-title">${escapeHtml(l.title)}</div>
      <div class="link-desc">${escapeHtml(l.description || "")}</div>
      <div class="link-foot">
        <span class="badge badge-cat">${escapeHtml(l.category)}</span>
        <span class="link-open">访问 ↗</span>
      </div>
    </a>
  `;}).join("");
}

// ==================== 试卷查看器(水印) ====================
function openExamViewer(examId) {
  const exam = (RESOURCES.exams || []).find(e => e.id === examId);
  if (!exam) return;

  const viewer = document.getElementById("exam-viewer");
  document.getElementById("viewer-title").textContent = exam.title;

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

  viewer.style.display = "flex";
  document.body.style.overflow = "hidden";
}

document.getElementById("viewer-close").addEventListener("click", () => {
  document.getElementById("exam-viewer").style.display = "none";
  document.body.style.overflow = "";
});

// ==================== 搜索/筛选事件绑定 ====================
["exam-search", "exam-filter-year", "exam-filter-type", "exam-filter-topic"].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener("input", renderExams);
  el.addEventListener("change", renderExams);
});
["tpl-search"].forEach(id => {
  document.getElementById(id).addEventListener("input", renderTemplates);
});
["link-search", "link-filter-category"].forEach(id => {
  const el = document.getElementById(id);
  el.addEventListener("input", renderLinks);
  el.addEventListener("change", renderLinks);
});

// ==================== 工具函数 ====================
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeAttr(str) {
  return escapeHtml(str);
}

function renderAll() {
  renderExams();
  renderTemplates();
  renderLinks();
}
