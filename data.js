// ============================================================
// 高三地理教学资源库 - 数据文件
// 管理页通过 GitHub API 修改此文件,站点自动更新
// ============================================================
// 数据结构说明:
// exams   : 试题库(真题/模拟题)
// templates: 答题模板库(背诵版 + 默写版)
// links   : 拓展视野库(外链资源)
// ============================================================

const RESOURCES = {
  exams: [
    {
      id: "exam-001",
      title: "2025年江苏省普通高中学业水平选择性考试·地理",
      year: "2025",
      examType: "江苏卷",
      topic: "综合",
      questionType: "综合卷",
      tags: ["自然地理", "人文地理", "区域地理"],
      link: "#",
      hasAnswer: true,
      hasAnalysis: true,
      dateAdded: "2026-08-22"
    },
    {
      id: "exam-002",
      title: "2024年江苏省普通高中学业水平选择性考试·地理",
      year: "2024",
      examType: "江苏卷",
      topic: "综合",
      questionType: "综合卷",
      tags: ["自然地理", "人文地理", "区域地理"],
      link: "#",
      hasAnswer: true,
      hasAnalysis: false,
      dateAdded: "2026-08-22"
    },
    {
      id: "exam-003",
      title: "2025年新课标全国卷·地理",
      year: "2025",
      examType: "全国卷",
      topic: "综合",
      questionType: "综合卷",
      tags: ["自然地理", "人文地理"],
      link: "#",
      hasAnswer: true,
      hasAnalysis: true,
      dateAdded: "2026-08-22"
    }
  ],

  templates: [
    {
      id: "tpl-001",
      title: "气候类型判读答题模板",
      category: "自然地理",
      topic: "气候",
      memorizeContent: "【背诵版】\n第一步:定位(纬度位置 + 海陆位置)\n第二步:读图(气温曲线 + 降水柱状图)\n第三步:判断(以温定球、以温定带、以水定型)\n常用表述:该地位于XX纬度附近,受XX气候控制,终年XX,气温年较差XX,降水集中XX季节。",
      dictationContent: "【默写版】\n第一步:定位(________ + ________)\n第二步:读图(________ + ________)\n第三步:判断(________、________、________)\n常用表述:该地位于____纬度附近,受____气候控制,终年____,气温年较差____,降水集中____季节。",
      tags: ["气候", "判读技巧"],
      dateAdded: "2026-08-22"
    },
    {
      id: "tpl-002",
      title: "河流水文特征分析模板",
      category: "自然地理",
      topic: "水文",
      memorizeContent: "【背诵版】\n水位:高低、季节变化大小\n流量:大小、季节变化\n含沙量:大小(取决于植被覆盖)\n结冰期:有无、长短\n汛期:春汛/夏汛/凌汛\n流速:快慢(取决于落差)\n水能:丰富程度",
      dictationContent: "【默写版】\n水位:____、________\n流量:____、________\n含沙量:____(取决于________)\n结冰期:____、____\n汛期:____/____/____\n流速:____(取决于________)\n水能:____",
      tags: ["河流", "水文特征"],
      dateAdded: "2026-08-22"
    },
    {
      id: "tpl-003",
      title: "工业区位因素分析模板",
      category: "人文地理",
      topic: "工业",
      memorizeContent: "【背诵版】\n自然因素:水源、土地、原料\n经济因素:市场、交通、劳动力、技术、资金\n社会因素:政策、个人偏好、工业惯性\n环境因素:污染类型与风向/水源/距离\n答题思路:主导因素 + 有利条件 + 不利条件 + 发展方向",
      dictationContent: "【默写版】\n自然因素:____、____、____\n经济因素:____、____、____、____、____\n社会因素:____、____、____\n环境因素:________\n答题思路:____ + ____ + ____ + ____",
      tags: ["工业", "区位分析"],
      dateAdded: "2026-08-22"
    }
  ],

  links: [
    {
      id: "link-001",
      title: "中国国家地理网",
      url: "https://www.dili360.com",
      category: "地理资讯",
      description: "权威地理资讯、精美地理图片、深度报道",
      status: "active",
      lastChecked: "2026-08-22",
      dateAdded: "2026-08-22"
    },
    {
      id: "link-002",
      title: "中国科学院地理科学与资源研究所",
      url: "https://www.igsnrr.ac.cn",
      category: "科研机构",
      description: "地理科学前沿研究、学术资源",
      status: "active",
      lastChecked: "2026-08-22",
      dateAdded: "2026-08-22"
    },
    {
      id: "link-003",
      title: "中国气象局·中国天气网",
      url: "https://www.weather.com.cn",
      category: "气象数据",
      description: "实时天气、气象科普、气候数据查询",
      status: "active",
      lastChecked: "2026-08-22",
      dateAdded: "2026-08-22"
    },
    {
      id: "link-004",
      title: "国家地理信息公共服务平台(天地图)",
      url: "https://www.tianditu.gov.cn",
      category: "地图工具",
      description: "权威在线地图、行政区划、地理信息查询",
      status: "active",
      lastChecked: "2026-08-22",
      dateAdded: "2026-08-22"
    }
  ]
};
