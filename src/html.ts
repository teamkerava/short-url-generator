export const html = `<!DOCTYPE html>
<html>
<head>
    <title>Short URL Generator</title>
    <style>
        body {
            font-family: sans-serif;
            margin: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff;
            color: #333;
            line-height: 1.6;
            padding: 1rem;
        }
        .container {
            width: 100%;
            max-width: 640px;
        }
        h1 {
            color: #333;
            margin: 0 0 1rem;
            text-align: center;
        }
        .lead {
            margin: 0 0 1.25rem;
            text-align: center;
            color: #555;
        }
        .panel {
            background: #f4f4f4;
            border-radius: 4px;
            padding: 1rem;
            margin-bottom: 1rem;
            border: 1px solid #e5e5e5;
        }
        form {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        label {
            font-size: 0.9rem;
            color: #555;
            margin-top: 0.15rem;
        }
        .expiration-custom {
            display: none;
        }
        input, select, button {
            padding: 0.75rem;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            font-size: 1rem;
            background: #fff;
        }
        input:focus, select:focus {
            outline: none;
            border-color: #007bff;
        }
        #urlInput, #durationInput {
            font-family: 'Courier New', monospace;
        }
        button {
            background: #007bff;
            color: white;
            cursor: pointer;
            font-weight: 500;
            border-color: #007bff;
        }
        button:hover {
            background: #0069d9;
            border-color: #0069d9;
        }
        #result {
            font-size: 1rem;
            display: none;
        }
        #result.is-visible {
            display: block;
            margin-top: 1rem;
        }
        .result-success {
            color: #2d7a46;
            font-weight: 500;
        }
        .result-label {
            margin-bottom: 0.45rem;
            font-size: 0.9rem;
            color: #555;
            font-weight: 400;
        }
        .short-url-box {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.5rem;
            background: #fff;
            border: 1px solid #d9d9d9;
            border-radius: 4px;
            padding: 0.5rem;
        }
        .short-url-link {
            color: #007bff;
            text-decoration: none;
            font-family: 'Courier New', monospace;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
        }
        #result a {
            color: #007bff;
            word-break: break-all;
        }
        .copy-btn {
            padding: 0.4rem 0.6rem;
            font-size: 0.85rem;
            line-height: 1.2;
            width: auto;
            flex-shrink: 0;
        }
        .error {
            color: #c43d3d;
        }
        footer {
            margin-top: 1rem;
            font-size: 0.9rem;
            color: #555;
            text-align: center;
        }
        footer a {
            color: #007bff;
            text-decoration: none;
        }
        footer a:hover {
            text-decoration: underline;
        }
        @media (max-width: 640px) {
            .container {
                max-width: 100%;
            }
            .panel {
                padding: 0.85rem;
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
    </style>
</head>
<body>
    <div class="container">
        <h1>Short URL Generator</h1>
        <div class="panel">
            <form id="shortenForm">
                <input type="text" id="urlInput" placeholder="Enter URL to shorten (e.g. https://example.com)" required>
                <label for="expirationSelect">Expiration</label>
                <select id="expirationSelect">
                    <option value="24h" selected>24 hours (default)</option>
                    <option value="15m">15 minutes</option>
                    <option value="1h">1 hour</option>
                    <option value="1d">1 day</option>
                    <option value="1w">1 week</option>
                    <option value="custom">Custom...</option>
                </select>
                <input type="text" id="durationInput" class="expiration-custom" placeholder="Custom expiration (e.g. 45m, 36h, 10d)" title="Use format like '15m' for 15 minutes, '1h' for 1 hour, '1d' for 1 day, '1w' for 1 week.">
                <button type="submit">Shorten URL</button>
            </form>
            <div id="result"></div>
        </div>
        <footer>
            <a href="/api/docs">View API Documentation</a>
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
                    resultDiv.innerHTML = '<div class="success result-success"><div class="result-label">Your short URL</div><div class="short-url-box"><a href="' + data.shortUrl + '" target="_blank" class="short-url-link">' + data.shortUrl + '</a><button type="button" class="copy-btn" id="copyBtn">Copy</button></div></div>';
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
                    resultDiv.classList.remove('is-visible');
                    resultDiv.innerHTML = '';
                }
            } catch (error) {
                resultDiv.classList.remove('is-visible');
                resultDiv.innerHTML = '';
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