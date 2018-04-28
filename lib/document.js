var request = require("request");

class Document{
  constructor(doc, connectionData){
    this.doc = doc;
    var {USERNAME_FROM, PASSWORD_FROM, COUCHDB_HOST_FROM, COUCHDB_DB_FROM} = (connectionData || {})

    this.originUri = null;
    this.USERNAME_FROM = USERNAME_FROM;
    this.PASSWORD_FROM = PASSWORD_FROM;
    this.COUCHDB_HOST_FROM = COUCHDB_HOST_FROM;
    this.COUCHDB_DB_FROM = COUCHDB_DB_FROM;

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

  hydrate(USERNAME_FROM, PASSWORD_FROM, COUCHDB_HOST_FROM, COUCHDB_DB_FROM, revOverride){
    this.USERNAME_FROM = USERNAME_FROM;
    this.PASSWORD_FROM = PASSWORD_FROM;
    this.COUCHDB_HOST_FROM = COUCHDB_HOST_FROM;
    this.COUCHDB_DB_FROM = COUCHDB_DB_FROM;
    return new Promise((res, rej) => {
      //console.log("Uploading: " + `http://${USERNAME_TO}:${PASSWORD_TO}@${COUCHDB_HOST_TO}/${COUCHDB_DB_TO}/${bowName}/${id}`)
      request({uri:`http://${this.USERNAME_FROM}:${this.PASSWORD_FROM}@${this.COUCHDB_HOST_FROM}/${encodeURIComponent(this.COUCHDB_DB_FROM)}/${encodeURIComponent(this.doc._id)}${revOverride ? "?rev=" + revOverride : ""}`}, (err, resp, body) => {
        if(err){
          rej(err);
          return;
        }
        var bod = JSON.parse(body);

        if(bod.error && bod.error === "not_found"){
          return rej(new Error(bod.error));
        }

        this.originUri = `http://${this.USERNAME_FROM}:${this.PASSWORD_FROM}@${this.COUCHDB_HOST_FROM}/${encodeURIComponent(this.COUCHDB_DB_FROM)}/${encodeURIComponent(this.doc._id)}`;
        this.doc = bod;
        return res(this);
      });
    });
  }

  upsertTo(userName, password, host, dbName, docId){
    return new Promise((res, rej) => {
      request(`http://${userName}:${password}@${host}/${encodeURIComponent(dbName)}/${encodeURIComponent(docId)}`, (err, resp, body) => {
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
        var uri = `http://${userName}:${password}@${host}/${encodeURIComponent(dbName)}`;
        if(docId){
          uri += `/${encodeURIComponent(docId)}`
        }

        request.put({uri:uri, json:shallowDoc}, (err2, resp2, body2) => {
          if(err2){
            return rej(err2);
          }
          res();
        });
      });
    });
  }

  replace(){
    return this.upsertTo(this.USERNAME_FROM, this.PASSWORD_FROM, this.COUCHDB_HOST_FROM, this.COUCHDB_DB_FROM, this.doc._id);
  }
}

module.exports = Document;
