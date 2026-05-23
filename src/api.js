// ============================================================
//  HF Space API — Gradio 6 compatible
//
//  Gradio 6 uses a queue/SSE system:
//    1. POST /queue/join        → get event_id
//    2. GET  /queue/data        → SSE stream, listen for "process_completed"
//
//  Named endpoint (api_name="predict_upload") maps to:
//    POST /run/predict_upload   ← simple REST, works for non-streaming
//
//  We use the simple /run/{api_name} path first (works for most spaces),
//  with a fallback to the queue-based approach.
// ============================================================

const HF_SPACE_URL = (
    process.env.REACT_APP_HF_SPACE_URL ||
    "https://octane12v1-strabismus.hf.space"
).replace(/\/$/, ""); // strip trailing slash

const TIMEOUT_MS = 60000; // 60s — model cold-start can be slow

// ── Helper: fetch with timeout ───────────────────────────────
function fetchWithTimeout(url, options, ms = TIMEOUT_MS) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    return fetch(url, {...options, signal: controller.signal })
        .finally(() => clearTimeout(id));
}

// ── Convert file/dataURL to base64 string only (strip prefix) ─
function stripBase64Prefix(dataUrl) {
    // Gradio expects raw base64 OR full data URL depending on version
    // We send the full data URL — Gradio handles both
    return dataUrl;
}

// ── Primary: Gradio 6 named REST endpoint ───────────────────
//  POST /run/predict_upload
//  Body: { data: [image_payload, lang_string] }
//  image_payload for Gradio 6 PIL input = { path, url, meta, ... }
//  BUT for base64 upload: use { data: "<base64>", type: "base64" }
async function callNamedEndpoint(base64DataUrl, lang) {
    const url = `${HF_SPACE_URL}/run/predict_upload`;

    const body = {
        data: [
            base64DataUrl, // Gradio 6 accepts data URL string for Image(type="pil")
            lang,
        ],
    };

    const resp = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`${resp.status}: ${text.slice(0, 200)}`);
    }

    const json = await resp.json();
    // Gradio 6 returns { data: [...], duration: N }
    return json.data[0]; // result_text string
}

// ── Fallback: Gradio queue/SSE approach ─────────────────────
//  Used if named endpoint returns 404
async function callQueueEndpoint(base64DataUrl, lang) {
    // Step 1: join queue
    const joinResp = await fetchWithTimeout(
        `${HF_SPACE_URL}/queue/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                data: [base64DataUrl, lang],
                fn_index: 0, // predict_upload is first registered .click()
                session_hash: Math.random().toString(36).slice(2),
            }),
        }
    );

    if (!joinResp.ok) {
        throw new Error(`Queue join failed: ${joinResp.status}`);
    }

    const { event_id } = await joinResp.json();

    // Step 2: listen to SSE stream
    return new Promise((resolve, reject) => {
        const evtSource = new EventSource(
            `${HF_SPACE_URL}/queue/data?session_hash=${event_id}`
        );
        const timeout = setTimeout(() => {
            evtSource.close();
            reject(new Error("Timeout waiting for prediction result."));
        }, TIMEOUT_MS);

        evtSource.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.msg === "process_completed") {
                    clearTimeout(timeout);
                    evtSource.close();
                    if (msg && msg.output && msg.output.data && msg.output.data[0]) {
                        resolve(msg.output.data[0]);
                    } else {
                        resolve("No result returned.");
                    }
                } else if (msg.msg === "process_errored") {
                    clearTimeout(timeout);
                    evtSource.close();
                    if (msg && msg.output && msg.output.error) {
                        reject(new Error(msg.output.error));
                    } else {
                        reject(new Error("Model error."));
                    }
                }
            } catch {
                // ignore parse errors on heartbeat messages
            }
        };

        evtSource.onerror = () => {
            clearTimeout(timeout);
            evtSource.close();
            reject(new Error("SSE connection error."));
        };
    });
}

// ── Public API ───────────────────────────────────────────────
/**
 * Send image to HF Space and get prediction text back.
 * Tries named REST endpoint first, falls back to queue/SSE.
 *
 * @param {string} base64DataUrl  - "data:image/jpeg;base64,..."
 * @param {string} lang           - language name e.g. "English"
 * @returns {Promise<string>}     - result text from model
 */
export async function predictImage(base64DataUrl, lang = "English") {
    try {
        return await callNamedEndpoint(base64DataUrl, lang);
    } catch (err) {
        // If named endpoint 404s, try queue approach
        if (err.message.startsWith("404")) {
            console.warn("Named endpoint not found, falling back to queue API...");
            return await callQueueEndpoint(base64DataUrl, lang);
        }
        throw err;
    }
}