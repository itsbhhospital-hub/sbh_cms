// -------------------------------------------------------------------------------------------------
// 1. GLOBAL CONFIGURATION & SETUP
// -------------------------------------------------------------------------------------------------
const SCRIPT_PROP = PropertiesService.getScriptProperties();

// !!! DRIVE FOLDER ID - DO NOT CHANGE !!!
const DRIVE_FOLDER_ID = '1p2H9Ckj3154JC3KdEuz71f5Xbyc0d8jE';

const IST_TIMEZONE = "GMT+5:30";
const DATE_FORMAT = "yyyy-MM-dd'T'HH:mm:ss.SSS'+05:30'";

function getISTTimestamp() {
    return Utilities.formatDate(new Date(), IST_TIMEZONE, "dd-MM-yyyy hh:mm:ss a");
}

// --- MASTER HELPERS (NEW) ---

function parseCustomDate(dateStr) {
    if (!dateStr) return new Date();
    // Handle "dd-MM-yyyy..." format which new Date() hates
    // Remove possible leading '
    const clean = String(dateStr).replace(/'/g, '').trim();

    // Check if it matches dd-MM-yyyy
    // Simple parsing assuming dd-MM-yyyy ...
    // If native parse works (ISO), use it. Date.parse returns NaN if failed.
    const ts = Date.parse(clean);
    if (!isNaN(ts)) return new Date(ts);

    // Manual Parse for dd-MM-yyyy
    // Split by non-digits
    const parts = clean.split(/[^0-9]/);
    if (parts.length >= 3) {
        // parts[0]=dd, parts[1]=MM, parts[2]=yyyy
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (year > 1900 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
            return new Date(year, month, day);
        }
    }
    return new Date(); // Fallback to now or invalid
}

function getOrCreateSheet(sheetName, headers) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        if (headers && headers.length > 0) {
            sheet.appendRow(headers);
            sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
        }
    }
    return sheet;
}

function formatDateIST(dateObj) {
    return Utilities.formatDate(new Date(dateObj), IST_TIMEZONE, "dd-MM-yyyy");
}

function formatTimeIST(dateObj) {
    return Utilities.formatDate(new Date(dateObj), IST_TIMEZONE, "hh:mm:ss a");
}

// -------------------------------------------------------------------------------------------------
// 2. TRIGGERS (UNCHANGED)
// -------------------------------------------------------------------------------------------------

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
                        const timestamp = "'" + getISTTimestamp(); // Prepend "'"
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

// -------------------------------------------------------------------------------------------------
// 3. API HANDLERS (UPDATED)
// -------------------------------------------------------------------------------------------------

function doGet(e) {
    const action = e.parameter.action;
    const sheetName = e.parameter.sheet || 'data';

    if (action === 'read') return readData(sheetName);

    // NEW PAGINATION & PERFORMANCE HANDLERS
    if (action === 'getComplaintsPaginated') {
        return getComplaintsPaginated(
            parseInt(e.parameter.page || 1),
            parseInt(e.parameter.limit || 10),
            e.parameter.department,
            e.parameter.status,
            e.parameter.search,
            e.parameter.reporter,
            e.parameter.resolver,
            e.parameter.viewer,      // NEW
            e.parameter.viewerRole,  // NEW
            e.parameter.viewerDept   // NEW
        );
    }
    if (action === 'getUserPerformance') {
        return getUserPerformance(e.parameter.username);
    }
    if (action === 'getDashboardStats') {
        return getDashboardStats(e.parameter.username, e.parameter.department, e.parameter.role);
    }
    if (action === 'getComplaintById') {
        return getComplaintById(e.parameter.id);
    }
    return response('error', 'Invalid action');
}

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action;
        const payload = data.payload;

        // --- NEW FEATURES (Use dedicated functions at bottom) ---
        if (action === 'uploadImage') {
            // We manually call the new function here and return existing response format
            const result = uploadProfileImage(payload.image, payload.username);
            return response('success', 'Image Uploaded', result);
        }
        if (action === 'updateUserIP') {
            updateUserIP(SpreadsheetApp.getActiveSpreadsheet(), payload.username, payload.ip);
            return response('success', 'IP Updated');
        }

        // --- EXISTING FEATURES ---
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

// -------------------------------------------------------------------------------------------------
// 4. NEW FEATURES IMPLEMENTATION (ADDED AT BOTTOM OF FILE)
// -------------------------------------------------------------------------------------------------

/**
 * Uploads a base64 image to Google Drive, sets public permission, and saves link to Sheet.
 */
function uploadProfileImage(base64Data, username) {
    if (!DRIVE_FOLDER_ID) throw new Error("Drive Folder ID not configured.");

    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const cleanUsername = String(username).replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `${cleanUsername}_PROFILE.jpg`;

    // 1. Decorate Base64
    const data = base64Data.split(',')[1] || base64Data;
    const decoded = Utilities.base64Decode(data);
    const blob = Utilities.newBlob(decoded, 'image/jpeg', fileName);

    // 2. Check for existing file and delete (to avoid duplicates/clutter)
    const usersFiles = folder.getFilesByName(fileName);
    while (usersFiles.hasNext()) {
        usersFiles.next().setTrashed(true);
    }

    // 3. Create new file
    const file = folder.createFile(blob);

    // 4. Set Permission to Public (Viewer)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // 5. Get Download URL (Direct Link)
    const fileId = file.getId();
    const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    // 6. Save URL to Sheets
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    updateUserImageLink(doc, username, publicUrl);

    return { url: publicUrl };
}

/**
 * Updates the 'ProfilePhoto' column for the user in 'master' sheet.
 */
function updateUserImageLink(doc, username, url) {
    const sheet = doc.getSheetByName('master'); // User sheet
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = sheet.getDataRange().getValues();

    const userColIdx = findCol(headers, 'Username') - 1;

    // Find or Create 'ProfilePhoto' Column
    let photoColIdx = findCol(headers, 'ProfileImageURL') - 1;
    if (photoColIdx === -2) { // Logic: findCol returns -1 if not found
        // Try generic name
        photoColIdx = findCol(headers, 'ProfilePhoto') - 1;
    }

    // If still not found, create it
    if (photoColIdx < 0) {
        photoColIdx = sheet.getLastColumn();
        sheet.getRange(1, photoColIdx + 1).setValue('ProfilePhoto');
        SpreadsheetApp.flush(); // Commit column creation
    }

    const target = normalize(username);

    for (let i = 1; i < data.length; i++) {
        if (normalize(data[i][userColIdx]) === target) {
            sheet.getRange(i + 1, photoColIdx + 1).setValue(url);
            return;
        }
    }
}

/**
 * Updates the User's IP and Last Login Time in 'master' sheet.
 */
function updateUserIP(doc, username, ip) {
    const sheet = doc.getSheetByName('master');
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data = sheet.getDataRange().getValues();

    const userColIdx = findCol(headers, 'Username') - 1;

    // Columns to Update (Create if missing logic applied implicitly via setValue if index found, strict check below)
    // We will try to find these columns, if they don't exist, we might skip to avoid breaking sheet structure unexpectedly
    // OR we can append. Ideally, the implementation plan said "Add columns". Let's try to find existing or standard names.

    const ipColIdx = findCol(headers, 'LastLoginIP') - 1;
    const dateColIdx = findCol(headers, 'LastLoginDate') - 1;
    const timeColIdx = findCol(headers, 'LastLoginTime') - 1;
    const fullLoginColIdx = findCol(headers, 'LastLogin') - 1; // Legacy

    const now = new Date();
    const dateStr = Utilities.formatDate(now, IST_TIMEZONE, 'yyyy-MM-dd');
    const timeStr = Utilities.formatDate(now, IST_TIMEZONE, 'HH:mm:ss');

    const target = normalize(username);

    for (let i = 1; i < data.length; i++) {
        if (normalize(data[i][userColIdx]) === target) {
            const row = i + 1;

            // Update IP
            if (ipColIdx > -1) sheet.getRange(row, ipColIdx + 1).setValue(ip);

            // Update Login Timestamps
            if (dateColIdx > -1) sheet.getRange(row, dateColIdx + 1).setValue("'" + dateStr); // Prepend "'"
            if (timeColIdx > -1) sheet.getRange(row, timeColIdx + 1).setValue("'" + timeStr); // Prepend "'"
            if (fullLoginColIdx > -1) sheet.getRange(row, fullLoginColIdx + 1).setValue("'" + now.toISOString()); // Prepend "'"

            return { success: true };
        }
    }
    throw new Error("User not found for IP update");
}


// -------------------------------------------------------------------------------------------------
// 5. EXISTING HELPER FUNCTIONS (UNCHANGED)
// -------------------------------------------------------------------------------------------------

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
        if (t === 'username' && (h === 'name' || h === 'username' || h === 'user name')) return i + 1;
        // NEW COLUMNS MAPPING
        if (t === 'profilephoto' && (h === 'profilephoto' || h === 'profileimage' || h === 'profileimageurl')) return i + 1;
        if (t === 'lastloginip' && (h === 'lastloginip' || h === 'ipaddress')) return i + 1;
        if (t === 'lastlogindate' && (h === 'lastlogindate')) return i + 1;
        if (t === 'lastlogintime' && (h === 'lastlogintime')) return i + 1;
        if (t === 'lastlogin' && (h === 'lastlogin')) return i + 1;
    }
    return -1;
}

function getColMap(headers) {
    const map = {};
    const keys = ['ID', 'Date', 'Time', 'Department', 'Description', 'Status', 'ReportedBy', 'ResolvedBy', 'Remark', 'Username', 'Password', 'Role', 'Mobile', 'Resolved Date', 'Unit', 'History', 'TargetDate', 'Reopened Date', 'Rating', 'ProfilePhoto', 'LastLogin', 'LastLoginIP', 'LastLoginDate', 'LastLoginTime'];
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

    return ContentService.createTextOutput(JSON.stringify(filteredRows.map(row => {
        const obj = {};
        headers.forEach((h, i) => obj[h || ('Col' + i)] = row[i]);
        return obj;
    }))).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Migration Helper: Ensures the primary administrator 'SUPER ADMIN' is present.
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
    }

    // CLEANUP: Delete legacy placeholders
    for (let i = sheet.getLastRow(); i > 1; i--) {
        const val = strictNorm(sheet.getRange(i, map.Username).getValue());
        if (val === 'admin' || val === 'superadmin' || val === 'super_admin') {
            sheet.deleteRow(i);
        }
    }

    // CLEANUP: Delete legacy placeholders
    for (let i = sheet.getLastRow(); i > 1; i--) {
        const val = strictNorm(sheet.getRange(i, map.Username).getValue());
        if (val === 'admin' || val === 'superadmin' || val === 'super_admin') {
            sheet.deleteRow(i);
        }
    }
}

// -------------------------------------------------------------------------------------------------
// 6. EXISTING ACTIONS (UNCHANGED)
// -------------------------------------------------------------------------------------------------

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
    const essentialCols = ['Unit', 'History', 'TargetDate', 'Resolved Date', 'Rating', 'Time'];
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

    const timestamp = "'" + getISTTimestamp(); // Prepend "'"
    const now = new Date();
    const dateOnly = formatDateIST(now); // DD MMM YYYY
    const timeOnly = formatTimeIST(now); // hh:mm a

    const historyLog = '[' + timestamp + '] TICKET REGISTERED by ' + payload.ReportedBy;

    const fields = {
        'ID': newId,
        'Date': timestamp, // CHANGED: Now saves Full Timestamp (Date + Time)
        'Time': timeOnly,
        'Department': payload.Department,
        'Description': payload.Description,
        'Status': 'Open',
        'ReportedBy': payload.ReportedBy,
        'Unit': payload.Unit || '',
        'History': historyLog,
        'TargetDate': payload.TargetDate || ''
    };

    Object.keys(fields).forEach(f => {
        if (colMap[f]) {
            let val = fields[f];
            // Force String for Date/Time columns to prevent auto-formatting issues
            if (f === 'Date' || f === 'Time' || f === 'Resolved Date' || f === 'Reopened Date' || f === 'TargetDate') {
                val = "'" + val;
            }
            sheet.getRange(nextRow, colMap[f]).setValue(val);
        }
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

    const timestamp = "'" + getISTTimestamp(); // Prepend "'"
    const currentHistory = colMap.History ? String(sheet.getRange(rowIndex, colMap.History).getValue()) : '';
    const currentStatus = (colMap.Status && rowIndex > 1) ? String(data[rowIndex - 1][colMap.Status - 1] || '').trim() : '';
    let actionLog = '';

    // 1. EXTENSION
    if (payload.Status === 'Extend') {
        const oldTarget = colMap.TargetDate ? String(data[rowIndex - 1][colMap.TargetDate - 1] || '') : 'None';
        const diff = oldTarget ? Math.ceil((new Date(payload.TargetDate) - new Date(oldTarget)) / (1000 * 60 * 60 * 24)) : 0;

        actionLog = '[' + timestamp + '] Extended by ' + payload.ResolvedBy + '.Reason: ' + payload.Remark;
        if (colMap.TargetDate) sheet.getRange(rowIndex, colMap.TargetDate).setValue("'" + (payload.TargetDate || ''));

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
        actionLog = '[' + timestamp + '] FORCE CLOSED by ' + payload.ResolvedBy + '.Reason: ' + payload.Remark;
        if (colMap.Status) sheet.getRange(rowIndex, colMap.Status).setValue('Closed');
        if (colMap['Resolved Date']) sheet.getRange(rowIndex, colMap['Resolved Date']).setValue("'" + timestamp);

        // Template 6: Force Close
        sendForceCloseNotification(payload.ID, data[rowIndex - 1][colMap.ReportedBy - 1], payload.Remark);
        SpreadsheetApp.flush();
        updateUserMetrics(payload.ResolvedBy);
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
            actionLog = '[' + timestamp + '] ' + label + ' by ' + payload.ResolvedBy + '.Remark: ' + payload.Remark;
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
            sheet.getRange(rowIndex, colMap['Resolved Date']).setValue("'" + timestamp);
            SpreadsheetApp.flush();
            updateUserMetrics(payload.ResolvedBy);
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
            if (colMap['Reopened Date']) sheet.getRange(rowIndex, colMap['Reopened Date']).setValue("'" + getISTTimestamp());

            const L3 = getEscalationContact('L3');
            if (L3 && L3.mobile) sendWhatsApp(L3.mobile, 'L3 ESCALATION: Ticket #' + payload.ID + ' Re - opened by ' + payload.ResolvedBy + '.');
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

    // PART 6 & 11: UNIVERSAL SYNC (Update Delayed & Transferred Sheets)
    updateTicketStatusEverywhere(payload.ID, payload.Status);

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

    // NEW FORMAT: "Transferred by [User] to [Department/User] on [Date] at [Time]"
    const now = new Date();
    const datePart = Utilities.formatDate(now, IST_TIMEZONE, 'dd MMM yyyy');
    const timePart = Utilities.formatDate(now, IST_TIMEZONE, 'hh:mm a');

    // Custom formatted message for Ticket Journey (STRICT FORMAT)
    const msg = 'Case transferred by ' + payload.TransferredBy + ' \nFrom ' + oldDept + ' -> ' + payload.NewDepartment + ' \nOn ' + datePart + ' at ' + timePart;

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

            if (p.Status === 'Active' && map.Mobile) {
                // FIXED: Only send WhatsApp if status is explicitly changed to Active
                const currentStatus = String(data[i][map.Status - 1] || '').trim();
                if (currentStatus !== 'Active') {
                    sendAccountApprovalNotification(p.Username, sheet.getRange(i + 1, map.Mobile).getValue());
                }
            }
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
    return response('error', 'User not found(Looked for: "' + target + '")');
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


// -------------------------------------------------------------------------------------------------
// 7. NOTIFICATION UTILS (UNCHANGED)
// -------------------------------------------------------------------------------------------------

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

        if (rowD === targetDept || rowR === 'super_admin' || rowR === 'super admin') staffMobiles.push(mobile);
    }

    if (userMobile) {
        const msg = '📌 * COMPLAINT REGISTERED *\n\n' +
            'Dear ' + reporter + ', \n' +
            'Your complaint has been logged successfully.\n\n' +
            '🔹 * Ticket ID:* ' + id + ' \n' +
            '📍 * Department:* ' + dept + ' \n' +
            '📝 * Issue:* ' + desc + ' \n\n' +
            'We will update you shortly.\n\n' +
            'SBH Group Of Hospitals\n' +
            '_Automated System Notification_';
        sendWhatsApp(userMobile, msg);
    }

    [...new Set(staffMobiles)].forEach(m => {
        if (m && m !== userMobile) {
            const msg = '🚨 * NEW COMPLAINT ALERT *\n\n' +
                'Attention Team, \n' +
                'A new ticket requires your action.\n\n' +
                '🔹 * Ticket ID:* ' + id + ' \n' +
                '📍 * Department:* ' + dept + ' \n' +
                '👤 * Reporter:* ' + reporter + ' \n' +
                '📝 * Issue:* ' + desc + ' \n\n' +
                'Please check CMS and resolve.\n\n' +
                'SBH Group Of Hospitals\n' +
                '_Automated System Notification_';
            sendWhatsApp(m, msg);
            Utilities.sleep(800);
        }
    });
}

// PART 2 & 3: DAILY REMINDERS & AUTOMATED DELAY SYSTEM (Run at 12:00 AM)
function checkPendingStatus() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('data');
    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colMap = getColMap(headers);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. PREPARE DELAYED SHEET
    // Define headers for the new sheet
    const delayedHeaders = ['Ticket ID', 'Department', 'Registered Date', 'Registered Time', 'Delayed Date', 'Status'];
    const delayedSheet = getOrCreateSheet('Delayed_Cases', delayedHeaders);

    // Cache existing Delayed IDs to prevent duplicates for the same day
    const delayedData = delayedSheet.getDataRange().getValues();
    const existingDelayedIDs = new Set();
    for (let d = 1; d < delayedData.length; d++) {
        // ID is column 0
        existingDelayedIDs.add(String(delayedData[d][0]));
    }

    const L1 = getEscalationContact('L1'); // Director
    const L2 = getEscalationContact('L2'); // Senior
    const L3 = getEscalationContact('L3'); // Junior/Lead

    const targetDateIdx = findCol(headers, 'TargetDate') - 1;

    for (let i = 1; i < data.length; i++) {
        const status = String(data[i][colMap.Status - 1] || '').trim().toLowerCase();

        // Check Open, Pending, In-Progress, Re-Open, Delayed OR TRANSFERRED
        if (status !== 'open' && status !== 'pending' && status !== 'in-progress' && status !== 're-open' && status !== 'delayed' && status !== 'transferred') continue;

        const dateStr = data[i][colMap.Date - 1];
        if (!dateStr) continue;

        const createdDate = parseCustomDate(dateStr);
        let targetDate = targetDateIdx > -1 ? parseCustomDate(data[i][targetDateIdx]) : null;

        // Default Target: 24h from Creation if not set
        if (!targetDate && createdDate) {
            targetDate = new Date(createdDate);
            targetDate.setHours(targetDate.getHours() + 24);
        }

        // Calculate Delay based on Target Date
        let diffDays = 0;
        if (targetDate && now > targetDate) {
            diffDays = Math.ceil((now - targetDate) / (1000 * 60 * 60 * 24));
        }

        const id = data[i][colMap.ID - 1];
        const dept = data[i][colMap.Department - 1];

        if (diffDays >= 1) {
            // 2. AUTO-DELAY LOGIC
            if (!existingDelayedIDs.has(String(id))) {
                delayedSheet.appendRow([
                    id,
                    dept,
                    formatDateIST(createdDate),
                    formatTimeIST(createdDate),
                    formatDateIST(today),
                    'Delayed'
                ]);
                existingDelayedIDs.add(String(id));

                if (status !== 'delayed') {
                    if (colMap.Status) sheet.getRange(i + 1, colMap.Status).setValue('Delayed');

                    // Log Journey
                    const historyCol = colMap.History;
                    if (historyCol) {
                        const d = formatDateIST(now);
                        const t = formatTimeIST(now);
                        const msg = 'Case marked as DELAYED\n' +
                            'Date: ' + d + ' \n' +
                            'Time: ' + t;
                        const currentHist = sheet.getRange(i + 1, historyCol).getValue();
                        sheet.getRange(i + 1, historyCol).setValue(currentHist ? currentHist + '\n' + msg : msg);
                    }

                    // Send Delay WhatsApp
                    const delayMsg = '⚠️ Delay Alert\n' +
                        'Ticket ID: ' + id + ' \n' +
                        'Department: ' + dept + ' \n' +
                        'Days Overdue: ' + diffDays + ' \n' +
                        'Please take immediate action.\n\n' +
                        '— SBH Group of Hospitals';
                    sendDeptReminder(id, dept, delayMsg, "DIRECT_MSG");
                }
            }

            // 3. ESCALATION & REMINDERS
            // Level 1 Escalation (Day 2 of Delay)
            if (diffDays === 2) {
                sendDeptReminder(id, dept, diffDays, "WARNING");
            }
            // Level 2 Escalation (Day 3 of Delay) - Call L2
            else if (diffDays === 3) {
                if (L2 && L2.mobile) sendEscalationMsg(L2.mobile, "L2 Officer", id, dept, diffDays, dateStr);
            }
            // Level 3 Escalation (Day 5 of Delay) - Call Director
            else if (diffDays >= 5) {
                if (L1 && L1.mobile) sendEscalationMsg(L1.mobile, "L1 (DIRECTOR)", id, dept, diffDays, dateStr);
            }
        }
    }
}

function sendDeptReminder(id, dept, extraParam, type) {
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
            let msg = "";
            if (type === "DIRECT_MSG") {
                msg = extraParam;
            }
            else if (type === "REMINDER") {
                const dateStr = extraParam instanceof Date ? extraParam.toLocaleDateString() : new Date(extraParam).toLocaleDateString();
                msg = '⚠️ * Delay Alert – Action Required *\n\n' +
                    'Ticket ID: ' + id + ' \n' +
                    'Department: ' + dept + ' \n' +
                    'Registered Date: ' + dateStr + ' \n\n' +
                    'This complaint is still pending.\n' +
                    'Please resolve it as soon as possible.\n\n' +
                    'SBH Group of Hospitals\n' +
                    '_Automated Notification_';
            } else if (type === "WARNING") {
                const days = extraParam;
                msg = '⚠️ * Urgent Reminder – Pending Complaint *\n\n' +
                    'Ticket ID: ' + id + ' \n' +
                    'Department: ' + dept + ' \n' +
                    'Pending Since: ' + days + ' days\n\n' +
                    'This case is still unresolved.\n' +
                    'Immediate action is required.\n\n' +
                    'SBH Group of Hospitals\n' +
                    '_Automated Escalation System_';
            }

            if (msg) {
                sendWhatsApp(m, msg);
                Utilities.sleep(800);
            }
        }
    });
}

function sendEscalationMsg(mobile, level, id, dept, days, dateStr) {
    let msg = "";
    const regDate = new Date(dateStr).toLocaleDateString();

    if (level === "L2 Officer") {
        msg = '🚨 * Escalation Notice *\n\n' +
            'Ticket ID: ' + id + ' \n' +
            'Department: ' + dept + ' \n' +
            'Pending Since: ' + days + ' days\n' +
            'Registered Date: ' + regDate + ' \n\n' +
            'This complaint has not been resolved.\n' +
            'Kindly intervene and ensure resolution.\n\n' +
            'SBH Group of Hospitals\n' +
            '_Automated Escalation System_';
    } else if (level === "L1 (DIRECTOR)") {
        msg = '🚨 * Critical Escalation – Director Attention Required *\n\n' +
            'Respected Sir, \n\n' +
            'Ticket ID: ' + id + ' \n' +
            'Department: ' + dept + ' \n' +
            'Pending Since: ' + days + ' days\n' +
            'Registered Date: ' + regDate + ' \n\n' +
            'This complaint remains unresolved despite reminders and escalation.\n\n' +
            'Kindly take necessary action.\n\n' +
            'SBH Group of Hospitals\n' +
            '_Automated Monitoring System_';
    }

    if (msg) sendWhatsApp(mobile, msg);
}

function sendResolutionNotification(id, reportedBy, status, resolvedBy, remark) {
    const mob = getUserMobile(reportedBy);
    if (mob) {
        const msg = '✅ * TICKET RESOLVED *\n\n' +
            'Your complaint has been addressed.\n\n' +
            '🔹 * Ticket ID:* ' + id + ' \n' +
            '👤 * Resolved By:* ' + resolvedBy + ' \n' +
            '💬 * Resolution:* ' + remark + ' \n\n' +
            'SBH Group Of Hospitals\n' +
            '_Automated System Notification_';
        sendWhatsApp(mob, msg);
    }
}

function sendExtensionNotification(id, reportedBy, by, date, reason) {
    const mob = getUserMobile(reportedBy);
    if (mob) {
        const msg = '⏳ * TIMELINE EXTENDED *\n\n' +
            'Completion target for your ticket has been updated.\n\n' +
            '🔹 * Ticket ID:* ' + id + ' \n' +
            '👤 * Updated By:* ' + by + ' \n' +
            '📅 * New Target:* ' + date + ' \n' +
            '📝 * Reason:* ' + reason + ' \n\n' +
            'SBH Group Of Hospitals\n' +
            '_Automated System Notification_';
        sendWhatsApp(mob, msg);
    }
}

function sendAccountApprovalNotification(user, mobile) {
    if (mobile) {
        const msg = '🔓 * ACCOUNT ACTIVATED *\n\n' +
            'Welcome back, ' + user + ' !\n' +
            'Your access to the SBH CMS Portal is now active.\n\n' +
            '✅ * Status:* AUTHORIZED\n\n' +
            'SBH Group Of Hospitals\n' +
            '_Automated System Notification_';
        sendWhatsApp(mobile, msg);
    }
}

function sendReopenNotification(id, staff, by, remark) {
    const mob = getUserMobile(staff);
    if (mob) {
        const msg = '⚠️ * TICKET RE - OPENED *\n\n' +
            'Previous resolution for ticket #' + id + ' has been flagged for review.\n\n' +
            '🔹 * Ticket ID:* ' + id + ' \n' +
            '👤 * Re - opened By:* ' + by + ' \n' +
            '💬 * Remarks:* ' + remark + ' \n\n' +
            'Immediate attention required.\n\n' +
            'SBH Group Of Hospitals\n' +
            '_Automated System Notification_';
        sendWhatsApp(mob, msg);
    }
}

function sendForceCloseNotification(id, reportedBy, reason) {
    const mob = getUserMobile(reportedBy);
    if (mob) {
        const msg = '🔒 * MANAGEMENT CLOSURE *\n\n' +
            'Your complaint has been administratively closed.\n\n' +
            '🔹 * Ticket ID:* ' + id + ' \n' +
            '📝 * Reason:* ' + (reason || 'Administrative Action') + ' \n\n' +
            'SBH Group Of Hospitals\n' +
            '_Automated System Notification_';
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
        if (rowD === targetDept || rowR === 'super_admin' || rowR === 'super admin') {
            staffMobiles.push(data[i][mIdx]);
        }
    }

    [...new Set(staffMobiles)].forEach(m => {
        if (m) {
            const msg = '🔁 * TICKET TRANSFERRED *\n\n' +
                'A ticket has been routed to your unit.\n\n' +
                '🔹 * Ticket ID:* ' + id + ' \n' +
                '📍 * From:* ' + oldDept + ' \n' +
                '📍 * To:* ' + newDept + ' \n' +
                '👤 * Transferred By:* ' + by + ' \n' +
                '📝 * Reason:* ' + reason + ' \n\n' +
                'SBH Group Of Hospitals\n' +
                '_Automated System Notification_';
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

// -------------------------------------------------------------------------------------------------
// 8. LOGGING UTILS (UNCHANGED)
// -------------------------------------------------------------------------------------------------

function logToAuditHistory(p) {
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('history');
    if (!sheet) {
        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet('history');
        sheet.appendRow(['Date', 'Ticket ID', 'Action', 'Performed By', 'Remarks', 'Old Status', 'New Status', 'Rating']);
    }
    sheet.appendRow(["'" + getISTTimestamp(), p.ID, p.Action, p.By, p.Remark, p.OldStatus, p.NewStatus, p.Rating || '']);
}

function logRating(p) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Complaint_Ratings');
    if (!sheet) {
        sheet = ss.insertSheet('Complaint_Ratings');
        sheet.appendRow(['Date', 'Ticket ID', 'Staff Name', 'Reporter Name', 'Rating', 'Feedback']);
    }
    sheet.appendRow(["'" + getISTTimestamp(), p.ID, p.Resolver, p.Reporter, p.Rating, p.Remark]);
}

function logCaseTransfer(p) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Case_Transfer_Log');
    if (!sheet) {
        sheet = ss.insertSheet('Case_Transfer_Log');
        sheet.appendRow(['complaint_id', 'transferred_by', 'from_department', 'to_department', 'to_user', 'transfer_time', 'reason']);
        sheet.setFrozenRows(1);
    }
    sheet.appendRow([p.complaint_id, p.transferred_by, p.from_department, p.to_department, p.to_user, "'" + p.transfer_time, p.reason]);
}

function logCaseExtend(p) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('Case_Extend_Log');
    if (!sheet) {
        sheet = ss.insertSheet('Case_Extend_Log');
        sheet.appendRow(['complaint_id', 'extended_by', 'old_target_date', 'new_target_date', 'diff_days', 'extension_time', 'reason']);
        sheet.setFrozenRows(1);
    }
    sheet.appendRow([p.complaint_id, p.extended_by, p.old_target_date, p.new_target_date, p.diff_days, "'" + p.extension_time, p.reason]);
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

// -------------------------------------------------------------------------------------------------
// PERFORMANCE METRICS ENGINE
// -------------------------------------------------------------------------------------------------

function updateUserMetrics(username) {
    if (!username) return;
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const targetUser = String(username).toLowerCase().trim();

    // 1. GET RATINGS (Quality Score - 50%)
    const rSheet = ss.getSheetByName('Complaint_Ratings');
    let totalRating = 0;
    let ratingCount = 0;
    let r1 = 0, r2 = 0, r3 = 0, r4 = 0, r5 = 0;

    if (rSheet) {
        const rData = rSheet.getDataRange().getValues();
        // Headers: Date, Ticket ID, Staff Name, Reporter Name, Rating, Feedback
        for (let i = 1; i < rData.length; i++) {
            if (String(rData[i][2]).toLowerCase().trim() === targetUser) {
                let r = Math.round(parseFloat(rData[i][4]));
                if (!isNaN(r) && r > 0) {
                    totalRating += r;
                    ratingCount++;
                    if (r === 1) r1++;
                    else if (r === 2) r2++;
                    else if (r === 3) r3++;
                    else if (r === 4) r4++;
                    else if (r >= 5) r5++;
                }
            }
        }
    }
    const avgRating = ratingCount > 0 ? (totalRating / ratingCount) : 0;
    const ratingScore = (avgRating / 5) * 50;

    // 2. GET SOLVED, SPEED, DELAY (from Master Data)
    const dSheet = ss.getSheetByName('data');
    const dData = dSheet.getDataRange().getValues();
    const headers = dData[0];
    const colMap = getColMap(headers);

    let solvedCount = 0;
    let totalSpeedHours = 0;
    let speedCount = 0;
    let delayCount = 0;
    let totalCases = 0;

    const rByIdx = colMap.ResolvedBy ? colMap.ResolvedBy - 1 : -1;
    const aIdx = findCol(headers, 'Assigned To') - 1;
    const sIdx = colMap.Status - 1;
    const regDateIdx = (findCol(headers, 'Date') || findCol(headers, 'Timestamp')) - 1;
    const closedDateIdx = (colMap['Resolved Date'] || findCol(headers, 'Resolved Date')) - 1;
    const targetDateIdx = colMap.TargetDate ? colMap.TargetDate - 1 : -1;

    const now = new Date();

    for (let i = 1; i < dData.length; i++) {
        const rBy = String(dData[i][rByIdx] || '').toLowerCase().trim();
        const assigned = aIdx > -1 ? String(dData[i][aIdx] || '').toLowerCase().trim() : '';
        const status = String(dData[i][sIdx] || '').toLowerCase();

        // Efficiency is based on cases handled by user or assigned to user
        let isUserCase = false;
        if (rBy === targetUser) isUserCase = true;
        else if (assigned === targetUser) isUserCase = true; // Count open cases assigned to them

        if (!isUserCase) continue;

        totalCases++;

        // Status Checks
        const isSolved = ['closed', 'resolved', 'solved', 'force close'].includes(status);

        if (isSolved && rBy === targetUser) {
            solvedCount++;
            // Speed Calc
            if (regDateIdx > -1 && closedDateIdx > -1) {
                const regDate = parseCustomDate(dData[i][regDateIdx]);
                const closedDate = parseCustomDate(dData[i][closedDateIdx]);
                if (regDate && closedDate && closedDate > regDate) {
                    const hours = (closedDate - regDate) / (1000 * 60 * 60);
                    totalSpeedHours += hours;
                    speedCount++;
                }
            }
        }

        // Delay Check
        let isDelayed = false;
        if (status === 'delayed') isDelayed = true;
        else {
            const regDate = parseCustomDate(dData[i][regDateIdx]);
            let targetDate = targetDateIdx > -1 ? parseCustomDate(dData[i][targetDateIdx]) : null;

            // Default 24h SLA if no target date
            if (!targetDate && regDate) {
                targetDate = new Date(regDate);
                targetDate.setHours(targetDate.getHours() + 24);
            }

            if (targetDate) {
                if (isSolved) {
                    const closedDate = parseCustomDate(dData[i][closedDateIdx]) || now;
                    if (closedDate > targetDate) isDelayed = true;
                } else {
                    // Open/Pending
                    if (now > targetDate) isDelayed = true;
                }
            }
        }

        if (isDelayed) delayCount++;
    }

    // 3. CALCULATE SCORES
    // Speed Score (30%)
    const avgSpeedHours = speedCount > 0 ? (totalSpeedHours / speedCount) : 0;
    let speedScore = 0;
    if (avgSpeedHours > 0) {
        const ideal = 24;
        const ratio = ideal / avgSpeedHours;
        speedScore = Math.min(1, ratio) * 30;
    } else if (solvedCount > 0) {
        speedScore = 30; // Instant solve
    }

    // Delay Score (20%)
    let delayScore = 20;
    if (totalCases > 0) {
        const delayPct = delayCount / totalCases;
        delayScore = Math.max(0, (1 - delayPct) * 20);
    }

    const efficiencyScore = ratingScore + speedScore + delayScore;

    // 4. UPDATE CACHE SHEET
    let pSheet = getOrCreateSheet('USER_PERFORMANCE', [
        'Username', 'Solved Count', 'Rating Count', 'Avg Rating', 'Avg Speed Hours', 'Efficiency Score', 'Last Updated',
        'Delay Count', 'Total Cases', 'R5', 'R4', 'R3', 'R2', 'R1'
    ]);
    const pData = pSheet.getDataRange().getValues();
    const ts = getISTTimestamp();
    let found = false;

    // Format display values
    const dispAvgRating = avgRating.toFixed(2);
    const dispAvgSpeed = avgSpeedHours.toFixed(2);
    const dispEff = efficiencyScore.toFixed(0);

    for (let i = 1; i < pData.length; i++) {
        if (String(pData[i][0]).toLowerCase().trim() === targetUser) {
            // Update row (1-based index)
            const row = i + 1;
            pSheet.getRange(row, 2).setValue(solvedCount);
            pSheet.getRange(row, 3).setValue(ratingCount);
            pSheet.getRange(row, 4).setValue(dispAvgRating);
            pSheet.getRange(row, 5).setValue(dispAvgSpeed);
            pSheet.getRange(row, 6).setValue(dispEff);
            pSheet.getRange(row, 7).setValue(ts);
            pSheet.getRange(row, 8).setValue(delayCount);
            pSheet.getRange(row, 9).setValue(totalCases);
            pSheet.getRange(row, 10).setValue(r5);
            pSheet.getRange(row, 11).setValue(r4);
            pSheet.getRange(row, 12).setValue(r3);
            pSheet.getRange(row, 13).setValue(r2);
            pSheet.getRange(row, 14).setValue(r1);
            found = true;
            break;
        }
    }

    if (!found) {
        pSheet.appendRow([username, solvedCount, ratingCount, dispAvgRating, dispAvgSpeed, dispEff, ts, delayCount, totalCases, r5, r4, r3, r2, r1]);
    }
}

/**
 * PAGINATION ENGINE
 */
function getComplaintsPaginated(page, limit, deptFilter, statusFilter, search, reporterFilter, resolverFilter, viewer, viewerRole, viewerDept) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('data');
    if (!sheet) return response('error', 'Data sheet missing');

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    // console.log("Total Data Rows:", data.length); // debug

    // Map columns
    const colMap = getColMap(headers);
    const dateIdx = (findCol(headers, 'Date') || findCol(headers, 'Timestamp')) - 1;
    const idIdx = colMap.ID - 1;
    const deptIdx = colMap.Department - 1;
    const statusIdx = colMap.Status - 1;
    const remarksIdx = colMap.Remark - 1;
    const reporterIdx = colMap.ReportedBy - 1;

    let filtered = [];

    // Filter Logic
    const normalizedDeptFilter = normalize(deptFilter);
    const normalizedReporterFilter = normalize(reporterFilter);
    const normalizedResolverFilter = normalize(resolverFilter);

    // Viewer Context
    const vUser = normalize(viewer);
    const vDept = normalize(viewerDept);
    const vRole = normalize(viewerRole);
    const isAdmin = vRole === 'admin' || vRole === 'super_admin';

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        let match = true;

        const rowDept = normalize(row[deptIdx]);
        const rowReporter = normalize(row[reporterIdx]);
        const rowResolver = normalize(row[colMap.ResolvedBy - 1]);

        // 0. VISIBILITY SECURITY CHECK
        if (!isAdmin && vUser) {
            const isMyDept = rowDept === vDept;
            const isMyReport = rowReporter === vUser;
            const isMyTask = rowResolver === vUser;

            if (!isMyDept && !isMyReport && !isMyTask) {
                continue;
            }
        }

        // 1. Specific Filters (Reporter/Resolver/Dept)
        if (deptFilter && deptFilter !== 'All' && deptFilter !== 'All Departments') {
            if (rowDept !== normalizedDeptFilter) match = false;
        }
        if (match && reporterFilter) {
            if (rowReporter !== normalizedReporterFilter) match = false;
        }
        if (match && resolverFilter) {
            if (rowResolver !== normalizedResolverFilter) match = false;
        }

        // 2. Status Filter
        if (match && statusFilter && statusFilter !== 'All Status' && statusFilter !== 'All') {
            const s = normalize(row[statusIdx]);
            if (statusFilter === 'Solved') {
                if (s !== 'solved' && s !== 'closed' && s !== 'resolved' && s !== 'force close') match = false;
            } else if (statusFilter === 'Open') {
                if (s === 'closed' || s === 'resolved' || s === 'solved' || s === 'force close') match = false;
            } else if (statusFilter === 'Delayed') {
                const targetStr = row[colMap.TargetDate - 1];
                if (s === 'closed' || s === 'resolved' || s === 'solved' || s === 'force close') match = false;
                else if (!targetStr || new Date(targetStr) >= new Date()) match = false;
            } else if (statusFilter === 'Extended') {
                if (s !== 'extended' && s !== 'extend') match = false;
            } else {
                if (s !== normalize(statusFilter)) match = false;
            }
        }

        // 3. Search Term
        if (match && search) {
            const term = search.toLowerCase();
            const fullText = row.join(' ').toLowerCase();
            if (!fullText.includes(term)) match = false;
        }

        if (match) {
            const obj = {};
            headers.forEach((h, idx) => { obj[h] = row[idx]; });
            filtered.push(obj);
        }
    }

    // Sort: Latest First (assuming Date is sortable or ID is increasing)
    // Better to sort by Date object
    filtered.sort((a, b) => {
        // ID Descending as proxy for time
        return b['Ticket ID'] - a['Ticket ID'];
    });

    // Pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const items = filtered.slice(startIndex, endIndex);

    return response('success', 'Data Fetched', {
        items: items,
        total: totalItems,
        page: page,
        totalPages: totalPages
    });
}

function getUserPerformance(username) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Recalculate metrics to ensure freshness
    updateUserMetrics(username);

    const sheet = ss.getSheetByName('USER_PERFORMANCE');

    if (!sheet) return response('success', 'User not found', {});

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const target = String(username).toLowerCase().trim();

    // Find User
    let stats = null;
    let allEfScores = [];

    for (let i = 1; i < data.length; i++) {
        const u = String(data[i][0]).toLowerCase().trim();
        const score = parseFloat(data[i][5]) || 0; // Efficiency Score column
        allEfScores.push(score);

        if (u === target) {
            stats = {
                Username: data[i][0],
                SolvedCount: data[i][1],
                RatingCount: data[i][2],
                AvgRating: data[i][3],
                AvgSpeedHours: data[i][4],
                EfficiencyScore: score,
                DelayCount: data[i][7],
                TotalCases: data[i][8],
                R5: data[i][9],
                R4: data[i][10],
                R3: data[i][11],
                R2: data[i][12],
                R1: data[i][13]
            };
        }
    }

    if (!stats) return response('success', 'User not found in metrics', {});

    // Calculate Rank
    allEfScores.sort((a, b) => b - a); // Descending
    const rank = allEfScores.indexOf(stats.EfficiencyScore) + 1;

    return response('success', 'Performance Data', {
        ...stats,
        rank: rank,
        totalStaff: allEfScores.length
    });
}


function getEscalationContact(level) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName('escalation_matrix');
    if (!sheet) return null;
    const data = sheet.getDataRange().getValues();
    const row = data.find(r => String(r[0]).trim().toUpperCase() === String(level).toUpperCase());
    return row ? { name: row[1], mobile: row[2] } : null;
}

/**
 * PART 6 & 11: SYNC STATUS ACROSS ALL SHEETS
 * If a ticket is Closed/Resolved in any panel, it must be updated in:
 * - Master Sheet (Done in updateComplaintStatus)
 * - Delayed_Cases Sheet
 * - Transferred_Cases Sheet
 */
function updateTicketStatusEverywhere(ticketId, newStatus) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetsToSync = ['Delayed_Cases', 'Transferred_Cases'];
    const searchId = String(ticketId).toLowerCase().trim();

    sheetsToSync.forEach(sheetName => {
        const sheet = ss.getSheetByName(sheetName);
        if (!sheet) return;

        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) return;

        const headers = data[0];
        let idIdx = -1;
        let statusIdx = -1;

        headers.forEach((h, i) => {
            const H = String(h).toLowerCase().trim();
            if (H.includes('id') || H === 'ticket id' || H === 'complaintid') idIdx = i;
            if (H === 'status') statusIdx = i;
        });

        if (idIdx === -1 || statusIdx === -1) return;

        for (let i = 1; i < data.length; i++) {
            if (String(data[i][idIdx]).toLowerCase().trim() === searchId) {
                // If status is different, update it
                if (String(data[i][statusIdx]).toLowerCase() !== String(newStatus).toLowerCase()) {
                    sheet.getRange(i + 1, statusIdx + 1).setValue(newStatus);
                }
            }
        }
    });
}

/**
 * LIGHTWEIGHT DASHBOARD STATS
 */
function getDashboardStats(username, userDept, role) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('data');
    if (!sheet) return response('error', 'Data sheet missing');

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colMap = getColMap(headers);
    const isAdmin = (role || '').toUpperCase() === 'ADMIN' || (role || '').toUpperCase() === 'SUPER_ADMIN';
    const normalizedDept = normalize(userDept);
    const normalizedUser = normalize(username);

    let stats = {
        open: 0,
        pending: 0,
        solved: 0,
        transferred: 0,
        extended: 0,
        delayed: 0
    };

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const dept = normalize(row[colMap.Department - 1]);
        const reporter = normalize(row[colMap.ReportedBy - 1]);

        // Visibility Check: Admin sees ALL, User sees OWN DEPT or REPORTED BY SELF
        if (!isAdmin) {
            if (dept !== normalizedDept && reporter !== normalizedUser) continue;
        }

        const s = normalize(row[colMap.Status - 1]);

        if (s === 'open') stats.open++;
        else if (s === 'pending' || s === 'in-progress' || s === 're-open') stats.pending++;
        else if (s === 'solved' || s === 'resolved' || s === 'closed' || s === 'force close') stats.solved++;
        else if (s === 'transferred') stats.transferred++;
        else if (s === 'delayed') stats.delayed++;

        // Extended is a sub-status often, but if mapped to status column:
        if (s === 'extended' || s === 'extend') stats.extended++;
    }

    return response('success', 'Stats Fetched', stats);
}

/**
 * FETCH SINGLE TICKET BY ID
 */
function getComplaintById(id) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('data');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const colMap = getColMap(headers);
    const searchId = String(id).toLowerCase().trim();

    for (let i = 1; i < data.length; i++) {
        if (String(data[i][colMap.ID - 1]).toLowerCase().trim() === searchId) {
            const obj = {};
            headers.forEach((h, idx) => obj[h] = data[i][idx]);
            return response('success', 'Ticket Found', obj);
        }
    }
    return response('error', 'Ticket not found');
}