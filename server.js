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

function cleanDirective(directive, callback){
  if(directive.match(/templateUrl\:\s?['|"]([^'"]+)/)){
    var template = directive.match(/templateUrl\:\s?['"]([^'"]+)/)[1];
    readFile(template, function(t){
      var taux = t.replace(/"/g, '\\"').replace(/'/g, "\\'").replace(/<!--.*-->/, "").replace(/(\r?\n|\r)\s*/g, " ");
      var aux = directive.replace('templateUrl', 'template');
      aux = aux.replace(/(template\:\s?['"])([^'"]+)/, "$1"+taux);
      callback(aux);
    });
  } else {
    callback(directive);
  }
}

readFile(process.argv[2], function(data){

  var scriptPaths = getRegSults(data, js_pattern);
  var stylePaths = getRegSults(data, css_pattern);
  var imagePaths = getRegSults(data, img_pattern);

  var scripts = {};

  scriptPaths.forEach(function(s){
    readFile(s, function(sd){
      if(sd.match(/^[^.]+\.directive/)){
        cleanDirective(sd, function(result){
          scripts[s] = result;
        });
      } else {
        scripts[s] = sd;
      }
    });
  });

  stylePaths.forEach(function(s) {

  });

});


// const testFolder = './tests/';
// const fs = require('fs');
// fs.readdir(testFolder, (err, files) => {
//   files.forEach(file => {
//     console.log(file);
//   });
// })
