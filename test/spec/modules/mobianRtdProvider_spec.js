import { expect } from 'chai';
import sinon from 'sinon';
import 'src/ajax.js';
import * as gptUtils from 'libraries/gptUtils/gptUtils.js';
import {
  CONTEXT_KEYS,
  AP_VALUES,
  CATEGORIES,
  EMOTIONS,
  GENRES,
  MAX_CACHE_SIZE,
  MOBIAN_IVT_MODE,
  MOBIAN_IVT_URL,
  MOBIAN_URL,
  RISK,
  SENTIMENT,
  TQ,
  TG,
  THEMES,
  TONES,
  extendBidRequestConfig,
  fetchContextData,
  fetchIvtData,
  getConfig,
  getContextData,
  getDataForTargeting,
  makeMemoizedFetch,
  makeContextDataToKeyValuesReducer,
  makeDataFromResponse,
  makeIvtDataFromResponse,
  mobianBrandSafetySubmodule,
  setTargeting, dep,
} from 'modules/mobianRtdProvider.js';

describe('Mobian RTD Submodule', function () {
  let ajaxStub;
  let bidReqConfig;
  let setKeyValueSpy;

  const mockResponse = JSON.stringify({
    meta: {
      url: 'https://example.com',
      has_results: true
    },
    results: {
      ap: { a0: [], a1: [2313, 12], p0: [1231231, 212], p1: [231, 419] },
      mobianContentCategories: [],
      mobianEmotions: ['affection'],
      mobianGenres: [],
      mobianRisk: 'low',
      mobianSentiment: 'positive',
      mobian_tq: 1,
      mobian_tg: 3,
      mobianThemes: [],
      mobianTones: [],
    }
  });

  const mockIvtResponse = JSON.stringify({
    results: {
      mobian_tq: 1,
    }
  });

  const mockAssessmentData = {
    [AP_VALUES]: { a0: [], a1: [2313, 12], p0: [1231231, 212], p1: [231, 419] },
    [CATEGORIES]: [],
    [EMOTIONS]: ['affection'],
    [GENRES]: [],
    [RISK]: 'low',
    [SENTIMENT]: 'positive',
    [TG]: 3,
    [THEMES]: [],
    [TONES]: [],
  };

  const mockContextData = {
    ...mockAssessmentData,
    [TQ]: 1,
  };

  const mockKeyValues = {
    'mobian_ap_a1': ['2313', '12'],
    'mobian_ap_p0': ['1231231', '212'],
    'mobian_ap_p1': ['231', '419'],
    'mobian_emotions': ['affection'],
    'mobian_risk': 'low',
    'mobian_sentiment': 'positive',
    'mobian_tq': 1,
    'mobian_tg': 3,
  };

  const mockConfig = {
    prefix: 'mobian',
    publisherTargeting: [AP_VALUES, EMOTIONS, RISK, SENTIMENT, TQ, TG, THEMES, TONES, GENRES],
    advertiserTargeting: [AP_VALUES, EMOTIONS, RISK, SENTIMENT, TQ, TG, THEMES, TONES, GENRES],
  };

  beforeEach(function () {
    bidReqConfig = {
      ortb2Fragments: {
        global: {
          site: {
            ext: {
              data: {}
            }
          }
        }
      }
    };

    setKeyValueSpy = sinon.spy(gptUtils, 'setKeyValue');
  });

  afterEach(function () {
    ajaxStub?.restore();
    ajaxStub = null;
    setKeyValueSpy.restore();
  });

  describe('fetchContextData', function () {
    it('should return fetched context data', async function () {
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function(url, callbacks) {
        expect(url).to.equal(
          `${MOBIAN_URL}?url=${encodeURIComponent(window.location.href)}&ivt_mode=${MOBIAN_IVT_MODE}`
        );
        callbacks.success(mockResponse);
      });

      const contextData = await fetchContextData();
      expect(contextData).to.deep.equal(mockResponse);
    });

    it('should fetch traffic quality from the standalone IVT endpoint', async function () {
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function(url, callbacks) {
        expect(url).to.equal(`${MOBIAN_IVT_URL}?url=${encodeURIComponent(window.location.href)}`);
        expect(url).not.to.include('ivt_mode');
        callbacks.success(mockIvtResponse);
      });

      const ivtData = await fetchIvtData();
      expect(ivtData).to.equal(mockIvtResponse);
    });
  });

  describe('makeDataFromResponse', function () {
    it('should format context data response', async function () {
      const data = makeDataFromResponse(mockResponse);
      expect(data).to.deep.equal(mockAssessmentData);
      expect(data).not.to.have.property(TQ);
    });

    it('should format only traffic quality from an IVT response', function () {
      expect(makeIvtDataFromResponse(mockIvtResponse)).to.deep.equal({ [TQ]: 1 });
      expect(makeIvtDataFromResponse({ results: {} })).to.deep.equal({});
      expect(makeIvtDataFromResponse({})).to.deep.equal({});
    });
  });

  describe('getContextData', function () {
    it('should return formatted context data', async function () {
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function(url, callbacks) {
        callbacks.success(mockResponse);
      });

      const data = await getContextData();
      expect(data).to.deep.equal(mockAssessmentData);
    });
  });

  describe('getDataForTargeting', function () {
    it('should fetch only contextual data when traffic quality is not requested', async function () {
      const contextGetter = sinon.stub().resolves(mockAssessmentData);
      const ivtGetter = sinon.stub().resolves({ [TQ]: 1 });

      const data = await getDataForTargeting([RISK, TG], contextGetter, ivtGetter);

      expect(data).to.deep.equal(mockAssessmentData);
      expect(contextGetter.calledOnce).to.equal(true);
      expect(ivtGetter.notCalled).to.equal(true);
    });

    it('should fetch only IVT data when traffic quality is the only requested key', async function () {
      const contextGetter = sinon.stub().resolves(mockAssessmentData);
      const ivtGetter = sinon.stub().resolves({ [TQ]: 1 });

      const data = await getDataForTargeting([TQ], contextGetter, ivtGetter);

      expect(data).to.deep.equal({ [TQ]: 1 });
      expect(contextGetter.notCalled).to.equal(true);
      expect(ivtGetter.calledOnce).to.equal(true);
    });

    it('should merge contextual and IVT data when both are requested', async function () {
      const contextGetter = sinon.stub().resolves(mockAssessmentData);
      const ivtGetter = sinon.stub().resolves({ [TQ]: 1 });

      const data = await getDataForTargeting([RISK, TQ], contextGetter, ivtGetter);

      expect(data).to.deep.equal(mockContextData);
      expect(contextGetter.calledOnce).to.equal(true);
      expect(ivtGetter.calledOnce).to.equal(true);
    });

    it('should preserve successful endpoint data when the other endpoint fails', async function () {
      const contextGetter = sinon.stub().resolves(mockAssessmentData);
      const ivtGetter = sinon.stub().rejects(new Error('IVT unavailable'));

      const data = await getDataForTargeting([RISK, TQ], contextGetter, ivtGetter);

      expect(data).to.deep.equal(mockAssessmentData);

      contextGetter.rejects(new Error('context unavailable'));
      ivtGetter.resolves({ [TQ]: 1 });

      const ivtOnlyData = await getDataForTargeting([RISK, TQ], contextGetter, ivtGetter);

      expect(ivtOnlyData).to.deep.equal({ [TQ]: 1 });
    });

    it('should preserve successful endpoint data when the other getter throws', async function () {
      const contextGetter = sinon.stub().throws(new Error('context setup failed'));
      const ivtGetter = sinon.stub().resolves({ [TQ]: 1 });

      const ivtData = await getDataForTargeting([RISK, TQ], contextGetter, ivtGetter);

      expect(ivtData).to.deep.equal({ [TQ]: 1 });
      expect(ivtGetter.calledOnce).to.equal(true);

      contextGetter.returns(mockAssessmentData);
      ivtGetter.throws(new Error('IVT setup failed'));

      const contextData = await getDataForTargeting([RISK, TQ], contextGetter, ivtGetter);

      expect(contextData).to.deep.equal(mockAssessmentData);
    });
  });

  describe('submodule lifecycle', function () {
    it('should prefetch publisher and advertiser endpoints during init and reuse them for bids', async function () {
      const requestUrls = [];
      let resolveIvt;
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function(url, callbacks) {
        requestUrls.push(url);
        if (url.startsWith(MOBIAN_IVT_URL)) {
          resolveIvt = () => callbacks.success(mockIvtResponse);
        } else {
          callbacks.success(mockResponse);
        }
      });
      const rawConfig = {
        name: 'mobianBrandSafety',
        params: {
          publisherTargeting: [RISK],
          advertiserTargeting: [TQ],
        }
      };
      const originalHref = window.location.href;

      try {
        history.pushState({}, '', '/mobian-lifecycle-split');

        expect(mobianBrandSafetySubmodule.init(rawConfig)).to.equal(true);
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(requestUrls).to.have.length(2);
        expect(requestUrls.some((url) => url.startsWith(MOBIAN_URL))).to.equal(true);
        expect(requestUrls.some((url) => url.startsWith(MOBIAN_IVT_URL))).to.equal(true);
        expect(setKeyValueSpy.calledWith('mobian_risk', 'low')).to.equal(true);
        expect(setKeyValueSpy.calledWith('mobian_tq')).to.equal(false);

        let callbackCount = 0;
        const bidCompleted = new Promise((resolve) => {
          mobianBrandSafetySubmodule.getBidRequestData(bidReqConfig, () => {
            callbackCount++;
            resolve();
          }, rawConfig);
        });

        expect(callbackCount).to.equal(0);
        expect(requestUrls).to.have.length(2, 'bid enrichment should share the in-flight IVT request');

        resolveIvt();
        await bidCompleted;

        expect(callbackCount).to.equal(1);
        expect(requestUrls).to.have.length(2);
        expect(bidReqConfig.ortb2Fragments.global.site.ext.data).to.deep.equal({
          mobian_tq: 1,
        });
      } finally {
        history.replaceState({}, '', originalHref);
      }
    });
  });

  describe('setTargeting', function () {
    it('should set targeting key-value pairs as per config', function () {
      const parsedConfig = {
        prefix: 'mobian',
        publisherTargeting: [AP_VALUES, EMOTIONS, RISK, SENTIMENT, TQ, TG, THEMES, TONES, GENRES],
      };
      setTargeting(parsedConfig, mockContextData);

      expect(setKeyValueSpy.callCount).to.equal(8);
      expect(setKeyValueSpy.calledWith('mobian_ap_a1', ['2313', '12'])).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_ap_p0', ['1231231', '212'])).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_ap_p1', ['231', '419'])).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_emotions', ['affection'])).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_risk', 'low')).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_sentiment', 'positive')).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_tq', 1)).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_tg', 3)).to.equal(true);

      expect(setKeyValueSpy.calledWith('mobian_ap_a0')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_themes')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_tones')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_genres')).to.equal(false);
    });

    it('should not set key-value pairs if context data is empty', function () {
      const parsedConfig = {
        prefix: 'mobian',
        publisherTargeting: [AP_VALUES, EMOTIONS, RISK, SENTIMENT, TQ, TG, THEMES, TONES, GENRES],
      };
      setTargeting(parsedConfig, {});

      expect(setKeyValueSpy.callCount).to.equal(0);
    });

    it('should only set key-value pairs for the keys specified in config', function () {
      const parsedConfig = {
        prefix: 'mobian',
        publisherTargeting: [EMOTIONS, RISK, TQ],
      };

      setTargeting(parsedConfig, mockContextData);

      expect(setKeyValueSpy.callCount).to.equal(3);
      expect(setKeyValueSpy.calledWith('mobian_emotions', ['affection'])).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_risk', 'low')).to.equal(true);
      expect(setKeyValueSpy.calledWith('mobian_tq', 1)).to.equal(true);

      expect(setKeyValueSpy.calledWith('mobian_ap_a0')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_ap_a1')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_ap_p0')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_ap_p1')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_themes')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_tones')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_genres')).to.equal(false);
      expect(setKeyValueSpy.calledWith('mobian_tg')).to.equal(false);
    });
  });

  describe('extendBidRequestConfig', function () {
    it('should extend bid request config with context data', function () {
      const extendedConfig = extendBidRequestConfig(bidReqConfig, mockContextData, mockConfig);
      expect(extendedConfig.ortb2Fragments.global.site.ext.data).to.deep.equal(mockKeyValues);
    });

    it('should not override existing data', function () {
      bidReqConfig.ortb2Fragments.global.site.ext.data = {
        existing: 'data'
      };

      const extendedConfig = extendBidRequestConfig(bidReqConfig, mockContextData, mockConfig);
      expect(extendedConfig.ortb2Fragments.global.site.ext.data).to.deep.equal({
        existing: 'data',
        ...mockKeyValues
      });
    });

    it('should create data object if missing', function () {
      delete bidReqConfig.ortb2Fragments.global.site.ext.data;
      const extendedConfig = extendBidRequestConfig(bidReqConfig, mockContextData, mockConfig);
      expect(extendedConfig.ortb2Fragments.global.site.ext.data).to.deep.equal(mockKeyValues);
    });
  });

  describe('getConfig', function () {
    it('should return config with correct keys', function () {
      const config = getConfig({
        name: 'mobianBrandSafety',
        params: {
          prefix: 'mobiantest',
          publisherTargeting: [AP_VALUES],
          advertiserTargeting: [EMOTIONS],
        }
      });
      expect(config).to.deep.equal({
        prefix: 'mobiantest',
        publisherTargeting: [AP_VALUES],
        advertiserTargeting: [EMOTIONS],
      });
    });

    it('should set default values for configs not set', function () {
      const config = getConfig({
        name: 'mobianBrandSafety',
        params: {
          publisherTargeting: [AP_VALUES],
        }
      });
      expect(config).to.deep.equal({
        prefix: 'mobian',
        publisherTargeting: [AP_VALUES],
        advertiserTargeting: [],
      });
    });

    it('should set default values if not provided', function () {
      const config = getConfig({});
      expect(config).to.deep.equal({
        prefix: 'mobian',
        publisherTargeting: [],
        advertiserTargeting: [],
      });
    });

    it('should set default values if no config is provided', function () {
      const config = getConfig();
      expect(config).to.deep.equal({
        prefix: 'mobian',
        publisherTargeting: [],
        advertiserTargeting: [],
      });
    });

    it('should set all tarteging values if value is true', function () {
      const config = getConfig({
        name: 'mobianBrandSafety',
        params: {
          publisherTargeting: true,
          advertiserTargeting: true,
        }
      });
      expect(config).to.deep.equal({
        prefix: 'mobian',
        publisherTargeting: CONTEXT_KEYS,
        advertiserTargeting: CONTEXT_KEYS,
      });
    });
  });

  describe('makeContextDataToKeyValuesReducer', function () {
    it('should format context data to key-value pairs', function () {
      const config = getConfig({
        name: 'mobianBrandSafety',
        params: {
          prefix: 'mobian',
          publisherTargeting: true,
          advertiserTargeting: true,
        }
      });
      const keyValues = Object.entries(mockContextData).reduce(makeContextDataToKeyValuesReducer(config), []);
      const keyValuesObject = Object.fromEntries(keyValues);
      expect(keyValuesObject).to.deep.equal(mockKeyValues);
    });

    it('should add scalar tq and tg values when called directly with those entries', function () {
      const config = getConfig({
        name: 'mobianBrandSafety',
        params: {
          prefix: 'mobian',
          publisherTargeting: true,
          advertiserTargeting: true,
        }
      });
      const reducer = makeContextDataToKeyValuesReducer(config);

      const keyValues = [
        [TQ, 1],
        [TG, 3],
        [TG, null],
      ].reduce(reducer, []);

      expect(keyValues).to.deep.equal([
        ['mobian_tq', 1],
        ['mobian_tg', 3],
      ]);
    });
  });

  describe('makeMemoizedFetch cache eviction', function () {
    it('should evict the oldest entry when cache exceeds maxSize', async function () {
      const maxSize = 2;
      let fetchCount = 0;
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        fetchCount++;
        callbacks.success(mockResponse);
      });

      const memoizedFetch = makeMemoizedFetch(maxSize);

      await memoizedFetch();
      expect(fetchCount).to.equal(1);

      await memoizedFetch();
      expect(fetchCount).to.equal(1);

      const originalHref = window.location.href;
      try {
        history.pushState({}, '', '/page2');
        await memoizedFetch();
        expect(fetchCount).to.equal(2, 'new URL /page2 should trigger a fetch');

        history.pushState({}, '', '/page3');
        await memoizedFetch();
        expect(fetchCount).to.equal(3, 'new URL /page3 should trigger a fetch and evict the original URL');

        history.pushState({}, '', '/page2');
        await memoizedFetch();
        expect(fetchCount).to.equal(3, '/page2 should still be cached');

        history.pushState({}, '', originalHref);
        await memoizedFetch();
        expect(fetchCount).to.equal(4, 'original URL was evicted and requires a new fetch');
      } finally {
        history.replaceState({}, '', originalHref);
      }
    });

    it('should fall back to MAX_CACHE_SIZE when given an invalid maxSize', async function () {
      let fetchCount = 0;
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        fetchCount++;
        callbacks.success(mockResponse);
      });

      const memoizedFetch = makeMemoizedFetch(NaN);
      const originalHref = window.location.href;

      try {
        for (let i = 0; i < MAX_CACHE_SIZE; i++) {
          history.pushState({}, '', `/invalid-size-${i}`);
          await memoizedFetch();
        }
        expect(fetchCount).to.equal(MAX_CACHE_SIZE, 'should fetch once per unique URL');

        history.pushState({}, '', '/invalid-size-5');
        await memoizedFetch();
        expect(fetchCount).to.equal(MAX_CACHE_SIZE, 'revisiting a cached URL should not fetch again');

        history.pushState({}, '', '/invalid-size-overflow');
        await memoizedFetch();
        expect(fetchCount).to.equal(MAX_CACHE_SIZE + 1, 'new URL beyond limit should fetch and evict oldest (URL 0)');

        history.pushState({}, '', '/invalid-size-0');
        await memoizedFetch();
        expect(fetchCount).to.equal(MAX_CACHE_SIZE + 2, 'URL 0 was evicted and requires a new fetch');

        history.pushState({}, '', '/invalid-size-5');
        await memoizedFetch();
        expect(fetchCount).to.equal(MAX_CACHE_SIZE + 2, 'URL 5 should still be cached');
      } finally {
        history.replaceState({}, '', originalHref);
      }
    });

    it('should floor fractional maxSize to an integer', async function () {
      let fetchCount = 0;
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        fetchCount++;
        callbacks.success(mockResponse);
      });

      const memoizedFetch = makeMemoizedFetch(1.9);
      const originalHref = window.location.href;

      try {
        await memoizedFetch();
        expect(fetchCount).to.equal(1);

        history.pushState({}, '', '/fractional-page2');
        await memoizedFetch();
        expect(fetchCount).to.equal(2);

        history.pushState({}, '', originalHref);
        await memoizedFetch();
        expect(fetchCount).to.equal(3);
      } finally {
        history.replaceState({}, '', originalHref);
      }
    });

    it('should share a single in-flight request for concurrent calls to the same URL', async function () {
      let fetchCount = 0;
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        fetchCount++;
        setTimeout(() => callbacks.success(mockResponse), 10);
      });

      const memoizedFetch = makeMemoizedFetch();
      const [result1, result2, result3] = await Promise.all([
        memoizedFetch(),
        memoizedFetch(),
        memoizedFetch(),
      ]);

      expect(fetchCount).to.equal(1);
      expect(result1).to.deep.equal(mockAssessmentData);
      expect(result2).to.deep.equal(mockAssessmentData);
      expect(result3).to.deep.equal(mockAssessmentData);
    });

    it('should delete failed cache entries so subsequent calls refetch after an error', async function () {
      let fetchCount = 0;
      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        fetchCount++;
        callbacks.error(new Error('network error'));
      });

      const memoizedFetch = makeMemoizedFetch();

      const firstResult = await memoizedFetch();
      expect(fetchCount).to.equal(1);
      expect(firstResult).to.deep.equal({});

      const secondResult = await memoizedFetch();
      expect(fetchCount).to.equal(2, 'cache entry was cleared on error so a new fetch should occur');
      expect(secondResult).to.deep.equal({});
    });

    it('should share a failing in-flight request across concurrent callers and allow a new fetch afterward', async function () {
      let fetchCount = 0;
      let shouldError = true;

      ajaxStub = sinon.stub(dep, 'ajaxBuilder').returns(function (url, callbacks) {
        fetchCount++;
        if (shouldError) {
          setTimeout(() => callbacks.error(new Error('server error')), 10);
        } else {
          setTimeout(() => callbacks.success(mockResponse), 10);
        }
      });

      const memoizedFetch = makeMemoizedFetch();

      const [result1, result2, result3] = await Promise.all([
        memoizedFetch(),
        memoizedFetch(),
        memoizedFetch(),
      ]);

      expect(fetchCount).to.equal(1, 'concurrent callers should share a single in-flight request');
      expect(result1).to.deep.equal({});
      expect(result2).to.deep.equal({});
      expect(result3).to.deep.equal({});

      shouldError = false;
      const value = await memoizedFetch();

      expect(fetchCount).to.equal(2, 'cache entry was cleared on error so a new fetch should occur');
      expect(value).to.deep.equal(mockAssessmentData);
    });

    it('should not let an evicted request delete a newer cache entry for the same URL', async function () {
      const pendingRequests = [];
      const fetchData = sinon.stub().callsFake(() => new Promise((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      }));
      const memoizedFetch = makeMemoizedFetch(1, fetchData, (value) => value);
      const originalHref = window.location.href;

      try {
        const firstRequest = memoizedFetch();

        history.pushState({}, '', '/mobian-cache-race-other');
        const otherRequest = memoizedFetch();

        history.pushState({}, '', originalHref);
        const replacementRequest = memoizedFetch();

        pendingRequests[0].reject(new Error('evicted request failed'));
        expect(await firstRequest).to.deep.equal({});

        const cachedReplacement = memoizedFetch();
        expect(fetchData.callCount).to.equal(3, 'the newer entry should remain cached');

        pendingRequests[2].resolve({ replacement: true });
        expect(await replacementRequest).to.deep.equal({ replacement: true });
        expect(await cachedReplacement).to.deep.equal({ replacement: true });

        pendingRequests[1].resolve({ other: true });
        expect(await otherRequest).to.deep.equal({ other: true });
      } finally {
        history.replaceState({}, '', originalHref);
      }
    });

    it('should memoize contextual and IVT requests independently', async function () {
      const contextFetch = sinon.stub().resolves(mockResponse);
      const ivtFetch = sinon.stub().resolves(mockIvtResponse);
      const memoizedContext = makeMemoizedFetch(MAX_CACHE_SIZE, contextFetch, makeDataFromResponse);
      const memoizedIvt = makeMemoizedFetch(MAX_CACHE_SIZE, ivtFetch, makeIvtDataFromResponse);

      const first = await Promise.all([memoizedContext(), memoizedIvt()]);
      const second = await Promise.all([memoizedContext(), memoizedIvt()]);

      expect(first).to.deep.equal([mockAssessmentData, { [TQ]: 1 }]);
      expect(second).to.deep.equal(first);
      expect(contextFetch.calledOnce).to.equal(true);
      expect(ivtFetch.calledOnce).to.equal(true);
    });
  });
});
