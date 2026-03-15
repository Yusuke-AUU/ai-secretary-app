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
    selectionCopy: "知的で落ち着いた対話で、考えや論点をやさしく整理します。",
    cta: "やさしく整理します",
    intro: "今日は、どんなことを整理していきましょうか。",
    intakeLine: "ここまでのお話を整理すると、相談内容の輪郭が見えてきました。必要でしたら、この内容を整理した形でお預かりできます。"
  },
  noriko: {
    key: "noriko",
    name: "のり子",
    role: "本音引き出し型",
    image: "noriko.png",
    shortHeader: "のり子と相談中",
    subtitle: "あんた！まず話してみん",
    selectionCopy: "まとまっとらんでもええけぇ、本音や引っかかりを遠慮なく話せます。",
    cta: "あんた！まず話してみん",
    intro: "あんた、どしたん。胸ん中にあるもん、ちょっと出してみん？",
    intakeLine: "ここまで聞いたら、だいぶ芯が見えてきたが。必要なら、この内容を整理した形で預かれるで。"
  }
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

function openChat() {
  chatBox.hidden = false;
  chatLauncher.setAttribute("aria-expanded", "true");
  resetToSelection();
}

function closeChat() {
  chatBox.hidden = true;
  chatLauncher.setAttribute("aria-expanded", "false");
}

function resetToSelection() {
  selectedAssistant = null;
  conversation = [];
  intakePromptShown = false;
  intakeFormShown = false;
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
      経営の悩みが、まだうまく整理できていなくても大丈夫です。<br>
      歩美とのり子が、それぞれのやり方で課題や本音を整理します。
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
  chip.textContent = "会話のあと、必要に応じてAUUへの相談送信へ進めます";
  chatBody.appendChild(chip);
}

function createSecretaryCard(assistant) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `secretary-card ${assistant.key}`;
  button.innerHTML = `
    <div class="secretary-image-wrap">
      <img class="secretary-portrait-large" src="${assistant.image}" alt="${assistant.name}" />
      <div class="secretary-image-glow ${assistant.key}"></div>
    </div>
    <div class="secretary-card-body">
      <div class="secretary-role-badge ${assistant.key}">${assistant.role}</div>
      <div class="secretary-name">${assistant.name}</div>
      <div class="secretary-copy">${assistant.selectionCopy}</div>
      <div class="secretary-cta ${assistant.key}">${assistant.cta}</div>
    </div>
  `;
  button.addEventListener("click", () => startConversation(assistant.key));
  return button;
}

async function startConversation(assistantKey) {
  selectedAssistant = ASSISTANTS[assistantKey];
  conversation = [];
  intakePromptShown = false;
  intakeFormShown = false;

  headerAvatar.src = selectedAssistant.image;
  headerTitle.textContent = selectedAssistant.shortHeader;
  headerSubtitle.textContent = selectedAssistant.subtitle;
  chatBody.innerHTML = "";
  chatComposer.hidden = false;
  chatInput.placeholder =
    selectedAssistant.key === "ayumi"
      ? "整理したいことを入力してください"
      : "胸ん中にあることを入力してみん";
  autoResizeComposer();

  await typeBotMessage(selectedAssistant.intro);
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
    await typeBotMessage(aiResult.reply, false);

    latestCategory = aiResult.category || latestCategory;
    latestSubcategory = aiResult.subcategory || latestSubcategory;
    latestPriorityTheme = aiResult.priorityTheme || latestPriorityTheme;

    if (aiResult.articleHint) {
      appendLinkNote(aiResult.articleHint);
    }

    const shouldOffer = aiResult.shouldOfferIntake && !intakePromptShown && !intakeFormShown;
    if (shouldOffer) {
      intakePromptShown = true;
      await typeBotMessage(selectedAssistant.intakeLine);
      renderIntakeChoice();
    }
  } catch (error) {
    typingEl.remove();
    const fallback = buildFallbackReply(text);
    await typeBotMessage(fallback.reply, false);
    latestCategory = fallback.category;
    latestSubcategory = fallback.subcategory;
    latestPriorityTheme = fallback.priorityTheme;

    if (fallback.shouldOfferIntake && !intakePromptShown && !intakeFormShown) {
      intakePromptShown = true;
      await typeBotMessage(selectedAssistant.intakeLine);
      renderIntakeChoice();
    }
  } finally {
    sendButton.disabled = false;
    chatInput.focus();
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

  return data;
}

function buildFallbackReply(userText) {
  const lower = userText.toLowerCase();
  const userTurns = conversation.filter((item) => item.role === "user").length;
  const priorityTheme = detectPriorityTheme(conversation);
  const categoryMap = inferCategoryFromTheme(priorityTheme);

  let reply = "";

  if (selectedAssistant.key === "ayumi") {
    if (priorityTheme) {
      reply = `ありがとうございます。${PRIORITY_THEME_LABELS[priorityTheme]}に関わりそうなお話ですね。背景や、いま一番整理したい点をもう少しだけ教えていただけますか。`;
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
    } else if (lower.includes("採用") || lower.includes("人材")) {
      reply = "人のことで、だいぶ気ぃ使うとるんじゃな。採れんのか、続かんのか、そこらへんで一番しんどいのはどこなん。";
    } else if (lower.includes("新規") || lower.includes("事業")) {
      reply = "新しいことを動かす話じゃな。やりたいことはあるのに進まんのか、周りを巻き込みにくいのか、そのへん聞かせて。";
    } else {
      reply = "うまいことまとまっとらんでもええよ。いま一番もやもやしとるところを、そのまま話してみん。";
    }
  }

  conversation.push({ role: "assistant", content: reply });

  const shouldOfferIntake = userTurns >= 3;
  return {
    reply,
    shouldOfferIntake,
    priorityTheme,
    category: categoryMap.category,
    subcategory: categoryMap.subcategory
  };
}

function renderIntakeChoice() {
  const row = document.createElement("div");
  row.className = "option-row";
  row.innerHTML = `
    <button type="button" class="option-button">相談内容を送る</button>
    <button type="button" class="secondary-button">まだ少し話したい</button>
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
        ? "承知しました。焦がずに大丈夫ですので、もう少し一緒に整理していきましょう。"
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

  latestSummary = summaryPayload.summaryText;
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
  const priorityTheme = detectPriorityTheme(conversation);
  const categoryMap = inferCategoryFromTheme(priorityTheme);

  const userMessages = conversation
    .filter((item) => item.role === "user")
    .map((item) => item.content);

  const overview = userMessages[0] || "経営に関するご相談";
  const latestThree = userMessages.slice(-3).join(" / ");

  const summaryLines = [
    `【担当秘書】${selectedAssistant.name}`,
    `【相談概要】${overview}`,
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

function detectPriorityTheme(items) {
  const combined = items.map((item) => item.content).join("\n").toLowerCase();

  const patterns = [
    { key: "subsidy", list: ["補助金", "助成金", "給付金", "ものづくり補助金", "事業再構築", "設備投資"] },
    { key: "ma_buy", list: ["買収", "買いたい", "m&a", "ma", "譲り受け", "会社を買", "事業を買"] },
    { key: "ma_sell", list: ["売却", "譲渡", "事業承継", "後継者不在", "会社を売", "株式譲渡"] },
    { key: "realestate_buy", list: ["不動産を買", "土地を買", "物件を買", "ビルを買", "購入したい不動産"] },
    { key: "realestate_sell", list: ["不動産を売", "土地を売", "物件を売", "建物を売", "売却したい不動産"] },
    { key: "hiring", list: ["採用", "人材", "募集", "求人", "雇用", "中途", "新卒"] },
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
      return { category: "不動産相談", subcategory: "不動産購入ニーズ" };
    case "realestate_sell":
      return { category: "不動産相談", subcategory: "不動産売却ニーズ" };
    case "hiring":
      return { category: "採用・組織・労務", subcategory: "採用ニーズ" };
    case "jobchange":
      return { category: "人材相談", subcategory: "転職・就職ニーズ" };
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
