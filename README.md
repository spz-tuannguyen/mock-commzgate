# 🚀 Mock CommzGate Gateway (Cloud & CG-ONE Appliance)

Mock server giả lập dịch vụ gửi tin nhắn SMS của **CommzGate** (Singapore), hỗ trợ đầy đủ cả 2 chế độ:
1. **CommzGate Cloud SMS API** (`/gateway/SendMessage`, `/gateway/SendMessage.aspx`,...)
2. **CommzGate Device / Hardware Appliance** (CG-ONE, CG-RACK on-premise: `/api/SendMsg`, `/SendMsg`, `/api/GetMsgStat`,...)

Đi kèm **Web UI Console Dashboard** thời gian thực (SSE), bộ thử nghiệm gửi tin nhắn trực tiếp, tính năng mô phỏng lỗi (Fault Injection), giả lập độ trễ mạng, và sẵn sàng **deploy miễn phí 100% lên Vercel hoặc Render**.

---

## 📸 Tính Năng Chính
- ⚡ **Real-time Live Inbox**: Nhận tin nhắn SMS và cập nhật ngay lên giao diện Web theo thời gian thực (Server-Sent Events).
- 📱 **Hỗ trợ đầy đủ tham số CommzGate**:
  - Cloud: `ID`, `Password`, `Mobile`, `Type` (A, LA, Unicode), `Message`, `Sender`, `OTP` (tự động sinh mã OTP ngẫu nhiên).
  - Device (CG-ONE): `token`, `mobile`, `message`, `otp`.
- 🛠️ **Mô phỏng lỗi (Fault Injection)**: Dễ dàng cấu hình giả lập lỗi `01012` (Unauthorized), `01010` (Invalid Mobile), `429` (Rate Limit), `500` (Modem Failure) hoặc độ trễ mạng (0ms - 5000ms) để test khả năng retry/xử lý ngoại lệ trong ứng dụng của bạn.
- 🔍 **Message Inspector**: Xem chi tiết payload, header, client IP và sao chép lệnh `cURL` để replay.
- 🌐 **Deploy miễn phí**: Tương thích hoàn toàn với Vercel Serverless (`vercel.json`) và Render Web Service (`render.yaml`, `Dockerfile`).

---

## 🛠️ Chạy Cục Bộ (Local Machine)

### Yêu cầu:
- Node.js >= 18.x (khuyên dùng Node 20+)

### Cài đặt & Khởi động:
```bash
# 1. Cài đặt dependencies
npm install

# 2. Chạy server
npm start
```

Mở trình duyệt truy cập: **`http://localhost:3000`** để xem giao diện Dashboard.

---

## 📡 Danh Sách API Endpoints

### 1. CommzGate Cloud API
- **Endpoint**: `GET /gateway/SendMessage` hoặc `POST /gateway/SendMessage`
  *(Hoặc alias: `/gateway/SendMessage.aspx`, `/gateway/SendSMS`, `/SendMessage`)*
- **Phương thức**: GET (query params) hoặc POST (form urlencoded / JSON / query).
- **Tham số**:
  - `ID`: API ID
  - `Password`: API Password
  - `Mobile`: Số điện thoại người nhận (vd: `6591234567`)
  - `Message`: Nội dung tin nhắn
  - `Type`: Loại tin (`A` - standard ASCII 160 ký tự, `LA` - long ASCII 459 ký tự, `U` - unicode, `AUTO`)
  - `OTP`: Cờ `true`/`false`. Nếu là `true`, mock server sẽ tự sinh 1 mã OTP 6 số.
- **Phản hồi mẫu**:
  - Thành công: `STATUS=000:SUCCESS:ID=CGM12345678`
  - Nếu có OTP: `STATUS=000:SUCCESS:ID=CGM12345678,OTP=829104`
  - Thất bại: `STATUS=01012:UNAUTHORIZED`

**Ví dụ cURL:**
```bash
curl "http://localhost:3000/gateway/SendMessage?ID=demo&Password=123&Mobile=6591234567&Type=A&Message=Hello+World&OTP=true"
```

---

### 2. CommzGate Device / Appliance (CG-ONE)
- **Endpoint**: `GET /api/SendMsg` hoặc `POST /api/SendMsg`
  *(Hoặc alias: `/SendMsg`, `/gateway/SendMsg`, `/send_sms`)*
- **Tham số**:
  - `token`: API Token được cấp trên thiết bị CG-ONE
  - `mobile`: Số điện thoại người nhận
  - `message`: Nội dung tin nhắn
  - `otp`: Cờ `true`/`false`.
- **Phản hồi mẫu**:
  - Thành công: `CG1083921`
  - Nếu có OTP: `CG1083921,48921`
- **Endpoint kiểm tra trạng thái tin nhắn**:
  - `GET /api/GetMsgStat?id=CG1083921` -> Trả về: `STATUS=DELIVERED`

**Ví dụ cURL:**
```bash
curl "http://localhost:3000/api/SendMsg?token=secret123&mobile=6591234567&message=Alert+from+server&otp=true"
```

---

## ☁️ Hướng Dẫn Deploy Miễn Phí (Free Hosting)

### Lựa Chọn 1: Deploy lên Vercel (Khuyên Dùng - Cực Nhanh & Miễn Phí)
1. Đẩy mã nguồn dự án lên GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial mock commzgate"
   git branch -M main
   git remote add origin https://github.com/<your-username>/mock-commzgate.git
   git push -u origin main
   ```
2. Đăng nhập [Vercel](https://vercel.com).
3. Nhấp **"Add New..."** -> **"Project"** -> Chọn repository `mock-commzgate`.
4. Vercel sẽ tự động phát hiện `vercel.json` và cấu hình serverless.
5. Nhấp **"Deploy"**.
6. Sau ~30 giây, bạn sẽ có domain miễn phí dạng: `https://mock-commzgate-xxxx.vercel.app`.

---

### Lựa Chọn 2: Deploy lên Render (Miễn Phí)
Render cung cấp Web Service miễn phí chạy liên tục:
1. Đẩy mã nguồn lên GitHub (như bước trên).
2. Đăng nhập [Render.com](https://render.com).
3. Nhấp **"New +"** -> Chọn **"Web Service"**.
4. Kết nối tới GitHub repo `mock-commzgate`.
5. Cấu hình cài đặt:
   - **Name**: `mock-commzgate`
   - **Language**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
6. Nhấp **"Deploy Web Service"**.
7. Sau ~1 phút, bạn sẽ có URL dạng: `https://mock-commzgate.onrender.com`.

---

## 💻 Mẫu Cấu Hình Trong Ứng Dụng C# (.NET)

Thay vì gọi trực tiếp tới `https://www.commzgate.net`, bạn chỉ cần trỏ URL về server mock:

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

class Program
{
    static async Task Main(string[] args)
    {
        var httpClient = new HttpClient();
        
        // URL server mock đã deploy (hoặc localhost khi dev)
        string mockBaseUrl = "https://mock-commzgate.onrender.com"; 

        // 1. Gửi qua Commzgate Cloud
        string cloudUrl = $"{mockBaseUrl}/gateway/SendMessage?ID=my_id&Password=my_pass&Mobile=6591234567&Type=A&Message=Xin+chao&OTP=true";
        var cloudRes = await httpClient.GetAsync(cloudUrl);
        string cloudContent = await cloudRes.Content.ReadAsStringAsync();
        Console.WriteLine("Cloud Response: " + cloudContent);

        // 2. Gửi qua Commzgate Device (CG-ONE)
        string devUrl = $"{mockBaseUrl}/api/SendMsg?token=cg_token_123&mobile=6591234567&message=Warning+System+Down";
        var devRes = await httpClient.GetAsync(devUrl);
        string devContent = await devRes.Content.ReadAsStringAsync();
        Console.WriteLine("Device Response: " + devContent);
    }
}
```

---

## 📁 Cấu Trúc Dự Án
```
mock-commzgate/
├── api/
│   └── index.js              # Serverless entrypoint cho Vercel
├── public/                   # Dashboard Web UI
│   ├── index.html            # Giao diện điều khiển SPA
│   ├── app.js                # Logic realtime SSE & xử lý form
│   └── styles.css            # Dark mode Glassmorphism theme
├── src/
│   ├── app.js                # Express app & route configuration
│   ├── server.js             # Local/Render standalone server
│   ├── store.js              # Lưu trữ in-memory & event emitter
│   ├── utils.js              # Parameter extractor & formatter
│   └── routes/
│       ├── cloud.js          # CommzGate Cloud routes
│       ├── device.js         # CommzGate Device (CG-ONE) routes
│       └── dashboard.js      # Dashboard APIs & SSE
├── Dockerfile                # Docker containerization
├── render.yaml               # Blueprint Render
├── vercel.json               # Cấu hình rewrite Vercel
├── package.json
└── README.md
```
