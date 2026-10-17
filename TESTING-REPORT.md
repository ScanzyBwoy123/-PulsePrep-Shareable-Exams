# PulsePrep Shareable Exams — Testing Report

## Status at package creation

This package has been generated as source files. It has **not** yet been deployed to a public host, tested across real mobile devices, or tested in a browser automation suite. The table below distinguishes code review from tests that still require a human/browser run.

| Test | Status | Notes |
|---|---|---|
| 1. Create an exam manually | Not performed in browser | Follow README steps. |
| 2. Add multiple questions | Not performed in browser | Test 2+ questions. |
| 3. Edit a question | Not performed in browser | Edit text and answer. |
| 4. Delete a question | Not performed in browser | Confirm then delete. |
| 5. Reject incomplete questions | Implemented; browser test pending | Try missing question text/options. |
| 6. Preview an exam | Not performed in browser | Verify questions and correct answers. |
| 7. Generate a shareable link | Implemented; browser test pending | Check long-link warning. |
| 8. Open link in fresh session | Not performed | Use private/incognito window. |
| 9. Answer and submit | Not performed in browser | Change answers and navigate. |
| 10. Verify score calculation | Marking helper implemented; runtime test pending | Test all correct, all wrong, and unanswered. |
| 11. Verify answers/explanations | Implemented; browser test pending | Review every question. |
| 12. Download standalone exam | Implemented; browser test pending | Open downloaded file. |
| 13. Test standalone offline | Not performed | Disconnect network and test downloaded file. |
| 14. Import valid JSON | Implemented; browser test pending | Import exported JSON. |
| 15. Reject malformed JSON | Implemented; browser test pending | Import invalid JSON. |
| 16. Malformed exam URL | Implemented; browser test pending | Edit fragment manually. |
| 17. Narrow mobile screen | Responsive CSS included; device test pending | Test 320–390 px width. |
| 18. Refresh behavior | Session restoration implemented; browser test pending | Refresh a timed student exam. |
| 19. AI unconfigured | Function returns honest configuration error; endpoint test pending | On static host, endpoint is unavailable; UI should say so. |
| 20. AI valid/invalid/provider errors/quota | Not performed | Requires configured provider and secret key. |
| 21. No API key in browser files | Source review: no API key included | `OPENAI_API_KEY` is read only by the serverless function. Recheck after setup. |

## Known limitations

- URL sharing embeds correct answers; not suitable for confidential or high-stakes exams.
- Local drafts are tied to the browser/device.
- Student results are not centrally stored.
- GitHub Pages cannot run the optional Netlify function.
- AI generation requires a separately configured provider account and server-side secret; usage may cost money.
- Public AI endpoints can be abused unless additional rate limiting/abuse controls are configured.
- The app has not been independently security audited.
