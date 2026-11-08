import assert from 'node:assert/strict';
import swaggerDocument from '../src/docs/openapi.js';

assert.equal(swaggerDocument.openapi, '3.0.3');
assert.ok(swaggerDocument.paths['/authors']);
assert.ok(swaggerDocument.paths['/authors/{id}']);
assert.ok(swaggerDocument.paths['/books']);
assert.ok(swaggerDocument.paths['/books/{id}']);

for (const [path, pathItem] of Object.entries(swaggerDocument.paths)) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (!['get', 'post', 'put', 'delete'].includes(method)) {
      continue;
    }

    assert.ok(operation.summary, `${method.toUpperCase()} ${path} needs a summary`);
    assert.ok(operation.responses, `${method.toUpperCase()} ${path} needs responses`);
    if (['post', 'put'].includes(method)) {
      assert.ok(operation.requestBody?.required, `${method.toUpperCase()} ${path} needs a required request body`);
    }
  }
}

console.log(`Swagger document is valid: ${Object.keys(swaggerDocument.paths).length} paths checked.`);
