var request = require("request");
var ConnectionData = require("./connection-data");

class Document{
  constructor(doc, connection_data){
    this.doc = doc;
    this.originUri = null;
    if(connection_data){
      this.connectionData = new ConnectionData(connection_data);
    } else {
      this.connectionData = null;
    }

  }

  shallowClone(){
    var doc = new Document(this.doc);

    for(var i in this){
      doc[i] = this[i];
    }

    return doc;
  }

  getRawDocument(){
    return this.doc;
  }

  setRawDocument(doc){
    this.doc = doc;
    return this;
  }

  filter(filterFunc){
    return filterFunc(this.getRawDocument());
  }

  hydrate(connection_data, revOverride){
    var connectionData = new ConnectionData(connection_data);

    return new Promise((res, rej) => {

      var [uri, Authorization] = connectionData.createDocumentUriAndAuthHeader(this.getRawDocument()._id);
      request({uri:`${uri}${revOverride ? "?rev=" + revOverride : ""}`, headers:{Authorization}}, (err, resp, body) => {
        if(err){
          rej(err);
          return;
        }
        var bod = JSON.parse(body);

        if(bod.error && bod.error === "not_found"){
          return rej(new Error(bod.error));
        }

        this.originUri = uri;
        this.doc = bod;
        return res(this);
      });
    });
  }

  upsertTo(connection_data, docId){
    var connectionData = new ConnectionData(connection_data);
    return new Promise((res, rej) => {
      var [uri, Authorization] = connectionData.createDocumentUriAndAuthHeader(docId);
      request({uri, headers:{Authorization}}, (err, resp, body) => {
        if(err){
          return rej(err);
        }

        var doc = JSON.parse(body);
        if(doc.error && doc.error !== "not_found"){
          return rej(new Error(doc.error));
        }
        var currentRev = undefined;
        if(doc._rev){
          currentRev = doc._rev;
        }

        var shallowDoc = {};

        for(var i in this.doc){
          shallowDoc[i] = this.doc[i];
        }

        shallowDoc._id = docId;
        shallowDoc._rev = currentRev;

        var putUri = docId ? connectionData.createDocumentUri(docId) : connectionData.createBaseUri();

        request.put({uri:putUri, headers:{Authorization}, json:shallowDoc}, (err2, resp2, body2) => {
          if(err2){
            return rej(err2);
          }
          res();
        });
      });
    });
  }

  replace(){
    return this.upsertTo(this.connectionData, this.doc._id);
  }
}

module.exports = Document;
