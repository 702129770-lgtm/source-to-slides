# Data and Security

## What is processed

- Text entered in the browser.
- Supported uploaded files: PPTX, DOCX, PDF, PNG, JPG/JPEG and WEBP.
- Extracted text, uploaded file names and every usable extracted image are sent to the configured OpenAI API or compatible endpoint so the model can decide what to use.
- An image may be transmitted for evaluation even when the generated deck does not place it on a page.

## Where data lives

- Uploaded files are parsed from request memory; this application does not write them to disk.
- There is no project database, object storage or account system.
- The OpenAI API or compatible provider may process or retain submitted content according to its own policies. Review that provider before using sensitive data.
- `OPENAI_API_KEY` is read only by the server and is not bundled into browser code.

## Local defaults

- The server binds to `127.0.0.1` by default.
- Browser-origin checks protect the generation endpoint from unrelated web pages.
- File count, per-file size, total attachment size, total extracted-image size, multipart fields and Office archive expansion are bounded.
- Attachments are extracted sequentially to limit peak decompression memory.
- Validation failures can be shown to the user; unexpected server or provider errors return a generic message.

## Public deployment checklist

Before exposing the service to multiple users, add at least:

- Authentication and authorization.
- Per-user quotas, rate limits and model-cost controls.
- Tenant isolation and an explicit retention/deletion policy.
- Request concurrency limits, timeouts and cancellation.
- Malware scanning and stronger content-type verification.
- Centralized logs with secrets and user content redacted.
- A production `TRUSTED_ORIGINS` allowlist and TLS termination.

Do not upload confidential, regulated or personal data unless you have authority to process it and have reviewed every configured provider's data policy.
