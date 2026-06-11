function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  const row = [
    new Date(),
    data.name || '',
    data.email || '',
    data.city || '',
    data.location || '',
    data.temperature || '',
    data.note || '',
    data.submittedAt || ''
  ];

  sheet.appendRow(row);

  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
}
