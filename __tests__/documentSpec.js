jest.mock("request");
var request = require("request");
var Document = require("../lib/document");

test("Document constructs", () => {
  var doc = new Document({_id:"yes"});
  expect(doc.getRawDocument()._id).toBe("yes");
})

test("Document getRawDocument", async () => {
  var doc = new Document({hello:"world"});
  var val = doc.getRawDocument()
  expect(val.hello).toBe("world");
});

test("Document setRawDocument", async () => {
  var doc = new Document({hello:"world"});
  var val = doc.setRawDocument({hello:"goodbye"})
  expect(doc.getRawDocument().hello).toBe("goodbye");
});

test("Document filters", () => {
  var doc = new Document({_id:"yes"});
  var filterFunc = (doc) => {
    return doc._id === "yes"
  }
  expect(doc.filter(filterFunc)).toBe(true);
});

test("Document shallowClone", () => {
  var doc = new Document({_id:"yes"});
  var clone = doc.shallowClone();
  expect(doc === clone).toBe(false);
  expect(doc.getRawDocument()._id === clone.getRawDocument()._id).toBe(true)
});

test("Document hydrate", async () => {
  var doc = new Document({_id:"hydrate.json"});
  await doc.hydrate({USERNAME:"test1", PASSWORD:"test2", COUCHDB_HOST:"test3", COUCHDB_NAME:"test"});

  expect(doc.getRawDocument().hello).toBe("world");
})

test("Document upsertTo", async () => {
  var doc = new Document({hello:"world"});
  request._cbs = [(eve, requestData) => {
    expect(requestData.json._id).toBe("testId");
  }];
  await doc.upsertTo({USERNAME:"testUser", PASSWORD:"testPassword", COUCHDB_HOST:"test.domain", COUCHDB_NAME:"testdb"}, "testId")
  request._cbs = [];
  expect(doc.getRawDocument().hello).toBe("world");
});

test("Document replace", async () => {
  var doc = new Document({_id:"testId", hello:"world"}, {
    USERNAME_FROM:"testUser",
    PASSWORD_FROM:"testPassword",
    COUCHDB_DB_FROM:"test.domain",
    COUCHDB_HOST_FROM:"testId2"
  });
  request._cbs = [(eve, requestData) => {
    expect(requestData.json._id).toBe("testId");
  }];
  await doc.replace()
  request._cbs = [];
  expect(doc.getRawDocument().hello).toBe("world");
})
