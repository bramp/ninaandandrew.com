import datetime
import google.auth
import json
import os.path

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

# The ID and range of a sample spreadsheet.
SPREADSHEET_ID = "1e7fIMg8PamT-jH8UH_v2kUKqzwz79UGIkXdP24wILm0"
SHEET_RANGE_NAME = "Sheet1!A3:BO"

START_ROW = 3

PRIMARY_GUEST_COLUMN = 11
RSVP_PROVIDED_COLUMN = 8
CREATE_TIME_COLUMN = 9

ERROR_JSON = json.dumps({"error": "Please enter the primary guest's full name, as it appeared in the email."}, indent=2)

#### TODOS
# Make real spreadsheet look like test spreadsheet, and add column ACLs
# Handle case for name entered
# Throw unexpected errors
# NICE TO HAVE: Validate that they don't have values if they're not invited

#### DONE TODOS
# Fix phone number
# Move Invite Sent to left of Primary Guest, modified by us, and add Date Sent
# Ceremony + Reception should be drop downs
# RSVP provided, and created, modified
# add cli flag for token.json vs cloud function
# Add support for getting whether they're invited to ceremony and/or reception
# has to read from spreadsheet and display if there are already values (initialize guest object with what's already in sheet)
# Fix true/false in Json output
# Return success + error JSON objects
# Display error messages - return json with error + message "error: "" "


class Guest:
  def __init__(self, name, ceremony, reception):
    self.name = name   # string - guest name, required
    self.ceremony = ceremony # bool - attending?, required
    self.reception = reception # bool - attending?, required
    self.email = "" # string - guest email, optional
    self.phone = "" # string - guest phone, optional

  def PrettyPrint(self):
    print(f'    Guest name: {self.name}')
    print(f'    Guest attending ceremony: {self.ceremony}')
    print(f'    Guest attending reception: {self.reception}')
    if (self.email != ""):
      print(f'    Guest email: {self.email}')
    if (self.phone != ""):
      print(f'    Guest phone: {self.phone}')    


class PrimaryGuest(Guest):
  def __init__(self, name, ceremony, reception):
    super(PrimaryGuest, self).__init__(name, ceremony, reception)
    self.comments = "" # string - freeform input, optional
    self.guests = []

  def PrettyPrint(self):
    print(f'Primary Guest name: {self.name}')
    print(f'Primary Guest attending ceremony: {self.ceremony}')
    print(f'Primary Guest attending reception: {self.reception}')
    if (self.email != ""):
      print(f'Primary Guest email: {self.email}')
    if (self.phone != ""):
      print(f'Primary Guest phone: {self.phone}')
    if (self.comments != ""):
      print(f'Primary Guest comments: {self.comments}')
    for guest in self.guests:
      guest.PrettyPrint()

def _get_creds():
  creds, project_id = google.auth.default(scopes=SCOPES, quota_project_id="ninaandandrew-com")
  return creds
#   creds = None
#   # The file token.json stores the user's access and refresh tokens, and is
#   # created automatically when the authorization flow completes for the first
#   # time.
#   if os.path.exists("token.json"):
#     creds = Credentials.from_authorized_user_file("token.json", SCOPES)
#   # If there are no (valid) credentials available, let the user log in.
#   if not creds or not creds.valid:
#     if creds and creds.expired and creds.refresh_token:
#       creds.refresh(Request())
#     else:
#       flow = InstalledAppFlow.from_client_secrets_file(
#           "credentials.json", SCOPES
#       )
#       creds = flow.run_local_server(port=0)
#     # Save the credentials for the next run
#     with open("token.json", "w") as token:
#       token.write(creds.to_json())
#   return creds

def _read_spreadsheet():
  creds = _get_creds()

  try:
    service = build("sheets", "v4", credentials=creds)

    # Call the Sheets API
    sheet = service.spreadsheets()
    result = (
        sheet.values()
        .get(spreadsheetId=SPREADSHEET_ID, range=SHEET_RANGE_NAME)
        .execute()
    )
    values = result.get("values", [])
    values_dict = {v[PRIMARY_GUEST_COLUMN]:v for v in values}

    if not values:
      print("No data found.")
      return

    return (sheet, values, values_dict)

  except HttpError as err:
    print(err)
    return

def spreadsheet_to_json(primary_guest_name):
  if not primary_guest_name:
    return ERROR_JSON

  try:
    sheet, values, values_dict = _read_spreadsheet()

    if not values:
      print("No data found.")
      # TODO: There should be values in the spreadsheet, throw an error
      return

    output_dict = {}
    found_row = False
    for idx, row in enumerate(values):
      if row[PRIMARY_GUEST_COLUMN] == primary_guest_name:
        current_row = None
        if not values_dict.__contains__(primary_guest_name):
          # TODO: if guest name is wrong, return error to the user
          print("Fail fail fail")
          return

        found_row = True
        current_row = values_dict[primary_guest_name]

        output_dict["ceremony"] = True if current_row[4] == "TRUE" else False  # INVITED TO WEDDING
        output_dict["reception"] = True if current_row[5] == "TRUE" else False # INVITED TO RECEPTION

        guest_list = []
        primary_guest = {}
        primary_guest['name'] = current_row[11]
        if (current_row[12]): primary_guest['email'] = current_row[12]
        if (current_row[13]): primary_guest['phone'] = current_row[13]
        if (current_row[14]): 
          primary_guest['ceremony'] = True if current_row[14] == "TRUE" else False  # ATTENDING WEDDING
        if (current_row[15]): 
          primary_guest['reception'] = True if current_row[15] == "TRUE" else False # ATTENDING RECEPTION
        guest_list.append(primary_guest)

        output_dict["comments"] = current_row[16] # GUEST COMMENTS

        if (len(current_row) > 17):
          remaining_guests = current_row[17:]

          # Pad in case the last guest doesn't have a reception value,
          # for easier iteration over the remaining guests
          mod = len(remaining_guests) % 5
          if (mod > 0):
            for i in range(5 - mod):
              remaining_guests.append("")

          j = 0
          while j < len(remaining_guests):
            # Due to the padding, we know each guest has 5 entries
            guest = {}
            guest['name'] = remaining_guests[j]
            if (remaining_guests[j+1]): guest['email'] = remaining_guests[j+1]
            if (remaining_guests[j+2]): guest['phone'] = remaining_guests[j+2]
            if (remaining_guests[j+3]): 
              guest['ceremony'] = True if remaining_guests[j+3] == "TRUE" else False  # ATTENDING WEDDING
            if (remaining_guests[j+4]): 
              guest['reception'] = True if remaining_guests[j+4] == "TRUE" else False # ATTENDING RECEPTION
            guest_list.append(guest)
            j += 5

          output_dict["guests"] = guest_list

        # TODO: Validate there's only one matching row
        json_obj = json.dumps(output_dict, indent=2)
        with open("output.json", "w") as outfile:
          outfile.write(json_obj)

        #print(output_dict)
        return json_obj

    # Return error to user if there is no matching row
    if not found_row:
      return ERROR_JSON

  except HttpError as err:
    print(err)


def json_to_primary_guest(input):
  p = None
  with open(input) as f:
    d = json.load(f)    

    if not d.__contains__("guests"):
      # RSVP not filled out yet
      return p
    primary = True
    for guest_input in d["guests"]:
      if primary:
        if not guest_input.__contains__("name") or not guest_input.__contains__("ceremony") or not guest_input.__contains__("reception"):
          # incomplete RSVP, return
          return p
        p = PrimaryGuest(guest_input["name"], guest_input["ceremony"], guest_input["reception"])
        if guest_input.__contains__("email"):
          p.email = guest_input["email"]
        if guest_input.__contains__("phone"):
          p.phone = guest_input["phone"]
        if d.__contains__("comments"):
          p.comments = d["comments"]
        primary = False
      else:
        if p == None:
          # Bug in code above!
          raise Exception("We need to have a primary guest to have secondary guests") 
        if not guest_input.__contains__("name") or not guest_input.__contains__("ceremony") or not guest_input.__contains__("reception"):
            # incomplete RSVP, return
            return p
        g = Guest(guest_input["name"], guest_input["ceremony"], guest_input["reception"])
        if guest_input.__contains__("email"):
          g.email = guest_input["email"]
        if guest_input.__contains__("phone"):
          g.phone = guest_input["phone"]
        p.guests.append(g)

  return p


def update_guest_row(primary_guest):
  try:
    sheet, values, values_dict = _read_spreadsheet()

    if not values:
      print("No data found.")
      # TODO: There should be values in the spreadsheet, throw an error
      return

    # TODO: Validate that the values for Primary Guest are unique
    # TODO: Throw error if primary_guest is not in spreadsheet

    found_row = False
    for idx, row in enumerate(values):
      if row[PRIMARY_GUEST_COLUMN] == primary_guest.name:
        current_row = None
        if values_dict.__contains__(primary_guest.name):
          current_row = values_dict[primary_guest.name]

        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # This code depends on the format of the spreadsheet!!!
        # START AT COLUMN J
        stuff_to_write = []
        stuff_to_write.append("YES")                         # I - RSVP provided?
        create_time = current_row[CREATE_TIME_COLUMN] if current_row[RSVP_PROVIDED_COLUMN] == "YES" else now
        stuff_to_write.append(create_time)                   # J
        stuff_to_write.append(now)                           # K - last modified
        stuff_to_write.append(primary_guest.name)            # L
        stuff_to_write.append(primary_guest.email)           # M
        stuff_to_write.append("'" + primary_guest.phone)     # N
        stuff_to_write.append(primary_guest.ceremony)        # O
        stuff_to_write.append(primary_guest.reception)       # P
        stuff_to_write.append(primary_guest.comments)        # Q
        for guest in primary_guest.guests:
          stuff_to_write.append(guest.name)                  # R --->
          stuff_to_write.append(guest.email)                 # S --->
          stuff_to_write.append("'" + guest.phone)           # T --->
          stuff_to_write.append(guest.ceremony)              # U --->
          stuff_to_write.append(guest.reception)             # V --->

        result = (
          sheet.values()
          .update(
            spreadsheetId=SPREADSHEET_ID, 
            range=f"Sheet1!I{START_ROW+idx}:BO{START_ROW+idx}",
            valueInputOption="USER_ENTERED",
            body={"values": [stuff_to_write]}
          )
          .execute()
        )
        return json.dumps({"success": ("Successfully updated guest row for " + primary_guest.name)}, indent=2)

    if not found_row:
      return ERROR_JSON

  except HttpError as err:
    print(err)

def main():

  # TESTING WRITE TO SPREADSHEET
  print("WRITING TO SPREADSHEET")
  primary_guest = json_to_primary_guest("input.json")
  #primary_guest.PrettyPrint()
  success_write_result = update_guest_row(primary_guest)
  print(success_write_result)

  hacker = json_to_primary_guest("hacker.json")
  fail_write_result = update_guest_row(hacker)
  print("HACKER THWARTED!!!")
  print(fail_write_result)

  print("----------------------------------------")

  # TESTING READ FROM SPREADSHEET AND WRITE TO JSON
  print("READING FROM SPREADSHEET, WRITING TO JSON")
  #spreadsheet_to_json("Arun Tirumalai")
  success_read_result = spreadsheet_to_json("John Smith")
  print(success_read_result)
  fail_read_result = spreadsheet_to_json("Muahahahaha I'm a hacker")
  print("MUAHAHAHA I'M A HACKER ISN'T INVITED!!!")
  print(fail_read_result)

if __name__ == "__main__":
  main()