/*
const data = {
  "ceremony": true,
  "reception": true,
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

const max_guests = 10;

async function get_data(primary_guest) {
  //const url = 'https://us-central1-ninaandandrew-com.cloudfunctions.net/rsvp-func?primary_guest=John%20Smith';
  const url = new URL('http://localhost:8080/');
  url.searchParams.append("primary_guest", primary_guest);

  const response = await fetch(url.href);
  const data = response.json();

  // Set some defaults
  data.error ??= null;
  data.ceremony ??= false;
  data.reception ??= false;
  data.comments ??= null;

  return data;
}

function row_name(row_id) {
  switch(row_id + 1) {
    case 1: return "Primary Guest";
    case 2: return "2<sup>nd</sup> Guest";
    case 3: return "3<sup>rd</sup> Guest";
  }
  return (row_id + 1) + "<sup>th</sup> Guest";
}

// Adds a empty row to the RSVP form
function add_row(guest) {
  const template = document.querySelector("#guest-row");
  const table = document.querySelector("#rsvp-form");

  const rows = table.querySelectorAll('tbody.guest-row');
  const row_id = rows.length;

  const row = template.content.cloneNode(true);
  row.querySelector('.row-label').innerHTML = row_name(row_id);

  // Fix up all the IDs
  row.querySelector('input[name="name"]').id = 'rsvp_name_' + row_id;
  row.querySelector('input[name="email"]').id = 'rsvp_email_' + row_id;
  row.querySelector('input[name="phone"]').id = 'rsvp_phone_' + row_id;
  row.querySelector('input[name="ceremony"]').id = 'rsvp_ceremony_' + row_id;
  row.querySelector('input[name="reception"]').id = 'rsvp_reception_' + row_id;

  row.querySelector('label[for="name"]').setAttribute("for", 'rsvp_name_' + row_id);
  row.querySelector('label[for="email"]').setAttribute("for", 'rsvp_email_' + row_id);
  row.querySelector('label[for="phone"]').setAttribute("for", 'rsvp_phone_' + row_id);
  row.querySelector('label[for="ceremony"]').setAttribute("for", 'rsvp_ceremony_' + row_id);
  row.querySelector('label[for="reception"]').setAttribute("for", 'rsvp_reception_' + row_id);

  // Populate the guest info
  if (guest) {
    // Populate the data
    row.querySelector('input[name="name"]').value = guest.name ?? '';
    row.querySelector('input[name="email"]').value = guest.email ?? '';
    row.querySelector('input[name="phone"]').value = guest.phone ?? '';
    row.querySelector('input[name="ceremony"]').checked = guest.ceremony ?? false;
    row.querySelector('input[name="reception"]').checked = guest.reception ?? false;
  }

  if (rows.length == 0) {
    // Can't remove the primary guest
    row.querySelector('.remove-row').innerText = '';

    // Can't edit their primary name
    row.querySelector('input[name="name"]').readonly = 'readonly';

  } else {
    // Otherwise add the appropriate event handler
    const a = row.querySelector('.remove-row a');
    a.addEventListener('click', remove_row);
  }

  // Finally insert into the DOM
  tfoot = table.querySelector('tfoot');
  table.insertBefore(row, tfoot);

  // Disable/Enable the add button
  if (rows.length >= max_guests) {
    document.querySelector('#add-row-button').disabled = true;
    document.querySelector('#add-row-button').classList.add('hide');
  }

  return row;
}

function remove_row(event) {
  event.preventDefault();

  const btn = event.target;

  const row = btn.closest('tbody.guest-row');
  row.classList.add('transition-hide');
  setTimeout(() => {
    row.remove();

    // renumber all the guests
    const table = document.querySelector("#rsvp-form");
    const rows = table.querySelectorAll('.row-label');

    var i = 0;
    for (const row of rows) {
      row.innerHTML = row_name(i);
      i++;
    }

    // Disable/Enable the add button
    document.querySelector('#add-row-button').disabled = false;
    document.querySelector('#add-row-button').classList.remove('hide');
  }, 500);


}

function render_rsvp(data) {

  // Unhide RSVP
  for (const e of document.querySelectorAll('.hide-rsvp')) {
    e.classList.remove('hide-rsvp');
  };

  if (data.error) {
    document.querySelector('#rsvp .error').classList.remove('hide');
    document.querySelector('#rsvp .error-message').innerText = 'Error:\n' + data.error;

    document.querySelector('#rsvp form').classList.add('hide');

    return;
  }

  document.querySelector('#add-row-button').addEventListener('click', (event) => add_row(null) );

  if (!data.ceremony) {
    document.querySelector('#rsvp').classList.add('reception-only');

    let tds = document.querySelectorAll(".colspan-hack");
    for (const td of tds) {
      td.colSpan = 1;
    }
  }

  for (const guest of data.guests) {
    add_row(guest);
  }

  document.querySelector('#rsvp textarea[name="comments"]').innerText = data.comments;

}

function to_json() {
  const tbody = document.querySelector("#rsvp-form table");
  const rows = tbody.querySelectorAll('tbody');

  let guests = [];
  for (const row of rows) {
    const name = row.querySelector('input[name="name"]').value;
    const email = row.querySelector('input[name="email"]').value;
    const phone = row.querySelector('input[name="phone"]').value;
    const ceremony = row.querySelector('input[name="ceremony"]').checked;
    const reception = row.querySelector('input[name="reception"]').checked;

    guests.push({
      "name": name ?? '',
      "email": email ?? '',
      "phone": phone ?? '',
      "ceremony": ceremony ?? false,
      "reception": reception ?? false,
    });
  }
}

window.addEventListener("load", async function () {
  const urlParams = new URLSearchParams(window.location.search);
  const primary_guest = urlParams.get('primary_guest');

  if (!primary_guest) {
    return;
  }

  const data = await get_data(primary_guest);

  render_rsvp(data);
});
 
