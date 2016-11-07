const fs = require('fs');
const uglifyjs = require('uglifyjs');
const uglifycss = require('uglifycss');
const Q = require('q');
const http  = require('http');

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
function autocontentTemplateURLs(directive, callback){
  // TODO Content all
  if(directive.match(/templateUrl\:\s?['|"]([^'"]+)/)){
    var template = directive.match(/templateUrl\:\s?['"]([^'"]+)/)[1];
    readTextFile(template, function(tmp){
      autoContent(tmp).then(function(t){
        var taux = t.replace(/["']/g, '\\$&').replace(/<\!--[^>]*-->/g, "").replace(/(\r?\n|\r)\s*/g, " ");
        var aux = directive.replace('templateUrl', 'template');
        aux = aux.replace(/(template\:\s?['"])([^'"]+)/, "$1"+taux);
        callback(aux);
      });
    });
  } else {
    callback(directive);
  }
}

function getScript(sPath) {
  var promise = Q.defer();
  if(sPath.match(/^http[s]?/)) {

    var options = {
      port: 80,
      host: sPath.match(/^http[s]?:\/\/([^\/]*)/)[1],
      path: sPath.match(/^http[s]?:\/\/[^\/]*(\/.*)$/)[1]
    };
    var req = http.get(options, function(response){
      var result = '';
      response.on('data', function(data){
        result += data;
      }).on("error", function(e){
        console.error("Error retrieving " + sPath + ": ", e.message);
      }).on('end', () => {
        buildScript(result.toString(), (value)=>{
          promise.resolve({"element":sPath, "value": value});
        });
      });
    });
  } else {
    readTextFile(sPath, function(sd){
      buildScript(sd, (value)=>{
        promise.resolve({"element":sPath, "value": value});
      });
    });
  }
  return promise.promise;
}

function buildScript(script, callback){
  if(script.match(/^[^.]+\.(directive|config)/)){
    autocontentTemplateURLs(script, (result)=>{
      callback(result);
    });
  } else {
    callback(script);
  }
}

function getStyle(sPath) {
  // TODO Compress style inline fonts and images
  var promise = Q.defer();
  if(sPath.match(/^http[s]?/)) {
    var options = {
      port: 80,
      host: sPath.match(/^http[s]?:\/\/([^\/]*)/)[1],
      path: sPath.match(/^http[s]?:\/\/[^\/]*(\/.*)$/)[1]
    };
    var req = http.get(options, function(response){
      var result = '';
      response.on('data', function(data){
        result += data;
      }).on("error", function(e){
        console.error("Error retrieving " + sPath + ": ", e.message);
      }).on('end', () => {
        promise.resolve({"element":sPath, "value": result.toString()});
      });
    });
  } else {
    readTextFile(sPath, function(sd){
      promise.resolve({"element":sPath, "value": sd});
    });
  }
  return promise.promise;
}

function getImage(iPath){
  var promise = Q.defer();
  var format = iPath.toLowerCase().match(/\.([a-z]+)$/)[1];
  if(iPath.match(/^http[s]?/)) {
    var options = {
      port: 80,
      host: sPath.match(/^http[s]?:\/\/([^\/]*)/)[1],
      path: sPath.match(/^http[s]?:\/\/[^\/]*(\/.*)$/)[1]
    };
    var req = http.get(options, function(response){
      var result = '';
      response.on('data', function(data){
        result += data;
      }).on("error", function(e){
        console.error("Error retrieving " + sPath + ": ", e.message);
      }).on('end', () => {
        promise.resolve({"element":sPath, "value": buildImage(result, format)});
      });
    });
  } else {
    readBinaryFile(iPath, function(id){
      promise.resolve({"element": iPath, "value": buildImage(id, format)});
    });
    }
  return promise.promise;
}

function buildImage(id, format){
  var image = Base64.encode(id);
  switch (format) {
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
  return image;
}

function autoContent(htmlDocument){

  var promise = Q.defer();

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

  Q.allSettled(scripts).done(function(resultScripts){
    Q.allSettled(styles).done(function(resultStyles){
      Q.allSettled(images).done(function(resultImages){
        var result = htmlDocument;

        resultScripts.forEach((s)=>{
          console.warn("Processing: ", s.value.element);
          var code = s.value.value;
          result = result.replace(new RegExp('<script.*src="' + s.value.element + '".*<\/script>', 'm'), '<script>\n' + code + '\n</script>\n');
        });

        resultStyles.forEach((s)=>{
          var code =  s.value.value;
          console.warn("Processing: ", s.value.element);
          result = result.replace(new RegExp('<link.*href="' + s.value.element + '".*>'), '<style>\n' + s.value.value + '\n</style>\n');
        });

        resultImages.forEach((i)=>{
          console.warn("Processing: ", i.value.element);
          result = result.replace(new RegExp('(<img.*src=")(' + i.value.element + ')(")'), "$1" + i.value.value + "$3");
        });

        promise.resolve(result);

      });
    });
  });
  return promise.promise;
}

// Reading index.html
var filePath = process.argv[2];
readTextFile(filePath, function(file){
  var minified = autoContent(file).then(function(x){
    process.stdout.write(x);
  });
});
