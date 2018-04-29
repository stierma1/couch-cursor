class ConnectionData{
  constructor({COUCHDB_PROTOCOL, USERNAME, PASSWORD, COUCHDB_HOST, COUCHDB_NAME}){
    this.COUCHDB_PROTOCOL = COUCHDB_PROTOCOL || "http";
    this.USERNAME = USERNAME;
    this.PASSWORD = PASSWORD;
    this.COUCHDB_HOST = COUCHDB_HOST;
    this.COUCHDB_NAME = COUCHDB_NAME;
  }

  createBaseUri(){
    return `${this.COUCHDB_PROTOCOL}://${this.COUCHDB_HOST}/${encodeURIComponent(this.COUCHDB_NAME)}`;
  }

  createDocumentUri(docId){
    return `${this.createBaseUri()}/${encodeURIComponent(docId)}`
  }

  createAttachmentUri(docId, attachmentName){
    return this.createDocumentUri(docId) + "/" + encodeURIComponent(attachmentName);
  }

  createAuthHeader(){
    return "Basic " + Buffer.from(this.USERNAME + ":" + this.PASSWORD).toString("base64");
  }

  createDocumentUriAndAuthHeader(docId){
    return [this.createDocumentUri(docId), this.createAuthHeader()];
  }

  createAttachmentUriAndAuthHeader(docId, attachmentName){
    return [this.createAttachmentUri(docId, attachmentName), this.createAuthHeader()];
  }
}

module.exports = ConnectionData;
