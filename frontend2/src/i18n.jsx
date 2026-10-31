import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

/* To add a language: add it to LANGS, then add one more entry to every array in D (same order). */
export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'mr', label: 'मराठी' },
  { code: 'hi', label: 'हिंदी' },
];

/* key: [English, मराठी, हिंदी] */
export const D = {
  language: ['Language', 'भाषा', 'भाषा'],
  signOut: ['Sign out', 'साइन आउट', 'साइन आउट'],
  back: ['Back', 'मागे', 'वापस'],
  continue: ['Continue', 'पुढे', 'आगे'],

  tagline: ['Check suspicious messages. Stay safe from online fraud.', 'संशयास्पद संदेश तपासा. ऑनलाइन फसवणुकीपासून सुरक्षित राहा.', 'संदिग्ध संदेशों की जाँच करें। ऑनलाइन धोखाधड़ी से सुरक्षित रहें।'],
  mobileLabel: ['Your mobile number', 'तुमचा मोबाईल नंबर', 'आपका मोबाइल नंबर'],
  sendOtp: ['Send OTP', 'OTP पाठवा', 'OTP भेजें'],
  enterOtp: ['Enter the 6-digit OTP', '6 अंकी OTP टाका', '6 अंकों का OTP दर्ज करें'],
  verify: ['Verify and continue', 'तपासा आणि पुढे जा', 'सत्यापित करें और आगे बढ़ें'],
  changeNumber: ['Change number', 'नंबर बदला', 'नंबर बदलें'],
  demoOtp: ['Demo mode: your OTP is', 'डेमो मोड: तुमचा OTP आहे', 'डेमो मोड: आपका OTP है'],
  encNote: ['Your details are encrypted and never shared.', 'तुमची माहिती एन्क्रिप्टेड आहे आणि कधीही शेअर केली जात नाही.', 'आपकी जानकारी एन्क्रिप्टेड है और कभी साझा नहीं की जाती।'],
  officerLink: ['I am a cybercrime department officer', 'मी सायबर गुन्हे विभागाचा अधिकारी आहे', 'मैं साइबर अपराध विभाग का अधिकारी हूँ'],
  errMobile: ['Please enter a valid 10-digit mobile number.', 'कृपया वैध 10 अंकी मोबाईल नंबर टाका.', 'कृपया मान्य 10 अंकों का मोबाइल नंबर दर्ज करें।'],
  errOtp: ['Enter the 6-digit OTP.', '6 अंकी OTP टाका.', '6 अंकों का OTP दर्ज करें।'],

  hello: ['Hello, stay safe today.', 'नमस्कार, आज सुरक्षित राहा.', 'नमस्ते, आज सुरक्षित रहें।'],
  whatToDo: ['What would you like to do?', 'तुम्हाला काय करायचे आहे?', 'आप क्या करना चाहेंगे?'],
  cardCheckTitle: ['Check a message or link', 'संदेश किंवा लिंक तपासा', 'संदेश या लिंक जाँचें'],
  cardCheckDesc: ['Paste anything suspicious and get an instant safety score.', 'संशयास्पद काहीही पेस्ट करा आणि लगेच सुरक्षा गुण मिळवा.', 'कुछ भी संदिग्ध पेस्ट करें और तुरंत सुरक्षा स्कोर पाएँ।'],
  cardAlertsTitle: ['Scam alerts near you', 'तुमच्या जवळचे फसवणूक इशारे', 'आपके पास के धोखाधड़ी अलर्ट'],
  cardAlertsDesc: ['See the latest frauds in plain language.', 'ताज्या फसवणुकीची माहिती सोप्या भाषेत पाहा.', 'ताज़ा धोखाधड़ी की जानकारी आसान भाषा में देखें।'],
  cardReportTitle: ['Report a Cyber Fraud', 'सायबर फसवणुकीची तक्रार करा', 'साइबर धोखाधड़ी की रिपोर्ट करें'],
  cardReportDesc: ['Prepare a secure, ready-to-file report in 3 easy steps.', '3 सोप्या टप्प्यांत सुरक्षित, दाखल करण्यास तयार अहवाल तयार करा.', '3 आसान चरणों में सुरक्षित, दर्ज करने योग्य रिपोर्ट तैयार करें।'],
  helplineTitle: ['Emergency Helpline 1930', 'आपत्कालीन हेल्पलाइन 1930', 'आपातकालीन हेल्पलाइन 1930'],
  helplineSub: ['Cyber fraud emergency? Call right away.', 'सायबर फसवणूक झाली आहे का? लगेच कॉल करा.', 'साइबर धोखाधड़ी की आपात स्थिति? तुरंत कॉल करें।'],

  panicBtn: ["I've Been Scammed! What should I do?", 'माझी फसवणूक झाली आहे! मी काय करू?', 'मेरे साथ धोखाधड़ी हुई है! मुझे क्या करना चाहिए?'],
  whatJustHappened: ['What just happened?', 'नुकतेच काय झाले?', 'अभी क्या हुआ?'],
  doStepsNow: ['Do these steps now', 'आता ही पावले उचला', 'अभी ये कदम उठाएँ'],
  stayCalm: ['Stay calm. Pick what matches your situation and we will guide you.', 'शांत राहा. तुमच्या परिस्थितीशी जुळणारा पर्याय निवडा, आम्ही मार्गदर्शन करू.', 'शांत रहें। अपनी स्थिति से मेल खाने वाला विकल्प चुनें, हम आपका मार्गदर्शन करेंगे।'],
  'sc.upi': ['Transferred money or shared UPI PIN', 'पैसे ट्रान्सफर झाले किंवा UPI पिन शेअर झाला', 'पैसे ट्रांसफर हो गए या UPI पिन साझा हो गया'],
  'sc.otp': ['Shared an OTP, password, or credentials', 'OTP, पासवर्ड किंवा लॉगिन माहिती शेअर झाली', 'OTP, पासवर्ड या लॉगिन जानकारी साझा हो गई'],
  'sc.apk': ['Downloaded a suspicious APK file', 'संशयास्पद APK फाइल डाउनलोड झाली', 'संदिग्ध APK फ़ाइल डाउनलोड हो गई'],
  'sc.arrest': ['Trapped in a Digital Arrest / fake police video call', 'डिजिटल अरेस्ट / बनावट पोलीस व्हिडिओ कॉल सुरू आहे', 'डिजिटल अरेस्ट / फर्जी पुलिस वीडियो कॉल चल रहा है'],
  step1T: ['Call 1930 immediately', 'लगेच 1930 वर कॉल करा', 'तुरंत 1930 पर कॉल करें'],
  step1D: ['This is the National Cyber Crime Helpline. The sooner you call, the better the chance of freezing the money.', 'ही राष्ट्रीय सायबर गुन्हे हेल्पलाइन आहे. जितक्या लवकर कॉल कराल, तितकी पैसे गोठवण्याची शक्यता जास्त.', 'यह राष्ट्रीय साइबर अपराध हेल्पलाइन है। जितनी जल्दी कॉल करेंगे, पैसे फ्रीज़ होने की संभावना उतनी बेहतर होगी।'],
  callNow: ['Call 1930 now', 'आता 1930 वर कॉल करा', 'अभी 1930 पर कॉल करें'],
  step2T: ['Contact your bank', 'तुमच्या बँकेशी संपर्क साधा', 'अपने बैंक से संपर्क करें'],
  step2D: ["Call your bank's toll-free number (on the back of your card or on its website) and ask them to freeze your account or card.", 'तुमच्या बँकेच्या टोल-फ्री नंबरवर (कार्डच्या मागे किंवा बँकेच्या वेबसाइटवर) कॉल करा आणि खाते किंवा कार्ड गोठवण्यास सांगा.', 'अपने बैंक के टोल-फ्री नंबर पर (कार्ड के पीछे या बैंक की वेबसाइट पर) कॉल करें और खाता या कार्ड फ्रीज़ करने को कहें।'],
  'fx.upi.t': ['Change your UPI PIN right now', 'आत्ताच तुमचा UPI पिन बदला', 'अभी अपना UPI पिन बदलें'],
  'fx.upi.d': ['Open your UPI app and change your UPI PIN immediately. Then block UPI and your debit/credit cards from your bank app, and do not send any more money, even for a "refund" or "fee". Take screenshots of the payment and note the UTR number.', 'तुमचे UPI अ‍ॅप उघडून UPI पिन लगेच बदला. नंतर बँक अ‍ॅपमधून UPI आणि तुमची डेबिट/क्रेडिट कार्डे ब्लॉक करा. "रिफंड" किंवा "शुल्क" यासाठीसुद्धा आणखी पैसे पाठवू नका. पेमेंटचे स्क्रीनशॉट घ्या आणि UTR क्रमांक लिहून ठेवा.', 'अपना UPI ऐप खोलकर UPI पिन तुरंत बदलें। फिर बैंक ऐप से UPI और अपने डेबिट/क्रेडिट कार्ड ब्लॉक करें, और "रिफंड" या "शुल्क" के नाम पर भी और पैसे न भेजें। भुगतान के स्क्रीनशॉट लें और UTR नंबर नोट कर लें।'],
  'fx.otp.t': ['Lock down your accounts', 'तुमची खाती सुरक्षित करा', 'अपने खाते सुरक्षित करें'],
  'fx.otp.d': ['Change the password of the affected account now, starting with your email and banking apps. Log out of all other devices, switch on two-step verification, and never share another OTP or PIN with anyone.', 'बाधित खात्याचा पासवर्ड आता बदला; सुरुवात ईमेल आणि बँकिंग अ‍ॅप्सपासून करा. इतर सर्व डिव्हाइसमधून लॉग आउट करा, टू-स्टेप व्हेरिफिकेशन चालू करा आणि कोणालाही पुन्हा OTP किंवा पिन सांगू नका.', 'प्रभावित खाते का पासवर्ड अभी बदलें, शुरुआत ईमेल और बैंकिंग ऐप से करें। अन्य सभी डिवाइस से लॉग आउट करें, टू-स्टेप वेरिफिकेशन चालू करें और किसी को भी दोबारा OTP या पिन न बताएँ।'],
  'fx.apk.t': ['Disconnect and uninstall', 'इंटरनेट बंद करा आणि अनइन्स्टॉल करा', 'इंटरनेट बंद करें और अनइंस्टॉल करें'],
  'fx.apk.d': ['Turn on airplane mode and switch off Wi-Fi to cut the app off. Uninstall the APK from Settings > Apps. Then, from another safe device, change your banking and email passwords. If you can, run a Play Protect scan or reset the phone.', 'अ‍ॅपचा इंटरनेट संपर्क तोडण्यासाठी एअरप्लेन मोड चालू करा आणि वाय-फाय बंद करा. सेटिंग्ज > अ‍ॅप्स मधून APK अनइन्स्टॉल करा. नंतर दुसऱ्या सुरक्षित डिव्हाइसवरून बँकिंग आणि ईमेलचे पासवर्ड बदला. शक्य असल्यास Play Protect स्कॅन करा किंवा फोन रीसेट करा.', 'ऐप का इंटरनेट संपर्क काटने के लिए एयरप्लेन मोड चालू करें और वाई-फ़ाई बंद करें। सेटिंग्स > ऐप्स से APK अनइंस्टॉल करें। फिर किसी दूसरे सुरक्षित डिवाइस से बैंकिंग और ईमेल के पासवर्ड बदलें। हो सके तो Play Protect स्कैन चलाएँ या फ़ोन रीसेट करें।'],
  'fx.arrest.t': ['Hang up the video call immediately', 'व्हिडिओ कॉल लगेच कट करा', 'वीडियो कॉल तुरंत काट दें'],
  'fx.arrest.d': ['Disconnect the call now. Police, CBI, customs and courts never arrest anyone over a video call and never ask for money to "clear" a case. Do not transfer anything, block the number, and tell a family member right away.', 'कॉल आत्ताच कट करा. पोलीस, CBI, सीमाशुल्क विभाग आणि न्यायालये कधीही व्हिडिओ कॉलवर अटक करत नाहीत आणि प्रकरण "मिटवण्यासाठी" पैसे मागत नाहीत. काहीही ट्रान्सफर करू नका, नंबर ब्लॉक करा आणि लगेच कुटुंबातील एखाद्या व्यक्तीला सांगा.', 'कॉल अभी काट दें। पुलिस, CBI, सीमा शुल्क विभाग और अदालतें कभी वीडियो कॉल पर गिरफ्तार नहीं करतीं और मामला "निपटाने" के लिए पैसे नहीं माँगतीं। कुछ भी ट्रांसफर न करें, नंबर ब्लॉक करें और तुरंत परिवार के किसी सदस्य को बताएँ।'],
  step4T: ['File your incident report', 'तुमचा घटना अहवाल दाखल करा', 'अपनी घटना रिपोर्ट दर्ज करें'],
  step4D: ['We will help you prepare an encrypted draft for the 1930 helpline.', '1930 हेल्पलाइनसाठी एन्क्रिप्टेड मसुदा तयार करण्यात आम्ही मदत करू.', '1930 हेल्पलाइन के लिए एन्क्रिप्टेड ड्राफ़्ट तैयार करने में हम आपकी मदद करेंगे।'],
  proceed: ['Proceed to File Incident Report', 'घटना अहवाल दाखल करण्यासाठी पुढे जा', 'घटना रिपोर्ट दर्ज करने के लिए आगे बढ़ें'],
  chooseOther: ['Choose a different situation', 'वेगळी परिस्थिती निवडा', 'दूसरी स्थिति चुनें'],

  trackTitle: ['Track Your Cyber Complaint', 'तुमच्या सायबर तक्रारीची स्थिती तपासा', 'अपनी साइबर शिकायत की स्थिति देखें'],
  trackSub: ['No login needed. Enter your Incident ID.', 'लॉगिन आवश्यक नाही. तुमचा घटना आयडी टाका.', 'लॉगिन की आवश्यकता नहीं। अपनी घटना आईडी दर्ज करें।'],
  enterId: ['Enter Incident ID', 'घटना आयडी टाका', 'घटना आईडी दर्ज करें'],
  trackBtn: ['Track Status', 'स्थिती पाहा', 'स्थिति देखें'],
  badId: ['Enter a valid ID like INC-598CFC.', 'INC-598CFC सारखा वैध आयडी टाका.', 'INC-598CFC जैसी मान्य आईडी दर्ज करें।'],
  'st.New': ['New', 'नवीन', 'नई'],
  'st.Under Investigation': ['Under Investigation', 'तपास सुरू', 'जाँच जारी'],
  'st.Resolved': ['Resolved', 'निकाली', 'सुलझा'],
  'prio.High': ['High', 'उच्च', 'उच्च'],
  'prio.Medium': ['Medium', 'मध्यम', 'मध्यम'],
  'prio.Low': ['Low', 'कमी', 'निम्न'],
  priority: ['priority', 'प्राधान्य', 'प्राथमिकता'],
  filedOn: ['Filed on', 'दाखल केल्याची तारीख', 'दर्ज करने की तारीख़'],
  lastUpdated: ['Last updated', 'शेवटचे अपडेट', 'अंतिम अपडेट'],
  reporter: ['Reporter', 'तक्रारदार', 'शिकायतकर्ता'],
  freezeNote: ['Bank freeze request has been sent for the destination account.', 'ज्या खात्यात पैसे गेले त्या खात्यासाठी बँकेकडे गोठवण्याची विनंती पाठवली आहे.', 'जिस खाते में पैसे गए उसके लिए बैंक को फ्रीज़ अनुरोध भेज दिया गया है।'],

  'cat.UPI Fraud': ['UPI Fraud', 'UPI फसवणूक', 'UPI धोखाधड़ी'],
  'cat.Digital Arrest Scam': ['Digital Arrest Scam', 'डिजिटल अरेस्ट घोटाळा', 'डिजिटल अरेस्ट घोटाला'],
  'cat.Phishing Link': ['Phishing Link', 'फिशिंग लिंक', 'फ़िशिंग लिंक'],
  'cat.Fake APK': ['Fake APK', 'बनावट APK', 'नकली APK'],
  'cat.Other': ['Other', 'इतर', 'अन्य'],

  evTitle: ['Upload Evidence', 'पुरावा अपलोड करा', 'सबूत अपलोड करें'],
  evOptional: ['(optional)', '(ऐच्छिक)', '(वैकल्पिक)'],
  evSub: ['Add a screenshot or paste the SMS or receipt. We will fill in your report for you.', 'स्क्रीनशॉट जोडा किंवा SMS/पावती पेस्ट करा. आम्ही तुमचा अहवाल आपोआप भरू.', 'स्क्रीनशॉट जोड़ें या SMS/रसीद पेस्ट करें। हम आपकी रिपोर्ट अपने-आप भर देंगे।'],
  evDrop: ['Drop a screenshot here, or tap to choose', 'स्क्रीनशॉट येथे टाका किंवा निवडण्यासाठी टॅप करा', 'स्क्रीनशॉट यहाँ छोड़ें या चुनने के लिए टैप करें'],
  evReading: ['Reading your file...', 'तुमची फाइल वाचत आहे...', 'आपकी फ़ाइल पढ़ी जा रही है...'],
  evTypes: ['PNG, JPG or .txt, up to 5 MB', 'PNG, JPG किंवा .txt, कमाल 5 MB', 'PNG, JPG या .txt, अधिकतम 5 MB'],
  evPaste: ['Or paste the SMS / receipt text', 'किंवा SMS / पावतीचा मजकूर पेस्ट करा', 'या SMS / रसीद का टेक्स्ट पेस्ट करें'],
  evExtract: ['Extract details', 'तपशील काढा', 'विवरण निकालें'],
  evPrivacy: ['Files are read inside your browser. They are not uploaded or stored.', 'फाइल्स तुमच्या ब्राउझरमध्येच वाचल्या जातात. त्या अपलोड किंवा साठवल्या जात नाहीत.', 'फ़ाइलें आपके ब्राउज़र के अंदर ही पढ़ी जाती हैं। उन्हें अपलोड या सेव नहीं किया जाता।'],
  evCard: ['Extracted Evidence Data', 'काढलेली पुरावा माहिती', 'निकाला गया सबूत डेटा'],
  evCheck: ['Please check each detail and correct anything that is wrong.', 'कृपया प्रत्येक तपशील तपासा आणि चूक असल्यास दुरुस्त करा.', 'कृपया हर विवरण जाँचें और गलत हो तो सुधारें।'],
  evDetected: ['Detected', 'आढळले', 'मिला'],
  evNotFound: ['Not found', 'आढळले नाही', 'नहीं मिला'],
  evUse: ['Use these details in my report', 'हे तपशील माझ्या अहवालात वापरा', 'ये विवरण मेरी रिपोर्ट में इस्तेमाल करें'],
  evApplied: ['Added to your report. You can review them in the next steps.', 'तुमच्या अहवालात जोडले. पुढील टप्प्यांत तुम्ही ते तपासू शकता.', 'आपकी रिपोर्ट में जोड़ दिया गया। अगले चरणों में आप इन्हें जाँच सकते हैं।'],
  fUtr: ['UTR / Transaction ID', 'UTR / व्यवहार आयडी', 'UTR / ट्रांज़ैक्शन आईडी'],
  fAmount: ['Amount lost (₹)', 'गमावलेली रक्कम (₹)', 'गँवाई गई राशि (₹)'],
  fDate: ['Date', 'तारीख', 'तारीख़'],
  fContact: ['Suspicious phone / UPI ID', 'संशयास्पद फोन / UPI आयडी', 'संदिग्ध फ़ोन / UPI आईडी'],

  reportSub: ['We will help you prepare a report for the 1930 helpline.', '1930 हेल्पलाइनसाठी अहवाल तयार करण्यात आम्ही मदत करू.', '1930 हेल्पलाइन के लिए रिपोर्ट तैयार करने में हम आपकी मदद करेंगे।'],
  whatHappened: ['What happened?', 'काय घडले?', 'क्या हुआ?'],
  dateLabel: ['Date it happened', 'घटनेची तारीख', 'घटना की तारीख़'],
  utrLabel: ['UTR / Transaction reference', 'UTR / व्यवहार संदर्भ क्रमांक', 'UTR / ट्रांज़ैक्शन संदर्भ संख्या'],
  utrHelp: ['Find it in your bank or UPI app under transaction details.', 'तो तुमच्या बँक किंवा UPI अ‍ॅपमध्ये व्यवहाराच्या तपशिलात मिळेल.', 'यह आपके बैंक या UPI ऐप में लेनदेन विवरण में मिलेगा।'],
  descLabel: ['What happened, in your words', 'काय घडले, तुमच्या शब्दांत', 'क्या हुआ, अपने शब्दों में'],
  descPh: ['Who contacted you, how, what they said, what you did…', 'कोणी संपर्क साधला, कसा, काय सांगितले, तुम्ही काय केले…', 'किसने संपर्क किया, कैसे, क्या कहा, आपने क्या किया…'],
  checkDetails: ['Please check your details', 'कृपया तुमचे तपशील तपासा', 'कृपया अपने विवरण जाँचें'],
  fraudType: ['Fraud type', 'फसवणुकीचा प्रकार', 'धोखाधड़ी का प्रकार'],
  amountLost: ['Amount lost', 'गमावलेली रक्कम', 'गँवाई गई राशि'],
  descShort: ['Description', 'वर्णन', 'विवरण'],
  encryptNote: ['Amount, UTR and description are encrypted before they are stored.', 'रक्कम, UTR आणि वर्णन साठवण्यापूर्वी एन्क्रिप्ट केले जातात.', 'राशि, UTR और विवरण सेव करने से पहले एन्क्रिप्ट किए जाते हैं।'],
  encryptSave: ['Encrypt and save', 'एन्क्रिप्ट करून जतन करा', 'एन्क्रिप्ट करके सेव करें'],
  saved: ['Report saved securely', 'अहवाल सुरक्षितपणे जतन केला', 'रिपोर्ट सुरक्षित रूप से सेव हो गई'],
  refIs: ['Your reference number is', 'तुमचा संदर्भ क्रमांक आहे', 'आपका संदर्भ क्रमांक है'],
  encWith: ['Encrypted with AES-256-GCM', 'AES-256-GCM सह एन्क्रिप्टेड', 'AES-256-GCM से एन्क्रिप्टेड'],
  dlPdf: ['Download PDF draft', 'PDF मसुदा डाउनलोड करा', 'PDF ड्राफ़्ट डाउनलोड करें'],
  callAfter: ['Now call 1930 or visit cybercrime.gov.in and share this draft.', 'आता 1930 वर कॉल करा किंवा cybercrime.gov.in ला भेट द्या आणि हा मसुदा शेअर करा.', 'अब 1930 पर कॉल करें या cybercrime.gov.in पर जाएँ और यह ड्राफ़्ट साझा करें।'],
  errCat: ['Please choose what kind of fraud it was.', 'कृपया फसवणुकीचा प्रकार निवडा.', 'कृपया धोखाधड़ी का प्रकार चुनें।'],
  errDate: ['Please enter a valid date (not in the future).', 'कृपया वैध तारीख टाका (भविष्यातील नको).', 'कृपया मान्य तारीख़ दर्ज करें (भविष्य की नहीं)।'],
  errAmount: ['Enter the amount lost (0 if none).', 'गमावलेली रक्कम टाका (नसल्यास 0).', 'गँवाई गई राशि दर्ज करें (न हो तो 0)।'],
  errUtr: ['UTR / transaction reference should be 12–22 letters or digits.', 'UTR / व्यवहार संदर्भ क्रमांक 12–22 अक्षरे किंवा अंकांचा असावा.', 'UTR / ट्रांज़ैक्शन संदर्भ संख्या 12–22 अक्षर या अंकों की होनी चाहिए।'],
  errDesc: ['Please describe what happened (at least 10 characters).', 'कृपया काय घडले ते लिहा (किमान 10 अक्षरे).', 'कृपया बताएँ क्या हुआ (कम से कम 10 अक्षर)।'],

  voiceStart: ['Speak instead of typing', 'टाइप करण्याऐवजी बोला', 'टाइप करने की जगह बोलें'],
  voiceStop: ['Stop', 'थांबवा', 'रोकें'],
  voiceListening: ['Listening… speak now', 'ऐकत आहे… आता बोला', 'सुन रहा है… अब बोलें'],
  voiceHint: ['Tip: tap the mic and speak in English, Marathi or Hindi.', 'टीप: माइकवर टॅप करा आणि इंग्रजी, मराठी किंवा हिंदीत बोला.', 'सुझाव: माइक दबाएँ और अंग्रेज़ी, मराठी या हिंदी में बोलें।'],
  voicePrivacy: ["Voice typing uses your browser's speech service.", 'व्हॉइस टायपिंग तुमच्या ब्राउझरची स्पीच सेवा वापरते.', 'वॉइस टाइपिंग आपके ब्राउज़र की स्पीच सेवा का उपयोग करती है।'],
  voiceUnsupported: ["Voice typing is not supported in this browser. Use your phone keyboard's microphone (🎤) instead.", 'या ब्राउझरमध्ये व्हॉइस टायपिंग उपलब्ध नाही. त्याऐवजी तुमच्या फोन कीबोर्डमधील माइक (🎤) वापरा.', 'इस ब्राउज़र में वॉइस टाइपिंग उपलब्ध नहीं है। इसके बजाय अपने फ़ोन कीबोर्ड का माइक (🎤) इस्तेमाल करें।'],
};

const Ctx = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const saved = localStorage.getItem('ccs_lang');
      return LANGS.some((l) => l.code === saved) ? saved : 'en';
    } catch {
      return 'en';
    }
  });
  const setLang = useCallback((code) => {
    setLangState(code);
    document.documentElement.lang = code;
    try {
      localStorage.setItem('ccs_lang', code);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const t = useCallback(
    (key) => {
      const row = D[key];
      if (!row) return key;
      const i = LANGS.findIndex((l) => l.code === lang);
      return row[i] || row[0];
    },
    [lang]
  );
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);
