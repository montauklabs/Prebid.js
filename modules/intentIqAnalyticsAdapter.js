import {logError, logInfo} from '../src/utils.js';
import adapter from '../libraries/analyticsAdapter/AnalyticsAdapter.js';
import adapterManager from '../src/adapterManager.js';
import {ajax} from '../src/ajax.js';
import {getStorageManager} from '../src/storageManager.js';
import {config} from '../src/config.js';
import {EVENTS} from '../src/constants.js';
import {MODULE_TYPE_ANALYTICS} from '../src/activities/modules.js';
import {detectBrowser} from '../libraries/intentIqUtils/detectBrowserUtils.js';
import {appendVrrefAndFui, getReferrer} from '../libraries/intentIqUtils/getRefferer.js';
import {getCmpData} from '../libraries/intentIqUtils/getCmpData.js'
import {CLIENT_HINTS_KEY, FIRST_PARTY_KEY, VERSION} from '../libraries/intentIqConstants/intentIqConstants.js';
import {readData, defineStorageType} from '../libraries/intentIqUtils/storageUtils.js';

const MODULE_NAME = 'iiqAnalytics'
const analyticsType = 'endpoint';
const REPORT_ENDPOINT = 'https://reports.intentiq.com/report';
const REPORT_ENDPOINT_GDPR = 'https://reports-gdpr.intentiq.com/report';
const storage = getStorageManager({moduleType: MODULE_TYPE_ANALYTICS, moduleName: MODULE_NAME});
const prebidVersion = '$prebid.version$';
export const REPORTER_ID = Date.now() + '_' + getRandom(0, 1000);
const allowedStorage = defineStorageType(config.enabledStorageTypes);

const PARAMS_NAMES = {
  abTestGroup: 'abGroup',
  pbPauseUntil: 'pbPauseUntil',
  pbMonitoringEnabled: 'pbMonitoringEnabled',
  isInTestGroup: 'isInTestGroup',
  enhanceRequests: 'enhanceRequests',
  wasSubscribedForPrebid: 'wasSubscribedForPrebid',
  hadEids: 'hadEids',
  ABTestingConfigurationSource: 'ABTestingConfigurationSource',
  lateConfiguration: 'lateConfiguration',
  jsversion: 'jsversion',
  eidsNames: 'eidsNames',
  requestRtt: 'rtt',
  clientType: 'clientType',
  adserverDeviceType: 'AdserverDeviceType',
  terminationCause: 'terminationCause',
  callCount: 'callCount',
  manualCallCount: 'mcc',
  pubprovidedidsFailedToregister: 'ppcc',
  noDataCount: 'noDataCount',
  profile: 'profile',
  isProfileDeterministic: 'pidDeterministic',
  siteId: 'sid',
  hadEidsInLocalStorage: 'idls',
  auctionStartTime: 'ast',
  eidsReadTime: 'eidt',
  agentId: 'aid',
  auctionEidsLength: 'aeidln',
  wasServerCalled: 'wsrvcll',
  referrer: 'vrref',
  isInBrowserBlacklist: 'inbbl',
  prebidVersion: 'pbjsver',
  partnerId: 'partnerId',
  firstPartyId: 'pcid',
  placementId: 'placementId',
  adType: 'adType'
};

let iiqAnalyticsAnalyticsAdapter = Object.assign(adapter({defaultUrl: REPORT_ENDPOINT, analyticsType}), {
  initOptions: {
    lsValueInitialized: false,
    partner: null,
    fpid: null,
    currentGroup: null,
    dataInLs: null,
    eidl: null,
    lsIdsInitialized: false,
    manualWinReportEnabled: false,
    domainName: null
  },
  track({eventType, args}) {
    switch (eventType) {
      case BID_WON:
        bidWon(args);
        break;
      case BID_REQUESTED:
        defineGlobalVariableName();
        break;
      default:
        break;
    }
  }
});

// Events needed
const {
  BID_WON,
  BID_REQUESTED
} = EVENTS;

function getIntentIqConfig() {
  return config.getConfig('userSync.userIds')?.find(m => m.name === 'intentIqId');
}

function initLsValues() {
  if (iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized) return;
  let iiqConfig = getIntentIqConfig()

  if (iiqConfig) {
    iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized = true;
    iiqAnalyticsAnalyticsAdapter.initOptions.partner =
      iiqConfig.params?.partner && !isNaN(iiqConfig.params.partner) ? iiqConfig.params.partner : -1;

    iiqAnalyticsAnalyticsAdapter.initOptions.browserBlackList =
      typeof iiqConfig.params?.browserBlackList === 'string' ? iiqConfig.params.browserBlackList.toLowerCase() : '';
    iiqAnalyticsAnalyticsAdapter.initOptions.manualWinReportEnabled = iiqConfig.params?.manualWinReportEnabled || false;
    iiqAnalyticsAnalyticsAdapter.initOptions.domainName = iiqConfig.params?.domainName || '';
  } else {
    iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized = false;
    iiqAnalyticsAnalyticsAdapter.initOptions.partner = -1;
  }
}

function initReadLsIds() {
  try {
    iiqAnalyticsAnalyticsAdapter.initOptions.dataInLs = null;
    iiqAnalyticsAnalyticsAdapter.initOptions.fpid = JSON.parse(readData(FIRST_PARTY_KEY, allowedStorage, storage));
    if (iiqAnalyticsAnalyticsAdapter.initOptions.fpid) {
      iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup = iiqAnalyticsAnalyticsAdapter.initOptions.fpid.group;
    }
    const partnerData = readData(FIRST_PARTY_KEY + '_' + iiqAnalyticsAnalyticsAdapter.initOptions.partner, allowedStorage, storage);
    const clientsHints = readData(CLIENT_HINTS_KEY, allowedStorage, storage) || '';

    if (partnerData) {
      iiqAnalyticsAnalyticsAdapter.initOptions.lsIdsInitialized = true;
      let pData = JSON.parse(partnerData);
      iiqAnalyticsAnalyticsAdapter.initOptions.terminationCause = pData.terminationCause
      iiqAnalyticsAnalyticsAdapter.initOptions.dataInLs = pData.data;
      iiqAnalyticsAnalyticsAdapter.initOptions.eidl = pData.eidl || -1;
      iiqAnalyticsAnalyticsAdapter.initOptions.clientType = pData.clientType || null;
      iiqAnalyticsAnalyticsAdapter.initOptions.siteId = pData.siteId || null;
      iiqAnalyticsAnalyticsAdapter.initOptions.wsrvcll = pData.wsrvcll || false;
      iiqAnalyticsAnalyticsAdapter.initOptions.rrtt = pData.rrtt || null;
    }

    iiqAnalyticsAnalyticsAdapter.initOptions.clientsHints = clientsHints
  } catch (e) {
    logError(e)
  }
}

function bidWon(args, isReportExternal) {
  if (!iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized) {
    initLsValues();
  }

  if (isNaN(iiqAnalyticsAnalyticsAdapter.initOptions.partner) || iiqAnalyticsAnalyticsAdapter.initOptions.partner == -1) return;

  const currentBrowserLowerCase = detectBrowser();
  if (iiqAnalyticsAnalyticsAdapter.initOptions.browserBlackList?.includes(currentBrowserLowerCase)) {
    logError('IIQ ANALYTICS -> Browser is in blacklist!');
    return;
  }

  if (iiqAnalyticsAnalyticsAdapter.initOptions.lsValueInitialized && !iiqAnalyticsAnalyticsAdapter.initOptions.lsIdsInitialized) {
    initReadLsIds();
  }
  if ((isReportExternal && iiqAnalyticsAnalyticsAdapter.initOptions.manualWinReportEnabled) || (!isReportExternal && !iiqAnalyticsAnalyticsAdapter.initOptions.manualWinReportEnabled)) {
    ajax(constructFullUrl(preparePayload(args, true)), undefined, null, {method: 'GET'});
    logInfo('IIQ ANALYTICS -> BID WON')
    return true;
  }
  return false;
}

function defineGlobalVariableName() {
  function reportExternalWin(args) {
    return bidWon(args, true);
  }

  const iiqConfig = getIntentIqConfig();
  const partnerId = iiqConfig?.params?.partner || 0;

  window[`intentIqAnalyticsAdapter_${partnerId}`] = { reportExternalWin };
}

function getRandom(start, end) {
  return Math.floor((Math.random() * (end - start + 1)) + start);
}

export function preparePayload(data) {
  let result = getDefaultDataObject();
  readData(FIRST_PARTY_KEY + '_' + iiqAnalyticsAnalyticsAdapter.initOptions.partner, allowedStorage, storage);
  result[PARAMS_NAMES.partnerId] = iiqAnalyticsAnalyticsAdapter.initOptions.partner;
  result[PARAMS_NAMES.prebidVersion] = prebidVersion;
  result[PARAMS_NAMES.referrer] = getReferrer();
  result[PARAMS_NAMES.terminationCause] = iiqAnalyticsAnalyticsAdapter.initOptions.terminationCause;
  result[PARAMS_NAMES.abTestGroup] = iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup;
  result[PARAMS_NAMES.clientType] = iiqAnalyticsAnalyticsAdapter.initOptions.clientType;
  result[PARAMS_NAMES.siteId] = iiqAnalyticsAnalyticsAdapter.initOptions.siteId;
  result[PARAMS_NAMES.wasServerCalled] = iiqAnalyticsAnalyticsAdapter.initOptions.wsrvcll;
  result[PARAMS_NAMES.requestRtt] = iiqAnalyticsAnalyticsAdapter.initOptions.rrtt;

  result[PARAMS_NAMES.isInTestGroup] = iiqAnalyticsAnalyticsAdapter.initOptions.currentGroup == 'A';

  result[PARAMS_NAMES.agentId] = REPORTER_ID;
  if (iiqAnalyticsAnalyticsAdapter.initOptions.fpid?.pcid) result[PARAMS_NAMES.firstPartyId] = encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.fpid.pcid);
  if (iiqAnalyticsAnalyticsAdapter.initOptions.fpid?.pid) result[PARAMS_NAMES.profile] = encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.fpid.pid)

  prepareData(data, result);

  fillEidsData(result);

  return result;
}

function fillEidsData(result) {
  if (iiqAnalyticsAnalyticsAdapter.initOptions.lsIdsInitialized) {
    result[PARAMS_NAMES.hadEidsInLocalStorage] = iiqAnalyticsAnalyticsAdapter.initOptions.eidl && iiqAnalyticsAnalyticsAdapter.initOptions.eidl > 0;
    result[PARAMS_NAMES.auctionEidsLength] = iiqAnalyticsAnalyticsAdapter.initOptions.eidl || -1;
  }
}

function prepareData (data, result) {
  const adTypeValue = data.adType || data.mediaType;

  if (data.bidderCode) {
    result.bidderCode = data.bidderCode;
  }
  if (data.cpm) {
    result.cpm = data.cpm;
  }
  if (data.currency) {
    result.currency = data.currency;
  }
  if (data.originalCpm) {
    result.originalCpm = data.originalCpm;
  }
  if (data.originalCurrency) {
    result.originalCurrency = data.originalCurrency;
  }
  if (data.status) {
    result.status = data.status;
  }
  if (data.auctionId) {
    result.prebidAuctionId = data.auctionId;
  }
  if (adTypeValue) {
    result[PARAMS_NAMES.adType] = adTypeValue;
  }
  const iiqConfig = getIntentIqConfig();
  const adUnitConfig = iiqConfig.params?.adUnitConfig;

  switch (adUnitConfig) {
    case 1:
      // adUnitCode or placementId
      result.placementId = data.adUnitCode || extractPlacementId(data) || '';
      break;
    case 2:
      // placementId or adUnitCode
      result.placementId = extractPlacementId(data) || data.adUnitCode || '';
      break;
    case 3:
      // Only adUnitCode
      result.placementId = data.adUnitCode || '';
      break;
    case 4:
      // Only placementId
      result.placementId = extractPlacementId(data) || '';
      break;
    default:
      // Default (like in case #1)
      result.placementId = data.adUnitCode || extractPlacementId(data) || '';
  }

  result.biddingPlatformId = 1;
  result.partnerAuctionId = 'BW';
}

function extractPlacementId(data) {
  if (data.placementId) {
    return data.placementId;
  }
  if (data.params && Array.isArray(data.params)) {
    for (let i = 0; i < data.params.length; i++) {
      if (data.params[i].placementId) {
        return data.params[i].placementId;
      }
    }
  }
  return null;
}

function getDefaultDataObject() {
  return {
    'inbbl': false,
    'pbjsver': prebidVersion,
    'partnerAuctionId': 'BW',
    'reportSource': 'pbjs',
    'abGroup': 'U',
    'jsversion': VERSION,
    'partnerId': -1,
    'biddingPlatformId': 1,
    'idls': false,
    'ast': -1,
    'aeidln': -1
  }
}

function constructFullUrl(data) {
  let report = [];
  data = btoa(JSON.stringify(data));
  report.push(data);

  const cmpData = getCmpData();
  const gdprDetected = cmpData.gdprString;
  const baseUrl = gdprDetected ? REPORT_ENDPOINT_GDPR : REPORT_ENDPOINT;

  let url = baseUrl + '?pid=' + iiqAnalyticsAnalyticsAdapter.initOptions.partner +
    '&mct=1' +
    ((iiqAnalyticsAnalyticsAdapter.initOptions?.fpid)
      ? '&iiqid=' + encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.fpid.pcid) : '') +
    '&agid=' + REPORTER_ID +
    '&jsver=' + VERSION +
    '&source=pbjs' +
    '&payload=' + JSON.stringify(report) +
    '&uh=' + encodeURIComponent(iiqAnalyticsAnalyticsAdapter.initOptions.clientsHints) +
    (cmpData.uspString ? '&us_privacy=' + encodeURIComponent(cmpData.uspString) : '') +
    (cmpData.gppString ? '&gpp=' + encodeURIComponent(cmpData.gppString) : '') +
    (cmpData.gdprString
      ? '&gdpr_consent=' + encodeURIComponent(cmpData.gdprString) + '&gdpr=1'
      : '&gdpr=0');

  url = appendVrrefAndFui(url, iiqAnalyticsAnalyticsAdapter.initOptions.domainName);
  return url;
}

iiqAnalyticsAnalyticsAdapter.originEnableAnalytics = iiqAnalyticsAnalyticsAdapter.enableAnalytics;

iiqAnalyticsAnalyticsAdapter.enableAnalytics = function (myConfig) {
  iiqAnalyticsAnalyticsAdapter.originEnableAnalytics(myConfig); // call the base class function
};
adapterManager.registerAnalyticsAdapter({
  adapter: iiqAnalyticsAnalyticsAdapter,
  code: MODULE_NAME
});

export default iiqAnalyticsAnalyticsAdapter;
