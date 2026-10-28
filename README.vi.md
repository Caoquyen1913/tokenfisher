<p align="center">
  <img src="assets/banner.svg" alt="tokenfisher: catch only the tokens you need" width="100%">
</p>

<p align="center"><a href="README.md">English</a> · <b>Tiếng Việt</b></p>

**tokenfisher** giúp Claude Code tốn ít token hơn mà không làm việc kém đi. Cách làm: **đo trước**, chỉ cắt phần không ảnh hưởng chất lượng, và chứng minh bằng A/B test thay vì tự công bố con số.

Giống chim bói cá: đứng im quan sát, rồi lao xuống đúng một phát, chỉ bắt con cá đáng bắt.

## Kết quả: cùng prompt, chấm bằng test ẩn, chi phí thật

60 lượt chạy Claude Code headless: 5 task từ dễ tới phức tạp × 4 cấu hình × 3 lần lặp. Chấm bằng bộ test ẩn mà agent không thấy.

| cấu hình | chất lượng (check ẩn đạt) | chi phí so với baseline (CI 95%) |
|---|---|---|
| **A** baseline: Claude Code mặc định, Opus | 100% (15/15 lượt) | – |
| **B** tokenfisher, cùng model (Opus) | 100% (15/15) | **−14,5%** (−0,4% … −27,2%) |
| **C** tokenfisher + chuyển sang Sonnet | 100% (15/15) | **−61,6%** (−57,0% … −65,7%) |
| **D** tokenfisher + `--effort medium` | 100% (15/15) | −10,7% (+1,1% … −24,2%), chưa có ý nghĩa thống kê |

Theo mức độ:

| mức | task | B so với A | C so với A |
|---|---|---|---|
| easy | sửa off-by-one; viết `slugify` có dấu tiếng Việt | −30,0% | −65,7% |
| medium | bộ test 243 dòng đang fail, 2 lỗi ở 2 file, cấm sửa test | −27,3% | −67,4% |
| hard | tìm nguyên nhân lỗi 500 trong log ~5.000 dòng, sửa, thêm test hồi quy | −20,4% | −63,5% |
| complex | giữ hàng có hết hạn: 10 yêu cầu, store + API | **+13,5%** | −52,5% |

Đọc số liệu một cách thẳng thắn:

- **Không lượt nào giảm chất lượng trong 60 lượt.** Mỗi nhánh có 15 lượt trên repo nhỏ: đây là bằng chứng không thấy suy giảm, chưa phải bảo đảm cho mọi codebase.
- **Đòn bẩy lớn nhất là chọn model.** Sonnet kèm tokenfisher rẻ hơn 62% và đạt mọi check, từ dễ tới phức tạp.
- **Giữ nguyên model, tokenfisher tiết kiệm 20–30% ở các task easy tới hard.** Ở task complex lại đắt hơn 13,5%, vì 2/3 lượt viết output gấp đôi. Với 3 lần lặp thì đây nằm trong mức nhiễu, nhưng vẫn ghi đúng như đo được.
- **Hook nén output không kích hoạt lần nào trong các lượt này**, vì agent tự giới hạn output test. Khoản tiết kiệm của B đến từ prefix nhỏ hơn (bỏ MCP/connector) và prompt đọc gọn. Hook phát huy với log ồn và output test/build: một log 500 test có 1 lỗi giảm từ 14,2k xuống 1,9k ký tự, mà model vẫn trích đúng dòng assertion lỗi.

Mọi lượt chạy đều được công khai, kèm transcript, kết quả chấm và diff, trong [`evidence/ab-2026-10-28-opus/`](evidence/ab-2026-10-28-opus/REPORT.md). Tổng chi phí 60 lượt: $10,49 theo giá list. Các lượt chạy thực hiện trước khi đổi tên dự án, khi còn tên tạm `token-diet`.

## Gồm những gì

| công cụ | làm gì |
|---|---|
| **`token-report`** | Đọc transcript Claude Code và cho biết token đi đâu: input, cache write, cache read, output; theo model, theo project, main hay subagent. Có thêm **rent** của từng tool result (chi phí nằm lại trong context), số lần cache bị build lại, các phiên quá dài, kèm gợi ý cụ thể. `--simulate` chạy lại bộ lọc trên output shell cũ để ước tính mức tiết kiệm cho *chính cách bạn làm việc*. |
| **`token-audit`** | Tách những gì mỗi phiên nạp trước câu hỏi đầu tiên (system prompt, danh sách skill/agent, tên tool và hướng dẫn MCP, output hook, CLAUDE.md/memory). Truy từng mục về file hoặc plugin sinh ra nó, rồi xếp hạng những gì bạn bỏ được. |
| **squash hook** | Hook `PostToolUse` cho `Bash` và `PowerShell`. Lệnh chạy nguyên vẹn (permission, cwd, exit code không đổi); chỉ phần Claude *đọc* được nén, còn bản đầy đủ được lưu ra file để Claude đọc lại khi cần. |
| **A/B eval** | Bộ công cụ tạo ra các số liệu trên: prompt cố định, repo mới cho mỗi lượt, bộ chấm ẩn, selftest cho bộ chấm, CI bootstrap ghép cặp, bằng chứng cho từng lượt. Bạn có thể thêm task của mình. |

## Cài đặt

Trong Claude Code:

```
/plugin marketplace add Caoquyen1913/tokenfisher
/plugin install tokenfisher@tokenfisher
```

Hoặc thử trong một phiên từ bản clone:

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

- **Cache ấm làm lệch phép so sánh.** Lần thử đầu, baseline trông rẻ hơn 3 lần chỉ vì prefix của nó trùng với các phiên hằng ngày đã nằm sẵn trong cache. Runner vì vậy warm-up mọi nhánh trước và xáo thứ tự nhánh.
- **`--strict-mcp-config` thu nhỏ prefix khởi động từ 40,8k xuống 35,2k token** trong phiên headless có connector claude.ai.
- **`--disable-slash-commands` lại *tăng* prefix lên 47,1k (+6,3k).** Đừng dùng cờ này để tiết kiệm.
- **Context khởi động phần lớn là cố định.** Trong một phiên desktop app, ~75% của 75k token khởi động là schema tool; phần bạn kiểm soát được chỉ ~10%.
- **Trên lịch sử 30 ngày thực tế, cache read chiếm 61% chi phí quy đổi**, cache write 30%, output 9%. Phiên dài và các khoảng nghỉ (cache bị build lại chiếm 18,6%) quan trọng hơn việc câu trả lời dài hay ngắn.

## Chạy lại hoặc mở rộng eval

```bash
node eval/selftest.js
```

```bash
node eval/ab.js --arms A,B,C,D --tasks all --reps 3 --parallel 2 --budget 3
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

- task eval mới, đặc biệt là task lớn và lộn xộn hơn;
- kết quả chạy trên macOS/Linux;
- bộ lọc thông minh hơn cho các họ lệnh ồn.

Chạy `npm test` và `node eval/selftest.js` trước khi mở PR.

## Giấy phép

[MIT](LICENSE) © 2026 Kawin Tran
