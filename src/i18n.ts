import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export const LANGUAGE_STORAGE_KEY = 'banti.language'
export type AppLanguage = 'mr' | 'en'

const resources = {
  mr: {
    translation: {
      language: { marathi: 'मराठी', english: 'English', select: 'भाषा निवडा' },
      header: {
        organization: 'ॐ साईनाथ सेवा मंडळ, रजि.',
        title: 'डिजिटल वर्गणी पावती',
        subtitle: 'माहिती भरा, पावती तपासा आणि PDF डाउनलोड करा.',
        logout: 'लॉग आउट',
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
        mobile: 'मोबाईल नं.', mobileEnglish: 'Mobile number', mobilePlaceholder: '10 अंकी नंबर',
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
        title: 'अलीकडील नोंदी', records: '{{count}} नोंदी', empty: 'अजून कोणतीही पावती जतन केलेली नाही.',
        excel: 'Excel डाउनलोड',
      },
      preview: { step: '02', title: 'पावती पूर्वदृश्य' },
      receipt: {
        number: 'पावती क्र.', title: 'पावती', date: 'दिनांक', name: 'नाव :', mobile: 'मोबाईल नं. :',
        paymentType: 'पेमेंट प्रकार :', totalAmount: 'एकूण रक्कम', paymentDate: 'पेमेंट दिनांक :',
        reference: 'व्यवहार क्र. :', amountWords: 'अक्षरी रक्कम :',
        computerNote: 'ही संगणकीकृत पावती आहे. स्वाक्षरीची आवश्यकता नाही.',
      },
      export: {
        title: 'Excel नोंदवही डाउनलोड', copy: 'पावती क्रमांकाची सुरुवात आणि शेवट निवडा.',
        financialYear: 'आर्थिक वर्ष', from: 'सुरुवातीची पावती', to: 'शेवटची पावती',
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
        name: 'नाव आवश्यक आहे.', mobile: '१० अंकी मोबाईल नंबर टाका.', date: 'दिनांक आवश्यक आहे.', amount: 'योग्य रक्कम टाका.',
      },
    },
  },
  en: {
    translation: {
      language: { marathi: 'मराठी', english: 'English', select: 'Select language' },
      header: {
        organization: 'Om Sainath Seva Mandal, Regd.', title: 'Digital Contribution Receipt',
        subtitle: 'Enter details, review the receipt, and download the PDF.', logout: 'Log out',
      },
      auth: {
        secure: 'Secure access', title: 'Operator login', copy: 'Sign in with an authorized ID to create receipts.',
        operatorId: 'Operator ID', password: 'Password', login: 'Log in', loggingIn: 'Logging in…', firebase: 'Secured by Firebase',
      },
      form: {
        step: '01', title: 'Receipt information', newReceipt: 'New receipt', receiptNumber: 'Receipt number',
        databaseSequence: 'Database sequence', loadingNumber: 'Getting number…', rulesRequired: 'Firebase Database Rules required',
        name: 'Name', fullName: 'Full name', namePlaceholder: 'e.g. Kunal Jadhav', mobile: 'Mobile number',
        mobileEnglish: 'Mobile number', mobilePlaceholder: '10-digit number', paymentType: 'Payment type',
        paymentTypeEnglish: 'Payment type', paymentDate: 'Payment date', paymentDateEnglish: 'Payment date',
        amount: 'Total amount', amountEnglish: 'Amount in rupees', reference: 'Transaction reference',
        referenceEnglish: 'Optional', referencePlaceholder: 'UPI / cheque / bank reference', amountWords: 'Amount in words',
        saveDownload: 'Save receipt and download PDF', saving: 'Saving…', saved: 'Receipt saved',
      },
      payment: { upi: 'UPI', cash: 'Cash', bank: 'Bank transfer', cheque: 'Cheque' },
      history: { title: 'Recent records', records: '{{count}} records', empty: 'No receipts have been saved yet.', excel: 'Download Excel' },
      preview: { step: '02', title: 'Receipt preview' },
      receipt: {
        number: 'Receipt No.', title: 'RECEIPT', date: 'Date', name: 'Name:', mobile: 'Mobile No.:',
        paymentType: 'Payment type:', totalAmount: 'Total amount', paymentDate: 'Payment date:',
        reference: 'Reference:', amountWords: 'Amount in words:',
        computerNote: 'This is a computer-generated receipt. No signature is required.',
      },
      export: {
        title: 'Download Excel register', copy: 'Select the starting and ending receipt numbers.', financialYear: 'Financial year',
        from: 'From receipt', to: 'To receipt', selected: '{{count}} receipts selected', total: 'Total amount: ₹ {{amount}}',
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
        name: 'Name is required.', mobile: 'Enter a 10-digit mobile number.', date: 'Date is required.', amount: 'Enter a valid amount.',
      },
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

