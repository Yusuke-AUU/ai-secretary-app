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
    reading: "あゆみ",
    role: "優しい秘書",
    image: "assets/ayumi.png",
    shortHeader: "歩美と相談中",
    subtitle: "やさしく寄り添いながら、お悩みを少しずつ整理します",
    intro: "こんにちは、歩美（あゆみ）です。今日はどんなことでも気軽にお話しくださいね。",
    openingQuestion: "今、少し気になっていることはありますか？",
    intakeLine: "ここまでのお話で、気になっている点が少し見えてきました。必要でしたら、この内容を整理した形でお預かりできます。"
  },
  ayumu: {
    key: "ayumu",
    name: "歩夢",
    reading: "あゆむ",
    role: "爽やか秘書",
    image: "assets/ayumu.png",
    shortHeader: "歩夢と相談中",
    subtitle: "状況や背景を落ち着いて整理しながら、お話をうかがいます",
    intro: "こんにちは、歩夢（あゆむ）です。気になることを整理する感覚で、気軽に話してください。",
    openingQuestion: "今、少し気になっていることはありますか？",
    intakeLine: "ここまでのお話で、いくつか整理したい点が見えてきました。必要でしたら、この内容を整理した形でお預かりできます。"
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
let latestCategory = "AI秘書相談";
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
  latestCategory = "AI秘書相談";
  latestSubcategory = "自由相談";
  latestPriorityTheme = "";

  headerAvatar.src = ASSISTANTS.ayumi.image;
  headerTitle.textContent = "AI秘書相談室";
  headerSubtitle.textContent = "歩美と歩夢がお悩みをやさしく整理します";
  chatBody.innerHTML = "";
  chatComposer.hidden = true;
  chatInput.value = "";
  autoResizeComposer();

  const intro = document.createElement("div");
  intro.className = "intro-block";
  intro.innerHTML = `
    <div class="intro-title">あなたに合うAI秘書をお選びください。</div>
    <div class="intro-text">
      お悩みなど、なんでも気軽にお話しいただけます。<br>
      歩美と歩夢が、寄り添いながら課題やモヤモヤをやさしく整理します。
    </div>
  `;
  chatBody.appendChild(intro);

  const grid = document.createElement("div");
  grid.className = "selection-grid";
  grid.appendChild(createSecretaryCard(ASSISTANTS.ayumi));
  grid.appendChild(createSecretaryCard(ASSISTANTS.ayumu));
  chatBody.appendChild(grid);

  const chip = document.createElement("div");
  chip.className = "system-chip";
  chip.textContent = "会話の流れの中で、必要に応じて詳細ヒアリングへ進みます";
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
      <div class="secretary-copy">${assistant.subtitle}</div>
      <div class="secretary-cta ${assistant.key}">Choose me</div>
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
  chatInput.focus();

  await typeBotMessage(selectedAssistant.intro);
  await typeBotMessage(selectedAssistant.openingQuestion);
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

  if (!response.ok) {
    throw new Error("AI response failed");
  }

  const data = await response.json();

  if (data.error || data.configMissing) {
    throw new Error(data.error || "AI configuration missing");
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
      reply = `ありがとうございます。${PRIORITY_THEME_LABELS[priorityTheme]}に関わりそうなお話ですね。無理のない範囲で大丈夫ですので、背景や今いちばん気になっている点をもう少しだけ教えてください。`;
    } else if (lower.includes("人") || lower.includes("採用")) {
      reply = "ありがとうございます。採用や体制づくりの部分で、少し整理すると見えてくることがありそうですね。今は「採れない」のか、「定着しにくい」のか、どちらが近いですか？";
    } else if (lower.includes("売上") || lower.includes("利益")) {
      reply = "ありがとうございます。数字に関わるお悩みは、背景を少し分けてみると整理しやすくなります。売上面のお悩みなのか、利益率やコスト面のお悩みなのか、どちらが近いでしょうか？";
    } else {
      reply = "ありがとうございます。すぐに答えを出さなくて大丈夫です。いまの状況や、最近気になっている出来事をひとつずつ教えてください。";
    }
  } else {
    if (priorityTheme) {
      reply = `${PRIORITY_THEME_LABELS[priorityTheme]}に近いご相談として整理できそうです。状況をつかみたいので、背景・希望条件・時期感のうち、まず一番伝えやすいところから教えてください。`;
    } else if (lower.includes("採用") || lower.includes("人材")) {
      reply = "ありがとうございます。採用課題として整理できそうです。対象の職種、地域、採用後の定着のどこに一番課題感がありますか？";
    } else if (lower.includes("新規") || lower.includes("事業")) {
      reply = "ありがとうございます。新規事業や成長戦略の観点がありそうですね。狙いたい方向性と、今止まっているポイントを分けて考えると整理しやすいです。";
    } else {
      reply = "ありがとうございます。全体像を急いで決めなくて大丈夫です。今いちばん引っかかっている点を、ひとつだけでも教えてください。";
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
    <button type="button" class="option-button">はい、お願いします</button>
    <button type="button" class="secondary-button">まだ少し話したいです</button>
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
        ? "もちろんです。焦がずに大丈夫ですので、もう少しお話をうかがわせてください。"
        : "承知しました。急がず進めましょう。続けて気になる点を話してください。"
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
    <div class="form-title">ご相談内容をお預かりするため、連絡先をご入力ください。</div>
    <label class="field-label" for="company">会社名</label>
    <input id="company" class="form-input" type="text" placeholder="株式会社AUU" />
    <label class="field-label" for="name">お名前</label>
    <input id="name" class="form-input" type="text" placeholder="田中 雄介" />
    <label class="field-label" for="email">メールアドレス</label>
    <input id="email" class="form-input" type="email" placeholder="example@company.co.jp" />
    <div class="form-note">
      会話の内容は、整理した要約としてお預かりします。<br>
      ご入力は 会社名・お名前・メールアドレス のみで大丈夫です。
    </div>
    <button type="button" class="submit-button">はい、お願いします</button>
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

    const data = await response.json();
    summaryPayload = data;
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
      : "ありがとうございます。ご相談内容を整理した形でお預かりしました。内容を確認のうえ、担当よりご連絡いたします。"
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

  const latestThree = userMessages.slice(-3).join(" / ");
  const overview = userMessages[0] || "ビジネス上のお悩み相談";
  const summaryLines = [
    `【担当秘書】${selectedAssistant.name}`,
    `【相談概要】${overview}`,
    `【本質的な課題（推定）】会話内容をもとに整理が必要な課題が複数あります。`,
    latestThree ? `【会話メモ】${latestThree}` : "",
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
      return { category: "AI秘書相談", subcategory: "自由相談" };
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
  avatar.alt = selectedAssistant ? selectedAssistant.name : "AI秘書";

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
