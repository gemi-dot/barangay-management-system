# Barangay IMS

## BIMS is developed by TheSoftWorks. All rights reserved.

## Full Stack Dev Commands

Run both backend and frontend together:

```bash
cd /Users/macbookpro/SoftWorks/barangay_ims
npm run dev:full
```

Stop both backend and frontend:

```bash
cd /Users/macbookpro/SoftWorks/barangay_ims
npm run stop:full
```

## Document Requests

Residents can submit a request from the resident portal or the public request form. The request should include the resident name, document type, address, and purpose. Contact number is optional for the demo flow.

Staff can manage requests from the Document Requests Queue in the dashboard. The queue supports filtering by status and updating each request to `pending`, `processing`, `ready_for_pickup`, `released`, or `rejected`.

Typical request flow:

1. Open the document request form.
2. Fill in the required request details.
3. Submit the form and keep the tracking number.
4. Staff review the request in the queue.
5. Staff update the status as the request moves through processing.
