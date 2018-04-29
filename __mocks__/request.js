var fs = require("fs");
var path = require("path");

function request(objOrUri, returnFunc){
  var uri = null;
  var method = "get";

  if(typeof(objOrUri) === "string"){
    uri = objOrUri;
  } else{
    uri = objOrUri.uri;
    method = objOrUri.method || "get";
  }

  var pieces = uri.split("/");
  try{
    //console.log(path.join(__dirname, "../__mockData__/", method +"-" + pieces[pieces.length - 3] + "-" + pieces[pieces.length - 1]))
    var data = fs.readFileSync(path.join(__dirname, "../__mockData__/", method +"-" + pieces[pieces.length - 3] + "-" + pieces[pieces.length - 1]), "utf8");
  } catch(e){
    //console.log(e)
    returnFunc(null, {}, "{\"error\":\"not_found\"}")
  }
  if(returnFunc){
    returnFunc(null, {}, data);
  }
  request._pipeState = data;
}

request.emit = function(ev, data){

}

request.pipe = function(){

}

request.put = function(obj, returnFunc){
  obj.method = "put"
  for(var i in request._cbs){
    request._cbs[i]("put", obj)
  }
  return request(obj, returnFunc);
}

request._cbs = [];

module.exports = request;
