// Ways for visitors to come back: "Add to calendar" on each show, "Remind me" for shows whose next
// dates aren't out yet, the email sign-up, and the calendar people can subscribe to.

// ---- Email sign-up settings ----
// Sign-ups go to the free email service Kit (kit.com). Put the number of your Kit form here,
// e.g. "1234567". Until it is set, sign-ups are emailed to you through Web3Forms instead, so none are lost.
const KIT_FORM_ID = "";
const WEB3FORMS_KEY = "8aa5b675-4991-498a-a646-5b1167b2f08a";

(function () {
  const Cal = window.PosterdayCalendar;
  const FEED = "posterday.com/calendar.ics";
  const count = (path, title) => { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({path, title, event: true}); };
  const escAttr = t => String(t).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  // The bit at the bottom of each show card. Called from the card templates in index.html.
  window.remindBits = function (s, upcoming) {
    const n = escAttr(s.name);
    if (upcoming && Cal.hasDates(s)) {
      return `<details class="addcal"><summary>Add to calendar</summary><div class="calmenu">
        <a href="${escAttr(Cal.googleUrl(s))}" target="_blank" rel="noopener" data-cal="${n}" data-kind="google">Google Calendar</a>
        <a href="#" data-ics="${n}" data-cal="${n}" data-kind="ics">Apple, Outlook and others</a></div></details>`;
    }
    return `<button type="button" class="remindme" data-remind="${n}">Remind me when dates are out</button>`;
  };

  function downloadIcs(name) {
    const s = window.SHOWS.find(x => x.name === name);
    if (!s) return;
    const blob = new Blob([Cal.ics([s])], {type: "text/calendar;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = Cal.slug(s.name) + ".ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ---- Sign-up form ----
  const form = document.getElementById("signup");
  const status = document.getElementById("signupStatus");
  const showField = document.getElementById("signupShow");
  const showNote = document.getElementById("signupFor");

  function pickShow(name) {
    showField.value = name;
    showNote.innerHTML = name ? `We'll remind you about <b>${escAttr(name)}</b>. <button type="button" id="signupClear">Remind me about all shows</button>` : "";
    showNote.hidden = !name;
    const c = document.getElementById("signupClear");
    if (c) c.onclick = () => pickShow("");
  }

  document.addEventListener("click", e => {
    const ics = e.target.closest("a[data-ics]");
    if (ics) { e.preventDefault(); downloadIcs(ics.dataset.ics); }
    const cal = e.target.closest("[data-cal]");
    if (cal) { count("calendar/" + cal.dataset.cal, "Add to calendar: " + cal.dataset.cal + " (" + cal.dataset.kind + ")"); cal.closest("details").open = false; }
    const sub = e.target.closest("[data-subscribe]");
    if (sub) count("calendar-subscribe/" + sub.dataset.subscribe, "Subscribed to calendar (" + sub.dataset.subscribe + ")");
    const r = e.target.closest("[data-remind]");
    if (r) {
      pickShow(r.dataset.remind);
      document.getElementById("remind").scrollIntoView({behavior: "smooth"});
      setTimeout(() => form.email.focus({preventScroll: true}), 500);
    }
    // Close any open calendar menu when clicking elsewhere.
    document.querySelectorAll("details.addcal[open]").forEach(d => { if (!d.contains(e.target)) d.open = false; });
  });

  // Calendar subscribe links. webcal:// opens Apple Calendar and Outlook; Google needs its own link.
  document.getElementById("subApple").href = "webcal://" + FEED;
  document.getElementById("subGoogle").href = "https://calendar.google.com/calendar/r?cid=" + encodeURIComponent("webcal://" + FEED);
  document.getElementById("subCopy").onclick = async (e) => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText("https://" + FEED); b.textContent = "Link copied"; }
    catch (err) { b.textContent = "https://" + FEED; }
  };

  form.addEventListener("submit", async e => {
    e.preventDefault();
    if (!form.checkValidity()) { status.textContent = "Please enter your email address."; form.reportValidity(); return; }
    if (form.botcheck.checked) return;
    const email = form.email.value.trim(), show = showField.value;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; status.textContent = "Signing you up…";
    try {
      if (KIT_FORM_ID) {
        const body = new URLSearchParams({email_address: email});
        if (show) body.append("fields[show]", show);
        // Kit doesn't let other sites read its reply, so a sent request counts as done.
        await fetch("https://app.kit.com/forms/" + KIT_FORM_ID + "/subscriptions", {method: "POST", mode: "no-cors", body});
        done("Nearly there. Check your inbox and click the link to confirm.");
      } else {
        const r = await fetch("https://api.web3forms.com/submit", {
          method: "POST", headers: {"Content-Type": "application/json", "Accept": "application/json"},
          body: JSON.stringify({access_key: WEB3FORMS_KEY, from_name: "Posterday website", subject: "New Posterday sign-up" + (show ? ": " + show : ""), email, reminder_for: show || "All shows"})
        });
        const j = await r.json();
        if (!j.success) throw new Error(j.message);
        done("Thanks, you're on the list. We'll email you when dates are announced.");
      }
    } catch (err) {
      status.textContent = "Sorry, that didn't work. Please check your connection and try again.";
    }
    btn.disabled = false;
    function done(msg) {
      count("signup" + (show ? "/" + show : ""), "Email sign-up" + (show ? ": " + show : ""));
      form.reset(); pickShow(""); status.textContent = msg;
    }
  });
})();
