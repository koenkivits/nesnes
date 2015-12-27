all: nesnes

nesnes: lint dist
	node_modules/.bin/browserify index.js -s NesNes -o dist/nesnes.js

lint:
	node_modules/.bin/jshint .

dist:
	mkdir -p dist

.PHONY: test nesnes