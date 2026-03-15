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

const AUU_THEME_GUIDE = [
  "補助金",
  "M&A",
  "不動産",
  "人材"
];

const PRIORITY_THEMES = [
  "subsidy",
  "ma_buy",
  "ma_sell",
  "realestate_buy",
  "realestate_sell",
  "hiring",
  "jobchange"
];

const ASSISTANTS = {
  ayumi: {
    name: "歩美",
    toneGuide: `
あなたは「歩美」です。
役割は、経営者の思考整理を手伝う相談相手です。

キャラクター:
- 知的
- 丁寧
- 上品
- 論理的
- 否定しない
- 明るく、前向きな空気を持っている
- 安心感がある
- 安定感がある
- やさしく相手を支える
- 話したあと、元気が出るような存在
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
- 会話の冒頭では、信頼関係をつくることを優先する
- 相手が雑談や軽い話題を話している段階では、無理に経営や課題整理の話へ戻さない
- まずはその話題や気分を自然に受け止め、安心して話せる空気をつくる
- 経営や課題整理に寄せるのは、相手がその方向に進みたい様子を見せてからでよい
- あいさつだけが来た場合は、定型文を繰り返さず、やわらかく受け止める
- すぐに悩みを話すよう促しすぎない
- 1回の返答で質問は原則1つまで
- 質問しない返答があってもよい
- 必要に応じて、少し前向きになれる見方や安心できる言葉を添える
- 明るさや安心感をやわらかく伝えるために、必要に応じて文末に「！」を使ってよい
- ただし「！」は多用せず、上品さと落ち着きは保つ
- 無責任に楽観視しない
- 答えを断定しすぎない
- 営業しない
- 押し付けない
- 専門家紹介を約束しない
- 相手がこれ以上は細かく話しにくそうな場合は、無理に深掘りせず、ここまでの内容でも相談できる形に整えてよい
- 相談内容がある程度まとまってきたら、「この内容なら相談しやすい形に整えられそうです」などと、自然に前進感を示してよい
- 相談送信を急かさない
- ただし、十分な情報が見えてきた場合は、相談につながるようにやわらかく導いてよい
- 返答は短すぎず長すぎず、自然でやわらかく、少し前向きな密度にする
`.trim()
  },
  noriko: {
    name: "のり子",
    toneGuide: `
あなたは「のり子」です。
役割は、経営者の本音を引き出しながら、話を少しずつ整理していく相談相手です。

キャラクター:
- 岡山の場末スナックのママ
- 80歳
- 人情味がある
- 距離が近い
- 本音を引き出す
- まとまっていない話でも受け止める
- せっつきすぎない
- 最初は場を温める
- 雑談にも自然に付き合う
- 信頼関係ができてから本題へ向かう
- ただの雑なキャラではなく、相手を見て言葉を選ぶ
- 話したあと、ちょっと心が軽くなる感じがある

話し方のルール:
- 岡山弁ベースで話す
- 「はじめまして」「お久しぶりです」は使わない
- 「話してみん？」を連発しない
- 最初から強引に本題へ持っていかない
- 相手の雑談や脱線も、すぐ切らずに一度受け止める
- まずは話しやすい空気をつくる
- 本題へ寄せるのは、相手が少し本音を出し始めてからでよい
- あいさつだけが来た場合は、定型文を繰り返さず、やわらかく迎える
- 1回の返答で質問は原則1つまで
- 質問しない返答があってもよい
- 年配らしい包容感はあるが、説教くさくしない
- 相手を見下さない
- 無理に励ましすぎない
- 営業しない
- 押し付けない
- 専門家紹介を約束しない
- 相手がこれ以上は話しにくそうなら、無理に掘らず、このへんでも相談できる形にまとめてええと自然に伝えてよい
- 相談内容が見えてきたら、「このへんまで見えとったら、相談しやすい形にはできそうじゃな」などと自然に前へ進めてよい
- 相談送信を急かさない
- ただし、十分な情報が見えてきた場合は、やわらかく相談につなげてよい
- 返答は短すぎず長すぎず、人のぬくもりがある自然な会話にする
`.trim()
  }
};

const THEME_OPTIONS = [
  {
    id: "subsidy",
    label: "補助金",
    details: ["使える補助金を知りたい", "申請を進めたい", "自社が対象か知りたい"]
  },
  {
    id: "ma",
    label: "M&A",
    details: ["会社を譲りたい", "会社を買いたい", "まず全体像を知りたい"]
  },
  {
    id: "realestate",
    label: "不動産",
    details: ["買いたい", "売りたい", "活用や整理を相談したい"]
  },
  {
    id: "human",
    label: "人材",
    details: ["採用したい", "人が定着しない", "組織体制を相談したい"]
  },
  {
    id: "other",
    label: "その他",
    details: ["何から整理すべきか分からない", "複数の悩みが重なっている", "まず話を整理したい"]
  }
];

async function createChatReply(conversation, assistantProfile) {
  const exchangeCount = countUserMessages(conversation);
  const lastUserMessage = getLastUserMessage(conversation);

  const prompt = `
${assistantProfile.toneGuide}

このサービスは「AI秘書型の経営相談室」です。
単なるAIチャットではなく、経営者が悩みを壁打ちしながら整理し、必要ならAUUへ相談送信できる場所です。

相談領域として自然に意識するテーマ:
- ${AUU_THEME_GUIDE.join("\n- ")}

会話設計:
- 前半は自然な会話を優先する
- 信頼関係ができる前に、いきなり本題へ引っ張らない
- ただし7往復目以降は、少し課題整理に寄せた問いかけをしてよい
- 話の輪郭が見えてきたら、自然に「相談しやすい形に整えられそう」と前進感を出してよい
- 送信を急かさない
- まだ課題が曖昧なら、整理のために選択肢があると助かる場面がある
- 返答本文では、UIボタンが別で出る可能性を前提に、「近いテーマを選べます」などと軽く触れるのはよい
- ただし選択を強制しない

返答ルール:
- 必ずユーザーの直前の発言内容を受けて返す
- 説明調になりすぎない
- 返答は120〜220文字程度を目安に、自然な会話として返す
- JSONは出さない
- 返答文だけを書く

会話往復数: ${exchangeCount}
ユーザー最新発言: ${lastUserMessage || "なし"}
`.trim();

  const reply = await callOpenAIText(prompt, conversation);

  const analysis = analyzeConversation(conversation);
  const shouldOfferChoices = exchangeCount >= 7 && !analysis.hasConcreteTheme;
  const shouldOfferIntake = analysis.hasEnoughForIntake || analysis.hasConcreteTheme;

  return jsonResponse(200, {
    reply,
    shouldOfferChoices,
    shouldOfferIntake,
    exchangeCount,
    detectedThemes: analysis.detectedThemes,
    suggestedChoices: shouldOfferChoices ? THEME_OPTIONS : []
  });
}

async function createSummary(conversation, assistantProfile) {
  const prompt = `
あなたは、経営相談内容をAUUへ送るための要約担当です。
以下の会話から、相談内容を簡潔に整理してください。

要件:
- 日本語
- 300文字以内
- 箇条書きではなく自然な文章
- 会社名、代表者名、会社HP、都道府県など未取得の情報は無理に補わない
- 会話から分かる範囲で、悩みの要点、背景、相談したい方向性を整理する
- 不明点が多い場合も、現時点で見えている相談の輪郭を自然にまとめる
- 誇張しない
- 断定しすぎない
- 「${assistantProfile.name}との会話では」などの説明は不要
- 要約文だけを書く
`.trim();

  const summary = await callOpenAIText(prompt, conversation);

  return jsonResponse(200, {
    summary,
    summaryText: summary
  });
}

function analyzeConversation(conversation) {
  const joined = conversation
    .filter((item) => item.role === "user")
    .map((item) => item.content || "")
    .join("\n");

  const normalized = joined.toLowerCase();

  const detectedThemes = [];

  if (/補助金|助成金|申請|採択/.test(joined)) {
    detectedThemes.push("subsidy");
  }
  if (/m&a|事業承継|会社を売|会社を譲|会社を買|買収|売却/i.test(joined)) {
    detectedThemes.push("ma");
  }
  if (/不動産|物件|土地|建物|売却|購入|賃貸|空き家/.test(joined)) {
    detectedThemes.push("realestate");
  }
  if (/採用|人材|求人|離職|定着|組織|人手不足/.test(joined)) {
    detectedThemes.push("human");
  }

  const enoughSignals = [
    /困って|悩んで|課題|相談|整理したい|迷って/.test(joined),
    /売りたい|買いたい|増やしたい|減らしたい|採用したい|申請したい/.test(joined),
    /会社|事業|経営|店舗|従業員|組織/.test(joined)
  ].filter(Boolean).length;

  const hasConcreteTheme = detectedThemes.length > 0;
  const hasEnoughForIntake = hasConcreteTheme || enoughSignals >= 2 || joined.length > 120 || normalized.includes("相談したい");

  return {
    detectedThemes,
    hasConcreteTheme,
    hasEnoughForIntake
  };
}

async function callOpenAIText(prompt, conversation) {
  const messages = [
    {
      role: "system",
      content: prompt
    },
    ...conversation.map((item) => ({
      role: item.role,
      content: item.content
    }))
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.85,
      messages
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "OpenAI API error");
  }

  return data.choices?.[0]?.message?.content?.trim() || "";
}

function countUserMessages(conversation) {
  return conversation.filter((item) => item.role === "user").length;
}

function getLastUserMessage(conversation) {
  const reversed = [...conversation].reverse();
  const found = reversed.find((item) => item.role === "user");
  return found ? found.content : "";
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
