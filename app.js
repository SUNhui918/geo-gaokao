// ============================================================
// 高三地理试题库 - 主站逻辑
// 功能：双维检索（按试卷 / 按专题）/ 全文检索 / 多图渲染 / 水印
// ============================================================

let DATA = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    DATA = await loadData();
    init();
  } catch (e) {
    console.error("加载数据失败：", e);
    const stat = document.getElementById("stat-papers");
    if (stat) stat.textContent = "加载失败";
  }
});

async function loadData() {
  const res = await fetch("data.js?v=" + Date.now());
  if (!res.ok) throw new Error("HTTP " + res.status);
  const text = await res.text();
  return new Function(text + "; return QUESTION_BANK;")();
}

function init() {
  bindTabs();
  fillProvinceFilter();
  fillYearFilter();
  renderStats();
  renderPapers();
  renderTopicGroups();
  bindSearch();
  bindViewer();
  initCompose();
  initCompare();
  initExamPoints();
}

function bindTabs() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    });
  });
}

function fillProvinceFilter() {
  const sel = document.getElementById("paper-filter-province");
  (DATA.provinces || []).forEach((p) => {
    const opt = document.createElement("option");
    opt.textContent = p;
    sel.appendChild(opt);
  });
}

function fillYearFilter() {
  const sel = document.getElementById("paper-filter-year");
  const years = (DATA.papers || []).map((p) => Number(p.year)).filter((n) => !isNaN(n));
  const maxYear = Math.max(new Date().getFullYear(), ...years, 2020);
  for (let y = maxYear; y >= 2020; y--) {
    const opt = document.createElement("option");
    opt.textContent = String(y);
    sel.appendChild(opt);
  }
}

function renderStats() {
  document.getElementById("stat-papers").textContent = (DATA.papers || []).length;
  document.getElementById("stat-questions").textContent = (DATA.questions || []).length;
}

// ==================== 按试卷检索 ====================
function renderPapers() {
  const keyword = val("paper-search").toLowerCase();
  const province = val("paper-filter-province");
  const year = val("paper-filter-year");
  const type = val("paper-filter-type");

  const list = (DATA.papers || []).filter((p) => {
    if (province && p.province !== province) return false;
    if (year && p.year !== year) return false;
    if (type && p.type !== type) return false;
    if (keyword) {
      const text = [p.title, p.province, p.year, p.type].join(" ").toLowerCase();
      if (!text.includes(keyword)) return false;
    }
    return true;
  });

  const container = document.getElementById("paper-list");
  if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">📭 暂无符合条件的试卷</div>';
    return;
  }

  container.innerHTML = list
    .map(
      (p) => `
    <div class="exam-card">
      <div class="exam-main">
        <div class="exam-title">${esc(p.title)}</div>
        <div class="exam-meta">
          <span class="badge badge-province">${esc(p.province)}</span>
          <span class="badge badge-year">${esc(p.year)}</span>
          <span class="badge badge-type">${esc(p.type)}</span>
          ${p.hasAnswer ? '<span class="flag flag-answer">✓ 含答案</span>' : ""}
          ${p.hasAnalysis ? '<span class="flag flag-analysis">✓ 含解析（DeepSeek生成）</span>' : ""}
        </div>
      </div>
      <div class="exam-actions">
        <button class="btn-primary" data-open-paper="${esc(p.id)}">查看试卷</button>
      </div>
    </div>`
    )
    .join("");

  container.querySelectorAll("[data-open-paper]").forEach((btn) => {
    btn.addEventListener("click", () => openExamViewer(btn.dataset.openPaper));
  });
}

// ==================== 按专题检索（总览 + 全文检索） ====================
function renderTopicGroups() {
  const keyword = val("topic-search").toLowerCase();
  let matched = null;
  if (keyword) {
    matched = (DATA.questions || []).filter((q) => questionSearchText(q).includes(keyword));
  }

  const container = document.getElementById("topic-groups");
  let html = "";

  (DATA.topicGroups || []).forEach((g) => {
    const chips = g.topics
      .map((t) => {
        const count = (DATA.questions || []).filter((q) => q.topic === t).length;
        return `<button class="topic-chip ${count === 0 ? "empty" : ""}" data-topic="${esc(t)}">${esc(t)}<span class="chip-count">${count}</span></button>`;
      })
      .join("");

    let groupBadge = "";
    if (matched) {
      const hit = matched.filter((q) => g.topics.includes(q.topic)).length;
      groupBadge = hit > 0 ? `<span class="group-hit">命中 ${hit} 题</span>` : '<span class="group-hit zero">0</span>';
    }

    html += `
      <div class="topic-group">
        <div class="topic-group-header"><h3>${esc(g.group)}</h3>${groupBadge}</div>
        <div class="topic-chips">${chips}</div>
      </div>`;
  });

  if (matched) {
    if (matched.length === 0) {
      html += `<div class="empty-state">📭 没有找到与“${esc(keyword)}”相关的题目，换个关键词试试（如：锋面、阶地、城市化）</div>`;
    } else {
      html += `<div class="search-result-bar">🔍 关键词“${esc(keyword)}”共命中 <b>${matched.length}</b> 道题：</div>`;
      html += renderQuestionCards(matched);
    }
  }

  container.innerHTML = html;
  container.querySelectorAll("[data-topic]").forEach((btn) => {
    btn.addEventListener("click", () => enterTopic(btn.dataset.topic));
  });
  bindCardActions(container);
}

function questionSearchText(q) {
  const paper = getPaper(q.paperId);
  return [
    q.topic,
    q.knowledgePoint,
    q.difficulty,
    q.desc,
    (q.keywords || []).join(" "),
    q.number,
    q.sharedMaterial,
    q.content,
    q.answer,
    q.analysis,
    (q.figures || []).map((f) => (f.label || "") + " " + (f.alt || "")).join(" "),
    paper ? paper.title : "",
    paper ? paper.province + paper.year + paper.type : ""
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

// ==================== 题目卡片渲染 ====================
function renderQuestionCards(questions) {
  const items = [];
  const groupMap = new Map();
  questions.forEach((q) => {
    const key = q.questionGroup || (q.sharedMaterial ? "mat:" + q.sharedMaterial : null);
    if (key && groupMap.has(key)) {
      groupMap.get(key).qs.push(q);
    } else if (key) {
      const g = { key, qs: [q] };
      groupMap.set(key, g);
      items.push(g);
    } else {
      items.push({ single: true, q });
    }
  });
  return items.map((it) => (it.single ? renderOneCard(it.q) : renderGroupCard(it.qs))).join("");
}

function figuresHtml(q) {
  if (q.figures && q.figures.length > 0) {
    return (
      '<div class="q-figures">' +
      q.figures
        .map(
          (f) => `
      <figure class="q-figure">
        <img src="${esc(f.url)}" alt="${esc(f.alt || f.label || "题目配图")}" loading="lazy">
        ${f.label ? `<figcaption>${esc(f.label)}</figcaption>` : ""}
      </figure>`
        )
        .join("") +
      "</div>"
    );
  }
  return q.hasFigure ? '<span class="badge badge-fig" title="配图请打开原卷查看">🖼 含图 · 见原卷</span>' : "";
}

function answerHtml(q) {
  if (!q.answer) return "";
  return `<details class="q-answer"><summary>📝 查看答案</summary><div class="q-answer-body">${br(esc(q.answer))}</div></details>`;
}

function analysisHtml(q) {
  if (!q.analysis) return "";
  return `<details class="q-analysis"><summary>💡 查看解析</summary><div class="q-analysis-body">${br(esc(q.analysis))}</div></details>`;
}

function sourceHtml(q) {
  const paper = getPaper(q.paperId);
  const paperTitle = paper ? paper.title : "未知试卷";
  const paperLabel = paper ? `${paper.province} · ${paper.year} · ${paper.type}` : "";
  const badges = [];
  if (q.topic) badges.push(`<span class="badge badge-topic">${esc(q.topic)}</span>`);
  if (q.difficulty) badges.push(`<span class="badge badge-difficulty badge-difficulty-${esc(q.difficulty)}">${esc(q.difficulty)}</span>`);
  return `
    <div class="q-source">
      ${badges.join("")}
      <span class="q-paper">${esc(paperTitle)}</span>
      <span class="q-paper-label">${esc(paperLabel)}</span>
    </div>`;
}

function renderOneCard(q) {
  const paper = getPaper(q.paperId);
  return `
    <div class="question-card">
      <div class="q-left"><div class="q-number">第 ${esc(q.number)} 题</div></div>
      <div class="q-main">
        <div class="q-desc">${esc(q.desc)}</div>
        ${figuresHtml(q)}
        ${q.content ? `<div class="q-content">${br(esc(q.content))}</div>` : ""}
        ${answerHtml(q)}
        ${analysisHtml(q)}
        ${sourceHtml(q)}
      </div>
      <div class="q-actions">
        ${paper && paper.url ? `<button class="btn-primary btn-sm" data-open-paper="${esc(paper.id)}">查看试卷</button>` : ""}
      </div>
    </div>`;
}

function renderGroupCard(qs) {
  const first = qs[0];
  const paper = getPaper(first.paperId);
  const nums = qs.map((q) => q.number);
  const numLabel = nums.length > 1 ? `${nums[0]}~${nums[nums.length - 1]}` : nums[0];
  const materialHtml = first.sharedMaterial
    ? `<div class="q-material"><span class="q-material-tag">共享材料</span>${br(esc(first.sharedMaterial))}</div>`
    : "";

  const subs = qs
    .map(
      (q) => `
      <div class="q-sub">
        <div class="q-sub-head"><span class="q-sub-num">第 ${esc(q.number)} 题</span><span class="q-sub-desc">${esc(q.desc)}</span></div>
        ${q.content ? `<div class="q-content">${br(esc(q.content))}</div>` : ""}
        ${answerHtml(q)}
        ${analysisHtml(q)}
      </div>`
    )
    .join("");

  const topics = [...new Set(qs.map((q) => q.topic))]
    .map((t) => `<span class="badge badge-topic">${esc(t)}</span>`)
    .join("");

  return `
    <div class="question-card q-group-card">
      <div class="q-left">
        <div class="q-number">第 ${esc(numLabel)} 题</div>
        <div class="q-group-size">${qs.length} 小题</div>
      </div>
      <div class="q-main">
        ${materialHtml}
        ${figuresHtml(first)}
        ${subs}
        <div class="q-source">
          ${topics}
          <span class="q-paper">${esc(paper ? paper.title : "")}</span>
        </div>
      </div>
      <div class="q-actions">
        ${paper && paper.url ? `<button class="btn-primary btn-sm" data-open-paper="${esc(paper.id)}">查看试卷</button>` : ""}
      </div>
    </div>`;
}

function enterTopic(topic) {
  const questions = (DATA.questions || []).filter((q) => q.topic === topic);
  if (questions.length === 0) {
    showToast("该专题暂无题目，请先在数据文件中添加");
    return;
  }
  document.getElementById("topic-overview").style.display = "none";
  document.getElementById("topic-detail").style.display = "block";
  document.getElementById("topic-current").textContent = `🔖 ${topic}（${questions.length} 题）`;

  const list = document.getElementById("question-list");
  list.innerHTML = renderQuestionCards(questions);
  bindCardActions(list);
  window.scrollTo({ top: 0 });
}

function bindCardActions(scope) {
  scope.querySelectorAll("[data-open-paper]").forEach((btn) => {
    btn.addEventListener("click", () => openExamViewer(btn.dataset.openPaper));
  });
}

// ==================== 试卷查看器 ====================
function openExamViewer(paperId) {
  const paper = getPaper(paperId);
  if (!paper) return;

  const viewer = document.getElementById("exam-viewer");
  const title = document.getElementById("viewer-title");
  const newtab = document.getElementById("viewer-newtab");
  const content = document.getElementById("viewer-content");

  title.textContent = paper.title;
  newtab.style.display = "none";

  const absUrl = toAbsolute(paper.url);
  const dateStr = new Date().toISOString().slice(0, 10);
  setWatermark(CONFIG.watermarkText + " " + dateStr);

  if (!paper.url) {
    content.innerHTML = `
      <div class="viewer-placeholder">
        <div class="vp-icon">📄</div>
        <p><b>${esc(paper.title)}</b></p>
        <p>该试卷文件尚未上传</p>
      </div>`;
  } else if (/\.(docx?|wps)$/i.test(absUrl)) {
    // Word：用微软 Office 在线预览，同时提供新窗口兜底
    const office = "https://view.officeapps.live.com/op/embed.aspx?src=" + encodeURIComponent(absUrl);
    content.innerHTML = `<iframe src="${esc(office)}" class="viewer-iframe" loading="lazy"></iframe>`;
    if (CONFIG.features.downloadLink) {
      newtab.href = absUrl;
      newtab.style.display = "inline";
    }
  } else {
    content.innerHTML = `<iframe src="${esc(absUrl)}" class="viewer-iframe" loading="lazy"></iframe>`;
    newtab.href = absUrl;
    newtab.style.display = "inline";
  }

  viewer.style.display = "flex";
  document.body.style.overflow = "hidden";
}

function setWatermark(text) {
  const wm = document.getElementById("viewer-watermark");
  if (!CONFIG.features.watermark) {
    wm.style.display = "none";
    return;
  }
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const svg =
    "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='140'>" +
    "<text x='50%' y='50%' transform='rotate(-28 120 70)' text-anchor='middle' fill='rgba(37,99,235,0.10)' font-size='14' font-family='sans-serif'>" +
    safe +
    "</text></svg>";
  const uri = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  wm.style.backgroundImage = `url("${uri}")`;
  wm.style.backgroundRepeat = "repeat";
  wm.style.display = "block";
}

function toAbsolute(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("//")) return url;
  return (CONFIG.pagesBase || "").replace(/\/?$/, "/") + url.replace(/^\/+/, "");
}

// ==================== 事件绑定 ====================
function bindSearch() {
  const paperSearch = document.getElementById("paper-search");
  if (paperSearch) paperSearch.addEventListener("input", renderPapers);
  ["paper-filter-province", "paper-filter-year", "paper-filter-type"].forEach((id) => {
    document.getElementById(id).addEventListener("change", renderPapers);
  });
  document.getElementById("topic-search").addEventListener("input", renderTopicGroups);
  document.getElementById("topic-back").addEventListener("click", () => {
    document.getElementById("topic-overview").style.display = "block";
    document.getElementById("topic-detail").style.display = "none";
  });
}

function bindViewer() {
  document.getElementById("viewer-close").addEventListener("click", closeViewer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeViewer();
  });
}

function closeViewer() {
  const viewer = document.getElementById("exam-viewer");
  if (viewer.style.display === "none") return;
  viewer.style.display = "none";
  document.getElementById("viewer-content").innerHTML = "";
  document.body.style.overflow = "";
}

// ==================== 组卷 ====================
let composeSelected = [];
let composeTitleText = "地理专题练习";

function initCompose() {
  const sel = document.getElementById("compose-topics");
  (DATA.topicGroups || []).forEach((g) => {
    const og = document.createElement("optgroup");
    og.label = g.group;
    g.topics.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });
  document.getElementById("compose-btn").addEventListener("click", composePaper);
  document.getElementById("export-student").addEventListener("click", () => exportComposeWord(false));
  document.getElementById("export-teacher").addEventListener("click", () => exportComposeWord(true));
}

function composePaper() {
  const sel = document.getElementById("compose-topics");
  const topics = Array.from(sel.selectedOptions).map((o) => o.value);
  const difficulty = document.getElementById("compose-diff").value;
  const count = parseInt(document.getElementById("compose-count").value, 10) || 10;

  if (!topics.length) {
    showToast("请至少选择一个专题");
    return;
  }

  const pool = (DATA.questions || []).filter(
    (q) => topics.includes(q.topic) && (!difficulty || q.difficulty === difficulty)
  );
  if (!pool.length) {
    document.getElementById("compose-result").innerHTML = '<div class="empty-state">📭 没有符合条件的题目，换个专题或难度试试</div>';
    document.getElementById("compose-actions").style.display = "none";
    return;
  }

  const units = [];
  const seen = new Set();
  pool.forEach((q) => {
    const key = q.questionGroup || (q.sharedMaterial ? "mat:" + q.sharedMaterial : null);
    if (key) {
      if (seen.has(key)) return;
      seen.add(key);
      units.push(pool.filter((x) => (x.questionGroup || (x.sharedMaterial ? "mat:" + x.sharedMaterial : null)) === key));
    } else {
      units.push([q]);
    }
  });
  shuffle(units);

  const selected = [];
  for (const unit of units) {
    if (selected.length >= count) break;
    selected.push(...unit);
  }

  composeSelected = selected;
  composeTitleText = "地理专题练习（" + topics.join("、") + "）";
  renderComposeResult(selected);
  document.getElementById("compose-actions").style.display = "flex";
}

function composeCards(questions) {
  const out = [];
  let num = 0;
  let lastKey = null;
  for (const q of questions) {
    num++;
    const key = q.questionGroup || (q.sharedMaterial ? "mat:" + q.sharedMaterial : null);
    const showMaterial = !!q.sharedMaterial && key !== lastKey;
    lastKey = key;
    out.push({ q, num, showMaterial });
  }
  return out;
}

function composeOneCard(item) {
  const q = item.q;
  const fig = q.figures && q.figures.length
    ? q.figures.map((f) => `<figure class="q-figure"><img src="${esc(absUrl(f.url))}" alt="${esc(f.label || "配图")}" loading="lazy">${f.label ? `<figcaption>${esc(f.label)}</figcaption>` : ""}</figure>`).join("")
    : q.hasFigure ? '<span class="badge badge-fig">🖼 含图 · 见原卷</span>' : "";
  return `
    <div class="question-card">
      <div class="q-left"><div class="q-number">第 ${item.num} 题</div></div>
      <div class="q-main">
        <div class="q-desc">${esc(q.desc || "")}</div>
        ${item.showMaterial ? `<div class="q-material"><span class="q-material-tag">共享材料</span>${br(esc(q.sharedMaterial))}</div>` : ""}
        <div class="q-figures">${fig}</div>
        ${q.content ? `<div class="q-content">${br(esc(q.content))}</div>` : ""}
        <div class="q-source">
          <span class="badge badge-topic">${esc(q.topic)}</span>
          ${q.difficulty ? `<span class="badge badge-difficulty badge-difficulty-${esc(q.difficulty)}">${esc(q.difficulty)}</span>` : ""}
        </div>
      </div>
    </div>`;
}

function renderComposeResult(questions) {
  const el = document.getElementById("compose-result");
  if (!questions.length) {
    el.innerHTML = "";
    return;
  }
  const cards = composeCards(questions).map(composeOneCard).join("");
  el.innerHTML = `<div class="search-result-bar">🧩 已组 <b>${questions.length}</b> 道题</div>` + cards;
}

function exportComposeWord(includeAnswers) {
  if (!composeSelected.length) {
    showToast("请先组题");
    return;
  }
  const content = composeWordHtml(composeSelected, includeAnswers);
  const suffix = includeAnswers ? "教师版" : "学生版";
  const date = new Date().toISOString().slice(0, 10);
  downloadWord(content, `地理专题练习_${date}_${suffix}.doc`);
}

function composeWordHtml(questions, includeAnswers) {
  const date = new Date().toISOString().slice(0, 10);
  const body = [];
  body.push(`<h1 style="text-align:center;font-size:20pt;">${esc(composeTitleText)}</h1>`);
  body.push(`<p style="text-align:center;color:#666;font-size:10.5pt;">组卷时间：${date} · 共 ${questions.length} 题</p>`);

  // 按专题分组
  const byTopic = new Map();
  for (const q of questions) {
    const t = q.topic || "未分类";
    if (!byTopic.has(t)) byTopic.set(t, []);
    byTopic.get(t).push(q);
  }

  let num = 0;
  for (const [topic, qs] of byTopic) {
    body.push(`<h2 style="font-size:14pt;margin-top:16px;color:#1e3a8a;">【${esc(topic)}专题】</h2>`);

    for (const group of groupQuestions(qs)) {
      const paper = getPaper(group[0].paperId);
      if (paper) {
        body.push(`<p style="font-size:10.5pt;color:#555;"><b>题源：</b>${esc(paper.year)}·${esc(paper.province)}·${esc(paper.type)}</p>`);
      }

      const material = group[0].sharedMaterial;
      if (material) body.push(`<p style="font-size:12pt;">${br(esc(material))}</p>`);

      dedupeFigures(group).forEach((f) => {
        body.push(`<p style="text-align:center;"><img src="${esc(absUrl(f.url))}" style="max-width:480px;"></p>`);
        if (f.label) body.push(`<p style="text-align:center;color:#666;font-size:10pt;">${esc(f.label)}</p>`);
      });

      for (const q of group) {
        num++;
        body.push(`<p style="font-size:12pt;"><b>${num}.</b> ${esc(q.desc || "")}</p>`);
        if (q.content) body.push(`<p style="font-size:12pt;">${br(esc(q.content))}</p>`);
        if (includeAnswers) {
          if (q.answer) body.push(`<p style="font-size:12pt;color:#166534;"><b>【答案】</b>${br(esc(q.answer))}</p>`);
          if (q.analysis) body.push(`<p style="font-size:12pt;color:#6b21a8;"><b>【解析】</b>${br(esc(q.analysis))}</p>`);
        }
        body.push(`<p>&nbsp;</p>`);
      }
    }
  }

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${esc(composeTitleText)}</title></head><body>${body.join("")}</body></html>`;
}

function groupQuestions(questions) {
  const order = [];
  const map = new Map();
  for (const q of questions) {
    const key = q.questionGroup || (q.sharedMaterial ? "mat:" + q.sharedMaterial : null);
    if (key && map.has(key)) {
      map.get(key).push(q);
    } else if (key) {
      const g = [q];
      map.set(key, g);
      order.push(g);
    } else {
      order.push([q]);
    }
  }
  return order;
}

function dedupeFigures(questions) {
  const seen = new Set();
  const figs = [];
  for (const q of questions) {
    for (const f of q.figures || []) {
      const key = (f.url || "") + "|" + (f.label || "");
      if (seen.has(key)) continue;
      seen.add(key);
      figs.push(f);
    }
  }
  return figs;
}

function downloadWord(content, filename) {
  const blob = new Blob(["\ufeff" + content], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function absUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("//")) return url;
  return (CONFIG.pagesBase || "").replace(/\/?$/, "/") + url.replace(/^\/+/, "");
}

// ==================== 历年对比 ====================
function initCompare() {
  renderCompare();
}

function questionType(q) {
  const c = q.content || "";
  if (/回答下列问题|阅读材料|（[1-9]）|\([1-9]\)/.test(c)) return "综合题";
  return "选择题";
}

function renderCompare() {
  const papers = (DATA.papers || []).filter((p) => p.year).sort((a, b) => Number(a.year) - Number(b.year));
  const years = papers.map((p) => p.year);
  if (!years.length) {
    document.getElementById("compare-topics").innerHTML = '<div class="empty-state">暂无试卷数据</div>';
    document.getElementById("compare-top-choice").innerHTML = "";
    document.getElementById("compare-top-comprehensive").innerHTML = "";
    return;
  }

  const paperQs = (year) => {
    const paper = papers.find((p) => p.year === year);
    return paper ? DATA.questions.filter((q) => q.paperId === paper.id) : [];
  };

  // 专题分布
  const topicHeader = `<tr><th>专题</th>${years.map((y) => `<th>${esc(y)}</th>`).join("")}<th>合计</th></tr>`;
  const topicRows = [];
  for (const g of DATA.topicGroups || []) {
    topicRows.push(`<tr class="compare-group-row"><td colspan="${years.length + 2}">${esc(g.group)}</td></tr>`);
    for (const t of g.topics) {
      let total = 0;
      const cells = years.map((y) => {
        const c = paperQs(y).filter((q) => q.topic === t).length;
        total += c;
        return `<td>${c || ""}</td>`;
      }).join("");
      topicRows.push(`<tr><td>${esc(t)}</td>${cells}<td>${total || ""}</td></tr>`);
    }
  }
  document.getElementById("compare-topics").innerHTML = `<table class="compare-table">${topicHeader}${topicRows.join("")}</table>`;

  // 高频考点（选择题 / 综合题 分开）
  const choiceQs = (DATA.questions || []).filter((q) => questionType(q) === "选择题");
  const compQs = (DATA.questions || []).filter((q) => questionType(q) === "综合题");
  document.getElementById("compare-top-choice").innerHTML = topTopicsHtml(choiceQs);
  document.getElementById("compare-top-comprehensive").innerHTML = topTopicsHtml(compQs);
}

function topTopicsHtml(questions, limit = 10) {
  const counts = new Map();
  questions.forEach((q) => {
    if (q.topic) counts.set(q.topic, (counts.get(q.topic) || 0) + 1);
  });
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (!sorted.length) return '<div class="empty-state">暂无数据</div>';
  const max = sorted[0][1];
  return sorted
    .map(
      ([topic, count]) => `
      <div class="top-row">
        <span class="top-name">${esc(topic)}</span>
        <div class="top-bar"><div class="top-bar-fill" style="width:${Math.round((count / max) * 100)}%"></div></div>
        <span class="top-count">${count} 题</span>
      </div>`
    )
    .join("");
}

// ==================== 考点细目表 ====================
function initExamPoints() {
  renderExamPoints();
}

function renderExamPoints() {
  const eps = (DATA.examPoints || []).slice().sort((a, b) => Number(a.year) - Number(b.year));
  const el = document.getElementById("exampoints-list");
  if (!eps.length) {
    el.innerHTML = '<div class="empty-state">📭 暂无考点细目表，请在管理后台录入</div>';
    return;
  }

  const modules = eps
    .map((ep, i) => `<button class="ep-module${i === 0 ? " active" : ""}" data-index="${i}">${esc(ep.province || "江苏")}卷·${esc(ep.year)}</button>`)
    .join("");

  const tables = eps
    .map((ep, i) => {
      const rows = (ep.items || [])
        .map(
          (it) => `
      <tr>
        <td>${esc(it.number)}</td>
        <td>${esc(it.difficulty)}</td>
        <td class="exam-knowledge">${esc(it.knowledge)}</td>
      </tr>`
        )
        .join("");
      return `
      <div class="ep-table-wrap" id="ep-table-${i}" style="display:${i === 0 ? "block" : "none"};">
        <h3>${esc(ep.year)}年${esc(ep.province || "江苏")}卷 · 考点细目表</h3>
        <table class="compare-table">
          <thead><tr><th style="width:80px;">题号</th><th style="width:110px;">难度系数</th><th>详细知识点</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    })
    .join("");

  el.innerHTML = `<div class="ep-modules">${modules}</div>${tables}`;

  el.querySelectorAll(".ep-module").forEach((btn) => {
    btn.addEventListener("click", () => {
      el.querySelectorAll(".ep-module").forEach((b) => b.classList.remove("active"));
      el.querySelectorAll(".ep-table-wrap").forEach((t) => (t.style.display = "none"));
      btn.classList.add("active");
      document.getElementById("ep-table-" + btn.dataset.index).style.display = "block";
    });
  });
}

// ==================== 工具函数 ====================
function getPaper(id) {
  return (DATA.papers || []).find((p) => p.id === id);
}

function val(id) {
  return document.getElementById(id).value.trim();
}

function esc(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function br(text) {
  return text.replace(/\n/g, "<br>");
}

function showToast(msg) {
  let t = document.getElementById("__toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "__toast";
    t.style.cssText =
      "position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:10px 22px;border-radius:8px;font-size:13px;z-index:400;box-shadow:0 8px 24px rgba(0,0,0,.3);";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.style.display = "none"), 2200);
}
