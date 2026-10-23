const assert = require('node:assert/strict');
const { afterEach, beforeEach, describe, it, mock } = require('node:test');

const { reportSlashCommandError } = require('../utils/helpers');

describe('reportSlashCommandError', () => {
  const responseUrl = 'https://hooks.slack.com/commands/T000/1/abc';

  beforeEach(() => {
    mock.method(console, 'error', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('posts the error to response_url once the request was acknowledged', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => ({
      ok: true,
    }));
    const next = mock.fn();

    await reportSlashCommandError(
      new Error('boom'),
      { body: { response_url: responseUrl } },
      { headersSent: true },
      next,
    );

    assert.strictEqual(next.mock.callCount(), 0);
    assert.strictEqual(fetchMock.mock.callCount(), 1);
    const [url, options] = fetchMock.mock.calls[0].arguments;
    assert.strictEqual(url, responseUrl);
    assert.deepStrictEqual(JSON.parse(options.body), {
      response_type: 'ephemeral',
      text: 'Error: boom',
    });
  });

  it('does not reject if posting the error to Slack fails', async () => {
    mock.method(globalThis, 'fetch', async () => {
      throw new Error('network down');
    });
    const next = mock.fn();

    await reportSlashCommandError(
      new Error('boom'),
      { body: { response_url: responseUrl } },
      { headersSent: true },
      next,
    );

    assert.strictEqual(next.mock.callCount(), 0);
  });

  it('defers to the next error handler when no response was sent yet', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => ({
      ok: true,
    }));
    const next = mock.fn();
    const err = new Error('boom');

    await reportSlashCommandError(
      err,
      { body: { response_url: responseUrl } },
      { headersSent: false },
      next,
    );

    assert.strictEqual(fetchMock.mock.callCount(), 0);
    assert.deepStrictEqual(next.mock.calls[0].arguments, [err]);
  });

  it('defers to the next error handler for non-Slack requests', async () => {
    const fetchMock = mock.method(globalThis, 'fetch', async () => ({
      ok: true,
    }));
    const next = mock.fn();
    const err = new Error('boom');

    await reportSlashCommandError(
      err,
      { query: {} },
      { headersSent: true },
      next,
    );

    assert.strictEqual(fetchMock.mock.callCount(), 0);
    assert.deepStrictEqual(next.mock.calls[0].arguments, [err]);
  });
});
