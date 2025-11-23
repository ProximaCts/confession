(function () {
  const form = document.getElementById("confession-form");
  const targetInput = document.getElementById("target");
  const gradeInput = document.getElementById("grade");
  const contentInput = document.getElementById("content");
  const errorMsg = document.getElementById("error-msg");
  const charCount = document.getElementById("char-count");
  const btnSubmit = document.getElementById("btn-submit");
  const confessionList = document.getElementById("confession-list");
  const toast = document.getElementById("toast");
  const toastText = document.getElementById("toast-text");
  const statToday = document.getElementById("stat-today");
  const statTotal = document.getElementById("stat-total");
  const statOnline = document.getElementById("stat-online");
  const toggleAutoBtn = document.getElementById("toggle-autoslide");
  const btnPrev = document.getElementById("btn-prev");
  const btnNext = document.getElementById("btn-next");

  const PAGE_SIZE = 6;                // mỗi slide 6 box
  const AUTO_INTERVAL = 8000;         // auto slide 8 giây
  const ONLINE_PING_INTERVAL = 20000; // ping online 20 giây

  let currentPage = 0;
  let pagesCount = 0;
  let autoSlide = true;
  let slideTimer = null;

  // tạo / lấy clientId để đếm online
  let clientId = localStorage.getItem("conf_client_id");
  if (!clientId) {
    clientId =
      "cl_" +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36);
    localStorage.setItem("conf_client_id", clientId);
  }

  // ---- Helper: format ngày giờ ----
  function formatDateTime(ts) {
    const date = new Date(ts);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} • ${hh}:${min}`;
  }

  function isToday(ts) {
    const d = new Date(ts);
    const now = new Date();
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }

  function showToast(message) {
    toastText.textContent = message;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2500);
  }

  function renderStats(confessions) {
    const total = confessions.length;
    const todayCount = confessions.filter((c) => isToday(c.createdAt)).length;
    statTotal.textContent = total;
    statToday.textContent = todayCount;
  }

  // ---- Ping để lấy số người online ----
  async function pingOnline() {
    try {
      const res = await fetch("/api/ping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clientId }),
      });

      if (!res.ok) return;

      const data = await res.json();
      if (typeof data.online === "number" && statOnline) {
        statOnline.textContent = data.online;
      }
    } catch (e) {
      console.error("Ping online error:", e);
    }
  }

  // ---- Gọi API backend lấy confessions đã approved ----
  async function fetchConfessionsFromServer() {
    try {
      const res = await fetch("/api/confessions");
      if (!res.ok) throw new Error("Failed to fetch");
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  function stopAutoSlide() {
    if (slideTimer) {
      clearInterval(slideTimer);
      slideTimer = null;
    }
  }

  function goToPage(pageIndex) {
    if (pagesCount === 0) return;
    currentPage = pageIndex;
    const track = confessionList.querySelector(".confession-list-track");
    if (!track) return;
    track.style.transform = `translateX(-${currentPage * 100}%)`;
  }

  function nextPage() {
    if (pagesCount === 0) return;
    currentPage = (currentPage + 1) % pagesCount;
    goToPage(currentPage);
  }

  function prevPage() {
    if (pagesCount === 0) return;
    currentPage = (currentPage - 1 + pagesCount) % pagesCount;
    goToPage(currentPage);
  }

  function startAutoSlide() {
    stopAutoSlide();
    if (!autoSlide || pagesCount <= 1) return;
    slideTimer = setInterval(() => {
      nextPage();
    }, AUTO_INTERVAL);
  }

  // ---- Render confession vào slider ----
  async function renderConfessions() {
    const confessions = await fetchConfessionsFromServer();

    confessionList.innerHTML = "";

    if (confessions.length === 0) {
      const empty = document.createElement("div");
      empty.className = "confession-empty";
      empty.textContent =
        "Chưa có confession nào được lưu trên server. Hãy là người gửi tâm sự đầu tiên!";
      confessionList.appendChild(empty);
      pagesCount = 0;
      stopAutoSlide();
      renderStats(confessions);
      return;
    }

    // track chứa các slide-page
    const track = document.createElement("div");
    track.className = "confession-list-track";
    confessionList.appendChild(track);

    // nhóm theo page size = 6
    const sorted = [...confessions].sort(
      (a, b) => b.createdAt - a.createdAt
    );
    const pages = [];
    for (let i = 0; i < sorted.length; i += PAGE_SIZE) {
      pages.push(sorted.slice(i, i + PAGE_SIZE));
    }
    pagesCount = pages.length;
    currentPage = 0;

    pages.forEach((pageItems) => {
      const page = document.createElement("div");
      page.className = "slider-page";

      pageItems.forEach((c) => {
        const card = document.createElement("article");
        card.className = "confession-card";

        const meta = document.createElement("div");
        meta.className = "confession-meta";

        const leftMeta = document.createElement("div");
        const anon = document.createElement("span");
        anon.className = "badge-anon";
        anon.textContent = "Người gửi ẩn danh";
        leftMeta.appendChild(anon);

        if (c.grade) {
          const grade = document.createElement("span");
          grade.style.marginLeft = "6px";
          grade.style.fontSize = "11px";
          grade.style.color = "#a5b4fc";
          grade.textContent = `• Khối / lớp: ${c.grade}`;
          leftMeta.appendChild(grade);
        }

        const time = document.createElement("span");
        time.textContent = formatDateTime(c.createdAt);

        meta.appendChild(leftMeta);
        meta.appendChild(time);

        // Nội dung với Mở rộng / Thu gọn
        const fullContent = (c.content || "").trim();
        const isLong = fullContent.length > 40;

        const content = document.createElement("p");
        content.className = "confession-content";

        if (isLong) {
          content.textContent = fullContent.slice(0, 40) + "…";
        } else {
          content.textContent = fullContent;
        }

        let toggleBtn = null;

        if (isLong) {
          toggleBtn = document.createElement("button");
          toggleBtn.type = "button";
          toggleBtn.className = "confession-toggle";
          toggleBtn.textContent = "Mở rộng";

          let expanded = false;

          toggleBtn.addEventListener("click", () => {
            expanded = !expanded;
            if (expanded) {
              content.textContent = fullContent;
              toggleBtn.textContent = "Thu gọn";
            } else {
              content.textContent = fullContent.slice(0, 40) + "…";
              toggleBtn.textContent = "Mở rộng";
            }
          });
        }

        const footer = document.createElement("div");
        footer.className = "confession-footer";

        const target = document.createElement("div");
        if (c.target) {
          const t = document.createElement("span");
          t.className = "confession-target";
          t.textContent = `Gửi đến: ${c.target}`;
          target.appendChild(t);
        } else {
          const t = document.createElement("span");
          t.className = "confession-target";
          t.textContent = "Gửi đến: (không ghi rõ)";
          target.appendChild(t);
        }

        const tag = document.createElement("div");
        tag.textContent = "#pending_admin";

        footer.appendChild(target);
        footer.appendChild(tag);

        card.appendChild(meta);
        card.appendChild(content);
        if (toggleBtn) {
          card.appendChild(toggleBtn);
        }
        card.appendChild(footer);

        page.appendChild(card);
      });

      track.appendChild(page);
    });

    // reset transform
    track.style.transform = "translateX(0%)";

    renderStats(confessions);
    startAutoSlide();
  }

  // ---- Đếm ký tự ----
  function updateCharCount() {
    const len = contentInput.value.length;
    charCount.textContent = len;
  }

  contentInput.addEventListener("input", () => {
    updateCharCount();
    if (contentInput.value.length >= 10) {
      errorMsg.textContent = "";
    }
  });

  // ---- Toggle auto slide ----
  toggleAutoBtn.addEventListener("click", () => {
    autoSlide = !autoSlide;
    if (autoSlide) {
      toggleAutoBtn.textContent = "⏸ Tắt auto slide";
      toggleAutoBtn.classList.add("active");
      startAutoSlide();
    } else {
      toggleAutoBtn.textContent = "▶ Bật auto slide";
      toggleAutoBtn.classList.remove("active");
      stopAutoSlide();
    }
  });

  // ---- Nút next/prev ----
  btnPrev.addEventListener("click", () => {
    prevPage();
    if (autoSlide) startAutoSlide(); // reset timer
  });

  btnNext.addEventListener("click", () => {
    nextPage();
    if (autoSlide) startAutoSlide();
  });

  // ---- Submit form: POST /api/confessions ----
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = contentInput.value.trim();
    const target = targetInput.value.trim();
    const grade = gradeInput.value.trim();

    if (content.length < 10) {
      errorMsg.textContent =
        "Confession hơi ngắn, viết rõ hơn một chút (≥ 10 ký tự) nhé.";
      return;
    }

    errorMsg.textContent = "";
    btnSubmit.disabled = true;

    try {
      const res = await fetch("/api/confessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ target, grade, content }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gửi thất bại, thử lại sau.");
      }

      form.reset();
      updateCharCount();
      showToast("Đã gửi confession ẩn danh thành công! 💚");
      await renderConfessions(); // load lại từ server
    } catch (err) {
      console.error(err);
      errorMsg.textContent =
        err.message || "Có lỗi xảy ra, vui lòng thử lại sau.";
    } finally {
      btnSubmit.disabled = false;
    }
  });

  // ---- Init ----
  renderConfessions();
  updateCharCount();
  pingOnline();
  setInterval(pingOnline, ONLINE_PING_INTERVAL);
})();
