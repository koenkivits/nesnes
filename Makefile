all: nesnes

nesnes: lint dist
	node_modules/.bin/rollup -c

lint:
	node_modules/.bin/eslint *.js browser/ system/ --fix

dist:
	mkdir -p dist

.PHONY: test nesnes