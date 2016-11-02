const fs = require('fs');
const ugjs = require('uglifyjs');
const ugcss = require('uglifycss');

var js_pattern = /<script.*src="([^"]*)"/g;
var css_pattern = /<link.*href="([^"]*.css)"/g;
var img_patter = /<img.*src="([^"]*)"/g;

function getRegSults(text, regexp){
  var results = [];
  var match = null;
  while(match=regexp.exec(text))
    results.push(match[1])
  return results;
}
