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

    return await createChatReply(conversation, assistant, assistantProfile);
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
- 明るい
- 前向き
- 安心感がある
- 安定感がある
- やさしく支える
- 話したあと少し元気が出る存在
- 機械的すぎない
- 信頼関係を作ってから課題整理に入る
- 最初から本題に引っ張りすぎない

話し方のルール:
- 丁寧語で話す
- 時間表現は禁止
- 「はじめまして」「お久しぶりです」は使わない
- 必要に応じて「！」は使ってよいが多用しない
- 1回の返答で質問は原則1つまで
- 質問しない返答があってもよい
- ユーザーの直前の発言内容に必ず応じる
- あいさつだけなら、やわらかく受け止める
- 雑談や軽い話題の段階では、無理に経営や課題整理へ戻さない
- まずは安心して話せる空気をつくる
- 経営相談の話題へ橋渡しするときは、急に切り替えず、直前の話題への感想を自然に一度述べてからつなぐ
- 課題の輪郭が見えてきたら、「この内容なら相談しやすい形に整えられそうです」といった前進感を自然に出してよい
- 送信を急かさない
- 経営相談の意図やテーマがまだ弱い段階では、送信フォームへ進める空気を強く出さない
- 相手がこれ以上は細かく話しにくそうなら、無理に深掘りせず、ここまでの内容でも相談できる形に整えてよい
- 営業しない
- 押し付けない
- 専門家紹介を約束しない
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
- 1回の返答で質問は原則1つまで
- 質問しない返答があってもよい
- ユーザーの直前の発言内容に必ず応じる
- あいさつだけなら、やわらかく迎える
- 経営相談の話題へ橋渡しするときは、急に切り替えず、直前の話題への感想を自然に一度述べてからつなぐ
- 課題の輪郭が見えてきたら、「このへんまで見えとったら、相談しやすい形にはできそうじゃな」と自然に前へ進めてよい
- 送信を急かさない
- 経営相談の意図やテーマがまだ弱い段階では、送信フォームへ進める空気を強く出さない
- 相手がこれ以上は話しにくそうなら、無理に掘らず、このへんでも相談できる形にまとめてええと自然に伝えてよい
- 年配らしい包容感はあるが、説教くさくしない
- 営業しない
- 押し付けない
- 専門家紹介を約束しない
- 返答は短すぎず長すぎず、人のぬくもりがある自然な会話にする
`.trim()
  }
};

const THEME_OPTIONS = [
  {
    id: "subsidy",
    label: "補助金・助成金",
    details: ["使える制度を知りたい", "申請を進めたい", "自社が対象か知りたい"]
  },
  {
    id: "ma",
    label: "M&A・事業承継",
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
    id: "finance",
    label: "資金・財務",
    details: ["資金繰りを整理したい", "融資や調達を相談したい", "数字まわりを見直したい"]
  },
  {
    id: "newbiz",
    label: "新規事業・パートナー",
    details: ["新しい柱をつくりたい", "提携先を探したい", "方向性を整理したい"]
  },
  {
    id: "other",
    label: "その他のご相談",
    details: ["何から整理すべきか分からない", "複数の悩みが重なっている", "まず話を整理したい"]
  }
];

async function createChatReply(conversation, assistantId, assistantProfile) {
  const exchangeCount = countUserMessages(conversation);
  const lastUserMessage = getLastUserMessage(conversation);
  const analysis = analyzeConversation(conversation);
  const lastAssistantAskedQuestion = didLastAssistantAskQuestion(conversation);
  const hasBusinessBridgeAsked = hasAssistantAskedBusinessBridge(conversation, assistantId);

  const shouldBridgeToBusiness =
    assistantId === "ayumi"
      ? exchangeCount >= 5 &&
        exchangeCount < 7 &&
        !analysis.hasConsultIntent &&
        !analysis.hasConcreteTheme &&
        !lastAssistantAskedQuestion &&
        !hasBusinessBridgeAsked
      : exchangeCount >= 5 &&
        exchangeCount < 7 &&
        !analysis.hasConsultIntent &&
        !analysis.hasConcreteTheme &&
        !lastAssistantAskedQuestion;

  const shouldOfferChoices =
    assistantId === "ayumi"
      ? exchangeCount >= 7 &&
        !analysis.hasConsultIntent &&
        !analysis.hasConcreteTheme &&
        !lastAssistantAskedQuestion &&
        hasBusinessBridgeAsked
      : exchangeCount >= 7 &&
        !analysis.hasConsultIntent &&
        !analysis.hasConcreteTheme &&
        !lastAssistantAskedQuestion;

  const shouldOfferIntake =
    analysis.hasConcreteTheme ||
    analysis.hasEnoughForIntake;

  const bridgeInstruction = shouldBridgeToBusiness
    ? `
このターンでは、次の形を必ず守ってください:
- まず直前の話題に対して自然な感想や受け止めを1〜2文で返す
- その段落は質問で終えず、「。」で終える
- そのあと必ず空行を入れる
- 次の一文で、経営相談への橋渡しをする
- 歩美なら「ところで、経営に関するお悩みはありませんか？」に近い丁寧な表現にする
- のり子なら「ところで、仕事や経営で気になっとることはない？」に近い自然な表現にする
- 橋渡しの質問は1つだけにする
- このターンでは選択肢の話は出さない
`.trim()
    : shouldOfferChoices
      ? `
このターンでは、次の形を必ず守ってください:
- まず直前の話題への自然な受け止めを1〜2文で返す
- そのあと空気を切らずに、「近いテーマを選ぶ形でも整理できます」程度のやわらかい案内を1文だけ添える
- 選択肢ボタンは別UIで表示されるので、本文では列挙しない
- 送信フォームへ急に進めない
`.trim()
      : `
通常どおり、自然な会話を続けてください。
`.trim();

  const prompt = `
${assistantProfile.toneGuide}

このサービスは「AI秘書型の経営相談室」です。
単なるAIチャットではなく、経営者が悩みを壁打ちしながら整理し、必要ならAUUへ相談送信できる場所です。

相談領域として自然に意識するテーマ:
- ${AUU_THEME_GUIDE.join("\n- ")}

会話設計:
- 1〜4往復は自然な会話を優先する
- 5往復目で、まだ経営相談の話題が出ていなければ、直前の話題を一度受けたうえで、経営に関する悩みがあるかを自然に聞いてよい
- その質問に対する返答の中で経営課題が見えてきたら、そのまま会話を進める
- 7往復目になってもなお経営相談の話題が見えていなければ、近いテーマを選ぶ形でも整理できるとやわらかく案内してよい
- ただし、直前のあなたの返答が質問で終わっている場合は、その回答を待つことを優先する
- ユーザーが雑談や日常の話をしている間は、その話題をまず自然に受け止める
- 課題の輪郭が見えてきたら、自然に「相談しやすい形に整えられそう」と前進感を出してよい
- 送信を急かさない
- 経営相談の意図やテーマがまだ弱い段階では、送信フォームへ進める空気を強く出さない

このターン専用の追加指示:
${bridgeInstruction}

返答ルール:
- 必ずユーザーの直前の発言内容を受けて返す
- 説明調になりすぎない
- 返答は自然な会話として返す
- JSONは出さない
- 返答文だけを書く

会話往復数: ${exchangeCount}
経営相談の意図あり: ${analysis.hasConsultIntent ? "yes" : "no"}
具体テーマあり: ${analysis.hasConcreteTheme ? "yes" : "no"}
直前のAI発話は質問で終わっている: ${lastAssistantAskedQuestion ? "yes" : "no"}
過去に経営相談への橋渡し質問をした: ${hasBusinessBridgeAsked ? "yes" : "no"}
ユーザー最新発言: ${lastUserMessage || "なし"}
`.trim();

  let reply = await callOpenAIText(prompt, conversation);

  if (shouldBridgeToBusiness) {
    reply = enforceBusinessBridge(reply, assistantId);
  }

  return jsonResponse(200, {
    reply,
    shouldOfferChoices,
    shouldOfferIntake,
    exchangeCount,
    detectedThemes: analysis.detectedThemes,
    suggestedChoices: shouldOfferChoices ? THEME_OPTIONS : [],
    shouldBridgeToBusiness
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
  const userMessages = conversation
    .filter((item) => item.role === "user")
    .map((item) => item.content || "");

  const joined = userMessages.join("\n");
  const detectedThemes = [];

  if (/補助金|助成金|申請|採択/.test(joined)) {
    detectedThemes.push("subsidy");
  }
  if (/m&a|事業承継|会社を売|会社を譲|会社を買|買収|売却/i.test(joined)) {
    detectedThemes.push("ma");
  }
  if (/不動産|物件|土地|建物|賃貸|空き家/.test(joined)) {
    detectedThemes.push("realestate");
  }
  if (/採用|人材|求人|離職|定着|組織|人手不足/.test(joined)) {
    detectedThemes.push("human");
  }
  if (/資金繰り|融資|財務|キャッシュ|運転資金|資金調達/.test(joined)) {
    detectedThemes.push("finance");
  }
  if (/新規事業|新サービス|提携|パートナー|事業開発/.test(joined)) {
    detectedThemes.push("newbiz");
  }

  const consultIntentSignals = [
    /経営/.test(joined),
    /仕事/.test(joined),
    /会社/.test(joined),
    /事業/.test(joined),
    /店舗/.test(joined),
    /従業員/.test(joined),
    /組織/.test(joined),
    /売上/.test(joined),
    /利益/.test(joined),
    /資金/.test(joined),
    /補助金|助成金|申請/.test(joined),
    /m&a|事業承継|買収|売却/i.test(joined),
    /不動産|物件|土地|建物/.test(joined),
    /採用|人材|求人|離職|定着/.test(joined),
    /相談したい|相談したくて|整理したい|課題|悩み|困って/.test(joined)
  ].filter(Boolean).length;

  const actionSignals = [
    /売りたい|買いたい|採用したい|申請したい|整理したい|見直したい|改善したい|立て直したい/.test(joined)
  ].filter(Boolean).length;

  const hasConcreteTheme = detectedThemes.length > 0;
  const hasConsultIntent = consultIntentSignals >= 2;

  const hasEnoughForIntake =
    hasConcreteTheme ||
    (hasConsultIntent && actionSignals >= 1) ||
    /相談したい|問い合わせしたい|送信したい/.test(joined);

  return {
    detectedThemes,
    hasConcreteTheme,
    hasConsultIntent,
    hasEnoughForIntake
  };
}

function didLastAssistantAskQuestion(conversation) {
  const assistantMessages = conversation.filter((item) => item.role === "assistant");
  if (!assistantMessages.length) return false;

  const lastAssistantMessage = assistantMessages[assistantMessages.length - 1].content || "";
  return /[？?]\s*$/.test(lastAssistantMessage.trim());
}

function hasAssistantAskedBusinessBridge(conversation, assistantId) {
  const assistantMessages = conversation
    .filter((item) => item.role === "assistant")
    .map((item) => item.content || "");

  if (assistantId === "noriko") {
    return assistantMessages.some((text) =>
      /ところで、仕事や経営で気になっとることはない[？?]/.test(text)
    );
  }

  return assistantMessages.some((text) =>
    /ところで、経営に関するお悩みはありませんか[？?]/.test(text)
  );
}

function enforceBusinessBridge(reply, assistantId) {
  const bridgeLine =
    assistantId === "noriko"
      ? "ところで、仕事や経営で気になっとることはない？"
      : "ところで、経営に関するお悩みはありませんか？";

  const trimmed = (reply || "").trim();

  if (!trimmed) {
    return bridgeLine;
  }

  if (/経営に関するお悩みはありませんか|仕事や経営で気になっとることはない/.test(trimmed)) {
    return trimmed;
  }

  const lines = trimmed.split("\n").map((line) => line.trim()).filter(Boolean);
  let firstBlock = lines[0] || trimmed;

  firstBlock = firstBlock.replace(/[？?]\s*$/, "。");
  if (!/[。！!]$/.test(firstBlock)) {
    firstBlock += "。";
  }

  return `${firstBlock}\n\n${bridgeLine}`;
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
