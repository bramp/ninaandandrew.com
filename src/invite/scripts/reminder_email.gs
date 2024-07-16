// This is manually copied from:
// https://script.google.com/u/1/home/projects/1lS9cvhWcTPJNcm402Pdsy089NvJsaW0CYskGyVaxuUeYAMKYLjNWSolG/edit

/*
Copyright 2022 Martin Hawksey
          2024 Andrew Brampton

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
 
/**
 * @OnlyCurrentDoc
*/

function sendReminderEmailsDryRun(sheet=SpreadsheetApp.getActiveSheet()) {
  return sendReminderEmails(sheet, true);
}

/**
 * Sends emails from sheet data.
 * @param {Sheet} sheet to read data from
*/
function sendReminderEmails(sheet=SpreadsheetApp.getActiveSheet(), dryRun=false) {
  const emailTemplates = {
    // Type - Wedding - Receptioon - RSVP'd

    // No RSVP yet
    'amma-true-true-': getGmailTemplateFromDrafts_('reminder-email-amma-both-no.html', "Nina and Andrew's wedding - Please RSVP"),
    'appa-true-true-': getGmailTemplateFromDrafts_('reminder-email-appa-both-no.html', "Nina and Andrew's wedding - Please RSVP"),
    'friends-true-true-': getGmailTemplateFromDrafts_('reminder-email-friends-both-no.html', "Nina and Andrew's wedding - Please RSVP"),
    'friends-false-true-': getGmailTemplateFromDrafts_('reminder-email-friends-reception-no.html', "Nina and Andrew's wedding - Please RSVP"),

    // Positive RSVP
    'amma-true-true-true': getGmailTemplateFromDrafts_('reminder-email-amma-both-yes.html', "Nina and Andrew's wedding"),
    'appa-true-true-true': getGmailTemplateFromDrafts_('reminder-email-appa-both-yes.html', "Nina and Andrew's wedding"),
    'friends-true-true-true': getGmailTemplateFromDrafts_('reminder-email-friends-both-yes.html', "Nina and Andrew's wedding"),
    'friends-false-true-true': getGmailTemplateFromDrafts_('reminder-email-friends-reception-yes.html', "Nina and Andrew's wedding"),
  }

  // Gets the data from the passed sheet
  const dataRange = sheet.getRange("Sheet1!A2:BZ300"); // sheet.getDataRange();

  // Fetches displayed values for each row in the Range HT Andrew Roberts 
  // https://mashe.hawksey.info/2020/04/a-bulk-email-mail-merge-with-gmail-and-google-sheets-solution-evolution-using-v8/#comment-187490
  // @see https://developers.google.com/apps-script/reference/spreadsheet/range#getdisplayvalues
  const data = dataRange.getDisplayValues();

  // Assumes row 1 contains our column headings
  const heads = data.shift(); 
  
  // Gets the index of the column named 'Email Status' (Assumes header names are unique)
  // @see http://ramblings.mcpher.com/Home/excelquirks/gooscript/arrayfunctions
  const emailSentColIdx = heads.indexOf(REMINDER_SENT_COL);
  
  // Converts 2d array into an object array
  // See https://stackoverflow.com/a/22917499/1027723
  // For a pretty version, see https://mashe.hawksey.info/?p=17869/#comment-184945
  const obj = data.map(r => (heads.reduce((o, k, i) => (o[k] = r[i] || '', o), {})));

  // Creates an array to record sent emails
  const out = [];

  var count = 0;

  // Loops through all the rows of data
  // Each iteration must push to `out`.
  obj.forEach(function(row, rowIdx){
    if (count >= limit) {
      return;
    }

    // Only sends emails if email_sent cell is blank and not hidden by a filter
    if (row[REMINDER_SENT_COL] != '') {
      out.push([row[REMINDER_SENT_COL]]);
      return;
    }

    // Skip missing emails (or invalid looking emails)
    if (row[PRIMARY_GUEST_EMAIL_COL] == '' || row[PRIMARY_GUEST_EMAIL_COL].indexOf('@') == -1) {
      out.push([row[REMINDER_SENT_COL]]);
      return;
    }

    // Skip if the external name is missing
    if (row[EXTERNAL_NAMES_COL] == '') {
      out.push([row[REMINDER_SENT_COL]]);
      return;
    }

    // Skip if the they responded no
    if (row[RSVPD_COL] == 'FALSE') {
      out.push([row[REMINDER_SENT_COL]]);
      return;
    }


    try {
      // Lookup which email they should get
      const emailTemplate = getGmailTemplateForRow(row);

      const msgObj = fillInTemplateFromObject_(emailTemplate.message, row);

      const cc = [
        row[GUEST2_EMAIL_COL],
        row[GUEST3_EMAIL_COL],
        row[GUEST4_EMAIL_COL],
        row[GUEST5_EMAIL_COL],
        row[GUEST6_EMAIL_COL],
        row[GUEST7_EMAIL_COL],
        row[GUEST8_EMAIL_COL],
        row[GUEST9_EMAIL_COL],
        row[GUEST10_EMAIL_COL],
      ].filter(isEmail).join(",");

      // See https://developers.google.com/apps-script/reference/gmail/gmail-app#sendEmail(String,String,String,Object)
      // See https://developers.google.com/apps-script/reference/mail
      // If you need to send emails with unicode/emoji characters change GmailApp for MailApp
      // Uncomment advanced parameters as needed (see docs for limitations)
      if (!dryRun) {
        GmailApp.sendEmail(row[PRIMARY_GUEST_EMAIL_COL], msgObj.subject, msgObj.text, {
          htmlBody: msgObj.html,
          // bcc: 'a.bcc@email.com',
          // a comma-separated list of email addresses to CC
          // cc: 'a.cc@email.com',
          cc: cc,
          from: 'wedding@ninaandandrew.com',
          name: 'Nina & Andrew',
          // replyTo: 'a.reply@email.com',
          // noReply: true, // if the email should be sent from a generic no-reply email address (not available to gmail.com users)
          attachments: emailTemplate.attachments,
          inlineImages: emailTemplate.inlineImages
        });
      }

      // Edits cell to record email sent date
      count++;
      out.push([new Date()]);
    } catch(e) {
      // modify cell to record error
      out.push([e.message]);
    }

  });
  
  if (out.length == 0) {
    throw new Error('Found no rows');
  }

  // Updates the sheet with new data
  if (!dryRun) {
    sheet.getRange(headerRows + 1, emailSentColIdx+1, out.length).setValues(out);
  }

  SpreadsheetApp.getUi().alert((dryRun ? 'DRY-RUN:' : '') + "Scanned " + out.length + " rows, and Sent " + count + " emails");
  
  function getGmailTemplateForRow(row) {
    const key = (row[WHICH_EMAIL_COL] + '-' + row[WHICH_EMAIL_WEDDING_COL] + '-' + row[WHICH_EMAIL_RECEPTION_COL] + '-' + row[RSVPD_COL]).toLowerCase();

    if (key in emailTemplates) {
      return emailTemplates[key]
    }

    throw new Error('Unknown email template "' + key + '"');
  }

  /**
   * Fill template string with data object
   * @see https://stackoverflow.com/a/378000/1027723
   * @param {string} template string containing {{}} markers which are replaced with data
   * @param {object} data object used to replace {{}} markers
   * @return {object} message replaced with data
  */
  function fillInTemplateFromObject_(template, data) {
    // We have two templates one for plain text and the html body
    // Stringifing the object means we can do a global replace
    let template_string = JSON.stringify(template);

    // Token replacement
    template_string = template_string.replace(/{{[^{}]+}}/g, key => {
      key = decodeURIComponent(key.replace(/[{}]+/g, ""));
      if (!(key in data)) {
        throw new Error('Missing template string "' + key + '" in spreadsheet');
      }

      d = data[key]
      if (key == 'Primary Guest Name') {
        d = encodeURIComponent(d);
      }

      return escapeData_(d);
    });

    return JSON.parse(template_string);
  }

  /**
   * Escape cell data to make JSON safe
   * @see https://stackoverflow.com/a/9204218/1027723
   * @param {string} str to escape JSON special characters from
   * @return {string} escaped string
  */
  function escapeData_(str) {
    return str
      .replace(/[\\]/g, '\\\\')
      .replace(/[\"]/g, '\\\"')
      .replace(/[\/]/g, '\\/')
      .replace(/[\b]/g, '\\b')
      .replace(/[\f]/g, '\\f')
      .replace(/[\n]/g, '\\n')
      .replace(/[\r]/g, '\\r')
      .replace(/[\t]/g, '\\t');
  };
}
