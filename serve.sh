#!/bin/bash
test -d node_modules || npm install
test -d bower_components || ./node_modules/.bin/bower install
(cd libs/mathquill; make server) & ./node_modules/.bin/polymer serve --open && fg
