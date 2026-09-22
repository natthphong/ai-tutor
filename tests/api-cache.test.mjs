import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(
  fs.readFileSync('src/lib/api.ts', 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const tutorAppSource = fs.readFileSync('src/components/TutorApp.tsx', 'utf8');

const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

function loadApi(fetchImpl, { browser = true, clock } = {}) {
  const context = {
    exports: {},
    FormData,
    DOMException,
    AbortController,
    fetch: fetchImpl,
  };
  if (clock) context.Date = { now: () => clock.value };
  if (browser) context.window = {};
  vm.runInNewContext(source, context);
  return context.exports;
}

test('browser GETs cache eligible account and catalog routes with concurrent deduplication', async () => {
  const calls = [];
  const pending = deferred();
  const api = loadApi(async (url) => {
    calls.push(url);
    if (url === '/api/curriculum') return pending.promise;
    return response({ id: 'learner-1' });
  });

  const first = api.api('/curriculum');
  const second = api.api('/curriculum');
  await Promise.resolve();
  assert.equal(calls.filter((url) => url === '/api/curriculum').length, 1);

  pending.resolve(response([{ id: 'lesson-1' }]));
  assert.deepEqual(await first, [{ id: 'lesson-1' }]);
  assert.deepEqual(await second, [{ id: 'lesson-1' }]);
  assert.deepEqual(await api.api('/curriculum'), [{ id: 'lesson-1' }]);
  assert.equal(calls.filter((url) => url === '/api/curriculum').length, 1);

  await api.api('/auth/me');
  await api.api('/auth/me');
  await api.api('/daily-plan');
  await api.api('/daily-plan');
  await api.api('/library');
  await api.api('/library');
  await api.api('/ebook');
  await api.api('/ebook');
  await api.api('/ebook/units/unit-1');
  await api.api('/ebook/units/unit-1');

  for (const path of [
    '/auth/me',
    '/daily-plan',
    '/library',
    '/ebook',
    '/ebook/units/unit-1',
  ]) {
    assert.equal(calls.filter((url) => url === `/api${path}`).length, 1, path);
  }
});

test('server-side GETs do not share browser cache state', async () => {
  let calls = 0;
  const api = loadApi(async () => {
    calls += 1;
    return response({ calls });
  }, { browser: false });

  assert.deepEqual(await api.api('/auth/me'), { calls: 1 });
  assert.deepEqual(await api.api('/auth/me'), { calls: 2 });
  assert.equal(calls, 2);
});

test('eligible responses expire at their bounded TTL', async () => {
  const clock = { value: 1_000 };
  let calls = 0;
  const api = loadApi(
    async () => {
      calls += 1;
      return response({ calls });
    },
    { clock },
  );

  assert.deepEqual(await api.api('/auth/me'), { calls: 1 });
  clock.value += 9_999;
  assert.deepEqual(await api.api('/auth/me'), { calls: 1 });
  clock.value += 2;
  assert.deepEqual(await api.api('/auth/me'), { calls: 2 });
});

test('jobs, sessions, live, audio, and other dynamic GETs are never cached', async () => {
  const calls = new Map();
  const api = loadApi(async (url) => {
    calls.set(url, (calls.get(url) || 0) + 1);
    return response({ url, call: calls.get(url) });
  });

  for (const path of [
    '/jobs/job-1',
    '/sessions/session-1',
    '/live',
    '/audio/audio-1',
    '/progress',
    '/daily-meets',
  ]) {
    await api.api(path);
    await api.api(path);
    assert.equal(calls.get(`/api${path}`), 2, path);
  }
});

test('no-store GETs bypass both cache reads and writes', async () => {
  let calls = 0;
  const api = loadApi(async () => {
    calls += 1;
    return response({ calls });
  });

  assert.deepEqual(await api.api('/library', { cache: 'no-store' }), { calls: 1 });
  assert.deepEqual(await api.api('/library', { cache: 'no-store' }), { calls: 2 });
  assert.equal(calls, 2);
});

test('ordinary mutations invalidate data caches while keeping auth/me useful', async () => {
  const calls = new Map();
  const api = loadApi(async (url, request) => {
    calls.set(url, (calls.get(url) || 0) + 1);
    if (request.method === 'PATCH') return response({ ok: true });
    return response({ path: url, call: calls.get(url) });
  });

  await api.api('/auth/me');
  await api.api('/auth/me');
  await api.api('/ebook/units/unit-1');
  await api.api('/ebook/units/unit-1');
  await api.api('/ebook/units/unit-1/progress', {
    method: 'PATCH',
    body: '{}',
  });
  await api.api('/ebook/units/unit-1');
  await api.api('/auth/me');

  assert.equal(calls.get('/api/auth/me'), 1);
  assert.equal(calls.get('/api/ebook/units/unit-1'), 2);
});

test('session mutations invalidate cached learner data', async () => {
  const calls = new Map();
  const api = loadApi(async (url, request) => {
    calls.set(url, (calls.get(url) || 0) + 1);
    if (request.method === 'POST') return response({ id: 'session-1' });
    return response({ call: calls.get(url) });
  });

  await api.api('/daily-plan');
  await api.api('/daily-plan');
  await api.api('/sessions', { method: 'POST', body: '{}' });
  await api.api('/daily-plan');

  assert.equal(calls.get('/api/daily-plan'), 2);
});

test('TutorApp routes auth/me through the cache-aware api helper', () => {
  assert.match(tutorAppSource, /api<User>\("\/auth\/me"\)/);
  assert.doesNotMatch(tutorAppSource, /client\.GET\("\/auth\/me"\)/);
});

test('login/logout mutations clear auth cache for account changes', async () => {
  const calls = new Map();
  const api = loadApi(async (url) => {
    calls.set(url, (calls.get(url) || 0) + 1);
    if (url === '/api/auth/login' || url === '/api/auth/logout')
      return response({ ok: true });
    return response({ id: calls.get(url) === 1 ? 'learner-1' : 'learner-2' });
  });

  assert.equal((await api.api('/auth/me')).id, 'learner-1');
  assert.equal((await api.api('/auth/me')).id, 'learner-1');
  await api.api('/auth/login', { method: 'POST', body: '{}' });
  assert.equal((await api.api('/auth/me')).id, 'learner-2');
  await api.api('/auth/logout', { method: 'POST', body: '{}' });

  assert.equal(calls.get('/api/auth/me'), 2);
});

test('a stale in-flight GET cannot repopulate cache after a mutation', async () => {
  const stale = deferred();
  const calls = new Map();
  const api = loadApi(async (url, request) => {
    calls.set(url, (calls.get(url) || 0) + 1);
    if (url === '/api/curriculum' && calls.get(url) === 1) return stale.promise;
    if (request.method === 'PATCH') return response({ ok: true });
    return response({ fresh: true });
  });

  const first = api.api('/curriculum');
  await Promise.resolve();
  await api.api('/ebook/units/unit-1/progress', {
    method: 'PATCH',
    body: '{}',
  });
  stale.resolve(response({ stale: true }));
  assert.deepEqual(await first, { stale: true });

  assert.deepEqual(await api.api('/curriculum'), { fresh: true });
  assert.equal(calls.get('/api/curriculum'), 2);
});

test('mutation settlement clears GET results that started during the mutation', async () => {
  const mutation = deferred();
  const calls = new Map();
  const api = loadApi(async (url, request) => {
    calls.set(url, (calls.get(url) || 0) + 1);
    if (request.method === 'PATCH') return mutation.promise;
    return response({ call: calls.get(url) });
  });

  await api.api('/curriculum');
  const write = api.api('/ebook/units/unit-1/progress', {
    method: 'PATCH',
    body: '{}',
  });
  await Promise.resolve();
  assert.deepEqual(await api.api('/curriculum'), { call: 2 });
  mutation.resolve(response({ ok: true }));
  await write;

  assert.deepEqual(await api.api('/curriculum'), { call: 3 });
  assert.equal(calls.get('/api/curriculum'), 3);
});

test('no-store auth/me responses detect account switches and clear private data', async () => {
  const calls = new Map();
  const api = loadApi(async (url) => {
    calls.set(url, (calls.get(url) || 0) + 1);
    if (url === '/api/auth/me')
      return response({ id: calls.get(url) === 1 ? 'learner-1' : 'learner-2' });
    return response({ call: calls.get(url) });
  });

  await api.api('/auth/me');
  await api.api('/library');
  await api.api('/auth/me', { cache: 'no-store' });
  await api.api('/library');

  assert.equal(calls.get('/api/auth/me'), 2);
  assert.equal(calls.get('/api/library'), 2);
});

test('an aborted eligible GET is not cached', async () => {
  const pending = deferred();
  let calls = 0;
  const api = loadApi(async () => {
    calls += 1;
    return pending.promise;
  });
  const controller = new AbortController();
  const request = api.api('/library', { signal: controller.signal });
  await Promise.resolve();
  controller.abort();
  await assert.rejects(request);
  pending.resolve(response({ stale: true }));

  assert.deepEqual(await api.api('/library'), { stale: true });
  assert.equal(calls, 2);
});

test('a 401 response clears previously cached private data', async () => {
  let libraryCalls = 0;
  const api = loadApi(async (url) => {
    if (url === '/api/library') {
      libraryCalls += 1;
      if (libraryCalls === 2) return response({ error: 'Login required' }, 401);
    }
    return response({ libraryCalls });
  });

  await api.api('/library');
  await api.api('/library');
  assert.equal(libraryCalls, 1);

  await api.api('/ebook/units/unit-1/progress', {
    method: 'PATCH',
    body: '{}',
  });
  await assert.rejects(api.api('/library'), /Login required/);
  await api.api('/library');
  assert.equal(libraryCalls, 3);
});
