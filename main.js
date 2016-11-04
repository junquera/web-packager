const fs = require('fs');
const ugjs = require('uglifyjs');
const ugcss = require('uglifycss');
const Q = require('q');

var js_pattern = /<script.*src="([^"]*)"/g;
var css_pattern = /<link.*href="([^"]*.css)"/g;
var img_pattern = /<img.*src="([^"]*)"/g;

var Base64 = {
  encode: function(text){
    return new Buffer(text).toString("base64");
  },
  decode: function(text){
    return new Buffer(text, "base64").toString("utf-8");
  }
};
function getRegSults(text, regexp){
  var results = [];
  var match = null;
  while(match=regexp.exec(text))
    results.push(match[1])
  return results;
}

function readTextFile(filePath, callback){
  fs.readFile(filePath, 'utf8', (err, data) => {
    callback(data);
  });
}

function readBinaryFile(filePath, callback){
  fs.readFile(filePath, (err, data) => {
    callback(data);
  });
}

// Auto content AngularJS directives
function cleanDirective(directive, callback){
  // TODO Replace IMAGES and SCRIPTS
  if(directive.match(/templateUrl\:\s?['|"]([^'"]+)/)){
    var template = directive.match(/templateUrl\:\s?['"]([^'"]+)/)[1];
    readTextFile(template, function(t){
      var taux = t.replace(/["']/g, '\\$&').replace(/<\!--[^>]*-->/g, "").replace(/(\r?\n|\r)\s*/g, " ");
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
  readTextFile(sPath, function(sd){
    if(sd.match(/^[^.]+\.directive/)){
      cleanDirective(sd, function(result){
        // promise.resolve({'path': sPath, 'value': sd});
        promise.resolve({"element":sPath, "value": result});
      });
    } else {
      // promise.resolve({'path': sPath, 'value': sd});
      promise.resolve({"element":sPath, "value": sd});
    }
  });
  return promise.promise;
}

function getStyle(sPath) {
  var promise = Q.defer();
  readTextFile(sPath, function(sd){
    promise.resolve({"element":sPath, "value": sd});
  });
  return promise.promise;
}

function getImage(iPath){
  var promise = Q.defer();
  readBinaryFile(iPath, function(id){
    var image = Base64.encode(id);
    switch (iPath.toLowerCase().match(/\.([a-z]+)$/)[1]) {
      case 'png':
        image = "data:image/png;base64," + image;
        break;
      case 'jpg':
      case 'jpeg':
        image = "data:image/jpg;base64," + image;
        break;
      case 'svg':
        image = "data:image/svg+xml;base64," + image;
        break;
    }
    promise.resolve({"element": iPath, "value": image});
  });
  return promise.promise;
}

function autoContent(htmlDocument){

  var scriptPaths = getRegSults(htmlDocument, js_pattern);
  var stylePaths = getRegSults(htmlDocument, css_pattern);
  var imagePaths = getRegSults(htmlDocument, img_pattern);

  var scripts = scriptPaths.map(function(s){
    return getScript(s);
  });

  var styles = stylePaths.map(function(s){
    return getStyle(s);
  });

  var images = imagePaths.map(function(i){
    return getImage(i);
  });

  Q.allSettled(scripts).then(function(resultScripts){
    Q.allSettled(styles).then(function(resultStyles){
      Q.allSettled(images).then(function(resultImages){
        // resultScripts.forEach((r)=>console.log(r.value));
        // resultStyles.forEach((r)=>console.log(r.value));
        // resultImages.forEach((r)=>console.log(r.value));
        var result = htmlDocument;
        result = result.replace(/<!--.*-->\n*\s*/g, "").replace(/<script.*src.*<\/script>\n*\s*/g, '').replace(/<link.*>\n*\s*/g, '').replace(/(<\/head>)/, '<style>{style}</style>\n<script>{script}</script>\n$1');

        var aux = "";

        resultStyles.forEach((s)=>aux+=s.value.value);
        result = result.replace("{style}", aux + "\n");

        aux = "";
        resultScripts.forEach((s)=>aux+=s.value.value);
        result = result.replace("{script}", aux + "\n");


        console.log(result);
      });
    });
  });
}

// Reading index.html
readTextFile(process.argv[2], autoContent);


// const testFolder = './tests/';
// const fs = require('fs');
// fs.readdir(testFolder, (err, files) => {
//   files.forEach(file => {
//     console.log(file);
//   });
// })
