# Resident Portal Demo One-Page Checklist

Date: 2026-06-17
Project: Barangay IMS

## Goal
Start BIMS on your laptop and open the resident portal on a cellphone.

## Before You Start
- Docker Desktop is running.
- ngrok is installed and already authenticated.
- You are using the project folder below.

## Start BIMS
```bash
cd /Users/macbookpro/SoftWorks/barangay_ims
docker compose up -d
docker compose ps
```

Expected:
- Service `web` is `Up`
- Port `8000` is mapped

## Check on Laptop
Open:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/resident/login/`

## Start Phone Access with ngrok
In another terminal:

```bash
ngrok http 8000
```

Keep the ngrok terminal open.

Use the `https://...ngrok-free.app` or `https://...ngrok-free.dev` URL shown by ngrok.

## Open on Cellphone
Open:

- `https://YOUR-NGROK-URL/resident/login/`

Optional after login:

- `https://YOUR-NGROK-URL/resident/dashboard/`
- `https://YOUR-NGROK-URL/resident/requests/new/`

## Suggested Demo Flow
1. Log in as a resident.
2. Show the dashboard.
3. Create a document request.
4. Show request tracking.
5. Switch to the laptop staff side if needed.

## Quick Fixes

### App not loading
```bash
docker compose ps
docker compose logs --tail=50 web
```

### ngrok not working
```bash
ngrok config check
```

### Phone shows CSRF or stale page
- Use the latest ngrok URL.
- Use the `https` URL only.
- Refresh once, then retry.
- Try an incognito/private tab.

## Stop After Demo
Stop ngrok with `Ctrl+C` in the ngrok terminal.

Stop BIMS:

```bash
docker compose down
```
