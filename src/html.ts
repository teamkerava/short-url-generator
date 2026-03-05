export const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Short URL Generator</title>
    <style>
        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        form { display: flex; gap: 0.5rem; }
        input { padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; width: 300px; }
        button { padding: 0.5rem 1rem; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        #result { margin-top: 1rem; font-size: 1.2rem; }
        .error { color: red; }
    </style>
</head>
<body>
    <h1>Short URL Generator</h1>
    <form id="shortenForm">
        <input type="text" id="urlInput" placeholder="Enter URL to shorten (e.g. example.com)" required>
        <button type="submit">Shorten</button>
    </form>
    <div id="result"></div>
    <script>
        document.getElementById('urlInput').onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('shortenForm').dispatchEvent(new Event('submit'));
            }
        };
        document.getElementById('shortenForm').onsubmit = async (e) => {
            e.preventDefault();
            const url = document.getElementById('urlInput').value;
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = 'Shortening...';
            
            try {
                const response = await fetch('/api/shorten', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    resultDiv.innerHTML = \`<a href="\${data.shortUrl}" target="_blank">\${data.shortUrl}</a>\`;
                } else {
                    resultDiv.innerHTML = \`<span class="error">Error: \${data.error || 'Unknown error'}</span>\`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`<span class="error">Error: \${error.message}</span>\`;
            }
        };
    </script>
</body>
</html>
`;
