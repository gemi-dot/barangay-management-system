# Barangay Abgao IMS
## 1-Page Executive Summary

## Purpose
Barangay Abgao Information Management System (IMS) is a shared digital system to manage resident records, barangay documents, and office reports across three offices:
- Secretary
- BHW
- Barangay Captain

## Deployment Model
One-server, three-office setup on local network (LAN):
- Server Computer: hosts the system and database
- Secretary Computer: resident encoding and document processing
- BHW Computer: health and report updates
- Captain Computer: dashboard and report review

Access method:
- Each office opens browser and visits one shared LAN address (example: http://192.168.1.50:8000)

## Why This Setup
- Single source of truth: one shared database for all offices
- Faster coordination: real-time updates across offices
- Better accountability: separate user accounts and role-based access
- Practical rollout: works with existing office network and hardware

## Office Responsibilities
- Secretary: resident master data and document requests
- BHW: health-related entries and monitoring reports
- Captain: decision dashboards and official review

## Security and Control
- Role-based login per office (no shared account)
- Access limited by office function
- Daily backup and scheduled restore test
- UPS recommended for server and router

## Implementation Status
- Resident Purok options standardized (including Purok Tugas)
- Office Profile defaults set:
  - Barangay: ABGAO
  - City/Municipality: MAASIN
  - Province: SOUTHERN LEYTE
- Certificates use Office Profile location defaults

## Go-Live Checklist (Executive)
- Network stable and server IP fixed
- Three office accounts created and tested
- Three-office simultaneous access validated
- Backup and restore procedure demonstrated
- Staff orientation completed per office SOP

## Success Indicators (First 30 Days)
- 100% new resident records encoded in IMS
- 100% barangay document requests tracked in system
- Daily backup completion with zero missed days
- Reduced duplicate/incorrect records
- Faster report preparation and decision support

## Immediate Next Step
Approve pilot go-live schedule and assign one focal person per office for first-month monitoring.
