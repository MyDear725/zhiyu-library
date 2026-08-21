export type KnowledgeChunk = {
  id: string;
  title: string;
  content: string;
  keywords: string[];
};

export const libraryKnowledge: KnowledgeChunk[] = [
  {
    id: "account",
    title: "账户注册与登录",
    content: "学生使用 8 至 12 位数字学号注册账户。密码至少 8 位，经过独立盐值和 PBKDF2-SHA256 派生后保存。登录后，借阅清单、座位预约、社区订单和学习场景选择会与学号关联。",
    keywords: ["注册", "登录", "学号", "密码", "账户", "忘记密码"],
  },
  {
    id: "seat-status",
    title: "座位状态与选座",
    content: "座位地图包含空闲、使用中、暂离和已选择四种状态。只有空闲座位可以预约。用户可以切换楼层、放大地图并直接点击座位完成选择。",
    keywords: ["座位", "空闲", "使用中", "暂离", "选座", "地图", "楼层"],
  },
  {
    id: "reservation",
    title: "预约、签到与签退",
    content: "选择使用时段和空闲座位后即可确认预约。到馆后需在预约开始后 30 分钟内扫描桌面二维码签到。离馆时可在“我的—当前预约”中点击离馆签退，系统会结束本次座位使用。",
    keywords: ["预约", "签到", "签退", "二维码", "迟到", "离馆", "取消预约"],
  },
  {
    id: "study-match",
    title: "学习场景匹配",
    content: "占座页会询问用户是专注自习、讨论解题、阅读查找还是其他安排。讨论场景还可选择问题方向。系统根据时段和同类需求推荐区域，仅显示聚合人数，不公开其他用户的姓名或学号。",
    keywords: ["场景匹配", "学习搭子", "讨论", "解题", "自习", "推荐区域", "同学"],
  },
  {
    id: "books",
    title: "馆藏搜索与借阅清单",
    content: "借书页支持按照书名、作者和索书号搜索馆藏，同时提供相似书籍与相关领域推荐。不知道读什么时，可以完成三个阅读偏好问题获得书目建议，并将感兴趣的书加入借阅清单。",
    keywords: ["借书", "图书", "馆藏", "索书号", "作者", "推荐", "借阅清单", "读什么"],
  },
  {
    id: "delivery",
    title: "馆内补给配送",
    content: "社区补给站提供咖啡、面包、轻食和饮品。配送服务要求用户已有有效座位预约，确认支付后工作人员会按照预约楼层和座位号送达。订单提交后可以在补给站查看配送位置和制作状态。",
    keywords: ["咖啡", "面包", "轻食", "补给", "配送", "送到座位", "订单", "支付", "工作人员"],
  },
  {
    id: "community-chat",
    title: "公共交流与社区规范",
    content: "同伴广场设有学习搭子、课程交流和竞赛组队三个公开频道。请勿发布手机号、密码等敏感信息，不刷屏、不进行人身攻击，也不要直接传播课程作业答案。所有公开消息对已登录用户可见。",
    keywords: ["聊天", "社区", "学习搭子", "课程", "竞赛", "组队", "公开", "隐私", "消息"],
  },
  {
    id: "opening",
    title: "开放与使用说明",
    content: "演示系统中的总馆开放时间为 08:00—22:00。馆内请保持适合所在区域的音量，静音区避免交谈，讨论需求应优先选择系统推荐的协作区域。",
    keywords: ["开放时间", "几点", "闭馆", "开馆", "静音", "音量", "规则"],
  },
];

function normalizedText(value: string) {
  return value.toLowerCase().replace(/[\s，。！？、；：,.!?;:'"“”‘’（）()\-—]/g, "");
}

export function retrieveKnowledge(question: string, limit = 3) {
  const normalized = normalizedText(question);
  const scored = libraryKnowledge.map((chunk) => {
    let score = 0;
    for (const keyword of chunk.keywords) {
      const normalizedKeyword = normalizedText(keyword);
      if (normalized.includes(normalizedKeyword)) score += Math.max(4, normalizedKeyword.length * 2);
      for (const character of new Set(normalizedKeyword.split(""))) {
        if (normalized.includes(character)) score += .12;
      }
    }
    if (normalized.includes(normalizedText(chunk.title))) score += 8;
    return { ...chunk, score };
  }).sort((a, b) => b.score - a.score);
  const relevant = scored.filter((chunk) => chunk.score >= 1).slice(0, limit);
  return relevant.length ? relevant : [{ ...libraryKnowledge[2], score: 0 }, { ...libraryKnowledge[4], score: 0 }];
}
