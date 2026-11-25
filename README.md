# Mini Pastebin / Secure Snippet API (Đề 2)

Dịch vụ backend chia sẻ ghi chú/mã nguồn có thời hạn, xây dựng bằng Node.js, Express và `node:fs/promises`.

## Cấu trúc

```text
.
├── app.js
├── package.json
├── data/
│   ├── snippets.json      # Metadata snippet (5 bản ghi mẫu)
│   └── users.json         # Tài khoản mẫu cho x-api-key
├── storage/               # Nội dung snippet: <id>.txt
├── logs/                  # access.log, cleanup.log (runtime)
├── middlewares/
│   ├── requestLogger.js
│   ├── auth.js            # optionalAuth, requireAuth
│   ├── authorization.js   # checkSnippetOwner, requireAdmin
│   └── validateSnippet.js
├── routes/
│   ├── snippetRoutes.js   # /api/snippets
│   └── maintenanceRoutes.js # /api/maintenance
└── utils/
    ├── paths.js
    └── fileHelpers.js
```

## Cài đặt & chạy

```bash
npm install
npm start
```

Server mặc định chạy tại `http://localhost:3000`.

## Xác thực

Gửi header `x-api-key` với một key trong `data/users.json`:

| Username | API Key | Role |
|---|---|---|
| admin | `admin-key-123` | admin |
| alice | `alice-key-456` | user |
| bob | `bob-key-789` | user |

## API

### Snippets - `/api/snippets`

- `POST /api/snippets` *(requireAuth, validateSnippet)*: tạo snippet mới, ghi nội dung vào `storage/<id>.txt`, lưu metadata vào `data/snippets.json`.
- `GET /api/snippets`: lấy danh sách snippet công khai còn hiệu lực.
- `GET /api/snippets/:id` *(optionalAuth)*: xem snippet. Snippet private yêu cầu xác thực; owner/admin mới được xem. Nếu hết hạn hoặc vượt `maxViews` trả `410`; hợp lệ thì tăng `views` và trả nội dung từ `storage/<id>.txt`.
- `PUT /api/snippets/:id` *(requireAuth, checkSnippetOwner, validateSnippet)*: chỉ tác giả hoặc admin được cập nhật title/config/content.
- `DELETE /api/snippets/:id` *(requireAuth, checkSnippetOwner)*: xóa metadata và xóa file `storage/<id>.txt` bằng `fs.unlink`.

### Maintenance - `/api/maintenance` *(Admin only)*

- `POST /api/maintenance/cleanup`: quét snippet hết hạn/vượt `maxViews`, xóa metadata + file `.txt`, ghi báo cáo vào `logs/cleanup.log`.
- `GET /api/maintenance/stats`: thống kê tổng số, đang hoạt động, công khai/riêng tư, hết hạn/vượt giới hạn.

## Middleware

- `requestLogger`: đo thời gian xử lý bằng `res.on("finish")`, append vào `logs/access.log`, tự tạo `logs/` bằng `fs.mkdir({ recursive: true })`.
- `optionalAuth` / `requireAuth`: đọc `x-api-key`, đối chiếu `data/users.json`, gắn `req.currentUser`. Thiếu/sai key khi bắt buộc trả `401`.
- `checkSnippetOwner` / `requireAdmin`: chỉ tác giả hoặc admin được sửa/xóa snippet; `/api/maintenance` chỉ admin, không đủ quyền trả `403`.
- `validateSnippet`: title/content không rỗng, content <= 10KB, trả `400` nếu không hợp lệ.

## Ví dụ nhanh

```bash
# Tạo snippet
curl -X POST http://localhost:3000/api/snippets \
  -H "Content-Type: application/json" \
  -H "x-api-key: alice-key-456" \
  -d '{"title":"Demo","content":"console.log(1)","isPrivate":false,"maxViews":10,"expiresAt":"2099-01-01T00:00:00.000Z"}'

# Xem snippet public
curl http://localhost:3000/api/snippets/<id>

# Thống kê admin
curl http://localhost:3000/api/maintenance/stats -H "x-api-key: admin-key-123"
```
