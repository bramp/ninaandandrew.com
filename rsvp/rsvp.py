from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import datetime
import google.auth
import json
import logging
import os

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

QUOTA_PROJECT_ID = os.environ.get('QUOTA_PROJECT_ID', "ninaandandrew-com")

# The ID and range of a sample spreadsheet.
#SPREADSHEET_ID = "1e7fIMg8PamT-jH8UH_v2kUKqzwz79UGIkXdP24wILm0" # Test sheet
#SPREADSHEET_ID = "1FuYiyuTqO6AS461sbtw_dre7TWPIkflfPqKAxsQNuuc" # Real sheet
SPREADSHEET_ID = os.environ.get('SPREADSHEET_ID')

SHEET_RANGE_NAME = os.environ.get('SHEET_RANGE_NAME', "Sheet1!A2:BP")
START_ROW = 3 # TODO What is this for?

MAX_GUESTS = 10

NOT_FOUND_ERROR = "Your name isn't found. Please use the url from the invitation."
BACKEND_ERROR = "Backend error. Please try again later."
NO_DATA_FOUND_ERROR = "No data found."


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

class NotFoundException(Exception):
  pass

class Guest:
  def __init__(self, name, ceremony, reception):
    self.name = name   # string - guest name, required
    self.ceremony = ceremony # bool or None - attending?,
    self.reception = reception # bool or None - attending?
    self.email = "" # string - guest email, optional
    self.phone = "" # string - guest phone, optional
    self.comments = "" # string - freeform input, optional

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
  """Returns the default credentials for the application."""

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
  creds, project_id = google.auth.default(scopes=SCOPES, quota_project_id=QUOTA_PROJECT_ID)
  return creds


def _service():
  """Returns the spreadsheets service. This is a singleton so its initialised on first used, and repeated calls return the same instance."""
  if not hasattr(_service, "sheet"):
    if (SPREADSHEET_ID is None):
      raise Exception("SPREADSHEET_ID is not set")

    creds = _get_creds()
    service = build("sheets", "v4", credentials=creds, cache_discovery=False)
    _service.sheet = service.spreadsheets()

  return _service.sheet


def strToBool(value):
  """Returns True, False, or None depending on if value is "TRUE", "FALSE", or not set"""
  if value is None:
    return None

  value = value.strip().upper();
  if value == "":
    return None

  if (value == "TRUE") or (value == "YES"):
    return True

  return False

def boolToStr(value):
  """Returns "TRUE", "FALSE", or "" depending on if value is True, False, or None"""
  if (value is None) or (value == ""):
    return ""

  if value == True:
    return "TRUE"

  return "FALSE"

def _read_spreadsheet():
  '''Reads the entire spreadsheet and returns the header row, and values.
  May raise an HttpError on a SpreadsheetService issue, or Exception if the data
  is invalid.'''

  result = (
      _service().values()
      .get(spreadsheetId=SPREADSHEET_ID, range=SHEET_RANGE_NAME)
      .execute()
  )
  values = result.get("values", [])
  if not values:
    raise Exception(NO_DATA_FOUND_ERROR)

  header = values[0]
  data = values[1:]

  return header, data

def _pad_row(header, row):
  # Empty trailing values will not be included, so pad each values
  # with empty cell values for easier processing.
  while len(row) < len(header):
    row.append("")

  return row

def create_column_map(header_row):
  """Reads the header row and returns a map of columns to offsets"""
  try:
    mapping = {
     "INVITED_TO_WEDDING" : "Wedding?",
     "INVITED_TO_RECEPTION" : "Reception?",
     "WHICH_INVITE" : "Which Invite?",
     "INVITE_SENT" : "Invite Sent?",
     "DATE_SENT"   : "Date Sent",
     "RSVP_PROVIDED" : "RSVP provided?",
     "RSVP_CREATED" : "RSVP Created",
     "RSVP_MODIFIED" :"RSVP Modified",
     "COMMENTS" : "Comments",

     "PRIMARY_GUEST" : "Primary Guest Name",
     "PRIMARY_GUEST_EMAIL" :"Primary Guest Email",
     "PRIMARY_GUEST_PHONE" : "Primary Guest Phone",
     "PRIMARY_GUEST_CEREMONY" : "Primary Guest Ceremony",
     "PRIMARY_GUEST_RECEPTION" : "Primary Guest Reception",
    }

    # All the other guests
    for i in range(2, MAX_GUESTS + 1):
      mapping[f"GUEST{i}"] = f"Guest{i} Name"
      mapping[f"GUEST{i}_EMAIL"] = f"Guest{i} Email"
      mapping[f"GUEST{i}_PHONE"] = f"Guest{i} Phone"
      mapping[f"GUEST{i}_CEREMONY"] = f"Guest{i} Ceremony"
      mapping[f"GUEST{i}_RECEPTION"] = f"Guest{i} Reception"

    results = {}
    for key, value in mapping.items():
      results[key] = header_row.index(value)

    return results

  except ValueError as e:
    raise Exception("Column not found in header row: " + str(e))


def spreadsheet_to_json(primary_guest_name):
  """Returns a invite for the give primary guest from the spreadsheet.
  Raises an exception if the primary guest is not found."""
  
  if not primary_guest_name:
    raise NotFoundException(NOT_FOUND_ERROR)

  try:
    header, data = _read_spreadsheet()
    COLUMN_MAP = create_column_map(header)

    result = {}
    for idx, row in enumerate(data):
      assert(len(row) > COLUMN_MAP["PRIMARY_GUEST"])

      if row[COLUMN_MAP["PRIMARY_GUEST"]] == primary_guest_name:
        row = _pad_row(header, row)

        result["ceremony"] = True if row[COLUMN_MAP["INVITED_TO_WEDDING"]] == "TRUE" else False
        result["reception"] = True if row[COLUMN_MAP["INVITED_TO_RECEPTION"]] == "TRUE" else False
        result["comments"] = row[COLUMN_MAP["COMMENTS"]] # GUEST COMMENTS

        guest_list = []

        guest = {}
        guest['name'] = row[COLUMN_MAP["PRIMARY_GUEST"]]
        guest['email'] = row[COLUMN_MAP["PRIMARY_GUEST_EMAIL"]]
        guest['phone'] = row[COLUMN_MAP["PRIMARY_GUEST_PHONE"]]
        guest['ceremony'] = strToBool(row[COLUMN_MAP["PRIMARY_GUEST_CEREMONY"]]) # ATTENDING WEDDING
        guest['reception'] = strToBool(row[COLUMN_MAP["PRIMARY_GUEST_RECEPTION"]]) # ATTENDING RECEPTION

        guest_list.append(guest)

        for i in range(2, MAX_GUESTS + 1):
          if (row[COLUMN_MAP[f"GUEST{i}"]] == ""): break

          guest = {}
          guest['name'] = row[COLUMN_MAP[f"GUEST{i}"]]
          guest['email'] = row[COLUMN_MAP[f"GUEST{i}_EMAIL"]]
          guest['phone'] = row[COLUMN_MAP[f"GUEST{i}_PHONE"]]
          guest['ceremony'] = strToBool(row[COLUMN_MAP[f"GUEST{i}_CEREMONY"]]) # ATTENDING WEDDING
          guest['reception'] = strToBool(row[COLUMN_MAP[f"GUEST{i}_RECEPTION"]]) # ATTENDING RECEPTION

          guest_list.append(guest)

        result["guests"] = guest_list

        # TODO: Validate there's only one matching row
        return result;

    # Return error to user if there is no matching row
    raise NotFoundException(NOT_FOUND_ERROR)

  except HttpError as err:
    logging.exception("Exception making sheets call")
    raise Exception(BACKEND_ERROR)


def json_to_primary_guest(d):
  """Takes the provided map, and returns a PrimaryGuest object."""
  p = None  

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
      assert p is not None, "We need to have a primary guest to have secondary guests"

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
  """Updates the given primary guest's row in the spreadsheet."""
  try:
    header, data = _read_spreadsheet()
    COLUMN_MAP = create_column_map(header)

    # TODO: Validate that the values for Primary Guest are unique

    for idx, row in enumerate(values):
      if row[COLUMN_MAP["PRIMARY_GUEST"]] == primary_guest.name:
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # This code depends on the format of the spreadsheet!!!
        # START AT COLUMN J
        stuff_to_write = []
        stuff_to_write.append("YES")                         # J - RSVP provided?
        create_time = row[COLUMN_MAP["RSVP_CREATED"]] if row[COLUMN_MAP["RSVP_PROVIDED"]] == "YES" else now
        stuff_to_write.append(create_time)                   # K
        stuff_to_write.append(now)                           # L - last modified
        stuff_to_write.append(primary_guest.name)            # M
        stuff_to_write.append(primary_guest.email)           # N
        stuff_to_write.append("'" + primary_guest.phone)     # O
        stuff_to_write.append(boolToStr(primary_guest.ceremony))  # P
        stuff_to_write.append(boolToStr(primary_guest.reception)) # Q
        stuff_to_write.append(primary_guest.comments)        # R
        for guest in primary_guest.guests:
          stuff_to_write.append(guest.name)                  # S --->
          stuff_to_write.append(guest.email)                 # T --->
          stuff_to_write.append("'" + guest.phone)           # U --->
          stuff_to_write.append(guest.ceremony)              # V --->
          stuff_to_write.append(guest.reception)             # W --->

        _service().values().update(
          spreadsheetId=SPREADSHEET_ID, 
          range=f"Sheet1!J{START_ROW+idx}:BP{START_ROW+idx}",
          valueInputOption="USER_ENTERED",
          body={"values": [stuff_to_write]}
        ).execute()

        return {"success": ("Successfully updated guest row for " + primary_guest.name)};

    raise NotFoundException(NOT_FOUND_ERROR)

  except HttpError as err:
    logging.exception("Exception making sheets call")
    raise Exception(BACKEND_ERROR)

def main():

  # TESTING WRITE TO SPREADSHEET
  print("WRITING TO SPREADSHEET")
  with open("input.json") as json_file:
    d = json.load(json_file)
  assert d is not None
  primary_guest = json_to_primary_guest(d)
  # primary_guest.PrettyPrint()
  success_write_result = update_guest_row(primary_guest)
  print(success_write_result)
  print("----------------------------------------")

  with open("hacker.json") as json_file:
    h = json.load(json_file)
  assert h is not None
  hacker = json_to_primary_guest(h)
  try:
    fail_write_result = update_guest_row(hacker)
  except NotFoundException as err:
    print(repr(err))

  print("HACKER THWARTED!!!")
  print("----------------------------------------")

  # TESTING READ FROM SPREADSHEET AND WRITE TO JSON
  print("READING FROM SPREADSHEET, WRITING TO JSON")
  #spreadsheet_to_json("Arun Tirumalai")
  success_read_result = spreadsheet_to_json("King Bob")
  print(success_read_result)
  print("----------------------------------------")


if __name__ == "__main__":
  main()