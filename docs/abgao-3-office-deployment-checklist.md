# Abgao 3-Office Deployment Checklist (Secretary, BHW, Captain)

## Goal
One shared Barangay IMS system running on one server computer, accessed by 3 office computers through browser on the same local network.

- Server PC: hosts Django app and database
- Secretary PC: encoding and document processing
- BHW PC: health reports and resident health data
- Captain PC: dashboard and approvals/review

---

## A. Pre-Deployment Requirements

1. Hardware
- 1 server computer (always on during office hours)
- 3 office client computers (Secretary, BHW, Captain)
- 1 router/switch (all computers on same LAN)
- UPS for server + router
- External drive for backups

2. Software
- Python (same major version used in development)
- Project folder already available on server machine
- Dependencies in requirements.txt

3. Network
- Assign static local IP to server computer
- Example target URL: http://192.168.1.50:8000

---

## B. Exact Commands for Your Current Machine (macOS)

Run on server machine terminal:

1. Go to project
```bash
cd /Users/macbookpro/barangay_ims
```

2. Activate virtual environment
```bash
source venv/bin/activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Apply database migrations
```bash
python manage.py migrate
```

5. Create admin user (if not yet created)
```bash
python manage.py createsuperuser
```

6. Collect static files
```bash
python manage.py collectstatic --noinput
```

7. Run LAN-accessible server (demo/office LAN mode)
```bash
python manage.py runserver 0.0.0.0:8000
```

8. Get server IP address (macOS)
```bash
ipconfig getifaddr en0
```
If empty, try:
```bash
ipconfig getifaddr en1
```

Clients open:
- http://SERVER_IP:8000
- Example: http://192.168.1.50:8000

---

## C. Required Settings Before LAN Use

Update ALLOWED_HOSTS in settings file to include server IP and localhost.

File:
- barangay_ims/settings.py

Set ALLOWED_HOSTS similar to:
```python
ALLOWED_HOSTS = ['127.0.0.1', 'localhost', '192.168.1.50']
```

Note:
- Replace 192.168.1.50 with your actual static IP.

---

## D. Create Office Accounts and Permissions

## D1. Create groups and permissions (run once)
```bash
python manage.py shell
```
Then paste:
```python
from django.contrib.auth.models import Group, Permission

# Create groups
secretary_group, _ = Group.objects.get_or_create(name='Secretary')
bhw_group, _ = Group.objects.get_or_create(name='BHW')
captain_group, _ = Group.objects.get_or_create(name='Captain')

# Secretary permissions (broad resident + document operations)
secretary_perms = Permission.objects.filter(
    content_type__app_label__in=['residents', 'dashboard', 'assistant', 'bhw_reports']
)
secretary_group.permissions.set(secretary_perms)

# BHW permissions (health-report focused)
bhw_perms = Permission.objects.filter(content_type__app_label='bhw_reports')
bhw_group.permissions.set(bhw_perms)

# Captain permissions (mostly read/report access)
captain_perms = Permission.objects.filter(codename__startswith='view_')
captain_group.permissions.set(captain_perms)

print('Groups and permissions configured')
```

## D2. Create users and assign to groups
In Django Admin:
- Create 3 user accounts (secretary, bhw, captain)
- Assign each user to exactly one group
- Do not use one shared login for all offices

---

## E. Backup and Restore Procedure (SQLite)

## E1. Daily backup command
From project root:
```bash
mkdir -p backups
sqlite3 db.sqlite3 ".backup 'backups/db-$(date +%Y%m%d-%H%M%S).sqlite3'"
```

## E2. Restore command
1. Stop Django server first.
2. Restore selected backup:
```bash
cp backups/db-YYYYMMDD-HHMMSS.sqlite3 db.sqlite3
```
3. Start server again.

## E3. Backup schedule
- Daily: end of office hours
- Weekly: copy latest backup to external drive
- Monthly: test restore on spare machine

---

## F. Go-Live Validation Checklist

1. Server starts successfully on LAN IP
2. Secretary can add/edit residents and process documents
3. BHW can add/edit health reports but cannot manage everything
4. Captain can view dashboards/reports
5. Certificate print page shows correct Barangay defaults
6. 3 computers can use the system at same time
7. Backup file is created and verified
8. One restore test is completed before official launch

---

## G. One-Page SOP (Office Workflow)

## Secretary SOP
1. Login using Secretary account.
2. Encode new residents completely and verify Purok.
3. Process document requests queue daily.
4. Print certificates and record OR/control number.
5. End of day: run backup command and confirm backup file exists.
6. Report data issues to system admin immediately.

## BHW SOP
1. Login using BHW account.
2. Update health-related resident records and BHW reports only.
3. Validate senior, pregnancy, and health monitoring entries.
4. Do not edit unrelated master resident identity data unless approved.
5. Coordinate with Secretary for demographic corrections.

## Barangay Captain SOP
1. Login using Captain account.
2. Review dashboard metrics and key reports.
3. Check pending critical requests and sign-off items.
4. Monitor trends for seniors, households, and health concerns.
5. Escalate policy or data quality issues to Secretary/BHW.

---

## H. Recommended Next Upgrade (After Pilot)

1. Move from SQLite to PostgreSQL for stronger concurrent multi-user reliability.
2. Run with production app server and reverse proxy.
3. Add HTTPS and automatic nightly backup script (cron/launchd).
4. Add audit logging for edits and print actions.
