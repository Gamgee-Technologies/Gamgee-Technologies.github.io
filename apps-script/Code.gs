// GAMGEE Google Apps Script — receives form POSTs and writes to Google Sheet
// Deploy as: Execute as Me > Anyone can access

var SHEET_ID = '1q8FBO1IWx8w8g7cDTYisv0B_YMC3p_LO-ndOLl5RcZo';

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
      sheet.appendRow([
        new Date(),
        data.email || '',
        data.name || '',
        data.phone || '',
        data.contactPref || '',
        data.location || '',
        data.country || '',
        data.city || '',
        data.dogName || '',
        data.dogBreed || '',
        data.dogAge || '',
        data.dogSex || '',
        data.diagnosis || '',
        data.stage || '',
        data.treatment || '',
        data.tumourRemoved || '',
        data.vetName || '',
        data.vetPractice || '',
        data.vetEmail || '',
        data.vetPhone || '',
        data.notes || ''
      ]);
    } else if (sheetName === 'Media') {
      sheet.appendRow([
        new Date(),
        data.firstName || '',
        data.lastName || '',
        data.publication || '',
        data.email || '',
        data.phone || '',
        data.message || ''
      ]);
    } else if (sheetName === 'Partners') {
      sheet.appendRow([
        new Date(),
        data.firstName || '',
        data.lastName || '',
        data.organisation || '',
        data.email || '',
        data.phone || '',
        data.role || '',
        data.location || '',
        data.message || ''
      ]);
    } else if (sheetName === 'Donors') {
      sheet.appendRow([
        new Date(),
        data.firstName || '',
        data.lastName || '',
        data.email || '',
        data.phone || '',
        data.dogName || '',
        data.breed || '',
        data.cancerType || '',
        data.recordsType || '',
        data.message || ''
      ]);
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
