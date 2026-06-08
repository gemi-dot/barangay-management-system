# Disaster Recovery Checklist
## Barangay IMS

## Purpose
This checklist is for restoring Barangay IMS after laptop failure, system corruption, accidental deletion, or hardware replacement.

---

## A. What Must Be Protected

1. Source code
- Protected by GitHub repository
- Repository: https://github.com/gemi-dot/barangay-management-system

2. Database
- Protected only if you make backup copies of `db.sqlite3`
- This contains resident data, document requests, reports, and office records

3. Configuration notes
- Local IP settings
- Admin usernames
- Backup folder location
- Deployment steps

---

## B. Recovery Scenarios

## Scenario 1: Laptop damaged but GitHub is safe
Use this when code is lost but your GitHub repo is intact.

### Steps
1. Install Python 3 on replacement computer.
2. Clone latest project:
```bash
git clone https://github.com/gemi-dot/barangay-management-system.git
cd barangay-management-system
```
3. Create virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```
4. Install dependencies:
```bash
pip install -r requirements.txt
```
5. Apply migrations:
```bash
python manage.py migrate
```
6. Start system:
```bash
python manage.py runserver
```

Result:
- App code is restored
- Database data is not restored unless you also have backup of `db.sqlite3`

---

## Scenario 2: Need to restore actual resident data
Use this when you have a saved backup copy of SQLite database.

### Steps
1. Complete Scenario 1 first.
2. Copy backup database file into project folder.
3. Replace current database file:
```bash
cp /path/to/backup/db.sqlite3 /path/to/barangay-management-system/db.sqlite3
```
4. Start server again:
```bash
source venv/bin/activate
python manage.py runserver
```

Result:
- App code restored
- Resident and office data restored from backup

---

## Scenario 3: Server PC failure in office deployment
Use this when shared server computer fails.

### Steps
1. Prepare replacement computer.
2. Clone latest GitHub code.
3. Recreate virtual environment and install requirements.
4. Restore latest `db.sqlite3` backup.
5. Run migrations:
```bash
python manage.py migrate
```
6. Start server on LAN:
```bash
python manage.py runserver 0.0.0.0:8000
```
7. Confirm office computers can access server IP.

---

## C. Daily Backup Procedure

Run at end of each office day:
```bash
mkdir -p backups
sqlite3 db.sqlite3 ".backup 'backups/db-$(date +%Y%m%d-%H%M%S).sqlite3'"
```

Minimum backup rule:
1. Daily backup in local `backups/` folder
2. Weekly copy to USB or external drive
3. Monthly copy to cloud or another secure machine

---

## D. Weekly Recovery Test

Every week:
1. Confirm GitHub repository is updated
2. Confirm latest backup file exists
3. Open one backup file size and verify it is not zero
4. Test restore on spare folder or machine if possible

---

## E. Emergency Contact Checklist

Keep this written separately:
1. GitHub repository URL
2. Admin username
3. Device location of latest backup
4. Name of person responsible for backups
5. Server IP address for office LAN setup

---

## F. Minimum Recovery Kit

Keep these available at all times:
1. GitHub repo link
2. Latest backup of `db.sqlite3`
3. Copy of `requirements.txt`
4. Python installer
5. This recovery checklist

---

## G. Recovery Success Check

After recovery, verify:
1. Login works
2. Residents list loads
3. Admin panel opens
4. Document requests open correctly
5. Reports load correctly
6. Latest restored data is visible

---

## H. Recommended Practice

For safe operations:
1. Push code updates to GitHub regularly
2. Back up `db.sqlite3` daily
3. Keep one extra copy of backup outside the laptop
4. Test restore process before actual emergency
