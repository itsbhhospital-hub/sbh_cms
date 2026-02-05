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
    if (!sheet) return response('error', 'Sheet not found');

    // MIGRATION: Ensure 'admin' exists if we are reading the master sheet
    if (sheetName === 'master') {
        ensureAdminExists(sheet);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    return ContentService.createTextOutput(JSON.stringify(data.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h || ('Col' + i)] = row[i]);
        return obj;
    }))).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Migration Helper: Ensures the legacy 'admin' user is present in the master sheet.
 * This establishes the Google Sheet as the single source of truth.
 */
function ensureAdminExists(sheet) {
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const map = getColMap(headers);
    if (!map.Username) return;

    const strictNorm = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const adminExists = data.some((row, i) => i > 0 && strictNorm(row[map.Username - 1]) === 'admin');

    if (!adminExists) {
        const nextRow = sheet.getLastRow() + 1;
        if (map.Username) sheet.getRange(nextRow, map.Username).setValue('admin');
        if (map.Password) sheet.getRange(nextRow, map.Password).setValue('admin123'); // Default initial password
        if (map.Role) sheet.getRange(nextRow, map.Role).setValue('admin');
        if (map.Department) sheet.getRange(nextRow, map.Department).setValue('ADMIN');
        if (map.Status) sheet.getRange(nextRow, map.Status).setValue('Active');
        if (map.Mobile) sheet.getRange(nextRow, map.Mobile).setValue('0000000000');
        SpreadsheetApp.flush();
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
    const colMap = getColMap(headers);
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
        actionLog = `[${timestamp}] Extended by ${payload.ResolvedBy}. Reason: ${payload.Remark}`;
        if (colMap.TargetDate) sheet.getRange(rowIndex, colMap.TargetDate).setValue(payload.TargetDate || '');
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
        if (colMap.ResolvedBy && (payload.Status === 'Closed' || payload.Status === 'Resolved') && !existingRes) {
            sheet.getRange(rowIndex, colMap.ResolvedBy).setValue(payload.ResolvedBy);
        }

        // History Log
        if ((payload.Status === 'Open' || payload.Status === 'Closed') && payload.Status !== currentStatus) {
            const label = (payload.Status === 'Open' && currentStatus === 'Closed') ? 'RE-OPEN' : payload.Status.toUpperCase();
            actionLog = `[${timestamp}] ${label} by ${payload.ResolvedBy}. Remark: ${payload.Remark}`;
        }

        // Rating
        if (payload.Rating && colMap.Rating) {
            if (isAlreadyRated(payload.ID)) return response('error', 'Already Rated');
            sheet.getRange(rowIndex, colMap.Rating).setValue(payload.Rating);

            let resolver = colMap.ResolvedBy ? data[rowIndex - 1][colMap.ResolvedBy - 1] : '';
            logRating({ ID: payload.ID, Rating: payload.Rating, Remark: payload.Remark, Resolver: resolver || payload.ResolvedBy, Reporter: payload.ResolvedBy });
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
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('data');
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

    logToAuditHistory({ ID: payload.ID, Action: 'Transfer', By: payload.TransferredBy, Remark: payload.Reason, OldStatus: oldDept, NewStatus: payload.NewDepartment });

    // Template 3: Transfer
    sendTransferNotification(payload.ID, oldDept, payload.NewDepartment, payload.TransferredBy, payload.Reason);
    return response('success', 'Transferred');
}

function updateUser(p) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('master');
    const data = sheet.getDataRange().getValues();
    const map = getColMap(data[0]);

    const target = String(p.OldUsername || p.Username).trim().toLowerCase();
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][map.Username - 1]).trim().toLowerCase() === target) {
            if (p.Password && map.Password) sheet.getRange(i + 1, map.Password).setValue(p.Password);
            if (p.Role && map.Role) sheet.getRange(i + 1, map.Role).setValue(p.Role);
            if (p.Status && map.Status) sheet.getRange(i + 1, map.Status).setValue(p.Status);
            if (p.Department && map.Department) sheet.getRange(i + 1, map.Department).setValue(p.Department);
            if (p.Mobile && map.Mobile) sheet.getRange(i + 1, map.Mobile).setValue(p.Mobile);

            if (p.Status === 'Active' && map.Mobile) sendAccountApprovalNotification(p.Username, sheet.getRange(i + 1, map.Mobile).getValue());
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
    const target = String(p.Username).trim().toLowerCase();
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][map.Username - 1]).trim().toLowerCase() === target) {
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
        if (rowD === targetDept || rowR === 'admin') staffMobiles.push(mobile);
    }

    // Template 1: User Confirmation
    if (userMobile) {
        const msg = `Dear User,\n\nYour complaint has been successfully registered with the ${dept} Department.\n\n🔹 Complaint ID: ${id}\n\nWe assure you of a prompt resolution. Our team is looking into this priority.\n\nSBH Group Of Hospitals\n*This is an automated message. Please do not reply.*`;
        sendWhatsApp(userMobile, msg);
    }

    // Template 2: Dept Alert (No "New Incident")
    [...new Set(staffMobiles)].forEach(m => {
        if (m && m !== userMobile) {
            const msg = `Alert: New Action Item\n\nA new complaint has been assigned to the ${dept} Department.\n\n� Ticket ID: ${id}\n🔸 Description: ${desc}\n\nPlease review and initiate necessary action immediately.\n\nSBH Group Of Hospitals\n*This is an automated message. Please do not reply.*`;
            sendWhatsApp(m, msg);
            Utilities.sleep(800);
        }
    });
}

function sendResolutionNotification(id, reportedBy, status, resolvedBy, remark) {
    const mob = getUserMobile(reportedBy);
    // Template 4: Resolved
    if (mob) {
        const msg = `Dear User,\n\nWe are pleased to inform you that your complaint #${id} has been resolved.\n\n✅ Resolution Status: ${status}\n💬 Remarks: ${remark}\n\nWe value your feedback and hope you are satisfied with our service.\n\nSBH Group Of Hospitals\n*This is an automated message. Please do not reply.*`;
        sendWhatsApp(mob, msg);
    }
}

function sendExtensionNotification(id, reportedBy, by, date, reason) {
    const mob = getUserMobile(reportedBy);
    if (mob) {
        const msg = `Update on Ticket #${id}\n\nYour ticket has been extended to ${date}.\n\n👤 By: ${by}\n📝 Reason: ${reason}\n\nWe appreciate your patience.\n\nSBH Group Of Hospitals\n*This is an automated message. Please do not reply.*`;
        sendWhatsApp(mob, msg);
    }
}

function sendAccountApprovalNotification(user, mobile) {
    if (mobile) {
        const msg = `Welcome, ${user}!\n\nYour account has been officially approved.\n\n✅ Status: Active\n\nYou may now login to the portal: https://sbh-cms.vercel.app/\n\nSBH Group Of Hospitals\n*This is an automated message. Please do not reply.*`;
        sendWhatsApp(mobile, msg);
    }
}

function sendReopenNotification(id, staff, by, remark) {
    const mob = getUserMobile(staff);
    if (mob) {
        // Template 5: Re-Opened
        const msg = `⚠️ Ticket Re-Opened\n\nComplaint #${id} has been flagged for re-evaluation by ${by}.\n\n⚠️ Action: Immediate Attention Required\n📝 Remarks: ${remark}\n\nPlease address the pending concerns on priority.\n\nSBH Group Of Hospitals\n*This is an automated message. Please do not reply.*`;
        sendWhatsApp(mob, msg);
    }
}

function sendForceCloseNotification(id, reportedBy, reason) {
    const mob = getUserMobile(reportedBy);
    if (mob) {
        const msg = `Dear User,\n\nYour complaint #${id} has been administratively closed by the Management.\n\n🔒 Action: Force Closed\n📝 Reason: ${reason || 'Administrative Action'}\n\nFor further assistance, please contact the administration office.\n\nSBH Group Of Hospitals\n*This is an automated message. Please do not reply.*`;
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
        if (rowD === targetDept || rowR === 'admin') {
            staffMobiles.push(data[i][mIdx]);
        }
    }

    [...new Set(staffMobiles)].forEach(m => {
        if (m) {
            const msg = `Ticket Transfer Notification\n\nComplaint #${id} has been transferred.\n\n📍 From: ${oldDept}\n📍 To: ${newDept}\n👤 By: ${by}\n📝 Reason: ${reason}\n\nPlease coordinate ensuring seamless resolution.\n\nSBH Group Of Hospitals\n*This is an automated message. Please do not reply.*`;
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

// --- LOGGING ---
function logToAuditHistory(p) {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('history');
    if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('history');
        sheet.appendRow(['Date', 'Ticket ID', 'Action', 'Performed By', 'Remarks', 'Old Status', 'New Status', 'Rating']);
    }
    // Added Rating back to match User's schema expectations
    sheet.appendRow([getISTTimestamp(), p.ID, p.Action, p.By, p.Remark, p.OldStatus, p.NewStatus, p.Rating || '']);
}

function logRating(p) {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ratings');
    if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('ratings');
        sheet.appendRow(['Date', 'Ticket ID', 'Rating', 'Remark', 'Resolver', 'Reporter']);
    }
    sheet.appendRow([getISTTimestamp(), p.ID, p.Rating, p.Remark, p.Resolver, p.Reporter]);
}

function isAlreadyRated(id) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ratings');
    if (!sheet) return false;
    const data = sheet.getDataRange().getValues();
    const search = String(id).toLowerCase();
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][1]).toLowerCase() === search) return true;
    }
    return false;
}

// --- ESCALATION ---
function getEscalationContact(level) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('escalation_matrix');
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    const row = data.find(r => String(r[0]).trim().toUpperCase() === String(level).toUpperCase());
    return row ? { name: row[1], mobile: row[2] } : null;
}

function checkEscalationStatus() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('data');
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colMap = getColMap(headers);
    if (!colMap.Status || !colMap['Reopened Date']) return;

    const now = new Date();
    const L1 = getEscalationContact('L1');
    const L2 = getEscalationContact('L2');

    for (let i = 1; i < data.length; i++) {
        const status = String(data[i][colMap.Status - 1] || '');
        const reopStr = data[i][colMap['Reopened Date'] - 1];
        if (status === 'Open' && reopStr) {
            const diff = (now - new Date(reopStr)) / 36e5; // hours
            const id = data[i][colMap.ID - 1];
            if (diff >= 24 && L1) sendWhatsApp(L1.mobile, `🔥 L1 ESCALATION: Ticket #${id} pending >24h.`);
            else if (diff >= 4 && L2) sendWhatsApp(L2.mobile, `⚠️ L2 ALERT: Ticket #${id} pending >4h.`);
        }
    }
}
