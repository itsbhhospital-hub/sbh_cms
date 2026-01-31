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
        if (action === 'updateComplaintStatus') return updateComplaintStatus(payload); // New Action

        return response('error', 'Invalid action');
    } catch (err) {
        return response('error', err.toString());
    }
}

// --- Helpers ---
function response(status, message) {
    return ContentService.createTextOutput(JSON.stringify({ status: status, message: message })).setMimeType(ContentService.MimeType.JSON);
}

// --- Actions ---

function readData(sheetName) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return response('error', 'Sheet not found');

    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

    const headers = rows[0];
    const data = rows.slice(1).map(row => {
        let obj = {};
        headers.forEach((header, index) => {
            obj[header] = row[index];
        });
        return obj;
    });

    return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// Helper to find column index by name (1-based), or create if missing
function getColIndex(sheet, headerName) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    let index = headers.indexOf(headerName);
    if (index === -1) {
        // Create header if missing
        index = headers.length;
        sheet.getRange(1, index + 1).setValue(headerName);
    }
    return index + 1;
}

function createComplaint(payload) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('data');

    // Ensure Headers
    if (sheet.getLastRow() === 0) {
        sheet.appendRow(['ID', 'Date', 'Department', 'Description', 'Status', 'ReportedBy', 'ResolvedDate', 'ResolvedBy']);
    }

    const rowIdx = sheet.getLastRow() + 1;
    const dateStr = payload.Date || new Date().toLocaleString();

    // Write by Column mapping (Targeted)
    sheet.getRange(rowIdx, getColIndex(sheet, 'ID')).setValue(payload.ID);
    sheet.getRange(rowIdx, getColIndex(sheet, 'Date')).setValue(dateStr);
    sheet.getRange(rowIdx, getColIndex(sheet, 'Department')).setValue(payload.Department);
    sheet.getRange(rowIdx, getColIndex(sheet, 'Description')).setValue(payload.Description);
    sheet.getRange(rowIdx, getColIndex(sheet, 'Status')).setValue('Open');
    sheet.getRange(rowIdx, getColIndex(sheet, 'ReportedBy')).setValue(payload.ReportedBy);

    // Initial empty values for resolved
    sheet.getRange(rowIdx, getColIndex(sheet, 'ResolvedDate')).setValue('');
    sheet.getRange(rowIdx, getColIndex(sheet, 'ResolvedBy')).setValue('');

    // --- SMS TRIGGER ---
    try {
        sendDualSMS(payload.Department, payload.ID, payload.ReportedBy);
    } catch (e) {
        Logger.log("SMS Error: " + e.toString());
    }

    return response('success', 'Complaint Created');
}

function updateComplaintStatus(payload) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('data');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColIndex = headers.indexOf('ID');

    if (idColIndex === -1) return response('error', 'ID column missing');

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][idColIndex]) === String(payload.ID)) {
            rowIndex = i + 1;
            break;
        }
    }

    if (rowIndex === -1) return response('error', 'Complaint not found');

    // Update Status
    sheet.getRange(rowIndex, getColIndex(sheet, 'Status')).setValue(payload.Status);

    // If Solved or Closed, add Resolved Info
    if (payload.Status === 'Solved' || payload.Status === 'Closed') {
        const dateStr = new Date().toLocaleString();
        sheet.getRange(rowIndex, getColIndex(sheet, 'ResolvedDate')).setValue(dateStr);
        sheet.getRange(rowIndex, getColIndex(sheet, 'ResolvedBy')).setValue(payload.ResolvedBy || 'Admin');

        // Save Remark if provided
        if (payload.Remark) {
            sheet.getRange(rowIndex, getColIndex(sheet, 'Remark')).setValue(payload.Remark);
        }
    }

    return response('success', 'Status Updated');
}

function registerUser(payload) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('master');

    if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Username', 'Password', 'Role', 'Status', 'Department', 'Mobile']);
    }

    const rowIdx = sheet.getLastRow() + 1;

    // Targeted Write - Eliminates "Order" bugs
    sheet.getRange(rowIdx, getColIndex(sheet, 'Username')).setValue(payload.Username);
    sheet.getRange(rowIdx, getColIndex(sheet, 'Password')).setValue(payload.Password);
    sheet.getRange(rowIdx, getColIndex(sheet, 'Role')).setValue('User');
    sheet.getRange(rowIdx, getColIndex(sheet, 'Status')).setValue('Pending');
    sheet.getRange(rowIdx, getColIndex(sheet, 'Department')).setValue(payload.Department);
    sheet.getRange(rowIdx, getColIndex(sheet, 'Mobile')).setValue(payload.Mobile || '');

    return response('success', 'User Registered');
}

function updateUser(payload) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('master');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // Map headers
    const colMap = {};
    headers.forEach((h, i) => colMap[h] = i + 1);

    let rowIndex = -1;
    // Find user by Username
    const usernameCol = colMap['Username'];
    if (!usernameCol) return response('error', 'Username column missing');

    for (let i = 1; i < data.length; i++) {
        if (data[i][usernameCol - 1] == payload.Username) {
            rowIndex = i + 1;
            break;
        }
    }

    if (rowIndex === -1) return response('error', 'User not found');

    // Safe Update
    const safeUpdate = (field) => {
        if (payload[field] !== undefined) {
            // If column doesn't exist, create it 
            if (!colMap[field]) {
                const newCol = sheet.getLastColumn() + 1;
                sheet.getRange(1, newCol).setValue(field);
                colMap[field] = newCol;
            }
            sheet.getRange(rowIndex, colMap[field]).setValue(payload[field]);
        }
    };

    safeUpdate('Role');
    safeUpdate('Status');
    safeUpdate('Password');
    safeUpdate('Department');
    safeUpdate('Mobile');

    return response('success', 'User Updated');
}

// --- SMS Logic ---
function sendDualSMS(department, complaintId, reportedByUser) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = ss.getSheetByName('master');
    const data = masterSheet.getDataRange().getValues();
    const headers = data[0];

    const colMap = {};
    headers.forEach((h, i) => colMap[h] = i);

    let managerMobile = null;
    let userMobile = null;

    // Iterate once to find both numbers
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const role = String(row[colMap['Role']] || '').toLowerCase();
        const dept = String(row[colMap['Department']] || '').toLowerCase();
        const username = String(row[colMap['Username']] || '');
        const status = row[colMap['Status']];
        const mobile = row[colMap['Mobile']];

        if (!mobile) continue;

        // 1. Find Manager
        if (role === 'manager' && dept === String(department).toLowerCase() && status === 'Active') {
            managerMobile = mobile;
        }

        // 2. Find Submitter (User)
        if (username === reportedByUser) {
            userMobile = mobile;
        }
    }

    const sendAPI = (number, text) => {
        if (!number) return;
        const rootUrl = 'http://sms.messageindia.in/v2/sendSMS';
        const params = {
            'username': 'sbhhospital',
            'message': text,
            'sendername': 'SBHOTP',
            'smstype': 'TRANS',
            'numbers': number,
            'apikey': 'ede7ca8a-d272-437f-9fa5-dfa5136cedf9',
            'peid': '1201160586649150204',
            'templateid': '1707176466056496728'
        };
        const queryString = Object.keys(params).map(key => key + '=' + encodeURIComponent(params[key])).join('&');
        try {
            UrlFetchApp.fetch(rootUrl + "?" + queryString);
            Logger.log("SMS sent to " + number);
        } catch (e) {
            Logger.log("Failed to send to " + number + ": " + e);
        }
    };

    // Template 1: For Manager
    if (managerMobile) {
        // "SBH Group Of Hospital New Complaint for [Dept]. ID: [ID]. Check Dashboard."
        const managerMsg = 'SBH Group Of Hospital New Complaint for ' + department + '. ID: ' + complaintId + '. Check Dashboard.';
        sendAPI(managerMobile, managerMsg);
    }

    // Template 2: For User
    if (userMobile) {
        // "SBH Group Of Hospital Complaint Registered. ID: [ID]. We will resolve it soon."
        const userMsg = 'SBH Group Of Hospital Complaint Registered for ' + department + '. ID: ' + complaintId + '. We will resolve it soon.';
        sendAPI(userMobile, userMsg);
    }
}
