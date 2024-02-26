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

function row_name(row) {
  switch(row) {
    case 1: return "Primary Guest";
    case 2: return "2nd Guest";
    case 3: return "3rd Guest";
  }
  return row + "th Guest";
}

function add_row(guest) {
  const template = document.querySelector("#guest-row");
  const tbody = document.querySelector("#rsvp-form tbody");

  const rows = tbody.querySelectorAll('tr').length + 1;

  const row = template.content.cloneNode(true);
  row.querySelector('label[for="name"]').innerText = row_name(rows);

  if (guest) {
    // If we have guest info, populate it.
    let td = row.querySelectorAll("td");

    row.querySelector('input[name="name"]').value = guest.name ?? '';
    row.querySelector('input[name="email"]').value = guest.email ?? '';
    row.querySelector('input[name="phone"]').value = guest.phone ?? '';

    row.querySelector('input[name="ceremony"]').checked = guest.name ?? false;
    row.querySelector('input[name="reception"]').checked = guest.reception ?? false;

    if (rows == 1) {
      row.querySelector('.remove-row').innerText = '';
    } else {
      row.querySelector('.remove-row a').dataset.row = rows;
    }
  }

  tbody.appendChild(row);

  if (rows >= 10) {
    // Disable the add button
    document.querySelector('#add-row-button').disabled = true;
    
  }
}

function remove_row(btn) {
  var row = btn.parentNode.parentNode;
  row.parentNode.removeChild(row);

  // renumber all the guests
  const tbody = document.querySelector("#rsvp-form tbody");
  const rows = tbody.querySelectorAll('label[for="name"]');

  var i = 1;
  for (const row of rows) {
    row.innerText = row_name(i);
    i++;
  }
}

function to_json() {
  const tbody = document.querySelector("#rsvp-form tbody");
  const rows = tbody.querySelectorAll('tr');

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

  console.log(guests); // TODO Remove
}

window.onload = function () {
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
}
