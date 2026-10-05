# TGMSIDC Digital Equipment Management System
## Procurement Process Book — Converted & Scope-Validated Functional Specification

**Source:** `V9 Procurement process book.xlsx`  
**Purpose:** Authoritative Markdown conversion of the procurement process book, normalized to the RFP module nomenclature and the agreed scope boundary.  
**Prepared for:** Proposal / solution design / requirements traceability  

---

## 1. Scope Validation Result

The uploaded procurement process book was re-analysed across all source sheets. This Markdown retains the process steps, validations, roles, workflow/status logic, SLA/escalation rules, master data, cross-cutting capabilities, Vendor Portal requirements, reports and KPI definitions. Where the workbook contains payment-related wording, it has been normalized to the agreed scope boundary below.

### 1.1 Scope Boundary — Payment Processing

> **Payment processing is outside the scope of the Digital Equipment Management System.** The System shall not perform invoice receipt, invoice matching, payment eligibility computation, treasury/PFMS/bank integration, payment authorization, or disbursement. The only payment-related data maintained in the System is a **manual Paid / Not-Paid status** against the relevant Purchase Order, updated by the authorized TGMSIDC User / Accounts role. Any payment transaction continues outside the System.

### 1.2 Scope Conversion / Normalization Rules

| Area | Normalized Treatment in this Markdown |
| --- | --- |
| Module nomenclature | Uses the RFP names: Indent Receipt; Indent Approval; Rate Contract Creation; Rate Contract Management; Purchase Order Generation; PO Approval; PO Amendment & Cancellation; Delivery & Receipt; Quality Assurance & Acceptance; Master Data Management; Reports & Analytics. |
| Vendor Portal | Treated as a cross-cutting functional layer spanning PO Approval, Delivery & Receipt and QA/Acceptance. It does **not** replace the government e-Procurement/GeM tender portal. |
| Tendering | Actual tender publication/bid submission remains on e-Procurement/GeM. The System tracks tender references, internal stages, documents, decisions, cancellations and re-tender linkages. |
| Payment | Only manual Paid/Not-Paid status is retained. All invoice/payment processing and disbursement are excluded. |
| BFC terminology | The workbook uses both “Bill Finalisation Committee” and “Bid Finalisation Committee.” This Markdown uses **BFC** without changing the source workflow; final expansion should be confirmed by TGMSIDC. |
| AE / other authority roles | Can be configured through the Authority/User & Role masters where TGMSIDC requires them. The current process book does not define a mandatory AE transaction step. |

### 1.3 Source Coverage Matrix

| Source Sheet | Coverage in Markdown | Status |
| --- | --- | --- |
| 0. Overview | Context, glossary and source coverage | Covered |
| 1. Indent Receipt | Module 1 | Covered |
| 2. Indent Approval | Module 2 | Covered |
| 3. RC Creation | Module 3 | Covered |
| 4. RC Management | Module 4 | Covered |
| 5. Issue PO | Module 5 | Covered |
| 6. PO Approval | Module 6 | Covered |
| 7. PO Amendment & Cancel | Module 7 | Covered |
| 8. Delivery & Receipt | Module 8 | Covered |
| 9. QA & Acceptance | Module 9 | Covered |
| 10. Workflow Summary | Workflow/status/SLA/parallel processing | Covered |
| 11. Master Data | Module 10 | Covered |
| 12. Functionalities | Cross-cutting & traceability requirements | Covered |
| 13. Reports & Dashboards | Module 11 | Covered |

---

## 2. Business Context

TGMSIDC requires a single, cloud-hosted and mobile-responsive Digital Equipment Management System to digitise the equipment procurement lifecycle across government health institutions. The solution covers demand/indent capture, approval, Rate Contract creation and lifecycle management, Purchase Order generation and approval, delivery/receipt, quality assurance/acceptance, controlled master data, Vendor Portal collaboration, reports and KPI dashboards.

The operating model must preserve evidence and accountability at each stage: source indent, correction history, specification confirmation, tender/BFC documents, RC approvals, PO versions, vendor acknowledgement, dispatch, receipt photographs, discrepancy records, Delivery Completion Certificate, QA inspection evidence, installation/training records, warranty initiation and manual Paid/Not-Paid status.

---

## 3. Personas and Governance Roles

| Persona / Role | Primary Responsibilities in Scope |
| --- | --- |
| Hospital Facility In-charge / HoD | Originates need, supports DEO, provides/validates source indent and institution-level information; nominates doctors/experts where required. |
| DEO (HoD) | Creates and submits digital indents for the mapped HoD/facility; uploads scanned indent; tracks returned/submitted status. |
| TGMSIDC User | Verifies indent against scanned copy, corrects data with audit trail, resolves write-ins, creates/tracks RC/tender data, generates POs, monitors delivery and coordinates process actions. |
| AE / Other Approving Authority | Configurable role where required by TGMSIDC approval matrix. No mandatory AE step is defined in the current process book. |
| GM Equipment | Reviews/proposes indent, RC and PO decisions; oversees delivery/QA; receives escalations; may approve/act as accountable authority depending on stage. |
| SO Equipment | Formal approval/return/reject authority for indent, RC and PO stages as defined in the process book; receives escalations. |
| ED | Higher-value / escalation authority and accountable approver where configured; participates in BFC/approval governance. |
| MD | Escalation authority for selected SLA breaches / governance decisions; transaction involvement is configuration-driven. |
| Doctors / Specification Committee | Confirms, changes or creates equipment technical specifications; signed evidence and approver names are recorded. |
| Technical Committee / QA Committee | Performs demo/technical evaluation and QA inspection/testing; records recommendations and accept/conditional/reject outcomes. |
| BFC | Reviews financial bid outcome and records procurement decision prior to RC creation. |
| Consignee / Institution | Receives equipment, records receipt/serial numbers/condition, supports delivery certificate, participates in QA/installation acceptance. |
| Finance / Accounts | Maintains **manual Paid/Not-Paid PO status only** where authorized. No payment processing or disbursement is performed in the System. |
| Vendor | Uses Vendor Portal to acknowledge PO, provide dispatch details, track delivery, upload Delivery Completion Certificate, view own performance and raise grievances/clarifications. |
| TGMSIDC Admin / System Admin | Maintains masters, users/roles, configuration, thresholds, templates, notification controls and access governance. |

---

## 4. Functional Modules

### 4.1 Module 1: Indent Receipt

Digitise facility-level indent creation at source, validate completeness, preserve scanned evidence, resolve non-master equipment write-ins, and route the verified indent into TGMSIDC approval.

| Step | Activity | Detailed Description | System Behaviour / Validation | Inputs | Outputs | Tool | Responsible (R) | Accountable (A) | Consulted (C) | Informed (I) | Decision? | Exception / Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | DEO logs into the tool | Data Entry Operator (DEO) at the HoD facility logs into the procurement tool using HoD-specific login credentials.<br>DEO navigates to 'Create New Indent'.<br><br>Process moves to Step 2. | – Role-based access: DEO can only create/edit indents for their own HoD.<br>– Dashboard shows DEO's draft indents and submitted indent status.<br>– Session timeout after 30 min inactivity. | HoD login credentials | Indent creation screen | E-tool | DEO (HoD) | DEO (HoD) | HoD | — | No | If DEO has login issues, contact TGMSIDC Admin. Each HoD gets one or more DEO logins. |
| 2 | Enter indent header details | DEO enters indent header and uploads scanned copy of physical indent:<br>1. HoD name (auto-filled from login; read-only)<br>2. Indent type (Letter / GO / Proceeding)<br>3. Indent reference no.<br>4. Financial year<br>5. Indent date<br>6. Funding source (from master)<br>7. Programme name (from master)<br>8. Account head (from master)<br><br>Upload scanned copy of original indent (mandatory).<br><br>Process moves to Step 3. | – HoD name auto-populated from DEO's login profile (not editable by DEO).<br>– System logs receipt timestamp.<br>– Auto-generates unique Indent Tracking ID.<br>– Indent ref. no. must be unique (duplicate check).<br>– Mandatory-field validation on save.<br>– Auto-populate programme, funding source & account head from masters.<br>– Scanned copy upload mandatory (PDF/JPG/PNG, max 30 MB). | Physical indent document; Master lists | Indent Tracking ID; Draft indent record | E-tool | DEO (HoD) | DEO (HoD) | HoD | TGMSIDC | No | If data missing on physical indent, DEO should coordinate with HoD before entering. |
| 3 | Add institutions for which indent is raised | Select institutions from Institution Master.<br>Institution is linked to district automatically.<br><br>Process moves to Step 4. | – Validate institution exists in master.<br>– Auto-populate district from institution master.<br>– Allow multi-select.<br>– DEO can only see institutions under their HoD's jurisdiction (filtered view). | Institution Master | Institutions linked to indent | E-tool | DEO (HoD) | DEO (HoD) | HoD | TGMSIDC | No |  |
| 4 | Enter equipment details | Select equipment from the Equipment Master list.<br>For each line:<br>• Department<br>• Equipment name & category (Only equipment linked to that department and type of health facility will be displayed)<br>• Specifications (long-text) (Auto filled)<br><br>If the equipment is NOT found in the master list:<br>• DEO selects 'Equipment not in list' option<br>• Manually types: Equipment name + Specifications (free-text)<br>• This entry is flagged as 'Unverified – Pending Master Mapping'<br><br>Process moves to Step 5. | – Auto-suggest from Equipment Master as DEO types.<br>– If selected from master → spec template pre-filled.<br>– If 'Equipment not in list' selected → free-text fields enabled for name + specs.<br>– Free-text entries flagged with 'Unverified' badge.<br>– Validate at least one equipment line exists.<br>– System logs whether each line is 'From Master' or 'Write-in'. | Equipment Master | Equipment line items (master-matched or write-in) | E-tool | DEO (HoD) | DEO (HoD) | Concerned health facility | TGMSIDC | No | Write-in entries will be resolved by TGMSIDC User in Step 12 (review stage). |
| 5 | Map equipment quantities per institution | For each institution, fill:<br>1. Sanctioned quantity<br><br>Process moves to Step 6. | – Validate: Total qty per equipment across all institutions = indent total.<br>– Auto-sum quantities. | Indent details | Equipment-institution quantity matrix | E-tool | DEO (HoD) | DEO (HoD) | HoD | TGMSIDC | No |  |
| 6 | Enter fund details for each institute | Enter:<br>1. Fund sanctioned(AS) amount<br>2. Fund sanction date<br>3. Fund deposited amount (if applicable)<br>4. Cheque / UTR no. (if applicable)<br>5. Fund deposit date (if applicable)<br><br>Process moves to Step 7. | – Date validations (deposit date ≤ today).<br>– Fund deposited ≤ Fund sanctioned (if both entered). | Fund sanction documents | Fund details linked to indent | E-tool | DEO (HoD) | DEO (HoD) | HoD | TGMSIDC | No |  |
| 7 | Validate indent completeness | System runs completeness check across all mandatory fields before allowing submission.<br><br>If validation passes → Process moves to Step 8 (save draft) or Step 9 (submit).<br>If validation fails → DEO must correct errors and re-validate. | – Mandatory-field check.<br>– Highlight any empty mandatory cells in red.<br>– Flag if any equipment line is 'Write-in' (warning, not a blocker).<br>– Summary of validation results shown to DEO. | All prior data entries | Validation pass / fail report | E-tool | DEO (HoD) | DEO (HoD) | HoD | — | Yes | If validation fails → DEO must correct errors before proceeding. |
| 8 | Save as draft (optional) | Save current indent as draft for later completion.<br><br>Process moves to Step 9 when DEO is ready to submit. | – Status = 'Draft'.<br>– Visible in DEO's draft queue.<br>– Drafts auto-flagged after 30 days of inactivity (configurable).<br>– TGMSIDC User cannot see drafts; only submitted indents. | Draft indent data | Saved draft | E-tool | DEO (HoD) | DEO (HoD) | HoD | — | No |  |
| 9 | Submit indent to TGMSIDC for review | DEO submits the completed indent.<br>The indent goes to TGMSIDC User's review queue <br><br>Process moves to Step 10. | – Status changes: Draft → 'Pending TGMSIDC Review'.<br>– Notification (email + in-app) sent to TGMSIDC User.<br>– Submission timestamp recorded.<br>– Indent locked from DEO editing after submission.<br>– DEO can track indent status on their dashboard. | Validated indent | Indent in TGMSIDC review queue; notification to TGMSIDC User | E-tool | DEO (HoD) | DEO (HoD) | HoD | TGMSIDC User | No | Once submitted, DEO cannot edit unless returned by TGMSIDC User. |
| 10 | TGMSIDC User reviews indent against scanned copy | TGMSIDC User opens the indent from the review queue.<br>Verifies all DEO-entered data against the uploaded scanned copy:<br>1. HoD name & indent reference<br>2. Equipment names, specs & quantities<br>3. Institutions & quantity mapping<br>4. Fund details<br>5. Completeness and accuracy<br><br>TGMSIDC User can view the scanned copy for each institute side-by-side with entered data.<br><br>Process moves to Step 11. | – Side-by-side view: entered data (left) vs. scanned copy (right).<br>– Discrepancies between data and scan highlighted.<br>– 'Write-in' equipment flags shown prominently.<br>– Aging indicator: Green <2d, Amber 2-3d, Red >3d. | Submitted indent; Scanned copy | Review findings | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | DEO (HoD) | No |  |
| 11 | TGMSIDC User edits / corrects indent data (if needed) | TGMSIDC User can directly edit fields to correct errors:<br>• Fix quantities, dates, fund details<br>• Add missing information<br><br>All edits tracked: system logs DEO's original value vs. TGMSIDC User's corrected value.<br><br>If write-in equipment entries exist → Process moves to Step 12.<br>If no write-ins → Process moves to Step 13. | – Edit audit trail: for each corrected field, system stores:<br>  • Original value (entered by DEO)<br>  • Corrected value (entered by TGMSIDC User)<br>  • Timestamp of correction<br>  • User who made the correction<br>– Correction count per indent tracked for DEO quality reporting.<br>– Edited fields visually marked (blue highlight) to distinguish from original entries. | Indent data; Scanned copy | Corrected indent data; Edit audit log | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | DEO (HoD) | No | DEO is not notified of corrections but can view edit history on their dashboard. |
| 12 | Resolve write-in equipment entries (if any) | For each equipment line flagged as 'Write-in', TGMSIDC User must resolve:<br><br>Option A – Map to existing master item:<br>• Search Equipment Master and link the write-in to an existing entry<br>• (DEO may have used a different name for equipment already in master)<br><br>Option B – Flag as new equipment addition request:<br>• Confirm equipment is genuinely not in master<br>• Raise 'New Equipment Addition Request' to GM Equipment<br>• Indent can proceed with write-in entry (flagged) pending master update<br><br>Process moves to Step 13. | – Write-in entries highlighted with 'Unverified' badge.<br>– TGMSIDC User must resolve each write-in before forwarding (mandatory).<br>– Option A: Line updated to reference master entry; original write-in text preserved in notes.<br>– Option B: 'New Equipment Addition Request' auto-created → routed to GM.<br>– Once GM approves new equipment, master updated for future indents.<br>– Resolution status: 'Mapped to Master' or 'New Addition Requested'. | Write-in equipment entries; Equipment Master | Resolved equipment lines; New addition requests (if any) | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | DEO (HoD) | Yes | This step is skipped if all equipment lines were selected from master (no write-ins). |
| 13 | Decision: Forward to GM or Return to DEO | After review, correction, and write-in resolution:<br><br>• Satisfied (if no changes from the indent raised by DEO) → Forward indent to GM Equipment for approval. Process moves to Step 14.<br>• Issues needing DEO input → Return to DEO with comments. Process moves back to Step 9 after DEO corrections. | – If forwarded: Status → 'Pending Approval' (GM queue).<br>– If returned: Status → 'Returned by TGMSIDC'. DEO notified with comments.<br>– Return requires mandatory comments explaining what DEO needs to fix.<br>– DEO can re-edit and re-submit.<br>– Forwarding timestamp recorded. | Reviewed indent; Decision | Indent in GM queue OR returned to DEO | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | DEO (HoD) / HoD | Yes | If returned, cycle repeats from Step 9 after DEO corrections. |
| 14 | Forward indent for GM Equipment approval | TGMSIDC User forwards the verified indent to GM Equipment.<br><br>Process moves to → Sheet 2. Indent Approval (Step 1). | – Status: 'Pending Approval'.<br>– Notification (email + in-app) sent to GM Equipment.<br>– Indent locked from TGMSIDC User editing.<br>– GM can see: DEO original entries, TGMSIDC corrections (if any), write-in resolutions, scanned copy. | Verified & corrected indent | Indent in GM approval queue; notification to GM | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | DEO (HoD) / HoD | No |  |

### 4.2 Module 2: Indent Approval

Enable GM/SO review of the verified indent, approve line-level quantities, select procurement mode, and route each equipment line independently to Rate Contract creation or Purchase Order generation.

| Step | Activity | Detailed Description | System Behaviour / Validation | Inputs | Outputs | Tool | Responsible (R) | Accountable (A) | Consulted (C) | Informed (I) | Decision? | Exception / Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Open pending-indent approval queue | GM Equipment opens approval queue. Filter by:<br>1. HoD type<br>2. Indent type / Order type<br>3. Financial year<br>4. Date range<br><br>Process moves to Step 2. | – Dashboard tile: count of pending indents.<br>– Aging indicator: Green <7d, Amber 7-14d, Red >14d.<br>– Sort by oldest-first (default).<br>– GM can see TGMSIDC review status and correction count for each indent. | Pending indent list | Filtered indent list on screen | E-tool | TGMSIDC GM Equip | TGMSIDC GM Equip | TGMSIDC User | Respective HoD | No |  |
| 2 | Select indent reference number | Click on an indent reference number to open its full details.<br><br>Process moves to Step 3. | – Display: header, equipment list, institution-qty matrix, fund details, scanned copy.<br>– Show DEO original entries vs. TGMSIDC corrections (edit audit trail).<br>– Write-in resolution status visible.<br>– Read-only view. | Indent ref. no. | Full indent detail screen | E-tool | TGMSIDC GM Equip | TGMSIDC GM Equip | TGMSIDC User | Respective HoD | No |  |
| 3 | Verify indent details | For each equipment / institution line, verify:<br>1. Equipment specification<br>2. Requested qty vs. sanctioned qty<br>3. Budget adequacy (estimated cost vs. fund available)<br>4. No duplication with existing indents/POs<br><br>Process moves to Step 4. | – System highlights discrepancies (qty mismatch, budget shortfall).<br>– Show existing active RC coverage for the equipment.<br>– Show any 'New Equipment Addition Requests' flagged by TGMSIDC User. | Indent data; Historical records | RC Status; Verification notes | E-tool | TGMSIDC GM Equip | TGMSIDC GM Equip | TGMSIDC User | Respective HoD | No |  |
| 4 | Enter approved quantity per equipment line | For each equipment line, enter the quantity to be approved (may be ≤ requested quantity).<br><br>Process moves to Step 5. | – Validate: Approved qty ≤ Requested qty.<br>– Auto-recalculate estimated cost based on approved qty.<br>– If partial approval → mandatory reason/comment. | Indent data | Approved quantity per line | E-tool | TGMSIDC GM Equip | TGMSIDC GM Equip | TGMSIDC User | Respective HoD | No | Partial approvals must carry forward reasoning to PO stage. |
| 5 | Select procurement mode per equipment | For each equipment line, select mode:<br>i) Rate Contract (RC) – if a valid RC exists<br>ii) Open / Limited Tender – if no RC exists<br>iii) Local Purchase – for low-value items under threshold<br><br>Process moves to Step 6. | – System auto-checks RC availability for each equipment.<br>– If active RC found → pre-select 'RC' and display RC details.<br>– If no active RC → highlight and recommend 'Tender'. | RC Master; Equipment data | Procurement mode per equipment line | E-tool | TGMSIDC GM Equip | TGMSIDC GM Equip | TGMSIDC User | Respective HoD | Yes | Procurement mode drives downstream routing (RC → PO; Tender → RC Creation first). |
| 6 | Approve / Return / Reject indent | Update the status as<br>Proposed to Approve<br>Proposed to Return to TGMSIDC user (along with reason)<br>Proposed to Reject (along with reason)<br><br>The process moves to Step 7 | – Mandatory comments for Return / Reject.<br>– GM can view: DEO original entries, TGMSIDC corrections, scanned copy. | Verified indent; Decision | Status update; Notifications; Audit log | E-tool | TGMSIDC GM Equip | TGMSIDC GM Equip | TGMSIDC User | TGMSIDC GM Equip | No |  |
| 7 | Review by SO Equipment | Decision taken in step 6 will be reviewed by SO equipment. <br>Approve → Process moves to Step 8 (auto-routing).<br>Return → sent back to TGMSIDC User (who may return to DEO if facility input needed). Process moves back to "Indent receipt", Step 10.<br>Reject → indent closed with documented reason. Process ends.) | SO Equipment reviews the action taken by GM Equipment. <br>– Status updated: 'Approved' / 'Returned' / 'Rejected'.<br>– Notification to TGMSIDC User, GM Equipment, DEO (HoD) & HoD.<br>– Audit log entry with decision, timestamp, comments.<br>– Mandatory comments for Return / Reject.<br>– SO Equipment can view: DEO original entries, TGMSIDC user corrections, scanned copy. |  | Status update; Notifications; Audit log | E-tool | TGMSIDC SO Equip | TGMSIDC SO Equip | TGMSIDC GM Equip | DEO (HoD) / HoD | Yes |  |
| 8 | Route based on procurement mode | If approved, system auto-routes each equipment line:<br>• RC mode → "Issue PO" (Step 1)<br>• Tender mode → "RC Creation" (Step 1)<br>Process moves to the respective sheet based on procurement mode selected above. | – Create workflow tasks in respective queues.<br>– Parallel routing: different equipment items from same indent can follow different paths simultaneously.<br>– Status per equipment line visible on indent dashboard. | Approved indent with modes | Workflow tasks created in target queues | E-tool | System (auto) | TGMSIDC SO Equip | TGMSIDC GM Equip | DEO (HoD) / HoD/GM Equipment, TGMSIDC User | No | Indent-level status = 'Partially Approved' if some lines go to tender, some to RC. |

### 4.3 Module 3: Rate Contract Creation

Manage technical specification confirmation, end-to-end tender stage tracking, BFC decision, RC pricing/CAMC capture, document evidence, and multi-level RC approval. Actual tender publication and bid activity remains on the approved external e-Procurement/GeM portal; this System tracks the tender reference and internal lifecycle.

| Step | Activity | Detailed Description | System Behaviour / Validation | Inputs | Outputs | Tool | Responsible (R) | Accountable (A) | Consulted (C) | Informed (I) | Decision? | Exception / Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Initiate new RC process | TGMSIDC User navigates to Rate Contract module and clicks 'Add New RC'.<br>Enter... | – Auto-generate draft RC ID: RC-<FY>-<serial>.<br>– Duplicate check: block if ac... | Equipment Master; Indent reference | Draft RC ID; Equipment linked to RC process | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | TGMSIDC SO Equipment | No |  |
| 2 | Check technical specifications availability | System checks whether the equipment is existing (specs available in master) o... | – Existing equipment: Pre-load technical specifications from Equipment Master... | Equipment Master | Specification status determined | E-tool | System (auto) | TGMSIDC User | — | — | Yes |  |
| 3 | Confirm / revise specifications (Existing Equipment) | For existing equipment, technical specifications are pre-loaded from master.<br>... | – Two radio buttons: 'Accepted' / 'Changed'.<br>– Upload field: Signed specifica... | Pre-loaded specs from master; Doctor review | Confirmed/revised specs; Signed document; Approver names | E-tool | TGMSIDC User | TGMSIDC User | Doctors (HoD-assigned) | TGMSIDC GM Equip / HoD | No | Doctors are assigned by the HoD who raised the indent. Their names must be re... |
| 4 | Add new specifications (New Equipment) | For new equipment (not in master), no specifications exist.<br>TGMSIDC User:<br>1. ... | – Specification form: Free-text fields for new equipment specs.<br>– Upload fiel... | Doctor consultation; New equipment requirements | New specifications; Signed document; Approver names | E-tool | TGMSIDC User | TGMSIDC User | Doctors (HoD-assigned) | TGMSIDC GM Equip / HoD | No | New equipment specs will be added to Equipment Master after RC is approved (m... |
| 5 | Technical specifications finalized | Specifications are now finalized (either confirmed, revised, or newly created... | – Status: 'Specs Finalized'.<br>– Specification document linked to RC record.<br>– ... | Finalized specifications | Specs locked; Ready for tendering | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | SO-TGMSIDC | No |  |
| 6 | Enter tender on e-Procurement / GeM portal | TGMSIDC User creates the tender on the external e-Procurement portal or GeM p... | – Tender ref. no. must be unique in our system.<br>– Link tender to the RC draft... | Finalized specs; e-Procurement/GeM portal | Tender record created in our tool; Linked to RC | E-tool + e-Procurement/GeM | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | SO-TGMSIDC | No | Actual tender creation happens on external portal. Our tool tracks the refere... |
| 7 | Stage: Tender Opened | Record that the tender has been activated and opened on the e-Procurement / G... | – Status: 'Tender Opened'.<br>– Timeline tracking begins.<br>– Tender stage progres... | Tender activation on external portal | Tender opening record; Dates captured | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Vendors | No | From this step onwards, tender can be cancelled at any stage → Step 17. |
| 8 | Stage: Pre-bid Queries | Record pre-bid queries stage:<br>1. Were pre-bid queries received? (Yes / No)<br>2.... | – Optional stage: If no queries received, mark as 'No Queries' and proceed.<br>–... | Vendor queries from portal | Pre-bid queries record; Response documents | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Vendors | No |  |
| 9 | Stage: Amendments (if any) | Record any amendments made to the tender document:<br>1. Were amendments made? (... | – Optional stage: If no amendments, mark as 'No Amendments' and proceed.<br>– Up... | Pre-bid feedback; Internal review | Amendment record (if any) | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Vendors | No |  |
| 10 | Stage: Bid Evaluation | All received bids are downloaded from the e-Procurement / GeM platform.<br>Bid e... | – Status: 'Bid Evaluation Stage'.<br>– Numeric fields for bid count.<br>– Date fiel... | Bids from portal | Bid evaluation record | E-tool + e-Procurement/GeM | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | SO-TGMSIDC | No |  |
| 11 | Stage: Demo & Technical Evaluation | Technical committee examines and verifies samples / demos provided by vendors... | – Status: 'Demo & Technical Evaluation Stage'.<br>– Date fields.<br>– Committee mem... | Vendor samples/demos; Finalized specs | Technical evaluation record; Report uploaded | E-tool + Physical | TGMSIDC User | TGMSIDC GM Equip | Technical Committee | Vendors | No | Technical committee composition may vary by equipment type. |
| 12 | Stage: Approved by Technical Committee? | Decision: Is atleast vendor/equipment recommended by the Technical Committee?... | – Decision: 'Yes – Recommended' / 'No – Not Recommended'.<br>– If No: Mandatory ... | Technical evaluation report | Recommendation decision; Approved vendor list (if Yes) | E-tool | Technical Committee | TGMSIDC GM Equip | TGMSIDC User | SO-TGMSIDC / Vendors | Yes |  |
| 13 | Stage: Financial Bid Opening & BFC Agenda Preparation | Financial bids of technically qualified vendors are opened.<br>Matter is placed ... | – Status: 'Financial Bid & BFC Prep Stage'.<br>– Vendor-wise rate entry fields (... | Financial bids from portal | Financial bid record; L1/L2/L3 rates; BFC agenda | E-tool + e-Procurement/GeM | TGMSIDC User | TGMSIDC GM Equip | SO-TGMSIDC,ED-TGMSIDC | Vendors | No |  |
| 14 | Stage: BFC Meeting | BFC meeting is scheduled and conducted.<br><br>Record:<br>1. Tentative BFC date (enter... | – Status: 'BFC Stage'.<br>– Tentative date field (can be entered before meeting)... | BFC agenda; Financial bid comparison | BFC meeting record; Minutes uploaded | E-tool | TGMSIDC GM Equip | ED-TGMSIDC | BFC Members | TGMSIDC User | No |  |
| 15 | Stage: BFC Approved? | Decision: Has the BFC approved the procurement?<br><br>→ If YES: Process moves to S... | – Decision: 'Yes – BFC Approved' / 'No – BFC Rejected'.<br>– If No: Mandatory ca... | BFC proceedings | BFC decision; Approval document (if Yes) | E-tool | BFC | ED-TGMSIDC | TGMSIDC GM Equip | TGMSIDC User / Vendors | Yes |  |
| 16 | Tender Cancellation (at any stage) | If the tender is cancelled at any stage (Steps 7–15), TGMSIDC User must:<br>1. S... | – Tender status: 'Cancelled'.<br>– Mandatory fields: Stage of cancellation (drop... | Cancellation decision; Reason | Cancelled tender record; Audit trail updated | E-tool | TGMSIDC User | TGMSIDC GM Equip | ED-TGMSIDC | HoD | No | Multiple re-tenders for same equipment are tracked in Tender Audit Report. |
| 17 | Enter RC header details | Post BFC approval, enter RC header<br>1. RC reference number (unique: Auto Popul... | – RC ref. no. duplicate check → block if exists.<br>– Validate: End date > Start... | BFC approval; Tender evaluation outcome | RC header record | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | ED-TGMSIDC | No |  |
| 18 | Enter tender reference & bank details | Enter:<br>1. Financial year<br>2. Tender reference no. (already linked from Step 6;... | – Auto-fetch tender data from tender reference.<br>– Validate IFSC format (11-ch... | Tender reference no.; Bank details | Tender & supplier details populated | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | ED-TGMSIDC | No | If tender data not in system, user must upload complete tender evaluation rep... |
| 19 | Enter rate / pricing details | Enter per vendor (L1/L2/L3):<br>1. Rate per unit (excl. tax)<br>2. Tax type (GST)<br>3... | – Auto-calculate: Tax amt = Rate × Tax%.<br>– Auto-calculate: Rate incl. tax = R... | BFC-approved rates; Tender price bid | Pricing details per vendor | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | ED-TGMSIDC | No |  |
| 20 | Enter CAMC details | Enter:<br>1. CAMC applicable? (Yes / No)<br>2. CAMC period (years)<br>3. CAMC rate per... | – Auto-calculate CAMC start date from warranty end.<br>– Validate CAMC period ≤ ... | Warranty period; CAMC terms | CAMC details linked to RC | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | ED-TGMSIDC | No | CAMC terms to be confirmed with vendor before finalization. |
| 21 | Upload supporting documents | Upload:<br>1. Signed contract copy (mandatory)<br>2. Tender evaluation report<br>3. BF... | – File type validation: PDF, JPG, PNG only.<br>– Max file size: 30 MB per file.<br>... | Physical / scanned documents | Documents attached to RC record | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | ED-TGMSIDC | No |  |
| 22 | Submit RC for approval | Submit the completed RC for GM Equipment / ED review.<br><br>Process moves to Step 23. | – Status: 'Pending RC Approval'.<br>– Notification to approver (GM / ED).<br>– RC l... | Complete RC draft | RC in approval queue; notification | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | ED-TGMSIDC | No |  |
| 23 | Proposed to Approve / Return / Reject RC | GM reviews all RC details including tender history, BFC approval, and specs c... | – Status updated & sent to SO Equipment for review | RC draft; Reviewer's assessment | Proposed to Active RC / Returned RC / Rejected RC | E-tool | TGMSIDC GM Equip | TGMSIDC GM Equip | TGMSIDC User | SO-TGMSIDC | No | Approval authority based on RC value threshold (configurable). |
| 24 | Approve / Return / Reject RC | SO Equipment reviews all RC details including tender history, BFC approval, a... | – Status updated.<br>– If Approved: RC visible in RC master for PO generation.<br>–... | RC draft; Reviewer's assessment | Proposed to Active RC / Returned RC / Rejected RC | E-tool | SO-TGMSIDC | TGMSIDC GM Equip | TGMSIDC GM Equip | Vendors, ED | Yes | Approval authority based on RC value threshold (configurable). |

**Tender-channel control:** the e-Procurement/GeM portal remains the system used for tender publication and bid interaction. The TGMSIDC system records the tender reference and tracks the internal tender lifecycle, uploaded evidence, committee decisions, cancellations and re-tender lineage.

### 4.4 Module 4: Rate Contract Management

Provide active/expiring/expired RC visibility, automated expiry alerts, amendment history, renewal/predecessor linkage, and controlled closure.

| Step | Activity | Detailed Description | System Behaviour / Validation | Inputs | Outputs | Tool | Responsible (R) | Accountable (A) | Consulted (C) | Informed (I) | Decision? | Exception / Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Monitor RC dashboard | View consolidated RC dashboard:<br>• Active RCs with remaining validity<br>• RCs expiring in 30 / 60 / 90 days<br>• Expired RCs<br>• RCs by equipment category / vendor<br><br>Process moves to Step 2 (if alert received) or Step 3/4/5 as needed. | – Auto-refresh on page load.<br>– Color-coded: Green (>90d), Amber (30-90d), Red (<30d / expired).<br>– Click any tile to drill down. | RC Master data | Dashboard view | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | ED-TGMSIDC | No |  |
| 2 | Receive automated expiry alerts | System sends alerts for expiring RCs at configurable intervals:<br>• 90 days before expiry<br>• 60 days before<br>• 30 days before<br>• On expiry date<br><br>Process moves to Step 3 (amendment) or Step 4 (renewal) based on action needed. | – Email + in-app notification to TGMSIDC User and GM.<br>– Alert includes: RC ref, equipment, vendor, expiry date, POs issued under this RC. | RC expiry dates | Alert notifications | E-tool | System (auto) | TGMSIDC User | TGMSIDC GM Equip | SO Equipment-TGMSIDC | No | Alert thresholds configurable by admin. |
| 3 | Initiate RC amendment | For changes to an active RC:<br>1. Select RC to amend<br>2. Select amendment type (Rate revision / Extension / Scope change / Vendor details)<br>3. Enter revised details<br>4. Upload supporting documents<br>5. Submit for approval<br><br>Process moves to approval (same workflow as Sheet 3, Step 9). | – Amendment history maintained; original values preserved.<br>– Amendment ref. auto-generated: <RC Ref>-AMD-<serial>.<br>– Same approval workflow as new RC creation. | Active RC; Amendment justification | Amendment request in approval queue | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | ED-TGMSIDC / Vendor | No |  |
| 4 | Initiate RC renewal process | For expired / expiring RCs:<br>1. Evaluate renewal need (check pending indents)<br>2. If renewal needed → initiate new tender<br>3. Create new RC via Sheet 3, Step 1 – link to predecessor RC<br><br>Process moves to → Sheet 3. RC Creation (Step 1) if renewal initiated.<br>Process moves to Step 5 if closure decided. | – System flags indents waiting on expired RC.<br>– If no renewal, pending indents re-routed to open tender path. | Expiring RC; Demand data | New RC (via Sheet 3) or closure decision | E-tool | TGMSIDC GM Equip | TGMSIDC GM Equip | TGMSIDC User | TGMSIDC SO Equip | Yes | If RC not renewed, all indents depending on it get flagged and rerouted. |
| 5 | Deactivate / Close RC | Close an RC when:<br>• Expired and not renewed<br>• Superseded by new RC<br>• Cancelled by authority<br><br>Process ends for this RC. | – Status = 'Closed' or 'Expired'.<br>– Existing POs under this RC remain unaffected.<br>– No new POs can reference this RC.<br>– Closure reason mandatory. | Closure decision; Reason | Closed RC; Updated master | E-tool | TGMSIDC GM Equip | TGMSIDC GM Equip | TGMSIDC User | Vendors & TGMSIDC SO Equip | No |  |

### 4.5 Module 5: Purchase Order Generation

Generate POs from approved indent quantities and valid RCs/local-purchase rules, support L1/L2/L3 allocation, consignee mapping, automated cost/GST calculation, performance security and controlled T&C templates.

| Step | Activity | Detailed Description | System Behaviour / Validation | Inputs | Outputs | Tool | Responsible (R) | Accountable (A) | Consulted (C) | Informed (I) | Decision? | Exception / Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Initiate PO generation | Click 'Generate PO' from the PO module.<br><br>Process moves to Step 2. | – Auto-generate draft PO number: PO-<FY>-<serial>.<br>– PO creation form opens. | — | Draft PO shell | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Respective HoD | No |  |
| 2 | Select financial year | Select the FY during which the PO is being issued.<br><br>Process moves to Step 3. | – Default = current FY.<br>– Validate FY is active. | — | FY selected | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Respective HoD | No |  |
| 3 | Select PO type | Select PO type: RC-based / Local Purchase.<br><br>Process moves to Step 4. | – PO type drives subsequent field requirements and validations. | — | PO type set | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Respective HoD | No |  |
| 4 | Link to approved indent | Select the indent reference number (search option available).<br>Only 'Approved' indents with un-ordered quantities shown.<br><br>Process moves to Step 5. | – Filter: Status = 'Approved', remaining qty > 0.<br>– Auto-populate indent header details.<br>– Show equipment lines pending PO. | Approved indent list | Indent linked to PO | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Respective HoD | No |  |
| 5 | Select equipment from indent | Select equipment line item(s) from the indent for which this PO is being raised.<br>Enter the qty to issue the PO<br>Process moves to Step 6. | – Show only items not fully covered by existing POs.<br>– Display remaining un-ordered quantity. | Indent equipment lines | Equipment lines added to PO | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Respective HoD | No |  |
| 6 | Select PO date | Select the date on which the PO is to be issued.<br><br>Process moves to Step 7. | – Default = today (Can't be modified) | — | PO date set | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Respective HoD | No |  |
| 7 | Verify auto-filled RC details | System auto-fills RC details for selected equipment.<br>Review:<br>• L1, L2, L3 bidder details & rates<br>• RC validity period<br>• Supply & installation period<br><br>Process moves to Step 8. | – Auto-populate from active RC.<br>– Highlight if RC validity < 30 days remaining.<br>– If RC expired → block PO and alert.<br>– Show RC ref. no., vendor details, unit rate. | Active RC data | RC details displayed for review | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Respective HoD | Yes | If RC expired or incorrect, PO cannot proceed until RC is corrected / renewed. |
| 8 | RC details correct? | Decision:<br>• Correct → Process moves to Step 10.<br>• Incorrect → Process moves to Step 9 to modify. | — | — | — | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | — | Yes |  |  |
| 9 | Modify RC details (if needed) | Modify incorrect RC linkage or details in RC master<br>Requires supervisor authorization.<br><br>Process moves back to Step 7 for re-verification. | – Changes logged in audit trail.<br>– Supervisor override required.<br>– After modification → return to Step 7. | RC correction data | Corrected RC linkage | E-tool | TGMSIDC User | TGMSIDC GM Equip | — | — | No |  |
| 10 | Allocate quantity to vendors | Split order quantity across eligible vendors (L1, L2, L3) per RC terms.<br>Save draft.<br><br>Process moves to Step 11. | – Validate: Σ vendor allocations = approved indent qty.<br>– Auto-calculate cost per vendor.<br>– Multiple POs generated if >1 vendor allocated. | RC vendor allocation rules | Vendor-wise quantity split | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Respective HoD | No | One PO per vendor per equipment type. |
| 11 | Enter consignee details | Map quantities to consignees (institutions).<br>Select institution and assign quantity per consignee.<br><br>Process moves to Step 12. | – Validate: Σ consignee qty = vendor allocated qty.<br>– Auto-populate institution address from master.<br>– Allow district-wise grouping. | Institution Master; Indent mapping | Consignee delivery schedule | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Respective HoD | No |  |
| 12 | Review purchase cost details | Auto-populated:<br>A. Rate/unit (excl. tax)<br>B. GST amount<br>C. Rate/unit (incl. tax) = A + B<br>D. Ordered quantity<br>E. Total equipment cost = A × D<br>F. Net PO cost = C × D<br><br>Manual entry:<br>G. File no. / Wing / BME<br>H. Generated by<br>I. Remarks<br><br>Process moves to Step 13. | – All cost fields auto-calculated.<br>– Validate against budget availability (fund deposited − existing PO commitments).<br>– Flag if PO cost exceeds available funds. | RC rates; Indent qty; Fund data | Cost summary; Budget check result | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Respective HoD | No |  |
| 13 | Performance Security required? | Decision:<br>• If PS required → Process moves to Step 14.<br>• If PS not required → Process moves to Step 15. | – Default PS requirement based on PO value threshold (configurable).<br>– PS toggle checkbox. | PO value; PS threshold config | PS decision | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | — | Yes |  |
| 14 | Enter PS percentage | Enter Performance Security % for the PO.<br><br>Process moves to Step 15. | – Auto-calculate PS amount = Net PO cost × PS%.<br>– Validate PS% within allowed range (e.g., 3-10%). | PS % | PS amount calculated | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | — | No |  |
| 15 | Edit PO format, T&C, and annexures | Review and edit:<br>• PO format / cover letter<br>• Terms & Conditions<br>• Annexure I (equipment specs)<br>• Annexure II (consignee list)<br>• Annexure III (delivery schedule)<br><br>Process moves to Step 16. | – Templates pre-loaded from T&C Master based on PO type.<br>– Allow clause-level editing.<br>– Version control on T&C changes.<br>– Standard boilerplate locked; only variable fields editable. | T&C Master templates | Customized PO document | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Respective HoD | No |  |
| 16 | Submit PO for approval | Submit completed PO.<br><br>Process moves to → Sheet 6. PO Approval (Step 1). | – Status: 'Pending PO Approval'.<br>– Notification to GM Equipment.<br>– PO locked from editing.<br>– Submission timestamp recorded. | Complete draft PO | PO in approval queue; notification | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Respective HoD | No |  |

### 4.6 Module 6: PO Approval

Provide GM proposal and SO/ED approval controls, anomaly checking, PO PDF generation, vendor dispatch, acknowledgement tracking and threshold-based escalation.

| Step | Activity | Detailed Description | System Behaviour / Validation | Inputs | Outputs | Tool | Responsible (R) | Accountable (A) | Consulted (C) | Informed (I) | Decision? | Exception / Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Open PO approval queue | Select 'New' POs from PO Status dropdown.<br><br>Process moves to Step 2. | – Dashboard: pending POs with value, vendor, age.<br>– Sort by value / date / urgency.<br>– Aging: Green <3d, Amber 3-5d, Red >5d. | Pending PO list | Filtered PO list | E-tool | TGMSIDC GM Equip | TGMSIDC GM Equip | TGMSIDC User | Respective HoD | No |  |
| 2 | Select PO for review | Enter or select the PO number to open full details.<br><br>Process moves to Step 3. | – Display: PO header, line items, consignees, cost summary, T&C, annexures.<br>– Comparison view: PO vs. Indent vs. RC (side-by-side). | PO number | Full PO detail view | E-tool | TGMSIDC GM Equip | TGMSIDC GM Equip | TGMSIDC User | Respective HoD | No |  |
| 3 | Verify PO details | Verify:<br>• Equipment specs & quantities<br>• RC linkage and rate accuracy<br>• Consignee mapping<br>• Cost calculations & budget<br>• T&C, annexures, PS details<br><br>Process moves to Step 4. | – System highlights anomalies: rate mismatch, budget overrun, missing fields.<br>– Show indent approval comments for context. | PO data; Indent; RC | Verification outcome | E-tool | TGMSIDC GM Equip | TGMSIDC GM Equip | TGMSIDC User | Respective HoD | No |  |
| 4 | Decision: Proposed to Approve / Modify / Reject | • Correct → PO proposed to Approve. <br>• Needs edits → Proposed to Return for Modification. <br>• Fundamentally flawed → Proposed to Reject. Process moves to Step 5. | — | — | — | E-tool | TGMSIDC GM Equip | TGMSIDC GM Equip | TGMSIDC User | TGMSIDC SO Equipment | Yes |  |
| 5 | Decision: Approve / Modify / Reject | • Correct → Approve. Process moves to Step 6.<br>• Needs edits → Return for Modification. Process moves to Step 7.<br>• Fundamentally flawed → Reject. Process moves to Step 8. | — | — | — | E-tool | TGMSIDC SO Equipment | TGMSIDC SO Equipment | TGMSIDC GM Equip | Respective HoD/TGMSIDC user |  |  |
| 6 | Approve PO | Approve the PO. PO becomes active.<br><br>Process moves to Step 9. | – Status: 'Approved / Active'.<br>– PO PDF auto-generated.<br>– Notification to vendor, consignees, HoD.<br>– Delivery timeline initiated based on RC supply period. | Approval decision | Active PO; PDF generated; Notifications | E-tool | TGMSIDC SO Equipment | ED-TGMSIDC | TGMSIDC User | HoD / Vendor | No | ED approval required above a PO value threshold configurable by Admin; default set during implementation. Below threshold, SO Equipment is the final approver. |
| 7 | Return PO for modification | Return to PO creator with comments specifying changes.<br><br>Process moves back to → Sheet 5. Issue PO (Step 1) for corrections. | – Status: 'Returned for Modification'.<br>– Comments mandatory.<br>– Notification to creator.<br>– Modification history tracked. | Return comments | PO back in creator's queue | E-tool | TGMSIDC SO Equipment | TGMSIDC GM Equip | TGMSIDC User | — | No |  |
| 8 | Reject PO | Reject PO with documented reason. PO is closed.<br>Indent may need fresh PO generation.<br><br>Process ends for this PO. | – Status: 'Rejected'.<br>– Mandatory rejection reason.<br>– Notification to creator, HoD.<br>– Indent line item qty freed for re-ordering. | Rejection reason | Closed PO; Freed indent qty | E-tool | TGMSIDC SO Equipment | TGMSIDC GM Equip | TGMSIDC User | Respective HoD | No |  |
| 9 | Vendor receives & acknowledges PO via Vendor Portal | System sends approved PO to vendor electronically.<br>Vendor receives PO notification on Vendor Portal:<br>1. View full PO details<br>2. Download PO PDF<br>3. Acknowledge PO acceptance on portal<br>4. Enter expected dispatch date<br>5. Raise queries / clarifications (if any)<br><br>Process moves to → Sheet 8. Delivery & Receipt (Step 1). | – Auto-email + Vendor Portal notification with PO PDF.<br>– PO appears in vendor's 'New POs' dashboard.<br>– Vendor must acknowledge within 7 calendar days.<br>– Acknowledgement recorded with timestamp.<br>– If no acknowledgement in 7 days → escalation alert.<br>– Expected dispatch date captured for delivery tracking.<br>– Vendor can raise clarification requests via portal. | Approved PO PDF; Vendor Portal notification | Vendor acknowledgement; Expected dispatch date | E-tool | Vendor | TGMSIDC User | TGMSIDC SO Equipment | TGMSIDC User / Consignee | No | Vendor must acknowledge within 7 days. If clarification raised, PO status → 'Clarification Pending'. |

**Vendor Portal hand-off:** after approval, the PO PDF is made available to the vendor; acknowledgement is captured with timestamp and expected dispatch date. Unacknowledged POs are escalated as per SLA.

### 4.7 Module 7: PO Amendment & Cancellation

Support version-controlled PO amendments and cancellations with approval, preserved history, revised PO generation, notification, and release of unutilised indent quantities.

| Step | Activity | Detailed Description | System Behaviour / Validation | Inputs | Outputs | Tool | Responsible (R) | Accountable (A) | Consulted (C) | Informed (I) | Decision? | Exception / Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Identify amendment / cancellation need | Reasons may include:<br>• Quantity change (increase / decrease)<br>• Consignee change<br>• Delivery date extension<br>• Full cancellation<br><br>Process moves to Step 2. | – System shows amendment options based on PO status.<br>– Block amendments for fully delivered / closed POs.<br>– Amendment allowed only for 'Active' / 'Partially Delivered' POs. | PO data; Amendment justification | Amendment type identified | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Vendor / HoD | No |  |
| 2 | Create amendment request | Select PO to amend. Enter:<br>1. Amendment type<br>2. Revised details (e.g., new qty, new date)<br>3. Justification / reason<br>4. Upload supporting documents<br><br>Process moves to Step 3. | – Auto-generate amendment ref: <PO No.>-AMD-<serial>.<br>– Original PO values preserved in history.<br>– Amendment linked to parent PO. | Amendment details; Supporting docs | Amendment request | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Vendor / HoD | No |  |
| 3 | Submit amendment for approval | Submit to SO Equipment for review.<br><br>Process moves to Step 4. | – Status: 'Amendment Pending Approval'.<br>– Notification to approver. | Amendment request | Amendment in approval queue | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC SO Equip | — | No |  |
| 4 | Approve / Reject amendment | SO Equipment reviews and decides.<br>• Approve → PO updated with amended values; revised PO PDF sent to vendor. Process ends (PO updated).<br>• Reject → original PO continues unchanged. Process ends (no change). | – If approved: PO version incremented (v2, v3…).<br>– Revised PO PDF auto-generated.<br>– Vendor & consignee notified.<br>– If rejected: reason logged. | Amendment request; Reviewer's assessment | Updated PO (if approved) / Unchanged PO | E-tool | TGMSIDC GM Equip | ED-TGMSIDC | TGMSIDC User | Vendor / HoD | Yes | Financial amendments above value threshold need ED approval. |
| 5 | PO Cancellation (if applicable) | For full cancellation:<br>1. Enter cancellation reason (mandatory)<br>2. Upload supporting document<br>3. Submit for approval<br>4. On approval → PO status = 'Cancelled'<br><br>Process ends for this PO. | – Status: 'Cancelled'.<br>– Indent qty freed for re-ordering.<br>– Vendor notified.<br>– Audit trail of cancellation.<br>– If partial delivery already received, cancel only remaining qty. | Cancellation justification; Supporting doc | Cancelled PO; Freed indent qty; Vendor notification | E-tool | TGMSIDC GM Equip | ED-TGMSIDC | TGMSIDC User | Vendor / HoD | Yes | Cancellation post partial delivery requires reconciliation of received vs. cancelled qty. |

### 4.8 Module 8: Delivery & Receipt

Track vendor dispatch and delivery, consignee receipt, serial numbers, discrepancies, photographic evidence, Delivery Completion Certificate collection/upload, and QA routing.

| Step | Activity | Detailed Description | System Behaviour / Validation | Inputs | Outputs | Tool | Responsible (R) | Accountable (A) | Consulted (C) | Informed (I) | Decision? | Exception / Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Monitor delivery schedule | Track expected deliveries:<br>• POs with upcoming delivery due dates<br>• Overdue deliveries<br>• Deliveries completed today<br><br>Process moves to Step 2 when vendor intimates delivery. | – Dashboard: due this week / month / overdue.<br>– Auto-reminders to vendor at T-7, T-3, T-1 days.<br>– Overdue alerts to TGMSIDC team. | PO delivery dates | Delivery tracking dashboard | E-tool | TGMSIDC User | TGMSIDC User | TGMSIDC GM Equip | Vendor / Consignee | No |  |
| 2 | Record vendor delivery intimation | Vendor notifies upcoming delivery via vendor portal<br>Enter:<br>1. PO reference number<br>2. Expected delivery date<br>3. Delivery challan / invoice number<br>4. Transporter details<br><br>Process moves to Step 3. | – Link delivery to PO.<br>– Auto-generate Delivery Tracking ID.<br>– Notify consignee of expected arrival. | Vendor intimation | Delivery record; Consignee notification | E-tool | Vendor | Vendor | Vendor | TGMSIDC User | No |  |
| 3 | Vendor confirms equipment dispatch | Vendor confirms dispatch via Vendor Portal.<br>Enter:<br>1. PO reference number<br>2. Dispatch date<br>3. Expected delivery date at consignee<br>4. Transporter details (name, vehicle no., LR/GR no.)<br>5. Invoice / Delivery challan number<br>6. Dispatch quantity & item details<br><br>Process moves to Step 4. | – Vendor updates dispatch status on Portal.<br>– Auto-generate Dispatch Tracking ID.<br>– Auto-notification to Consignee & TGMSIDC User.<br>– Status: 'Dispatched – In Transit'. | PO reference; Dispatch details | Dispatch record; Notifications | E-tool | Vendor | Vendor | TGMSIDC User | Consignee / TGMSIDC User | No | If vendor fails to update dispatch within 2 days, system flags 'Dispatch Unreported'. |
| 4 | Receive equipment at consignee site | Consignee receives physical delivery.<br>Perform immediate checks:<br>1. Compare delivery against challan<br>2. Count quantity received<br>3. Visual inspection for transit damage<br><br>Process moves to Step 5. | – Consignee logs receipt in system (or TGMSIDC User on behalf).<br>– Upload: delivery challan photo, unboxing photos.<br>– Receipt timestamp auto-recorded. | Physical delivery; Challan | Receipt entry in system | E-tool | Consignee | Consignee | TGMSIDC User | TGMSIDC GM Equip | No | If consignee lacks system access, TGMSIDC User enters on their behalf. |
| 5 | Record detailed receipt information | Enter:<br>1. Actual delivery date<br>2. Quantity received<br>3. Equipment serial numbers (per unit)<br>4. Condition: Good / Damaged / Shortage<br>5. Upload photos of received equipment<br><br>Process moves to Step 6. | – Validate: Qty received ≤ PO ordered qty.<br>– Auto-calculate: On-time or Late.<br>– Auto-calculate delay in days if late. | Physical inspection; Serial nos. | Delivery receipt record | E-tool | Consignee | TGMSIDC User | TGMSIDC GM Equip | Vendor | No |  |
| 6 | Delivery matches PO specifications? | System auto-compares receipt vs. PO:<br>• Correct equipment model & specs?<br>• Correct quantity?<br>• No damage?<br><br>→ Yes: Process moves to Step 8 (Delivery Certificate).<br>→ No: Process moves to Step 7 (Log discrepancy). | – Auto-comparison: Receipt vs. PO line items.<br>– Highlight mismatches in red. | Receipt data; PO data | Match / Mismatch result | E-tool | Consignee | TGMSIDC User | TGMSIDC GM Equip | Vendor / Consignee | Yes |  |
| 7 | Log delivery discrepancy | Record discrepancy:<br>1. Type: Short delivery / Wrong item / Damaged<br>2. Detailed description<br>3. Photographic evidence (mandatory)<br>4. Action required: Re-delivery / Replacement<br><br>After resolution → Process moves to Step 8. | – Discrepancy notification auto-sent to vendor.<br>– Keep the PO/item in unresolved discrepancy status and prevent closure; actual payment processing/disbursement remains outside the System.<br>– Escalation if unresolved in 15 days.<br>– Discrepancy linked to vendor performance score. | Discrepancy details; Photos | Discrepancy record; Vendor notification | E-tool | TGMSIDC User | TGMSIDC GM Equip | Vendor | HoD / Consignee | No | Vendor response SLA: 7 working days. Auto-escalation at Day 8. |
| 8 | Vendor obtains Delivery Completion Certificate from Institute | After successful delivery (or discrepancy resolution), vendor obtains a Delivery Completion Certificate from the consignee institute.<br>Certificate includes:<br>1. PO reference number<br>2. Equipment details (model, serial nos., quantity)<br>3. Date of delivery<br>4. Condition of equipment<br>5. Authorized signatory & Institute stamp<br><br>Process moves to Step 9. | – System prompts vendor to collect certificate.<br>– Certificate template available on Vendor Portal.<br>– Status: 'Awaiting Delivery Certificate'.<br>– Auto-reminder at Day 3, Day 5 if not uploaded. | Satisfactory delivery; Institute authorization | Signed Delivery Completion Certificate | E-tool | Vendor | Vendor | Consignee (Institute) | TGMSIDC User | No | Institute must issue certificate within 3 working days. Vendor can raise grievance if delayed. |
| 9 | Vendor uploads Delivery Completion Certificate via Vendor Portal | Vendor uploads signed certificate through Vendor Portal.<br>1. Scanned copy (PDF/Image)<br>2. PO reference (auto-populated)<br>3. Delivery Tracking ID (auto-populated)<br>4. Date of certificate issuance<br>5. Remarks (if any)<br><br>Process moves to Step 10. | – Upload: PDF/JPG/PNG, max 30 MB.<br>– Validate: PO ref & Delivery Tracking ID match.<br>– Certificate linked to PO, Delivery & Receipt records.<br>– Status: 'Delivery Certificate Uploaded'.<br>– Auto-notification to TGMSIDC User with certificate preview. | Signed certificate (scan); PO reference | Certificate record; TGMSIDC notification | E-tool | Vendor | Vendor | TGMSIDC User | TGMSIDC User / GM Equip | No | Vendor must upload within 7 working days. If not, system blocks further processing and escalates. |
| 10 | Route to QA & Acceptance | After Delivery Certificate is uploaded and verified, move to QA.<br><br>Process moves to → Sheet 9. QA & Acceptance (Step 1). | – Status: 'Pending QA Inspection'.<br>– Notification to QA committee / technical team.<br>– QA inspection due date = receipt date + 7 working days.<br>– Delivery Certificate must be uploaded before QA routing. | Receipt record; Uploaded certificate | QA task created | E-tool | System (auto) | TGMSIDC User | TGMSIDC GM Equip | Consignee / QA team | No |  |

### 4.9 Module 9: Quality Assurance & Acceptance

Support QA committee assignment, specification-derived inspection checklists, functional testing, accept/conditional/reject decisions, installation/training, warranty initiation, and manual Paid/Not-Paid status only.

**Payment boundary within this module:** QA acceptance may notify Accounts/Finance and expose the manual Paid/Not-Paid status field. It shall not initiate or execute an invoice/payment workflow, matching, treasury processing or disbursement.

| Step | Activity | Detailed Description | System Behaviour / Validation | Inputs | Outputs | Tool | Responsible (R) | Accountable (A) | Consulted (C) | Informed (I) | Decision? | Exception / Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Assign QA / inspection committee | Assign inspection committee:<br>• Technical expert (domain specialist)<br>• End-user representative (from consignee institution)<br>• TGMSIDC representative<br><br>Process moves to Step 2. | – Committee assignment notification.<br>– Inspection due date = receipt date + 7 working days.<br>– Composition may vary by equipment value / type. | Receipt record; Equipment type | Committee assigned; Inspection scheduled | E-tool | TGMSIDC GM Equip | TGMSIDC GM Equip | TGMSIDC User | Consignee / Committee | No |  |
| 2 | Conduct physical inspection | Committee inspects:<br>1. Physical condition & completeness<br>2. Specification compliance (vs. PO / RC specs)<br>3. Accessories & documentation present<br>4. Installation readiness<br><br>Process moves to Step 3. | – Auto-generate inspection checklist from PO specs.<br>– Record finding per parameter (Pass / Fail / NA).<br>– Upload inspection photos. | Equipment; PO specs; Checklist | Inspection findings per parameter | E-tool / Physical | QA Committee | TGMSIDC GM Equip | TGMSIDC User | Consignee / Vendor | No |  |
| 3 | Conduct functional / performance testing | Test equipment:<br>1. Power-on & basic operation<br>2. Performance against declared specs<br>3. Safety checks<br>4. Calibration verification (if applicable)<br>5. Demo / test run<br><br>Process moves to Step 4. | – Record test results per parameter.<br>– Upload test certificates / calibration reports.<br>– Note deviations from expected specs. | Equipment; Test protocol | Test results; Certificates uploaded | E-tool / Physical | QA Committee | TGMSIDC GM Equip | TGMSIDC User | Consignee / Vendor | No | Vendor technical support may be required during testing. |
| 4 | Record QA findings & score | Enter consolidated results:<br>1. Overall status: Pass / Fail / Conditional<br>2. Parameter-wise Pass/Fail<br>3. Observations & remarks<br>4. Upload signed inspection report<br><br>Process moves to Step 5. | – Auto-score: % parameters passed.<br>– Generate inspection certificate (draft).<br>– All committee members must sign off. | Inspection & test findings | QA report; Draft certificate | E-tool | QA Committee | TGMSIDC GM Equip | TGMSIDC User | Consignee / Vendor | No |  |
| 5 | Decision: Accept / Conditional / Reject | • Accept → Process moves to Step 6.<br>• Conditional → Process moves to Step 7.<br>• Reject → Process moves to Step 8. | — | — | — | QA Committee | TGMSIDC GM Equip | TGMSIDC User | Consignee / Vendor / HoD | Yes |  |  |
| 6 | Accept equipment | Issue acceptance certificate. Triggers:<br>• Equipment installed & added to institution inventory register<br>• Warranty period starts<br>• Accounts/Finance notified to maintain the manual Paid/Not-Paid PO status<br>• Installation scheduling (if applicable)<br><br>If installation required → Process moves to Step 9.<br>If no installation → Process ends (equipment in service). | – Status: 'Accepted'.<br>– Auto-generate acceptance certificate (PDF).<br>– Update equipment inventory register.<br>– Notify Accounts/Finance for manual Paid/Not-Paid status maintenance; actual payment processing/disbursement remains outside the System.<br>– Warranty start date: for equipment NOT requiring installation = acceptance date; for equipment requiring installation = final acceptance (post-installation) date (see Step 9).<br>– TGMSIDC User / Accounts marks PO Payment Status = Paid / Not Paid (manual toggle). This is the only payment data captured in the system; actual disbursement is handled outside the system (PFMS / Treasury). | QA approval | Acceptance certificate; Inventory updated; Manual payment-status update prompt | E-tool | TGMSIDC GM Equip | ED-TGMSIDC | TGMSIDC User | Consignee / Vendor / Accounts | No | Payment Status is a manual Paid/Not-Paid flag only; payment processing/disbursement is out of system scope. |
| 7 | Conditional acceptance – vendor rectification | Notify vendor of deficiencies.<br>Vendor must rectify / replace within defined timeline.<br><br>After rectification → Process moves back to Step 2 (re-inspection). | – Deficiency notice auto-generated and sent to vendor.<br>– Rectification SLA: 15 working days.<br>– Auto-escalation if SLA breached. | Deficiency list | Vendor notification; Rectification tracked | E-tool | TGMSIDC User | TGMSIDC GM Equip | Vendor | Consignee / HoD | No | If vendor fails to rectify within 30 days, escalate to LD / cancellation. |
| 8 | Reject equipment | Issue rejection notice with documented reasons.<br>Vendor to collect rejected equipment.<br>Triggers:<br>• Replacement delivery required<br>• Vendor performance debit<br>• LD computation if repeated failure<br><br>Process moves back to → Sheet 8. Delivery & Receipt (Step 1) for replacement delivery tracking. | – Status: 'Rejected'.<br>– Rejection notice to vendor (auto-email).<br>– PO remains open for replacement.<br>– Vendor performance score updated (penalty). | Rejection decision; Reasons | Rejection notice; PO open for replacement; Vendor score updated | E-tool | TGMSIDC GM Equip | ED-TGMSIDC | TGMSIDC User | Consignee / Vendor / HoD | No | If vendor fails to replace within 30 days → initiate LD / PO cancellation. |
| 9 | Installation & training (if applicable) | For equipment requiring installation:<br>1. Schedule installation with vendor<br>2. Record installation date & sign-off<br>3. Conduct user training<br>4. Obtain training attendance & sign-off<br>5. Final acceptance post-installation<br><br>Process ends (equipment in service). | – Installation status tracked (Pending / Scheduled / Complete).<br>– Training attendance list uploaded.<br>– Final acceptance certificate post installation.<br>– Warranty start date = final acceptance (post-installation) date for equipment requiring installation. | Vendor installation plan; Equipment | Installation complete; Training done; Final acceptance | E-tool / Physical | Vendor | TGMSIDC User | Consignee / TGMSIDC GM Equip | HoD | No | Installation period as per RC supply & installation terms. |

### 4.10 Module 10: Master Data Management

The Master Data Management module is the controlled configuration foundation for the transaction lifecycle. Changes should be role-controlled, auditable, and where applicable approval-driven. Excel bulk upload may be used for approved master-data migration and controlled mass maintenance.

| # | Master List | Key Fields | Maintained By | Update Frequency | Used In Modules |
| --- | --- | --- | --- | --- | --- |
| 1 | Equipment Master | Equipment ID, Name, Facility Type (Medical College / Hospital / PHC etc.), Category, Department, HSN Code, Specifications Template, Cost/unit, Active (Y/N) | TGMSIDC Admin | As needed (GM approval for additions) | Indent, RC, PO, QA |
| 2 | Institution Master | Institution ID, Name, Facility Type (Medical College / Hospital / PHC etc.), District, Full Address, Contact Person, Phone, Email | TGMSIDC Admin | Annually / As needed | Indent, PO (consignee), Delivery |
| 3 | Vendor Master | Vendor ID, Company Name, GSTIN, PAN, Registered Address, Contact Person, Phone, Email, Bank Details, Performance Score, Portal Login ID, Portal Status (Active/Inactive), Last Login Date, Notification Preferences (Email/Portal/Both) | TGMSIDC Admin | As needed (post tender) | RC, PO, Delivery, QA, Vendor Portal |
| 4 | Account Head Master | Account Head ID, Name, Description, Budget Code, Active (Y/N) | TGMSIDC Admin | Annually | Indent |
| 5 | Programme Master | Programme ID, Name, Funding Source (linked), Validity Period, Budget Allocation | TGMSIDC Admin | Annually | Indent |
| 6 | Funding Source Master | Source ID, Name, Type (State / Central / Externally Aided), Description | TGMSIDC Admin | As needed | Indent (via Programme) |
| 7 | Indent Type Master | Type ID, Name (Letter, GO, Proceeding, etc.), Description | TGMSIDC Admin | Rarely | Indent |
| 8 | Authority Master | Authority ID, Name, Designation, Department, Contact Details, Approval Level | TGMSIDC Admin | As needed | Indent, Approval workflows |
| 9 | District Master | District ID, District Name, State, Region / Zone | System (static) | Rarely | Institution linkage |
| 10 | Tax / GST Slab Master | Tax Type, GST Slab %, IGST / CGST+SGST rates, HSN range, Effective Date | TGMSIDC Admin | As per govt. notification | RC, PO (cost calculation) |
| 11 | T&C Template Master | Template ID, PO Type, Clause List (editable / locked flags), Version, Effective Date | TGMSIDC Admin | As needed | PO (T&C, Annexures) |
| 12 | User & Role Master | User ID, Full Name, Role (Admin / TGMSIDC User / GM / ED / DEO (HoD) / Consignee / Vendor Portal), HoD Mapping (for DEO role), Module Access, Status (Active / Inactive) | System Admin | As needed | All modules (access control), Vendor Portal, DEO indent entry |

### 4.11 Module 11: Reports & Analytics

The process book defines **15 reports** and **12 KPI dashboard measures**. Reports must support role-based access, filters, drill-downs and Excel/PDF export as specified. Any payment-related field is limited to the manually maintained Paid/Not-Paid PO status; no payment transaction data is generated by the System.

#### 4.11.1 Configurable Reports

| # | Report Name | Req. § | Objective | Key Data Points / Columns | Filters | Drill-Down | Export | Refresh | Primary User |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Procurement Pipeline Report | 3.2.1 | End-to-end view of all indents across procurement stages | Indent Ref, Equipment, Institution, Current Stage, Days in Stage, Next Action Owner, Procurement Mode | FY, Date range, Authority, Equipment category, Institution / District, Stage, Status | Click indent → full indent journey; Click stage → items at that stage | Excel, PDF | Daily / On-demand | SO/ GM / ED |
| 2 | Indent Aging Report | 3.2.1 | Identify bottlenecks by analyzing how long indents stay at each stage | Indent Ref, Stage, Date Entered Stage, Days in Stage, SLA Target, SLA Status (Met / Breached), Owner | FY, Date range, Stage, SLA status (Met/Breached), Authority, Facility | Click indent → detail; Click stage → aging distribution chart | Excel, PDF | Daily / On-demand | SO/ GM / ED |
| 3 | Vendor Performance Report | 3.2.2 | Evaluate vendors on delivery timeliness, quality, and contractual compliance | Vendor Name, # POs, On-time Deliveries, Late Deliveries, On-time %, QA Pass Rate, Rejection Count, Avg Delay (days), Compliance Score | Vendor, Date range, Equipment category, FY | Click vendor → PO-wise detail; Click equipment → vendor comparison | Excel, PDF | Daily / On-demand | SO/ GM / ED |
| 4 | Equipment Status / Inventory Report | 3.2.3 | Complete inventory of procured equipment with location and lifecycle data | Equipment Name, Serial No., PO Ref, Vendor, Institution, District, Delivery Date, Installation Date, Warranty Expiry, CAMC Status, Current Status (Active / Under Repair / Decommissioned), Equipment Age | Equipment category, Institution, District, Status, Warranty status, Age range, Date range | Click equipment → full procurement history; Click institution → all equipment there | Excel, PDF | Monthly / On-demand | SO/ GM / Consignee |
| 5 | RC Expiry & Renewal Status Report | 3.2.4 | Track RC lifecycle: active, expiring, expired; support renewal planning | RC Ref, Equipment, Vendor(s), Start, End, Days to Expiry, Status (Active / Expiring / Expired), # POs Issued, Total Value, Renewal Action Needed | Status, Equipment, Vendor, Expiry window (30/60/90d), FY | Click RC → full detail + PO history; Click vendor → all RCs with vendor | Excel, PDF | Weekly | SO/ GM / ED |
| 6 | PO Status Tracker | 3.2.1 | Track all POs from creation through delivery/QA/closure, including the manually maintained Paid/Not-Paid status. | PO No., Indent Ref, Equipment, Vendor, PO Date, PO Value, Delivery Status, QA Status, Payment Status, PO Age | PO status, Vendor, Date range, FY, Equipment, Value range, Consignee | Click PO → full PO detail + delivery timeline; Click vendor → all POs | Excel, PDF | Daily / On-demand | User / GM / SO |
| 7 | Budget Utilisation Report | 3.2.1 | Track fund sanction/deposit and PO commitments across programmes/account heads without performing payment processing. | Programme, Account Head, Fund Sanctioned, Fund Deposited, PO Value (Committed), Balance Available, Utilisation %, Manual Paid/Not-Paid PO status (where required) | FY, Programme, Account Head, Authority, Date range | Click programme → indent-wise breakdown; Click account head → PO detail | Excel, PDF | Monthly | GM / ED / Finance |
| 8 | Delivery Compliance Report | 3.2.2 | Track delivery SLA compliance and discrepancy resolution | PO Ref, Vendor, Expected Date, Actual Date, Delay (days), Discrepancy Type, Resolution Status, Resolution Time | Vendor, Date range, On-time/Late, Discrepancy status | Click PO → delivery detail; Click vendor → delivery trend | Excel, PDF | Weekly | SO/ GM |
| 9 | QA & Acceptance Summary | 3.2.2 | Quality inspection results and acceptance trends | Equipment, Vendor, PO Ref, Inspection Date, Result (Accept/Conditional/Reject), Issues Found, Resolution Status, Resolution Time | Vendor, Equipment, QA result, Date range, Institution | Click entry → inspection report; Click vendor → QA trend chart | Excel, PDF | Monthly | SO/ GM / QA Committee |
| 10 | SLA Compliance Dashboard | 3.2.1 | Process efficiency metrics across all stages | Stage, Total Items, Within SLA, SLA Breached, Compliance %, Avg Processing Time, Max Pending Item, Owner | Stage, Date range, FY, Owner | Click stage → breached items with owner details | Dashboard | Real-time | SO/ GM / ED |
| 11 | Vendor PO Summary Report (Vendor Portal) | 3.2.5 | Vendor self-service view of own POs, acknowledgement, dispatch, delivery, QA/certificate status and manual Paid/Not-Paid status. | PO No., Equipment, PO Date, PO Value, Acknowledgement Date, Dispatch Date, Delivery Date, QA Status, Certificate Status, Payment Status, PO Age, Fulfilment Status | FY, Date range, PO status, Equipment category | Click PO → full PO detail + delivery timeline + certificate status | Excel, PDF | Real-time | Vendor |
| 12 | Vendor Delivery & Certificate Status Report (Vendor Portal) | 3.2.5 | Track all deliveries by vendor: dispatch status, delivery dates, certificate upload status, overdue items | PO Ref, Equipment, Dispatch Date, Expected Delivery, Actual Delivery, On-time/Late, Delay (days), Certificate Uploaded (Y/N), Certificate Date, Upload Deadline, Overdue Flag | Date range, Delivery status, Certificate status, On-time/Late | Click delivery → dispatch details + receipt record + certificate preview | Excel, PDF | Real-time | Vendor |
| 13 | Vendor Performance Self-View Report (Vendor Portal) | 3.2.5 | Vendor's own performance scorecard: on-time delivery %, QA pass rate, discrepancy count, overall score, trend over time | Period, # POs, # Deliveries, On-time %, Late %, Avg Delay (days), QA First-Pass %, Discrepancy Count, Rectification Time (avg), Overall Score, Score Trend (6-month) | FY, Date range, Equipment category | Click metric → PO-wise breakdown; Click period → monthly trend chart | PDF | Monthly | Vendor |
| 14 | DEO Data Quality / Indent Accuracy Report | 3.2.6 | Track data entry quality by DEO: correction rates, error types, write-in frequency, accuracy trends | DEO Name, HoD, # Indents Entered, # Fields Corrected by TGMSIDC, Correction Rate %, Common Error Fields, # Write-in Entries, Write-in Resolution Rate, Accuracy Score, Trend (6-month) | HoD, DEO, FY, Date range | Click DEO → indent-wise correction detail; Click HoD → all DEOs comparison | Excel, PDF | Monthly | TGMSIDC GM / Admin |
| 15 | Tender Audit Report | 3.2.7 | Complete audit trail of all tenders per equipment — tracks tender history including cancellations, re-tenders, and approvals | Equipment Name, Equipment Category, Tender Ref No, Tender Date, Tender Type (Open/Limited/GeM), Current Stage, Status (Active/Cancelled/Approved), If Cancelled: Stage of Cancellation, Reason for Cancellation, Re-tender Ref (if applicable), BFC Approval Date (if approved), RC Ref (if RC created), Total Tender Duration (days) | Equipment, FY, Status (Active/Cancelled/Approved), Tender type, Date range, Portal (e-Procurement/GeM) | Click equipment → all tenders for that equipment (chronological); Click tender → full stage-wise detail with dates and documents; Click cancelled → cancellation reason and stage | Excel, PDF | On-demand / Weekly | TGMSIDC GM / ED |

#### 4.11.2 KPI Dashboard Specifications

| # | KPI Name | Calculation Logic | Target | Display Type | Owner |
| --- | --- | --- | --- | --- | --- |
| # | KPI Name | Calculation Logic | Target | Display Type | Owner |
| 1 | Avg Indent-to-PO Cycle Time | Mean(PO Approval Date − Indent Receipt Date) | ≤ 15 working days | Gauge + Trend line | SO/ GM / ED |
| 2 | Avg PO-to-Delivery Cycle Time | Mean(Delivery Date − PO Dispatch Date) | ≤ RC supply period | Gauge + Trend line | SO/ GM |
| 3 | Indent Approval Rate | (Approved Indents / Total Submitted) × 100 | ≥ 90% | Percentage tile | SO/ GM / ED |
| 4 | On-time Delivery Rate | (On-time Deliveries / Total Deliveries) × 100 | ≥ 85% | % tile + Vendor bar chart | SO/ GM |
| 5 | QA First-Pass Acceptance Rate | (Accepted on 1st Inspection / Total Inspected) × 100 | ≥ 90% | % tile + Trend | SO/ GM / QA |
| 6 | Active RC Coverage | (Equipment types with Active RC / Total Equipment types) × 100 | ≥ 80% | Percentage tile | SO/ GM / ED |
| 7 | Budget Utilisation Rate | (Committed + Spent / Sanctioned) × 100 | Per programme target | Bar chart by programme | ED / Finance |
| 8 | Pending Actions (by stage) | Count of items pending action, grouped by stage | Minimize | Stage-wise bar chart | SO/ GM / ED |
| 9 | SLA Compliance Rate | (Items within SLA / Total Items) × 100, by stage | ≥ 95% | Stage-wise % bars | SO/ GM / ED |
| 10 | Vendor Performance Score | Weighted: On-time delivery (40%) + QA pass rate (35%) + Contractual compliance (25%) | ≥ 80 / 100 | Vendor scorecard | SO/ GM / ED |
| 11 | Vendor PO Acknowledgement Rate | (POs Acknowledged within SLA / Total POs Dispatched to Vendor) × 100 | ≥ 95% | % tile + Trend line | SO/ GM / Vendor |

---

## 5. Vendor Portal — Cross-Cutting Functional Layer

The Vendor Portal is a self-service layer across **PO Approval, Delivery & Receipt, and Quality Assurance & Acceptance**. It does not provide tender bid submission; tender activity remains on the approved government procurement portal.

| Capability | Detailed Scope | Core Validation / Control |
| --- | --- | --- |
| PO notification & acknowledgement | Vendor receives PO notification on portal; views PO details, downloads PDF, a... | Acknowledgement within 7 days; escalation if unacknowledged; clarification re... |
| Dispatch intimation & tracking | Vendor updates dispatch status: dispatch date, transporter details, challan n... | Dispatch linked to PO; auto-generate Dispatch Tracking ID; status 'In Transit' |
| Delivery Completion Certificate upload | Vendor uploads signed Delivery Completion Certificate (PDF/JPG/PNG); system v... | Upload within 7 working days; max 30 MB; certificate linked to PO, delivery &... |
| Vendor PO dashboard & reports | Vendor self-service dashboard: POs issued, POs acknowledged, POs fulfilled, p... | Vendor sees only own POs; real-time data; filterable by FY, date range, statu... |
| Vendor performance self-view | Vendor can view own performance score: on-time delivery %, QA first-pass rate... | Read-only; score calculated by system; vendor cannot modify; shows trend over... |
| Vendor grievance & clarification module | Vendor can raise queries on PO terms, report institute delays in certificate ... | Auto-routed to TGMSIDC User; SLA: 3 working days response; escalation to GM i... |
| Vendor notification centre | Centralized notification inbox: PO issuance, acknowledgement reminders, dispa... | In-app + email notifications; configurable preferences per vendor; read/unrea... |

### 5.1 Vendor Portal Access Boundaries

- Vendor users see only their own POs, deliveries, certificates, performance information, grievances and notifications.
- Vendor actions are timestamped and included in the audit trail.
- PO acknowledgement target: 7 calendar days from PO issue.
- Dispatch intimation target: within 2 working days from actual dispatch.
- Delivery Completion Certificate upload target: within 7 working days from delivery.
- Vendor performance self-view is read-only; the vendor cannot alter calculated scores.
- Payment information exposed to the vendor, if enabled, is limited to the manual Paid/Not-Paid PO status.

---

## 6. Workflow Status Model

| Stage | Possible Statuses | Status Trigger | Next Stage |
| --- | --- | --- | --- |
| Indent | Draft (DEO) → Pending TGMSIDC Review → Returned by TGMSIDC (to DEO) → Pending Approval (SO queue) → Approved / Returned / Rejected | DEO submits → TGMSIDC reviews/edits/forwards → SO Equipment approves/returns/rejects | If Approved → RC check / PO<br>If Returned by SO → TGMSIDC User (who may return to DEO)<br>If Returned by TGMSIDC → DEO re-edits and re-submits<br>If Rejected → Closed |
| Rate Contract | Draft → Specs Confirmation (Accepted/Changed/New) → Specs Finalized → Tender Active → Tender Opened → Pre-bid Queries → Amendments → Responses Check → Bid Evaluation → Demo & Tech Eval → Technical Committee (Approved/Not Approved) → Financial Bid & BFC Prep → BFC Stage → BFC Approved/Rejected → Pending RC Approval → Active / Returned / Rejected / Expired / Closed<br><br>At any tender stage: May be 'Cancelled' (with stage + reason recorded) | Specs: Doctor confirmation → Tender: Stage progression on e-Procurement/GeM → BFC: Committee decision → RC: User action + date-based expiry | If BFC Approved → RC header entry → RC approval → Active (available for PO)<br>If Tender Cancelled at any stage → Re-tender with new reference<br>If RC Expired → RC Management (renew) |
| Purchase Order | Draft → Pending PO Approval → Active → Dispatched to Vendor → Vendor Acknowledged → Dispatched (In Transit) → Partially Delivered → Fully Delivered → Closed | User action + vendor portal acknowledgement + delivery events | If Active → Dispatch to vendor<br>Delivery events update status |
| PO Amendment | Draft → Pending Amend. Approval → Approved / Rejected | User action | If Approved → PO updated<br>If Rejected → No change |
| Delivery | Expected → Intimated → Dispatched (In Transit) → Received → Awaiting Delivery Certificate → Certificate Uploaded → Pending QA → Discrepancy Logged | Vendor portal actions (dispatch, certificate upload) + consignee receipt | If Received (OK) → QA<br>If Discrepancy → Resolution flow |
| QA & Acceptance | Pending Inspection → Inspected → Accepted / Conditional / Rejected | QA committee decision | If Accepted → Inventory/warranty lifecycle update + manual Paid/Not-Paid status<br>If Conditional → Vendor rectification<br>If Rejected → Replacement |

### 6.1 End-to-End Flow

**DEO/HoD indent entry → TGMSIDC verification/correction → GM proposal → SO approval → procurement-mode routing → Rate Contract Creation (where required) → Purchase Order Generation → PO Approval → Vendor acknowledgement → Delivery & Receipt → Delivery Completion Certificate → QA & Acceptance → Installation/training (where applicable) → warranty/lifecycle activation → manual Paid/Not-Paid status maintenance.**

### 6.2 Item-Level Parallel Routing

An indent may contain multiple equipment lines. Each line can progress independently based on procurement mode and RC availability. The application must therefore maintain **item-level status** as well as an overall indent status. Lines under RC, tender or local-purchase paths can proceed in parallel while remaining linked to the original indent.

---

## 7. SLA and Escalation Requirements

| Process Step | SLA Target | Escalation Level 1 | Escalation Level 2 |
| --- | --- | --- | --- |
| Indent data entry finalisation | 2 working days | GM Equipment – Day 3 | SO Equipment – Day 5 |
| Indent approval | 3 working days | ED – Day 4 | MD – Day 7 |
| RC creation (post tender finalization) | 3 working days | GM Equipment – Day 4 | ED – Day 7 |
| RC approval | 3 working days | ED – Day 4 | MD – Day 7 |
| PO generation | 3 working days from indent approval | GM Equipment – Day 4 | ED – Day 7 |
| PO approval | 2 working days | ED – Day 3 | MD – Day 5 |
| Vendor PO acknowledgement | 7 calendar days from PO issue | TGMSIDC User – Day 8 | GM Equipment – Day 10 |
| Vendor delivery | As per RC supply period | GM Equipment – Day +7 | LD initiation – Day +15 |
| Vendor dispatch intimation (via portal) | 2 working days from actual dispatch | TGMSIDC User – Day 3 | GM Equipment – Day 5 |
| Delivery certificate upload (via portal) | 7 working days from delivery | TGMSIDC User – Day 8 | GM Equipment – Day 10; Block PO processing |
| QA inspection | 7 working days from receipt | GM Equipment – Day 8 | SO Equipment – Day 14 |
| Vendor rectification | 15 working days from notice | GM Equipment – Day 16 | PO cancellation review – Day 30 |

### 7.1 Notification Channels

Notifications are primarily **in-app + e-mail**, with SMS for the critical events defined in the process book. Delivery status should be recorded where technically supported.

#### Critical SMS Events

| Recipient | Event |
| --- | --- |
| Vendor | New PO issued |
| Vendor | Delivery SLA breach / overdue delivery |
| Vendor | Delivery Completion Certificate upload overdue |
| TGMSIDC GM/SO | Vendor PO acknowledgement overdue (Day 8+) |
| TGMSIDC GM/SO | QA inspection SLA breach (Day 8+) |
| Consignee | Vendor dispatch intimation / equipment in transit |

---

## 8. Parallel Processing Rules

| Scenario | Parallel Path Allowed | Condition |
| --- | --- | --- |
| Single indent with multiple equipment types | Each equipment type routed independently (some to RC, some to PO, some to tender) | Indent approved with mixed procurement modes |
| Single equipment, multiple vendors (L1/L2/L3) | Separate POs generated per vendor in parallel | RC allocation across vendors |
| Multiple consignees on single PO | Deliveries tracked independently per consignee site | PO dispatched with multi-consignee schedule |
| Multiple RCs being created simultaneously | Independent RC creation processes run in parallel | Multiple tenders concluded for different equipment |
| QA for multiple deliveries | Independent QA committees can inspect simultaneously | Equipment delivered to different consignees |

---

## 9. Cross-Cutting System Requirements

These controls apply across modules and are required to preserve security, traceability, evidence, SLA discipline and operational usability.

| Area | Functionality | Detailed Description | Business Rule / Validation | Priority | Use Case / Benefit |
| --- | --- | --- | --- | --- | --- |
| General | Role-based access control (RBAC) | Roles: Admin, TGMSIDC User, GM Equip, ED, Consignee (limited), Vendor Portal ... | Permission matrix per module per action (view/create/edit/approve/delete) | H | Data security; separation of duties |
| General | Comprehensive audit trail | Log every action: user, timestamp, action type, before-value, after-value | Immutable log; viewable by Admin and GM | H | Compliance, accountability, dispute resolution |
| General | Document upload & management | Upload, store, retrieve documents at each process step | File type (PDF/JPG/PNG), max 30 MB; virus scan; link to process step | H | Document traceability across procurement lifecycle |
| General | Notification engine (email + in-app) | Status change notifications, approval requests, SLA alerts, expiry reminders ... | Configurable per role: which notifications to receive | H | Process visibility; SLA adherence; reduced follow-ups |
| General | Configurable dashboards & analytics | Role-based dashboards with KPI tiles, charts, drill-down capability | Real-time data; configurable date range & facility filters | H | Decision support for GM / ED |
| General | Export & print capability | Export any list / report to Excel or PDF; print PO / RC / certificates | Standard export formats; print-optimized layouts | H | Offline review; physical record keeping |
| DEO (HoD) | DEO login & indent entry | DEO at each HoD logs in with HoD-specific credentials and enters indent detai... | Role-based access: DEO sees only their HoD's data; HoD name auto-filled from ... | H | Eliminates physical indent transfer to TGMSIDC; faster data capture at source... |
| DEO (HoD) | Equipment write-in (not in master) | If DEO cannot find equipment in master list, they can select 'Equipment not i... | Write-in entries flagged with 'Unverified' badge; system logs 'From Master' v... | H | DEO is never blocked by incomplete master data; captures real-world equipment... |
| Reporting | DEO Data Quality Report (Indent Accuracy) | Report tracking DEO performance: correction rate per DEO, common error types,... | Filterable by: HoD, DEO, FY, date range; shows correction count, fields corre... | M | Identify DEOs needing training; track data quality improvement over time; acc... |
| Reporting | Tender Audit Report | For each equipment, track all tenders: Equipment Name \| Tender Ref No \| Tende... | Filterable by: Equipment, FY, Status, Date range; drill-down from equipment t... | H | Complete audit trail of all tenders per equipment; identifies procurement del... |
| General | Automated Vendor Performance Scoring | System calculates vendor performance score in real-time based on weighted for... | Contractual compliance = weighted average of 3 sub-metrics (equal weight): (a... | H | Objective, data-driven vendor evaluation; reduces manual scoring effort; enab... |
| General | SMS notifications for critical events | SMS alerts sent for high-urgency events in addition to email and in-app notif... | SMS limited to 6 event types to control costs; SMS gateway costs borne by ven... | H | Ensures time-critical alerts reach recipients even when email/portal is not c... |

### 9.1 Core Technical / Control Requirements

- Role-based access control at module and action level (view/create/edit/approve/delete).
- Maker-checker / segregation-of-duties behaviour where approval is required.
- Immutable audit trail containing user, timestamp, action, before-value and after-value.
- Document management with process linkage, permitted file types, size limits and virus scanning.
- Configurable in-app/e-mail notifications plus defined critical SMS events.
- Search/filter/sort/pagination for high-volume registers and work queues.
- Excel/PDF export and print-optimised PO/RC/certificate outputs.
- Configuration-driven thresholds, SLA timers, templates and notification rules.
- Mobile-responsive web interface suitable for facility, consignee and vendor users.

---

## 10. Functional Requirements Traceability Register

The following register preserves the functional requirements captured in the process book, including priorities and business validations. Payment-related wording has been normalized to the agreed manual-status-only boundary.

| # | Module | Functionality | Detailed Description | Business Rule / Validation | Priority | Use Case / Benefit |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Indent | Account head management | Admin can add/edit/deactivate account heads from master | Names must be unique; deactivation (not deletion) for unused entries | H | Standardize indent categorization; avoid free-text errors |
| 2 | Indent | Equipment master management | Add equipment with name, facility type, category, department, spec template, ... | Equipment + department combination must be unique; GM approval for new additions | H | Consistent equipment naming; spec templates speed up data entry |
| 3 | Indent | Programme & funding source management | Maintain programme names linked to funding sources and FY budgets | Programme linked to funding source; budget allocation tracked | H | Track procurement spending by programme |
| 4 | Indent | Indent type management | Maintain indent types (Letter, GO, Proceeding, etc.) | Admin-only; types pre-defined | M | Classify indents for analytics |
| 5 | Indent | Indent register / tracker view | Unified view of all indents with real-time status, filters, search | Filterable by: FY, authority, status, equipment, institution, date range | H | Single pane of glass for indent lifecycle visibility |
| 6 | Indent | Equipment count & PO linkage per indent | Show # equipment types per indent, # POs issued against each, remaining qty | Auto-calculated from PO data | M | Quick indent completeness check |
| 7 | Indent | Duplicate indent detection | System flags potential duplicate: same equipment + institution + FY | Warning shown (not hard block); user can override with justification | H | Prevent double procurement |
| 8 | RC | RC dashboard with expiry tracking | Dashboard: Active / Expiring (30/60/90d) / Expired RCs; filterable | Color-coded expiry indicators; click-through to RC details | H | Proactive RC lifecycle management |
| 9 | RC | Automated expiry alerts | Email + in-app alerts at 90, 60, 30, 0 days before RC expiry | Configurable thresholds per equipment category | H | Prevent procurement delays due to expired RC |
| 10 | RC | RC amendment & renewal tracking | Track amendment history; link old RC → new RC upon renewal | Amendment audit trail; renewal lineage maintained | M | Continuity and audit compliance |
| 11 | RC | Vendor master management | Maintain vendor details, GST/PAN validation, bank info, performance history | GSTIN format validation; PAN cross-check; unique vendor ID | H | Vendor data integrity; avoid duplicate vendors |
| 12 | PO | Auto-populate RC data in PO | When creating PO, auto-fetch rates, vendor details, tax from linked RC | Only active (non-expired) RCs shown | H | Eliminate manual rate entry errors |
| 13 | PO | PO cost auto-calculation | Auto-calculate unit tax, total cost, net PO value from rate × qty | GST computation per Tax Master; budget availability check | H | Accurate, error-free costing |
| 14 | PO | PO amendment & cancellation tracking | Full version history of amendments; cancellation with reason & freed qty | Amendment audit trail; version numbering (v1, v2…) | H | Compliance, audit, and traceability |
| 15 | PO | Multi-vendor PO split from single indent | Split indent equipment qty across L1/L2/L3 vendors per RC allocation | Σ vendor qty = approved indent qty | H | Support RC allocation rules |
| 16 | Delivery | Delivery tracking dashboard | Track expected, overdue, completed deliveries with vendor-wise view | Auto-reminders to vendor (T-7, T-3, T-1); overdue escalation | H | On-time delivery monitoring |
| 17 | Delivery | Receipt & discrepancy logging | Record receipt qty, serial nos., condition; log discrepancies with photos | Qty received ≤ PO qty; photo mandatory for discrepancy | H | Delivery accountability; vendor performance data |
| 18 | QA | Auto-generated inspection checklist | Checklist auto-created from PO equipment specifications | Parameters from equipment specs + standard QA checks | H | Standardized, consistent QA process |
| 19 | QA | Acceptance / rejection certificate generation | Auto-generate acceptance or rejection certificate PDF upon QA decision | Digital signatures (or uploaded signed copy) | M | Formal acceptance documentation and warranty initiation; actual payment processing remains outside the System |
| 20 | QA | Installation & training tracking | Track installation schedule, completion, user training & sign-off | Installation status: Pending / Scheduled / Complete | M | Ensure full deployment before final acceptance |
| 21 | Vendor Portal | PO notification & acknowledgement | Vendor receives PO notification on portal; views PO details, downloads PDF, a... | Acknowledgement within 7 days; escalation if unacknowledged; clarification re... | H | Faster PO acceptance cycle; eliminates manual follow-ups; audit trail of vend... |
| 22 | Vendor Portal | Dispatch intimation & tracking | Vendor updates dispatch status: dispatch date, transporter details, challan n... | Dispatch linked to PO; auto-generate Dispatch Tracking ID; status 'In Transit' | H | Real-time dispatch visibility; proactive delivery tracking; vendor accountabi... |
| 23 | Vendor Portal | Delivery Completion Certificate upload | Vendor uploads signed Delivery Completion Certificate (PDF/JPG/PNG); system v... | Upload within 7 working days; max 30 MB; certificate linked to PO, delivery &... | H | Formal delivery closure; certificate traceability; payment prerequisite docum... |
| 24 | Vendor Portal | Vendor PO dashboard & reports | Vendor self-service dashboard: POs issued, POs acknowledged, POs fulfilled, p... | Vendor sees only own POs; real-time data; filterable by FY, date range, statu... | H | Vendor self-service reduces TGMSIDC query load; transparency; performance awa... |
| 25 | Vendor Portal | Vendor performance self-view | Vendor can view own performance score: on-time delivery %, QA first-pass rate... | Read-only; score calculated by system; vendor cannot modify; shows trend over... | M | Vendor self-improvement; reduces disputes on performance deductions |
| 26 | Vendor Portal | Vendor grievance & clarification module | Vendor can raise queries on PO terms, report institute delays in certificate ... | Auto-routed to TGMSIDC User; SLA: 3 working days response; escalation to GM i... | M | Structured dispute resolution; audit trail; reduces informal communication |
| 27 | Vendor Portal | Vendor notification centre | Centralized notification inbox: PO issuance, acknowledgement reminders, dispa... | In-app + email notifications; configurable preferences per vendor; read/unrea... | H | Single pane for all vendor communications; reduces missed notifications; SLA ... |
| 28 | General | Role-based access control (RBAC) | Roles: Admin, TGMSIDC User, GM Equip, ED, Consignee (limited), Vendor Portal ... | Permission matrix per module per action (view/create/edit/approve/delete) | H | Data security; separation of duties |
| 29 | General | Comprehensive audit trail | Log every action: user, timestamp, action type, before-value, after-value | Immutable log; viewable by Admin and GM | H | Compliance, accountability, dispute resolution |
| 30 | General | Document upload & management | Upload, store, retrieve documents at each process step | File type (PDF/JPG/PNG), max 30 MB; virus scan; link to process step | H | Document traceability across procurement lifecycle |
| 31 | General | Notification engine (email + in-app) | Status change notifications, approval requests, SLA alerts, expiry reminders ... | Configurable per role: which notifications to receive | H | Process visibility; SLA adherence; reduced follow-ups |
| 32 | General | Configurable dashboards & analytics | Role-based dashboards with KPI tiles, charts, drill-down capability | Real-time data; configurable date range & facility filters | H | Decision support for GM / ED |
| 33 | General | Export & print capability | Export any list / report to Excel or PDF; print PO / RC / certificates | Standard export formats; print-optimized layouts | H | Offline review; physical record keeping |
| 34 | DEO (HoD) | DEO login & indent entry | DEO at each HoD logs in with HoD-specific credentials and enters indent detai... | Role-based access: DEO sees only their HoD's data; HoD name auto-filled from ... | H | Eliminates physical indent transfer to TGMSIDC; faster data capture at source... |
| 35 | DEO (HoD) | Equipment write-in (not in master) | If DEO cannot find equipment in master list, they can select 'Equipment not i... | Write-in entries flagged with 'Unverified' badge; system logs 'From Master' v... | H | DEO is never blocked by incomplete master data; captures real-world equipment... |
| 36 | Indent | TGMSIDC review against scanned copy | TGMSIDC User reviews DEO-entered data side-by-side with the uploaded scanned ... | Side-by-side view: entered data (left) vs. scanned copy (right); discrepancie... | H | Verification against source document ensures data integrity; catches DEO entr... |
| 37 | Indent | TGMSIDC User edit with audit trail | TGMSIDC User can edit/correct any DEO-entered field. Every edit tracked: DEO ... | Immutable edit audit trail per field; edited fields visually marked (blue hig... | H | Ensures data accuracy while maintaining full accountability; enables DEO perf... |
| 38 | Indent | Equipment write-in resolution workflow | TGMSIDC User resolves each write-in entry: (A) Map to existing master item if... | Resolution mandatory before forwarding to GM; Option A updates line to master... | H | Prevents master list pollution with duplicates; ensures every equipment line ... |
| 39 | Reporting | DEO Data Quality Report (Indent Accuracy) | Report tracking DEO performance: correction rate per DEO, common error types,... | Filterable by: HoD, DEO, FY, date range; shows correction count, fields corre... | M | Identify DEOs needing training; track data quality improvement over time; acc... |
| 40 | RC | Technical specification confirmation workflow | For existing equipment: specs pre-loaded, doctor confirms (Accepted/Changed).... | Mandatory upload of signed document; mandatory approver names; date/time auto... | H | Ensures specs are validated by medical experts before tendering; maintains ac... |
| 41 | RC | Tender stage tracking (10 stages) | Track tender lifecycle within our tool: Opened → Pre-bid Queries → Amendments... | Sequential stage progression; each stage has specific fields; status bar show... | H | Complete tender lifecycle visibility within our tool; no need to switch to e-... |
| 42 | RC | Tender cancellation with audit trail | At any tender stage (Steps 7-16), user can cancel tender. Must select stage o... | Cancellation stage dropdown; mandatory reason; cancelled record never deleted... | H | Full transparency on why tenders were cancelled; audit compliance; re-tender ... |
| 43 | Reporting | Tender Audit Report | For each equipment, track all tenders: Equipment Name \| Tender Ref No \| Tende... | Filterable by: Equipment, FY, Status, Date range; drill-down from equipment t... | H | Complete audit trail of all tenders per equipment; identifies procurement del... |
| 44 | General | Automated Vendor Performance Scoring | System calculates vendor performance score in real-time based on weighted for... | Contractual compliance = weighted average of 3 sub-metrics (equal weight): (a... | H | Objective, data-driven vendor evaluation; reduces manual scoring effort; enab... |
| 45 | General | SMS notifications for critical events | SMS alerts sent for high-urgency events in addition to email and in-app notif... | SMS limited to 6 event types to control costs; SMS gateway costs borne by ven... | H | Ensures time-critical alerts reach recipients even when email/portal is not c... |

---

## 11. Data and Document Evidence Requirements

| Process Area | Mandatory / Key Evidence |
| --- | --- |
| Indent Receipt | Scanned physical indent; source reference; equipment/institution/fund details; write-in flags; submission timestamp. |
| Indent Verification | Side-by-side source comparison; correction history; original vs corrected values; write-in resolution. |
| Specification Confirmation | Signed specification document; doctor/approver names; version history; confirmation timestamp. |
| Tender / RC | Tender reference; stage dates; pre-bid/amendment/evaluation documents; technical recommendation; BFC documents; contract; pricing; CAMC terms. |
| PO | Linked indent/RC; vendor allocation; consignee schedule; cost/GST calculations; PS; T&C version; approval trail; generated PO PDF. |
| Delivery | Vendor dispatch details; tracking IDs; challan; receipt; serial numbers; photos; discrepancy evidence; Delivery Completion Certificate. |
| QA / Acceptance | Inspection checklist; test/calibration evidence; QA report; acceptance/conditional/rejection certificate; installation/training sign-off where applicable. |
| Payment Status | Manual Paid/Not-Paid status only, with user and timestamp. No invoice/payment documents are required by this System unless retained purely as non-transactional reference by policy. |

---

## 12. Business Rules Requiring Configuration

| Configuration Area | Examples from Process Book |
| --- | --- |
| Approval thresholds | ED approval above configurable PO/RC value thresholds; SO may be final below threshold. |
| SLA thresholds | Indent, RC, PO, vendor acknowledgement, delivery, certificate, QA and rectification targets. |
| RC expiry alerts | 90 / 60 / 30 / 0 days, configurable by equipment category. |
| Performance Security | Requirement threshold and allowed percentage range. |
| Notification preferences | Role/vendor-level email/portal preferences; critical SMS events. |
| T&C templates | PO-type-specific clauses, locked vs editable text, version/effective date. |
| Master-data approvals | New equipment additions and other controlled changes. |
| Local Purchase rules | Threshold and required validations to be configured based on TGMSIDC policy; the process book identifies Local Purchase as a mode but does not define a separate full lifecycle. |

---

## 13. Scope Items Explicitly Excluded / Not Implied

- Invoice receipt workflow.
- PO/GRN/invoice matching.
- Payment eligibility computation.
- Payment approval workflow.
- PFMS / Treasury / banking payment integration.
- Electronic fund transfer or disbursement.
- Vendor bid submission through the Vendor Portal.
- Replacement of the government e-Procurement / GeM portal for tender publication or bid submission.

---

## 14. Scope Completeness Checklist

| Scope Area | Coverage |
| --- | --- |
| Facility-level indent entry including scanned copy | Yes |
| Equipment master lookup and write-in | Yes |
| TGMSIDC verification/correction with audit trail | Yes |
| GM proposal / SO approval and procurement mode | Yes |
| Technical specification doctor workflow | Yes |
| Tender stage tracking and cancellation/re-tender linkage | Yes |
| BFC decision and RC creation | Yes |
| RC expiry alerts, amendment, renewal and closure | Yes |
| PO generation with L1/L2/L3 split | Yes |
| Consignee mapping and cost/GST calculation | Yes |
| PO approval and threshold-based escalation | Yes |
| PO amendment/cancellation with version control | Yes |
| Vendor Portal acknowledgement, dispatch, certificate, dashboard, performance, grievance and notifications | Yes |
| Delivery receipt, serial numbers, photos and discrepancy handling | Yes |
| QA inspection/checklist/testing and accept/conditional/reject | Yes |
| Installation/training and warranty initiation | Yes |
| Manual Paid/Not-Paid status only | Yes |
| Master Data Management | Yes |
| Workflow status model | Yes |
| SLA/escalation rules | Yes |
| Parallel processing rules | Yes |
| 15 reports | Yes |
| 12 KPI dashboard measures | Yes |
| RBAC, audit trail, document management, notifications, exports | Yes |
| Automated vendor performance scoring | Yes |
| Critical SMS notifications | Yes |

---

## 15. Final Scope Statement

The Digital Equipment Management System shall provide an end-to-end, auditable digital operating platform for TGMSIDC equipment procurement from facility indent initiation through approval, Rate Contract lifecycle, Purchase Order lifecycle, vendor collaboration, delivery/receipt, QA/acceptance, installation/training, warranty commencement, master-data governance and operational analytics. The system shall retain role-based accountability, evidence, status history, SLA tracking and configurable governance at every stage.

**Payment processing is not part of the System.** The only payment-related function is the authorized manual maintenance of a Paid/Not-Paid status against the Purchase Order.
