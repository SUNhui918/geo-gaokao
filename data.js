// ============================================================
// 高三地理试题库 - 数据文件
// 管理页通过 GitHub API 修改此文件,站点自动更新
// ============================================================
// 数据结构说明:
// papers    : 试卷(真题/模拟题),按省份+年份检索整卷
// questions : 题目(挂在试卷下,标专题),按专题跨卷检索
//   paperId : 所属试卷的 id
//   number  : 题号,如 "1~3"、"17(2)"
//   topic   : 专题(见 TOPIC_GROUPS)
//   desc    : 题目内容简述(便于不用打开文件就知道考什么)
//   keywords: 检索关键词(逗号分隔)
// provinces : 省份下拉选项
// ============================================================

const TOPIC_GROUPS = [
  {
    group: "自然地理",
    topics: [
      "经纬网和地图",
      "地理信息技术",
      "地球运动和天文",
      "大气",
      "水",
      "地表形态的塑造",
      "整体性和差异性",
      "土壤",
      "植被"
    ]
  },
  {
    group: "人文地理",
    topics: [
      "人口",
      "乡村和城镇",
      "产业",
      "交通",
      "环境与发展",
      "国家安全"
    ]
  },
  {
    group: "区域",
    topics: [
      "江苏地理",
      "中国地理",
      "世界地理"
    ]
  }
];

const RESOURCES = {
  provinces: [
    "全国", "江苏", "北京", "上海", "天津", "浙江", "山东", "广东", "湖南",
    "湖北", "海南", "辽宁", "福建", "河北", "重庆", "安徽", "广西", "贵州",
    "河南", "吉林", "江西", "四川", "陕西", "山西", "宁夏", "青海", "云南",
    "黑龙江", "内蒙古", "新疆", "黑吉辽蒙", "陕晋宁青"
  ],

  papers: [
    // 2025 年高考真题
    { id: "p-2025-福建", title: "2025年福建省普通高中学业水平选择性考试·地理", province: "福建", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "p-2025-广东", title: "2025年广东省普通高中学业水平选择性考试·地理", province: "广东", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "p-2025-广西", title: "2025年广西省普通高中学业水平选择性考试·地理", province: "广西", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "p-2025-贵州", title: "2025年贵州省普通高中学业水平选择性考试·地理", province: "贵州", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "p-2025-河北", title: "2025年河北省普通高中学业水平选择性考试·地理", province: "河北", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "p-2025-河南", title: "2025年河南省普通高中学业水平选择性考试·地理", province: "河南", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "p-2025-湖北", title: "2025年湖北省普通高中学业水平选择性考试·地理", province: "湖北", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "p-2025-湖南", title: "2025年湖南省普通高中学业水平选择性考试·地理", province: "湖南", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "p-2025-吉林", title: "2025年吉林省普通高中学业水平选择性考试·地理", province: "吉林", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "p-2025-江苏", title: "2025年江苏省普通高中学业水平选择性考试·地理", province: "江苏", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "p-2025-江西", title: "2025年江西省普通高中学业水平选择性考试·地理", province: "江西", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "p-2025-山东", title: "2025年山东省普通高中学业水平选择性考试·地理", province: "山东", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "p-2025-四川", title: "2025年四川省普通高中学业水平选择性考试·地理", province: "四川", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "p-2025-天津", title: "2025年天津市普通高中学业水平选择性考试·地理", province: "天津", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "p-2025-新课标", title: "2025年全国新课标卷·地理", province: "全国", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "p-2025-重庆", title: "2025年重庆市普通高中学业水平选择性考试·地理", province: "重庆", year: "2025", paperType: "高考真题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },

    // 2026 年模拟题
    { id: "m-2026-黑吉辽蒙", title: "2026届黑吉辽蒙高三地理模拟卷", province: "黑吉辽蒙", year: "2026", paperType: "模拟题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "m-2026-河北", title: "2026届河北省高三地理模拟卷", province: "河北", year: "2026", paperType: "模拟题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "m-2026-湖南", title: "2026届湖南省高三地理模拟卷", province: "湖南", year: "2026", paperType: "模拟题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "m-2026-湖北", title: "2026届湖北省高三地理模拟卷", province: "湖北", year: "2026", paperType: "模拟题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "m-2026-全国卷新疆", title: "2026届全国卷（新疆）高三地理模拟卷", province: "新疆", year: "2026", paperType: "模拟题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "m-2026-山东", title: "2026届山东省高三地理模拟卷", province: "山东", year: "2026", paperType: "模拟题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "m-2026-陕晋宁青", title: "2026届陕晋宁青高三地理模拟卷", province: "陕晋宁青", year: "2026", paperType: "模拟题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "m-2026-云南", title: "2026届云南省高三地理模拟卷", province: "云南", year: "2026", paperType: "模拟题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "m-2026-浙江1月", title: "2026届浙江省1月高三地理模拟卷", province: "浙江", year: "2026", paperType: "模拟题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "m-2026-广东", title: "2026届广东省高三地理模拟卷", province: "广东", year: "2026", paperType: "模拟题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "m-2026-浙江6月", title: "2026届浙江省6月高三地理模拟卷", province: "浙江", year: "2026", paperType: "模拟题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "m-2026-江苏", title: "2026届江苏省高三地理模拟卷", province: "江苏", year: "2026", paperType: "模拟题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" },
    { id: "m-2026-河南", title: "2026届河南省高三地理模拟卷", province: "河南", year: "2026", paperType: "模拟题", url: "", hasAnswer: true, hasAnalysis: false, dateAdded: "2026-08-22" }
  ],

  questions: []
};
