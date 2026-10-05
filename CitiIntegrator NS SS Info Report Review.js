/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
var PAGE_SIZE = 25;
var softwareName;
var softwareVersion;
var redWoodPreferences;
define(['N/ui/serverWidget', 'N/redirect', 'N/format', 'N/record', 'N/log', 'N/file', 'N/runtime', 'N/config', '../Common Module/CitiIntegrator NS SS Common Module.js', '../Common Module/CitiIntegrator NS SS Config Module.js', 'N/search', 'N/config','N/query'],

	function (serverWidget, redirect, format, record, log, file, runtime, config, customModule, configModule, search, config, query) {
		/**
		 * Defines the Suitelet script trigger point.
		 * @param {Object} scriptContext
		 * @param {ServerRequest} scriptContext.request - Incoming request
		 * @param {ServerResponse} scriptContext.response - Suitelet response
		 * @since 2015.2
		 */
		var APG_ACCESS_TOKEN;

		// Vishal User Feedback.
		var checking = 0, imma = 0, savings = 0, cd = 0, checkingAccts = 0, immaAccts = 0, savingsAccts = 0, cdAccts = 0, startDayLedger = 0, startDayAvl = 0, currentLedger = 0, currentAvl = 0, showUserFeedback = false;
		// Vishal User Feedback.

		function onRequest(context) {
			try {
				redWoodPreferences = config.load({ type: config.Type.USER_PREFERENCES }).getValue({ fieldId: 'REDWOOD' });
				log.debug("On Request", "Redwood Pref :" + redWoodPreferences);
				// Set anti-caching headers
				var res = context.response;
				res.setHeader({ name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0' });
				res.setHeader({ name: 'Expires', value: '0' });
				res.setHeader({ name: 'Pragma', value: 'no-cache' });
				var method = context.request.method;
				var data = context.request.parameters.viewobj;
				log.debug({ title: 'account number: ', details: data });
				var selectedAccJson = parseParamsAsselectedAccJson(data);
				log.debug("selectedAccJson", selectedAccJson);
				var wireFilter = context.request.parameters.wireFilter || "PRIOR_DAY";
				log.debug("wireFilter", wireFilter)
				var userObj = runtime.getCurrentUser();

				log.debug("userObj", userObj)
				var userId = userObj.id;
				var configurationJSON;
				if (runtime.envType == "SANDBOX") {
					configurationJSON = configModule.sandboxConfiguration();
				} else {
					configurationJSON = configModule.productionConfiguration();
				}
				softwareName = configurationJSON.softwareName;
				softwareVersion = configurationJSON.softwareVersion;
				var VENDOR_ID = configurationJSON.VENDOR_ID;
				//APIGEE changes
				var apgExtFlag = configurationJSON.apgExternal;
				var TRANSACTIONS_DETAILS;
				if (apgExtFlag)
					TRANSACTIONS_DETAILS = configurationJSON.apgTransactionDetails;
				else
					TRANSACTIONS_DETAILS = configurationJSON.transactionDetails;
				log.audit('APIGEE ext : flag ', apgExtFlag + ' TRANSACTIONS_DETAILS:  ' + TRANSACTIONS_DETAILS)

				if (method == "GET") {
					var pageId = context.request.parameters.page || 1;
					log.debug("pageId", pageId)
					if (!pageId || pageId == '' || pageId < 1) {
						pageId = 1;
					}
					var filtersEnabled = context.request.parameters.filtersEnabled ? context.request.parameters.filtersEnabled : false;
					log.debug('context.request.parameters', context.request.parameters);
					var startDateVal, endDateVal, minAmtVal, maxAmtVal;
					// Vishal Updated the 6 month duration to 1 month.
					var startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
					var todayDate = new Date(Date.now() - 0 * 24 * 60 * 60 * 1000);
					if (context.request.parameters.fromDate) {
						startDateVal = context.request.parameters.fromDate;
					} else {
						startDateVal = startDate;
					}

					// Vishal EST Timezone issue.
					var endDateActValTime = '', endDateUpdFlag = false;
					// Vishal EST Timezone issue.

					if (context.request.parameters.toDate) {
						endDateVal = context.request.parameters.toDate;
						endDateActValTime = new Date(format.parse({ value: endDateVal, type: format.Type.DATE })).getTime();
					} else {

						// Vishal EST Timezone issue.
						endDateVal = todayDate;
						endDateUpdFlag = true;

						// Getting the end date time according to the user preference time zone.
						var timeZone = config.load({ type: config.Type.USER_PREFERENCES }).getValue({ fieldId: 'TIMEZONE' });
						// var timeZoneTxt = config.load({ type: config.Type.USER_PREFERENCES }).getText({ fieldId: 'TIMEZONE' });
						var timeZoneFormat = config.load({ type: config.Type.USER_PREFERENCES }).getValue({ fieldId: 'DATEFORMAT' });
						log.debug('timeZone', timeZone);
						// log.debug('timeZoneTxt', timeZoneTxt);
						log.debug('timeZoneFormat', timeZoneFormat);
						var serverDate1 = format.format({ value: endDateVal, type: format.Type.DATETIME, timezone: timeZone });
						log.debug('serverDate1', serverDate1);
						var serverDate11 = format.parse({ value: endDateVal, type: format.Type.DATETIME });
						log.debug('serverDate11', serverDate11)
						var serverDate2 = format.format({ value: endDateVal, type: format.Type.DATE, timezone: timeZone });
						var serverDate22 = format.parse({ value: endDateVal, type: format.Type.DATE });
						log.debug('serverDate2', serverDate2);
						log.debug('serverDate22', serverDate22);


						log.debug('serverDate time', new Date(serverDate2));
						log.debug('newDate timeoffset', new Date().getTimezoneOffset());
						// log.debug('serverDate Year', serverDate.getFullYear());


						var estFullYear = endDateVal.getFullYear();
						var estMonth = ((endDateVal.getMonth() + 1).length == 1) ? "0" + (endDateVal.getMonth() + 1) : (endDateVal.getMonth() + 1);
						log.debug('estMonth', estMonth);
						var estDate = ((endDateVal.getDate()).length == 1) ? "0" + (endDateVal.getDate()) : (endDateVal.getDate());
						log.debug('estDate', estDate);
						var estServerEndDate = "'" + estFullYear + "-" + estMonth + "-" + estDate + "T23:59:59.000-05:00'";
						log.debug('estServerEndDate', estServerEndDate);
						// estServerEndDate = new Date('2024-01-20T23:59:59.000-05:00');

						log.debug('endDateVal Year', endDateVal.getFullYear());
						log.debug('endDateVal Month', endDateVal.getMonth() + 1);
						log.debug('endDateVal Date', endDateVal.getDate());
						log.debug('endDateVal Hours', endDateVal.getHours());

						var endDateActVal = format.parse({ value: format.format({ value: endDateVal, type: format.Type.DATETIME, timezone: format.Timezone.AMERICA_NEW_YORK }), type: format.Type.DATETIME });
						log.debug('endDateActVal', endDateActVal);
						log.debug('new date', new Date());
						var endDateActVal = format.parse({ value: format.format({ value: endDateVal, type: format.Type.DATETIME, timezone: timeZone }), type: format.Type.DATETIME });
						// endDateActValTime = endDateActVal.getTime();

						endDateActValTime = new Date(format.parse({ value: endDateVal, type: format.Type.DATE })).getTime();
						// Vishal EST Timezone issue.
					}

					if (context.request.parameters.minAmt) {
						minAmtVal = context.request.parameters.minAmt;
					}
					if (context.request.parameters.maxAmt) {
						maxAmtVal = context.request.parameters.maxAmt;
					}
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
						var activityTime = sessionResult[0].getValue("custrecord_citiintegrator_ns_lastuptime");
						log.debug("activityTime", activityTime);
						//START -- Umar has updated the code to check the entitlement to view the account summary information based on the user code.
						var selectedAccountName = selectedAccJson.accountName
                        var selectedCitiAccountNumber = selectedAccJson.accDisplayNum // Umar added on 28th August 
						var selectedCitiAccountIdentifier = selectedAccJson.accountIdfr // Umar added on 28th August
						var entitlementFlag = checkingEntitlements(usrCode, selectedAccountName, selectedCitiAccountNumber, selectedCitiAccountIdentifier);
						log.debug("entitlementFlag",entitlementFlag+ " selectedAccountName: "+selectedAccountName+" usrCode: "+usrCode);
						if (entitlementFlag == false) {
							var tokensSearchObj = customModule.getUserSession(userId);
							var tokensSearchObj = tokensSearchObj.run();
							var sessionResult = tokensSearchObj.getRange({
								start: 0,
								end: 1
							});
							var sessionuserId = sessionResult[0].id;
							var form = serverWidget.createForm({
								title: "Account Summary",
							});
							form.clientScriptModulePath = "../Client/CitiIntegrator NS CS Informtn Validation.js";
							var fileObj = file.load({
								id: '../Client/CitiIntegrator NS CS Informtn Validation.js'
							});
							var filePath = fileObj.path;

							var businessCodeFlag = form.addField({
								id: 'custpage_overlap_titel1',
								type: serverWidget.FieldType.INLINEHTML,
								label: "Business Code1"
							});
							// Vishal Code change for Report and Submit Home Button.
							var businessCodeEnc = busiCode.substring(busiCode.length - 4, busiCode.length);
							businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>function home() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; var container = jQuery(".uir-page-title"); var newDiv = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:26px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 80px; top:26px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv1);</script></div>';
							// Vishal Code change for Report and Submit Home Button.

							var html = form.addField({
								id: "custpage_error_message1",
								type: serverWidget.FieldType.INLINEHTML,
								label: "Message 1"
							});

							var errorIcon = file.load({
								id: '../Images/error-icon.png'
							});
							var errorIconPath = errorIcon.url;

							var htmlTags = "";
							htmlTags += "<span>"
							htmlTags += "<img style='height: 75px;margin-top: 5%;margin-left: 47%;' src=" + errorIconPath + "></img>"
							htmlTags += "</span>"
							htmlTags += "<p style='font-size: 20px; text-align: center; margin-top: 20px; font-weight: bold'>You are not entitled to view the information.</p>"
							html.defaultValue = htmlTags;
							res.writePage(form);
							return false;
						}
						//END --
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
						// Vishal User Feedback.


						// CR: apigee  
						APG_ACCESS_TOKEN = sessionResult[0].getValue("custrecord_ci_ns_apg_access_token");
						log.debug('Acct Details - APG_ACCESS_TOKEN: ', APG_ACCESS_TOKEN);
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

						var form = serverWidget.createForm({
							title: "Account Summary",
						});
						form.clientScriptModulePath = "../Client/CitiIntegrator NS CS Informtn Validation.js";

						var fileObj = file.load({
							id: '../Client/CitiIntegrator NS CS Informtn Validation.js'
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
						stylesScript += "<a href='https://developer.citi.com/citi-integrator/netsuite/user-guide/accounts-dashboard' target='_blank' rel='noopener noreferrer' title='User Guide' style='position:absolute; right:62px; top: 14px;'><img src='" + userGuideIconPath + "' id='popupTrigger' style='height:30px; width:30px; cursor:pointer;' /></a>";
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
						// stylesScript += "<textarea id='feedbackComments' rows='4' cols='50' maxlength='1000' style='width: 100%; margin-top: 10px;'></textarea><br>";
						stylesScript += "<textarea id='feedbackComments' rows='4' cols='50' maxlength='1000' style='width: 100%; margin-top: 10px; resize: none;'></textarea><br>";
						stylesScript += "<div id='feedbackCommentsError' style='display:none; color:#d93025; font-size:12px;'>HTML code is not allowed.</div>";
						// Apurva H3 VA Issue Validation to check if the feedback contains HTML tags.
						stylesScript += "<small style='color: gray;'>Maximum 1000 characters</small><br>";
						stylesScript += "<div style='text-align: right;'>";
						stylesScript += "<button type='button' class='remind-button' onclick='event.stopPropagation(); closeRemindLaterPopup();'>Remind Me Later</button>";
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
						stylesScript += "};";

						stylesScript += "window.closeRemindLaterPopup = function() {";
						stylesScript += "  document.getElementById('myPopup').classList.remove('show');";
						stylesScript += "  document.getElementById('popupOverlay').classList.remove('show');";
						//Vishal User Feedback.
						stylesScript += "  try {";
						stylesScript += "var rConfig = JSON.parse('{}');"
						stylesScript += "rConfig['context'] = \'/" + filePath + "\';"
						stylesScript += "var entryPointRequire = require.config(rConfig);"
						stylesScript += "entryPointRequire([\'/" + filePath + "\'], function(custommodule){";
						stylesScript += "custommodule.cancelUserFeedback(" + sessionuserId + ");"
						stylesScript += "});";
						stylesScript += " } catch(e){ console.log('Error in submitting feedback:', e); }";
						//Vishal User Feedback.
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
						stylesScript += "  var enabled = (starChecked !== null); ";
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

						// Vishal Error for Report & Submit Home Button.
						// var folderSearchObj = search.create({ type: "folder2", filters: [ ["name", "is", "Payment Review"] ],
						// columns: [ search.createColumn({ name: "internalid", label: "Internal ID" }) ] }).run().getRange(0,1);
						// Vishal Error.

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

						var citiLogo = file.load({
							id: '../Images/citiLogo.svg'
						});
						var citiLogoPath = citiLogo.url;

						var businessCodeFlag = form.addField({
							id: 'custpage_overlap_titel',
							type: serverWidget.FieldType.INLINEHTML,
							label: "Business Code"
						});
						var businessCodeEnc = busiCode.substring(busiCode.length - 4, busiCode.length)
						//Facelift changes start
						//logo removal changes
						if (wireFilter == "PRIOR_DAY") {
							businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script> setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function applyFilters() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.applyFilters(\"' + data + '\");}) }; function resetAll() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.ClearFilters(\"' + data + '\");}) }; var newDiv = jQuery("<div><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 16%; top:289px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'applyFilters()\'>Apply</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 8%; top:289px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'resetAll()\'>Reset All</a></div>"); container.prepend(newDiv2); var newDiv3 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv3); var newDiv4 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:105px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv4); var newDiv5 = jQuery("<div id=\'estDateTimeDisplay\' style=\'position: absolute; top: 68px; font-weight: normal; font-size: 14px; color: rgb(111, 111, 111); \'></div>"); container.prepend(newDiv5);</script></div>'
						} else {
							businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script> setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; function applyFilters() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.applyFilters(\"' + data + '\");}) }; function resetAll() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.ClearFilters(\"' + data + '\");}) }; var newDiv = jQuery("<div><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a id=\'applyButton\' style=\'background-color: #e4e4e4; position: absolute; left: 576px; top:301px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'applyFilters()\'>Apply</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; left: 658px; top:301px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'resetAll()\'>Reset All</a></div>"); container.prepend(newDiv2);      var newDiv3 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv3); var newDiv4 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:105px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 3px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv4); var newDiv5 = jQuery("<div id=\'estDateTimeDisplay\' style=\'position: absolute; top: 111px; font-weight: normal; font-size: 14px; color: rgb(111, 111, 111); \'></div>"); container.prepend(newDiv5);</script></div>'
						}
						//logo removal changes       
						//Facelift changes end

						var wireType = form.addField({
							id: "custpage_wire_type",
							type: serverWidget.FieldType.TEXT,
							label: "Wire"
						}).updateDisplayType({
							displayType: serverWidget.FieldDisplayType.HIDDEN,
						});
						wireType.defaultValue = wireFilter;
						//Start -- Umar Updated the code on 11/8/24
						try {
							var lastImportedDate
							var autImportStart = false
							var accountSearch = search.create({ type: "account", filters: [["name", "is", selectedAccJson.accountName], "AND", ["custrecord_citiintegrator_ns_usid", "contains", usrCode]], columns: ["custrecord_citiintegrator_ns_import_tran", "custrecordcitiintegrator_last_importdate", "custrecord_citiintegrator_ns_usid"] }).run().getRange(0, 1)
							if (accountSearch.length > 0) {
								autImportStart = accountSearch[0].getValue("custrecord_citiintegrator_ns_import_tran");
								lastImportedDate = accountSearch[0].getValue("custrecordcitiintegrator_last_importdate");
							}
							log.debug("autImportStart", autImportStart)
							if (autImportStart == false || !lastImportedDate)
								autImportStart = "OFF"
							else
								autImportStart = "ON"

							if (lastImportedDate) {
								lastImportedDate = lastImportedDate.split("T")[0]
							}
							log.debug("lastImportedDate", lastImportedDate)
						} catch (e) {
							log.debug("error msg in account search", e)
						}
						//End --
						var wire_type_val = (selectedAccJson.wireType.indexOf("PRIOR") != -1) ? "PRIOR_DAY" : "INTRA_DAY";
						var html = "";
						html += "<html>"
						html += "<body>"
						html += '<style>.uir-outside-fields-table { width: 100%; }</style>';
						html += "<div style='width: 100% !important; display: flex;font-size: 14px;justify-content: space-around;text-align: center;flex-direction: column;border: 1px solid;border-radius: 4px;margin: 10px 0 15px 0;'>"
						html += "<div style='display: flex;'>"
						html += "<div style='width: 25%; margin: 10px 10px 0 14px; text-align:left'>Account Number</div>"
						html += "<div style='width: 25%; margin: 10px 0 0 14px; text-align:left'>Account Name</div>"

						if (wire_type_val == "PRIOR_DAY") {
							html += "<div style='width: 50%; margin: 10px 15px 0 23px; text-align:right'>Auto Import Status: <b>" + autImportStart + "</b></div>"
						}
						html += "</div>"
						html += "<div style='display: flex;'>"
						html += "<div style='width: 25%; margin: 10px 10px 10px 14px; color: #000080; text-align:left'>" + selectedAccJson.accDisplayNum + "</div>"
						html += "<div style='width: 25%; margin: 10px 10px 10px -8px; color: #000080; text-align:left'>" + selectedAccJson.accountName + "</div>"
						if (autImportStart == 'ON' && lastImportedDate && wire_type_val == "PRIOR_DAY") {
							html += "<div style='width: 50%; margin: 10px 15px 10px 14px; color: #000080; text-align:right'>Your last automation sync for transactions ran on " + lastImportedDate + "</div>"
						}
						html += "</div>"
						html += "</div>"
						html += "</body>"
						html += "</html>"

						var inlineHtmlField = form.addField({
							id: 'custpage_inline_html',
							type: serverWidget.FieldType.INLINEHTML,
							label: 'Inline HTML'
						});
						inlineHtmlField.defaultValue = html;

						inlineHtmlField.updateLayoutType({
							layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
						});

						inlineHtmlField.updateBreakType({
							breakType: serverWidget.FieldBreakType.STARTROW
						});

						var viewObjHolder = form.addField({
							id: 'custpage_viewobj',
							type: serverWidget.FieldType.LONGTEXT,
							label: 'View'
						}).updateDisplayType({
							displayType: serverWidget.FieldDisplayType.HIDDEN
						});

						viewObjHolder.defaultValue = data;
						var filters = form.addFieldGroup({
							id: "filters",
							label: "Filters"
						});
						var startDateBeforeWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

						var startDate, endDate;
						if (wireFilter == "PRIOR_DAY") {
							startDate = form.addField({
								id: "custpage_start_date",
								type: serverWidget.FieldType.DATE,
								label: "Start Date",
								container: "filters"
							}).updateBreakType({
								breakType: serverWidget.FieldBreakType.STARTCOL
							});
							startDate.isMandatory = true;
							startDate.defaultValue = startDateVal ? startDateVal : null;

							startDate.updateDisplaySize({
								height: 60,
								width: 165
							});
							endDate = form.addField({
								id: "custpage_end_date",
								type: serverWidget.FieldType.DATE,
								label: "End Date",
								container: "filters"
							}).updateBreakType({
								breakType: serverWidget.FieldBreakType.STARTCOL
							});
							endDate.isMandatory = true;
							endDate.defaultValue = endDateVal ? endDateVal : null;

							// Vishal EST Timezone issue.

							// Current changes.
							log.debug('pageId', pageId);
							if (pageId == 1) {
								log.debug('Vishal endDate 1', endDate);		// GMT Time
								log.debug('Vishal endDate 2', endDateVal);  // PT Time since it is server time.
								var newEndDate = new Date(endDateVal);
								// Offset returns PT time since the server time is configured for it.
								var offSetTime = newEndDate.getTimezoneOffset();
								log.debug('offSetTime', offSetTime);
								// Hours Time offset // newEndDate.setTime(newEndDate.getTime() + (12 * 60 * 60 * 1000));
								newEndDate.setTime(newEndDate.getTime() + (offSetTime * 60 * 1000));
								log.debug('newEndDate', newEndDate);
								endDate.defaultValue = newEndDate ? newEndDate : null;
							}
							// Current changes.

							// endDate.defaultValue = '17 June, 2025';
							// endDate.defaultValue = '06/17/2025';
							// log.debug('Vishal endDate 2', '17 June, 2025');
							// Vishal EST Timezone issue.

							endDate.updateDisplaySize({
								height: 60,
								width: 25
							});
						}

						var amountMin, amountMax;

						amountMin = form.addField({
							id: "custpage_amount_min",
							type: serverWidget.FieldType.INTEGER,
							label: "Amount (Min)",
							container: "filters"
						}).updateBreakType({
							breakType: serverWidget.FieldBreakType.STARTCOL
						});
						amountMin.defaultValue = minAmtVal;
						amountMin.updateDisplaySize({
							height: 60,
							width: 20
						});
						amountMax = form.addField({
							id: "custpage_amount_max",
							type: serverWidget.FieldType.INTEGER,
							label: "Amount (Max)",
							container: "filters"
						}).updateBreakType({
							breakType: serverWidget.FieldBreakType.STARTCOL
						});
						amountMax.defaultValue = maxAmtVal;
						amountMax.updateDisplaySize({
							height: 60,
							width: 20
						});

						var TransSubtab = form.addSubtab({
							id: 'custpage_trans_id',
							label: 'Transactions'
						});

						var list = form.addSublist({
							id: "custpage_list",
							type: serverWidget.SublistType.LIST,
							label: "Transactions",
							tab: 'custpage_trans_id'
						});


						list.addField({
							id: "custlist_date",
							type: serverWidget.FieldType.TEXT,
							label: "Date"
						});
						list.addField({
							id: "custlist_description",
							type: serverWidget.FieldType.TEXT,
							label: "Description"
						});
						list.addField({
							id: "custlist_transaction_type",
							type: serverWidget.FieldType.TEXT,
							label: "Transaction Type"
						});
						list.addField({
							id: "custlist_amount",
							type: serverWidget.FieldType.TEXT,
							label: "Amount"
						});
						list.addField({
							id: "custlist_memo",
							type: serverWidget.FieldType.TEXT,
							label: "Memo"
						});
						list.addField({
							id: "custlist_inv_number",
							type: serverWidget.FieldType.TEXT,
							label: "Invoice Number"
						});
						/*list.addField({
							id: "custlist_avl_in_netsuite",
							type: serverWidget.FieldType.TEXT,
							label: "Available in NetSuite"
						});*/
						var accountFinalvalue;
						log.debug("410", selectedAccJson.accountTypeLabel);
						var accountTypevalue = selectedAccJson.accountTypeLabel;
						log.debug("412", accountTypevalue);
						if (accountTypevalue == "SAVING") {
							accountFinalvalue = "SAVINGS"
						}
						else {
							accountFinalvalue = selectedAccJson.accountTypeLabel;
						}
						log.debug("420", accountFinalvalue);
						var wire_type_val = wireFilter
						var trans_request = {
							"metadata": {
								"userCode": usrCode,
								"businessCodeList": [busiCode],
								"softwareName": softwareName,
								"softwareVersion": softwareVersion,
								"vendorId": VENDOR_ID
							},
							"businessCode": busiCode,
							"encryptedAccountIdentifier": selectedAccJson.accountIdfr,
							"accountTypeLabel": accountFinalvalue,
							"transactionTimeline": "DATE_RANGE",
							"pageSize": PAGE_SIZE,
							"transactionStartDate": new Date(format.parse({ value: startDateVal, type: format.Type.DATE })).getTime(),
							// "transactionEndDate":new Date(format.parse({value: endDateVal, type: format.Type.DATE})).getTime(),
							"transactionEndDate": endDateActValTime,
							"transactionMinimumAmount": minAmtVal,
							"transactionMaximumAmount": maxAmtVal,
							"nextPage": Number(pageId)

						}

						/* if (filtersEnabled || (startDateVal && endDateVal)) {
							trans_request["transactionTimeline"] = "DATE_RANGE";
							trans_request["transactionStartDate"] = new Date(format.parse({value: startDateVal, type: format.Type.DATE})).getTime();
							trans_request["transactionEndDate"] = new Date(format.parse({value: endDateVal, type: format.Type.DATE})).getTime()
							trans_request["nextPage"] = Number(pageId);

						}
						var currentDate = new Date();
						var currentDateTimeStamp = currentDate.getTime()
						if(wire_type_val == "INTRA_DAY")
						{
							trans_request["transactionStartDate"] = currentDateTimeStamp;
							trans_request["transactionEndDate"]   = currentDateTimeStamp
							trans_request["transactionTimeline"] = "DATE_RANGE";
						}
						else
						{
							trans_request["transactionTimeline"] = wire_type_val;
						} */
						log.debug('trans_Request', trans_request);
						var trans_Response = makeCcbApiRequest(TRANSACTIONS_DETAILS, pubKey, accsTkn, pvtKey, trans_request);
						log.debug('trans_Response', trans_Response);


						trans_Response = JSON.parse(trans_Response);

						var transactions = [];
						log.debug("trans_Response.code ", trans_Response.code)
						if (trans_Response && trans_Response.code == 500) {
							savePushLogs(sessionuserId, TRANSACTIONS_DETAILS, "CitiIntegrator NS SS Info Report Review", trans_request, trans_Response, "");

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
							script += "<p style='font-size: 15px; font-weight: bold;'>Account Summary</p>"
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
						} else if (trans_Response && trans_Response.code == 400) {
							var scriptField = form.addField({
								id: "custpage_clientscript",
								type: serverWidget.FieldType.INLINEHTML,
								label: "Call Script"
							});

							var script = "";
							script += "<script>"
							script += "function displayAlert() { ";
							script += "var rConfig = JSON.parse('{}');"
							script += "rConfig['context'] = \'/" + filePath + "\';"
							script += "var entryPointRequire = require.config(rConfig);"
							script += "entryPointRequire([\'/" + filePath + "\'], function(custommodule){"
							script += "custommodule.displayMessage('" + trans_Response.message + "\');"
							script += "return true;"
							script += "});"
							script += "}";
							script += "displayAlert();";
							script += "</script>"

							scriptField.defaultValue = script;
						} else {
							transactions = [];
							//pagination
							var pageCount = trans_Response.totalNumberOfPages;
							if (pageCount > 0) {
								//var transDetails = trans_Response.transactionsByPostDate[0].transactions;
								var pageData = form.addField({
									id: 'custpage_page_data',
									label: 'Page Data',
									type: serverWidget.FieldType.INLINEHTML,
									container: 'custpage_trans_id'
								})/*.updateDisplayType({
									displayType: serverWidget.FieldDisplayType.NORMAL,
								});*/
								var pageHTML = "<span style=' position: absolute; right: 150px; font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;'>Displaying " + Number(pageId) + " of " + pageCount + "</span><div style='height:10px'>";
								pageData.defaultValue = pageHTML;
								var prevOptions = form.addField({
									id: 'custpage_prev',
									label: 'Prev',
									type: serverWidget.FieldType.INLINEHTML,
									container: 'custpage_trans_id'
								}).updateDisplayType({
									displayType: serverWidget.FieldDisplayType.HIDDEN,
								});

								var prevHTML = "<a style='color: #000080; top: 4px; position: absolute; right: 75px; font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;' href=\"#\" onclick=\" var type = 'prev' ; var rConfig = JSON.parse('{}'); rConfig['context'] = \'/" + filePath + "\'; var entryPointRequire = require.config(rConfig); entryPointRequire([\'/" + filePath + "\'], function(custommodule){ custommodule.pageNavigationReview(type); }); return false;\">Prev Page</a><div style='height:10px'></div>";
								prevOptions.defaultValue = prevHTML;
								var nextOptions = form.addField({
									id: 'custpage_next',
									label: 'Next',
									type: serverWidget.FieldType.INLINEHTML,
									container: 'custpage_trans_id'
								}).updateDisplayType({
									displayType: serverWidget.FieldDisplayType.HIDDEN,
								});

								var nextHTML = "<a style='color: #000080; position: absolute; right: 0; top: 4px; font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;' href=\"#\" onclick=\" var type = 'next'; var rConfig = JSON.parse('{}'); rConfig['context'] = \'/" + filePath + "\'; var entryPointRequire = require.config(rConfig); entryPointRequire([\'/" + filePath + "\'], function(custommodule){ custommodule.pageNavigationReview(type); }); return false;\">Next Page</a><div style='height:10px'>";
								nextOptions.defaultValue = nextHTML;

								var page = form.addField({
									id: "custpage_page_count",
									type: serverWidget.FieldType.TEXT,
									label: "Page Count",
									container: 'custpage_trans_id'
								}).updateDisplayType({
									displayType: serverWidget.FieldDisplayType.HIDDEN,
								});
								page.defaultValue = pageId;
								if (Number(pageId) == 1 && Number(pageId) == Number(pageCount)) {
									prevOptions.updateDisplayType({
										displayType: serverWidget.FieldDisplayType.HIDDEN,
									});
									nextOptions.updateDisplayType({
										displayType: serverWidget.FieldDisplayType.HIDDEN,
									});
								} else if (Number(pageId) == 1 && Number(pageId) != Number(pageCount)) {
									prevOptions.updateDisplayType({
										displayType: serverWidget.FieldDisplayType.HIDDEN,
									});
									nextOptions.updateDisplayType({
										displayType: serverWidget.FieldDisplayType.NORMAL,
									});
								} else if (Number(pageId) < Number(pageCount)) {
									prevOptions.updateDisplayType({
										displayType: serverWidget.FieldDisplayType.NORMAL,
									});
									nextOptions.updateDisplayType({
										displayType: serverWidget.FieldDisplayType.NORMAL,
									});
								} else {
									prevOptions.updateDisplayType({
										displayType: serverWidget.FieldDisplayType.NORMAL,
									});
									nextOptions.updateDisplayType({
										displayType: serverWidget.FieldDisplayType.HIDDEN,
									});
								}
								amountMin.updateDisplayType({
									displayType: serverWidget.FieldDisplayType.NORMAL
								});
								amountMax.updateDisplayType({
									displayType: serverWidget.FieldDisplayType.NORMAL
								});
							} else {
								// Vishal Enabling the amount fields even the search result is empty.
								// amountMin.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
								// amountMax.updateDisplayType({ displayType: serverWidget.FieldDisplayType.DISABLED });
							}

							// extract transactions data
							if (trans_Response && trans_Response.transactionsByPostDate && trans_Response.transactionsByPostDate.length != 0) {
								var transactionsByPostDate = trans_Response.transactionsByPostDate;

								for (var ts = 0; ts < transactionsByPostDate.length; ts++) {
									//log.debug("ts postDate ",transactionsByPostDate[ts].postDate);
									transactions = transactions.concat(transactionsByPostDate[ts].transactions);
									//log.debug("ts post transactios",transactionsByPostDate[ts].transactions);

								}
								// log.debug("transactions.length",transactions.length)
								//  log.debug("transactions.",transactions)
							}
							if ((minAmtVal != undefined && Number(minAmtVal) >= 0) || (maxAmtVal != undefined && Number(maxAmtVal) >= 0)) {
								transactions = applyAmountFilters(minAmtVal, maxAmtVal, transactions);
							}
						}
						if (transactions) {
							log.debug('endDateUpdFlag', endDateUpdFlag);
							for (var i = 0; i < transactions.length; i++) {


								// Vishal EST Timezone issue.
								// if(i == 0 && endDateUpdFlag) {
								// var endEnterDate = transactions[i].transactionDate;
								// log.debug('endEnterDate ' + i, endEnterDate);
								// log.debug('endEnterDate ' + i, typeof endEnterDate);
								// log.debug('endEnterDate ' + i, new Date('2025', '03', '25'));
								// var endDateSplit = endEnterDate.split('-');
								// log.debug('endDateSplit', endDateSplit);

								// if(!isEmpty(endDateSplit)) {
								// if(endDateSplit.length == 3) {
								// if(!isEmpty(endDateSplit[0]) && !isEmpty(endDateSplit[1]) && !isEmpty(endDateSplit[2])) {
								// var endDateFinal = new Date(endDateSplit[0], endDateSplit[1], endDateSplit[2]);
								// // var endDateFinal = new Date(endDateSplit[0], endDateSplit[1], '16');
								// log.debug('endDateFinal', endDateFinal);
								// // log.debug('endDateFinal2', new Date());
								// endDate.defaultValue = endDateFinal ? endDateFinal : null;
								// log.debug('Done', 'Vishal');
								// }
								// }
								// }
								// }
								// Vishal EST Timezone issue.


								list.setSublistValue({
									id: "custlist_date",
									line: i,
									value: transactions[i].transactionDate,
								});
								if (transactions[i].transactionDescription != "") {
									list.setSublistValue({
										id: "custlist_description",
										line: i,
										value: transactions[i].transactionDescription,
									});
								}
								list.setSublistValue({
									id: "custlist_transaction_type",
									line: i,
									value: transactions[i].creditDebitIndicator
								});
								list.setSublistValue({
									id: "custlist_amount",
									line: i,
									value: formatAmount(transactions[i].transactionAmount)
								});
								list.setSublistValue({
									id: "custlist_memo",
									line: i,
									value: " "
								});
								/*list.setSublistValue({
									id: "custlist_inv_number",
									line: i,
									value: (transactions[i].transactionSerialNumber == 0 ? " " : transactions[i].transactionSerialNumber)
								});*/
								/*list.setSublistValue({
									id: "custlist_avl_in_netsuite",
									line: i,
									value: "N/A"
								});*/

							}
						}


						/*form.addButton({
							id: 'custpage_priorday',
							label: 'Prior Day',
							functionName: 'priorDay(\"' + data + '\")'
						});
						
						form.addButton({
							id: 'custpage_intraday',
							label: 'Intraday',
							functionName: 'intraDay(\"' + data + '\")'
						});*/
						form.addButton({
							id: 'custpage_back',
							label: 'Back to Accounts',
							functionName: "backToInfoReporting(\'" + wireFilter + "\')"
						});

						//Facelift changes start
						var styles = form.addField({
							id: 'styles',
							label: ' ',
							type: serverWidget.FieldType.INLINEHTML,
						});

						var stylesScript = '';
						stylesScript += '<script>';
						stylesScript += 'var back_btn = document.getElementById("tdbody_custpage_back");';
						stylesScript += 'if(back_btn) {back_btn.style.borderRadius = "30px";};';
						stylesScript += 'var back_btn_tr = document.getElementById("tr_custpage_back");';
						stylesScript += ' if(back_btn_tr) {back_btn_tr.style.borderRadius = "30px"};';
						stylesScript += 'var back_tbl = document.getElementById("tbl_custpage_back");';
						stylesScript += 'if(back_tbl) { back_tbl.style.paddingTop = "30px";};';
						stylesScript += '</script>';
						styles.defaultValue = stylesScript;
						//Facelift changes end

						// form.addButton({
						// 	id: 'custpage_rest',
						// 	label: 'Reset All',
						// 	functionName: 'ClearFilters(\"' + data + '\")'
						// });
						// form.addButton({
						// 	id: 'custpage_apply',
						// 	label: 'Apply',
						// 	functionName: 'applyFilters(\"' + data + '\")'
						// });
						/* form.addButton({
							id: 'custpage_bank_statement',
							label: 'Download Bank Statement',
							functionName: "bankStatement(\'" + data + "\')"
						}); */

						var script = form.addField({
							id: "custpage_css",
							type: serverWidget.FieldType.INLINEHTML,
							label: "CSS",
							container: "filters"
						});
						var html = "";
						html += "<html>"
						html += "<head>"
						html += "<style>"
						html += "@media screen and (max-width: 768px) {"
						html += "#custpage_amount_max {"
						html += "width: 100px;"
						html += "}"
						html += "}"
						html += "</style>"
						html += "<link rel='stylesheet' href='https://9147342-sb2.app.netsuite.com/core/media/media.nl?id=476954&c=9147342_SB2&h=zcNECbqPuvgcSeu8c5XpCtuz4bDvEWK57iF2AiTkPaIsC54b&mv=ly8g7bcg&_xt=.css&fcts=20240705014310&whence='>"
						html += "</head>"
						html += "<body>"
						html += "</body>"
						html += "</html>"
						script.defaultValue = html;

						res.writePage(form);
					} else {
						redirect.toSuitelet({
							scriptId: 'customscript_citiintegrator_ns_ss_logpge',
							deploymentId: 'customdeploy_citiintegrator_ns_ss_logpge'
						});
					}

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
				savePushLogs(sessionuserId, "", "CitiIntegrator NS SS Info Report Review", "", "", exception);

				var form = serverWidget.createForm({
					title: "Account Summary",
				});
				form.clientScriptModulePath = "../Client/CitiIntegrator NS CS Informtn Validation.js";

				var fileObj = file.load({
					id: '../Client/CitiIntegrator NS CS Informtn Validation.js'
				});
				var filePath = fileObj.path;

				var businessCodeFlag = form.addField({
					id: 'custpage_overlap_titel',
					type: serverWidget.FieldType.INLINEHTML,
					label: "Business Code"
				});
				// Vishal Code change for Report and Submit Home Button.
				var businessCodeEnc = busiCode.substring(busiCode.length - 4, busiCode.length);
				businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>function home() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; var container = jQuery(".uir-page-title"); var newDiv = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:26px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 80px; top:26px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv1);</script></div>';
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
				script += "<p style='font-size: 15px; font-weight: bold;'>Account Summary</p>"
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

				res.writePage(form);
			}
		}

		function makeCcbApiRequest(url, PublicKey, AccessToken, PrivateKey, request) {
			var response = customModule.sendRequest(url, PublicKey, AccessToken, PrivateKey, request, null, APG_ACCESS_TOKEN);
			return response;
		}
		function applyAmountFilters(minAmtVal, maxAmtVal, transactions) {
			var filteredData = [];
			minAmtVal = minAmtVal ? minAmtVal : 0;
			maxAmtVal = maxAmtVal ? maxAmtVal : 0;
			if (minAmtVal > maxAmtVal && Number(maxAmtVal) === 0) {
				maxAmtVal = 9999999999;
			}
			if (transactions) {
				for (var index = 0; index < transactions.length; index++) {
					if (Number(transactions[index].transactionAmount) >= Number(minAmtVal) &&
						Number(transactions[index].transactionAmount) <= Number(maxAmtVal)) {
						filteredData.push(transactions[index]);
					}
				}
			}
			return filteredData;
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

		function parseParamsAsselectedAccJson(inputStr) {
			var keyValPairs = inputStr.split(",");
			var selectedAccJson = {};

			for (var k = 0; k < keyValPairs.length; k++) {

				var pair = keyValPairs[k].split("_Val_");
				log.debug({ title: 'pair str: ', details: pair });
				var key = pair[0].split("_")[1];
				var value = pair[1].split("_")[1];

				log.debug({ title: 'key: ', details: key });
				log.debug({ title: 'val: ', details: value });
				selectedAccJson[key] = value;
				log.debug({ title: 'selectedAccJson str: ', details: selectedAccJson });
			}
			log.debug({ title: 'parsed selectedAccJson String: ', details: JSON.stringify(selectedAccJson) });
			return selectedAccJson;
		}

		function formatAmount(amount) {
			return "$" + parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
		}

		// Function to check whether the value is empty or not.
		function isEmpty(stValue) {
			return ((stValue === '' || stValue === null || stValue === undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function (v) { for (var k in v) return false; return true; })(stValue)));
		}

		//Checking User entilement for the account using usercode from session record and figure it out on of the selected account.
		function checkingEntitlements(userCode, selectedAccName,citiAccountNumber, CitiAccountIdentifier) {
			try {
                selectedAccName = selectedAccName && selectedAccName.trim() ? selectedAccName.trim() : '';
				log.debug("selectedAccName", selectedAccName +" userCode : " + userCode)
				var entitlementFlag = false;
				//var Query = "SELECT * FROM account WHERE accountsearchdisplayname = '" + selectedAccName + "' AND ','|| custrecord_citiintegrator_ns_user || ',' LIKE '%," + userCode + ",%'";
               // Umar updated the query on 28th August 2026
                var Query = "SELECT * FROM account WHERE accountsearchdisplayname = '" + selectedAccName + "' AND ','|| custrecord_citiintegrator_ns_user || ',' LIKE '%," + userCode + ",%' AND custrecord_citiintegrator_ns_citiaccno = '" + citiAccountNumber + "' AND custrecord_citiintegrator_ns_encryptacc = '" + CitiAccountIdentifier + "'";
				var queryResults = query.runSuiteQL({
					query: Query
				}).asMappedResults();
				log.debug("queryResults", queryResults)
				if(queryResults.length === 0) {
					log.debug("No entitlements found for the user code and account name.");
                    entitlementFlag = false;
					return entitlementFlag;
				}
				var entitlement = queryResults[0].custrecord_citiintegrator_ns_entitlemacc;
				log.debug("entitlement", entitlement);
				var parsedEntitlements = JSON.parse(entitlement);
				parsedEntitlements.forEach(function (entitlementObj) {
					if (entitlementObj.user == userCode) {
						var entitlements = entitlementObj.entitlements;
						log.debug("entitlements", entitlements);
						entitlements.forEach(function (entitlementTypeObj) {
							log.debug("entitlementType", entitlementTypeObj.entitlementType);
							if (entitlementTypeObj.entitlementType === "PRIOR_DAY" || entitlementTypeObj.entitlementType === "INTRA_DAY") entitlementFlag = true
								
						});
					}
				});
			} catch (e) {
				log.error('QL Error', e.message);
			}
			return entitlementFlag;
		}
		return {
			onRequest: onRequest
		};
	});