export const html = `<!DOCTYPE html>
<html>
<head>
    <title>Shorten</title>
    <style>
        * {
            box-sizing: border-box;
        }
        :root {
            --accent: #38bdf8;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
            color: #1a1a1a;
            line-height: 1.6;
            padding: 1rem;
        }
        h1 {
            font-size: 2.5rem;
            font-weight: 700;
            letter-spacing: -0.03em;
            margin: 0 0 0.5rem;
            text-align: center;
        }
        .lead {
            font-size: 1.1rem;
            margin: 0 0 2rem;
            text-align: center;
            color: #666;
        }
        .panel {
            background: #fff;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            border: 1px solid #e5e5e5;
        }
        label {
            font-size: 0.85rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        input, select {
            padding: 0.875rem 1rem;
            border: 1px solid #d9d9d9;
            border-radius: 6px;
            font-size: 1rem;
            background: #fff;
            color: #1a1a1a;
            width: 100%;
        }
        input:focus, select:focus {
            outline: none;
            border-color: var(--accent);
        }
        input::placeholder {
            color: #999;
        }
        select {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 1rem center;
        }
        select option {
            background: #fff;
            color: #1a1a1a;
        }
        button {
            padding: 0.875rem 1.5rem;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            background: var(--accent);
            color: #fff;
            transition: transform 0.1s ease, opacity 0.1s ease;
        }
        .result-label {
            font-size: 0.85rem;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 0.5rem;
        }
        .short-url-box {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: #f5f5f5;
            border: 1px solid #e5e5e5;
            border-radius: 6px;
            padding: 0.5rem;
        }
        .short-url-link {
            color: var(--accent);
            text-decoration: none;
            font-family: 'SF Mono', Monaco, 'Courier New', monospace;
            font-size: 0.9rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
        }
        .copy-btn {
            padding: 0.5rem 0.875rem;
            font-size: 0.85rem;
            background: var(--accent);
            color: #fff;
            flex-shrink: 0;
        }
        @media (max-width: 640px) {
            h1 {
                font-size: 2rem;
            }
            .container {
                max-width: 100%;
            }
            .panel {
                padding: 1.25rem;
            }
            .short-url-box {
                flex-direction: column;
                align-items: stretch;
            }
            .short-url-link {
                white-space: normal;
                overflow-wrap: anywhere;
            }
        }
        .container {
            width: 100%;
            max-width: 540px;
        }
        form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        .expiration-custom {
            display: none;
        }
        #result {
            display: none;
            margin-top: 1rem;
        }
        #result.is-visible {
            display: block;
        }
        .error {
            color: #ff6b6b;
            font-size: 0.9rem;
            margin-top: 0.5rem;
        }
        footer {
            margin-top: 1.5rem;
            font-size: 0.85rem;
            color: #666;
            text-align: center;
        }
        footer a:hover {
            color: var(--accent);
        }
        button:hover {
            opacity: 0.85;
        }
        button:active {
            transform: scale(0.98);
        }
        .short-url-link:hover {
            text-decoration: underline;
        }
        .copy-btn:hover {
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Shorten</h1>
        <div class="panel">
            <form id="shortenForm">
                <div>
                    <input type="text" id="urlInput" placeholder="Paste your URL here" required>
                </div>
                <div>
                    <label for="expirationSelect">Expiration</label>
                    <select id="expirationSelect">
                        <option value="24h" selected>24 hours (default)</option>
                        <option value="15m">15 minutes</option>
                        <option value="1h">1 hour</option>
                        <option value="1w">1 week</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <input type="text" id="durationInput" class="expiration-custom" placeholder="e.g. 45m, 36h, 10d">
                <button type="submit">Shorten URL</button>
            </form>
            <div id="result"></div>
        </div>
        <footer>
            <a href="/api/docs">API Docs</a> - <a href="https://github.com/teamkerava/short-url-generator" target="_blank">Source</a>
        </footer>
    </div>
    <script>
        document.getElementById('shortenForm').onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('shortenForm').dispatchEvent(new Event('submit'));
            }
        };
        document.getElementById('shortenForm').onsubmit = async (e) => {
            e.preventDefault();
            const url = document.getElementById('urlInput').value;
            const expirationSelect = document.getElementById('expirationSelect');
            const durationInput = document.getElementById('durationInput');
            const duration = expirationSelect.value === 'custom'
                ? durationInput.value.trim()
                : expirationSelect.value;
            const resultDiv = document.getElementById('result');
            resultDiv.classList.remove('is-visible');
            resultDiv.innerHTML = '';

            try {
                const response = await fetch('/api/shorten', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url, duration })
                });

                const data = await response.json();

                if (response.ok) {
                    resultDiv.classList.add('is-visible');
                    resultDiv.innerHTML = '<div class="result-label">Your short URL</div><div class="short-url-box"><a href="' + data.shortUrl + '" target="_blank" class="short-url-link">' + data.shortUrl + '</a><button type="button" class="copy-btn" id="copyBtn">Copy</button></div>';
                    const copyBtn = document.getElementById('copyBtn');
                    copyBtn.onclick = async function() {
                        try {
                            await navigator.clipboard.writeText(data.shortUrl);
                            copyBtn.textContent = 'Copied';
                            setTimeout(function () {
                                if (document.body.contains(copyBtn)) {
                                    copyBtn.textContent = 'Copy';
                                }
                            }, 1000);
                        } catch (copyError) {
                            copyBtn.textContent = 'Copy failed';
                        }
                    };
                } else {
                    resultDiv.classList.add('is-visible');
                    resultDiv.innerHTML = '<div class="error">' + (data.error || 'Something went wrong') + '</div>';
                }
            } catch (error) {
                resultDiv.classList.add('is-visible');
                resultDiv.innerHTML = '<div class="error">Failed to connect</div>';
            }
        };
        window.onload = function () {
            const urlInput = document.getElementById('urlInput');
            const expirationSelect = document.getElementById('expirationSelect');
            const durationInput = document.getElementById('durationInput');

            if (urlInput) {
                urlInput.focus();
            }

            expirationSelect.onchange = function() {
                if (expirationSelect.value === 'custom') {
                    durationInput.style.display = 'block';
                    durationInput.focus();
                } else {
                    durationInput.style.display = 'none';
                    durationInput.value = '';
                }
            };
        };
    </script>
</body>
</html>`;