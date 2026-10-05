/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(["N/url", 'N/https', 'N/record', 'N/ui/dialog', 'N/format', 'N/currentRecord', 'N/search', 'N/query'],

	function (url, https, record, dialog, formatModule, currentRecord, searchModule, query) {

		function pageInit(context) {
			try {
				debugger;
				var regexNumber = /^[0-9]+$/;
				var regexAmount = /^\d+(\.\d{1,2})?$/;
				var currentRecord = context.currentRecord;
				var buttonFilter = currentRecord.getValue({ fieldId: 'custpage_wire_type' });
				console.log('buttonFilter: ', buttonFilter);
				//for foreign

				var currentUrl = window.location.href;
				var baseUrl = currentUrl.split('?')[0];
				var urlParams = new URLSearchParams(window.location.search);
				urlParams.delete('storedTemplateName');
				var newUrl = baseUrl + (urlParams.toString() ? '?' + urlParams.toString() : '');
				history.replaceState(null, '', newUrl);

				var currentUrl = window.location.href;
				var baseUrl = currentUrl.split('?')[0];
				var urlforeignParams = new URLSearchParams(window.location.search);
				urlforeignParams.delete('storedforeignTemplateName');
				var newforeignUrl = baseUrl + (urlforeignParams.toString() ? '?' + urlforeignParams.toString() : '');
				history.replaceState(null, '', newforeignUrl);

				//rutuja start
				var currentUrl = window.location.href;
				var baseUrl = currentUrl.split('?')[0];
				var urlRtpParams = new URLSearchParams(window.location.search);
				urlRtpParams.delete('storedRtpTemplateName');
				var newRtpUrl = baseUrl + (urlRtpParams.toString() ? '?' + urlRtpParams.toString() : '');
				history.replaceState(null, '', newRtpUrl);
				//rutuja end

				var tempforeignstorevalue = currentRecord.getValue({ fieldId: 'custpage_foreigntemplate_store_value' });
				var tempstorevalue = currentRecord.getValue({ fieldId: 'custpage_template_store_value' });
				var searchInput = document.getElementById('search-input');
				if (searchInput) {
					var storedValue = tempstorevalue;
					if (storedValue) {
						searchInput.value = storedValue;  // Set your desired default value here
					} else {
						log.error('Input field not found', 'The input field with id "search-input" was not found on the page.');
					}
				}

				var searchforeignInput = document.getElementById('search-input');
				if (searchforeignInput) {
					var storedforeignValue = tempforeignstorevalue;
					if (storedforeignValue) {
						searchforeignInput.value = storedforeignValue;  // Set your desired default value here
					} else {
						log.error('Input field not found', 'The input field with id "search-input" was not found on the page.');
					}
				}
				//Start - Umar added the condition to check if address line 1 and/or address line 2 is entered, city is required and vice versa for Domestic Wire on 20th JUly 2026.
				// Domestic Wires Addresses.
				var dom_addr1 = currentRecord.getValue({ fieldId: "custpage_dom_address_one" });
				var dom_addr2 = currentRecord.getValue({ fieldId: "custpage_dom_address_two" });
				var dom_city = currentRecord.getValue({ fieldId: "custpage_dom_city" });
				var domTempStoreValue = currentRecord.getValue({ fieldId: 'custpage_template_store_value' });
				console.log('domTempStoreValue', domTempStoreValue);
				if (domTempStoreValue && domTempStoreValue !== '') {
					//If address line 1 and/or address line 2 is entered, city is required.
					var cityMandat = false
					if (dom_addr1 || dom_addr2)
						cityMandat = true
					currentRecord.getField({
						fieldId: "custpage_dom_city"
					}).isMandatory = cityMandat;

					//If City is entered, address line and/or address line 2 is required.
					var addrMandat = false
					if (dom_city)
						addrMandat = true
					currentRecord.getField({
						fieldId: "custpage_dom_address_one"
					}).isMandatory = addrMandat;
				}

				//rutuja start
				var searchRtpInput = document.getElementById('search-input');
				if (searchRtpInput) {
					var storedRtpValue = tempstorevalue;
					if (storedRtpValue) {
						searchRtpInput.value = storedRtpValue;  // Set your desired default value here
					} else {
						log.error('Input field not found', 'The input field with id "search-input" was not found on the page.');
					}
				}
				//rutuja end

				var secondaryContinueButtonTr = document.getElementById("tr_secondarysubmitter");
				if (secondaryContinueButtonTr) {
					secondaryContinueButtonTr.style.borderRadius = "30px";
				}

				var secondaryContinueButtonTd = document.getElementById("tdbody_secondarysubmitter");
				if (secondaryContinueButtonTd) {
					secondaryContinueButtonTd.style.borderRadius = "30px";
				}

				var secondaryResetButtonTr = document.getElementById("tr_secondarycustpage_reset");
				if (secondaryResetButtonTr) {
					secondaryResetButtonTr.style.borderRadius = "30px";
				}

				var secondaryResetButtonTd = document.getElementById("tdbody_secondarycustpage_reset");
				if (secondaryResetButtonTd) {
					secondaryResetButtonTd.style.borderRadius = "30px";
				}

				var hoverBackgroundStyle = document.createElement('style');
				hoverBackgroundStyle.type = 'text/css';

				hoverBackgroundStyle.innerHTML =
					'.uir-button :not([class$="Dis"]) > .bntBgB:hover:before, ' +
					'.uir-multibutton :not([class$="Dis"]):not([class$="Dis_sel"]) > .bntBgB:hover:before {' +
					'    background-color:transparent !important;' +  /* Custom background color */
					'}';

				document.head.appendChild(hoverBackgroundStyle);


				var foreignvalue = currentRecord.getValue({ fieldId: 'custpage_foreigntemplate_store_value' });
				console.log('foreignvalue: ', foreignvalue);

				if (foreignvalue) {


					var countryCode = currentRecord.getValue({ fieldId: 'custpage_for_dest_country' });
					if (countryCode) {

						if (countryCode == "") {
							alert("Select a country to proceed.");
							return false;
						}

						var reqUrl = url.resolveScript({
							scriptId: 'customscript_citiintegrator_ns_ss_cntres',
							deploymentId: 'customdeploy_citiintegrator_ns_ss_cntres',
							returnExternalUrl: false,
							params: {
								'countryCode': countryCode
							}
						});

						var response = https.request({
							method: https.Method.GET,
							url: reqUrl
						});
						var countryRestrResponse = response.body.split("_");
						if (countryRestrResponse[0] == "Session Expired") {
							//alert(countryRestrResponse[0]);

							window.onbeforeunload = null;
							var urlString = url.resolveScript({
								scriptId: "customscript_citiintegrator_ns_ss_cntres",
								deploymentId: "customdeploy_citiintegrator_ns_ss_cntres"
							});
							window.open(urlString, "_self");
							return false;
						}
						var countryRestrictions = "";
						countryRestrResponse = JSON.parse(countryRestrResponse.toString());
						if (countryRestrResponse && countryRestrResponse.code == 500 || countryRestrResponse && countryRestrResponse.code == 400) {
							alert(countryRestrResponse.message);
							currentRecord.setValue({
								fieldId: "custpage_for_dest_country",
								value: '',
								ignoreFieldChange: true,
							});
							return false;
						} else {
							countryRestrictions = countryRestrResponse;
						}
						console.log("countryRestrictions", countryRestrictions);
						var chipOrUID = currentRecord.getField({
							fieldId: 'custpage_for_chip_or_uid'
						});
						var urlId = document.getElementById("custpage_chips_uid");
						if (countryRestrictions.chipsIndicator == "Y") {
							chipOrUID.isDisplay = true;
							urlId.style.display = "block";
						} else {
							chipOrUID.isDisplay = false;
							urlId.style.display = "none";
						}

						if (countryRestrictions.accountFormat != "") {
							currentRecord.setValue({
								fieldId: "custpage_for_account_number_format",
								value: countryRestrictions.accountFormat,
								ignoreFieldChange: true,
							});
						} else {
							currentRecord.setValue({
								fieldId: "custpage_for_account_number_format",
								value: "",
								ignoreFieldChange: true,
							});
						}

						if (countryRestrictions.ibanOtherCountryFormat != "") {
							currentRecord.setValue({
								fieldId: "custpage_for_iban_other_format",
								value: countryRestrictions.ibanOtherCountryFormat,
								ignoreFieldChange: true,
							});
						} else {
							currentRecord.setValue({
								fieldId: "custpage_for_iban_other_format",
								value: "",
								ignoreFieldChange: true,
							});
						}

						if (countryRestrictions.accountMaxLength != "") {
							currentRecord.setValue({
								fieldId: "custpage_for_account_number_max_length",
								value: countryRestrictions.accountMaxLength,
								ignoreFieldChange: true,
							});
						} else {
							currentRecord.setValue({
								fieldId: "custpage_for_account_number_max_length",
								value: "",
								ignoreFieldChange: true,
							});
						}

						var accountNumberField = currentRecord.getField({
							fieldId: 'custpage_for_account_number'
						});
						var accountNumberLabel = countryRestrictions.accountLabelValue;
						if (accountNumberLabel != "") {
							accountNumberField.label = "Account Number (" + accountNumberLabel + ")";
						} else {
							accountNumberField.label = "Account Number";
						}

						var accountNumberHtmlId = document.getElementById("custpage_for_account_number_html");
						if (countryRestrictions.ibanIndicator != "Y") {
							accountNumberHtmlId.style.display = "none";
						} else {
							accountNumberHtmlId.style.display = "inline-flex";
							if (accountNumberLabel != "") {
								var details = "Please use care to enter the correct " + accountNumberLabel + " in the Account Number field. Not using a correct " + accountNumberLabel + " may result in delayed or rejected wires and/or additional processing fees."
								document.getElementById("custpage_for_acc_number_details_html").innerText = details;
							}
						}

						var routingCode = currentRecord.getField({
							fieldId: 'custpage_for_other_routing_code'
						});
						if (countryRestrictions.routingCodIndicator == "Y") {
							routingCode.label = countryRestrictions.routingCodLabelValue;
							currentRecord.setValue({
								fieldId: "custpage_for_other_routing_label",
								value: countryRestrictions.routingCodLabelValue,
								ignoreFieldChange: true,
							});
							routingCode.isDisplay = true;
						} else {
							routingCode.isDisplay = false;
						}

						puposeAndSubPurposeCode(countryRestrictions, countryCode, currentRecord);
						var currentDate = new Date();
						var populatedDate = currentRecord.getValue("custpage_for_wire_date");
						if (!populatedDate) {
							currentRecord.setValue({
								fieldId: "custpage_for_wire_date",
								value: currentDate,
								ignoreFieldChange: true,
							});
						}
					}

					//for foreign

					var foreignNumbervalue = currentRecord.getValue({
						fieldId: 'custpage_for_swift_or_bic'
					});

					if (foreignNumbervalue) {
						debugger;
						var swiftBic = currentRecord.getValue("custpage_for_swift_or_bic");
						var countryCode = currentRecord.getValue("custpage_for_dest_country");

						if (countryCode == "") {
							alert("Select a country to proceed.");
							var setValueVar = currentRecord.setValue({
								fieldId: "custpage_for_swift_or_bic",
								value: '',
								ignoreFieldChange: true,
							});
							return false;
						}

						if (swiftBic.trim() === "") {
							alert("Please enter SWIFT/BIC to proceed.");
							return false;
						}

						var routeCodeReqUrl = url.resolveScript({
							scriptId: 'customscript_citiintegrator_ns_ss_rotcod',
							deploymentId: 'customdeploy_citiintegrator_ns_ss_rotcod',
							returnExternalUrl: false,
							params: {
								'routeType': 'SWIFT_BIC_CODE',
								'routeCode': swiftBic,
								'countryCode': countryCode
							}
						});

						var response = https.request({
							method: https.Method.GET,
							url: routeCodeReqUrl
						});
						console.log("response252", response);
						var routeCodeResponse = response.body.split("_");
						if (routeCodeResponse[0] == "Session Expired") {
							//alert(routeCodeResponse[0]);

							window.onbeforeunload = null;
							var urlString = url.resolveScript({
								scriptId: "customscript_citiintegrator_ns_ss_logpge",
								deploymentId: "customdeploy_citiintegrator_ns_ss_logpge"
							});
							window.open(urlString, "_self");
							return false;
						}
						updateFields(routeCodeResponse, currentRecord, "SWIFT/BIC", "custpage_for_swift_or_bic");

					}

				}




				//for domestic	
				var bankRoutingNumbervalue = currentRecord.getValue({
					fieldId: 'custpage_bank_routing_number'
				});

				if (bankRoutingNumbervalue) {
					var fieldName = "custpage_bank_routing_number";

					var abaNumber;
					var intrBankHoldNoFor = currentRecord.getValue("custpage_for_intr_bank_hold_no");
					var bankRoutingNoDom = currentRecord.getValue("custpage_bank_routing_number");
					var intrBankRoutingNoFor = currentRecord.getValue("custpage_inter_bank_routing_number");
					var bankRoutingNoRtp = currentRecord.getValue("custpage_rtp_bank_routing_number"); //rutuja

					if (intrBankHoldNoFor && intrBankHoldNoFor != "") {
						abaNumber = intrBankHoldNoFor;
					} else if (bankRoutingNoDom && bankRoutingNoDom != "") {
						abaNumber = bankRoutingNoDom;
					} else if (bankRoutingNoRtp && bankRoutingNoRtp != "") {
						//rutuja
						abaNumber = bankRoutingNoRtp;
					} else {
						abaNumber = intrBankRoutingNoFor;
					}

					if (!regexNumber.test(abaNumber) || abaNumber.length != 9) {

						alert("Please provide valid Routing Number or contact the bank.");
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});

						var bankRoutingHtmlId = document.getElementById("custpage_bank_routing_info");
						if (bankRoutingHtmlId) {
							bankRoutingHtmlId.style.display = "none";
						}
						return false;
					}

					if (bankRoutingNoRtp && bankRoutingNoRtp != "") { //rutuja start
						var routeCodeReqUrl = url.resolveScript({
							scriptId: 'customscript_citiintegrator_ns_ss_aba_in',
							deploymentId: 'customdeploy_citiintegrator_ns_ss_aba_in',
							returnExternalUrl: false,
							params: {
								'abaNumber': abaNumber
							}
						});

					} else {

						var routeCodeReqUrl = url.resolveScript({
							scriptId: 'customscript_citiintegrator_ns_ss_abanum',
							deploymentId: 'customdeploy_citiintegrator_ns_ss_abanum',
							returnExternalUrl: false,
							params: {
								'abaNumber': abaNumber
							}
						});
					}
					//rutuja end

					var response = https.request({
						method: https.Method.GET,
						url: routeCodeReqUrl
					});
					var abaNumberResponse = response.body.split("_");
					if (abaNumberResponse[0] == "Session Expired") {
						//alert(abaNumberResponse[0]);

						window.onbeforeunload = null;
						var urlString = url.resolveScript({
							scriptId: "customscript_citiintegrator_ns_ss_logpge",
							deploymentId: "customdeploy_citiintegrator_ns_ss_logpge"
						});
						window.open(urlString, "_self");
						return false;
					}
					var abaDetails = "";
					var abaNumberResponse = JSON.parse(abaNumberResponse[0]);
					if (abaNumberResponse && abaNumberResponse.code == 500) {
						alert("Please provide valid Routing Number or contact the bank.");
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});
						return false;
					} else if (abaNumberResponse && abaNumberResponse.code == 400) {
						alert(abaNumberResponse.message);
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});
						return false;
					} else {
						abaDetails = abaNumberResponse.abaDetails;
					}
					if (abaDetails && abaDetails.length == 1) {
						if (fieldName == "custpage_rtp_bank_routing_number") { //rutuja start
							var bankName = abaDetails[0].bankName;
							var bankCd = abaDetails[0].bankCd;
							var abaNumber = abaDetails[0].abaNumber;
							var abaNumberHTML = bankName;

						} else {
							var bankName = abaDetails[0].bankName;
							var bankAddr = abaDetails[0].bankAddr;
							var bankStateName = abaDetails[0].bankStateName;
							var abaNumber = abaDetails[0].abaNumber;
							var bankState = abaDetails[0].bankState;
							var abaNumberHTML = bankName + '<br>' + bankAddr + ', ' + bankStateName;
						}
						//rutuja end

						currentRecord.setValue({
							fieldId: fieldName,
							value: abaNumber,
							ignoreFieldChange: true,
						});
						if (fieldName == "custpage_for_intr_bank_hold_no") {
							currentRecord.setValue({
								fieldId: "custpage_for_aba_number_details",
								value: "<p id='custpage_bank_routing_info'>" + abaNumberHTML + "<p>",
								ignoreFieldChange: true,
							});

							currentRecord.setValue({
								fieldId: "custpage_for_aba_number_details_hidden",
								value: abaNumberHTML,
								ignoreFieldChange: true,
							});
						} else if (fieldName == "custpage_bank_routing_number") {

							currentRecord.setValue({
								fieldId: "custpage_dom_aba_number_details",
								value: "<p id='custpage_bank_routing_info'>" + abaNumberHTML + "<p>",
								ignoreFieldChange: true,
							});

							currentRecord.setValue({
								fieldId: "custpage_dom_aba_number_details_hidden",
								value: abaNumberHTML,
								ignoreFieldChange: true,
							});
						} else if (fieldName == "custpage_rtp_bank_routing_number") { //rutuja start

							currentRecord.setValue({
								fieldId: "custpage_rtp_aba_number_details",
								value: bankName,
								ignoreFieldChange: true,
							});

							// currentRecord.setValue({
							// 	fieldId: "custpage_dom_aba_number_details_hidden",
							// 	value: abaNumberHTML,
							// 	ignoreFieldChange: true,
							// });
						} //rutuja end
						else {
							currentRecord.setValue({
								fieldId: "custpage_dom_aba_number_details",
								value: "<p id='custpage_bank_routing_info'>" + abaNumberHTML + "<p>",
								ignoreFieldChange: true,
							});

							currentRecord.setValue({
								fieldId: "custpage_dom_aba_number_details_hidden",
								value: abaNumberHTML,
								ignoreFieldChange: true,
							});
						}
						currentRecord.setValue({
							fieldId: "custpage_dom_dest_bank_name_hidden",
							value: bankName,
							ignoreFieldChange: true
						});
						currentRecord.setValue({
							fieldId: "custpage_dom_dest_bank_addr_hidden",
							value: bankAddr,
							ignoreFieldChange: true
						});
						currentRecord.setValue({
							fieldId: "custpage_dom_dest_bank_state_hidden",
							value: bankState,
							ignoreFieldChange: true
						});
					} else {
						alert("Please provide valid Routing Number or contact the bank.");
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});

						var bankRoutingHtmlId = document.getElementById("custpage_bank_routing_info");
						if (bankRoutingHtmlId) {
							bankRoutingHtmlId.style.display = "none";
						}
						return false;
					}


				}
				//for the intermediate Bank

				//for RealTime payments	
				//rutuja start
				var bankRoutingNumberRtpValue = currentRecord.getValue({
					fieldId: 'custpage_rtp_bank_routing_number'
				});

				if (bankRoutingNumberRtpValue) {
					var fieldName = "custpage_rtp_bank_routing_number";

					var abaNumber;
					var intrBankHoldNoFor = currentRecord.getValue("custpage_for_intr_bank_hold_no");
					var bankRoutingNoDom = currentRecord.getValue("custpage_bank_routing_number");
					var intrBankRoutingNoFor = currentRecord.getValue("custpage_inter_bank_routing_number");
					var bankRoutingNoRtp = currentRecord.getValue("custpage_rtp_bank_routing_number");


					if (intrBankHoldNoFor && intrBankHoldNoFor != "") {
						abaNumber = intrBankHoldNoFor;
					} else if (bankRoutingNoDom && bankRoutingNoDom != "") {
						abaNumber = bankRoutingNoDom;
					} else if (bankRoutingNoRtp && bankRoutingNoRtp != "") {
						abaNumber = bankRoutingNoRtp;
					} else {
						abaNumber = intrBankRoutingNoFor;
					}

					if (!regexNumber.test(abaNumber) || abaNumber.length != 9) {
						console.log('i am here 530');
						alert("Please provide valid Routing Number or contact the bank.");
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});

						// var bankRoutingHtmlId = document.getElementById("custpage_bank_routing_info");
						// if (bankRoutingHtmlId) {
						// 	bankRoutingHtmlId.style.display = "none";
						// }
						return false;
					}

					var routeCodeReqUrl = url.resolveScript({
						scriptId: 'customscript_citiintegrator_ns_ss_aba_in',
						deploymentId: 'customdeploy_citiintegrator_ns_ss_aba_in',
						returnExternalUrl: false,
						params: {
							'abaNumber': abaNumber
						}
					});

					var response = https.request({
						method: https.Method.GET,
						url: routeCodeReqUrl
					});
					var abaNumberResponse = response.body.split("_");
					if (abaNumberResponse[0] == "Session Expired") {
						//alert(abaNumberResponse[0]);

						window.onbeforeunload = null;
						var urlString = url.resolveScript({
							scriptId: "customscript_citiintegrator_ns_ss_logpge",
							deploymentId: "customdeploy_citiintegrator_ns_ss_logpge"
						});
						window.open(urlString, "_self");
						return false;
					}
					var abaDetails = "";
					var abaNumberResponse = JSON.parse(abaNumberResponse[0]);
					if (abaNumberResponse && abaNumberResponse.code == 500) {
						console.log('i am here 572');

						alert("Please provide valid Routing Number or contact the bank.");
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});
						return false;
					} else if (abaNumberResponse && abaNumberResponse.code == 400) {
						alert(abaNumberResponse.message);
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});
						return false;
					} else {
						abaDetails = abaNumberResponse.abaDetails;
					}
					if (abaDetails && abaDetails.length == 1) {
						var bankName = abaDetails[0].bankName;
						var bankAddr = abaDetails[0].bankAddr;
						var bankStateName = abaDetails[0].bankStateName;
						var abaNumber = abaDetails[0].abaNumber;
						var bankState = abaDetails[0].bankState;
						var abaNumberHTML = bankName + '<br>' + bankAddr + ', ' + bankStateName;

						currentRecord.setValue({
							fieldId: fieldName,
							value: abaNumber,
							ignoreFieldChange: true,
						});
						if (fieldName == "custpage_for_intr_bank_hold_no") {
							currentRecord.setValue({
								fieldId: "custpage_for_aba_number_details",
								value: "<p id='custpage_bank_routing_info'>" + abaNumberHTML + "<p>",
								ignoreFieldChange: true,
							});

							currentRecord.setValue({
								fieldId: "custpage_for_aba_number_details_hidden",
								value: abaNumberHTML,
								ignoreFieldChange: true,
							});
						} else if (fieldName == "custpage_bank_routing_number") {

							currentRecord.setValue({
								fieldId: "custpage_dom_aba_number_details",
								value: "<p id='custpage_bank_routing_info'>" + abaNumberHTML + "<p>",
								ignoreFieldChange: true,
							});

							currentRecord.setValue({
								fieldId: "custpage_dom_aba_number_details_hidden",
								value: abaNumberHTML,
								ignoreFieldChange: true,
							});
						} else if (fieldName == "custpage_rtp_bank_routing_number") {
							var bankName = abaDetails[0].bankName;
							var bankCd = abaDetails[0].bankCd;
							// abaNumberHTML = bankName;

							currentRecord.setValue({
								fieldId: "custpage_rtp_aba_number_details",
								value: bankName,
								ignoreFieldChange: true,
							});

							// currentRecord.setValue({
							// 	fieldId: "custpage_dom_aba_number_details_hidden",
							// 	value: abaNumberHTML,
							// 	ignoreFieldChange: true,
							// });
						} else {
							var bankName = abaDetails[0].bankName;
							var bankCd = abaDetails[0].bankCd;
							// abaNumberHTML = bankName + '<br>' + bankCd + '<br>';

							currentRecord.setValue({
								fieldId: "custpage_rtp_aba_number_details",
								value: bankName,
								ignoreFieldChange: true,
							});

							// currentRecord.setValue({
							// 	fieldId: "custpage_dom_aba_number_details_hidden",
							// 	value: abaNumberHTML,
							// 	ignoreFieldChange: true,
							// });
						}
						// currentRecord.setValue({
						// 	fieldId: "custpage_dom_dest_bank_name_hidden",
						// 	value: bankName,
						// 	ignoreFieldChange: true
						// });
						// currentRecord.setValue({
						// 	fieldId: "custpage_dom_dest_bank_addr_hidden",
						// 	value: bankAddr,
						// 	ignoreFieldChange: true
						// });
						// currentRecord.setValue({
						// 	fieldId: "custpage_dom_dest_bank_state_hidden",
						// 	value: bankState,
						// 	ignoreFieldChange: true
						// });
					}
					else {
						console.log('i am here 672');

						alert("Please provide valid Routing Number or contact the bank.");
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});

						var bankRoutingHtmlId = document.getElementById("custpage_bank_routing_info");
						if (bankRoutingHtmlId) {
							bankRoutingHtmlId.style.display = "none";
						}
						return false;
					}


				}
				//rutuja end

				var intbankNumbervalue = currentRecord.getValue({
					fieldId: 'custpage_inter_bank_routing_number'
				});

				if (intbankNumbervalue) {
					var fieldName = "custpage_inter_bank_routing_number";

					var abaNumber;
					var intrBankHoldNoFor = currentRecord.getValue("custpage_for_intr_bank_hold_no");
					var bankRoutingNoDom = currentRecord.getValue("custpage_bank_routing_number");
					var intrBankRoutingNoFor = currentRecord.getValue("custpage_inter_bank_routing_number");
					var bankRoutingNoRtp = currentRecord.getValue("custpage_rtp_bank_routing_number"); //rutuja 


					if (intrBankHoldNoFor && intrBankHoldNoFor != "") {
						abaNumber = intrBankHoldNoFor;
					} else if (bankRoutingNoDom && bankRoutingNoDom != "") {
						abaNumber = bankRoutingNoDom;
					} else if (bankRoutingNoRtp && bankRoutingNoRtp != "") { //rutuja 
						abaNumber = bankRoutingNoRtp;
					} else {
						abaNumber = intrBankRoutingNoFor;
					}

					if (!regexNumber.test(abaNumber) || abaNumber.length != 9) {

						alert("Please provide valid Routing Number or contact the bank.");
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});

						var bankRoutingHtmlId = document.getElementById("custpage_bank_routing_info");
						if (bankRoutingHtmlId) {
							bankRoutingHtmlId.style.display = "none";
						}
						return false;
					}
					var routeCodeReqUrl = url.resolveScript({
						scriptId: 'customscript_citiintegrator_ns_ss_abanum',
						deploymentId: 'customdeploy_citiintegrator_ns_ss_abanum',
						returnExternalUrl: false,
						params: {
							'abaNumber': abaNumber
						}
					});

					var response = https.request({
						method: https.Method.GET,
						url: routeCodeReqUrl
					});
					var abaNumberResponse = response.body.split("_");
					if (abaNumberResponse[0] == "Session Expired") {
						//alert(abaNumberResponse[0]);

						window.onbeforeunload = null;
						var urlString = url.resolveScript({
							scriptId: "customscript_citiintegrator_ns_ss_logpge",
							deploymentId: "customdeploy_citiintegrator_ns_ss_logpge"
						});
						window.open(urlString, "_self");
						return false;
					}
					var abaDetails = "";
					var abaNumberResponse = JSON.parse(abaNumberResponse[0]);
					if (abaNumberResponse && abaNumberResponse.code == 500) {
						console.log('i am here 759');

						alert("Please provide valid Routing Number or contact the bank.");
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});
						return false;
					} else if (abaNumberResponse && abaNumberResponse.code == 400) {
						alert(abaNumberResponse.message);
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});
						return false;
					} else {
						abaDetails = abaNumberResponse.abaDetails;
					}
					if (abaDetails && abaDetails.length == 1) {
						var bankName = abaDetails[0].bankName;
						var bankAddr = abaDetails[0].bankAddr;
						var bankStateName = abaDetails[0].bankStateName;
						var abaNumber = abaDetails[0].abaNumber;
						var bankState = abaDetails[0].bankState;
						var abaNumberHTML = bankName + '<br>' + bankAddr + ', ' + bankStateName;

						currentRecord.setValue({
							fieldId: fieldName,
							value: abaNumber,
							ignoreFieldChange: true,
						});
						if (fieldName == "custpage_for_intr_bank_hold_no") {
							currentRecord.setValue({
								fieldId: "custpage_for_aba_number_details",
								value: "<p id='custpage_bank_routing_info'>" + abaNumberHTML + "<p>",
								ignoreFieldChange: true,
							});

							currentRecord.setValue({
								fieldId: "custpage_for_aba_number_details_hidden",
								value: abaNumberHTML,
								ignoreFieldChange: true,
							});
						} else if (fieldName == "custpage_bank_routing_number") {

							currentRecord.setValue({
								fieldId: "custpage_dom_aba_number_details",
								value: "<p id='custpage_bank_routing_info'>" + abaNumberHTML + "<p>",
								ignoreFieldChange: true,
							});

							currentRecord.setValue({
								fieldId: "custpage_dom_aba_number_details_hidden",
								value: abaNumberHTML,
								ignoreFieldChange: true,
							});
						} else if (fieldName == "custpage_rtp_bank_routing_number") { //rutuja start
							var bankName = abaDetails[0].bankName;
							var bankCd = abaDetails[0].bankCd;
							// abaNumberHTML = bankName;

							currentRecord.setValue({
								fieldId: "custpage_rtp_aba_number_details",
								value: bankName,
								ignoreFieldChange: true,
							});

							// currentRecord.setValue({
							// 	fieldId: "custpage_dom_aba_number_details_hidden",
							// 	value: abaNumberHTML,
							// 	ignoreFieldChange: true,
							// });
						} //rutuja end
						else {
							currentRecord.setValue({
								fieldId: "custpage_dom_aba_number_details",
								value: "<p id='custpage_bank_routing_info'>" + abaNumberHTML + "<p>",
								ignoreFieldChange: true,
							});

							currentRecord.setValue({
								fieldId: "custpage_dom_aba_number_details_hidden",
								value: abaNumberHTML,
								ignoreFieldChange: true,
							});
						}
						currentRecord.setValue({
							fieldId: "custpage_dom_dest_bank_name_hidden",
							value: bankName,
							ignoreFieldChange: true
						});
						currentRecord.setValue({
							fieldId: "custpage_dom_dest_bank_addr_hidden",
							value: bankAddr,
							ignoreFieldChange: true
						});
						currentRecord.setValue({
							fieldId: "custpage_dom_dest_bank_state_hidden",
							value: bankState,
							ignoreFieldChange: true
						});
					} else {
						console.log('i am here 859');

						alert("Please provide valid Routing Number or contact the bank.");
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});

						var bankRoutingHtmlId = document.getElementById("custpage_bank_routing_info");
						if (bankRoutingHtmlId) {
							bankRoutingHtmlId.style.display = "none";
						}
						return false;
					}


				}

				jQuery('.page-title-menu .ns-menu > .ns-menuitem:not(.uir-page-search__highlight--default)').hide();

				setTimeout(function () {
					var elements = document.querySelectorAll('.listheadertextb');

					elements.forEach(function (element) {
						if (element.hasAttribute('data-label')) {
							var dataLabelValue = element.getAttribute('data-label');

							if (dataLabelValue === 'Account Number' || dataLabelValue === 'Account Type') {
								element.style.setProperty('padding-left', '5px', 'important');
							}
							else if (dataLabelValue === 'Current Available(USD)') {
								element.style.textAlign = "right";
								element.style.setProperty('padding-right', '5px', 'important');
								element.style.width = "16%"
							}
						}
					});
				}, 1000);


				var rows = document.querySelectorAll('.uir-list-row-tr');
				for (var i = 0; i < rows.length; i++) {
					var row = rows[i];
					var rowId = row.id;
					alignRightInRow(rowId);
				}
				if (!foreignvalue) {
					if (buttonFilter == 'INTERNAL_TRANSFERS') {
						var transferToHeader = document.getElementById("custpage_trans_to_tabidtxt")
						transferToHeader.style.fontWeight = "bold !important";

						var AllTables = document.getElementsByClassName("uir-table-block");
						var transferTo = AllTables[2];
						var tarnsferFrom = AllTables[1];
						transferTo.parentElement.removeChild(transferTo);

						const removedTable = transferTo;
						var fields = Array.from(AllTables);
						var headerTable = document.querySelector(".bgsubtabbar");

						var tbody = headerTable.querySelector('tbody');
						var tr = tbody.querySelector('tr');

						var secondTd = tr.querySelector('td:nth-child(4)');
						tr.removeChild(secondTd);
						var mainTable = document.querySelector(".uir-table-block");

						var newTable = document.createElement('table');
						newTable.className = mainTable.className;

						var newDiv = document.createElement('div');
						newDiv.className = headerTable.className;
						var tableInsideDiv = document.createElement("table");
						tableInsideDiv.className = headerTable.className;

						var tbodyInsideTable = document.createElement("tbody");
						var trInsideTbody = document.createElement("tr");

						var newRow1 = newTable.insertRow();
						var newCell = newRow1.insertCell();
						newCell.appendChild(newDiv)
						newDiv.appendChild(tableInsideDiv)
						tableInsideDiv.appendChild(tbodyInsideTable)
						tbodyInsideTable.appendChild(trInsideTbody)
						trInsideTbody.appendChild(secondTd)

						tarnsferFrom.appendChild(newTable);
						newTable.appendChild(removedTable);

						NS.jQuery("#custpage_internal_trasfer").attr('style', ' background-color:#428bca !important;');
						NS.jQuery("#secondarycustpage_internal_trasfer").attr('style', ' background-color:#428bca !important;');

					} else if (buttonFilter == 'DOMESTIC_WIRES') {
						NS.jQuery("#custpage_domestic_wire").attr('style', ' background-color:#428bca !important;');
						NS.jQuery("#secondarycustpage_domestic_wire").attr('style', ' background-color:#428bca !important;');
					} /*else if (buttonFilter == 'REAL_TIME_PAYMENTS') {
					var transferToHeader = document.getElementById("custpage_pay_to_tabidtxt")
					transferToHeader.style.fontWeight = "bold !important";

					var AllTables = document.getElementsByClassName("uir-table-block");
					var transferTo = AllTables[2];
					var tarnsferFrom = AllTables[1];
					transferTo.parentElement.removeChild(transferTo);

					const removedTableInst = transferTo;
					var fields = Array.from(AllTables);
					var headerTable = document.querySelector(".bgsubtabbar");

					var tbody = headerTable.querySelector('tbody');
					var tr = tbody.querySelector('tr');

					var secondTd = tr.querySelector('td:nth-child(4)');
					tr.removeChild(secondTd);
					var mainTable = document.querySelector(".uir-table-block");

					var newTable = document.createElement('table');
					newTable.className = mainTable.className;

					var newDiv = document.createElement('div');
					newDiv.className = headerTable.className;
					var tableInsideDiv = document.createElement("table");
					tableInsideDiv.className = headerTable.className;

					var tbodyInsideTable = document.createElement("tbody");
					var trInsideTbody = document.createElement("tr");

					var newRow1 = newTable.insertRow();
					var newCell = newRow1.insertCell();
					newCell.appendChild(newDiv)
					newDiv.appendChild(tableInsideDiv)
					tableInsideDiv.appendChild(tbodyInsideTable)
					tbodyInsideTable.appendChild(trInsideTbody)
					trInsideTbody.appendChild(secondTd)

					tarnsferFrom.appendChild(newTable);
					newTable.appendChild(removedTableInst);

					NS.jQuery("#custpage_internal_trasfer").attr('style', ' background-color:#428bca !important;');
					NS.jQuery("#secondarycustpage_internal_trasfer").attr('style', ' background-color:#428bca !important;');

				}*/
					else {
						NS.jQuery("#custpage_foreign_wire").attr('style', ' background-color:#428bca !important;');
						NS.jQuery("#secondarycustpage_foreign_wire").attr('style', ' background-color:#428bca !important;');
					}
				}


				const collection = document.getElementsByClassName("uir-table-block");
				if (collection) {
					const referenceNode = document.getElementById("detail_table_lay");
					const newField = referenceNode.querySelector("table")
					console.log("newField", newField)
					console.log("referenceNode", referenceNode)
					const elements = Array.from(collection);
					console.log("elements", elements)

					if (elements) {
						elements.forEach(function (element) {
							element.style.display = 'none';
						});

						if (referenceNode) {
							elements.forEach(function (element) {
								referenceNode.parentNode.insertBefore(element, referenceNode);
							});
						}

						elements.forEach(function (element, index) {
							element.style.marginBottom = '25px';
						});

						elements.forEach(function (element) {
							element.style.display = '';
						});

						if (buttonFilter == 'DOMESTIC_WIRES' || buttonFilter == 'FOREIGN_WIRES' || buttonFilter == 'REAL_TIME_PAYMENTS') { //rutuja added || buttonFilter == 'REAL_TIME_PAYMENTS'
							console.log("yup")
							const firstSection = document.querySelector(".uir-table-block");
							if (firstSection && newField) {
								firstSection.parentNode.insertBefore(newField, firstSection);
							}
						}
					}
				}
				var currentDate = new Date();
				if (!foreignvalue) {

					if (buttonFilter == 'DOMESTIC_WIRES') {
						var field = currentRecord.getValue("custpage_dom_us_credit_inter_bank");
						var bankRoutingNumber = currentRecord.getField({
							fieldId: 'custpage_bank_routing_number'
						});
						var interBankRoutingNumber = currentRecord.getField({
							fieldId: 'custpage_inter_bank_routing_number'
						});
						var city = currentRecord.getField({
							fieldId: 'custpage_city'
						});
						var financialInstitutionName = currentRecord.getField({
							fieldId: 'custpage_financial_institution_name'
						});
						var financialInstitutionAccount = currentRecord.getField({
							fieldId: 'custpage_finint_account'
						});
						var state = currentRecord.getField({
							fieldId: 'custpage_state'
						});
						var bankAddress = currentRecord.getField({
							fieldId: 'custpage_bank_address'
						});
						if (field == 'inter_bank') {
							bankRoutingNumber.isDisplay = false;
							interBankRoutingNumber.isDisplay = true;
							city.isDisplay = true;
							financialInstitutionName.isDisplay = true;
							financialInstitutionAccount.isDisplay = true;
							state.isDisplay = true;
							bankAddress.isDisplay = true;
						} else {
							bankRoutingNumber.isDisplay = true;
							interBankRoutingNumber.isDisplay = false;
							city.isDisplay = false;
							financialInstitutionName.isDisplay = false;
							financialInstitutionAccount.isDisplay = false;
							state.isDisplay = false;
							bankAddress.isDisplay = false;
						}
						var populatedDate = currentRecord.getValue("custpage_dom_wire_date");
						if (!populatedDate) {
							currentRecord.setValue({
								fieldId: "custpage_dom_wire_date",
								value: currentDate,
								ignoreFieldChange: true,
							});
						}
					} else if (buttonFilter == 'REAL_TIME_PAYMENTS') { //rutuja start
						// var field = currentRecord.getValue("custpage_dom_us_credit_inter_bank");
						var bankRoutingNumber = currentRecord.getField({
							fieldId: 'custpage_rtp_bank_routing_number'
						});
						// var interBankRoutingNumber = currentRecord.getField({
						// 	fieldId: 'custpage_inter_bank_routing_number'
						// });
						// var city = currentRecord.getField({
						// 	fieldId: 'custpage_city'
						// });
						// var financialInstitutionName = currentRecord.getField({
						// 	fieldId: 'custpage_financial_institution_name'
						// });
						// var financialInstitutionAccount = currentRecord.getField({
						// 	fieldId: 'custpage_finint_account'
						// });
						// var state = currentRecord.getField({
						// 	fieldId: 'custpage_state'
						// });
						// var bankAddress = currentRecord.getField({
						// 	fieldId: 'custpage_bank_address'
						// });
						// if (field == 'inter_bank') {
						// 	bankRoutingNumber.isDisplay = false;
						// 	interBankRoutingNumber.isDisplay = true;
						// 	city.isDisplay = true;
						// 	financialInstitutionName.isDisplay = true;
						// 	financialInstitutionAccount.isDisplay = true;
						// 	state.isDisplay = true;
						// 	bankAddress.isDisplay = true;
						// } else {
						// 	bankRoutingNumber.isDisplay = true;
						// 	interBankRoutingNumber.isDisplay = false;
						// 	city.isDisplay = false;
						// 	financialInstitutionName.isDisplay = false;
						// 	financialInstitutionAccount.isDisplay = false;
						// 	state.isDisplay = false;
						// 	bankAddress.isDisplay = false;
						// }
						var populatedDate = currentRecord.getValue("custpage_rtp_wire_date");
						if (!populatedDate) {
							currentRecord.setValue({
								fieldId: "custpage_rtp_wire_date",
								value: currentDate,
								ignoreFieldChange: true,
							});
						}
					}
					//rutuja end
					else if (buttonFilter == 'FOREIGN_WIRES') {
						var amountToBeSent = document.getElementById("tr_fg_custpage_wire_amount_group");
						amountToBeSent.style.display = "flex";
						amountToBeSent.style.flexDirection = "column";
						const secondTdAmount = amountToBeSent.querySelector('td:nth-child(2)');
						secondTdAmount.style.paddingLeft = '8px';
						secondTdAmount.style.width = '100%';

						var countryRestrictions = "";

						var editMode = currentRecord.getValue({ fieldId: 'custpage_mode' });
						if (!editMode) {
							var chipOrUID = currentRecord.getField({
								fieldId: 'custpage_for_chip_or_uid'
							});
							chipOrUID.isDisplay = false;

							var chipdsHtmlId = document.getElementById("custpage_chips_uid");
							chipdsHtmlId.style.display = "none";

							var purposeCode = currentRecord.getField({
								fieldId: 'custpage_for_purpose_code'
							});
							purposeCode.isMandatory = false;
							purposeCode.isDisplay = false;

							var subPurposeCode = currentRecord.getField({
								fieldId: 'custpage_for_sub_purpose_code'
							});
							purposeCode.isMandatory = false;
							subPurposeCode.isDisplay = false;

							var routingCode = currentRecord.getField({
								fieldId: 'custpage_for_other_routing_code'
							});
							routingCode.isDisplay = false;
							var accountNumberHtmlId = document.getElementById("custpage_for_account_number_html");
							accountNumberHtmlId.style.display = "none";
						} else {
							var countryCode = currentRecord.getValue("custpage_for_dest_country");
							if (countryCode) {
								var reqUrl = url.resolveScript({
									scriptId: 'customscript_citiintegrator_ns_ss_cntres',
									deploymentId: 'customdeploy_citiintegrator_ns_ss_cntres',
									returnExternalUrl: false,
									params: {
										'countryCode': countryCode
									}
								});

								var response = https.request({
									method: https.Method.GET,
									url: reqUrl
								});
								var countryRestrResponse = response.body.split("_");
								if (countryRestrResponse[0] == "Session Expired") {
									//alert(countryRestrResponse[0]);

									window.onbeforeunload = null;
									var urlString = url.resolveScript({
										scriptId: "customscript_citiintegrator_ns_ss_logpge",
										deploymentId: "customdeploy_citiintegrator_ns_ss_logpge"
									});
									window.open(urlString, "_self");
									return false;
								}

								countryRestrResponse = JSON.parse(countryRestrResponse.toString());
								if (countryRestrResponse && countryRestrResponse.code == 500 || countryRestrResponse && countryRestrResponse.code == 400) {
									alert(countryRestrResponse.message);
									currentRecord.setValue({
										fieldId: "custpage_for_dest_country",
										value: '',
										ignoreFieldChange: true,
									});
									return false;
								} else {
									countryRestrictions = countryRestrResponse;
								}

								if (countryRestrictions.accountFormat != "") {
									currentRecord.setValue({
										fieldId: "custpage_for_account_number_format",
										value: countryRestrictions.accountFormat,
										ignoreFieldChange: true,
									});
								} else {
									currentRecord.setValue({
										fieldId: "custpage_for_account_number_format",
										value: "",
										ignoreFieldChange: true,
									});
								}

								if (countryRestrictions.ibanOtherCountryFormat != "") {
									currentRecord.setValue({
										fieldId: "custpage_for_iban_other_format",
										value: countryRestrictions.ibanOtherCountryFormat,
										ignoreFieldChange: true,
									});
								} else {
									currentRecord.setValue({
										fieldId: "custpage_for_iban_other_format",
										value: "",
										ignoreFieldChange: true,
									});
								}

								if (countryRestrictions.accountMaxLength != "") {
									currentRecord.setValue({
										fieldId: "custpage_for_account_number_max_length",
										value: countryRestrictions.accountMaxLength,
										ignoreFieldChange: true,
									});
								} else {
									currentRecord.setValue({
										fieldId: "custpage_for_account_number_max_length",
										value: "",
										ignoreFieldChange: true,
									});
								}

								var routingCode = currentRecord.getField({
									fieldId: 'custpage_for_other_routing_code'
								});
								if (countryRestrictions.routingCodIndicator == "Y") {
									routingCode.label = countryRestrictions.routingCodLabelValue;
									currentRecord.setValue({
										fieldId: "custpage_for_other_routing_label",
										value: countryRestrictions.routingCodLabelValue,
										ignoreFieldChange: true,
									});
									routingCode.isDisplay = true;
								} else {
									routingCode.isDisplay = false;
								}
								puposeAndSubPurposeCode(countryRestrictions, countryCode, currentRecord);
								if (countryRestrictions.accountLabelValue != "IBAN") {
									var accountNumberHtmlId = document.getElementById("custpage_for_account_number_html");
									accountNumberHtmlId.style.display = "none";
								}
							}
						}

						var populatedDate = currentRecord.getValue("custpage_for_wire_date");
						if (!populatedDate) {
							currentRecord.setValue({
								fieldId: "custpage_for_wire_date",
								value: currentDate,
								ignoreFieldChange: true,
							});
						}
						if ((editMode) && (countryRestrictions.accountLabelValue != "IBAN")) {
							var accountNumberHtmlId = document.getElementById("custpage_for_account_number_html");
							accountNumberHtmlId.style.display = "none";
						}
					} else {
						var populatedDate = currentRecord.getValue("custpage_inter_trans_date");
						if (!populatedDate) {
							currentRecord.setValue({
								fieldId: "custpage_inter_trans_date",
								value: currentDate,
								ignoreFieldChange: true,
							});
						}
					}
				}
				jQuery('.page-title-menu .ns-menu > .ns-menuitem:not(.uir-page-search__highlight--default)').hide();

			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		function alignRightInRow(rowId) {
			var row = document.getElementById(rowId);

			if (row) {
				var cells = row.getElementsByTagName('td');

				for (var i = 0; i < cells.length; i++) {
					var cell = cells[i];
					if (cell.textContent.trim().startsWith('$') || cell.textContent.trim().startsWith('-$')) {
						cell.style.textAlign = 'right';
						cell.style.setProperty('padding-right', '19px', 'important');
					}
					else if (i === 0) {
						cell.style.textAlign = 'center';
					}
					else {
						cell.style.textAlign = 'left';
					}
				}
			}
		}


		function switchUser(id) {
			try {
				localStorage.setItem("userId", id);
				var options = {
					title: "Log Out",
					message: "Do you want to log out from Citi Integrator?",
					buttons: [
						{ label: 'Ok', value: 2 },
						{ label: 'Cancel', value: 1 }
					]
				};

				dialog.confirm(options).then(success).catch(failure);

			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}
		function failure(reason) {
			console.log("Failure: " + reason);
		}

		function success(result) {
			try {
				if (result) {
					var reqUrl = url.resolveScript({
						scriptId: 'customscript_citiintegrator_ns_ss_revtok',
						deploymentId: 'customdeploy_citiintegrator_ns_ss_revtok',
						returnExternalUrl: false
					});

					var response = https.request({
						method: https.Method.GET,
						url: reqUrl
					});

					var id = localStorage.getItem("userId");
					record.submitFields({
						type: 'customrecord_citiintegrator_ns_iframetok',
						id: id,
						values: {
							custrecord_citiintegrator_ns_avlbuscodes: "",
							custrecord_citiintegrator_ns_buscode: "",
							custrecord_citiintegrator_ns_entitlement: "",
							//custrecord_citiintegrator_ns_netsuiteusr: "",
							custrecord_citiintegrator_ns_accexpireat: "",
							custrecord_citiintegrator_ns_refexpireat: "",
							custrecord_citiintegrator_ns_iframacctok: "",
							custrecord_citiintegrator_ns_iframreftok: "",
							custrecord_citiintegrator_ns_privatekey: "",
							custrecord_citiintegrator_ns_publickey: "",
							custrecord_citiintegrator_ns_usercode: ""
						},
						options: {
							enableSourcing: false,
							ignoreMandatoryFields: true
						}
					});
					window.onbeforeunload = null;
					//Send the created object to the Suitelet (Invoice Payment Request)
					var urlString = url.resolveScript({
						scriptId: "customscript_citiintegrator_ns_ss_logpge",
						deploymentId: "customdeploy_citiintegrator_ns_ss_logpge"
					});
					window.open(urlString, "_self");
				}


			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		function fieldChanged(context) {
			debugger;
			try {
				var regexNumber = /^[0-9]+$/;
				var regexAmount = /^\d+(\.\d{1,2})?$/;
				var regexDefaultAccount = /^\d+$/;
				var htmlPattern = /<\/?[a-z][\s\S]*/i; // Umar has updated for VA issue - V3 Case1
				var currentRecord = context.currentRecord;
				var fieldName = context.fieldId;
				console.log('fieldName', fieldName);
				//Umar added
				//Foreign Wires Addresses.
				var for_addr1 = currentRecord.getValue({ fieldId: "custpage_for_address_one" });
				var for_addr2 = currentRecord.getValue({ fieldId: "custpage_for_address_two" });
				var for_city = currentRecord.getValue({ fieldId: "custpage_for_city" });
				// Domestic Wires Addresses.
				var dom_addr1 = currentRecord.getValue({ fieldId: "custpage_dom_address_one" });
				var dom_addr2 = currentRecord.getValue({ fieldId: "custpage_dom_address_two" });
				var dom_city = currentRecord.getValue({ fieldId: "custpage_dom_city" });

				// var domCity = currentRecord.getValue("custpage_dom_city");
				// var addressOne = currentRecord.getValue("custpage_dom_address_one");
				// var addressTwo = currentRecord.getValue("custpage_dom_address_two");

				if (fieldName == 'custpage_for_address_one' && for_addr1.length > 33) { // Umar added the condition to limit upto 33 characters.
					alert('Address line 1 exceeds the maximum allowed 33 Characters.');
					currentRecord.setValue({
						fieldId: "custpage_for_address_one",
						value: '',
						ignoreFieldChange: true,
					});

				}
				if (fieldName == 'custpage_for_address_two' && for_addr2.length > 33) { // Umar added the condition to limit upto 33 characters.
					alert('Address line 2 exceeds the maximum allowed 33 Characters.');
					currentRecord.setValue({
						fieldId: "custpage_for_address_two",
						value: '',
						ignoreFieldChange: true,
					});

				}
				if (fieldName == 'custpage_for_city' && for_city.length > 30) { // Umar added the condition to limit upto 30 characters.
					alert('City exceeds the maximum allowed 30 Characters.');
					currentRecord.setValue({
						fieldId: "custpage_for_city",
						value: '',
						ignoreFieldChange: true,
					});
				}
				//End -- Umar added
				//Start - Umar has updated the code on 8th Sept 26 for the VA issue - H3 case1
				if (fieldName == 'custpage_dom_beneficiary_name' || fieldName == 'custpage_for_beneficiary_name' || fieldName == 'custpage_dom_address_one' || fieldName == 'custpage_dom_address_one' || fieldName == 'custpage_dom_address_one' || fieldName == 'custpage_dom_address_two' || fieldName == 'custpage_dom_city' || fieldName == 'custpage_for_address_one' || fieldName == 'custpage_for_address_two' || fieldName == 'custpage_for_city' || fieldName == 'custpage_dom_spec_instr_one' || fieldName == 'custpage_dom_spec_instr_two' || fieldName == 'custpage_dom_spec_instr_three' || fieldName == 'custpage_for_spec_instr_one' || fieldName == 'custpage_for_spec_instr_two' || fieldName == 'custpage_for_spec_instr_three' || fieldName == 'custpage_dom_cust_refer_number' || fieldName == 'custpage_for_cust_refer_number' || fieldName == 'custpage_dom_add_refers' || fieldName == 'custpage_for_add_refers' || fieldName == 'custpage_dom_add_description' || fieldName == 'custpage_rtp_add_description' || fieldName == 'custpage_for_bank_name' || fieldName == 'custpage_for_bank_city' || fieldName == 'custpage_for_bank_address' || fieldName == 'custpage_bank_address' || fieldName == 'custpage_dom_phone_number' || fieldName == 'custpage_for_phone_number' || fieldName == 'custpage_inter_trans_desp') {
					var fieldValue = currentRecord.getValue({
						fieldId: fieldName,
					});
					if (htmlPattern.test(fieldValue)) { alert('Please enter a valid text'); currentRecord.setValue(fieldName, '', true) }
				}
				//End
				if (fieldName == 'custpage_dom_us_credit_inter_bank') {
					var field = currentRecord.getValue("custpage_dom_us_credit_inter_bank");
					var bankRoutingNumber = currentRecord.getField({
						fieldId: 'custpage_bank_routing_number'
					});
					var interBankRoutingNumber = currentRecord.getField({
						fieldId: 'custpage_inter_bank_routing_number'
					});
					var city = currentRecord.getField({
						fieldId: 'custpage_city'
					});
					var financialInstitutionName = currentRecord.getField({
						fieldId: 'custpage_financial_institution_name'
					});
					var financialInstitutionAccount = currentRecord.getField({
						fieldId: 'custpage_finint_account'
					});
					var state = currentRecord.getField({
						fieldId: 'custpage_state'
					});
					var bankAddress = currentRecord.getField({
						fieldId: 'custpage_bank_address'
					});
					if (field == 'us_bank') {
						bankRoutingNumber.isDisplay = true;
						interBankRoutingNumber.isDisplay = false;
						city.isDisplay = false;
						financialInstitutionName.isDisplay = false;
						financialInstitutionAccount.isDisplay = false;
						state.isDisplay = false;
						bankAddress.isDisplay = false;
						currentRecord.setValue({
							fieldId: "custpage_inter_bank_routing_number",
							value: '',
							ignoreFieldChange: true,
						});
						currentRecord.setValue({
							fieldId: "custpage_financial_institution_name",
							value: '',
							ignoreFieldChange: true,
						});
						currentRecord.setValue({
							fieldId: "custpage_finint_account",
							value: '',
							ignoreFieldChange: true,
						});
						currentRecord.setValue({
							fieldId: "custpage_city",
							value: '',
							ignoreFieldChange: true,
						});
						currentRecord.setValue({
							fieldId: "custpage_state",
							value: '',
							ignoreFieldChange: true,
						});
						currentRecord.setValue({
							fieldId: "custpage_bank_address",
							value: '',
							ignoreFieldChange: true,
						});
					} else {
						bankRoutingNumber.isDisplay = false;
						interBankRoutingNumber.isDisplay = true;
						city.isDisplay = true;
						financialInstitutionName.isDisplay = true;
						financialInstitutionAccount.isDisplay = true;
						state.isDisplay = true;
						bankAddress.isDisplay = true;
						currentRecord.setValue({
							fieldId: "custpage_bank_routing_number",
							value: '',
							ignoreFieldChange: true,
						});
					}
					var abaNumberDetails = document.getElementById("custpage_bank_routing_info");
					if (abaNumberDetails) {
						abaNumberDetails.style.display = "none";
					}
				}
				else if (fieldName == 'custpage_for_dest_templates') {
					var selectedValue = currentRecord.getValue({
						fieldId: 'custpage_for_dest_templates',
					});
					var selectedText = currentRecord.getText({
						fieldId: 'custpage_for_dest_templates',
					});
					// Now you can store these in variables or use them as needed
					console.log('Selected Value', selectedValue);
					console.log('Selected Text', selectedText);

					// For demonstration, you can show a message
					var paramObj = {};
					paramObj.wireFilter = 'DOMESTIC_WIRES'
					paramObj.fromselectedtext = selectedText;
					paramObj.fromselectedvalue = selectedValue;
					//if (selectedValue) paramObj.fromselectedvalue = selectedValue;
					//if (selectedText) paramObj.fromselectedtext = selectedText;
					window.onbeforeunload = null;
					var urlString = url.resolveScript({
						scriptId: 'customscript_citiintegrator_ns_ss_payini',  // account balance sheet suit
						deploymentId: 'customdeploy_citiintegrator_ns_ss_payini',
						params: paramObj,
					});
					window.open(urlString, "_self");

				} else if (fieldName == 'custpage_for_foreign_templates') {
					var selectedValue = currentRecord.getValue({
						fieldId: 'custpage_for_foreign_templates',
					});
					var selectedText = currentRecord.getText({
						fieldId: 'custpage_for_foreign_templates',
					});
					// Now you can store these in variables or use them as needed
					console.log('Selected Value', selectedValue);
					console.log('Selected Text', selectedText);

					// For demonstration, you can show a message
					var paramObj = {};
					paramObj.wireFilter = 'FOREIGN_WIRES'
					paramObj.fromselectedtext = selectedText;
					paramObj.fromselectedvalue = selectedValue;
					//if (selectedValue) paramObj.fromselectedvalue = selectedValue;
					//if (selectedText) paramObj.fromselectedtext = selectedText;
					window.onbeforeunload = null;
					var urlString = url.resolveScript({
						scriptId: 'customscript_citiintegrator_ns_ss_payini',  // account balance sheet suit
						deploymentId: 'customdeploy_citiintegrator_ns_ss_payini',
						params: paramObj,
					});
					window.open(urlString, "_self");

				}
				else if (fieldName == 'custpage_for_dest_country') {
					var countryCode = currentRecord.getValue("custpage_for_dest_country");

					if (countryCode == "") {
						alert("Select a country to proceed.");
						return false;
					}

					var reqUrl = url.resolveScript({
						scriptId: 'customscript_citiintegrator_ns_ss_cntres',
						deploymentId: 'customdeploy_citiintegrator_ns_ss_cntres',
						returnExternalUrl: false,
						params: {
							'countryCode': countryCode
						}
					});

					var response = https.request({
						method: https.Method.GET,
						url: reqUrl
					});
					var countryRestrResponse = response.body.split("_");
					if (countryRestrResponse[0] == "Session Expired") {
						//alert(countryRestrResponse[0]);

						window.onbeforeunload = null;
						var urlString = url.resolveScript({
							scriptId: "customscript_citiintegrator_ns_ss_cntres",
							deploymentId: "customdeploy_citiintegrator_ns_ss_cntres"
						});
						window.open(urlString, "_self");
						return false;
					}
					var countryRestrictions = "";
					countryRestrResponse = JSON.parse(countryRestrResponse.toString());
					if (countryRestrResponse && countryRestrResponse.code == 500 || countryRestrResponse && countryRestrResponse.code == 400) {
						alert(countryRestrResponse.message);
						currentRecord.setValue({
							fieldId: "custpage_for_dest_country",
							value: '',
							ignoreFieldChange: true,
						});
						return false;
					} else {
						countryRestrictions = countryRestrResponse;
					}

					var chipOrUID = currentRecord.getField({
						fieldId: 'custpage_for_chip_or_uid'
					});
					var urlId = document.getElementById("custpage_chips_uid");
					if (countryRestrictions.chipsIndicator == "Y") {
						chipOrUID.isDisplay = true;
						urlId.style.display = "block";
					} else {
						chipOrUID.isDisplay = false;
						urlId.style.display = "none";
					}

					if (countryRestrictions.accountFormat != "") {
						currentRecord.setValue({
							fieldId: "custpage_for_account_number_format",
							value: countryRestrictions.accountFormat,
							ignoreFieldChange: true,
						});
					} else {
						currentRecord.setValue({
							fieldId: "custpage_for_account_number_format",
							value: "",
							ignoreFieldChange: true,
						});
					}

					if (countryRestrictions.ibanOtherCountryFormat != "") {
						currentRecord.setValue({
							fieldId: "custpage_for_iban_other_format",
							value: countryRestrictions.ibanOtherCountryFormat,
							ignoreFieldChange: true,
						});
					} else {
						currentRecord.setValue({
							fieldId: "custpage_for_iban_other_format",
							value: "",
							ignoreFieldChange: true,
						});
					}

					if (countryRestrictions.accountMaxLength != "") {
						currentRecord.setValue({
							fieldId: "custpage_for_account_number_max_length",
							value: countryRestrictions.accountMaxLength,
							ignoreFieldChange: true,
						});
					} else {
						currentRecord.setValue({
							fieldId: "custpage_for_account_number_max_length",
							value: "",
							ignoreFieldChange: true,
						});
					}

					var accountNumberField = currentRecord.getField({
						fieldId: 'custpage_for_account_number'
					});
					var accountNumberLabel = countryRestrictions.accountLabelValue;
					if (accountNumberLabel != "") {
						accountNumberField.label = "Account Number (" + accountNumberLabel + ")";
					} else {
						accountNumberField.label = "Account Number";
					}

					var accountNumberHtmlId = document.getElementById("custpage_for_account_number_html");
					if (countryRestrictions.ibanIndicator != "Y") {
						accountNumberHtmlId.style.display = "none";
					} else {
						accountNumberHtmlId.style.display = "inline-flex";
						if (accountNumberLabel != "") {
							var details = "Please use care to enter the correct " + accountNumberLabel + " in the Account Number field. Not using a correct " + accountNumberLabel + " may result in delayed or rejected wires and/or additional processing fees."
							document.getElementById("custpage_for_acc_number_details_html").innerText = details;
						}
					}

					var routingCode = currentRecord.getField({
						fieldId: 'custpage_for_other_routing_code'
					});
					if (countryRestrictions.routingCodIndicator == "Y") {
						routingCode.label = countryRestrictions.routingCodLabelValue;
						currentRecord.setValue({
							fieldId: "custpage_for_other_routing_label",
							value: countryRestrictions.routingCodLabelValue,
							ignoreFieldChange: true,
						});
						routingCode.isDisplay = true;
					} else {
						routingCode.isDisplay = false;
					}

					puposeAndSubPurposeCode(countryRestrictions, countryCode, currentRecord);

					var bankAddress = currentRecord.getField({
						fieldId: 'custpage_for_bank_address'
					});
					var bankCity = currentRecord.getField({
						fieldId: 'custpage_for_bank_city'
					});
					var bankName = currentRecord.getField({
						fieldId: 'custpage_for_bank_name'
					});

					bankAddress.isDisplay = true;
					bankCity.isDisplay = true;
					bankName.isDisplay = true;

					currentRecord.setValue({
						fieldId: "custpage_for_bank_address",
						value: '',
						ignoreFieldChange: true,
					});
					currentRecord.setValue({
						fieldId: "custpage_for_bank_city",
						value: '',
						ignoreFieldChange: true,
					});
					currentRecord.setValue({
						fieldId: "custpage_for_bank_name",
						value: '',
						ignoreFieldChange: true,
					});

					currentRecord.setValue({
						fieldId: "custpage_for_swift_or_bic",
						value: '',
						ignoreFieldChange: true,
					});

					currentRecord.setValue({
						fieldId: "custpage_for_chip_or_uid",
						value: '',
						ignoreFieldChange: true,
					});

					currentRecord.setValue({
						fieldId: "custpage_for_other_routing_code",
						value: '',
						ignoreFieldChange: true,
					});

					currentRecord.setValue({
						fieldId: "custpage_for_account_number",
						value: '',
						ignoreFieldChange: true,
					});

					var bankDetailsHtmlId = document.getElementById("custpage_bank_details");
					if (bankDetailsHtmlId) {
						bankDetailsHtmlId.style.display = "none";
					}
				} else if (fieldName == "custpage_for_swift_or_bic") {
					var swiftBic = currentRecord.getValue("custpage_for_swift_or_bic");
					var countryCode = currentRecord.getValue("custpage_for_dest_country");

					if (countryCode == "") {
						alert("Select a country to proceed.");
						var setValueVar = currentRecord.setValue({
							fieldId: "custpage_for_swift_or_bic",
							value: '',
							ignoreFieldChange: true,
						});
						return false;
					}

					if (swiftBic.trim() === "") {
						alert("Please enter SWIFT/BIC to proceed.");
						return false;
					}

					var routeCodeReqUrl = url.resolveScript({
						scriptId: 'customscript_citiintegrator_ns_ss_rotcod',
						deploymentId: 'customdeploy_citiintegrator_ns_ss_rotcod',
						returnExternalUrl: false,
						params: {
							'routeType': 'SWIFT_BIC_CODE',
							'routeCode': swiftBic,
							'countryCode': countryCode
						}
					});

					var response = https.request({
						method: https.Method.GET,
						url: routeCodeReqUrl
					});
					console.log("response1395", response);
					var routeCodeResponse = response.body.split("_");
					if (routeCodeResponse[0] == "Session Expired") {
						//alert(routeCodeResponse[0]);

						window.onbeforeunload = null;
						var urlString = url.resolveScript({
							scriptId: "customscript_citiintegrator_ns_ss_logpge",
							deploymentId: "customdeploy_citiintegrator_ns_ss_logpge"
						});
						window.open(urlString, "_self");
						return false;
					}
					updateFields(routeCodeResponse, currentRecord, "SWIFT/BIC", "custpage_for_swift_or_bic");
				} else if (fieldName == "custpage_for_chip_or_uid") {
					var chipOrUID = currentRecord.getValue("custpage_for_chip_or_uid");
					var countryCode = currentRecord.getValue("custpage_for_dest_country");

					if (countryCode == "") {
						alert("Select a country to proceed.");
						var setValueVar = currentRecord.setValue({
							fieldId: "custpage_for_chip_or_uid",
							value: '',
							ignoreFieldChange: true,
						});
						return false;
					}

					if (chipOrUID.trim() === "") {
						return false;
					}

					var routeCodeReqUrl = url.resolveScript({
						scriptId: 'customscript_citiintegrator_ns_ss_rotcod',
						deploymentId: 'customdeploy_citiintegrator_ns_ss_rotcod',
						returnExternalUrl: false,
						params: {
							'routeType': 'OTHER_ROUTING_CODE',
							'routeCode': chipOrUID,
							'countryCode': countryCode,
							'otherRouteName': 'UID'
						}
					});

					var response = https.request({
						method: https.Method.GET,
						url: routeCodeReqUrl
					});
					var routeCodeResponse = response.body.split("_");
					if (routeCodeResponse[0] == "Session Expired") {
						//alert(routeCodeResponse[0]);

						window.onbeforeunload = null;
						var urlString = url.resolveScript({
							scriptId: "customscript_citiintegrator_ns_ss_logpge",
							deploymentId: "customdeploy_citiintegrator_ns_ss_logpge"
						});
						window.open(urlString, "_self");
						return false;
					}
					updateFields(routeCodeResponse, currentRecord, "CHIP/UID", "custpage_for_chip_or_uid");
				} else if (fieldName == "custpage_for_other_routing_code") {
					var otherRoutingCode = currentRecord.getValue("custpage_for_other_routing_code");
					var countryCode = currentRecord.getValue("custpage_for_dest_country");
					var otherRoutingCodeLabel = currentRecord.getValue("custpage_for_other_routing_label");

					if (countryCode == "") {
						alert("Select a country to proceed.");
						currentRecord.setValue({
							fieldId: "custpage_for_other_routing_code",
							value: '',
							ignoreFieldChange: true,
						});
						return false;
					}

					if (otherRoutingCode.trim() === "") {
						return false;
					}

					var routeCodeReqUrl = url.resolveScript({
						scriptId: 'customscript_citiintegrator_ns_ss_rotcod',
						deploymentId: 'customdeploy_citiintegrator_ns_ss_rotcod',
						returnExternalUrl: false,
						params: {
							'routeType': "OTHER_ROUTING_CODE",
							'routeCode': otherRoutingCode,
							'countryCode': countryCode
						}
					});

					var response = https.request({
						method: https.Method.GET,
						url: routeCodeReqUrl
					});
					var routeCodeResponse = response.body.split("_");
					if (routeCodeResponse[0] == "Session Expired") {
						//alert(routeCodeResponse[0]);

						window.onbeforeunload = null;
						var urlString = url.resolveScript({
							scriptId: "customscript_citiintegrator_ns_ss_logpge",
							deploymentId: "customdeploy_citiintegrator_ns_ss_logpge"
						});
						window.open(urlString, "_self");
						return false;
					}
					updateFields(routeCodeResponse, currentRecord, otherRoutingCodeLabel, "custpage_for_other_routing_code");
				} else if (fieldName == "custpage_for_intr_bank_hold_no"
					|| fieldName == "custpage_bank_routing_number"
					|| fieldName == "custpage_inter_bank_routing_number" || fieldName == "custpage_rtp_bank_routing_number") { //rutuja added || fieldName == "custpage_rtp_bank_routing_number"

					var abaNumber;
					var intrBankHoldNoFor = currentRecord.getValue("custpage_for_intr_bank_hold_no");
					var bankRoutingNoDom = currentRecord.getValue("custpage_bank_routing_number");
					var intrBankRoutingNoFor = currentRecord.getValue("custpage_inter_bank_routing_number");
					var bankRoutingNoRtp = currentRecord.getValue("custpage_rtp_bank_routing_number"); //rutuja 


					if (intrBankHoldNoFor && intrBankHoldNoFor != "") {
						abaNumber = intrBankHoldNoFor;
					} else if (bankRoutingNoDom && bankRoutingNoDom != "") {
						abaNumber = bankRoutingNoDom;
					} else if (bankRoutingNoRtp && bankRoutingNoRtp != "") { //rutuja 
						abaNumber = bankRoutingNoRtp;
					} else {
						abaNumber = intrBankRoutingNoFor;
					}

					if (!regexNumber.test(abaNumber) || abaNumber.length != 9) {
						console.log('i am here 1922');

						alert("Please provide valid Routing Number or contact the bank.");
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});

						var bankRoutingHtmlId = document.getElementById("custpage_bank_routing_info");
						if (bankRoutingHtmlId) {
							bankRoutingHtmlId.style.display = "none";
						}
						return false;
					}

					if (fieldName == "custpage_rtp_bank_routing_number") { //rutuja start
						var routeCodeReqUrl = url.resolveScript({
							scriptId: 'customscript_citiintegrator_ns_ss_aba_in',
							deploymentId: 'customdeploy_citiintegrator_ns_ss_aba_in',
							returnExternalUrl: false,
							params: {
								'abaNumber': abaNumber
							}
						});

					} else {
						var routeCodeReqUrl = url.resolveScript({
							scriptId: 'customscript_citiintegrator_ns_ss_abanum',
							deploymentId: 'customdeploy_citiintegrator_ns_ss_abanum',
							returnExternalUrl: false,
							params: {
								'abaNumber': abaNumber
							}
						});
					}
					//rutuja end


					var response = https.request({
						method: https.Method.GET,
						url: routeCodeReqUrl
					});
					var abaNumberResponse = response.body.split("_");
					if (abaNumberResponse[0] == "Session Expired") {
						//alert(abaNumberResponse[0]);

						window.onbeforeunload = null;
						var urlString = url.resolveScript({
							scriptId: "customscript_citiintegrator_ns_ss_logpge",
							deploymentId: "customdeploy_citiintegrator_ns_ss_logpge"
						});
						window.open(urlString, "_self");
						return false;
					}
					var abaDetails = "";
					var abaNumberResponse = JSON.parse(abaNumberResponse[0]);
					if (abaNumberResponse && abaNumberResponse.code == 500) {
						console.log('i am here 1965');

						alert("Please provide valid Routing Number or contact the bank.");
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});
						return false;
					} else if (abaNumberResponse && abaNumberResponse.code == 400) {
						alert(abaNumberResponse.message);
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});
						return false;
					} else {
						abaDetails = abaNumberResponse.abaDetails;
					}
					if (fieldName == "custpage_rtp_bank_routing_number") { //rutuja start
						if (abaDetails && abaDetails.length == 1) {
							var bankName = abaDetails[0].bankName;
							// var bankAddr = abaDetails[0].bankAddr;
							var bankCd = abaDetails[0].bankCd;
							var abaNumber = abaDetails[0].abaNumber;
							// var bankState = abaDetails[0].bankState;
							var abaNumberHTML = bankName;

							currentRecord.setValue({
								fieldId: fieldName,
								value: abaNumber,
								ignoreFieldChange: true,
							});

							currentRecord.setValue({
								fieldId: "custpage_rtp_aba_number_details",
								value: bankName,
								ignoreFieldChange: true,
							});
						}
						else {
							console.log('i am here 2063');

							alert("Please provide valid Routing Number or contact the bank.");
							currentRecord.setValue({
								fieldId: fieldName,
								value: '',
								ignoreFieldChange: true,
							});

							var bankRoutingHtmlId = document.getElementById("custpage_bank_routing_info");
							if (bankRoutingHtmlId) {
								bankRoutingHtmlId.style.display = "none";
							}
							return false;
						}
					}
					//rutuja end
					else {
						if (abaDetails && abaDetails.length == 1) {
							var bankName = abaDetails[0].bankName;
							var bankAddr = abaDetails[0].bankAddr;
							var bankStateName = abaDetails[0].bankStateName;
							var abaNumber = abaDetails[0].abaNumber;
							var bankState = abaDetails[0].bankState;
							var abaNumberHTML = bankName + '<br>' + bankAddr + ', ' + bankStateName;

							currentRecord.setValue({
								fieldId: fieldName,
								value: abaNumber,
								ignoreFieldChange: true,
							});
							if (fieldName == "custpage_for_intr_bank_hold_no") {
								currentRecord.setValue({
									fieldId: "custpage_for_aba_number_details",
									value: "<p id='custpage_bank_routing_info'>" + abaNumberHTML + "<p>",
									ignoreFieldChange: true,
								});

								currentRecord.setValue({
									fieldId: "custpage_for_aba_number_details_hidden",
									value: abaNumberHTML,
									ignoreFieldChange: true,
								});
							} else if (fieldName == "custpage_bank_routing_number") {
								currentRecord.setValue({
									fieldId: "custpage_dom_aba_number_details",
									value: "<p id='custpage_bank_routing_info'>" + abaNumberHTML + "<p>",
									ignoreFieldChange: true,
								});

								currentRecord.setValue({
									fieldId: "custpage_dom_aba_number_details_hidden",
									value: abaNumberHTML,
									ignoreFieldChange: true,
								});
							} else if (fieldName == "custpage_rtp_bank_routing_number") { //rutuja start
								var bankName = abaDetails[0].bankName;
								var bankCd = abaDetails[0].bankCd;
								abaNumberHTML = bankName;

								currentRecord.setValue({
									fieldId: "custpage_rtp_aba_number_details",
									value: bankName,
									ignoreFieldChange: true,
								});

								// currentRecord.setValue({
								// 	fieldId: "custpage_dom_aba_number_details_hidden",
								// 	value: abaNumberHTML,
								// 	ignoreFieldChange: true,
								// });
							}//rutuja end
							else {
								currentRecord.setValue({
									fieldId: "custpage_dom_aba_number_details",
									value: "<p id='custpage_bank_routing_info'>" + abaNumberHTML + "<p>",
									ignoreFieldChange: true,
								});

								currentRecord.setValue({
									fieldId: "custpage_dom_aba_number_details_hidden",
									value: abaNumberHTML,
									ignoreFieldChange: true,
								});
							}
							currentRecord.setValue({
								fieldId: "custpage_dom_dest_bank_name_hidden",
								value: bankName,
								ignoreFieldChange: true
							});
							currentRecord.setValue({
								fieldId: "custpage_dom_dest_bank_addr_hidden",
								value: bankAddr,
								ignoreFieldChange: true
							});
							currentRecord.setValue({
								fieldId: "custpage_dom_dest_bank_state_hidden",
								value: bankState,
								ignoreFieldChange: true
							});
						}
						else {
							console.log('i am here 2063');

							alert("Please provide valid Routing Number or contact the bank.");
							currentRecord.setValue({
								fieldId: fieldName,
								value: '',
								ignoreFieldChange: true,
							});

							var bankRoutingHtmlId = document.getElementById("custpage_bank_routing_info");
							if (bankRoutingHtmlId) {
								bankRoutingHtmlId.style.display = "none";
							}
							return false;
						}
					}
				}
				else if (fieldName == "custpage_dom_wire_amount" ||
					fieldName == "custpage_for_wire_amount" ||
					fieldName == "custpage_inter_amt_to_be_sent" ||
					fieldName == "custpage_rtp_wire_amount"            //rutuja 
				) {
					var amount;
					var domAmount = currentRecord.getValue("custpage_dom_wire_amount");
					var forAmount = currentRecord.getValue("custpage_for_wire_amount");
					var interAmount = currentRecord.getValue("custpage_inter_amt_to_be_sent");
					var rtpAmount = currentRecord.getValue("custpage_rtp_wire_amount"); //rutuja 



					if (domAmount && domAmount != "") {
						amount = domAmount;
					} else if (forAmount && forAmount != "") {
						amount = forAmount;
					} else if (rtpAmount && rtpAmount != "") { //rutuja 
						amount = rtpAmount;
					} else {
						amount = interAmount;
					}
					// remove comma before test for numeric value
					if (amount) // commonly added condition - amount issue CR: 29th aug by rag
					{
						amount = amount.replace(/,/g, '');

						if (!regexAmount.test(amount) || Number(amount) <= 0) {
							alert("Amount should be numeric and greater than 0 & upto 2 decimal is allowed.");
							currentRecord.setValue({
								fieldId: fieldName,
								value: '',
								ignoreFieldChange: true,
							});
							return false;
						}

						if (!amount.includes(".")) {

							amount = amount + ".00";
						}
						if (amount.length > 12) {
							alert("The input exceeds the allowed limit. Please enter a number with up to 12 digits, including 2 decimal places.");

							currentRecord.setValue({
								fieldId: fieldName,
								value: '',
								ignoreFieldChange: true,
							});
							return false;
						}
						// Add commas by raghini
						var parts = amount.toString().split('.');
						parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
						amount = parts.join('.');

						currentRecord.setValue({
							fieldId: fieldName,
							value: amount,
							ignoreFieldChange: true,
						});
						return true;
					}

				} else if (fieldName == "custpage_dom_wire_date" ||
					fieldName == "custpage_for_wire_date" ||
					fieldName == "custpage_inter_trans_date" ||
					fieldName == "custpage_rtp_wire_date"         //rutuja 
				) {
					var date;
					var todaysDate = new Date();
					todaysDate.setHours(0, 0, 0, 0);

					var domDate = currentRecord.getValue("custpage_dom_wire_date");
					var forDate = currentRecord.getValue("custpage_for_wire_date");
					var interDate = currentRecord.getValue("custpage_inter_trans_date");
					var rtpDate = currentRecord.getValue("custpage_rtp_wire_date"); //rutuja 


					if (domDate && domDate != "") {
						date = new Date(domDate);
					} else if (forDate && forDate != "") {
						date = new Date(forDate);
					} else if (rtpDate && rtpDate != "") { //rutuja 
						date = new Date(rtpDate);
					} else {
						date = new Date(interDate);
					}
					if (date && date < todaysDate) {
						alert("Date must be today's date or future date.");
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});
						return false;
					}

					var oneYearAhead = new Date();
					oneYearAhead.setFullYear(todaysDate.getFullYear() + 1);

					if (date > oneYearAhead) {
						alert("Date must be within one year from today's date.");
						currentRecord.setValue({
							fieldId: fieldName,
							value: todaysDate,
							ignoreFieldChange: true,
						});
						return false;
					}
				} else if (fieldName == "custpage_dom_account_number") {
					var domesticAccountNumber = currentRecord.getValue("custpage_dom_account_number");
					if (!regexDefaultAccount.test(domesticAccountNumber)) {
						alert("Please enter valid Account Number.");
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});
						return false;
					}
				} else if (fieldName == "custpage_rtp_account_number") {  //rutuja start
					var RealTimeAccountNumber = currentRecord.getValue("custpage_rtp_account_number");
					if (!regexDefaultAccount.test(RealTimeAccountNumber)) {
						alert("Please enter valid Account Number.");
						currentRecord.setValue({
							fieldId: fieldName,
							value: '',
							ignoreFieldChange: true,
						});
						return false;
					}
				} //rutuja end
				else if (fieldName == "custpage_for_account_number") {
					var foreignAccountNumber = currentRecord.getValue("custpage_for_account_number");
					var accountNumberFormat = currentRecord.getValue("custpage_for_account_number_format");
					var ibanOtherCountryFormat = currentRecord.getValue("custpage_for_iban_other_format");
					var accountNumberMaxLength = currentRecord.getValue("custpage_for_account_number_max_length");

					var format = "";
					if (accountNumberFormat != "") {
						format = accountNumberFormat;
					} else if (ibanOtherCountryFormat != "") {
						format = ibanOtherCountryFormat;
					}
					if (format != "") {
						var regexForeignAccount = new RegExp(format.replace("\\\\", "\\"), "g");

						if (!regexForeignAccount.test(foreignAccountNumber) ||
							(foreignAccountNumber.length > Number(accountNumberMaxLength)) ||
							/[a-z]/.test(foreignAccountNumber)) {   //rutuja 17th sept added ||/[a-z]/.test(foreignAccountNumber)

							alert("Please enter valid Account Number.");
							currentRecord.setValue({
								fieldId: fieldName,
								value: '',
								ignoreFieldChange: true,
							});
							return false;
						}
					}
				}

				return true;
			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		function updateFields(routeCodeResponse, currentRecord, label, fieldId) {
			debugger;
			try {
				var routeCodeDetails;
				var response = "";
				for (var i = 0; i < routeCodeResponse.length; i++) {
					response = response + routeCodeResponse[i];
				}
				var routeCodeJSON = JSON.parse(response.toString());
				console.log("routeCodeJSON1765", routeCodeJSON);
				if (routeCodeJSON && routeCodeJSON.code == 500) {
					alert(label + " - Invalid Routing Code number Provided.")
					currentRecord.setValue({
						fieldId: fieldId,
						value: '',
						ignoreFieldChange: true,
					});
					return false;
				} else if (routeCodeJSON && routeCodeJSON.code == 400) {
					alert(label + " - " + routeCodeJSON.message);
					currentRecord.setValue({
						fieldId: fieldId,
						value: '',
						ignoreFieldChange: true,
					});
					return false;
				} else {
					routeCodeDetails = routeCodeJSON.bankInformation[0];
				}
				console.log("routeCodeDetails1785", routeCodeDetails);
				if (routeCodeDetails) {
					currentRecord.setValue({
						fieldId: "custpage_for_swift_or_bic",
						value: routeCodeDetails.bic,
						ignoreFieldChange: true,
					});

					currentRecord.setValue({
						fieldId: "custpage_for_other_routing_code",
						value: routeCodeDetails.otherRoutingCode,
						ignoreFieldChange: true,
					});

					currentRecord.setValue({
						fieldId: "custpage_for_chip_or_uid",
						value: routeCodeDetails.chips,
						ignoreFieldChange: true,
					});

					currentRecord.setValue({
						fieldId: "custpage_for_dest_country",
						value: routeCodeDetails.countryCode,
						ignoreFieldChange: true,
					});

					var bankAddress = currentRecord.getField({
						fieldId: 'custpage_for_bank_address'
					});
					var bankCity = currentRecord.getField({
						fieldId: 'custpage_for_bank_city'
					});
					var bankName = currentRecord.getField({
						fieldId: 'custpage_for_bank_name'
					});
					bankAddress.isDisplay = false;
					bankCity.isDisplay = false;
					bankName.isDisplay = false;

					var addressDetails = "";
					var address = "";

					if (routeCodeDetails.address1) {
						addressDetails += routeCodeDetails.address1 + ', ';
					}

					if (routeCodeDetails.addressLine2) {
						addressDetails += routeCodeDetails.addressLine2 + ', ';
						address += routeCodeDetails.addressLine2;
					}

					if (routeCodeDetails.addressLine3) {
						addressDetails += routeCodeDetails.addressLine3 + ', ';
						address += (address ? ',' : '') + routeCodeDetails.addressLine3;
					}

					if (routeCodeDetails.addressLine4) {
						addressDetails += routeCodeDetails.addressLine4 + ', ';
						address += (address ? ',' : '') + routeCodeDetails.addressLine4;
					}

					if (!address && routeCodeDetails.address1) {
						address += routeCodeDetails.address1;
					}

					if (addressDetails && addressDetails.slice(-2) === ', ') {
						addressDetails = addressDetails.slice(0, -2);
					}



					var bankDetails = '';

					if (routeCodeDetails.institutionName) {
						bankDetails += routeCodeDetails.institutionName;
					}

					if (addressDetails) {
						console.log("addressDetails" + addressDetails);
						bankDetails += (bankDetails ? ', ' : '') + addressDetails;
					}

					if (routeCodeDetails.city) {
						bankDetails += (bankDetails ? ', ' : '') + routeCodeDetails.city;
					}

					if (routeCodeDetails.countryName) {
						bankDetails += (bankDetails ? ', ' : '') + routeCodeDetails.countryName;
					}

					console.log("bankDetails1848", bankDetails)
					var displayBankDetails = "<br><p id='custpage_bank_details'>" + bankDetails + "<p>";

					currentRecord.setValue({
						fieldId: "custpage_for_bank_details",
						value: displayBankDetails,
						ignoreFieldChange: true,
					});

					currentRecord.setValue({
						fieldId: "custpage_for_bank_details_hidden",
						value: bankDetails,
						ignoreFieldChange: true,
					});

					currentRecord.setValue({
						fieldId: "custpage_for_bank_name",
						value: routeCodeDetails.institutionName,
						ignoreFieldChange: true,
					});

					currentRecord.setValue({
						fieldId: "custpage_for_bank_address",
						value: address,
						ignoreFieldChange: true,
					});

					currentRecord.setValue({
						fieldId: "custpage_for_bank_city",
						value: routeCodeDetails.city,
						ignoreFieldChange: true,
					});
				}
			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		function puposeAndSubPurposeCode(countryRestrictions, countryCode, currentRecord) {
			debugger;
			try {
				if (countryRestrictions.purposeCodeIndicator == "Y") {
					var puposeCodeReqUrl = url.resolveScript({
						scriptId: 'customscript_citiintegrator_ns_ss_purcod',
						deploymentId: 'customdeploy_citiintegrator_ns_ss_purcod',
						returnExternalUrl: false,
						params: {
							'countryCode': countryCode
						}
					});

					var response = https.request({
						method: https.Method.GET,
						url: puposeCodeReqUrl
					});
					var purposeCodeResponse = response.body.split("_");
					if (purposeCodeResponse[0] == "Session Expired") {
						//alert(purposeCodeResponse[0]);

						window.onbeforeunload = null;
						var urlString = url.resolveScript({
							scriptId: "customscript_citiintegrator_ns_ss_logpge",
							deploymentId: "customdeploy_citiintegrator_ns_ss_logpge"
						});
						window.open(urlString, "_self");
						return false;
					}

					var purposeCodeDetails = "";
					var subPurposeCodeDetails = "";
					var response = "";
					for (var i = 0; i < purposeCodeResponse.length; i++) {
						response = response + purposeCodeResponse[i];
					}
					if (response != "") {
						purposeCodeResponse = JSON.parse(response.toString());
					}
					if (purposeCodeResponse && purposeCodeResponse.code == 500) {
						purposeCodeDetails = "";
						subPurposeCodeDetails = "";
					} else if (purposeCodeResponse && purposeCodeResponse.code == 400) {
						purposeCodeDetails = "";
						subPurposeCodeDetails = "";
					} else {
						if (purposeCodeResponse.purposeCodeInfos && purposeCodeResponse.purposeCodeInfos != "") {
							purposeCodeDetails = purposeCodeResponse.purposeCodeInfos;
						}
						if (purposeCodeResponse.subPurposeCodeInfos && purposeCodeResponse.subPurposeCodeInfos != "") {
							subPurposeCodeDetails = purposeCodeResponse.subPurposeCodeInfos;
						}
					}

					if (purposeCodeDetails) {
						var purposeCodeField = currentRecord.getField({
							fieldId: 'custpage_for_purpose_code'
						});
						var textPurposeCode = currentRecord.getValue({
							fieldId: 'custpage_for_purpose_code_text'
						});
						purposeCodeField.isMandatory = true;
						purposeCodeField.isDisplay = true;
						currentRecord.setValue({
							fieldId: "custpage_for_purpose_code_check",
							value: true,
							ignoreFieldChange: true,
						});

						var menu = document.getElementsByClassName("uir-tooltip-content");
						var dropdownToggle = document.getElementById("custpage_for_purpose_code_fs")
						dropdownToggle.addEventListener('click', function () {
							var dropdownMenu = document.querySelector('.dropdownDiv');
							var dropdownItems = dropdownMenu.querySelectorAll('.dropdownNotSelected');
							if (purposeCodeDetails) {
								dropdownItems.forEach(function (item, i) {
									var fullDescription = purposeCodeDetails[i].description;
									item.setAttribute('title', fullDescription);
								});
							}
						});

						var options = purposeCodeField.getSelectOptions();
						if (options) {
							for (var i = 0; i < options.length; i++) {
								purposeCodeField.removeSelectOption({
									value: options[i].value
								});
							}

						}
						purposeCodeField.insertSelectOption({
							value: '',
							text: ''
						});
						for (var i = 0; i < purposeCodeDetails.length; i++) {
							var description = purposeCodeDetails[i].description.substring(0, 30);
							purposeCodeField.insertSelectOption({
								value: purposeCodeDetails[i].purpCode,
								text: purposeCodeDetails[i].purpCode + " - " + description
							});
						}
						if (textPurposeCode) {
							currentRecord.setValue({
								fieldId: 'custpage_for_purpose_code',
								value: textPurposeCode
							});
						}
					} else {
						currentRecord.setValue({
							fieldId: "custpage_for_purpose_code",
							value: '',
							ignoreFieldChange: true,
						});
						currentRecord.setValue({
							fieldId: "custpage_for_purpose_code_check",
							value: false,
							ignoreFieldChange: true,
						});
						var purposeCodeField = currentRecord.getField({
							fieldId: 'custpage_for_purpose_code'
						});
						purposeCodeField.isMandatory = false;
						purposeCodeField.isDisplay = false;
					}

					if (subPurposeCodeDetails) {
						var subPurposeCodeField = currentRecord.getField({
							fieldId: 'custpage_for_sub_purpose_code'
						});
						var textSubPurposeCode = currentRecord.getValue({
							fieldId: 'custpage_for_sub_purpose_code_text'
						});
						subPurposeCodeField.isMandatory = true;
						subPurposeCodeField.isDisplay = true;
						currentRecord.setValue({
							fieldId: "custpage_for_sub_purpose_code_check",
							value: true,
							ignoreFieldChange: true,
						});

						var subPuposeCodeDropdownToggle = document.getElementById("custpage_for_sub_purpose_code_fs")
						subPuposeCodeDropdownToggle.addEventListener('click', function () {
							var subPuposeCodeDropdownMenu = document.querySelector('.dropdownDiv');

							var subPuposeCodeDropdownItems = subPuposeCodeDropdownMenu.querySelectorAll('.dropdownNotSelected');

							if (subPurposeCodeDetails) {
								subPuposeCodeDropdownItems.forEach(function (item, i) {
									var fullDescription = subPurposeCodeDetails[i].description;
									item.setAttribute('title', fullDescription);
								});
							}
						});

						var options = subPurposeCodeField.getSelectOptions();
						if (options) {
							for (var i = 0; i < options.length; i++) {
								subPurposeCodeField.removeSelectOption({
									value: options[i].value
								});
							}
						}

						subPurposeCodeField.insertSelectOption({
							value: '',
							text: ''
						});

						for (var i = 0; i < subPurposeCodeDetails.length; i++) {
							var description = subPurposeCodeDetails[i].description.substring(0, 30);
							subPurposeCodeField.insertSelectOption({
								value: subPurposeCodeDetails[i].pcodActivity,
								text: subPurposeCodeDetails[i].pcodActivity + " - " + description
							});
						}
						if (textSubPurposeCode) {
							currentRecord.setValue({
								fieldId: 'custpage_for_sub_purpose_code',
								value: textSubPurposeCode
							});
						}
					} else {
						currentRecord.setValue({
							fieldId: "custpage_for_sub_purpose_code",
							value: '',
							ignoreFieldChange: true,
						});
						currentRecord.setValue({
							fieldId: "custpage_for_sub_purpose_code_check",
							value: false,
							ignoreFieldChange: true,
						});
						var subPurposeCodeField = currentRecord.getField({
							fieldId: 'custpage_for_sub_purpose_code'
						});
						subPurposeCodeField.isMandatory = false;
						subPurposeCodeField.isDisplay = false;
					}
				} else {
					var purposeCodeField = currentRecord.getField({
						fieldId: 'custpage_for_purpose_code'
					});
					purposeCodeField.isDisplay = false;

					var subPurposeCodeField = currentRecord.getField({
						fieldId: 'custpage_for_sub_purpose_code'
					});
					subPurposeCodeField.isDisplay = false;
				}
			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		function internalTransfer() {
			try {
				var paramObj = {};
				paramObj.wireFilter = 'INTERNAL_TRANSFERS'
				window.onbeforeunload = null;
				var urlString = url.resolveScript({
					scriptId: "customscript_citiintegrator_ns_ss_payini",
					deploymentId: "customdeploy_citiintegrator_ns_ss_payini",
					params: paramObj,
				});
				window.open(urlString, "_self");

			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		function domesticWire() {
			try {
				var paramObj = {};
				paramObj.wireFilter = 'DOMESTIC_WIRES'
				window.onbeforeunload = null;
				var urlString = url.resolveScript({
					scriptId: "customscript_citiintegrator_ns_ss_payini",
					deploymentId: "customdeploy_citiintegrator_ns_ss_payini",
					params: paramObj,
				});
				window.open(urlString, "_self");

			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		function foreignWire() {
			try {
				var paramObj = {};
				paramObj.wireFilter = 'FOREIGN_WIRES'
				window.onbeforeunload = null;
				var urlString = url.resolveScript({
					scriptId: "customscript_citiintegrator_ns_ss_payini",
					deploymentId: "customdeploy_citiintegrator_ns_ss_payini",
					params: paramObj,
				});
				window.open(urlString, "_self");

			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		function RealTimePayment() { //rutuja start
			try {
				var paramObj = {};
				paramObj.wireFilter = 'REAL_TIME_PAYMENTS'
				window.onbeforeunload = null;
				var urlString = url.resolveScript({
					scriptId: "customscript_citiintegrator_ns_ss_payini",
					deploymentId: "customdeploy_citiintegrator_ns_ss_payini",
					params: paramObj,
				});
				window.open(urlString, "_self");

			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		} //rutuja end

		function home() {
			try {
				window.onbeforeunload = null;
				var urlString = url.resolveScript({
					scriptId: "customscript_citiintegrator_ns_ss_infrep",
					deploymentId: "customdeploy_citiintegrator_ns_ss_infrep"
				});
				window.open(urlString, "_self");

			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		function reset(wireFilter) {
			try {
				var paramObj = {};
				paramObj.wireFilter = wireFilter;
				window.onbeforeunload = null;
				var urlString = url.resolveScript({
					scriptId: "customscript_citiintegrator_ns_ss_payini",
					deploymentId: "customdeploy_citiintegrator_ns_ss_payini",
					params: paramObj,
				});
				window.open(urlString, "_self");

			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		function saveRecord(context) {
			debugger;
			try {
				var currentRecord = context.currentRecord;
				var wireType = currentRecord.getValue({
					fieldId: 'custpage_wire_type'
				});
				// //Start - Umar has updated the code on 2nd Oct 26 for the VA issue - H3 case1
				var htmlPattern = /<\/?[a-z][\s\S]*/i; // Umar has updated for VA issue - V3 Case1
				if (htmlPattern.test(currentRecord.getValue('custpage_dom_beneficiary_name')) || htmlPattern.test(currentRecord.getValue('custpage_for_beneficiary_name')) || htmlPattern.test(currentRecord.getValue('custpage_dom_address_one')) || htmlPattern.test(currentRecord.getValue('custpage_dom_address_two')) || htmlPattern.test(currentRecord.getValue('custpage_dom_city')) || htmlPattern.test(currentRecord.getValue('custpage_for_address_one')) || htmlPattern.test(currentRecord.getValue('custpage_for_address_two')) || htmlPattern.test(currentRecord.getValue('custpage_for_city')) || htmlPattern.test(currentRecord.getValue('custpage_dom_spec_instr_one')) || htmlPattern.test(currentRecord.getValue('custpage_dom_spec_instr_two')) || htmlPattern.test(currentRecord.getValue('custpage_dom_spec_instr_three')) || htmlPattern.test(currentRecord.getValue('custpage_for_spec_instr_one')) || htmlPattern.test(currentRecord.getValue('custpage_for_spec_instr_two')) || htmlPattern.test(currentRecord.getValue('custpage_for_spec_instr_three')) || htmlPattern.test(currentRecord.getValue('custpage_dom_cust_refer_number')) || htmlPattern.test(currentRecord.getValue('custpage_for_cust_refer_number')) || htmlPattern.test(currentRecord.getValue('custpage_dom_add_refers')) || htmlPattern.test(currentRecord.getValue('custpage_for_add_refers')) || htmlPattern.test(currentRecord.getValue('custpage_dom_add_description')) || htmlPattern.test(currentRecord.getValue('custpage_rtp_add_description')) || htmlPattern.test(currentRecord.getValue('custpage_for_bank_name')) || htmlPattern.test(currentRecord.getValue('custpage_for_bank_city')) || htmlPattern.test(currentRecord.getValue('custpage_for_bank_address')) || htmlPattern.test(currentRecord.getValue('custpage_bank_address')) || htmlPattern.test(currentRecord.getValue('custpage_dom_phone_number'))|| htmlPattern.test(currentRecord.getValue('custpage_for_phone_number')) || htmlPattern.test(currentRecord.getValue('custpage_inter_trans_desp'))) { alert('Please enter a valid value'); return false;}

				// //End - Umar has updated the code on 2nd Oct 26 for the VA issue - H3 case1

				// Vishal Daily Limit.
				var checkDailyLimitFlag = false, dailyAmountToCheck = 999999999, dispAccount = '', errAcc = '';
				var dailyLimit = currentRecord.getValue({ fieldId: 'custpage_daily_limit' });
				if (dailyLimit) { dailyLimit = JSON.parse(dailyLimit); }
				// Vishal Daily Limit.

				if (wireType == "INTERNAL_TRANSFERS") {
					//Internal Transfer
					var checkTransferFrom = [];
					var checkTransferTo = [];

					var lineCountFrom = currentRecord.getLineCount('custpage_inter_transfer_from');
					for (var i = 0; i < lineCountFrom; i++) {
						var selectAccountFrom = currentRecord.getSublistValue('custpage_inter_transfer_from', 'custlist_inter_sel_acc_from', i);
						if (selectAccountFrom == "T") {
							var accountNumberFrom = currentRecord.getSublistValue('custpage_inter_transfer_from', 'custlist_inter_acc_num_from', i);
							var currentAvailableFrom = currentRecord.getSublistValue('custpage_inter_transfer_from', 'custlist_inter_curr_avail_from', i);

							// Vishal Daily Limit.
							if (dailyLimit) {
								for (var loop1 = 0; loop1 < dailyLimit.length; loop1++) {
									dispAccount = dailyLimit[loop1].dispAccount;
									if (dispAccount == accountNumberFrom) { dailyAmountToCheck = dailyLimit[loop1].dailyLimit; checkDailyLimitFlag = true; errAcc = dispAccount; }
								}
							}
							// Vishal Daily Limit.

							var object = {
								"accountNumberFrom": accountNumberFrom,
								"currentAvailabeFrom": currentAvailabeFrom
							}
							checkTransferFrom.push(object);
						}
					}

					var lineCountTo = currentRecord.getLineCount('custpage_inter_transfer_to');
					for (var i = 0; i < lineCountTo; i++) {
						var selectAccountTo = currentRecord.getSublistValue('custpage_inter_transfer_to', 'custlist_inter_sel_acc_to', i);
						if (selectAccountTo == "T") {
							var accountNumberTo = currentRecord.getSublistValue('custpage_inter_transfer_to', 'custlist_inter_acc_num_to', i);
							var currentAvailableTo = currentRecord.getSublistValue('custpage_inter_transfer_to', 'custlist_inter_curr_avail_to', i);
							var object = {
								"accountNumberTo": accountNumberTo,
								"currentAvailableTo": currentAvailableTo
							}
							checkTransferTo.push(object);
						}
					}

					if (checkTransferFrom.length == 0) {
						alert("Please Select Account : Transfer From");
						return false;
					}
					if (checkTransferTo.length == 0) {
						alert("Please Select Account : Transfer To");
						return false;
					}
					if (checkTransferFrom[0].accountNumberFrom == checkTransferTo[0].accountNumberTo) {
						alert("Transfer From And Transfer To Account cannot be same");
						return false;
					}
					var interAmount = currentRecord.getValue("custpage_inter_amt_to_be_sent");
					if (interAmount)
						interAmount = interAmount.replace(/,/g, '');

					// Vishal Daily Limit.
					// Restricting payment for daily limit if limit exceeds for the account.
					if (checkDailyLimitFlag == true && interAmount > dailyAmountToCheck && dailyAmountToCheck != 0) {
						alert('The amount is over your limit allowed for the account ' + errAcc);
						return false;
					}
					// Vishal Daily Limit.

					/* if (checkTransferFrom[0].currentAvailabeFrom < Number(interAmount)) {
						alert('There are insufficient funds available in the selected \"Transfer From Account\" to process this transaction at this time.');
						return false;
					} */
				}
				else if (wireType == "DOMESTIC_WIRES") {
					//Domestic Wire
					var checkTransferFrom = [];
					var lineCountFrom = currentRecord.getLineCount('custpage_dom_transfer_from');
					for (var i = 0; i < lineCountFrom; i++) {
						var selectAccountFrom = currentRecord.getSublistValue('custpage_dom_transfer_from', 'custlist_dom_select_account', i);
						if (selectAccountFrom == "T") {
							var accountNumberFrom = currentRecord.getSublistValue('custpage_dom_transfer_from', 'custlist_dom_account_number', i);
							var currentAvailabeFrom = currentRecord.getSublistValue('custpage_dom_transfer_from', 'custlist_dom_current_available', i);
							var object = {
								"accountNumberFrom": accountNumberFrom,
								"currentAvailabeFrom": currentAvailabeFrom
							}
							checkTransferFrom.push(object);

							// Vishal Daily Limit.
							if (dailyLimit) {
								for (var loop2 = 0; loop2 < dailyLimit.length; loop2++) {
									dispAccount = dailyLimit[loop2].dispAccount;
									if (dispAccount == accountNumberFrom) { dailyAmountToCheck = dailyLimit[loop2].dailyLimit; checkDailyLimitFlag = true; errAcc = dispAccount; }
								}
							}
							// Vishal Daily Limit.
						}
					}

					if (checkTransferFrom.length == 0) {
						alert("Please Select Account : Transfer From");
						return false;
					}

					var usOrInterBank = currentRecord.getValue({
						fieldId: 'custpage_dom_us_credit_inter_bank'
					});

					var domCity = currentRecord.getValue({
						fieldId: 'custpage_dom_city'
					});

					var addressOne = currentRecord.getValue({
						fieldId: 'custpage_dom_address_one'
					});

					var addressTwo = currentRecord.getValue({
						fieldId: 'custpage_dom_address_two'
					});
					var message = "Please enter value(s) for: ";
					var fields = [];
					//rutuja start
					if (domCity && (!addressOne && !addressTwo)) {
						fields.push("Address");
					}

					if ((addressOne || addressTwo) && !domCity) {
						fields.push("City");
					}
					//rutuja end

					if (usOrInterBank == 'us_bank') {
						var bankRoutingNumber = currentRecord.getValue({
							fieldId: 'custpage_bank_routing_number'
						});
						if (bankRoutingNumber == "") {
							fields.push("Bank Routing Number (ABA)");
						}


						var alertMessage = fields.join();
						if (alertMessage != "") {
							alert(message + alertMessage);
							return false;
						}
					} else {
						var interBankRoutingNumber = currentRecord.getValue({
							fieldId: 'custpage_inter_bank_routing_number'
						});
						var city = currentRecord.getValue({
							fieldId: 'custpage_city'
						});
						var financialInstitutionName = currentRecord.getValue({
							fieldId: 'custpage_financial_institution_name'
						});
						/* var financialInstitutionAccount = currentRecord.getValue({
							fieldId: 'custpage_finint_account'
						}); */
						var state = currentRecord.getValue({
							fieldId: 'custpage_state'
						});
						var bankAddress = currentRecord.getValue({
							fieldId: 'custpage_bank_address'
						});

						if (interBankRoutingNumber == "") {
							fields.push("Intermediatory Bank Routing Number");
						}
						if (financialInstitutionName == "") {
							fields.push("Financial Institution Name");
						}
						/* if (financialInstitutionAccount == "") {
							fields.push("Financial Institution Account");
						} */
						if (bankAddress == "") {
							fields.push("Bank Address");
						}
						if (city == "") {
							fields.push("City");
						}
						if (state == "") {
							fields.push("State");
						}

						var alertMessage = fields.join(", ");
						if (alertMessage != "") {
							alert(message + alertMessage);
							return false;
						}
					}

					var domAmount = currentRecord.getValue("custpage_dom_wire_amount");
					if (domAmount)
						domAmount = domAmount.replace(/,/g, '');

					// Vishal Daily Limit.
					// Restricting payment for daily limit if limit exceeds for the account.
					if (checkDailyLimitFlag == true && domAmount > dailyAmountToCheck && dailyAmountToCheck != 0) {
						alert('The amount is over your limit allowed for the account ' + errAcc);
						return false;
					}
					// Vishal Daily Limit.
					/* if (checkTransferFrom[0].currentAvailabeFrom < Number(domAmount)) {
						alert('There are insufficient funds available in the selected \"Transfer From Account\" to process this transaction at this time.');
						return false;
					} */
				}
				else if (wireType == "REAL_TIME_PAYMENTS") { //rutuja start

					var checkTransferFrom = [];
					var lineCountFrom = currentRecord.getLineCount('custpage_rtp_pay_from');
					for (var i = 0; i < lineCountFrom; i++) {
						var selectAccountFrom = currentRecord.getSublistValue('custpage_rtp_pay_from', 'custlist_rtp_select_account', i);
						if (selectAccountFrom == "T") {
							var accountNumberFrom = currentRecord.getSublistValue('custpage_rtp_pay_from', 'custlist_rtp_account_number', i);
							var currentAvailabeFrom = currentRecord.getSublistValue('custpage_rtp_pay_from', 'custlist_rtp_current_available', i);
							var object = {
								"accountNumberFrom": accountNumberFrom,
								"currentAvailabeFrom": currentAvailabeFrom
							}
							checkTransferFrom.push(object);

							// Vishal Daily Limit.
							if (dailyLimit) {
								for (var loop2 = 0; loop2 < dailyLimit.length; loop2++) {
									dispAccount = dailyLimit[loop2].dispAccount;
									if (dispAccount == accountNumberFrom) { dailyAmountToCheck = dailyLimit[loop2].dailyLimit; checkDailyLimitFlag = true; errAcc = dispAccount; }
								}
							}
							// Vishal Daily Limit.
						}
					}

					if (checkTransferFrom.length == 0) {
						alert("Please Select Account : Pay From");
						return false;
					}

					// var usOrInterBank = currentRecord.getValue({
					// 	fieldId: 'custpage_dom_us_credit_inter_bank'
					// });
					// var message = "Please enter value(s) for: ";
					var fields = [];
					// if (usOrInterBank == 'us_bank') {
					var bankRoutingNumber = currentRecord.getValue({
						fieldId: 'custpage_rtp_bank_routing_number'
					});
					if (bankRoutingNumber == "") {
						fields.push("Bank Routing Number (ABA)");
					}
					var alertMessage = fields.join();
					if (alertMessage != "") {
						alert(message + alertMessage);
						return false;
					}
					// } else {
					// 	var interBankRoutingNumber = currentRecord.getValue({
					// 		fieldId: 'custpage_inter_bank_routing_number'
					// 	});
					// 	var city = currentRecord.getValue({
					// 		fieldId: 'custpage_city'
					// 	});
					// 	var financialInstitutionName = currentRecord.getValue({
					// 		fieldId: 'custpage_financial_institution_name'
					// 	});
					// 	/* var financialInstitutionAccount = currentRecord.getValue({
					// 		fieldId: 'custpage_finint_account'
					// 	}); */
					// 	var state = currentRecord.getValue({
					// 		fieldId: 'custpage_state'
					// 	});
					// 	var bankAddress = currentRecord.getValue({
					// 		fieldId: 'custpage_bank_address'
					// 	});

					// 	if (interBankRoutingNumber == "") {
					// 		fields.push("Intermediatory Bank Routing Number");
					// 	}
					// 	if (financialInstitutionName == "") {
					// 		fields.push("Financial Institution Name");
					// 	}
					// 	/* if (financialInstitutionAccount == "") {
					// 		fields.push("Financial Institution Account");
					// 	} */
					// 	if (bankAddress == "") {
					// 		fields.push("Bank Address");
					// 	}
					// 	if (city == "") {
					// 		fields.push("City");
					// 	}
					// 	if (state == "") {
					// 		fields.push("State");
					// 	}

					// 	var alertMessage = fields.join(", ");
					// 	if (alertMessage != "") {
					// 		alert(message + alertMessage);
					// 		return false;
					// 	}
					// }

					var rtpAmount = currentRecord.getValue("custpage_rtp_wire_amount");
					if (rtpAmount)
						rtpAmount = rtpAmount.replace(/,/g, '');

					log.emergency('checkDailyLimitFlag == true', checkDailyLimitFlag == true);
					log.emergency('rtpAmount > dailyAmountToCheck', rtpAmount > dailyAmountToCheck);
					log.emergency('dailyAmountToCheck != 0', dailyAmountToCheck != 0);



					if (checkDailyLimitFlag == true && rtpAmount > dailyAmountToCheck && dailyAmountToCheck != 0) {
						alert('The amount is over your limit allowed for the account ' + errAcc);
						return false;
					}

				} //rutuja end
				else {
					//Foreign Wire
					var checkTransferFrom = [];
					var lineCountFrom = currentRecord.getLineCount('custpage_for_wire_from');
					for (var i = 0; i < lineCountFrom; i++) {
						var selectAccountFrom = currentRecord.getSublistValue('custpage_for_wire_from', 'custlist_for_select_account', i);
						if (selectAccountFrom == "T") {
							var accountNumberFrom = currentRecord.getSublistValue('custpage_for_wire_from', 'custlist_for_account_number', i);
							var currentAvailabeFrom = currentRecord.getSublistValue('custpage_for_wire_from', 'custlist_for_current_available', i);
							var object = {
								"accountNumberFrom": accountNumberFrom,
								"currentAvailabeFrom": currentAvailabeFrom
							}
							checkTransferFrom.push(object);

							// Vishal Daily Limit.
							if (dailyLimit) {
								for (var loop3 = 0; loop3 < dailyLimit.length; loop3++) {
									dispAccount = dailyLimit[loop3].dispAccount;
									if (dispAccount == accountNumberFrom) { dailyAmountToCheck = dailyLimit[loop3].dailyLimit; checkDailyLimitFlag = true; errAcc = dispAccount; }
								}
							}
							// Vishal Daily Limit.
						}
					}

					if (checkTransferFrom.length == 0) {
						alert("Please Select Account : Wire From");
						return false;
					}

					var purposeCode = currentRecord.getValue({
						fieldId: 'custpage_for_purpose_code'
					});
					var subPurposeCode = currentRecord.getValue({
						fieldId: 'custpage_for_sub_purpose_code'
					});
					var purposeCodeCheck = currentRecord.getValue({
						fieldId: 'custpage_for_purpose_code_check'
					});
					var subPurposeCodeCheck = currentRecord.getValue({
						fieldId: 'custpage_for_sub_purpose_code_check'
					});
					//rutuja start
					var for_addr1 = currentRecord.getValue({
						fieldId: 'custpage_for_address_one'
					});
					var for_addr2 = currentRecord.getValue({
						fieldId: 'custpage_for_address_two'
					});
					//rutuja end

					var message = "Please enter value(s) for: ";
					var fields = [];
					if (purposeCodeCheck == "true" && purposeCode == "") {
						fields.push("Purpose Code");
					}
					if (subPurposeCodeCheck == "true" && subPurposeCode == "") {
						fields.push("Subpurpose Code");
					}
					//rutuja start
					if (!for_addr1 && !for_addr2) {
						fields.push("Address");
					}
					//rutuja end
					var alertMessage = fields.join(", ");
					if (alertMessage != "") {
						alert(message + alertMessage);
						return false;
					}

					var forAmount = currentRecord.getValue("custpage_for_wire_amount");
					if (forAmount)
						forAmount = forAmount.replace(/,/g, '');
					/* if (checkTransferFrom[0].currentAvailabeFrom < Number(forAmount)) {
						alert('There are insufficient funds available in the selected \"Wire From Account\" to process this transaction at this time.');
						return false;
					} */

					// Vishal Daily Limit.
					// Restricting payment for daily limit if limit exceeds for the account.
					if (checkDailyLimitFlag == true && forAmount > dailyAmountToCheck && dailyAmountToCheck != 0) {
						alert('The amount is over your limit allowed for the account ' + errAcc);
						return false;
					}
					// Vishal Daily Limit.

					var country = currentRecord.getValue("custpage_for_dest_country");
					var address1 = currentRecord.getValue("custpage_for_address_one");
					var address2 = currentRecord.getValue("custpage_for_address_two");
					var address3 = currentRecord.getValue("custpage_for_city"); //rutuja changed the address line 3 to city
					if (country == "AU" || country == "UG") {
						if (address1 == "" && address2 == "" && address3 == "") {
							alert('Please enter Beneficiary Address.');
							return false;
						}
					}
				}
			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
			return true;
		}

		function getTemplate(selectedItem) {
			debugger;

			try {

				var storedTemplateName = selectedItem;
				log.debug("storedTemplateName", storedTemplateName);

				var paramObj = {};
				paramObj.wireFilter = 'DOMESTIC_WIRES'
				paramObj.storedTemplateName = storedTemplateName;


				window.onbeforeunload = null;
				var urlString = url.resolveScript({
					scriptId: 'customscript_citiintegrator_ns_ss_payini',  // account balance sheet suit
					deploymentId: 'customdeploy_citiintegrator_ns_ss_payini',
					params: paramObj,
				});

				window.open(urlString, "_self");

			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		function getRtpTemplate(selectedItem) { //rutuja start
			debugger;

			try {

				var storedRtpTemplateName = selectedItem;
				log.debug("storedRtpTemplateName", storedRtpTemplateName);

				var paramObj = {};
				paramObj.wireFilter = 'REAL_TIME_PAYMENTS'
				paramObj.storedRtpTemplateName = storedRtpTemplateName;


				window.onbeforeunload = null;
				var urlString = url.resolveScript({
					scriptId: 'customscript_citiintegrator_ns_ss_payini',  // account balance sheet suit
					deploymentId: 'customdeploy_citiintegrator_ns_ss_payini',
					params: paramObj,
				});

				window.open(urlString, "_self");

			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		} //rutuja end

		function getForeigntemplate(selectedItem) {
			debugger;

			try {

				var storedforeignTemplateName = selectedItem;
				log.debug("storedforeignTemplateName", storedforeignTemplateName);

				var paramObj = {};
				paramObj.wireFilter = 'FOREIGN_WIRES'
				paramObj.storedforeignTemplateName = storedforeignTemplateName;



				window.onbeforeunload = null;
				var urlString = url.resolveScript({
					scriptId: 'customscript_citiintegrator_ns_ss_payini',  // account balance sheet suit
					deploymentId: 'customdeploy_citiintegrator_ns_ss_payini',
					params: paramObj,
				});

				window.open(urlString, "_self");


			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		function paymentStatus() {
			try {
				window.onbeforeunload = null;
				//Send the created object to the Suitelet (Invoice Payment Request)
				var urlString = url.resolveScript({
					scriptId: "customscript_citiintegrator_ns_ss_paysts",
					deploymentId: "customdeploy_citiintegrator_ns_ss_paysts"
				});
				window.open(urlString, "_self");

			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		function pushLogs(description) {
			try {
				var puposeCodeReqUrl = url.resolveScript({
					scriptId: 'customscript_citiintegrator_ns_ss_pshlog',
					deploymentId: 'customdeploy_citiintegrator_ns_ss_pshlog',
					returnExternalUrl: false,
					params: {
						'description': description
					}
				});

				var response = https.request({
					method: https.Method.GET,
					url: puposeCodeReqUrl
				});
				//var pushLogResponse = response.body.split("_");
				return true;
			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		function displayMessage(message) {
			alert(message);
			return true;
		}

		function logout(id) {
			try {
				var reqUrl = url.resolveScript({
					scriptId: 'customscript_citiintegrator_ns_ss_revtok',
					deploymentId: 'customdeploy_citiintegrator_ns_ss_revtok',
					returnExternalUrl: false
				});

				var response = https.request({
					method: https.Method.GET,
					url: reqUrl
				});

				record.submitFields({
					type: 'customrecord_citiintegrator_ns_iframetok',
					id: id,
					values: {
						custrecord_citiintegrator_ns_avlbuscodes: "",
						custrecord_citiintegrator_ns_buscode: "",
						custrecord_citiintegrator_ns_entitlement: "",
						//custrecord_citiintegrator_ns_netsuiteusr: "",
						custrecord_citiintegrator_ns_accexpireat: "",
						custrecord_citiintegrator_ns_refexpireat: "",
						custrecord_citiintegrator_ns_iframacctok: "",
						custrecord_citiintegrator_ns_iframreftok: "",
						custrecord_citiintegrator_ns_privatekey: "",
						custrecord_citiintegrator_ns_publickey: "",
						custrecord_citiintegrator_ns_usercode: ""
					},
					options: {
						enableSourcing: false,
						ignoreMandatoryFields: true
					}
				});
			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		function login() {
			try {
				window.onbeforeunload = null;
				//Send the created object to the Suitelet (Invoice Payment Request)
				var urlString = url.resolveScript({
					scriptId: "customscript_citiintegrator_ns_ss_logpge",
					deploymentId: "customdeploy_citiintegrator_ns_ss_logpge"
				});
				window.open(urlString, "_self");
			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}


		// Vishal User Feedback
		function submitUserFeedback(userId, customerFeedback, customerRating) {
			try {
				if (!isEmpty(userId)) {
					console.log('1 Submit User ID: ' + userId);

					// Call Push Log API to push feedback to CITI.
					var pushLogFeedUrl = url.resolveScript({
						scriptId: 'customscript_ci_bksl_push_log_feedback',
						deploymentId: 'customdeploy_ci_bksl_push_log_feedback', returnExternalUrl: false,
						params: { 'customerFeedback': customerFeedback, 'customerRating': customerRating }
					});

					var response = https.request({ method: https.Method.GET, url: pushLogFeedUrl });
					var responseBody = JSON.parse(response.body);

					// Updating the Feedback date when successful.
					if (responseBody.responseCode == 0 && responseBody.responseMessage == 'SUCCESS') {
						record.submitFields({
							type: 'customrecord_citiintegrator_ns_iframetok', id: userId,
							values: {
								custrecord_ci_user_feedback_date: new Date(), custrecord_ci_user_feedback_status: 'SUBMITTED'
							}, options: { enableSourcing: false, ignoreMandatoryFields: true }
						});
						console.log('Feedback Submitted');
					}
					// Vishal H3 Case 2 Issue.
					else if (responseBody.responseCode == 400 && responseBody.responseMessage == 'Customer Feedback contains HTML Code.') {
						dialog.alert({ title: 'Alert', message: 'Error Occurred. Please enter valid Customer Feedback.' });
						console.log(responseBody.responseMessage);
					}
					else if (responseBody.responseCode == 400 && responseBody.responseMessage == 'Customer Rating contains HTML Code.') {
						dialog.alert({ title: 'Alert', message: 'Error Occurred. Please enter valid Customer Rating.' });
						console.log(responseBody.responseMessage);
					}
					// Vishal H3 Case 2 Issue.
					else {
						dialog.alert({ title: 'Alert', message: 'Error Occurred. Please try again after some time.' });
					}

					console.log('2 Submit User ID: ' + userId);
					console.log('response code: ' + responseBody.responseCode);
					console.log('response : ' + responseBody.responseMessage);
				}
				console.log('3 Submit User ID: ' + userId);
			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}


		function cancelUserFeedback(userId) {
			try {
				if (!isEmpty(userId)) {
					record.submitFields({
						type: 'customrecord_citiintegrator_ns_iframetok', id: userId,
						values: {
							custrecord_ci_user_feedback_date: new Date(), custrecord_ci_user_feedback_status: 'CANCELLED'
						}, options: { enableSourcing: false, ignoreMandatoryFields: true }
					});
				}
			} catch (ex) {
				console.log("Error Occurred : " + ex);
				alert("Error Occurred. Please try again after some time.");
			}
		}

		// Function to check whether the value is empty or not.
		function isEmpty(stValue) {
			return ((stValue === '' || stValue === null || stValue === undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function (v) { for (var k in v) return false; return true; })(stValue)));
		}
		// Vishal User Feedback


		return {
			pageInit: pageInit,
			domesticWire: domesticWire,
			internalTransfer: internalTransfer,
			foreignWire: foreignWire,
			home: home,
			reset: reset,
			switchUser: switchUser,
			fieldChanged: fieldChanged,
			saveRecord: saveRecord,
			getTemplate: getTemplate,
			getRtpTemplate: getRtpTemplate, //rutuja 
			getForeigntemplate: getForeigntemplate,
			paymentStatus: paymentStatus,
			pushLogs: pushLogs,
			displayMessage: displayMessage,
			logout: logout,
			login: login,
			RealTimePayment: RealTimePayment, //rutuja 
			// Vishal User Feedback
			submitUserFeedback: submitUserFeedback,
			cancelUserFeedback: cancelUserFeedback,
			isEmpty: isEmpty
			// Vishal User Feedback
		};
	});