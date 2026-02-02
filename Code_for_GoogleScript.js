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

// --- DEBUGGING: Run this function to test doGet inside the editor ---
function testDoGet() {
    const e = {
        parameter: {
            action: 'read',
            sheet: 'master' // or 'data'
        }
    };
    const result = doGet(e);
    Logger.log(result.getContent());
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
    // Sequential ID Generation: SBH + RowIndex (minus header)
    // Example: Row 2 (First Data) -> 1 -> SBH001
    const serialNumber = rowIdx - 1;
    const newID = "SBH" + String(serialNumber).padStart(4, '0'); // SBH0001

    const dateStr = payload.Date || new Date().toLocaleString();

    // Write by Column mapping (Targeted)
    // Use the generated newID instead of payload.ID
    sheet.getRange(rowIdx, getColIndex(sheet, 'ID')).setValue(newID);
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
        // Use newID for SMS
        sendNewComplaintNotifications(payload.Department, newID, payload.ReportedBy, payload.Description);
    } catch (e) {
        Logger.log("SMS Error: " + e.toString());
    }

    // Return the generated ID to the frontend
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', id: newID, message: 'Complaint Created' })).setMimeType(ContentService.MimeType.JSON);
}

function updateComplaintStatus(payload) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('data');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idColIndex = headers.indexOf('ID');

    if (idColIndex === -1) return response('error', 'ID column missing');

    let rowIndex = -1;
    let reportedBy = ''; // To store for notification

    const reportedByColIndex = headers.indexOf('ReportedBy');

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][idColIndex]) === String(payload.ID)) {
            rowIndex = i + 1;
            // Get ReportedBy if column exists
            if (reportedByColIndex !== -1) {
                reportedBy = data[i][reportedByColIndex];
            }
            break;
        }
    }

    if (rowIndex === -1) return response('error', 'Complaint not found');

    // Update Status
    sheet.getRange(rowIndex, getColIndex(sheet, 'Status')).setValue(payload.Status);

    // If Solved or Closed, add Resolved Info
    if (payload.Status === 'Solved' || payload.Status === 'Closed') {
        const dateStr = new Date().toLocaleString();
        const resolvedBy = payload.ResolvedBy || 'Admin';
        sheet.getRange(rowIndex, getColIndex(sheet, 'ResolvedDate')).setValue(dateStr);
        sheet.getRange(rowIndex, getColIndex(sheet, 'ResolvedBy')).setValue(resolvedBy);

        // Save Remark if provided
        if (payload.Remark) {
            sheet.getRange(rowIndex, getColIndex(sheet, 'Remark')).setValue(payload.Remark);
        }

        // --- RESOLUTION NOTIFICATION ---
        try {
            if (reportedBy) {
                sendResolutionNotification(payload.ID, reportedBy, payload.Status, resolvedBy, payload.Remark);
            }
        } catch (e) {
            Logger.log("Resolution SMS Error: " + e.toString());
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

    // --- APPROVAL NOTIFICATION ---
    if (payload.Status === 'Active') {
        const mobileCol = colMap['Mobile'];
        let userMobile = '';
        if (mobileCol) {
            // Re-fetch to be sure or use payload if available (payload might not have mobile if only status update)
            // Better to read from sheet if not in payload
            userMobile = sheet.getRange(rowIndex, mobileCol).getValue();
        }

        if (userMobile) {
            sendAccountApprovalNotification(payload.Username, userMobile);
        }
    }

    return response('success', 'User Updated');
}

function sendAccountApprovalNotification(username, mobile) {
    const msg = `Welcome to SBH Group of Hospitals! 🏥\n\nYour account has been successfully APPROVED by the Admin. ✅\n\nYou can now login to the CMS portal using your credentials.\nUsername: ${username}\n\n- SBH IT Team`;
    sendWhatsApp(mobile, msg);
}


// --- WhatsApp Notification Logic ---
const API_USERNAME = "SBH HOSPITAL";
const API_PASS = "123456789";
const BASE_URL = "https://app.ceoitbox.com/message/new";

function sendWhatsApp(number, message) {
    if (!number) return;
    try {
        // Send RAW number (User requested 10 digits, maybe API handles country code or expects 10)
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

        const resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
        Logger.log("WhatsApp Response (" + formattedNumber + "): " + resp.getContentText());
    } catch (e) {
        Logger.log("WhatsApp Error (" + number + "): " + e.toString());
    }
}

// RUN THIS FUNCTION MANUALLY TO TEST
function testWhatsAppConnection() {
    // Replace with your mobile number to test
    sendWhatsApp("9876543210", "Test Message from SBH CMS");
}

// 1. Notify on New Complaint
// 1. Notify on New Complaint
function sendNewComplaintNotifications(department, complaintId, reportedByUser, description) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = ss.getSheetByName('master');
    const data = masterSheet.getDataRange().getValues();
    const headers = data[0];

    // Robust Column Mapping
    const colMap = {};
    headers.forEach((h, i) => colMap[h] = i);

    // Check if Mobile column exists
    if (colMap['Mobile'] === undefined) {
        Logger.log("WARNING: 'Mobile' column missing in master sheet. Notifications skipped.");
        return;
    }

    let userMobile = null;
    const staffMobiles = [];

    const targetDept = String(department).trim().toLowerCase();
    const reporterName = String(reportedByUser).trim();

    // Find User & Staff
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const u = String(row[colMap['Username']] || '').trim();
        const dept = String(row[colMap['Department']] || '').trim().toLowerCase();
        const role = String(row[colMap['Role']] || '').trim().toLowerCase();
        const rawMobile = row[colMap['Mobile']];
        const status = row[colMap['Status']];

        // Skip if no mobile
        if (!rawMobile) continue;

        const mobile = String(rawMobile).trim();

        // 1. Find Submitter's Mobile (Matches Username)
        if (u === reporterName) {
            userMobile = mobile;
        }

        // 2. Find Staff (Manager/Admin) of Target Dept OR Global Admin
        // Logic: Notify Department Managers AND Global Admins
        const isDeptMatch = (dept === targetDept);
        const isManager = (role === 'manager');
        const isAdmin = (role === 'admin');

        // Notify: Dept Manager OR Any Admin
        if ((isDeptMatch && isManager && status === 'Active') || (isAdmin && status === 'Active')) {
            staffMobiles.push(mobile);
        }
    }

    // Send to Submitter
    if (userMobile) {
        Logger.log(`Sending Confirmation to Submitter (${reporterName}): ${userMobile}`);
        const msg = `Hello ${reportedByUser}, Your complaint (ID: ${complaintId}) regarding ${department} has been registered successfully.\n\nDescription: ${description}\n\n- SBH Group Of Hospitals`;
        sendWhatsApp(userMobile, msg);
    } else {
        Logger.log(`No mobile found for submitter: ${reporterName}`);
    }

    // Send to Staff
    const uniqueStaff = [...new Set(staffMobiles)];
    Logger.log(`Sending Alerts to ${uniqueStaff.length} Staff Members`);

    uniqueStaff.forEach(mob => {
        // Avoid sending double message if submitter is also staff
        if (String(mob) !== String(userMobile)) {
            const msg = `🚨 NEW COMPLAINT\nID: ${complaintId}\nDept: ${department}\nFrom: ${reportedByUser}\n\n"${description}"\n\nPlease resolve ASAP.\n- SBH Admin System`;
            sendWhatsApp(mob, msg);
            Utilities.sleep(1000); // 1s delay
        }
    });
}

// 2. Notify on Resolution
function sendResolutionNotification(complaintId, reportedByUser, status, resolvedBy, remark) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const masterSheet = ss.getSheetByName('master');
    const data = masterSheet.getDataRange().getValues();
    const headers = data[0];
    const usernameCol = headers.indexOf('Username');
    const mobileCol = headers.indexOf('Mobile');

    if (usernameCol === -1 || mobileCol === -1) return;

    let userMobile = null;
    for (let i = 1; i < data.length; i++) {
        if (String(data[i][usernameCol]) === reportedByUser) {
            userMobile = data[i][mobileCol];
            break;
        }
    }

    if (userMobile) {
        const msg = `Hello ${reportedByUser}, Your complaint (ID: ${complaintId}) has been ${status} by ${resolvedBy}.\nRemark: ${remark || 'No remark'}\n- SBH Hospital`;
        sendWhatsApp(userMobile, msg);
    }
}
