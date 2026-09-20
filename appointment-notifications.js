/* =========================================================
   THE SELFVERSE — NEW APPOINTMENT NOTIFICATIONS
   Firebase 12.19.0 compatible
   ========================================================= */

(function () {
  "use strict";

  const CHECK_EVERY_MS = 15000;
  const FIREBASE_VERSION = "12.19.0";
  const COLLECTION_NAME = "appointments";

  let db = null;
  let knownAppointmentIds = new Set();
  let initialized = false;
  let timer = null;

  /* ---------- Small helper ---------- */

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /* ---------- Add notification styling ---------- */

  function addStyles() {
    if (document.getElementById("selfverseNotificationStyles")) return;

    const style = document.createElement("style");
    style.id = "selfverseNotificationStyles";

    style.textContent = `
      #selfverseNewAppointmentNotice {
        position: fixed;
        top: 20px;
        right: 20px;
        width: min(380px, calc(100vw - 40px));
        background: #1f2a24;
        color: white;
        padding: 18px;
        border-radius: 16px;
        box-shadow: 0 12px 35px rgba(0,0,0,.28);
        z-index: 999999;
        display: none;
        font-family: Arial, sans-serif;
        border: 1px solid rgba(255,255,255,.15);
      }

      #selfverseNewAppointmentNotice.show {
        display: block;
        animation: selfverseNoticeIn .35s ease;
      }

      @keyframes selfverseNoticeIn {
        from {
          opacity: 0;
          transform: translateY(-15px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      #selfverseNewAppointmentNotice .notice-title {
        font-size: 19px;
        font-weight: 700;
        margin-bottom: 7px;
      }

      #selfverseNewAppointmentNotice .notice-text {
        font-size: 14px;
        opacity: .9;
        margin-bottom: 14px;
        line-height: 1.5;
      }

      #selfverseNewAppointmentNotice button {
        border: 0;
        padding: 9px 13px;
        border-radius: 9px;
        cursor: pointer;
        font-weight: 600;
        margin-right: 7px;
      }

      #selfverseViewAppointments {
        background: #d8b56d;
        color: #172019;
      }

      #selfverseCloseNotice {
        background: rgba(255,255,255,.12);
        color: white;
      }

      .selfverse-new-appointment {
        border: 2px solid #d8b56d !important;
        position: relative;
      }

      .selfverse-new-badge {
        display: inline-block;
        background: #d8b56d;
        color: #172019;
        padding: 4px 8px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 800;
        margin-bottom: 8px;
      }
    `;

    document.head.appendChild(style);
  }

  /* ---------- Create notification banner ---------- */

  function createBanner() {
    if (document.getElementById("selfverseNewAppointmentNotice")) return;

    const banner = document.createElement("div");
    banner.id = "selfverseNewAppointmentNotice";

    banner.innerHTML = `
      <div class="notice-title">
        🔔 New appointment received
      </div>

      <div class="notice-text" id="selfverseNoticeText">
        A new appointment has been received.
      </div>

      <button id="selfverseViewAppointments">
        View Appointments
      </button>

      <button id="selfverseCloseNotice">
        Close
      </button>
    `;

    document.body.appendChild(banner);

    document
      .getElementById("selfverseViewAppointments")
      .addEventListener("click", function () {
        banner.classList.remove("show");

        const appointmentSection =
          document.getElementById("appointments");

        if (appointmentSection) {
          appointmentSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      });

    document
      .getElementById("selfverseCloseNotice")
      .addEventListener("click", function () {
        banner.classList.remove("show");
      });
  }

  /* ---------- Sound ---------- */

  function playSound() {
    try {
      const AudioContext =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContext) return;

      const audio = new AudioContext();

      const oscillator = audio.createOscillator();
      const gain = audio.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(
        880,
        audio.currentTime
      );

      gain.gain.setValueAtTime(
        0.0001,
        audio.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.18,
        audio.currentTime + 0.02
      );

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audio.currentTime + 0.35
      );

      oscillator.connect(gain);
      gain.connect(audio.destination);

      oscillator.start();

      oscillator.stop(audio.currentTime + 0.4);
    } catch (e) {
      console.log(
        "THE SELFVERSE notification sound unavailable."
      );
    }
  }

  /* ---------- Browser notification ---------- */

  function browserNotification(count) {
    try {
      if (!("Notification" in window)) return;

      if (Notification.permission === "granted") {
        new Notification(
          "THE SELFVERSE — New Appointment",
          {
            body:
              count === 1
                ? "You have received 1 new appointment."
                : `You have received ${count} new appointments.`,
            icon: ""
          }
        );
      }
    } catch (e) {
      console.log(
        "THE SELFVERSE browser notification unavailable."
      );
    }
  }

  /* ---------- Highlight new appointment ---------- */

  function highlightNewAppointments(ids) {
    ids.forEach(function (id) {
      const possibleElements = document.querySelectorAll(
        ".appointment"
      );

      possibleElements.forEach(function (element) {
        if (
          element.dataset &&
          element.dataset.appointmentId === id
        ) {
          if (
            !element.querySelector(
              ".selfverse-new-badge"
            )
          ) {
            const badge = document.createElement("div");

            badge.className =
              "selfverse-new-badge";

            badge.textContent = "🆕 NEW";

            element.insertBefore(
              badge,
              element.firstChild
            );
          }

          element.classList.add(
            "selfverse-new-appointment"
          );
        }
      });
    });
  }

  /* ---------- Show notification ---------- */

  function showNotification(count) {
    createBanner();

    const banner =
      document.getElementById(
        "selfverseNewAppointmentNotice"
      );

    const text =
      document.getElementById(
        "selfverseNoticeText"
      );

    if (!banner) return;

    if (text) {
      text.textContent =
        count === 1
          ? "1 new appointment has been received."
          : `${count} new appointments have been received.`;
    }

    banner.classList.add("show");

    playSound();

    browserNotification(count);
  }

  /* ---------- Wait for Firebase ---------- */

  async function waitForFirebase() {
    try {
      const appModule = await import(
        `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`
      );

      /*
       Firebase may not be initialized yet because
       counsello.html initializes it inside a module.
       So we wait and check repeatedly.
      */

      for (let i = 0; i < 60; i++) {

        if (
          appModule.getApps &&
          appModule.getApps().length > 0
        ) {
          console.log(
            "THE SELFVERSE: Firebase detected."
          );

          return appModule;
        }

        await wait(500);
      }

      throw new Error(
        "Firebase app was not initialized within 30 seconds."
      );

    } catch (error) {

      console.error(
        "THE SELFVERSE: Could not connect to Firebase.",
        error
      );

      return null;
    }
  }

  /* ---------- Check appointments ---------- */

  async function checkAppointments() {

    if (!db) return;

    try {

      const firestoreModule = await import(
        `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`
      );

      const {
        collection,
        getDocs
      } = firestoreModule;

      const snapshot = await getDocs(
        collection(db, COLLECTION_NAME)
      );

      const currentIds = new Set();

      snapshot.forEach(function (doc) {

        currentIds.add(doc.id);

      });

      /* ------------------------------------------
         FIRST CHECK

         Existing appointments are considered known.
         They will NOT trigger notifications.
         ------------------------------------------ */

      if (!initialized) {

        knownAppointmentIds =
          new Set(currentIds);

        initialized = true;

        console.log(
          "THE SELFVERSE: Existing appointments loaded:",
          knownAppointmentIds.size
        );

        return;
      }

      /* ------------------------------------------
         FIND NEW APPOINTMENTS
         ------------------------------------------ */

      const newAppointments = [];

      currentIds.forEach(function (id) {

        if (!knownAppointmentIds.has(id)) {
          newAppointments.push(id);
        }

      });

      /* ------------------------------------------
         NEW APPOINTMENT FOUND
         ------------------------------------------ */

      if (newAppointments.length > 0) {

        console.log(
          "THE SELFVERSE: New appointment detected:",
          newAppointments.length
        );

        showNotification(
          newAppointments.length
        );

        highlightNewAppointments(
          newAppointments
        );

        newAppointments.forEach(function (id) {
          knownAppointmentIds.add(id);
        });
      }

      /*
       Keep the known list synchronized.
      */

      currentIds.forEach(function (id) {
        knownAppointmentIds.add(id);
      });

    } catch (error) {

      console.error(
        "THE SELFVERSE: Appointment check failed.",
        error
      );
    }
  }

  /* ---------- Start system ---------- */

  async function start() {

    addStyles();
    createBanner();

    console.log(
      "THE SELFVERSE: Starting appointment notification system..."
    );

    const appModule =
      await waitForFirebase();

    if (!appModule) return;

    try {

      const firestoreModule = await import(
        `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`
      );

      db =
        firestoreModule.getFirestore(
          appModule.getApps()[0]
        );

      console.log(
        "THE SELFVERSE: Notification system connected to Firebase."
      );

      /*
       First check.
       This loads existing appointments without
       showing a notification.
      */

      await checkAppointments();

      /*
       Check every 15 seconds.
      */

      timer = setInterval(
        checkAppointments,
        CHECK_EVERY_MS
      );

      console.log(
        "THE SELFVERSE: Checking for new appointments every 15 seconds."
      );

    } catch (error) {

      console.error(
        "THE SELFVERSE: Notification system could not start.",
        error
      );
    }
  }

  /* ---------- Enable browser notifications ---------- */

  window.selfverseEnableNotifications =
    async function () {

      try {

        if (!("Notification" in window)) {
          alert(
            "Your browser does not support notifications."
          );
          return;
        }

        const permission =
          await Notification.requestPermission();

        if (permission === "granted") {

          alert(
            "🔔 THE SELFVERSE notifications are enabled."
          );

        } else {

          alert(
            "Notifications were not enabled."
          );
        }

      } catch (error) {

        console.error(error);

      }
    };

  /* ---------- Start ---------- */

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      start
    );

  } else {

    start();

  }

})();