// ============================================================
// 高三地理教学资源库 - 配置文件
// 横山桥高中地理教研组
// ============================================================
// 说明:
// 1. 密码采用 SHA-256 哈希存储,修改密码时用任意 SHA-256 工具
//    生成新哈希替换下方值即可(明文密码不要写在代码里)
// 2. 支持月度密码表:每月换一个,只需替换 hash 值
// 3. 管理员密码与学生密码独立,管理页入口不在前台展示
// ============================================================

const CONFIG = {
  // --- 站点基本信息 ---
  siteName: "高三地理教学资源库",
  orgName: "横山桥高中地理教研组",

  // --- 水印文字(试卷页面自动叠加) ---
  watermarkText: "横山桥高中地理教研组",

  // --- 密码配置 ---
  // 学生密码(当前默认: gaokao2026,上线后请尽快修改)
  studentPasswordHash: "b1bd299158d6b0751975c43cec0e3fa5270c8b1a6c9c57421adc3521ae11f13e",

  // 管理员密码(当前默认: admin-hsq2026,上线后请立即修改)
  // 注意:管理员密码应更复杂,且不要告知学生
  adminPasswordHash: "edc85e5ff22473a16e634d1c91b794749d08fda518e2da9250661a7ee360574a",

  // --- GitHub 仓库配置(管理页提交数据用) ---
  github: {
    owner: "SUNhui918", // GitHub 用户名
    repo: "geo-gaokao", // 仓库名
    branch: "main",     // 分支名
    dataFile: "data.js" // 数据文件路径
  },

  // --- 功能开关 ---
  features: {
    watermark: true,   // 试卷页水印
    linkCheck: true    // 拓展视野库链接巡检标记
  }
};

// --- 密码验证工具函数(哈希比较) ---
async function sha256(text) {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
