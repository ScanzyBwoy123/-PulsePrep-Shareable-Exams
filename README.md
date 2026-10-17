# PulsePrep Shareable Exams

A standalone, mobile-friendly nursing practice exam builder. It is separate from the existing PulsePrep website and does not use the existing Supabase project.

## Included features

- Manual exam creation and editing, with add/edit/delete/reorder questions.
- Exam metadata: title, subject, topic, difficulty, instructions, description and duration.
- Validation of four distinct options and one correct answer.
- Local draft save/load/clear using `localStorage`.
- Exam preview, JSON import/export, shareable practice links, and standalone HTML downloads.
- Student question navigation, local answer persistence for the active browser session, countdown timer, auto-submit, marking, explanations, restart, and print/save-to-PDF.
- Optional Netlify serverless AI generation endpoint. AI is unavailable until configured with server-side environment variables.
- No user account, central results database, or paid database required.

## Repository file structure

```text
PulsePrep-Shareable-Exams/
├── index.html
├── styles.css
├── app.js
├── exam.js
├── README.md
├── netlify.toml
└── netlify/
    └── functions/
        └── generate-questions.mjs
```

## Run locally

1. Download and unzip this project.
2. Open `index.html` in a modern browser to try the builder. Most builder features work directly from a local file.
3. For a more representative test, use a static local server (for example, VS Code Live Server) or deploy it to Netlify/GitHub Pages.
4. Create a question, fill all four options, select the correct answer, and add an explanation.
5. Preview the exam, export JSON, generate a share link, and download a standalone HTML exam.

Some browsers restrict clipboard access on `file://` pages. The copy button provides a fallback to select the link manually.

## Deploy to GitHub Pages (static features)

1. Create or open the separate repository: `ScanzyBwoy123/-PulsePrep-Shareable-Exams`.
2. Upload the files and folders listed above to the repository root, preserving the `netlify/functions/` folder.
3. Commit the files.
4. In repository **Settings → Pages**, choose deployment from the `main` branch and `/ (root)` if that option is available.
5. Wait for the Pages deployment and open the published URL.
6. Test the deployed site on a phone and in a private/incognito browser window.

GitHub Pages serves the static app only. The AI endpoint in `netlify/functions` will not run on GitHub Pages. Manual creation, marking, JSON export/import, share links, and standalone downloads do not need AI.

## Deploy to Netlify

1. Sign in to Netlify and choose **Add new site → Import an existing project**.
2. Connect GitHub and select this separate repository.
3. Use the repository root as the base directory. The `netlify.toml` file sets the publish directory and functions directory.
4. Deploy. Check the Netlify deploy log if the site does not build.
5. Test manual exam creation before configuring AI.

Netlify free-tier availability, function limits, and terms may change. Check Netlify's current plan details before relying on any free allowance.

## Optional AI setup on Netlify

AI is not configured by default. The function uses the OpenAI API and requires a valid provider account/key and a model name that your account can access. API usage may cost money; do not assume an AI provider has a permanent free tier.

1. In Netlify, open the site's **Site configuration / Environment variables** area (the menu wording may change).
2. Add `OPENAI_API_KEY` with the secret key as its value.
3. Add `AI_MODEL` with a model identifier available to your API account.
4. Never put either value into `index.html`, `app.js`, a public GitHub file, or a share link.
5. Trigger a fresh deploy so the function receives the variables.
6. Test the AI form. If no endpoint or variables are configured, it should report that AI is unavailable rather than fake results.

The function validates request fields and returned question shape, and responds with understandable errors for common provider failures. It does not implement advanced per-user authentication or robust abuse prevention. Publicly exposed serverless endpoints can be abused and may generate API costs. Before enabling public AI generation, add platform-level rate limiting or another suitable abuse-control layer and monitor usage. Keep usage caps/billing alerts enabled where available.

## How share links work — important

A small exam is encoded into the URL fragment (`#exam=...`). The fragment is not sent to the web server, and the student does not need an account. The correct answers and explanations are included in the data, so anyone with the link may inspect them. Share links are for low-stakes practice only.

- The app rejects malformed or invalid exam data.
- Links longer than the app's limit are not silently truncated; download the standalone HTML file instead.
- There is no centralized student tracking or remote results storage.
- Do not share confidential exams, answer keys, personal data, or high-stakes assessments this way.

## Standalone HTML download

The downloaded HTML contains the exam questions and answers, performs marking locally, displays explanations, and supports print/save-to-PDF. It can work offline in a modern browser and does not require a database or account. Anyone who receives the file can copy it or inspect the embedded answers.

## Local storage and privacy

Drafts use the current browser's `localStorage`. They do not synchronize between devices and may be removed when browser data is cleared. Student answers for a timed/session exam use `sessionStorage`; results are not sent to a server. This is not secure authentication and is not an anti-cheating system.

## Scoring

`percentage = correct answers / total questions × 100`. Unanswered questions are not penalized beyond receiving no point for that question. A question with one correct option is worth one point. There is no negative marking.

## Limitations and future backend needs

The initial application is intentionally static-first. These features need a properly designed backend before they can be claimed:

- Admin accounts and secure roles.
- Confidential answer keys and secure examination delivery.
- Persistent student identities, submissions, and centralized reporting.
- Shared drafts/question banks across devices.
- Reliable anti-cheating controls.
- Server-enforced exam timing and attempt limits.
- Public AI abuse protection beyond basic request validation.

Do not use this app for high-stakes or confidential examinations. It has not undergone an independent security audit.

## Testing checklist

Use `TESTING-REPORT.md` for the current honest test status and manual test steps. Do not claim a browser, offline, or deployed test passed unless it was actually performed.

## Existing PulsePrep integration

Do not change the existing PulsePrep repository as part of initial deployment. After this standalone site has been tested and the owner approves, add a link such as **Create a Shareable Exam** to the existing website that opens this separately hosted site. Do not share authentication, payment data, Supabase credentials, or code between the projects.
