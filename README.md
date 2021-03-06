# couch-cursor
Library for fetching paginated data from couchdb

## Classes

### Document
Document is used to read and write a single document from couch

#### Constructor(Object? document, Object? connectionData)
document param will be the raw document will be replaced if hydrate is invoked
if hydrate is used then doc must contain the "\_id" field
connectionData param is the connection information used if replace is invoked, gets replaced if hydrate is invoked

#### Object getRawDocument()
returns the internal document

#### async void hydrate(Object connectionData, String? revOverride)
will replace the internal document and update connection information, will pull latest rev by default, revOverride will pull down a specific rev

#### async void upsertTo(Object connectionData, String id)
will upload the internal document to the specified connection and replace the id

#### async void replace()
replaces the current document if connection information is present and bumps the rev

### DocumentCursor
Useful for iterating through a collection of documents, documents are paginated

#### Constructor({int? initialIdx, int? pageSize, int? attachmentPageSize, Object connection_data})
initialIdx is the starting index of the cursor, defaults to 0
pageSize is the size of pages of docs fetched from the remote database, defaults to 1
attachmentPageSize is the size of pages that derived attachment cursors will use, defaults to 1
connectionData is the connection information the cursor will use to pull documents

#### async this init(Object? selector, Object? sort)
readies the cursor, must be invoked before reading pages, can also reset the cursor
selector and sort are optional

#### async Document[] getCurrentPage()
returns the current page of documents, will not bump current index

#### async Document[] nextPage()
returns the current page of documents, will bump the current index

#### async Document[] nextFilteredPage(function filterFunction)
returns documents that pass the filter, will continue to get pages until the total number of docs is >= pageSize or all docs have been filtered, updates the index of the cursor

#### boolean completed
property that represents whether the end of the database has been reached

#### async getAttachmentCursor(Document doc)
returns a new AttachmentCursor for the given document will be hydrated before returning

### Attachment

### AttachmentCursor

### ConnectionData
```js
var connectionData = {USERNAME:username, PASSWORD:password, COUCHDB_HOST:host, COUCHDB_NAME:database, COUCHDB_PROTOCOL:protocol};
```
