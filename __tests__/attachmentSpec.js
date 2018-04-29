jest.mock("request");
var request = require("request");
var Attachment = require("../lib/attachment");

test("Attachment constructs", () => {
  var attachment = new Attachment("yes", "test", {});
  expect(attachment.id).toBe("yes");
  expect(attachment.attachmentName).toBe("test");
});

test("Attachment hydrates", async () => {
  var attachment = new Attachment("testdoc", "testattachment.json", {});
  await attachment.hydrate({USERNAME:"testUser", PASSWORD:"testPassword", COUCHDB_HOST:"test-attachment", COUCHDB_NAME:"testdoc"})
  expect(attachment.data.toString()).toBe("\"abcdefg\"\n");
});

test("Attachment upsertTo", async () => {
  var attachment = new Attachment("testdoc", "testattachment.json", {
    content_type:"test/test",
    digest:"md5-1234",
    length:10
  });
  request._cbs = [(eve, requestData) => {
    expect(requestData.headers["Content-Length"]).toBe(10);
    expect(requestData.headers["Content-MD5"]).toBe("1234");
    expect(requestData.headers["Content-Type"]).toBe("test/test");
  }];
  await attachment.upsertTo("testUser", "testPassword", "test.domain", "testdb")
  request._cbs = [];
  //expect(attachment).toBe("world");
});
