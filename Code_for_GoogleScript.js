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
        if (t === 'id' && (h === 'tid' || h === 'ticketid')) return i + 1;
        if (t === 'mobile' && h.includes('phone')) return i + 1;
        if (t === 'department' && h === 'dept') return i + 1;
    }
    return -1;
}

function getColMap(headers) {
    const map = {};
    const keys = ['ID', 'Date', 'Department', 'Description', 'Status', 'ReportedBy', 'ResolvedBy', 'Remark', 'Username', 'Password', 'Role', 'Mobile'];
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
    if (!sheet) return response('error', 'Sheet "data" not found');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colMap = getColMap(headers);
    if (!colMap.ID) return response('error', 'ID column not found');

    const nextRow = sheet.getLastRow() + 1;
    const existingIds = data.slice(1).map(r => String(r[colMap.ID - 1])).filter(id => id.startsWith('SBH'));
    let newId = 'SBH00001';
    if (existingIds.length > 0) {
        const match = existingIds[existingIds.length - 1].match(/SBH(\d+)/);
        if (match) newId = 'SBH' + String(parseInt(match[1], 10) + 1).padStart(5, '0');
    }

    const fields = {
        'ID': newId,
        'Date': payload.Date || new Date().toISOString(),
        'Department': payload.Department,
        'Description': payload.Description,
        'Status': 'Open',
        'ReportedBy': payload.ReportedBy
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
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colMap = getColMap(headers);
    if (!colMap.ID) return response('error', 'ID column not found');

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
        if (data[i][colMap.ID - 1] == payload.ID) {
            rowIndex = i + 1;
            break;
        }
    }
    if (rowIndex === -1) return response('error', 'Complaint not found');

    const fields = {
        'Status': payload.Status,
        'ResolvedBy': payload.ResolvedBy,
        'Remark': payload.Remark
    };

    Object.keys(fields).forEach(f => {
        if (colMap[f]) sheet.getRange(rowIndex, colMap[f]).setValue(fields[f]);
    });

    if (payload.Status === 'Resolved' || payload.Status === 'Closed') {
        const reportedBy = colMap.ReportedBy ? data[rowIndex - 1][colMap.ReportedBy - 1] : '';
        sendComplaintResolutionNotification(reportedBy, payload.ID, payload.Status, payload.Remark);
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
    const msg = `Welcome to SBH Group of Hospitals! 🏥✨\n\nYour account has been successfully APPROVED by the Admin. ✅\n\nYou can now login to the CMS portal and start using the system.\n\n👤 Username: ${username}\n\nWe are glad to have you on board! 🙏\n- SBH IT Team`;
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
        const msg = `Hello ${reportedByUser}! 👋 Your complaint has been registered successfully. 🏢\n\n🎫 Ticket ID: ${complaintId}\n📂 Dept: ${department}\n📝 Description: ${description}\n\nOur team is working on it. Thank you for your patience! 🙏\n- SBH Group Of Hospitals`;
        sendWhatsApp(userMobile, msg);
    }

    [...new Set(staffMobiles)].forEach(mob => {
        if (mob != userMobile && mob) {
            const msg = `🚨 NEW COMPLAINT ALERT 🚨\n\n🎫 ID: ${complaintId}\n🏢 Dept: ${department}\n👤 From: ${reportedByUser}\n📝 Issue: "${description}"\n\nPlease check the CMS and resolve at the earliest. ⏳\n- SBH Admin System`;
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
        const msg = `Hello ${reportedByUser}! ✅ Your complaint has been updated.\n\n🎫 Ticket ID: ${complaintId}\n📊 Status: ${status}\n👤 Resolved By: ${resolvedBy}\n📝 Remark: ${remark || 'N/A'}\n\nThank you for bringing this to our attention! 🙏\n- SBH Hospital`;
        sendWhatsApp(userMobile, msg);
    }
}
