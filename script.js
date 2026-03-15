const chatLauncher = document.getElementById("chatLauncher");
const chatBox = document.getElementById("chatBox");
const chatBody = document.getElementById("chatBody");
const chatComposer = document.getElementById("chatComposer");
const chatInput = document.getElementById("chatInput");
const sendButton = document.getElementById("sendButton");
const chatClose = document.getElementById("chatClose");
const headerAvatar = document.getElementById("headerAvatar");
const headerTitle = document.getElementById("headerTitle");
const headerSubtitle = document.getElementById("headerSubtitle");

const GAS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxN8FTZ7xNGWazi-lAZIF8nKoU2_E2VjUS-_HasDFxJy_5rewyQb1quqgyhNaTKHDSD/exec";

const ASSISTANTS = {
  ayumi: {
    key: "ayumi",
    name: "歩美",
    role: "思考整理型",
    image: "ayumi.png",
    shortHeader: "歩美と相談中",
    subtitle: "やさしく整理します",
    selectionCopy: "知的で前向きな対話で、考えや悩みを優しく整えます。",
    cta: "やさしく整理します",
    intro: "今日は、どんなことを整理していきましょうか。",
    intakeLine: "ここまでのお話を整理すると、相談内容の輪郭が見えてきました。必要でしたら、この内容を整理した形でお預かりできます。",
    choiceLead: "いくつか近いテーマを並べてみますね。近いものがあれば、お選びください。"
  },
  noriko: {
    key: "noriko",
    name: "のり子",
    role: "本音引き出し型",
    image: "noriko.png",
    shortHeader: "のり子と相談中",
    subtitle: "あんた！話してみい",
    selectionCopy: "まとまらんでもええけぇ、本音や引っかかり話せます。",
    cta: "あんた！話してみい",
    intro: "あんた、どしたん。胸ん中にあるもん、ちょっと出してみん？",
    intakeLine: "ここまで聞いたら、だいぶ芯が見えてきたが。必要なら、この内容を整理した形で預かれるで。",
    choiceLead: "いまの話やと、このへんが近そうじゃな。近いもんがあったら選んでみん？"
  }
};

const CATEGORY_CHOICES = {
  "M&A・事業承継": [
    "後継者不在で悩んでいる",
    "会社の売却を検討している",
    "買収を考えている",
    "第三者への承継を相談したい",
    "その他のM&A・事業承継に関すること"
  ],
  "補助金・助成金": [
    "新規事業や設備投資の予定がある",
    "どの補助金・助成金が使えるか知りたい",
    "専門家に申請手続きをサポートしてほしい",
    "事業計画書の作成を相談したい",
    "その他の補助金・助成金に関すること"
  ],
  "不動産": [
    "不動産の購入を検討している",
    "不動産の売却を検討している",
    "収益物件や事業用物件の相談をしたい",
    "遊休資産の活用を相談したい",
    "その他の不動産に関すること"
  ],
  "人材": [
    "人材の採用で困っている",
    "定着率や離職率を改善したい",
    "組織体制を見直したい",
    "幹部候補や専門人材を探したい",
    "その他の人材に関すること"
  ],
  "資金・財務": [
    "融資や資金繰りで悩んでいる",
    "節税や税務対策について相談したい",
    "財務改善や分析をしたい",
    "出資や投資の相談をしたい",
    "その他の資金・財務に関すること"
  ],
  "新規事業・パートナー": [
    "新しい事業の立ち上げを考えている",
    "パートナーや協業先を探している",
    "専門家を紹介してほしい",
    "補助金や設備投資も絡めて相談したい",
    "その他の新規事業・パートナーに関すること"
  ],
  "その他のご相談": [
    "経営全般の相談をしたい",
    "何から相談してよいか分からない",
    "自社に合う支援を知りたい",
    "外部専門家の紹介を受けたい",
    "その他のご相談"
  ]
};

const SUBCATEGORY_THEME_MAP = {
  "新規事業や設備投資の予定がある": "subsidy",
  "どの補助金・助成金が使えるか知りたい": "subsidy",
  "専門家に申請手続きをサポートしてほしい": "subsidy",
  "事業計画書の作成を相談したい": "subsidy",
  "会社の売却を検討している": "ma_sell",
  "後継者不在で悩んでいる": "ma_sell",
  "第三者への承継を相談したい": "ma_sell",
  "買収を考えている": "ma_buy",
  "不動産の購入を検討している": "realestate_buy",
  "収益物件や事業用物件の相談をしたい": "realestate_buy",
  "不動産の売却を検討している": "realestate_sell",
  "遊休資産の活用を相談したい": "realestate_sell",
  "人材の採用で困っている": "hiring",
  "定着率や離職率を改善したい": "hiring",
  "組織体制を見直したい": "hiring",
  "幹部候補や専門人材を探したい": "hiring"
};

const PRIORITY_THEME_LABELS = {
  subsidy: "補助金",
  ma_buy: "M&A（買収）",
  ma_sell: "M&A（譲渡）",
  realestate_buy: "不動産（買）",
  realestate_sell: "不動産（売）",
  hiring: "人材（採用ニーズ）",
  jobchange: "人材（転職・就職ニーズ）",
  none: ""
};

let selectedAssistant = null;
let conversation = [];
let intakePromptShown = false;
let intakeFormShown = false;
let choicePromptShown = false;
let choiceStep = "";
let choiceCategory = "";
let latestSummary = "";
let latestCategory = "経営相談";
let latestSubcategory = "自由相談";
let latestPriorityTheme = "";

chatLauncher.addEventListener("click", openChat);
chatClose.addEventListener("click", closeChat);
chatComposer.addEventListener("submit", handleSend);
chatInput.addEventListener("input", autoResizeComposer);
chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatComposer.requestSubmit();
  }
});

openChat();

function openChat() {
  chatBox.hidden = false;
  chatLauncher.hidden = true;
  chatLauncher.setAttribute("aria-expanded", "true");
  document.body.classList.add("chat-home");
  resetToSelection();
}

function closeChat() {
  chatBox.hidden = true;
  chatLauncher.hidden = false;
  chatLauncher.setAttribute("aria-expanded", "false");
  document.body.classList.remove("chat-home");
}

function resetToSelection() {
  selectedAssistant = null;
  conversation = [];
  intakePromptShown = false;
  intakeFormShown = false;
  choicePromptShown = false;
  choiceStep = "";
  choiceCategory = "";
  latestSummary = "";
  latestCategory = "経営相談";
  latestSubcategory = "自由相談";
  latestPriorityTheme = "";

  headerAvatar.src = ASSISTANTS.ayumi.image;
  headerTitle.textContent = "経営相談室";
  headerSubtitle.textContent = "相談相手を選んでください";
  chatBody.innerHTML = "";
  chatComposer.hidden = true;
  chatInput.value = "";
  autoResizeComposer();

  const intro = document.createElement("div");
  intro.className = "intro-block";
  intro.innerHTML = `
    <div class="intro-title">相談相手を選んでください</div>
    <div class="intro-text">
      経営の悩みが整っていなくても大丈夫です。<br>
      歩美とのり子が、悩みや本音を整理します。
    </div>
  `;
  chatBody.appendChild(intro);

  const grid = document.createElement("div");
  grid.className = "selection-grid";
  grid.appendChild(createSecretaryCard(ASSISTANTS.ayumi));
  grid.appendChild(createSecretaryCard(ASSISTANTS.noriko));
  chatBody.appendChild(grid);

  const chip = document.createElement("div");
  chip.className = "system-chip";
  chip.textContent = "会話のあと、必要に応じて相談送信へ進めます";
  chatBody.appendChild(chip);
}

function createSecretaryCard(assistant) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `secretary-card ${assistant.key}`;
  button.innerHTML = `
    <div class="secretary-image-wrap">
      <img class="secretary-portrait-large" src="${assistant.image}" alt="${assistant.name}" />
    </div>
    <div class="secretary-role">${assistant.role}</div>
    <div class="secretary-name">${assistant.name}</div>
    <div class="secretary-copy">${assistant.selectionCopy}</div>
    <div class="secretary-cta ${assistant.key}">${assistant.cta}</div>
  `;
  button.addEventListener("click", () => startConversation(assistant.key));
  return button;
}

async function startConversation(assistantKey) {
  selectedAssistant = ASSISTANTS[assistantKey];
  conversation = [];
  intakePromptShown = false;
  intakeFormShown = false;
  choicePromptShown = false;
  choiceStep = "";
  choiceCategory = "";
  latestSummary = "";
  latestCategory = "経営相談";
  latestSubcategory = "自由相談";
  latestPriorityTheme = "";

  headerAvatar.src = selectedAssistant.image;
  headerTitle.textContent = selectedAssistant.shortHeader;
  headerSubtitle.textContent = selectedAssistant.subtitle;
  chatBody.innerHTML = "";
  chatComposer.hidden = false;
  chatInput.value = "";
  autoResizeComposer();

  await typeBotMessage(selectedAssistant.intro);
  chatInput.focus();
}

async function handleSend(event) {
  event.preventDefault();
  if (!selectedAssistant) return;

  const text = chatInput.value.trim();
  if (!text) return;

  appendUserMessage(text);
  conversation.push({ role: "user", content: text });

  chatInput.value = "";
  autoResizeComposer();
  sendButton.disabled = true;

  const typingEl = appendTyping();

  try {
    const aiResult = await fetchAIReply();
    typingEl.remove();

    if (aiResult.reply) {
      await typeBotMessage(aiResult.reply, false);
    }

    latestCategory = aiResult.category || latestCategory;
    latestSubcategory = aiResult.subcategory || latestSubcategory;
    latestPriorityTheme = aiResult.priorityTheme || latestPriorityTheme;

    if (aiResult.articleHint) {
      appendLinkNote(aiResult.articleHint);
    }

    await handlePostReplyFlow(aiResult);
  } catch (error) {
    typingEl.remove();

    const fallback = buildFallbackReply(text);
    await typeBotMessage(fallback.reply, false);

    latestCategory = fallback.category || latestCategory;
    latestSubcategory = fallback.subcategory || latestSubcategory;
    latestPriorityTheme = fallback.priorityTheme || latestPriorityTheme;

    await handlePostReplyFlow(fallback);
  } finally {
    sendButton.disabled = false;
    chatInput.focus();
  }
}

async function handlePostReplyFlow(result) {
  const userTurns = getUserTurnCount();
  const hasConcreteIssue = hasConcreteConsultation();

  if (result.shouldOfferChoices && !choicePromptShown && !intakeFormShown) {
    choicePromptShown = true;
    await typeBotMessage(selectedAssistant.choiceLead);
    renderPrimaryChoices();
    return;
  }

  const shouldOffer = !intakePromptShown && !intakeFormShown && (
    result.shouldOfferIntake ||
    (hasConcreteIssue && userTurns >= 4) ||
    (choicePromptShown && latestSubcategory !== "自由相談")
  );

  if (shouldOffer) {
    intakePromptShown = true;
    await typeBotMessage(selectedAssistant.intakeLine);
    renderIntakeChoice();
  }
}

async function fetchAIReply() {
  const response = await fetch("/.netlify/functions/secretary-chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "chat",
      assistant: selectedAssistant.key,
      conversation
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.detail || data.error || "AI response failed");
  }

  if (data.error || data.configMissing) {
    throw new Error(data.detail || data.error || "AI configuration missing");
  }

  if (data.reply) {
    conversation.push({ role: "assistant", content: data.reply });
  }

  const localPriorityTheme = detectPriorityTheme(conversation);
  const localCategoryMap = inferCategoryFromTheme(localPriorityTheme);

  return {
    ...data,
    priorityTheme: data.priorityTheme || localPriorityTheme,
    category: data.category || localCategoryMap.category,
    subcategory: data.subcategory || localCategoryMap.subcategory,
    shouldOfferChoices: Boolean(data.shouldOfferChoices),
    shouldOfferIntake: Boolean(data.shouldOfferIntake)
  };
}

function buildFallbackReply(userText) {
  const lower = userText.toLowerCase();
  const userTurns = getUserTurnCount();
  const priorityTheme = detectPriorityTheme(conversation);
  const categoryMap = inferCategoryFromTheme(priorityTheme);
  const concrete = hasConcreteConsultation();

  let reply = "";

  if (selectedAssistant.key === "ayumi") {
    if (priorityTheme) {
      reply = `ありがとうございます。${PRIORITY_THEME_LABELS[priorityTheme]}に関わりそうなお話ですね。背景や、いま一番整理したい点をもう少しだけ教えていただけますか。`;
    } else if (userTurns >= 7) {
      reply = "ありがとうございます。ここまでのお話から、いくつか近い相談テーマを並べると整理しやすそうです。";
    } else if (lower.includes("人") || lower.includes("採用")) {
      reply = "ありがとうございます。人や体制に関わるお悩みとして整理できそうです。いまは採用そのものが難しいのか、定着や配置が難しいのか、どちらが近いでしょうか。";
    } else if (lower.includes("売上") || lower.includes("利益")) {
      reply = "ありがとうございます。数字に関わるお悩みは、背景を分けると整理しやすくなります。売上面のお悩みなのか、利益率やコスト面のお悩みなのか、どちらが近いでしょうか。";
    } else {
      reply = "ありがとうございます。まだまとまっていなくても大丈夫です。いま気になっていることを、ひとつずつ教えてください。";
    }
  } else {
    if (priorityTheme) {
      reply = `${PRIORITY_THEME_LABELS[priorityTheme]}に近い話かもしれんな。まずは、なんでそれが気になっとるんか、いちばん引っかかるところから聞かせて。`;
    } else if (userTurns >= 7) {
      reply = "ここまで聞いたら、近いテーマを選びながら整理してもよさそうじゃな。";
    } else if (lower.includes("採用") || lower.includes("人材")) {
      reply = "人のことで、だいぶ気ぃ使うとるんじゃな。採れんのか、続かんのか、そこらへんで一番しんどいのはどこなん。";
    } else if (lower.includes("新規") || lower.includes("事業")) {
      reply = "新しいことを動かす話じゃな。やりたいことはあるのに進まんのか、周りを巻き込みにくいのか、そのへん聞かせて。";
    } else {
      reply = "うまいことまとまっとらんでもええよ。いま一番もやもやしとるところを、そのまま話してみん。";
    }
  }

  conversation.push({ role: "assistant", content: reply });

  return {
    reply,
    shouldOfferIntake: userTurns >= 4 && concrete,
    shouldOfferChoices: false,
    priorityTheme,
    category: categoryMap.category,
    subcategory: categoryMap.subcategory
  };
}

function renderPrimaryChoices() {
  clearChoiceRows();
  choiceStep = "category";

  const row = document.createElement("div");
  row.className = "option-row choice-row";

  Object.keys(CATEGORY_CHOICES).forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button choice-button";
    button.textContent = category;
    button.addEventListener("click", () => renderSecondaryChoices(category));
    row.appendChild(button);
  });

  chatBody.appendChild(row);
  scrollToBottom();
}

async function renderSecondaryChoices(category) {
  clearChoiceRows();
  choiceStep = "subcategory";
  choiceCategory = category;
  latestCategory = category;

  await typeBotMessage(
    selectedAssistant.key === "ayumi"
      ? `「${category}」に近そうですね。差し支えなければ、さらに近い内容をお選びください。`
      : `「${category}」が近そうじゃな。もうひとつ近いもんを選んでみん？`
  );

  const row = document.createElement("div");
  row.className = "option-row choice-row";

  (CATEGORY_CHOICES[category] || []).forEach((label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button choice-button";
    button.textContent = label;
    button.addEventListener("click", () => handleSubcategoryChoice(category, label));
    row.appendChild(button);
  });

  chatBody.appendChild(row);
  scrollToBottom();
}

async function handleSubcategoryChoice(category, subcategory) {
  clearChoiceRows();
  choicePromptShown = true;
  latestCategory = category;
  latestSubcategory = subcategory;
  latestPriorityTheme = SUBCATEGORY_THEME_MAP[subcategory] || latestPriorityTheme;

  const selectedText = `${category} / ${subcategory}`;
  appendUserMessage(`近いテーマは「${selectedText}」です。`);
  conversation.push({ role: "user", content: `近い相談テーマは「${selectedText}」です。` });

  const reply = selectedAssistant.key === "ayumi"
    ? `ありがとうございます。「${subcategory}」に近いご相談として整理して進められそうです。必要でしたら、この内容でAUUへの相談送信に進めますし、送る前にもう少しだけ補足していただいても大丈夫です。`
    : `ありがとう。「${subcategory}」の線で整理したら進めやすそうじゃ。必要ならこの内容で相談を送れるし、送る前にもうちょい話してもええよ。`;

  conversation.push({ role: "assistant", content: reply });
  await typeBotMessage(reply, false);

  if (!intakePromptShown && !intakeFormShown) {
    intakePromptShown = true;
    renderIntakeChoice("この整理内容で相談を送る", "このテーマで少し話す");
  }
}

function clearChoiceRows() {
  chatBody.querySelectorAll(".choice-row").forEach((row) => row.remove());
}

function renderIntakeChoice(primaryLabel = "相談内容を送る", secondaryLabel = "まだ少し話したい") {
  const row = document.createElement("div");
  row.className = "option-row";
  row.innerHTML = `
    <button type="button" class="option-button">${primaryLabel}</button>
    <button type="button" class="secondary-button">${secondaryLabel}</button>
  `;

  const [primary, secondary] = row.querySelectorAll("button");

  primary.addEventListener("click", () => {
    row.remove();
    showContactForm();
  });

  secondary.addEventListener("click", async () => {
    row.remove();
    intakePromptShown = false;
    await typeBotMessage(
      selectedAssistant.key === "ayumi"
        ? "承知しました。焦らずで大丈夫ですので、もう少し一緒に整理していきましょう。"
        : "ええよ。急がんでええけぇ、もう少し話してみん。"
    );
  });

  chatBody.appendChild(row);
  scrollToBottom();
}

function showContactForm() {
  if (intakeFormShown) return;
  intakeFormShown = true;

  const card = document.createElement("div");
  card.className = "form-card";
  card.innerHTML = `
    <div class="form-title">ご相談内容をAUUへお預かりするため、連絡先をご入力ください。</div>

    <label class="field-label" for="company">会社名</label>
    <input id="company" class="form-input" type="text" placeholder="株式会社AUU" />

    <label class="field-label" for="name">お名前</label>
    <input id="name" class="form-input" type="text" placeholder="田中 雄介" />

    <label class="field-label" for="email">メールアドレス</label>
    <input id="email" class="form-input" type="email" placeholder="example@company.co.jp" />

    <div class="form-note">
      会話の内容は、整理した要約としてお預かりします。<br>
      ご入力は会社名・お名前・メールアドレスのみで大丈夫です。
    </div>

    <button type="button" class="submit-button">この内容で送る</button>
  `;

  card.querySelector(".submit-button").addEventListener("click", submitConsultation);
  chatBody.appendChild(card);
  scrollToBottom();
}

async function submitConsultation() {
  const company = document.getElementById("company")?.value.trim() || "";
  const name = document.getElementById("name")?.value.trim() || "";
  const email = document.getElementById("email")?.value.trim() || "";

  if (!company || !name || !email) {
    alert("会社名・お名前・メールアドレスをご入力ください。");
    return;
  }

  const typingEl = appendTyping();
  let summaryPayload;

  try {
    const response = await fetch("/.netlify/functions/secretary-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "summary",
        assistant: selectedAssistant.key,
        conversation
      })
    });

    if (!response.ok) {
      throw new Error("Summary failed");
    }

    summaryPayload = await response.json();
  } catch (error) {
    summaryPayload = buildLocalSummary();
  } finally {
    typingEl.remove();
  }

  latestSummary = summaryPayload.summaryText || summaryPayload.summary || buildLocalSummary().summaryText;
  latestCategory = summaryPayload.category || latestCategory;
  latestSubcategory = summaryPayload.subcategory || latestSubcategory;
  latestPriorityTheme = summaryPayload.priorityTheme || latestPriorityTheme;

  const payload = {
    category: latestCategory,
    subcategory: latestSubcategory,
    message: latestSummary,
    company,
    name,
    email
  };

  try {
    await fetch(GAS_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    // no-cors のためフロントでは詳細判定しない
  }

  await typeBotMessage(
    selectedAssistant.key === "ayumi"
      ? "ありがとうございます。ご相談内容を整理した形でお預かりしました。内容を確認のうえ、担当よりご連絡いたします。"
      : "ありがとう。ご相談内容は整理した形で預かったけぇ、内容を確認して担当から連絡するな。"
  );

  const row = document.createElement("div");
  row.className = "option-row";
  row.innerHTML = `<button type="button" class="secondary-button">🔁 もう一度相談する</button>`;
  row.querySelector("button").addEventListener("click", resetToSelection);
  chatBody.appendChild(row);
  scrollToBottom();
}

function buildLocalSummary() {
  const priorityTheme = latestPriorityTheme || detectPriorityTheme(conversation);
  const categoryMap = latestCategory !== "経営相談" || latestSubcategory !== "自由相談"
    ? { category: latestCategory, subcategory: latestSubcategory }
    : inferCategoryFromTheme(priorityTheme);

  const userMessages = conversation
    .filter((item) => item.role === "user")
    .map((item) => item.content);

  const overview = userMessages[0] || "経営に関するご相談";
  const latestThree = userMessages.slice(-3).join(" / ");

  const summaryLines = [
    `【担当秘書】${selectedAssistant.name}`,
    `【相談概要】${overview}`,
    `【整理テーマ】${categoryMap.category} / ${categoryMap.subcategory}`,
    "【本質的な課題（推定）】会話内容をもとに、状況整理と優先順位づけが必要な課題があると考えられます。",
    latestThree ? `【会話メモ】${latestThree}` : "【会話メモ】会話履歴の整理中です。",
    priorityTheme ? `【重点ヒアリング】${PRIORITY_THEME_LABELS[priorityTheme]}` : ""
  ].filter(Boolean);

  return {
    summaryText: summaryLines.join("\n"),
    category: categoryMap.category,
    subcategory: categoryMap.subcategory,
    priorityTheme
  };
}

function getUserTurnCount() {
  return conversation.filter((item) => item.role === "user").length;
}

function hasConcreteConsultation() {
  const userMessages = conversation
    .filter((item) => item.role === "user")
    .map((item) => item.content.trim())
    .filter(Boolean);

  if (!userMessages.length) return false;

  if (latestSubcategory && latestSubcategory !== "自由相談") return true;
  if (detectPriorityTheme(conversation)) return true;

  const longMessages = userMessages.filter((text) => text.length >= 24).length;
  const detailHits = countDetailSignals(userMessages.join("\n"));

  return longMessages >= 2 || detailHits >= 3;
}

function countDetailSignals(text) {
  const detailPatterns = [
    "補助金", "助成金", "設備投資", "採用", "人材", "離職", "組織", "後継者", "事業承継",
    "m&a", "売却", "買収", "譲渡", "不動産", "土地", "物件", "売上", "利益", "資金繰り",
    "融資", "税務", "節税", "新規事業", "協業", "パートナー", "dx", "ai"
  ];

  const normalized = text.toLowerCase();
  return detailPatterns.reduce((count, keyword) => count + (normalized.includes(keyword) ? 1 : 0), 0);
}

function detectPriorityTheme(items) {
  const combined = items.map((item) => item.content).join("\n").toLowerCase();

  const patterns = [
    { key: "subsidy", list: ["補助金", "助成金", "給付金", "ものづくり補助金", "事業再構築", "設備投資"] },
    { key: "ma_buy", list: ["買収", "買いたい", "m&a", "ma", "譲り受け", "会社を買", "事業を買"] },
    { key: "ma_sell", list: ["売却", "譲渡", "事業承継", "後継者不在", "会社を売", "株式譲渡"] },
    { key: "realestate_buy", list: ["不動産を買", "土地を買", "物件を買", "ビルを買", "購入したい不動産", "収益物件"] },
    { key: "realestate_sell", list: ["不動産を売", "土地を売", "物件を売", "建物を売", "売却したい不動産", "遊休資産"] },
    { key: "hiring", list: ["採用", "人材", "募集", "求人", "雇用", "中途", "新卒", "離職", "定着"] },
    { key: "jobchange", list: ["転職", "就職", "次の会社", "キャリア", "転職したい", "就職したい"] }
  ];

  for (const item of patterns) {
    if (item.list.some((keyword) => combined.includes(keyword))) {
      return item.key;
    }
  }

  return "";
}

function inferCategoryFromTheme(priorityTheme) {
  switch (priorityTheme) {
    case "subsidy":
      return { category: "補助金・助成金", subcategory: "設備投資・補助金相談" };
    case "ma_buy":
      return { category: "M&A・事業承継", subcategory: "買収ニーズ" };
    case "ma_sell":
      return { category: "M&A・事業承継", subcategory: "譲渡・売却ニーズ" };
    case "realestate_buy":
      return { category: "不動産", subcategory: "不動産購入ニーズ" };
    case "realestate_sell":
      return { category: "不動産", subcategory: "不動産売却ニーズ" };
    case "hiring":
      return { category: "人材", subcategory: "採用ニーズ" };
    case "jobchange":
      return { category: "人材", subcategory: "転職・就職ニーズ" };
    default:
      return { category: "経営相談", subcategory: "自由相談" };
  }
}

function appendUserMessage(text) {
  const row = document.createElement("div");
  row.className = "message-row user";

  const bubble = document.createElement("div");
  bubble.className = "message user";
  bubble.textContent = text;

  row.appendChild(bubble);
  chatBody.appendChild(row);
  scrollToBottom();
}

async function typeBotMessage(text, persist = true) {
  const row = document.createElement("div");
  row.className = "message-row bot";

  const avatar = document.createElement("img");
  avatar.className = "avatar";
  avatar.src = selectedAssistant ? selectedAssistant.image : ASSISTANTS.ayumi.image;
  avatar.alt = selectedAssistant ? selectedAssistant.name : "相談相手";

  const bubble = document.createElement("div");
  bubble.className = "message bot";

  row.appendChild(avatar);
  row.appendChild(bubble);
  chatBody.appendChild(row);

  await typeTextIntoElement(bubble, text);

  if (persist) {
    conversation.push({ role: "assistant", content: text });
  }

  scrollToBottom();
}

function appendTyping() {
  const row = document.createElement("div");
  row.className = "message-row bot";
  row.innerHTML = `
    <img class="avatar" src="${selectedAssistant.image}" alt="${selectedAssistant.name}">
    <div class="message bot">
      <div class="typing"><span></span><span></span><span></span></div>
    </div>
  `;
  chatBody.appendChild(row);
  scrollToBottom();
  return row;
}

function appendLinkNote(text) {
  const note = document.createElement("div");
  note.className = "link-note";
  note.textContent = text;
  chatBody.appendChild(note);
  scrollToBottom();
}

function typeTextIntoElement(element, text) {
  return new Promise((resolve) => {
    if (!text) {
      resolve();
      return;
    }

    let index = 0;
    const speed = 18;

    function step() {
      element.textContent = text.slice(0, index + 1);
      scrollToBottom();
      index += 1;

      if (index < text.length) {
        window.setTimeout(step, speed);
      } else {
        resolve();
      }
    }

    step();
  });
}

function scrollToBottom() {
  chatBody.scrollTop = chatBody.scrollHeight;
}

function autoResizeComposer() {
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 140)}px`;
}
