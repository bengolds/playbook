#!/bin/bash
(cd libs/mathquill; make server) &
polymer serve --open &
