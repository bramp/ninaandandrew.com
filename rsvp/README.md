

# Testing locally

```shell
cd rsvp

# Setup local env
python3.12 -m venv .venv
source .venv/bin/activate

# Install all the things
pip install -r requirements.txt

# Run the unit tests
python rsvp_test.py

# Setup auth (for testing)
gcloud auth application-default login --scopes=https://www.googleapis.com/auth/spreadsheets

# Run the server (with given spreadsheet id)
SPREADSHEET_ID=1e7fIMg8PamT-jH8UH_v2kUKqzwz79UGIkXdP24wILm0 functions-framework --target=rsvp_http

# Now visit http://localhost:8080/?primary_guest=John%20Smith
```

# Deploy

```shell
# If needed
gcloud auth login
gcloud config set project ninaandandrew-com

cd rsvp

# Test
gcloud functions deploy rsvp-func-test \
    --gen2 \
    --region=us-central1 \
    --runtime=python312 \
    --source=. \
    --trigger-http \
    --entry-point=rsvp_http \
    --allow-unauthenticated \
    --set-env-vars SPREADSHEET_ID=1e7fIMg8PamT-jH8UH_v2kUKqzwz79UGIkXdP24wILm0

# Prod
gcloud functions deploy rsvp-func \
    --gen2 \
    --region=us-central1 \
    --runtime=python312 \
    --source=. \
    --trigger-http \
    --entry-point=rsvp_http \
    --allow-unauthenticated \
    --set-env-vars SPREADSHEET_ID=1FuYiyuTqO6AS461sbtw_dre7TWPIkflfPqKAxsQNuuc
```
