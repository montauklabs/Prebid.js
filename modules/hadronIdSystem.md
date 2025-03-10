## Audigent Hadron User ID Submodule

Audigent Hadron ID Module. For assistance setting up your module please contact us at [prebid@audigent.com](prebid@audigent.com).

### Prebid Params

Individual params may be set for the Audigent Hadron ID Submodule. At least one identifier must be set in the params.

```
pbjs.setConfig({
    usersync: {
        userIds: [{
            name: 'hadronId',
            params: {
                partnerId: 1234   // change it to the Partner ID you got from Audigent
            },
            storage: {
                name: 'hadronId',
                type: 'html5'
            }
        }]
    }
});
```
## Parameter Descriptions for the `usersync` Configuration Section
The below parameters apply only to the HadronID User ID Module integration.

| Param under usersync.userIds[] | Scope    | Type    | Description                                                                                                                                                                                                                 | Example                                                                     |
|--------------------------------|----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| name                           | Required | String  | ID value for the HadronID module - `"hadronId"`                                                                                                                                                                             | `"hadronId"`                                                                |
| storage                        | Required | Object  | The publisher must specify the local storage in which to store the results of the call to get the user ID. This can be either cookie or HTML5 storage.                                                                      |                                                                             |
| storage.type                   | Required | String  | This is where the the user ID will be stored. The recommended method is `localStorage` by specifying `html5`.                                                                                                               | `"html5"`                                                                   |
| storage.name                   | Required | String  | The name of the cookie or html5 local storage where the user ID will be stored. The recommended value is `hadronId`.                                                                                                        | `"auHadronId"`                                                              |
| storage.expires                | Optional | Integer | How long (in days) the user ID information will be stored. The recommended value is 14 days.                                                                                                                                | `14`                                                                        |
| value                          | Optional | Object  | Used only if the page has a separate mechanism for storing the Hadron ID. The value is an object containing the values to be sent to the adapters. In this scenario, no URL is called and nothing is added to local storage | `{"hadronId": "0aRSTUAackg79ijgd8e8j6kah9ed9j6hdfgb6cl00volopxo00npzjmmb"}` |
| params                         | Optional | Object  | Used to store params for the id system                                                                                                                                                                                      |
| params.partnerId               | Required | Number  | This is the Audigent Partner ID obtained from Audigent.                                                                                                                                                                     | `1234`                                                                      |
