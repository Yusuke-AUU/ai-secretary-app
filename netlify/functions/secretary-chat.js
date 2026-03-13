exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method Not Allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const { mode = "chat", assistant = "ayumi", conversation = [] } = body;
    const assistantProfile = ASSISTANTS[assistant] || ASSISTANTS.ayumi;

    if (!process.env.OPENAI_API_KEY) {
      return jsonResponse(200, { configMissing: true });
    }

    if (mode === "summary") {
      return await createSummary(conversation, assistantProfile);
    }

    return await createChatReply(conversation, assistantProfile);
  } catch (error) {
    return jsonResponse(500, {
      error: "Function Error",
      detail: error.message
    });
  }
};

const ASSISTANTS = {
  ayumi: {
    name: "歩美",
    tone: "やわらかく、上品で、聞き上手。相手を急かさず、少しずつ言語化を助ける女性秘書。"
  },
  ayumu: {
    name: "歩夢",
    tone: "誠実で、清潔感があり、落ち着いて整理が上手い男性秘書。論点をすっきり整える。"
  }
};

const AUU_THEME_GUIDE = [
  "経営",
  "コスト削減",
  "補助金・給付金・助成金",
  "設備投資",
  "マネー",
  "土地・建物",
  "相続",
  "医療・福祉",
  "IoT",
  "教育",
  "建設",
  "スポーツ",
  "新規事業",
  "提携・協業",
  "採用・組織",
  "M&A・事業承継"
];

const PRIORITY_THEMES = [
  "補助金",
  "M&A（買収）",
  "M&A（譲渡）",
  "不動産（買）",
  "不動産（売）",
  "人材（採用ニーズ）",
  "人材（転職・就職ニーズ）"
];

async function createChatReply(conversation, assistantProfile) {
  const userTurnCount = conversation.filter((item) => item.role === "user").length;
  const priorityTheme = detectPriorityTheme(conversation);
  const categoryInfo = inferCategory(priorityTheme);

  const systemPrompt = `
あなたはAUUのAI秘書 ${assistantProfile.name} です。
あなたの役割は、ビジネス上の顕在課題・潜在課題を自然な会話の中で引き出し、整理し、相談者が安心して内容を預けられる状態にすることです。

話し方:
- ${assistantProfile.tone}
- 1回の返答で質問は原則1つだけ
- まず受け止める
- 断定しすぎない
- 営業色を出しすぎない
- 専門家紹介をその場で約束しない
- 「送信しましょう」と強く迫らない
- 個人名や企業名を具体的に提示しない
- AUU Onlineの考え方として、経営・コスト削減・補助金・設備投資・不動産・人材・M&A・提携・新規事業など多様なテーマに対応しうる前提で会話する
- 記事URLの露骨な羅列は避け、会話の中にわかりやすく知見として溶け込ませる
- 重点テーマに近い場合は、背景・条件・時期・金額感・地域・理由などを少しずつ確認する

重点ヒアリング対象:
${PRIORITY_THEMES.join(" / ")}

AUUテーマの参考軸:
${AUU_THEME_GUIDE.join(" / ")}

返答は日本語で、200文字以内を目安にしてください。
`.trim();

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversation.slice(-12)
  ];

  const reply = await callOpenAI(messages);

  const shouldOfferIntake = userTurnCount >= 3 || Boolean(priorityTheme);
  return jsonResponse(200, {
    reply,
    shouldOfferIntake,
    priorityTheme,
    category: categoryInfo.category,
    subcategory: categoryInfo.subcategory
  });
}

async function createSummary(conversation, assistantProfile) {
  const priorityTheme = detectPriorityTheme(conversation);
  const categoryInfo = inferCategory(priorityTheme);

  const systemPrompt = `
あなたはAUUのAI秘書 ${assistantProfile.name} です。
与えられた会話履歴を、株式会社AUUが初回確認しやすい日本語の要約に整理してください。

出力条件:
- 次の見出しを必ず使う
【担当秘書】
【相談概要】
【本質的な課題（推定）】
【会話メモ】
- 重点テーマに該当する場合のみ、最後に【重点ヒアリング】を追加
- 余計な前置きは不要
- 相談者の意図が伝わる実務的な文面にする
- 誇張しない
- 1見出しあたり1〜3文程度
- 個人や企業の断定的な評価はしない
`.trim();

  const transcript = conversation
    .map((item) => `${item.role === "user" ? "相談者" : assistantProfile.name}：${item.content}`)
    .join("\n");

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: transcript }
  ];

  const summaryText = await callOpenAI(messages);

  return jsonResponse(200, {
    summaryText,
    priorityTheme,
    category: categoryInfo.category,
    subcategory: categoryInfo.subcategory
  });
}

async function callOpenAI(messages) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.4",
      messages,
      max_completion_tokens: 350
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "OpenAI API request failed");
  }

  return data.choices?.[0]?.message?.content?.trim() || "すみません、少し整理しながらもう一度お話をうかがってもよろしいでしょうか。";
}

function detectPriorityTheme(conversation) {
  const combined = conversation.map((item) => item.content).join("\n").toLowerCase();

  const patterns = [
    { key: "補助金", list: ["補助金", "助成金", "給付金", "ものづくり補助金", "事業再構築", "設備投資"] },
    { key: "M&A（買収）", list: ["買収", "買いたい", "m&a", "ma", "譲り受け", "会社を買", "事業を買"] },
    { key: "M&A（譲渡）", list: ["売却", "譲渡", "事業承継", "後継者不在", "会社を売", "株式譲渡"] },
    { key: "不動産（買）", list: ["不動産を買", "土地を買", "物件を買", "ビルを買", "購入したい不動産"] },
    { key: "不動産（売）", list: ["不動産を売", "土地を売", "物件を売", "建物を売", "売却したい不動産"] },
    { key: "人材（採用ニーズ）", list: ["採用", "人材", "募集", "求人", "雇用", "中途", "新卒"] },
    { key: "人材（転職・就職ニーズ）", list: ["転職", "就職", "次の会社", "キャリア", "転職したい", "就職したい"] }
  ];

  for (const item of patterns) {
    if (item.list.some((keyword) => combined.includes(keyword))) {
      return item.key;
    }
  }
  return "";
}

function inferCategory(priorityTheme) {
  switch (priorityTheme) {
    case "補助金":
      return { category: "補助金・助成金", subcategory: "設備投資・補助金相談" };
    case "M&A（買収）":
      return { category: "M&A・事業承継", subcategory: "買収ニーズ" };
    case "M&A（譲渡）":
      return { category: "M&A・事業承継", subcategory: "譲渡・売却ニーズ" };
    case "不動産（買）":
      return { category: "不動産相談", subcategory: "不動産購入ニーズ" };
    case "不動産（売）":
      return { category: "不動産相談", subcategory: "不動産売却ニーズ" };
    case "人材（採用ニーズ）":
      return { category: "採用・組織・労務", subcategory: "採用ニーズ" };
    case "人材（転職・就職ニーズ）":
      return { category: "人材相談", subcategory: "転職・就職ニーズ" };
    default:
      return { category: "AI秘書相談", subcategory: "自由相談" };
  }
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}
