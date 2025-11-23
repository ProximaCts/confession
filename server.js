const express = require("express");
const path = require("path");
const fs = require("fs");

// Khởi tạo app TRƯỚC khi dùng app.get / app.post
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "confessions.json");

// Online users trong 5 phút gần nhất
const onlineMap = new Map(); // key: ip, value: lastSeen timestamp
const ONLINE_WINDOW = 5 * 60 * 1000; // 5 phút

// TOKEN admin – đặt trong Render env: ADMIN_TOKEN=xxxxx
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "changeme-local-only";

// -------- MIDDLEWARE CƠ BẢN --------
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// -------- API ĐẾM ONLINE --------
app.post("/api/ping", (req, res) => {
  const now = Date.now();

  // Lấy IP đơn giản (đủ dùng cho web trường)
  const ip =
    (req.headers["x-forwarded-for"] &&
      req.headers["x-forwarded-for"].split(",")[0].trim()) ||
    req.socket.remoteAddress ||
    "unknown";

  onlineMap.set(ip, now);

  // Xoá những IP quá 5 phút không ping
  for (const [key, ts] of onlineMap.entries()) {
    if (now - ts > ONLINE_WINDOW) {
      onlineMap.delete(key);
    }
  }

  res.json({ online: onlineMap.size });
});

// -------- HÀM ĐỌC / GHI CONFESSION --------
function loadConfessions() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Đảm bảo có field status cho mỗi item
    return parsed.map((c) => {
      if (!c.status) {
        // các confession cũ mặc định coi như đã duyệt
        return { ...c, status: "approved" };
      }
      return c;
    });
  } catch (e) {
    console.error("Error reading confessions:", e);
    return [];
  }
}

function saveConfessions(list) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf8");
  } catch (e) {
    console.error("Error writing confessions:", e);
  }
}

// -------- MIDDLEWARE ADMIN --------
function requireAdmin(req, res, next) {
  // CHỈ đọc từ header để tránh lộ query/body
  const token = req.headers["x-admin-token"];

  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// -------- API PUBLIC: FEED --------
// Chỉ trả về confession đã approved
app.get("/api/confessions", (req, res) => {
  const confessions = loadConfessions()
    .filter((c) => c.status === "approved")
    .sort((a, b) => b.createdAt - a.createdAt);

  res.json(confessions);
});

// Nhận confession mới (mặc định pending)
app.post("/api/confessions", (req, res) => {
  const { target, grade, content } = req.body || {};

  if (!content || typeof content !== "string" || content.trim().length < 10) {
    return res
      .status(400)
      .json({ error: "Nội dung quá ngắn, cần ít nhất 10 ký tự." });
  }

  const now = Date.now();

  const newConfession = {
    id: now,
    target: (target || "").trim(),
    grade: (grade || "").trim(),
    content: content.trim(),
    createdAt: now,
    status: "pending",
  };

  const list = loadConfessions();
  list.push(newConfession);
  saveConfessions(list);

  res.status(201).json({ success: true, confession: newConfession });
});

// -------- API ADMIN --------

// Lấy danh sách confession cho admin
// ?status=pending | approved | (bỏ trống = tất cả)
app.get("/api/admin/confessions", requireAdmin, (req, res) => {
  const { status } = req.query;
  let list = loadConfessions().sort((a, b) => b.createdAt - a.createdAt);

  if (status === "pending") {
    list = list.filter((c) => c.status === "pending");
  } else if (status === "approved") {
    list = list.filter((c) => c.status === "approved");
  }

  res.json(list);
});

// Approve confession
app.post("/api/admin/confessions/:id/approve", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const list = loadConfessions();
  const idx = list.findIndex((c) => c.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: "Confession không tồn tại" });
  }

  list[idx].status = "approved";
  saveConfessions(list);

  res.json({ success: true, confession: list[idx] });
});

// Delete confession
app.delete("/api/admin/confessions/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const list = loadConfessions();
  const idx = list.findIndex((c) => c.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: "Confession không tồn tại" });
  }

  const removed = list.splice(idx, 1)[0];
  saveConfessions(list);

  res.json({ success: true, removed });
});

// Trang admin – serve file tĩnh admin.html
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
