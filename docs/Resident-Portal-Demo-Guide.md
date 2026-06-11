# Resident Portal Demo Guide (Laptop to Cellphone)

Date: 2026-06-10
Project: Barangay IMS

## Goal
Run the project from your laptop and let prospects open the resident portal from a cellphone.

## Prerequisites
- Docker Desktop is running.
- ngrok is installed and authenticated.
- You are inside the project folder on your laptop.

## Step 1: Open Project Folder
In Terminal:

```bash
cd /Users/macbookpro/barangay_ims
```

## Step 2: Start the App with Docker
In Terminal:

```bash
docker compose up -d --build
```

Check if container is running:

```bash
docker compose ps
```

Expected:
- Service `web` is `Up`
- Port mapping includes `0.0.0.0:8000->8000/tcp`

## Step 3: Start ngrok Tunnel
In another terminal tab/window:

```bash
ngrok http 8000
```

Keep this terminal open.

Copy the `https://...ngrok-free.dev` forwarding URL shown by ngrok.

## Step 4: Open Demo on Cellphone
On your cellphone browser, open:

- Login page:
  - `https://YOUR-NGROK-URL/resident/login/`
- Dashboard page (after login):
  - `https://YOUR-NGROK-URL/resident/dashboard/`

Example:
- `https://collision-unmoral-facsimile.ngrok-free.dev/resident/login/`

## Step 5: Demo Flow (Recommended)
1. Login as a resident.
2. Open Dashboard.
3. Create a new document request.
4. Open Requests list and show status tracking.
5. On laptop, open admin/staff side to show processing.

## Step 6: Verify Health During Demo
If anything looks broken, run on laptop:

```bash
docker compose ps
docker compose logs --tail 80 web
```

## Common Issues and Fixes

### A) 403 CSRF Failed on Phone
- Use the latest ngrok URL (free URL changes per restart).
- Open in incognito/private tab.
- Reload login page once before submitting.
- Clear browser site data for `ngrok-free.dev`.

### B) DisallowedHost Error
- Ensure Docker env includes ngrok domains in allowed hosts.
- Restart container:

```bash
docker compose up -d --build
```

### C) ngrok 503 ERR_NGROK_3004
- Tunnel not connected to local app yet.
- Check app is up: `docker compose ps`
- Keep ngrok terminal running.
- Refresh after a few seconds.

## Stop After Demo
Stop ngrok:
- In ngrok terminal, press `Ctrl+C`

Stop Docker app:

```bash
docker compose down
```

## Quick Start Commands (Copy/Paste)
```bash
cd /Users/macbookpro/barangay_ims
docker compose up -d --build
ngrok http 8000
```

Then on phone:
- `https://YOUR-NGROK-URL/resident/login/`
