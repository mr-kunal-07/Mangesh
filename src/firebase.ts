import { getAnalytics, isSupported } from 'firebase/analytics'
import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyClcOerWz0H3Af_g6TJgO9RAMr4k7gzaeQ',
  authDomain: 'thesamplebee.firebaseapp.com',
  databaseURL: 'https://thesamplebee-default-rtdb.firebaseio.com',
  projectId: 'thesamplebee',
  storageBucket: 'thesamplebee.firebasestorage.app',
  messagingSenderId: '183586021990',
  appId: '1:183586021990:web:4f6fa16b88bdedf5a243a7',
  measurementId: 'G-QVE0790TEF',
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const database = getDatabase(app)

if (typeof window !== 'undefined') {
  void isSupported().then((supported) => {
    if (supported) getAnalytics(app)
  })
}

