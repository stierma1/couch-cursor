jest.mock("request");
var request = require("request");
var DocumentCursor = require("../lib/document-cursor");

test("DocumentCursor constructs", () => {

  var documentCursor = new DocumentCursor({pageSize:2, connectionData:{
    USERNAME_FROM:"testUser",
    PASSWORD_FROM:"testPassword",
    COUCHDB_DB_FROM:"test.domain",
    COUCHDB_HOST_FROM:"testId"
  }});

  expect(documentCursor.pageSize).toBe(2);
});

test("DocumentCursor inits", async () => {

  var documentCursor = new DocumentCursor({pageSize:2, connectionData:{
    USERNAME_FROM:"testUser",
    PASSWORD_FROM:"testPassword",
    COUCHDB_DB_FROM:"test.domain",
    COUCHDB_HOST_FROM:"testId"
  }});

  await documentCursor.init()

  expect(documentCursor.totalDocs).toBe(3);
});

test("DocumentCursor getCurrentPageOfDocs", async () => {

  var documentCursor = new DocumentCursor({pageSize:2, connectionData:{
    USERNAME_FROM:"testUser",
    PASSWORD_FROM:"testPassword",
    COUCHDB_DB_FROM:"test.domain",
    COUCHDB_HOST_FROM:"testId"
  }});

  await documentCursor.init()
  var docs = await documentCursor.getCurrentPageOfDocs();
  expect(docs.length).toBe(2);
  expect(docs[0].getRawDocument()._id).toBe("yes");
  expect(docs[1].getRawDocument()._id).toBe("no");
});

test("DocumentCursor nextPage", async () => {

  var documentCursor = new DocumentCursor({pageSize:2, connectionData:{
    USERNAME_FROM:"testUser",
    PASSWORD_FROM:"testPassword",
    COUCHDB_DB_FROM:"test.domain",
    COUCHDB_HOST_FROM:"testId"
  }});

  await documentCursor.init()
  var docs = await documentCursor.nextPage();
  expect(docs.length).toBe(2);
  expect(docs[0].getRawDocument()._id).toBe("yes");
  expect(docs[1].getRawDocument()._id).toBe("no");
  expect(documentCursor.idx).toBe(2);
  docs = await documentCursor.nextPage();
  expect(docs.length).toBe(1);
  expect(docs[0].getRawDocument()._id).toBe("maybe");
  expect(documentCursor.idx).toBe(4);
  expect(documentCursor.completed).toBe(true);
});

test("DocumentCursor nextFilteredPage", async () => {

  var documentCursor = new DocumentCursor({pageSize:2, connectionData:{
    USERNAME_FROM:"testUser",
    PASSWORD_FROM:"testPassword",
    COUCHDB_DB_FROM:"test.domain",
    COUCHDB_HOST_FROM:"testId"
  }});

  await documentCursor.init()
  var docs = await documentCursor.nextFilteredPage((doc) => {
    return doc._id === "maybe"
  });
  expect(docs.length).toBe(1);
  expect(docs[0].getRawDocument()._id).toBe("maybe");
  expect(documentCursor.idx).toBe(4);
  expect(documentCursor.completed).toBe(true);
});

test("DocumentCursor getAttachmentCursor", async () => {

  var documentCursor = new DocumentCursor({pageSize:2, connectionData:{
    USERNAME_FROM:"testUser",
    PASSWORD_FROM:"testPassword",
    COUCHDB_DB_FROM:"test.domain-attachment",
    COUCHDB_HOST_FROM:"testId"
  }});

  await documentCursor.init()
  var docs = await documentCursor.nextPage();

  var attachmentCursor = await documentCursor.getAttachmentCursor(docs[0]);
  expect(attachmentCursor.totalDocs).toBe(1);
  attachmentCursor = await documentCursor.getAttachmentCursor(docs[1]);
  expect(attachmentCursor.totalDocs).toBe(0);
});
