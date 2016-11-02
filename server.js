const fs = require('fs');
const ugjs = require('uglifyjs');
const ugcss = require('uglifycss');

var js_pattern = /<script.*src="([^"]*)"/g;
var css_pattern = /<link.*href="([^"]*.css)"/g;
var img_pattern = /<img.*src="([^"]*)"/g;

function getRegSults(text, regexp){
  var results = [];
  var match = null;
  while(match=regexp.exec(text))
    results.push(match[1])
  return results;
}

function readFile(filePath, callback){
  fs.readFile(filePath, 'utf8', (err, data) => {
    callback(data);
  });
}

readFile(process.argv[2], function(data){
  // console.log(data);
  getRegSults(data, js_pattern).forEach((x)=>console.log(x));
  getRegSults(data, css_pattern).forEach((x)=>console.log(x));
  getRegSults(data, img_pattern).forEach((x)=>console.log(x));
});

// const testFolder = './tests/';
// const fs = require('fs');
// fs.readdir(testFolder, (err, files) => {
//   files.forEach(file => {
//     console.log(file);
//   });
// })
