import traceback
import functions_framework
import rsvp

import os.path

@functions_framework.http
def rsvp_http(request):
    """HTTP Cloud Function.
    Args:
        request (flask.Request): The request object.
        <https://flask.palletsprojects.com/en/1.1.x/api/#incoming-request-data>
    Returns:
        The response text, or any set of values that can be turned into a
        Response object using `make_response`
        <https://flask.palletsprojects.com/en/1.1.x/api/#flask.make_response>.
    """

    try:
      # Set CORS headers for the main request
      headers = {
         "Access-Control-Allow-Origin": "https://www.ninaandandrew.com/"
      }

      # Set CORS headers for the preflight request
      if request.method == "OPTIONS":
        # Allows GET requests from any origin with the Content-Type
        # header and caches preflight response for an 3600s
        headers.update({
            "Access-Control-Allow-Methods": "GET, POST",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "3600",
            "Vary": "Origin",
        })

        return ("", 204, headers)

      if request.method == "GET":
        data = rsvp.spreadsheet_to_json(request.args.get('primary_guest'));
        
        return (data, 200, headers)

      if request.method == "POST":
        data = rsvp.spreadsheet_to_json("Andrew")
        return (data, 200, headers)

    except Exception as e:
      print(e)
      traceback.print_exc()
      return ({'error': str(e)}, 500, headers)