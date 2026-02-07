// 1. Open your Spreadsheet
// 2. Extensions > Apps Script
// 3. Paste this ENTIRE code into Code.gs (Delete old code)
// 4. Click Deploy > Manage Deployments > Edit (Pencil) > Version: New Version > Deploy
// 5. COPY the URL
// 6. TRIGGERS: Add a new trigger -> Function: onEditTrigger, Event Source: Spreadsheet, Event Type: On edit.
// 7. TIME TRIGGERS: Add a new trigger -> Function: checkEscalationStatus, Event Source: Time-driven, Type: Every Hour.

// --- GLOBAL CONFIG ---
const IST_TIMEZONE = "GMT+5:30";
const DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS'+05:30'";

function getISTTimestamp() {
    return Utilities.formatDate(new Date(), IST_TIMEZONE, DATE_FORMAT);
}

// --- TRIGGERS ---

function onEditTrigger(e) {
    try {
        const sheet = e.source.getActiveSheet();
        if (sheet.getName() !== 'data') return;

        const range = e.range;
        const col = range.getColumn();
        const row = range.getRow();
        if (row <= 1) return; // Header

        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        const colMap = getColMap(headers);

        if (col === colMap.Status) {
            const newStatus = e.value;
            if (newStatus && (newStatus.toLowerCase() === 'closed' || newStatus.toLowerCase() === 'resolved')) {
                const ticketId = sheet.getRange(row, colMap.ID).getValue();
                const reportedBy = colMap.ReportedBy ? sheet.getRange(row, colMap.ReportedBy).getValue() : '';
                const resolver = colMap.ResolvedBy ? sheet.getRange(row, colMap.ResolvedBy).getValue() : 'Admin (Manual)';

                if (reportedBy && ticketId) {
                    sendResolutionNotification(ticketId, reportedBy, newStatus, resolver, 'Manual Sheet Update');
                    const historyCol = colMap.History;
                    if (historyCol) {
                        const timestamp = getISTTimestamp();
                        const msg = `[${timestamp}] ${newStatus.toUpperCase()} (Manual Edit). Action by Sheet User.`;
                        const currentHist = sheet.getRange(row, historyCol).getValue();
                        sheet.getRange(row, historyCol).setValue(currentHist ? currentHist + '\n' + msg : msg);
                    }
                }
            }
        }
    } catch (err) {
        Logger.log("onEditTrigger Error: " + err.toString());
    }
}

// --- API HANDLERS ---

function doGet(e) {
    const action = e.parameter.action;
    const sheetName = e.parameter.sheet || 'data';
    if (action === 'read') return readData(sheetName);
    return response('error', 'Invalid action');
}

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action;
        const payload = data.payload;

        if (action === 'createComplaint') return createComplaint(payload);
        if (action === 'registerUser') return registerUser(payload);
        if (action === 'updateUser') return updateUser(payload);
        if (action === 'deleteUser') return deleteUser(payload);
        if (action === 'changePassword') return changePassword(payload);
        if (action === 'updateComplaintStatus') return updateComplaintStatus(payload);
        if (action === 'transferComplaint') return transferComplaint(payload);

        return response('error', 'Invalid action');
    } catch (err) {
        return response('error', 'Server Error: ' + err.toString());
    }
}

// --- HELPER FUNCTIONS ---

function normalize(str) {
    return String(str || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function findCol(headers, target) {
    const t = normalize(target);
    for (let i = 0; i < headers.length; i++) {
        const h = normalize(headers[i]);
        if (h === t) return i + 1;
        if (t === 'id' && (h === 'tid' || h === 'ticketid' || h === 'complaintid' || h.includes('uniqueid'))) return i + 1;
        if (t === 'mobile' && (h.includes('phone') || h.includes('mobile'))) return i + 1;
        if (t === 'department' && (h === 'dept' || h === 'department')) return i + 1;
        if (t === 'reportedby' && (h.includes('user') || h.includes('reported'))) return i + 1;
        if (t === 'resolveddate' && (h.includes('resolved') && h.includes('date'))) return i + 1;
        if (t === 'targetdate' && (h.includes('target') || h.includes('deadline'))) return i + 1;
        if (t === 'rating' && (h === 'rating' || h === 'stars')) return i + 1;
        // Fix: Map 'Name' or 'User Name' to Username
        if (t === 'username' && (h === 'name' || h === 'username' || h === 'user name')) return i + 1;
    }
    return -1;
}

function getColMap(headers) {
    const map = {};
    const keys = ['ID', 'Date', 'Department', 'Description', 'Status', 'ReportedBy', 'ResolvedBy', 'Remark', 'Username', 'Password', 'Role', 'Mobile', 'Resolved Date', 'Unit', 'History', 'TargetDate', 'Reopened Date', 'Rating'];
    keys.forEach(k => {
        const idx = findCol(headers, k);
        if (idx !== -1) map[k] = idx;
    });
    return map;
}

function response(status, message, data) {
    return ContentService.createTextOutput(JSON.stringify({ status, message, data }))
        .setMimeType(ContentService.MimeType.JSON);
}

function readData(sheetName) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return ContentService.createTextOutput("[]").setMimeType(ContentService.MimeType.JSON);

    // MIGRATION: Ensure 'SUPER_ADMIN' exists if we are reading the master sheet
    if (sheetName === 'master') {
        ensureAdminExists(sheet);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const map = getColMap(headers);
    const strictNorm = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    let filteredRows = data.slice(1);

    // SOURCE-LEVEL STEALTH REMOVED
    // We strictly filter in the UI (UserManagement.jsx) to allow authentication.
    // If we filter here, the app cannot "see" the user to verify the password.

    return ContentService.createTextOutput(JSON.stringify(filteredRows.map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h || ('Col' + i)] = row[i]);
        return obj;
    }))).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Migration Helper: Ensures the primary administrator 'SUPER ADMIN' is present.
 * Replaces legacy 'admin' and 'AM Sir' for hardening.
 */
function ensureAdminExists(sheet) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const map = getColMap(headers);
    if (!map.Username) return;

    const strictNorm = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const adminExists = data.some((row, i) => i > 0 && strictNorm(row[map.Username - 1]) === 'amsir');

    if (!adminExists) {
        const nextRow = sheet.getLastRow() + 1;
        if (map.Username) sheet.getRange(nextRow, map.Username).setValue('AM Sir');
        if (map.Password) sheet.getRange(nextRow, map.Password).setValue('Am@321');
        if (map.Role) sheet.getRange(nextRow, map.Role).setValue('SUPER_ADMIN');
        if (map.Department) sheet.getRange(nextRow, map.Department).setValue('ADMIN');
        if (map.Status) sheet.getRange(nextRow, map.Status).setValue('Active');
        if (map.Mobile) sheet.getRange(nextRow, map.Mobile).setValue('0000000000');
        SpreadsheetApp.flush();
    }

    // CLEANUP: Delete legacy placeholders
    for (let i = sheet.getLastRow(); i > 1; i--) {
        const val = strictNorm(sheet.getRange(i, map.Username).getValue());
        if (val === 'admin' || val === 'superadmin' || val === 'super_admin') {
            sheet.deleteRow(i);
        }
    }
}

// --- ACTIONS ---

function createComplaint(payload) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('data');
    if (!sheet) return response('error', 'Sheet "data" not found.');

    let data = sheet.getDataRange().getValues();
    let headerRowIndex = 0;

    // Smart Header Detection
    for (let r = 0; r < Math.min(data.length, 5); r++) {
        const rowStr = data[r].join(' ').toLowerCase();
        if (rowStr.includes('date') && (rowStr.includes('desc') || rowStr.includes('status'))) {
            headerRowIndex = r;
            break;
        }
    }

    let headers = data.length > headerRowIndex ? data[headerRowIndex] : [];
    let colMap = getColMap(headers);

    // Self Healing
    const essentialCols = ['Unit', 'History', 'TargetDate', 'Resolved Date', 'Rating'];
    let mappingUpdated = false;
    essentialCols.forEach(colName => {
        if (!colMap[colName]) {
            sheet.getRange(headerRowIndex + 1, sheet.getLastColumn() + 1).setValue(colName);
            mappingUpdated = true;
        }
    });

    if (mappingUpdated) {
        SpreadsheetApp.flush(); // Force write
        data = sheet.getDataRange().getValues(); // Re-read
        headers = data[headerRowIndex];
        colMap = getColMap(headers);
    }

    if (!colMap.ID) return response('error', 'ID column failed to generate.');

    const nextRow = sheet.getLastRow() + 1;
    const existingIds = data.slice(headerRowIndex + 1).map(r => String(r[colMap.ID - 1] || '')).filter(id => id.startsWith('SBH'));
    let newId = 'SBH00001';
    if (existingIds.length > 0) {
        const last = existingIds[existingIds.length - 1];
        const match = last.match(/SBH(\d+)/);
        if (match) newId = 'SBH' + String(parseInt(match[1], 10) + 1).padStart(5, '0');
    }

    const timestamp = getISTTimestamp();
    const historyLog = `[${timestamp}] Ticket Created by ${payload.ReportedBy}`;

    const fields = {
        'ID': newId,
        'Date': timestamp,
        'Department': payload.Department,
        'Description': payload.Description,
        'Status': 'Open',
        'ReportedBy': payload.ReportedBy,
        'Unit': payload.Unit || '',
        'History': historyLog,
        'TargetDate': payload.TargetDate || ''
    };

    Object.keys(fields).forEach(f => {
        if (colMap[f]) sheet.getRange(nextRow, colMap[f]).setValue(fields[f]);
    });

    sendNewComplaintNotifications(payload.Department, newId, payload.ReportedBy, payload.Description);
    return response('success', 'Complaint Created', { id: newId });
}

function updateComplaintStatus(payload) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('data');
    let data = sheet.getDataRange().getValues();

    let headerRowIndex = 0;
    for (let r = 0; r < Math.min(data.length, 5); r++) {
        const rowStr = data[r].join(' ').toLowerCase();
        if (rowStr.includes('date') && (rowStr.includes('desc') || rowStr.includes('status'))) {
            headerRowIndex = r;
            break;
        }
    }

    const headers = data[headerRowIndex];
    let colMap = getColMap(headers);

    // Self Healing: Ensure 'Rating' and 'Resolved Date' columns exist
    const essentialCols = ['Rating', 'Resolved Date'];
    let mappingUpdated = false;
    essentialCols.forEach(colName => {
        if (!colMap[colName]) {
            sheet.getRange(headerRowIndex + 1, sheet.getLastColumn() + 1).setValue(colName);
            mappingUpdated = true;
        }
    });

    if (mappingUpdated) {
        SpreadsheetApp.flush();
        data = sheet.getDataRange().getValues();
        colMap = getColMap(data[headerRowIndex]);
        // Update headers reference
    }

    if (!colMap.ID) return response('error', 'ID column not found');

    let rowIndex = -1;
    const searchId = String(payload.ID || '').trim().toLowerCase();

    for (let i = headerRowIndex + 1; i < data.length; i++) {
        const cellId = String(data[i][colMap.ID - 1] || '').trim().toLowerCase();
        if (cellId === searchId) {
            rowIndex = i + 1;
            break;
        }
    }
    if (rowIndex === -1) return response('error', 'Complaint not found');

    const timestamp = getISTTimestamp();
    const currentHistory = colMap.History ? String(sheet.getRange(rowIndex, colMap.History).getValue()) : '';
    const currentStatus = (colMap.Status && rowIndex > 1) ? String(data[rowIndex - 1][colMap.Status - 1] || '').trim() : '';
    let actionLog = '';

    // 1. EXTENSION
    if (payload.Status === 'Extend') {
        const oldTarget = colMap.TargetDate ? String(data[rowIndex - 1][colMap.TargetDate - 1] || '') : 'None';
        const diff = oldTarget ? Math.ceil((new Date(payload.TargetDate) - new Date(oldTarget)) / (1000 * 60 * 60 * 24)) : 0;

        actionLog = `[${timestamp}] Extended by ${payload.ResolvedBy}. Reason: ${payload.Remark}`;
        if (colMap.TargetDate) sheet.getRange(rowIndex, colMap.TargetDate).setValue(payload.TargetDate || '');

        logCaseExtend({
            complaint_id: payload.ID,
            extended_by: payload.ResolvedBy,
            old_target_date: oldTarget,
            new_target_date: payload.TargetDate,
            diff_days: diff,
            extension_time: timestamp,
            reason: payload.Remark
        });

        sendExtensionNotification(payload.ID, data[rowIndex - 1][colMap.ReportedBy - 1], payload.ResolvedBy, payload.TargetDate, payload.Remark);
    }
    // 2. FORCE CLOSE
    else if (payload.Status === 'Force Close') {
        actionLog = `[${timestamp}] FORCE CLOSED by ${payload.ResolvedBy}. Reason: ${payload.Remark}`;
        if (colMap.Status) sheet.getRange(rowIndex, colMap.Status).setValue('Closed');
        if (colMap['Resolved Date']) sheet.getRange(rowIndex, colMap['Resolved Date']).setValue(timestamp);

        // Template 6: Force Close
        sendForceCloseNotification(payload.ID, data[rowIndex - 1][colMap.ReportedBy - 1], payload.Remark);
    }
    // 3. STANDARD
    else {
        if (colMap.Status) sheet.getRange(rowIndex, colMap.Status).setValue(payload.Status);

        // Resolver assignment
        const existingRes = colMap.ResolvedBy ? String(data[rowIndex - 1][colMap.ResolvedBy - 1] || '').trim() : '';
        // Fix: Always update ResolvedBy to the actual person closing the ticket (Final Resolver)
        if (colMap.ResolvedBy && (payload.Status === 'Closed' || payload.Status === 'Resolved')) {
            sheet.getRange(rowIndex, colMap.ResolvedBy).setValue(payload.ResolvedBy);
        }

        // History Log
        if ((payload.Status === 'Open' || payload.Status === 'Closed') && payload.Status !== currentStatus) {
            const label = (payload.Status === 'Open' && currentStatus === 'Closed') ? 'RE-OPEN' : payload.Status.toUpperCase();
            actionLog = `[${timestamp}] ${label} by ${payload.ResolvedBy}. Remark: ${payload.Remark}`;
        }

        // Rating
        if (payload.Rating && colMap.Rating) {
            // Fix: Get the REAL reporter from the sheet, not the payload (which might be the resolver)
            const realReporter = colMap.ReportedBy ? (data[rowIndex - 1][colMap.ReportedBy - 1] || 'User') : 'User';

            // Fix: Check against ID + Reporter combo
            if (isAlreadyRated(payload.ID, realReporter)) return response('error', 'Already Rated');

            sheet.getRange(rowIndex, colMap.Rating).setValue(payload.Rating);

            let resolver = colMap.ResolvedBy ? data[rowIndex - 1][colMap.ResolvedBy - 1] : '';
            logRating({
                ID: payload.ID,
                Rating: payload.Rating,
                Remark: payload.Remark,
                Resolver: resolver || payload.ResolvedBy,
                Reporter: realReporter // Fix: Log the actual reporter
            });
            updateUserMetrics(resolver || payload.ResolvedBy); // Update metrics immediately
        }

        // Finalize Dates
        if (payload.Status === 'Closed' && colMap['Resolved Date'] && !String(sheet.getRange(rowIndex, colMap['Resolved Date']).getValue()).trim()) {
            sheet.getRange(rowIndex, colMap['Resolved Date']).setValue(timestamp);
        }
        if (colMap.Remark) sheet.getRange(rowIndex, colMap.Remark).setValue(payload.Remark || '');

        // Notifications
        if ((payload.Status === 'Closed' || payload.Status === 'Resolved') && payload.Status !== currentStatus) {
            const reporter = colMap.ReportedBy ? data[rowIndex - 1][colMap.ReportedBy - 1] : 'User';
            sendResolutionNotification(payload.ID, reporter, payload.Status, payload.ResolvedBy, payload.Remark);
            updateUserMetrics(payload.ResolvedBy);
        }
        if (payload.Status === 'Open' && currentStatus === 'Closed') {
            const originalStaff = colMap.ResolvedBy ? data[rowIndex - 1][colMap.ResolvedBy - 1] : null;
            if (originalStaff) sendReopenNotification(payload.ID, originalStaff, payload.ResolvedBy, payload.Remark);
            if (colMap['Reopened Date']) sheet.getRange(rowIndex, colMap['Reopened Date']).setValue(getISTTimestamp());

            const L3 = getEscalationContact('L3');
            if (L3 && L3.mobile) sendWhatsApp(L3.mobile, `L3 ESCALATION: Ticket #${payload.ID} Re-opened by ${payload.ResolvedBy}.`);
        }
    }

    // Append History if log exists
    if (actionLog) {
        if (colMap.History) {
            sheet.getRange(rowIndex, colMap.History).setValue(currentHistory ? currentHistory + '\n' + actionLog : actionLog);
        }
        logToAuditHistory({
            ID: payload.ID,
            Action: payload.Status,
            By: payload.ResolvedBy,
            Remark: payload.Remark,
            OldStatus: currentStatus,
            NewStatus: payload.Status,
            Rating: payload.Rating // Added Back
        });
    }

    SpreadsheetApp.flush();
    return response('success', 'Status Updated');
}

function transferComplaint(payload) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('data');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colMap = getColMap(headers);
    if (!colMap.ID) return response('error', 'ID column not found');

    let rowIndex = -1;
    const searchId = String(payload.ID).trim().toLowerCase();
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][colMap.ID - 1]).trim().toLowerCase() === searchId) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) return response('error', 'Complaint not found');

    const timestamp = getISTTimestamp();
    const oldDept = colMap.Department ? data[rowIndex - 1][colMap.Department - 1] : 'Unknown';

    if (colMap.Department) sheet.getRange(rowIndex, colMap.Department).setValue(payload.NewDepartment);
    if (colMap.ResolvedBy) sheet.getRange(rowIndex, colMap.ResolvedBy).setValue(payload.NewAssignee || '');
    if (colMap.Status) sheet.getRange(rowIndex, colMap.Status).setValue('Transferred');

    const msg = `[${timestamp}] TRANSFERRED from ${oldDept} to ${payload.NewDepartment} by ${payload.TransferredBy}. Reason: ${payload.Reason}`;
    if (colMap.History) {
        const cur = sheet.getRange(rowIndex, colMap.History).getValue();
        sheet.getRange(rowIndex, colMap.History).setValue(cur ? cur + '\n' + msg : msg);
    }

    // Advanced Logging (Case_Transfer_Log)
    logCaseTransfer({
        complaint_id: payload.ID,
        transferred_by: payload.TransferredBy,
        from_department: oldDept,
        to_department: payload.NewDepartment,
        to_user: payload.NewAssignee || 'None',
        transfer_time: timestamp,
        reason: payload.Reason
    });

    logToAuditHistory({ ID: payload.ID, Action: 'Transfer', By: payload.TransferredBy, Remark: payload.Reason, OldStatus: oldDept, NewStatus: payload.NewDepartment });

    // Template 3: Transfer
    sendTransferNotification(payload.ID, oldDept, payload.NewDepartment, payload.TransferredBy, payload.Reason);
    return response('success', 'Transferred');
}

function updateUser(p) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('master');
    const data = sheet.getDataRange().getValues();
    const map = getColMap(data[0]);

    const target = String(p.OldUsername || p.Username || '').trim().toLowerCase();
    const strictNorm = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const normTarget = strictNorm(target);
    // BACKEND PROTECTION: Prevent modification of SUPER_ADMIN
    if (normTarget === 'amsir' || normTarget === 'superadmin') {
        return response('error', 'CRITICAL SECURE: The primary SUPER ADMIN account (AM Sir) cannot be modified via external API.');
    }

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][map.Username - 1]).trim().toLowerCase() === target) {
            // Role protection
            const currentRole = String(data[i][map.Role - 1] || '').toUpperCase();
            if (currentRole === 'SUPER_ADMIN') return response('error', 'PROTECTED: Super Admin accounts are immutable.');

            if (p.Password && map.Password) sheet.getRange(i + 1, map.Password).setValue(p.Password);
            if (p.Role && map.Role) sheet.getRange(i + 1, map.Role).setValue(p.Role);
            if (p.Status && map.Status) sheet.getRange(i + 1, map.Status).setValue(p.Status);
            if (p.Department && map.Department) sheet.getRange(i + 1, map.Department).setValue(p.Department);
            if (p.Mobile && map.Mobile) sheet.getRange(i + 1, map.Mobile).setValue(p.Mobile);

            if (p.Status === 'Active' && map.Mobile) sendAccountApprovalNotification(p.Username, sheet.getRange(i + 1, map.Mobile).getValue());
            SpreadsheetApp.flush();
            return response('success', 'Updated');
        }
    }
    return response('error', 'User not found');
}

function registerUser(p) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('master');
    const headers = sheet.getDataRange().getValues()[0];
    const map = getColMap(headers);
    const r = sheet.getLastRow() + 1;

    if (map.Username) sheet.getRange(r, map.Username).setValue(p.Username);
    if (map.Password) sheet.getRange(r, map.Password).setValue(p.Password);
    if (map.Department) sheet.getRange(r, map.Department).setValue(p.Department);
    if (map.Mobile) sheet.getRange(r, map.Mobile).setValue(p.Mobile);
    if (map.Role) sheet.getRange(r, map.Role).setValue(p.Role);
    if (map.Status) sheet.getRange(r, map.Status).setValue(p.Status || 'Pending');

    if (p.Status === 'Active' && p.Mobile) sendAccountApprovalNotification(p.Username, p.Mobile);
    return response('success', 'Registered');
}

function changePassword(p) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('master');
    const data = sheet.getDataRange().getValues();
    const map = getColMap(data[0]);
    if (!map.Username || !map.Password) return response('error', 'Columns missing');

    // Super Strict Normalization Helper
    const strictNorm = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const target = strictNorm(p.Username);
    for (let i = 1; i < data.length; i++) {
        const rowVal = strictNorm(data[i][map.Username - 1]);

        if (rowVal === target) {
            // Found User
            if (String(data[i][map.Password - 1]) !== String(p.OldPassword)) return response('error', 'Wrong Password');
            sheet.getRange(i + 1, map.Password).setValue(p.NewPassword);
            return response('success', 'Changed');
        }
    }
    return response('error', `User not found (Looked for: "${target}")`);
}

function deleteUser(p) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('master');
    const data = sheet.getDataRange().getValues(); // Refresh
    const map = getColMap(data[0]);
    const target = String(p.Username || '').trim().toLowerCase();
    const strictNorm = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const normTarget = strictNorm(target);
    // BACKEND PROTECTION
    if (normTarget === 'amsir' || normTarget === 'superadmin') {
        return response('error', 'CRITICAL SECURE: The primary SUPER ADMIN account (AM Sir) cannot be deleted.');
    }

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][map.Username - 1]).trim().toLowerCase() === target) {
            const currentRole = String(data[i][map.Role - 1] || '').toUpperCase();
            if (currentRole === 'SUPER_ADMIN') return response('error', 'PROTECTED: Super Admin accounts are immutable.');

            sheet.deleteRow(i + 1);
            return response('success', 'Deleted');
        }
    }
    return response('error', 'Not found');
}


// --- NOTIFICATION UTILS ---
const API_USERNAME = "SBH HOSPITAL";
const API_PASS = "123456789";
const BASE_URL = "https://app.ceoitbox.com/message/new";

function sendWhatsApp(number, message) {
    if (!number) return;
    try {
        let n = String(number).replace(/\D/g, '');
        if (n.length > 10) n = n.slice(-10);
        const url = BASE_URL + "?username=" + encodeURIComponent(API_USERNAME) + "&password=" + encodeURIComponent(API_PASS) + "&receiverMobileNo=" + n + "&receiverName=SBHUser" + "&message=" + encodeURIComponent(message);
        UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    } catch (e) { Logger.log("WhatsApp Error: " + e); }
}

// PART 1: NEW COMPLAINT ALERT
function sendNewComplaintNotifications(dept, id, reporter, desc) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('master');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const uIdx = findCol(headers, 'Username') - 1;
    const dIdx = findCol(headers, 'Department') - 1;
    const rIdx = findCol(headers, 'Role') - 1;
    const mIdx = findCol(headers, 'Mobile') - 1;
    const sIdx = findCol(headers, 'Status') - 1;

    let userMobile = null;
    const staffMobiles = [];
    const targetDept = normalize(dept);
    const reportName = normalize(reporter);

    for (let i = 1; i < data.length; i++) {
        if (sIdx > -1 && String(data[i][sIdx]).toLowerCase() !== 'active') continue;

        const rowU = normalize(data[i][uIdx]);
        const rowD = normalize(data[i][dIdx]);
        const rowR = normalize(data[i][rIdx]);
        const mobile = data[i][mIdx];

        if (rowU === reportName) userMobile = mobile;
        if (rowD === targetDept || rowR === 'admin' || rowR === 'super_admin') staffMobiles.push(mobile);
    }

    // 1) Reporter Confirmation
    if (userMobile) {
        const msg = `📌 *COMPLAINT REGISTERED*\n\nDear ${reporter},\nYour complaint has been logged successfully.\n\n🔹 *Ticket ID:* ${id}\n📍 *Department:* ${dept}\n📝 *Issue:* ${desc}\n\nWe will update you shortly.\n\nSBH Group Of Hospitals\n_Automated System Notification_`;
        sendWhatsApp(userMobile, msg);
    }

    // 2) Concerned Department Alert
    [...new Set(staffMobiles)].forEach(m => {
        if (m && m !== userMobile) {
            const msg = `🚨 *NEW COMPLAINT ALERT*\n\nAttention Team,\nA new ticket requires your action.\n\n🔹 *Ticket ID:* ${id}\n📍 *Department:* ${dept}\n👤 *Reporter:* ${reporter}\n📝 *Issue:* ${desc}\n\nPlease check CMS and resolve.\n\nSBH Group Of Hospitals\n_Automated System Notification_`;
            sendWhatsApp(m, msg);
            Utilities.sleep(800);
        }
    });
}

// PART 2 & 3: DAILY REMINDERS & ESCALATION
function checkPendingStatus() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('data');
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colMap = getColMap(headers);
    const now = new Date();

    // Fetch Escalation Contacts
    const L1 = getEscalationContact('L1'); // Director
    const L2 = getEscalationContact('L2'); // Senior
    const L3 = getEscalationContact('L3'); // Junior/Lead

    for (let i = 1; i < data.length; i++) {
        const status = String(data[i][colMap.Status - 1] || '').trim().toLowerCase();

        // Filter: Open, Pending, In-Progress, Re-open
        if (status !== 'open' && status !== 'pending' && status !== 'in-progress' && status !== 're-open') continue;

        const dateStr = data[i][colMap.Date - 1];
        if (!dateStr) continue;

        const createdDate = new Date(dateStr);
        const diffTime = now - createdDate;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        const id = data[i][colMap.ID - 1];
        const dept = data[i][colMap.Department - 1];
        const reporter = data[i][colMap.ReportedBy - 1];

        // 1. Daily Pending Reminder (24h & 48h)
        if (diffDays === 1) { // After 24 Hours
            sendDeptReminder(id, dept, reporter, diffDays, "1st");
        }
        else if (diffDays === 2) { // After 48 Hours
            sendDeptReminder(id, dept, reporter, diffDays, "2nd");
            // ESCALATION: L3 (2 Days)
            if (L3 && L3.mobile) sendEscalationMsg(L3.mobile, "L3 Officer", id, dept, diffDays);
        }

        // 2. Escalation System
        else if (diffDays === 3) { // After 3 Days
            if (L2 && L2.mobile) sendEscalationMsg(L2.mobile, "L2 Officer", id, dept, diffDays);
        }
        else if (diffDays >= 4) { // After 4 Days (Director)
            // Only send once per day to Director for really old tickets
            if (L1 && L1.mobile) sendEscalationMsg(L1.mobile, "L1 (DIRECTOR)", id, dept, diffDays);
        }
    }
}

function sendDeptReminder(id, dept, reporter, days, attempt) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('master');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dIdx = findCol(headers, 'Department') - 1;
    const mIdx = findCol(headers, 'Mobile') - 1;

    const targetDept = normalize(dept);
    const staffMobiles = [];

    for (let i = 1; i < data.length; i++) {
        const rowD = normalize(data[i][dIdx]);
        if (rowD === targetDept) staffMobiles.push(data[i][mIdx]);
    }

    [...new Set(staffMobiles)].forEach(m => {
        if (m) {
            const msg = `⏳ *PENDING REMINDER (${attempt})*\n\nThis ticket is still pending resolution.\n\n🔹 *Ticket ID:* ${id}\n📍 *Department:* ${dept}\n⏱️ *Pending Days:* ${days}\n👤 *Reporter:* ${reporter}\n\nPlease resolve immediately to avoid escalation.\n\nSBH Group Of Hospitals\n_Automated System Notification_`;
            sendWhatsApp(m, msg);
            Utilities.sleep(800);
        }
    });
}

function sendEscalationMsg(mobile, level, id, dept, days) {
    const msg = `🔥 *ESCALATION ALERT: ${level}*\n\nCritical pending ticket reported.\n\n🔹 *Ticket ID:* ${id}\n📍 *Department:* ${dept}\n⏱️ *Pending Days:* ${days} Days\n\nImmediate Usage of Authority Required.\n\nSBH Group Of Hospitals\n_Automated System Notification_`;
    sendWhatsApp(mobile, msg);
}

// --- OTHER NOTIFICATIONS ---

function sendResolutionNotification(id, reportedBy, status, resolvedBy, remark) {
    const mob = getUserMobile(reportedBy);
    if (mob) {
        const msg = `✅ *TICKET RESOLVED*\n\nYour complaint has been addressed.\n\n🔹 *Ticket ID:* ${id}\n👤 *Resolved By:* ${resolvedBy}\n💬 *Resolution:* ${remark}\n\nSBH Group Of Hospitals\n_Automated System Notification_`;
        sendWhatsApp(mob, msg);
    }
}

function sendExtensionNotification(id, reportedBy, by, date, reason) {
    const mob = getUserMobile(reportedBy);
    if (mob) {
        const msg = `⏳ *TIMELINE EXTENDED*\n\nCompletion target for your ticket has been updated.\n\n🔹 *Ticket ID:* ${id}\n👤 *Updated By:* ${by}\n📅 *New Target:* ${date}\n📝 *Reason:* ${reason}\n\nSBH Group Of Hospitals\n_Automated System Notification_`;
        sendWhatsApp(mob, msg);
    }
}

function sendAccountApprovalNotification(user, mobile) {
    if (mobile) {
        const msg = `🔓 *ACCOUNT ACTIVATED*\n\nWelcome back, ${user}!\nYour access to the SBH CMS Portal is now active.\n\n✅ *Status:* AUTHORIZED\n\nSBH Group Of Hospitals\n_Automated System Notification_`;
        sendWhatsApp(mobile, msg);
    }
}

function sendReopenNotification(id, staff, by, remark) {
    const mob = getUserMobile(staff);
    if (mob) {
        const msg = `⚠️ *TICKET RE-OPENED*\n\nPrevious resolution for ticket #${id} has been flagged for review.\n\n🔹 *Ticket ID:* ${id}\n👤 *Re-opened By:* ${by}\n💬 *Remarks:* ${remark}\n\nImmediate attention required.\n\nSBH Group Of Hospitals\n_Automated System Notification_`;
        sendWhatsApp(mob, msg);
    }
}

function sendForceCloseNotification(id, reportedBy, reason) {
    const mob = getUserMobile(reportedBy);
    if (mob) {
        const msg = `🔒 *MANAGEMENT CLOSURE*\n\nYour complaint has been administratively closed.\n\n🔹 *Ticket ID:* ${id}\n📝 *Reason:* ${reason || 'Administrative Action'}\n\nSBH Group Of Hospitals\n_Automated System Notification_`;
        sendWhatsApp(mob, msg);
    }
}

function sendTransferNotification(id, oldDept, newDept, by, reason) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('master');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const dIdx = findCol(headers, 'Department') - 1;
    const mIdx = findCol(headers, 'Mobile') - 1;
    const rIdx = findCol(headers, 'Role') - 1;

    const targetDept = normalize(newDept);
    const staffMobiles = [];

    for (let i = 1; i < data.length; i++) {
        const rowD = normalize(data[i][dIdx]);
        const rowR = normalize(data[i][rIdx]);
        if (rowD === targetDept || rowR === 'admin' || rowR === 'super_admin') {
            staffMobiles.push(data[i][mIdx]);
        }
    }

    [...new Set(staffMobiles)].forEach(m => {
        if (m) {
            const msg = `🔁 *TICKET TRANSFERRED*\n\nA ticket has been routed to your unit.\n\n🔹 *Ticket ID:* ${id}\n📍 *From:* ${oldDept}\n📍 *To:* ${newDept}\n👤 *Transferred By:* ${by}\n📝 *Reason:* ${reason}\n\nSBH Group Of Hospitals\n_Automated System Notification_`;
            sendWhatsApp(m, msg);
            Utilities.sleep(800);
        }
    });
}

function getUserMobile(username) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('master');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const uIdx = findCol(headers, 'Username') - 1;
    const mIdx = findCol(headers, 'Mobile') - 1;
    const target = normalize(username);
    for (let i = 1; i < data.length; i++) {
        if (normalize(data[i][uIdx]) === target) return data[i][mIdx];
    }
    return null;
}

// --- LOGGING UTILS ---

function logToAuditHistory(p) {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('history');
    if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('history');
        sheet.appendRow(['Date', 'Ticket ID', 'Action', 'Performed By', 'Remarks', 'Old Status', 'New Status', 'Rating']);
    }
    sheet.appendRow([getISTTimestamp(), p.ID, p.Action, p.By, p.Remark, p.OldStatus, p.NewStatus, p.Rating || '']);
}

function logRating(p) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Complaint_Ratings');
    if (!sheet) {
        sheet = ss.insertSheet('Complaint_Ratings');
        sheet.appendRow(['Date', 'Ticket ID', 'Staff Name', 'Reporter Name', 'Rating', 'Feedback']);
    }
    // Updated Logic: Log to dedicated sheet
    sheet.appendRow([getISTTimestamp(), p.ID, p.Resolver, p.Reporter, p.Rating, p.Remark]);
}

function logCaseTransfer(p) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Case_Transfer_Log');
    if (!sheet) {
        sheet = ss.insertSheet('Case_Transfer_Log');
        sheet.appendRow(['complaint_id', 'transferred_by', 'from_department', 'to_department', 'to_user', 'transfer_time', 'reason']);
        sheet.setFrozenRows(1);
    }
    sheet.appendRow([p.complaint_id, p.transferred_by, p.from_department, p.to_department, p.to_user, p.transfer_time, p.reason]);
}

function logCaseExtend(p) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Case_Extend_Log');
    if (!sheet) {
        sheet = ss.insertSheet('Case_Extend_Log');
        sheet.appendRow(['complaint_id', 'extended_by', 'old_target_date', 'new_target_date', 'diff_days', 'extension_time', 'reason']);
        sheet.setFrozenRows(1);
    }
    sheet.appendRow([p.complaint_id, p.extended_by, p.old_target_date, p.new_target_date, p.diff_days, p.extension_time, p.reason]);
}

function isAlreadyRated(id, reporter) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Complaint_Ratings');
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    const searchId = String(id).toLowerCase();
    const searchReporter = String(reporter).toLowerCase();

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][1]).toLowerCase() === searchId && String(data[i][3]).toLowerCase() === searchReporter) {
            return true;
        }
    }
    return false;
}

function updateUserMetrics(username) {
    if (!username) return;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const rSheet = ss.getSheetByName('Complaint_Ratings');
    if (!rSheet) return;
    const rData = rSheet.getDataRange().getValues();

    let totalRating = 0;
    let ratingCount = 0;
    const targetUser = String(username).toLowerCase();

    for (let i = 1; i < rData.length; i++) {
        if (String(rData[i][2]).toLowerCase() === targetUser) {
            let r = parseFloat(rData[i][4]);
            if (!isNaN(r)) {
                totalRating += r;
                ratingCount++;
            }
        }
    }

    const dSheet = ss.getSheetByName('data');
    const dData = dSheet.getDataRange().getValues();
    let colMap = getColMap(dData[0]); // Simple header check
    // fallback if header logic fails
    if (!colMap.ID) {
        for (let r = 0; r < Math.min(dData.length, 5); r++) {
            const rowStr = dData[r].join(' ').toLowerCase();
            if (rowStr.includes('date') && (rowStr.includes('desc') || rowStr.includes('status'))) {
                colMap = getColMap(dData[r]);
                break;
            }
        }
    }

    let solvedCount = 0;
    if (colMap.ResolvedBy && colMap.Status) {
        for (let i = 1; i < dData.length; i++) {
            const rBy = String(dData[i][colMap.ResolvedBy - 1] || '').toLowerCase();
            const status = String(dData[i][colMap.Status - 1] || '').toLowerCase();
            if (rBy === targetUser && (status === 'closed' || status === 'resolved')) {
                solvedCount++;
            }
        }
    }

    let pSheet = ss.getSheetByName('User_Performance_Ratings');
    if (!pSheet) {
        pSheet = ss.insertSheet('User_Performance_Ratings');
        pSheet.appendRow(['Staff Name', 'Total Cases Solved', 'Total Ratings Received', 'Average Rating', 'Last Updated']);
    }

    const pData = pSheet.getDataRange().getValues();
    const avg = ratingCount > 0 ? (totalRating / ratingCount).toFixed(2) : 0;
    const now = getISTTimestamp();
    let found = false;

    for (let i = 1; i < pData.length; i++) {
        if (String(pData[i][0]).toLowerCase() === targetUser) {
            pSheet.getRange(i + 1, 2).setValue(solvedCount);
            pSheet.getRange(i + 1, 3).setValue(ratingCount);
            pSheet.getRange(i + 1, 4).setValue(avg);
            pSheet.getRange(i + 1, 5).setValue(now);
            found = true;
            break;
        }
    }

    if (!found) {
        pSheet.appendRow([username, solvedCount, ratingCount, avg, now]);
    }
}

function getEscalationContact(level) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('escalation_matrix');
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    const row = data.find(r => String(r[0]).trim().toUpperCase() === String(level).toUpperCase());
    return row ? { name: row[1], mobile: row[2] } : null;
}
