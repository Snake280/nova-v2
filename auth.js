import {
  createApp,
  ref,
} from "https://unpkg.com/vue@3/dist/vue.esm-browser.js";
import firebase from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js";
import "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js";
import "https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js";

// 🔑 إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAUxHWPtXVUOsmvMWxSN4wyCmGTpSzVFik",
  authDomain: "nova-b91d4.firebaseapp.com",
  databaseURL: "https://nova-b91d4-default-rtdb.firebaseio.com",
  projectId: "nova-b91d4",
  storageBucket: "nova-b91d4.appspot.com",
  messagingSenderId: "993960824562",
  appId: "1:993960824562:web:a23cc53cab7adbe2c44a6b",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

createApp({
  setup() {
    const showAuthModal = ref(false);
    const authMode = ref("login");
    const authForm = ref({
      email: "",
      password: "",
      displayName: "",
      storeName: "",
      storeActivity: "",
    });
    const currentUser = ref(null);
    const loading = ref(false);
    const notification = ref({
      show: false,
      title: "",
      message: "",
      type: "success",
    });

    const showNotify = (title, message, type = "success") => {
      notification.value = { show: true, title, message, type };
      setTimeout(() => (notification.value.show = false), 3000);
    };

    const goToAdmin = async () => {
      if (!currentUser.value)
        return showNotify("خطأ", "الرجاء تسجيل الدخول أولاً.", "error");
      const emailKey = currentUser.value.email.replace(/\./g, ",");
      const snapshot = await db.ref("vendors").once("value");
      let vendorId = null;
      snapshot.forEach((vendor) => {
        if (vendor.val().users && vendor.val().users[emailKey] && !vendorId)
          vendorId = vendor.key;
      });
      if (vendorId)
        window.location.href = `admin-dashboard.html?vendorId=${vendorId}`;
      else showNotify("خطأ", "لم نجد متجراً مرتبطاً بحسابك.", "error");
    };

    auth.onAuthStateChanged((user) => {
      currentUser.value = user;
    });

    const handleAuth = async () => {
      loading.value = true;
      try {
        if (authMode.value === "register") {
          const userCredential = await auth.createUserWithEmailAndPassword(
            authForm.value.email,
            authForm.value.password
          );
          await userCredential.user.updateProfile({
            displayName: authForm.value.displayName,
          });
          const uid = userCredential.user.uid;
          const vendorId = `VND_${uid.slice(0, 10)}`;
          const emailKey = authForm.value.email.replace(/\./g, ",");
          await db.ref(`vendors/${vendorId}`).set({
            store_info: {
              logoName: authForm.value.storeName,
              activity: authForm.value.storeActivity,
              ownerEmail: authForm.value.email,
              createdAt: Date.now(),
            },
            users: {
              [emailKey]: {
                role: "owner",
                displayName: authForm.value.displayName,
              },
            },
            products: { demo_product: { name: "منتج تجريبي", price: 100 } },
            orders: {},
          });
          currentUser.value = userCredential.user;
          showNotify(
            "تم إنشاء متجرك بنجاح! 🎉",
            `مرحباً بك، ${authForm.value.displayName}.`
          );
          showAuthModal.value = false;
          setTimeout(goToAdmin, 1000);
        } else {
          const userCredential = await auth.signInWithEmailAndPassword(
            authForm.value.email,
            authForm.value.password
          );
          currentUser.value = userCredential.user;
          showNotify(
            "تم تسجيل الدخول",
            `مرحباً بك، ${userCredential.user.displayName || "المستخدم"}.`
          );
          showAuthModal.value = false;
          setTimeout(goToAdmin, 1000);
        }
      } catch (e) {
        let msg = "حدث خطأ، حاول مرة أخرى.";
        switch (e.code) {
          case "auth/wrong-password":
            msg = "كلمة المرور غير صحيحة.";
            break;
          case "auth/user-not-found":
            msg = "هذا المستخدم غير موجود.";
            break;
          case "auth/invalid-email":
            msg = "البريد الإلكتروني غير صحيح.";
            break;
          case "auth/email-already-in-use":
            msg = "البريد الإلكتروني مستخدم مسبقاً.";
            break;
          case "auth/weak-password":
            msg = "كلمة المرور ضعيفة.";
            break;
        }
        showNotify("خطأ في المصادقة", msg, "error");
      } finally {
        loading.value = false;
      }
    };

    const logout = () => auth.signOut();

    return {
      showAuthModal,
      authMode,
      authForm,
      currentUser,
      loading,
      handleAuth,
      logout,
      notification,
      showNotify,
      goToAdmin,
    };
  },
}).mount("#app");
