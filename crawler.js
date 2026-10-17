
const form = document.querySelector("#crawler-form");
const urlInput = document.querySelector("#article-url");
const statusBox = document.querySelector("#crawler-status");
const output = document.querySelector("#crawler-output");
const saveButton = document.querySelector("#save-article");
const savedCount = document.querySelector("#saved-count");
const savedList = document.querySelector("#saved-list");

let currentArticle = null;

function safeText(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function readSavedArticles() {
  try {
    const value = JSON.parse(localStorage.getItem("newsPosts") || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function normalizeArticleUrl(value) {
  const url = new URL(value);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Chỉ chấp nhận URL HTTP hoặc HTTPS.");
  }

  if (url.hostname !== "dantri.com.vn" &&
      !url.hostname.endsWith(".dantri.com.vn")) {
    throw new Error("Bài tập này đang giới hạn nguồn ở Dân trí.");
  }

  return url;
}

function getMeta(doc, selectors) {
  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    const value = element?.getAttribute("content") ||
                  element?.textContent?.trim();

    if (value) return value.trim();
  }

  return "";
}

function createSlug(title) {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractArticle(doc, url) {
  const title =
    getMeta(doc, [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]'
    ]) ||
    doc.querySelector("h1")?.textContent?.trim() ||
    doc.title;

  const description = getMeta(doc, [
    'meta[property="og:description"]',
    'meta[name="description"]'
  ]);

  const articleBody =
    doc.querySelector("article") ||
    doc.querySelector('[itemprop="articleBody"]') ||
    doc.querySelector("main");

  const paragraphs = articleBody
    ? [...articleBody.querySelectorAll("p")]
        .map((p) => p.textContent.trim())
        .filter(Boolean)
    : [];

  const content = paragraphs.join("\n\n");

  if (!title || !content) {
    throw new Error(
      "Không tìm thấy đủ tiêu đề hoặc nội dung. Cấu trúc trang có thể đã thay đổi."
    );
  }

  const author = getMeta(doc, [
    'meta[name="author"]',
    'meta[property="article:author"]',
    '[itemprop="author"]'
  ]);

  const publishedAt = getMeta(doc, [
    'meta[property="article:published_time"]',
    'meta[name="pubdate"]',
    'time[datetime]'
  ]);

  const category =
    doc.querySelector(
      '[class*="breadcrumb"] a:last-child'
    )?.textContent?.trim() || "Chưa phân loại";

  const idMatch = url.pathname.match(/(\d{10,})/);

  return {
    id: `dtri-${idMatch ? idMatch[1] : createSlug(title)}`,
    title,
    slug: createSlug(title),
    excerpt: description || content.slice(0, 250),
    content,
    author,
    category,
    publishedAt,
    source: url.hostname,
    url: url.href
  };
}

function renderSavedArticles() {
  const articles = readSavedArticles();

  savedCount.textContent =
    `${articles.length} bài viết đã lưu trong trình duyệt.`;

  savedList.innerHTML = articles.length
    ? articles.map((article) => `
        <li>
          <strong>${safeText(article.title)}</strong>
          <br>
          <small>${safeText(article.category || "")}</small>
        </li>
      `).join("")
    : "<li>Chưa có bài viết được lưu.</li>";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  currentArticle = null;
  saveButton.disabled = true;
  output.textContent = "Đang thử thu thập dữ liệu...";
  statusBox.textContent = "Đang kết nối đến trang bài viết.";

  try {
    const url = normalizeArticleUrl(urlInput.value.trim());

    const response = await fetch(url.href, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`Máy chủ trả về HTTP ${response.status}.`);
    }

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    currentArticle = extractArticle(doc, url);

    output.textContent = JSON.stringify(currentArticle, null, 2);
    statusBox.textContent =
      "Đã trích xuất dữ liệu. Hãy kiểm tra JSON trước khi lưu.";
    saveButton.disabled = false;
  } catch (error) {
    console.error(error);

    output.textContent = "Chưa có dữ liệu hợp lệ.";

    statusBox.textContent =
      "Không thể crawl trực tiếp. Trình duyệt có thể chặn CORS hoặc trang nguồn không cho phép truy cập. " +
      "Hãy triển khai phương án lấy dữ liệu qua proxy/backend hoặc nhập dữ liệu đã thu thập để kiểm tra. " +
      `Chi tiết: ${error.message}`;
  }
});

saveButton.addEventListener("click", () => {
  if (!currentArticle) return;

  const articles = readSavedArticles();
  const existingIndex = articles.findIndex(
    (article) => article.id === currentArticle.id
  );

  if (existingIndex >= 0) {
    articles[existingIndex] = currentArticle;
  } else {
    articles.unshift(currentArticle);
  }

  localStorage.setItem("newsPosts", JSON.stringify(articles));

  statusBox.textContent = "Đã lưu bài viết vào LocalStorage.";
  renderSavedArticles();
});

renderSavedArticles();
