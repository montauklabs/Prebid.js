# Overview

```
Module Name: OpenX Bidder Adapter
Module Type: Bidder Adapter
Maintainer: team-openx@openx.com
```

# Description

Module that connects to OpenX's demand sources.
Note that this adapter mirrors openxOrtbBidAdapter and any updates must be
completed in both adapters.
openxOrtbBidAdapter will be removed in a future release and should not be used.
Please note you should only include either openxBidAdapter or openxOrtbBidAdapter in your build.

# Bid Parameters
## Banner

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `delDomain` or `platform` | required | String | OpenX delivery domain or platform id provided by your OpenX representative.  | "PUBLISHER-d.openx.net" or "555not5a-real-plat-form-id0123456789"
| `unit` | required | String | OpenX ad unit ID provided by your OpenX representative. | "1611023122"
| `customParams` | optional | Object | User-defined targeting key-value pairs. customParams applies to a specific unit. | `{key1: "v1", key2: ["v2","v3"]}`
| `customFloor` | optional | Number | Minimum price in USD. customFloor applies to a specific unit. For example, use the following value to set a $1.50 floor: 1.50 <br/><br/> **WARNING:**<br/> Misuse of this parameter can impact revenue | 1.50
| `doNotTrack` | optional | Boolean | Prevents advertiser from using data for this user. <br/><br/> **WARNING:**<br/> Request-level setting.  May impact revenue. | true
| `coppa` | optional | Boolean | Enables Child's Online Privacy Protection Act (COPPA) regulations. Use of `pbjs.setConfig({coppa: true});` is now preferred. | true

## Video

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `unit` | required | String | OpenX ad unit ID provided by your OpenX representative. | "1611023122"
| `delDomain` | required | String |  OpenX delivery domain provided by your OpenX representative.  | "PUBLISHER-d.openx.net"
| `video` | optional | OpenRTB video subtypes | Use of adUnit.mediaTypes.video is now preferred. | `{ video: {mimes: ['video/mp4']}`

## Native

| Name | Scope | Type | Description | Example
| ---- | ----- | ---- | ----------- | -------
| `delDomain` or `platform` | required | String | OpenX delivery domain or platform id provided by your OpenX representative.  | "PUBLISHER-d.openx.net" or "555not5a-real-plat-form-id0123456789"
| `unit` | required | String | OpenX ad unit ID provided by your OpenX representative. | "1611023122"
| `customParams` | optional | Object | User-defined targeting key-value pairs. customParams applies to a specific unit. | `{key1: "v1", key2: ["v2","v3"]}`
| `customFloor` | optional | Number | Minimum price in USD. customFloor applies to a specific unit. For example, use the following value to set a $1.50 floor: 1.50 <br/><br/> **WARNING:**<br/> Misuse of this parameter can impact revenue | 1.50
| `doNotTrack` | optional | Boolean | Prevents advertiser from using data for this user. <br/><br/> **WARNING:**<br/> Request-level setting.  May impact revenue. | true
| `coppa` | optional | Boolean | Enables Child's Online Privacy Protection Act (COPPA) regulations. Use of `pbjs.setConfig({coppa: true});` is now preferred. | true

# Example
```javascript
var adUnits = [
  {
    code: 'test-div',
    sizes: [[728, 90]],  // a display size
    mediaTypes: {'banner': {}},
    bids: [
      {
        bidder: 'openx',
        params: {
          unit: '539439964',
          delDomain: 'se-demo-d.openx.net',
          customParams: {
            key1: 'v1',
            key2: ['v2', 'v3']
          },
        }
      }, {
         bidder: 'openx',
         params: {
           unit: '539439964',
           platform: 'a3aece0c-9e80-4316-8deb-faf804779bd1',
           customParams: {
             key1: 'v1',
             key2: ['v2', 'v3']
           },
         }
       }
    ]
  },
  {
    code: 'video1',
    mediaTypes: {
      video: {
        playerSize: [640, 480],
        context: 'instream',
        mimes: ['video/x-ms-wmv, video/mp4']
      }
    },
    bids: [{
      bidder: 'openx',
      params: {
        unit: '1611023124',
        delDomain: 'PUBLISHER-d.openx.net',
        video: {
          mimes: ['video/x-ms-wmv, video/mp4'] // mediaTypes.video preferred
        }
      }
    }]
  }, 
  {
    code: 'native1',
    mediaTypes: {
      native: {
        ortb: {
          ver: '1.2', 
          assets: [
            {
              required: 1,
              img: {
                type: 1,
                hmin: 50
              },
            }, {
              required: 1,
              title: {
                len: 80
              }
            }
          ]
        }
      }
    },
    bids: [{
        bidder: 'openx',
        params: {
            unit: '1611023124',
            delDomain: 'PUBLISHER-d.openx.net',
            customParams: {
                key1: 'v1',
                key2: ['v2', 'v3']
            }
        }
    }]
  }
];
```

# Configuration
Add the following code to enable user syncing. By default, Prebid.js version 0.34.0+ turns off user syncing through iframes.
OpenX strongly recommends enabling user syncing through iframes. This functionality improves DSP user match rates and increases the
OpenX bid rate and bid price. Be sure to call `pbjs.setConfig()` only once.

```javascript
pbjs.setConfig({
   userSync: {
      iframeEnabled: true
   }
});
```

# Additional Details
[Banner Ads](https://docs.openx.com/publishers/prebid-adapter-web/)

[Video Ads](https://docs.openx.com/publishers/prebid-adapter-video/)

