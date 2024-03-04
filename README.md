

# Layout 

* Sections:
  * Countdown
  * Our Love Story / How we met
    * Introducing Andrew
    * Introducing Nina
  * Schedule of Events
    * Location (Map)
    * Attire (Festive Indian Wear or Cocktail)
    * Add to calendar
  * FAQs
    * What's happening on Saturday
    * What to wear
  * Travel and Accommodations
  * Our Registry
    * Target, Amazon, Nordstorm

Examples
  https://hindumandala.rsvpify.com/?securityToken=IAPjUVTyfKcDLDTef3IFjapK0tIVscWF



# Development

Some deps

```shell
npm install --global gulp-cli
npm install http-server -g
brew install webp

alias google-chrome="/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome"
```

Run a local web server

```shell
http-server -p 8000 -c-1 www
```

Build the invites

```shell
# Build the HTML
gulp

# Create the screenshots
http-server -p 8000 -c-1 www &
node create-invite-jpg.js

```



## Compress files

cwebp input.webp -o output.webp