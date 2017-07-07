#!/bin/bash

dir=~/desktop/extension

cp -r src $dir

cd $dir

zip -r $dir.zip .

# google-chrome --pack-extension=$dir
