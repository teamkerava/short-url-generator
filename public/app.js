var tabUrl = document.getElementById('tab-url');
var tabImage = document.getElementById('tab-image');
var panelUrl = document.getElementById('panel-url');
var panelImage = document.getElementById('panel-image');
var resultDiv = document.getElementById('result');

var TAB_KEY = 'shorten.defaultTab';

function loadTab() {
    try {
        var m = document.cookie.match(/(?:^|; )shorten\.defaultTab=([^;]*)/);
        return m ? decodeURIComponent(m[1]) : null;
    } catch (err) { return null; }
}
function saveTab(which) {
    try { document.cookie = TAB_KEY + '=' + encodeURIComponent(which) + '; max-age=31536000; path=/; SameSite=Lax'; } catch (err) {}
}

function switchTab(which, save) {
    var isUrl = which === 'url';
    tabUrl.classList.toggle('active', isUrl);
    tabImage.classList.toggle('active', !isUrl);
    panelUrl.classList.toggle('active', isUrl);
    panelImage.classList.toggle('active', !isUrl);
    resultDiv.classList.remove('show');
    resultDiv.innerHTML = '';
    if (save !== false) saveTab(which);
    if (isUrl) document.getElementById('urlInput').focus();
    else {
        // Auto-focus the dropzone so clipboard paste (ctrl/cmd+v) works immediately.
        try { document.getElementById('dropzone').focus({ preventScroll: true }); } catch (err) {}
    }
}
tabUrl.onclick = function () { switchTab('url'); };
tabImage.onclick = function () { switchTab('image'); };

var shortenForm = document.getElementById('shortenForm');
var uploadForm = document.getElementById('uploadForm');
var urlInput = document.getElementById('urlInput');
var expiryGrid = document.getElementById('expiryGrid');
var customRow = document.getElementById('customRow');
var durationInput = document.getElementById('durationInput');
var oneTimeCheck = document.getElementById('oneTimeCheck');
var shortenBtn = document.getElementById('shortenBtn');
var uploadBtn = document.getElementById('uploadBtn');
var selectedDuration = '24h';

expiryGrid.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var btns = expiryGrid.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('on');
    b.classList.add('on');
    selectedDuration = b.getAttribute('data-value');
    if (selectedDuration === 'custom') {
        customRow.classList.add('show');
        durationInput.focus();
    } else {
        customRow.classList.remove('show');
        durationInput.value = '';
    }
});

function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
}
function fail(msg) {
    resultDiv.classList.add('show');
    resultDiv.innerHTML = '<div class="err">error: ' + esc(msg) + '</div>';
}
function ok(label, shortUrl, metaHtml, thumb) {
    resultDiv.classList.add('show');
    resultDiv.innerHTML =
        '<div class="out"><div class="k">' + esc(label) + '</div>' +
        '<a class="link" href="' + esc(shortUrl) + '" target="_blank" rel="noopener">' + esc(shortUrl) + '</a>' +
        '<div class="ops"><button type="button" id="copyBtn">copy</button><a href="' + esc(shortUrl) + '" target="_blank" rel="noopener">open</a></div>' +
        (metaHtml ? '<div class="meta">' + metaHtml + '</div>' : '') +
        (thumb ? '<img src="' + esc(thumb) + '" alt="uploaded image">' : '') +
        '</div>';
    var cb = document.getElementById('copyBtn');
    cb.onclick = function () {
        var done = function (good) {
            cb.textContent = good ? 'copied' : 'copy failed';
            setTimeout(function () { if (document.body.contains(cb)) cb.textContent = 'copy'; }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(shortUrl).then(function () { done(true); }, function () { done(false); });
        } else {
            // Fallback for contexts without the async Clipboard API
            // (e.g. non-secure origins): select the link text so the user
            // can copy it manually with Ctrl/Cmd+C.
            try {
                var link = resultDiv.querySelector('.out a.link');
                var sel = window.getSelection();
                sel.removeAllRanges();
                var range = document.createRange();
                range.selectNodeContents(link);
                sel.addRange(range);
                cb.textContent = 'selected — press ctrl+c';
                setTimeout(function () { if (document.body.contains(cb)) cb.textContent = 'copy'; }, 3000);
            } catch (err) {
                done(false);
            }
        }
    };
}

shortenForm.onsubmit = async function (e) {
    e.preventDefault();
    var url = urlInput.value.trim();
    if (!url) { fail('paste a url first.'); urlInput.focus(); return; }
    var duration = selectedDuration === 'custom' ? (durationInput.value.trim() || '24h') : selectedDuration;
    resultDiv.classList.remove('show');
    resultDiv.innerHTML = '';
    shortenBtn.disabled = true;
    shortenBtn.textContent = 'shortening…';
    try {
        var res = await fetch('/api/shorten', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url, duration: duration, oneTime: !!oneTimeCheck.checked })
        });
        var data = await res.json();
        if (res.ok) {
            var m = '';
            if (data.expiresAt) {
                try { m += 'expires ' + esc(new Date(data.expiresAt).toLocaleString()) + '<br>'; } catch (err) {}
            }
            if (data.oneTime) m += 'one-time link — burns after first view<br>';
            ok('your short url:', data.shortUrl, m, null);
        } else {
            fail(data.error || 'something went wrong');
        }
    } catch (err) {
        fail(err.message || 'failed to connect');
    }
    shortenBtn.disabled = false;
    shortenBtn.textContent = 'shorten →';
};

var dropzone = document.getElementById('dropzone');
var fileInput = document.getElementById('imageName');
var filePreview = document.getElementById('filePreview');
var fileNameEl = document.getElementById('fileName');
var fileRemove = document.getElementById('fileRemove');
var imageExpiryGrid = document.getElementById('imageExpiryGrid');
var imageCustomRow = document.getElementById('imageCustomRow');
var imageDurationInput = document.getElementById('imageDurationInput');
var imageOneTimeCheck = document.getElementById('imageOneTimeCheck');
var imageDuration = '24h';

imageExpiryGrid.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var btns = imageExpiryGrid.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('on');
    b.classList.add('on');
    imageDuration = b.getAttribute('data-value');
    if (imageDuration === 'custom') {
        imageCustomRow.classList.add('show');
        imageDurationInput.focus();
    } else {
        imageCustomRow.classList.remove('show');
        imageDurationInput.value = '';
    }
});

function setFile(f) {
    if (!f) return;
    var dt = new DataTransfer();
    dt.items.add(f);
    fileInput.files = dt.files;
    var kb = f.size > 1024 ? ' · ' + (f.size / 1024).toFixed(1) + 'kb' : ' · ' + f.size + 'b';
    fileNameEl.textContent = (f.name || 'image') + kb;
    filePreview.classList.add('show');
}
dropzone.onclick = function () { fileInput.click(); };
dropzone.onkeydown = function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
};
fileInput.onchange = function () { if (fileInput.files[0]) setFile(fileInput.files[0]); };
['dragenter', 'dragover'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.add('over'); });
});
['dragleave', 'drop'].forEach(function (ev) {
    dropzone.addEventListener(ev, function (e) { e.preventDefault(); dropzone.classList.remove('over'); });
});
dropzone.addEventListener('drop', function (e) {
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) setFile(f);
});
// Clipboard upload: pasting an image anywhere picks it up into the image form
// and switches to the image tab (auto-focusing the dropzone). Text pastes are
// ignored so normal url pasting keeps working.
document.addEventListener('paste', function (e) {
    var cd = e.clipboardData;
    if (!cd) return;
    var f = null;
    if (cd.files && cd.files.length) {
        for (var i = 0; i < cd.files.length; i++) {
            if (cd.files[i] && cd.files[i].type && cd.files[i].type.indexOf('image/') === 0) { f = cd.files[i]; break; }
        }
    }
    if (!f && cd.items && cd.items.length) {
        for (var j = 0; j < cd.items.length; j++) {
            var it = cd.items[j];
            if (it.kind === 'file' && it.type && it.type.indexOf('image/') === 0) {
                var got = it.getAsFile();
                if (got) { f = got; break; }
            }
        }
    }
    if (!f) return;
    // Clipboard files may have an empty/generic name — give them one for the preview line.
    if (!f.name) {
        try { f = new File([f], 'pasted-image.png', { type: f.type || 'image/png' }); } catch (err) {}
    }
    e.preventDefault();
    switchTab('image');
    setFile(f);
    try { dropzone.focus({ preventScroll: true }); } catch (err) {}
});
fileRemove.onclick = function (e) {
    e.stopPropagation();
    fileInput.value = '';
    filePreview.classList.remove('show');
};

uploadForm.onsubmit = async function (e) {
    e.preventDefault();
    var f = fileInput.files && fileInput.files[0];
    resultDiv.classList.remove('show');
    resultDiv.innerHTML = '';
    if (!f) { fail('choose an image first.'); return; }
    var fd = new FormData();
    fd.append('image', f);
    fd.append('duration', imageDuration === 'custom' ? (imageDurationInput.value.trim() || '24h') : imageDuration);
    if (imageOneTimeCheck.checked) fd.append('oneTime', 'true');
    uploadBtn.disabled = true;
    uploadBtn.textContent = 'uploading…';
    try {
        var res = await fetch('/api/upload', { method: 'POST', body: fd });
        var data = await res.json();
        if (res.ok) {
            var im = esc(f.name || '') + (data.originalMimeType ? ' · ' + esc(data.originalMimeType) : '');
            if (data.expiresAt) {
                try { im += '<br>expires ' + esc(new Date(data.expiresAt).toLocaleString()); } catch (err) {}
            }
            if (data.oneTime) im += '<br>one-time link — burns after first view';
            // One-time links burn on first GET, so never preview via the
            // server URL — the browser fetch would consume the link.
            // Preview the local file instead; it never touches the server.
            var thumb = data.shortUrl;
            if (data.oneTime) {
                try { thumb = URL.createObjectURL(f); } catch (err) { thumb = null; }
            }
            ok('your image link:', data.shortUrl, im, thumb);
        } else {
            fail(data.error || 'something went wrong');
        }
    } catch (err) {
        fail(err.message || 'failed to connect');
    }
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'upload →';
};

window.onload = function () {
    // Restore the last-used tab so image-first users land on image → link.
    // Cookie persists ~1 year across restarts until site data is cleared.
    if (loadTab() === 'image') switchTab('image', false);
    else urlInput.focus();
};
