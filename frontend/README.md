# Frontend

React, TypeScript, Material UI, and React Hook Form review application.

## Run

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` and `/uploads` to the backend
at `http://localhost:4000`.

## Behavior

- Drag-and-drop or select PDF/PNG/JPEG files.
- Show the original PDF or image on the left.
- Overlay OCR boxes and confidence on images.
- Generate form controls from backend template metadata.
- Highlight extracted fields below 80 percent confidence.
- Validate required fields and save corrections.

Set `VITE_API_URL` only when the backend is hosted on a different origin.

