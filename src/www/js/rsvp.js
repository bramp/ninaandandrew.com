// The last rsvp object we received.
// This could have come from a webrequest, and in future a cookie.
var rsvp = {
  ceremony: false,
};

const max_guests = 10;

const base_url = choose_rsvp_url();

// Example data
/*
rsvp = {
  "ceremony": true,
  "reception": true,
  "comments": '',
  "guests": [
    {
      "name": "John",
      "email": "John@example.com",
      "phone": "+1 123 567 890",
      "ceremony": true,
      "reception": true,
    },
    {
      "name": "Bob",
      "email": "bob@example.com",
      "phone": "+1 123 567 890",
      "ceremony": true,
      "reception": false,
    }
  ]
};
*/

function choose_rsvp_url() {
  //const base_url = 'https://us-central1-ninaandandrew-com.cloudfunctions.net/rsvp-func-test';
  //const base_url = 'https://rsvp.ninaandandrew.com/';

  // If we are in prod, use the prod url
  if (
    window.location.hostname == "ninaandandrew.com" ||
    window.location.hostname == "www.ninaandandrew.com"
  ) {
    return "https://rsvp.ninaandandrew.com/";
  }

  // Otherwise use the local dev url
  //return "http://localhost:8080/";

  // Default to prod
  return "https://rsvp.ninaandandrew.com/";
}

async function get_data(primary_guest) {
  try {
    const url = new URL(base_url);
    url.searchParams.append("primary_guest", primary_guest);

    const response = await fetch(url.href);
    const data = await response.json();

    // Set some defaults
    data.error ??= null;
    data.comments ??= "";

    // Not invited (by default)
    data.ceremony ??= false;
    data.reception ??= false;

    data.guests ??= [];
    for (guest of data.guests) {
      // By default leave the rsvp unset.
      guest.ceremony ??= null;
      guest.reception ??= null;
    }

    return data;
  } catch (e) {
    return {
      error: "Unexpected error: " + e,
    };
  }
}

async function post_data(data) {
  try {
    const response = await fetch(base_url, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
    });

    return await response.json();
  } catch (e) {
    return {
      error: "Unexpected error: " + e,
    };
  }
}

function row_name(row_id) {
  switch (row_id + 1) {
    case 1:
      return "Primary Guest";
    case 2:
      return "2<sup>nd</sup> Guest";
    case 3:
      return "3<sup>rd</sup> Guest";
  }
  return row_id + 1 + "<sup>th</sup> Guest";
}

function fix_row_ids() {
  // renumber all the guests
  const table = document.querySelector("#rsvp-guests");
  const rows = table.querySelectorAll(".guest-row");

  var row_id = 0;
  for (const row of rows) {
    row.querySelector(".row-label").innerHTML = row_name(row_id);

    // Fix up all the IDs
    const name = row.querySelector('input[name^="rsvp_name_"]');
    name.id = "rsvp_name_" + row_id;
    if (row_id == 0) {
      // Disable editing first row name (but allow others to be changed)
      name.setAttribute("readonly", true);
    } else {
      name.removeAttribute("readonly");
    }

    row.querySelector('input[name^="rsvp_email_"]').id = "rsvp_email_" + row_id;
    row.querySelector('input[name^="rsvp_phone_"]').id = "rsvp_phone_" + row_id;
    row.querySelector('input[name^="rsvp_ceremony_"]').id =
      "rsvp_ceremony_" + row_id;
    row.querySelector('input[name^="rsvp_reception_"]').id =
      "rsvp_reception_" + row_id;

    row
      .querySelector('label[for^="rsvp_name_"]')
      .setAttribute("for", "rsvp_name_" + row_id);

    row
      .querySelector('label[for^="rsvp_email_"]')
      .setAttribute("for", "rsvp_email_" + row_id);
    row
      .querySelector('label[for^="rsvp_phone_"]')
      .setAttribute("for", "rsvp_phone_" + row_id);
    row
      .querySelector('label[for^="rsvp_ceremony_"]')
      .setAttribute("for", "rsvp_ceremony_" + row_id);
    row
      .querySelector('label[for^="rsvp_reception_"]')
      .setAttribute("for", "rsvp_reception_" + row_id);

    for (const checkbox of row.querySelectorAll(
      'input[name^="rsvp_attending_"]',
    )) {
      checkbox.setAttribute("name", "rsvp_attending_" + row_id);
    }

    row_id++;
  }

  // Disable/Enable the add button
  if (row_id >= max_guests) {
    // disabled
    document.querySelector("#add-row-button").disabled = true;
    document.querySelector("#add-row-button").classList.add("hide");
  } else {
    // enabled
    document.querySelector("#add-row-button").disabled = false;
    document.querySelector("#add-row-button").classList.remove("hide");
  }
}

// Adds a empty row to the RSVP form
function add_row(guest) {
  const template = document.querySelector("#guest-row");
  const table = document.querySelector("#rsvp-guests");

  const rows = table.querySelectorAll(".guest-row");
  const row_id = rows.length;

  const row = template.content.cloneNode(true);
  row.querySelector(".row-label").innerHTML = row_name(row_id);

  // Populate the guest info
  if (guest) {
    // Populate the data
    row.querySelector('input[name^="rsvp_name_"]').value = guest.name ?? "";
    row.querySelector('input[name^="rsvp_email_"]').value = guest.email ?? "";
    row.querySelector('input[name^="rsvp_phone_"]').value = guest.phone ?? "";

    row.querySelector('input[name^="rsvp_ceremony_"]').checked = guest.ceremony;
    row.querySelector('input[name^="rsvp_reception_"]').checked =
      guest.reception;

    // If either have been selected, then select the attending row.
    if (guest.ceremony === true || guest.reception == true) {
      row.querySelector('input[name^="rsvp_attending_"][value=yes]').checked =
        true;
    } else if (guest.ceremony === false && guest.reception == false) {
      row.querySelector('input[name^="rsvp_attending_"][value=no]').checked =
        true;
    }
  }

  // Radio and check buttons
  const attendingRadios = row.querySelectorAll(
    'input[name^="rsvp_attending_"]',
  );
  for (const radio of attendingRadios) {
    radio.addEventListener("change", rsvp_radio);
  }

  const ceremonyCheck = row.querySelector('input[name^="rsvp_ceremony_"]');
  ceremonyCheck.addEventListener("change", rsvp_checked);

  const receptionCheck = row.querySelector('input[name^="rsvp_reception_"]');
  receptionCheck.addEventListener("change", rsvp_checked);

  if (rows.length == 0) {
    // Can't remove the primary guest
    row.querySelector(".remove-row").innerText = "";

    // Can't edit their primary name
    row.querySelector('input[name^="rsvp_name_"]').readonly = "readonly";
  } else {
    // Otherwise add the appropriate event handler
    const a = row.querySelector(".remove-row a");
    a.addEventListener("click", remove_row);
  }

  // Finally insert into the DOM
  table.appendChild(row);

  fix_row_ids();

  return row;
}

// Called when a "Attending / Not Attending" radio is selected
function rsvp_radio(event) {
  const radio = event.target;
  const row = radio.closest(".guest-row");

  const checkedRadio = row.querySelector(
    'input[name^="rsvp_attending_"]:checked',
  );

  row.querySelector('input[name^="rsvp_ceremony_"]').checked =
    checkedRadio.value == "yes";
  row.querySelector('input[name^="rsvp_reception_"]').checked =
    checkedRadio.value == "yes";
}

// Called when a "Reception" or "Ceremony" Checkbox is selected
function rsvp_checked(event) {
  const check = event.target;
  const row = check.closest(".guest-row");

  const ceremony = row.querySelector('input[name^="rsvp_ceremony_"]').checked;
  const reception = row.querySelector('input[name^="rsvp_reception_"]').checked;

  if (ceremony || reception) {
    row.querySelector('input[name^="rsvp_attending_"][value=yes]').checked =
      true;
  } else {
    row.querySelector('input[name^="rsvp_attending_"][value=no]').checked =
      true;
  }
}

function remove_row(event) {
  event.preventDefault();

  const btn = event.target;
  const row = btn.closest(".guest-row");

  // Animate away the row
  row.classList.add("transition-hide");
  setTimeout(() => {
    row.remove();

    fix_row_ids();
  }, 500);
}

function render_error(message) {
  document.querySelector("#rsvp .success").classList.add("hide");

  document.querySelector("#rsvp .error").classList.remove("hide");
  document.querySelector("#rsvp .error-message").innerText = message;
}

function render_success(message) {
  document.querySelector("#rsvp .error").classList.add("hide");

  document.querySelector("#rsvp .success").classList.remove("hide");
  document.querySelector("#rsvp .success-message").innerText = message;
}

function show_ceremony() {
  // If they are invited to the ceremony unhide all the things.
  const elements = document.querySelectorAll(".hide-ceremony");
  for (const element of elements) {
    element.classList.remove("hide-ceremony");
  }
}

async function submit_rsvp(e) {
  e.preventDefault();

  // Disable submit button
  document.querySelector("#rsvp_submit").classList.add("hide");
  document.querySelector("#rsvp .loading").classList.remove("hide");

  // Hide previous success/error
  document.querySelector("#rsvp .error").classList.add("hide");
  document.querySelector("#rsvp .success").classList.add("hide");

  const resp = await post_data(to_json());
  if (resp.error) {
    render_error(resp.error);
  } else {
    render_success("Thanks! Successfully recorded your RSVP");
  }

  document.querySelector("#rsvp_submit").classList.remove("hide");
  document.querySelector("#rsvp .loading").classList.add("hide");

  return false;
}

function render_rsvp(data) {
  if (data.error) {
    render_error(data.error);
    document.querySelector("#rsvp-input").classList.add("hide");
    return;
  }

  document.querySelector("#rsvp-form").classList.remove("hide");

  const addButton = document.querySelector("#add-row-button");

  addButton.addEventListener("click", function (event) {
    add_row(null);

    if (rsvp.ceremony) {
      show_ceremony();
    }
  });

  for (const guest of data.guests) {
    add_row(guest);
  }

  if (data.ceremony) {
    show_ceremony();
  }

  document.querySelector('#rsvp textarea[name="rsvp_comments"]').value =
    data.comments;

  // Move the status box above the button
  const statusBox = document.querySelector("#status-box");
  const submitButton = document.querySelector("#rsvp_submit");

  submitButton.before(statusBox);

  document.querySelector("#rsvp-form").addEventListener("submit", submit_rsvp);
}

function to_json() {
  const table = document.querySelector("#rsvp");
  const rows = table.querySelectorAll(".guest-row");

  let guests = [];
  for (const row of rows) {
    const name = row.querySelector('input[name^="rsvp_name_"]').value;
    const email = row.querySelector('input[name^="rsvp_email_"]').value;
    const phone = row.querySelector('input[name^="rsvp_phone_"]').value;

    // If they weren't invited to the ceremony or reception leave this unset.
    const ceremony = rsvp.ceremony
      ? row.querySelector('input[name^="rsvp_ceremony_"]').checked
      : null;
    const reception = rsvp.reception
      ? row.querySelector('input[name^="rsvp_reception_"]').checked
      : null;

    guests.push({
      name: name ?? "",
      email: email ?? "",
      phone: phone ?? "",
      ceremony: ceremony,
      reception: reception,
    });
  }

  const comments = table.querySelector('textarea[name="rsvp_comments"]').value;

  return {
    guests: guests,
    comments: comments,
  };
}

document.addEventListener("DOMContentLoaded", async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const primary_guest = urlParams.get("primary_guest");

  if (!primary_guest) {
    return;
  }

  document.querySelector("#lookup").classList.add("hide");

  // Unhide RSVP
  for (const e of document.querySelectorAll(".hide-rsvp")) {
    e.classList.remove("hide-rsvp");
  }

  document.querySelector("#rsvp .loading").classList.remove("hide");

  try {
    rsvp = await get_data(primary_guest);
    render_rsvp(rsvp);
  } finally {
    document.querySelector("#rsvp .loading").classList.add("hide");
  }
});