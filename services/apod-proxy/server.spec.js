const test = require('node:test');
const assert = require('node:assert/strict');

const { decodeHtmlEntities, normalizeExplanationText } = require('./server');

test('normalizeExplanationText removes inline tag spacing artifacts', () => {
  const html =
    'astronomers can find them by analyzing their gravitational effects on <i>matter</i>, <i>light</i> and spacetime. The final "<a href="/x">death-dance</a>" scene.';

  assert.equal(
    normalizeExplanationText(html),
    'astronomers can find them by analyzing their gravitational effects on matter, light and spacetime. The final "death-dance" scene.'
  );
});

test('decodeHtmlEntities decodes named and numeric entities', () => {
  assert.equal(
    decodeHtmlEntities('A&amp;B &quot;quoted&quot; &#39;text&#39; &#x2014; test'),
    'A&B "quoted" \'text\' — test'
  );
});