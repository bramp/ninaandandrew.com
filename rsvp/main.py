import functions_framework
import logging
import rsvp
from google.cloud.logging.handlers import StructuredLogHandler
from google.cloud.logging_v2.handlers import setup_logging

allow_origin_list = [
    "https://www.ninaandandrew.com",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# Initialize the Google Cloud logging client (and use StructuredLogHandler
# to stdout)
setup_logging(StructuredLogHandler())


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
        headers = {}

        # Set CORS headers for the main request
        allowed_origin = (
            request.environ["HTTP_ORIGIN"]
            if "HTTP_ORIGIN" in request.environ
            and request.environ["HTTP_ORIGIN"] in allow_origin_list
            else allow_origin_list[0]
        )
        headers.update(
            {
                "Access-Control-Allow-Origin": allowed_origin,
                "Content-Type": "application/json",
            }
        )

        # Set CORS headers for the preflight request
        if request.method == "OPTIONS":
            # Allows GET requests from any origin with the Content-Type
            # header and caches preflight response for an 3600s
            headers.update(
                {
                    "Access-Control-Allow-Methods": "GET, POST",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Max-Age": "3600",
                    "Vary": "Origin",
                }
            )

            return ("", 204, headers)

        if request.method == "GET":
            # If they haven't provided the correct info, redirect them to the
            # main page
            if "primary_guest" not in request.args:
                headers.update({"Location": "https://www.NinaAndAndrew.com/"})
                return ({"error": "nothing to see here"}, 200, headers)

            primary_guest = request.args.get("primary_guest")

            data = rsvp.lookup(primary_guest)

            return (data, 200, headers)

        if request.method == "POST":
            data = request.json

            # Capture this, so we can recover from logs if we need to.
            logging.info("Received post", extra={"json_fields": {"post": data}})

            rsvp.update(data)

            return ({"success": "Successfully updated guest row"}, 200, headers)

    except rsvp.NotFoundException as e:
        logging.warning("Primary guest %s not found", request.args.get("primary_guest"))

        return ({"error": str(e)}, 404, headers)

    except Exception as e:
        logging.exception("Exception handling request")

        return ({"error": "An internal error occurred. " + str(e)}, 500, headers)
