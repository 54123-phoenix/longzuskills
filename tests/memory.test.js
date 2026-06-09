'use strict';

const assert = require('assert');
const path = require('path');

// Mock the storage module before requiring memory.js, since memory.js
// does `require('./storage')` at the top level and we don't need storage
// for testing analyzeMessage or dimLabels.
const storagePath = path.resolve(__dirname, '..', 'src', 'services', 'storage.js');
require.cache[storagePath] = {
  id: storagePath,
  filename: storagePath,
  loaded: true,
  exports: {
    get: () => null,
    run: () => {},
    save: () => {},
    all: () => [],
    exec: () => [],
    quote: (s) => s
  }
};

const { analyzeMessage, dimLabels } = require('../src/services/memory');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${e.message}`);
  }
}

function suite(name, fn) {
  console.log(`\n${name}`);
  fn();
}

// ---------------------------------------------------------------------------
// analyzeMessage
// ---------------------------------------------------------------------------
suite('analyzeMessage', () => {

  test('sharing secrets should increase trust', () => {
    const result = analyzeMessage('char1', '我有个秘密想跟你说', '');
    assert.strictEqual(result.trust, 2, 'trust should be 2');
  });

  test('ai reply about trust should increase trust', () => {
    const result = analyzeMessage('char1', '', '我相信你');
    assert.strictEqual(result.trust, 1, 'trust should be 1');
  });

  test('vulnerability keywords increase trust', () => {
    const result = analyzeMessage('char1', '我害怕失去你', '');
    assert.strictEqual(result.trust, 2, 'trust should be 2 for 害怕');
  });

  test('asking advice should increase respect', () => {
    const result = analyzeMessage('char1', '你给我个建议吧', '');
    assert.strictEqual(result.respect, 2, 'respect should be 2');
  });

  test('请教 increases respect', () => {
    const result = analyzeMessage('char1', '我想请教你一个问题', '');
    assert.strictEqual(result.respect, 2, 'respect should be 2');
  });

  test('ai reply with praise increases respect', () => {
    const result = analyzeMessage('char1', '', '你真厉害');
    assert.strictEqual(result.respect, 1, 'respect should be 1');
  });

  test('casual chat should increase closeness', () => {
    const result = analyzeMessage('char1', '今天天气真好', '');
    assert.strictEqual(result.closeness, 1, 'closeness should be 1');
  });

  test('emotional words increase closeness', () => {
    const result = analyzeMessage('char1', '我好开心啊', '');
    assert.strictEqual(result.closeness, 1, 'closeness should be 1 for 开心');
  });

  test('long message increases closeness', () => {
    const longMsg = '这是一条超过二十个字的很长很长很长很长的消息用于测试亲近度';
    const result = analyzeMessage('char1', longMsg, '');
    assert.ok(result.closeness >= 1, 'closeness should be at least 1 for long message');
  });

  test('asking for help should increase dependency', () => {
    const result = analyzeMessage('char1', '帮帮我吧', '');
    assert.strictEqual(result.dependency, 2, 'dependency should be 2');
  });

  test('怎么办 increases dependency', () => {
    const result = analyzeMessage('char1', '我该怎么办', '');
    assert.strictEqual(result.dependency, 2, 'dependency should be 2');
  });

  test('你不在 / 找你 increases dependency', () => {
    const result = analyzeMessage('char1', '你不在的时候找你', '');
    assert.strictEqual(result.dependency, 1, 'dependency should be 1 (regex matches once)');
  });

  test('all dimensions start at 0', () => {
    const result = analyzeMessage('char1', '你好', '');
    assert.strictEqual(result.trust, 0, 'trust should be 0');
    assert.strictEqual(result.respect, 0, 'respect should be 0');
    assert.strictEqual(result.closeness, 0, 'closeness should be 0');
    assert.strictEqual(result.dependency, 0, 'dependency should be 0');
  });

  test('returns object with all four keys even for empty input', () => {
    const result = analyzeMessage('char1', '', '');
    assert.deepStrictEqual(Object.keys(result).sort(), ['closeness', 'dependency', 'respect', 'trust']);
    assert.strictEqual(result.trust, 0);
    assert.strictEqual(result.respect, 0);
    assert.strictEqual(result.closeness, 0);
    assert.strictEqual(result.dependency, 0);
  });

  test('handles empty userMessage and aiReply gracefully', () => {
    const result = analyzeMessage('char1', '', '');
    assert.deepStrictEqual(result, { trust: 0, respect: 0, closeness: 0, dependency: 0 });
  });

  test('multiple dimensions can increase simultaneously', () => {
    const result = analyzeMessage('char1', '我有个秘密，今天怎么办，请给我建议', '我相信你，你真厉害');
    assert.ok(result.trust >= 3, `trust=${result.trust} should be >= 3`);
    assert.ok(result.respect >= 3, `respect=${result.respect} should be >= 3`);
    assert.ok(result.closeness >= 1, `closeness=${result.closeness} should be >= 1`);
    assert.ok(result.dependency >= 2, `dependency=${result.dependency} should be >= 2`);
  });

});

// ---------------------------------------------------------------------------
// dimLabels
// ---------------------------------------------------------------------------
suite('dimLabels', () => {

  test('all zero → ["陌生人"]', () => {
    const labels = dimLabels({ trust: 0, respect: 0, closeness: 0, dependency: 0 });
    assert.deepStrictEqual(labels, ['陌生人']);
  });

  test('trust >= 80 → includes "完全信赖"', () => {
    const labels = dimLabels({ trust: 80, respect: 0, closeness: 0, dependency: 0 });
    assert.ok(labels.includes('完全信赖'), `labels should include 完全信赖, got: ${labels}`);
  });

  test('trust >= 50 → includes "比较信任"', () => {
    const labels = dimLabels({ trust: 50, respect: 0, closeness: 0, dependency: 0 });
    assert.ok(labels.includes('比较信任'), `labels should include 比较信任, got: ${labels}`);
  });

  test('trust >= 20 → includes "开始信任"', () => {
    const labels = dimLabels({ trust: 20, respect: 0, closeness: 0, dependency: 0 });
    assert.ok(labels.includes('开始信任'), `labels should include 开始信任, got: ${labels}`);
  });

  test('trust == 19 → no trust label', () => {
    const labels = dimLabels({ trust: 19, respect: 0, closeness: 0, dependency: 0 });
    assert.strictEqual(labels.length, 1);
    assert.strictEqual(labels[0], '陌生人');
  });

  test('closeness >= 80 → includes "形影不离"', () => {
    const labels = dimLabels({ trust: 0, respect: 0, closeness: 80, dependency: 0 });
    assert.ok(labels.includes('形影不离'), `labels should include 形影不离, got: ${labels}`);
  });

  test('closeness >= 50 → includes "亲近"', () => {
    const labels = dimLabels({ trust: 0, respect: 0, closeness: 50, dependency: 0 });
    assert.ok(labels.includes('亲近'), `labels should include 亲近, got: ${labels}`);
  });

  test('closeness == 49 → no closeness label', () => {
    const labels = dimLabels({ trust: 0, respect: 0, closeness: 49, dependency: 0 });
    assert.strictEqual(labels.length, 1);
    assert.strictEqual(labels[0], '陌生人');
  });

  test('respect >= 80 → includes "敬佩"', () => {
    const labels = dimLabels({ trust: 0, respect: 80, closeness: 0, dependency: 0 });
    assert.ok(labels.includes('敬佩'), `labels should include 敬佩, got: ${labels}`);
  });

  test('respect >= 50 → includes "认可"', () => {
    const labels = dimLabels({ trust: 0, respect: 50, closeness: 0, dependency: 0 });
    assert.ok(labels.includes('认可'), `labels should include 认可, got: ${labels}`);
  });

  test('dependency >= 80 → includes "依赖"', () => {
    const labels = dimLabels({ trust: 0, respect: 0, closeness: 0, dependency: 80 });
    assert.ok(labels.includes('依赖'), `labels should include 依赖, got: ${labels}`);
  });

  test('dependency >= 50 → includes "愿意求助"', () => {
    const labels = dimLabels({ trust: 0, respect: 0, closeness: 0, dependency: 50 });
    assert.ok(labels.includes('愿意求助'), `labels should include 愿意求助, got: ${labels}`);
  });

  test('multiple labels at high thresholds', () => {
    const labels = dimLabels({ trust: 85, respect: 90, closeness: 88, dependency: 95 });
    assert.deepStrictEqual(labels, ['完全信赖', '形影不离', '敬佩', '依赖']);
  });

  test('returns array', () => {
    const labels = dimLabels({ trust: 50, respect: 50, closeness: 50, dependency: 50 });
    assert.ok(Array.isArray(labels));
  });

  test('handles missing keys as 0', () => {
    const labels = dimLabels({});
    assert.deepStrictEqual(labels, ['陌生人']);
  });

  test('trust 80 + closeness 50 → two labels', () => {
    const labels = dimLabels({ trust: 80, respect: 0, closeness: 50, dependency: 0 });
    assert.deepStrictEqual(labels, ['完全信赖', '亲近']);
  });

});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log(`${'='.repeat(40)}`);

if (failed > 0) {
  process.exit(1);
}
