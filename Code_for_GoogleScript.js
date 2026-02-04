// 1. Open your Spreadsheet
// 2. Extensions > Apps Script
// 3. Paste this ENTIRE code into Code.gs (Delete old code)
// 4. Click Deploy > Manage Deployments > Edit (Pencil) > Version: New Version > Deploy
// 5. COPY the URL

function doGet(e) {
    const action = e.parameter.action;
    const sheetName = e.parameter.sheet || 'data';

    if (action === 'read') {
        return readData(sheetName);
    }
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
        if (action === 'updateComplaintStatus') return updateComplaintStatus(payload);

        return response('error', 'Invalid action');
    } catch (err) {
        return response('error', err.toString());
    }
}

// --- HELPER FUNCTIONS ---

function findCol(headers, target) {
    const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const t = norm(target);
    for (let i = 0; i < headers.length; i++) {
        const h = norm(headers[i]);
        if (h === t) return i + 1;
        // Partial matches for common variations
        if (t === 'id' && (
            h === 'tid' || h === 'ticketid' || h === 'complaintid' ||
            h === 'ticketno' || h === 'refno' || h === 'sno' ||
            h === 'complaintno' || h === 'ticket' || h === 'complaint' ||
            h === 'ref' || h === 'serialno' || h === 'srno' || h === 'uniqueid'
        )) return i + 1;

        if (t === 'mobile' && (h.includes('phone') || h.includes('mobile') || h === 'contact')) return i + 1;
        if (t === 'department' && (h === 'dept' || h === 'department')) return i + 1;
        if (t === 'reportedby' && (h === 'user' || h === 'username' || h === 'reportedby' || h === 'from')) return i + 1;
        if (t === 'resolveddate' && (h.includes('resolved') && h.includes('date'))) return i + 1;
        if (t === 'targetdate' && (h.includes('target') || h.includes('deadline'))) return i + 1;
    }
    return -1;
}

function getColMap(headers) {
    const map = {};
    const keys = ['ID', 'Date', 'Department', 'Description', 'Status', 'ReportedBy', 'ResolvedBy', 'Remark', 'Username', 'Password', 'Role', 'Mobile', 'Resolved Date', 'Unit', 'History', 'TargetDate'];
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
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    return ContentService.createTextOutput(JSON.stringify(data.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h || ('Col' + i)] = row[i]);
        return obj;
    }))).setMimeType(ContentService.MimeType.JSON);
}

function createComplaint(payload) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('data');
    if (!sheet) return response('error', 'Sheet "data" not found. Please create it.');

    // SMART HEADER DETECTION (Scan first 5 rows)
    let data = sheet.getDataRange().getValues();
    let headerRowIndex = 0;
    let headers = [];

    // Look for a row that contains 'Date' or 'Description' or 'Status'
    for (let r = 0; r < Math.min(data.length, 5); r++) {
        const rowStr = data[r].join(' ').toLowerCase();
        if (rowStr.includes('date') && (rowStr.includes('desc') || rowStr.includes('status'))) {
            headerRowIndex = r;
            headers = data[r];
            break;
        }
    }

    // If headers still empty, default to row 0
    if (headers.length === 0 && data.length > 0) headers = data[0];

    let colMap = getColMap(headers);

    // SELF HEALING: Check for essential columns independently and create if missing
    const essentialCols = ['Unit', 'History', 'TargetDate', 'Resolved Date', 'Rating'];
    let mappingUpdated = false;

    essentialCols.forEach(colName => {
        if (!colMap[colName]) {
            const currentLastCol = sheet.getLastColumn();
            sheet.getRange(headerRowIndex + 1, currentLastCol + 1).setValue(colName);
            mappingUpdated = true;
        }
    });

    // If we added columns, re-map
    if (mappingUpdated) {
        data = sheet.getDataRange().getValues();
        headers = data[headerRowIndex];
        colMap = getColMap(headers);
    }

    // Explicitly check for Rating column INDEPENDENTLY
    if (!colMap.Rating) {
        const lastCol = sheet.getLastColumn();
        sheet.getRange(headerRowIndex + 1, lastCol + 1).setValue('Rating');
        // Final Re-map
        data = sheet.getDataRange().getValues();
        headers = data[headerRowIndex];
        colMap = getColMap(headers);
    }

    // Final Check
    if (!colMap.ID) return response('error', 'Creating ID column failed. Headers found: ' + headers.join(', '));

    const nextRow = sheet.getLastRow() + 1;

    // Generate ID based on existing data
    // We only look at the specific ID column we mapped
    const existingIds = data.slice(headerRowIndex + 1).map(r => String(r[colMap.ID - 1] || '')).filter(id => id.startsWith('SBH'));

    let newId = 'SBH00001';
    if (existingIds.length > 0) {
        const lastId = existingIds[existingIds.length - 1];
        const match = lastId.match(/SBH(\d+)/);
        if (match) newId = 'SBH' + String(parseInt(match[1], 10) + 1).padStart(5, '0');
    }

    // FIX TIMEZONE: Use IST (GMT+5:30)
    const timestamp = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd HH:mm:ss");

    // Initial History
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

function registerUser(payload) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('master');
    if (!sheet) return response('error', 'Sheet "master" not found');
    const headers = sheet.getDataRange().getValues()[0];
    const colMap = getColMap(headers);
    const nextRow = sheet.getLastRow() + 1;

    const fields = {
        'Username': payload.Username,
        'Password': payload.Password,
        'Role': payload.Role || 'user',
        'Status': payload.Status || 'Pending',
        'Department': payload.Department,
        'Mobile': payload.Mobile
    };

    Object.keys(fields).forEach(f => {
        if (colMap[f]) sheet.getRange(nextRow, colMap[f]).setValue(fields[f]);
    });

    if (payload.Status === 'Active' && payload.Mobile) {
        sendAccountApprovalNotification(payload.Username, payload.Mobile);
    }
    return response('success', 'User Registered');
}

function updateUser(payload) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('master');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colMap = getColMap(headers);
    if (!colMap.Username) return response('error', 'Username column not found');

    const target = (payload.OldUsername || payload.Username || '').toLowerCase().trim();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
        const rowVal = String(data[i][colMap.Username - 1] || '').toLowerCase().trim();
        if (rowVal === target) {
            rowIndex = i + 1;
            break;
        }
    }
    if (rowIndex === -1) return response('error', 'User not found');

    Object.keys(payload).forEach(f => {
        if (colMap[f]) sheet.getRange(rowIndex, colMap[f]).setValue(payload[f]);
    });

    if (payload.Status === 'Active' && colMap.Mobile) {
        sendAccountApprovalNotification(payload.Username, sheet.getRange(rowIndex, colMap.Mobile).getValue());
    }
    return response('success', 'User Updated');
}

function updateComplaintStatus(payload) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('data');

    // SMART HEADER DETECTION (Scan first 5 rows)
    let data = sheet.getDataRange().getValues();
    let headerRowIndex = 0;
    let headers = [];

    for (let r = 0; r < Math.min(data.length, 5); r++) {
        const rowStr = data[r].join(' ').toLowerCase();
        if (rowStr.includes('date') && (rowStr.includes('desc') || rowStr.includes('status'))) {
            headerRowIndex = r;
            headers = data[r];
            break;
        }
    }
    if (headers.length === 0 && data.length > 0) headers = data[0];

    const colMap = getColMap(headers);
    if (!colMap.ID) return response('error', 'ID column not found for update. Headers: ' + headers.join(', '));

    let rowIndex = -1;
    const searchId = String(payload.ID || '').trim().toLowerCase(); // Normalize Payload ID

    // Search using the found ID column
    for (let i = headerRowIndex + 1; i < data.length; i++) {
        const cellId = String(data[i][colMap.ID - 1] || '').trim().toLowerCase(); // Normalize Cell ID
        if (cellId === searchId) {
            rowIndex = i + 1;
            break;
        }
    }
    if (rowIndex === -1) return response('error', 'Complaint not found. Searched for: "' + searchId + '"');

    const timestamp = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd HH:mm:ss");
    let currentHistory = colMap.History ? String(sheet.getRange(rowIndex, colMap.History).getValue()) : '';
    let actionLog = '';

    // --- LOGIC HANDLING ---

    // CASE 1: EXTENSION
    if (payload.Status === 'Extend') {
        if (colMap.TargetDate && payload.TargetDate) {
            sheet.getRange(rowIndex, colMap.TargetDate).setValue(payload.TargetDate);
            actionLog = `[${timestamp}] Extended by ${payload.ResolvedBy} until ${payload.TargetDate}. Reason: ${payload.Remark}`;
        } else {
            actionLog = `[${timestamp}] Extended by ${payload.ResolvedBy}. Reason: ${payload.Remark} (No Target Date provided)`;
        }
        // Important: We do not change the main 'Status' column to 'Extend' usually, 
        // unless you want a specific status. Often extensions keep the ticket 'Open' 
        // or put it in 'In Progress'. Let's keep it as is or set to 'In Progress' if logic dictates.
        // For now, allow Status update if provided explicitly, otherwise don't change 'Status' col.
    }

    // CASE 2: RESOLUTION / CLOSURE / RE-OPEN
    else {
        const actionBy = payload.ResolvedBy || 'User';
        const shouldUpdateResolver = (payload.Status === 'Resolved' || payload.Status === 'Solved');

        // Update STATUS
        if (colMap.Status && payload.Status) sheet.getRange(rowIndex, colMap.Status).setValue(payload.Status);

        // Update RESOLVER (Only if first time closing or staff update)
        // If Status is already 'Closed', skip updating 'ResolvedBy' to prevent user overwrite.
        const currentStatus = (rowIndex > 1 && colMap.Status) ? data[rowIndex - 1][colMap.Status - 1] : '';
        if (colMap.ResolvedBy && currentStatus !== 'Closed') {
            sheet.getRange(rowIndex, colMap.ResolvedBy).setValue(actionBy);
        }

        let historyLines = [];

        // 1. Status Log
        let statusLog = `[${timestamp}] Status: ${payload.Status} by ${actionBy}`;
        if (!payload.Rating && payload.Remark) statusLog += `. Remark: ${payload.Remark}`; // Attach remark here if NO rating
        historyLines.push(statusLog);

        // 2. Rating Log (Separate Row)
        if (colMap.Rating && payload.Rating) {
            sheet.getRange(rowIndex, colMap.Rating).setValue(payload.Rating);
            historyLines.push(`[${timestamp}] ⭐ Rated ${payload.Rating}/5 by ${actionBy}. Feedback: ${payload.Remark}`);

            // Log to dedicated Ratings sheet
            logRating({
                ID: payload.ID,
                Rating: payload.Rating,
                Remark: payload.Remark,
                Resolver: colMap.ResolvedBy ? data[rowIndex - 1][colMap.ResolvedBy - 1] : 'Unknown',
                Reporter: actionBy
            });
        }

        // Combine for History
        actionLog = historyLines.join('\n');

        // Capture Resolved Date (Only on first closure)
        if (payload.Status === 'Closed' && colMap['Resolved Date'] && currentStatus !== 'Closed') {
            sheet.getRange(rowIndex, colMap['Resolved Date']).setValue(timestamp);
        }
    }


    // Global Remark Update (Always show latest remark in main column)
    if (colMap.Remark && payload.Remark) sheet.getRange(rowIndex, colMap.Remark).setValue(payload.Remark);

    // Append History Log
    if (colMap.History && actionLog) {
        const separator = currentHistory ? '\n' : '';
        sheet.getRange(rowIndex, colMap.History).setValue(currentHistory + separator + actionLog);
    }

    // Notifications
    // 1. Resolution / Closure
    if (payload.Status === 'Resolved' || payload.Status === 'Closed') {
        const reportedBy = colMap.ReportedBy ? data[rowIndex - 1][colMap.ReportedBy - 1] : '';
        sendResolutionNotification(payload.ID, reportedBy, payload.Status, payload.ResolvedBy, payload.Remark);
    }
    // 2. Extension
    else if (payload.Status === 'Extend') {
        const reportedBy = colMap.ReportedBy ? data[rowIndex - 1][colMap.ReportedBy - 1] : '';
        // (complaintId, reportedByUser, extendedBy, newDate, reason)
        sendExtensionNotification(payload.ID, reportedBy, payload.ResolvedBy, payload.TargetDate, payload.Remark);
    }

    return response('success', 'Status Updated');
}

function deleteUser(payload) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('master');
    const data = sheet.getDataRange().getValues();
    const usernameCol = data[0].indexOf('Username');

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][usernameCol]).trim().toLowerCase() === String(payload.Username).trim().toLowerCase()) {
            sheet.deleteRow(i + 1);
            return response('success', 'User Deleted');
        }
    }
    return response('error', 'User not found');
}

// --- WhatsApp Notification Logic ---
const API_USERNAME = "SBH HOSPITAL";
const API_PASS = "123456789";
const BASE_URL = "https://app.ceoitbox.com/message/new";

function sendWhatsApp(number, message) {
    if (!number) return;
    try {
        let formattedNumber = String(number).trim().replace(/\D/g, '');
        const params = {
            'username': API_USERNAME,
            'password': API_PASS,
            'receiverMobileNo': formattedNumber,
            'receiverName': 'SBH User',
            'message': message
        };
        const queryString = Object.keys(params).map(key => key + '=' + encodeURIComponent(params[key])).join('&');
        const url = BASE_URL + "?" + queryString;
        UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    } catch (e) {
        Logger.log("Error: " + e.toString());
    }
}

// --- PREMIUM TEMPLATES ---

function sendAccountApprovalNotification(username, mobile) {
    const msg = `Dear ${username},\n\nWe are pleased to inform you that your account registration for the SBH CMS Portal has been APPROVED.\n\nLogin Credentials:\nUsername: ${username}\nPortal Link: https://sbh-cms.vercel.app/\n\nYou may now access the dashboard to report or manage tickets.\n\nRegards,\nSBH IT Administration`;
    sendWhatsApp(mobile, msg);
}

function sendNewComplaintNotifications(department, complaintId, reportedByUser, description) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = ss.getSheetByName('master');
    const data = masterSheet.getDataRange().getValues();
    const headers = data[0];

    const colMap = {};
    headers.forEach((h, i) => colMap[h] = i);

    let userMobile = null;
    const staffMobiles = [];
    const targetDept = String(department || '').trim().toLowerCase();
    const reporterName = String(reportedByUser || '').trim().toLowerCase();

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const u = String(row[colMap['Username']] || '').trim().toLowerCase();
        const dept = String(row[colMap['Department']] || '').trim().toLowerCase();
        const role = String(row[colMap['Role']] || '').trim().toLowerCase();
        const status = String(row[colMap['Status']] || '').trim().toLowerCase();
        const mobile = row[colMap['Mobile']];

        if (status !== 'active') continue;

        if (u === reporterName) userMobile = mobile;

        // Notify anyone in the target department OR any admin
        if (dept === targetDept || role === 'admin') {
            staffMobiles.push(mobile);
        }
    }

    if (userMobile) {
        const msg = `Dear ${reportedByUser},\n\nYour complaint has been successfully registered.\n\nTicket ID: ${complaintId}\nDepartment: ${department}\nDescription: ${description}\n\nOur team has been notified and will address this shortly.\nTrack status: https://sbh-cms.vercel.app/\n\nRegards,\nSBH Support Team`;
        sendWhatsApp(userMobile, msg);
    }

    [...new Set(staffMobiles)].forEach(mob => {
        if (mob != userMobile && mob) {
            const msg = `URGENT ALERT: New Incident Reported\n\nTicket ID: ${complaintId}\nDepartment: ${department}\nReported By: ${reportedByUser}\nIssue: ${description}\n\nPlease login to acknowledge and resolve: https://sbh-cms.vercel.app/\n\nSBH CMS Automation`;
            sendWhatsApp(mob, msg);
            Utilities.sleep(1000);
        }
    });
}

function sendResolutionNotification(complaintId, reportedByUser, status, resolvedBy, remark) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = ss.getSheetByName('master');
    const data = masterSheet.getDataRange().getValues();
    const headers = data[0];
    const usernameCol = headers.indexOf('Username');
    const mobileCol = headers.indexOf('Mobile');

    let userMobile = null;
    const searchName = String(reportedByUser || '').trim().toLowerCase();

    for (let i = 1; i < data.length; i++) {
        const rowUser = String(data[i][usernameCol] || '').trim().toLowerCase();
        if (rowUser === searchName) {
            userMobile = data[i][mobileCol];
            break;
        }
    }

    if (userMobile) {
        const msg = `Dear ${reportedByUser},\n\nUpdate on Ticket #${complaintId}:\n\nStatus: ${status}\nAction By: ${resolvedBy}\nRemark: ${remark || 'N/A'}\n\nPlease login to review the resolution and rate the service: https://sbh-cms.vercel.app/\n\nRegards,\nSBH Support Team`;
        sendWhatsApp(userMobile, msg);
    }
}

function sendExtensionNotification(complaintId, reportedByUser, extendedBy, newDate, reason) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = ss.getSheetByName('master');
    const data = masterSheet.getDataRange().getValues();
    const headers = data[0];
    const usernameCol = headers.indexOf('Username');
    const mobileCol = headers.indexOf('Mobile');

    let userMobile = null;
    const searchName = String(reportedByUser || '').trim().toLowerCase();

    for (let i = 1; i < data.length; i++) {
        const rowUser = String(data[i][usernameCol] || '').trim().toLowerCase();
        if (rowUser === searchName) {
            userMobile = data[i][mobileCol];
            break;
        }
    }

    if (userMobile) {
        const msg = `Dear ${reportedByUser},\n\nRegarding Ticket #${complaintId}: The target resolution date has been extended.\n\nNew Target Date: ${newDate}\nReason: ${reason}\nUpdated By: ${extendedBy}\n\nWe apologize for the delay.\n\nRegards,\nSBH Support Team`;
        sendWhatsApp(userMobile, msg);
    }
}

function logRating(data) {
    const sheetName = 'ratings';
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

    // Create sheet if not exists
    if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
        sheet.appendRow(['Date', 'Ticket ID', 'Staff Name (Resolver)', 'Reporter Name', 'Rating', 'Feedback']);
        sheet.getRange("A1:F1").setFontWeight("bold").setBackground("#f3f4f6");
    }

    const timestamp = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd HH:mm:ss");

    sheet.appendRow([
        timestamp,
        data.ID,
        data.Resolver,  // Staff who solved it
        data.Reporter,  // User who rated it
        data.Rating,
        data.Remark || ''
    ]);
}
