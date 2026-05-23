// ============================================================
//  HF Space API integration
//  Replace HF_SPACE_URL with your actual space URL:
//  e.g. "https://octane12v1-strabismus.hf.space"
// ============================================================
const HF_SPACE_URL = process.env.REACT_APP_HF_SPACE_URL || "https://OctAnE12v1-strabismus.hf.space";

/**
 * Gradio /run/predict endpoint
 * Sends base64 image and language, returns [result_text, plot_fig, state]
 */
export async function predictImage(base64Image, lang = "English") {
  // Gradio API format: POST /run/predict with { data: [...inputs] }
  const response = await fetch(`${HF_SPACE_URL}/run/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        { data: base64Image, type: "pil" },  // upload_input
        lang,                                  // lang_dd
      ],
      fn_index: 0,   // predict_upload is the first .click() registered
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HF API error ${response.status}: ${text}`);
  }

  const json = await response.json();
  // json.data = [result_text, plot_fig_json, state]
  return {
    resultText: json.data[0],          // string
    plotData:   json.data[1],          // matplotlib figure JSON or null
    raw:        json,
  };
}

/** Health check — ping the HF space */
export async function checkHealth() {
  try {
    const r = await fetch(`${HF_SPACE_URL}/`, { method: "HEAD", mode: "no-cors" });
    return true;
  } catch {
    return false;
  }
}
