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
    topics: ["地球运动", "大气与气候", "天气系统", "水循环与水资源", "海水与洋流", "地质与地貌", "整体性与差异性", "自然灾害"]
  },
  {
    group: "人文地理",
    topics: ["人口", "城镇与城市化", "农业", "工业", "服务业与区位", "交通"]
  },
  {
    group: "区域与国家安全",
    topics: ["区域发展", "资源、环境与国家安全", "地理信息技术", "世界区域", "中国区域"]
  }
];

const RESOURCES = {
  provinces: ["江苏", "全国", "北京", "上海", "天津", "浙江", "山东", "广东", "湖南", "湖北", "海南", "辽宁", "福建", "河北", "重庆", "安徽"],

  papers: [
    {
      id: "paper-001",
      title: "2025年江苏省普通高中学业水平选择性考试·地理",
      province: "江苏",
      year: "2025",
      paperType: "高考真题",
      url: "",
      hasAnswer: true,
      hasAnalysis: true,
      dateAdded: "2026-08-22"
    },
    {
      id: "paper-002",
      title: "2024年江苏省普通高中学业水平选择性考试·地理",
      province: "江苏",
      year: "2024",
      paperType: "高考真题",
      url: "",
      hasAnswer: true,
      hasAnalysis: false,
      dateAdded: "2026-08-22"
    },
    {
      id: "paper-003",
      title: "2025年全国新课标卷·地理",
      province: "全国",
      year: "2025",
      paperType: "高考真题",
      url: "",
      hasAnswer: true,
      hasAnalysis: true,
      dateAdded: "2026-08-22"
    },
    {
      id: "paper-004",
      title: "2026届江苏高三地理模拟卷(一)",
      province: "江苏",
      year: "2026",
      paperType: "模拟题",
      url: "",
      hasAnswer: true,
      hasAnalysis: false,
      dateAdded: "2026-08-22"
    }
  ],

  questions: [
    {
      id: "q-001",
      paperId: "paper-001",
      number: "1~2",
      topic: "地球运动",
      desc: "以某天文观测站为背景,考查地球自转与太阳视运动、地方时计算",
      keywords: "太阳方位,地方时,自转",
      dateAdded: "2026-08-22"
    },
    {
      id: "q-002",
      paperId: "paper-001",
      number: "5~7",
      topic: "地质与地貌",
      desc: "以某河流阶地为背景,考查流水侵蚀地貌与阶地形成过程",
      keywords: "河流阶地,流水侵蚀,地貌",
      dateAdded: "2026-08-22"
    },
    {
      id: "q-003",
      paperId: "paper-001",
      number: "17(2)",
      topic: "农业",
      desc: "分析某地特色农业的区位条件与发展措施",
      keywords: "农业区位,可持续发展",
      dateAdded: "2026-08-22"
    },
    {
      id: "q-004",
      paperId: "paper-002",
      number: "3~4",
      topic: "天气系统",
      desc: "结合天气图判读锋面系统过境时的天气变化",
      keywords: "冷锋,暖锋,天气图",
      dateAdded: "2026-08-22"
    },
    {
      id: "q-005",
      paperId: "paper-002",
      number: "16",
      topic: "海水与洋流",
      desc: "考查洋流分布规律及其对地理环境的影响",
      keywords: "洋流,渔场,气候",
      dateAdded: "2026-08-22"
    },
    {
      id: "q-006",
      paperId: "paper-003",
      number: "1~3",
      topic: "地球运动",
      desc: "以日影观测为背景,考查太阳高度角与昼夜长短变化",
      keywords: "太阳高度角,昼夜长短",
      dateAdded: "2026-08-22"
    },
    {
      id: "q-007",
      paperId: "paper-003",
      number: "9~11",
      topic: "资源、环境与国家安全",
      desc: "以某国能源结构为背景,考查能源安全与碳排放",
      keywords: "能源安全,碳达峰",
      dateAdded: "2026-08-22"
    },
    {
      id: "q-008",
      paperId: "paper-004",
      number: "1~2",
      topic: "地球运动",
      desc: "模拟题:考查太阳直射点移动与季节判断",
      keywords: "直射点,季节",
      dateAdded: "2026-08-22"
    },
    {
      id: "q-009",
      paperId: "paper-004",
      number: "18",
      topic: "城镇与城市化",
      desc: "分析某城市群城镇体系与城市化进程的问题",
      keywords: "城市群,城市化",
      dateAdded: "2026-08-22"
    }
  ]
};
