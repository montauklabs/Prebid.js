import { submodule } from '../src/hook.js';
import { ajaxBuilder } from '../src/ajax.js';

export const MOBIAN_URL = 'http://impact-analytics-staging.themobian.com';

export const mobianBrandSafetySubmodule = {
  name: 'mobianBrandSafety',
  gvlid: null,
  init: init,
  getTargetingData: getTargetingData
};

function init() {
  return true;
}
function getTargetingData() {
  const pageUrl = encodeURIComponent(getPageUrl());
  const requestUrl = `${MOBIAN_URL}?url=${pageUrl}`;

  const ajax = ajaxBuilder();

  return new Promise((resolve) => {
    ajax(requestUrl, {
      success: function(response) {
        const risks = ['garm_high_risk', 'garm_medium_risk', 'garm_low_risk', 'garm_no_risk'];
        const riskLevels = ['high_risk', 'medium_risk', 'low_risk', 'no_risk'];

        let mobianGarmRisk = 'unknown';
        for (let i = 0; i < risks.length; i++) {
          if (response[risks[i]]) {
            mobianGarmRisk = riskLevels[i];
            break;
          }
        }

        const targeting = {
          'mobianGarmRisk': mobianGarmRisk
        };

        resolve(targeting);
      },
      error: function () {
        resolve({});
      }
    });
  });
}

function getPageUrl() {
  return window.location.href;
}

submodule('realTimeData', mobianBrandSafetySubmodule);
