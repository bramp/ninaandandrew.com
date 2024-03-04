

# Testing locally

```shell
cd wedding

# Setup local env
python3 -m venv .venv
source .venv/bin/activate

# Install all the things
pip install -r requirements.txt

# Setup auth
gcloud auth application-default login --scopes=https://www.googleapis.com/auth/spreadsheets

# Run the server
functions-framework --target=rsvp_http
```