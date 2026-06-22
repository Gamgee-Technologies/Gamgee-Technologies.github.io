// GAMGEE Google Apps Script — receives form POSTs, writes to Google Sheet, sends email notifications
// Deploy as: Execute as Me > Anyone can access

var SHEET_ID = '15MHWl4W-Fd6Ue_Eipe-RMK-8RKyNPeZFrTG_X-3i1_w';
var FILES_FOLDER_ID = '1DyZ7AE24AMOB9Q8BRn1d-y1pj6so7x4-';
var EMAIL_MAP = {
  'Applications': 'hello@gamgee.io',
  'Media': 'press@gamgee.io',
  'Partners': 'partners@gamgee.io',
  'Donors': 'hello@gamgee.io'
};

function doGet(e) {
  return ContentService.createTextOutput('GAMGEE Forms API');
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sheetName = data._sheet;
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({ error: 'Sheet not found: ' + sheetName })).setMimeType(ContentService.MimeType.JSON);

    var fileUrls = '';
    if (sheetName === 'Applications') {
      fileUrls = saveFilesToDrive(data.files || [], data.email || 'unknown');
      sheet.appendRow([new Date(), data.email || '', data.name || '', data.phone || '', data.contactPref || '', data.location || '', data.country || '', data.city || '', data.dogName || '', data.dogBreed || '', data.dogAge || '', data.dogSex || '', data.diagnosis || '', data.stage || '', data.treatment || '', data.tumourRemoved || '', data.vetName || '', data.vetPractice || '', data.vetEmail || '', data.vetPhone || '', data.notes || '', fileUrls]);
    } else if (sheetName === 'Media') {
      sheet.appendRow([new Date(), data.firstName || '', data.lastName || '', data.publication || '', data.email || '', data.phone || '', data.message || '']);
    } else if (sheetName === 'Partners') {
      sheet.appendRow([new Date(), data.firstName || '', data.lastName || '', data.organisation || '', data.email || '', data.phone || '', data.role || '', data.location || '', data.message || '']);
    } else if (sheetName === 'Donors') {
      sheet.appendRow([new Date(), data.firstName || '', data.lastName || '', data.email || '', data.phone || '', data.dogName || '', data.breed || '', data.cancerType || '', data.recordsType || '', data.message || '']);
    }

    sendNotification(sheetName, data, fileUrls);
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function sendNotification(sheetName, data, fileUrls) {
  var toEmail = EMAIL_MAP[sheetName];
  if (!toEmail) return;
  var subject = '', body = '';
  if (sheetName === 'Applications') {
    subject = 'New Application from ' + (data.name || data.email || 'Unknown');
    body = 'New application submitted on gamgee.io\n\nName: ' + (data.name || '') + '\nEmail: ' + (data.email || '') + '\nPhone: ' + (data.phone || '') + '\nContact preference: ' + (data.contactPref || '') + '\nLocation: ' + (data.location || '') + '\nCountry: ' + (data.country || '') + '\nCity: ' + (data.city || '') + '\n\nDog name: ' + (data.dogName || '') + '\nBreed: ' + (data.dogBreed || '') + '\nAge: ' + (data.dogAge || '') + '\nSex: ' + (data.dogSex || '') + '\n\nDiagnosis: ' + (data.diagnosis || '') + '\nStage: ' + (data.stage || '') + '\nTreatment: ' + (data.treatment || '') + '\nTumour removed: ' + (data.tumourRemoved || '') + '\n\nVet name: ' + (data.vetName || '') + '\nVet practice: ' + (data.vetPractice || '') + '\nVet email: ' + (data.vetEmail || '') + '\nVet phone: ' + (data.vetPhone || '') + '\n\nNotes: ' + (data.notes || '');
    if (fileUrls) body += '\n\nFiles uploaded: ' + fileUrls;
  } else if (sheetName === 'Media') {
    subject = 'New Media Enquiry from ' + (data.firstName || '') + ' ' + (data.lastName || '');
    body = 'New media enquiry submitted on gamgee.io\n\nName: ' + (data.firstName || '') + ' ' + (data.lastName || '') + '\nPublication: ' + (data.publication || '') + '\nEmail: ' + (data.email || '') + '\nPhone: ' + (data.phone || '') + '\n\nMessage:\n' + (data.message || '');
  } else if (sheetName === 'Partners') {
    subject = 'New Partnership Enquiry from ' + (data.firstName || '') + ' ' + (data.lastName || '');
    body = 'New partnership enquiry submitted on gamgee.io\n\nName: ' + (data.firstName || '') + ' ' + (data.lastName || '') + '\nOrganisation: ' + (data.organisation || '') + '\nRole: ' + (data.role || '') + '\nEmail: ' + (data.email || '') + '\nPhone: ' + (data.phone || '') + '\nLocation: ' + (data.location || '') + '\n\nMessage:\n' + (data.message || '');
  } else if (sheetName === 'Donors') {
    subject = 'New Data Donor from ' + (data.firstName || '') + ' ' + (data.lastName || '');
    body = 'New data donor submission on gamgee.io\n\nName: ' + (data.firstName || '') + ' ' + (data.lastName || '') + '\nEmail: ' + (data.email || '') + '\nPhone: ' + (data.phone || '') + '\nDog name: ' + (data.dogName || '') + '\nBreed: ' + (data.breed || '') + '\nCancer type: ' + (data.cancerType || '') + '\nRecords type: ' + (data.recordsType || '') + '\n\nMessage:\n' + (data.message || '');
  }
  GmailApp.sendEmail(toEmail, subject, body);
}

function saveFilesToDrive(files, email) {
  if (!files || files.length === 0) return '';
  try {
    var parentFolder = DriveApp.getFolderById(FILES_FOLDER_ID);
    var folders = parentFolder.getFoldersByName(email);
    var emailFolder = folders.hasNext() ? folders.next() : parentFolder.createFolder(email);
    var urls = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var blob = Utilities.newBlob(Utilities.base64Decode(f.data), f.type, f.name);
      var file = emailFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urls.push(file.getUrl());
    }
    return urls.join(', ');
  } catch (err) {
    return 'Upload failed: ' + err.message;
  }
}
