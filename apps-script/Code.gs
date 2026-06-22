// GAMGEE Google Apps Script — receives form POSTs and writes to Google Sheet
// Deploy as: Execute as Me > Anyone can access
// Email notifications are handled by the sheet's Apps Script (onFormSubmit trigger)

var SHEET_ID = '15MHWl4W-Fd6Ue_Eipe-RMK-8RKyNPeZFrTG_X-3i1_w';
var FILES_FOLDER_ID = '1DyZ7AE24AMOB9Q8BRn1d-y1pj6so7x4-';

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

    if (sheetName === 'Applications') {
      var fileUrls = saveFilesToDrive(data.files || [], data.email || 'unknown');
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

    return ContentService.createTextOutput(
      JSON.stringify({ status: 'ok' })
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
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
