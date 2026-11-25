# 一键获取掘金评论 (Juejin Comment Exporter)

A small Chrome/Edge Manifest V3 extension that exports all comments and replies from a Juejin (掘金) article page to **CSV** and a readable **HTML** file. It is completely free and runs locally in your browser.

## Features

- Detects the article ID from the current `https://juejin.cn/post/<id>` URL.
- Crawls top-level comments plus all second-level replies via Juejin's public comment APIs.
- Floating control panel in the lower-right corner of the article page; can be collapsed to a circular button.
- Live progress, status and log output, with **Pause / Continue** support.
- Automatic rate limiting (short pauses every 100 comments, longer pause every 1000) to avoid being blocked.
- Automatically downloads both files when crawling finishes, is stopped, or hits an error:
  - `*_评论.csv` — UTF-8 with BOM, opens cleanly in Excel / Numbers.
  - `*_评论.html` — self-contained HTML with replies nested under their parent comment, styled like the reference Python script.
- The injected UI lives in a **Shadow DOM**, so it does not alter the original article layout or styling (no `body` width overrides, no global `.content` / `.comment` / `.author` collisions).

## Installation

1. Clone or download this repository.
2. Open `chrome://extensions` (or `edge://extensions`) in your browser.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this project folder.
5. Open any Juejin article page; the collapsed blue button appears in the bottom-right corner.

> The extension needs to be logged into Juejin in the same browser profile so the API requests carry your session cookies.

## Usage

1. Navigate to a Juejin article, e.g. `https://juejin.cn/post/7694835192107860009`.
2. Click the blue floating button to expand the panel.
3. Click **开始爬取并下载** ("Start crawling and download").
4. Optionally use **暂停** / **继续** to pause or resume.
5. Once finished (or stopped), the CSV and HTML files are downloaded automatically.

The panel stays collapsed by default and only occupies a 48×48 px circle, so reading the article is unaffected.

## Output format

**CSV columns:** `类型, 评论ID, 父级ID, 作者, 内容, 时间, 点赞数`

**HTML output:** article title, post date, link to the original article, total count, and every top-level comment with its replies shown as nested blockquotes. All user-supplied text is HTML-escaped.

Filenames follow `<article title>_<article id>_<YYMMDD>_评论.{csv,html}` and are sanitized for the filesystem.

## Project structure

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension configuration (Manifest V3, content script, permissions). |
| `content.js` | All page logic: UI, crawling, pause/resume, CSV and HTML generation. |
| `background.js` | Service worker; handles download messages. |
| `popup.html` / `popup.css` / `popup.js` | Toolbar popup with instructions (popup-only styles are **not** injected into article pages). |
| `icons/` | Extension icons for 16/48/128 px slots. |
| `fetch_juejin_comments.py` | Standalone reference script with equivalent CSV/HTML output (excluded from git via `.gitignore`). |

The Python script can be run directly as `python3 fetch_juejin_comments.py <article_id>` and writes files into a local output directory; it is kept as a reference for the HTML layout and date handling.

## Notes

- Crawling uses `https://juejin.cn/interact_api/v1/comment/list` and `/reply/list` with the current page's cookies. Respect the platform's rate limits and terms of service.
- Large threads can take a while; the built-in pauses are intentional.
- No data is uploaded anywhere: everything runs in your browser and is saved to your Downloads folder.
