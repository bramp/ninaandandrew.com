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
 
/**
 * Change these to match the column names you are using for email 
 * recipient addresses and email sent column.
*/
const RECIPIENT_COL  = "Primary Guest Email";
const EXTERNAL_NAMES_COL  = "External Names";

const EMAIL_SENT_COL = "Invite Sent?\n(by email)";
const WHICH_EMAIL_COL = "Which Invite?";
const WHICH_EMAIL_WEDDING_COL = "Wedding?";
const WHICH_EMAIL_RECEPTION_COL = "Reception?";

const limit = 10; // Stop after sending limit mails

const headerRows = 2;

 
/** 
 * Creates the menu item "Mail Merge" for user to run scripts on drop-down.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Mail Merge')
      .addItem('Send Invite Emails', 'sendEmails')
      .addItem('Send Invite Emails (Dry Run)', 'sendEmailsDryRun')
      .addToUi();
}

function sendEmailsDryRun(sheet=SpreadsheetApp.getActiveSheet()) {
  return sendEmails(sheet, true);
}

/**
 * Sends emails from sheet data.
 * @param {Sheet} sheet to read data from
*/
function sendEmails(sheet=SpreadsheetApp.getActiveSheet(), dryRun=false) {
  const emailTemplates = {
    // Type - Wedding - Receptioon
    'amma-true-true': getGmailTemplateFromDrafts_('email-amma-both.html'),
    'appa-true-true': getGmailTemplateFromDrafts_('email-appa-both.html'),
    'friends-true-true': getGmailTemplateFromDrafts_('email-friends-both.html'),
    'friends-false-true': getGmailTemplateFromDrafts_('email-friends-reception.html'),
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
  const emailSentColIdx = heads.indexOf(EMAIL_SENT_COL);
  
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
    if (row[EMAIL_SENT_COL] != '') {
      out.push([row[EMAIL_SENT_COL]]);
      return;
    }

    // Skip missing emails (or invalid looking emails)
    if (row[RECIPIENT_COL] == '' || row[RECIPIENT_COL].indexOf('@') == -1) {
      out.push([row[EMAIL_SENT_COL]]);
      return;
    }

    if (row[RECIPIENT_COL] == '' || row[RECIPIENT_COL].indexOf('@') == -1) {
      out.push([row[EMAIL_SENT_COL]]);
      return;
    }

    // Skip if the external name is missing
    if (row[EXTERNAL_NAMES_COL] == '') {
      out.push([row[EMAIL_SENT_COL]]);
      return;
    }

    try {
      // Lookup which email they should get
      const emailTemplate = getGmailTemplateForRow(row);

      const msgObj = fillInTemplateFromObject_(emailTemplate.message, row);

      // See https://developers.google.com/apps-script/reference/gmail/gmail-app#sendEmail(String,String,String,Object)
      // See https://developers.google.com/apps-script/reference/mail
      // If you need to send emails with unicode/emoji characters change GmailApp for MailApp
      // Uncomment advanced parameters as needed (see docs for limitations)
      if (!dryRun) {
        GmailApp.sendEmail(row[RECIPIENT_COL], msgObj.subject, msgObj.text, {
          htmlBody: msgObj.html,
          // bcc: 'a.bcc@email.com',
          // cc: 'a.cc@email.com',
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
    const key = (row[WHICH_EMAIL_COL] + '-' + row[WHICH_EMAIL_WEDDING_COL] + '-' + row[WHICH_EMAIL_RECEPTION_COL]).toLowerCase();

    if (key in emailTemplates) {
      return emailTemplates[key]
    }

    throw new Error('Unknown email template "' + key + '"');
  }

  /**
   * Get a Gmail draft message by matching the subject line.
   * @param {string} subject_line to search for draft message
   * @return {object} containing the subject, plain and html message body and attachments
  */
  function getGmailTemplateFromDrafts_(subject_line) {
    try {
      // get drafts
      const drafts = GmailApp.getDrafts();
      // filter the drafts that match subject line
      const draft = drafts.filter(subjectFilter_(subject_line))[0];
      // get the message object
      const msg = draft.getMessage();

      // Handles inline images and attachments so they can be included in the merge
      // Based on https://stackoverflow.com/a/65813881/1027723
      // Gets all attachments and inline image attachments
      const allInlineImages = draft.getMessage().getAttachments({includeInlineImages: true,includeAttachments:false});
      const attachments = draft.getMessage().getAttachments({includeInlineImages: false});
      const htmlBody = msg.getBody(); 

      // Creates an inline image object with the image name as key 
      // (can't rely on image index as array based on insert order)
      const img_obj = allInlineImages.reduce((obj, i) => (obj[i.getName()] = i, obj) ,{});

      //Regexp searches for all img string positions with cid
      const imgexp = RegExp('<img.*?src="cid:(.*?)".*?alt="(.*?)"[^\>]+>', 'g');
      const matches = [...htmlBody.matchAll(imgexp)];

      //Initiates the allInlineImages object
      const inlineImagesObj = {};
      // built an inlineImagesObj from inline image matches
      matches.forEach(match => inlineImagesObj[match[1]] = img_obj[match[2]]);

      return {
        message: {
          // TODO Read the subject from somewhere else
          subject: "You are invited!",
          text: msg.getPlainBody(),
          html:htmlBody
        }, 
        attachments: attachments,
        inlineImages: inlineImagesObj,
      };
    } catch(e) {
      throw new Error("Oops - can't find Gmail draft: " + subject_line);
    }

    /**
     * Filter draft objects with the matching subject linemessage by matching the subject line.
     * @param {string} subject_line to search for draft message
     * @return {object} GmailDraft object
    */
    function subjectFilter_(subject_line){
      return function(element) {
        if (element.getMessage().getSubject() === subject_line) {
          return element;
        }
      }
    }
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
