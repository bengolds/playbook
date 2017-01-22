#!/usr/bin/zsh
ORIG_PATH=$(/bin/readlink -f ${0%/*})
cd ..
mkdir temp && cd temp
git clone "git@github.com:bengolds/playbook.git" page --single-branch --branch gh-pages

cd page

FILES=(bower_components libs resources src _config.yml index.html Gemfile)
git rm -rf -q .

cd $ORIG_PATH
echo $PWD
cp -r $FILES ../temp/page

cd ../temp/page
git add -A .
git commit -am "Deploy to GitHub Pages"
git push --force --quiet

cd ../../
#rm -rf temp

