# EyeCheck AI — Frontend

React frontend for the Strabismus Detection System.

## Architecture
```
React (Render) → Hugging Face Spaces API → Binary CNN Model
```

## Setup

1. Clone this repo
2. Copy `.env.example` to `.env` and set your HF Space URL:
   ```
   REACT_APP_HF_SPACE_URL=https://YOUR-USERNAME-strabismus.hf.space
   ```
3. Install and run:
   ```bash
   npm install
   npm start
   ```

## Deploy to Render

1. Push to GitHub
2. Create new **Static Site** on [render.com](https://render.com)
3. Connect your GitHub repo
4. Set:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`
5. Add environment variable:
   - `REACT_APP_HF_SPACE_URL` = your HF Space URL
6. Deploy ✅

## HF Space API Note

Gradio exposes a `/run/predict` endpoint automatically.
The frontend sends the image as base64 and receives the prediction text back.

If your HF Space is private, add your HF token:
```
REACT_APP_HF_TOKEN=hf_xxxxxxxxxxxx
```
And add to the fetch header: `"Authorization": "Bearer " + token`

## Disclaimer
AI-based screening tool. NOT for medical diagnosis.
Developed by Knoxy Nexus.
