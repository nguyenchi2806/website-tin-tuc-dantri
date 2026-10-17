
async function loadArticle() {
  const container = document.querySelector("#article-detail");
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  try {
    const response = await fetch("posts.json");

    if (!response.ok) {
      throw new Error("Không tải được dữ liệu bài viết.");
    }

    const data = await response.json();
    const saved = JSON.parse(localStorage.getItem("newsPosts") || "[]");
    const allPosts = [
      ...(data.posts || []),
      ...saved.filter(
        (item) => !(data.posts || []).some((post) => post.id === item.id)
      )
    ];

    const post = allPosts.find((item) => item.id === id);

    if (!post) {
      container.innerHTML = `
        <h1>Không tìm thấy bài viết</h1>
        <p>Bài viết có thể chưa được lưu hoặc đã bị xóa.</p>
        <a href="index.html">← Quay lại trang chủ</a>
      `;
      return;
    }

    container.innerHTML = `
      <a href="index.html">← Quay lại trang chủ</a>
      <p class="eyebrow">${escapeHTMLArticle(post.category)}</p>
      <h1>${escapeHTMLArticle(post.title)}</h1>
      <p class="news-meta">
        Tác giả: ${escapeHTMLArticle(post.author || "Chưa rõ")}
        · ${escapeHTMLArticle(post.publishedAt || "Chưa rõ thời gian")}
      </p>
      ${post.image ? `
        <img
          src="${escapeHTMLArticle(post.image)}"
          alt="${escapeHTMLArticle(post.title)}"
          style="width:100%;max-height:440px;object-fit:cover;border-radius:10px"
        >
      ` : ""}
      <p><strong>${escapeHTMLArticle(post.excerpt || "")}</strong></p>
      <div>${escapeHTMLArticle(post.content || "").replace(/\n/g, "<br>")}</div>
      <p class="news-meta">Nguồn: ${escapeHTMLArticle(post.source || "Chưa rõ")}</p>
    `;

    document.title = `${post.title} | Tin Mới 24H`;
  } catch (error) {
    container.innerHTML = `
      <h1>Không thể tải bài viết</h1>
      <p>Hãy kiểm tra file posts.json và thử tải lại trang.</p>
      <a href="index.html">Quay lại trang chủ</a>
    `;
    console.error(error);
  }
}

function escapeHTMLArticle(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

loadArticle();
