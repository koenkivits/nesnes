all: nesnes

nesnes: lint dist
	node_modules/.bin/browserify index.js -s NesNes -o dist/nesnes.js

lint:
	node_modules/.bin/jshint .

test: test/nesnes.js
	node_modules/.bin/http-server test

test/nesnes.js: nesnes
	ln -sf ../dist/nesnes.js test/nesnes.js

dist:
	mkdir -p dist

.PHONY: test nesnes