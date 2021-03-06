//var config = require("two-phase-live-config");

var request = require("request");
var Attachment = require("./attachment");
var Document = require("./document");
var ConnectionData = require("./connection-data")

class DocumentCursor{
  constructor({initialIdx, pageSize, attachmentPageSize, connection_data}){
    if(!connection_data){
      throw new Error("ConnectionData is required");
    }
    this.connectionData = new ConnectionData(connection_data);

    this._initialIdx = initialIdx || 0;
    this.idx = initialIdx || 0;
    this.totalDocs = NaN;
    this.pageSize = pageSize || 1;
    this.completed = false;
    this.attachmentPageSize = attachmentPageSize || 1;
    this.currentSearch = null;
    this.selector = null;
    this.sort = undefined;
  }

  async init(selector, sort){
    this.idx = this._initialIdx || 0;
    this.selector = selector || null;
    this.sort = sort || undefined;
    this.totalDocs = await this.getTotalNumberOfDocs();
    this.completed = this.totalDocs <= this.idx;
  }

  skip(num){
    this.idx = (num + this.idx) || 0;
    return this;
  }

  async getCurrentPageOfDocs(){
    var currLimit = this.idx + this.pageSize > this.totalDocs ? this.totalDocs - this.idx : this.pageSize;
    return new Promise((res, rej) => {
      var baseUri = this.connectionData.createBaseUri()
      var Authorization = this.connectionData.createAuthHeader();

      if(this.selector){
        var search = {
          selector:this.selector,
          skip:this.skip,
          limit:currLimit,
          sort:this.sort
        }

        return request({uri:`${baseUri}/_find`, method:"post", headers:{Authorization}, json:search}, (err, resp, body) => {
          if(err){
            rej(err);
            return;
          }

          var queryRes = JSON.parse(body)
          if(!queryRes.docs || queryRes.docs.length === 0){
            this.completed = true;
          }
          var docs = queryRes.docs.map((doc) => {
            return new Document(doc, this.connectionData);
          });
          res(docs);
        })
      }

      request(`${baseUri}/_all_docs?skip=${this.idx}&limit=${currLimit}&include_docs=true`, (err, resp, body) => {
        if(err){
          rej(err);
          return;
        }

        var queryRes = JSON.parse(body)
        if(queryRes.total_rows > 0){
          this.totalDocs = queryRes.total_rows;
        }

        var docs = queryRes.rows.map((item) => {
          return item.doc;
        }).map((doc) => {
          return new Document(doc, this.connectionData);
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

    return docs;
  }

  async nextFilteredPage(filterFunc){
    if(this.completed){
      return [];
    }
    var docs = [];

      docs = docs.concat((await this.nextPage()).filter((doc) => {return doc.filter(filterFunc)}));

    while(docs.length < this.pageSize && !this.completed){
      docs = docs.concat(
        (await this.nextPage())
          .filter((doc) => {return doc.filter(filterFunc)}));
    }

    return docs;
  }

  async getTotalNumberOfDocs(){
    //console.log(this.connectionData.createBaseUri())
    return new Promise((res, rej) => {
      var baseUri = this.connectionData.createBaseUri();
      request(`${baseUri}/_all_docs?limit=0&include_docs=false`, (err, resp, body) => {
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
      return new AttachmentCursor({initialIdx:0, doc:doc.getRawDocument(), pageSize:this.attachmentPageSize, connection_data:this.connectionData})
    }
    return new AttachmentCursor({initialIdx:0, doc, pageSize:this.attachmentPageSize, connection_data:this.connectionData})
  }

  getAttachmentCursorClass(){
    return AttachmentCursor;
  }
}

class AttachmentCursor{
  constructor({initialIdx, pageSize, doc, connection_data}){
    this.doc = doc;
    this.connectionData = new ConnectionData(connection_data);

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
      .hydrate(this.connectionData);
  }
}

module.exports = DocumentCursor;
