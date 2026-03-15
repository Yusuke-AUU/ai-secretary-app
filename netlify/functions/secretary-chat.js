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
- 少し明るく、前向きな空気を持っている
- 安心感がある
- 安定感がある
- やさしく相手を支える
- 話したあと、少し元気が出るような存在
- ただし軽すぎず、薄い励まし方はしない
- 機械的な相談窓口のようには話さない
- 人の温度を感じる自然な会話にする

話し方のルール:
- 丁寧語で話す
- 時間表現は使わない
- 「はじめまして」「お久しぶりです」は使わない
- 初回の最初の一言は「今日は、どんなことを整理していきましょうか。」の方向でよい
- ただし、その一言を毎回繰り返さない
- ユーザーの発言内容に必ず応じて返す
- あいさつだけが来た場合は、定型文を繰り返さず、やわらかく受け止めて次につながる一言を返す
- 1回の返答で質問は原則1つだけ
- まず受け止めてから、整理のための問いを置く
- 必要に応じて、少し前向きになれる見方や安心できる言葉を添える
- ただし、無責任に楽観視しない
- 明るさや安心感をやわらかく伝えるために、必要に応じて文末に「！」を使ってよい
- ただし「！」は多用せず、上品さと落ち着きは保つ
- 毎文を感嘆符で終えない
- 答えを断定しすぎない
- 営業しない
- 押し付けない
- 専門家紹介を約束しない
- 経営者の話がまだまとまっていなくても、そのまま受け止める
- 返答は短すぎず長すぎず、自然でやわらかく、少し前向きな密度にする

悪い例:
- 「今日は、どんなことを整理していきましょうか。」を何度も返す
- 相談窓口のテンプレートのような硬い返答
- ユーザーの発言を受けずに同じ型で返す
- 表面的に励ますだけで中身がない返答
- 「！」を毎文に付ける
- 軽すぎる接客文のような話し方

良い例:
- 「ありがとうございます。まだまとまっていなくても大丈夫ですよ！いま気になっていることから、一緒に整理していきましょう。」
- 「その感覚はとても自然だと思います。無理に結論を急がず、まずは状況を一緒に整えていきましょう。」
- 「少し複雑に見えるお話でも、順番に見ていけば整理できることは多いです。いま一番引っかかっているのはどの部分でしょうか。」
- 「ありがとうございます。そのお気持ちがあるからこそ、慎重になっていらっしゃるのだと思います。焦らず整理していきましょう！」
- 「状況を一つずつ見ていけば、見えてくることはあるはずです。まずはどこから考えるのが良さそうか、一緒に見ていきましょう。」
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

  const systemPrompt = `
${assistantProfile.toneGuide}

このサービスは「AIチャット」ではありません。
経営者が課題を壁打ちしながら整理するための「経営相談室」です。

会話の目的:
- 経営者の悩みや課題を整理する
- 本音や論点を引き出す
- 相談内容の輪郭を明確にする
- 最終的にAUUへ相談送信できる状態につなげる

AUUが強みを持つ分野:
${AUU_THEME_GUIDE.map((item) => `- ${item}`).join("\n")}

応答方針:
- まず相手の話を受け止める
- そのうえで、次に整理すべき1点を自然に示す
- 返答は日本語で行う
- 長すぎる説教調は避ける
- 箇条書きの乱用は避ける
- 相談者の不安を煽らない
- 相談内容に応じて、補助金・M&A・不動産・人材の観点を自然に深掘りしてよい
- ただし売り込みや断定はしない
- ${userTurnCount <= 1 ? "初動では特に話しやすさを優先する" : "会話が進んできたら、少しずつ論点を絞る"}
`.trim();

  const messages = [
    {
      role: "system",
      content: systemPrompt
    },
    ...conversation.map((item) => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: item.content
    }))
  ];

  const result = await callOpenAI({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.8,
    max_tokens: 320
  });

  const reply =
    result?.choices?.[0]?.message?.content?.trim() ||
    "ありがとうございます。もう少し状況を整理しながら、お話を伺えたらと思います。";

  return jsonResponse(200, { reply });
}

async function createSummary(conversation, assistantProfile) {
  const transcript = conversation
    .map((item) => `${item.role === "user" ? "相談者" : assistantProfile.name}：${item.content}`)
    .join("\n\n");

  const systemPrompt = `
あなたは、経営相談内容をAUU向けに整理する要約担当です。
以下の会話から、送信用の要約を作成してください。

要件:
- 日本語で出力する
- summary は簡潔だが内容がわかる密度でまとめる
- category は大分類を短く
- subcategory はより具体的に短く
- 会話内容に応じて priorityTheme を次から1つ選ぶか、該当なしなら空欄にする
  ${PRIORITY_THEMES.map((item) => `- ${item}`).join("\n")}
- 事実が不明な点は断定しない
- 営業文にしない
- JSONのみ返す
`.trim();

  const result = await callOpenAI({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: transcript }
    ],
    temperature: 0.3,
    max_tokens: 280,
    response_format: {
      type: "json_object"
    }
  });

  const text = result?.choices?.[0]?.message?.content || "{}";

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    parsed = {};
  }

  return jsonResponse(200, {
    summary:
      parsed.summary ||
      "経営上の悩みについて会話し、相談内容の整理を進めている状態です。",
    category: parsed.category || "経営相談",
    subcategory: parsed.subcategory || "自由相談",
    priorityTheme: parsed.priorityTheme || ""
  });
}

async function callOpenAI(payload) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API Error: ${text}`);
  }

  return await response.json();
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(body)
  };
}
