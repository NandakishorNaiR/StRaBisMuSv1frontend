import React, { useState, useRef, useCallback, useEffect } from "react";
import { predictImage } from "./api";
import "./App.css";

// ─── Utility ────────────────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);  // "data:image/...;base64,..."
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Parse result text from backend ─────────────────────────────────────────
function parseResult(text) {
  if (!text) return null;
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const get = (key) => {
    const line = lines.find(l => l.toLowerCase().startsWith(key.toLowerCase()));
    return line ? line.split(":").slice(1).join(":").trim() : null;
  };
  const prediction  = get("prediction") || get("pred");
  const confidence  = get("confidence") || get("conf");
  const probStrab   = get("p(strabismus)") || get("p(strab");
  const probNormal  = get("p(normal)");
  const isNormal    = prediction?.toLowerCase().includes("normal") &&
                      !prediction?.toLowerCase().includes("strab");
  const isError     = prediction?.toLowerCase().includes("invalid") ||
                      prediction?.toLowerCase().includes("❌") ||
                      text.includes("No human eyes");
  return { prediction, confidence, probStrab, probNormal, isNormal, isError, raw: text };
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12M8 8l4-4 4 4"/>
  </svg>
);
const CamIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const ScanIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/>
    <line x1="7" y1="12" x2="17" y2="12"/>
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ─── Confidence Bar ───────────────────────────────────────────────────────────
function ConfBar({ label, value, color }) {
  const pct = parseFloat(value) || 0;
  return (
    <div className="conf-bar-row">
      <span className="conf-bar-label">{label}</span>
      <div className="conf-bar-track">
        <div className="conf-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="conf-bar-value">{pct.toFixed(1)}%</span>
    </div>
  );
}

// ─── Result Card ─────────────────────────────────────────────────────────────
function ResultCard({ result }) {
  if (!result) return null;
  const { isNormal, isError, prediction, confidence, probStrab, probNormal, raw } = result;

  if (isError) return (
    <div className="result-card result-error">
      <div className="result-icon-wrap error-icon">⚠️</div>
      <div className="result-title">Invalid Image</div>
      <p className="result-sub">{raw.replace(/❌|Invalid Image/gi,"").trim()}</p>
    </div>
  );

  return (
    <div className={`result-card ${isNormal ? "result-normal" : "result-strab"}`}>
      <div className="result-glow" />
      <div className="result-icon-wrap">{isNormal ? "✅" : "⚠️"}</div>
      <div className="result-title">{isNormal ? "NORMAL" : "STRABISMUS DETECTED"}</div>
      <div className="result-confidence">{confidence}</div>

      <div className="conf-bars">
        <ConfBar label="Normal"      value={probNormal?.replace("%","")} color="#00c896" />
        <ConfBar label="Strabismus"  value={probStrab?.replace("%","")}  color="#ff4757" />
      </div>

      <p className="result-disclaimer">
        ⚠️ Screening tool only — not a medical diagnosis.
      </p>
    </div>
  );
}

// ─── Webcam Modal ────────────────────────────────────────────────────────────
function WebcamModal({ onCapture, onClose }) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setReady(true);
        }
      })
      .catch(() => alert("Camera access denied or unavailable."));
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  const capture = () => {
    const video  = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    streamRef.current?.getTracks().forEach(t => t.stop());
    // Convert canvas to Blob for Gradio client
    canvas.toBlob((blob) => {
      onCapture(dataUrl, blob);
      onClose();
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>📷 Webcam Capture</span>
          <button className="modal-close" onClick={onClose}><XIcon /></button>
        </div>
        <video ref={videoRef} autoPlay playsInline className="webcam-video" />
        <div className="modal-footer">
          {ready
            ? <button className="btn-primary" onClick={capture}>📸 Capture Photo</button>
            : <span className="cam-loading">Connecting camera…</span>}
        </div>
      </div>
    </div>
  );
}

// ─── About Section ────────────────────────────────────────────────────────────
function AboutSection() {
  const types = [
    { name: "Esotropia",  dir: "inward ←",  note: "most common in children" },
    { name: "Exotropia",  dir: "outward →",  note: "often intermittent" },
    { name: "Hypertropia",dir: "upward ↑",   note: "vertical misalignment" },
    { name: "Hypotropia", dir: "downward ↓", note: "vertical misalignment" },
  ];
  return (
    <section className="about-section" id="about">
      <div className="about-grid">
        <div className="about-text">
          <div className="section-tag">ABOUT STRABISMUS</div>
          <h2 className="about-heading">What is<br /><em>Strabismus?</em></h2>
          <p className="about-body">
            Strabismus (crossed eyes) is a condition where both eyes do not
            look at the same point simultaneously. One eye may deviate inward,
            outward, upward, or downward while the other fixates normally.
          </p>
          <p className="about-body">
            Left untreated, strabismus can lead to <strong>amblyopia</strong> (lazy eye)
            or permanent vision loss. Early detection — especially in children — 
            significantly improves treatment outcomes.
          </p>
          <div className="about-note">
            <ScanIcon />
            <span>This AI tool is a screening aid, not a substitute for clinical examination.</span>
          </div>
        </div>
        <div className="types-grid">
          {types.map(({ name, dir, note }) => (
            <div key={name} className="type-card">
              <div className="type-name">{name}</div>
              <div className="type-dir">{dir}</div>
              <div className="type-note">{note}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [imageDataUrl, setImageDataUrl] = useState(null);
  const [imageFile,    setImageFile]    = useState(null);
  const [result,       setResult]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [showWebcam,   setShowWebcam]   = useState(false);
  const [dragOver,     setDragOver]     = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, WEBP).");
      return;
    }
    const dataUrl = await fileToBase64(file);
    setImageDataUrl(dataUrl);
    setImageFile(file);
    setResult(null);
    setError(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleWebcamCapture = useCallback((dataUrl, blob) => {
    setImageDataUrl(dataUrl);
    setImageFile(blob);   // Blob from canvas — Gradio client accepts Blob
    setResult(null);
    setError(null);
  }, []);

  const analyze = useCallback(async () => {
    if (!imageFile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resultText = await predictImage(imageFile, "English");
      setResult(parseResult(resultText));
    } catch (err) {
      setError(`Connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [imageFile]);

  const reset = () => {
    setImageDataUrl(null);
    setImageFile(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="app">
      {/* ── Hero ── */}
      <header className="hero">
        <div className="hero-noise" />
        <nav className="nav">
          <div className="nav-logo"><EyeIcon /><span>EyeCheck AI</span></div>
          <a href="#about" className="nav-link">About</a>
        </nav>

        <div className="hero-content">
          <div className="hero-badge">AI-Powered Screening</div>
          <h1 className="hero-title">
            Detect <em>Strabismus</em><br />in Seconds
          </h1>
          <p className="hero-sub">
            Upload an eye photo or use your webcam. Our CNN model analyses
            eye alignment and returns an instant screening result.
          </p>
        </div>

        {/* ── Upload Card ── */}
        <div className="upload-card">
          <div className="upload-card-inner">

            {/* Left: drop zone */}
            <div
              className={`drop-zone ${dragOver ? "drag-active" : ""} ${imageDataUrl ? "has-image" : ""}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !imageDataUrl && fileInputRef.current?.click()}
            >
              {imageDataUrl ? (
                <>
                  <img src={imageDataUrl} alt="preview" className="preview-img" />
                  <button className="clear-btn" onClick={(e) => { e.stopPropagation(); reset(); }}>
                    <XIcon /> Clear
                  </button>
                </>
              ) : (
                <div className="drop-placeholder">
                  <div className="drop-icon"><UploadIcon /></div>
                  <p className="drop-text">Drop image here</p>
                  <p className="drop-sub">JPG, PNG, WEBP · max 10 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])}
              />
            </div>

            {/* Right: controls + result */}
            <div className="controls-panel">
              <div className="btn-row">
                <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                  <UploadIcon /> Upload
                </button>
                <button className="btn-secondary" onClick={() => setShowWebcam(true)}>
                  <CamIcon /> Webcam
                </button>
              </div>

              <button
                className="btn-primary analyze-btn"
                disabled={!imageFile || loading}
                onClick={analyze}
              >
                {loading ? (
                  <><span className="spinner" /> Analysing…</>
                ) : (
                  <><ScanIcon /> Analyze Image</>
                )}
              </button>

              {error && (
                <div className="error-msg">⚠️ {error}</div>
              )}

              {result && <ResultCard result={result} />}

              {!result && !error && !loading && (
                <div className="empty-hint">
                  <EyeIcon />
                  <span>Upload or capture an eye photo, then click <strong>Analyze</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── About ── */}
      <AboutSection />

      {/* ── Footer ── */}
      <footer className="footer">
        <p>⚠️ <strong>Medical Disclaimer:</strong> EyeCheck AI is an AI-based screening tool and is
          <strong> NOT intended for medical diagnosis or clinical use</strong>.
          Always consult a qualified ophthalmologist for accurate diagnosis and treatment.
        </p>
        <p className="footer-credit">Developed and maintained by <strong>Knoxy Nexus</strong></p>
      </footer>

      {showWebcam && (
        <WebcamModal
          onCapture={handleWebcamCapture}
          onClose={() => setShowWebcam(false)}
        />
      )}
    </div>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> f1ef6f9 (Changes made which were given by lighthouse report)
