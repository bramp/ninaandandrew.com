# ninaandandrew.com

Wedding website for Nina and Andrew.

by Andrew Brampton ([bramp.net](https://bramp.net)) (c) 2024-2026

[![Deploy static content to Pages](https://github.com/bramp/ninaandandrew.com/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/bramp/ninaandandrew.com/actions/workflows/deploy-pages.yml)
[![Deploy Cloud Function](https://github.com/bramp/ninaandandrew.com/actions/workflows/deploy-gcp.yml/badge.svg)](https://github.com/bramp/ninaandandrew.com/actions/workflows/deploy-gcp.yml)
[![Test](https://github.com/bramp/ninaandandrew.com/actions/workflows/test.yml/badge.svg)](https://github.com/bramp/ninaandandrew.com/actions/workflows/test.yml)

---

# Layout

- Sections:
  - Countdown
  - Our Love Story / How we met
    - Introducing Andrew
    - Introducing Nina
  - Schedule of Events
    - Location (Map)
    - Attire (Festive Indian Wear or Cocktail)
    - Add to calendar
  - FAQs
    - What's happening on Saturday
    - What to wear
  - Travel and Accommodations
  - Our Registry
    - Target, Amazon, Nordstorm

Examples
https://hindumandala.rsvpify.com/?securityToken=IAPjUVTyfKcDLDTef3IFjapK0tIVscWF

# Development

## Dependencies

```shell
npm install --global gulp-cli
npm install http-server -g
brew install webp
brew install vnu # Nu Markup Checker: command-line and server HTML validator
brew install oxipng
```

## Run a local web server

```shell
make build # Build once
gulp watch  # Or watch for changes
```

## Build everything

```shell
make all
```

### Create engagement photo album

# TODO Move below into gulp

```shell
magick 'artwork/engagement/*.jpg' -resize 720x480  src/www/engagement/engagement_%02d.jpg
magick 'artwork/engagement/*.jpg' -resize 1440x960  src/www/engagement/engagement_%02d_2x.jpg

magick 'artwork/engagement/*.jpg' -resize 720x480  src/www/engagement/engagement_%02d.webp
magick 'artwork/engagement/*.jpg' -resize 1440x960  src/www/engagement/engagement_%02d_2x.webp
```

# Linting & Formatting

```shell
make format
make analyze
```

# Testing

```shell
make test
```
