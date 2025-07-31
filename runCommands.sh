#!/bin/bash

if [ "$1" = "true" ]; then
  node commandRunner.js
  echo "Not using .env file"
else
  node --env-file=.env commandRunner.js
  echo "Using .env file"
fi
