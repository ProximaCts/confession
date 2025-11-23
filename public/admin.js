(function () {
  const tokenInput = document.getElementById("admin-token");
  const btnLogin = document.getElementById("btn-login");
  const adminList = document.getElementById("admin-list");
  const adminError = document.getElementById("admin-error");

  let adminToken = "";

  btnLogin.addEventListener("click", () => {
    const t = tokenInput.value.trim();
    if (!t) {
      adminError.textContent = "Vui lòng nhập token admin.";
      return;
    }
    adminToken = t;
    loadPending();
  });

 btnLogin.addEventListener("click", () => {
  const t = tokenInput.value.trim();
  if (!t) {
    adminError.textContent = "Vui lòng nhập token admin.";
    return;
  }
  adminToken = t;        // chỉ giữ trong biến JS, không lưu đâu cả
  adminError.textContent = "";
  loadPending();
});


  async function loadPending() {
    adminError.textContent = "";
    adminList.innerHTML = "Đang tải danh sách pending...";

    try {
      const res = await fetch("/api/admin/confessions?status=pending", {
        headers: {
          "X-Admin-Token": adminToken,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Sai token admin hoặc không được phép truy cập.");
        }
        throw new Error("Không tải được danh sách.");
      }

      const data = await res.json();
      renderList(data);
    } catch (err) {
      console.error(err);
      adminError.textContent = err.message || "Lỗi không xác định.";
      adminList.innerHTML = "";
    }
  }

  function renderList(items) {
    adminList.innerHTML = "";

    if (!items.length) {
      const div = document.createElement("div");
      div.className = "confession-empty";
      div.textContent = "Không có confession pending nào.";
      adminList.appendChild(div);
      return;
    }

    items.forEach((c) => {
      const wrapper = document.createElement("article");
      wrapper.className = "admin-conf";

      const meta = document.createElement("div");
      meta.className = "admin-meta";

      const left = document.createElement("div");
      left.textContent = c.grade ? `Lớp: ${c.grade}` : "(không ghi lớp)";

      const right = document.createElement("div");
      const status = document.createElement("span");
      status.className = "pill-status status-pending";
      status.textContent = "PENDING";
      right.appendChild(status);

      meta.appendChild(left);
      meta.appendChild(right);

      const content = document.createElement("p");
      content.textContent = c.content;

      const to = document.createElement("div");
      to.style.fontSize = "11px";
      to.style.color = "#a5b4fc";
      to.textContent = c.target
        ? `Gửi đến: ${c.target}`
        : "Gửi đến: (không ghi rõ)";

      const actions = document.createElement("div");
      actions.className = "admin-actions";

      const btnApprove = document.createElement("button");
      btnApprove.className = "btn-sm approve";
      btnApprove.textContent = "Duyệt & đăng";
      btnApprove.addEventListener("click", () => approveConf(c.id));

      const btnDelete = document.createElement("button");
      btnDelete.className = "btn-sm danger";
      btnDelete.textContent = "Xoá";
      btnDelete.addEventListener("click", () => deleteConf(c.id));

      actions.appendChild(btnApprove);
      actions.appendChild(btnDelete);

      wrapper.appendChild(meta);
      wrapper.appendChild(content);
      wrapper.appendChild(to);
      wrapper.appendChild(actions);

      adminList.appendChild(wrapper);
    });
  }

  async function approveConf(id) {
    if (!confirm("Duyệt confession này?")) return;

    try {
      const res = await fetch(`/api/admin/confessions/${id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": adminToken,
        },
      });

      if (!res.ok) {
        throw new Error("Duyệt thất bại.");
      }

      await loadPending();
    } catch (err) {
      console.error(err);
      alert(err.message || "Có lỗi xảy ra.");
    }
  }

  async function deleteConf(id) {
    if (!confirm("Chắc chắn xoá confession này?")) return;

    try {
      const res = await fetch(`/api/admin/confessions/${id}`, {
        method: "DELETE",
        headers: {
          "X-Admin-Token": adminToken,
        },
      });

      if (!res.ok) {
        throw new Error("Xoá thất bại.");
      }

      await loadPending();
    } catch (err) {
      console.error(err);
      alert(err.message || "Có lỗi xảy ra.");
    }
  }
})();
