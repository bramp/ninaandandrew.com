# Helper to check if a command exists
CHECK_COMMAND = $(if $(shell command -v $(1) 2> /dev/null),,$(error $(1) is not installed. $(2)))

.PHONY: all format analyze test build fix upgrade images-engagement images-compress screenshots html-validate clean check-tools check-venv

all: check-tools check-venv format analyze test build

check-tools:
	@$(call CHECK_COMMAND,npm,Install Node.js from https://nodejs.org/)
	@$(call CHECK_COMMAND,python3,Install Python 3.12+)
	@$(call CHECK_COMMAND,magick,Install ImageMagick: brew install imagemagick)
	@$(call CHECK_COMMAND,cwebp,Install WebP tools: brew install webp)
	@$(call CHECK_COMMAND,jpegtran,Install libjpeg: brew install libjpeg)
	@$(call CHECK_COMMAND,oxipng,Install oxipng: brew install oxipng)
	@$(call CHECK_COMMAND,vnu,Install Nu Markup Checker: brew install vnu)
	@if [ ! -d "node_modules" ]; then echo "node_modules missing. Running npm install..."; npm install; fi

check-venv:
	@if [ ! -d "rsvp/.venv" ]; then \
		echo "RSVP virtual environment missing. Creating it..."; \
		cd rsvp && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt black flake8; \
	fi

format: check-tools check-venv
	npm run format
	-cd rsvp && .venv/bin/black *.py

analyze: check-tools check-venv
	npm run lint
	-cd rsvp && .venv/bin/flake8 --max-line-length 999 *.py

test: check-tools check-venv
	npm test
	cd rsvp && source .venv/bin/activate && python3 rsvp_test.py

build: check-tools
	npm run build

fix: check-tools check-venv
	npm run format
	-npx stylelint --fix "src/www/css/*.css"
	-cd rsvp && .venv/bin/black *.py

upgrade: check-tools check-venv
	npm update
	cd rsvp && source .venv/bin/activate && pip install --upgrade -r requirements.txt

images-engagement: check-tools
	magick 'artwork/engagement/*.jpg' -resize 720x480  src/www/engagement/engagement_%02d.jpg
	magick 'artwork/engagement/*.jpg' -resize 1440x960  src/www/engagement/engagement_%02d_2x.jpg
	magick 'artwork/engagement/*.jpg' -resize 720x480  src/www/engagement/engagement_%02d.webp
	magick 'artwork/engagement/*.jpg' -resize 1440x960  src/www/engagement/engagement_%02d_2x.webp

images-compress: check-tools
	find src/www -type f -name "*.webp" -exec cwebp {} -o {} \;
	find src/www -type f -name "*.jpg" -exec jpegtran -verbose -outfile {} {} \;
	find src/www -type f -name "*.png" -exec oxipng -o max --strip safe {} \;

screenshots: check-tools build
	npx http-server -p 8000 -c-1 www & \
	SERVER_PID=$$!; \
	sleep 2; \
	node ./create-invite-jpg.cjs; \
	kill $$SERVER_PID

html-validate: check-tools build
	vnu www/*.html

clean:
	npm run clean || rm -rf www
