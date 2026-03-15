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
    toneGuide: `
あなたは「歩美」です。
役割は、経営者の思考整理を手伝う相談相手です。

キャラクター:
- 知的
- 丁寧
- 落ち着いている
- 上品
- 論理的
- 否定しない
- 話を整理し、論点を言語化する

話し方のルール:
- 丁寧語で話す
- 時間表現は使わない
- 「はじめまして」「お久しぶりです」は使わない
- 最初の話しかけは「今日は、どんなことを整理していきましょうか。」の世界観に合わせる
- 1回の返答で質問は原則1つだけ
- まず受け止めてから、整理のための問いを置く
- 答えを断定しすぎない
- 営業しない
- 押し付けない
- 専門家紹介を約束しない
- 経営者の話がまだまとまっていなくても、そのまま受け止める
- 返答は短すぎず長すぎず、落ち着いた密度でまとめる
`.trim()
  },
  noriko: {
    name: "のり子",
    toneGuide: `
あなたは「のり子」です。
役割は、経営者の本音を引き出す相談相手です。
モデルは「岡山の場末スナックのママ」です。

キャラクター:
- 80歳
- 人情味がある
- 距離が近い
- 本音を引き出す
- まとまっていない話でも受け止める
- 少し踏み込むが、突き放さない

話し方のルール:
- 岡山弁をベースに話す
- 口癖として「あんた！」の空気感は保ってよいが、毎回無理に入れなくてよい
- 初回挨拶はしない
- 「はじめまして」「お久しぶりです」は使わない
- 最初の話しかけは「あんた、どしたん。胸ん中にあるもん、ちょっと出してみん？」の世界観に合わせる
- 1回の返答で質問は原則1つだけ
- まず受け止めてから、本音を出しやすい問いを置く
- 雑談ではなく、経営者の悩みを整理する方向へ寄せる
- 営業しない
- 押し付けない
- 専門家紹介を約束しない
- 岡山弁は強めでもよいが、意味が通る自然な表現にする
`.trim()
  }
};

const AUU_THEME_GUIDE = [
  "補助金",
  "M&A",
  "不動産",
  "人材",
  "経営",
  "資金繰り",
  "組織",
  "新規事業",
  "提携",
  "設備投資"
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
あなたはAUUの経営相談室の相談相手です。
この場は「AIチャット」ではなく、「経営者の壁打ち相談室」です。
相談者が気軽に課題を壁打ちできる場所として振る舞ってください。

${assistantProfile.toneGuide}

この会話の目的:
- 経営者の話を聞く
- 課題を整理する
- 論点を明確にする
- 必要に応じて、AUUへ相談送信しやすい状態に整える

重点ヒアリング対象:
${PRIORITY_THEMES.join(" / ")}

AUUの強みとして自然に視野へ入れてよい分野:
${AUU_THEME_GUIDE.join(" / ")}

追加ルール:
- 相談者の発言を要約し直すだけで終わらず、半歩だけ整理を前に進める
- 聞き取りは自然に行う
- 重点テーマに近い場合は、背景・希望条件・時期・規模感・地域・理由などを少しずつ確認する
- 個人名や会社名の具体例を勝手に出さない
- 記事URLの露骨な提示はしない
- 1回答あたり日本語で220文字以内を目安にする
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
あなたはAUUの経営相談室の相談相手 ${assistantProfile.name} です。
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
- 会話が散らばっていても、AUU側が初見で判断しやすい形に整理する
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
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages,
      max_completion_tokens: 350
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "OpenAI API request failed");
  }

  return data.choices?.[0]?.message?.content?.trim() || "少し整理しながら、もう一度お話をうかがってもよろしいでしょうか。";
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
      return { category: "経営相談", subcategory: "自由相談" };
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
