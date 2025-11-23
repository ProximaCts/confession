const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, "confessions.json");

app.use(express.json());

// Serve file tĩnh (index.html, CSS, JS, hình ảnh...)
app.use(express.static(path.join(__dirname, "public")));

// Đọc dữ liệu confession từ file
function loadConfessions() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Error reading confessions:", e);
    return [];
  }
}

// Ghi dữ liệu confession xuống file
function saveConfessions(list) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(list, null, 2), "utf8");
  } catch (e) {
    console.error("Error writing confessions:", e);
  }
}

// API: lấy danh sách confession (cho admin xem hoặc feed)
app.get("/api/confessions", (req, res) => {
  const confessions = loadConfessions().sort(
    (a, b) => b.createdAt - a.createdAt
  );
  res.json(confessions);
});

// API: nhận confession mới
app.post("/api/confessions", (req, res) => {
  const { target, grade, content } = req.body || {};

  if (!content || typeof content !== "string" || content.trim().length < 10) {
    return res
      .status(400)
      .json({ error: "Nội dung quá ngắn, cần ít nhất 10 ký tự." });
  }

  const newConfession = {
    id: Date.now(),
    target: (target || "").trim(),
    grade: (grade || "").trim(),
    content: content.trim(),
    createdAt: Date.now(),
  };

  const list = loadConfessions();
  list.push(newConfession);
  saveConfessions(list);

  res.status(201).json({ success: true, confession: newConfession });
});

// (Optional) page admin đơn giản – sau này có thể thêm auth
app.get("/admin", (req, res) => {
  res.send("<h1>Admin page</h1><p>Sau này bạn có thể build UI riêng.</p>");
});

app.listen(PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
