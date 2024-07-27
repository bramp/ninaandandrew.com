from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import datetime
import google.auth
import os

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

QUOTA_PROJECT_ID = os.environ.get("QUOTA_PROJECT_ID", "ninaandandrew-com")

# The ID and range of a sample spreadsheet.
# SPREADSHEET_ID = "1e7fIMg8PamT-jH8UH_v2kUKqzwz79UGIkXdP24wILm0" # Test sheet
# SPREADSHEET_ID = "1FuYiyuTqO6AS461sbtw_dre7TWPIkflfPqKAxsQNuuc" # Real sheet
SPREADSHEET_ID = os.environ.get("SPREADSHEET_ID")

SHEET = "Main"
START_ROW = 2
SHEET_RANGE_NAME = os.environ.get("SHEET_RANGE_NAME", f"{SHEET}!A{START_ROW}:BP")

MAX_GUESTS = 10

NOT_FOUND_ERROR = "Your name isn't found. Please use the url from the invitation."
BACKEND_ERROR = "Backend error. Please try again later."
NO_DATA_FOUND_ERROR = "No data found."


class NotFoundException(Exception):
    pass


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
    creds, project_id = google.auth.default(
        scopes=SCOPES, quota_project_id=QUOTA_PROJECT_ID
    )
    return creds


def _service():
    """Returns the spreadsheets service."""
    creds = _get_creds()
    return build("sheets", "v4", credentials=creds, cache_discovery=False)


def strToBool(value):
    """Returns True, False, or None depending on if value is "TRUE", "FALSE", or not set"""
    if value is None:
        return None

    value = value.strip().upper()
    if value == "":
        return None

    if (value == "TRUE") or (value == "YES"):
        return True

    return False


def boolToStr(value):
    """Returns "TRUE", "FALSE", or "" depending on if value is True, False, or None"""
    if (value is None) or (value == ""):
        return ""

    if value is True:
        return "TRUE"

    return "FALSE"


def _read_spreadsheet(service=None):
    """Reads the entire spreadsheet and returns the header row, and values.
    May raise an HttpError on a SpreadsheetService issue, or Exception if the data
    is invalid."""

    if SPREADSHEET_ID is None:
        raise Exception("SPREADSHEET_ID is not set")

    if service is None:
        service = _service()

    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=SPREADSHEET_ID, range=SHEET_RANGE_NAME)
        .execute()
    )
    values = result.get("values", [])
    if not values:
        raise Exception(NO_DATA_FOUND_ERROR)

    header = values[0]
    data = values[1:]

    return header, data


def _write_spreadsheet(x, y, row, service=None):
    """Writes the given row starting at x, y"""

    if service is None:
        service = _service()

    col_start = column_name(x)
    col_end = column_name(x + len(row))

    row_idx = y

    return (
        service.spreadsheets()
        .values()
        .update(
            spreadsheetId=SPREADSHEET_ID,
            range=f"{SHEET}!{col_start}{row_idx}:{col_end}{row_idx}",
            valueInputOption="USER_ENTERED",
            body={"values": [row]},
        )
        .execute()
    )


def _pad_row(row, length):
    # Empty trailing values will not be included, so pad each values
    # with empty cell values for easier processing.
    while len(row) < length:
        row.append("")

    return row


def create_column_map(header_row):
    """Reads the header row and returns a map of columns to offsets"""
    try:
        mapping = {
            "INVITED_TO_WEDDING": "Wedding?",
            "INVITED_TO_RECEPTION": "Reception?",
            # These three aren't needed
            # "WHICH_INVITE" : "Which Invite?",
            # "INVITE_SENT" : "Invite Sent?",
            # "DATE_SENT"   : "Date Sent",
            "RSVP_CREATED": "RSVP Created",
            "RSVP_MODIFIED": "RSVP Modified",
            "COMMENTS": "Comments",
            "PRIMARY_GUEST": "Primary Guest Name",
            "PRIMARY_GUEST_EMAIL": "Primary Guest Email",
            "PRIMARY_GUEST_PHONE": "Primary Guest Phone",
            "PRIMARY_GUEST_CEREMONY": "Primary Guest Ceremony",
            "PRIMARY_GUEST_RECEPTION": "Primary Guest Reception",
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


def lookup(primary_guest_name):
    """Returns a invite for the give primary guest from the spreadsheet.
    Raises an exception if the primary guest is not found."""

    if not primary_guest_name:
        raise NotFoundException(NOT_FOUND_ERROR)

    try:
        with _service() as service:
            header, data = _read_spreadsheet(service=service)
            COLUMN_MAP = create_column_map(header)

            result = {}
            for idx, row in enumerate(data):
                if len(row) <= COLUMN_MAP["PRIMARY_GUEST"]:
                    # No primary guest for this row.
                    continue

                if row[COLUMN_MAP["PRIMARY_GUEST"]] == primary_guest_name:
                    row = _pad_row(row, len(header))

                    result["ceremony"] = (
                        True
                        if row[COLUMN_MAP["INVITED_TO_WEDDING"]] == "TRUE"
                        else False
                    )
                    result["reception"] = (
                        True
                        if row[COLUMN_MAP["INVITED_TO_RECEPTION"]] == "TRUE"
                        else False
                    )
                    result["comments"] = row[COLUMN_MAP["COMMENTS"]]  # GUEST COMMENTS

                    guest_list = []

                    guest = {}
                    guest["name"] = row[COLUMN_MAP["PRIMARY_GUEST"]]
                    guest["email"] = row[COLUMN_MAP["PRIMARY_GUEST_EMAIL"]]
                    guest["phone"] = row[COLUMN_MAP["PRIMARY_GUEST_PHONE"]]
                    guest["ceremony"] = strToBool(
                        row[COLUMN_MAP["PRIMARY_GUEST_CEREMONY"]]
                    )  # ATTENDING WEDDING
                    guest["reception"] = strToBool(
                        row[COLUMN_MAP["PRIMARY_GUEST_RECEPTION"]]
                    )  # ATTENDING RECEPTION

                    guest_list.append(guest)

                    for i in range(2, MAX_GUESTS + 1):
                        if row[COLUMN_MAP[f"GUEST{i}"]] == "":
                            break

                        guest = {}
                        guest["name"] = row[COLUMN_MAP[f"GUEST{i}"]]
                        guest["email"] = row[COLUMN_MAP[f"GUEST{i}_EMAIL"]]
                        guest["phone"] = row[COLUMN_MAP[f"GUEST{i}_PHONE"]]
                        guest["ceremony"] = strToBool(
                            row[COLUMN_MAP[f"GUEST{i}_CEREMONY"]]
                        )  # ATTENDING WEDDING
                        guest["reception"] = strToBool(
                            row[COLUMN_MAP[f"GUEST{i}_RECEPTION"]]
                        )  # ATTENDING RECEPTION

                        guest_list.append(guest)

                    result["guests"] = guest_list

                    # TODO: Validate there's only one matching row
                    return result

        # Return error to user if there is no matching row
        raise NotFoundException(NOT_FOUND_ERROR)

    except HttpError:
        raise Exception(BACKEND_ERROR)


def _validate_rsvp(rsvp):
    """Validates the row is valid and raises an exception otherwise."""

    if not rsvp.__contains__("guests"):
        # RSVP not filled out yet
        raise Exception("guests field is missing")

    guests = rsvp["guests"]
    if not isinstance(guests, list):
        raise Exception("guest field must be a list")

    if len(guests) < 1:
        # RSVP not filled out yet
        raise Exception("guests must contain atleast one guest")

    for guest in guests:
        if (
            not guest.__contains__("name")
            or not guest.__contains__("ceremony")
            or not guest.__contains__("reception")
        ):
            raise Exception("guest is missing a required field")

    if not guest.__contains__("email"):
        guest["email"] = ""
    if not guest.__contains__("phone"):
        guest["phone"] = ""


def column_name(index):
    """Returns the column name for the given index. e.g 1 -> A, 26 -> Z, 27 -> AA"""
    # TODO Turns out Googlesheets supports a R1C1 notation, which we should use instead of this.
    # https://developers.google.com/sheets/api/guides/concepts
    start_index = 1
    letter = ""
    while index > 25 + start_index:
        letter += chr(65 + int((index - start_index) / 26) - 1)
        index = index - (int((index - start_index) / 26)) * 26
    letter += chr(65 - start_index + (int(index)))
    return letter


def update(rsvp):
    """Updates the given primary guest's rsvp in the spreadsheet."""

    _validate_rsvp(rsvp)

    guests = rsvp["guests"]
    primary_guest_name = guests[0]["name"]

    try:
        with _service() as service:
            header, data = _read_spreadsheet(service=service)
            COLUMN_MAP = create_column_map(header)

            # TODO: Validate that the values for Primary Guest are unique

            for idx, row in enumerate(data):
                if len(row) <= COLUMN_MAP["PRIMARY_GUEST"]:
                    # No primary guest for this row.
                    continue

                if row[COLUMN_MAP["PRIMARY_GUEST"]] == primary_guest_name:
                    now = datetime.datetime.now().strftime(
                        "%Y-%m-%d %H:%M:%S"
                    )  # TODO ALlow this to be mockable.

                    # This code depends on the format of the spreadsheet!!!
                    # START AT COLUMN J
                    stuff_to_write = _pad_row([], len(header))

                    create_time = (
                        now
                        if row[COLUMN_MAP["RSVP_CREATED"]] == ""
                        else row[COLUMN_MAP["RSVP_CREATED"]]
                    )
                    stuff_to_write[COLUMN_MAP["RSVP_CREATED"]] = create_time  # K
                    stuff_to_write[COLUMN_MAP["RSVP_MODIFIED"]] = (
                        now  # L - last modified
                    )
                    stuff_to_write[COLUMN_MAP["COMMENTS"]] = rsvp["comments"]  # R

                    for i, guest in enumerate(guests):
                        key = f"GUEST{i + 1}" if i > 0 else "PRIMARY_GUEST"
                        stuff_to_write[COLUMN_MAP[key]] = guest["name"]
                        stuff_to_write[COLUMN_MAP[f"{key}_EMAIL"]] = guest["email"]
                        stuff_to_write[COLUMN_MAP[f"{key}_PHONE"]] = (
                            "" if guest["phone"] == "" else "'" + guest["phone"]
                        )
                        stuff_to_write[COLUMN_MAP[f"{key}_CEREMONY"]] = boolToStr(
                            guest["ceremony"]
                        )
                        stuff_to_write[COLUMN_MAP[f"{key}_RECEPTION"]] = boolToStr(
                            guest["reception"]
                        )

                    # Remove all the empty values at the beginning
                    offset = 0
                    for i in range(len(stuff_to_write)):
                        if stuff_to_write[i] != "":
                            offset = i
                            break

                    stuff_to_write = stuff_to_write[offset:]

                    # START_ROW + 1 header row + idx data rows.
                    _write_spreadsheet(
                        offset + 1, START_ROW + 1 + idx, stuff_to_write, service=service
                    )

                    # success
                    return

        raise NotFoundException(NOT_FOUND_ERROR)

    except HttpError:
        raise Exception(BACKEND_ERROR)
