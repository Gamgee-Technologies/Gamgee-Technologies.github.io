// GAMGEE Google Apps Script — receives form POSTs, writes to Google Sheet, sends email notifications
// Deploy as: Execute as Me > Anyone can access

var SHEET_ID = '15MHWl4W-Fd6Ue_Eipe-RMK-8RKyNPeZFrTG_X-3i1_w';

// Email routing
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

    if (!sheet) {
      return ContentService.createTextOutput(
        JSON.stringify({ error: 'Sheet not found: ' + sheetName })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var FILES_FOLDER_ID = '1DyZ7AE24AMOB9Q8BRn1d-y1pj6so7x4-';

    if (sheetName === 'Applications') {
      var fileUrls = saveFilesToDrive(data.files || [], data.email || 'unknown', FILES_FOLDER_ID);
      sheet.appendRow([
        new Date(), data.email || '', data.name || '', data.phone || '',
        data.contactPref || '', data.location || '', data.country || '',
        data.city || '', data.dogName || '', data.dogBreed || '',
        data.dogAge || '', data.dogSex || '', data.diagnosis || '',
        data.stage || '', data.treatment || '', data.tumourRemoved || '',
        data.vetName || '', data.vetPractice || '', data.vetEmail || '',
        data.vetPhone || '', data.notes || '', fileUrls
      ]);
    } else if (sheetName === 'Media') {
      sheet.appendRow([new Date(), data.firstName || '', data.lastName || '',
        data.publication || '', data.email || '', data.phone || '', data.message || '']);
    } else if (sheetName === 'Partners') {
      sheet.appendRow([new Date(), data.firstName || '', data.lastName || '',
        data.organisation || '', data.email || '', data.phone || '',
        data.role || '', data.location || '', data.message || '']);
    } else if (sheetName === 'Donors') {
      sheet.appendRow([new Date(), data.firstName || '', data.lastName || '',
        data.email || '', data.phone || '', data.dogName || '',
        data.breed || '', data.cancerType || '', data.recordsType || '',
        data.message || '']);
    }

    // Send email notification
    sendNotification(sheetName, data);

    return ContentService.createTextOutput(
      JSON.stringify({ status: 'ok' })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function sendNotification(sheetName, data) {
  var toEmail = EMAIL_MAP[sheetName];
  if (!toEmail) return;

  var subject = '';
  var body = '';

  if (sheetName === 'Applications') {
    subject = 'New Application from ' + (data.name || data.email || 'Unknown');
    body = 'New application submitted on gamgee.io\n\n' +
      'Name: ' + (data.name || '') + '\n' +
      'Email: ' + (data.email || '') + '\n' +
      'Phone: ' + (data.phone || '') + '\n' +
      'Contact preference: ' + (data.contactPref || '') + '\n' +
      'Location: ' + (data.location || '') + '\n' +
      (data.location !== 'sydney' ? 'Country: ' + (data.country || '') + '\nCity: ' + (data.city || '') + '\n' : '') +
      '\nDog name: ' + (data.dogName || '') + '\n' +
      'Breed: ' + (data.dogBreed || '') + '\n' +
      'Age: ' + (data.dogAge || '') + '\n' +
      'Sex: ' + (data.dogSex || '') + '\n' +
      '\nDiagnosis: ' + (data.diagnosis || '') + '\n' +
      'Stage: ' + (data.stage || '') + '\n' +
      'Treatment: ' + (data.treatment || '') + '\n' +
      'Tumour removed: ' + (data.tumourRemoved || '') + '\n' +
      '\nVet name: ' + (data.vetName || '') + '\n' +
      'Vet practice: ' + (data.vetPractice || '') + '\n' +
      'Vet email: ' + (data.vetEmail || '') + '\n' +
      'Vet phone: ' + (data.vetPhone || '') + '\n' +
      '\nNotes: ' + (data.notes || '');
  } else if (sheetName === 'Media') {
    subject = 'New Media Enquiry from ' + (data.firstName || '') + ' ' + (data.lastName || '');
    body = 'New media enquiry submitted on gamgee.io\n\n' +
      'Name: ' + (data.firstName || '') + ' ' + (data.lastName || '') + '\n' +
      'Publication: ' + (data.publication || '') + '\n' +
      'Email: ' + (data.email || '') + '\n' +
      'Phone: ' + (data.phone || '') + '\n' +
      '\nMessage:\n' + (data.message || '');
  } else if (sheetName === 'Partners') {
    subject = 'New Partnership Enquiry from ' + (data.firstName || '') + ' ' + (data.lastName || '');
    body = 'New partnership enquiry submitted on gamgee.io\n\n' +
      'Name: ' + (data.firstName || '') + ' ' + (data.lastName || '') + '\n' +
      'Organisation: ' + (data.organisation || '') + '\n' +
      'Role: ' + (data.role || '') + '\n' +
      'Email: ' + (data.email || '') + '\n' +
      'Phone: ' + (data.phone || '') + '\n' +
      'Location: ' + (data.location || '') + '\n' +
      '\nMessage:\n' + (data.message || '');
  } else if (sheetName === 'Donors') {
    subject = 'New Data Donor from ' + (data.firstName || '') + ' ' + (data.lastName || '');
    body = 'New data donor submission on gamgee.io\n\n' +
      'Name: ' + (data.firstName || '') + ' ' + (data.lastName || '') + '\n' +
      'Email: ' + (data.email || '') + '\n' +
      'Phone: ' + (data.phone || '') + '\n' +
      'Dog name: ' + (data.dogName || '') + '\n' +
      'Breed: ' + (data.breed || '') + '\n' +
      'Cancer type: ' + (data.cancerType || '') + '\n' +
      'Records type: ' + (data.recordsType || '') + '\n' +
      '\nMessage:\n' + (data.message || '');
  }

  GmailApp.sendEmail(toEmail, subject, body);
}

function saveFilesToDrive(files, email, folderId) {
  if (!files || files.length === 0) return '';
  try {
    var parentFolder = DriveApp.getFolderById(folderId);
    var folders = parentFolder.getFoldersByName(email);
    var emailFolder = folders.hasNext() ? folders.next() : parentFolder.createFolder(email);

    var urls = [];
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      var blob = Utilities.newBlob(
        Utilities.base64Decode(f.data), f.type, f.name
      );
      var file = emailFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urls.push(file.getUrl());
    }
    return urls.join(', ');
  } catch (err) {
    Logger.log('Drive upload failed: ' + err.message);
    return 'Upload failed: ' + err.message;
  }
}
