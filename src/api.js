import { Client } from "@gradio/client";

const HF_SPACE = "OctAnE12v1/strabismus";

/**
 * Send image to HF Space via official Gradio JS client.
 * @param {File|Blob} imageFile  - the image file object
 * @param {string}    lang       - language name e.g. "English"
 * @returns {Promise<string>}    - result text from model
 */
export async function predictImage(imageFile, lang = "English") {
    const client = await Client.connect(HF_SPACE);

    const result = await client.predict("/predict_upload", {
        img: imageFile,
        lang: lang,
    });

    // result.data = [result_text, plot_fig, state]
    return result.data[0];
}