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
 * Change these to match the column names you are using for email 
 * recipient addresses and email sent column.
*/
const PRIMARY_GUEST_EMAIL_COL  = "Primary Guest Email";
const EXTERNAL_NAMES_COL  = "External Names";

const GUEST2_EMAIL_COL  = "Guest2 Email";
const GUEST3_EMAIL_COL  = "Guest3 Email";
const GUEST4_EMAIL_COL  = "Guest4 Email";
const GUEST5_EMAIL_COL  = "Guest5 Email";
const GUEST6_EMAIL_COL  = "Guest6 Email";
const GUEST7_EMAIL_COL  = "Guest7 Email";
const GUEST8_EMAIL_COL  = "Guest8 Email";
const GUEST9_EMAIL_COL  = "Guest9 Email";
const GUEST10_EMAIL_COL  = "Guest10 Email";

const INVITE_SENT_COL = "Invite Sent?\n(by email)";
const REMINDER_SENT_COL = "Reminder Sent?";

// Have they RSVPd 
// True - At least one person in party said yes.
// False - All members of party said no
// Blank - No response
const RSVPD_COL = "RSVP'd";

const WHICH_EMAIL_COL = "Which Invite?";
const WHICH_EMAIL_WEDDING_COL = "Wedding?";
const WHICH_EMAIL_RECEPTION_COL = "Reception?";

const limit = 1; // Stop after sending limit mails

const headerRows = 2;


/** 
 * Creates the menu item "Mail Merge" for user to run scripts on drop-down.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Mail Merge')
      .addItem('Send Invite Emails', 'sendInviteEmails')
      .addItem('Send Invite Emails (Dry Run)', 'sendInviteEmailsDryRun')

      .addItem('Send Reminder Emails', 'sendReminderEmails')
      .addItem('Send Reminder Emails (Dry Run)', 'sendReminderEmailsDryRun')

      .addToUi();
}


function isEmail(value) {
  // Must be a string, and have a @ symbol after the first character.
  return typeof value === "string" && value.indexOf('@') > 0;
}

/**
 * Get a Gmail draft message by matching the subject line.
 * @param {string} subject_line to search for draft message
 * @param {string} new_subject_line to use in compiled template
 * @return {object} containing the subject, plain and html message body and attachments
*/
function getGmailTemplateFromDrafts_(subject_line, new_subject_line) {
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
        subject: new_subject_line,
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

