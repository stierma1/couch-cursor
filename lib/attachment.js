var request = require("request");
var stream = require('stream');
var ConnectionData = require("./connection-data");

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
    this.connectionData = null;
  }

  shallowClone(){
    var attachment = new Attachment(this.id, this.attachmentName, this.attachmentInfo);

    for(var i in this){
      attachment[i] = this[i];
    }

    return attachment;
  }

  hydrate(connection_data){
    var connectionData = new ConnectionData(connection_data);
    this.connectionData = connectionData;

    return new Promise((res, rej) => {
      var [uri, Authorization]  = connectionData.createAttachmentUriAndAuthHeader(this.id, this.attachmentName);
      //console.log("Uploading: " + `http://${USERNAME_TO}:${PASSWORD_TO}@${COUCHDB_HOST_TO}/${COUCHDB_DB_TO}/${bowName}/${id}`)
      request({uri, headers:{ Authorization }, encoding:null}, (err, resp, body) => {
        //console.log(err, body)
        if(err){
          rej(err);
          return;
        }

        this.originUri = uri
        this.data = body;
        return res(this);
      });
    });
  }

  upsertTo(docId, attachmentId, connection_data){
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
        var currentRev = "";
        if(doc._rev){
          currentRev = doc._rev;
        }
        var bufferStream = new stream.PassThrough();
        bufferStream.end(this.data);
        bufferStream.pipe(request.put({uri:`${connectionData.createAttachmentUri(docId, attachmentId)}?rev=${currentRev}`,
          headers:{
            Authorization,
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
    return this.upsertTo(this.id, this.attachmentName, this.connectionData);
  }
}

module.exports = Attachment;
