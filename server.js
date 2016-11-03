const fs = require('fs');
const ugjs = require('uglifyjs');
const ugcss = require('uglifycss');
const Q = require('q');

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

function getScript(sPath) {
  var promise = Q.defer();
  readFile(sPath, function(sd){
    if(sd.match(/^[^.]+\.directive/)){
      cleanDirective(sd, function(result){
        // promise.resolve({'path': sPath, 'value': sd});
        promise.resolve(sd);
      });
    } else {
      // promise.resolve({'path': sPath, 'value': sd});
      promise.resolve(sd);
    }
  });
  return promise.promise;
}

function getStyle(sPath) {
  var promise = Q.defer();
  readFile(sPath, function(sd){
    promise.resolve(sd);
  });
  return promise.promise;
}

readFile(process.argv[2], function(data){

  var scriptPaths = getRegSults(data, js_pattern);
  var stylePaths = getRegSults(data, css_pattern);
  var imagePaths = getRegSults(data, img_pattern);

  var scripts = scriptPaths.map(function(s){
    return getScript(s);
  });

  var styles = stylePaths.map(function(s){
    return getStyle(s);
  })

  Q.allSettled(scripts).then(function(resultScripts){
    resultScripts.forEach((r )=>console.log(r.value));
    Q.allSettled(styles).then(function(resultStyles){
      resultStyles.forEach((r )=>console.log(r.value));
    });
  });
});


// const testFolder = './tests/';
// const fs = require('fs');
// fs.readdir(testFolder, (err, files) => {
//   files.forEach(file => {
//     console.log(file);
//   });
// })
