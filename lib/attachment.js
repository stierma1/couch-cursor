var request = require("request");
var stream = require('stream');

class Attachment{
  constructor(parentDocId, attachmentName, attachmentInfo){
    this.id = parentDocId;
    var attachmentInfoClone = {};
    if(!attachmentInfo){
      throw new Error("AttachmentInfo is required")
    }
    for(var i in attachmentInfo){
      this[i] = attachmentInfo[i];
    }
    this.attachmentName = attachmentName;
    this.originUri = null;
    this.data = null;
    this.USERNAME_FROM = null;
    this.PASSWORD_FROM = null;
    this.COUCHDB_HOST_FROM = null;
    this.COUCHDB_DB_FROM = null;
  }

  shallowClone(){
    var attachment = new Attachment(this.id, this.attachmentName, this.attachmentInfo);

    for(var i in this){
      attachment[i] = this[i];
    }

    return attachment;
  }

  hydrate(USERNAME_FROM, PASSWORD_FROM, COUCHDB_HOST_FROM, COUCHDB_DB_FROM){
    this.USERNAME_FROM = USERNAME_FROM;
    this.PASSWORD_FROM = PASSWORD_FROM;
    this.COUCHDB_HOST_FROM = COUCHDB_HOST_FROM;
    this.COUCHDB_DB_FROM = COUCHDB_DB_FROM;
    return new Promise((res, rej) => {
      //console.log("Uploading: " + `http://${USERNAME_TO}:${PASSWORD_TO}@${COUCHDB_HOST_TO}/${COUCHDB_DB_TO}/${bowName}/${id}`)
      request({uri:`http://${this.USERNAME_FROM}:${this.PASSWORD_FROM}@${this.COUCHDB_HOST_FROM}/${encodeURIComponent(this.COUCHDB_DB_FROM)}/${encodeURIComponent(this.id)}/${encodeURIComponent(this.attachmentName)}`, encoding:null}, (err, resp, body) => {
        if(err){
          rej(err);
          return;
        }

        this.originUri = `http://${this.USERNAME_FROM}:${this.PASSWORD_FROM}@${this.COUCHDB_HOST_FROM}/${encodeURIComponent(this.COUCHDB_DB_FROM)}/${encodeURIComponent(this.id)}/${encodeURIComponent(this.attachmentName)}`;
        this.data = body;
        return res(this);
      });
    });
  }

  upsertTo(userName, password, host, dbName, docId, attachmentId){
    return new Promise((res, rej) => {
      request(`http://${userName}:${password}@${host}/${encodeURIComponent(dbName)}/${encodeURIComponent(docId)}`, (err, resp, body) => {
        if(err){
          return rej(err);
        }
        var doc = JSON.parse(body);
        if(doc.error && doc.error !== "not_found"){
          return rej(new Error(doc.error));
        }
        var currentRev = "";
        if(doc._rev){
          currentRev = doc._rev;
        }
        var bufferStream = new stream.PassThrough();
        bufferStream.end(this.data);
        bufferStream.pipe(request.put({uri:`http://${userName}:${password}@${host}/${encodeURIComponent(dbName)}/${encodeURIComponent(docId)}/${encodeURIComponent(attachmentId)}?rev=${currentRev}`,
          headers:{
            "Content-Type":this.content_type,
            "Content-MD5": this.digest.replace("md5-", ""),
            "Content-Length": this.length
          }}, (err2, resp2, body2) => {
          if(err2){
            return rej(err2);
          }
          res();
        }));
      });
    });
  }

  replace(){
    return this.upsertTo(this.USERNAME_FROM, this.PASSWORD_FROM, this.COUCHDB_HOST_FROM, this.COUCHDB_DB_FROM, this.id, this.attachmentName);
  }
}

module.exports = Attachment;
