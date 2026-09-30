/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */

var softwareName;
var softwareVersion;
var redWoodPreferences; // by ragini enable redwood

define(['N/ui/serverWidget', 'N/record', 'N/file', 'N/format', 'N/config', 'N/https', 'N/redirect', "N/url", 'N/log', 'N/search', 'N/runtime', 'N/query', '../Common Module/CitiIntegrator NS SS States Module.js', '../Common Module/CitiIntegrator NS SS Common Module.js', '../Common Module/CitiIntegrator NS SS Config Module.js'],

    function (serverWidget, record, file, format, config, https, redirect, url, log, search, runtime, query, statesModule, customModule, configModule) {
        /**
         * Defines the Suitelet script trigger point.
         * @param {Object} scriptContext
         * @param {ServerRequest} scriptContext.request - Incoming request
         * @param {ServerResponse} scriptContext.response - Suitelet response
         * @since 2015.2
         */
        // CR: APIGEE
        var APG_ACCESS_TOKEN;
        function onRequest(context) {
            try {
                redWoodPreferences = config.load({ type: config.Type.USER_PREFERENCES }).getValue({ fieldId: 'REDWOOD' });
                log.debug("On Request", "Redwood Pref :" + redWoodPreferences);
                var method = context.request.method;

                // Vishal User Feedback.
                var showUserFeedback = false;
                // Vishal User Feedback.

                var userObj = runtime.getCurrentUser();
                var userId = userObj.id;
                var width = 800;
                var height = 600;
                var left = 250;
                var top = 150;
                var configurationJSON;
                // Vishal Daily Limit.
                var PAGE_SIZE = 1, pageId = 1;
                // Vishal Daily Limit.

                if (runtime.envType == "SANDBOX") {
                    configurationJSON = configModule.sandboxConfiguration();
                } else {
                    configurationJSON = configModule.productionConfiguration();
                }
                softwareName = configurationJSON.softwareName;
                softwareVersion = configurationJSON.softwareVersion;
                var VENDOR_ID = configurationJSON.VENDOR_ID;
                //CR: APIGEE 
                var apgExtFlag = configurationJSON.apgExternal;
                var COUNTRY_CURRENCY, TEMPLATE_SEARCH, TEMPLATE_DETAIL, PAYEE_LIST, ACCOUNTS_DATA_API;
                if (apgExtFlag) {
                    COUNTRY_CURRENCY = configurationJSON.apgCountryCurrency;
                    TEMPLATE_SEARCH = configurationJSON.apgTemplateSearch;
                    TEMPLATE_DETAIL = configurationJSON.apgTemplateDetail;
                    PAYEE_LIST = configurationJSON.apgPayeeList;
                    ACCOUNTS_DATA_API = configurationJSON.apgAccountRetrieveAPI;
                }
                else {
                    COUNTRY_CURRENCY = configurationJSON.countryCurrency;
                    TEMPLATE_SEARCH = configurationJSON.templateSearch;
                    TEMPLATE_DETAIL = configurationJSON.templateDetail;
                    PAYEE_LIST = configurationJSON.payeeList;
                    ACCOUNTS_DATA_API = configurationJSON.accountRetrieveAPI;
                }
                log.audit('APIGEE : flag ', apgExtFlag + ' COUNTRY_CURRENCY:  ' + COUNTRY_CURRENCY + ' TEMPLATE_SEARCH: ' + TEMPLATE_SEARCH)
                log.audit('APIGEE : ', ' TEMPLATE_DETAIL:  ' + TEMPLATE_DETAIL + ' PAYEE_LIST: ' + PAYEE_LIST + ' ACCOUNTS_DATA_API : ' + ACCOUNTS_DATA_API)
                // Vishal Daily Limit.
                // Vishal Daily Limit.

                if (method == "GET") {
                    var flag = customModule.getIframeCreds(userId);
                    if (flag == true) {
                        var tokensSearchObj = customModule.getUserSession(userId);

                        var tokensSearchObj = tokensSearchObj.run();
                        var sessionResult = tokensSearchObj.getRange({
                            start: 0,
                            end: 1
                        });
                        var sessionuserId = sessionResult[0].id;

                        var accsTkn = sessionResult[0].getValue("custrecord_citiintegrator_ns_iframacctok");
                        var pvtKey = sessionResult[0].getValue("custrecord_citiintegrator_ns_privatekey");
                        var pubKey = sessionResult[0].getValue("custrecord_citiintegrator_ns_publickey");
                        var busiCode = sessionResult[0].getValue("custrecord_citiintegrator_ns_buscode");
                        var usrCode = sessionResult[0].getValue("custrecord_citiintegrator_ns_usercode");
                        var entitlements = sessionResult[0].getText("custrecord_citiintegrator_ns_entitlement");
                        // Vishal Daily Limit.
                        var apgAccessToken = sessionResult[0].getValue("custrecord_ci_ns_apg_access_token");
                        // Vishal Daily Limit.
                        log.debug("entitlements", entitlements);

                        // Vishal User Feedback.
                        var sessionUser = sessionResult[0].id;
                        var usrFeedbackDate = sessionResult[0].getValue("custrecord_ci_user_feedback_date");
                        var usrFeedbackStatus = sessionResult[0].getValue("custrecord_ci_user_feedback_status");
                        log.debug('usrFeedbackDate', usrFeedbackDate);
                        log.debug('usrFeedbackStatus', usrFeedbackStatus);

                        // Executing the code only when the user feedback date is empty.
                        if (isEmpty(usrFeedbackDate)) {
                            // Update the record using the sessionuserId variable to 
                            record.submitFields({
                                type: 'customrecord_citiintegrator_ns_iframetok', id: sessionuserId,
                                values: { 'custrecord_ci_user_feedback_date': new Date(), custrecord_ci_user_feedback_status: 'LOGGED' }
                            });
                        } else {
                            // Executing the code when usrFeedbackStatus is empty.
                            if (isEmpty(usrFeedbackStatus)) {
                                record.submitFields({
                                    type: 'customrecord_citiintegrator_ns_iframetok', id: sessionuserId,
                                    values: { custrecord_ci_user_feedback_status: 'LOGGED' }
                                });
                            } else {
                                var usrFeedBackDiffDays = ((new Date() - new Date(usrFeedbackDate)) / (1000 * 60 * 60 * 24));
                                log.debug('usrFeedBackDiffDays', usrFeedBackDiffDays);

                                // Returning the feedback flag as true if user has last logged in system or submitted the feedback 90 days ago.
                                if (usrFeedbackStatus == 'LOGGED' || usrFeedbackStatus == 'SUBMITTED') {
                                    if (usrFeedBackDiffDays > 90) { showUserFeedback = true; }
                                }

                                // Returning the feedback flag as true if user has cancelled the feedback 30 days ago.
                                if (usrFeedbackStatus == 'CANCELLED') { if (usrFeedBackDiffDays > 30) { showUserFeedback = true; } }
                            }
                        }
                        log.debug('showUserFeedback', showUserFeedback);
                        log.debug('userId', userId);
                        log.debug('sessionuserId', sessionuserId);
                        // Vishal User Feedback.



                        var activityTime = sessionResult[0].getValue("custrecord_citiintegrator_ns_lastuptime");
                        log.debug("activityTime", activityTime);
                        // CR: APIGEE 
                        APG_ACCESS_TOKEN = sessionResult[0].getValue("custrecord_ci_ns_apg_access_token");
                        log.debug('APG_ACCESS_TOKEN: ', APG_ACCESS_TOKEN);

                        // Vishal Error for Report & Submit Home Button.
                        // var folderSearchObj = search.create({ type: "folder2", filters: [ ["name", "is", "Payment Review"] ],
                        // columns: [ search.createColumn({ name: "internalid", label: "Internal ID" }) ] }).run().getRange(0,1);
                        // Vishal Error.

                        try {
                            var currentDateTime = Date.now();
                            log.debug("currentDateTime", currentDateTime);
                            if (activityTime != "") {
                                var differenceInMilliseconds = currentDateTime - activityTime;
                                var millisecondsPerMinute = 60 * 1000;
                                var differenceInMinutes = differenceInMilliseconds / millisecondsPerMinute;
                                log.debug("less than 30 min", differenceInMinutes);
                                if (differenceInMinutes < 30) {
                                    record.submitFields({
                                        type: 'customrecord_citiintegrator_ns_iframetok',
                                        id: sessionuserId,
                                        values: {
                                            custrecord_citiintegrator_ns_lastuptime: currentDateTime
                                        },
                                        options: {
                                            enableSourcing: false,
                                            ignoreMandatoryFields: true
                                        }
                                    });
                                }
                            }
                        } catch (e) {
                            log.debug("last updated time error", e);
                        }

                        var wireType = "INTRA_DAY";
                        var defaultWireFilter = "";
                        var title = "";
                        if (entitlements.indexOf('INTERNAL_TRANSFERS') != -1) {
                            defaultWireFilter = "INTERNAL_TRANSFERS";
                        } else if (entitlements.indexOf('DOMESTIC_WIRES') != -1) {
                            defaultWireFilter = "DOMESTIC_WIRES";
                        } else if (entitlements.indexOf('FOREIGN_WIRES') != -1) {
                            defaultWireFilter = "FOREIGN_WIRES";
                        }
                        else if (entitlements.indexOf('REAL_TIME_PAYMENTS') != -1) { //rutuja start
                            defaultWireFilter = "REAL_TIME_PAYMENTS";
                        }
                        log.debug("context.request.parameters", context.request.parameters);
                        //rutuja end

                        var wireFilter = context.request.parameters.wireFilter || defaultWireFilter;
                        log.debug("wireFilter", wireFilter);

                        //rutuja start
                        if (wireFilter == "REAL_TIME_PAYMENTS") {

                            if (apgExtFlag) {
                                TEMPLATE_SEARCH = configurationJSON.apgInstTemplateSearch;
                                TEMPLATE_DETAIL = configurationJSON.apgInstTemplateDetail;
                                ACCOUNTS_DATA_API = configurationJSON.apgInstAccountRetrieveAPI;
                            }
                            else {
                                TEMPLATE_SEARCH = configurationJSON.rtpTemplateSearch;
                                TEMPLATE_DETAIL = configurationJSON.rtpTemplateDetail;
                                ACCOUNTS_DATA_API = configurationJSON.rtpAccountRetrieveAPI;
                            }

                        }
                        //rutuja end

                        var fromselectedvalue = context.request.parameters.fromselectedvalue;
                        //log.debug("fromselectedvalue", fromselectedvalue);

                        var fromselectedtext = context.request.parameters.fromselectedtext;
                        //log.debug("fromselectedtext", fromselectedtext);

                        var storedTemplateName = context.request.parameters.storedTemplateName;
                        //log.debug("storedTemplateName", storedTemplateName);

                        //rutuja start
                        var storedRtpTemplateName = context.request.parameters.storedRtpTemplateName;
                        //rutuja end

                        var storedforeignTemplateName = context.request.parameters.storedforeignTemplateName;
                        //log.debug("storedforeignTemplateName", storedforeignTemplateName);

                        var selectedValuesearch = context.request.parameters.selectedValuesearch;
                        //log.debug("selectedValuesearch", selectedValuesearch);

                        var selectedtextsearch = context.request.parameters.selectedtextsearch;
                        //log.debug("selectedtextsearch", selectedtextsearch);
                        var selectedTemplate = context.request.parameters.custparam_selected_template;
                        //log.debug("selectedTemplate", selectedTemplate);
                        if (selectedTemplate) {
                            log.debug({
                                title: 'Selected Template from Client Script',
                                details: 'The selected template is: ' + selectedTemplate
                            });
                        }


                        if (wireFilter == " ") {
                            var form = serverWidget.createForm({
                                title: "Payment Initiation",
                            });

                            var text = form.addField({
                                id: "custpage_error_text",
                                type: serverWidget.FieldType.INLINEHTML,
                                label: "Bank Details"
                            });
                            text.defaultValue = "<P>User has not configured any Payment Type.</p>"

                            context.response.writePage(form);
                            return false;
                        }
                        if (wireFilter == "INTERNAL_TRANSFERS") {
                            title = "Internal Transfer";
                        } else if (wireFilter == "DOMESTIC_WIRES") {
                            title = "Domestic Wire";
                        } else if (wireFilter == "FOREIGN_WIRES") {
                            title = "Foreign Wire";
                        }
                        else if (wireFilter == "REAL_TIME_PAYMENTS") {  //rutuja start
                            title = "Instant Payment";
                        }
                        //rutuja end

                        var editBtnFlag = false;
                        var cancelBtnFlag = context.request.parameters.cancelButton;
                        editBtnFlag = context.request.parameters.editButton;
                        var fileId = context.request.parameters.fileId;
                        try {
                            var paramData = undefined;
                            if (fileId) {
                                var fileObj = file.load({
                                    id: fileId
                                });
                                paramData = JSON.parse(fileObj.getContents());
                            }
                            //log.debug('paramData', paramData);
                        } catch (e) {

                        }


                        // Vishal Daily Limit.
                        var dailyLimit = getDailyLimitData(wireFilter, ACCOUNTS_DATA_API, pubKey, accsTkn, pvtKey, usrCode, busiCode, softwareName, softwareVersion, VENDOR_ID, pageId, PAGE_SIZE);
                        // Vishal Daily Limit.


                        var accountSearchObj = search.create({
                            type: "account",
                            filters: [
                                ["type", "anyof", "Bank"],
                                "AND",
                                ["custrecord_citiintegrator_ns_citiaccno", "isnotempty", ""],
                                "AND",
                                ["custrecord_citiintegrator_ns_user", "contains", usrCode]
                            ],
                            columns: [
                                search.createColumn({
                                    name: "custrecord_citiintegrator_ns_encryptacc",
                                    label: "Citi Account Number"
                                }),
                                search.createColumn({
                                    name: "balance",
                                    label: "Balance"
                                }),
                                search.createColumn({
                                    name: "custrecord_citiintegrator_ns_citiaccno",
                                    label: "Account Number"
                                }),
                                search.createColumn({
                                    name: "custrecord_citiintegrator_ns_acctype",
                                    label: "Account Type"
                                }),
                                search.createColumn({
                                    name: "custrecord_citiintegrator_ns_currentavl",
                                    label: "Current Available"
                                }),
                                search.createColumn({
                                    name: "custrecord_citiintegrator_ns_entitlemacc",
                                    label: "Entitlements"
                                }),


                                search.createColumn({
                                    name: "name",
                                    label: "Name"
                                })
                            ]
                        });
                        var accountSearchObj = accountSearchObj.run();

                        accountSearchObj = accountSearchObj.getRange({
                            start: 0,
                            end: 1000
                        });
                        var NSAccountArray = [];
                        var NSAccounts = [];
                        for (var acc = 0; acc < accountSearchObj.length; acc++) {
                            var obj = {};
                            var citiAccount = accountSearchObj[acc].getValue({
                                name: 'custrecord_citiintegrator_ns_encryptacc',
                            });
                            var balance = accountSearchObj[acc].getValue({
                                name: 'balance',
                            });
                            var accName = accountSearchObj[acc].getValue({
                                name: 'name',
                            });
                            var accountTypeLabel = accountSearchObj[acc].getValue({
                                name: 'custrecord_citiintegrator_ns_acctype',
                            });
                            var currentAvailableAmount = accountSearchObj[acc].getValue({
                                name: 'custrecord_citiintegrator_ns_currentavl',
                            });
                            var accEntitlements = accountSearchObj[acc].getValue({
                                name: 'custrecord_citiintegrator_ns_entitlemacc',
                            });
                            var displayableAccountNumber = accountSearchObj[acc].getValue({
                                name: 'custrecord_citiintegrator_ns_citiaccno',
                            });
                            obj.citiAccount = citiAccount;
                            obj.balance = balance;
                            obj.accName = accName;
                            obj.id = accountSearchObj[acc].id;

                            obj.currentAvailableAmount = currentAvailableAmount;
                            obj.accountTypeLabel = accountTypeLabel;
                            obj.displayableAccountNumber = displayableAccountNumber;
                            obj.encryptedAccountIdentifier = citiAccount;
                            accEntitlements = accEntitlements ? JSON.parse(accEntitlements) : accEntitlements;
                            //log.debug("accEntitlements230",accEntitlements);
                            try {
                                if (accEntitlements) {
                                    var index = accEntitlements.map(function (e) {
                                        return e.user;
                                    }).indexOf(usrCode);
                                    accEntitlements = index != -1 ? accEntitlements[index].entitlements : accEntitlements
                                }
                            } catch (e) {
                                accEntitlements = JSON.parse(accEntitlements)
                                if (accEntitlements) {
                                    var index = accEntitlements.map(function (e) {
                                        return e.user;
                                    }).indexOf(usrCode);
                                    accEntitlements = index != -1 ? accEntitlements[index].entitlements : accEntitlements
                                }
                                log.debug("error", e);
                            }


                            obj.entitlements = accEntitlements;

                            NSAccounts.push(citiAccount);
                            NSAccountArray.push(obj);
                        }
                        /*if(wireFilter == defaultWireFilter){
                            const request = {
                                "metadata": {
                                    "userCode": usrCode,
                                    "businessCodeList": [busiCode],
                                    "softwareName": softwareName,
                                    "softwareVersion": softwareVersion,
                                    "vendorId": VENDOR_ID
                                },
                                "businessCodes": [{
                                    "businessCode": busiCode,
                                    "usercode": usrCode,
                                    "nextPage": 1,
                                    "pageSize": 25,
                                    "accountBalanceTimelineEnum":  wireType
                                }],
                                "accountBalanceTimeline": wireType
                            };
                            var accountJSON = getResponseFromAPI(ACCOUNT_DETAILS, pubKey,accsTkn,pvtKey,request);
                            log.debug('accountJSON',typeof accountJSON);
                            accountJSON = (accountJSON && typeof accountJSON === 'string')? JSON.parse(accountJSON):accountJSON;
                            var accountDetails = accountJSON.data[busiCode].accountsByPostDate[0].accounts;
                            log.debug('accountDetails', accountDetails);
                        }else{
                            var accountDetails = NSAccountArray;
                        }*/
                        var accountDetails = NSAccountArray;

                        var form = serverWidget.createForm({
                            title: "Payment Initiation : " + title,
                        });
                        form.clientScriptModulePath = "../Client/CitiIntegrator NS CS Payment Initiation.js";

                        var fileObj = file.load({
                            id: '../Client/CitiIntegrator NS CS Payment Initiation.js'
                        });
                        var filePath = fileObj.path;



                        // Apurva User Feedback and User Guide changes.
                        // feedback icon
                        var feedbackIcon = file.load({ id: '../Images/feedbackIcon.png' });
                        var feedbackIconPath = feedbackIcon.url;
                        // feedback icon

                        // user guide icon
                        var userGuideIcon = file.load({ id: '../Images/userGuideIcon.png' });
                        var userGuideIconPath = userGuideIcon.url;
                        // user guide icon

                        // user feedback popup code starts here
                        var stylesUserFeedback = form.addField({ id: 'styles_user_feedback', label: ' ', type: serverWidget.FieldType.INLINEHTML });

                        var stylesScript = '';
                        stylesScript += "<style>";
                        stylesScript += ".popup { display: inline-block; cursor: pointer; font-size: 16px; color: blue }";
                        stylesScript += ".overlay { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1000; }";
                        stylesScript += ".overlay.show { display: block; }";
                        stylesScript += ".popup .popuptext { display: none; width: 50%; height: 370px; background: #fff; color: #000; text-align: center;";
                        stylesScript += "border: 1px solid #ccc; border-radius: 8px; padding: 20px; position: absolute; z-index: 999;";
                        stylesScript += "top: 50%; left: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 10px rgba(0,0,0,0.2); }";
                        stylesScript += ".popup .show { display: block; font-size: 12px; text-align:left; cursor: default; z-index: 9999 }";
                        stylesScript += ".popup .close-icon { position: absolute; top: 0; right: 8px; font-size: 24px; cursor: pointer; color: #888; }";
                        stylesScript += ".popup .remind-button { cursor: pointer; color: #255BE3; background-color: #e0e6ef; border: none;";
                        stylesScript += "padding: 10px 20px; border-radius: 4px; font-size: 14px; }";
                        stylesScript += ".popup .close-icon:hover { color: #000; }";
                        stylesScript += ".star-rating { display: flex; flex-direction: row-reverse; justify-content: flex-end; margin-bottom: 15px }";
                        stylesScript += ".star-rating input { display: none; }";
                        stylesScript += ".star-rating label { font-size: 30px; color: #ccc; cursor: pointer; transition: color 0.2s; }";
                        stylesScript += ".star-rating input:checked ~ label, .star-rating label:hover, .star-rating label:hover ~ label { color: gold; }";
                        stylesScript += "</style>";
                        stylesScript += "<div class='popup'>";
                        stylesScript += "<div id='popupOverlay' class='overlay'></div>";
                        // stylesScript += "<span id='popupTrigger' style='cursor: pointer; position: absolute; right: 21px; bottom: 0' onclick='togglePopup();'>User Feedback</span>";
                        stylesScript += "<a href='https://developer.citi.com/citi-integrator/netsuite/user-guide/payments-and-transfers' target='_blank' rel='noopener noreferrer' title='User Guide' style='position:absolute; right:62px; top: 14px;'><img src='" + userGuideIconPath + "' id='popupTrigger' style='height:30px; width:30px; cursor:pointer;' /></a>";
                        stylesScript += "<img src='" + feedbackIconPath + "' id='popupTrigger' title='User Feedback' style='height:30px; width:30px; cursor:pointer; position:absolute; right:21px; top: 14px;' onclick='togglePopup();' />";
                        stylesScript += "<div class='popuptext' id='myPopup' onclick='event.stopPropagation();'>";
                        stylesScript += "<h1 style='font-size: 22px; font-weight: bold; color: #4d5f79; line-height: 33px;'>Citi Integrator Feedback</h1>";
                        stylesScript += "<label for='Star' style='font-size: 14px'>Rate your Experience <span style='color: red;'>*</span></label><br>";
                        stylesScript += "<div class='star-rating' id='star-feedback'>";
                        stylesScript += "<input type='radio' name='rating' id='star5' value='5'><label for='star5'>&#9733;</label>";
                        stylesScript += "<input type='radio' name='rating' id='star4' value='4'><label for='star4'>&#9733;</label>";
                        stylesScript += "<input type='radio' name='rating' id='star3' value='3'><label for='star3'>&#9733;</label>";
                        stylesScript += "<input type='radio' name='rating' id='star2' value='2'><label for='star2'>&#9733;</label>";
                        stylesScript += "<input type='radio' name='rating' id='star1' value='1'><label for='star1'>&#9733;</label>";
                        stylesScript += "</div>";

                        stylesScript += "<label for='feedbackComments' style='font-size: 14px;'>Do you have any suggestions for improving Citi Integrator?</label><br>";
						// Apurva H3 VA Issue Validation to check if the feedback contains HTML tags.
						stylesScript += "<textarea id='feedbackComments' rows='4' cols='50' maxlength='1000' style='width: 100%; margin-top: 10px; resize: none;'></textarea><br>";
						stylesScript += "<div id='feedbackCommentsError' style='display:none; color:#d93025; font-size:12px;'>HTML code is not allowed.</div>";
						// Apurva H3 VA Issue Validation to check if the feedback contains HTML tags.
                        stylesScript += "<small style='color: gray;'>Maximum 1000 characters</small><br>";
                        stylesScript += "<div style='text-align: right;'>";
                        stylesScript += "<button type='button' class='remind-button' onclick='event.stopPropagation(); closePopup();'>Remind Me Later</button>";
                        stylesScript += "<button id='submitFeedback' type='button' style='margin-left: 10px; background-color: #e0e6ef; color: #b0b0b0; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin-top: 15px;'>Submit</button>";
                        stylesScript += "<div id='feedbackLoader' style='display:none; color: #4d5f79; font-size: 17px; font-weight: bold; line-height: 33px;'>";
                        stylesScript += "<span class='spinner'></span> Submitting...";
                        stylesScript += "</div>";
                        stylesScript += "</div>";
                        stylesScript += "<script>";
                        stylesScript += "window.showFeedbackLoader = function() {";
                        stylesScript += " document.getElementById('feedbackLoader').style.display = 'block';";
                        stylesScript += "};";

                        stylesScript += "window.hideFeedbackLoader = function() {";
                        stylesScript += " document.getElementById('feedbackLoader').style.display = 'none';";
                        stylesScript += "};";

						// Apurva H3 VA Issue Validation to check if the feedback contains HTML tags.
						stylesScript += "window.containsHtmlTag = function(value) {";
						stylesScript += " return /<\\s*\\/?\\s*[a-z][^>]*>/i.test(value || '');";
						stylesScript += "};";
						// Apurva H3 VA Issue Validation to check if the feedback contains HTML tags.

                        stylesScript += "window.togglePopup = function() {";
                        stylesScript += "  var popup = document.getElementById('myPopup');";
                        stylesScript += "  var overlay = document.getElementById('popupOverlay');";
                        stylesScript += "  if (!popup.classList.contains('show')) { resetFeedbackForm(); popup.classList.add('show'); overlay.classList.add('show'); }";
                        stylesScript += "  else { popup.classList.remove('show'); overlay.classList.remove('show'); }";
                        stylesScript += "};";

                        stylesScript += "window.closePopup = function() {";
                        stylesScript += "  document.getElementById('myPopup').classList.remove('show');";
                        stylesScript += "  document.getElementById('popupOverlay').classList.remove('show');";
                        // Vishal User Feedback.
                        stylesScript += "  try {";
                        stylesScript += "var rConfig = JSON.parse('{}');"
                        stylesScript += "rConfig['context'] = \'/" + filePath + "\';"
                        stylesScript += "var entryPointRequire = require.config(rConfig);"
                        stylesScript += "entryPointRequire([\'/" + filePath + "\'], function(custommodule){";
                        stylesScript += "custommodule.cancelUserFeedback(" + sessionuserId + ");"
                        stylesScript += "});";
                        stylesScript += " } catch(e){ console.log('Error in submitting feedback:', e); }";
                        // Vishal User Feedback.
                        stylesScript += "};";

                        stylesScript += "window.resetFeedbackForm = function() {";
                        stylesScript += "  document.querySelectorAll('input[name=\"rating\"]').forEach(function(r) { r.checked = false; });";
                        stylesScript += "  document.getElementById('feedbackComments').value = '';";
						// Apurva H3 VA Issue Validation to check if the feedback contains HTML tags.
						stylesScript += " var commentsError = document.getElementById('feedbackCommentsError');";
						stylesScript += " if (commentsError) { commentsError.style.display = 'none'; }";
						// Apurva H3 VA Issue Validation to check if the feedback contains HTML tags.
                        stylesScript += "  checkFeedbackInputs();";
                        stylesScript += "};";

                        stylesScript += "window.checkFeedbackInputs = function() {";
                        stylesScript += "  var starChecked = document.querySelector('input[name=\"rating\"]:checked');";
                        stylesScript += "  var comments = document.getElementById('feedbackComments').value.trim();";
                        stylesScript += "  var btn = document.getElementById('submitFeedback');";
                        stylesScript += "  var enabled = (starChecked !== null);";
                        stylesScript += "  btn.disabled = !enabled;";
                        stylesScript += "  btn.style.color = enabled ? '#255BE3' : '#b0b0b0';";
                        stylesScript += "};";

                        stylesScript += "window.submitFeedback = function() {";
                        stylesScript += "  var checked = document.querySelector('input[name=\"rating\"]:checked');";
                        stylesScript += "  var starRating = checked ? parseInt(checked.value) : 0;";
						// Apurva H3 VA Issue Validation to check if the feedback contains HTML tags.
						// stylesScript += "  if (checked) checked.checked = false;";
						// Apurva H3 VA Issue Validation to check if the feedback contains HTML tags.
                        stylesScript += "  var feedbackToBeSent = document.getElementById('feedbackComments').value.trim();";
                        stylesScript += "console.log(feedbackToBeSent);";
						// Apurva H3 VA Issue Validation to check if the feedback contains HTML tags.
						stylesScript += " var commentsError = document.getElementById('feedbackCommentsError');";
						stylesScript += " if (window.containsHtmlTag(feedbackToBeSent)) {";
						stylesScript += " if (commentsError) { commentsError.style.display = 'block'; }";
						stylesScript += " return;";
						stylesScript += " }";
						stylesScript += " if (commentsError) { commentsError.style.display = 'none'; }";
						stylesScript += " if (checked) checked.checked = false;";
						// Apurva H3 VA Issue Validation to check if the feedback contains HTML tags.
                        stylesScript += "  document.getElementById('feedbackComments').value = '';";
                        stylesScript += "  checkFeedbackInputs();";
                        stylesScript += "  showFeedbackLoader();";
                        stylesScript += "  try {";
                        //Vishal User Feedback.
                        stylesScript += "var rConfig = JSON.parse('{}');"
                        stylesScript += "rConfig['context'] = \'/" + filePath + "\';"
                        stylesScript += "var entryPointRequire = require.config(rConfig);"
                        stylesScript += "entryPointRequire([\'/" + filePath + "\'], function(custommodule){";
                        stylesScript += "custommodule.submitUserFeedback(" + sessionuserId + ", feedbackToBeSent, starRating);";
                        stylesScript += "hideFeedbackLoader();";
                        stylesScript += "  closePopup();";
                        stylesScript += "});";
                        //Vishal User Feedback.
                        stylesScript += " } catch(e){ console.log('Error in submitting feedback:', e); }";
                        stylesScript += "  console.log('Form cleared!');";
                        stylesScript += "};";

                        stylesScript += "document.querySelectorAll('input[name=\"rating\"]').forEach(function(input){ input.addEventListener('change', checkFeedbackInputs); });";
						// Apurva H3 VA Issue Validation to check if the feedback contains HTML tags.
						//stylesScript += "document.getElementById('feedbackComments').addEventListener('input', checkFeedbackInputs);";
						stylesScript += "document.getElementById('feedbackComments').addEventListener('input', function(){";
						stylesScript += " checkFeedbackInputs();";
						stylesScript += " var commentsError = document.getElementById('feedbackCommentsError');";
						stylesScript += " if (commentsError && !window.containsHtmlTag(this.value)) { commentsError.style.display = 'none'; }";
						stylesScript += "});";
						// Apurva H3 VA Issue Validation to check if the feedback contains HTML tags.
                        stylesScript += " document.getElementById('submitFeedback').addEventListener('click', submitFeedback);"

                        stylesScript += "window.addEventListener('DOMContentLoaded', function(){";
                        stylesScript += "  try { var showUserFeedback = " + (showUserFeedback ? "true" : "false") + ";";
                        stylesScript += "  if(showUserFeedback){ setTimeout(function(){ var popup=document.getElementById('myPopup'); if(popup && !popup.classList.contains('show')){ resetFeedbackForm(); popup.classList.add('show'); document.getElementById('popupOverlay').classList.add('show'); } }, 800); } } catch(e){}";
                        stylesScript += "});";

                        stylesScript += "</script>";
                        stylesScript += "</div>"; // popuptext
                        stylesScript += "</div>"; // popup

                        stylesUserFeedback.defaultValue = stylesScript;

                        //user feedback popup code ends here
                        // Apurva User Feedback and User Guide changes.



                        var idleTime = form.addField({
                            id: 'custpage_idle_time',
                            type: serverWidget.FieldType.INLINEHTML,
                            label: "Idle Time"
                        });

                        var htmlIdle = "";
                        htmlIdle += "<!DOCTYPE html>"
                        htmlIdle += "<html lang='en'>"
                        htmlIdle += "<head>"
                        htmlIdle += "<meta charset='UTF-8'>"
                        htmlIdle += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
                        htmlIdle += "<script>"
                        htmlIdle += "var timer, currSeconds = 0; function resetTimer() { clearInterval(timer); currSeconds = 0; timer = setInterval(startIdleTimer, 1800000); } window.onmousemove = resetTimer; window.onmousedown = resetTimer;  window.ontouchstart = resetTimer; window.onclick = resetTimer; window.onkeypress = resetTimer;  function startIdleTimer() { currSeconds++;  logout (); document.getElementById('idleoverlay').style.display = 'block'; }";
                        htmlIdle += "function logout() {";
                        htmlIdle += "var rConfig = JSON.parse('{}');"
                        htmlIdle += "rConfig['context'] = \'/" + filePath + "\';"
                        htmlIdle += "var entryPointRequire = require.config(rConfig);"
                        htmlIdle += "entryPointRequire([\'/" + filePath + "\'], function(custommodule){"
                        htmlIdle += "custommodule.logout(" + sessionuserId + ");"
                        htmlIdle += "});"
                        htmlIdle += "}";
                        htmlIdle += "function login() {";
                        htmlIdle += "var rConfig = JSON.parse('{}');"
                        htmlIdle += "rConfig['context'] = \'/" + filePath + "\';"
                        htmlIdle += "var entryPointRequire = require.config(rConfig);"
                        htmlIdle += "entryPointRequire([\'/" + filePath + "\'], function(custommodule){"
                        htmlIdle += "custommodule.login();"
                        htmlIdle += "});"
                        htmlIdle += "}";
                        htmlIdle += "</script>"
                        htmlIdle += "</head>"
                        htmlIdle += "<body style='font-family: Arial, sans-serif;'>";
                        htmlIdle += "<div style='display: none; position: fixed; z-index: 1002; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5);' id='idleoverlay'>";
                        htmlIdle += "<div style='position: absolute; top: 50%; left: 50%; display: flex; flex-direction: column; transform: translate(-50%, -50%); background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); border-top: 3px solid #ab0f0f; z-index: 10000; max-width: 80%; max-height: 80%; overflow-y: auto;' class='popup'>";
                        htmlIdle += "<h5 style='font-size: 18px; color: #19232e; margin: 0px'>Action Required: Citi Integrator Login</h5>";
                        htmlIdle += "<hr style='margin: 10px 0; border: none; border-top: 1px solid #ccc;'>";
                        htmlIdle += "<p style='font-weight: bold; margin-bottom: 35px;'>Your session has expired. Please login to continue using Citi Integrator.</p>";
                        htmlIdle += "<div style='margin-top: auto; align-self: flex-end;' class='button-container'>";
                        htmlIdle += "<a style='background-color: #ab0f0f; color: #fff; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px;' class='report-button' onclick='login();'>Log In</a>";
                        htmlIdle += "</div>";
                        htmlIdle += "</div>";
                        htmlIdle += "</div>";
                        htmlIdle += "</body>";
                        htmlIdle += "</html>"

                        idleTime.defaultValue = htmlIdle;
                        //FDIC Logo changes
                        var fdicLogo = file.load({
                            id: '../Images/fdicLogo.png'
                        });
                        var fdicLogoPath = fdicLogo.url;
                        //FDIC Logo changes

                        //Citi logo changes
                        var citiLogo = file.load({
                            id: '../Images/citiLogo.svg'
                        });
                        var citiLogoPath = citiLogo.url;
                        //Citi logo changes

                        var businessCodeFlag = form.addField({
                            id: 'custpage_overlap_titel',
                            type: serverWidget.FieldType.INLINEHTML,
                            label: "Business Code"
                        });
                        var businessCodeEnc = busiCode.substring(busiCode.length - 4, busiCode.length)
                        //log.debug("entitlements", entitlements)
                        //Facelift changes start
                        //logo removal changes
                        if (entitlements.indexOf('INTERNAL_TRANSFERS') != -1 && wireFilter == "INTERNAL_TRANSFERS") {
                            businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function foreignWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function domesticWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.domesticWire();}) }; function paymentStatus() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src=' + citiLogoPath + ' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv);var newDiv1 = jQuery("<div><a id=\'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 243px; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payments & Transfers</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 80px; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Accounts Dashboard</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); var newDiv8 = jQuery("<div> <span><img src=' + fdicLogoPath + ' id=\'citiLogo\' style=\'position: absolute;top: 163px; z-index: 1;\'></img> </span></div>"); container.prepend(newDiv8); </script></div>'

                            // if(entitlements.indexOf('DOMESTIC_WIRES') != -1 && entitlements.indexOf('FOREIGN_WIRES') != -1  ){
                            //                        //FDIC Logo changes
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function foreignWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function domesticWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.domesticWire();}) }; function paymentStatus() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv);var newDiv1 = jQuery("<div><a id=\'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 151px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 80px; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id= \'foreignWireButton\' style=\'background-color: #e4e4e4; position: absolute; right: 284px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'foreignWire()\'>Foreign Wire</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id= \'domesticWireButton\' style=\'background-color: #e4e4e4; position: absolute; right: 402px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'domesticWire()\'>Domestic Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); var newDiv8 = jQuery("<div> <span><img src='+fdicLogoPath+' id=\'citiLogo\' style=\'position: absolute;top: 163px; z-index: 1;\'></img> </span></div>"); container.prepend(newDiv8); </script></div>'
                            //   //FDIC Logo changes
                            //                      }else if(entitlements.indexOf('DOMESTIC_WIRES') != -1){
                            //                        //FDIC Logo changes
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function foreignWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function domesticWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.domesticWire();}) }; function paymentStatus() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id=\'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 151px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 80px; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id= \'foreignWireButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 284px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'foreignWire()\'>Foreign Wire</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id= \'domesticWireButton\' style=\'background-color: #e4e4e4; position: absolute; right: 284px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'domesticWire()\'>Domestic Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); var newDiv8 = jQuery("<div> <span><img src='+fdicLogoPath+' id=\'citiLogo\' style=\'position: absolute;top: 163px; z-index: 1;\'></img> </span></div>"); container.prepend(newDiv8); </script></div>'
                            //                        //FDIC Logo changes
                            // }else if(entitlements.indexOf('FOREIGN_WIRES') != -1){
                            //                        //FDIC Logo changes
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function foreignWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function domesticWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.domesticWire();}) }; function paymentStatus() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id=\'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 151px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 80px; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id= \'foreignWireButton\' style=\'background-color: #e4e4e4; position: absolute; right: 284px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'foreignWire()\'>Foreign Wire</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id= \'domesticWireButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 402px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'domesticWire()\'>Domestic Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); var newDiv8 = jQuery("<div> <span><img src='+fdicLogoPath+' id=\'citiLogo\' style=\'position: absolute;top: 163px; z-index: 1;\'></img> </span></div>"); container.prepend(newDiv8); </script></div>'
                            //                        //FDIC Logo changes
                            // }else{
                            //                        //FDIC Logo changes
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function foreignWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function domesticWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.domesticWire();}) }; function paymentStatus() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id=\'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 151px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 80px; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id= \'foreignWireButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 284px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'foreignWire()\'>Foreign Wire</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id= \'domesticWireButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 402px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'domesticWire()\'>Domestic Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); var newDiv8 = jQuery("<div> <span><img src='+fdicLogoPath+' id=\'citiLogo\' style=\'position: absolute;top: 209px; z-index: 1;\'></img> </span></div>"); container.prepend(newDiv8);</script></div>'
                            //                        //FDIC Logo changes
                            // }
                        } else if (entitlements.indexOf('DOMESTIC_WIRES') != -1 && wireFilter == "DOMESTIC_WIRES") {
                            businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function foreignWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function domesticWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.domesticWire();}) }; function paymentStatus() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src=' + citiLogoPath + ' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv);var newDiv1 = jQuery("<div><a id=\'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 243px; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payments & Transfers</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 80px; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Accounts Dashboard</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7);</script></div>'

                            // if(entitlements.indexOf('INTERNAL_TRANSFERS') != -1 && entitlements.indexOf('FOREIGN_WIRES') != -1  ){
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function internalTransfer() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.internalTransfer();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function foreignWire() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function paymentStatus() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 145px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 77px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id= \'internalTransferButton\' style=\'background-color: #e4e4e4; position: absolute; right: 385px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'internalTransfer()\'>Internal Transfer</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id= \'foreignWireButton\' style=\'background-color: #e4e4e4; position: absolute; right: 275px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'foreignWire()\'>Foreign Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); </script></div>'

                            // }else if(entitlements.indexOf('INTERNAL_TRANSFERS') != -1){
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function internalTransfer() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.internalTransfer();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function foreignWire() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function paymentStatus() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 145px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 77px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id= \'internalTransferButton\' style=\'background-color: #e4e4e4; position: absolute; right: 275px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'internalTransfer()\'>Internal Transfer</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id= \'foreignWireButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 275px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'foreignWire()\'>Foreign Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); </script></div>'

                            // }else if(entitlements.indexOf('FOREIGN_WIRES') != -1){
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function internalTransfer() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.internalTransfer();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function foreignWire() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function paymentStatus() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 145px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 77px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id= \'internalTransferButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 385px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'internalTransfer()\'>Internal Transfer</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id= \'foreignWireButton\' style=\'background-color: #e4e4e4; position: absolute; right: 275px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'foreignWire()\'>Foreign Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); </script></div>'

                            // }else{
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function internalTransfer() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.internalTransfer();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function foreignWire() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function paymentStatus() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 145px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 77px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id= \'internalTransferButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 385px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'internalTransfer()\'>Internal Transfer</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id= \'foreignWireButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 275px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'foreignWire()\'>Foreign Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); </script></div>'

                            // }
                        }
                        else if (entitlements.indexOf('REAL_TIME_PAYMENTS') != -1 && wireFilter == "REAL_TIME_PAYMENTS") { //rutuja start
                            businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function foreignWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function domesticWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.domesticWire();}) }; function paymentStatus() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src=' + citiLogoPath + ' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv);var newDiv1 = jQuery("<div><a id=\'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 243px; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payments & Transfers</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 80px; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Accounts Dashboard</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7);</script></div>'

                            // if(entitlements.indexOf('INTERNAL_TRANSFERS') != -1 && entitlements.indexOf('FOREIGN_WIRES') != -1  ){
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function internalTransfer() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.internalTransfer();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function foreignWire() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function paymentStatus() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 145px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 77px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id= \'internalTransferButton\' style=\'background-color: #e4e4e4; position: absolute; right: 385px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'internalTransfer()\'>Internal Transfer</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id= \'foreignWireButton\' style=\'background-color: #e4e4e4; position: absolute; right: 275px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'foreignWire()\'>Foreign Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); </script></div>'

                            // }else if(entitlements.indexOf('INTERNAL_TRANSFERS') != -1){
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function internalTransfer() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.internalTransfer();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function foreignWire() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function paymentStatus() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 145px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 77px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id= \'internalTransferButton\' style=\'background-color: #e4e4e4; position: absolute; right: 275px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'internalTransfer()\'>Internal Transfer</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id= \'foreignWireButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 275px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'foreignWire()\'>Foreign Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); </script></div>'

                            // }else if(entitlements.indexOf('FOREIGN_WIRES') != -1){
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function internalTransfer() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.internalTransfer();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function foreignWire() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function paymentStatus() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 145px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 77px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id= \'internalTransferButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 385px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'internalTransfer()\'>Internal Transfer</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id= \'foreignWireButton\' style=\'background-color: #e4e4e4; position: absolute; right: 275px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'foreignWire()\'>Foreign Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); </script></div>'

                            // }else{
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function internalTransfer() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.internalTransfer();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function foreignWire() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function paymentStatus() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 145px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 77px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id= \'internalTransferButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 385px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'internalTransfer()\'>Internal Transfer</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id= \'foreignWireButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 275px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'foreignWire()\'>Foreign Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); </script></div>'

                            // }
                        }
                        //rutuja end
                        else if (entitlements.indexOf('FOREIGN_WIRES') != -1 && wireFilter == "FOREIGN_WIRES") {
                            businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>  document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);}) ;setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function foreignWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.foreignWire();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function domesticWire() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.domesticWire();}) }; function paymentStatus() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src=' + citiLogoPath + ' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv);var newDiv1 = jQuery("<div><a id=\'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 243px; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payments & Transfers</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 80px; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Accounts Dashboard</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7);</script></div>'
                            // if(entitlements.indexOf('INTERNAL_TRANSFERS') != -1 && entitlements.indexOf('DOMESTIC_WIRES') != -1  ){
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script> document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);});setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function internalTransfer() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.internalTransfer();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function domesticWire() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.domesticWire();}) }; function paymentStatus() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) };var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 150px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 79px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id=\'internalTransferButton\' style=\'background-color: #e4e4e4; position: absolute; right: 406px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'internalTransfer()\'>Internal Transfer</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id=\'domesticWireButton\' style=\'background-color: #e4e4e4; position: absolute; right: 281px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'domesticWire()\'>Domestic Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); </script></div>'

                            // }else if(entitlements.indexOf('INTERNAL_TRANSFERS') != -1){
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script> document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);});setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function internalTransfer() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.internalTransfer();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function domesticWire() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.domesticWire();}) }; function paymentStatus() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 150px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 79px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id=\'internalTransferButton\' style=\'background-color: #e4e4e4; position: absolute; right: 281px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'internalTransfer()\'>Internal Transfer</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id=\'domesticWireButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 281px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'domesticWire()\'>Domestic Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); </script></div>'

                            // }else if(entitlements.indexOf('DOMESTIC_WIRES') != -1){
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script> document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);});setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function internalTransfer() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.internalTransfer();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function domesticWire() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.domesticWire();}) }; function paymentStatus() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 150px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 79px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id=\'internalTransferButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 406px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'internalTransfer()\'>Internal Transfer</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id=\'domesticWireButton\' style=\'background-color: #e4e4e4; position: absolute; right: 281px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'domesticWire()\'>Domestic Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); </script></div>'

                            // }else{
                            //   businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script> document.addEventListener(\'DOMContentLoaded\', function() {function handleButtonClick(event) {event.preventDefault();var overlay = document.getElementById(\'overlay\');overlay.style.display = \'flex\';setTimeout(function() {navigateToNextPage();}, 1000);} document.getElementById(\'homeButton\').addEventListener(\'click\', handleButtonClick); document.getElementById(\'paymentStatusButton\').addEventListener(\'click\', handleButtonClick);});setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function internalTransfer() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.internalTransfer();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function domesticWire() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.domesticWire();}) }; function paymentStatus() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.paymentStatus();}) }; function home() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; var newDiv = jQuery("<div> <span><img src='+citiLogoPath+' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'paymentStatusButton\' style=\'background-color: #e4e4e4; position: absolute; right: 150px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'paymentStatus()\'>Payment Status</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 79px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv2); var newDiv4 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv4);  var newDiv5 = jQuery("<div><a id=\'internalTransferButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 406px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'internalTransfer()\'>Internal Transfer</a></div>"); container.prepend(newDiv5); var newDiv6 = jQuery("<div><a id=\'domesticWireButton\' style=\'background-color: #e4e4e4; display: none; position: absolute; right: 281px; top:118px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'domesticWire()\'>Domestic Wire</a></div>"); container.prepend(newDiv6); var newDiv7 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv7); </script></div>'

                            // }
                        }
                        //logo removal changes
                        //Facelift changes end

                        // Vishal Daily Limit.
                        var dailyLimitField = form.addField({
                            id: "custpage_daily_limit",
                            type: serverWidget.FieldType.LONGTEXT,
                            label: 'Daily Limit'
                        }).updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.INLINE,
                        });
                        if (dailyLimit) { dailyLimitField.defaultValue = JSON.stringify(dailyLimit); }
                        // Vishal Daily Limit.

                        var wireType = form.addField({
                            id: "custpage_wire_type",
                            type: serverWidget.FieldType.TEXT,
                            label: "Mode"
                        }).updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN,
                        });

                        wireType.defaultValue = wireFilter;

                        var mode = form.addField({
                            id: "custpage_mode",
                            type: serverWidget.FieldType.TEXT,
                            label: "Wire"
                        }).updateDisplayType({
                            displayType: serverWidget.FieldDisplayType.HIDDEN,
                        });
                        mode.defaultValue = editBtnFlag;

                        var imgObj = file.load({
                            id: '../Images/info-icon.png'
                        });
                        var imgPath = imgObj.url;
                        //	log.debug("wireFilter", wireFilter)

                        // for search image
                        var imgObj_search = file.load({
                            id: '../Images/search.png'
                        });
                        var imgPath_seacrh = imgObj_search.url;

                        if (entitlements.indexOf('DOMESTIC_WIRES') != -1 && wireFilter == 'DOMESTIC_WIRES') {
                            //Domestic Wire

                            var seltemplate = form.addFieldGroup({
                                id: "select_template",
                                label: "Start From Template"
                            });

                            var domestictemplateRequest = {
                                "metadata": {
                                    "userCode": usrCode,
                                    "businessCodeList": [busiCode],
                                    "softwareName": softwareName,
                                    "softwareVersion": softwareVersion,
                                    "vendorId": VENDOR_ID
                                },
                                "businessCode": busiCode,
                                "templateType": "WIRE_TRANSFER_TEMPLATE_SHORT",
                                "templateName": " ",
                                "userId": userId
                            }

                            var responsedomestictemplate = getResponseFromAPI(TEMPLATE_SEARCH, pubKey, accsTkn, pvtKey, domestictemplateRequest);
                            log.debug('responsedomestictemplate', responsedomestictemplate);

                            if (responsedomestictemplate) {
                                responsedomestictemplate = JSON.parse(responsedomestictemplate);
                            }
                            log.debug('responsedomestictemplate452', responsedomestictemplate);
                            var templates = responsedomestictemplate.templates;
                            //log.debug('templates', templates);

                            var templateNames = [];

                            for (var i = 0; i < templates.length; i++) {
                                templateNames.push(templates[i].templateName);
                            }
                            log.debug("templateNames", templateNames);

                            function normalizeData(data) {
                                return data.map(function (item) {
                                    return item.replace(/[']/g, "’").toUpperCase();
                                });
                            }

                            templateNames = normalizeData(templateNames);
                            log.debug("471", templateNames)
                            var scriptField = form.addField({
                                id: 'custpage_template_value',
                                type: serverWidget.FieldType.INLINEHTML,
                                label: 'Call Script Template',
                                container: 'select_template'
                            });


                            var templatestorevalue = form.addField({
                                id: "custpage_template_store_value",
                                type: serverWidget.FieldType.TEXT,
                                label: "Template store value"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });
                            templatestorevalue.defaultValue = storedTemplateName;


                            var selectedItem;
                            var script = "";
                            script += "<!DOCTYPE html>";
                            script += "<html lang='en'>";
                            script += "<head>";
                            script += "<meta charset='UTF-8'>";
                            script += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
                            script += "<title>Search Bar with Dropdown</title>";
                            script += "<script src='https://code.jquery.com/jquery-3.6.0.min.js'></script>";
                            script += "</head>";
                            script += "<body style='font-family: Arial, sans-serif; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f4f4f4;'>";
                            script += "<style>input::placeholder { font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;}</style>"
                            script += "<div style='position: relative; width: 300px; margin: 10px 0 30px 0;'>";
                            script += "<input type='text' id='search-input' placeholder='Search for a template...' autocomplete='off' onkeyup='filterSearch()' style='width: 250px; padding: 5px 5px 5px 35px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; font-family: Open Sans, Helvetica, sans-serif;' />";
                            //script += "<img style='position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px;  background-size: contain; background-repeat: no-repeat;' alt='Search Icon' src=" + imgPath_seacrh + "></img>";
                            script += "<img style='position: absolute; left: 10px; top: 10px; width: 15px; height: 15px;  background-size: contain; background-repeat: no-repeat;' alt='Search Icon' src=" + imgPath_seacrh + "></img>";
                            //script += "<img style='position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; background-image: url(\"https://system.netsuite.com/core/media/media.nl?id=123456&c=YOUR_ACCOUNT_ID&h=f8fb456d3dd742eaefcb\"); background-size: contain; background-repeat: no-repeat;' alt='Search Icon' />";
                            script += "<ul id='dropdown' style='position: absolute; top: 100%; left: 0; width: 250px; background-color: white; border: 1px solid #ccc; border-top: none; max-height: 200px; overflow-y: auto; margin: 0; z-index: 9999; padding: 0; list-style-type: none; display: none;'>";
                            script += "</ul>";
                            script += "<div id='no-results' style='font-size: 14px; color: #888; margin-top: 5px; display: none;'>No Results Found</div>";
                            script += "</div>";

                            script += "<script>";
                            script += "var selectedItem = '';";
                            script += "var data = [";


                            for (var i = 0; i < templateNames.length; i++) {
                                script += "'" + templateNames[i] + "'";
                                if (i < templateNames.length - 1) {
                                    script += ",";
                                }
                            }

                            script += "];";

                            script += "document.addEventListener('click', function(event) {";
                            script += "  var dropdown = document.getElementById('dropdown');";
                            script += "  var input = document.getElementById('search-input');";
                            script += "  var noResultsMessage = document.getElementById('no-results');";
                            script += "  if (!dropdown.contains(event.target) && event.target !== input) {";
                            script += "    dropdown.style.display = 'none';";
                            script += "    noResultsMessage.style.display = 'none';";
                            script += "  }";
                            script += "});";

                            script += "function filterSearch() {";
                            script += "  var input = document.getElementById('search-input');";
                            script += "  var filter = input.value.toLowerCase();";
                            script += "  var dropdown = document.getElementById('dropdown');";
                            script += "  var selectedItem = localStorage.getItem('selectedItem');";
                            script += "  var noResultsMessage = document.getElementById('no-results');";
                            script += "  if (filter.length < 3) {";
                            script += "    dropdown.style.display = 'none';";
                            script += "        noResultsMessage.style.display = 'none';"
                            script += "    return;";
                            script += "  }";

                            script += "  var filteredData = data.filter(item => item.toLowerCase().includes(filter));";
                            script += "  dropdown.innerHTML = '';";
                            script += "  if (filteredData.length > 0) {";
                            script += "    filteredData.forEach(item => {";
                            script += "      var li = document.createElement('li');";
                            script += "      li.textContent = item;";
                            script += "      li.style.padding = '10px';";
                            script += "      li.style.cursor = 'pointer';";
                            script += "      li.onmouseover = function () { li.style.backgroundColor = '#ddd'; };";
                            script += "      li.onmouseout = function () { li.style.backgroundColor = ''; };";
                            script += "      li.onclick = () => {";

                            script += "        input.value = item;";
                            script += "        selectedItem = item;";
                            script += "        dropdown.style.display = 'none';";
                            script += "        noResultsMessage.style.display = 'none';"

                            script += "        sendSelectedItemToSuitelet(selectedItem);";

                            script += "        console.log('Selected Item:', selectedItem);"; // 
                            //script += "        localStorage.setItem('TestTemplatename', selectedItem);";
                            script += "        selectedItem = item;";
                            //script = '<script> function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; var container = jQuery(".uir-page-title"); var newDiv = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:25px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv);</script></div>'



                            script += "  var rConfig = JSON.parse('{}');";
                            script += "  rConfig['context'] = '/" + filePath + "';";
                            script += "  var entryPointRequire = require.config(rConfig);";
                            script += "  entryPointRequire(['/' + '" + filePath + "'], function(custommodule) {";
                            script += "    custommodule.getTemplate(selectedItem);";
                            script += "  });";
                            script += "      };";
                            script += "      dropdown.appendChild(li);";
                            script += "    });";
                            script += "    dropdown.style.display = 'block';";
                            script += "        noResultsMessage.style.display = 'none';"
                            script += "  } else {";
                            script += "    dropdown.style.display = 'none';";
                            script += "     noResultsMessage.style.display = 'block';"
                            script += "  }";
                            script += "}";

                            script += "function sendSelectedItemToSuitelet(selectedItem) {";
                            script += "  $.ajax({";
                            script += "    url: window.location.href + '?selected_item=' + encodeURIComponent(selectedItem),";
                            script += "    type: 'GET',";
                            script += "    success: function(response) {";
                            script += "      console.log('Selected item sent to Suitelet:', selectedItem);";
                            script += "    },";
                            script += "    error: function(xhr, status, error) {";
                            script += "      console.log('Error sending selected item:', error);";
                            script += "    }";
                            script += "  });";
                            script += "}";

                            script += "</script>";
                            script += "</body>";
                            script += "</html>";


                            scriptField.defaultValue = script;
                            //	for template details
                            if (storedTemplateName) {
                                storedTemplateName = storedTemplateName.replace("’", "'");
                                var domestictemplatedetailsRequest = {
                                    "metadata": {
                                        "userCode": usrCode,
                                        "businessCodeList": [busiCode],
                                        "softwareName": softwareName,
                                        "softwareVersion": softwareVersion,
                                        "vendorId": VENDOR_ID
                                    },
                                    "businessCode": busiCode,
                                    "templateType": "WIRE_TRANSFER_TEMPLATE_SHORT",
                                    "templateName": storedTemplateName,
                                    "userId": userId
                                }

                                var responsedomesticdetailstemplate = getResponseFromAPI(TEMPLATE_DETAIL, pubKey, accsTkn, pvtKey, domestictemplatedetailsRequest);



                                if (responsedomesticdetailstemplate) {
                                    responsedomesticdetailstemplate = JSON.parse(responsedomesticdetailstemplate);
                                }
                                log.debug("responsedomesticdetailstemplate614", responsedomesticdetailstemplate);
                                var templateencyNumber = responsedomesticdetailstemplate.encryptedAccountIdentifier;
                                //  log.debug("templateencyNumber616,",templateencyNumber);
                                var template_details = responsedomesticdetailstemplate.templateDetails;
                                //log.debug('template_details', template_details);
                                if (template_details) {
                                    var benificiary_name = template_details.beneficiaryName;
                                    if (benificiary_name) {
                                        benificiary_name = removeAccents(benificiary_name);
                                        log.debug("642", benificiary_name);
                                    }
                                    var benificiary_acctno = template_details.beneficiaryAccountNumber;
                                    var benificiary_phone = template_details.beneficiaryPhone;
                                    var benificiary_addr1 = template_details.beneficiaryAddress1;
                                    if (benificiary_addr1) {
                                        benificiary_addr1 = removeAccents(benificiary_addr1);
                                        log.debug("660", benificiary_addr1);
                                    }
                                    var benificiary_addr2 = template_details.beneficiaryAddress2;
                                    if (benificiary_addr2) {
                                        benificiary_addr2 = removeAccents(benificiary_addr2);
                                        log.debug("665", benificiary_addr2);
                                    }
                                    var benificiary_addr3 = template_details.beneficiaryAddress3;
                                    if (benificiary_addr3) {
                                        benificiary_addr3 = removeAccents(benificiary_addr3);
                                        log.debug("670", benificiary_addr3);
                                    }
                                    var special_inst1 = template_details.specialInstructions1;
                                    if (special_inst1) {
                                        special_inst1 = removeAccents(special_inst1);
                                        log.debug("676", special_inst1);
                                    }
                                    var special_inst2 = template_details.specialInstructions2;
                                    if (special_inst2) {
                                        special_inst2 = removeAccents(special_inst2);
                                        log.debug("681", special_inst2);
                                    }
                                    var special_inst3 = template_details.specialInstructions3;
                                    if (special_inst3) {
                                        special_inst3 = removeAccents(special_inst3);
                                        log.debug("686", special_inst3);
                                    }
                                    var recvBankABA = template_details.recvBankABA;
                                    var bankingRoutingNumberABA = template_details.bankingRoutingNumberABA;
                                    var payAmount = template_details.payAmount;
                                    var domestic_bankaddress = template_details.branchAddress;
                                    if (domestic_bankaddress) {
                                        domestic_bankaddress = removeAccents(domestic_bankaddress);
                                        log.debug("693", domestic_bankaddress);
                                    }

                                    var domestic_bankcity = template_details.bankCity;
                                    if (domestic_bankcity) {
                                        domestic_bankcity = removeAccents(domestic_bankcity);
                                        log.debug("699", domestic_bankcity);
                                    }
                                    var domestic_bankstate = template_details.bankState;

                                    if (domestic_bankstate) {
                                        domestic_bankstate = removeAccents(domestic_bankstate);
                                        log.debug("706", domestic_bankstate);
                                    }
                                    var domestic_businessName = template_details.businessName;
                                    var dom_payFromAccountNumber = template_details.payFromAccountNumber;
                                    var dom_beneficiaryBankName = template_details.beneficiaryBankName;
                                    if (dom_beneficiaryBankName) {
                                        dom_beneficiaryBankName = removeAccents(dom_beneficiaryBankName);
                                        log.debug("712", dom_beneficiaryBankName);
                                    }
                                    var intermediaryAccountNumber = template_details.intermediaryAccountNumber;
                                }

                            }

                            var list = form.addSublist({
                                id: "custpage_dom_transfer_from",
                                type: serverWidget.SublistType.LIST,
                                label: "Transfer From"
                            });

                            var selectField = list.addField({
                                id: "custlist_dom_select_account",
                                type: serverWidget.FieldType.RADIO,
                                label: "Select Account"
                            });
                            var accountNumber = list.addField({
                                id: "custlist_dom_account_number",
                                type: serverWidget.FieldType.TEXT,
                                label: "Account Number"
                            });
                            var encryptedAccountNumber = list.addField({
                                id: "custlist_dom_ency_acc_num_from",
                                type: serverWidget.FieldType.TEXT,
                                label: "Encrypted Account Number"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });
                            var accountType = list.addField({
                                id: "custlist_dom_account_type",
                                type: serverWidget.FieldType.TEXT,
                                label: "Account Type"
                            });
                            var currentAvailabeDisplay = list.addField({
                                id: "custlist_dom_display_current_available",
                                type: serverWidget.FieldType.TEXT,
                                label: "Current Available(USD)"
                            });
                            var currentAvailabe = list.addField({
                                id: "custlist_dom_current_available",
                                type: serverWidget.FieldType.FLOAT,
                                label: "Current Available(USD)"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });

                            var lineCount = 0;

                            for (var i = 0; i < accountDetails.length; i++) {
                                if (checkForEntitlementType(accountDetails[i].entitlements, wireFilter) && (NSAccounts.indexOf(accountDetails[i].encryptedAccountIdentifier) != -1)) {
                                    list.setSublistValue({
                                        id: "custlist_dom_account_number",
                                        line: lineCount,
                                        value: accountDetails[i].displayableAccountNumber
                                    });
                                    if (accountDetails[i].encryptedAccountIdentifier || templateencyNumber) {
                                        list.setSublistValue({
                                            id: "custlist_dom_ency_acc_num_from",
                                            line: lineCount,
                                            value: accountDetails[i].encryptedAccountIdentifier || templateencyNumber
                                        });
                                    }
                                    list.setSublistValue({
                                        id: "custlist_dom_account_type",
                                        line: lineCount,
                                        value: accountDetails[i].accountTypeLabel
                                    });
                                    list.setSublistValue({
                                        id: "custlist_dom_display_current_available",
                                        line: lineCount,
                                        value: formatAmount(accountDetails[i].currentAvailableAmount)
                                    });
                                    list.setSublistValue({
                                        id: "custlist_dom_current_available",
                                        line: lineCount,
                                        value: Number(accountDetails[i].currentAvailableAmount).toFixed(2)
                                    });
                                    //if (paramData && editBtnFlag && accountDetails[i].displayableAccountNumber == paramData.accountNumberFrom) {
                                    if (dom_payFromAccountNumber == accountDetails[i].displayableAccountNumber) {
                                        //log.debug("15test");
                                        list.setSublistValue({
                                            id: "custlist_dom_select_account",
                                            line: lineCount,
                                            value: "T"
                                        });
                                    } else {
                                        //	log.debug("89test");
                                        list.setSublistValue({
                                            id: "custlist_dom_select_account",
                                            line: lineCount,
                                            value: "F"
                                        });
                                    }
                                    if (paramData && editBtnFlag && accountDetails[i].displayableAccountNumber == paramData.accountNumberFrom) {
                                        // log.debug("730sd")
                                        list.setSublistValue({
                                            id: "custlist_dom_select_account",
                                            line: lineCount,
                                            value: "T"
                                        });
                                    }
                                    //}



                                    lineCount++;
                                }
                            }

                            var wireTo = form.addFieldGroup({
                                id: "wire_to",
                                label: "Wire To"
                            });

                            var wireToCountryHTML = form.addField({
                                id: "custpage_dom_country_html",
                                type: serverWidget.FieldType.INLINEHTML,
                                label: "Destination Country Desc",
                                container: "wire_to"
                            });
                            wireToCountryHTML.updateLayoutType({
                                layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
                            });
                            wireToCountryHTML.defaultValue = "<h4>Always verify new or updated payment instructions and beneficiary account information with a phone call to a trusted source before sending a wire transfer.</h4>";

                            var beneficiary = form.addField({
                                id: "custpage_dom_beneficiary_name",
                                type: serverWidget.FieldType.TEXT,
                                label: "Beneficiary Name",
                                container: "wire_to"
                            });
                            if (benificiary_name) {
                                beneficiary.defaultValue = benificiary_name;
                            }

                            beneficiary.isMandatory = true;
                            beneficiary.maxLength = 34;
                            if (paramData && editBtnFlag && paramData.beneficiaryName) {
                                beneficiary.defaultValue = paramData.beneficiaryName;
                            }

                            var accountNumber = form.addField({
                                id: "custpage_dom_account_number",
                                type: serverWidget.FieldType.TEXT,
                                label: "Account Number",
                                container: "wire_to"
                            });
                            if (benificiary_acctno) {
                                accountNumber.defaultValue = benificiary_acctno;
                            }
                            accountNumber.isMandatory = true;
                            accountNumber.maxLength = 30;
                            if (paramData && editBtnFlag && paramData.beneficiaryAccountNumber) {
                                accountNumber.defaultValue = paramData.beneficiaryAccountNumber;
                            }

                            var phoneNumber = form.addField({
                                id: "custpage_dom_phone_number",
                                type: serverWidget.FieldType.TEXT,
                                label: "Phone Number",
                                container: "wire_to"
                            });
                            if (benificiary_phone) {
                                phoneNumber.defaultValue = benificiary_phone;
                            }
                            phoneNumber.maxLength = 20;
                            if (paramData && editBtnFlag && paramData.phoneNumber) {
                                phoneNumber.defaultValue = paramData.phoneNumber;
                            }

                            var address1 = form.addField({
                                id: "custpage_dom_address_one",
                                type: serverWidget.FieldType.TEXT,
                                label: "Address",
                                container: "wire_to"
                            }).updateBreakType({
                                breakType: serverWidget.FieldBreakType.STARTCOL
                            });
                            log.debug("benificiary_addr1", benificiary_addr1);
                            if (benificiary_addr1 && benificiary_addr1.length <= 33) {
                                address1.defaultValue = benificiary_addr1;
                            }
                            else
                                address1.defaultValue = '';
                           // address1.maxLength = 35;
                            address1.maxLength = 33;  // Umar has updated it on 20th July 2026
                            if (paramData && editBtnFlag && paramData.address1) {
                                address1.defaultValue = paramData.address1;
                            }
                            var address2 = form.addField({
                                id: "custpage_dom_address_two",
                                type: serverWidget.FieldType.TEXT,
                                label: " ",
                                container: "wire_to"
                            });
                            log.debug("benificiary_addr2", benificiary_addr2);
                            
                            if (benificiary_addr2 && benificiary_addr2.length <= 33) {
                                address2.defaultValue = benificiary_addr2;
                                log.debug("benificiary_addr2.length", benificiary_addr2.length);
                            }
                            else
                                address2.defaultValue = '';
                            //address2.maxLength = 35;
                            address2.maxLength = 33;  // Umar has updated it on 20th July 2026
                            if (paramData && editBtnFlag && paramData.address2) {
                                address2.defaultValue = paramData.address2;
                            }
                            var address3 = form.addField({ //rutuja changed the address line 3 to city
                                id: "custpage_dom_city",
                                type: serverWidget.FieldType.TEXT,
                                label: "City",
                                container: "wire_to"
                            });
                            log.debug("benificiary_addr3", benificiary_addr3);
                            if (benificiary_addr3 && benificiary_addr3.length <= 30) {
                                address3.defaultValue = benificiary_addr3;
                            }
                            else
                                address3.defaultValue = '';
                             // address3.maxLength = 35;
                            address3.maxLength = 30; //Umar Has Updated it on 20th July 2026
                            if (paramData && editBtnFlag && paramData.address3) {
                                address3.defaultValue = paramData.address3;
                            }
                            //Start - Umar has Updated this code on 15th July 2026 For Domestic Wire
                            if ((benificiary_addr1 && benificiary_addr1.length > 33) || (benificiary_addr2 && benificiary_addr2.length > 33) || (benificiary_addr3 && benificiary_addr3.length > 30)) {
                                var address1HTML = form.addField({
                                    id: "custpage_dom_address_one_html",
                                    type: serverWidget.FieldType.INLINEHTML,
                                    label: "Address One Description For Dom",
                                    container: "wire_to"
                                });

                                var addr1detailsDom = ""
                                addr1detailsDom += "<div id='custpage_dom_address_one_html' style='background-color: #4f6f90; display: flex; padding: 8px; margin-top: 16px; text-align: left; color: #ffffff; font-size: 18px; font-family: Arial, sans-serif; width: 80%;'>"
                                addr1detailsDom += "<div style='margin-top: 7px;'>"
                                addr1detailsDom += "<span>"
                                addr1detailsDom += "<img style='height: 20px; margin-right: 8px; width: 20px' src=" + imgPath + "></img>"
                                addr1detailsDom += "</span>"
                                addr1detailsDom += "</div>"
                                addr1detailsDom += "<div>"
                                addr1detailsDom += "<p id='custpage_dom_address_one_details_html' style='margin: 0; font: 400 14px/1.5 sans-serif; margin-top: 4px !important;'>The beneficiary address field has been reset. Providing an address is optional, but it must be in ISO format if entered.<br>"+benificiary_addr1+"<br>"+benificiary_addr2+"<br>"+benificiary_addr3+"</p>"//Umar has removed the keys such as addr1,addr2 and city as per Shikha's suggestion on 31st August 2026.
                                addr1detailsDom += "</div>"
                                addr1detailsDom += "</div>"
                                address1HTML.defaultValue = addr1detailsDom;
                            }
                            //End - Umar has Updated this code on 15th July 2026
                            var special_instructions1 = form.addField({
                                id: "custpage_dom_spec_instr_one",
                                type: serverWidget.FieldType.TEXT,
                                label: "Special Instructions (35 Characters per line)",
                                container: "wire_to"
                            }).updateBreakType({
                                breakType: serverWidget.FieldBreakType.STARTCOL
                            });
                            if (special_inst1) {
                                special_instructions1.defaultValue = special_inst1;
                            }
                            special_instructions1.maxLength = 35;
                            if (paramData && editBtnFlag && paramData.specialInstructions1) {
                                special_instructions1.defaultValue = paramData.specialInstructions1;
                            }

                            var special_instructions2 = form.addField({
                                id: "custpage_dom_spec_instr_two",
                                type: serverWidget.FieldType.TEXT,
                                label: " ",
                                container: "wire_to"
                            });
                            if (special_inst2) {
                                special_instructions2.defaultValue = special_inst2;
                            }
                            special_instructions2.maxLength = 35;
                            if (paramData && editBtnFlag && paramData.specialInstructions2) {
                                special_instructions2.defaultValue = paramData.specialInstructions2;
                            }

                            var special_instructions3 = form.addField({
                                id: "custpage_dom_spec_instr_three",
                                type: serverWidget.FieldType.TEXT,
                                label: "  ",
                                container: "wire_to"
                            });
                            if (special_inst3) {
                                special_instructions3.defaultValue = special_inst3;
                            }
                            special_instructions3.maxLength = 35;
                            if (paramData && editBtnFlag && paramData.specialInstructions3) {
                                special_instructions3.defaultValue = paramData.specialInstructions3;
                            }

                            var usBankOrInterBank = form.addFieldGroup({
                                id: "us_bank_or_inter_bank",
                                label: "Bank Details"
                            });

                            var usBank = form.addField({
                                id: "custpage_dom_us_credit_inter_bank",
                                source: "us_bank",
                                type: serverWidget.FieldType.RADIO,
                                label: "US Bank or Credit Union",
                                container: "us_bank_or_inter_bank"
                            });
                            usBank.updateLayoutType({
                                layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
                            });
                            var interBank = form.addField({
                                id: "custpage_dom_us_credit_inter_bank",
                                source: "inter_bank",
                                type: serverWidget.FieldType.RADIO,
                                label: "Intermediary Bank",
                                container: "us_bank_or_inter_bank"
                            });
                            interBank.updateLayoutType({
                                layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
                            });
                            if (paramData && editBtnFlag && paramData.usCreditInterBank) {
                                form.updateDefaultValues({
                                    values: {
                                        custpage_dom_us_credit_inter_bank: paramData.usCreditInterBank
                                    }
                                });
                            } else {
                                if (recvBankABA) {
                                    form.updateDefaultValues({
                                        values: {
                                            custpage_dom_us_credit_inter_bank: 'inter_bank'
                                        }
                                    });
                                }
                                if (bankingRoutingNumberABA) {
                                    form.updateDefaultValues({
                                        values: {
                                            custpage_dom_us_credit_inter_bank: 'us_bank'
                                        }
                                    });
                                }

                            }

                            var bankRoutingNumber = form.addField({
                                id: "custpage_bank_routing_number",
                                type: serverWidget.FieldType.TEXT,
                                label: "Bank Routing Number (ABA)",
                                container: "us_bank_or_inter_bank"
                            });
                            //log.debug("recvBankABA",recvBankABA);
                            //log.debug("bankingRoutingNumberABA",bankingRoutingNumberABA);
                            if (bankingRoutingNumberABA) {
                                bankRoutingNumber.defaultValue = bankingRoutingNumberABA;
                            }

                            var interBankRoutingNumber = form.addField({
                                id: "custpage_inter_bank_routing_number",
                                type: serverWidget.FieldType.TEXT,
                                label: "Intermediary Bank Routing Number",
                                container: "us_bank_or_inter_bank"
                            });
                            if (recvBankABA) {
                                interBankRoutingNumber.defaultValue = recvBankABA;
                            }

                            var destBankName = form.addField({
                                id: "custpage_dom_dest_bank_name_hidden",
                                type: serverWidget.FieldType.TEXT,
                                label: "Bank Details",
                                container: "us_bank_or_inter_bank"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });

                            var destBankState = form.addField({
                                id: "custpage_dom_dest_bank_state_hidden",
                                type: serverWidget.FieldType.TEXT,
                                label: "Bank Details",
                                container: "us_bank_or_inter_bank"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });

                            var destBankAddr = form.addField({
                                id: "custpage_dom_dest_bank_addr_hidden",
                                type: serverWidget.FieldType.TEXT,
                                label: "Bank Details",
                                container: "us_bank_or_inter_bank"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });

                            if (paramData && editBtnFlag && paramData.routingCode) {
                                if (paramData.usCreditInterBank == "inter_bank") {
                                    interBankRoutingNumber.defaultValue = paramData.routingCode;
                                } else {
                                    bankRoutingNumber.defaultValue = paramData.routingCode;
                                }
                            }

                            var bankHoldingNumberDetails = form.addField({
                                id: "custpage_dom_aba_number_details",
                                type: serverWidget.FieldType.INLINEHTML,
                                label: "Bank Details",
                                container: "us_bank_or_inter_bank"
                            });

                            var bankHoldingNumberDetailsHidden = form.addField({
                                id: "custpage_dom_aba_number_details_hidden",
                                type: serverWidget.FieldType.TEXT,
                                label: "Bank Details",
                                container: "us_bank_or_inter_bank"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });

                            if (paramData && editBtnFlag && paramData.displayBankAddress) {
                                bankHoldingNumberDetails.defaultValue = paramData.displayBankAddress;
                            }

                            if (paramData && editBtnFlag && paramData.hiddenBankAddress) {
                                bankHoldingNumberDetailsHidden.defaultValue = paramData.hiddenBankAddress;
                            }


                            var searchNumberUrl = url.resolveScript({
                                scriptId: "customscript_citiintegrator_ns_ss_abadet",
                                deploymentId: "customdeploy_citiintegrator_ns_ss_abadet"
                            });

                            form.addField({
                                id: 'custpage_search_link',
                                type: serverWidget.FieldType.INLINEHTML,
                                label: 'Search',
                                container: "us_bank_or_inter_bank"
                            }).defaultValue = '<a href="#" style="color: blue; text-decoration: none; font-size: 12px" onclick="window.open(\'' + searchNumberUrl + '\', \'popup\', \'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left + '\');">Search</a>';

                            var city = form.addField({
                                id: "custpage_city",
                                type: serverWidget.FieldType.TEXT,
                                label: "City",
                                container: "us_bank_or_inter_bank"
                            });
                            if (domestic_bankcity && recvBankABA) {
                                city.defaultValue = domestic_bankcity;
                            }
                            city.maxLength = 20;
                            if (paramData && editBtnFlag && paramData.destBankCity) {
                                city.defaultValue = paramData.destBankCity;
                            }

                            var financialInstitutionName = form.addField({
                                id: "custpage_financial_institution_name",
                                type: serverWidget.FieldType.TEXT,
                                label: "Financial Institution Name",
                                container: "us_bank_or_inter_bank"
                            }).updateBreakType({
                                breakType: serverWidget.FieldBreakType.STARTCOL
                            });
                            if (dom_beneficiaryBankName && recvBankABA) {
                                financialInstitutionName.defaultValue = dom_beneficiaryBankName;
                            }
                            financialInstitutionName.maxLength = 30;
                            if (paramData && editBtnFlag && paramData.destBankName) {
                                financialInstitutionName.defaultValue = paramData.destBankName;
                            }

                            var states = statesModule.getStates();
                            var usaStates = states.usaStates;

                            var state = form.addField({
                                id: "custpage_state",
                                type: serverWidget.FieldType.SELECT,
                                label: "State",
                                container: "us_bank_or_inter_bank"
                            });

                            state.addSelectOption({
                                value: '',
                                text: ''
                            });

                            var state_code;
                            if (domestic_bankstate && recvBankABA) {
                                if (usaStates) {
                                    for (var i = 0; i < usaStates.length; i++) {

                                        if (domestic_bankstate == usaStates[i].stateCode) {
                                            //log.debug("1030")
                                            state_code = usaStates[i].stateCode;
                                            state.addSelectOption({
                                                value: usaStates[i].stateCode,
                                                text: usaStates[i].stateName
                                            })
                                        }
                                    }
                                }
                                //log.debug("state_code",state_code);
                                state.defaultValue = state_code;
                                if (paramData && editBtnFlag && paramData.destBankState) {
                                    state.defaultValue = paramData.destBankState;
                                }
                            }
                            if (usaStates) {
                                for (var i = 0; i < usaStates.length; i++) {
                                    state.addSelectOption({
                                        value: usaStates[i].stateCode,
                                        text: usaStates[i].stateName
                                    })
                                }
                            }
                            if (paramData && editBtnFlag && paramData.destBankState) {
                                state.defaultValue = paramData.destBankState;
                            }


                            var bankAddress = form.addField({
                                id: "custpage_bank_address",
                                type: serverWidget.FieldType.TEXT,
                                label: "Bank Address",
                                container: "us_bank_or_inter_bank"
                            }).updateBreakType({
                                breakType: serverWidget.FieldBreakType.STARTCOL
                            });
                            if (domestic_bankaddress && recvBankABA) {
                                bankAddress.defaultValue = domestic_bankaddress;
                            }
                            bankAddress.maxLength = 35;
                            if (paramData && editBtnFlag && paramData.destBankAddr && paramData.usCreditInterBank == "inter_bank") {
                                bankAddress.defaultValue = paramData.destBankAddr;
                            }

                            var financialintAccount = form.addField({
                                id: "custpage_finint_account",
                                type: serverWidget.FieldType.TEXT,
                                label: "Financial Institution's Account at Intermediary Bank",
                                container: "us_bank_or_inter_bank"
                            });
                            if (intermediaryAccountNumber && recvBankABA) {
                                financialintAccount.defaultValue = intermediaryAccountNumber;
                            }
                            financialintAccount.maxLength = 35;
                            if (paramData && editBtnFlag && paramData.destBankAddr && paramData.usCreditInterBank == "inter_bank") {
                                financialintAccount.defaultValue = paramData.destBankAddr;
                            }

                            var wireDateGroup = form.addFieldGroup({
                                id: "custpage_wire_date_group",
                                label: "Transfer Date"
                            });

                            var wireToDateHTML = form.addField({
                                id: "custpage_dom_wire_date_html",
                                type: serverWidget.FieldType.INLINEHTML,
                                label: "Destination Country Desc",
                                container: "custpage_wire_date_group"
                            });
                            wireToDateHTML.updateLayoutType({
                                layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
                            });
                            var details = ""
                            details += "<h4 style='margin: 10px 0 0'>Wires are not sent on weekends or Citibank holidays.<br>One time wire transfers are sent in specified currency upon approval.<br>Recurring wire transfers are sent in USD only upon approval.</h4>";
                            wireToDateHTML.defaultValue = details;

                            var wireDate = form.addField({
                                id: "custpage_dom_wire_date",
                                type: serverWidget.FieldType.DATE,
                                label: "Transfer Date",
                                container: "custpage_wire_date_group"
                            });
                            wireDate.isMandatory = true;
                            if (paramData && editBtnFlag && paramData.wireDate) {
                                wireDate.defaultValue = paramData.wireDate;
                            }

                            var wireAmountGroup = form.addFieldGroup({
                                id: "custpage_wire_amount_group",
                                label: "Wire Amount"
                            });

                            var wireAmount = form.addField({
                                id: "custpage_dom_wire_amount",
                                type: serverWidget.FieldType.TEXT,
                                label: "Amount to be sent",
                                container: "custpage_wire_amount_group"
                            });
                            wireAmount.isMandatory = true;
                            wireAmount.maxLength = 14; // changed to support comma
                            if (payAmount) {
                                payAmount = payAmount.toFixed(2);
                                // Add commas by raghini
                                var parts = payAmount.toString().split('.');
                                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                var payAmountWithComma = parts.join('.'); //end
                                log.debug('payAmount with commas:', payAmountWithComma);
                                if (payAmount.length <= 12) {
                                    wireAmount.defaultValue = payAmountWithComma;
                                }
                            }
                            if (paramData && editBtnFlag && paramData.wireAmount) {
                                // Add comma for edit
                                var parts = (paramData.wireAmount).toString().split('.');
                                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                var payAmountWithComma = parts.join('.'); //end
                                log.debug('Dom wire Edit test payAmount with commas:', payAmountWithComma);

                                wireAmount.defaultValue = payAmountWithComma;
                            }

                            var additionalInformation = form.addFieldGroup({
                                id: "custpage_additional_information",
                                label: "Additional Information"
                            });

                            var additionalInformationHTML = form.addField({
                                id: "custpage_for_add_info_html",
                                type: serverWidget.FieldType.INLINEHTML,
                                label: "Additional Information Desc",
                                container: "custpage_additional_information"
                            });
                            additionalInformationHTML.updateLayoutType({
                                layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
                            });
                            additionalInformationHTML.defaultValue = "<h4>Customer Reference Number, Additional Reference and Additional Description are not shown on the wire instruction and are for internal use only.</h4>";

                            var customerReferenceNumber = form.addField({
                                id: "custpage_dom_cust_refer_number",
                                type: serverWidget.FieldType.TEXT,
                                label: "Customer Reference Number",
                                container: "custpage_additional_information"
                            });
                            customerReferenceNumber.maxLength = 10;
                            if (paramData && editBtnFlag && paramData.customerReferenceNumber) {
                                customerReferenceNumber.defaultValue = paramData.customerReferenceNumber;
                            }

                            var additionalReferences = form.addField({
                                id: "custpage_dom_add_refers",
                                type: serverWidget.FieldType.TEXT,
                                label: "Additional Reference",
                                container: "custpage_additional_information"
                            });
                            additionalReferences.maxLength = 15;
                            if (paramData && editBtnFlag && paramData.customerAdditionalReference) {
                                additionalReferences.defaultValue = paramData.customerAdditionalReference;
                            }

                            var additionalDescription = form.addField({
                                id: "custpage_dom_add_description",
                                type: serverWidget.FieldType.TEXT,
                                label: "Additional Description",
                                container: "custpage_additional_information"
                            });
                            additionalDescription.maxLength = 37;
                            if (paramData && editBtnFlag && paramData.customerAdditionalDescription) {
                                additionalDescription.defaultValue = paramData.customerAdditionalDescription;
                            }
                        }
                        else if (entitlements.indexOf('REAL_TIME_PAYMENTS') != -1 && wireFilter == 'REAL_TIME_PAYMENTS') { //rutuja start 
                            var seltemplate = form.addFieldGroup({
                                id: "select_template",
                                label: "Start From Template"
                            });

                            var RealTimePaymentTemplateRequest = {
                                "metadata": {
                                    "userCode": usrCode,
                                    "businessCode": busiCode,
                                    "businessCodeList": [busiCode],
                                    "softwareName": softwareName,
                                    "softwareVersion": softwareVersion,
                                    "vendorId": VENDOR_ID
                                },
                                "userId": usrCode,
                                "businessCode": busiCode,
                                'pageSize': 10,
                                'pageNum': 1,
                                // "templateType": "WIRE_TRANSFER_TEMPLATE_SHORT",
                                // "templateName": "test",

                            }

                            log.debug('RealTimePaymentTemplateRequest 1692', RealTimePaymentTemplateRequest);

                            log.debug('TEMPLATE_SEARCH 1692', TEMPLATE_SEARCH);

                            var responseRealTimePaymentTemplate = getResponseFromAPI(TEMPLATE_SEARCH, pubKey, accsTkn, pvtKey, RealTimePaymentTemplateRequest);
                            log.debug('responseRealTimePaymentTemplate', responseRealTimePaymentTemplate);

                            if (responseRealTimePaymentTemplate) {
                                responseRealTimePaymentTemplate = JSON.parse(responseRealTimePaymentTemplate);
                            }
                            log.debug('responsedomestictemplate452', responseRealTimePaymentTemplate);
                            log.debug('responsedomestictemplate data', responseRealTimePaymentTemplate.data);

                            var templates = responseRealTimePaymentTemplate.data.templates;
                            log.debug('templates', templates);

                            if (templates) {

                                var templateNames = [];

                                for (var i = 0; i < templates.length; i++) {
                                    templateNames.push(templates[i].templateName);
                                }
                                log.debug("templateNames", templateNames);

                                function normalizeData(data) {
                                    return data.map(function (item) {
                                        return item.replace(/[']/g, "’").toUpperCase();
                                    });
                                }

                                templateNames = normalizeData(templateNames);
                            }

                            var scriptField = form.addField({
                                id: 'custpage_template_value',
                                type: serverWidget.FieldType.INLINEHTML,
                                label: 'Call Script Template',
                                container: 'select_template'
                            });


                            var templatestorevalue = form.addField({
                                id: "custpage_template_store_value",
                                type: serverWidget.FieldType.TEXT,
                                label: "Template store value"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });
                            templatestorevalue.defaultValue = storedRtpTemplateName;


                            var selectedItem;
                            var script = "";
                            script += "<!DOCTYPE html>";
                            script += "<html lang='en'>";
                            script += "<head>";
                            script += "<meta charset='UTF-8'>";
                            script += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
                            script += "<title>Search Bar with Dropdown</title>";
                            script += "<script src='https://code.jquery.com/jquery-3.6.0.min.js'></script>";
                            script += "</head>";
                            script += "<body style='font-family: Arial, sans-serif; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f4f4f4;'>";
                            script += "<style>input::placeholder { font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;}</style>"
                            script += "<div style='position: relative; width: 300px; margin: 10px 0 30px 0;'>";
                            script += "<input type='text' id='search-input' placeholder='Search for a template...' autocomplete='off' onkeyup='filterSearch()' style='width: 250px; padding: 5px 5px 5px 35px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; font-family: Open Sans, Helvetica, sans-serif;' />";
                            //script += "<img style='position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px;  background-size: contain; background-repeat: no-repeat;' alt='Search Icon' src=" + imgPath_seacrh + "></img>";
                            script += "<img style='position: absolute; left: 10px; top: 10px; width: 15px; height: 15px;  background-size: contain; background-repeat: no-repeat;' alt='Search Icon' src=" + imgPath_seacrh + "></img>";
                            //script += "<img style='position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; background-image: url(\"https://system.netsuite.com/core/media/media.nl?id=123456&c=YOUR_ACCOUNT_ID&h=f8fb456d3dd742eaefcb\"); background-size: contain; background-repeat: no-repeat;' alt='Search Icon' />";
                            script += "<ul id='dropdown' style='position: absolute; top: 100%; left: 0; width: 250px; background-color: white; border: 1px solid #ccc; border-top: none; max-height: 200px; overflow-y: auto; margin: 0; z-index: 9999; padding: 0; list-style-type: none; display: none;'>";
                            script += "</ul>";
                            script += "<div id='no-results' style='font-size: 14px; color: #888; margin-top: 5px; display: none;'>No Results Found</div>";
                            script += "</div>";

                            script += "<script>";
                            script += "var selectedItem = '';";
                            script += "var data = [";
                            if (templates) {

                                for (var i = 0; i < templateNames.length; i++) {
                                    script += "'" + templateNames[i] + "'";
                                    if (i < templateNames.length - 1) {
                                        script += ",";
                                    }
                                }
                            }

                            script += "];";

                            script += "document.addEventListener('click', function(event) {";
                            script += "  var dropdown = document.getElementById('dropdown');";
                            script += "  var input = document.getElementById('search-input');";
                            script += "  var noResultsMessage = document.getElementById('no-results');";
                            script += "  if (!dropdown.contains(event.target) && event.target !== input) {";
                            script += "    dropdown.style.display = 'none';";
                            script += "    noResultsMessage.style.display = 'none';";
                            script += "  }";
                            script += "});";

                            script += "function filterSearch() {";
                            script += "  var input = document.getElementById('search-input');";
                            script += "  var filter = input.value.toLowerCase();";
                            script += "  var dropdown = document.getElementById('dropdown');";
                            script += "  var selectedItem = localStorage.getItem('selectedItem');";
                            script += "  var noResultsMessage = document.getElementById('no-results');";
                            script += "  if (filter.length < 3) {";
                            script += "    dropdown.style.display = 'none';";
                            script += "        noResultsMessage.style.display = 'none';"
                            script += "    return;";
                            script += "  }";

                            script += "  var filteredData = data.filter(item => item.toLowerCase().includes(filter));";
                            script += "  dropdown.innerHTML = '';";
                            script += "  if (filteredData.length > 0) {";
                            script += "    filteredData.forEach(item => {";
                            script += "      var li = document.createElement('li');";
                            script += "      li.textContent = item;";
                            script += "      li.style.padding = '10px';";
                            script += "      li.style.cursor = 'pointer';";
                            script += "      li.onmouseover = function () { li.style.backgroundColor = '#ddd'; };";
                            script += "      li.onmouseout = function () { li.style.backgroundColor = ''; };";
                            script += "      li.onclick = () => {";

                            script += "        input.value = item;";
                            script += "        selectedItem = item;";
                            script += "        dropdown.style.display = 'none';";
                            script += "        noResultsMessage.style.display = 'none';"

                            script += "        sendSelectedItemToSuitelet(selectedItem);";

                            script += "        console.log('Selected Item:', selectedItem);"; // 
                            //script += "        localStorage.setItem('TestTemplatename', selectedItem);";
                            script += "        selectedItem = item;";
                            //script = '<script> function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; var container = jQuery(".uir-page-title"); var newDiv = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:25px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv);</script></div>'



                            script += "  var rConfig = JSON.parse('{}');";
                            script += "  rConfig['context'] = '/" + filePath + "';";
                            script += "  var entryPointRequire = require.config(rConfig);";
                            script += "  entryPointRequire(['/' + '" + filePath + "'], function(custommodule) {";
                            script += "    custommodule.getRtpTemplate(selectedItem);";
                            script += "  });";
                            script += "      };";
                            script += "      dropdown.appendChild(li);";
                            script += "    });";
                            script += "    dropdown.style.display = 'block';";
                            script += "        noResultsMessage.style.display = 'none';"
                            script += "  } else {";
                            script += "    dropdown.style.display = 'none';";
                            script += "     noResultsMessage.style.display = 'block';"
                            script += "  }";
                            script += "}";

                            script += "function sendSelectedItemToSuitelet(selectedItem) {";
                            script += "  $.ajax({";
                            script += "    url: window.location.href + '?selected_item=' + encodeURIComponent(selectedItem),";
                            script += "    type: 'GET',";
                            script += "    success: function(response) {";
                            script += "      console.log('Selected item sent to Suitelet:', selectedItem);";
                            script += "    },";
                            script += "    error: function(xhr, status, error) {";
                            script += "      console.log('Error sending selected item:', error);";
                            script += "    }";
                            script += "  });";
                            script += "}";

                            script += "</script>";
                            script += "</body>";
                            script += "</html>";


                            scriptField.defaultValue = script;
                            // }
                            //	for template details
                            if (storedRtpTemplateName) {
                                storedRtpTemplateName = storedRtpTemplateName.replace("’", "'");
                                var RealTimeTemplatedetailsRequest = {
                                    "metadata": {
                                        "userCode": usrCode,
                                        "businessCode": busiCode,
                                        "businessCodeList": [busiCode],
                                        "softwareName": softwareName,
                                        "softwareVersion": softwareVersion,
                                        "vendorId": VENDOR_ID
                                    },
                                    "businessCode": busiCode,
                                    "userId": usrCode,
                                    "templateId": 2041,
                                    "templateName": "Instant_payment_Vishal"
                                }
                                var responseRtpdetailstemplate = getResponseFromAPI(TEMPLATE_DETAIL, pubKey, accsTkn, pvtKey, RealTimeTemplatedetailsRequest);

                                if (responseRtpdetailstemplate) {
                                    responseRtpdetailstemplate = JSON.parse(responseRtpdetailstemplate);
                                }
                                log.debug("responseRtpdetailstemplate", responseRtpdetailstemplate);
                                var templateencyNumber = responseRtpdetailstemplate.encryptedAccountIdentifier;
                                //  log.debug("templateencyNumber616,",templateencyNumber);
                                var template_details = responseRtpdetailstemplate.data.templateInformation;
                                log.debug('template_details', template_details);
                                if (template_details) {
                                    var benificiary_name = template_details.payeeName;
                                    if (benificiary_name) {
                                        benificiary_name = removeAccents(benificiary_name);
                                        log.debug("642", benificiary_name);
                                    }
                                    var benificiary_acctno = template_details.payToAccountNumber;
                                    var benificiary_phone = template_details.beneficiaryPhone;

                                    // var benificiary_addr1 = template_details.beneficiaryAddress1;
                                    // if (benificiary_addr1) {
                                    //     benificiary_addr1 = removeAccents(benificiary_addr1);
                                    //     log.debug("660", benificiary_addr1);
                                    // }
                                    // var benificiary_addr2 = template_details.beneficiaryAddress2;
                                    // if (benificiary_addr2) {
                                    //     benificiary_addr2 = removeAccents(benificiary_addr2);
                                    //     log.debug("665", benificiary_addr2);
                                    // }
                                    // var benificiary_addr3 = template_details.beneficiaryAddress3;
                                    // if (benificiary_addr3) {
                                    //     benificiary_addr3 = removeAccents(benificiary_addr3);
                                    //     log.debug("670", benificiary_addr3);
                                    // }
                                    // var special_inst1 = template_details.specialInstructions1;
                                    // if (special_inst1) {
                                    //     special_inst1 = removeAccents(special_inst1);
                                    //     log.debug("676", special_inst1);
                                    // }
                                    // var special_inst2 = template_details.specialInstructions2;
                                    // if (special_inst2) {
                                    //     special_inst2 = removeAccents(special_inst2);
                                    //     log.debug("681", special_inst2);
                                    // }
                                    // var special_inst3 = template_details.specialInstructions3;
                                    // if (special_inst3) {
                                    //     special_inst3 = removeAccents(special_inst3);
                                    //     log.debug("686", special_inst3);
                                    // }
                                    // var recvBankABA = template_details.recvBankABA;
                                    var bankingRoutingNumberABA = template_details.bankABANumber;
                                    var payAmount = template_details.payAmount;
                                    // var domestic_bankaddress = template_details.branchAddress;
                                    // if (domestic_bankaddress) {
                                    //     domestic_bankaddress = removeAccents(domestic_bankaddress);
                                    //     log.debug("693", domestic_bankaddress);
                                    // }

                                    // var domestic_bankcity = template_details.bankCity;
                                    // if (domestic_bankcity) {
                                    //     domestic_bankcity = removeAccents(domestic_bankcity);
                                    //     log.debug("699", domestic_bankcity);
                                    // }
                                    // var domestic_bankstate = template_details.bankState;

                                    // if (domestic_bankstate) {
                                    //     domestic_bankstate = removeAccents(domestic_bankstate);
                                    //     log.debug("706", domestic_bankstate);
                                    // }
                                    // var domestic_businessName = template_details.businessName;
                                    var dom_payFromAccountNumber = template_details.payFromAccountNumber;
                                    // var dom_beneficiaryBankName = template_details.bankABAName;
                                    // if (dom_beneficiaryBankName) {
                                    //     dom_beneficiaryBankName = removeAccents(dom_beneficiaryBankName);
                                    //     log.debug("712", dom_beneficiaryBankName);
                                    // }
                                    // var intermediaryAccountNumber = template_details.intermediaryAccountNumber;
                                }

                            }

                            log.debug("1960");

                            var list = form.addSublist({
                                id: "custpage_rtp_pay_from", //"custpage_dom_transfer_from",
                                type: serverWidget.SublistType.LIST,
                                label: "Pay From"      //"Transfer From"
                            });

                            var selectField = list.addField({
                                id: "custlist_rtp_select_account",//"custlist_dom_select_account",
                                type: serverWidget.FieldType.RADIO,
                                label: "Select Account"
                            });
                            var accountNumber = list.addField({
                                id: "custlist_rtp_account_number",//"custlist_dom_account_number",
                                type: serverWidget.FieldType.TEXT,
                                label: "Account Number"
                            });
                            var encryptedAccountNumber = list.addField({
                                id: "custlist_rtp_ency_acc_num_from",//"custlist_dom_ency_acc_num_from",
                                type: serverWidget.FieldType.TEXT,
                                label: "Encrypted Account Number"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });
                            var accountType = list.addField({
                                id: "custlist_rtp_account_type",//"custlist_dom_account_type",
                                type: serverWidget.FieldType.TEXT,
                                label: "Account Type"
                            });
                            var currentAvailabeDisplay = list.addField({
                                id: "custlist_rtp_display_current_available",//"custlist_dom_display_current_available",
                                type: serverWidget.FieldType.TEXT,
                                label: "Current Available(USD)"
                            });
                            var currentAvailabe = list.addField({
                                id: "custlist_rtp_current_available",//"custlist_dom_current_available",
                                type: serverWidget.FieldType.FLOAT,
                                label: "Current Available(USD)"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });

                            var lineCount = 0;
                            log.debug("2004");

                            for (var i = 0; i < accountDetails.length; i++) {
                                log.debug('accountDetails[i].entitlements 1993', accountDetails[i].entitlements);
                                log.debug('wireFilter', wireFilter);

                                log.debug('(NSAccounts.indexOf(accountDetails[i].encryptedAccountIdentifier) != -1)', (NSAccounts.indexOf(accountDetails[i].encryptedAccountIdentifier) != -1));
                                log.debug('checkForEntitlementType(accountDetails[i].entitlements, wireFilter)', checkForEntitlementType(accountDetails[i].entitlements, wireFilter));

                                if (checkForEntitlementType(accountDetails[i].entitlements, wireFilter) && (NSAccounts.indexOf(accountDetails[i].encryptedAccountIdentifier) != -1)) {
                                    log.debug("2014");

                                    log.debug("2016", accountDetails[i].displayableAccountNumber);


                                    list.setSublistValue({
                                        id: "custlist_rtp_account_number",
                                        line: lineCount,
                                        value: accountDetails[i].displayableAccountNumber
                                    });
                                    if (accountDetails[i].encryptedAccountIdentifier || templateencyNumber) {
                                        log.debug("2025", accountDetails[i].encryptedAccountIdentifier || templateencyNumber);

                                        list.setSublistValue({
                                            id: "custlist_rtp_ency_acc_num_from",
                                            line: lineCount,
                                            value: accountDetails[i].encryptedAccountIdentifier || templateencyNumber
                                        });
                                    }
                                    log.debug("2033", accountDetails[i].accountTypeLabel);

                                    list.setSublistValue({
                                        id: "custlist_rtp_account_type",
                                        line: lineCount,
                                        value: accountDetails[i].accountTypeLabel
                                    });
                                    list.setSublistValue({
                                        id: "custlist_rtp_display_current_available",
                                        line: lineCount,
                                        value: formatAmount(accountDetails[i].currentAvailableAmount)
                                    });
                                    list.setSublistValue({
                                        id: "custlist_rtp_current_available",
                                        line: lineCount,
                                        value: Number(accountDetails[i].currentAvailableAmount).toFixed(2)
                                    });
                                    //if (paramData && editBtnFlag && accountDetails[i].displayableAccountNumber == paramData.accountNumberFrom) {
                                    if (dom_payFromAccountNumber == accountDetails[i].displayableAccountNumber) {
                                        //log.debug("15test");
                                        list.setSublistValue({
                                            id: "custlist_rtp_select_account",
                                            line: lineCount,
                                            value: "T"
                                        });
                                    } else {
                                        //	log.debug("89test");
                                        list.setSublistValue({
                                            id: "custlist_rtp_select_account",
                                            line: lineCount,
                                            value: "F"
                                        });
                                    }
                                    if (paramData && editBtnFlag && accountDetails[i].displayableAccountNumber == paramData.accountNumberFrom) {
                                        // log.debug("730sd")
                                        list.setSublistValue({
                                            id: "custlist_rtp_select_account",
                                            line: lineCount,
                                            value: "T"
                                        });
                                    }
                                    //}



                                    lineCount++;
                                }
                            }

                            var wireTo = form.addFieldGroup({
                                id: "pay_to",//"wire_to",
                                label: "Pay To"//"Wire To"
                            });


                            var wireToCountryHTML = form.addField({
                                id: "custpage_rtp_country_html",//"custpage_dom_country_html",
                                type: serverWidget.FieldType.INLINEHTML,
                                label: "Destination Country Desc",
                                container: "pay_to"
                            });
                            wireToCountryHTML.updateLayoutType({
                                layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
                            });
                            wireToCountryHTML.defaultValue = "<h4>Always verify new or updated payment instructions and payee account information with a phone call to a trusted source before sending an instant payment.</h4>";

                            var beneficiary = form.addField({
                                id: "custpage_rtp_beneficiary_name",//"custpage_dom_beneficiary_name",
                                type: serverWidget.FieldType.TEXT,
                                label: "Payee Name", //"Beneficiary Name",
                                container: "pay_to"
                            });
                            if (benificiary_name) {
                                beneficiary.defaultValue = benificiary_name;
                            }

                            beneficiary.isMandatory = true;
                            beneficiary.maxLength = 34;
                            if (paramData && editBtnFlag && paramData.beneficiaryName) {
                                beneficiary.defaultValue = paramData.beneficiaryName;
                            }

                            var accountNumber = form.addField({
                                id: "custpage_rtp_account_number",//"custpage_dom_account_number",
                                type: serverWidget.FieldType.TEXT,
                                label: "Bank Account Number",
                                container: "pay_to"
                            });
                            if (benificiary_acctno) {
                                accountNumber.defaultValue = benificiary_acctno;
                            }
                            accountNumber.isMandatory = true;
                            accountNumber.maxLength = 40;
                            if (paramData && editBtnFlag && paramData.beneficiaryAccountNumber) {
                                accountNumber.defaultValue = paramData.beneficiaryAccountNumber;
                            }


                            var bankGroup = form.addFieldGroup({
                                id: "aba_tab",
                                label: "Bank Details"
                            });

                            bankGroup.isSingleColumn = true;
                            bankGroup.isBorderHidden = true;

                            // 1. Create the Group
                            var bankGroup = form.addFieldGroup({
                                id: "aba_tab",
                                label: "Bank Details"
                            });

                            bankGroup.isSingleColumn = true;

                            // 2. Bank Routing Number
                            var bankRoutingNumber = form.addField({
                                id: "custpage_rtp_bank_routing_number",
                                type: serverWidget.FieldType.TEXT,
                                label: "Bank Routing Number (ABA)",
                                container: "aba_tab"
                            });
                            bankRoutingNumber.isMandatory = true;
                            // Force this field to take up the whole row
                            bankRoutingNumber.updateLayoutType({
                                layoutType: serverWidget.FieldLayoutType.NORMAL
                            });

                            log.emergency('bankingRoutingNumberABA 2229', bankingRoutingNumberABA)

                            if (bankingRoutingNumberABA) {
                                bankRoutingNumber.defaultValue = bankingRoutingNumberABA;
                            } else if (paramData && editBtnFlag) {
                                log.emergency('paramData.routingCode 2229', paramData.routingCode)

                                bankRoutingNumber.defaultValue = paramData.routingCode;

                            }
                            // 4. Search Link
                            var searchNumberUrl = url.resolveScript({
                                scriptId: "customscript_citiintegrator_ns_ss_insaba",
                                deploymentId: "customdeploy_citiintegrator_ns_ss_insaba"
                            });

                            var searchLinkField = form.addField({
                                id: 'custpage_search_link',
                                type: serverWidget.FieldType.INLINEHTML,
                                label: ' ',
                                container: "aba_tab"
                            });
                            // Force this field to start its own row
                            searchLinkField.updateLayoutType({
                                layoutType: serverWidget.FieldLayoutType.STARTROW
                            });

                            searchLinkField.defaultValue = '<div style="margin-top:2px;"><a href="#" style="color: blue; text-decoration: none; font-size: 12px" onclick="window.open(\'' + searchNumberUrl + '\', \'popup\', \'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left + '\');">Search </a></div>';

                            // 3. Bank Details
                            var bankHoldingNumberDetails = form.addField({
                                id: "custpage_rtp_aba_number_details",
                                type: serverWidget.FieldType.TEXT,
                                label: "Participating Bank",
                                container: "aba_tab"
                            });
                            // Force this field to start its own row
                            bankHoldingNumberDetails.updateLayoutType({
                                layoutType: serverWidget.FieldLayoutType.NORMAL
                            });

                            bankHoldingNumberDetails.isMandatory = true;

                            if (paramData && editBtnFlag && paramData.displayBankAddress) {
                                bankHoldingNumberDetails.defaultValue = paramData.displayBankAddress;
                            }

                            var additionalDescription = form.addField({
                                id: "custpage_rtp_add_description",
                                type: serverWidget.FieldType.TEXT,
                                label: "Additional Description",
                                container: "pay_to"
                            });
                            additionalDescription.maxLength = 37;
                            if (paramData && editBtnFlag && paramData.customerAdditionalDescription) {
                                additionalDescription.defaultValue = paramData.customerAdditionalDescription;
                            }
                            var wireDateGroup = form.addFieldGroup({
                                id: "custpage_rtp_date_group",
                                label: "Payment Date"
                            });

                            var wireToDateHTML = form.addField({
                                id: "custpage_rtp_wire_date_html",
                                type: serverWidget.FieldType.INLINEHTML,
                                label: "Destination Country Desc",
                                container: "custpage_rtp_date_group"
                            });
                            wireToDateHTML.updateLayoutType({
                                layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
                            });
                            var details = ""
                            details += "<h4 style='margin: 10px 0 0'>Instant Payments are not sent on weekends or Citibank holidays.<br>One time instant payments are sent in specified currency upon approval.<br>Recurring instant payments are sent in USD only upon approval.</h4>";
                            wireToDateHTML.defaultValue = details;

                            var wireDate = form.addField({
                                id: "custpage_rtp_wire_date",
                                type: serverWidget.FieldType.DATE,
                                label: "Transfer Date",
                                container: "custpage_rtp_date_group"
                            });
                            wireDate.isMandatory = true;
                            if (paramData && editBtnFlag && paramData.wireDate) {
                                wireDate.defaultValue = paramData.wireDate;
                            }

                            var wireAmountGroup = form.addFieldGroup({
                                id: "custpage_rtp_amount_group",
                                label: "Payment Amount"
                            });

                            var wireAmount = form.addField({
                                id: "custpage_rtp_wire_amount",
                                type: serverWidget.FieldType.TEXT,
                                label: "Amount to be sent (USD)",
                                container: "custpage_rtp_amount_group"
                            });
                            wireAmount.isMandatory = true;
                            wireAmount.maxLength = 14; // changed to support comma
                            if (payAmount) {
                                payAmount = payAmount.toFixed(2);
                                // Add commas by raghini
                                var parts = payAmount.toString().split('.');
                                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                var payAmountWithComma = parts.join('.'); //end
                                log.debug('payAmount with commas:', payAmountWithComma);
                                if (payAmount.length <= 12) {
                                    wireAmount.defaultValue = payAmountWithComma;
                                }
                            }
                            if (paramData && editBtnFlag && paramData.wireAmount) {
                                // Add comma for edit
                                var parts = (paramData.wireAmount).toString().split('.');
                                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                var payAmountWithComma = parts.join('.'); //end
                                log.debug('Dom wire Edit test payAmount with commas:', payAmountWithComma);

                                wireAmount.defaultValue = payAmountWithComma;
                            }


                        }
                        //rutuja end
                        else if (entitlements.indexOf('FOREIGN_WIRES') != -1 && wireFilter == 'FOREIGN_WIRES') {
                            //Foreign Wire

                            var foreigntemplateRequest = {
                                "metadata": {
                                    "userCode": usrCode,
                                    "businessCodeList": [busiCode],

                                    "softwareName": softwareName,
                                    "softwareVersion": softwareVersion,
                                    "vendorId": VENDOR_ID
                                },
                                "businessCode": busiCode,
                                "templateType": "FOREIGN_CURRENCY_WIRE_TRANSFER",
                                "templateName": " ",
                                "userId": userId
                            }

                            var responseforeigntemplate = getResponseFromAPI(TEMPLATE_SEARCH, pubKey, accsTkn, pvtKey, foreigntemplateRequest);
                            log.debug('responseforeigntemplate', responseforeigntemplate);
                            if (responseforeigntemplate) {
                                responseforeigntemplate = JSON.parse(responseforeigntemplate);
                            }
                            var templates = responseforeigntemplate.templates;
                            //	log.debug('templates', templates);
                            var templateNames = [];

                            for (var i = 0; i < templates.length; i++) {
                                templateNames.push(templates[i].templateName);
                            }
                            log.debug("templateNames", templateNames);

                            function normalizeData(data) {
                                return data.map(function (item) {
                                    return item.replace(/[']/g, "’").toUpperCase();
                                });
                            }

                            templateNames = normalizeData(templateNames);
                            log.debug("1290", templateNames)



                            var seltemplate = form.addFieldGroup({
                                id: "select_template",
                                label: "Start From Template"
                            });

                            var scriptField = form.addField({
                                id: 'custpage_foreigntemplate_value',
                                type: serverWidget.FieldType.INLINEHTML,
                                label: 'Call Script Template',
                                container: 'select_template'
                            });


                            var templatestorevalue = form.addField({
                                id: "custpage_foreigntemplate_store_value",
                                type: serverWidget.FieldType.TEXT,
                                label: "Template store value"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });
                            templatestorevalue.defaultValue = storedforeignTemplateName;


                            var selectedItem;
                            var script = "";
                            script += "<!DOCTYPE html>";
                            script += "<html lang='en'>";
                            script += "<head>";
                            script += "<meta charset='UTF-8'>";
                            script += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>";
                            script += "<title>Search Bar with Dropdown</title>";
                            script += "<script src='https://code.jquery.com/jquery-3.6.0.min.js'></script>";
                            script += "</head>";
                            script += "<body style='font-family: Arial, sans-serif; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f4f4f4;'>";
                            script += "<style>input::placeholder { font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;}</style>"
                            script += "<div style='position: relative; width: 300px; margin: 10px 0 30px 0;'>";
                            script += "<input type='text' id='search-input' placeholder='Search for a template...' autocomplete='off' onkeyup='filterSearch()' style='width: 250px; padding: 5px 5px 5px 35px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; font-family: Open Sans, Helvetica, sans-serif;' />";
                            //script += "<img style='position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px;  background-size: contain; background-repeat: no-repeat;' alt='Search Icon' src=" + imgPath_seacrh + "></img>";
                            script += "<img style='position: absolute; left: 10px; top: 10px; width: 15px; height: 15px;  background-size: contain; background-repeat: no-repeat;' alt='Search Icon' src=" + imgPath_seacrh + "></img>";
                            //script += "<img style='position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; background-image: url(\"https://system.netsuite.com/core/media/media.nl?id=123456&c=YOUR_ACCOUNT_ID&h=f8fb456d3dd742eaefcb\"); background-size: contain; background-repeat: no-repeat;' alt='Search Icon' />";
                            script += "<ul id='dropdown' style='position: absolute; top: 100%; left: 0; width: 250px; background-color: white; border: 1px solid #ccc; border-top: none; max-height: 200px; overflow-y: auto; margin: 0; z-index: 9999; padding: 0; list-style-type: none; display: none;'>";
                            script += "</ul>";
                            script += "<div id='no-results' style='font-size: 14px; color: #888; margin-top: 5px; display: none;'>No Results Found</div>";
                            script += "</div>";

                            script += "<script>";
                            script += "var selectedItem = '';";
                            script += "var data = [";


                            for (var i = 0; i < templateNames.length; i++) {
                                script += "'" + templateNames[i] + "'";
                                if (i < templateNames.length - 1) {
                                    script += ",";
                                }
                            }

                            script += "];";

                            script += "document.addEventListener('click', function(event) {";
                            script += "  var dropdown = document.getElementById('dropdown');";
                            script += "  var input = document.getElementById('search-input');";
                            script += "  var noResultsMessage = document.getElementById('no-results');";
                            script += "  if (!dropdown.contains(event.target) && event.target !== input) {";
                            script += "    dropdown.style.display = 'none';";
                            script += "    noResultsMessage.style.display = 'none';";
                            script += "  }";
                            script += "});";

                            script += "function filterSearch() {";
                            script += "  var input = document.getElementById('search-input');";
                            script += "  var filter = input.value.toLowerCase();";
                            script += "  var dropdown = document.getElementById('dropdown');";
                            script += "  var selectedItem = localStorage.getItem('selectedItem');";
                            script += "  var noResultsMessage = document.getElementById('no-results');";
                            script += "  if (filter.length < 3) {";
                            script += "    dropdown.style.display = 'none';";
                            script += "        noResultsMessage.style.display = 'none';"
                            script += "    return;";
                            script += "  }";

                            script += "  var filteredData = data.filter(item => item.toLowerCase().includes(filter));";
                            script += "  dropdown.innerHTML = '';";
                            script += "  if (filteredData.length > 0) {";
                            script += "    filteredData.forEach(item => {";
                            script += "      var li = document.createElement('li');";
                            script += "      li.textContent = item;";
                            script += "      li.style.padding = '10px';";
                            script += "      li.style.cursor = 'pointer';";
                            script += "      li.onmouseover = function () { li.style.backgroundColor = '#ddd'; };";
                            script += "      li.onmouseout = function () { li.style.backgroundColor = ''; };";
                            script += "      li.onclick = () => {";

                            script += "        input.value = item;";
                            script += "        selectedItem = item;";
                            script += "        dropdown.style.display = 'none';";
                            script += "        noResultsMessage.style.display = 'none';"

                            script += "        sendSelectedItemToSuitelet(selectedItem);";

                            script += "        console.log('Selected Item:', selectedItem);"; // 
                            //script += "        localStorage.setItem('TestTemplatename', selectedItem);";
                            script += "        selectedItem = item;";
                            //script = '<script> function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; var container = jQuery(".uir-page-title"); var newDiv = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:25px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv);</script></div>'



                            script += "  var rConfig = JSON.parse('{}');";
                            script += "  rConfig['context'] = '/" + filePath + "';";
                            script += "  var entryPointRequire = require.config(rConfig);";
                            script += "  entryPointRequire(['/' + '" + filePath + "'], function(custommodule) {";
                            script += "    custommodule.getForeigntemplate(selectedItem);";
                            script += "  });";




                            script += "      };";
                            script += "      dropdown.appendChild(li);";
                            script += "    });";
                            script += "    dropdown.style.display = 'block';";
                            script += "        noResultsMessage.style.display = 'none';"
                            script += "  } else {";
                            script += "    dropdown.style.display = 'none';";
                            script += "     noResultsMessage.style.display = 'block';"
                            script += "  }";
                            script += "}";

                            script += "function sendSelectedItemToSuitelet(selectedItem) {";
                            script += "  $.ajax({";
                            script += "    url: window.location.href + '?selected_item=' + encodeURIComponent(selectedItem),";
                            script += "    type: 'GET',";
                            script += "    success: function(response) {";
                            script += "      console.log('Selected item sent to Suitelet:', selectedItem);";
                            script += "    },";
                            script += "    error: function(xhr, status, error) {";
                            script += "      console.log('Error sending selected item:', error);";
                            script += "    }";
                            script += "  });";
                            script += "}";

                            script += "</script>";
                            script += "</body>";
                            script += "</html>";


                            scriptField.defaultValue = script;
                            // for template details
                            if (storedforeignTemplateName) {
                                storedforeignTemplateName = storedforeignTemplateName.replace("’", "'");
                                var foreigntemplatedetailsRequest = {
                                    "metadata": {
                                        "userCode": usrCode,
                                        "businessCodeList": [busiCode],
                                        "softwareName": softwareName,
                                        "softwareVersion": softwareVersion,
                                        "vendorId": VENDOR_ID
                                    },
                                    "businessCode": busiCode,
                                    "templateType": "FOREIGN_CURRENCY_WIRE_TRANSFER",
                                    "templateName": storedforeignTemplateName,
                                    "userId": userId
                                }

                                log.debug("foreigntemplatedetailsRequest1413", foreigntemplatedetailsRequest);
                                var responseforeigndetailstemplate = getResponseFromAPI(TEMPLATE_DETAIL, pubKey, accsTkn, pvtKey, foreigntemplatedetailsRequest);



                                if (responseforeigndetailstemplate) {
                                    responseforeigndetailstemplate = JSON.parse(responseforeigndetailstemplate);
                                }
                                log.debug("responseforeigndetailstemplate1332", responseforeigndetailstemplate);

                                var encyNumber_foreign = responseforeigndetailstemplate.encryptedAccountIdentifier;
                                //log.debug('encyNumber_foreign1416', encyNumber_foreign);

                                var template_details_foreign = responseforeigndetailstemplate.templateDetails;
                                //log.debug('template_details_foreign', template_details_foreign);
                                if (template_details_foreign) {
                                    var bank_Country = template_details_foreign.bankCountry;
                                    var bank_City = template_details_foreign.bankCity;
                                    if (bank_City) {
                                        bank_City = removeAccents(bank_City);
                                        log.debug("1534", bank_City);
                                    }
                                    var bank_Address = template_details_foreign.branchAddress;
                                    if (bank_Address) {
                                        bank_Address = removeAccents(bank_Address);
                                        log.debug("1539", bank_Address);
                                    }
                                    var swift_Code = template_details_foreign.swiftCode;

                                    var bank_name = template_details_foreign.beneficiaryBankName;
                                    if (bank_name) {
                                        bank_name = removeAccents(bank_name);
                                        log.debug("1546", bank_name);
                                    }
                                    var beneficiary_Name = template_details_foreign.beneficiaryName;
                                    if (beneficiary_Name) {
                                        beneficiary_Name = removeAccents(beneficiary_Name);
                                        log.debug("1551", beneficiary_Name);
                                    }
                                    var beneficiary_Acctno = template_details_foreign.beneficiaryAccountNumber;
                                    var beneficiary_Phone = template_details_foreign.beneficiaryPhone;
                                    var beneficiary_Address1 = template_details_foreign.beneficiaryAddress1;
                                    if (beneficiary_Address1) {
                                        beneficiary_Address1 = removeAccents(beneficiary_Address1);
                                        log.debug("1558", beneficiary_Address1);
                                    }
                                    var beneficiary_Address2 = template_details_foreign.beneficiaryAddress2;
                                    if (beneficiary_Address2) {
                                        beneficiary_Address2 = removeAccents(beneficiary_Address2);
                                        log.debug("1562", beneficiary_Address2);
                                    }
                                    var beneficiary_Address3 = template_details_foreign.beneficiaryAddress3;
                                    if (beneficiary_Address3) {
                                        beneficiary_Address3 = removeAccents(beneficiary_Address3);
                                        log.debug("1568", beneficiary_Address3);
                                    }
                                    var special_instr1 = template_details_foreign.specialInstructions1;
                                    if (special_instr1) {
                                        special_instr1 = removeAccents(special_instr1);
                                        log.debug("1573", special_instr1);
                                    }
                                    var special_instr2 = template_details_foreign.specialInstructions2;
                                    if (special_instr2) {
                                        special_instr2 = removeAccents(special_instr2);
                                        log.debug("1579", special_instr2);
                                    }
                                    var special_instr3 = template_details_foreign.specialInstructions3;
                                    if (special_instr3) {
                                        special_instr3 = removeAccents(special_instr3);
                                        log.debug("1584", special_instr3);
                                    }
                                    var payAmount = template_details_foreign.payAmount;
                                    var payFromAccountNumber = template_details_foreign.payFromAccountNumber;
                                    var foreign_recvBankABA = template_details_foreign.recvBankABA;

                                }
                            }

                            var countryCurrencyRequest = {
                                "metadata": {
                                    "userCode": usrCode,
                                    "businessCodeList": [busiCode],
                                    "softwareName": softwareName,
                                    "softwareVersion": softwareVersion,
                                    "vendorId": VENDOR_ID
                                },
                                "countryOnly": true
                            }

                            var responseCurrencyCode = getResponseFromAPI(COUNTRY_CURRENCY, pubKey, accsTkn, pvtKey, countryCurrencyRequest);
                            //log.debug('responseCurrencyCode', responseCurrencyCode);
                            responseCurrencyCode = (responseCurrencyCode && typeof responseCurrencyCode === 'string') ? JSON.parse(responseCurrencyCode) : responseCurrencyCode;
                            var countryDetails = "";
                            if (responseCurrencyCode && responseCurrencyCode.code == 500) {
                                savePushLogs(sessionuserId, COUNTRY_CURRENCY, "CitiIntegrator NS SS Payment Initiation", countryCurrencyRequest, responseCurrencyCode, "");

                                var scriptField = form.addField({
                                    id: "custpage_clientscript",
                                    type: serverWidget.FieldType.INLINEHTML,
                                    label: "Call Script"
                                });

                                var script = "";
                                script += "<!DOCTYPE html>"
                                script += "<html lang='en'>"
                                script += "<head>"
                                script += "<meta charset='UTF-8'>"
                                script += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
                                script += "<script>"
                                script += "function closeOverlay() {"
                                script += "document.getElementById('reportoverlay').style.display = 'none';"
                                script += "}"
                                script += "function reportSubmit() {";
                                script += "var viewobj = document.getElementById('popupTextarea').value;";
                                script += "var rConfig = JSON.parse('{}');"
                                script += "rConfig['context'] = \'/" + filePath + "\';"
                                script += "var entryPointRequire = require.config(rConfig);"
                                script += "entryPointRequire([\'/" + filePath + "\'], function(custommodule){"
                                script += "custommodule.pushLogs(viewobj);"
                                script += "});"
                                script += "closeOverlay();"
                                script += "}";
                                script += "</script>"
                                script += "</head>"
                                script += "<body style='font-family: Arial, sans-serif;'>"
                                script += "<div style='display: block; position: fixed; z-index: 1001; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5);'"
                                script += "id='reportoverlay'>"
                                script += "<div style='position: absolute; top: 50%; left: 50%; display: flex; flex-direction: column; transform: translate(-50%, -50%); background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); border-top: 3px solid #ab0f0f; z-index: 10000;  max-width: 80%; max-height: 80%; overflow-y: auto;'"
                                script += "class='popup'>"
                                script += "<p style='font-size: 15px; font-weight: bold;'>Payment Initiation</p>"
                                script += "<hr style='margin: 10px 0; border: none; border-top: 1px solid #ccc;'>"
                                script += "<p style='font-weight: bold;'>Error occured while connecting with Citi.</p>"
                                script += "<p>In order for us to improve your experience on Citi Integrator, we highly recommend that you report and submit this issue to Citi along with a description of the issue.</p>"
                                script += "<textarea id='popupTextarea' style=' width: calc(100% - 20px); min-height: 60px; flex:1; padding: 10px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; resize: none;' maxlength='1000' placeholder='Provide description of the issue you are reporting'></textarea>"
                                script += "<p style='margin: 5px 0 0 0; color:blue; font-size: 12px;'>Max 1000 characters </p>"
                                script += "<p style='color: blue; font-size: 12px; margin: 40px 0 0 0;'>Please note: Logs will be attached with the description.</p>"
                                script += "<hr style='margin: 10px 0; border: none; border-top: 1px solid #ccc;'>"
                                script += "<div style=' margin-top: auto; align-self: flex-end;' class='button-container'>"
                                script += "<a style='background-color: #ab0f0f; color: #fff; border: none; padding: 8px 12px; margin-left: 10px; cursor: pointer; border-radius: 4px; margin-left: 5px;'"
                                script += "class='close-button' onclick='closeOverlay();'>Close</a>"
                                script += "<a style='background-color: #ab0f0f; margin-left: 10px; color: #fff; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px; margin-left: 5px;'"
                                script += "class='report-button' onclick='reportSubmit();'>Report & Submit</a>"
                                script += "</div>"
                                script += "</div>"
                                script += "</div>"
                                script += "</body>"
                                script += "</html>"

                                scriptField.defaultValue = script;
                            } else if (responseCurrencyCode && responseCurrencyCode.code == 400) {
                                var scriptField = form.addField({
                                    id: "custpage_clientscript",
                                    type: serverWidget.FieldType.INLINEHTML,
                                    label: "Call Script"
                                });

                                var script = "";
                                script += "<script>"
                                script += "function displayAlert() {";
                                script += "var rConfig = JSON.parse('{}');"
                                script += "rConfig['context'] = \'/" + filePath + "\';"
                                script += "var entryPointRequire = require.config(rConfig);"
                                script += "entryPointRequire([\'/" + filePath + "\'], function(custommodule){"
                                script += "custommodule.displayMessage('" + responseCurrencyCode.message + "\');"
                                script += "return true;"
                                script += "});"
                                script += "}";
                                script += "displayAlert();";
                                script += "</script>"

                                scriptField.defaultValue = script;
                            } else {
                                countryDetails = responseCurrencyCode.country;
                            }

                            //log.debug('countryDetails', countryDetails);

                            var list = form.addSublist({
                                id: "custpage_for_wire_from",
                                type: serverWidget.SublistType.LIST,
                                label: "Wire From"
                            });

                            var selectField = list.addField({
                                id: "custlist_for_select_account",
                                type: serverWidget.FieldType.RADIO,
                                label: "Select Account"
                            });
                            var accountNumber = list.addField({
                                id: "custlist_for_account_number",
                                type: serverWidget.FieldType.TEXT,
                                label: "Account Number"
                            });
                            var encryptedAccountNumber = list.addField({
                                id: "custlist_for_ency_acc_num_from",
                                type: serverWidget.FieldType.TEXT,
                                label: "Encrypted Account Number"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });
                            var accountType = list.addField({
                                id: "custlist_for_account_type",
                                type: serverWidget.FieldType.TEXT,
                                label: "Account Type"
                            });
                            var currentAvailabeDisplay = list.addField({
                                id: "custlist_for_display_current_available",
                                type: serverWidget.FieldType.TEXT,
                                label: "Current Available(USD)"
                            });
                            var currentAvailabe = list.addField({
                                id: "custlist_for_current_available",
                                type: serverWidget.FieldType.FLOAT,
                                label: "Current Available(USD)"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });
                            // log.debug("payFromAccountNumber123",payFromAccountNumber);
                            var lineCount = 0;
                            for (var i = 0; i < accountDetails.length; i++) {
                                //log.debug("1550",accountDetails[i].displayableAccountNumber);
                                //log.debug("1551",accountDetails[i].encryptedAccountIdentifier);
                                if (checkForEntitlementType(accountDetails[i].entitlements, wireFilter) && (NSAccounts.indexOf(accountDetails[i].encryptedAccountIdentifier) != -1)) {
                                    list.setSublistValue({
                                        id: "custlist_for_account_number",
                                        line: lineCount,
                                        value: accountDetails[i].displayableAccountNumber
                                    });
                                    if (accountDetails[i].encryptedAccountIdentifier || encyNumber_foreign) {
                                        list.setSublistValue({
                                            id: "custlist_for_ency_acc_num_from",
                                            line: lineCount,
                                            value: accountDetails[i].encryptedAccountIdentifier || encyNumber_foreign
                                        });
                                    }
                                    list.setSublistValue({
                                        id: "custlist_for_account_type",
                                        line: lineCount,
                                        value: accountDetails[i].accountTypeLabel
                                    });
                                    list.setSublistValue({
                                        id: "custlist_for_display_current_available",
                                        line: lineCount,
                                        value: formatAmount(accountDetails[i].currentAvailableAmount)
                                    });
                                    list.setSublistValue({
                                        id: "custlist_for_current_available",
                                        line: lineCount,
                                        value: Number(accountDetails[i].currentAvailableAmount).toFixed(2)
                                    });
                                    //if (paramData && editBtnFlag && accountDetails[i].displayableAccountNumber == paramData.accountNumberFrom) {
                                    if (payFromAccountNumber == accountDetails[i].displayableAccountNumber) {
                                        //log.debug("158989");
                                        list.setSublistValue({
                                            id: "custlist_for_select_account",
                                            line: lineCount,
                                            value: "T"
                                        });
                                    } else {
                                        //log.debug("897987");
                                        list.setSublistValue({
                                            id: "custlist_for_select_account",
                                            line: lineCount,
                                            value: "F"
                                        });
                                    }
                                    if (paramData && editBtnFlag && accountDetails[i].displayableAccountNumber == paramData.accountNumberFrom) {
                                        //log.debug("1641sd");
                                        list.setSublistValue({
                                            id: "custlist_for_select_account",
                                            line: lineCount,
                                            value: "T"
                                        });

                                    }
                                    //}

                                    lineCount++;
                                }
                            }

                            var wireToCountry = form.addFieldGroup({
                                id: "wire_to_country",
                                label: "Wire To Country"
                            });

                            var wireToCountryHTML = form.addField({
                                id: "custpage_for_country_html",
                                type: serverWidget.FieldType.INLINEHTML,
                                label: "Destination Country Desc",
                                container: "wire_to_country"
                            });
                            wireToCountryHTML.updateLayoutType({
                                layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
                            });
                            wireToCountryHTML.defaultValue = "<h4>Always verify new or updated payment instructions and beneficiary account information with a phone call to a trusted source before sending a wire transfer.</h4>";

                            var destinationCountry = form.addField({
                                id: "custpage_for_dest_country",
                                type: serverWidget.FieldType.SELECT,
                                label: "Destination Country",
                                container: "wire_to_country"
                            });

                            destinationCountry.isMandatory = true;

                            destinationCountry.addSelectOption({
                                value: '',
                                text: ''
                            });
                            var coun_code;
                            if (bank_Country) {
                                if (countryDetails) {
                                    for (var i = 0; i < countryDetails.length; i++) {

                                        if (bank_Country == countryDetails[i].country) {
                                            //log.debug("1389")
                                            coun_code = countryDetails[i].countryCode;
                                            destinationCountry.addSelectOption({
                                                value: countryDetails[i].countryCode,
                                                text: countryDetails[i].country
                                            })
                                        }
                                    }
                                }
                                //log.debug("coun_code",coun_code);
                                destinationCountry.defaultValue = coun_code;
                                if (paramData && editBtnFlag && paramData.destinationCountry) {
                                    destinationCountry.defaultValue = paramData.destinationCountry;
                                }
                            }
                            if (countryDetails) {
                                for (var i = 0; i < countryDetails.length; i++) {
                                    destinationCountry.addSelectOption({
                                        value: countryDetails[i].countryCode,
                                        text: countryDetails[i].country
                                    })
                                }
                            }
                            if (paramData && editBtnFlag && paramData.destinationCountry) {
                                destinationCountry.defaultValue = paramData.destinationCountry;
                            }

                            var bankAddress = form.addField({
                                id: "custpage_for_bank_address",
                                type: serverWidget.FieldType.TEXT,
                                label: "Bank Address",
                                container: "wire_to_country"
                            });
                            if (bank_Address) {
                                bankAddress.defaultValue = bank_Address;
                            }
                            if (paramData && editBtnFlag) {
                                bankAddress.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.HIDDEN
                                });
                                bankAddress.defaultValue = paramData.destBankAddr;
                            }

                            var intermediatoryBankHoldingNo = form.addField({
                                id: "custpage_for_intr_bank_hold_no",
                                type: serverWidget.FieldType.TEXT,
                                label: "Intermediary Bank Routing Number(ABA)",
                                container: "wire_to_country"
                            });
                            if (foreign_recvBankABA) {
                                intermediatoryBankHoldingNo.defaultValue = foreign_recvBankABA;
                            }
                            if (paramData && editBtnFlag && paramData.intermediatoryBankHoldingNo) {
                                intermediatoryBankHoldingNo.defaultValue = paramData.intermediatoryBankHoldingNo;
                            }

                            var bankHoldingNumberDetails = form.addField({
                                id: "custpage_for_aba_number_details",
                                type: serverWidget.FieldType.INLINEHTML,
                                label: "Bank Details",
                                container: "wire_to_country"
                            });

                            var bankHoldingNumberDetailsHidden = form.addField({
                                id: "custpage_for_aba_number_details_hidden",
                                type: serverWidget.FieldType.TEXT,
                                label: "Bank Details",
                                container: "wire_to_country"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });
                            if (paramData && editBtnFlag && paramData.interBankDetails) {
                                bankHoldingNumberDetails.defaultValue = paramData.interBankDetails;
                            }
                            if (paramData && editBtnFlag && paramData.interBankDetailsHidden) {
                                bankHoldingNumberDetailsHidden.defaultValue = paramData.interBankDetailsHidden;
                            }

                            var searchNumberUrl = url.resolveScript({
                                scriptId: "customscript_citiintegrator_ns_ss_abadet",
                                deploymentId: "customdeploy_citiintegrator_ns_ss_abadet"
                            });

                            var width = 900;
                            var height = 600;
                            var left = 200;
                            var top = 150;

                            form.addField({
                                id: 'custpage_search_link',
                                type: serverWidget.FieldType.INLINEHTML,
                                label: 'Search',
                                container: "wire_to_country"
                            }).defaultValue = '<a href="#" style="color: blue; text-decoration: none; font-size: 12px" onclick="window.open(\'' + searchNumberUrl + '\', \'popup\', \'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left + '\');">Search</a>';

                            var bankDetails = form.addField({
                                id: "custpage_for_bank_details",
                                type: serverWidget.FieldType.INLINEHTML,
                                label: "Bank Details",
                                container: "wire_to_country"
                            });


                            var bankDetailsHidden = form.addField({
                                id: "custpage_for_bank_details_hidden",
                                type: serverWidget.FieldType.TEXT,
                                label: "Bank Details",
                                container: "wire_to_country"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN
                            });


                            if (paramData && editBtnFlag && paramData.displayBankAddress) {
                                bankDetails.defaultValue = paramData.displayBankAddress;
                            }
                            if (paramData && editBtnFlag && paramData.bankAddress) {
                                bankDetailsHidden.defaultValue = paramData.bankAddress;
                            }

                            var swiftbic = form.addField({
                                id: "custpage_for_swift_or_bic",
                                type: serverWidget.FieldType.TEXT,
                                label: "Swift/BIC",
                                container: "wire_to_country"
                            }).updateBreakType({
                                breakType: serverWidget.FieldBreakType.STARTCOL
                            });
                            if (swift_Code) {
                                swift_Code = swift_Code.trim();
                                swiftbic.defaultValue = swift_Code;
                            }
                            swiftbic.isMandatory = true;
                            if (paramData && editBtnFlag && paramData.swiftOrBIC) {
                                swiftbic.defaultValue = paramData.swiftOrBIC;
                            }

                            var searchUrl = "https://www.theclearinghouse.org/uid-lookup"
                            var width = 900;
                            var height = 600;
                            var left = 200;
                            var top = 150;

                            form.addField({
                                id: 'custpage_search_swift_uuid_lookup',
                                type: serverWidget.FieldType.INLINEHTML,
                                label: 'Lookup SWIFT/BIC Code',
                                container: "wire_to_country"
                            }).defaultValue = '<a href="#" id="custpage_swift_bic" style="color: blue; text-decoration: none; font-size: 12px" onclick="window.open(\'' + searchUrl + '\', \'popup\', \'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left + '\');">Lookup SWIFT/BIC Code</a>';

                            var bankCity = form.addField({
                                id: "custpage_for_bank_city",
                                type: serverWidget.FieldType.TEXT,
                                label: "Bank City",
                                container: "wire_to_country"
                            });
                            if (bank_City) {
                                bankCity.defaultValue = bank_City;
                            }
                            if (paramData && editBtnFlag) {
                                bankCity.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.HIDDEN
                                });
                                bankCity.defaultValue = paramData.destBankCity;
                            }

                            var chipOrUID = form.addField({
                                id: "custpage_for_chip_or_uid",
                                type: serverWidget.FieldType.TEXT,
                                label: "CHIPS/UID",
                                container: "wire_to_country"
                            });
                            if (paramData && editBtnFlag && paramData.chipOrUID) {
                                chipOrUID.defaultValue = paramData.chipOrUID;
                            }

                            var chipsUrl = form.addField({
                                id: 'custpage_search_chips_uuid_lookup',
                                type: serverWidget.FieldType.INLINEHTML,
                                label: 'Lookup CHIPS/UID Code',
                                container: "wire_to_country"
                            });

                            chipsUrl.defaultValue = '<a href="#" id="custpage_chips_uid" style="color: blue; text-decoration: none; font-size: 12px; width: 150px" onclick="window.open(\'' + searchUrl + '\', \'popup\', \'width=' + width + ',height=' + height + ',top=' + top + ',left=' + left + '\');">Lookup CHIPS/UID Code</a>';

                            var bankName = form.addField({
                                id: "custpage_for_bank_name",
                                type: serverWidget.FieldType.TEXT,
                                label: "Bank Name",
                                container: "wire_to_country"
                            });
                            if (bank_name) {
                                bankName.defaultValue = bank_name;
                            }
                            if (paramData && editBtnFlag) {
                                bankName.updateDisplayType({
                                    displayType: serverWidget.FieldDisplayType.HIDDEN
                                });
                                bankName.defaultValue = paramData.destBankName;
                            } else {
                                bankName.updateBreakType({
                                    breakType: serverWidget.FieldBreakType.STARTCOL
                                });
                            }

                            var currency = form.addField({
                                id: "custpage_for_currency",
                                type: serverWidget.FieldType.TEXT,
                                label: "Currency",
                                container: "wire_to_country"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.DISABLED
                            });
                            currency.defaultValue = "USD (United States Dollars)";
                            if (paramData && editBtnFlag) {
                                currency.updateBreakType({
                                    breakType: serverWidget.FieldBreakType.STARTCOL
                                });
                            }

                            if (paramData && editBtnFlag && paramData.otherRoutingCode && paramData.otherRoutingCodeLabel) {
                                var routingCode = form.addField({
                                    id: "custpage_for_other_routing_code",
                                    type: serverWidget.FieldType.TEXT,
                                    label: paramData.otherRoutingCodeLabel,
                                    container: "wire_to_country"
                                });
                                routingCode.defaultValue = paramData.otherRoutingCode;
                            } else {
                                var routingCode = form.addField({
                                    id: "custpage_for_other_routing_code",
                                    type: serverWidget.FieldType.TEXT,
                                    label: "Routing Code",
                                    container: "wire_to_country"
                                });
                            }

                            var routingCodeLabel = form.addField({
                                id: "custpage_for_other_routing_label",
                                type: serverWidget.FieldType.TEXT,
                                label: "Routing Code",
                                container: "wire_to_country"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN
                            });
                            if (paramData && editBtnFlag && paramData.otherRoutingCodeLabel) {
                                routingCodeLabel.defaultValue = paramData.otherRoutingCodeLabel;
                            }

                            var purposeCode = form.addField({
                                id: "custpage_for_purpose_code",
                                type: serverWidget.FieldType.SELECT,
                                label: "Purpose Code",
                                container: "wire_to_country"
                            });
                            var textPrposeCode = form.addField({
                                id: "custpage_for_purpose_code_text",
                                type: serverWidget.FieldType.TEXT,
                                label: "Purpose Code",
                                container: "wire_to_country"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN
                            });
                            var checkPrposeCode = form.addField({
                                id: "custpage_for_purpose_code_check",
                                type: serverWidget.FieldType.TEXT,
                                label: "Purpose Code",
                                container: "wire_to_country"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN
                            });
                            if (paramData && editBtnFlag && paramData.purposeCode) {
                                purposeCode.defaultValue = paramData.purposeCode;
                                textPrposeCode.defaultValue = paramData.purposeCode;
                            }

                            var subPurposeCode = form.addField({
                                id: "custpage_for_sub_purpose_code",
                                type: serverWidget.FieldType.SELECT,
                                label: "Subpurpose Code",
                                container: "wire_to_country"
                            });
                            var textSubPurposeCode = form.addField({
                                id: "custpage_for_sub_purpose_code_text",
                                type: serverWidget.FieldType.TEXT,
                                label: "Subpurpose Code",
                                container: "wire_to_country"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN
                            });
                            var checkSubPurposeCode = form.addField({
                                id: "custpage_for_sub_purpose_code_check",
                                type: serverWidget.FieldType.TEXT,
                                label: "Subpurpose Code",
                                container: "wire_to_country"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN
                            });
                            if (paramData && editBtnFlag && paramData.subPurpCode) {
                                subPurposeCode.defaultValue = paramData.subPurpCode;
                                textSubPurposeCode.defaultValue = paramData.subPurpCode;
                            }

                            var wireDateGroup = form.addFieldGroup({
                                id: "custpage_wire_date_group",
                                label: "Wire Date"
                            });

                            var wireToDateHTML = form.addField({
                                id: "custpage_for_wire_date_html",
                                type: serverWidget.FieldType.INLINEHTML,
                                label: "Destination Country Desc",
                                container: "custpage_wire_date_group"
                            });
                            wireToDateHTML.updateLayoutType({
                                layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
                            });
                            var details = ""
                            details += "<h4 style='margin: 10px 0 0'>Wires are not sent on weekends or Citibank holidays.<br>One time wire transfers are sent in specified currency upon approval.<br>Recurring wire transfers are sent in USD only upon approval.</h4>";
                            wireToDateHTML.defaultValue = details;

                            var wireDate = form.addField({
                                id: "custpage_for_wire_date",
                                type: serverWidget.FieldType.DATE,
                                label: "Transfer Date",
                                container: "custpage_wire_date_group"
                            });

                            wireDate.isMandatory = true;
                            if (paramData && editBtnFlag && paramData.wireDate) {
                                wireDate.defaultValue = paramData.wireDate;
                            }

                            var wireAmountGroup = form.addFieldGroup({
                                id: "custpage_wire_amount_group",
                                label: "Wire Amount"
                            });

                            var wireAmount = form.addField({
                                id: "custpage_for_wire_amount",
                                type: serverWidget.FieldType.TEXT,
                                label: "Amount to be sent",
                                container: "custpage_wire_amount_group"
                            });
                            wireAmount.isMandatory = true;
                            wireAmount.maxLength = 14; // changed to support comma
                            if (payAmount) {
                                payAmount = payAmount.toFixed(2);
                                // Add commas by raghini
                                var parts = payAmount.toString().split('.');
                                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                var payAmountWithComma = parts.join('.'); //end
                                log.debug('payAmount with commas:', payAmountWithComma)
                                if (payAmount.length <= 12) {
                                    wireAmount.defaultValue = payAmountWithComma;
                                }
                            }
                            if (paramData && editBtnFlag && paramData.wireAmount) {
                                // Add comma for edit 
                                var parts = (paramData.wireAmount).toString().split('.');
                                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                var payAmountWithComma = parts.join('.'); //end
                                log.debug('for wire Edit test payAmount with commas:', payAmountWithComma);
                                wireAmount.defaultValue = payAmountWithComma;
                            }

                            /*var wireToAmountHTML = form.addField({
                                id: "custpage_for_wire_amount_html",
                                type: serverWidget.FieldType.INLINEHTML,
                                label: "Amount Desc",
                                container: "custpage_wire_amount_group"
                            });

                            var details = ""
                            details += "<div style='background-color: #4f6f90; display: flex; padding: 8px; margin-top: 16px; text-align: left; color: #ffffff; font-size: 18px; font-family: Arial, sans-serif;'>"
                            details += "<div style='margin-top: 7px;'>"
                            details += "<span>"
                            details += "<img style='height: 20px; margin-right: 8px; width: 20px' src=" + imgPath + "></img>"
                            details += "</span>"
                            details += "</div>"
                            details += "<div>"
                            details += "<p style='margin: 0; font: 400 14px/1.5 sans-serif; margin-top: 4px !important;'>When you send your wire in Foreign Currency, you:</p>"
                            details += "<p style='margin: 0; font: 400 14px/1.5 sans-serif; margin-top: 4px !important;'>- Protect yourself fluctuations by locking in the exchange rate with Citibank.</p>"
                            details += "<p style='margin: 0; font: 400 14px/1.5 sans-serif; margin-top: 4px !important;'>- Avoid possible delays in creaditing the beneficiary's account due to the currency exchange at the recipient bank.</p>"
                            details += "<p style='margin: 0; font: 400 14px/1.5 sans-serif; margin-top: 4px !important;'>- Know the amount in local currency being sent to the beneficiary.</p>"
                            details += "</div>"
                            details += "</div>"
                            wireToAmountHTML.defaultValue = details;*/

                            var beneficiaryDetails = form.addFieldGroup({
                                id: "beneficiary_details",
                                label: "Beneficiary Details"
                            });

                            var beneficiary = form.addField({
                                id: "custpage_for_beneficiary_name",
                                type: serverWidget.FieldType.TEXT,
                                label: "Beneficiary Name",
                                container: "beneficiary_details"
                            });
                            if (beneficiary_Name) {
                                beneficiary.defaultValue = beneficiary_Name;
                            }
                            beneficiary.isMandatory = true;
                            beneficiary.maxLength = 34;
                            if (paramData && editBtnFlag && paramData.beneficiaryName) {
                                beneficiary.defaultValue = paramData.beneficiaryName;
                            }

                            var accountNumber = form.addField({
                                id: "custpage_for_account_number",
                                type: serverWidget.FieldType.TEXT,
                                label: "Account Number",
                                container: "beneficiary_details"
                            });
                            if (beneficiary_Acctno) {
                                accountNumber.defaultValue = beneficiary_Acctno;
                            }
                            accountNumber.isMandatory = true;
                            accountNumber.maxLength = 30;
                            if (paramData && editBtnFlag && paramData.beneficiaryAccountNumber) {
                                accountNumber.defaultValue = paramData.beneficiaryAccountNumber;
                            }

                            var accountNumberFormat = form.addField({
                                id: "custpage_for_account_number_format",
                                type: serverWidget.FieldType.TEXT,
                                label: "Account Number Format",
                                container: "wire_to_country"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN
                            });

                            var ibanOtherCountryFormat = form.addField({
                                id: "custpage_for_iban_other_format",
                                type: serverWidget.FieldType.TEXT,
                                label: "Account Number Format",
                                container: "wire_to_country"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN
                            });

                            var accountNumberMaxLength = form.addField({
                                id: "custpage_for_account_number_max_length",
                                type: serverWidget.FieldType.TEXT,
                                label: "Account Number Max Length",
                                container: "wire_to_country"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN
                            });

                            var accountNumberHTML = form.addField({
                                id: "custpage_for_account_number_html",
                                type: serverWidget.FieldType.INLINEHTML,
                                label: "Account Number Desc",
                                container: "beneficiary_details"
                            });

                            var details = ""
                            details += "<div id='custpage_for_account_number_html' style='background-color: #4f6f90; display: flex; padding: 8px; margin-top: 16px; text-align: left; color: #ffffff; font-size: 18px; font-family: Arial, sans-serif; width: 80%;'>"
                            details += "<div style='margin-top: 7px;'>"
                            details += "<span>"
                            details += "<img style='height: 20px; margin-right: 8px; width: 20px' src=" + imgPath + "></img>"
                            details += "</span>"
                            details += "</div>"
                            details += "<div>"
                            details += "<p id='custpage_for_acc_number_details_html' style='margin: 0; font: 400 14px/1.5 sans-serif; margin-top: 4px !important;'>Please use care to enter the correct IBAN in the Account Number field. Not using a correct IBAN may result in delayed or rejected wires and/or additional processing fees.</p>"
                            details += "</div>"
                            details += "</div>"
                            accountNumberHTML.defaultValue = details;

                            var phoneNumber = form.addField({
                                id: "custpage_for_phone_number",
                                type: serverWidget.FieldType.TEXT,
                                label: "Phone Number",
                                container: "beneficiary_details"
                            });
                            if (beneficiary_Phone) {
                                phoneNumber.defaultValue = beneficiary_Phone;
                            }
                            phoneNumber.maxLength = 20;
                            if (paramData && editBtnFlag && paramData.phoneNumber) {
                                phoneNumber.defaultValue = paramData.phoneNumber;
                            }

                            var address1 = form.addField({
                                id: "custpage_for_address_one",
                                type: serverWidget.FieldType.TEXT,
                                label: "Address",
                                container: "beneficiary_details"
                            }).updateBreakType({
                                breakType: serverWidget.FieldBreakType.STARTCOL
                            });
                            // address1.isMandatory = true;
                            

                            /* if (beneficiary_Address1) {
                                address1.defaultValue = beneficiary_Address1;
                            } */
                            log.debug("Beneficiary Address 1: " + beneficiary_Address1);
                            log.debug("Beneficiary Address 2: " + beneficiary_Address2);
                            log.debug("Beneficiary Address 3: " + beneficiary_Address3);
                            if (beneficiary_Address1 && beneficiary_Address1.length <= 33) {
                                address1.defaultValue = beneficiary_Address1;
                            }
                            else
                                address1.defaultValue = ''; // Umar has updated on 20th July 2026 
                            //address1.maxLength = 35;
                            address1.maxLength = 33; //Umar has updated on 20th July 2026
                            if (paramData && editBtnFlag && paramData.address1) {
                                address1.defaultValue = paramData.address1;
                            } 

                            var address2 = form.addField({
                                id: "custpage_for_address_two",
                                type: serverWidget.FieldType.TEXT,
                                label: " ",
                                container: "beneficiary_details"
                            });

                            // address2.isMandatory = true;

                            if (beneficiary_Address2 && beneficiary_Address2.length <= 33) {
                                address2.defaultValue = beneficiary_Address2;
                            }
                            else 
                                address2.defaultValue = ''; // Umar has updated on 20th July 2026
                            //address2.maxLength = 35;
                            address2.maxLength = 33; // Umar has updated on 20th July 2026
                            if (paramData && editBtnFlag && paramData.address2) {
                                address2.defaultValue = paramData.address2;
                            } 
                            var address3 = form.addField({ //rutuja changed the address line 3 to city and made the fields mandatory for 3 address lines as stated in JIRA
                                id: "custpage_for_city",
                                type: serverWidget.FieldType.TEXT,
                                label: "City",
                                container: "beneficiary_details"
                            });
                            address3.isMandatory = true;

                            if (beneficiary_Address3 && beneficiary_Address3.length <= 30) {
                                address3.defaultValue = beneficiary_Address3;
                            }
                            else
                                address3.defaultValue = '';
                           // address3.maxLength = 35;
                            address3.maxLength = 30; // Umar has updated on 20th July 2026
                            if (paramData && editBtnFlag && paramData.address3) {
                                address3.defaultValue = paramData.address3;
                            }
                            //Start - Umar has Updated this code on 15th July 2026
                            if ((beneficiary_Address1 && beneficiary_Address1.length > 33) || (beneficiary_Address2 && beneficiary_Address2.length > 33) || (beneficiary_Address3 && beneficiary_Address3.length > 30)) {
                                var address1HTML = form.addField({
                                    id: "custpage_for_address_one_html",
                                    type: serverWidget.FieldType.INLINEHTML,
                                    label: "Address One Description",
                                    container: "beneficiary_details"
                                });

                                var addr1details = ""
                                addr1details += "<div id='custpage_for_address_one_html' style='background-color: #4f6f90; display: flex; padding: 8px; margin-top: 16px; text-align: left; color: #ffffff; font-size: 18px; font-family: Arial, sans-serif; width: 80%;'>"
                                addr1details += "<div style='margin-top: 7px;'>"
                                addr1details += "<span>"
                                addr1details += "<img style='height: 20px; margin-right: 8px; width: 20px' src=" + imgPath + "></img>"
                                addr1details += "</span>"
                                addr1details += "</div>"
                                addr1details += "<div>"
                                addr1details += "<p id='custpage_for_address_one_details_html' style='margin: 0; font: 400 14px/1.5 sans-serif; margin-top: 4px !important;'>The beneficiary address field has been reset. Please enter the address in the new format to continue.<br>"+beneficiary_Address1+"<br>"+beneficiary_Address2+"<br>"+beneficiary_Address3+"</p>" // Umar has removed the keys such as addr1,addr2 and City as per Shikha's suggestion on 31st August 2026.
                                addr1details += "</div>"
                                addr1details += "</div>"
                                address1HTML.defaultValue = addr1details;
                            }
                            //End - Umar has Updated this code on 15th July 2026
                            var special_instructions1 = form.addField({
                                id: "custpage_for_spec_instr_one",
                                type: serverWidget.FieldType.TEXT,
                                label: "Special Instructions (35 Characters per line)",
                                container: "beneficiary_details"
                            }).updateBreakType({
                                breakType: serverWidget.FieldBreakType.STARTCOL
                            });
                            if (special_instr1) {
                                special_instructions1.defaultValue = special_instr1;
                            }
                            special_instructions1.maxLength = 35;
                            if (paramData && editBtnFlag && paramData.specialInstructions1) {
                                special_instructions1.defaultValue = paramData.specialInstructions1;
                            }

                            var special_instructions2 = form.addField({
                                id: "custpage_for_spec_instr_two",
                                type: serverWidget.FieldType.TEXT,
                                label: " ",
                                container: "beneficiary_details"
                            });
                            if (special_instr2) {
                                special_instructions2.defaultValue = special_instr2;
                            }
                            special_instructions2.maxLength = 35;
                            if (paramData && editBtnFlag && paramData.specialInstructions2) {
                                special_instructions2.defaultValue = paramData.specialInstructions2;
                            }

                            var special_instructions3 = form.addField({
                                id: "custpage_for_spec_instr_three",
                                type: serverWidget.FieldType.TEXT,
                                label: "  ",
                                container: "beneficiary_details"
                            });
                            if (special_instr3) {
                                special_instructions3.defaultValue = special_instr3;
                            }
                            special_instructions3.maxLength = 35;
                            if (paramData && editBtnFlag && paramData.specialInstructions3) {
                                special_instructions3.defaultValue = paramData.specialInstructions3;
                            }

                            var additionalInformation = form.addFieldGroup({
                                id: "custpage_additional_information",
                                label: "Additional Information"
                            });

                            var additionalInformationHTML = form.addField({
                                id: "custpage_for_add_info_html",
                                type: serverWidget.FieldType.INLINEHTML,
                                label: "Destination Country Desc",
                                container: "custpage_additional_information"
                            });
                            additionalInformationHTML.updateLayoutType({
                                layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE
                            });
                            additionalInformationHTML.defaultValue = "<h4>Customer Reference Number, Additional Reference and Additional Description are not shown on the wire instruction and are for internal use only.</h4>";

                            var customerReferenceNumber = form.addField({
                                id: "custpage_for_cust_refer_number",
                                type: serverWidget.FieldType.TEXT,
                                label: "Customer Reference Number",
                                container: "custpage_additional_information"
                            });
                            customerReferenceNumber.maxLength = 10;
                            if (paramData && editBtnFlag && paramData.customerReferenceNumber) {
                                customerReferenceNumber.defaultValue = paramData.customerReferenceNumber;
                            }

                            var additionalReferences = form.addField({
                                id: "custpage_for_add_refers",
                                type: serverWidget.FieldType.TEXT,
                                label: "Additional Reference",
                                container: "custpage_additional_information"
                            });
                            additionalReferences.maxLength = 15;
                            if (paramData && editBtnFlag && paramData.customerAdditionalReference) {
                                additionalReferences.defaultValue = paramData.customerAdditionalReference;
                            }
                        } else if (entitlements.indexOf('INTERNAL_TRANSFERS') != -1 && wireFilter == 'INTERNAL_TRANSFERS') {

                            //Internal Transfer
                            var transFromtab = form.addSubtab({
                                id: 'custpage_trans_from_tabid',
                                label: "Transfer From"
                            });

                            var transferFrom = form.addSublist({
                                id: "custpage_inter_transfer_from",
                                type: serverWidget.SublistType.LIST,
                                label: "Transfer From",
                                tab: "custpage_trans_from_tabid"
                            });
                            var selectAccount = transferFrom.addField({
                                id: "custlist_inter_sel_acc_from",
                                type: serverWidget.FieldType.RADIO,
                                label: "Select Account"
                            });
                            var accountNumber = transferFrom.addField({
                                id: "custlist_inter_acc_num_from",
                                type: serverWidget.FieldType.TEXT,
                                label: "Account Number"
                            });
                            var encryptedAccountNumber = transferFrom.addField({
                                id: "custlist_inter_ency_acc_num_from",
                                type: serverWidget.FieldType.TEXT,
                                label: "Encrypted Account Number"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });
                            var accountType = transferFrom.addField({
                                id: "custlist_inter_acc_type_from",
                                type: serverWidget.FieldType.TEXT,
                                label: "Account Type"
                            });
                            var currentAvailabeDisplay = transferFrom.addField({
                                id: "custlist_inter_disp_curr_avail_from",
                                type: serverWidget.FieldType.TEXT,
                                label: "Current Available(USD)"
                            });
                            var currentAvailable = transferFrom.addField({
                                id: "custlist_inter_curr_avail_from",
                                type: serverWidget.FieldType.FLOAT,
                                label: "Current Available(USD)"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });

                            var lineCountFrom = 0;
                            //log.debug("accountDetails", accountDetails);
                            //log.debug("NSAccounts", NSAccounts);
                            for (var i = 0; i < accountDetails.length; i++) {
                                if (checkForEntitlementType(accountDetails[i].entitlements, wireFilter) && (NSAccounts.indexOf(accountDetails[i].encryptedAccountIdentifier) != -1)) {
                                    transferFrom.setSublistValue({
                                        id: "custlist_inter_acc_num_from",
                                        line: lineCountFrom,
                                        value: accountDetails[i].displayableAccountNumber
                                    });
                                    if (accountDetails[i].encryptedAccountIdentifier != "") {
                                        transferFrom.setSublistValue({
                                            id: "custlist_inter_ency_acc_num_from",
                                            line: lineCountFrom,
                                            value: accountDetails[i].encryptedAccountIdentifier
                                        });
                                    }
                                    transferFrom.setSublistValue({
                                        id: "custlist_inter_acc_type_from",
                                        line: lineCountFrom,
                                        value: accountDetails[i].accountTypeLabel
                                    });
                                    transferFrom.setSublistValue({
                                        id: "custlist_inter_disp_curr_avail_from",
                                        line: lineCountFrom,
                                        value: formatAmount(accountDetails[i].currentAvailableAmount)
                                    });
                                    transferFrom.setSublistValue({
                                        id: "custlist_inter_curr_avail_from",
                                        line: lineCountFrom,
                                        value: Number(accountDetails[i].currentAvailableAmount).toFixed(2)
                                    });
                                    if (paramData && editBtnFlag && accountDetails[i].displayableAccountNumber == paramData.accountNumberFrom) {
                                        transferFrom.setSublistValue({
                                            id: "custlist_inter_sel_acc_from",
                                            line: lineCountFrom,
                                            value: "T"
                                        });
                                    }

                                    lineCountFrom++;
                                }
                            }

                            var transTotab = form.addSubtab({
                                id: 'custpage_trans_to_tabid',
                                label: "Transfer To"
                            });

                            var transferTo = form.addSublist({
                                id: "custpage_inter_transfer_to",
                                type: serverWidget.SublistType.LIST,
                                label: "Transfer To",
                                tab: "custpage_trans_to_tabid",
                                container: "custpage_details"
                            });

                            var selectAccount2 = transferTo.addField({
                                id: "custlist_inter_sel_acc_to",
                                type: serverWidget.FieldType.RADIO,
                                label: "Select Account"
                            });
                            var accountNumber2 = transferTo.addField({
                                id: "custlist_inter_acc_num_to",
                                type: serverWidget.FieldType.TEXT,
                                label: "Account Number"
                            });
                            var encryptedAccountNumber2 = transferTo.addField({
                                id: "custlist_inter_ency_acc_num_to",
                                type: serverWidget.FieldType.TEXT,
                                label: "Encrypted Account Number"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });
                            var accountType2 = transferTo.addField({
                                id: "custlist_inter_acc_type_to",
                                type: serverWidget.FieldType.TEXT,
                                label: "Account Type"
                            });
                            var currentAvailabeDisplay2 = transferTo.addField({
                                id: "custlist_inter_disp_curr_avail_to",
                                type: serverWidget.FieldType.TEXT,
                                label: "Current Available(USD)"
                            });
                            var currentAvailabe2 = transferTo.addField({
                                id: "custlist_inter_curr_avail_to",
                                type: serverWidget.FieldType.FLOAT,
                                label: "Current Available(USD)"
                            }).updateDisplayType({
                                displayType: serverWidget.FieldDisplayType.HIDDEN,
                            });

                            var lineCountTo = 0;
                            for (var i = 0; i < accountDetails.length; i++) {
                                if (checkForEntitlementType(accountDetails[i].entitlements, wireFilter) && (NSAccounts.indexOf(accountDetails[i].encryptedAccountIdentifier) != -1)) {
                                    transferTo.setSublistValue({
                                        id: "custlist_inter_acc_num_to",
                                        line: lineCountTo,
                                        value: accountDetails[i].displayableAccountNumber
                                    });
                                    if (accountDetails[i].encryptedAccountIdentifier != "") {
                                        transferTo.setSublistValue({
                                            id: "custlist_inter_ency_acc_num_to",
                                            line: lineCountTo,
                                            value: accountDetails[i].encryptedAccountIdentifier
                                        });
                                    }
                                    transferTo.setSublistValue({
                                        id: "custlist_inter_acc_type_to",
                                        line: lineCountTo,
                                        value: accountDetails[i].accountTypeLabel
                                    });
                                    transferTo.setSublistValue({
                                        id: "custlist_inter_disp_curr_avail_to",
                                        line: lineCountTo,
                                        value: formatAmount(accountDetails[i].currentAvailableAmount)
                                    });
                                    transferTo.setSublistValue({
                                        id: "custlist_inter_curr_avail_to",
                                        line: lineCountTo,
                                        value: Number(accountDetails[i].currentAvailableAmount).toFixed(2)
                                    });

                                    if (paramData && editBtnFlag && accountDetails[i].displayableAccountNumber == paramData.accountNumberTo) {
                                        transferTo.setSublistValue({
                                            id: "custlist_inter_sel_acc_to",
                                            line: lineCountTo,
                                            value: "T"
                                        });
                                    }
                                    lineCountTo++;
                                }
                            }

                            var details = form.addFieldGroup({
                                id: "custpage_details",
                                label: "Details"
                            });

                            var amountToBeSent = form.addField({
                                id: "custpage_inter_amt_to_be_sent",
                                type: serverWidget.FieldType.TEXT,
                                label: "Amount to be sent",
                                container: "custpage_details"
                            });
                            amountToBeSent.isMandatory = true;
                            amountToBeSent.maxLength = 14; //CR:  8/11
                            if (paramData && editBtnFlag && paramData.amountToBeSent) {
                                // Add comma for edit
                                var parts = (paramData.amountToBeSent).toString().split('.');
                                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                                var payAmountWithComma = parts.join('.'); //end
                                log.debug('Internal Transfer Edit test amountToBeSent with commas:', payAmountWithComma);
                                amountToBeSent.defaultValue = payAmountWithComma;
                            }

                            var transferDate = form.addField({
                                id: "custpage_inter_trans_date",
                                type: serverWidget.FieldType.DATE,
                                label: "Transfer Date",
                                container: "custpage_details"
                            });
                            transferDate.isMandatory = true;
                            if (paramData && editBtnFlag && paramData.transferDate) {
                                transferDate.defaultValue = paramData.transferDate;
                            }

                            var transactionDescription = form.addField({
                                id: "custpage_inter_trans_desp",
                                type: serverWidget.FieldType.TEXT,
                                label: "Transaction Description (optional)",
                                container: "custpage_details"
                            });
                            if (paramData && editBtnFlag && paramData.transactionDescription) {
                                transactionDescription.defaultValue = paramData.transactionDescription;
                            }
                            transactionDescription.maxLength = 35;
                        }

                        form.addButton({
                            id: 'custpage_reset',
                            label: 'Reset',
                            functionName: "reset(\'" + wireFilter + "\')"
                        });

                        form.addSubmitButton({
                            id: 'custpage_continue',
                            label: 'Continue'
                        });

                        //Facelift changes start
                        var styles = form.addField({
                            id: 'styles',
                            label: ' ',
                            type: serverWidget.FieldType.INLINEHTML,
                        });

                        var stylesScript = '';
                        stylesScript += '<script>';
                        stylesScript += 'var continue_btn = document.getElementById("tdbody_submitter");';
                        stylesScript += 'continue_btn.style.borderRadius = "30px";';
                        stylesScript += 'var continue_btn_tr = document.getElementById("tr_submitter");';
                        stylesScript += 'continue_btn_tr.style.borderRadius = "30px";';
                        stylesScript += 'var reset_btn = document.getElementById("tdbody_custpage_reset");';
                        stylesScript += 'reset_btn.style.borderRadius = "30px";';
                        stylesScript += 'var reset_btn_tr = document.getElementById("tr_custpage_reset");';
                        stylesScript += 'reset_btn_tr.style.borderRadius = "30px";';
                        // stylesScript +=	'var continue_btn_bottom = document.getElementById("tdbody_secondarysubmitter");';
                        // stylesScript += 'console.log("continue_btn_bottom", continue_btn_bottom);';
                        // stylesScript +=	 'continue_btn_bottom.style.borderRadius = "30px";';
                        // stylesScript +=	'var continue_btn_tr_bottom = document.getElementById("tr_secondarysubmitter");';
                        // stylesScript +=	'continue_btn_tr_bottom.style.borderRadius = "30px";';

                        //               stylesScript +=	'var reset_btn_bottom = document.getElementById("tdbody_secondarycustpage_reset");';
                        //               stylesScript +=	'reset_btn_bottom.style.borderRadius = "30px";';
                        //               stylesScript +=	'var reset_btn_tr_bottom = document.getElementById("tr_secondarycustpage_reset");';
                        //               stylesScript += 'reset_btn_tr_bottom.style.borderRadius = "30px";';
                        stylesScript += '</script>';
                        styles.defaultValue = stylesScript;
                        //Facelift changes end

                        // if (entitlements.indexOf('INTERNAL_TRANSFERS') != -1) {
                        // 	form.addButton({
                        // 		id: 'custpage_internal_trasfer',
                        // 		label: 'Internal Transfer',
                        // 		functionName: 'internalTransfer()'
                        // 	});
                        // }

                        // if (entitlements.indexOf('DOMESTIC_WIRES') != -1) {
                        // 	form.addButton({
                        // 		id: 'custpage_domestic_wire',
                        // 		label: 'Domestic Wire',
                        // 		functionName: 'domesticWire()'
                        // 	});
                        // }

                        // if (entitlements.indexOf('FOREIGN_WIRES') != -1) {
                        // 	form.addButton({
                        // 		id: 'custpage_foreign_wire',
                        // 		label: 'Foreign Wire',
                        // 		functionName: 'foreignWire()'
                        // 	});
                        // }
                        // form.addButton({
                        // 	id: 'custpage_home',
                        // 	label: 'Home',
                        // 	functionName: 'home()'
                        // });
                        // form.addButton({
                        // 	id: 'custpage_payment_status',
                        // 	label: 'Payment Status',
                        // 	functionName: 'paymentStatus()'
                        // });
                        if (cancelBtnFlag || editBtnFlag) {
                            file.delete({
                                id: fileId
                            });
                        }
                        context.response.writePage(form);
                    } else {
                        redirect.toSuitelet({
                            scriptId: 'customscript_citiintegrator_ns_ss_logpge',
                            deploymentId: 'customdeploy_citiintegrator_ns_ss_logpge'
                        });
                    }

                } else {
                    var wireType = context.request.parameters.custpage_wire_type;
                    var paramObj = {};
                    paramObj.wireType = wireType;
                    if (wireType == "INTERNAL_TRANSFERS") {
                        //Internal Transfer
                        var lineCountFrom = context.request.getLineCount('custpage_inter_transfer_from');
                        var accountNumberFrom, encyAccountNumberFrom, accountTypeFrom, currentAvailabeFrom;
                        for (var i = 0; i < lineCountFrom; i++) {
                            var selectAccountFrom = context.request.getSublistValue('custpage_inter_transfer_from', 'custlist_inter_sel_acc_from', i);
                            if (selectAccountFrom == "T") {
                                accountNumberFrom = context.request.getSublistValue('custpage_inter_transfer_from', 'custlist_inter_acc_num_from', i);
                                encyAccountNumberFrom = context.request.getSublistValue('custpage_inter_transfer_from', 'custlist_inter_ency_acc_num_from', i);
                                accountTypeFrom = context.request.getSublistValue('custpage_inter_transfer_from', 'custlist_inter_acc_type_from', i);
                                currentAvailabeFrom = context.request.getSublistValue('custpage_inter_transfer_from', 'custlist_inter_curr_avail_from', i);
                            }
                        }

                        var lineCountTo = context.request.getLineCount('custpage_inter_transfer_to');
                        var accountNumberTo, encyAccountNumberTo, accountTypeTo, currentAvailabeTo;
                        for (var i = 0; i < lineCountTo; i++) {
                            var selectAccountTo = context.request.getSublistValue('custpage_inter_transfer_to', 'custlist_inter_sel_acc_to', i);
                            if (selectAccountTo == "T") {
                                accountNumberTo = context.request.getSublistValue('custpage_inter_transfer_to', 'custlist_inter_acc_num_to', i);
                                encyAccountNumberTo = context.request.getSublistValue('custpage_inter_transfer_to', 'custlist_inter_ency_acc_num_to', i);
                                accountTypeTo = context.request.getSublistValue('custpage_inter_transfer_to', 'custlist_inter_acc_type_to', i);
                                currentAvailabeTo = context.request.getSublistValue('custpage_inter_transfer_to', 'custlist_inter_curr_avail_to', i);
                            }
                        }
                        var amountToBeSent = context.request.parameters.custpage_inter_amt_to_be_sent;
                        // CR: remove comma  
                        amountToBeSent = amountToBeSent.replace(/,/g, '');
                        var transferDate = context.request.parameters.custpage_inter_trans_date;
                        var transactionDescription = context.request.parameters.custpage_inter_trans_desp;
                        //covert date into "DD/MM/YYYY"
                        var scheduledDate = formatDate(transferDate);
                        paramObj.accountNumberFrom = accountNumberFrom;
                        paramObj.encyAccountNumberFrom = encyAccountNumberFrom;
                        paramObj.accountTypeFrom = accountTypeFrom;
                        paramObj.currentAvailabeFrom = currentAvailabeFrom;
                        paramObj.accountNumberTo = accountNumberTo;
                        paramObj.encyAccountNumberTo = encyAccountNumberTo;
                        paramObj.accountTypeTo = accountTypeTo;
                        paramObj.currentAvailabeTo = currentAvailabeTo;
                        paramObj.amountToBeSent = amountToBeSent;
                        paramObj.transferDate = transferDate;
                        paramObj.scheduledDate = scheduledDate;
                        paramObj.transactionDescription = transactionDescription;
                    }
                    else if (wireType == "DOMESTIC_WIRES") {
                        //Domestic Wire
                        var lineCountFrom = context.request.getLineCount('custpage_dom_transfer_from');
                        var accountNumberFrom, encyAccountNumberFrom, accountTypeFrom, currentAvailabeFrom;
                        for (var i = 0; i < lineCountFrom; i++) {
                            var selectAccountFrom = context.request.getSublistValue('custpage_dom_transfer_from', 'custlist_dom_select_account', i);
                            if (selectAccountFrom == "T") {
                                accountNumberFrom = context.request.getSublistValue('custpage_dom_transfer_from', 'custlist_dom_account_number', i);
                                encyAccountNumberFrom = context.request.getSublistValue('custpage_dom_transfer_from', 'custlist_dom_ency_acc_num_from', i);
                                accountTypeFrom = context.request.getSublistValue('custpage_dom_transfer_from', 'custlist_dom_account_type', i);
                                currentAvailabeFrom = context.request.getSublistValue('custpage_dom_transfer_from', 'custlist_dom_current_available', i);
                            }
                        }
                        var beneficiaryName = context.request.parameters.custpage_dom_beneficiary_name;
                        var beneficiaryAccountNumber = context.request.parameters.custpage_dom_account_number;
                        var phoneNumber = context.request.parameters.custpage_dom_phone_number;
                        var address1 = context.request.parameters.custpage_dom_address_one;
                        var address2 = context.request.parameters.custpage_dom_address_two;
                        var address3 = context.request.parameters.custpage_dom_city;
                        var specialInstructions1 = context.request.parameters.custpage_dom_spec_instr_one;
                        var specialInstructions2 = context.request.parameters.custpage_dom_spec_instr_two;
                        var specialInstructions3 = context.request.parameters.custpage_dom_spec_instr_three;
                        var wireDate = context.request.parameters.custpage_dom_wire_date;
                        var wireAmount = context.request.parameters.custpage_dom_wire_amount;
                        // CR: remove comma  
                        wireAmount = wireAmount.replace(/,/g, '');
                        var customerReferenceNumber = context.request.parameters.custpage_dom_cust_refer_number;
                        var customerAdditionalReference = context.request.parameters.custpage_dom_add_refers;
                        var customerAdditionalDescription = context.request.parameters.custpage_dom_add_description;
                        //covert date into "DD/MM/YYYY"
                        var scheduledDate = formatDate(wireDate);
                        paramObj.accountNumberFrom = accountNumberFrom;
                        paramObj.encyAccountNumberFrom = encyAccountNumberFrom;
                        paramObj.accountTypeFrom = accountTypeFrom;
                        paramObj.currentAvailabeFrom = currentAvailabeFrom;
                        paramObj.beneficiaryName = beneficiaryName;
                        paramObj.beneficiaryAccountNumber = beneficiaryAccountNumber;
                        paramObj.phoneNumber = phoneNumber;
                        paramObj.address1 = address1;
                        paramObj.address2 = address2;
                        paramObj.address3 = address3;
                        paramObj.specialInstructions1 = specialInstructions1;
                        paramObj.specialInstructions2 = specialInstructions2;
                        paramObj.specialInstructions3 = specialInstructions3;
                        paramObj.wireDate = wireDate;
                        paramObj.scheduledDate = scheduledDate;
                        paramObj.wireAmount = wireAmount;
                        paramObj.customerReferenceNumber = customerReferenceNumber;
                        paramObj.customerAdditionalReference = customerAdditionalReference;
                        paramObj.customerAdditionalDescription = customerAdditionalDescription;
                        var usCreditInterBank = context.request.parameters.custpage_dom_us_credit_inter_bank;
                        paramObj.usCreditInterBank = usCreditInterBank;
                        var routingCode;
                        var intermediatoryBankFlag = false;
                        var routingCodeType = "ABA";
                        var destBankName = context.request.parameters.custpage_dom_dest_bank_name_hidden;
                        var destBankAddr = context.request.parameters.custpage_dom_dest_bank_addr_hidden;
                        var destBankState = context.request.parameters.custpage_dom_dest_bank_state_hidden;
                        if (usCreditInterBank == "inter_bank") {
                            routingCode = context.request.parameters.custpage_inter_bank_routing_number;
                            intermediatoryBankFlag = true;
                            var financialInstitutionName = context.request.parameters.custpage_financial_institution_name;
                            var financialInstitutionAccount = context.request.parameters.custpage_finint_account;
                            var city = context.request.parameters.custpage_city;
                            var state = context.request.parameters.custpage_state;
                            var bankAddress = context.request.parameters.custpage_bank_address;
                            var hiddenBankAddress = context.request.parameters.custpage_dom_aba_number_details_hidden;
                            var displayBankAddress = "<p id='custpage_bank_routing_info'>" + hiddenBankAddress + "<p>";
                            paramObj.displayBankAddress = displayBankAddress;
                            paramObj.hiddenBankAddress = hiddenBankAddress;
                            paramObj.routingCode = routingCode;
                            paramObj.routingCodeType = routingCodeType;
                            paramObj.intermediatoryBankFlag = intermediatoryBankFlag;
                            paramObj.financialInstitutionName = destBankName;
                            paramObj.state = destBankState;
                            paramObj.bankAddress = destBankAddr;
                            paramObj.destBankName = financialInstitutionName;
                            paramObj.destfinInstaccount = financialInstitutionAccount;
                            paramObj.destBankAddr = bankAddress;
                            paramObj.destBankState = state;
                            paramObj.destBankCity = city;
                            paramObj.ofiIndicator = "Y";
                        } else {
                            var bankAddress = context.request.parameters.custpage_dom_aba_number_details_hidden;
                            var displayBankAddress = "<p id='custpage_bank_routing_info'>" + bankAddress + "<p>";
                            routingCode = context.request.parameters.custpage_bank_routing_number;
                            paramObj.displayBankAddress = displayBankAddress;
                            paramObj.hiddenBankAddress = bankAddress;
                            paramObj.routingCode = routingCode;
                            paramObj.routingCodeType = routingCodeType;
                            paramObj.intermediatoryBankFlag = intermediatoryBankFlag;
                            paramObj.bankAddress = bankAddress;
                            paramObj.destBankName = destBankName;
                            paramObj.destBankAddr = destBankAddr;
                            paramObj.destBankState = destBankState;
                            paramObj.ofiIndicator = "N";
                        }
                    }
                    else if (wireType == "REAL_TIME_PAYMENTS") { //rutuja start
                        //Domestic Wire
                        var lineCountFrom = context.request.getLineCount('custpage_rtp_pay_from');
                        var accountNumberFrom, encyAccountNumberFrom, accountTypeFrom, currentAvailabeFrom;
                        for (var i = 0; i < lineCountFrom; i++) {
                            var selectAccountFrom = context.request.getSublistValue('custpage_rtp_pay_from', 'custlist_rtp_select_account', i);
                            if (selectAccountFrom == "T") {
                                accountNumberFrom = context.request.getSublistValue('custpage_rtp_pay_from', 'custlist_rtp_account_number', i);
                                encyAccountNumberFrom = context.request.getSublistValue('custpage_rtp_pay_from', 'custlist_rtp_ency_acc_num_from', i);
                                accountTypeFrom = context.request.getSublistValue('custpage_rtp_pay_from', 'custlist_rtp_account_type', i);
                                currentAvailabeFrom = context.request.getSublistValue('custpage_rtp_pay_from', 'custlist_rtp_current_available', i);
                            }
                        }
                        var beneficiaryName = context.request.parameters.custpage_rtp_beneficiary_name;
                        var beneficiaryAccountNumber = context.request.parameters.custpage_rtp_account_number;
                        var phoneNumber = context.request.parameters.custpage_rtp_phone_number;
                        // var address1 = context.request.parameters.custpage_dom_address_one;
                        // var address2 = context.request.parameters.custpage_dom_address_two;
                        // var address3 = context.request.parameters.custpage_dom_address_three;
                        // var specialInstructions1 = context.request.parameters.custpage_dom_spec_instr_one;
                        // var specialInstructions2 = context.request.parameters.custpage_dom_spec_instr_two;
                        // var specialInstructions3 = context.request.parameters.custpage_dom_spec_instr_three;
                        var wireDate = context.request.parameters.custpage_rtp_wire_date;
                        var wireAmount = context.request.parameters.custpage_rtp_wire_amount;
                        // CR: remove comma  
                        wireAmount = wireAmount.replace(/,/g, '');
                        // var customerReferenceNumber = context.request.parameters.custpage_dom_cust_refer_number;
                        // var customerAdditionalReference = context.request.parameters.custpage_dom_add_refers;
                        var customerAdditionalDescription = context.request.parameters.custpage_rtp_add_description;
                        //covert date into "DD/MM/YYYY"
                        var scheduledDate = formatDate(wireDate);
                        paramObj.accountNumberFrom = accountNumberFrom;
                        paramObj.encyAccountNumberFrom = encyAccountNumberFrom;
                        paramObj.accountTypeFrom = accountTypeFrom;
                        paramObj.currentAvailabeFrom = currentAvailabeFrom;
                        paramObj.beneficiaryName = beneficiaryName;
                        paramObj.beneficiaryAccountNumber = beneficiaryAccountNumber;
                        paramObj.phoneNumber = phoneNumber;
                        // paramObj.address1 = address1;
                        // paramObj.address2 = address2;
                        // paramObj.address3 = address3;
                        // paramObj.specialInstructions1 = specialInstructions1;
                        // paramObj.specialInstructions2 = specialInstructions2;
                        // paramObj.specialInstructions3 = specialInstructions3;
                        paramObj.wireDate = wireDate;
                        paramObj.scheduledDate = scheduledDate;
                        paramObj.wireAmount = wireAmount;
                        // paramObj.customerReferenceNumber = customerReferenceNumber;
                        // paramObj.customerAdditionalReference = customerAdditionalReference;
                        paramObj.customerAdditionalDescription = customerAdditionalDescription;
                        // var usCreditInterBank = context.request.parameters.custpage_dom_us_credit_inter_bank;
                        // paramObj.usCreditInterBank = usCreditInterBank;
                        var routingCode;
                        var intermediatoryBankFlag = false;
                        var routingCodeType = "ABA";
                        // var destBankName = context.request.parameters.custpage_dom_dest_bank_name_hidden;
                        // var destBankAddr = context.request.parameters.custpage_dom_dest_bank_addr_hidden;
                        // var destBankState = context.request.parameters.custpage_dom_dest_bank_state_hidden;
                        // if (usCreditInterBank == "inter_bank") {
                        //     routingCode = context.request.parameters.custpage_inter_bank_routing_number;
                        //     intermediatoryBankFlag = true;
                        //     var financialInstitutionName = context.request.parameters.custpage_financial_institution_name;
                        //     var financialInstitutionAccount = context.request.parameters.custpage_finint_account;
                        //     var city = context.request.parameters.custpage_city;
                        //     var state = context.request.parameters.custpage_state;
                        //     var bankAddress = context.request.parameters.custpage_bank_address;
                        //     var hiddenBankAddress = context.request.parameters.custpage_dom_aba_number_details_hidden;
                        //     var displayBankAddress = "<p id='custpage_bank_routing_info'>" + hiddenBankAddress + "<p>";
                        //     paramObj.displayBankAddress = displayBankAddress;
                        //     paramObj.hiddenBankAddress = hiddenBankAddress;
                        //     paramObj.routingCode = routingCode;
                        //     paramObj.routingCodeType = routingCodeType;
                        //     paramObj.intermediatoryBankFlag = intermediatoryBankFlag;
                        //     paramObj.financialInstitutionName = destBankName;
                        //     paramObj.state = destBankState;
                        //     paramObj.bankAddress = destBankAddr;
                        //     paramObj.destBankName = financialInstitutionName;
                        //     paramObj.destfinInstaccount = financialInstitutionAccount;
                        //     paramObj.destBankAddr = bankAddress;
                        //     paramObj.destBankState = state;
                        //     paramObj.destBankCity = city;
                        //     paramObj.ofiIndicator = "Y";
                        // } else {
                        //     var bankAddress = context.request.parameters.custpage_dom_aba_number_details_hidden;
                        //     var displayBankAddress = "<p id='custpage_bank_routing_info'>" + bankAddress + "<p>";
                        routingCode = context.request.parameters.custpage_rtp_bank_routing_number;
                        //     paramObj.displayBankAddress = displayBankAddress;
                        //     paramObj.hiddenBankAddress = bankAddress;
                        paramObj.routingCode = routingCode;
                        paramObj.routingCodeType = routingCodeType;
                        //     paramObj.intermediatoryBankFlag = intermediatoryBankFlag;
                        //     paramObj.bankAddress = bankAddress;
                        //     paramObj.destBankName = destBankName;
                        //     paramObj.destBankAddr = destBankAddr;
                        //     paramObj.destBankState = destBankState;
                        //     paramObj.ofiIndicator = "N";
                        // }
                    }
                    //rutuja end
                    else {
                        //Foreign Wire
                        var lineCountFrom = context.request.getLineCount('custpage_for_wire_from');
                        var accountNumberFrom, encyAccountNumberFrom, accountTypeFrom, currentAvailabeFrom;
                        for (var i = 0; i < lineCountFrom; i++) {
                            var selectAccountFrom = context.request.getSublistValue('custpage_for_wire_from', 'custlist_for_select_account', i);
                            if (selectAccountFrom == "T") {
                                accountNumberFrom = context.request.getSublistValue('custpage_for_wire_from', 'custlist_for_account_number', i);
                                encyAccountNumberFrom = context.request.getSublistValue('custpage_for_wire_from', 'custlist_for_ency_acc_num_from', i);
                                accountTypeFrom = context.request.getSublistValue('custpage_for_wire_from', 'custlist_for_account_type', i);
                                currentAvailabeFrom = context.request.getSublistValue('custpage_for_wire_from', 'custlist_for_current_available', i);
                            }
                        }
                        var destinationCountry = context.request.parameters.custpage_for_dest_country;
                        var destBankCity = context.request.parameters.custpage_for_bank_city;
                        var destBankAddr = context.request.parameters.custpage_for_bank_address;
                        var destBankName = context.request.parameters.custpage_for_bank_name;
                        var swiftOrBIC = context.request.parameters.custpage_for_swift_or_bic;
                        var currency = context.request.parameters.custpage_for_currency;
                        var chipOrUID = context.request.parameters.custpage_for_chip_or_uid;
                        var intermediatoryBankHoldingNo = context.request.parameters.custpage_for_intr_bank_hold_no;
                        var interBankDetailsHidden = context.request.parameters.custpage_for_aba_number_details_hidden;
                        var interBankDetails = "<p id='custpage_bank_routing_info'>" + interBankDetailsHidden + "<p>";
                        var wireDate = context.request.parameters.custpage_for_wire_date;
                        //covert date into "DD/MM/YYYY"
                        var scheduledDate = formatDate(wireDate);
                        var wireAmount = context.request.parameters.custpage_for_wire_amount;
                        // CR: remove comma  
                        wireAmount = wireAmount.replace(/,/g, '');
                        var beneficiaryName = context.request.parameters.custpage_for_beneficiary_name;
                        var beneficiaryAccountNumber = context.request.parameters.custpage_for_account_number;
                        var phoneNumber = context.request.parameters.custpage_for_phone_number;
                        var address1 = context.request.parameters.custpage_for_address_one;
                        var address2 = context.request.parameters.custpage_for_address_two;
                        var address3 = context.request.parameters.custpage_for_city;
                        var specialInstructions1 = context.request.parameters.custpage_for_spec_instr_one;
                        var specialInstructions2 = context.request.parameters.custpage_for_spec_instr_two;
                        var specialInstructions3 = context.request.parameters.custpage_for_spec_instr_three;
                        var customerReferenceNumber = context.request.parameters.custpage_for_cust_refer_number;
                        var customerAdditionalReference = context.request.parameters.custpage_for_add_refers;
                        var purposeCode = context.request.parameters.custpage_for_purpose_code;
                        var subPurpCode = context.request.parameters.custpage_for_sub_purpose_code;
                        var bankAddress = context.request.parameters.custpage_for_bank_details_hidden;
                        var displayBankAddress = "<br><p id='custpage_bank_details'>" + bankAddress + "<p>";
                        var otherRoutingCode = context.request.parameters.custpage_for_other_routing_code;
                        var otherRoutingCodeLabel = context.request.parameters.custpage_for_other_routing_label;
                        paramObj.destinationCountry = destinationCountry;
                        paramObj.destBankCity = destBankCity;
                        paramObj.destBankAddr = destBankAddr;
                        paramObj.destBankName = destBankName;
                        paramObj.swiftOrBIC = swiftOrBIC;
                        paramObj.currency = currency;
                        paramObj.chipOrUID = chipOrUID;
                        paramObj.intermediatoryBankHoldingNo = intermediatoryBankHoldingNo;
                        paramObj.interBankDetails = interBankDetails;
                        paramObj.interBankDetailsHidden = interBankDetailsHidden;
                        paramObj.wireDate = wireDate;
                        paramObj.scheduledDate = scheduledDate;
                        paramObj.wireAmount = wireAmount;
                        paramObj.accountNumberFrom = accountNumberFrom;
                        paramObj.encyAccountNumberFrom = encyAccountNumberFrom;
                        paramObj.accountTypeFrom = accountTypeFrom;
                        paramObj.currentAvailabeFrom = currentAvailabeFrom;
                        paramObj.beneficiaryName = beneficiaryName;
                        paramObj.beneficiaryAccountNumber = beneficiaryAccountNumber;
                        paramObj.phoneNumber = phoneNumber;
                        paramObj.address1 = address1;
                        paramObj.address2 = address2;
                        paramObj.address3 = address3;
                        paramObj.specialInstructions1 = specialInstructions1;
                        paramObj.specialInstructions2 = specialInstructions2;
                        paramObj.specialInstructions3 = specialInstructions3;
                        paramObj.customerReferenceNumber = customerReferenceNumber;
                        paramObj.customerAdditionalReference = customerAdditionalReference;
                        paramObj.purposeCode = purposeCode;
                        paramObj.subPurpCode = subPurpCode;
                        paramObj.bankAddress = bankAddress;
                        paramObj.displayBankAddress = displayBankAddress;
                        paramObj.routingCode = swiftOrBIC;
                        paramObj.routingCodeType = "BIC";
                        paramObj.otherRoutingCode = otherRoutingCode;
                        paramObj.otherRoutingCodeLabel = otherRoutingCodeLabel;
                    }
                    var newDate = new Date();
                    var dateString = newDate.toISOString();
                    var folderSearchObj = search.create({
                        type: "folder",
                        filters: [
                            ["name", "is", "Payment Review"]
                        ],
                        columns: [
                            search.createColumn({
                                name: "internalid",
                                label: "Internal ID"
                            })
                        ]
                    });
                    var folderSearchObj = folderSearchObj.run();
                    var folderResult = folderSearchObj.getRange({
                        start: 0,
                        end: 1
                    });
                    var internalid = folderResult[0].getValue("internalid");
                    var fileObj = file.create({
                        name: dateString + '_pay_review_.json',
                        fileType: file.Type.JSON,
                        contents: JSON.stringify(paramObj),
                        description: 'This is a JSON file.',
                        encoding: file.Encoding.UTF8,
                        folder: internalid,
                        isOnline: true
                    });
                    var fileId = fileObj.save();
                    var params = {
                        "fileId": fileId
                    }
                    redirect.toSuitelet({
                        scriptId: 'customscript_citiintegrator_ns_ss_payrev',
                        deploymentId: 'customdeploy_citiintegrator_ns_ss_payrev',
                        parameters: params
                    });
                }
            } catch (exception) {
                log.debug("Script Error", exception);
                var tokensSearchObj = customModule.getUserSession(userId);

                var tokensSearchObj = tokensSearchObj.run();
                var sessionResult = tokensSearchObj.getRange({
                    start: 0,
                    end: 1
                });
                var sessionuserId = sessionResult[0].id;
                savePushLogs(sessionuserId, "", "CitiIntegrator NS SS Payment Initiation", "", "", exception);

                var form = serverWidget.createForm({
                    title: "Payment Initiation : " + title
                });
                form.clientScriptModulePath = "../Client/CitiIntegrator NS CS Payment Initiation.js";

                var fileObj = file.load({
                    id: '../Client/CitiIntegrator NS CS Payment Initiation.js'
                });
                var filePath = fileObj.path;

                var businessCodeFlag = form.addField({
                    id: 'custpage_overlap_titel',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: "Business Code"
                });
                var businessCodeEnc = busiCode.substring(busiCode.length - 4, busiCode.length)
                // Vishal Code change for Report and Submit Home Button.
                businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script> function home() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; var container = jQuery(".uir-page-title"); var newDiv = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:25px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 80px; top:26px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Accounts Dashboard</a></div>"); container.prepend(newDiv1);</script></div>';
                // Vishal Code change for Report and Submit Home Button.
                var html = form.addField({
                    id: "custpage_error_message",
                    type: serverWidget.FieldType.INLINEHTML,
                    label: "Message"
                });

                var errorIcon = file.load({
                    id: '../Images/error-icon.png'
                });
                var errorIconPath = errorIcon.url;

                var htmlTags = "";
                htmlTags += "<span>"
                htmlTags += "<img style='height: 75px;margin-top: 5%;margin-left: 47%;' src=" + errorIconPath + "></img>"
                htmlTags += "</span>"
                htmlTags += "<p style='font-size: 20px; text-align: center; margin-top: 20px; font-weight: bold'>Error Occurred. Please try again after some time.</p>"
                html.defaultValue = htmlTags;

                var scriptField = form.addField({
                    id: "custpage_clientscript",
                    type: serverWidget.FieldType.INLINEHTML,
                    label: "Call Script"
                });

                var script = "";
                script += "<!DOCTYPE html>"
                script += "<html lang='en'>"
                script += "<head>"
                script += "<meta charset='UTF-8'>"
                script += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
                script += "<script>"
                script += "function closeOverlay() {"
                script += "document.getElementById('reportoverlay').style.display = 'none';"
                script += "}"
                script += "function reportSubmit() {";
                script += "var viewobj = document.getElementById('popupTextarea').value;";
                script += "var rConfig = JSON.parse('{}');"
                script += "rConfig['context'] = \'/" + filePath + "\';"
                script += "var entryPointRequire = require.config(rConfig);"
                script += "entryPointRequire([\'/" + filePath + "\'], function(custommodule){"
                script += "custommodule.pushLogs(viewobj);"
                script += "});"
                script += "closeOverlay();"
                script += "}";
                script += "</script>"
                script += "</head>"
                script += "<body style='font-family: Arial, sans-serif;'>"
                script += "<div style='display: block; position: fixed; z-index: 1001; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5);'"
                script += "id='reportoverlay'>"
                script += "<div style='position: absolute; top: 50%; left: 50%; display: flex; flex-direction: column; transform: translate(-50%, -50%); background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); border-top: 3px solid #ab0f0f; z-index: 10000;  max-width: 80%; max-height: 80%; overflow-y: auto;'"
                script += "class='popup'>"
                script += "<p style='font-size: 15px; font-weight: bold;'>Payment Initiation</p>"
                script += "<hr style='margin: 10px 0; border: none; border-top: 1px solid #ccc;'>"
                script += "<p style='font-weight: bold;'>Error Occurred. Please try again after some time.</p>"
                script += "<p>In order for us to improve your experience on Citi Integrator, we highly recommend that you report and submit this issue to Citi along with a description of the issue.</p>"
                script += "<textarea id='popupTextarea' style=' width: calc(100% - 20px); min-height: 60px; flex:1; padding: 10px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; resize: none;' maxlength='1000' placeholder='Provide description of the issue you are reporting'></textarea>"
                script += "<p style='margin: 5px 0 0 0; color:blue; font-size: 12px;'>Max 1000 characters </p>"
                script += "<p style='color: blue; font-size: 12px; margin: 40px 0 0 0;'>Please note: Logs will be attached with the description.</p>"
                script += "<hr style='margin: 10px 0; border: none; border-top: 1px solid #ccc;'>"
                script += "<div style=' margin-top: auto; align-self: flex-end;' class='button-container'>"
                script += "<a style='background-color: #ab0f0f; color: #fff; border: none; padding: 8px 12px; margin-left: 10px; cursor: pointer; border-radius: 4px; margin-left: 5px;'"
                script += "class='close-button' onclick='closeOverlay();'>Close</a>"
                script += "<a style='background-color: #ab0f0f; margin-left: 10px; color: #fff; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px; margin-left: 5px;'"
                script += "class='report-button' onclick='reportSubmit();'>Report & Submit</a>"
                script += "</div>"
                script += "</div>"
                script += "</div>"
                script += "</body>"
                script += "</html>"
                scriptField.defaultValue = script;

                var idleTime = form.addField({
                    id: 'custpage_idle_time',
                    type: serverWidget.FieldType.INLINEHTML,
                    label: "Idle Time"
                });

                var htmlIdle = "";
                htmlIdle += "<!DOCTYPE html>"
                htmlIdle += "<html lang='en'>"
                htmlIdle += "<head>"
                htmlIdle += "<meta charset='UTF-8'>"
                htmlIdle += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
                htmlIdle += "<script>"
                htmlIdle += "var timer, currSeconds = 0; function resetTimer() { clearInterval(timer); currSeconds = 0; timer = setInterval(startIdleTimer, 1800000); } window.onmousemove = resetTimer; window.onmousedown = resetTimer;  window.ontouchstart = resetTimer; window.onclick = resetTimer; window.onkeypress = resetTimer;  function startIdleTimer() { currSeconds++;  logout (); document.getElementById('idleoverlay').style.display = 'block'; }";
                htmlIdle += "function logout() {";
                htmlIdle += "var rConfig = JSON.parse('{}');"
                htmlIdle += "rConfig['context'] = \'/" + filePath + "\';"
                htmlIdle += "var entryPointRequire = require.config(rConfig);"
                htmlIdle += "entryPointRequire([\'/" + filePath + "\'], function(custommodule){"
                htmlIdle += "custommodule.logout(" + sessionuserId + ");"
                htmlIdle += "});"
                htmlIdle += "}";
                htmlIdle += "function login() {";
                htmlIdle += "var rConfig = JSON.parse('{}');"
                htmlIdle += "rConfig['context'] = \'/" + filePath + "\';"
                htmlIdle += "var entryPointRequire = require.config(rConfig);"
                htmlIdle += "entryPointRequire([\'/" + filePath + "\'], function(custommodule){"
                htmlIdle += "custommodule.login();"
                htmlIdle += "});"
                htmlIdle += "}";
                htmlIdle += "</script>"
                htmlIdle += "</head>"
                htmlIdle += "<body style='font-family: Arial, sans-serif;'>";
                htmlIdle += "<div style='display: none; position: fixed; z-index: 1002; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5);' id='idleoverlay'>";
                htmlIdle += "<div style='position: absolute; top: 50%; left: 50%; display: flex; flex-direction: column; transform: translate(-50%, -50%); background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.3); border-top: 3px solid #ab0f0f; z-index: 10000; max-width: 80%; max-height: 80%; overflow-y: auto;' class='popup'>";
                htmlIdle += "<h5 style='font-size: 18px; color: #19232e; margin: 0px'>Action Required: Citi Integrator Login</h5>";
                htmlIdle += "<hr style='margin: 10px 0; border: none; border-top: 1px solid #ccc;'>";
                htmlIdle += "<p style='font-weight: bold; margin-bottom: 35px;'>Your session has expired. Please login to continue using Citi Integrator.</p>";
                htmlIdle += "<div style='margin-top: auto; align-self: flex-end;' class='button-container'>";
                htmlIdle += "<a style='background-color: #ab0f0f; color: #fff; border: none; padding: 8px 12px; cursor: pointer; border-radius: 4px;' class='report-button' onclick='login();'>Log In</a>";
                htmlIdle += "</div>";
                htmlIdle += "</div>";
                htmlIdle += "</div>";
                htmlIdle += "</body>";
                htmlIdle += "</html>"
                idleTime.defaultValue = htmlIdle;

                context.response.writePage(form);
            }
        }

        function getResponseFromAPI(url, PublicKey, AccessToken, PrivateKey, request) {
            var response = customModule.sendRequest(url, PublicKey, AccessToken, PrivateKey, request, null, APG_ACCESS_TOKEN);
            return response;
        }

        function formatDate(dateString) {
            // Parse the input date string
            var dateObj = new Date(format.parse({
                value: dateString,
                type: format.Type.DATE
            }));

            // Extract day, month, and year
            var day = dateObj.getDate();
            var month = dateObj.getMonth() + 1; // Months are zero-based
            var year = dateObj.getFullYear();

            // Add leading zeros
            var formattedDay = day < 10 ? '0' + day : day;
            var formattedMonth = month < 10 ? '0' + month : month;

            // Combine into formatted string
            return formattedMonth + '/' + formattedDay + '/' + year;
        }
        // for changing accentic letters

        function removeAccents(text) {
            var accentsMap = {
                'À': 'A',
                'Á': 'A',
                'Â': 'A',
                'Ã': 'A',
                'Ä': 'A',
                'Å': 'A',
                'Æ': 'AE',
                'à': 'a',
                'á': 'a',
                'â': 'a',
                'ã': 'a',
                'ä': 'a',
                'å': 'a',
                'æ': 'ae',
                'Ç': 'C',
                'ç': 'c',
                'È': 'E',
                'É': 'E',
                'Ê': 'E',
                'Ë': 'E',
                'è': 'e',
                'é': 'e',
                'ê': 'e',
                'ë': 'e',
                'Ì': 'I',
                'Í': 'I',
                'Î': 'I',
                'Ï': 'I',
                'ì': 'i',
                'í': 'i',
                'î': 'i',
                'ï': 'i',
                'Ò': 'O',
                'Ó': 'O',
                'Ô': 'O',
                'Õ': 'O',
                'Ö': 'O',
                'Ø': 'O',
                'ò': 'o',
                'ó': 'o',
                'ô': 'o',
                'õ': 'o',
                'ö': 'o',
                'ø': 'o',
                'Ù': 'U',
                'Ú': 'U',
                'Û': 'U',
                'Ü': 'U',
                'ù': 'u',
                'ú': 'u',
                'û': 'u',
                'ü': 'u',
                'Ý': 'Y',
                'ý': 'y',
                'ÿ': 'y',
                'Œ': 'OE',
                'œ': 'oe',
                'Š': 'S',
                'š': 's',
                'Ž': 'Z',
                'ž': 'z'
            };

            // Replace accented characters using the map
            return text.split('').map(function (char) {
                return accentsMap[char] || char;
            }).join('');
        }


        function formatAmount(amount) {
            var number = parseFloat(amount);
            if (isNaN(number)) {
                return "$0.00";
            }

            var isNegative = number < 0;
            var absoluteNumber = Math.abs(number);

            var formattedNumber = absoluteNumber.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');

            return (isNegative ? '-' : '') + '$' + formattedNumber;
        }

        function checkForEntitlementType(entitlements, wireType) {
            var flag = false;
            for (var i = 0; i < entitlements.length; i++) {
                if (entitlements[i].entitlementType == wireType) {
                    flag = true;
                    break;
                }
            }
            return flag;
        }

        function savePushLogs(sessionuserId, api, script, request, response, scriptError) {
            var logsSearchObj = customModule.getUserLogs(sessionuserId);
            var logsSearchObj = logsSearchObj.run();
            var logsResult = logsSearchObj.getRange({
                start: 0,
                end: 1
            });
            if (logsResult.length > 0) {
                record.submitFields({
                    type: 'customrecord_citiintegrator_ns_ccb_logs',
                    id: logsResult[0].id,
                    values: {
                        custrecord_citiintegrator_ns_api: api,
                        custrecord_citiintegrator_ns_scriptnm: script,
                        custrecord_citiintegrator_ns_request: request != "" ? JSON.stringify(request) : request,
                        custrecord_citiintegrator_ns_response: response,
                        custrecord_citiintegrator_ns_scripterr: scriptError
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
            } else {
                var recordObj = record.create({
                    type: 'customrecord_citiintegrator_ns_ccb_logs'
                });
                recordObj.setValue("custrecord_citiintegrator_ns_api", api);
                recordObj.setValue("custrecord_citiintegrator_ns_scriptnm", script);
                recordObj.setValue("custrecord_citiintegrator_ns_request", request);
                recordObj.setValue("custrecord_citiintegrator_ns_response", response);
                recordObj.setValue("custrecord_citiintegrator_ns_userlink", sessionuserId);
                recordObj.setValue("custrecord_citiintegrator_ns_scripterr", scriptError);

                recordObj.save({
                    enableSourcing: true,
                    ignoreMandatoryFields: true
                });
            }
        }

        // Vishal Daily Limit.
        // Function to get the Daily limit for all accounts.
        function getDailyLimitData(wireFilter, ACCOUNTS_DATA_API, pubKey, accsTkn, pvtKey, usrCode, busiCode, softwareName, softwareVersion, VENDOR_ID, pageId, PAGE_SIZE) {

            var dailyLimitJSON = new Array();
            var request = {
                "metadata": {
                    "userCode": usrCode,
                    "businessCodeList": [busiCode],
                    "softwareName": softwareName,
                    "softwareVersion": softwareVersion,
                    "vendorId": VENDOR_ID
                },
                "businessCodes": [{
                    "businessCode": busiCode,
                    "usercode": usrCode,
                    "nextPage": Number(pageId),
                    "pageSize": PAGE_SIZE,
                    "accountBalanceTimelineEnum": "PRIOR_DAY"
                }],
                "accountBalanceTimeline": "PRIOR_DAY"
            };
            log.debug('request 4466', request);
            var response = customModule.sendRequest(ACCOUNTS_DATA_API, pubKey, accsTkn, pvtKey, request, null, APG_ACCESS_TOKEN);
            log.debug('response daily limit api 4468', response);

            var accountJSON = JSON.parse(response);
            if (accountJSON.data && accountJSON.data[busiCode]) {
                var pageCount = accountJSON.data[busiCode].totalNumberOfPages;
                var accountDetailsList = accountJSON.data[busiCode].accountsByPostDate;
                for (var ts = 0; ts < accountDetailsList.length; ts++) {
                    var accounts = accountDetailsList[ts].accounts;
                    if (accounts) {
                        for (var t = 0; t < accounts.length; t++) {
                            var dispAccount = accounts[t].displayableAccountNumber;
                            var encAccount = accounts[t].encryptedAccountIdentifier;
                            var entitlements = accounts[t].entitlements;
                            log.debug('entitlements 4467', entitlements);

                            if (entitlements) {
                                for (var et = 0; et < entitlements.length; et++) {
                                    if (entitlements[et].entitlementType == wireFilter) {
                                        var dailyLimit = entitlements[et].dailyLimit || 0;
                                        var oneTimeLimit1 = entitlements[et].oneTimeLimit1 || 0;
                                        var oneTimeLimit2 = entitlements[et].oneTimeLimit2 || 0;

                                        dailyLimitJSON.push({
                                            'dispAccount': dispAccount,
                                            'dailyLimit': dailyLimit,
                                            'oneTimeLimit1': oneTimeLimit1,
                                            'oneTimeLimit2': oneTimeLimit2
                                        });
                                    }
                                }
                            }
                        }
                    }
                }
            }
            log.debug('function getDailyLimitData dailyLimitJSON', dailyLimitJSON);
            return dailyLimitJSON;
        }
        // Vishal Daily Limit.


        /*
        function setVendorList(fieldobj, queryModule) {
            var query = "SELECT ven.id as vendorid,ven.*,cury.id as currencyid,cury.*,venaddr.* from Vendor ven JOIN EntityAddress venaddr ON (venaddr.nkey = ven.defaultBillingAddress) JOIN currency cury ON (cury.id = ven.currency)";

            var results = queryModule.runSuiteQL({
                query: query
            });

            var records = results.asMappedResults();

            fieldobj.addSelectOption({
                value: '',
                text: ''
            });

            for (var i = 0; i < records.length; i++) {
                if(records[i].companyname){
                    var text = records[i].companyname;
                    var internalid = records[i].vendorid;
                    fieldobj.addSelectOption({
                        value: internalid,
                        text: text
                    });
                }	
            }
        }
        */

        // Vishal User Feedback.
        // Function to check whether the value is empty or not.
        function isEmpty(stValue) {
            return ((stValue === '' || stValue === null || stValue === undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function (v) { for (var k in v) return false; return true; })(stValue)));
        }
        // Vishal User Feedback.

        return {
            onRequest: onRequest
        };
    });