// ============================================================
// 地理试题库 - 站点配置
// 常州市武进区横山桥高中地理教研组
// ============================================================
// 说明：
// 1. pagesBase 填站点部署后的根地址（结尾带 /），用于生成在线预览地址。
// 2. 试卷文件与配图统一用相对路径存放在 files/ 下，方便整体搬运。
// ============================================================

const CONFIG = {
  siteName: "地理试题库",
  orgName: "常州市武进区横山桥高中地理教研组",
  watermarkText: "常州市武进区横山桥高中地理教研组",
  // 部署到 GitHub Pages 后改成你的实际地址，例如：
  // https://sunhui918.github.io/geo-gaokao/
  pagesBase: "https://sunhui918.github.io/geo-gaokao/",
  // 管理后台用于读写 GitHub 仓库的坐标信息（不含任何密钥）
  github: {
    owner: "SUNhui918",
    repo: "geo-gaokao",
    branch: "main",
    dataFile: "data.js",
    fileDir: "files",
    figDir: "files/figs"
  },
  features: {
    watermark: true,   // 试卷查看页平铺水印
    downloadLink: true // Word/PDF 提供"新窗口打开"兜底入口
  }
};
