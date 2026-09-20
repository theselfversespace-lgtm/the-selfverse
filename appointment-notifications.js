/* =========================================================
   THE SELFVERSE - NEW APPOINTMENT NOTIFICATIONS
   ========================================================= */

(function () {
  "use strict";

  const CHECK_EVERY_MS = 15000;
  const COLLECTION = "appointments";

  let knownIds = new Set();
  let initialized = false;
  let timer = null;

  /* =========================
     CREATE NOTIFICATION STYLE
  ========================= */

  function addStyles() {
    if (document.getElementById("selfverseNotificationStyles")) return;

    const style = document.createElement("style");

    style.id = "selfverseNotificationStyles";

    style.textContent = `
      #selfverseNewAppointmentNotice {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 99999;
        width: min(420px, calc(100vw - 40px));
        background: #fffaf0;
        border: 1px solid #d7b56d;
        border-left: 6px solid #b88a35;
        border-radius: 16px;
        box-shadow: 0 12px 35px rgba(0,0,0,.18);
        padding: 16px 18px;
        display: none;
        font-family: Arial, sans-serif;
      }

      #selfverseNewAppointmentNotice.show {
        display: block;
        animation: selfverseNoticeIn .25s ease;
      }

      #selfverseNewAppointmentNotice .title {
        font-size: 17px;
        font-weight: 800;
        color: #30281f;
        margin-bottom: 6px;
      }

      #selfverseNewAppointmentNotice .text {
        font-size: 14px;
        color: #655b4f;
        line-height: 1.45;
      }

      #selfverseNewAppointmentNotice .actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      #selfverseNewAppointmentNotice button {
        border: 0;
        border-radius: 10px;
        padding: 9px 13px;
        cursor: pointer;
        font-weight: 700;
      }

      #selfverseViewAppointments {
        background: #b88a35;
        color: white;
      }

      #selfverseCloseNotice {
        background: #eee7da;
        color: #40372e;
      }

      @keyframes selfverseNoticeIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }

        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;

    document.head.appendChild(style);
  }


  /* =========================
     CREATE NOTIFICATION BOX
  ========================= */

  function createNotice() {

    if (document.getElementById("selfverseNewAppointmentNotice")) {
      return;
    }

    const notice = document.createElement("div");

    notice.id = "selfverseNewAppointmentNotice";

    notice.innerHTML = `
      <div class="title">
        🔔 New appointment received
      </div>

      <div class="text" id="selfverseNoticeText">
        A new appointment has been submitted.
      </div>

      <div class="actions">

        <button id="selfverseViewAppointments">
          View Appointments
        </button>

        <button id="selfverseCloseNotice">
          Close
        </button>

      </div>
    `;

    document.body.appendChild(notice);


    /* Close button */

    document.getElementById(
      "selfverseCloseNotice"
    ).onclick = function () {

      notice.classList.remove("show");

    };


    /* View appointments button */

    document.getElementById(
      "selfverseViewAppointments"
    ).onclick = function () {

      notice.classList.remove("show");

      const target =
        document.getElementById("appointments") ||
        document.getElementById("appointmentList") ||
        document.querySelector("[id*='appointment']");

      if (target) {

        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

      } else {

        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth"
        });

      }

    };

  }


  /* =========================
     NOTIFICATION SOUND
  ========================= */

  function playSound() {

    try {

      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext;

      if (!AudioContext) return;

      const audio = new AudioContext();

      const oscillator =
        audio.createOscillator();

      const gain =
        audio.createGain();

      oscillator.frequency.value = 880;

      gain.gain.value = 0.04;

      oscillator.connect(gain);

      gain.connect(audio.destination);

      oscillator.start();

      oscillator.stop(
        audio.currentTime + 0.2
      );

    } catch (error) {

      console.log(
        "Notification sound unavailable."
      );

    }

  }


  /* =========================
     BROWSER NOTIFICATION
  ========================= */

  function browserNotification(appointments) {

    if (!("Notification" in window)) {
      return;
    }

    if (Notification.permission !== "granted") {
      return;
    }

    const first =
      appointments[0] || {};

    const extra =
      appointments.length > 1
        ? " +" + (appointments.length - 1) + " more"
        : "";

    new Notification(
      "THE SELFVERSE - New Appointment",
      {
        body:
          (first.name || "A customer") +
          " submitted an appointment." +
          extra
      }
    );

  }


  /* =========================
     SHOW NEW APPOINTMENT
  ========================= */

  function showNewAppointment(
    appointments
  ) {

    createNotice();

    const notice =
      document.getElementById(
        "selfverseNewAppointmentNotice"
      );

    const text =
      document.getElementById(
        "selfverseNoticeText"
      );

    const first =
      appointments[0] || {};

    if (appointments.length === 1) {

      text.innerHTML =
        "<strong>" +
        escapeHTML(
          first.name || "A customer"
        ) +
        "</strong> just submitted a new appointment.";

    } else {

      text.innerHTML =
        "<strong>" +
        appointments.length +
        " new appointments</strong> have been submitted.";

    }

    notice.classList.add("show");

    playSound();

    browserNotification(
      appointments
    );

  }


  /* =========================
     SAFE HTML
  ========================= */

  function escapeHTML(value) {

    return String(value ?? "")
      .replace(
        /[&<>"']/g,
        function (character) {

          return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
          }[character];

        }
      );

  }


  /* =========================
     CHECK FIREBASE
  ========================= */

  async function checkAppointments() {

    /*
      Wait until Firebase is available.
    */

    if (
      !window.firebase ||
      !firebase.firestore
    ) {

      return;

    }


    try {

      const db =
        firebase.firestore();


      const snapshot =
        await db
          .collection(COLLECTION)
          .get();


      const appointments = [];


      snapshot.forEach(
        function (doc) {

          appointments.push({

            id: doc.id,

            ...doc.data()

          });

        }
      );


      /*
        First check:

        Remember all existing appointments
        without showing notifications for them.
      */

      if (!initialized) {

        appointments.forEach(
          function (appointment) {

            knownIds.add(
              appointment.id
            );

          }
        );

        initialized = true;

        return;

      }


      /*
        Find appointments that weren't
        present during the previous check.
      */

      const newAppointments =
        appointments.filter(
          function (appointment) {

            return !knownIds.has(
              appointment.id
            );

          }
        );


      /*
        Remember current appointments.
      */

      appointments.forEach(
        function (appointment) {

          knownIds.add(
            appointment.id
          );

        }
      );


      /*
        Show notification if something new
        was found.
      */

      if (
        newAppointments.length > 0
      ) {

        showNewAppointment(
          newAppointments
        );

      }

    } catch (error) {

      console.warn(
        "THE SELFVERSE notification check:",
        error
      );

    }

  }


  /* =========================
     OPTIONAL BROWSER PERMISSION
  ========================= */

  window.selfverseEnableNotifications =
    async function () {

      if (
        !("Notification" in window)
      ) {

        alert(
          "This browser does not support notifications."
        );

        return;

      }


      try {

        const permission =
          await Notification.requestPermission();


        if (
          permission === "granted"
        ) {

          alert(
            "Notifications are enabled."
          );

        } else {

          alert(
            "Browser notifications were not enabled."
          );

        }

      } catch (error) {

        console.log(
          "Notification permission error:",
          error
        );

      }

    };


  /* =========================
     START
  ========================= */

  function start() {

    addStyles();

    createNotice();

    /*
      Initial check.
    */

    checkAppointments();


    /*
      Check every 15 seconds.
    */

    if (timer) {

      clearInterval(timer);

    }

    timer =
      setInterval(
        checkAppointments,
        CHECK_EVERY_MS
      );

  }


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