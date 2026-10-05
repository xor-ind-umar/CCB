/**
 * @NApiVersion 2.x
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 */
var PAGE_SIZE = 50;
var billList = [];
var newBillList = [];
var getAllBillID = [];
var newBillID = [];
var configRecDet = [];
var softwareName;
var softwareVersion;
var redWoodPreferences; // by ragini enable redwood

define(['N/ui/serverWidget', 'N/query', 'N/url', 'N/file', 'N/search', 'N/format', 'N/redirect', 'N/record', 'N/log', 'N/runtime', '../Common Module/CitiIntegrator NS SS States Module.js', '../Common Module/CitiIntegrator NS SS Common Module.js', '../Common Module/CitiIntegrator NS SS Config Module.js', 'N/config'],

	function (serverWidget, query, url, file, search, format, redirect, record, log, runtime, statesModule, customModule, configModule, config) {
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
				// Vishal User Feedback.
				var showUserFeedback = false;
				// Vishal User Feedback.

				redWoodPreferences = config.load({ type: config.Type.USER_PREFERENCES }).getValue({ fieldId: 'REDWOOD' });
				log.debug("On Request", "Redwood Pref :" + redWoodPreferences);
				// Set anti-caching headers
				var res = context.response;
				res.setHeader({ name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0' });
				res.setHeader({ name: 'Expires', value: '0' });
				res.setHeader({ name: 'Pragma', value: 'no-cache' });
				var method = context.request.method;
				var userObj = runtime.getCurrentUser();
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
				//CR: APIGEE 
				var apgExtFlag = configurationJSON.apgExternal;
				var PAYMENT_API;
				if (apgExtFlag)
					PAYMENT_API = configurationJSON.apgPaymentAPI;
				else
					PAYMENT_API = configurationJSON.paymentAPI;
				log.audit('APIGEE : flag ', apgExtFlag + ' PAYMENT_API:  ' + PAYMENT_API)

				var form = serverWidget.createForm({
					title: "Payment Initiation Review",
				});
				form.clientScriptModulePath = "../Client/CitiIntegrator NS CS Payment Review.js";

				var fileObj = file.load({
					id: '../Client/CitiIntegrator NS CS Payment Review.js'
				});
				var filePath = fileObj.path;
				log.debug('filePath 1', filePath);

				var tokensSearchObj = customModule.getUserSession(userId);
				var tokensSearchObj = tokensSearchObj.run();
				var sessionResult = tokensSearchObj.getRange({
					start: 0,
					end: 1
				});
				var sessionuserId = sessionResult[0].id;
				var activityTime = sessionResult[0].getValue("custrecord_citiintegrator_ns_lastuptime");

				log.debug("activityTime", activityTime);


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

				var busiCode = sessionResult[0].getValue("custrecord_citiintegrator_ns_buscode");
				//citi logo changes
				var citiLogo = file.load({
					id: '../Images/citiLogo.svg'
				});
				var citiLogoPath = citiLogo.url;
				//citi logo changes
				var businessCodeFlag = form.addField({
					id: 'custpage_overlap_titel',
					type: serverWidget.FieldType.INLINEHTML,
					label: "Business Code"
				});
				var businessCodeEnc = busiCode.substring(busiCode.length - 4, busiCode.length)
				//citi logo changes
				businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script> setTimeout(function() { document.getElementById(\'overlay\').style.display = \'none\'; }, 3000); function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; var newDiv = jQuery("<div> <span><img src=' + citiLogoPath + ' id=\'citiLogo\' style=\'height: 38px; width: 53px; display: none;\'></img> </span><div id=\'test-div\' style=\'font-weight: normal; font-size: 14px; color: #6f6f6f;\'>Business Code : **' + businessCodeEnc + '</div></div>");var container = jQuery(".uir-page-title");container.prepend(newDiv); var newDiv1 = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:74px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv1); var newDiv2 = jQuery("<body id=\'overlay-parent\' style=\'position: relative; height: 100vh; margin: 0; display: flex; justify-content: center; align-items: center; \'>  <div id=\'overlay\' style=\'background-color: rgba(0, 0, 0, 0.5); position: fixed; top: 0; left: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; z-index: 9999;\'>    <div style=\'border: 4px solid rgba(255, 255, 255, 0.3); border-left-color: #7983ff; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; background-color: rgba(255, 255, 255, 0.5);\'></div></div><style>@keyframes spin { 0% { transform: rotate(0deg); }100% { transform: rotate(360deg); }}</style></body>"); container.prepend(newDiv2); </script></div>'
				//logo removal changes
				//citi logo changes
				if (method == "GET") {

					// Vishal Error for Report & Submit Home Button.
					// var folderSearchObj = search.create({ type: "folder2", filters: [ ["name", "is", "Payment Review"] ],
					// columns: [ search.createColumn({ name: "internalid", label: "Internal ID" }) ] }).run().getRange(0,1);
					// Vishal Error.



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
					stylesScript += "  if (checked) checked.checked = false;";
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



					var fileId = context.request.parameters.fileId;
					var fileObj = file.load({
						id: fileId
					});
					var paramData = JSON.parse(fileObj.getContents());
					var wireType = paramData.wireType;

					var imgObj = file.load({
						id: '../Images/info-icon.png'
					});
					var imgPath = imgObj.url;

					var wireTypeHidden = form.addField({
						id: "custpage_wire_type",
						type: serverWidget.FieldType.TEXT,
						label: "Wire"
					}).updateDisplayType({
						displayType: serverWidget.FieldDisplayType.HIDDEN,
					});
					wireTypeHidden.defaultValue = wireType;

					var fileIdHidden = form.addField({
						id: "custpage_file_id",
						type: serverWidget.FieldType.TEXT,
						label: "File Id"
					}).updateDisplayType({
						displayType: serverWidget.FieldDisplayType.HIDDEN,
					});
					fileIdHidden.defaultValue = fileId;

					var label;
					if (wireType == "INTERNAL_TRANSFERS") {
						var accountNumberFrom = generateMaskedNumber(paramData.accountNumberFrom);
						var accountTypeFrom = paramData.accountTypeFrom;
						var currentAvailabeFrom = paramData.currentAvailabeFrom;
						var accountNumberTo = generateMaskedNumber(paramData.accountNumberTo);
						var accountTypeTo = paramData.accountTypeTo;
						var currentAvailabeTo = paramData.currentAvailabeTo;
						var amountToBeSent = paramData.amountToBeSent;
						var transferDate = paramData.scheduledDate;
						var transactionDescription = paramData.transactionDescription;
						label = "Transfer";
						/* var type = form.addField({
							id: "custpage_type",
							type: serverWidget.FieldType.INLINEHTML,
							label: "Type",
						})
						var htmlTags = "<!DOCTYPE html>"
						htmlTags += "<html lang='en'>"
						htmlTags += "<head>"
						htmlTags += "<meta charset='UTF-8'>"
						htmlTags += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
						htmlTags += "</head>"
						htmlTags += "<body style='background-color: #f6f8fa;'>"
						htmlTags += "<div style='text-align: center; margin-top: 25px;'>"
						htmlTags += "<p style='margin: 0; font-family: Open Sans, Helvetica, sans-serif; font-size: 24px;font-weight: bold; color: #4d5f79'>Transfer Summary</p>"
						htmlTags += "<br>"
						htmlTags += "<p style='margin: 0; font-family: Open Sans, Helvetica, sans-serif; font-size: 24px;font-weight: bold; color: #4d5f79'>$" + formatAmounts(amountToBeSent) + " USD</p>"
						htmlTags += "<p style='margin: 0; font-family: Open Sans, Helvetica, sans-serif; font-size: 18px;font-weight: bold; margin-top: 10px !important; color: #4d5f79'>Sending from " + accountNumberFrom + " to " + accountNumberTo + "</p>"
						htmlTags += "</div>"
						htmlTags += "<div style='margin-top: 25px; padding: 32px;'>"
						htmlTags += "<div style='display: flex; justify-content: space-between;'>"
						htmlTags += "<div style='flex-basis: 48%;'>"
						htmlTags += "<p style='color: #4f6f90; font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; text-align: left;'>Transfer From</p>"
						htmlTags += "<hr style='color: rgba(0, 0, 0, 0.19); border-width: 0; border-style: solid; border-bottom-width: thin; height: 1px;'>"
						htmlTags += "<div style='display: flex; flex-direction: column;'>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400; margin: 0; color: #666666; margin-top:8px !important'>Account Number</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400; margin: 0; color: #666666; margin-top:8px !important'>" + accountNumberFrom + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400;color: #666666; margin: 0; margin-top:8px !important'>Account Type</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400; margin: 0;color: #666666; margin-top:8px !important'>" + accountTypeFrom + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400;color: #666666; margin: 0; margin-top:8px !important'>Current Available</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400;color: #666666; margin: 0; margin-top:8px !important'>$" + formatAmounts(currentAvailabeFrom) + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='flex-basis: 48%;'>"
						htmlTags += "<p style='color: #4f6f90; font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; text-align: left;'>Transfer Schedule</p>"
						htmlTags += "<hr style='color: rgba(0, 0, 0, 0.19); border-width: 0; border-style: solid; border-bottom-width: thin; height: 1px;'>"
						htmlTags += "<div style='display: flex; flex-direction: column;'>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400; color: #666666; margin: 0; margin-top:8px !important'>Schedule</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400; color: #666666; margin: 0; margin-top:8px !important'>" + transferDate + " (One Time)</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex; justify-content: space-between; margin-top: 25px;'>"
						htmlTags += "<div style='flex-basis: 48%;'>"
						htmlTags += "<p style='color: #4f6f90; font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; text-align: left;'>Transfer To</p>"
						htmlTags += "<hr style='color: rgba(0, 0, 0, 0.19); border-width: 0; border-style: solid; border-bottom-width: thin; height: 1px;'>"
						htmlTags += "<div style='display: flex; flex-direction: column;'>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400; color: #666666; margin: 0; margin-top:8px !important'>Account Number</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400; color: #666666; margin: 0; margin-top:8px !important'>" + accountNumberTo + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400; color: #666666; margin: 0; margin-top:8px !important'>Account Type</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400; color: #666666; margin: 0; margin-top:8px !important'>" + accountTypeTo + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400; color: #666666; margin: 0; margin-top:8px !important'>Current Available</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400; color: #666666; margin: 0; margin-top:8px !important'>$" + formatAmounts(currentAvailabeTo) + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='flex-basis: 48%;'>"
						htmlTags += "<p style='color: #4f6f90; font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; text-align: left;'>Transfer Amount & Additional Information</p>"
						htmlTags += "<hr style='color: rgba(0, 0, 0, 0.19); border-width: 0; border-style: solid; border-bottom-width: thin; height: 1px;'>"
						htmlTags += "<div style='display: flex; flex-direction: column;'>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400; color: #666666; margin: 0; margin-top:8px !important'>Amount</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400; color: #666666; margin: 0; margin-top:8px !important'>$" + formatAmounts(amountToBeSent) + " USD</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400; color: #666666; margin: 0; margin-top:8px !important'>Description</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 13px;font-weight: 400; color: #666666; margin: 0; margin-top:8px !important'>" + transactionDescription + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<hr style='margin-top: 24px !important; margin: 0; color: rgba(0, 0, 0, 0.19); border-width: 0; border-style: solid; border-bottom-width: thin; height: 1px;'>"
						htmlTags += "</div>"
						htmlTags += "</body>"
						htmlTags += "</html>";
						type.defaultValue = htmlTags; */

						// transfer Summary

						form.addFieldGroup({
							id: 'payment_transfer_summary',
							label: 'Transfer Summary'
						});

						var summary_amount = form.addField({
							id: 'summaryammount',
							type: serverWidget.FieldType.TEXT,
							label: 'Amount(USD)',
							container: 'payment_transfer_summary'
						});
						//bankaccountid.isMandatory = true;
						/* var intamountToBeSent = parseInt(amountToBeSent);
						log.debug("intamountToBeSent",intamountToBeSent);
					summary_amount.defaultValue = '$'+intamountToBeSent.toFixed(2); */
						summary_amount.defaultValue = '$' + formatAmounts(amountToBeSent);
						summary_amount.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						//var subsidiaryvalue = getSub;
						var sendingfrom = form.addField({
							id: 'sending_from',
							type: serverWidget.FieldType.TEXT,
							label: 'Sending From',

							container: 'payment_transfer_summary'
						});
						sendingfrom.defaultValue = accountNumberFrom;
						sendingfrom.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var sendingto = form.addField({
							id: 'sending_to',
							type: serverWidget.FieldType.TEXT,
							label: 'Sending To',

							container: 'payment_transfer_summary'
						});
						sendingto.defaultValue = accountNumberTo;
						sendingto.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						// transfer from
						form.addFieldGroup({
							id: 'payment_transfer_from',
							label: 'Transfer From'
						});

						var bankaccountno = form.addField({
							id: 'bankaccnumber',
							type: serverWidget.FieldType.TEXT,
							label: 'Account Number',
							container: 'payment_transfer_from'
						});
						//bankaccountid.isMandatory = true;
						bankaccountno.defaultValue = accountNumberFrom;
						bankaccountno.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						//var subsidiaryvalue = getSub;
						var accounttype = form.addField({
							id: 'accounttype',
							type: serverWidget.FieldType.TEXT,
							label: 'Account Type',

							container: 'payment_transfer_from'
						});
						accounttype.defaultValue = accountTypeFrom;
						accounttype.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var current_available = form.addField({
							id: 'currentavialable',
							type: serverWidget.FieldType.TEXT,
							label: 'Current Available(USD)',
							container: 'payment_transfer_from'
						});
						current_available.defaultValue = '$' + formatAmounts(currentAvailabeFrom);
						current_available.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						// transfer to 

						form.addFieldGroup({
							id: 'payment_transfer_to',
							label: 'Transfer To'
						});

						var bankaccountno_to = form.addField({
							id: 'bankaccnumberto',
							type: serverWidget.FieldType.TEXT,
							label: 'Account Number',
							container: 'payment_transfer_to'
						});
						//bankaccountid.isMandatory = true;
						bankaccountno_to.defaultValue = accountNumberTo;
						bankaccountno_to.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						//var subsidiaryvalue = getSub;
						var accounttype_to = form.addField({
							id: 'accounttypeto',
							type: serverWidget.FieldType.TEXT,
							label: 'Account Type',

							container: 'payment_transfer_to'
						});
						accounttype_to.defaultValue = accountTypeTo;
						accounttype_to.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var current_available_to = form.addField({
							id: 'currentavialableto',
							type: serverWidget.FieldType.TEXT,
							label: 'Current Available(USD)',
							container: 'payment_transfer_to'
						});
						current_available_to.defaultValue = '$' + formatAmounts(currentAvailabeTo);
						current_available_to.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});


						// for transfer schedule

						form.addFieldGroup({
							id: 'payment_transfer_schedule',
							label: 'Transfer Schedule'
						});

						var schedule = form.addField({
							id: 'schedulevalue',
							type: serverWidget.FieldType.TEXT,
							label: 'Schedule',
							container: 'payment_transfer_schedule'
						});
						//bankaccountid.isMandatory = true;
						schedule.defaultValue = transferDate;
						schedule.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						// for Transfer Amount & Additional Information

						form.addFieldGroup({
							id: 'payment_transfer_amt_additional_inf',
							label: 'Transfer Amount & Additional Information'
						});

						var amount = form.addField({
							id: 'amountvalue',
							type: serverWidget.FieldType.TEXT,
							label: 'Amount(USD)',
							container: 'payment_transfer_amt_additional_inf'
						});
						//bankaccountid.isMandatory = true;
						/* var intamountToBeSent = parseInt(amountToBeSent); 
						log.debug("intamountToBeSent",intamountToBeSent);
					amount.defaultValue = '$'+intamountToBeSent.toFixed(2); */
						amount.defaultValue = '$' + formatAmounts(amountToBeSent);
						amount.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});
						var description = form.addField({
							id: 'descriptionvalue',
							type: serverWidget.FieldType.TEXT,
							label: 'Description',
							container: 'payment_transfer_amt_additional_inf'
						});
						//bankaccountid.isMandatory = true;
						description.defaultValue = transactionDescription;
						description.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});


					}
					else if (wireType == "DOMESTIC_WIRES") {
						var accountNumberFrom = generateMaskedNumber(paramData.accountNumberFrom);
						var accountTypeFrom = paramData.accountTypeFrom;
						var currentAvailabeFrom = paramData.currentAvailabeFrom;
						var beneficiaryName = paramData.beneficiaryName;
						var beneficiaryAccountNumber = convertMaskedNumber(paramData.beneficiaryAccountNumber);
						var phoneNumber = paramData.phoneNumber;
						var address1 = paramData.address1;
						var address2 = paramData.address2;
						var address3 = paramData.address3;
						var specialInstructions1 = paramData.specialInstructions1;
						var specialInstructions2 = paramData.specialInstructions2;
						var specialInstructions3 = paramData.specialInstructions3;
						var wireDate = paramData.scheduledDate;
						var wireAmount = paramData.wireAmount;
						var customerReferenceNumber = paramData.customerReferenceNumber;
						var customerAdditionalReference = paramData.customerAdditionalReference;
						var customerAdditionalDescription = paramData.customerAdditionalDescription;
						var routingCode = paramData.routingCode;
						var destfinInstaccount = paramData.destfinInstaccount;
						var destBankState = paramData.destBankState;
						log.debug("destBankState515", destBankState);
						var bankAddress;
						label = "Wire";
						var stateName;
						var states = statesModule.getStates();
						var usaStates = states.usaStates;
						log.debug("usaStates", usaStates);
						for (var i = 0; i < usaStates.length; i++) {
							if (usaStates[i].stateCode === destBankState) {
								stateName = usaStates[i].stateName;  // State name found
								break;  // Exit the loop once the match is found
							}
						}
						log.debug("stateName528", stateName);

						if (paramData.intermediatoryBankFlag) {
							bankAddress = paramData.destBankName + " " + paramData.destBankAddr + " " + paramData.destBankCity + " " + stateName;
						} else {
							bankAddress = paramData.bankAddress;
						}





						/*  var type = form.addField({
							id: "custpage_type",
							type: serverWidget.FieldType.INLINEHTML,
							label: "Type",
						})
						var htmlTags = "<!DOCTYPE html>"
						htmlTags += "<html lang='en'>"
						htmlTags += "<head>"
						htmlTags += "<meta charset='UTF-8'>"
						htmlTags += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
						htmlTags += "</head>"
						htmlTags += "<body style='background-color: #f6f8fa;'>"
						htmlTags += "<div style='background-color: #4f6f90; display: flex; padding: 8px; margin-top: 25px; text-align: left; color: #ffffff; font-size: 18px; font-family: Arial, sans-serif;'>"
						htmlTags += "<div style='margin-top: 7px;'>"
						htmlTags += "<span>"
						htmlTags += "<img style='height: 20px; margin-right: 8px; width: 20px' src=" + imgPath + "></img>"
						htmlTags += "</span>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='margin: 0; font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin-top: 4px !important;'>To send this wire out today, wire must be completely approved in CitiBusiness online by 6.45 EDT. If approval is completed after the cut off time, the wire will be processed next business day. Please note, your Source Account will be debited upon processing of this wire. Fees may apply for completed wires.</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='text-align: center; margin-top: 25px;'>"
						htmlTags += "<p style='margin: 0; font-family: Open Sans, Helvetica, sans-serif; font-size: 24px;font-weight: 600; color: #22303e'>Wire Summary</p>"
						htmlTags += "<br>"
						htmlTags += "<p style='margin: 0; font-family: Open Sans, Helvetica, sans-serif; font-size: 32px;font-weight: 600; color: #22303e'>$" + formatAmounts(wireAmount) + " USD</p>"
						htmlTags += "<p style='margin: 0; font-family: Open Sans, Helvetica, sans-serif; font-size: 18px;font-weight: 600; margin-top: 10px !important; color: #22303e'>Sending from " + accountNumberFrom + " to " + beneficiaryAccountNumber + "</p>"
						htmlTags += "</div>"
						 htmlTags += "<div style='margin-top: 25px; padding: 32px;'>"
						htmlTags += "<div style='display: flex; justify-content: space-between;'>"
						htmlTags += "<div style='flex-basis: 48%;'>"
						htmlTags += "<p style='color: #4f6f90; font-family: Open Sans, Helvetica, sans-serif; font-size: 18px;font-weight: 600; margin: 0; text-align: left;'>Transfer From</p>"
						htmlTags += "<hr style='color: rgba(0, 0, 0, 0.19); border-width: 0; border-style: solid; border-bottom-width: thin; height: 1px;'>"
						htmlTags += "<div style='display: flex; flex-direction: column;'>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Account Number</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + accountNumberFrom + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Account Type</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + accountTypeFrom + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Current Available</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>$" + formatAmounts(currentAvailabeFrom) + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='flex-basis: 48%;'>"
						htmlTags += "<p style='color: #4f6f90; font-family: Open Sans, Helvetica, sans-serif; font-size: 18px;font-weight: 600; margin: 0; text-align: left;'>Transfer Schedule</p>"
						htmlTags += "<hr style='color: rgba(0, 0, 0, 0.19); border-width: 0; border-style: solid; border-bottom-width: thin; height: 1px;'>"
						htmlTags += "<div style='display: flex; flex-direction: column;'>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Schedule</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + wireDate + " (One Time)</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex; justify-content: space-between; margin-top: 25px;'>"
						htmlTags += "<div style='flex-basis: 48%;'>"
						htmlTags += "<p style='color: #4f6f90; font-family: Open Sans, Helvetica, sans-serif; font-size: 18px;font-weight: 600; margin: 0; text-align: left;'>Transfer To</p>"
						htmlTags += "<hr style='color: rgba(0, 0, 0, 0.19); border-width: 0; border-style: solid; border-bottom-width: thin; height: 1px;'>"
						htmlTags += "<div style='display: flex; flex-direction: column;'>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Beneficiary Name</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + beneficiaryName + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Beneficiary Account Number</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + beneficiaryAccountNumber + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Bank Routing Number (ABA)</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + routingCode + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; max-width: 325px; margin-top:8px !important'>Beneficiary Address</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + address1 + " " + address2 + " " + address3 + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Beneficiary Phone</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + phoneNumber + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Bank Address</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; max-width: 325px; margin-top:8px !important'>" + bankAddress + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Special Instructions</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + specialInstructions1 + "</p>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + specialInstructions2 + "</p>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + specialInstructions3 + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='flex-basis: 48%;'>"
						htmlTags += "<p style='color: #4f6f90; font-family: Open Sans, Helvetica, sans-serif; font-size: 18px;font-weight: 600; margin: 0; text-align: left;'>Transfer Amount & Additional Information</p>"
						htmlTags += "<hr style='color: rgba(0, 0, 0, 0.19); border-width: 0; border-style: solid; border-bottom-width: thin; height: 1px;'>"
						htmlTags += "<div style='display: flex; flex-direction: column;'>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Amount</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>$" + formatAmounts(wireAmount) + " USD</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Customer Reference No.</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + customerReferenceNumber + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Additional References</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + customerAdditionalReference + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<div style='display: flex;'>"
						htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Additional Description</p>"
						htmlTags += "</div>"
						htmlTags += "<div>"
						htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + customerAdditionalDescription + "</p>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "</div>"
						htmlTags += "<hr style='margin-top: 24px !important; margin: 0; color: rgba(0, 0, 0, 0.19); border-width: 0; border-style: solid; border-bottom-width: thin; height: 1px;'>"
						htmlTags += "</div>" 
						htmlTags += "</body>"
						htmlTags += "</html>";
						type.defaultValue = htmlTags;  */

						// transfer Summary

						form.addFieldGroup({
							id: 'payment_transfer_summary',
							label: 'Transfer Summary'
						});

						var summary_amount = form.addField({
							id: 'summaryammount',
							type: serverWidget.FieldType.TEXT,
							label: 'Amount(USD)',
							container: 'payment_transfer_summary'
						});
						//bankaccountid.isMandatory = true;
						/* var intwireAmount = parseInt(wireAmount); // 
							log.debug("intwireAmount",intwireAmount);
						summary_amount.defaultValue = '$'+intwireAmount.toFixed(2); */
						summary_amount.defaultValue = '$' + formatAmounts(wireAmount);
						summary_amount.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						//var subsidiaryvalue = getSub;
						var sendingfrom = form.addField({
							id: 'sending_from',
							type: serverWidget.FieldType.TEXT,
							label: 'Sending From',

							container: 'payment_transfer_summary'
						});
						sendingfrom.defaultValue = accountNumberFrom;
						sendingfrom.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var sendingto = form.addField({
							id: 'sending_to',
							type: serverWidget.FieldType.TEXT,
							label: 'Sending To',

							container: 'payment_transfer_summary'
						});
						sendingto.defaultValue = beneficiaryAccountNumber;
						sendingto.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						//transfer from

						form.addFieldGroup({
							id: 'payment_transfer_from',
							label: 'Transfer From'
						});

						var bankaccountno = form.addField({
							id: 'bankaccnumber',
							type: serverWidget.FieldType.TEXT,
							label: 'Account Number',
							container: 'payment_transfer_from'
						});
						//bankaccountid.isMandatory = true;
						bankaccountno.defaultValue = accountNumberFrom;
						bankaccountno.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						//var subsidiaryvalue = getSub;
						var accounttype = form.addField({
							id: 'accounttype',
							type: serverWidget.FieldType.TEXT,
							label: 'Account Type',

							container: 'payment_transfer_from'
						});
						accounttype.defaultValue = accountTypeFrom;
						accounttype.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var current_available = form.addField({
							id: 'currentavialable',
							type: serverWidget.FieldType.TEXT,
							label: 'Current Available(USD)',
							container: 'payment_transfer_from'
						});

						current_available.defaultValue = '$' + formatAmounts(currentAvailabeFrom);
						current_available.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});


						// for transfer to

						form.addFieldGroup({
							id: 'payment_transfer_to',
							label: 'Transfer To'
						});

						var beneficiary_name = form.addField({
							id: 'beneficiaryvaluename',
							type: serverWidget.FieldType.TEXT,
							label: 'Beneficiary Name',
							container: 'payment_transfer_to'
						});
						//bankaccountid.isMandatory = true;
						beneficiary_name.defaultValue = beneficiaryName;
						beneficiary_name.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});
						//var subsidiaryvalue = getSub;
						var Bene_acc_number = form.addField({
							id: 'beneaccnumber',
							type: serverWidget.FieldType.TEXT,
							label: 'Beneficiary Account Number',

							container: 'payment_transfer_to'
						});
						Bene_acc_number.defaultValue = beneficiaryAccountNumber;
						Bene_acc_number.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var bank_routing_no = form.addField({
							id: 'bankroutingnumber',
							type: serverWidget.FieldType.TEXT,
							label: 'Bank Routing Number (ABA)',
							container: 'payment_transfer_to'
						});
						bank_routing_no.defaultValue = routingCode;
						bank_routing_no.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var beneficiary_address = form.addField({
							id: 'benefeciaryaddress',
							type: serverWidget.FieldType.TEXT,
							label: 'Beneficiary Address',
							container: 'payment_transfer_to'
						});
						//bankaccountid.isMandatory = true;
						beneficiary_address.defaultValue = address1 + "  " + address2 + "  " + address3;
						beneficiary_address.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});
						//var subsidiaryvalue = getSub;
						var beneficiary_phone = form.addField({
							id: 'beneficiaryphone',
							type: serverWidget.FieldType.TEXT,
							label: 'Beneficiary Phone',

							container: 'payment_transfer_to'
						});
						beneficiary_phone.defaultValue = phoneNumber;
						beneficiary_phone.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var bank_address = form.addField({
							id: 'bankaddress',
							type: serverWidget.FieldType.TEXT,
							label: 'Bank Address',
							container: 'payment_transfer_to'
						});
						bank_address.defaultValue = bankAddress;
						bank_address.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						log.debug("destfinInstaccount", destfinInstaccount);
						var account_finint = form.addField({
							id: 'accountintfinbank',
							type: serverWidget.FieldType.TEXT,
							label: 'Account at Intermediate Bank',
							container: 'payment_transfer_to'
						});
						account_finint.defaultValue = destfinInstaccount;
						account_finint.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var special_instructions = form.addField({
							id: 'specialinstructions',
							type: serverWidget.FieldType.TEXT,
							label: 'Special Instructions',
							container: 'payment_transfer_to'
						});
						special_instructions.defaultValue = specialInstructions1 + "  " + specialInstructions2 + "  " + specialInstructions3;
						special_instructions.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						// for transfer schedule

						form.addFieldGroup({
							id: 'payment_transfer_schedule',
							label: 'Transfer Schedule'
						});

						var schedule = form.addField({
							id: 'schedulevalue',
							type: serverWidget.FieldType.TEXT,
							label: 'Schedule',
							container: 'payment_transfer_schedule'
						});
						//bankaccountid.isMandatory = true;
						schedule.defaultValue = wireDate;
						schedule.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});


						// for Transfer Amount & Additional Information

						form.addFieldGroup({
							id: 'payment_transfer_amt_additional_inf',
							label: 'Transfer Amount & Additional Information'
						});

						var amount = form.addField({
							id: 'amountvalue',
							type: serverWidget.FieldType.TEXT,
							label: 'Amount(USD)',
							container: 'payment_transfer_amt_additional_inf'
						});
						//bankaccountid.isMandatory = true;
						/* var intwireAmount = parseInt(wireAmount); // 
						log.debug("intwireAmount",intwireAmount);
					amount.defaultValue = '$'+intwireAmount.toFixed(2); */
						amount.defaultValue = '$' + formatAmounts(wireAmount);
						amount.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});
						var cust_ref_no = form.addField({
							id: 'custrefrencevalue',
							type: serverWidget.FieldType.TEXT,
							label: 'Customer Reference No',
							container: 'payment_transfer_amt_additional_inf'
						});
						//bankaccountid.isMandatory = true;
						cust_ref_no.defaultValue = customerReferenceNumber;
						cust_ref_no.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var additional_ref = form.addField({
							id: 'additionarefvalue',
							type: serverWidget.FieldType.TEXT,
							label: 'Additional References',
							container: 'payment_transfer_amt_additional_inf'
						});
						//bankaccountid.isMandatory = true;
						additional_ref.defaultValue = customerAdditionalReference;
						additional_ref.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});
						var additional_description = form.addField({
							id: 'additionaldesvalue',
							type: serverWidget.FieldType.TEXT,
							label: 'Additional Description',
							container: 'payment_transfer_amt_additional_inf'
						});
						//bankaccountid.isMandatory = true;
						additional_description.defaultValue = customerAdditionalDescription;
						additional_description.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

					}
					else if (wireType == "REAL_TIME_PAYMENTS") {//rutuja start

						var accountNumberFrom = generateMaskedNumber(paramData.accountNumberFrom);
						var accountTypeFrom = paramData.accountTypeFrom;
						var currentAvailabeFrom = paramData.currentAvailabeFrom;
						var beneficiaryName = paramData.beneficiaryName;
						var beneficiaryAccountNumber = convertMaskedNumber(paramData.beneficiaryAccountNumber);
						// var phoneNumber = paramData.phoneNumber;
						// var address1 = paramData.address1;
						// var address2 = paramData.address2;
						// var address3 = paramData.address3;
						// var specialInstructions1 = paramData.specialInstructions1;
						// var specialInstructions2 = paramData.specialInstructions2;
						// var specialInstructions3 = paramData.specialInstructions3;
						var wireDate = paramData.scheduledDate;
						var wireAmount = paramData.wireAmount;
						// var customerReferenceNumber = paramData.customerReferenceNumber;
						// var customerAdditionalReference = paramData.customerAdditionalReference;
						var customerAdditionalDescription = paramData.customerAdditionalDescription;
						var routingCode = paramData.routingCode;
						// var destfinInstaccount = paramData.destfinInstaccount;
						// var destBankState = paramData.destBankState;
						// log.debug("destBankState515", destBankState);
						// var bankAddress;
						label = "Payment";
						// var stateName;
						// var states = statesModule.getStates();
						// var usaStates = states.usaStates;
						// log.debug("usaStates", usaStates);
						// for (var i = 0; i < usaStates.length; i++) {
						// 	if (usaStates[i].stateCode === destBankState) {
						// 		stateName = usaStates[i].stateName;  // State name found
						// 		break;  // Exit the loop once the match is found
						// 	}
						// }
						// log.debug("stateName528", stateName);

						// if (paramData.intermediatoryBankFlag) {
						// 	bankAddress = paramData.destBankName + " " + paramData.destBankAddr + " " + paramData.destBankCity + " " + stateName;
						// } else {
						// 	bankAddress = paramData.bankAddress;
						// }

						form.addFieldGroup({
							id: 'payment_transfer_summary',
							label: 'Payment Summary'
						});

						var summary_amount = form.addField({
							id: 'summaryammount',
							type: serverWidget.FieldType.TEXT,
							label: 'Amount(USD)',
							container: 'payment_transfer_summary'
						});
						//bankaccountid.isMandatory = true;
						/* var intwireAmount = parseInt(wireAmount); // 
							log.debug("intwireAmount",intwireAmount);
						summary_amount.defaultValue = '$'+intwireAmount.toFixed(2); */
						summary_amount.defaultValue = '$' + formatAmounts(wireAmount);
						summary_amount.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						//var subsidiaryvalue = getSub;
						var sendingfrom = form.addField({
							id: 'sending_from',
							type: serverWidget.FieldType.TEXT,
							label: 'Sending From',

							container: 'payment_transfer_summary'
						});
						sendingfrom.defaultValue = accountNumberFrom;
						sendingfrom.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var sendingto = form.addField({
							id: 'sending_to',
							type: serverWidget.FieldType.TEXT,
							label: 'Sending To',

							container: 'payment_transfer_summary'
						});
						sendingto.defaultValue = beneficiaryAccountNumber;
						sendingto.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						//transfer from

						form.addFieldGroup({
							id: 'payment_transfer_from',
							label: 'Pay From'
						});

						var bankaccountno = form.addField({
							id: 'bankaccnumber',
							type: serverWidget.FieldType.TEXT,
							label: 'Account Number',
							container: 'payment_transfer_from'
						});
						//bankaccountid.isMandatory = true;
						bankaccountno.defaultValue = accountNumberFrom;
						bankaccountno.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						//var subsidiaryvalue = getSub;
						var accounttype = form.addField({
							id: 'accounttype',
							type: serverWidget.FieldType.TEXT,
							label: 'Account Type',

							container: 'payment_transfer_from'
						});
						accounttype.defaultValue = accountTypeFrom;
						accounttype.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var current_available = form.addField({
							id: 'currentavialable',
							type: serverWidget.FieldType.TEXT,
							label: 'Current Available(USD)',
							container: 'payment_transfer_from'
						});

						current_available.defaultValue = '$' + formatAmounts(currentAvailabeFrom);
						current_available.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});


						// for transfer to

						form.addFieldGroup({
							id: 'payment_transfer_to',
							label: 'Pay To'
						});

						var beneficiary_name = form.addField({
							id: 'beneficiaryvaluename',
							type: serverWidget.FieldType.TEXT,
							label: 'Payee Name',
							container: 'payment_transfer_to'
						});
						//bankaccountid.isMandatory = true;
						beneficiary_name.defaultValue = beneficiaryName;
						beneficiary_name.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});
						//var subsidiaryvalue = getSub;
						var Bene_acc_number = form.addField({
							id: 'beneaccnumber',
							type: serverWidget.FieldType.TEXT,
							label: 'Payee Account Number',

							container: 'payment_transfer_to'
						});
						Bene_acc_number.defaultValue = beneficiaryAccountNumber;
						Bene_acc_number.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var bank_routing_no = form.addField({
							id: 'bankroutingnumber',
							type: serverWidget.FieldType.TEXT,
							label: 'Bank Routing Number (ABA)',
							container: 'payment_transfer_to'
						});
						bank_routing_no.defaultValue = routingCode;
						bank_routing_no.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						// var beneficiary_address = form.addField({
						// 	id: 'benefeciaryaddress',
						// 	type: serverWidget.FieldType.TEXT,
						// 	label: 'Beneficiary Address',
						// 	container: 'payment_transfer_to'
						// });
						// //bankaccountid.isMandatory = true;
						// beneficiary_address.defaultValue = address1 + "  " + address2 + "  " + address3;
						// beneficiary_address.updateDisplayType({
						// 	displayType: serverWidget.FieldDisplayType.INLINE
						// });
						//var subsidiaryvalue = getSub;
						// var beneficiary_phone = form.addField({
						// 	id: 'beneficiaryphone',
						// 	type: serverWidget.FieldType.TEXT,
						// 	label: 'Beneficiary Phone',

						// 	container: 'payment_transfer_to'
						// });
						// beneficiary_phone.defaultValue = phoneNumber;
						// beneficiary_phone.updateDisplayType({
						// 	displayType: serverWidget.FieldDisplayType.INLINE
						// });

						// var bank_address = form.addField({
						// 	id: 'bankaddress',
						// 	type: serverWidget.FieldType.TEXT,
						// 	label: 'Bank Address',
						// 	container: 'payment_transfer_to'
						// });
						// bank_address.defaultValue = bankAddress;
						// bank_address.updateDisplayType({
						// 	displayType: serverWidget.FieldDisplayType.INLINE
						// });

						// log.debug("destfinInstaccount", destfinInstaccount);
						// var account_finint = form.addField({
						// 	id: 'accountintfinbank',
						// 	type: serverWidget.FieldType.TEXT,
						// 	label: 'Account at Intermediate Bank',
						// 	container: 'payment_transfer_to'
						// });
						// account_finint.defaultValue = destfinInstaccount;
						// account_finint.updateDisplayType({
						// 	displayType: serverWidget.FieldDisplayType.INLINE
						// });

						// var special_instructions = form.addField({
						// 	id: 'specialinstructions',
						// 	type: serverWidget.FieldType.TEXT,
						// 	label: 'Special Instructions',
						// 	container: 'payment_transfer_to'
						// });
						// special_instructions.defaultValue = specialInstructions1 + "  " + specialInstructions2 + "  " + specialInstructions3;
						// special_instructions.updateDisplayType({
						// 	displayType: serverWidget.FieldDisplayType.INLINE
						// });

						// for transfer schedule

						form.addFieldGroup({
							id: 'payment_transfer_schedule',
							label: 'Transfer Schedule'
						});

						var schedule = form.addField({
							id: 'schedulevalue',
							type: serverWidget.FieldType.TEXT,
							label: 'Schedule',
							container: 'payment_transfer_schedule'
						});
						//bankaccountid.isMandatory = true;
						schedule.defaultValue = wireDate;
						schedule.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});


						// for Transfer Amount & Additional Information

						form.addFieldGroup({
							id: 'payment_transfer_amt_additional_inf',
							label: 'Transfer Amount & Description'
						});

						var amount = form.addField({
							id: 'amountvalue',
							type: serverWidget.FieldType.TEXT,
							label: 'Amount(USD)',
							container: 'payment_transfer_amt_additional_inf'
						});
						//bankaccountid.isMandatory = true;
						/* var intwireAmount = parseInt(wireAmount); // 
						log.debug("intwireAmount",intwireAmount);
					amount.defaultValue = '$'+intwireAmount.toFixed(2); */
						amount.defaultValue = '$' + formatAmounts(wireAmount);
						amount.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});
						// var cust_ref_no = form.addField({
						// 	id: 'custrefrencevalue',
						// 	type: serverWidget.FieldType.TEXT,
						// 	label: 'Customer Reference No',
						// 	container: 'payment_transfer_amt_additional_inf'
						// });
						// //bankaccountid.isMandatory = true;
						// cust_ref_no.defaultValue = customerReferenceNumber;
						// cust_ref_no.updateDisplayType({
						// 	displayType: serverWidget.FieldDisplayType.INLINE
						// });

						// var additional_ref = form.addField({
						// 	id: 'additionarefvalue',
						// 	type: serverWidget.FieldType.TEXT,
						// 	label: 'Additional References',
						// 	container: 'payment_transfer_amt_additional_inf'
						// });
						// //bankaccountid.isMandatory = true;
						// additional_ref.defaultValue = customerAdditionalReference;
						// additional_ref.updateDisplayType({
						// 	displayType: serverWidget.FieldDisplayType.INLINE
						// });
						var additional_description = form.addField({
							id: 'additionaldesvalue',
							type: serverWidget.FieldType.TEXT,
							label: 'Additional Description',
							container: 'payment_transfer_amt_additional_inf'
						});
						//bankaccountid.isMandatory = true;
						additional_description.defaultValue = customerAdditionalDescription;
						additional_description.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

					}
					//rutuja end
					else if (wireType == "FOREIGN_WIRES") {
						//Foreign Wire
						var accountNumberFrom = generateMaskedNumber(paramData.accountNumberFrom);
						var accountTypeFrom = paramData.accountTypeFrom;
						var currentAvailabeFrom = paramData.currentAvailabeFrom;
						var destinationCountry = paramData.destinationCountry;
						var swiftOrBIC = paramData.swiftOrBIC;
						var currency = paramData.currency;
						var chipOrUID = paramData.chipOrUID;
						var intermediatoryBankHoldingNo = paramData.intermediatoryBankHoldingNo;
						var wireDate = paramData.scheduledDate;
						var wireAmount = paramData.wireAmount;
						var beneficiaryName = paramData.beneficiaryName;
						var beneficiaryAccountNumber = convertMaskedNumber(paramData.beneficiaryAccountNumber);
						var phoneNumber = paramData.phoneNumber;
						var address1 = paramData.address1;
						var address2 = paramData.address2;
						var address3 = paramData.address3;
						var specialInstructions1 = paramData.specialInstructions1;
						var specialInstructions2 = paramData.specialInstructions2;
						var specialInstructions3 = paramData.specialInstructions3;
						var customerReferenceNumber = paramData.customerReferenceNumber;
						var customerAdditionalReference = paramData.customerAdditionalReference;
						var bankAddress = paramData.bankAddress;
						label = "Wire";
						/* var type = form.addField({
						   id: "custpage_type",
						   type: serverWidget.FieldType.INLINEHTML,
						   label: "Type",
					   })
					   var htmlTags = "<!DOCTYPE html>"
					   htmlTags += "<html lang='en'>"
					   htmlTags += "<head>"
					   htmlTags += "<meta charset='UTF-8'>"
					   htmlTags += "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
					   htmlTags += "</head>"
					   htmlTags += "<body style='background-color: #f6f8fa;'>"
					   htmlTags += "<div style='background-color: #4f6f90; display: flex; padding: 8px; margin-top: 25px; text-align: left; color: #ffffff; font-size: 18px; font-family: Arial, sans-serif;'>"
					   htmlTags += "<div style='margin-top: 7px;'>"
					   htmlTags += "<span>"
					   htmlTags += "<img style='height: 20px; margin-right: 8px; width: 20px' src=" + imgPath + "></img>"
					   htmlTags += "</span>"
					   htmlTags += "</div>"
					   htmlTags += "<div>"
					   htmlTags += "<p style='margin: 0; font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin-top: 4px !important;'>To send this wire out today, wire must be completely approved in CitiBusiness online by 6.45 EDT. If approval is completed after the cut off time, the wire will be processed next business day. Please note, your Source Account will be debited upon processing of this wire. Fees may apply for completed wires.</p>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "<div style='text-align: center; margin-top: 25px;'>"
					   htmlTags += "<p style='margin: 0; font-family: Open Sans, Helvetica, sans-serif; font-size: 24px;font-weight: 600; color: #22303e'>Wire Summary</p>"
					   htmlTags += "<br>"
					   htmlTags += "<p style='margin: 0; font-family: Open Sans, Helvetica, sans-serif; font-size: 32px;font-weight: 600; color: #22303e'>$" + formatAmounts(wireAmount) + " USD</p>"
					   htmlTags += "<p style='margin: 0; font-family: Open Sans, Helvetica, sans-serif; font-size: 18px;font-weight: 600; margin-top: 10px !important; color: #22303e'>Sending from " + accountNumberFrom + " to " + beneficiaryAccountNumber + "</p>"
					   htmlTags += "</div>"
					   htmlTags += "<div style='margin-top: 25px; padding: 32px;'>"
					   htmlTags += "<div style='display: flex; justify-content: space-between;'>"
					   htmlTags += "<div style='flex-basis: 48%;'>"
					   htmlTags += "<p style='color: #4f6f90; font-family: Open Sans, Helvetica, sans-serif; font-size: 18px;font-weight: 600; margin: 0; text-align: left;'>Transfer From</p>"
					   htmlTags += "<hr style='color: rgba(0, 0, 0, 0.19); border-width: 0; border-style: solid; border-bottom-width: thin; height: 1px;'>"
					   htmlTags += "<div style='display: flex; flex-direction: column;'>"
					   htmlTags += "<div style='display: flex;'>"
					   htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Account Number</p>"
					   htmlTags += "</div>"
					   htmlTags += "<div>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + accountNumberFrom + "</p>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "<div style='display: flex;'>"
					   htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Account Type</p>"
					   htmlTags += "</div>"
					   htmlTags += "<div>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + accountTypeFrom + "</p>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "<div style='display: flex;'>"
					   htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Current Available</p>"
					   htmlTags += "</div>"
					   htmlTags += "<div>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>$" + formatAmounts(currentAvailabeFrom) + "</p>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "<div style='flex-basis: 48%;'>"
					   htmlTags += "<p style='color: #4f6f90; font-family: Open Sans, Helvetica, sans-serif; font-size: 18px;font-weight: 600; margin: 0; text-align: left;'>Transfer Schedule</p>"
					   htmlTags += "<hr style='color: rgba(0, 0, 0, 0.19); border-width: 0; border-style: solid; border-bottom-width: thin; height: 1px;'>"
					   htmlTags += "<div style='display: flex; flex-direction: column;'>"
					   htmlTags += "<div style='display: flex;'>"
					   htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Schedule</p>"
					   htmlTags += "</div>"
					   htmlTags += "<div>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + wireDate + " (One Time)</p>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "<div style='display: flex; justify-content: space-between; margin-top: 25px;'>"
					   htmlTags += "<div style='flex-basis: 48%;'>"
					   htmlTags += "<p style='color: #4f6f90; font-family: Open Sans, Helvetica, sans-serif; font-size: 18px;font-weight: 600; margin: 0; text-align: left;'>Transfer To</p>"
					   htmlTags += "<hr style='color: rgba(0, 0, 0, 0.19); border-width: 0; border-style: solid; border-bottom-width: thin; height: 1px;'>"
					   htmlTags += "<div style='display: flex; flex-direction: column;'>"
					   htmlTags += "<div style='display: flex;'>"
					   htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Beneficiary Name</p>"
					   htmlTags += "</div>"
					   htmlTags += "<div>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + beneficiaryName + "</p>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "<div style='display: flex;'>"
					   htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Beneficiary Account Number</p>"
					   htmlTags += "</div>"
					   htmlTags += "<div>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + beneficiaryAccountNumber + "</p>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "<div style='display: flex;'>"
					   htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>SWIFT</p>"
					   htmlTags += "</div>"
					   htmlTags += "<div>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + swiftOrBIC + "</p>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "<div style='display: flex;'>"
					   htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Beneficiary Address</p>"
					   htmlTags += "</div>"
					   htmlTags += "<div>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; max-width: 325px; margin-top:8px !important'>" + address1 + " " + address2 + " " + address3 + "</p>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "<div style='display: flex;'>"
					   htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Beneficiary Phone</p>"
					   htmlTags += "</div>"
					   htmlTags += "<div>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + phoneNumber + "</p>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "<div style='display: flex;'>"
					   htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Bank Address</p>"
					   htmlTags += "</div>"
					   htmlTags += "<div>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; max-width: 325px; margin-top:8px !important'>" + bankAddress + "</p>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "<div style='display: flex;'>"
					   htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Special Instructions</p>"
					   htmlTags += "</div>"
					   htmlTags += "<div>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + specialInstructions1 + "</p>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + specialInstructions2 + "</p>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + specialInstructions3 + "</p>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "<div style='flex-basis: 48%;'>"
					   htmlTags += "<p style='color: #4f6f90; font-family: Open Sans, Helvetica, sans-serif; font-size: 18px;font-weight: 600; margin: 0; text-align: left;'>Transfer Amount & Additional Information</p>"
					   htmlTags += "<hr style='color: rgba(0, 0, 0, 0.19); border-width: 0; border-style: solid; border-bottom-width: thin; height: 1px;'>"
					   htmlTags += "<div style='display: flex; flex-direction: column;'>"
					   htmlTags += "<div style='display: flex;'>"
					   htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Amount</p>"
					   htmlTags += "</div>"
					   htmlTags += "<div>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>$" + formatAmounts(wireAmount) + " USD</p>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "<div style='display: flex;'>"
					   htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Customer Reference No.</p>"
					   htmlTags += "</div>"
					   htmlTags += "<div>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + customerReferenceNumber + "</p>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "<div style='display: flex;'>"
					   htmlTags += "<div style='flex-basis: calc(46.33% - 10px);'>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>Additional References</p>"
					   htmlTags += "</div>"
					   htmlTags += "<div>"
					   htmlTags += "<p style='font-family: Open Sans, Helvetica, sans-serif; font-size: 14px;font-weight: 600; margin: 0; margin-top:8px !important'>" + customerAdditionalReference + "</p>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "</div>"
					   htmlTags += "<hr style='margin-top: 24px !important; margin: 0; color: rgba(0, 0, 0, 0.19); border-width: 0; border-style: solid; border-bottom-width: thin; height: 1px;'>"
					   htmlTags += "</div>"
					   htmlTags += "</body>"
					   htmlTags += "</html>";
					   type.defaultValue = htmlTags; */


						// transfer Summary

						form.addFieldGroup({
							id: 'payment_transfer_summary',
							label: 'Transfer Summary'
						});

						var summary_amount = form.addField({
							id: 'summaryammount',
							type: serverWidget.FieldType.TEXT,
							label: 'Amount(USD)',
							container: 'payment_transfer_summary'
						});
						//bankaccountid.isMandatory = true;
						/* var intwireAmount = parseInt(wireAmount);
						log.debug("intwireAmount",intwireAmount);
					summary_amount.defaultValue = '$' + intwireAmount.toFixed(2); */
						summary_amount.defaultValue = '$' + formatAmounts(wireAmount);
						summary_amount.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						//var subsidiaryvalue = getSub;
						var sendingfrom = form.addField({
							id: 'sending_from',
							type: serverWidget.FieldType.TEXT,
							label: 'Sending From',

							container: 'payment_transfer_summary'
						});
						sendingfrom.defaultValue = accountNumberFrom;
						sendingfrom.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var sendingto = form.addField({
							id: 'sending_to',
							type: serverWidget.FieldType.TEXT,
							label: 'Sending To',

							container: 'payment_transfer_summary'
						});
						sendingto.defaultValue = beneficiaryAccountNumber;
						sendingto.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						//Transfer From
						form.addFieldGroup({
							id: 'payment_transfer_from',
							label: 'Transfer From'
						});

						var bankaccountno = form.addField({
							id: 'bankaccnumber',
							type: serverWidget.FieldType.TEXT,
							label: 'Account Number',
							container: 'payment_transfer_from'
						});
						//bankaccountid.isMandatory = true;
						bankaccountno.defaultValue = accountNumberFrom;
						bankaccountno.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						//var subsidiaryvalue = getSub;
						var accounttype = form.addField({
							id: 'accounttype',
							type: serverWidget.FieldType.TEXT,
							label: 'Account Type',

							container: 'payment_transfer_from'
						});
						accounttype.defaultValue = accountTypeFrom;
						accounttype.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var current_available = form.addField({
							id: 'currentavialable',
							type: serverWidget.FieldType.TEXT,
							label: 'Current Available(USD)',
							container: 'payment_transfer_from'
						});
						current_available.defaultValue = '$' + formatAmounts(currentAvailabeFrom);
						current_available.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});


						// for transfer to

						form.addFieldGroup({
							id: 'payment_transfer_to',
							label: 'Transfer To'
						});

						var beneficiary_name = form.addField({
							id: 'beneficiaryvaluename',
							type: serverWidget.FieldType.TEXT,
							label: 'Beneficiary Name',
							container: 'payment_transfer_to'
						});
						//bankaccountid.isMandatory = true;
						beneficiary_name.defaultValue = beneficiaryName;
						beneficiary_name.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});
						//var subsidiaryvalue = getSub;
						var Bene_acc_number = form.addField({
							id: 'beneaccnumber',
							type: serverWidget.FieldType.TEXT,
							label: 'Beneficiary Account Number',

							container: 'payment_transfer_to'
						});
						Bene_acc_number.defaultValue = beneficiaryAccountNumber;
						Bene_acc_number.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var bank_routing_no = form.addField({
							id: 'bankroutingnumber',
							type: serverWidget.FieldType.TEXT,
							label: 'SWIFT',
							container: 'payment_transfer_to'
						});
						bank_routing_no.defaultValue = swiftOrBIC;
						bank_routing_no.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var beneficiary_address = form.addField({
							id: 'benefeciaryaddress',
							type: serverWidget.FieldType.TEXT,
							label: 'Beneficiary Address',
							container: 'payment_transfer_to'
						});
						//bankaccountid.isMandatory = true;
						beneficiary_address.defaultValue = address1 + "  " + address2 + "  " + address3
						beneficiary_address.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});
						//var subsidiaryvalue = getSub;
						var beneficiary_phone = form.addField({
							id: 'beneficiaryphone',
							type: serverWidget.FieldType.TEXT,
							label: 'Beneficiary Phone',

							container: 'payment_transfer_to'
						});
						beneficiary_phone.defaultValue = phoneNumber;
						beneficiary_phone.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var bank_address = form.addField({
							id: 'bankaddress',
							type: serverWidget.FieldType.TEXT,
							label: 'Bank Address',
							container: 'payment_transfer_to'
						});
						bank_address.defaultValue = bankAddress;
						bank_address.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});
						var special_instructions = form.addField({
							id: 'specialinstructions',
							type: serverWidget.FieldType.TEXT,
							label: 'Special Instructions',
							container: 'payment_transfer_to'
						});
						special_instructions.defaultValue = specialInstructions1 + "  " + specialInstructions2 + "  " + specialInstructions3;
						special_instructions.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						// for transfer schedule

						form.addFieldGroup({
							id: 'payment_transfer_schedule',
							label: 'Transfer Schedule'
						});

						var schedule = form.addField({
							id: 'schedulevalue',
							type: serverWidget.FieldType.TEXT,
							label: 'Schedule',
							container: 'payment_transfer_schedule'
						});
						//bankaccountid.isMandatory = true;
						schedule.defaultValue = wireDate;
						schedule.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});


						// for Transfer Amount & Additional Information

						form.addFieldGroup({
							id: 'payment_transfer_amt_additional_inf',
							label: 'Transfer Amount & Additional Information'
						});

						var amount = form.addField({
							id: 'amountvalue',
							type: serverWidget.FieldType.TEXT,
							label: 'Amount(USD)',
							container: 'payment_transfer_amt_additional_inf'
						});
						//bankaccountid.isMandatory = true;
						/* var intwireAmount = parseInt(wireAmount);
					  log.debug("intwireAmount",intwireAmount)
					amount.defaultValue = '$'+intwireAmount.toFixed(2); */
						amount.defaultValue = '$' + formatAmounts(wireAmount);
						amount.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});
						var cust_ref_no = form.addField({
							id: 'custrefrencevalue',
							type: serverWidget.FieldType.TEXT,
							label: 'Customer Reference No',
							container: 'payment_transfer_amt_additional_inf'
						});
						//bankaccountid.isMandatory = true;
						cust_ref_no.defaultValue = customerReferenceNumber;
						cust_ref_no.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});

						var additional_ref = form.addField({
							id: 'additionarefvalue',
							type: serverWidget.FieldType.TEXT,
							label: 'Additional References',
							container: 'payment_transfer_amt_additional_inf'
						});
						//bankaccountid.isMandatory = true;
						additional_ref.defaultValue = customerAdditionalReference;
						additional_ref.updateDisplayType({
							displayType: serverWidget.FieldDisplayType.INLINE
						});
						/*  var additional_description = form.addField({
								 id: 'additionaldesvalue',
								 type: serverWidget.FieldType.TEXT,
								 label: 'Additional Description',
								 container: 'payment_transfer_amt_additional_inf'
							 });
							 //bankaccountid.isMandatory = true;
						 additional_description.defaultValue = customerAdditionalDescription;
																	  additional_description.updateDisplayType({
						 displayType: serverWidget.FieldDisplayType.INLINE
					 });  */


					} // Vishal Start Code
					else if (wireType == "INVOICE_PAYMENTS") {
						label = 'Invoice Payment';
						log.debug('INVOICE_PAYMENTS', 'Vishal');
						form = createInvoicePaymentPreview(form, serverWidget, file, url, query, search, log, record, fileId);
						log.debug('filePath 2', filePath);
					} // Vishal End Code
					else {
						label = "Payment"
						var accountNumberFrom = generateMaskedNumber(paramData.accountNumberFrom);
						var accountTypeFrom = paramData.accountTypeFrom;
						var currentAvailabeFrom = paramData.currentAvailabeFrom;
						var paymentList = paramData.paymentList;

						var html = "";
						html += "<html>"
						html += "<body>"
						html += '<style>.uir-outside-fields-table { width: 100%; }</style>';
						html += "<div style='width: 100% !important; display: flex;font-size: 14px;justify-content: space-around;text-align: center;flex-direction: column;border: 1px solid;border-radius: 4px;margin: 10px 0 15px 0;'>"
						html += "<div style='display: flex; text-align:left'>"
						html += "<div style='margin: 10px 10px 0 14px;'>Pay from Account</div>"
						html += "</div>"
						html += "<div style='display: flex;text-align:left'>"
						html += "<div style='width: 10%; margin: 10px 10px 10px 14px; color: #000080;'>" + accountNumberFrom + "</div>"
						html += "<div style='margin: 10px 10px 10px 14px; color: #000080;'>" + accountTypeFrom + "</div>"
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

						var list = form.addSublist({
							id: "custpage_bill_payment_list",
							type: serverWidget.SublistType.LIST,
							label: "Payment Summary"
						});

						var paymentName = list.addField({
							id: "custlist_bill_payee_name",
							type: serverWidget.FieldType.TEXT,
							label: "Payee Name"
						});

						var paymentDate = list.addField({
							id: "custlist_bill_payment_date",
							type: serverWidget.FieldType.TEXT,
							label: "Bill Payment Date"
						});

						var paymentAmount = list.addField({
							id: "custlist_bill_payment_amount",
							type: serverWidget.FieldType.TEXT,
							label: "Payment Amount"
						});

						var memo = list.addField({
							id: "custlist_bill_payment_memo",
							type: serverWidget.FieldType.TEXT,
							label: "Memo"
						});

						for (var i = 0; i < paymentList.length; i++) {
							list.setSublistValue({
								id: "custlist_bill_payee_name",
								line: i,
								value: paymentList[i].payeeName
							});

							list.setSublistValue({
								id: "custlist_bill_payment_date",
								line: i,
								value: paymentList[i].paymentDate
							});

							list.setSublistValue({
								id: "custlist_bill_payment_amount",
								line: i,
								value: "$" + formatAmounts(paymentList[i].paymentAmount)
							});

							list.setSublistValue({
								id: "custlist_bill_payment_memo",
								line: i,
								value: paymentList[i].paymentMemo
							});

						}

					}

					form.addSubmitButton({ id: 'custpage_submit_wire', label: 'Submit ' + label });

					var cancelWire = form.addButton({
						id: 'custpage_cancel_wire',
						label: 'Cancel ' + label,
						functionName: "cancelWire(\'" + wireType + "\'" + "," + fileId + ")"
					});
					var editWire = form.addButton({
						id: 'custpage_edit_wire',
						label: 'Edit ' + label,
						functionName: "editWire(\'" + wireType + "\'" + "," + fileId + ")"
					});

					var styles = form.addField({
						id: 'styles',
						label: ' ',
						type: serverWidget.FieldType.INLINEHTML,
					});

					var stylesScript = '';
					stylesScript += '<script>';
					stylesScript += 'var submit_btn = document.getElementById("tdbody_submitter");';
					stylesScript += 'submit_btn.style.borderRadius = "30px";';
					stylesScript += 'var submit_btn_tr = document.getElementById("tr_submitter");';
					stylesScript += 'submit_btn_tr.style.borderRadius = "30px";';
					stylesScript += 'var cancel_transfer_btn = document.getElementById("tdbody_custpage_cancel_wire");';
					stylesScript += 'cancel_transfer_btn.style.borderRadius = "30px";';
					stylesScript += 'var cancel_transfer_btn_tr = document.getElementById("tr_custpage_cancel_wire");';
					stylesScript += 'cancel_transfer_btn_tr.style.borderRadius = "30px";';
					stylesScript += 'var edit_transfer_btn = document.getElementById("tdbody_custpage_edit_wire");';
					stylesScript += 'edit_transfer_btn.style.borderRadius = "30px";';
					stylesScript += 'var edit_transfer_btn_tr = document.getElementById("tr_custpage_edit_wire");';
					stylesScript += 'edit_transfer_btn_tr.style.borderRadius = "30px";';

					// stylesScript +=	'var submit_btn_bottom = document.getElementById("tdbody_secondarysubmitter");';
					// stylesScript += 'submit_btn_bottom.style.borderRadius = "30px";';          
					// stylesScript +=	'var reset_btn_bottom = document.getElementById("tdbody_secondarycustpage_reset");';
					// stylesScript +=	'reset_btn_bottom.style.borderRadius = "30px";';
					// stylesScript +=	'var reset_btn_tr_bottom = document.getElementById("tr_secondarycustpage_reset");';
					// stylesScript += 'reset_btn_tr_bottom.style.borderRadius = "30px";';
					stylesScript += '</script>';
					styles.defaultValue = stylesScript;

					res.writePage(form);
				}
				else {
					var flag = customModule.getIframeCreds(userId);
					var htmlCheckReg = /<\/?[a-zA-Z][\s\S]*/i; // Umar has updated on 1st Oct 2026 for VA H3 Case 1 issue.
					if (flag == true) {
						var wireFilter = context.request.parameters.custpage_wire_type;
						var fileId = context.request.parameters.custpage_file_id;
						var fileObj = file.load({
							id: fileId
						});
						log.debug('fileId', fileId);
						var paramData = JSON.parse(fileObj.getContents());
						log.debug('paramData', paramData);
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
						// CR: APIGEE 
						APG_ACCESS_TOKEN = sessionResult[0].getValue("custrecord_ci_ns_apg_access_token");
						log.debug('APG_ACCESS_TOKEN: ', APG_ACCESS_TOKEN);
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

						var request;
						var response;
						var randomNumber = Math.floor((Math.random() * 1000000000));

						log.emergency('wireFilter 2210', wireFilter)
						if (wireFilter == "INTERNAL_TRANSFERS") {
							var accountNumberFrom = paramData.accountNumberFrom;
							var encyAccountNumberFrom = paramData.encyAccountNumberFrom;
							var accountTypeFrom = paramData.accountTypeFrom;
							var currentAvailabeFrom = paramData.currentAvailabeFrom;
							var accountNumberTo = paramData.accountNumberTo;
							var encyAccountNumberTo = paramData.encyAccountNumberTo;
							var accountTypeTo = paramData.accountTypeTo;
							var currentAvailabeTo = paramData.currentAvailabeTo;
							var amountToBeSent = paramData.amountToBeSent;
							var transferDate = paramData.scheduledDate;
							var transactionDescription = paramData.transactionDescription;
							request = {
								"metadata": {
									"userCode": usrCode,
									"businessCodeList": [busiCode],
									"softwareName": softwareName,
									"softwareVersion": softwareVersion,
									"vendorId": VENDOR_ID
								},
								"payType": "INT",
								"transferIdentifier": "Nam_" + randomNumber,
								"businessCode": busiCode,
								"setupBy": usrCode,
								"paymentStartDate": transferDate,
								"paymentEndDate": transferDate,
								"destAcctNbr": encyAccountNumberTo,
								"transferAmount": Number(amountToBeSent),
								"sourceAccountNum": encyAccountNumberFrom,
								"srcCurrency": "USD",
								"destAcctType": accountTypeTo,
								"transactionDescription": transactionDescription,
								"addDescrStatements": transactionDescription,
								"srcAcctBalance": 0.00,
								"destAcctBalance": 0.00,
								"paymentFrequency": 1,
								"intlCheckInd": "N",
								"paymentRecurDay": "00",
								"paymentSchedule": "ONE",
								"numOfPayments": 1
							};
							log.debug("request1653", request);
							if (htmlCheckReg.test(transactionDescription)) { isInvalidContent = true; } // Umar has updated for VA H3 Case 1 issue on 1st Oct 2026.
						}
						else if (wireFilter == "DOMESTIC_WIRES") {
							var accountNumberFrom = paramData.accountNumberFrom;
							var encyAccountNumberFrom = paramData.encyAccountNumberFrom;
							var accountTypeFrom = paramData.accountTypeFrom;
							var currentAvailabeFrom = paramData.currentAvailabeFrom;
							var beneficiaryName = paramData.beneficiaryName;
							var beneficiaryAccountNumber = paramData.beneficiaryAccountNumber;
							var phoneNumber = paramData.phoneNumber;
							var address1 = paramData.address1;
							var address2 = paramData.address2;
							var address3 = paramData.address3;
							var wireDate = paramData.scheduledDate;
							var wireAmount = paramData.wireAmount;
							var customerReferenceNumber = paramData.customerReferenceNumber;
							var customerAdditionalReference = paramData.customerAdditionalReference;
							var customerAdditionalDescription = paramData.customerAdditionalDescription;
							var routingCode = paramData.routingCode;
							var routingCodeType = paramData.routingCodeType;
							var intermediatoryBankFlag = paramData.intermediatoryBankFlag;
							var bankName = paramData.financialInstitutionName;
							var state = paramData.state;
							var bankAddress = paramData.bankAddress;
							var destBankName = paramData.destBankName;
							var destBankAddr = paramData.destBankAddr;
							var destBankState = paramData.destBankState;
							var destBankCity = paramData.destBankCity;
							var ofiIndicator = paramData.ofiIndicator;
							request = {
								"metadata": {
									"userCode": usrCode,
									"businessCodeList": [busiCode],
									"softwareName": softwareName,
									"softwareVersion": softwareVersion,
									"vendorId": VENDOR_ID
								},
								"payType": "DOM",
								"transferIdentifier": "Nam_" + randomNumber,
								"businessCode": busiCode,
								"setupBy": usrCode,
								"paymentStartDate": wireDate,
								"paymentEndDate": wireDate,
								"transferAmount": Number(wireAmount),
								"sourceAccountNum": encyAccountNumberFrom,
								"beneName": beneficiaryName,
								"benePhone": phoneNumber,
								"beneAddr1": address1,
								"beneAddr2": address2,
								"beneAddr3": address3,
								"customerReferenceNbr": customerReferenceNumber,
								"transactionDescription": customerAdditionalDescription,
								"addDescrStatements": customerAdditionalDescription,
								"additionalReference": customerAdditionalReference,
								"srcCurrency": "USD",
								"paymentFrequency": 0,
								"intlCheckInd": "N",
								"ofiIndicator": ofiIndicator,
								"routingCode": routingCode,
								"routingCodeType": routingCodeType,
								"destAcctNbr": beneficiaryAccountNumber,
								"destCountryCode": "US",
								"destBankName": destBankName,
								"destBankAddr": destBankAddr,
								"destBankState": destBankState
							}
							log.debug("request1719", request);
							if (intermediatoryBankFlag) {
								request["intermediateBank"] = {};
								request["intermediateBank"].intmBankABA = routingCode;
								request["intermediateBank"].intmBankAdress = bankAddress;
								request["intermediateBank"].intmBankState = state;
								request["intermediateBank"].intmBankName = bankName;
								request.destBankCity = destBankCity;
							}
							log.debug('request123', request);

							if (htmlCheckReg.test(beneficiaryName) || htmlCheckReg.test(phoneNumber) || htmlCheckReg.test(address1) || htmlCheckReg.test(address2) || htmlCheckReg.test(address3) /* || htmlCheckReg.test(specialInstructions1) || htmlCheckReg.test(specialInstructions2) || htmlCheckReg.test(specialInstructions3) */ || htmlCheckReg.test(customerReferenceNumber) || htmlCheckReg.test(customerAdditionalReference) || htmlCheckReg.test(customerAdditionalDescription) /* || htmlCheckReg.test(bankAddress) */) { isInvalidContent = true; } // Umar has updated for VA H3 Case 1 issue on 1st Oct 2026.
						}
						else if (wireFilter == "REAL_TIME_PAYMENTS") {//rutuja start
							log.emergency('paramData realtime payment', paramData)
							var accountNumberFrom = paramData.accountNumberFrom;
							var encyAccountNumberFrom = paramData.encyAccountNumberFrom;
							var accountTypeFrom = paramData.accountTypeFrom;
							var currentAvailabeFrom = paramData.currentAvailabeFrom;
							var beneficiaryName = paramData.beneficiaryName;
							var beneficiaryAccountNumber = paramData.beneficiaryAccountNumber;
							var phoneNumber = paramData.phoneNumber;
							// var address1 = paramData.address1;
							// var address2 = paramData.address2;
							// var address3 = paramData.address3;
							var wireDate = paramData.scheduledDate;
							var wireAmount = paramData.wireAmount;
							// var customerReferenceNumber = paramData.customerReferenceNumber;
							// var customerAdditionalReference = paramData.customerAdditionalReference;
							var customerAdditionalDescription = paramData.customerAdditionalDescription;
							var routingCode = paramData.routingCode;
							var routingCodeType = paramData.routingCodeType;
							// var intermediatoryBankFlag = paramData.intermediatoryBankFlag;
							// var bankName = paramData.financialInstitutionName;
							// var state = paramData.state;
							// var bankAddress = paramData.bankAddress;
							// var destBankName = paramData.destBankName;
							// var destBankAddr = paramData.destBankAddr;
							// var destBankState = paramData.destBankState;
							// var destBankCity = paramData.destBankCity;
							// var ofiIndicator = paramData.ofiIndicator;

							var dateObj = new Date(format.parse({
								value: wireDate,
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
							wireDate = year + '-' + formattedMonth + '-' + formattedDay;

							request = {
								"metadata": {
									"userCode": usrCode,
									"businessCodeList": [busiCode],
									"softwareName": softwareName,
									"softwareVersion": softwareVersion,
									"vendorId": VENDOR_ID
								},
								"payType": "RTP",
								"transferIdentifier": "Nam_" + randomNumber,
								"businessCode": busiCode,
								"setupBy": usrCode,
								"paymentStartDate": wireDate,
								"paymentEndDate": wireDate,
								"transferAmount": Number(wireAmount),
								"creditor": {

									"bankAccount": {
										"accountNumber": beneficiaryAccountNumber,
										"routingNumber": routingCode
									},
									"fullname": beneficiaryName

								},
								"debtor": {

									"bankAccount": {
										"accountNumber": encyAccountNumberFrom
									},

								}
							}
							log.debug("request1719", request);
							// if (intermediatoryBankFlag) {
							// 	request["intermediateBank"] = {};
							// 	request["intermediateBank"].intmBankABA = routingCode;
							// 	request["intermediateBank"].intmBankAdress = bankAddress;
							// 	request["intermediateBank"].intmBankState = state;
							// 	request["intermediateBank"].intmBankName = bankName;
							// 	request.destBankCity = destBankCity;
							// }
							// log.debug('request123', request);
						} //rutuja end
						else if (wireFilter == "FOREIGN_WIRES") {
							var accountNumberFrom = paramData.accountNumberFrom;
							var encyAccountNumberFrom = paramData.encyAccountNumberFrom;
							var wireDate = paramData.scheduledDate;
							var wireAmount = paramData.wireAmount;
							var customerReferenceNumber = paramData.customerReferenceNumber;
							var customerAdditionalReference = paramData.customerAdditionalReference;
							var customerAdditionalDescription = paramData.customerAdditionalDescription;
							var beneficiaryName = paramData.beneficiaryName;
							var beneficiaryAccountNumber = paramData.beneficiaryAccountNumber;
							var address1 = paramData.address1;
							var address2 = paramData.address2;
							var address3 = paramData.address3;
							var phoneNumber = paramData.phoneNumber;
							var destinationCountry = paramData.destinationCountry;
							var destBankCity = paramData.destBankCity;
							var destBankAddr = paramData.destBankAddr;
							var destBankName = paramData.destBankName;
							var purposeCode = paramData.purposeCode;
							var subPurpCode = paramData.subPurpCode;
							var routingCode = paramData.routingCode;
							var routingCodeType = paramData.routingCodeType;
							log.debug("destBankAddr1746", destBankAddr);
							destBankAddr = destBankAddr.replace(/^,/, '');
							log.debug("destBankAddr1747", destBankAddr);
							request = {
								"metadata": {
									"userCode": usrCode,
									"businessCodeList": [busiCode],
									"softwareName": softwareName,
									"softwareVersion": softwareVersion,
									"vendorId": VENDOR_ID
								},
								"payType": "FOR",
								"transferIdentifier": "Nam_" + randomNumber,
								"routingCode": routingCode,
								"routingCodeType": routingCodeType,
								"businessCode": busiCode,
								"setupBy": usrCode,
								"paymentStartDate": wireDate,
								"paymentEndDate": wireDate,
								"transferAmount": Number(wireAmount),
								"sourceAccountNum": encyAccountNumberFrom,
								"beneName": beneficiaryName,
								"benePhone": phoneNumber,
								"beneAddr1": address1,
								"beneAddr2": address2,
								"beneAddr3": address3,
								"customerReferenceNbr": customerReferenceNumber,
								"addDescrStatements": customerAdditionalDescription,
								"additionalReference": customerAdditionalReference,
								"srcCurrency": "USD",
								"paymentFrequency": 0,
								"intlCheckInd": "N",
								"destAcctNbr": beneficiaryAccountNumber,
								"destBankCity": destBankCity,
								"destBankAddr": destBankAddr,
								"destBankName": destBankName,
								"destCountryCode": destinationCountry,
								"ofiIndicator": "N"
							}
							log.debug("request1778", request);

							if (request.destBankAddr !== null && request.destBankAddr.length > 35) {
								request.destBankAddr = request.destBankAddr.substring(0, Math.min(request.destBankAddr.length, 35)).replace(/,$/, '');
							}
							if (purposeCode != "") {
								request["purpCode"] = purposeCode;
							}
							if (subPurpCode != "") {
								request["subPurpCode"] = subPurpCode;
							}

							if (htmlCheckReg.test(destBankCity) || htmlCheckReg.test(destBankAddr) || htmlCheckReg.test(destBankName) || htmlCheckReg.test(beneficiaryName) || htmlCheckReg.test(phoneNumber) || htmlCheckReg.test(address1) || htmlCheckReg.test(address2) || htmlCheckReg.test(address3) /* || htmlCheckReg.test(specialInstructions1) || htmlCheckReg.test(specialInstructions2) || htmlCheckReg.test(specialInstructions3) */ || htmlCheckReg.test(customerReferenceNumber) || htmlCheckReg.test(customerAdditionalReference) || htmlCheckReg.test(customerAdditionalDescription)) { isInvalidContent = true; }// Umar has updated for VA H3 Case 1 issue on 1st Oct 2026.

						} else if (wireFilter == "BILL_PAYMENTS") {
							var accountNumberFrom = paramData.accountNumberFrom;
							var accountTypeFrom = paramData.accountTypeFrom;
							var currentAvailabeFrom = paramData.currentAvailabeFrom;
							var encyAccountNumberFrom = paramData.encyAccountNumberFrom;
							var paymentList = paramData.paymentList;

							request = [];
							for (var i = 0; i < paymentList.length; i++) {
								randomNumber = Math.floor((Math.random() * 1000000000));
								var req = {
									"metadata": {
										"userCode": usrCode,
										"businessCodeList": [busiCode],
										"softwareName": softwareName,
										"softwareVersion": softwareVersion,
										"vendorId": "00002"
									},
									"payType": "BPI",
									"transferIdentifier": "Nam_" + randomNumber,
									"businessCode": busiCode,
									"setupBy": usrCode,
									"transferAmount": Number(paymentList[i].paymentAmount),
									"specialInstructionsLine1": paymentList[i].paymentMemo == null ? "" : paymentList[i].paymentMemo,
									"sourceAccountNum": encyAccountNumberFrom,
									"paymentSchedule": "ONE",
									"paymentStartDate": paymentList[i].paymentDate,
									"paymentFrequency": 0,
									"paymentEndDate": paymentList[i].paymentDate,
									"numOfPayments": 1,
									"onDemandStopInd": "N",
									"intlCheckInd": "N",
									"srcCurrency": "USD",
									"destCurrency": "USD",
									"isBillPay": "true",
									"beneName": paymentList[i].payeeName
								}

								request.push(req);
							}
						}
						if (wireFilter == "BILL_PAYMENTS") {
							log.debug("request.length", request.length)
							for (var i = 0; i < request.length; i++) {
								var res = getResponseFromAPI(PAYMENT_API, pubKey, accsTkn, pvtKey, request[i]);
								res = JSON.parse(res);
								if (res && res.code == 500) {
									savePushLogs(sessionuserId, PAYMENT_API, "CitiIntegrator NS SS Payment Review", request[i], res, "");

									var form = serverWidget.createForm({
										title: "Payment Initiation Review",
									});
									form.clientScriptModulePath = "../Client/CitiIntegrator NS CS Payment Initiation_review.js";

									var fileObj = file.load({
										id: '../Client/CitiIntegrator NS CS Payment Initiation_review.js'
									});
									var filePath = fileObj.path;

									var errorIcon = file.load({
										id: '../Images/error-icon.png'
									});
									var errorIconPath = errorIcon.url;

									var html = form.addField({
										id: "custpage_error_message",
										type: serverWidget.FieldType.INLINEHTML,
										label: "Message"
									});

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
									script += "<p style='font-size: 15px; font-weight: bold;'>Payment Initiation Review</p>"
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
								} else {
									var status = "";
									var fileObj = file.load({
										id: fileId
									});
									var fileName = fileObj.name;
									var paramData = JSON.parse(fileObj.getContents());
									if (res.transferStatus == "SUBMITTED") {
										status = "SUBMITTED";
									} else {
										status = "FAILED";
										paramData.paymentList[i].status = res.responseDetails.moreInfo != "" ? res.responseDetails.moreInfo : "Invalid Request";
									}
									paramData.paymentList[i].transferStatus = status;

									var newDate = new Date();
									var folderSearchObj = search.create({
										type: "folder",
										filters:
											[
												["name", "is", "Payment Review"]
											],
										columns:
											[
												search.createColumn({ name: "internalid", label: "Internal ID" })
											]
									});
									var folderSearchObj = folderSearchObj.run();
									var folderResult = folderSearchObj.getRange({
										start: 0,
										end: 1
									});
									var internalid = folderResult[0].getValue("internalid");
									var fileObj = file.create({
										name: fileName,
										fileType: file.Type.JSON,
										contents: JSON.stringify(paramData),
										description: 'This is a JSON file.',
										encoding: file.Encoding.UTF8,
										folder: internalid,
										isOnline: true
									});
									fileId = fileObj.save();
								}
							}

							var params = {
								"fileId": fileId
							};

							redirect.toSuitelet({
								scriptId: 'customscript_citiintegrator_ns_ss_paycof',
								deploymentId: 'customdeploy_citiintegrator_ns_ss_paycof',
								parameters: params
							});
						}
						else {
							log.debug('PAYMENT_API', PAYMENT_API);
							log.debug('pubKey', pubKey);
							log.debug('accsTkn', accsTkn);
							log.debug('pvtKey', pvtKey);
							log.debug('request', request);
							response = getResponseFromAPI(PAYMENT_API, pubKey, accsTkn, pvtKey, request);
							log.debug("response1966", response);
							response = JSON.parse(response);
							if (response && response.code == 500) {
								savePushLogs(sessionuserId, PAYMENT_API, "CitiIntegrator NS SS Payment Review", request, response, "");

								var form = serverWidget.createForm({
									title: "Payment Initiation Review",
								});
								form.clientScriptModulePath = "../Client/CitiIntegrator NS CS Payment Review.js";

								var fileObj = file.load({
									id: '../Client/CitiIntegrator NS CS Payment Review.js'
								});
								var filePath = fileObj.path;

								var errorIcon = file.load({
									id: '../Images/error-icon.png'
								});
								var errorIconPath = errorIcon.url;

								var html = form.addField({
									id: "custpage_error_message",
									type: serverWidget.FieldType.INLINEHTML,
									label: "Message"
								});

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
								script += "<p style='font-size: 15px; font-weight: bold;'>Payment Initiation Review</p>"
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
							} else {
								var status = "";
								if (response.transferStatus == "SUBMITTED") {
									status = "SUBMITTED";
								} else {
									status = "FAILED";
									var fileObj = file.load({
										id: fileId
									});
									var fileName = fileObj.name;
									var paramData = JSON.parse(fileObj.getContents());
									paramData.status = response.responseDetails.moreInfo != "" ? response.responseDetails.moreInfo : "Invalid Request";

									var newDate = new Date();
									var dateString = newDate.toISOString();
									var folderSearchObj = search.create({
										type: "folder",
										filters:
											[
												["name", "is", "Payment Review"]
											],
										columns:
											[
												search.createColumn({ name: "internalid", label: "Internal ID" })
											]
									});
									var folderSearchObj = folderSearchObj.run();
									var folderResult = folderSearchObj.getRange({
										start: 0,
										end: 1
									});
									var internalid = folderResult[0].getValue("internalid");
									var fileObj = file.create({
										name: fileName,
										fileType: file.Type.JSON,
										contents: JSON.stringify(paramData),
										description: 'This is a JSON file.',
										encoding: file.Encoding.UTF8,
										folder: internalid,
										isOnline: true
									});
									fileId = fileObj.save();
								}

								var params = {
									"fileId": fileId,
									"transferStatus": status
								};
								redirect.toSuitelet({
									scriptId: 'customscript_citiintegrator_ns_ss_paycof',
									deploymentId: 'customdeploy_citiintegrator_ns_ss_paycof',
									parameters: params
								});
							}
						}
						//START - Umar has update for handling invalid content scenario (VA H3 Case 1)
						log.debug('Invalid Content Detected', isInvalidContent);
						if (isInvalidContent) {
							var tokensSearchObj = customModule.getUserSession(userId);

							var tokensSearchObj = tokensSearchObj.run();
							var sessionResult = tokensSearchObj.getRange({
								start: 0,
								end: 1
							});
							var sessionuserId = sessionResult[0].id;
							var busiCode = sessionResult[0].getValue("custrecord_citiintegrator_ns_buscode");
						//	savePushLogs(sessionuserId, "", "CitiIntegrator NS SS Payment Review", "", "", exception);

							var form = serverWidget.createForm({
								title: "Payment Initiation Review",
							});
							form.clientScriptModulePath = "../Client/CitiIntegrator NS CS Payment Review.js";

							var fileObj = file.load({
								id: '../Client/CitiIntegrator NS CS Payment Review.js'
							});
							var filePath = fileObj.path;

							var businessCodeFlag = form.addField({
								id: 'custpage_overlap_titel1',
								type: serverWidget.FieldType.INLINEHTML,
								label: "Business Code1"
							});
							var businessCodeEnc = busiCode.substring(busiCode.length - 4, busiCode.length)
							// Vishal Code change for Report and Submit Home Button.
							businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>function home() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; var container = jQuery(".uir-page-title"); var newDiv = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:25px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 80px; top:25px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv1);</script></div>';
							// Vishal Code change for Report and Submit Home Button.

							var html = form.addField({
								id: "custpage_error_message1",
								type: serverWidget.FieldType.INLINEHTML,
								label: "Message1"
							});

							var errorIcon = file.load({
								id: '../Images/error-icon.png'
							});
							var errorIconPath = errorIcon.url;

							var htmlTags = "";
							htmlTags += "<span>"
							htmlTags += "<img style='height: 75px;margin-top: 5%;margin-left: 47%;' src=" + errorIconPath + "></img>"
							htmlTags += "</span>"
							htmlTags += "<p style='font-size: 20px; text-align: center; margin-top: 20px; font-weight: bold'>Some form fields contain invalid values</p>"
							html.defaultValue = htmlTags;
							context.response.writePage(form);
							return false;
						}
						//END - Umar has update for handling invalid content scenario (VA H3 Case 1)
					}
					else {
						redirect.toSuitelet({
							scriptId: 'customscript_citiintegrator_ns_ss_logpge',
							deploymentId: 'customdeploy_citiintegrator_ns_ss_logpge'
						});
					}
					res.writePage(form);
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
				savePushLogs(sessionuserId, "", "CitiIntegrator NS SS Payment Review", "", "", exception);

				var form = serverWidget.createForm({
					title: "Payment Initiation Review",
				});
				form.clientScriptModulePath = "../Client/CitiIntegrator NS CS Payment Review.js";

				var fileObj = file.load({
					id: '../Client/CitiIntegrator NS CS Payment Review.js'
				});
				var filePath = fileObj.path;

				var businessCodeFlag = form.addField({
					id: 'custpage_overlap_titel',
					type: serverWidget.FieldType.INLINEHTML,
					label: "Business Code"
				});
				var businessCodeEnc = busiCode.substring(busiCode.length - 4, busiCode.length)
				// Vishal Code change for Report and Submit Home Button.
				businessCodeFlag.defaultValue = '<div style="font-weight:bold"><script>function home() { debugger; var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.home();}) }; function logOut() { var rConfig = JSON.parse(\'{}\') ;rConfig[\'context\'] = \'/\' + "' + filePath + '";var entryPointRequire = require.config(rConfig); entryPointRequire([\'/\' + "' + filePath + '"], function(custommodule){custommodule.switchUser(' + sessionuserId + ');}) }; var container = jQuery(".uir-page-title"); var newDiv = jQuery("<div><a style=\'background-color: #e4e4e4; position: absolute; right: 0; top:25px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'logOut()\'>Log Out</a></div>"); container.prepend(newDiv); var newDiv1 = jQuery("<div><a id= \'homeButton\' style=\'background-color: #e4e4e4; position: absolute; right: 80px; top:25px; font-weight: 600; padding-block: 1px; padding-inline: 6px; border: solid rgb(201, 201, 201) 1px; padding: 4px 8px; height: 18px !important; box-sizing: content-box; border-radius: 30px; color: rgb(48, 48, 48); cursor: pointer; font-size: 13px !important;\' onclick=\'home()\'>Home</a></div>"); container.prepend(newDiv1);</script></div>';
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
				script += "<p style='font-size: 15px; font-weight: bold;'>Payment Initiation Review</p>"
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

		function generateMaskedNumber(accountNumber) {
			if (!accountNumber) {
				return "";
			}
			var fullNumber = String(accountNumber);
			var parts = fullNumber.match(/(\D+)(\d+)/);
			var maskedString = "";
			if (parts) {
				var firstPart = parts[1];
				var secondPart = parts[2];

				var maskedPart = "";
				for (var i = 0; i < firstPart.length; i++) {
					maskedPart = maskedPart + "*";
				}

				maskedString = maskedPart + secondPart;
			}
			return maskedString;
		}

		function convertMaskedNumber(accountNumber) {
			if (!accountNumber) {
				return "";
			} else if (accountNumber.length < 5) {
				return accountNumber;
			}
			var fullNumber = String(accountNumber);
			var maskedString = "";
			if (fullNumber) {
				var secondPart = fullNumber.slice(-4);

				var maskedPart = "********";
				maskedString = maskedPart + secondPart;
			}
			return maskedString;
		}

		function getResponseFromAPI(url, PublicKey, AccessToken, PrivateKey, request) {
			var response = customModule.sendRequest(url, PublicKey, AccessToken, PrivateKey, request, null, APG_ACCESS_TOKEN);
			return response;
		}

		function formatAmounts(amount) {
			return parseFloat(amount).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
		}



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

// Vishal Create Invoice Preview Page.
function createInvoicePaymentPreview(form, serverWidget, file, url, query, searchModule, logModule, recordModule, jsonFileID) {
	configRecDet = getCUAConfig(query, logModule);
	logModule.debug({
		title: 'configRecDet',
		details: JSON.stringify(configRecDet)
	})
	var fileContentStr = '';
	var form = serverWidget.createForm({
		title: 'Bill Payment Processing Preview',
		hideNavBar: false
	});
	var TransSubtab = form.addSubtab({
		id: 'custpage_trans_tabid',
		label: 'Selected Transactions'
	});
	var classSubtab = form.addSubtab({
		id: 'custpage_classify_tabid',
		label: 'Classification'
	});
	var fileObj = file.load({
		id: jsonFileID
	});
	if (fileObj) {
		fileContentStr = fileObj.getContents();
	}
	if (fileContentStr) {
		var paymentProcessContent = JSON.parse(fileContentStr);
	}
	logModule.debug({
		title: 'fileContentStr',
		details: fileContentStr
	});
	// form.addSubmitButton({ label: 'Submit' });
	var suiteletURL = url.resolveScript({
		scriptId: 'customscript_citiintegrator_ns_ss_payini',
		deploymentId: 'customdeploy_citiintegrator_ns_ss_payini',
		params: {
			'wireFilter': 'INVOICE_PAYMENTS',
			'fileId': jsonFileID
		}
	});
	// var cancelButton = form.addButton({ id: 'custpage_cancel_btn', label: 'Cancel', functionName: '(function loadBillPayment(){window.open("' + suiteletURL + '", "_self", false);})' });
	//form.clientScriptModulePath = './xor_pay_bill_pay_process_CLI.js';
	form.addFieldGroup({
		id: 'filterid',
		label: 'Filters'
	});
	form.addFieldGroup({
		id: 'classificationid',
		label: 'Classification'
	});
	form.addFieldGroup({
		id: 'payinfoid',
		label: 'Payment Information'
	});
	// Add the fields in Bill payment processing
	var bankaccountid = form.addField({
		id: 'bankaccountid',
		type: serverWidget.FieldType.SELECT,
		label: 'Bank Account',
		source: 'customrecord_xor_pay_bank_details_sdf',
		container: 'filterid'
	});
	bankaccountid.defaultValue = paymentProcessContent.bankaccountid;
	var apaccountid = form.addField({
		id: 'apaccountid',
		type: serverWidget.FieldType.SELECT,
		label: 'A/P Account',
		source: 'account',
		container: 'filterid'
	});
	apaccountid.defaultValue = paymentProcessContent.apaccountid;
	var fromdateField = form.addField({
		id: 'custpage_due_date_from',
		type: serverWidget.FieldType.DATE,
		label: 'From Due Date',
		container: 'filterid'
	});
	fromdateField.defaultValue = paymentProcessContent.custpage_due_date_from;
	var todateField = form.addField({
		id: 'custpage_due_date_to',
		type: serverWidget.FieldType.DATE,
		label: 'To Due Date',
		container: 'filterid'
	});
	todateField.defaultValue = paymentProcessContent.custpage_due_date_to;
	var vendorField = form.addField({
		id: 'vendorid',
		type: serverWidget.FieldType.MULTISELECT,
		label: 'Vendor',
		source: 'vendor',
		container: 'filterid'
	});
	vendorField.defaultValue = paymentProcessContent.vendorid;
	var subsidiaryField = form.addField({
		id: 'subsidiaryid',
		type: serverWidget.FieldType.SELECT,
		label: 'Subsidiary',
		source: 'subsidiary',
		container: 'filterid'
	});
	subsidiaryField.defaultValue = paymentProcessContent.subsidiaryid;
	//subsidiaryField.isMandatory = true
	// Classification fields
	var classField = form.addField({
		id: 'classid',
		type: serverWidget.FieldType.SELECT,
		label: 'Class',
		source: 'classification',
		container: 'custpage_classify_tabid'
	});
	classField.defaultValue = paymentProcessContent.classid;
	var departmentField = form.addField({
		id: 'departmentid',
		type: serverWidget.FieldType.SELECT,
		label: 'Department',
		source: 'department',
		container: 'custpage_classify_tabid'
	});
	departmentField.defaultValue = paymentProcessContent.departmentid;
	var locationField = form.addField({
		id: 'locationid',
		type: serverWidget.FieldType.SELECT,
		label: 'Location',
		source: 'location',
		container: 'custpage_classify_tabid'
	});
	locationField.defaultValue = paymentProcessContent.locationid;
	// Payment Info Fields
	var noofTransaction = form.addField({
		id: 'custpage_no_of_transaction',
		type: serverWidget.FieldType.TEXT,
		label: 'Number of Transaction',
		container: 'payinfoid'
	});
	//noofTransaction.isMandatory = true;
	noofTransaction.defaultValue = paymentProcessContent.custpage_no_of_transaction;
	var dateField = form.addField({
		id: 'custpage_process_date',
		type: serverWidget.FieldType.DATE,
		label: 'Date to be Processed',
		container: 'payinfoid'
	});
	dateField.defaultValue = paymentProcessContent.custpage_process_date;
	var paymentdateField = form.addField({
		id: 'custpage_payment_date',
		type: serverWidget.FieldType.DATE,
		label: 'Payment Date/Value Date',
		container: 'payinfoid'
	});
	paymentdateField.defaultValue = paymentProcessContent.custpage_payment_date;
	var totalAmount = form.addField({
		id: 'custpage_total_amt',
		type: serverWidget.FieldType.TEXT,
		label: 'Total Payment Amount',
		container: 'payinfoid'
	});
	totalAmount.defaultValue = paymentProcessContent.custpage_total_amt;
	var totalCreditAmount = form.addField({
		id: 'custpage_total_credit_amt',
		type: serverWidget.FieldType.TEXT,
		label: 'Total Credit Amount',
		container: 'payinfoid'
	});
	totalCreditAmount.defaultValue = paymentProcessContent.custpage_total_credit_amt;
	var profileName = form.addField({
		id: 'profilenameid',
		type: serverWidget.FieldType.SELECT,
		label: 'Payment Profile Name',
		source: 'customrecord_xor_pay_pros_prfle_sdf',
		container: 'filterid'
	});
	profileName.defaultValue = paymentProcessContent.profilenameid;
	var emailNotification = form.addField({
		id: 'emailnotificationid',
		type: serverWidget.FieldType.CHECKBOX,
		label: 'Enable email notification',
		container: 'payinfoid'
	});
	emailNotification.defaultValue = paymentProcessContent.emailnotificationid;
	var selectedTransDet = form.addField({
		id: 'transactiondetid',
		type: serverWidget.FieldType.LONGTEXT,
		label: 'Trans Det',
		container: 'payinfoid'
	});
	selectedTransDet.defaultValue = paymentProcessContent.transactiondetid;
	var selectedTransDet2 = form.addField({
		id: 'transactiondet2id',
		type: serverWidget.FieldType.LONGTEXT,
		label: 'Trans Det 2',
		container: 'payinfoid'
	});
	selectedTransDet2.defaultValue = paymentProcessContent.transactiondet2id;
	var selectedTransDet3 = form.addField({
		id: 'transactiondet3id',
		type: serverWidget.FieldType.LONGTEXT,
		label: 'Trans Det 3',
		container: 'payinfoid'
	});
	selectedTransDet3.defaultValue = paymentProcessContent.transactiondet3id;
	var selectedTransDet4 = form.addField({
		id: 'transactiondet4id',
		type: serverWidget.FieldType.LONGTEXT,
		label: 'Trans Det 4',
		container: 'payinfoid'
	});
	selectedTransDet4.defaultValue = paymentProcessContent.transactiondet4id;
	var selectedTransDet5 = form.addField({
		id: 'transactiondet5id',
		type: serverWidget.FieldType.LONGTEXT,
		label: 'Trans Det 5',
		container: 'payinfoid'
	});
	selectedTransDet5.defaultValue = paymentProcessContent.transactiondet5id;
	var selectedBillID = form.addField({
		id: 'selectedbillid',
		type: serverWidget.FieldType.LONGTEXT,
		label: 'Selected Bill ID',
		container: 'payinfoid'
	});
	selectedBillID.defaultValue = paymentProcessContent.selectedbillid;
	var BillPaymentDetFileID = form.addField({
		id: 'custpage_jsonfileid',
		type: serverWidget.FieldType.TEXT,
		label: 'JSON Page ID',
		container: 'payinfoid'
	});
	BillPaymentDetFileID.defaultValue = jsonFileID;
	bankaccountid.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.ENTRY
	});
	bankaccountid.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	apaccountid.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	fromdateField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	todateField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	vendorField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	subsidiaryField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	classField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	departmentField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	locationField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	dateField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	if (configRecDet[0].custrecord_xor_pay_future_payment == 'T') {
		paymentdateField.updateDisplayType({
			displayType: serverWidget.FieldDisplayType.INLINE
		});
	} else {
		paymentdateField.updateDisplayType({
			displayType: serverWidget.FieldDisplayType.HIDDEN
		});
	}
	profileName.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	emailNotification.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	selectedTransDet.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.HIDDEN
	});
	selectedTransDet2.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.HIDDEN
	});
	selectedTransDet3.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.HIDDEN
	});
	selectedTransDet4.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.HIDDEN
	});
	selectedTransDet5.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.HIDDEN
	});
	selectedBillID.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.HIDDEN
	});
	BillPaymentDetFileID.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.HIDDEN
	});
	noofTransaction.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	totalAmount.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	totalCreditAmount.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	if (paymentProcessContent.selectedbillid) {
		form = createSublist(form, serverWidget, searchModule, paymentProcessContent.selectedbillid, paymentProcessContent.transactiondetid, paymentProcessContent.transactiondet2id, paymentProcessContent.transactiondet3id, paymentProcessContent.transactiondet4id, paymentProcessContent.transactiondet5id, configRecDet, logModule, recordModule);
	}
	return form;
}
/******** Transaction Details sublist creation start***************/
function createSublist(form, serverWidget, searchModule, getSelectedBillID, tranDet, tranDet2, tranDet3, tranDet4, tranDet5, configRecDet, logModule, recordModule) {
	var receiptSublist = form.addSublist({
		id: 'transactionlist',
		type: serverWidget.SublistType.STATICLIST,
		label: 'Select Transactions',
		tab: 'custpage_trans_tabid'
	});
	/*receiptSublist.addButton({
		   id : 'custpage_markallid',
		   label : 'Mark All',
		   functionName : 'markAll()'
	   });
	   receiptSublist.addButton({
		   id : 'custpage_unmarkallid',
		   label : 'UnMark All',
		   functionName : 'unMarkAll()'
	   });*/
	/*receiptSublist.addField({
		id: 'pay',
		type: serverWidget.FieldType.CHECKBOX,
		label: 'Pay'
	});*/
	var payeeField = receiptSublist.addField({
		id: 'payeeid',
		type: serverWidget.FieldType.SELECT,
		label: 'Payee',
		source: 'vendor'
	});
	var typeField = receiptSublist.addField({
		id: 'typeid',
		type: serverWidget.FieldType.TEXT,
		label: 'Type'
	});
	var billNofield = receiptSublist.addField({
		id: 'billno',
		type: serverWidget.FieldType.SELECT,
		label: 'Bill #',
		source: 'transaction'
	});
	var dateField = receiptSublist.addField({
		id: 'dateid',
		type: serverWidget.FieldType.DATE,
		label: 'Date'
	});
	var duedateField = receiptSublist.addField({
		id: 'duedateid',
		type: serverWidget.FieldType.DATE,
		label: 'Due Date'
	});
	var amtField = receiptSublist.addField({
		id: 'amtid',
		type: serverWidget.FieldType.CURRENCY,
		label: 'Amount'
	});
	var discAmtField = receiptSublist.addField({
		id: 'discamtid',
		type: serverWidget.FieldType.CURRENCY,
		label: 'Total Discount'
	});
	var taxAmtField = receiptSublist.addField({
		id: 'taxamtid',
		type: serverWidget.FieldType.CURRENCY,
		label: 'Total Tax Amt'
	});
	var amtRemainField = receiptSublist.addField({
		id: 'amtremaining',
		type: serverWidget.FieldType.CURRENCY,
		label: 'Amount Remaining'
	});
	var paymentField = receiptSublist.addField({
		id: 'payamt',
		type: serverWidget.FieldType.CURRENCY,
		label: 'Payment'
	});
	var currency = receiptSublist.addField({
		id: 'currencyid',
		type: serverWidget.FieldType.TEXT,
		label: 'Currency'
	});
	var paymentMethodinLineField = receiptSublist.addField({
		id: 'paymentmethodinlineid',
		type: serverWidget.FieldType.SELECT,
		label: 'Payment Profile Name',
		source: 'customrecord_xor_pay_pros_prfle_sdf'
	});
	//paymentField.isMandatory = true;
	var discAvailField = receiptSublist.addField({
		id: 'discavail',
		type: serverWidget.FieldType.CURRENCY,
		label: 'Disc Avail'
	});
	var discTakenField = receiptSublist.addField({
		id: 'disctaken',
		type: serverWidget.FieldType.CURRENCY,
		label: 'Disc Taken'
	});
	var billWHTAmount = receiptSublist.addField({
		id: 'whtamtid',
		type: serverWidget.FieldType.CURRENCY,
		label: 'WHT Amt'
	});
	var refNoField = receiptSublist.addField({
		id: 'refno',
		type: serverWidget.FieldType.TEXT,
		label: 'Reference Number'
	});
	var billCommField = receiptSublist.addField({
		id: 'billcomment',
		type: serverWidget.FieldType.TEXT,
		label: 'Bill Comment'
	});
	var poNumField = receiptSublist.addField({
		id: 'ponum',
		type: serverWidget.FieldType.TEXT,
		label: 'PO Number'
	});
	var apAccount = receiptSublist.addField({
		id: 'apaccountid',
		type: serverWidget.FieldType.SELECT,
		label: 'AP Account',
		source: 'account'
	});
	var billlocation = receiptSublist.addField({
		id: 'locationid',
		type: serverWidget.FieldType.SELECT,
		label: 'Location',
		source: 'location'
	});
	var billSubsidiary = receiptSublist.addField({
		id: 'subsidiaryid',
		type: serverWidget.FieldType.SELECT,
		label: 'Subsidiary',
		source: 'subsidiary'
	});
	var currencyID = receiptSublist.addField({
		id: 'currencyvalue',
		type: serverWidget.FieldType.SELECT,
		label: 'Currency Name',
		source: 'currency'
	});
	var termID = receiptSublist.addField({
		id: 'termid',
		type: serverWidget.FieldType.SELECT,
		label: 'Terms',
		source: 'term'
	});
	var discountPercent = receiptSublist.addField({
		id: 'discountpercentage',
		type: serverWidget.FieldType.TEXT,
		label: 'Disc %'
	});
	var discountDate = receiptSublist.addField({
		id: 'discountdateid',
		type: serverWidget.FieldType.DATE,
		label: 'Disc Date'
	});
	var contractIDField = receiptSublist.addField({
		id: 'fxcontractid',
		type: serverWidget.FieldType.TEXT,
		label: 'FX Contract',
	});
	if (configRecDet.length != 0) {
		if (configRecDet[0].custrecord_xor_pay_cua_fxcontract_enable == 'T') {
			contractIDField.updateDisplayType({
				displayType: serverWidget.FieldDisplayType.INLINE
			});
		} else {
			contractIDField.updateDisplayType({
				displayType: serverWidget.FieldDisplayType.HIDDEN
			});
		}
	}
	payeeField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	typeField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	billNofield.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	refNoField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	dateField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	duedateField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	amtField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	discAmtField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	taxAmtField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	billWHTAmount.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	amtRemainField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	discAvailField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	discTakenField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	paymentField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	billCommField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	poNumField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	currency.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	apAccount.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	billlocation.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	billSubsidiary.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.HIDDEN
	});
	currencyID.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.HIDDEN
	});
	termID.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.HIDDEN
	});
	discountPercent.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.HIDDEN
	});
	discountDate.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.HIDDEN
	});
	paymentMethodinLineField.updateDisplayType({
		displayType: serverWidget.FieldDisplayType.INLINE
	});
	setSublistvalue(receiptSublist, searchModule, getSelectedBillID, tranDet, tranDet2, tranDet3, tranDet4, tranDet5, logModule, recordModule);
	return form;
}
/******** Transaction Details sublist creation end*************/
/******** Auto populate receipt details based on criteria start**************/
function setSublistvalue(sublist, searchModule, getSelectedBillID, tranDet, tranDet2, tranDet3, tranDet4, tranDet5, logModule, recordModule) {
	var filterInv = new Array();
	var jsonData = [];
	var checkBillID = [];
	var JSONParseTransUpt2 = [];
	var JSONParseTransUpt3 = [];
	var JSONParseTransUpt4 = [];
	var JsonParseTransUpt = [];
	var TransUpt1 = [];
	var TransUpt2 = [];
	var TransUpt3 = [];
	var TransUpt4 = [];
	var TransUpt5 = [];
	if (tranDet) TransUpt1 = JSON.parse(tranDet);
	if (tranDet2) TransUpt2 = JSON.parse(tranDet2);
	if (tranDet3) TransUpt3 = JSON.parse(tranDet3);
	if (tranDet4) TransUpt4 = JSON.parse(tranDet4);
	if (tranDet5) TransUpt5 = JSON.parse(tranDet5);
	if (TransUpt1.length != 0 && TransUpt2.length != 0) JSONParseTransUpt2 = TransUpt2.concat(TransUpt1);
	if (TransUpt1.length != 0 && TransUpt2.length == 0) JSONParseTransUpt2 = TransUpt1;
	if (TransUpt1.length == 0 && TransUpt2.length != 0) JSONParseTransUpt2 = TransUpt2;
	if (TransUpt3.length != 0 && TransUpt4.length != 0) JSONParseTransUpt3 = TransUpt4.concat(TransUpt3);
	if (TransUpt3.length != 0 && TransUpt4.length == 0) JSONParseTransUpt3 = TransUpt3;
	if (TransUpt3.length == 0 && TransUpt4.length != 0) JSONParseTransUpt3 = TransUpt4;
	if (JSONParseTransUpt2.length != 0 && JSONParseTransUpt3.length != 0) JSONParseTransUpt4 = JSONParseTransUpt3.concat(JSONParseTransUpt2);
	if (JSONParseTransUpt2.length != 0 && JSONParseTransUpt3.length == 0) JSONParseTransUpt4 = JSONParseTransUpt2;
	if (JSONParseTransUpt2.length == 0 && JSONParseTransUpt3.length != 0) JSONParseTransUpt4 = JSONParseTransUpt3;
	if (JSONParseTransUpt4.length != 0 && TransUpt5.length != 0) JsonParseTransUpt = TransUpt5.concat(JSONParseTransUpt4);
	if (JSONParseTransUpt4.length != 0 && TransUpt5.length == 0) JsonParseTransUpt = JSONParseTransUpt4;
	if (JSONParseTransUpt4.length == 0 && TransUpt5.length != 0) JsonParseTransUpt = TransUpt5;
	//var selectedStr='';
	if (getSelectedBillID) {
		jsonData = JSON.parse(getSelectedBillID);
		//if(jsonData.length != 0)
		//selectedStr=jsonData.toString();
	}
	if (getSelectedBillID && jsonData.length != 0) {
		filterInv.push(searchModule.createFilter({
			name: "internalid",
			operator: searchModule.Operator.ANYOF,
			values: jsonData
			//values: [86047]
		}));
	}
	filterInv.push(searchModule.createFilter({
		name: "mainline",
		operator: searchModule.Operator.IS,
		values: ["T"]
	}));
	filterInv.push(searchModule.createFilter({
		name: "type",
		operator: searchModule.Operator.ANYOF,
		values: ["VendBill", "VendCred"]
	}));
	filterInv.push(searchModule.createFilter({
		name: "status",
		operator: searchModule.Operator.NONEOF,
		values: ["VendBill:B", "VendBill:D", "VendBill:E", "VendBill:F", "VendBill:C"]
	}));
	filterInv.push(searchModule.createFilter({
		name: "custentity_xor_pay_bill_payment_sdf",
		join: "vendor",
		operator: searchModule.Operator.IS,
		values: ["T"]
	}));
	filterInv.push(searchModule.createFilter({
		name: "amountremaining",
		operator: searchModule.Operator.NOTEQUALTO,
		values: ["0.00"]
	}));
	filterInv.push(searchModule.createFilter({
		name: "paymenthold",
		operator: searchModule.Operator.IS,
		values: ["F"]
	}));
	var columnInv = new Array();
	columnInv.push(searchModule.createColumn({
		"name": "entity",
		"label": "Name",
		"type": "select",
		// "sortdir": "ASC"
		"sort": searchModule.Sort.ASC
	}));
	columnInv.push(searchModule.createColumn({
		"name": "type",
		"label": "Type",
		"type": "select",
		"sortdir": "NONE"
	}));
	columnInv.push(searchModule.createColumn({
		"name": "tranid",
		"label": "Document Number",
		"type": "text",
		"sortdir": "NONE"
	}));
	columnInv.push(searchModule.createColumn({
		"name": "trandate",
		"label": "Date",
		"type": "date",
		"sortdir": "NONE"
	}));
	columnInv.push(searchModule.createColumn({
		"name": "duedate",
		"label": "Due Date/Receive By",
		"type": "date",
		"sortdir": "NONE"
	}));
	columnInv.push(searchModule.createColumn({
		"name": "fxamount",
		"label": "Amount (Foreign Currency)",
		"type": "currency",
		"sortdir": "NONE"
	}));
	columnInv.push(searchModule.createColumn({
		"name": "termsdiscountamount",
		"label": "Terms Discount Amount",
		"type": "currency",
		"sortdir": "NONE"
	}));
	columnInv.push(searchModule.createColumn({
		"name": "fxamountremaining",
		"label": "Amount Remaining (Foreign Currency)",
		"type": "currency",
		"sortdir": "NONE"
	}));
	columnInv.push(searchModule.createColumn({
		"name": "custbody_xor_pay_total_tax_amount_sdf",
		"label": "Total Tax Amt",
		"type": "currency",
		"sortdir": "NONE"
	}));
	columnInv.push(searchModule.createColumn({
		"name": "memo",
		"label": "Memo",
		"type": "text",
		"sortdir": "NONE"
	}));
	columnInv.push(searchModule.createColumn({
		"name": "tranid",
		"join": "createdfrom"
	}));
	columnInv.push(searchModule.createColumn({
		"name": "symbol",
		"join": "currency"
	}));
	columnInv.push(searchModule.createColumn({
		"name": "account"
	}));
	columnInv.push(searchModule.createColumn({
		"name": "subsidiary"
	}));
	columnInv.push(searchModule.createColumn({
		"name": "currency"
	}));
	columnInv.push(searchModule.createColumn({
		"name": "custbody_xor_pay_wht_total_amt_sdf"
	}));
	try {
		columnInv.push(searchModule.createColumn({
			"name": "location"
		}));
	} catch (err) {
		logModule.debug({
			title: 'Location err',
			details: err
		});
	}
	columnInv.push(searchModule.createColumn({
		"name": "custentity_xor_pay_vendor_pmt_mtd_sdf",
		"join": "vendor"
	}));
	try {
		columnInv.push(searchModule.createColumn({
			"name": "terms"
		}));
		columnInv.push(searchModule.createColumn({
			"name": "termsdiscountdate"
		}));
	} catch (termerr) {
		log.debug({
			title: 'err-Term',
			details: termerr
		})
	}
	var receiptSearch = searchModule.create({
		type: "transaction",
		filters: filterInv,
		columns: columnInv
	}).run();
	var receiptResult = receiptSearch.getRange({
		start: 0,
		end: 1000
	});
	logModule.debug({
		title: 'receiptResult',
		details: receiptResult
	});
	for (var loop = 0; loop < receiptResult.length; loop++) {
		var billID = receiptResult[loop].id;
		sublist.setSublistValue({
			id: 'billno',
			line: loop,
			value: receiptResult[loop].id
		});
		checkBillID = findBillIDDet(JsonParseTransUpt, 'billid', receiptResult[loop].id);
		logModule.debug({
			title: 'checkBillID',
			details: JSON.stringify(checkBillID)
		})
		var entity = receiptResult[loop].getValue({
			name: 'entity'
		});
		if (entity) {
			sublist.setSublistValue({
				id: 'payeeid',
				line: loop,
				value: entity
			});
		}
		var type = receiptResult[loop].getValue({
			name: 'type'
		});
		if (type == 'VendBill') {
			sublist.setSublistValue({
				id: 'typeid',
				line: loop,
				value: 'Bill'
			});
		}
		if (type == 'VendCred') {
			sublist.setSublistValue({
				id: 'typeid',
				line: loop,
				value: 'Bill Credit'
			});
		}
		var tranid = receiptResult[loop].getValue({
			name: 'tranid'
		});
		if (tranid) {
			sublist.setSublistValue({
				id: 'refno',
				line: loop,
				value: tranid
			});
		}
		var trandate = receiptResult[loop].getValue({
			name: 'trandate'
		});
		if (trandate) {
			sublist.setSublistValue({
				id: 'dateid',
				line: loop,
				value: trandate
			});
		}
		var duedate = receiptResult[loop].getValue({
			name: 'duedate'
		});
		if (duedate) {
			sublist.setSublistValue({
				id: 'duedateid',
				line: loop,
				value: duedate
			});
		}
		var fxamount = receiptResult[loop].getValue({
			name: 'fxamount'
		});
		if (fxamount) {
			sublist.setSublistValue({
				id: 'amtid',
				line: loop,
				value: fxamount
			});
		}
		var discountAmt = receiptResult[loop].getValue({
			name: 'termsdiscountamount'
		});
		if (discountAmt) {
			sublist.setSublistValue({
				id: 'discamtid',
				line: loop,
				value: discountAmt
			});
		}
		var taxamount = receiptResult[loop].getValue({
			name: 'custbody_xor_pay_total_tax_amount_sdf'
		});
		if (taxamount) {
			sublist.setSublistValue({
				id: 'taxamtid',
				line: loop,
				value: taxamount
			});
		}
		var fxamountremaining = receiptResult[loop].getValue({
			name: 'fxamountremaining'
		});
		if (type == 'VendCred') {
			var amtDueVal = -(fxamountremaining)
			if (fxamountremaining != 0) {
				sublist.setSublistValue({
					id: 'amtremaining',
					line: loop,
					value: amtDueVal
				});
			}
		} else {
			if (fxamountremaining) {
				sublist.setSublistValue({
					id: 'amtremaining',
					line: loop,
					value: fxamountremaining
				});
			}
		}
		var discountAmtAvail = ''
		if (discountAmtAvail) {
			sublist.setSublistValue({
				id: 'discavail',
				line: loop,
				value: discountAmtAvail
			});
		}
		var discountAmtTaken = '';
		if (checkBillID[0].disctaken) {
			sublist.setSublistValue({
				id: 'disctaken',
				line: loop,
				value: Number(checkBillID[0].disctaken)
			});
		}
		if (fxamountremaining != 0 && type == 'VendBill') {
			sublist.setSublistValue({
				id: 'payamt',
				line: loop,
				value: checkBillID[0].paymentAmtToApply
			});
			sublist.setSublistValue({
				id: 'payappliedamt',
				line: loop,
				value: checkBillID[0].paymentAmtToApply
			});
		} else if (fxamountremaining != 0 && type == 'VendCred') {
			var creditAmountValue = -Number(checkBillID[0].paymentAmtToApply);
			sublist.setSublistValue({
				id: 'payamt',
				line: loop,
				value: checkBillID[0].paymentAmtToApply
			});
		}
		var billmemo = receiptResult[loop].getValue({
			name: 'memo'
		});
		billmemo = billmemo.substring(0, 250);
		if (billmemo) {
			sublist.setSublistValue({
				id: 'billcomment',
				line: loop,
				value: billmemo
			});
		}
		var billponum = receiptResult[loop].getValue({
			name: 'tranid',
			join: 'createdfrom'
		});
		if (billponum) {
			sublist.setSublistValue({
				id: 'ponum',
				line: loop,
				value: billponum
			});
		}
		var currency = receiptResult[loop].getValue({
			name: 'symbol',
			join: 'currency'
		});
		if (currency) {
			sublist.setSublistValue({
				id: 'currencyid',
				line: loop,
				value: currency
			});
		}
		sublist.setSublistValue({
			id: 'creditamt',
			line: loop,
			value: 0
		});
		var apaccount = receiptResult[loop].getValue({
			name: 'account'
		});
		if (apaccount) {
			sublist.setSublistValue({
				id: 'apaccountid',
				line: loop,
				value: apaccount
			});
		}
		try {
			var billlocation = receiptResult[loop].getValue({
				name: 'location'
			});
			if (billlocation) {
				sublist.setSublistValue({
					id: 'locationid',
					line: loop,
					value: billlocation
				});
			}
		} catch (err) {
			logModule.debug({
				title: 'Location err',
				details: err
			});
		}
		var billsubsidiary = receiptResult[loop].getValue({
			name: 'subsidiary'
		});
		if (billsubsidiary) {
			sublist.setSublistValue({
				id: 'subsidiaryid',
				line: loop,
				value: billsubsidiary
			});
		}
		// currencyvalue
		var billcurrency = receiptResult[loop].getValue({
			name: 'currency'
		});
		if (billcurrency) {
			sublist.setSublistValue({
				id: 'currencyvalue',
				line: loop,
				value: billcurrency
			});
		}
		var profileNameValue = receiptResult[loop].getValue({
			name: 'custentity_xor_pay_vendor_pmt_mtd_sdf',
			join: 'vendor'
		});
		logModule.debug({
			title: 'profileNameValue',
			details: profileNameValue
		});
		if (checkBillID[0].profileid) {
			sublist.setSublistValue({
				id: 'paymentmethodinlineid',
				line: loop,
				value: checkBillID[0].profileid
			});
		}
		if (checkBillID[0].contractid) {
			sublist.setSublistValue({
				id: 'fxcontractid',
				line: loop,
				value: checkBillID[0].contractid
			});
		}
		// get Term ID
		try {
			var billterm = receiptResult[loop].getValue({
				name: 'terms'
			});
			if (billterm) {
				sublist.setSublistValue({
					id: 'termid',
					line: loop,
					value: billterm
				});
			}
			var billtermdate = receiptResult[loop].getValue({
				name: 'termsdiscountdate'
			});
			if (billtermdate) {
				sublist.setSublistValue({
					id: 'discountdateid',
					line: loop,
					value: billtermdate
				});
			} else if (!billtermdate) {
				/*sublist.setSublistValue({ id: 'discountdateid', line: loop, value: "" });*/
			}
			if (billterm) {
				var billTermDetails = searchModule.lookupFields({
					type: 'term',
					id: billterm,
					columns: ['discountpercent', 'internalid', 'name']
				});

				if (billTermDetails['discountpercent']) {
					sublist.setSublistValue({
						id: 'discountpercentage',
						line: loop,
						value: billTermDetails['discountpercent']
					});
				} else if (!billTermDetails['discountpercent']) {
					sublist.setSublistValue({ id: 'discountpercentage', line: loop, value: "0" });
				}
			}
		} catch (searchtermerr) {
			log.debug({
				title: 'err-Search Term',
				details: searchtermerr
			})
		}
		// Get Term details end
		var WHTAmount = receiptResult[loop].getValue({
			name: 'custbody_xor_pay_wht_total_amt_sdf'
		});
		if (WHTAmount) {
			sublist.setSublistValue({
				id: 'whtamtid',
				line: loop,
				value: WHTAmount
			});
		}
	} // for loop end
	var numLines = sublist.lineCount;
	log.debug({
		title: 'numLines',
		details: numLines
	});
}

function findBillIDDet(array, property, value) {
	var newArray = [];
	array.forEach(function (result, index) {
		if (result[property] === value) {
			newArray.push(array[index]);
		}
	});
	return newArray;
}

function getCUAConfig(query, log) {
	try {
		var recDetails = [];
		var recQuery = "SELECT * FROM customrecord_xor_pay_config WHERE isinactive='F'";
		// Run the SuiteQL query
		var recQueryResults = query.runSuiteQL({
			query: recQuery
		});
		var Response = {
			resultSuiteQL: recQueryResults.asMappedResults()
		};
		recDetails = Response.resultSuiteQL;
		return recDetails;
	} catch (err) {
		log.debug({
			title: 'getCUAConfig Error',
			details: err
		});
	}
}

function arrayFilter(arr, obj) {
	// destructure the properties from each object
	var transaction = arr.filter(function (t) {
		if (t.duedate && obj.duedate && !t.contractid && !obj.contractid) return (t.vendor === obj.vendor && t.duedate === obj.duedate && t.currency === obj.currency && t.apaccount === obj.apaccount && t.profileid === obj.profileid);
		else if (!t.duedate && !obj.duedate && t.contractid && obj.contractid) return (t.vendor === obj.vendor && t.contractid === obj.contractid && t.currency === obj.currency && t.apaccount === obj.apaccount && t.profileid === obj.profileid);
		else if (t.duedate && obj.duedate && t.contractid && obj.contractid) return (t.vendor === obj.vendor && t.duedate === obj.duedate && t.contractid === obj.contractid && t.currency === obj.currency && t.apaccount === obj.apaccount && t.profileid === obj.profileid);
		else return (t.vendor === obj.vendor && t.currency === obj.currency && t.apaccount === obj.apaccount && t.profileid === obj.profileid);
	});
	// check to see if a transaction with the same vendor,duedate,subsidiary exists
	if (transaction.length != 0) {
		transaction[0].billDetails.push({
			'vendor': obj.vendor,
			'totalTaxAmt': '',
			'billcurrency': obj.billcurrency,
			'billid': obj.billid,
			'type': obj.type,
			'payment': obj.paymentAmtToApply,
			'billcom': obj.billcom,
			'date': obj.date,
			'duedate': obj.duedate,
			'disctaken': obj.disctaken,
			'remamount': obj.remamount,
			'invamount': obj.invamount,
			'taxamount': obj.taxamount,
			'docNo': obj.docNo,
			'subsidiary': obj.subsidiary,
			'creditAmt': obj.paymentAmtToApply,
			'location': obj.location,
			'appliedCreditAmount': Number(0),
			'appliedPaymentAmount': Number(0),
			'appliedCreditID': '',
			'paymentid': '',
			'isPayment': '0',
			'apaccount': obj.apaccount,
			'profileid': obj.profileid,
			'contractid': obj.contractid
		});
		if (transaction[0].type == 'Bill' && obj.type == 'Bill') {
			transaction[0].billcom = transaction[0].billcom + "|" + obj.billcom;
			transaction[0].approvedAmt = (Number(transaction[0].approvedAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
			transaction[0].totalPaymentAmt = (Number(transaction[0].totalPaymentAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
			transaction[0].totalTaxAmt = (Number(transaction[0].totalTaxAmt) + Number(obj.taxamount)).toFixed(2);
		}
		if (transaction[0].type == 'Bill' && obj.type == 'Bill Credit') {
			transaction[0].totalCreditAmt = (Number(transaction[0].totalCreditAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
		}
		if (transaction[0].type == 'Bill Credit' && obj.type == 'Bill') {
			if (transaction[0].billcom) transaction[0].billcom = transaction[0].billcom + "|" + obj.billcom;
			transaction[0].totalPaymentAmt = (Number(transaction[0].totalPaymentAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
			transaction[0].approvedAmt = (Number(transaction[0].approvedAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
			transaction[0].totalTaxAmt = (Number(transaction[0].totalTaxAmt) + Number(obj.taxamount)).toFixed(2);
		}
		if (transaction[0].type == 'Bill Credit' && obj.type == 'Bill Credit') {
			transaction[0].totalCreditAmt = (Number(transaction[0].totalCreditAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
		}
	}
	// if a transaction exists, add this entry
	else {
		if (obj.type == 'Bill') {
			arr.push({
				'vendor': obj.vendor,
				'type': obj.type,
				'duedate': obj.duedate,
				'contractid': obj.contractid,
				'currency': obj.currency,
				'apaccount': obj.apaccount,
				'profileid': obj.profileid,
				'profilecode': '',
				'billcom': obj.billcom,
				'subsidiary': obj.subsidiary,
				'billcurrency': obj.billcurrency,
				'approvedAmt': obj.paymentAmtToApply,
				'totalPaymentAmt': obj.paymentAmtToApply,
				'totalTaxAmt': obj.taxamount,
				'location': obj.location,
				'totalCreditAmt': Number(0),
				'paymentid': '',
				'isPayment': '0',
				'isCredit': '0',
				'billDetails': [{
					'vendor': obj.vendor,
					'totalTaxAmt': '',
					'billcurrency': obj.billcurrency,
					'billid': obj.billid,
					'type': obj.type,
					'payment': obj.paymentAmtToApply,
					'billcom': obj.billcom,
					'date': obj.date,
					'duedate': obj.duedate,
					'disctaken': obj.disctaken,
					'remamount': obj.remamount,
					'invamount': obj.invamount,
					'taxamount': obj.taxamount,
					'docNo': obj.docNo,
					'subsidiary': obj.subsidiary,
					'creditAmt': Number(0),
					'location': obj.location,
					'appliedCreditAmount': Number(0),
					'appliedPaymentAmount': Number(0),
					'appliedCreditID': '',
					'paymentid': '',
					'isPayment': '0',
					'apaccount': obj.apaccount,
					'profileid': obj.profileid,
					'contractid': obj.contractid
				}]
			});
		} else if (obj.type == 'Bill Credit') {
			arr.push({
				'vendor': obj.vendor,
				'type': obj.type,
				'duedate': obj.duedate,
				'contractid': obj.contractid,
				'currency': obj.currency,
				'apaccount': obj.apaccount,
				'profileid': obj.profileid,
				'profilecode': '',
				'billcom': obj.billcom,
				'subsidiary': obj.subsidiary,
				'billcurrency': obj.billcurrency,
				'approvedAmt': '0',
				'totalPaymentAmt': '0',
				'totalTaxAmt': '0',
				'location': obj.location,
				'totalCreditAmt': obj.paymentAmtToApply,
				'paymentid': '',
				'isPayment': '0',
				'isCredit': '0',
				'billDetails': [{
					'vendor': obj.vendor,
					'totalTaxAmt': '',
					'billcurrency': obj.billcurrency,
					'billid': obj.billid,
					'type': obj.type,
					'payment': obj.paymentAmtToApply,
					'billcom': obj.billcom,
					'date': obj.date,
					'duedate': obj.duedate,
					'disctaken': obj.disctaken,
					'remamount': obj.remamount,
					'invamount': obj.invamount,
					'taxamount': obj.taxamount,
					'docNo': obj.docNo,
					'subsidiary': obj.subsidiary,
					'creditAmt': obj.paymentAmtToApply,
					'location': obj.location,
					'appliedCreditAmount': Number(0),
					'appliedPaymentAmount': Number(0),
					'appliedCreditID': '',
					'paymentid': '',
					'isPayment': '0',
					'apaccount': obj.apaccount,
					'profileid': obj.profileid,
					'contractid': obj.contractid
				}]
			});
		}
	}
	// otherwise, create a new transaction entry
	return arr;
}

function createPFIWithApproval(record, getApproverDet, JsonStringVal, noOfTrans, parameters, file, format, log) {
	try {
		log.debug({
			title: 'JsonStringValFunc1',
			details: JsonStringVal
		})
		// Payment file information record creation
		var payFileinfo = record.create({
			type: 'customrecord_xor_pay_pymt_file_info_sdf',
			isDynamic: true
		});
		//var getTodaysDate=new Date();
		if (parameters.custpage_payment_date) {
			var formattedPaymentDate = format.parse({
				value: parameters.custpage_payment_date,
				type: format.Type.DATE
			});
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_pmt_date',
				value: formattedPaymentDate,
				ignoreFieldChange: true
			});
		}
		if (parameters.custpage_process_date) {
			var formattedDate = format.parse({
				value: parameters.custpage_process_date,
				type: format.Type.DATE
			});
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_file_process_date_sdf',
				value: formattedDate,
				ignoreFieldChange: true
			});
		}
		if (parameters.apaccountid) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_file_account_sdf',
				value: parameters.apaccountid,
				ignoreFieldChange: true
			});
		}
		if (noOfTrans) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_apy_no_of_trans_sdf',
				value: noOfTrans,
				ignoreFieldChange: true
			});
		}
		/* if (parameters.custpage_note) {
			 payFileinfo.setValue({
				 fieldId: 'custrecord_xor_pay_pfi_ref_note',
				 value: parameters.custpage_note,
				 ignoreFieldChange: true
			 });
		 }*/
		if (parameters.bankaccountid) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_pfi_bank_acct_sdf',
				value: parameters.bankaccountid,
				ignoreFieldChange: false
			});
		}
		if (getApproverDet) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_appr_det_obj',
				value: JSON.stringify(getApproverDet),
				ignoreFieldChange: false
			});
		}
		if (parameters.custpage_total_amt) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_file_process_amt_sdf',
				value: parameters.custpage_total_amt,
				ignoreFieldChange: true
			});
		}
		if (parameters.subsidiaryid) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_file_subsidiary_sdf',
				value: parameters.subsidiaryid,
				ignoreFieldChange: true
			});
		}
		if (parameters.locationid) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_file_location_sdf',
				value: parameters.locationid,
				ignoreFieldChange: true
			});
		}
		if (parameters.departmentid) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_file_department_sdf',
				value: parameters.departmentid,
				ignoreFieldChange: true
			});
		}
		if (parameters.classid) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_file_class_sdf',
				value: parameters.classid,
				ignoreFieldChange: true
			});
		}
		log.debug({
			title: 'parameters.emailnotificationid',
			details: parameters.emailnotificationid
		});
		if (parameters.emailnotificationid == 'F') {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_pfi_email_notify_sdf',
				value: false,
				ignoreFieldChange: true
			});
		} else if (parameters.emailnotificationid == 'T') {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_pfi_email_notify_sdf',
				value: true,
				ignoreFieldChange: true
			});
		}
		payFileinfo.setValue({
			fieldId: 'custrecord_xor_pay_cua_approval_enabled',
			value: true,
			ignoreFieldChange: true
		});
		if (JsonStringVal) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_json_string_sdf',
				value: JsonStringVal,
				ignoreFieldChange: true
			});
		}
		if (getApproverDet.length != 0) {
			var currentApprover = [];
			var level1Approver = getApproverDet[0].firstapprover;
			var level2Approver = getApproverDet[0].secondapprover;
			var L1Apprarr = [];
			var L2Apprarr = [];
			if (level1Approver) L1Apprarr = level1Approver.split(',');
			if (level2Approver) L2Apprarr = level2Approver.split(',');
			if (getApproverDet[0].firstapprover || getApproverDet[0].secondapprover) currentApprover = (getApproverDet[0].firstapprover) ? (L1Apprarr) : (L2Apprarr);
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_cua_level1_approver',
				value: L1Apprarr,
				ignoreFieldChange: true
			});
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_cua_level2_approver',
				value: L2Apprarr,
				ignoreFieldChange: true
			});
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_cua_islevel1_approved',
				value: false,
				ignoreFieldChange: true
			});
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_cua_islevel2_approved',
				value: false,
				ignoreFieldChange: true
			});
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_cua_current_approver',
				value: currentApprover,
				ignoreFieldChange: true
			});
			if (getApproverDet[0].firstapprover || getApproverDet[0].secondapprover) {
				payFileinfo.setValue({
					fieldId: 'custrecord_xor_pay_pfi_batch_status',
					value: 1,
					ignoreFieldChange: true
				});
			}
			if (!getApproverDet[0].firstapprover && !getApproverDet[0].secondapprover) {
				payFileinfo.setValue({
					fieldId: 'custrecord_xor_pay_pfi_batch_status',
					value: 4,
					ignoreFieldChange: true
				});
			}
		}
		if (parameters.selectedbillid) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_cua_selected_billid',
				value: parameters.selectedbillid,
				ignoreFieldChange: true
			});
		}
		var recordId = payFileinfo.save({
			enableSourcing: true,
			ignoreMandatoryFields: true
		});
		log.audit({
			title: 'Payment Information file Record created successfully'
		});
		if (recordId) {
			var deletedFileID = file.delete({
				id: parameters.custpage_jsonfileid
			});
			log.debug({
				title: 'deletedFileID',
				details: deletedFileID
			});
		}
		return recordId;
	} //try end
	catch (err) {
		log.debug({
			title: 'createPFIWithApproval Error',
			details: err
		})
	}
}

function createPFIRecord(record, JsonStringVal, noOfTrans, parameters, file, format, log) {
	try {
		log.debug({
			title: 'JsonStringValFunc2',
			details: JsonStringVal
		})
		// Payment file information record creation
		var payFileinfo = record.create({
			type: 'customrecord_xor_pay_pymt_file_info_sdf',
			isDynamic: true
		});
		//var getTodaysDate=new Date();
		if (parameters.custpage_payment_date) {
			var formattedPaymentDate = format.parse({
				value: parameters.custpage_payment_date,
				type: format.Type.DATE
			});
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_pmt_date',
				value: formattedPaymentDate,
				ignoreFieldChange: true
			});
		}
		if (parameters.custpage_process_date) {
			var formattedDate = format.parse({
				value: parameters.custpage_process_date,
				type: format.Type.DATE
			});
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_file_process_date_sdf',
				value: formattedDate,
				ignoreFieldChange: true
			});
		}
		if (parameters.apaccountid) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_file_account_sdf',
				value: parameters.apaccountid,
				ignoreFieldChange: true
			});
		}
		/* if (parameters.custpage_note) {
			 payFileinfo.setValue({
				 fieldId: 'custrecord_xor_pay_pfi_ref_note',
				 value: parameters.custpage_note,
				 ignoreFieldChange: true
			 });
		 }*/
		if (parameters.bankaccountid) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_pfi_bank_acct_sdf',
				value: parameters.bankaccountid,
				ignoreFieldChange: false
			});
		}
		if (noOfTrans) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_apy_no_of_trans_sdf',
				value: noOfTrans,
				ignoreFieldChange: true
			});
		}
		if (parameters.custpage_total_amt) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_file_process_amt_sdf',
				value: parameters.custpage_total_amt,
				ignoreFieldChange: true
			});
		}
		if (parameters.subsidiaryid) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_file_subsidiary_sdf',
				value: parameters.subsidiaryid,
				ignoreFieldChange: true
			});
		}
		if (parameters.locationid) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_file_location_sdf',
				value: parameters.locationid,
				ignoreFieldChange: true
			});
		}
		if (parameters.departmentid) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_file_department_sdf',
				value: parameters.departmentid,
				ignoreFieldChange: true
			});
		}
		if (parameters.classid) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_file_class_sdf',
				value: parameters.classid,
				ignoreFieldChange: true
			});
		}
		log.debug({
			title: 'parameters.emailnotificationid',
			details: parameters.emailnotificationid
		});
		if (parameters.emailnotificationid == 'F') {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_pfi_email_notify_sdf',
				value: false,
				ignoreFieldChange: true
			});
		} else if (parameters.emailnotificationid == 'T') {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_pfi_email_notify_sdf',
				value: true,
				ignoreFieldChange: true
			});
		}
		if (JsonStringVal) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_json_string_sdf',
				value: JsonStringVal,
				ignoreFieldChange: true
			});
		} else {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_json_string_sdf',
				value: '',
				ignoreFieldChange: true
			});
		}
		payFileinfo.setValue({
			fieldId: 'custrecord_xor_pay_pfi_batch_status',
			value: 4,
			ignoreFieldChange: true
		});
		if (parameters.selectedbillid) {
			payFileinfo.setValue({
				fieldId: 'custrecord_xor_pay_cua_selected_billid',
				value: parameters.selectedbillid,
				ignoreFieldChange: true
			});
		}
		var recordId = payFileinfo.save({
			enableSourcing: true,
			ignoreMandatoryFields: true
		});
		log.audit({
			title: 'Payment Information file Record created successfully'
		});
		if (recordId) {
			var deletedFileID = file.delete({
				id: parameters.custpage_jsonfileid
			});
			log.debug({
				title: 'deletedFileID',
				details: deletedFileID
			});
		}
		return recordId;
	} //try end
	catch (err) {
		log.debug({
			title: 'createPFIRecord Error',
			details: err
		})
	}
}

function getCUAApprovalRoutingDetails(cbdid, search, log) {
	try {
		var CUAApproalRoutingDetails = [];
		var ARSearchObj = search.create({
			type: 'customrecord_xor_pay_cua_appr_routing',
			columns: [{
				"name": "custrecord_xor_pay_cua_approval_level",
				"label": "Level",
				"type": "select",
				"sortdir": "NONE"
			}, {
				"name": "custrecord_xor_pay_cua_pmt_appr_limit",
				"label": "Payment Approval Limit",
				"type": "currency",
				"sortdir": "NONE"
			}, {
				"name": "custrecord_xor_pay_cua_payment_approver",
				"label": "Payment Approver",
				"type": "select",
				"sortdir": "NONE"
			}],
			"settings": [],
			filters: [{
				"name": "custrecord_xor_pay_cua_cbd_id",
				"operator": "anyof",
				"values": [
					cbdid
				],
				"isor": false,
				"isnot": false,
				"leftparens": 0,
				"rightparens": 0
			}]
		});
		var searchResult = ARSearchObj.run().getRange({
			start: 0,
			end: 100
		});
		for (var k = 0; k < searchResult.length; k++) {
			var CUAApproalRoutingDetailsObj = {};
			CUAApproalRoutingDetailsObj = {
				"custrecord_xor_pay_cua_approval_level": searchResult[k].getValue({
					name: 'custrecord_xor_pay_cua_approval_level'
				}),
				"LevelName": searchResult[k].getText({
					name: 'custrecord_xor_pay_cua_approval_level'
				}),
				"custrecord_xor_pay_cua_pmt_appr_limit": searchResult[k].getValue({
					name: 'custrecord_xor_pay_cua_pmt_appr_limit'
				}),
				"custrecord_xor_pay_cua_payment_approver": searchResult[k].getValue({
					name: 'custrecord_xor_pay_cua_payment_approver'
				})
			}
			CUAApproalRoutingDetails.push(CUAApproalRoutingDetailsObj);
		}
		return CUAApproalRoutingDetails;
	} catch (err) {
		log.debug({
			title: 'err-CUAApprovalRouting Search function',
			details: err
		});
	}
}

function billPaymentFilter(arr, obj) {
	// destructure the properties from each object
	var transaction = arr.filter(function (t) {
		if (t.duedate && obj.duedate && !t.contractid && !obj.contractid) return (t.vendor === obj.vendor && t.duedate === obj.duedate && t.currency === obj.currency && t.apaccount === obj.apaccount && t.profileid === obj.profileid);
		else if (!t.duedate && !obj.duedate && t.contractid && obj.contractid) return (t.vendor === obj.vendor && t.contractid === obj.contractid && t.currency === obj.currency && t.apaccount === obj.apaccount && t.profileid === obj.profileid);
		else if (t.duedate && obj.duedate && t.contractid && obj.contractid) return (t.vendor === obj.vendor && t.duedate === obj.duedate && t.contractid === obj.contractid && t.currency === obj.currency && t.apaccount === obj.apaccount && t.profileid === obj.profileid);
		else return (t.vendor === obj.vendor && t.currency === obj.currency && t.apaccount === obj.apaccount && t.profileid === obj.profileid);
	});
	// check to see if a transaction with the same vendor,duedate,subsidiary exists
	if (transaction.length != 0) {
		transaction[0].billDetails.push({
			'vendor': obj.vendor,
			'totalTaxAmt': '',
			'billcurrency': obj.billcurrency,
			'billid': obj.billid,
			'type': obj.type,
			'payment': obj.paymentAmtToApply,
			'billcom': obj.billcom,
			'date': obj.date,
			'duedate': obj.duedate,
			'disctaken': obj.disctaken,
			'remamount': obj.remamount,
			'invamount': obj.invamount,
			'taxamount': obj.taxamount,
			'docNo': obj.docNo,
			'subsidiary': obj.subsidiary,
			'creditAmt': obj.paymentAmtToApply,
			'location': obj.location,
			'appliedCreditAmount': Number(0),
			'appliedPaymentAmount': Number(0),
			'appliedCreditID': '',
			'paymentid': '',
			'isPayment': '0',
			'apaccount': obj.apaccount,
			'profileid': obj.profileid,
			'contractid': obj.contractid
		});
		if (transaction[0].type == 'Bill' && obj.type == 'Bill') {
			transaction[0].billcom = transaction[0].billcom + "|" + obj.billcom;
			transaction[0].approvedAmt = (Number(transaction[0].approvedAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
			transaction[0].totalPaymentAmt = (Number(transaction[0].totalPaymentAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
			transaction[0].totalTaxAmt = (Number(transaction[0].totalTaxAmt) + Number(obj.taxamount)).toFixed(2);
		}
		if (transaction[0].type == 'Bill' && obj.type == 'Bill Credit') {
			transaction[0].totalCreditAmt = (Number(transaction[0].totalCreditAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
		}
		if (transaction[0].type == 'Bill Credit' && obj.type == 'Bill') {
			if (transaction[0].billcom) transaction[0].billcom = transaction[0].billcom + "|" + obj.billcom;
			transaction[0].totalPaymentAmt = (Number(transaction[0].totalPaymentAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
			transaction[0].approvedAmt = (Number(transaction[0].approvedAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
			transaction[0].totalTaxAmt = (Number(transaction[0].totalTaxAmt) + Number(obj.taxamount)).toFixed(2);
		}
		if (transaction[0].type == 'Bill Credit' && obj.type == 'Bill Credit') {
			transaction[0].totalCreditAmt = (Number(transaction[0].totalCreditAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
		}
	}
	// if a transaction exists, add this entry
	else {
		if (obj.type == 'Bill') {
			arr.push({
				'vendor': obj.vendor,
				'type': obj.type,
				'duedate': obj.duedate,
				'contractid': obj.contractid,
				'currency': obj.currency,
				'apaccount': obj.apaccount,
				'profileid': obj.profileid,
				'profilecode': '',
				'billcom': obj.billcom,
				'subsidiary': obj.subsidiary,
				'billcurrency': obj.billcurrency,
				'approvedAmt': obj.paymentAmtToApply,
				'totalPaymentAmt': obj.paymentAmtToApply,
				'totalTaxAmt': obj.taxamount,
				'location': obj.location,
				'totalCreditAmt': Number(0),
				'paymentid': '',
				'isPayment': '0',
				'isCredit': '0',
				'billDetails': [{
					'vendor': obj.vendor,
					'totalTaxAmt': '',
					'billcurrency': obj.billcurrency,
					'billid': obj.billid,
					'type': obj.type,
					'payment': obj.paymentAmtToApply,
					'billcom': obj.billcom,
					'date': obj.date,
					'duedate': obj.duedate,
					'disctaken': obj.disctaken,
					'remamount': obj.remamount,
					'invamount': obj.invamount,
					'taxamount': obj.taxamount,
					'docNo': obj.docNo,
					'subsidiary': obj.subsidiary,
					'creditAmt': Number(0),
					'location': obj.location,
					'appliedCreditAmount': Number(0),
					'appliedPaymentAmount': Number(0),
					'appliedCreditID': '',
					'paymentid': '',
					'isPayment': '0',
					'apaccount': obj.apaccount,
					'profileid': obj.profileid,
					'contractid': obj.contractid
				}]
			});
		} else if (obj.type == 'Bill Credit') {
			arr.push({
				'vendor': obj.vendor,
				'type': obj.type,
				'duedate': obj.duedate,
				'contractid': obj.contractid,
				'currency': obj.currency,
				'apaccount': obj.apaccount,
				'profileid': obj.profileid,
				'profilecode': '',
				'billcom': obj.billcom,
				'subsidiary': obj.subsidiary,
				'billcurrency': obj.billcurrency,
				'approvedAmt': '0',
				'totalPaymentAmt': '0',
				'totalTaxAmt': '0',
				'location': obj.location,
				'totalCreditAmt': obj.paymentAmtToApply,
				'paymentid': '',
				'isPayment': '0',
				'isCredit': '0',
				'billDetails': [{
					'vendor': obj.vendor,
					'totalTaxAmt': '',
					'billcurrency': obj.billcurrency,
					'billid': obj.billid,
					'type': obj.type,
					'payment': obj.paymentAmtToApply,
					'billcom': obj.billcom,
					'date': obj.date,
					'duedate': obj.duedate,
					'disctaken': obj.disctaken,
					'remamount': obj.remamount,
					'invamount': obj.invamount,
					'taxamount': obj.taxamount,
					'docNo': obj.docNo,
					'subsidiary': obj.subsidiary,
					'creditAmt': obj.paymentAmtToApply,
					'location': obj.location,
					'appliedCreditAmount': Number(0),
					'appliedPaymentAmount': Number(0),
					'appliedCreditID': '',
					'paymentid': '',
					'isPayment': '0',
					'apaccount': obj.apaccount,
					'profileid': obj.profileid,
					'contractid': obj.contractid
				}]
			});
		}
	}
	// otherwise, create a new transaction entry
	return arr;
}

function vendorPaymentFilter(arr, obj) {
	// destructure the properties from each object
	var transaction = arr.filter(function (t) {
		return (t.vendor === obj.vendor);
	});
	// check to see if a transaction with the same vendor,duedate,subsidiary exists
	if (transaction.length != 0) {
		transaction[0].billDetails.push({
			'vendor': obj.vendor,
			'totalTaxAmt': '',
			'billcurrency': obj.billcurrency,
			'billid': obj.billid,
			'type': obj.type,
			'payment': obj.paymentAmtToApply,
			'billcom': obj.billcom,
			'date': obj.date,
			'duedate': obj.duedate,
			'disctaken': obj.disctaken,
			'remamount': obj.remamount,
			'invamount': obj.invamount,
			'taxamount': obj.taxamount,
			'docNo': obj.docNo,
			'subsidiary': obj.subsidiary,
			'creditAmt': obj.paymentAmtToApply,
			'location': obj.location,
			'appliedCreditAmount': Number(0),
			'appliedPaymentAmount': Number(0),
			'appliedCreditID': '',
			'paymentid': '',
			'isPayment': '0',
			'apaccount': obj.apaccount,
			'profileid': obj.profileid
		});
		if (transaction[0].type == 'Bill' && obj.type == 'Bill') {
			transaction[0].billcom = transaction[0].billcom + "|" + obj.billcom;
			transaction[0].approvedAmt = (Number(transaction[0].approvedAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
			transaction[0].totalPaymentAmt = (Number(transaction[0].totalPaymentAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
			transaction[0].totalTaxAmt = (Number(transaction[0].totalTaxAmt) + Number(obj.taxamount)).toFixed(2);
		}
		if (transaction[0].type == 'Bill' && obj.type == 'Bill Credit') {
			transaction[0].totalCreditAmt = (Number(transaction[0].totalCreditAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
		}
		if (transaction[0].type == 'Bill Credit' && obj.type == 'Bill') {
			if (transaction[0].billcom) transaction[0].billcom = transaction[0].billcom + "|" + obj.billcom;
			transaction[0].totalPaymentAmt = (Number(transaction[0].totalPaymentAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
			transaction[0].approvedAmt = (Number(transaction[0].approvedAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
			transaction[0].totalTaxAmt = (Number(transaction[0].totalTaxAmt) + Number(obj.taxamount)).toFixed(2);
		}
		if (transaction[0].type == 'Bill Credit' && obj.type == 'Bill Credit') {
			transaction[0].totalCreditAmt = (Number(transaction[0].totalCreditAmt) + Number(obj.paymentAmtToApply)).toFixed(2);
		}
	}
	// if a transaction exists, add this entry
	else {
		if (obj.type == 'Bill') {
			arr.push({
				'vendor': obj.vendor,
				'type': obj.type,
				'duedate': obj.duedate,
				'currency': obj.currency,
				'apaccount': obj.apaccount,
				'profileid': obj.profileid,
				'profilecode': '',
				'billcom': obj.billcom,
				'subsidiary': obj.subsidiary,
				'billcurrency': obj.billcurrency,
				'approvedAmt': obj.paymentAmtToApply,
				'totalPaymentAmt': obj.paymentAmtToApply,
				'totalTaxAmt': obj.taxamount,
				'location': obj.location,
				'totalCreditAmt': Number(0),
				'paymentid': '',
				'isPayment': '0',
				'isCredit': '0',
				'billDetails': [{
					'vendor': obj.vendor,
					'totalTaxAmt': '',
					'billcurrency': obj.billcurrency,
					'billid': obj.billid,
					'type': obj.type,
					'payment': obj.paymentAmtToApply,
					'billcom': obj.billcom,
					'date': obj.date,
					'duedate': obj.duedate,
					'disctaken': obj.disctaken,
					'remamount': obj.remamount,
					'invamount': obj.invamount,
					'taxamount': obj.taxamount,
					'docNo': obj.docNo,
					'subsidiary': obj.subsidiary,
					'creditAmt': Number(0),
					'location': obj.location,
					'appliedCreditAmount': Number(0),
					'appliedPaymentAmount': Number(0),
					'appliedCreditID': '',
					'paymentid': '',
					'isPayment': '0',
					'apaccount': obj.apaccount,
					'profileid': obj.profileid
				}]
			});
		} else if (obj.type == 'Bill Credit') {
			arr.push({
				'vendor': obj.vendor,
				'type': obj.type,
				'duedate': obj.duedate,
				'currency': obj.currency,
				'apaccount': obj.apaccount,
				'profileid': obj.profileid,
				'profilecode': '',
				'billcom': obj.billcom,
				'subsidiary': obj.subsidiary,
				'billcurrency': obj.billcurrency,
				'approvedAmt': '0',
				'totalPaymentAmt': '0',
				'totalTaxAmt': '0',
				'location': obj.location,
				'totalCreditAmt': obj.paymentAmtToApply,
				'paymentid': '',
				'isPayment': '0',
				'isCredit': '0',
				'billDetails': [{
					'vendor': obj.vendor,
					'totalTaxAmt': '',
					'billcurrency': obj.billcurrency,
					'billid': obj.billid,
					'type': obj.type,
					'payment': obj.paymentAmtToApply,
					'billcom': obj.billcom,
					'date': obj.date,
					'duedate': obj.duedate,
					'disctaken': obj.disctaken,
					'remamount': obj.remamount,
					'invamount': obj.invamount,
					'taxamount': obj.taxamount,
					'docNo': obj.docNo,
					'subsidiary': obj.subsidiary,
					'creditAmt': obj.paymentAmtToApply,
					'location': obj.location,
					'appliedCreditAmount': Number(0),
					'appliedPaymentAmount': Number(0),
					'appliedCreditID': '',
					'paymentid': '',
					'isPayment': '0',
					'apaccount': obj.apaccount,
					'profileid': obj.profileid
				}]
			});
		}
	}
	// otherwise, create a new transaction entry
	return arr;
}

function findCurrentApprover(array, paymentlimit, level1limit, level1approver, level2approver, log) {
	var newArray = [];
	var approvalObj = {
		'firstapprover': '',
		'secondapprover': '',
		'currentapprover': '',
		'notforapproval': '',
		'Level1RecordCount': Number(0),
		'Level2RecordCount': Number(0)
	};
	for (var i = 0; i < array.length; i++) {
		var arrayAmount = (Number(array[i]['totalPaymentAmt']) - Number(array[i]['totalCreditAmt'])).toFixed(2);
		var getpaymentLimit = (Number(paymentlimit)).toFixed(2);
		var getLevel1Limit = (Number(level1limit)).toFixed(2);
		log.debug({
			title: 'arrayAmount',
			details: arrayAmount
		});
		log.debug({
			title: 'getpaymentLimit',
			details: getpaymentLimit
		});
		log.debug({
			title: 'getLevel1Limit',
			details: getLevel1Limit
		});
		if (Number(arrayAmount) <= Number(getpaymentLimit)) {
			log.audit({
				title: 'cond 1'
			});
			approvalObj.notforapproval = 'true';
		} else {
			if (Number(arrayAmount) > Number(getpaymentLimit) && Number(arrayAmount) <= Number(getLevel1Limit)) {
				log.audit({
					title: 'cond 2'
				});
				approvalObj.firstapprover = level1approver;
				approvalObj.Level1RecordCount = Number(approvalObj.Level1RecordCount) + Number(1);
			}
			if (Number(arrayAmount) > Number(getLevel1Limit)) {
				log.audit({
					title: 'cond 3'
				});
				approvalObj.secondapprover = level2approver;
				approvalObj.Level2RecordCount = Number(approvalObj.Level2RecordCount) + Number(1);
			}
		}
	} // for loop end
	newArray.push(approvalObj);
	return newArray;
}

function findArrayData(array, property, value) {
	var newArray = [];
	array.forEach(function (result, index) {
		if (result[property] === value) {
			//Remove from array
			newArray.push(array[index]);
		}
	});
	return newArray;
}