import { createWatermarkEngine } from './lib/gemini-wm/sdk/browser.js';
import {
  BackgroundRemovalTimeoutError,
  processImagePipeline,
  removeBackgroundWithTimeout,
} from './pipeline.js';

const $ = (id) => document.getElementById(id);
const drop = $('drop'), fileInput = $('file'), bar = $('bar'), barWrap = $('barWrap');
const statusEl = $('status'), grid = $('grid'), beforeImg = $('before'), afterImg = $('after');
const download = $('download');
const progressSection = $('progressSection');

const MAX = 20 * 1024 * 1024;
let currentBlob = null;
let isProcessing = false;

// i18n Strings
const i18n = {
  en: {
    subtitle: "Upload 1 photo → remove background + Gemini/NotebookLM watermark. In-browser, free.",
    upload_main: "Click or drop image (PNG/JPG/WebP)",
    upload_sub: "Max ~20MB. Processed locally, files are not uploaded.",
    before_cap: "Before",
    after_cap: "After",
    download: "Download PNG",
    preloading: "Preloading model...",
    removing_bg: "Removing background...",
    removing_wm: "Stripping watermark...",
    done: "Done ✅",
    warn_wm_failed: "Background removed, but watermark removal failed. The background-only result is available.",
    err_already: "An image has already been uploaded or is processing. Please refresh to upload a new one.",
    err_type: "Unsupported format. PNG/JPG/WebP only.",
    err_size: "File too large (max 20MB).",
    err_fail: "Failed: ",
    err_bg_timeout: "The background model could not be loaded in time. Check your connection and try again.",
    loading_model: "Loading background removal model...",
    lnk_github: "GitHub",
    lnk_donate: "Donate",
    lnk_notices: "Third-Party Notices",
    opt_bg: "Remove Background",
    opt_gemini: "Remove Gemini Watermark",
    opt_notebook: "Remove NotebookLM Watermark",
    meta_license: "AGPL-3.0 License",
    meta_version: "Version 1.0.0"
  },
  id: {
    subtitle: "Upload 1 foto → hapus background + watermark Gemini/NotebookLM. Semua di browser, gratis.",
    upload_main: "Klik atau drop gambar (PNG/JPG/WebP)",
    upload_sub: "Max ~20MB. Diproses lokal, file tidak diupload.",
    before_cap: "Sebelum",
    after_cap: "Sesudah",
    download: "Download PNG",
    preloading: "Preloading model...",
    removing_bg: "Menghapus background...",
    removing_wm: "Menghapus watermark...",
    done: "Selesai ✅",
    warn_wm_failed: "Background berhasil dihapus, tetapi watermark gagal diproses. Hasil tanpa background tetap tersedia.",
    err_already: "Gambar sudah diupload atau sedang diproses. Silakan refresh untuk upload gambar baru.",
    err_type: "Format tidak didukung. PNG/JPG/WebP saja.",
    err_size: "File terlalu besar (max 20MB).",
    err_fail: "Gagal: ",
    err_bg_timeout: "Model background tidak berhasil dimuat tepat waktu. Periksa koneksi lalu coba lagi.",
    loading_model: "Memuat model background removal...",
    lnk_github: "GitHub",
    lnk_donate: "Donasi",
    lnk_notices: "Lisensi Pihak Ketiga",
    opt_bg: "Hapus Background",
    opt_gemini: "Hapus Watermark Gemini",
    opt_notebook: "Hapus Watermark NotebookLM",
    meta_license: "Lisensi AGPL-3.0",
    meta_version: "Versi 1.0.0"
  },
  zh: {
    subtitle: "上传1张照片 → 自动去除背景 + 移除双重水印 (Gemini/NotebookLM)。纯本地浏览器处理，完全免费。",
    upload_main: "点击或拖拽图片至此 (PNG/JPG/WebP)",
    upload_sub: "文件最大 20MB。本地处理，不会上传到服务器。",
    before_cap: "处理前",
    after_cap: "处理后",
    download: "下载 PNG",
    preloading: "正在预载模型...",
    removing_bg: "正在去除背景...",
    removing_wm: "正在移除水印...",
    done: "处理完成 ✅",
    warn_wm_failed: "背景已移除，但水印处理失败。仍可下载仅移除背景的结果。",
    err_already: "已上传或正在处理图片。请刷新页面以上传新图片。",
    err_type: "不支持的文件格式。仅支持 PNG/JPG/WebP。",
    err_size: "文件太大 (最大 20MB)。",
    err_fail: "处理失败: ",
    err_bg_timeout: "背景模型未能及时加载。请检查网络连接后重试。",
    loading_model: "正在加载背景消除模型...",
    lnk_github: "GitHub",
    lnk_donate: "Donate",
    lnk_notices: "第三方声明",
    opt_bg: "去除背景",
    opt_gemini: "移除 Gemini 水印",
    opt_notebook: "移除 NotebookLM 水印",
    meta_license: "AGPL-3.0 许可证",
    meta_version: "版本 1.0.0"
  },
  ja: {
    subtitle: "写真を1枚アップロード → 背景消去 + 二重透かし (Gemini/NotebookLM) を一括クリア。すべてブラウザ内で完結、完全無料。",
    upload_main: "クリックまたはドラッグ＆ドロップ (PNG/JPG/WebP)",
    upload_sub: "最大 20MB。ローカルで処理されるため、ファイルはアップロードされません。",
    before_cap: "処理前",
    after_cap: "処理後",
    download: "PNGをダウンロード",
    preloading: "モデルを事前ロード中...",
    removing_bg: "背景を消去中...",
    removing_wm: "透かしを除去中...",
    done: "完了 ✅",
    warn_wm_failed: "背景は削除されましたが、透かし処理に失敗しました。背景削除のみの結果をダウンロードできます。",
    err_already: "すでに画像がアップロードされているか、処理中です。新しい画像をアップロードするにはページを更新してください。",
    err_type: "サポートされていない形式です。PNG/JPG/WebPのみ対応。",
    err_size: "ファイルサイズが大きすぎます (最大20MB)。",
    err_fail: "エラー: ",
    err_bg_timeout: "背景モデルを時間内に読み込めませんでした。接続を確認して再試行してください。",
    loading_model: "背景消去モデルを読み込み中...",
    lnk_github: "GitHub",
    lnk_donate: "Donate",
    lnk_notices: "サードパーティ通知",
    opt_bg: "背景を消去",
    opt_gemini: "Geminiの透かしを除去",
    opt_notebook: "NotebookLMの透かしを除去",
    meta_license: "AGPL-3.0ライセンス",
    meta_version: "バージョン 1.0.0"
  }
};

let currentLang = localStorage.getItem('lang') || 'en';

function setLanguage(lang) {
  if (!i18n[lang]) lang = 'en';
  currentLang = lang;
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;

  // Apply strings
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang][key]) {
      el.textContent = i18n[lang][key];
    }
  });

  // Update switcher UI
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });
}

function t(key) {
  return i18n[currentLang][key] || i18n['en'][key] || key;
}

function setStatus(msg, isErr = false, isWarning = false) {
  statusEl.textContent = msg;
  statusEl.className = 'status' + (isErr ? ' err' : isWarning ? ' warn' : '');
  progressSection.classList.toggle('active', !!msg);
}

function setProgress(pct) {
  progressSection.classList.add('active');
  bar.style.width = pct + '%';
}

function blobToImage(blob) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('decode failed')); };
    img.src = url;
  });
}

async function canvasToBlob(canvas) {
  if (typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type: 'image/png' });
  }
  return new Promise((res, rej) => {
    canvas.toBlob((b) => b ? res(b) : rej(new Error('encode failed')), 'image/png');
  });
}

async function handleFile(file) {
  if (!file) return;
  // ponytail: single-image app, block overwrite + concurrent runs, alert in current lang
  if (isProcessing || currentBlob) { alert(t('err_already')); return; }
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { setStatus(t('err_type'), true); return; }
  if (file.size > MAX) { setStatus(t('err_size'), true); return; }

  const doBg = $('optBg').checked;
  const doGemini = $('optGemini').checked;
  const doNotebook = $('optNotebook').checked;
  if (!doBg && !doGemini && !doNotebook) {
    setStatus('Select at least one option', true);
    return;
  }

  isProcessing = true;
  const baseName = file.name.replace(/\.[^.]+$/, '');
  const outName = 'rm-bg-' + baseName + '.png';

  grid.style.display = 'none';
  download.style.display = 'none';
  barWrap.style.display = 'block';
  setProgress(5);

  try {
    beforeImg.src = URL.createObjectURL(file);
    const result = await processImagePipeline({
      input: file,
      removeBackgroundRequested: doBg,
      watermarkRequested: doGemini || doNotebook,
      onStage: (stage) => {
        if (stage === 'background') {
          setStatus(t('loading_model'));
        } else {
          setStatus(t('removing_wm'));
          setProgress(doBg ? 60 : 10);
        }
      },
      removeBackground: async (input) => {
        const { removeBackground } = await import('@imgly/background-removal');
        return removeBackgroundWithTimeout(input, {
          removeBackgroundFn: removeBackground,
          onProgress: (key, current, total) => {
            if (String(key).startsWith('compute:')) setStatus(t('removing_bg'));
            else setStatus(t('loading_model'));
            if (total) setProgress(5 + Math.round((current / total) * 55));
          },
        });
      },
      removeWatermark: async (input) => {
        const img = await blobToImage(input);
        const engine = await createWatermarkEngine();
        const canvas = await engine.removeWatermarkFromImage(img);
        return canvasToBlob(canvas);
      },
    });
    const outBlob = result.blob;
    if (result.watermarkError) console.warn('Watermark removal failed; using background-only result.', result.watermarkError);
    setProgress(90);

    afterImg.src = URL.createObjectURL(outBlob);
    currentBlob = outBlob;
    isProcessing = false;

    grid.style.display = 'flex';
    download.href = URL.createObjectURL(outBlob);
    download.download = outName;
    download.style.display = 'inline-block';
    setProgress(100);
    setStatus(result.watermarkError ? t('warn_wm_failed') : t('done'), false, !!result.watermarkError);
  } catch (e) {
    console.error(e);
    isProcessing = false;
    currentBlob = null;
    if (e instanceof BackgroundRemovalTimeoutError) setStatus(t('err_bg_timeout'), true);
    else setStatus(t('err_fail') + (e?.message || e), true);
    setProgress(0);
  }
}

// Click and Drag events
drop.addEventListener('click', () => fileInput.click());
drop.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));
['dragover', 'dragenter'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('drag'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('drag'); }));
drop.addEventListener('drop', (e) => { if (e.dataTransfer?.files[0]) handleFile(e.dataTransfer.files[0]); });

// Language switcher clicks
document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    setLanguage(btn.getAttribute('data-lang'));
  });
});

// Theme switcher
function getInitialTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return 'dark';
}
function applyTheme(theme) {
  if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
}
applyTheme(getInitialTheme());
$('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  applyTheme(next);
  localStorage.setItem('theme', next);
});

// Init language
setLanguage(currentLang);

// GitHub star count (realtime)
const GH_REPO = 'curzyori/rm-bg';
const ghNum = $('ghNum');
(async () => {
  try {
    const r = await fetch(`https://api.github.com/repos/${GH_REPO}`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error('gh');
    const { stargazers_count } = await r.json();
    ghNum.textContent = String(stargazers_count);
  } catch { /* stay 0 */ }
})();
