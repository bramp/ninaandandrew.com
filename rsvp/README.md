

# Testing locally

```shell
cd wedding

# Setup local env
python3.12 -m venv .venv
source .venv/bin/activate

# Install all the things
pip install -r requirements.txt

# Setup auth (for testing)
gcloud auth application-default login --scopes=https://www.googleapis.com/auth/spreadsheets

# Run the server
functions-framework --target=rsvp_http

# Now visit http://localhost:8080/?primary_guest=John%20Smith
```

# Deploy

```shell
# If needed
gcloud auth login
gcloud config set project ninaandandrew-com

cd rsvp
gcloud functions deploy rsvp-func \
    --gen2 \
    --region=us-central1 \
    --runtime=python312 \
    --source=. \
    --trigger-http \
    --entry-point=rsvp_http \
    --allow-unauthenticated
```
