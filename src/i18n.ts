import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export const LANGUAGE_STORAGE_KEY = 'banti.language'
export type AppLanguage = 'mr' | 'en'

const resources = {
  mr: {
    translation: {
      app: { description: 'ॐ साईनाथ सेवा मंडळासाठी डिजिटल पावती, खर्च आणि आर्थिक अहवाल व्यवस्थापन.', loading: 'अॅप लोड होत आहे…', loadingRecords: 'नोंदी लोड होत आहेत…' },
      language: { marathi: 'मराठी', english: 'English', select: 'भाषा निवडा' },
      theme: { select: 'थीम निवडा', system: 'सिस्टम', light: 'लाईट', dark: 'डार्क' },
      datePicker: { selectDate: 'दिनांक निवडा', selectYear: 'वर्ष निवडा', previousMonth: 'मागील महिना', nextMonth: 'पुढील महिना', today: 'आज' },
      header: {
        organization: 'ॐ साईनाथ सेवा मंडळ, रजि.',
        title: 'डिजिटल वर्गणी पावती',
        subtitle: 'माहिती भरा, पावती तपासा आणि PDF डाउनलोड करा.',
        logout: 'लॉग आउट',
      },
      nav: {
        appName: 'साईनाथ सेवा', management: 'मंडळ व्यवस्थापन', primary: 'मुख्य नेव्हिगेशन', operator: 'ऑपरेटर',
        dashboard: 'डॅशबोर्ड', receipts: 'पावत्या', expenses: 'खर्च', reports: 'अहवाल', settings: 'सेटिंग्ज',
      },
      dashboard: {
        kicker: 'आढावा', title: 'डॅशबोर्ड', subtitle: 'आर्थिक वर्ष {{year}} चा संक्षिप्त आढावा', newReceipt: 'नवीन पावती',
        summary: 'आर्थिक सारांश', collections: 'एकूण वर्गणी', expenses: 'एकूण खर्च', balance: 'शिल्लक', available: 'उपलब्ध रक्कम',
        latestReceipt: 'शेवटची पावती', receiptsCount: 'पावत्या', entries: 'नोंदी', noData: 'माहिती नाही',
        recentReceipts: 'अलीकडील पावत्या', recentReceiptsCopy: 'नवीनतम वर्गणी नोंदी', recentExpenses: 'अलीकडील खर्च',
        recentExpensesCopy: 'नवीनतम खर्च नोंदी', viewAll: 'सर्व पहा', manage: 'व्यवस्थापित करा', noReceipts: 'अजून पावत्या नाहीत.', noExpenses: 'अजून खर्च नाहीत.',
      },
      expense: {
        kicker: 'व्यवहार', title: 'खर्च व्यवस्थापन', subtitle: 'मंडळाचे खर्च नोंदवा आणि तपासा', formTitle: 'खर्चाची माहिती', add: 'नवीन खर्च', addCopy: 'खर्चाची संपूर्ण माहिती भरा',
        date: 'खर्च दिनांक', category: 'प्रकार', description: 'तपशील', descriptionPlaceholder: 'उदा. सजावट साहित्य', amount: 'रक्कम',
        paymentType: 'पेमेंट प्रकार', reference: 'व्यवहार क्रमांक', referencePlaceholder: 'ऐच्छिक संदर्भ', save: 'खर्च जतन करा', saving: 'जतन होत आहे…',
        saved: 'खर्च यशस्वीरित्या जतन झाला.', validation: 'दिनांक, तपशील आणि योग्य रक्कम भरा.', history: 'खर्च नोंदवही',
        historyCopy: 'आर्थिक वर्ष {{year}}', empty: 'अजून कोणताही खर्च जतन केलेला नाही.', previewTitle: 'खर्च पावती पूर्वदृश्य',
        voucherTitle: 'खर्च पावती', voucherNumber: 'व्हाउचर क्रमांक', previewDraft: 'मसुदा', downloadPdf: 'खर्च PDF डाउनलोड करा', downloadingPdf: 'PDF तयार होत आहे…', templateAlt: 'ॐ साईनाथ सेवा मंडळ खर्च पावती नमुना',
        categories: { festival: 'उत्सव', decoration: 'सजावट', utilities: 'वीज व सुविधा', food: 'अन्न व प्रसाद', transport: 'वाहतूक', other: 'इतर' },
      },
      reports: {
        kicker: 'विश्लेषण', title: 'अहवाल', subtitle: 'आर्थिक सारांश आणि डाउनलोड', download: 'Excel डाउनलोड', receiptRegister: 'पावती नोंदवही',
        receiptRegisterCopy: 'क्रमांकाच्या रेंजनुसार पावत्या डाउनलोड करा.', includes: 'नाव, व्हॉट्सअॅप नंबर, पेमेंट, रक्कम आणि एकूण', chooseRange: 'रेंज निवडा',
        year: 'आर्थिक वर्ष', averageReceipt: 'सरासरी पावती', transactions: 'एकूण व्यवहार', paymentBreakdown: 'पेमेंट प्रकारानुसार वर्गणी',
        paymentCopy: 'प्रत्येक पेमेंट प्रकारातील रक्कम', expenseBreakdown: 'प्रकारानुसार खर्च', expenseCopy: 'सर्वाधिक खर्च कुठे झाला',
        monthly: 'मासिक आर्थिक हालचाल', monthlyCopy: 'वर्गणी, खर्च आणि मासिक शिल्लक', collectionsShort: 'वर्गणी', expensesShort: 'खर्च', net: 'निव्वळ',
        noActivity: 'या आर्थिक वर्षासाठी व्यवहार उपलब्ध नाहीत.', noExpenses: 'या आर्थिक वर्षासाठी खर्च उपलब्ध नाहीत.', records: '{{count}} नोंदी',
        csvTitle: 'संपूर्ण CSV', csvCopy: 'सर्व पावत्या व खर्च एका फाइलमध्ये.', downloadCsv: 'CSV डाउनलोड',
        csv: { type: 'प्रकार', date: 'दिनांक', number: 'पावती क्रमांक', details: 'नाव / तपशील', method: 'पेमेंट / खर्च प्रकार', amount: 'रक्कम', receipt: 'पावती', expense: 'खर्च' },
      },
      settings: {
        kicker: 'सिस्टम', title: 'सेटिंग्ज', subtitle: 'भाषा, थीम आणि अॅप माहिती', language: 'भाषा', languageCopy: 'अॅपची भाषा निवडा.',
        appearance: 'दिसण्याची पद्धत', appearanceCopy: 'डिव्हाइसची थीम वापरा किंवा लाईट / डार्क निवडा.',
        install: 'अॅप इन्स्टॉल करा', installCopy: 'जलद प्रवेश आणि ऑफलाइन वापरासाठी हे अॅप फोन किंवा संगणकावर इन्स्टॉल करा.',
        installButton: 'अॅप इन्स्टॉल करा', installed: 'अॅप इन्स्टॉल झाले आहे', installHelp: 'ब्राउझर मेनूमधून “Add to Home Screen” किंवा “Install app” निवडा.',
        preferences: 'डिफॉल्ट प्राधान्ये', preferencesCopy: 'नवीन नोंदींसाठी सुरुवातीची सेटिंग्ज निवडा.', defaultPage: 'सुरुवातीचे पृष्ठ',
        defaultReceiptPayment: 'पावतीचा डिफॉल्ट पेमेंट प्रकार', defaultExpensePayment: 'खर्चाचा डिफॉल्ट पेमेंट प्रकार',
        dataStatus: 'डेटा आणि कनेक्शन', dataStatusCopy: 'सध्याच्या डेटाबेसची स्थिती', receipts: 'एकूण पावत्या', expenses: 'एकूण खर्च नोंदी',
        lastReceipt: 'शेवटची पावती', connection: 'कनेक्शन', backup: 'डेटा बॅकअप', backupCopy: 'सर्व पावत्या आणि खर्च सुरक्षित JSON फाइलमध्ये डाउनलोड करा.',
        downloadBackup: 'बॅकअप डाउनलोड', refresh: 'डेटा रिफ्रेश', openReports: 'अहवाल उघडा', offlineNote: 'जतन पूर्ण झाल्याचा संदेश येईपर्यंत अॅप बंद करू नका.',
        operator: 'ऑपरेटर माहिती', operatorCopy: 'सध्याचे सुरक्षित सत्र', name: 'नाव', financialYear: 'आर्थिक वर्ष', database: 'डेटाबेस',
        organization: 'संस्था', organizationCopy: 'डिजिटल पावती आणि आर्थिक व्यवस्थापन प्रणाली',
      },
      auth: {
        secure: 'सुरक्षित प्रवेश', title: 'ऑपरेटर लॉगिन',
        copy: 'पावती तयार करण्यासाठी अधिकृत ID ने लॉगिन करा.',
        operatorId: 'ऑपरेटर ID', password: 'पासवर्ड', login: 'लॉगिन करा',
        loggingIn: 'लॉगिन होत आहे…', firebase: 'Firebase सुरक्षित लॉगिन',
      },
      form: {
        step: '01', title: 'पावतीची माहिती', newReceipt: 'नवीन पावती',
        receiptNumber: 'पावती क्रमांक', databaseSequence: 'Database sequence',
        loadingNumber: 'क्रमांक मिळवत आहे…', rulesRequired: 'Firebase Database Rules आवश्यक',
        name: 'नाव', fullName: 'Full name', namePlaceholder: 'उदा. कुणाल जाधव',
        mobile: 'व्हॉट्सअॅप नंबर', mobileEnglish: 'WhatsApp Number', mobilePlaceholder: '10 अंकी व्हॉट्सअॅप नंबर',
        paymentType: 'पेमेंट प्रकार', paymentTypeEnglish: 'Payment type',
        paymentDate: 'पेमेंट दिनांक', paymentDateEnglish: 'Payment date',
        amount: 'एकूण रक्कम', amountEnglish: 'Amount in rupees',
        reference: 'व्यवहार क्रमांक', referenceEnglish: 'Reference — optional',
        referencePlaceholder: 'UPI / cheque / bank reference', amountWords: 'अक्षरी रक्कम',
        saveDownload: 'पावती जतन करा व PDF डाउनलोड करा', saving: 'जतन होत आहे…',
        saved: 'पावती जतन झाली',
      },
      payment: { upi: 'यूपीआय', cash: 'रोख', bank: 'बँक ट्रान्सफर', cheque: 'धनादेश' },
      history: {
        title: 'अलीकडील नोंदी', records: '{{count}} नोंदी दाखवत आहे', empty: 'अजून कोणतीही पावती जतन केलेली नाही.',
        excel: 'Excel डाउनलोड', loading: 'नोंदी मिळवत आहे…', previous: 'मागील', next: 'पुढील',
        page: 'पृष्ठ {{page}}', pagination: 'पावती नोंदींची पृष्ठे',
      },
      record: {
        view: 'पहा', download: 'PDF डाउनलोड', viewReceipt: 'पावती {{number}} पहा',
        downloadReceipt: 'पावती {{number}} PDF डाउनलोड करा', downloadError: 'पावती PDF डाउनलोड करता आली नाही. पुन्हा प्रयत्न करा.',
        details: 'पावती तपशील', close: 'बंद करा', name: 'नाव', mobile: 'व्हॉट्सअॅप नंबर', paymentType: 'पेमेंट प्रकार',
        paymentDate: 'पेमेंट दिनांक', amount: 'एकूण रक्कम', reference: 'व्यवहार क्रमांक', amountWords: 'अक्षरी रक्कम',
        createdBy: 'नोंद करणारे', createdAt: 'नोंद दिनांक',
      },
      preview: { step: '02', title: 'पावती पूर्वदृश्य' },
      receipt: {
        number: 'पावती क्र.', title: 'पावती', date: 'दिनांक', name: 'नाव :', mobile: 'व्हॉट्सअॅप नंबर :',
        paymentType: 'पेमेंट प्रकार :', totalAmount: 'एकूण रक्कम', paymentDate: 'पेमेंट दिनांक :',
        reference: 'व्यवहार क्र. :', amountWords: 'अक्षरी रक्कम :',
        computerNote: 'ही संगणकीकृत पावती आहे. स्वाक्षरीची आवश्यकता नाही.', templateAlt: 'ॐ साईनाथ सेवा मंडळ पावती नमुना',
      },
      export: {
        title: 'Excel नोंदवही डाउनलोड', copy: 'पावती क्रमांकाची सुरुवात आणि शेवट निवडा.',
        financialYear: 'आर्थिक वर्ष', range: 'पावती रेंज', rangeHelp: 'सर्व किंवा ठराविक पावत्या निवडा', all: 'सर्व पावत्या',
        from: 'येथून', to: 'येथपर्यंत', start: 'सुरुवातीपासून', tillEnd: 'शेवटपर्यंत',
        selected: '{{count}} पावत्या निवडल्या', total: 'एकूण रक्कम: ₹ {{amount}}',
        download: 'Excel डाउनलोड करा', downloading: 'Excel तयार होत आहे…', cancel: 'रद्द करा',
        loading: 'नोंदी मिळवत आहे…', noRecords: 'या आर्थिक वर्षात नोंदी उपलब्ध नाहीत.',
        invalidRange: 'योग्य पावती क्रमांकाची रेंज निवडा.', downloadSuccess: 'Excel यशस्वीरित्या डाउनलोड झाला.',
      },
      status: {
        session: 'कृपया पुन्हा लॉगिन करा.', required: 'कृपया आवश्यक माहिती पूर्ण करा.',
        reserving: 'पावती क्रमांक राखीव केला जात आहे…', pdf: 'PDF तयार होत आहे…',
        database: 'डेटाबेसमध्ये पावती जतन होत आहे…',
        receiptSaved: 'पावती {{number}} जतन आणि डाउनलोड झाली.', newReceipt: 'नवीन पावती तयार आहे.',
      },
      errors: {
        invalidLogin: 'ID किंवा पासवर्ड चुकीचा आहे.', tooMany: 'खूप प्रयत्न झाले. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.',
        network: 'नेटवर्क कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.', permission: 'डेटाबेस परवानगी नाकारली. Firebase Database Rules deploy करा.',
        generic: 'काहीतरी चूक झाली. कृपया पुन्हा प्रयत्न करा.', receiptNumber: 'पावती क्रमांक उपलब्ध नाही.',
        name: 'नाव आवश्यक आहे.', mobile: '१० अंकी व्हॉट्सअॅप नंबर टाका.', date: 'दिनांक आवश्यक आहे.', amount: 'योग्य रक्कम टाका.',
      },
      connection: { online: 'ऑनलाइन', offline: 'ऑफलाइन', connecting: 'तपासत आहे…', offlineCopy: 'डेटाबेस कनेक्शन उपलब्ध नाही. जतन करण्यापूर्वी इंटरनेट पुन्हा सुरू होण्याची प्रतीक्षा करा.' },
    },
  },
  en: {
    translation: {
      app: { description: 'Digital receipt, expense, and financial report management for Om Sainath Seva Mandal.', loading: 'Loading application…', loadingRecords: 'Loading records…' },
      language: { marathi: 'मराठी', english: 'English', select: 'Select language' },
      theme: { select: 'Select theme', system: 'System', light: 'Light', dark: 'Dark' },
      datePicker: { selectDate: 'Select date', selectYear: 'Select year', previousMonth: 'Previous month', nextMonth: 'Next month', today: 'Today' },
      header: {
        organization: 'Om Sainath Seva Mandal, Regd.', title: 'Digital Contribution Receipt',
        subtitle: 'Enter details, review the receipt, and download the PDF.', logout: 'Log out',
      },
      nav: {
        appName: 'Sainath Seva', management: 'Mandal management', primary: 'Primary navigation', operator: 'Operator',
        dashboard: 'Dashboard', receipts: 'Receipts', expenses: 'Expenses', reports: 'Reports', settings: 'Settings',
      },
      dashboard: {
        kicker: 'Overview', title: 'Dashboard', subtitle: 'Financial year {{year}} at a glance', newReceipt: 'New receipt',
        summary: 'Financial summary', collections: 'Total collections', expenses: 'Total expenses', balance: 'Balance', available: 'Available funds',
        latestReceipt: 'Latest receipt', receiptsCount: 'receipts', entries: 'entries', noData: 'No data',
        recentReceipts: 'Recent receipts', recentReceiptsCopy: 'Latest contribution records', recentExpenses: 'Recent expenses',
        recentExpensesCopy: 'Latest expense records', viewAll: 'View all', manage: 'Manage', noReceipts: 'No receipts yet.', noExpenses: 'No expenses yet.',
      },
      expense: {
        kicker: 'Transactions', title: 'Expense management', subtitle: 'Record and review Mandal expenses', formTitle: 'Expense information', add: 'New expense', addCopy: 'Enter the complete expense information',
        date: 'Expense date', category: 'Category', description: 'Description', descriptionPlaceholder: 'e.g. Decoration materials', amount: 'Amount',
        paymentType: 'Payment type', reference: 'Transaction reference', referencePlaceholder: 'Optional reference', save: 'Save expense', saving: 'Saving…',
        saved: 'Expense saved successfully.', validation: 'Enter a date, description, and valid amount.', history: 'Expense register',
        historyCopy: 'Financial year {{year}}', empty: 'No expenses have been saved yet.', previewTitle: 'Expense voucher preview',
        voucherTitle: 'EXPENSE VOUCHER', voucherNumber: 'Voucher No.', previewDraft: 'DRAFT', downloadPdf: 'Download expense PDF', downloadingPdf: 'Preparing PDF…', templateAlt: 'Om Sainath Seva Mandal expense voucher template',
        categories: { festival: 'Festival', decoration: 'Decoration', utilities: 'Utilities', food: 'Food and prasad', transport: 'Transport', other: 'Other' },
      },
      reports: {
        kicker: 'Analytics', title: 'Reports', subtitle: 'Financial summary and downloads', download: 'Download Excel', receiptRegister: 'Receipt register',
        receiptRegisterCopy: 'Download receipts by number range.', includes: 'Includes name, WhatsApp number, payment, amount, and totals', chooseRange: 'Choose range',
        year: 'Financial year', averageReceipt: 'Average receipt', transactions: 'Total transactions', paymentBreakdown: 'Collections by payment type',
        paymentCopy: 'Amount received through each payment method', expenseBreakdown: 'Expenses by category', expenseCopy: 'Where the Mandal spent the most',
        monthly: 'Monthly cash flow', monthlyCopy: 'Collections, expenses, and net movement', collectionsShort: 'Collections', expensesShort: 'Expenses', net: 'Net',
        noActivity: 'No transactions are available for this financial year.', noExpenses: 'No expenses are available for this financial year.', records: '{{count}} records',
        csvTitle: 'Complete CSV', csvCopy: 'All receipts and expenses in one file.', downloadCsv: 'Download CSV',
        csv: { type: 'Type', date: 'Date', number: 'Receipt number', details: 'Name / description', method: 'Payment / category', amount: 'Amount', receipt: 'Receipt', expense: 'Expense' },
      },
      settings: {
        kicker: 'System', title: 'Settings', subtitle: 'Language, theme, and application information', language: 'Language', languageCopy: 'Choose the application language.',
        appearance: 'Appearance', appearanceCopy: 'Follow your device theme or choose Light / Dark.',
        install: 'Install application', installCopy: 'Install this app on your phone or computer for quick access and offline use.',
        installButton: 'Install app', installed: 'Application is installed', installHelp: 'Choose “Add to Home Screen” or “Install app” from your browser menu.',
        preferences: 'Default preferences', preferencesCopy: 'Choose the starting values used for new entries.', defaultPage: 'Starting page',
        defaultReceiptPayment: 'Default receipt payment', defaultExpensePayment: 'Default expense payment',
        dataStatus: 'Data and connection', dataStatusCopy: 'Current database status', receipts: 'Total receipts', expenses: 'Expense entries',
        lastReceipt: 'Latest receipt', connection: 'Connection', backup: 'Data backup', backupCopy: 'Download all receipts and expenses in a safe JSON file.',
        downloadBackup: 'Download backup', refresh: 'Refresh data', openReports: 'Open reports', offlineNote: 'Keep the app open until the saved confirmation appears.',
        operator: 'Operator information', operatorCopy: 'Current secure session', name: 'Name', financialYear: 'Financial year', database: 'Database',
        organization: 'Organization', organizationCopy: 'Digital receipt and financial management system',
      },
      auth: {
        secure: 'Secure access', title: 'Operator login', copy: 'Sign in with an authorized ID to create receipts.',
        operatorId: 'Operator ID', password: 'Password', login: 'Log in', loggingIn: 'Logging in…', firebase: 'Secured by Firebase',
      },
      form: {
        step: '01', title: 'Receipt information', newReceipt: 'New receipt', receiptNumber: 'Receipt number',
        databaseSequence: 'Database sequence', loadingNumber: 'Getting number…', rulesRequired: 'Firebase Database Rules required',
        name: 'Name', fullName: 'Full name', namePlaceholder: 'e.g. Kunal Jadhav', mobile: 'WhatsApp Number',
        mobileEnglish: 'WhatsApp Number', mobilePlaceholder: '10-digit WhatsApp number', paymentType: 'Payment type',
        paymentTypeEnglish: 'Payment type', paymentDate: 'Payment date', paymentDateEnglish: 'Payment date',
        amount: 'Total amount', amountEnglish: 'Amount in rupees', reference: 'Transaction reference',
        referenceEnglish: 'Optional', referencePlaceholder: 'UPI / cheque / bank reference', amountWords: 'Amount in words',
        saveDownload: 'Save receipt and download PDF', saving: 'Saving…', saved: 'Receipt saved',
      },
      payment: { upi: 'UPI', cash: 'Cash', bank: 'Bank transfer', cheque: 'Cheque' },
      history: {
        title: 'Recent records', records: 'Showing {{count}} records', empty: 'No receipts have been saved yet.',
        excel: 'Download Excel', loading: 'Loading records…', previous: 'Previous', next: 'Next',
        page: 'Page {{page}}', pagination: 'Receipt record pages',
      },
      record: {
        view: 'View', download: 'Download PDF', viewReceipt: 'View receipt {{number}}',
        downloadReceipt: 'Download receipt {{number}} as PDF', downloadError: 'The receipt PDF could not be downloaded. Please try again.',
        details: 'Receipt details', close: 'Close', name: 'Name', mobile: 'WhatsApp Number', paymentType: 'Payment type',
        paymentDate: 'Payment date', amount: 'Total amount', reference: 'Transaction reference', amountWords: 'Amount in words',
        createdBy: 'Created by', createdAt: 'Created at',
      },
      preview: { step: '02', title: 'Receipt preview' },
      receipt: {
        number: 'Receipt No.', title: 'RECEIPT', date: 'Date', name: 'Name:', mobile: 'WhatsApp Number:',
        paymentType: 'Payment type:', totalAmount: 'Total amount', paymentDate: 'Payment date:',
        reference: 'Reference:', amountWords: 'Amount in words:',
        computerNote: 'This is a computer-generated receipt. No signature is required.', templateAlt: 'Om Sainath Seva Mandal receipt template',
      },
      export: {
        title: 'Download Excel register', copy: 'Choose all receipts or a simple receipt range.', financialYear: 'Financial year',
        range: 'Receipt range', rangeHelp: 'Choose all or select exact receipts', all: 'All receipts',
        from: 'From', to: 'To', start: 'Start', tillEnd: 'Till end', selected: '{{count}} receipts selected', total: 'Total amount: ₹ {{amount}}',
        download: 'Download Excel', downloading: 'Creating Excel…', cancel: 'Cancel', loading: 'Loading records…',
        noRecords: 'No records are available for this financial year.', invalidRange: 'Select a valid receipt-number range.',
        downloadSuccess: 'Excel downloaded successfully.',
      },
      status: {
        session: 'Please log in again.', required: 'Please complete the required information.',
        reserving: 'Reserving the receipt number…', pdf: 'Creating PDF…', database: 'Saving receipt to the database…',
        receiptSaved: 'Receipt {{number}} was saved and downloaded.', newReceipt: 'A new receipt is ready.',
      },
      errors: {
        invalidLogin: 'The ID or password is incorrect.', tooMany: 'Too many attempts. Please try again later.',
        network: 'Check your network connection and try again.', permission: 'Database access was denied. Deploy the Firebase Database Rules.',
        generic: 'Something went wrong. Please try again.', receiptNumber: 'A receipt number is not available.',
        name: 'Name is required.', mobile: 'Enter a 10-digit WhatsApp number.', date: 'Date is required.', amount: 'Enter a valid amount.',
      },
      connection: { online: 'Online', offline: 'Offline', connecting: 'Checking…', offlineCopy: 'The database connection is unavailable. Wait for the internet connection before saving.' },
    },
  },
} as const

const savedLanguage =
  typeof window !== 'undefined'
    ? (window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as AppLanguage | null)
    : null

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: savedLanguage === 'en' ? 'en' : 'mr',
    fallbackLng: 'mr',
    supportedLngs: ['mr', 'en'],
    interpolation: { escapeValue: false },
    returnNull: false,
  })
}

export default i18n
