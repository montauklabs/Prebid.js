/**
 * This module adds the Mobian RTD provider to the real time data module
 * The {@link module:modules/realTimeData} module is required
 */
import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';
import { deepSetValue, safeJSONParse } from '../src/utils.js';

/**
 * @typedef {import('../modules/rtdModule/index.js').RtdSubmodule} RtdSubmodule
 */

export const MOBIAN_URL = 'https://prebid.outcomes.net/api/prebid/v1/assessment/async';

/** @type {RtdSubmodule} */
export const mobianBrandSafetySubmodule = {
  name: 'mobianBrandSafety',
  init: init,
  getBidRequestData: getBidRequestData
};

function init() {
  return true;
}

function getPageUrl() {
  return window.location.href;
}

function ajax() {
  return ajaxBuilder();
}

function getContextAPIUrl() {
  const pageUrl = encodeURIComponent(getPageUrl());
  const requestUrl = `${MOBIAN_URL}?url=${pageUrl}`;
  return requestUrl;
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function formatKey(key) {
  return `mobian${capitalize(key)}`;
}

function setGAMTargeting(mobianContext) {
  const formatApValuesReducer = (acc, [key, value]) => {
    if (key !== 'apValues') {
      return [...acc, [key, value]];
    };
    return [...acc, ...Object.entries(value).map(([apKey, apValue]) => [`ap_${apKey}`, apValue])];
  };
  const keyValues = Object.entries(mobianContext).reduce(formatApValuesReducer, []);
  const setTargeting = ([key, value]) => window.googletag.pubads().setTargeting(formatKey(key), value);

  window.googletag = window.googletag || {cmd: []};
  window.googletag.cmd = window.googletag.cmd || [];
  window.googletag.cmd.push(() => keyValues.forEach(setTargeting));
}

function setOpenRTBGlobals(mobianContext, bidReqConfig) {
  const keyValues = Object.entries(mobianContext);
  const target = bidReqConfig.ortb2Fragments.global.site;
  keyValues.forEach(([key, value]) => deepSetValue(target, `ext.data.${formatKey(key)}`, value));
}

function getMobianContextFromResponse(response) {
  const { results } = response;
  return {
    risk: results.mobianRisk || 'unknown',
    contentCategories: results.mobianContentCategories || [],
    sentiment: results.mobianSentiment || 'unknown',
    emotions: results.mobianEmotions || [],
    themes: results.mobianThemes || [],
    tones: results.mobianTones || [],
    genres: results.mobianGenres || [],
    apValues: results.ap || {}
  };
}

function getBidRequestData(bidReqConfig, callback, config) {
  const url = getContextAPIUrl();
  return new Promise((resolve) => {
    ajax(url, {
      success: function(responseData) {
        const response = safeJSONParse(responseData);
        if (!response || !response.meta.has_results) {
          resolve({});
          callback();
          return;
        }
        const mobianContext = getMobianContextFromResponse(response);
        setOpenRTBGlobals(mobianContext, bidReqConfig);
        setGAMTargeting(mobianContext);
        resolve(mobianContext);
        callback();
      },
      error: function () {
        resolve({});
        callback();
      }
    });
  });
}

submodule('realTimeData', mobianBrandSafetySubmodule);
