
const CATEGORY_FILE = "categories.json";
const POSTS_FILE = "posts.json";

let categories = [];
let posts = [];
let activeCategory = "latest";

const $ = (selector) => document.querySelector(selector);

function flattenCategories(items) {
  return items.flatMap((item) => [
    item,
    ...flattenCategories(item.children || [])
  ]);
}

async function loadJSON(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Không thể tải ${path}`);
  }

  return response.json();
}

function savePostsToStorage() {
  localStorage.setItem("newsPosts", JSON.stringify(posts));
}

function getSavedPosts() {
  try {
    const saved = JSON.parse(localStorage.getItem("newsPosts") || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function getAllCategories() {
  return flattenCategories(categories);
}

function renderNavigation() {
  const nav = $("#category-nav");
  if (!nav) return;

  const menu = getAllCategories();

  nav.innerHTML = `
    <a href="index.html" class="nav-link ${
      activeCategory === "latest" ? "active" : ""
    }" data-category="latest">Mới nhất</a>
    ${menu
      .filter((item) => item.id !== "home" && item.id !== "latest")
      .map(
        (item) => `
          <a href="#news-section"
             class="nav-link ${
               activeCategory === item.title ? "active" : ""
             }"
             data-category="${item.title}">
             ${item.title}
          </a>
        `
      )
      .join("")}
  `;

  nav.querySelectorAll("[data-category]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      activeCategory = link.dataset.category;
      renderNavigation();
      renderNews();
      $("#news-section")?.scrollIntoView({ behavior: "smooth" });
    });
  });
}

function formatDate(dateString) {
  if (!dateString) return "Chưa rõ thời gian";

  const date = new Date(dateString.replace(" ", "T"));

  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function getPostLink(post) {
  return `article.html?id=${encodeURIComponent(post.id)}`;
}

function renderPostCard(post, className = "") {
  const image = post.image
    ? `<img class="news-image"
            src="${escapeHTML(post.image)}"
            alt="${escapeHTML(post.title)}"
            loading="lazy">`
    : "";

  return `
    <article class="news-card ${className}">
      <a href="${getPostLink(post)}" aria-label="${escapeHTML(post.title)}">
        ${image}
      </a>
      <div class="news-body">
        <span class="news-category">${escapeHTML(post.category)}</span>
        <h3 class="news-title">
          <a href="${getPostLink(post)}">${escapeHTML(post.title)}</a>
        </h3>
        <p class="news-excerpt">${escapeHTML(post.excerpt)}</p>
        <div class="news-meta">
          <span>${escapeHTML(post.author || "Ban biên tập")}</span>
          <time>${escapeHTML(formatDate(post.publishedAt))}</time>
        </div>
      </div>
    </article>
  `;
}

function renderNews() {
  const featured = $("#featured-news");
  const list = $("#news-list");
  const title = $("#category-title");
  const count = $("#news-count");
  const empty = $("#empty-message");

  if (!featured || !list) return;

  const filtered = activeCategory === "latest"
    ? [...posts]
    : posts.filter((post) => post.category === activeCategory);

  filtered.sort(
    (a, b) =>
      new Date(b.publishedAt.replace(" ", "T")) -
      new Date(a.publishedAt.replace(" ", "T"))
  );

  if (title) {
    title.textContent = activeCategory === "latest"
      ? "Tin mới nhất"
      : activeCategory;
  }

  if (count) {
    count.textContent = `${filtered.length} bài viết`;
  }

  if (empty) {
    empty.hidden = filtered.length > 0;
  }

  featured.innerHTML = "";
  list.innerHTML = "";

  if (filtered.length === 0) return;

  featured.innerHTML = `
    ${renderPostCard(filtered[0], "featured-main")}
    <div class="featured-side">
      ${filtered.slice(1, 3)
        .map((post) => renderPostCard(post))
        .join("")}
    </div>
  `;

  list.innerHTML = filtered
    .slice(3)
    .map((post) => renderPostCard(post, "list-card"))
    .join("");
}

async function initHomePage() {
  try {
    const [categoryData, postData] = await Promise.all([
      loadJSON(CATEGORY_FILE),
      loadJSON(POSTS_FILE)
    ]);

    categories = categoryData.menu || [];

    const savedPosts = getSavedPosts();
    const originalPosts = postData.posts || [];

    posts = [
      ...originalPosts,
      ...savedPosts.filter(
        (saved) => !originalPosts.some((item) => item.id === saved.id)
      )
    ];

    savePostsToStorage();

    renderNavigation();
    renderNews();
  } catch (error) {
    console.error(error);

    const count = $("#news-count");

    if (count) {
      count.textContent = "Không tải được dữ liệu";
    }

    const empty = $("#empty-message");

    if (empty) {
      empty.hidden = false;
      empty.textContent =
        "Không thể tải dữ liệu. Hãy kiểm tra tên file JSON và GitHub Pages.";
    }
  }
}

if (document.querySelector("#featured-news")) {
  initHomePage();
}
