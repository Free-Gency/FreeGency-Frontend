# FreeGency Frontend

Angular SPA for FreeGency. The application lives in the [`freegency/`](./freegency) directory.

## Local development

```bash
cd freegency
npm install
npm start
```

App runs at [http://localhost:4200](http://localhost:4200).

## Deploy to Vercel

### 1. Connect the repository

1. Go to [vercel.com/new](https://vercel.com/new) and import `Free-Gency/FreeGency-Frontend`.
2. Set **Root Directory** to `freegency` (Vercel will detect `vercel.json` there).
3. Confirm these settings (they are defined in `freegency/vercel.json`):

   | Setting          | Value                    |
   | ---------------- | ------------------------ |
   | Build Command    | `npm run build`          |
   | Output Directory | `dist/freegency/browser` |
   | Install Command  | `npm install`            |

4. Deploy.

### 2. Update the backend (required)

After you have your Vercel URL (e.g. `https://freegency.vercel.app`), set the Heroku config var on the API:

```bash
heroku config:set FrontendUrl=https://your-app.vercel.app -a free-gency-backend
```

This enables:

- CORS from your production frontend
- Email confirmation / password-reset links
- Google OAuth redirect back to the app

Also add the Vercel URL to your Google OAuth **Authorized JavaScript origins** and the callback path (`/auth/google/callback`) to **Authorized redirect URIs** in Google Cloud Console.

### 3. CLI deploy (optional)

```bash
cd freegency
npx vercel
```

Follow the prompts to link the project and deploy.
