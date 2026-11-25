// content.js
function initCrawler() {
    // 创建 UI 容器；样式放在 Shadow DOM 中，避免影响掘金原页面
    const container = document.createElement('div');
    container.id = 'juejin-comment-crawler';
    const shadow = container.attachShadow({ mode: 'open' });

    // 添加样式（仅作用于 Shadow DOM 内部）
    const style = document.createElement('style');
    style.textContent = `
        :host {
            position: fixed;
            bottom: 20px;
            right: 45px;
            z-index: 9999;
            display: block;
            background: white;
            border: 1px solid #e7e7e7;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 0;
            width: 300px;
            font-family: 'Microsoft YaHei', sans-serif;
            overflow: hidden;
            transition: box-shadow 0.2s ease;
        }
        /* 折叠状态：只显示一个圆形logo，不再占据横向空间 */
        :host(:not(.expanded)) {
            width: 48px;
            height: 48px;
            border: none;
            border-radius: 50%;
            box-shadow: 0 2px 12px rgba(0,0,0,0.25);
        }
        :host(:not(.expanded)):hover {
            box-shadow: 0 4px 16px rgba(0,161,214,0.45);
        }
        :host(:not(.expanded)) .crawler-header {
            height: 48px;
            padding: 0;
            justify-content: center;
            background: #00a1d6;
            border-bottom: none;
            border-radius: 50%;
        }
        :host(:not(.expanded)) .crawler-title,
        :host(:not(.expanded)) .crawler-toggle {
            display: none;
        }
        :host(:not(.expanded)) .crawler-logo svg {
            width: 26px;
            height: 26px;
            fill: #fff;
        }
        .crawler-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 8px;
            padding: 10px 15px;
            background: #f5f5f5;
            cursor: pointer;
            border-bottom: 1px solid #eee;
        }
        .crawler-logo {
            display: flex;
            align-items: center;
        }
        .crawler-logo svg {
            width: 20px;
            height: 20px;
            fill: #00a1d6;
        }
        .crawler-title {
            flex: 1;
            font-size: 16px;
            font-weight: bold;
            color: #00a1d6;
        }
        .crawler-toggle {
            font-size: 18px;
            color: #999;
            transition: transform 0.3s;
        }
        .crawler-body {
            padding: 15px;
            display: none;
        }
        .crawler-stats {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #666;
            margin-bottom: 10px;
        }
        .crawler-buttons {
            display: flex;
            gap: 10px;
            margin-bottom: 10px;
        }
        .crawler-btn {
            flex: 1;
            padding: 8px 0;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        .btn-start {
            background: #00a1d6;
            color: white;
        }
        .btn-start:hover {
            background: #0087b3;
        }
        .btn-pause {
            background: #ff0000ff;
            color: white;
        }
        .btn-pause:hover {
            background: #ff0000ff;
        }
        /* 新增的继续按钮样式 */
        .btn-continue {
            background: #f59b15ff; 
            color: white;
        }
        .btn-continue:hover {
            background: #db7611ff;
        }
        .crawler-log {
            max-height: 150px;
            overflow-y: auto;
            font-size: 12px;
            color: #666;
            border: 1px solid #eee;
            border-radius: 4px;
            padding: 8px;
            background: #fafafa;
        }
        .log-entry {
            margin-bottom: 4px;
            line-height: 1.4;
        }
        .log-time {
            color: #999;
            margin-right: 5px;
        }
        .log-error {
            color: #ff4d4f;
        }
        .log-warning {
            color: #faad14;
        }
        .watermark {
            text-align: center;
            font-size: 10px;
            color: #aaa;
            padding: 5px;
            border-top: 1px solid #eee;
            background: #f9f9f9;
        }
        :host(.expanded) .crawler-toggle {
            transform: rotate(180deg);
        }
        :host(.expanded) .crawler-body {
            display: block;
            animation: crawlerFadeIn 0.18s ease;
        }
        @keyframes crawlerFadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    shadow.appendChild(style);

    // 创建UI容器（内容放在 Shadow DOM 中，不与原页面 DOM/样式互相污染）
    const template = document.createElement('template');
    template.innerHTML = `
        <div class="crawler-header" title="掘金评论爬取工具">
            <div class="crawler-logo" aria-hidden="true">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4l4 4 4-4h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>
            </div>
            <div class="crawler-title">掘金评论爬取工具</div>
            <div class="crawler-toggle">▼</div>
        </div>
        <div class="crawler-body">
            <div class="crawler-stats">
                <span>已爬取: <span id="crawled-count">0</span> 条</span>
                <span>状态: <span id="crawler-status">就绪</span></span>
            </div>
            <div class="crawler-buttons">
                <button class="crawler-btn btn-start" id="start-crawl">开始爬取并下载</button>
                <button class="crawler-btn btn-pause" id="pause-crawl" disabled>暂停</button>
            </div>
            <div class="crawler-log" id="crawler-log"></div>
        </div>
    `;
    shadow.appendChild(template.content.cloneNode(true));
    document.body.appendChild(container);

    // 获取UI元素（从 Shadow DOM 中查找）
    const header = shadow.querySelector('.crawler-header');
    const toggleBtn = shadow.querySelector('.crawler-toggle');
    const body = shadow.querySelector('.crawler-body');
    const startBtn = shadow.querySelector('#start-crawl');
    const pauseBtn = shadow.querySelector('#pause-crawl');
    const crawledCount = shadow.querySelector('#crawled-count');
    const crawlerStatus = shadow.querySelector('#crawler-status');
    const crawlerLog = shadow.querySelector('#crawler-log');

    // 折叠/展开功能
    let isExpanded = false;
    function togglePanel() {
        isExpanded = !isExpanded;
        if (isExpanded) {
            container.classList.add('expanded');
        } else {
            container.classList.remove('expanded');
        }
    }
    header.addEventListener('click', togglePanel);

    // 状态变量
    let isCrawling = false;
    let isPaused = false;
    let stopRequested = false;
    let comments = [];
    let itemId = '';
    let title = '';
    let cursor = '0';
    let count = 0;
    let lastPauseTime = 0;

    // 添加日志
    function addLog(message, type = 'info') {
        const now = new Date();
        const timeStr = now.toTimeString().substring(0, 8);
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        if (type === 'error') logEntry.classList.add('log-error');
        if (type === 'warning') logEntry.classList.add('log-warning');
        logEntry.innerHTML = `<span class="log-time">[${timeStr}]</span> ${message}`;
        crawlerLog.appendChild(logEntry);
        crawlerLog.scrollTop = crawlerLog.scrollHeight;
    }

    // 简单睡眠
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 如果处于暂停，等待恢复
    async function waitIfPaused() {
        while (isPaused && !stopRequested) {
            await sleep(200);
        }
    }

    // 带暂停感知的等待
    async function pauseAwareSleep(ms) {
        const end = Date.now() + ms;
        while (Date.now() < end) {
            if (stopRequested) break;
            if (isPaused) await waitIfPaused();
            await sleep(200);
        }
    }

    // 从URL获取文章ID
    function getPageInfo() {
        const path = window.location.pathname;
        const match = path.match(/\/post\/(\w+)/);
        return match ? match[1] : '';
    }

    function getYYMMDD(date = new Date()) {
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return year + month + day;
    }

    // 从当前页面DOM提取文章标题（不附加 ID/日期后缀，便于 HTML 展示）
    function getPageTitle() {
        try {
            // 掘金文章标题通常在 h1 标签中
            const h1 = document.querySelector('h1');
            if (h1 && h1.textContent.trim()) {
                return h1.textContent.trim();
            }
        } catch (e) {
            addLog(`标题提取失败: ${e.message}`, 'warning');
        }
        return '掘金文章_' + itemId + '_' + getYYMMDD();
    }

    // 从页面提取发布日期（对应 Python 脚本中的 post_date）
    function getPageDate() {
        try {
            const meta = document.querySelector('meta[property="article:published_time"], meta[name="date"]');
            if (meta && meta.content) return meta.content.slice(0, 10);
            const ld = document.querySelector('script[type="application/ld+json"]');
            if (ld && ld.textContent) {
                const data = JSON.parse(ld.textContent);
                const obj = Array.isArray(data) ? data[0] : data;
                if (obj && obj.datePublished) return String(obj.datePublished).slice(0, 10);
            }
        } catch (e) {
            // 日期仅用于展示，解析失败时忽略
        }
        return '';
    }

    // 发送POST请求，返回 JSON
    function postJson(path, payload) {
        return new Promise((resolve, reject) => {
            fetch(`https://juejin.cn${path}`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
                    'Referer': window.location.href
                },
                body: JSON.stringify(payload)
            })
            .then(response => {
                if (response.ok) return response.json();
                throw new Error(`请求失败: ${response.status}`);
            })
            .then(data => resolve(data))
            .catch(error => reject(error));
        });
    }

    // 格式化时间（兼容秒/毫秒时间戳，避免 Invalid Date）
    function formatTime(ts) {
        if (!ts) return '';
        const date = new Date(ts * 1000);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    // 爬取结束后自动下载 CSV 和 HTML
    function autoDownloadIfAny() {
        if (comments.length === 0) {
            addLog('没有评论数据可下载', 'warning');
            return;
        }
        addLog(`正在自动下载 ${comments.length} 条评论...`);
        downloadCSV();
        downloadHTML();
    }

    // 恢复按钮初始状态
    function resetCrawlButtons() {
        isCrawling = false;
        isPaused = false;
        startBtn.disabled = false;
        startBtn.textContent = '开始爬取并下载';
        pauseBtn.disabled = true;
        pauseBtn.textContent = '暂停';
        pauseBtn.classList.remove('btn-continue');
        pauseBtn.classList.add('btn-pause');
    }

    // 爬取文章评论（迭代实现，支持暂停/继续）
    async function startCrawl(fetchReplies = true) {
        if (stopRequested) {
            stopRequested = false;
            crawlerStatus.textContent = '已停止';
            resetCrawlButtons();
            addLog('爬取已停止');
            autoDownloadIfAny();
            return;
        }

        let localCursor = cursor || '0';
        let continuePaging = true;

        while (continuePaging && !stopRequested) {
            await waitIfPaused();

            try {
                const resp = await postJson('/interact_api/v1/comment/list', {
                    item_id: itemId,
                    item_type: 2,
                    cursor: localCursor,
                    limit: 20
                });

                const items = resp.data || [];
                if (!items || items.length === 0) {
                    throw new Error('未获取到评论数据');
                }

                for (const c of items) {
                    if (stopRequested) break;
                    await waitIfPaused();

                    count++;
                    crawledCount.textContent = count;

                    const ci = c.comment_info || {};
                    const ui = c.user_info || {};

                    const comment = {
                        type: 'comment',
                        id: ci.comment_id || '',
                        parent_id: '',
                        author: ui.user_name || '',
                        content: ci.comment_content || '',
                        ctime: formatTime(ci.ctime),
                        likes: ci.digg_count || 0
                    };

                    comments.push(comment);

                    // 爬取二级评论（回复）
                    if (fetchReplies && ci.comment_id) {
                        await crawlReplies(itemId, ci.comment_id);
                    }

                    // 每100条休息5秒以上（可被暂停/停止打断）
                    if (count % 100 === 0 && count !== lastPauseTime && count % 1000 !== 0) {
                        const random_wait = Math.max(Math.floor(Math.random() * 10000), 5000);
                        lastPauseTime = count;
                        addLog(`已爬取 ${count} 条评论，暂停${random_wait}毫秒...`, 'warning');
                        crawlerStatus.textContent = '暂停中...';
                        await pauseAwareSleep(random_wait);
                        if (stopRequested) break;
                        crawlerStatus.textContent = '爬取中...';
                        addLog('暂停结束，继续爬取');
                    }
                    // 每1000条休息30秒（可被暂停/停止打断）
                    if (count !== lastPauseTime && count % 1000 === 0) {
                        lastPauseTime = count;
                        addLog(`已爬取 ${count} 条评论，暂停30秒...`, 'warning');
                        crawlerStatus.textContent = '暂停中...';
                        await pauseAwareSleep(30000);
                        if (stopRequested) break;
                        crawlerStatus.textContent = '爬取中...';
                        addLog('暂停结束，继续爬取');
                    }
                }

                localCursor = resp.cursor || '0';
                const hasMore = resp.has_more === true || resp.has_more === 'true';

                if (stopRequested) break;

                if (hasMore && items.length > 0) {
                    addLog(`爬取下一页，当前已爬取 ${count} 条`);
                    await pauseAwareSleep(500);
                } else {
                    continuePaging = false;
                }
            } catch (error) {
                crawlerStatus.textContent = '错误';
                resetCrawlButtons();
                addLog(`爬取出错: ${error.message}`, 'error');
                autoDownloadIfAny();
                return;
            }
        }

        if (stopRequested) {
            crawlerStatus.textContent = '已停止';
            resetCrawlButtons();
            addLog('爬取已停止');
            autoDownloadIfAny();
            return;
        }

        // 爬取完成，自动下载
        crawlerStatus.textContent = '完成';
        resetCrawlButtons();
        addLog(`评论爬取完成！总共爬取 ${count} 条！`);
        autoDownloadIfAny();
    }

    // 爬取二级评论（回复）
    async function crawlReplies(itemId, commentId) {
        const pageSize = 50;
        let rcursor = '0';

        while (true) {
            if (stopRequested) break;
            await waitIfPaused();

            try {
                const rresp = await postJson('/interact_api/v1/reply/list', {
                    comment_id: commentId,
                    cursor: rcursor,
                    limit: pageSize
                });

                const ritems = rresp.data || [];
                if (!ritems || ritems.length === 0) break;

                for (const r of ritems) {
                    if (stopRequested) break;
                    await waitIfPaused();

                    count++;
                    crawledCount.textContent = count;

                    const ri = r.reply_info || {};
                    const rui = r.user_info || {};

                    comments.push({
                        type: 'reply',
                        id: ri.reply_id || '',
                        parent_id: ri.reply_comment_id || '',
                        author: rui.user_name || '',
                        content: ri.reply_content || '',
                        ctime: formatTime(ri.ctime),
                        likes: ri.digg_count || 0
                    });
                }

                const hasMore = rresp.has_more === true || rresp.has_more === 'true';
                rcursor = rresp.cursor || '0';
                if (!hasMore || ritems.length === 0) break;

                await pauseAwareSleep(300);
            } catch (error) {
                addLog(`二级评论爬取出错: ${error.message}`, 'error');
                break;
            }
        }
    }

    function truncateString(str) {
        if (str.length > 60) {
            return str.substring(0, 40) + str.substring(str.length - 20);
        }
        return str;
    }

    // 下载文件名：标题 + 文章ID + 日期，避免标题过长
    function getFileBase() {
        const safe = (title || '掘金评论').replace(/[\/\\:*?"<>|]/g, '_');
        return truncateString(`${safe}_${itemId}_${getYYMMDD()}`);
    }

    // HTML 转义
    function htmlEscape(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 生成CSV并下载
    function downloadCSV() {
        if (comments.length === 0) {
            addLog('没有评论数据可下载', 'error');
            return;
        }

        addLog('开始生成CSV文件...');

        try {
            const headers = ['类型', '评论ID', '父级ID', '作者', '内容', '时间', '点赞数'];
            const BOM = '\uFEFF';
            let csvContent = BOM + headers.join(',') + '\n';

            const batchSize = 1000;
            for (let i = 0; i < comments.length; i += batchSize) {
                const batch = comments.slice(i, i + batchSize);
                batch.forEach((comment, index) => {
                    const row = [
                        comment.type || '',
                        comment.id || '',
                        comment.parent_id || '',
                        `"${(comment.author || '').replace(/"/g, '""')}"`,
                        `"${(comment.content || '').replace(/"/g, '""')}"`,
                        comment.ctime || '',
                        comment.likes || 0
                    ];
                    csvContent += row.join(',') + '\n';
                });
            }

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            a.download = `${getFileBase()}_评论.csv`;

            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                addLog(`CSV文件已开始下载: ${a.download}`);
            }, 100);
        } catch (error) {
            addLog(`生成CSV失败: ${error.message}`, 'error');
        }
    }

    // 生成HTML并下载（对应 Python 脚本中的 HTML 输出）
    function downloadHTML() {
        if (comments.length === 0) {
            addLog('没有评论数据可下载', 'error');
            return;
        }

        addLog('开始生成HTML文件...');

        try {
            const by_parent = {};
            for (const row of comments) {
                if (row.type === 'reply') {
                    if (!by_parent[row.parent_id]) by_parent[row.parent_id] = [];
                    by_parent[row.parent_id].push(row);
                }
            }

            // ctime 已经是格式化后的字符串（见 formatTime），直接输出即可；
            // 之前把字符串当时间戳再次格式化，导致 HTML 里的时间全部为空。
            const postDate = getPageDate();

            const parts = [];
            parts.push(`<!DOCTYPE html><html><head><meta charset='utf-8'><title>${htmlEscape(title || 'Comments')}</title>`);
            parts.push("<style>");
            parts.push("body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:900px;margin:0 auto;padding:24px;background:#f6f8fa;color:#24292f}");
            parts.push("h1{font-size:22px;margin-bottom:4px}");
            parts.push(".meta{color:#57606a;font-size:13px;margin-bottom:24px}");
            parts.push(".comment{background:#fff;border:1px solid #d0d7de;border-radius:8px;padding:14px 16px;margin:12px 0;box-shadow:0 1px 2px rgba(0,0,0,.04)}");
            parts.push(".author{font-weight:600;color:#0969da}");
            parts.push(".time{color:#57606a;font-size:12px;margin-left:8px}");
            parts.push(".likes{color:#57606a;font-size:12px;margin-left:8px}");
            parts.push(".content{margin:8px 0;white-space:pre-wrap;line-height:1.6}");
            parts.push("blockquote{background:#f6f8fa;border-left:3px solid #d0d7de;margin:8px 0;padding:8px 12px;border-radius:4px}");
            parts.push("blockquote .author{color:#8250df}");
            parts.push("</style></head><body>");
            parts.push(`<h1>${htmlEscape(title)}</h1>`);
            parts.push(`<div class='meta'>Post date: ${htmlEscape(postDate)} &middot; <a href='https://juejin.cn/post/${itemId}'>Original post</a> &middot; Total comments+replies: ${comments.length}</div>`);

            for (const row of comments) {
                if (row.type === 'comment') {
                    parts.push("<div class='comment'>");
                    parts.push(`<span class='author'>${htmlEscape(row.author)}</span><span class='time'>${htmlEscape(row.ctime)}</span><span class='likes'>&#128077; ${row.likes}</span>`);
                    parts.push(`<div class='content'>${htmlEscape(row.content)}</div>`);
                    for (const r of by_parent[row.id] || []) {
                        parts.push(`<blockquote><span class='author'>${htmlEscape(r.author)}</span><span class='time'>${htmlEscape(r.ctime)}</span><span class='likes'>&#128077; ${r.likes}</span><div class='content'>${htmlEscape(r.content)}</div></blockquote>`);
                    }
                    parts.push("</div>");
                }
            }
            parts.push("</body></html>");

            const htmlContent = parts.join("\n");
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${getFileBase()}_评论.html`;

            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                addLog(`HTML文件已开始下载: ${a.download}`);
            }, 100);
        } catch (error) {
            addLog(`生成HTML失败: ${error.message}`, 'error');
        }
    }

    // 开始爬取按钮事件
    startBtn.addEventListener('click', async () => {
        if (isCrawling) return;

        isCrawling = true;
        stopRequested = false;
        isPaused = false;
        startBtn.disabled = true;
        startBtn.textContent = '爬取中...';
        pauseBtn.disabled = false;
        crawlerStatus.textContent = '爬取中...';
        crawledCount.textContent = '0';
        comments = [];
        count = 0;
        lastPauseTime = 0;
        cursor = '0';

        // 确保暂停按钮初始样式
        pauseBtn.classList.remove('btn-continue');
        pauseBtn.classList.add('btn-pause');
        pauseBtn.textContent = '暂停';

        // 清空日志
        crawlerLog.innerHTML = '';
        addLog('当前版本2.2');
        addLog('开始爬取评论...');

        try {
            const pageId = getPageInfo();
            if (!pageId) throw new Error('无法获取文章ID');
            itemId = pageId;
            // 从当前页面DOM提取标题，避免重复请求页面导致页面受影响
            title = getPageTitle();
            addLog(`文章标题: ${title}`);
            addLog(`文章ID: ${itemId}`);
            await startCrawl(true);
        } catch (error) {
            crawlerStatus.textContent = '错误';
            resetCrawlButtons();
            addLog(`初始化失败: ${error.message}`, 'error');
            autoDownloadIfAny();
        }
    });

    // 暂停/继续按钮事件
    pauseBtn.addEventListener('click', () => {
        if (!isCrawling) return;
        if (!isPaused) {
            isPaused = true;
            pauseBtn.textContent = '继续';
            pauseBtn.classList.remove('btn-pause');
            pauseBtn.classList.add('btn-continue');
            crawlerStatus.textContent = '已暂停';
            addLog('爬取已暂停');
        } else {
            isPaused = false;
            pauseBtn.textContent = '暂停';
            pauseBtn.classList.remove('btn-continue');
            pauseBtn.classList.add('btn-pause');
            crawlerStatus.textContent = '爬取中...';
            addLog('继续爬取...');
        }
    });
}

try {
    initCrawler();
} catch (e) {
    // 防止内容脚本异常影响原页面正常运行
    console.error('[掘金评论爬取工具] 初始化失败:', e);
}
