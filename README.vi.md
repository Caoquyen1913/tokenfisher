<p align="center">
  <img src="assets/banner.svg" alt="tokenfisher: catch only the tokens you need" width="100%">
</p>

<p align="center"><a href="README.md">English</a> · <b>Tiếng Việt</b></p>

**tokenfisher** giúp Claude Code tốn ít token hơn mà không làm việc kém đi. Cách làm: **đo trước**, chỉ cắt phần không ảnh hưởng chất lượng, và chứng minh bằng A/B test thay vì tự công bố con số.

Giống chim bói cá: đứng im quan sát, rồi lao xuống đúng một phát, chỉ bắt con cá đáng bắt.

## Kết quả: cùng prompt, chấm bằng test ẩn, chi phí thật

**Cài plugin (bản 0.3.0, không cần cờ) rẻ hơn Claude Code mặc định trên Opus 56,1% mà không giảm chất lượng:** 9 task × 3 lần cho mỗi bên, lượt nào cũng qua hết check ẩn.

| mức | mặc định (Opus) | plugin tokenfisher | thay đổi |
|---|---|---|---|
| easy | $0,141 | $0,075 | −46,9% |
| medium | $0,146 | $0,081 | −44,4% |
| hard | $0,286 | $0,128 | −55,2% |
| complex | $0,351 | $0,127 | −63,8% |
| **tất cả** | **$0,253** | **$0,111** | **−56,1%** (95% CI −60,1% … −51,8%) |

Plugin giữ mọi tool và MCP server của bạn. Sonnet tự giải hết các task; agent Opus chưa được gọi lần nào. Bằng chứng: [`evidence/merged-2026-10-29/`](evidence/merged-2026-10-29/REPORT.md), tổng $9,81.

Bảng bậc thang dưới đây cho thấy phần tiết kiệm đến từ đâu. 120 lượt chạy Claude Code headless: 8 task từ dễ tới phức tạp × 5 cấu hình × 3 lần lặp. Chấm bằng bộ test ẩn mà agent không thấy. Mỗi bậc thêm đúng một cách cắt so với bậc trước.

| bậc | cấu hình | chất lượng (check ẩn đạt) | chi phí so với baseline (CI 95%) |
|---|---|---|---|
| **A** | baseline: Claude Code mặc định, Opus, đủ mọi tool | 100% (24/24 lượt) | – |
| **T** | Opus + chỉ 7 tool lõi + bỏ MCP + prompt đọc gọn + hook nén | 100% (24/24) | **−31,4%** (−22,0% … −41,6%) |
| **S** | T chạy Sonnet | 100% (24/24) | **−73,7%** (−69,1% … −78,7%) |
| **L** | S với `--effort low` | 100% (24/24) | **−76,5%** (−72,5% … −80,8%) |
| **M** | profile `tokenfisher-max` cũ (S + subagent Opus khi khó + scout Haiku), không cần cờ | 100% (24/24) | **−73,6%** (−70,8% … −76,4%) |

Theo mức độ:

| mức | task | T so với A | S so với A | L so với A | M so với A |
|---|---|---|---|---|---|
| easy | sửa off-by-one; `slugify` có dấu tiếng Việt | −55,5% | −80,8% | −81,9% | −77,3% |
| medium | bộ test 243 dòng đang fail, 2 lỗi ở 2 file, cấm sửa test | −55,9% | −81,7% | −82,3% | −79,7% |
| hard | tìm lỗi trong log ~5.000 dòng; semver range theo spec; job queue bị treo và báo idle sớm | −31,7% | −71,3% | −70,8% | −69,6% |
| complex | giữ hàng có hết hạn (10 yêu cầu); tăng tốc báo cáo O(n²) mà output giống từng byte | −13,7% | −71,8% | −80,3% | −76,0% |

Đọc số liệu một cách thẳng thắn:

- **Không lượt nào giảm chất lượng trong 120 lượt, từ dễ tới phức tạp.** Nhưng cấu hình nào cũng đạt 100%, nghĩa là bộ task vẫn chưa phân biệt được cấu hình mạnh với yếu. Nên hiểu là "không thấy suy giảm trên 8 task này", không phải "không suy giảm ở mọi nơi".
- **Schema tool là chi phí ẩn.** Khoảng 70% mỗi request là schema của các tool tích hợp mà task code không bao giờ gọi. Chỉ giữ 7 tool lõi đã giảm 31% chi phí Opus, không cần đổi model.
- **Đòn bẩy lớn nhất là chọn model.** Sonnet với 7 tool lõi rẻ hơn 74% và đạt mọi check ẩn, kể cả 3 task hard và 2 task complex.
- **Nhánh leo thang lên Opus trong M chưa được dùng lần nào.** Sonnet tự giải quyết mọi task, nên M tốn đúng bằng S. Lưới an toàn đã được nối và xác nhận nạp được, nhưng chưa được chứng minh là kích hoạt đúng lúc hay giúp được gì.
- **`--effort low` tiết kiệm thêm một chút (−76,5%)**, không đo được ảnh hưởng chất lượng trên các task này.
- **Mặc định của plugin từ bản 0.3.0 nằm giữa A và S.** Nó chạy Sonnet nhưng giữ mọi tool và MCP server của bạn: −56,1% thay vì −73,7% của S. Khoảng chênh là cái giá để không mất tool nào.

Bằng chứng cho từng lượt (transcript, kết quả chấm, diff): [`evidence/ladder-2026-10-29/`](evidence/ladder-2026-10-29/REPORT.md). Tổng chi phí: $16,55 theo giá list.

Lần eval đầu (60 lượt, 5 task đầu, khi dự án còn tên tạm `token-diet`) nằm ở [`evidence/ab-2026-10-28-opus/`](evidence/ab-2026-10-28-opus/REPORT.md):

- Plugin + bỏ MCP, vẫn đủ tool và vẫn Opus: −14,5%, nhưng riêng task complex lại đắt hơn 13,5%.
- Chuyển sang Sonnet: −61,6%.
- Ở lần đó hook nén output không kích hoạt lần nào, vì agent tự giới hạn output test. Hook vẫn có ích với log ồn: một log 500 test có 1 lỗi giảm từ 14,2k xuống 1,9k ký tự, mà model vẫn trích đúng dòng assertion lỗi.

## Gồm những gì

| công cụ | làm gì |
|---|---|
| **Luồng chính chạy Sonnet** | Plugin chạy hội thoại chính trên Sonnet (`agents/main.md`) và giữ mọi tool, nên MCP server và tool web vẫn được nạp khi bạn cần. Việc khó (thiết kế xuyên module, logic concurrency/bảo mật, spec rắc rối, bug sửa 2 lần chưa xong) chuyển cho subagent `opus-architect`; `scout` chạy Haiku để đọc file/log lớn. Một policy ~120 token lúc mở phiên nhắc tìm trước rồi mới đọc và gộp tool call. Muốn Opus làm model chính thì mở phiên bằng `claude --model opus`. |
| **`token-report`** | Đọc transcript Claude Code và cho biết token đi đâu: input, cache write, cache read, output; theo model, theo project, main hay subagent. Có thêm **rent** của từng tool result (chi phí nằm lại trong context), số lần cache bị build lại, các phiên quá dài, kèm gợi ý cụ thể. `--simulate` chạy lại bộ lọc trên output shell cũ để ước tính mức tiết kiệm cho *chính cách bạn làm việc*. |
| **`token-audit`** | Tách những gì mỗi phiên nạp trước câu hỏi đầu tiên (system prompt, danh sách skill/agent, tên tool và hướng dẫn MCP, output hook, CLAUDE.md/memory). Truy từng mục về file hoặc plugin sinh ra nó, rồi xếp hạng những gì bạn bỏ được. |
| **squash hook** | Hook `PostToolUse` cho `Bash` và `PowerShell`. Lệnh chạy nguyên vẹn (permission, cwd, exit code không đổi); chỉ phần Claude *đọc* được nén, còn bản đầy đủ được lưu ra file để Claude đọc lại khi cần. |
| **cảnh báo phiên** | Hook `UserPromptSubmit`. Khi context vượt 80k token (rồi mỗi +40k), hoặc khi bạn quay lại sau lúc prompt cache đã hết hạn (5 phút, hoặc 1 giờ nếu phiên dùng TTL 1h), hook báo một lần cho cả bạn lẫn Claude: mọi tool result bị tính tiền lại ở mỗi lượt sau, nên `/compact`, hoặc `/clear` khi chuyển việc. Hook chỉ đọc phần đuôi transcript. Đổi ngưỡng bằng `TOKENFISHER_WARN_TOKENS` (`0` để tắt). |
| **A/B eval** | Bộ công cụ tạo ra các số liệu trên: prompt cố định, repo mới cho mỗi lượt, bộ chấm ẩn, selftest cho bộ chấm, CI bootstrap ghép cặp, bằng chứng cho từng lượt. Bạn có thể thêm task của mình. |

## Cài đặt

Trong Claude Code:

```
/plugin marketplace add Caoquyen1913/tokenfisher
/plugin install tokenfisher@tokenfisher
```

Marketplace bên thứ ba mặc định không tự cập nhật. Bật trong `/plugin` → Marketplaces → `tokenfisher`, hoặc cập nhật tay:

```
/plugin marketplace update tokenfisher
```

Mỗi ngày một lần, lúc mở phiên, plugin cũng kiểm tra version trên GitHub và báo khi có bản mới. Tắt bằng `TOKENFISHER_NO_UPDATE_CHECK=1`.

Sau khi cài, phiên mới chạy Sonnet với đủ tool. Muốn một phiên chạy Opus:

```bash
claude --model opus
```

Đặt `"model"` trong `settings.json` không thắng được agent chính của plugin; cờ `--model` thì có.

Cấu hình rẻ nhất đã đo (arm S) còn bỏ mọi tool trừ 7 tool lõi, đổi lại phiên đó không có MCP và tool web:

```bash
claude --model sonnet --tools Bash,PowerShell,Read,Edit,Write,Glob,Grep --strict-mcp-config
```

Hoặc thử tokenfisher trong một phiên từ bản clone:

```bash
git clone https://github.com/Caoquyen1913/tokenfisher.git
```

```bash
claude --plugin-dir ./tokenfisher
```

Cần Node 18+, không có dependency npm. Đã phát triển và kiểm thử trên Windows 11 (Git Bash và PowerShell). Vì chỉ dùng Node thuần nên macOS/Linux nhiều khả năng chạy được, nhưng chưa kiểm chứng.

## Sử dụng

Hỏi Claude "token của tôi đi đâu?" hoặc gõ `/tokenfisher:tokenfisher`. Hoặc chạy trực tiếp từ bản clone:

```bash
node bin/token-report.js --days 7 --simulate
```

```bash
node bin/token-audit.js
```

## Hook giữ an toàn thế nào

Mỗi lệnh được xếp vào 1 trong 3 nhóm (`lib/squash.js`):

| nhóm | lệnh | xử lý |
|---|---|---|
| `pass` | có một đoạn pipeline là lệnh *xem nội dung* (`cat`, `sed -n`, `head`, `tail`, `jq`, `Get-Content`…), `git diff/show/blame`, output JSON, hoặc có `# no-squash` ở cuối | giữ nguyên từng byte |
| `full` | họ lệnh "ồn": npm/pnpm/yarn/npx, pip/uv/poetry, pytest/jest/vitest, `node …test…`, cargo/go/dotnet/mvn/gradle, make, tsc/eslint/ruff/mypy, docker build/logs, terraform, `git log/status/pull/clone…` | làm sạch + cắt bớt |
| `clean` | các lệnh còn lại | chỉ làm sạch, **không bao giờ bỏ dòng nội dung** |

- **Làm sạch**: bỏ mã màu ANSI, chỉ giữ lần vẽ cuối của dòng progress `\r`, bỏ thanh tiến trình, gộp các dòng lặp thành `(previous line repeated N more times)`.
- **Cắt bớt**: chỉ áp dụng cho nhóm `full` khi output > 60 dòng hoặc > 6.000 ký tự. Giữ 15 dòng đầu, 40 dòng cuối, và mọi dòng có dấu hiệu lỗi/cảnh báo kèm ±2 dòng xung quanh. Cuối output thêm `[tokenfisher: N lines omitted; full output saved at …]`.
- Output dưới 1.500 ký tự không bị động tới. Hook gặp lỗi thì output gốc đi qua nguyên vẹn.
- Bản gốc lưu ở `~/.claude/tokenfisher/raw/` (giữ 300 file mới nhất). Mật khẩu/token viết thẳng trong lệnh (`PASSWORD=…`) được che trước khi ghi.
- Tắt bằng `TOKENFISHER_DISABLE=1`.

## Những điều đáng biết (đã đo)

- **Khoảng 70% mỗi request là schema tool.** Trong phiên headless chạy Sonnet, prefix có đủ tool tích hợp là 35,6k token; chỉ giữ 7 tool lõi (`--tools`) còn 11,2k.
- **Cache ấm làm lệch phép so sánh.** Lần thử đầu, baseline trông rẻ hơn 3 lần chỉ vì prefix của nó trùng với các phiên hằng ngày đã nằm sẵn trong cache. Runner vì vậy warm-up mọi nhánh trước và xáo thứ tự nhánh.
- **`--strict-mcp-config` thu nhỏ prefix khởi động từ 40,8k xuống 35,2k token** trong phiên headless có connector claude.ai.
- **`--disable-slash-commands` lại *tăng* prefix lên 47,1k (+6,3k).** Đừng dùng cờ này để tiết kiệm.
- **Context khởi động phần lớn là cố định.** Trong một phiên desktop app, ~75% của 75k token khởi động là schema tool; phần bạn kiểm soát được chỉ ~10%.
- **Trên lịch sử 30 ngày thực tế, cache read chiếm 61% chi phí quy đổi**, cache write 30%, output 9%. Phiên dài và các khoảng nghỉ (cache bị build lại chiếm 18,6%) quan trọng hơn việc câu trả lời dài hay ngắn.
- **Giao việc khám phá codebase cho scout Haiku không đáng.** Task 9 là một repo khoảng 108 file, prompt chỉ mô tả triệu chứng. Khi bật chính sách "khám phá qua scout trước", M gọi scout ở mọi lượt và cache write của luồng chính giảm 45%. Nhưng tiền trả cho các lượt Haiku còn nhiều hơn phần tiết kiệm đó: $0,065 so với $0,060 mỗi lượt của S (5 lượt mỗi bên, đều đạt 11/11). Sonnet chỉ cần khoảng 2 lượt để khám phá, vì nó gộp `git ls-files` và `grep -rn` vào một lệnh Bash, nên chính sách này đã bị bỏ. Bảng ladder ở trên chỉ gồm task 1–8; task 9 được thêm sau.

## Chạy lại hoặc mở rộng eval

```bash
node eval/selftest.js
```

```bash
node eval/ab.js --arms A,T,S,L,M --tasks all --reps 3 --parallel 3 --budget 5
```

```bash
node eval/report.js eval/results/<run>
```

```bash
node eval/publish.js eval/results/<run>
```

- `selftest` chứng minh bộ chấm phân biệt được: repo chưa sửa phải trượt, lời giải mẫu phải đạt 100%.
- `ab.js` warm-up từng nhánh, rồi chạy mỗi (task, nhánh, lần lặp) trong một repo tạm mới có git, sau đó chấm điểm.
- `publish.js` chép kết quả sang `evidence/`, bỏ đường dẫn máy, tên tài khoản, email, danh sách connector và thông tin hạn mức.

Thêm task: tạo `eval/tasks/<n>-<level>-<name>/` gồm `task.json` (`level`, `prompt`, tùy chọn `testsFrozen`), `repo/`, `hidden/checks.js`, lời giải mẫu `solution/`, và tùy chọn `prepare.js`.

## Đóng góp

Hoan nghênh issue và PR, nhất là:

- task eval đủ khó để Sonnet một mình đôi khi trượt, nhờ đó đo được tác dụng của việc leo thang lên Opus;
- kết quả chạy trên macOS/Linux;
- bộ lọc thông minh hơn cho các họ lệnh ồn.

Chạy `npm test` và `node eval/selftest.js` trước khi mở PR.

## Giấy phép

[MIT](LICENSE) © 2026 Kawin Tran
