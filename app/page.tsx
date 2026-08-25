"use client";

import Image from "next/image";
import { FormEvent, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { communityProducts } from "../lib/community/catalog";
import {
  LIBRARY_TIME_SLOTS,
  LIBRARY_TIME_ZONE,
  isLibraryTimeSlot,
  libraryDate,
  libraryDateLabel,
  type LibraryTimeSlot,
} from "../lib/library/time";
import type { Candidate as StudyCandidate } from "../lib/study-match/engine";
import { MotionStage } from "./motion-stage";
import { LibrarianView } from "../components/libraryos/LibrarianView";
import { KnowledgeTwin } from "../components/libraryos/KnowledgeTwin";
import { IntelligenceView } from "../components/libraryos/IntelligenceView";

type View = "home" | "seats" | "books" | "community" | "mine" | "librarian" | "intelligence";
type BookCategory = "全部" | "文学" | "社科" | "设计" | "科技";

type User = { id: number; studentId: string; name: string };
type SeatStatus = "free" | "using" | "away" | "reserved";
type SeatRecord = {
  id: number;
  floor: string;
  label: string;
  zone: string;
  status: SeatStatus;
  mapX: number;
  mapY: number;
  updatedAt: string;
};
type ReservationRecord = {
  id: number;
  bookingDate: string;
  timeSlot: string;
  floor: string;
  seatLabel: string;
  zone: string;
};

type StudyPurpose = "focus" | "discuss" | "read" | "other";
type StudyTopic = "tech" | "design" | "competition" | "course" | "other";
type StudyIntentResult = {
  purpose: StudyPurpose;
  topic: StudyTopic | null;
  recommendation: StudyCandidate;
  alternatives: StudyCandidate[];
  generatedAt: string;
};

type CommunityTab = "market" | "chat" | "assistant";
type CommunityRoom = "study" | "course" | "hackathon";
type CommunityOrder = {
  id: number;
  items: Array<{ id: string; name: string; quantity: number; priceCents: number }>;
  totalCents: number;
  deliveryFloor: string;
  deliverySeat: string;
  status: "paid" | "preparing" | "delivering" | "delivered";
  createdAt: string;
};
type CommunityMessage = {
  id: number;
  userId: number | null;
  name: string;
  studentId: string | null;
  room: string;
  content: string;
  isAnonymous: boolean;
  isMine: boolean;
  isSystem: boolean;
  createdAt: string;
};
type AssistantTurn = {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ id: string; title: string }>;
  mode?: "llm" | "retrieval";
};

type Book = {
  id: number;
  title: string;
  author: string;
  category: Exclude<BookCategory, "全部">;
  callNumber: string;
  location: string;
  available: number;
  total: number;
  color: string;
  mark: string;
  description: string;
};

const books: Book[] = [
  {
    id: 1,
    title: "百年孤独",
    author: "加西亚·马尔克斯",
    category: "文学",
    callNumber: "I775.45 / 12",
    location: "三层文学区 · 18架",
    available: 2,
    total: 4,
    color: "ochre",
    mark: "百年",
    description: "以马孔多家族七代人的故事，书写孤独、记忆与拉丁美洲的百年历史。",
  },
  {
    id: 2,
    title: "置身事内：中国政府与经济发展",
    author: "兰小欢",
    category: "社科",
    callNumber: "F12 / 286",
    location: "四层社科区 · 07架",
    available: 3,
    total: 6,
    color: "brick",
    mark: "事内",
    description: "从地方政府运行机制出发，理解中国经济发展中的现实逻辑。",
  },
  {
    id: 3,
    title: "设计心理学",
    author: "唐纳德·诺曼",
    category: "设计",
    callNumber: "TB47 / 91",
    location: "二层艺术区 · 12架",
    available: 1,
    total: 3,
    color: "navy",
    mark: "设计",
    description: "从日常物品出发，解释可见性、反馈、映射和以人为本的设计原则。",
  },
  {
    id: 4,
    title: "芯片战争：世界最关键技术的争夺战",
    author: "克里斯·米勒",
    category: "科技",
    callNumber: "TN4 / 203",
    location: "五层科技区 · 24架",
    available: 0,
    total: 5,
    color: "green",
    mark: "芯片",
    description: "梳理半导体产业的发展、全球分工以及技术竞争背后的地缘格局。",
  },
  {
    id: 5,
    title: "额尔古纳河右岸",
    author: "迟子建",
    category: "文学",
    callNumber: "I247.57 / 844",
    location: "三层文学区 · 26架",
    available: 4,
    total: 7,
    color: "forest",
    mark: "右岸",
    description: "以一位鄂温克族老人的口吻，讲述民族迁徙、自然与生命的故事。",
  },
  {
    id: 6,
    title: "人类简史：从动物到上帝",
    author: "尤瓦尔·赫拉利",
    category: "社科",
    callNumber: "K02 / 117",
    location: "四层社科区 · 02架",
    available: 2,
    total: 8,
    color: "sand",
    mark: "简史",
    description: "从认知革命、农业革命到科技革命，重新审视人类社会的发展路径。",
  },
  {
    id: 7,
    title: "乡土中国",
    author: "费孝通",
    category: "社科",
    callNumber: "C912.82 / 31",
    location: "四层社科区 · 11架",
    available: 5,
    total: 9,
    color: "ochre",
    mark: "乡土",
    description: "从乡土社会的结构、秩序与人际关系出发，理解中国社会的基本肌理。",
  },
  {
    id: 8,
    title: "月亮与六便士",
    author: "威廉·萨默塞特·毛姆",
    category: "文学",
    callNumber: "I561.45 / 182",
    location: "三层文学区 · 09架",
    available: 3,
    total: 6,
    color: "navy",
    mark: "月亮",
    description: "借一位画家的出走，追问理想、世俗生活与个人选择之间的张力。",
  },
  {
    id: 9,
    title: "创新者的窘境",
    author: "克莱顿·克里斯坦森",
    category: "设计",
    callNumber: "F273.1 / 76",
    location: "二层创新区 · 05架",
    available: 2,
    total: 4,
    color: "brick",
    mark: "创新",
    description: "解释成熟组织为何会错失破坏式创新，以及产品与组织如何面对技术跃迁。",
  },
  {
    id: 10,
    title: "艺术的故事",
    author: "E.H.贡布里希",
    category: "设计",
    callNumber: "J110.9 / 48",
    location: "二层艺术区 · 03架",
    available: 1,
    total: 3,
    color: "sand",
    mark: "艺术",
    description: "沿着艺术史的重要节点，理解视觉表达、审美观念与时代语境的变化。",
  },
  {
    id: 11,
    title: "浪潮之巅",
    author: "吴军",
    category: "科技",
    callNumber: "F49 / 164",
    location: "五层科技区 · 18架",
    available: 4,
    total: 5,
    color: "green",
    mark: "浪潮",
    description: "以产业史视角回看科技公司的兴衰，理解技术浪潮与商业选择。",
  },
  {
    id: 12,
    title: "乌合之众",
    author: "古斯塔夫·勒庞",
    category: "社科",
    callNumber: "C912.64 / 22",
    location: "四层社科区 · 15架",
    available: 2,
    total: 7,
    color: "forest",
    mark: "群体",
    description: "从群体心理切入，讨论个体在群体中的判断、情绪与行动方式。",
  },
];

const relatedBookIds: Record<number, number[]> = {
  1: [6, 7, 10],
  2: [3, 4, 9],
  3: [4, 2, 11],
  4: [2, 9, 6],
  5: [7, 6, 10],
  6: [4, 3, 10],
  7: [5, 3, 4],
  8: [10, 3, 7],
  9: [11, 2, 6],
  10: [8, 6, 4],
  11: [9, 2, 7],
  12: [3, 4, 8],
};

const knowledgeThreads: Record<number, string[]> = {
  1: ["家族记忆", "拉美历史", "魔幻现实"],
  2: ["政府运行", "区域经济", "制度设计"],
  3: ["认知心理", "产品体验", "人机交互"],
  4: ["半导体", "产业政策", "国际关系"],
  5: ["民族叙事", "生态文学", "现代化"],
  6: ["文明演化", "经济制度", "科技革命"],
  7: ["社会结构", "文化传统", "城乡变迁"],
  8: ["艺术理想", "个体选择", "社会规范"],
  9: ["破坏式创新", "组织管理", "技术周期"],
  10: ["艺术史", "视觉表达", "时代文化"],
  11: ["科技产业", "商业模式", "创新周期"],
  12: ["群体心理", "传播机制", "社会行为"],
};

const similarityReasons: Record<string, string> = {
  "1-5": "都以个人与家族记忆书写时代变迁",
  "1-8": "都关注个人选择与现实生活之间的冲突",
  "5-8": "都通过人物命运追问理想与归属",
  "2-6": "都从宏观视角解释社会与经济如何演变",
  "2-7": "都从中国社会结构出发理解现实运行逻辑",
  "2-12": "都关注制度环境如何影响群体行为",
  "6-7": "都从历史与社会结构解释文明的发展",
  "6-12": "都试图理解群体如何塑造人类社会",
  "7-12": "都关注社会关系与群体行为的形成",
  "3-9": "都讨论产品决策与创新如何回应真实需求",
  "3-10": "都帮助理解视觉感受与审美判断的形成",
  "9-10": "都呈现观念变化如何推动行业革新",
  "4-11": "都以产业史梳理关键技术与公司的兴衰",
};

const readingQuizQuestions = [
  {
    label: "阅读期待",
    question: "今天更想从一本书里得到什么？",
    options: [
      { title: "沉浸在一个好故事里", note: "跟随人物进入另一段人生", bookIds: [1, 5, 8] },
      { title: "更好地理解现实世界", note: "看懂社会、经济与人的选择", bookIds: [2, 7, 12, 6] },
      { title: "获得设计与创新灵感", note: "发现产品、艺术与创意方法", bookIds: [3, 9, 10] },
      { title: "了解科技与未来趋势", note: "追踪技术、产业与时代变化", bookIds: [4, 11, 6] },
    ],
  },
  {
    label: "内容偏好",
    question: "哪类内容更容易吸引你？",
    options: [
      { title: "人物、情感与命运", note: "从具体的人生感受世界", bookIds: [1, 5, 8, 12] },
      { title: "社会、历史与制度", note: "理解现实背后的运行逻辑", bookIds: [2, 6, 7, 12] },
      { title: "产品、艺术与创意", note: "关注体验、表达与创新", bookIds: [3, 10, 9, 11] },
      { title: "技术、商业与产业", note: "观察技术浪潮如何发生", bookIds: [4, 11, 9, 2] },
    ],
  },
  {
    label: "阅读节奏",
    question: "你希望这次阅读是什么节奏？",
    options: [
      { title: "轻松进入，顺畅读完", note: "希望内容好读、有吸引力", bookIds: [8, 7, 11, 3] },
      { title: "慢下来，感受与思考", note: "愿意留时间体会细节", bookIds: [1, 5, 10, 12] },
      { title: "建立完整的知识框架", note: "希望系统理解一个主题", bookIds: [2, 4, 6, 9] },
    ],
  },
];

const quizRecommendationCopy: Record<number, string> = {
  1: "家族传奇与魔幻现实交织，适合想沉浸在宏大故事中的你。",
  2: "从真实运行机制理解中国经济，观点清晰且贴近现实。",
  3: "用日常案例解释设计原则，适合寻找产品与创新灵感。",
  4: "从半导体切入全球产业竞争，适合关注科技趋势的读者。",
  5: "以细腻叙事连接民族、自然与时代，适合安静慢读。",
  6: "用宏观框架串联文明演化，适合建立系统性的历史视角。",
  7: "篇幅精炼、观点经典，是理解中国社会结构的轻盈入口。",
  8: "故事流畅而富有思考，适合关注理想与个人选择的读者。",
  9: "用成熟案例解释创新困境，适合关注产品与组织变化的人。",
  10: "沿艺术史理解视觉表达，适合拓展审美与创意视野。",
  11: "以科技公司兴衰讲述产业浪潮，内容清晰且富有故事性。",
  12: "从群体心理观察社会行为，适合对人与群体关系好奇的你。",
};

const floorInfo = [
  { floor: "一层", code: "1F", free: 42, total: 96, note: "综合阅览区" },
  { floor: "二层", code: "2F", free: 85, total: 160, note: "人文与艺术" },
  { floor: "三层", code: "3F", free: 128, total: 220, note: "静音自习区" },
  { floor: "四层", code: "4F", free: 57, total: 112, note: "社科与研修" },
];

const studyPurposes: { value: StudyPurpose; index: string; label: string; note: string }[] = [
  { value: "focus", index: "01", label: "专注自习", note: "安静完成个人任务" },
  { value: "discuss", index: "02", label: "讨论解题", note: "与同伴共同解决问题" },
  { value: "read", index: "03", label: "阅读查找", note: "阅读或检索资料" },
  { value: "other", index: "04", label: "其他安排", note: "更灵活的空间需求" },
];

const studyTopics: { value: StudyTopic; label: string }[] = [
  { value: "tech", label: "编程与技术" },
  { value: "design", label: "产品与设计" },
  { value: "competition", label: "竞赛项目" },
  { value: "course", label: "课程作业" },
  { value: "other", label: "其他问题" },
];

function floorName(code: string) {
  return ({ "1F": "一层", "2F": "二层", "3F": "三层", "4F": "四层" } as Record<string, string>)[code] ?? code;
}

function LibraryMark() {
  return (
    <span className="library-mark" aria-hidden="true"><Image src="/icons/books.svg" alt="" width={29} height={29} unoptimized /></span>
  );
}

function AuthView({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (mode === "register" && password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, name, password }),
      });
      const data = await response.json() as { user?: User; error?: string };
      if (!response.ok || !data.user) throw new Error(data.error || "操作失败，请稍后重试");
      onAuthenticated(data.user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "操作失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(nextMode: "login" | "register") {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="auth-brand"><LibraryMark /><span><strong>知遇图书馆</strong><small>大连理工大学 · 总馆</small></span></div>
        <div className="auth-message"><span>欢迎回来</span><h1>让阅读与空间，<br />恰好遇见你。</h1><p>从一本书、一张座位，到一群同路的人，在这里开启今天的学习旅程。</p></div>
      </section>

      <section className="auth-form-wrap">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-form-heading"><span>{mode === "login" ? "学生登录" : "首次注册"}</span><h2>{mode === "login" ? "登录图书馆账户" : "创建你的账户"}</h2><p>{mode === "login" ? "使用学号和密码继续" : "注册后，预约和借阅记录会与你的学号绑定"}</p></div>
          <div className="auth-tabs" role="tablist"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>登录</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>注册</button></div>
          {mode === "register" && <label><span>姓名</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入真实姓名" autoComplete="name" required /></label>}
          <label><span>学号</span><input value={studentId} onChange={(event) => setStudentId(event.target.value.replace(/\D/g, ""))} placeholder="请输入 8—12 位学号" inputMode="numeric" autoComplete="username" required /></label>
          <label><span>密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "register" ? "至少 8 位" : "请输入密码"} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></label>
          {mode === "register" && <label><span>确认密码</span><input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="再次输入密码" autoComplete="new-password" required /></label>}
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "请稍候…" : mode === "login" ? "登录" : "注册并登录"}</button>
          <p className="auth-security">密码经加盐摘要后存储，系统不会保存明文密码。</p>
        </form>
      </section>
    </main>
  );
}

function Header({ view, setView, user, onLogout }: { view: View; setView: (view: View) => void; user: User; onLogout: () => void }) {
  const nav: Array<{ id: View; label: string }> = [
    { id: "home", label: "首页" },
    { id: "books", label: "借书" },
    { id: "seats", label: "占座" },
    { id: "community", label: "社区" },
    { id: "librarian", label: "AI馆员" },
    { id: "mine", label: "我的" },
  ];

  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="site-brand" onClick={() => setView("home")} aria-label="返回首页">
          <LibraryMark />
          <span>
            <strong>知遇图书馆</strong>
            <small>大连理工大学 · 总馆</small>
          </span>
        </button>

        <nav className="site-nav" aria-label="主要服务">
          {nav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => setView(item.id)}
              aria-current={view === item.id ? "page" : undefined}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="header-user">
          <button className="account-button" onClick={() => setView("mine")}><span><strong>{user.name}</strong><small>{user.studentId}</small></span><i>{user.name.slice(0, 1)}</i></button>
          <button className="logout-button" onClick={onLogout}>退出</button>
        </div>
      </div>
    </header>
  );
}

function BookCover({ book, small = false }: { book: Book; small?: boolean }) {
  return (
    <div className={`book-cover ${book.color} ${small ? "small" : ""}`} aria-hidden="true">
      <span>大工图书馆</span>
      <strong>{book.mark}</strong>
      <i>{book.author}</i>
    </div>
  );
}

function HomeView({
  setView,
  user,
}: {
  setView: (view: View) => void;
  user: User;
}) {
  return (
    <main className="page portal-home">
      <header className="portal-intro">
        <span>欢迎回来，{user.name}</span>
        <h1>今天来图书馆，想先做什么？</h1>
        <p>找一本书，或者选个座位开始学习。</p>
      </header>

      <button className="libraryos-home-entry" onClick={() => setView("librarian")}>
        <span>LIBRARYOS / ACTION AI LIBRARIAN</span>
        <strong>不必先选择功能，先告诉图书馆你想完成什么。 <i>→</i></strong>
        <small>知识 × 空间 × 同伴，一次编排为可执行行动。</small>
      </button>

      <section className="portal-primary-grid" aria-label="主要图书馆服务">
        <button className="portal-card portal-choice portal-books" onClick={() => setView("books")}>
          <div className="portal-card-copy">
            <span>馆藏发现</span>
            <h2>借一本书</h2>
            <p>搜索馆藏，找到你想读的书。</p>
          </div>
          <Image className="portal-illustration" src="/icons/books.svg" alt="" width={108} height={108} unoptimized aria-hidden="true" />
          <span className="portal-card-footer">
            <span className="portal-link">去借书 <Image src="/icons/arrow-right.svg" alt="" width={24} height={24} unoptimized /></span>
          </span>
        </button>

        <button className="portal-card portal-choice portal-seats" onClick={() => setView("seats")}>
          <div className="portal-card-copy">
            <span>空间预约</span>
            <h2>选一个座位</h2>
            <p>浏览楼层地图，选择合适的座位。</p>
          </div>
          <Image className="portal-seat-icon" src="/icons/armchair.svg" alt="" width={92} height={92} unoptimized aria-hidden="true" />
          <span className="portal-card-footer portal-seat-footer">
            <span className="portal-primary-action">去占座 <Image src="/icons/arrow-right.svg" alt="" width={24} height={24} unoptimized /></span>
            <span className="portal-seat-status">
              <small>3F 静音区</small>
              <strong>还有 <em>34</em> 个座位</strong>
              <i><Image src="/icons/map-pin.svg" alt="" width={22} height={22} unoptimized /> 实时更新</i>
            </span>
          </span>
        </button>
      </section>

      <button className="portal-community" onClick={() => setView("community")}>
        <span className="portal-community-icon-wrap">
          <Image className="portal-community-icon" src="/icons/chat-circle-dots.svg" alt="" width={48} height={48} unoptimized aria-hidden="true" />
        </span>
        <span className="portal-community-copy">
          <small>馆内社区</small>
          <strong>连接与补给</strong>
          <span>补给配送、学习搭子和馆内问答，都在这里。</span>
        </span>
        <span className="portal-community-link">进入社区 <Image src="/icons/arrow-right.svg" alt="" width={24} height={24} unoptimized /></span>
      </button>
    </main>
  );
}

const communityRooms: Array<{ id: CommunityRoom; label: string; note: string; mark: string }> = [
  { id: "study", label: "学习搭子", note: "分享目标与自习时段", mark: "伴" },
  { id: "course", label: "课程交流", note: "交换资料与解题思路", mark: "课" },
  { id: "hackathon", label: "竞赛组队", note: "寻找方向互补的队友", mark: "赛" },
];

const orderStatusText: Record<CommunityOrder["status"], string> = {
  paid: "已支付",
  preparing: "制作中",
  delivering: "配送中",
  delivered: "已送达",
};

function communityTime(value: string) {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "刚刚";
  return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function CommunityView({
  reservation,
  showToast,
  user,
}: {
  reservation: ReservationRecord | null;
  showToast: (message: string) => void;
  user: User;
}) {
  const [tab, setTab] = useState<CommunityTab>("market");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<CommunityOrder[]>([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [room, setRoom] = useState<CommunityRoom>("study");
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [anonymousMessage, setAnonymousMessage] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantTurns, setAssistantTurns] = useState<AssistantTurn[]>([
    { id: 1, role: "assistant", content: "你好，我是馆内助手。可以问我如何选座、签到签退、借书、使用社区补给，或了解馆内规则。" },
  ]);

  const cartItems = useMemo(() => communityProducts
    .filter((product) => (cart[product.id] ?? 0) > 0)
    .map((product) => ({ ...product, quantity: cart[product.id] })), [cart]);
  const cartTotal = cartItems.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  useEffect(() => {
    fetch("/api/community/orders")
      .then(async (response) => response.ok ? response.json() as Promise<{ orders: CommunityOrder[] }> : { orders: [] })
      .then((data) => setOrders(data.orders));
  }, []);

  useEffect(() => {
    if (tab !== "chat") return;
    let active = true;
    async function loadMessages(silent = false) {
      if (!silent) setChatLoading(true);
      try {
        const response = await fetch(`/api/community/messages?room=${room}`);
        if (!response.ok) return;
        const data = await response.json() as { messages: CommunityMessage[] };
        if (active) setMessages(data.messages);
      } finally {
        if (active && !silent) setChatLoading(false);
      }
    }
    void loadMessages();
    const timer = window.setInterval(() => void loadMessages(true), 6000);
    return () => { active = false; window.clearInterval(timer); };
  }, [tab, room]);

  function changeQuantity(productId: string, change: number) {
    setCart((current) => {
      const next = Math.max(0, Math.min(5, (current[productId] ?? 0) + change));
      const updated = { ...current };
      if (next === 0) delete updated[productId];
      else updated[productId] = next;
      return updated;
    });
  }

  async function placeOrder() {
    if (!reservation || cartItems.length === 0 || placingOrder) return;
    setPlacingOrder(true);
    try {
      const response = await fetch("/api/community/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cartItems.map((item) => ({ id: item.id, quantity: item.quantity })) }),
      });
      const data = await response.json() as { order?: CommunityOrder; error?: string };
      if (!response.ok || !data.order) throw new Error(data.error || "订单提交失败");
      setOrders((current) => [data.order!, ...current].slice(0, 5));
      setCart({});
      showToast(`支付成功，补给将送往 ${data.order.deliveryFloor} ${data.order.deliverySeat}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "订单提交失败");
    } finally {
      setPlacingOrder(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = chatInput.trim();
    if (!content || sendingMessage) return;
    setSendingMessage(true);
    try {
      const response = await fetch("/api/community/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, content, anonymous: anonymousMessage }),
      });
      const data = await response.json() as { message?: CommunityMessage; error?: string };
      if (!response.ok || !data.message) throw new Error(data.error || "消息发送失败");
      setMessages((current) => [...current, data.message!]);
      setChatInput("");
      showToast(anonymousMessage ? "已匿名发布到同伴广场" : "消息已发布");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "消息发送失败");
    } finally {
      setSendingMessage(false);
    }
  }

  async function askAssistant(event?: FormEvent, suggestedQuestion?: string) {
    event?.preventDefault();
    const question = (suggestedQuestion ?? assistantInput).trim();
    if (!question || assistantLoading) return;
    const userTurn: AssistantTurn = { id: Date.now(), role: "user", content: question };
    setAssistantTurns((current) => [...current, userTurn]);
    setAssistantInput("");
    setAssistantLoading(true);
    try {
      const response = await fetch("/api/community/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await response.json() as { answer?: string; sources?: Array<{ id: string; title: string }>; mode?: "llm" | "retrieval"; error?: string };
      if (!response.ok || !data.answer) throw new Error(data.error || "暂时无法回答");
      setAssistantTurns((current) => [...current, { id: Date.now() + 1, role: "assistant", content: data.answer!, sources: data.sources, mode: data.mode }]);
    } catch (error) {
      setAssistantTurns((current) => [...current, { id: Date.now() + 1, role: "assistant", content: error instanceof Error ? error.message : "暂时无法回答，请稍后再试。" }]);
    } finally {
      setAssistantLoading(false);
    }
  }

  return (
    <main className="page community-page">
      <section className="community-hero">
        <div className="community-hero-copy"><span>LIBRARY COMMONS</span><h1>图书馆社区</h1><p>一份及时的补给，一次恰好的相遇，一处随时可问的馆内入口。</p></div>
        <div className="community-hero-services" aria-label="社区服务概览">
          <span><i>补</i><small>送至座位</small></span>
          <span><i>伴</i><small>寻找同伴</small></span>
          <span><i>知</i><small>馆内问答</small></span>
        </div>
      </section>

      <nav className="community-tabs" aria-label="社区服务">
        {([
          { id: "market" as const, index: "01", label: "补给站", note: "送到座位" },
          { id: "chat" as const, index: "02", label: "同伴广场", note: "公开交流" },
          { id: "assistant" as const, index: "03", label: "馆内助手", note: "知识问答" },
        ]).map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)}><i>{item.index}</i><span><strong>{item.label}</strong><small>{item.note}</small></span></button>)}
      </nav>

      {tab === "market" && (
        <section className="community-market">
          <div className="market-catalog">
            <header className="community-section-heading"><div><span>馆内补给</span><h2>安静学习，也要好好吃饭</h2></div><p>采用轻包装配送，请在馆内指定区域低声取餐。</p></header>
            {orders[0] && <div className="active-order"><span><i />订单 #{orders[0].id}</span><strong>{orderStatusText[orders[0].status]}</strong><p>{orders[0].items.map((item) => `${item.name} × ${item.quantity}`).join("、")}</p><small>配送至 {orders[0].deliveryFloor} · {orders[0].deliverySeat}</small></div>}
            <div className="product-grid">
              {communityProducts.map((product) => {
                const quantity = cart[product.id] ?? 0;
                return <article className="community-product" key={product.id}>
                  <div className={`product-mark product-${product.category}`}><span>{product.mark}</span><small>{product.category}</small></div>
                  <div className="product-copy"><span>{product.category}</span><h3>{product.name}</h3><p>{product.description}</p><strong>¥{(product.priceCents / 100).toFixed(0)}</strong></div>
                  {quantity ? <div className="quantity-control"><button onClick={() => changeQuantity(product.id, -1)}>−</button><span>{quantity}</span><button onClick={() => changeQuantity(product.id, 1)}>＋</button></div> : <button className="add-product" onClick={() => changeQuantity(product.id, 1)}>加入</button>}
                </article>;
              })}
            </div>
          </div>
          <aside className="community-cart">
            <header><span>本次补给</span><strong>{cartItems.reduce((sum, item) => sum + item.quantity, 0)} 件</strong></header>
            <div className={`delivery-location${reservation ? " ready" : ""}`}><span>{reservation ? "配送位置" : "暂时无法配送"}</span><strong>{reservation ? `${reservation.floor} · ${reservation.seatLabel}` : "请先预约座位"}</strong><p>{reservation ? "工作人员将按当前预约送达" : "座位用于确认配送位置"}</p></div>
            <div className="cart-lines">
              {cartItems.length ? cartItems.map((item) => <div key={item.id}><span>{item.name}<small>× {item.quantity}</small></span><strong>¥{(item.priceCents * item.quantity / 100).toFixed(0)}</strong></div>) : <div className="empty-cart"><i>＋</i><span>从左侧选择咖啡或轻食</span></div>}
            </div>
            <div className="cart-total"><span>合计</span><strong>¥{(cartTotal / 100).toFixed(0)}</strong></div>
            <button className="pay-order" disabled={!reservation || cartItems.length === 0 || placingOrder} onClick={placeOrder}>{placingOrder ? "正在支付…" : "确认支付并配送"}</button>
            <small className="payment-note">演示支付 · 实际接入时由校园支付平台完成</small>
          </aside>
        </section>
      )}

      {tab === "chat" && (
        <section className="community-chat">
          <aside className="chat-rooms">
            <header><span>PUBLIC ROOMS</span><h2>同伴广场</h2><p>找到正在做相似事情的人。</p></header>
            {communityRooms.map((item) => <button key={item.id} className={room === item.id ? "active" : ""} onClick={() => setRoom(item.id)}><i>{item.mark}</i><span><strong>{item.label}</strong><small>{item.note}</small></span><b>→</b></button>)}
            <div className="community-safety"><strong>公开交流提醒</strong><p>请勿发布手机号、密码等敏感信息，尊重每一位交流者。</p></div>
          </aside>
          <div className="chat-panel">
            <header><div><span>#{room}</span><h2>{communityRooms.find((item) => item.id === room)?.label}</h2></div><small><i />正在同步 · 可选择匿名发布</small></header>
            <div className="message-stream" aria-live="polite">
              {chatLoading ? <div className="community-loading">正在进入频道…</div> : messages.map((message) => <article className={`${message.isMine ? "mine" : ""}${message.isSystem ? " system" : ""}${message.isAnonymous ? " anonymous" : ""}`.trim()} key={message.id}>
                <div className="message-avatar">{message.isSystem ? "馆" : message.isAnonymous ? "匿" : message.name.slice(0, 1)}</div>
                <div><header><strong>{message.name}{message.isAnonymous && <i>匿名</i>}</strong><span>{communityTime(message.createdAt)}</span></header><p>{message.content}</p></div>
              </article>)}
            </div>
            <div className="chat-prompts"><span>快速发布：</span>{["找一位今晚自习搭子", "有人一起讨论项目吗？", "寻找竞赛前端队友"].map((prompt) => <button key={prompt} onClick={() => setChatInput(prompt)}>{prompt}</button>)}</div>
            <form className="chat-composer" onSubmit={sendMessage}>
              <label className="chat-input"><span className="sr-only">输入公开消息</span><textarea value={chatInput} onChange={(event) => setChatInput(event.target.value.slice(0, 300))} placeholder="分享你的学习目标、时间或想讨论的问题…" rows={2} /></label>
              <div className="composer-footer">
                <label className={`anonymous-switch${anonymousMessage ? " active" : ""}`} htmlFor="anonymous-message">
                  <input id="anonymous-message" aria-label="匿名发布" type="checkbox" checked={anonymousMessage} onChange={(event) => setAnonymousMessage(event.target.checked)} />
                  <span aria-hidden="true"><i /></span>
                  <b><strong>匿名发布</strong><small>{anonymousMessage ? "其他同学不会看到你的姓名" : "以实名身份参与交流"}</small></b>
                </label>
                <div className="composer-submit"><small>{chatInput.length} / 300</small><button disabled={!chatInput.trim() || sendingMessage}>{sendingMessage ? "发送中…" : anonymousMessage ? "匿名发布" : "发送到频道"}</button></div>
              </div>
            </form>
          </div>
        </section>
      )}

      {tab === "assistant" && (
        <section className="community-assistant">
          <aside className="assistant-guide">
            <span>RAG KNOWLEDGE</span><h2>馆内助手</h2><p>先检索馆内知识，再由大模型组织回答。</p>
            <div className="rag-flow"><span><b>1</b>理解问题</span><i>→</i><span><b>2</b>检索知识</span><i>→</i><span><b>3</b>生成回答</span></div>
            <div className="knowledge-scope"><strong>当前知识范围</strong>{["选座与签到", "馆藏与借阅", "社区与配送", "开放规则"].map((item) => <span key={item}><i />{item}</span>)}</div>
            <small>回答仅用于馆内服务指引，重要事项请以服务台通知为准。</small>
          </aside>
          <div className="assistant-panel">
            <header><div className="assistant-avatar">知</div><div><h2>知遇 · 馆内助手</h2><span><i />知识库已连接</span></div></header>
            <div className="assistant-stream" aria-live="polite">
              {assistantTurns.map((turn) => <article className={turn.role} key={turn.id}><div>{turn.role === "assistant" ? "知" : user.name.slice(0, 1)}</div><section><p>{turn.content}</p>{turn.sources && <footer><span>{turn.mode === "llm" ? "大模型生成" : "知识库检索"}</span>{turn.sources.map((source) => <i key={source.id}>{source.title}</i>)}</footer>}</section></article>)}
              {assistantLoading && <article className="assistant"><div>知</div><section className="assistant-thinking"><i /><i /><i /></section></article>}
            </div>
            <div className="assistant-suggestions">{["预约后怎么签到？", "咖啡可以送到哪里？", "暂离状态是什么意思？"].map((question) => <button key={question} onClick={() => void askAssistant(undefined, question)}>{question}</button>)}</div>
            <form className="assistant-composer" onSubmit={(event) => void askAssistant(event)}><input value={assistantInput} onChange={(event) => setAssistantInput(event.target.value.slice(0, 300))} placeholder="询问任何馆内服务问题" /><button disabled={!assistantInput.trim() || assistantLoading}>提问 <i>→</i></button></form>
          </div>
        </section>
      )}
    </main>
  );
}

function SeatMap({
  seats,
  selected,
  setSelected,
  zoom,
  recommendedZone,
}: {
  seats: SeatRecord[];
  selected: number | null;
  setSelected: (seat: number) => void;
  zoom: number;
  recommendedZone?: string | null;
}) {
  function seatStatusText(status: SeatStatus) {
    return status === "using" ? "使用中" : status === "away" ? "暂离" : status === "reserved" ? "已预约" : "空闲";
  }

  return (
    <div className="map-viewport">
      <div className="floor-plan" style={{ transform: `scale(${zoom})` }}>
        <div className="window-wall" aria-hidden="true">
          <span>北侧临窗采光带</span>
          <div>{[0, 1, 2, 3, 4, 5, 6, 7].map((window) => <i key={window} />)}</div>
          <small>安静阅读 · 自然采光</small>
        </div>

        <div className="floor-plan-body">
          <aside className="plan-room-rail" aria-label="西侧馆舍设施">
            <div className="plan-direction"><span>N</span><i>↑</i></div>
            <div className="plan-room stair-room"><i /><strong>楼梯</strong><small>安全出口</small></div>
            <div className="plan-room lift-room"><i>↕</i><strong>电梯厅</strong><small>无障碍通行</small></div>
            <div className="plan-room shelf-room"><div><i /><i /><i /><i /></div><strong>开架书库</strong><small>综合类图书</small></div>
            <div className="plan-room quiet-room"><span>静</span><strong>静音室</strong><small>请勿交谈</small></div>
          </aside>

          <section className="plan-study-area">
            <div className="study-area-heading">
              <div><span>主阅览区</span><strong>自由选座</strong></div>
              <small>座位均配有电源与阅读灯</small>
            </div>

            <div className="plan-zones">
              {["A", "B", "C"].map((zone) => {
                const zoneSeats = seats.filter((seat) => seat.zone === zone);
                const freeCount = zoneSeats.filter((seat) => seat.status === "free").length;
                const clusters = Array.from({ length: 4 }, (_, index) => zoneSeats.slice(index * 4, index * 4 + 4));
                return (
                  <section className={`plan-zone${recommendedZone === zone ? " recommended-zone" : ""}`} key={zone} aria-label={`${zone}区座位${recommendedZone === zone ? "，系统推荐区域" : ""}`}>
                    <header><div><b>{zone}</b><span>{zone === "A" ? "临窗区" : zone === "B" ? "中央区" : "静音区"}</span></div><small>{freeCount} 个空位</small></header>
                    <div className="table-clusters">
                      {clusters.map((cluster, clusterIndex) => (
                        <div className="table-cluster" key={`${zone}-${clusterIndex}`}>
                          <span className="study-table" aria-hidden="true"><i />T{String(clusterIndex + 1).padStart(2, "0")}<i /></span>
                          {cluster.map((seat, seatIndex) => {
                            const statusText = seatStatusText(seat.status);
                            return (
                              <button
                                key={seat.id}
                                disabled={seat.status !== "free"}
                                className={`cluster-seat seat-pos-${seatIndex} ${selected === seat.id ? "selected" : seat.status}`}
                                onClick={() => setSelected(seat.id)}
                                aria-label={`${seat.label} ${statusText}`}
                                title={`${seat.label} · ${statusText}`}
                              >
                                <span>{seat.label}</span>
                                <small>{selected === seat.id ? "已选" : statusText}</small>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </section>

          <aside className="plan-utility-rail" aria-label="东侧馆舍设施">
            <div className="utility-room service-desk"><span>i</span><strong>服务台</strong><small>咨询 · 借还</small></div>
            <div className="utility-room print-room"><span>▤</span><strong>自助打印</strong><small>打印 · 扫描</small></div>
            <div className="utility-room water-room"><span>≈</span><strong>饮水处</strong><small>冷热饮水</small></div>
            <div className="utility-room restroom"><span>WC</span><strong>洗手间</strong><small>东侧通道</small></div>
          </aside>
        </div>

        <div className="plan-entrance"><span><i />主入口</span><p>公共通道 · 请保持畅通</p><span>安全出口<i /></span></div>
      </div>
    </div>
  );
}

function SeatsView({
  reservation,
  onReservationChange,
  showToast,
}: {
  reservation: ReservationRecord | null;
  onReservationChange: (reservation: ReservationRecord | null) => void;
  showToast: (message: string) => void;
}) {
  const [floor, setFloor] = useState("3F");
  const [seats, setSeats] = useState<SeatRecord[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [time, setTime] = useState<LibraryTimeSlot>("14:30—18:00");
  const [bookingDate, setBookingDate] = useState(() => libraryDate());
  const [expandedZoom, setExpandedZoom] = useState(1.15);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studyPurpose, setStudyPurpose] = useState<StudyPurpose | null>(null);
  const [studyTopic, setStudyTopic] = useState<StudyTopic | null>(null);
  const [intentResult, setIntentResult] = useState<StudyIntentResult | null>(null);
  const [intentLoading, setIntentLoading] = useState(true);
  const [intentSaving, setIntentSaving] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [highlightedArea, setHighlightedArea] = useState<{ floor: string; zone: string } | null>(null);
  const selectedSeat = seats.find((seat) => seat.id === selected) ?? null;
  const currentFloorName = floorInfo.find((item) => item.code === floor)?.floor || "三层";
  const dateLabel = libraryDateLabel();
  const lastUpdatedLabel = lastUpdatedAt ? new Intl.DateTimeFormat("zh-CN", {
    timeZone: LIBRARY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(lastUpdatedAt)) : null;
  const recommendedZone = highlightedArea?.floor === floor ? highlightedArea.zone : null;

  function changeFloor(nextFloor: string) {
    if (nextFloor === floor) return;
    setLoadingSeats(true);
    setSelected(null);
    setFloor(nextFloor);
  }

  function changeTime(nextTime: string) {
    if (!isLibraryTimeSlot(nextTime) || nextTime === time) return;
    setSelected(null);
    setIntentLoading(true);
    setTime(nextTime);
  }

  const refreshSeats = useCallback(async ({ signal, quiet = false }: { signal?: AbortSignal; quiet?: boolean } = {}) => {
    const currentBookingDate = libraryDate();
    if (currentBookingDate !== bookingDate) {
      setBookingDate(currentBookingDate);
      return;
    }
    if (!quiet) setLoadingSeats(true);
    try {
      const query = new URLSearchParams({ floor, bookingDate, timeSlot: time });
      const response = await fetch(`/api/seats?${query.toString()}`, { signal });
      const data = await response.json() as { seats?: SeatRecord[]; generatedAt?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "无法读取座位状态");
      setSeats(data.seats ?? []);
      setLastUpdatedAt(data.generatedAt ?? new Date().toISOString());
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      showToast(quiet ? "实时刷新暂时失败，已保留上次座位状态" : error instanceof Error ? error.message : "无法读取座位状态");
    } finally {
      if (!quiet) setLoadingSeats(false);
    }
  }, [bookingDate, floor, showToast, time]);

  const refreshIntent = useCallback(async ({ signal, quiet = false }: { signal?: AbortSignal; quiet?: boolean } = {}) => {
    const currentBookingDate = libraryDate();
    if (currentBookingDate !== bookingDate) {
      setBookingDate(currentBookingDate);
      return;
    }
    if (!quiet) setIntentLoading(true);
    try {
      const query = new URLSearchParams({ bookingDate, timeSlot: time });
      const response = await fetch(`/api/study-intent?${query.toString()}`, { signal });
      const data = await response.json() as { intent?: StudyIntentResult | null; error?: string };
      if (!response.ok) throw new Error(data.error || "无法读取学习场景");
      const intent = data.intent ?? null;
      setIntentResult(intent);
      setStudyPurpose(intent?.purpose ?? null);
      setStudyTopic(intent?.topic ?? null);
      setHighlightedArea((current) => {
        if (!intent) return null;
        const candidates = [intent.recommendation, ...intent.alternatives];
        return current && candidates.some((candidate) => candidate.floor === current.floor && candidate.zone === current.zone)
          ? current
          : { floor: intent.recommendation.floor, zone: intent.recommendation.zone };
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      showToast(quiet ? "实时刷新暂时失败，已保留上次推荐" : error instanceof Error ? error.message : "无法读取学习场景");
    } finally {
      if (!quiet) setIntentLoading(false);
    }
  }, [bookingDate, showToast, time]);

  const refreshCurrentView = useCallback(async () => {
    const controller = new AbortController();
    await Promise.all([
      refreshSeats({ signal: controller.signal, quiet: true }),
      refreshIntent({ signal: controller.signal, quiet: true }),
    ]);
  }, [refreshIntent, refreshSeats]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void refreshSeats({ signal: controller.signal }), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [refreshSeats]);

  useEffect(() => {
    if (!mapExpanded) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMapExpanded(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mapExpanded]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void refreshIntent({ signal: controller.signal }), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [refreshIntent]);

  useEffect(() => {
    let controller: AbortController | null = null;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      controller = new AbortController();
      void Promise.all([
        refreshSeats({ signal: controller.signal, quiet: true }),
        refreshIntent({ signal: controller.signal, quiet: true }),
      ]);
    }, 15_000);
    return () => {
      window.clearInterval(interval);
      controller?.abort();
    };
  }, [refreshIntent, refreshSeats]);

  const statusCounts = useMemo(() => ({
    free: seats.filter((seat) => seat.status === "free").length,
    using: seats.filter((seat) => seat.status === "using").length,
    away: seats.filter((seat) => seat.status === "away").length,
    reserved: seats.filter((seat) => seat.status === "reserved").length,
  }), [seats]);

  async function confirmReservation() {
    if (!selectedSeat || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatId: selectedSeat.id, bookingDate, timeSlot: time }),
      });
      const data = await response.json() as { reservation?: ReservationRecord; error?: string };
      if (!response.ok || !data.reservation) throw new Error(data.error || "预约失败");
      onReservationChange(data.reservation);
      setSelected(null);
      await refreshCurrentView();
      showToast(`已预约 ${floorName(data.reservation.floor)} ${data.reservation.seatLabel}，使用时间 ${time}`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "预约失败");
      await refreshSeats({ quiet: true });
    } finally {
      setSaving(false);
    }
  }

  async function cancelReservation() {
    const response = await fetch("/api/reservations", { method: "DELETE" });
    if (response.ok) {
      onReservationChange(null);
      await refreshCurrentView();
      showToast("当前座位预约已取消");
    }
  }

  function chooseStudyPurpose(purpose: StudyPurpose) {
    setStudyPurpose(purpose);
    if (purpose !== "discuss") setStudyTopic(null);
    setIntentResult(null);
    setHighlightedArea(null);
  }

  async function createAreaRecommendation() {
    if (!studyPurpose || (studyPurpose === "discuss" && !studyTopic) || intentSaving) return;
    setIntentSaving(true);
    try {
      const response = await fetch("/api/study-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingDate,
          timeSlot: time,
          purpose: studyPurpose,
          topic: studyPurpose === "discuss" ? studyTopic : null,
        }),
      });
      const data = await response.json() as { intent?: StudyIntentResult; error?: string };
      if (!response.ok || !data.intent) throw new Error(data.error || "暂时无法生成区域建议");
      setIntentResult(data.intent);
      setHighlightedArea({
        floor: data.intent.recommendation.floor,
        zone: data.intent.recommendation.zone,
      });
    } catch (error) {
      showToast(error instanceof Error ? error.message : "暂时无法生成区域建议");
    } finally {
      setIntentSaving(false);
    }
  }

  function openRecommendedArea(candidate: StudyCandidate) {
    setHighlightedArea({ floor: candidate.floor, zone: candidate.zone });
    changeFloor(candidate.floor);
    showToast(`已定位到 ${candidate.floor} · ${candidate.zone}区`);
    window.setTimeout(() => document.getElementById("seat-map-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }

  function resetStudyMatch() {
    setStudyPurpose(null);
    setStudyTopic(null);
    setIntentResult(null);
    setHighlightedArea(null);
  }

  return (
    <main className="page seats-page">
      <div className="page-heading seat-page-hero">
        <div className="seat-hero-copy">
          <span><i />座位预约</span>
          <h1>选择一处，安静坐下</h1>
          <p>查看馆内实时座位，预约后请在 30 分钟内到馆签到。</p>
        </div>
        <div className="seat-hero-status">
          <span>当前浏览</span>
          <strong>{floor}</strong>
          <p><b>{loadingSeats ? "—" : statusCounts.free}</b> 个座位可预约</p>
        </div>
      </div>

      <div className="selection-toolbar">
        <div><span>日期</span><strong>{dateLabel}</strong></div>
        <div className="time-select"><span>使用时段</span><select value={time} onChange={(event) => changeTime(event.target.value)} aria-label="选择使用时段">{LIBRARY_TIME_SLOTS.map((slot) => <option key={slot}>{slot}</option>)}</select></div>
        <div><span>偏好</span><strong>静音区 · 有电源</strong></div>
      </div>

      <section className={`study-match-card${intentResult ? " has-result" : ""}`} aria-labelledby="study-match-title">
        <aside className="study-match-intro">
          <span><i /> 场景匹配</span>
          <h2 id="study-match-title">今天，想怎样学习？</h2>
          <p>用一个选择，找到更合适的空间和同方向的人。</p>
          <div className="match-orbit" aria-hidden="true"><i /><i /><i /><i /></div>
          <small>匿名聚合 · 实时匹配</small>
        </aside>
        <div className="study-match-workspace" aria-live="polite">
          {intentLoading ? (
            <div className="match-workspace-loading"><i /><span>正在读取你的场景记录</span></div>
          ) : intentResult ? (
            <div className="match-complete">
              <header>
                <span className="match-check">✓</span>
                <div><small>匹配完成</small><h3>{intentResult.recommendation.zoneName}</h3></div>
                <span className="match-score"><b>{intentResult.recommendation.score.toFixed(1)}</b><small>综合分</small></span>
                <button className="match-reset" onClick={resetStudyMatch}>重新选择</button>
              </header>
              <div className="match-recommendation">
                <div className="match-recommendation-location"><small>推荐前往</small><strong>{intentResult.recommendation.floor}<i>·</i>{intentResult.recommendation.zone}区</strong></div>
                <div className="match-recommendation-reason">
                  <small>为什么是这里</small>
                  <p>{intentResult.recommendation.reason}</p>
                  <span><i />{intentResult.recommendation.freeSeats} / {intentResult.recommendation.totalSeats} 个座位可用 · {intentResult.recommendation.peerCount > 0 ? `${intentResult.recommendation.peerCount} 人同方向需求` : "暂无其他同方向需求"}</span>
                  {intentResult.recommendation.includesDemoBaseline && <em className="match-demo-baseline">含演示基线</em>}
                </div>
              </div>
              <div className="match-factors" aria-label="推荐评分贡献">
                <span><small>场景适配</small><b>+{intentResult.recommendation.factors.sceneFit}</b></span>
                <span><small>时段空位</small><b>+{intentResult.recommendation.factors.availability}</b></span>
                <span><small>同向需求</small><b>+{intentResult.recommendation.factors.peerDemand}</b></span>
              </div>
              {intentResult.alternatives.length > 0 && (
                <div className="match-alternatives">
                  <small>备选区域</small>
                  <div>{intentResult.alternatives.map((candidate) => (
                    <button key={`${candidate.floor}-${candidate.zone}`} onClick={() => openRecommendedArea(candidate)}>
                      <span><strong>{candidate.zoneName}</strong><small>{candidate.floor} · {candidate.zone}区</small></span>
                      <span><b>{candidate.score.toFixed(1)} 分</b><small>{candidate.freeSeats} 个空位</small></span>
                      {candidate.includesDemoBaseline && <em className="match-demo-baseline">含演示基线</em>}
                      <i>定位 →</i>
                    </button>
                  ))}</div>
                </div>
              )}
              <footer><span>只呈现区域趋势，不展示个人身份</span><button onClick={() => openRecommendedArea(intentResult.recommendation)}>在地图中定位 <i>→</i></button></footer>
            </div>
          ) : (
            <div className="match-question">
              <header><span>STEP <b>01</b></span><p>选择今天的主要学习方式</p></header>
              <div className="purpose-options" role="group" aria-label="选择今天的学习方式">
                {studyPurposes.map((purpose) => (
                  <button key={purpose.value} className={studyPurpose === purpose.value ? "active" : ""} onClick={() => chooseStudyPurpose(purpose.value)}>
                    <i>{purpose.index}</i><span><strong>{purpose.label}</strong><small>{purpose.note}</small></span><b>✓</b>
                  </button>
                ))}
              </div>
              {studyPurpose === "discuss" && (
                <div className="topic-step">
                  <div><span>STEP 02</span><strong>想讨论哪方面？</strong></div>
                  <div className="topic-options" role="group" aria-label="选择讨论问题方向">
                    {studyTopics.map((topic) => <button key={topic.value} className={studyTopic === topic.value ? "active" : ""} onClick={() => setStudyTopic(topic.value)}>{topic.label}</button>)}
                  </div>
                </div>
              )}
              <footer className="study-match-action"><span>仅展示聚合人数，不公开个人身份</span><button disabled={!studyPurpose || (studyPurpose === "discuss" && !studyTopic) || intentSaving} onClick={createAreaRecommendation}>{intentSaving ? "正在匹配…" : "查看区域建议"}<i>→</i></button></footer>
            </div>
          )}
        </div>
      </section>

      <section className="floor-selector" aria-labelledby="floor-selector-title">
        <div className="floor-selector-heading">
          <div><span>馆舍楼层</span><strong id="floor-selector-title">选择学习区域</strong></div>
          <small><i /> 座位状态实时同步</small>
        </div>
        <div className="floor-tabs" role="tablist" aria-label="选择楼层">
          {floorInfo.map((item) => (
            <button key={item.code} className={floor === item.code ? "active" : ""} onClick={() => changeFloor(item.code)}>
              <span>{item.floor}</span>
              <strong>{floor === item.code && seats.length ? statusCounts.free : item.free}</strong>
              <small>{item.note}</small>
            </button>
          ))}
        </div>
      </section>

      <div className="seat-layout">
        <section className="map-panel" id="seat-map-panel">
          <div className="panel-heading">
            <div><h2>{currentFloorName} · {floorInfo.find((item) => item.code === floor)?.note}</h2><p>浏览馆舍地图并直接选择空闲座位</p></div>
            <div className="map-actions">
              <button className="expand-map-button" onClick={() => { setExpandedZoom(1.15); setMapExpanded(true); }}><i>↗</i> 放大地图</button>
            </div>
          </div>
          <div className="map-summary-bar">
            <div className="seat-legend"><span><i className="free" />空闲</span><span><i className="busy" />使用中</span><span><i className="away" />暂离</span><span><i className="reserved" />已预约</span><span><i className="chosen" />已选择</span></div>
            <div className="map-quick-counts">
              <span><b>{statusCounts.free}</b> 空闲</span>
              <span><b>{statusCounts.using}</b> 使用中</span>
              <span><b>{statusCounts.away}</b> 暂离</span>
              <span><b>{statusCounts.reserved}</b> 已预约</span>
            </div>
            <small className="seat-refresh-time"><i /> {loadingSeats ? "读取中" : lastUpdatedLabel ? `更新于 ${lastUpdatedLabel}` : "实时更新"}</small>
          </div>
          {loadingSeats ? <div className="map-loading">正在加载 {currentFloorName} 平面图…</div> : <div className="map-preview"><SeatMap seats={seats} selected={selected} setSelected={setSelected} zoom={1} recommendedZone={recommendedZone} /></div>}
        </section>

        <aside className="booking-panel">
          <span className="booking-label">本次预约</span>
          <div className="seat-number"><small>{floor}</small><strong>{selectedSeat?.label || "—"}</strong></div>
          <dl>
            <div><dt>区域</dt><dd>{currentFloorName} · {selectedSeat ? `${selectedSeat.zone}区` : "未选择"}</dd></div>
            <div><dt>时段</dt><dd>{time}</dd></div>
            <div><dt>设施</dt><dd>电源 · 台灯 · 静音</dd></div>
          </dl>
          <div className="booking-tip"><strong>签到提醒</strong><p>到馆后打开“我的”，扫描桌面二维码完成签到。</p></div>
          <button className="confirm-button" disabled={!selectedSeat || saving} onClick={confirmReservation}>{saving ? "正在确认…" : reservation?.floor === floor && reservation.seatLabel === selectedSeat?.label ? "已预约此座位" : "确认预约"}</button>
          {reservation && <button className="cancel-link" onClick={cancelReservation}>取消当前预约</button>}
        </aside>
      </div>

      {mapExpanded && (
        <div className="expanded-map-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMapExpanded(false); }}>
          <section className="expanded-map-dialog" role="dialog" aria-modal="true" aria-label={`${currentFloorName}座位地图`}>
            <header className="expanded-map-header">
              <div><span>{floor} / 馆舍地图</span><h2>{currentFloorName} · {floorInfo.find((item) => item.code === floor)?.note}</h2><p>放大后可横向、纵向滑动，空闲座位可直接选择</p></div>
              <div className="expanded-map-tools">
                <div className="map-controls" aria-label="全屏地图缩放">
                  <button onClick={() => setExpandedZoom((value) => Math.max(.7, value - .1))}>−</button>
                  <span>{Math.round(expandedZoom * 100)}%</span>
                  <button onClick={() => setExpandedZoom((value) => Math.min(2, value + .1))}>＋</button>
                </div>
                <button className="reset-map-button" onClick={() => setExpandedZoom(1.15)}>重置</button>
                <button className="close-map-button" onClick={() => setMapExpanded(false)} aria-label="关闭全屏地图">×</button>
              </div>
            </header>

            <div className="expanded-map-meta">
              <div className="seat-legend"><span><i className="free" />空闲</span><span><i className="busy" />使用中</span><span><i className="away" />暂离</span><span><i className="reserved" />已预约</span><span><i className="chosen" />已选择</span></div>
              <div className="expanded-counts"><span><b>{statusCounts.free}</b> 空闲</span><span>{statusCounts.using} 使用中</span><span>{statusCounts.away} 暂离</span><span>{statusCounts.reserved} 已预约</span></div>
              <strong>{selectedSeat ? `已选择 ${floor} · ${selectedSeat.label}` : "请点击一个空闲座位"}</strong>
            </div>

            <div className="expanded-map-viewport">
              <SeatMap seats={seats} selected={selected} setSelected={setSelected} zoom={expandedZoom} recommendedZone={recommendedZone} />
            </div>

            <footer className="expanded-map-footer">
              <span>使用触控板、鼠标滚动条或触屏滑动浏览完整地图</span>
              <button disabled={!selectedSeat} onClick={() => setMapExpanded(false)}>{selectedSeat ? `选定 ${selectedSeat.label}，返回预约` : "请先选择座位"}</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}

function BooksView({
  initialQuery,
  borrowed,
  onBorrow,
  showToast,
}: {
  initialQuery: string;
  borrowed: number[];
  onBorrow: (bookId: number) => Promise<boolean>;
  showToast: (message: string) => void;
}) {
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [hasSearched, setHasSearched] = useState(Boolean(initialQuery));
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);

  const exactResults = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return [];
    return books.filter((book) => `${book.title}${book.author}${book.callNumber}${book.category}`.toLowerCase().includes(keyword));
  }, [query]);

  const anchorBook = exactResults[0] ?? null;
  const similarBooks = useMemo(() => {
    if (!anchorBook) return [];
    return books.filter((book) => book.category === anchorBook.category && book.id !== anchorBook.id && !exactResults.some((result) => result.id === book.id)).slice(0, 3);
  }, [anchorBook, exactResults]);
  const relatedBooks = useMemo(() => {
    if (!anchorBook) return [];
    return (relatedBookIds[anchorBook.id] ?? [])
      .map((id) => books.find((book) => book.id === id))
      .filter((book): book is Book => Boolean(book) && !exactResults.some((result) => result.id === book.id) && !similarBooks.some((similar) => similar.id === book.id))
      .slice(0, 3);
  }, [anchorBook, exactResults, similarBooks]);

  const quizResults = useMemo(() => {
    const scores = new Map<number, number>();
    quizAnswers.forEach((optionIndex, questionIndex) => {
      const option = readingQuizQuestions[questionIndex]?.options[optionIndex];
      option?.bookIds.forEach((bookId, rank) => scores.set(bookId, (scores.get(bookId) ?? 0) + option.bookIds.length - rank));
    });
    return [...books]
      .sort((left, right) => (scores.get(right.id) ?? 0) - (scores.get(left.id) ?? 0) || left.id - right.id)
      .slice(0, 3);
  }, [quizAnswers]);

  useEffect(() => {
    if (!quizOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setQuizOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [quizOpen]);

  function openQuiz() {
    setQuizAnswers([]);
    setQuizStep(0);
    setQuizOpen(true);
  }

  function answerQuiz(optionIndex: number) {
    setQuizAnswers((current) => [...current.slice(0, quizStep), optionIndex]);
    setQuizStep((current) => current + 1);
  }

  function showQuizBook(book: Book) {
    search(book.title);
    setQuizOpen(false);
  }

  function search(value: string) {
    const nextQuery = value.trim();
    if (!nextQuery) return;
    void fetch("/api/libraryos/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "book_search", query: nextQuery }) });
    setInput(nextQuery);
    setQuery(nextQuery);
    setHasSearched(true);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search(input);
  }

  function recommendationReason(book: Book, kind: "similar" | "related") {
    if (!anchorBook) return "";
    if (kind === "similar") {
      const pairKey = [anchorBook.id, book.id].sort((left, right) => left - right).join("-");
      return similarityReasons[pairKey] ?? `都从不同角度讨论${anchorBook.category}领域中的相近主题`;
    }
    const reasons: Record<string, string> = {
      "文学-社科": "从故事中的个人经验，走向社会与历史背景",
      "文学-设计": "从叙事与感受，延伸到视觉和审美表达",
      "社科-文学": "用文学中的具体人生，补充社会观察",
      "社科-设计": "把制度与群体问题，转化为人与系统的设计视角",
      "社科-科技": "继续理解技术如何改变产业与社会结构",
      "设计-科技": "把以人为本的原则，带入真实技术与产品环境",
      "设计-社科": "从个体体验，进一步理解组织与社会系统",
      "设计-文学": "用叙事和艺术经验拓宽感受与表达",
      "科技-社科": "从技术竞争，延伸到产业、制度与社会影响",
      "科技-设计": "从技术能力回到产品选择与人的体验",
    };
    return reasons[`${anchorBook.category}-${book.category}`] ?? `从${anchorBook.category}延伸到${book.category}，换一个视角理解同一问题`;
  }

  async function borrow(book: Book) {
    if (book.available === 0) {
      showToast(`已加入《${book.title}》预约队列`);
      return;
    }
    if (borrowed.includes(book.id)) {
      showToast(`《${book.title}》已在你的借阅清单中`);
      return;
    }
    if (await onBorrow(book.id)) showToast(`《${book.title}》已加入借阅清单，请到 ${book.location} 取书`);
  }

  const quizFinished = quizStep >= readingQuizQuestions.length;
  const currentQuizQuestion = readingQuizQuestions[quizStep] ?? null;

  return (
    <main className="page discovery-page">
      <section className="discovery-heading">
        <h1>你想借哪一本？</h1>
        <p>先准确找到它，再沿着内容关联发现几本值得一起看的书。</p>

        <form className="discovery-search" onSubmit={submitSearch}>
          <span className="search-icon" aria-hidden="true" />
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="输入书名、作者或索书号" aria-label="输入想借的书" />
          <button type="submit">搜索</button>
        </form>

        <div className="search-examples">
          <span>可以试试</span>
          {["百年孤独", "设计心理学", "置身事内", "芯片战争"].map((example) => <button key={example} onClick={() => search(example)}>《{example}》</button>)}
        </div>

        <button className="reading-quiz-entry" onClick={openQuiz}>
          <span className="quiz-entry-mark">?</span>
          <span><small>还没想好读什么？</small><strong>回答 3 个小问题，找到今天适合你的书</strong></span>
          <i>开始选择 →</i>
        </button>
      </section>

      {!hasSearched && (
        <section className="discovery-empty">
          <div className="shelf-line" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          <span>每一次寻找，都有新的相遇</span>
          <h2>从想读的这一本，走向更辽阔的阅读</h2>
          <p>让好书彼此照亮，也让灵感在下一次翻页时自然发生。</p>
        </section>
      )}

      {hasSearched && exactResults.length === 0 && (
        <section className="no-book-found">
          <span>没有检索到“{query}”</span>
          <h2>换一个更短的书名或作者试试</h2>
          <p>当前演示馆藏支持上方四个示例，也可以搜索“文学”“社科”“设计”或“科技”。</p>
        </section>
      )}

      {hasSearched && exactResults.length > 0 && anchorBook && (
        <div className="discovery-results">
          <section className="exact-section">
            <div className="result-section-title"><div><span>01 / 搜索结果</span><h2>馆藏搜索结果</h2></div><small>共 {exactResults.length} 条馆藏结果</small></div>
            <div className="exact-list">
              {exactResults.map((book) => (
                <article className="exact-book" key={book.id}>
                  <BookCover book={book} />
                  <div className="exact-book-copy">
                    <span>{book.category} · 纸质馆藏</span>
                    <h3>{book.title}</h3>
                    <p>{book.author}</p>
                    <small>{book.description}</small>
                  </div>
                  <div className="book-location">
                    <dl><div><dt>索书号</dt><dd>{book.callNumber}</dd></div><div><dt>馆藏位置</dt><dd>{book.location}</dd></div></dl>
                    <p className={book.available > 0 ? "available" : "unavailable"}><i />{book.available > 0 ? `在架可借 ${book.available} 本` : "暂无可借复本"}</p>
                    <button onClick={() => borrow(book)}>{borrowed.includes(book.id) ? "已加入清单" : book.available > 0 ? "加入借阅清单" : "预约排队"}</button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="recommend-section">
            <div className="result-section-title"><div><span>02 / 主动发现</span><h2>从《{anchorBook.title}》继续读</h2></div><small>推荐依据对你透明可见</small></div>
            <div className="reading-path" aria-label="围绕目标图书生成的知识路径">
              <div className="reading-origin">
                <span>阅读起点</span>
                <strong>《{anchorBook.title}》</strong>
                <small>{anchorBook.author}</small>
              </div>
              <div className="reading-route">
                <div className="reading-route-heading"><div><span>沿着兴趣，继续探索</span><strong>三条阅读线索</strong></div><small>从主题、背景与表达方式展开</small></div>
                <div className="thread-nodes">
                  {(knowledgeThreads[anchorBook.id] ?? []).map((thread, index) => <span key={thread}><i>{String(index + 1).padStart(2, "0")}</i><b>{thread}</b></span>)}
                </div>
              </div>
            </div>
            <div className="recommend-columns">
              <div className="recommend-group">
                <div className="recommend-group-heading"><strong>相似读物</strong><span>共同主题 · 相近视角</span></div>
                {similarBooks.map((book) => (
                  <article className="recommend-book" key={book.id}>
                    <BookCover book={book} small />
                    <div><span>{book.category}</span><h3>{book.title}</h3><p>{book.author}</p><small><b>相似点</b>{recommendationReason(book, "similar")}</small></div>
                    <button onClick={() => borrow(book)} aria-label={`将《${book.title}》加入借阅清单`}>＋</button>
                  </article>
                ))}
              </div>

              <div className="recommend-group related-group">
                <div className="recommend-group-heading"><strong>相关领域</strong><span>换个视角 · 建立连接</span></div>
                {relatedBooks.map((book) => (
                  <article className="recommend-book" key={book.id}>
                    <BookCover book={book} small />
                    <div><span>{book.category}</span><h3>{book.title}</h3><p>{book.author}</p><small><b>推荐理由</b>{recommendationReason(book, "related")}</small></div>
                    <button onClick={() => borrow(book)} aria-label={`将《${book.title}》加入借阅清单`}>＋</button>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}

      {quizOpen && (
        <div className="quiz-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuizOpen(false); }}>
          <section className="quiz-dialog" role="dialog" aria-modal="true" aria-label="阅读偏好选择">
            <header className="quiz-header">
              <div><span>今日阅读选择</span><h2>{quizFinished ? "为你找到这三本书" : "用几个简单选择，找到想读的书"}</h2></div>
              <button onClick={() => setQuizOpen(false)} aria-label="关闭阅读选择">×</button>
            </header>

            {!quizFinished && currentQuizQuestion && (
              <div className="quiz-question-view">
                <div className="quiz-progress">
                  <span>{String(quizStep + 1).padStart(2, "0")}</span>
                  <div>{readingQuizQuestions.map((question, index) => <i className={index <= quizStep ? "active" : ""} key={question.label} />)}</div>
                  <small>{String(readingQuizQuestions.length).padStart(2, "0")}</small>
                </div>
                <div className="quiz-question-heading"><span>{currentQuizQuestion.label}</span><h3>{currentQuizQuestion.question}</h3><p>跟着第一感觉选择就好，没有标准答案。</p></div>
                <div className="quiz-options">
                  {currentQuizQuestion.options.map((option, optionIndex) => (
                    <button key={option.title} onClick={() => answerQuiz(optionIndex)}>
                      <i>{String.fromCharCode(65 + optionIndex)}</i>
                      <span><strong>{option.title}</strong><small>{option.note}</small></span>
                      <b>→</b>
                    </button>
                  ))}
                </div>
                <div className="quiz-question-footer"><button disabled={quizStep === 0} onClick={() => setQuizStep((current) => Math.max(0, current - 1))}>← 上一题</button><span>完成后会推荐 3 本馆藏图书</span></div>
              </div>
            )}

            {quizFinished && (
              <div className="quiz-result-view">
                <div className="quiz-result-intro"><span>根据你的选择</span><p>从馆藏中挑出了三本更贴近你此刻阅读状态的书。</p></div>
                <div className="quiz-result-list">
                  {quizResults.map((book, index) => (
                    <article className="quiz-result-book" key={book.id}>
                      <span className="quiz-result-rank">0{index + 1}</span>
                      <BookCover book={book} />
                      <div><span>{book.category}</span><h3>{book.title}</h3><p>{book.author}</p><small>{quizRecommendationCopy[book.id]}</small><b>{book.available > 0 ? `在架可借 ${book.available} 本` : "当前需预约"}</b></div>
                      <button onClick={() => showQuizBook(book)}>查看馆藏</button>
                    </article>
                  ))}
                </div>
                <footer className="quiz-result-footer"><button onClick={openQuiz}>重新选择</button><span>推荐结果仅作阅读参考</span></footer>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function MineView({
  reservation,
  onCancelReservation,
  onCheckoutReservation,
  checkoutPending,
  borrowed,
  showToast,
  user,
}: {
  reservation: ReservationRecord | null;
  onCancelReservation: () => Promise<void>;
  onCheckoutReservation: () => Promise<void>;
  checkoutPending: boolean;
  borrowed: number[];
  showToast: (message: string) => void;
  user: User;
}) {
  const currentBooks = [books[2], books[0], ...books.filter((book) => borrowed.includes(book.id) && ![1, 3].includes(book.id))];

  return (
    <main className="page mine-page">
      <div className="profile-heading">
        <div className="profile-avatar">{user.name.slice(0, 1)}</div>
        <div><span>学生读者 · 已实名认证</span><h1>{user.name}</h1><p>学号 / 借阅证号 {user.studentId}</p></div>
        <div className="account-status"><strong>信用良好</strong><span>可借 12 本 · 已借 {currentBooks.length} 本</span></div>
      </div>

      <div className="mine-grid">
        <section className="mine-section reservation-section">
          <div className="section-title"><div><span>座位</span><h2>当前预约</h2></div></div>
          {reservation ? (
            <article className="reservation-ticket">
              <div className="ticket-seat"><small>{reservation.floor}</small><strong>{reservation.seatLabel}</strong></div>
              <div><span>今天 · {reservation.timeSlot}</span><h3>{floorName(reservation.floor)} {reservation.seatLabel} · 静音自习区</h3><p>请在预约开始后 30 分钟内完成签到</p></div>
              <div className="reservation-actions"><button className="checkout-seat" disabled={checkoutPending} onClick={onCheckoutReservation}>{checkoutPending ? "正在签退…" : "离馆签退"}</button><button className="cancel-reservation" onClick={onCancelReservation}>取消预约</button></div>
            </article>
          ) : (
            <div className="no-reservation"><strong>今天没有座位预约</strong><p>前往选座页面查看实时空位。</p></div>
          )}
        </section>

        <section className="mine-section borrowing-section">
          <div className="section-title"><div><span>图书</span><h2>在借图书</h2></div><button>借阅历史</button></div>
          <div className="borrowed-list">
            {currentBooks.map((book, index) => (
              <article key={`${book.id}-${index}`}>
                <BookCover book={book} small />
                <div><h3>{book.title}</h3><p>{book.author}</p><span className={index === 0 ? "due-soon" : ""}>{index === 0 ? "8月27日到期 · 剩余7天" : `9月${4 + index}日到期`}</span></div>
                <button onClick={() => showToast(`《${book.title}》已续借至 9月26日`)}>续借</button>
              </article>
            ))}
          </div>
        </section>

        <aside className="mine-section library-card">
          <span>入馆与借阅</span>
          <h2>我的借阅码</h2>
          <div className="barcode" aria-label="演示借阅条形码">
            {[2,1,3,1,2,4,1,3,2,1,4,2,1,3,1,2,4,1,2,3,1,4].map((width, index) => <i style={{ width: `${width}px` }} key={index} />)}
          </div>
          <strong>{user.studentId.replace(/(.{4})/g, "$1 ").trim()}</strong>
          <p>可用于闸机入馆、自助借书和座位签到</p>
        </aside>
      </div>
      <KnowledgeTwin />
    </main>
  );
}

function CheckoutCelebration({ seat, onClose }: { seat: string; onClose: () => void }) {
  return (
    <div className="checkout-celebration" role="status" aria-live="assertive">
      <div className="confetti-field" aria-hidden="true">
        {Array.from({ length: 24 }, (_, index) => <i key={index} style={{ "--index": index, "--left": `${3 + index * 4}%`, "--delay": `${index * -.09}s`, "--drift": `${(index % 7) * 18 - 54}px` } as CSSProperties} />)}
      </div>
      <section className="celebration-card">
        <header className="celebration-heading">
          <div className="celebration-mark"><i>✓</i><span /><span /></div>
          <div><span>CHECK-OUT COMPLETE</span><h2>今天的专注，<br />值得被好好记住。</h2><p>本次学习已经完成，座位也已顺利释放。</p></div>
        </header>
        <div className="celebration-summary">
          <section><span>今日记录</span><strong>完成一次专注学习</strong></section>
          <i>+1</i>
          <section><span>已释放座位</span><strong>{seat}</strong></section>
        </div>
        <div className="celebration-note"><i>“</i><p>每一次认真离席，都为下一次相遇留出了位置。</p></div>
        <button onClick={onClose}>完成，返回图书馆</button>
      </section>
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [reservation, setReservation] = useState<ReservationRecord | null>(null);
  const [borrowed, setBorrowed] = useState<number[]>([]);
  const [toast, setToast] = useState("");
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [celebration, setCelebration] = useState<{ seat: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json() as { user: User }).user;
      })
      .then((currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          return loadPersonalData();
        }
      })
      .finally(() => setAuthLoading(false));
  }, []);

  async function loadPersonalData() {
    const [reservationResponse, borrowResponse] = await Promise.all([
      fetch("/api/reservations"),
      fetch("/api/borrow-list"),
    ]);
    if (reservationResponse.ok) {
      const data = await reservationResponse.json() as { reservation: ReservationRecord | null };
      setReservation(data.reservation);
    }
    if (borrowResponse.ok) {
      const data = await borrowResponse.json() as { bookIds: number[] };
      setBorrowed(data.bookIds);
    }
  }

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

  async function onAuthenticated(nextUser: User) {
    setUser(nextUser);
    await loadPersonalData();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setReservation(null);
    setBorrowed([]);
    setView("home");
  }

  async function addBorrowed(bookId: number) {
    const response = await fetch("/api/borrow-list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId }),
    });
    if (!response.ok) {
      const data = await response.json() as { error?: string };
      showToast(data.error || "保存借阅清单失败");
      return false;
    }
    setBorrowed((current) => current.includes(bookId) ? current : [...current, bookId]);
    return true;
  }

  async function cancelReservation() {
    const response = await fetch("/api/reservations", { method: "DELETE" });
    if (response.ok) {
      setReservation(null);
      showToast("座位预约已取消");
    }
  }

  async function checkoutReservation() {
    if (!reservation || checkoutPending) return;
    setCheckoutPending(true);
    try {
      const response = await fetch("/api/reservations/checkout", { method: "POST" });
      const data = await response.json() as { floor?: string; seatLabel?: string; error?: string };
      if (!response.ok) throw new Error(data.error || "签退失败");
      const seat = `${data.floor ?? reservation.floor} · ${data.seatLabel ?? reservation.seatLabel}`;
      setReservation(null);
      setCelebration({ seat });
      window.setTimeout(() => setCelebration(null), 6800);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "签退失败");
    } finally {
      setCheckoutPending(false);
    }
  }

  if (authLoading) {
    return <div className="app-loading"><LibraryMark /><span>正在进入图书馆…</span></div>;
  }

  if (!user) return <AuthView onAuthenticated={onAuthenticated} />;

  return (
    <div className="site-shell">
      <Header view={view} setView={setView} user={user} onLogout={logout} />
      <MotionStage view={view}>
        {view === "home" && <HomeView setView={setView} user={user} />}
        {view === "seats" && <SeatsView reservation={reservation} onReservationChange={setReservation} showToast={showToast} />}
        {view === "books" && <BooksView initialQuery="" borrowed={borrowed} onBorrow={addBorrowed} showToast={showToast} />}
        {view === "community" && <CommunityView reservation={reservation} showToast={showToast} user={user} />}
        {view === "librarian" && <LibrarianView onNavigate={setView} />}
        {view === "intelligence" && <IntelligenceView />}
        {view === "mine" && <MineView reservation={reservation} onCancelReservation={cancelReservation} onCheckoutReservation={checkoutReservation} checkoutPending={checkoutPending} borrowed={borrowed} showToast={showToast} user={user} />}
      </MotionStage>
      <footer className="site-footer"><span>大连理工大学图书馆</span><p>馆藏服务 · 座位预约 · 社区连接</p><button onClick={() => setView("intelligence")}>运营洞察</button></footer>
      {toast && <div className="toast" role="status"><i>✓</i>{toast}</div>}
      {celebration && <CheckoutCelebration seat={celebration.seat} onClose={() => setCelebration(null)} />}
    </div>
  );
}
