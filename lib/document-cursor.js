//var config = require("two-phase-live-config");

var request = require("request");
var Attachment = require("./attachment");
var Document = require("./document");

class DocumentCursor{
  constructor({initialIdx, pageSize, attachmentPageSize, connectionData}){
    if(!connectionData){
      throw new Error("ConnectionData is required");
    }
    var {USERNAME_FROM, PASSWORD_FROM, COUCHDB_DB_FROM, COUCHDB_HOST_FROM} = connectionData;

    this.USERNAME_FROM = USERNAME_FROM;
    this.PASSWORD_FROM = PASSWORD_FROM;
    this.COUCHDB_DB_FROM = COUCHDB_DB_FROM
    this.COUCHDB_HOST_FROM = COUCHDB_HOST_FROM;
    this._initialIdx = initialIdx || 0;
    this.idx = initialIdx || 0;
    this.totalDocs = NaN;
    this.pageSize = pageSize || 1;
    this.completed = false;
    this.attachmentPageSize = attachmentPageSize || 1;
  }

  async init(){
    this.idx = this._initialIdx || 0;
    this.totalDocs = await this.getTotalNumberOfDocs();
    this.completed = this.totalDocs <= this.idx;
  }

  skip(num){
    this.idx = (num + this.idx) || 0;
  }

  async getCurrentPageOfDocs(){
    var currLimit = this.idx + this.pageSize > this.totalDocs ? this.totalDocs - this.idx : this.pageSize;

    return new Promise((res, rej) => {
      //console.log("Uploading: " + `http://${USERNAME_TO}:${PASSWORD_TO}@${COUCHDB_HOST_TO}/${COUCHDB_DB_TO}/${bowName}/${id}`)
      request(`http://${this.USERNAME_FROM}:${this.PASSWORD_FROM}@${this.COUCHDB_HOST_FROM}/${encodeURIComponent(this.COUCHDB_DB_FROM)}/_all_docs?skip=${this.idx}&limit=${currLimit}&include_docs=true`, (err, resp, body) => {
        if(err){
          rej(err);
          return;
        }

        var queryRes = JSON.parse(body)
        if(queryRes.total_rows > 0){
          this.totalDocs = queryRes.total_rows;
        }
        var PASSWORD_FROM = this.PASSWORD_FROM;
        var USERNAME_FROM = this.USERNAME_FROM;
        var COUCHDB_DB_FROM = this.COUCHDB_DB_FROM;
        var COUCHDB_HOST_FROM = this.COUCHDB_HOST_FROM;

        var docs = queryRes.rows.map((item) => {
          return item.doc;
        }).map((doc) => {
          return new Document(doc, {USERNAME_FROM: USERNAME_FROM, PASSWORD_FROM:PASSWORD_FROM, COUCHDB_DB_FROM:COUCHDB_DB_FROM, COUCHDB_HOST_FROM:COUCHDB_HOST_FROM});
        });
        res(docs);
      })

    });
  }

  async nextPage(){
    if(this.completed){
      return [];
    }

    var docs = await this.getCurrentPageOfDocs();
    this.idx += this.pageSize;
    this.completed = this.idx >= this.totalDocs;
    var PASSWORD_FROM = this.PASSWORD_FROM;
    var USERNAME_FROM = this.USERNAME_FROM;
    var COUCHDB_DB_FROM = this.COUCHDB_DB_FROM;
    var COUCHDB_HOST_FROM = this.COUCHDB_HOST_FROM;

    /*docs = docs.map((doc) => {
      return new Document(doc, {USERNAME_FROM: USERNAME_FROM, PASSWORD_FROM:PASSWORD_FROM, COUCHDB_DB_FROM:COUCHDB_DB_FROM, COUCHDB_HOST_FROM:COUCHDB_HOST_FROM});
    });*/

    return docs;
  }

  async nextFilteredPage(filterFunc){
    if(this.completed){
      return [];
    }
    var docs = [];

    docs = docs.concat((await this.nextPage()).filter(filterFunc));

    while(docs.length < this.pageSize && !this.completed){
      docs = docs.concat(
        (await this.nextPage())
          .filter((doc) => {return doc.filter(filterFunc)}));
    }

    return docs;
  }

  async getTotalNumberOfDocs(){
    return new Promise((res, rej) => {
      request(`http://${this.USERNAME_FROM}:${this.PASSWORD_FROM}@${this.COUCHDB_HOST_FROM}/${encodeURIComponent(this.COUCHDB_DB_FROM)}/_all_docs?limit=0&include_docs=false`, (err, resp, body) => {
        if(err){
          rej(err);
          return;
        }

        var queryRes = JSON.parse(body)
        if(queryRes.error){
          rej(new Error(queryRes.error));
          return;
        }
        return res(queryRes.total_rows);
      })
    });
  }

  getAttachmentCursor(doc){
    if(typeof(doc.getRawDocument) === "function"){
      return new AttachmentCursor({initialIdx:0, doc:doc.getRawDocument(), pageSize:this.attachmentPageSize, connectionData:{USERNAME_FROM:this.USERNAME_FROM, PASSWORD_FROM:this.PASSWORD_FROM, COUCHDB_DB_FROM:this.COUCHDB_DB_FROM, COUCHDB_HOST_FROM:this.COUCHDB_HOST_FROM}})
    }
    return new AttachmentCursor({initialIdx:0, doc, pageSize:this.attachmentPageSize, connectionData:{USERNAME_FROM:this.USERNAME_FROM, PASSWORD_FROM:this.PASSWORD_FROM, COUCHDB_DB_FROM:this.COUCHDB_DB_FROM, COUCHDB_HOST_FROM:this.COUCHDB_HOST_FROM}})
  }

  getAttachmentCursorClass(){
    return AttachmentCursor;
  }
}

class AttachmentCursor{
  constructor({initialIdx, pageSize, doc, connectionData}){
    this.doc = doc;
    var {USERNAME_FROM, PASSWORD_FROM, COUCHDB_DB_FROM, COUCHDB_HOST_FROM} = connectionData;
    //this.USERNAME_FROM = config.getNamedValue("COUCHDB_USERNAME_FROM");
    //this.PASSWORD_FROM = //config.getNamedValue("COUCHDB_PASSWORD_FROM");
    //this.COUCHDB_DB_FROM = //config.getNamedValue("COUCHDB_DB_FROM");
    //this.COUCHDB_HOST_FROM = //config.getNamedValue("COUCHDB_HOST_FROM");
    this.USERNAME_FROM = USERNAME_FROM;
    this.PASSWORD_FROM = PASSWORD_FROM;
    this.COUCHDB_DB_FROM = COUCHDB_DB_FROM
    this.COUCHDB_HOST_FROM = COUCHDB_HOST_FROM;
    //var configAttachmentPageSize = config.getNamedValue("ATTACHMENT_PAGESIZE");
    this._initialIdx = initialIdx || 0;
    this.idx = initialIdx || 0;
    var attachCount = 0;
    for(var i in doc._attachments){
      attachCount++;
    }
    this.totalDocs = attachCount;
    this.pageSize = pageSize || 1;
    this.completed = false;
    this.init();
  }

  init(){
    this.idx = this._initialIdx || 0;
    var attachCount = 0;
    for(var i in this.doc._attachments){
      attachCount++;
    }
    this.totalDocs = attachCount;
    this.completed = this.totalDocs <= this.idx;
  }

  skip(num){
    this.idx = (num + this.idx) || 0;
  }

  async getCurrentPageOfAttachments(){
    if(this.completed){
      return [];
    }
    var currLimit = this.idx + this.pageSize > this.totalDocs ? this.totalDocs - this.idx : this.pageSize;
    var attachmentLookups = [];
    var skip = 0;

    for(var i in this.doc._attachments){
      if(this.idx <= skip){
        attachmentLookups.push([i, this.doc._attachments[i]]);
      }
      if(skip >= this.idx + this.pageSize){
        break;
      }
      skip++;
    }

    var attachmentPage = [];
    for(var i in attachmentLookups){
      let idx = i;
      attachmentPage.push(await this.getSingleAttachment(attachmentLookups[idx][0], attachmentLookups[idx][1]));
    }

    return attachmentPage;
  }

  async nextPage(){
    if(this.completed){
      return [];
    }
    var docs = await this.getCurrentPageOfAttachments();
    this.idx += this.pageSize;
    this.completed = this.idx >= this.totalDocs;
    return docs;
  }

  async getSingleAttachment(attachmentName, attachmentInfo){
    return new Attachment(this.doc._id, attachmentName, attachmentInfo)
      .hydrate(this.USERNAME_FROM, this.PASSWORD_FROM, this.COUCHDB_HOST_FROM, this.COUCHDB_DB_FROM);
  }
}

module.exports = DocumentCursor;
