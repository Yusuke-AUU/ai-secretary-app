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
    intakeLine: "ここまでのお話で、相談内容の方向性がかなり見えてきています。必要でしたら、この内容を整理した形でお預かりできます。",
    categoryLine: "まだ言葉にしづらければ、この中に近いものがないか一緒に見てみましょうか。"
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
    intakeLine: "ここまで話せとったら、もう相談の芯はだいぶ見えとるで。必要なら、このまま送れる形に整えられるけぇな。",
    categoryLine: "まだうまいこと言葉にならんのなら、この中に近いもんがないか一緒に見てみるか？"
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

const CATEGORY_OPTIONS = [
  {
    key: "subsidy",
    label: "補助金",
    details: [
      "設備投資を予定している",
      "使える補助金を知りたい",
      "申請の進め方を相談したい",
      "まだ整理中"
    ]
  },
  {
    key: "ma_buy",
    label: "M&A（買収）",
    details: [
      "買収先のイメージがある",
      "業種や地域を絞りたい",
      "予算感から考えたい",
      "まだ整理中"
    ]
  },
  {
    key: "ma_sell",
    label: "M&A（譲渡）",
    details: [
      "譲渡を検討している",
      "売却価格の考え方を整理したい",
      "譲渡理由を整理したい",
      "まだ整理中"
    ]
  },
  {
    key: "realestate_buy",
    label: "不動産（買）",
    details: [
      "購入したい物件の種類がある",
      "地域や予算を整理したい",
      "用途から考えたい",
      "まだ整理中"
    ]
  },
  {
    key: "realestate_sell",
    label: "不動産（売）",
    details: [
      "売却したい不動産がある",
      "価格感を整理したい",
      "売却理由を整理したい",
      "まだ整理中"
    ]
  },
  {
    key: "hiring",
    label: "人材（採用ニーズ）",
    details: [
      "採用したい職種がある",
      "条件を整理したい",
      "年収や働き方を整理したい",
      "まだ整理中"
    ]
  },
  {
    key: "jobchange",
    label: "人材（転職・就職ニーズ）",
    details: [
      "転職先の希望を整理したい",
      "仕事内容や条件を整理したい",
      "年収や地域を整理したい",
      "まだ整理中"
    ]
  }
];

const THEME_KEYWORDS = {
  subsidy: ["補助金", "助成金", "設備投資", "導入", "更新", "機械", "省力化", "省エネ"],
  ma_buy: ["買収", "M&A", "エムアンドエー", "会社を買いたい", "譲受", "承継したい"],
  ma_sell: ["売却", "譲渡", "事業承継", "会社を譲りたい", "後継者", "引き継ぎ"],
  realestate_buy: ["不動産を買", "物件を買", "土地を買", "建物を買", "マンションを買", "ビルを買"],
  realestate_sell: ["不動産を売", "物件を売", "土地を売", "建物を売", "マンションを売", "ビルを売"],
  hiring: ["採用", "人材募集", "求人", "雇いたい", "採りたい", "採りたい人材"],
  jobchange: ["転職", "就職", "仕事を探", "職探し", "希望年収", "転職先"]
};

let selectedAssistant = null;
let conversation = [];
let intakePromptShown = false;
let intakeFormShown = false;
let categoryPromptShown = false;
let categoryDetailsShown = false;
let latestSummary = "";
let latestCategory = "経営相談";
let latestSubcategory = "自由相談";
let latestPriorityTheme = "";
let selectedCategoryDetail = "";

chatLauncher.addEventListener("click", openChat);
chatClose.addEventListener("click", closeChat);
chatComposer.addEventListener("submit", handleChatSubmit);
chatInput.addEventListener("input", autoResizeTextarea);
chatInput.addEventListener("keydown", handleEnterSubmit);

function openChat() {
  chatBox.hidden = false;
  chatLauncher.setAttribute("aria-expanded", "true");
  if (!chatBody.dataset.initialized) {
    renderSelectionView();
    chatBody.dataset.initialized = "true";
  }
}

function closeChat() {
  chatBox.hidden = true;
  chatLauncher.setAttribute("aria-expanded", "false");
}

function renderSelectionView() {
  selectedAssistant = null;
  conversation = [];
  intakePromptShown = false;
  intakeFormShown = false;
  categoryPromptShown = false;
  categoryDetailsShown = false;
  latestSummary = "";
  latestCategory = "経営相談";
  latestSubcategory = "自由相談";
  latestPriorityTheme = "";
  selectedCategoryDetail = "";

  headerAvatar.src = "ayumi.png";
  headerTitle.textContent = "経営相談室";
  headerSubtitle.textContent = "相談相手を選んでください";

  chatBody.innerHTML = `
    <div class="system-card">
      <div class="system-kicker">AUU</div>
      <div class="system-title">経営相談室</div>
      <div class="system-text">
        まだ整理しきれていない悩みや、誰に相談すべきかわからない課題でも大丈夫です。<br>
        歩美またはのり子と壁打ちしながら、相談内容を整理できます。
      </div>
    </div>

    <div class="assistant-grid">
      ${renderAssistantCard(ASSISTANTS.ayumi)}
      ${renderAssistantCard(ASSISTANTS.noriko)}
    </div>
  `;

  chatComposer.style.display = "none";

  chatBody.querySelectorAll(".assistant-card").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.assistant;
      selectAssistant(key);
    });
  });
}

function renderAssistantCard(assistant) {
  return `
    <button class="assistant-card" type="button" data-assistant="${assistant.key}">
      <img class="assistant-card-avatar" src="${assistant.image}" alt="${assistant.name}">
      <div>
        <div class="assistant-card-title">${assistant.name}</div>
        <div class="assistant-card-role">${assistant.role}</div>
        <div class="assistant-card-copy">${assistant.selectionCopy}</div>
        <div class="assistant-card-cta">${assistant.cta}</div>
      </div>
    </button>
  `;
}

function selectAssistant(key) {
  selectedAssistant = ASSISTANTS[key];
  conversation = [];
  intakePromptShown = false;
  intakeFormShown = false;
  categoryPromptShown = false;
  categoryDetailsShown = false;
  latestSummary = "";
  latestCategory = "経営相談";
  latestSubcategory = "自由相談";
  latestPriorityTheme = "";
  selectedCategoryDetail = "";

  headerAvatar.src = selectedAssistant.image;
  headerTitle.textContent = selectedAssistant.shortHeader;
  headerSubtitle.textContent = selectedAssistant.subtitle;

  chatBody.innerHTML = "";
  chatComposer.style.display = "flex";

  appendAssistantMessage(selectedAssistant.intro);
  chatInput.value = "";
  autoResizeTextarea();
  chatInput.focus();
}

function appendUserMessage(text) {
  const row = document.createElement("div");
  row.className = "message-row user";
  row.innerHTML = `<div class="message-bubble"></div>`;
  row.querySelector(".message-bubble").textContent = text;
  chatBody.appendChild(row);
  scrollChatToBottom();
}

function appendAssistantMessage(text) {
  if (!selectedAssistant) return;

  const row = document.createElement("div");
  row.className = "message-row assistant";
  row.innerHTML = `
    <img class="message-avatar" src="${selectedAssistant.image}" alt="${selectedAssistant.name}">
    <div class="message-bubble"></div>
  `;
  row.querySelector(".message-bubble").textContent = text;
  chatBody.appendChild(row);
  scrollChatToBottom();
}

function appendNoticeMessage(text) {
  const row = document.createElement("div");
  row.className = "message-row notice";
  row.innerHTML = `<div class="message-bubble"></div>`;
  row.querySelector(".message-bubble").textContent = text;
  chatBody.appendChild(row);
  scrollChatToBottom();
}

function showTyping() {
  if (!selectedAssistant) return null;

  const row = document.createElement("div");
  row.className = "message-row assistant";
  row.innerHTML = `
    <img class="message-avatar" src="${selectedAssistant.image}" alt="${selectedAssistant.name}">
    <div class="message-bubble">
      <div class="typing"><span></span><span></span><span></span></div>
    </div>
  `;
  chatBody.appendChild(row);
  scrollChatToBottom();
  return row;
}

function removeTyping(node) {
  if (node && node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

async function handleChatSubmit(event) {
  event.preventDefault();
  if (!selectedAssistant) return;

  const text = chatInput.value.trim();
  if (!text) return;

  appendUserMessage(text);
  conversation.push({ role: "user", content: text });

  if (!latestPriorityTheme) {
    latestPriorityTheme = detectPriorityThemeFromText(text);
  }

  chatInput.value = "";
  autoResizeTextarea();
  setSendingState(true);

  const typingNode = showTyping();

  try {
    const response = await fetch("/.netlify/functions/secretary-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "chat",
        assistant: selectedAssistant.key,
        conversation
      })
    });

    const data = await response.json();
    removeTyping(typingNode);

    const reply = data.reply || fallbackReply(selectedAssistant.key);

    appendAssistantMessage(reply);
    conversation.push({ role: "assistant", content: reply });

    await handlePostReplyFlow(reply);
  } catch (error) {
    removeTyping(typingNode);
    appendAssistantMessage(
      selectedAssistant.key === "noriko"
        ? "あんた、ごめんよ。いま少しつながりが不安定みてぇじゃ。ちぃと置いて、もういっぺん送ってみん？"
        : "申し訳ありません。いま接続が不安定なようです。少し置いてから、もう一度お送りください。"
    );
  } finally {
    setSendingState(false);
  }
}

async function handlePostReplyFlow(replyText) {
  const userTurnCount = getUserTurnCount();
  const combinedUserText = getCombinedUserText();
  const likelyTheme = latestPriorityTheme || detectPriorityThemeFromText(combinedUserText);
  const isConsultReady = shouldOfferIntake(replyText, userTurnCount, combinedUserText, likelyTheme);
  const shouldShowCategory = shouldOfferCategoryPrompt(userTurnCount, combinedUserText, likelyTheme);

  if (!intakePromptShown && isConsultReady) {
    intakePromptShown = true;
    latestPriorityTheme = likelyTheme || latestPriorityTheme;
    appendNoticeMessage(selectedAssistant.intakeLine);
    renderIntakeForm();
    return;
  }

  if (!categoryPromptShown && shouldShowCategory) {
    categoryPromptShown = true;
    appendNoticeMessage(selectedAssistant.categoryLine);
    renderCategoryPicker();
  }
}

function shouldOfferIntake(replyText, userTurnCount, combinedUserText, themeKey) {
  const readinessPhrases = [
    "相談しやすい形",
    "お預かりできます",
    "送れる形",
    "相談の形",
    "相談内容の方向性",
    "方向性はかなり見えてきています",
    "相談の芯",
    "整えていくこともできます"
  ];

  const hasReadinessPhrase = readinessPhrases.some((phrase) => replyText.includes(phrase));
  const hasTheme = Boolean(themeKey);
  const enoughTurns = userTurnCount >= 4;

  if (hasReadinessPhrase) return true;
  if (hasTheme && userTurnCount >= 5) return true;

  const strongIntentWords = ["相談したい", "送って", "依頼", "お願い", "補助金", "買収", "譲渡", "売却", "採用", "転職", "設備投資"];
  const hasIntent = strongIntentWords.some((word) => combinedUserText.includes(word));

  return enoughTurns && hasTheme && hasIntent;
}

function shouldOfferCategoryPrompt(userTurnCount, combinedUserText, themeKey) {
  if (intakeFormShown) return false;
  if (userTurnCount < 7) return false;
  if (themeKey) return false;

  const vagueWords = ["まだ", "うまく", "まとま", "よくわから", "分から", "曖昧", "なんとなく", "モヤモヤ"];
  const hasVagueSignal = vagueWords.some((word) => combinedUserText.includes(word));

  return hasVagueSignal || userTurnCount >= 8;
}

function detectPriorityThemeFromText(text) {
  const normalized = String(text || "");
  for (const [key, keywords] of Object.entries(THEME_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return key;
    }
  }
  return "";
}

function getUserTurnCount() {
  return conversation.filter((item) => item.role === "user").length;
}

function getCombinedUserText() {
  return conversation
    .filter((item) => item.role === "user")
    .map((item) => item.content)
    .join("\n");
}

function renderCategoryPicker() {
  const wrapper = document.createElement("div");
  wrapper.className = "intake-card";
  wrapper.innerHTML = `
    <div class="intake-title">近いテーマを選ぶ</div>
    <div class="intake-text">
      近いテーマがあれば選んでください。まだぴったり決まっていなくても大丈夫です。
    </div>
    <div class="category-chip-grid"></div>
  `;

  const grid = wrapper.querySelector(".category-chip-grid");
  grid.style.display = "grid";
  grid.style.gap = "10px";
  grid.style.marginTop = "14px";

  CATEGORY_OPTIONS.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "assistant-card-cta";
    button.style.width = "100%";
    button.style.minHeight = "42px";
    button.style.justifyContent = "flex-start";
    button.style.padding = "0 14px";
    button.textContent = option.label;
    button.addEventListener("click", () => {
      latestPriorityTheme = option.key;
      latestSubcategory = option.label;
      renderCategoryDetails(option);
      wrapper.remove();
    });
    grid.appendChild(button);
  });

  chatBody.appendChild(wrapper);
  scrollChatToBottom();
}

function renderCategoryDetails(option) {
  if (categoryDetailsShown) return;
  categoryDetailsShown = true;

  const wrapper = document.createElement("div");
  wrapper.className = "intake-card";
  wrapper.innerHTML = `
    <div class="intake-title">${option.label}について、近いものを選ぶ</div>
    <div class="intake-text">
      近いものがあれば選んでください。違っていても、あとで自由に補足できます。
    </div>
    <div class="category-detail-grid"></div>
  `;

  const grid = wrapper.querySelector(".category-detail-grid");
  grid.style.display = "grid";
  grid.style.gap = "10px";
  grid.style.marginTop = "14px";

  option.details.forEach((detail) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "assistant-card-cta";
    button.style.width = "100%";
    button.style.minHeight = "42px";
    button.style.justifyContent = "flex-start";
    button.style.padding = "0 14px";
    button.textContent = detail;
    button.addEventListener("click", () => {
      selectedCategoryDetail = detail;
      latestCategory = "経営相談";
      latestSubcategory = `${option.label} / ${detail}`;
      appendNoticeMessage(
        selectedAssistant.key === "noriko"
          ? `ほんなら、いまの話は「${option.label}」に近そうじゃな。ここまででも十分相談の形にできるけぇ、必要なら送れるように整えるで。`
          : `ありがとうございます。「${option.label}」に近いご相談として整理できそうです。必要でしたら、この内容を相談しやすい形でお預かりできます。`
      );
      if (!intakePromptShown) {
        intakePromptShown = true;
        renderIntakeForm();
      }
      wrapper.remove();
    });
    grid.appendChild(button);
  });

  chatBody.appendChild(wrapper);
  scrollChatToBottom();
}

function fallbackReply(key) {
  if (key === "noriko") {
    return "よう話してくれたなぁ。急がんでええけぇ、あんたの話しやすいとこから少しずつ聞かせてな。";
  }
  return "ありがとうございます。まだまとまっていなくても大丈夫ですよ。話しやすいところから、少しずつ整理していきましょう。";
}

function renderIntakeForm() {
  if (intakeFormShown) return;
  intakeFormShown = true;

  const wrapper = document.createElement("div");
  wrapper.className = "intake-card";
  wrapper.innerHTML = `
    <div class="intake-title">AUUへ相談内容を送る</div>
    <div class="intake-text">
      会話内容をもとに、相談の要点を整理したうえでAUUへ送信できます。
    </div>

    <form id="intakeForm" class="intake-form">
      <div class="intake-field">
        <label for="companyName">会社名</label>
        <input id="companyName" name="companyName" type="text" placeholder="株式会社AUU" />
      </div>

      <div class="intake-field">
        <label for="name">お名前</label>
        <input id="name" name="name" type="text" placeholder="田中 太郎" />
      </div>

      <div class="intake-field">
        <label for="email">メールアドレス</label>
        <input id="email" name="email" type="email" placeholder="example@company.co.jp" />
      </div>

      <div class="intake-field">
        <label for="phone">電話番号</label>
        <input id="phone" name="phone" type="text" placeholder="090-1234-5678" />
      </div>

      <div class="intake-field">
        <label for="priorityTheme">相談テーマ</label>
        <select id="priorityTheme" name="priorityTheme">
          <option value="none">選択してください</option>
          <option value="subsidy">補助金</option>
          <option value="ma_buy">M&A（買収）</option>
          <option value="ma_sell">M&A（譲渡）</option>
          <option value="realestate_buy">不動産（買）</option>
          <option value="realestate_sell">不動産（売）</option>
          <option value="hiring">人材（採用ニーズ）</option>
          <option value="jobchange">人材（転職・就職ニーズ）</option>
        </select>
      </div>

      <div class="intake-field">
        <label for="message">補足したい内容</label>
        <textarea id="message" name="message" placeholder="必要に応じて補足をご記入ください。"></textarea>
      </div>

      <div class="helper-text">
        送信前に、会話内容を要約して相談メモを作成します。
      </div>

      <button class="intake-submit" type="submit">相談内容を送信する</button>
    </form>
  `;

  chatBody.appendChild(wrapper);
  scrollChatToBottom();

  const intakeForm = wrapper.querySelector("#intakeForm");
  const prioritySelect = wrapper.querySelector("#priorityTheme");

  if (latestPriorityTheme) {
    prioritySelect.value = latestPriorityTheme;
  }

  if (selectedCategoryDetail) {
    wrapper.querySelector("#message").value = `選択した内容：${selectedCategoryDetail}\n`;
  }

  intakeForm.addEventListener("submit", handleIntakeSubmit);
}

async function handleIntakeSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  const companyName = String(formData.get("companyName") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const priorityThemeKey = String(formData.get("priorityTheme") || "none");

  latestPriorityTheme = priorityThemeKey !== "none" ? priorityThemeKey : latestPriorityTheme;

  if (!name || !email) {
    appendNoticeMessage("お名前とメールアドレスはご入力ください。");
    return;
  }

  appendNoticeMessage("相談内容を整理しています…");

  try {
    const summaryResponse = await fetch("/.netlify/functions/secretary-chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "summary",
        assistant: selectedAssistant.key,
        conversation
      })
    });

    const summaryData = await summaryResponse.json();

    latestSummary = summaryData.summary || "";
    latestCategory = summaryData.category || "経営相談";
    latestSubcategory = summaryData.subcategory || latestSubcategory || "自由相談";

    const selectedThemeLabel = PRIORITY_THEME_LABELS[latestPriorityTheme] || "";

    const payload = {
      companyName,
      name,
      email,
      phone,
      category: latestCategory,
      subcategory: latestSubcategory,
      priorityTheme: selectedThemeLabel,
      summary: latestSummary,
      message,
      assistantName: selectedAssistant ? selectedAssistant.name : "",
      conversation: conversation
        .map((item) => `${item.role === "user" ? "相談者" : (selectedAssistant?.name || "相談相手")}：${item.content}`)
        .join("\n\n")
    };

    const gasResponse = await fetch(GAS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    const gasText = await gasResponse.text();
    const ok =
      gasText.includes("OK") ||
      gasText.includes("success") ||
      gasText.includes("accepted");

    if (ok) {
      appendNoticeMessage("送信が完了しました。AUUにて内容を確認のうえ、ご連絡いたします。");
      form.reset();
    } else {
      appendNoticeMessage("送信処理で確認が必要な状態です。時間を置いて再度お試しください。");
    }
  } catch (error) {
    appendNoticeMessage("送信時にエラーが発生しました。時間を置いて再度お試しください。");
  }
}

function autoResizeTextarea() {
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 150)}px`;
}

function handleEnterSubmit(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatComposer.requestSubmit();
  }
}

function setSendingState(isSending) {
  chatInput.disabled = isSending;
  sendButton.disabled = isSending;
}

function scrollChatToBottom() {
  chatBody.scrollTop = chatBody.scrollHeight;
}
