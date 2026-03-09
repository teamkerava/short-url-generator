export const apiDocs = `
<!DOCTYPE html>
<html>
<head>
    <title>API Documentation</title>
    <style>
        body { font-family: sans-serif; margin: 2rem; }
        h1 { color: #333; }
        h2 { color: #555; margin-top: 2rem; }
        p { line-height: 1.6; }
        pre { background: #f4f4f4; padding: 1rem; border-radius: 4px; overflow-x: auto; }
        code { background: #f4f4f4; padding: 0.2rem 0.4rem; border-radius: 4px; font-family: 'Courier New', monospace; }
        pre code { background: none; padding: 0; }
    </style>
</head>
<body>
    <h1>API Documentation - Short URL Generator</h1>
    <p><a href="/" style="color: #007bff; text-decoration: none">Go back</a></p>
    <h2>POST /api/shorten</h2>
    <p>Shorten a URL with optional expiration duration.</p>
    <p><strong>Request:</strong></p>
    <pre><code>{
  "url": "https://example.com",
  "duration": "24h" // Optional, can be in format like '15m', '1h', '1d', '1w'. Defaults to '24h'.
}</code></pre>
    <p><strong>Response:</strong></p>
    <pre><code>{
  "code": "abc123",
  "shortUrl": "https://yourdomain.com/abc123"
}</code></pre>
    <h2>GET /api/docs</h2>
    <p>Get this API documentation.</p>
    <h2>GET /:code</h2>
    <p>Redirect to the original URL.</p>
</body>
</html>
`;